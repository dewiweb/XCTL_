# osc_server.py
"""
OSC server/client logic for XCTL_ backend.
Refactored from original xctl_osc.py to fit modular backend structure.
"""
import logging
from threading import Lock, Thread
from pythonosc import osc_server, udp_client, dispatcher
from pythonosc.osc_message_builder import OscMessageBuilder
import time
import socket
import asyncio
import websockets
import json
import os
import threading  # <-- Added for thread logging

from backend.utils.config import load_config

class XctlOSC:
    """
    Main OSC controller class with server and client components.
    Loads configuration from config.yaml.
    """
    def __init__(self, config_path=None, event_loop=None, broadcast_ws=None, midi_handler=None):
        self.event_loop = event_loop
        self.broadcast_ws = broadcast_ws
        CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'config.yaml')
        config = load_config(config_path or CONFIG_PATH)
        osc_cfg = config["osc"]
        ws_cfg = config.get("websocket", {})

        self.ws_port = ws_cfg.get("port", 8765)
        self.osc_input_port = osc_cfg.get("input_port", 9000)
        self.osc_output_port = osc_cfg.get("output_port", 1200)
        self.osc_output_ip = osc_cfg.get("output_ip", "127.0.0.1")

        self._lock = Lock()
        self._setup_logging(config.get("logging", {}))
        self._running = False
        self.ws_server = None
        self.ws_thread = None

        # MIDI handler should be injected from main
        self.midi_handler = midi_handler


    def _setup_logging(self, log_cfg):
        level = getattr(logging, log_cfg.get("level", "INFO").upper(), logging.INFO)
        log_file = log_cfg.get("file")
        handlers = [logging.StreamHandler()]
        if log_file:
            handlers.append(logging.FileHandler(log_file))
        logging.basicConfig(
            level=level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=handlers
        )
        self.logger = logging.getLogger('XctlOSC')

    def start_osc_server(self):
        """Start the OSC UDP server with error handling"""
        try:
            self.dispatcher = dispatcher.Dispatcher()
            self.dispatcher.set_default_handler(self._default_handler)
            self.server = osc_server.ThreadingOSCUDPServer(
                ("127.0.0.1", self.osc_input_port),
                self.dispatcher
            )
            self._running = True
            self.logger.info(f"OSC Server started on port {self.osc_input_port}")
            self.server_thread = Thread(
                target=self.server.serve_forever,
                daemon=True
            )
            self.server_thread.start()
        except Exception as e:
            self.logger.error(f"Server startup failed: {str(e)}")
            self._attempt_recovery()

    def _default_handler(self, address, *args):
        """Default handler for incoming OSC messages"""
        print(f"OSC RECEIVED: {address} {args}")  # Immediate feedback
        # Broadcast to WebSocket clients (threadsafe)
        try:
            import asyncio
            if self.event_loop and self.broadcast_ws:
                print(f"[DEBUG] Scheduling OSC broadcast on main event loop: {address} {args}")
                asyncio.run_coroutine_threadsafe(
                    self.broadcast_ws({
                        'type': 'osc',
                        'address': address,
                        'args': args
                    }),
                    self.event_loop
                )
            else:
                self.logger.error("No event loop or broadcast_ws provided for OSC broadcast.")
        except Exception as e:
            self.logger.error(f"Failed to broadcast OSC: {e}")
        with self._lock:
            self.logger.debug(f"Received OSC: {address} {args}")
            # --- OSC to MIDI mapping ---
            try:
                import json
                from backend.utils.value_mapping import remap_from_mapping
                mapping_path = os.path.join(os.path.dirname(__file__), '..', 'mapping', 'active_mapping.json')
                with open(mapping_path, 'r') as f:
                    active_mapping = json.load(f)
                for key, entry in active_mapping.items():
                    if entry.get('osc') == address:
                        if 'midi_cc' in entry:
                            self.logger.info(f"[OSC->MIDI] Mapping OSC {address} value {args[0]} using mapping {entry}")
                            midi_value = remap_from_mapping(args[0], entry, direction="osc_to_midi")
                            self.logger.info(f"[OSC->MIDI] Remapped value: {midi_value}")
                            midi_value = max(0, min(127, int(round(midi_value))))  # Clamp and round
                            import mido
                            midi_channel = entry.get('midi_channel', 0)  # 0 = channel 1 for mido
                            midi_msg = mido.Message('control_change', control=entry['midi_cc'], value=midi_value, channel=midi_channel)
                            self.logger.info(f"[OSC->MIDI] Sending MIDI: {midi_msg}")
                            self.logger.info(f"[DEBUG] midi_handler exists: {self.midi_handler is not None}")
                            if self.midi_handler:
                                self.logger.info(f"[DEBUG] MIDI send from thread: {threading.current_thread().name}")
                                try:
                                    self.midi_handler.send(midi_msg)
                                except Exception as send_exc:
                                    self.logger.error(f"[OSC->MIDI] Failed to send MIDI via midi_handler: {send_exc}")
                        elif 'midi_note' in entry:
                            self.logger.info(f"[OSC->MIDI] Mapping OSC {address} value {args[0]} using mapping {entry}")
                            midi_value = remap_from_mapping(args[0], entry, direction="osc_to_midi")
                            self.logger.info(f"[OSC->MIDI] Remapped value: {midi_value}")
                            midi_value = max(0, min(127, int(round(midi_value))))  # Clamp and round
                            import mido
                            midi_type = 'note_on' if midi_value > 0 else 'note_off'
                            midi_channel = entry.get('midi_channel', 0)  # 0 = channel 1 for mido
                            midi_msg = mido.Message(midi_type, note=entry['midi_note'], velocity=midi_value, channel=midi_channel)
                            self.logger.info(f"[OSC->MIDI] Sending MIDI: {midi_msg}")
                            self.logger.info(f"[DEBUG] midi_handler exists: {self.midi_handler is not None}")
                            if self.midi_handler:
                                self.logger.info(f"[DEBUG] MIDI send from thread: {threading.current_thread().name}")
                                try:
                                    self.midi_handler.send(midi_msg)
                                except Exception as send_exc:
                                    self.logger.error(f"[OSC->MIDI] Failed to send MIDI via midi_handler: {send_exc}")
                        break
            except Exception as e:
                self.logger.error(f"OSC to MIDI mapping failed: {e}")
            if address == "/live/volume":
                self._handle_volume_control(*args)

    def _handle_volume_control(self, channel, value):
        """Process volume control messages"""
        try:
            if not 0 <= value <= 1.0:
                raise ValueError("Volume value out of range")
            self.logger.info(f"Setting volume on channel {channel} to {value}")
            # Here you would typically forward to MIDI or other systems
        except Exception as e:
            self.logger.error(f"Volume control error: {str(e)}")

    def send_message(self, address, *args):
        """Thread-safe OSC message sending with error handling"""
        with self._lock:
            try:
                if not hasattr(self, 'client') or self.client._sock is None:
                    self._initialize_client()
                msg = OscMessageBuilder(address=address)
                for arg in args:
                    msg.add_arg(arg)
                self.logger.info(f"[OSC SEND] To {self.osc_output_ip}:{self.osc_output_port} | Address: {address} | Args: {args}")
                self.client.send(msg.build())
                self.logger.debug(f"Sent OSC: {address} {args}")
            except Exception as e:
                self.logger.error(f"Message send failed: {str(e)} | Address: {address} | Args: {args} | Dest: {self.osc_output_ip}:{self.osc_output_port}")
                self._attempt_recovery()
            except Exception as e:
                self.logger.error(f"Message send failed: {str(e)}")
                self._attempt_recovery()

    def send_osc_message(self, address, value):
        """Send OSC message with debug logging"""
        try:
            self.logger.info(f"[OSC SEND] To {self.osc_output_ip}:{self.osc_output_port} | Address: {address} | Value: {value}")
            self.client.send_message(address, value)
            self.logger.debug(f"Sent OSC: {address} {value}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to send OSC: {str(e)} | Address: {address} | Value: {value} | Dest: {self.osc_output_ip}:{self.osc_output_port}")
            return False

    def update_settings(self, settings):
        """Centralized settings update and persist to config.yaml if changed"""
        import yaml
        import mido
        CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'config.yaml')
        with self._lock:
            changed = False
            midi_changed = False
            if 'osc_output_ip' in settings and settings['osc_output_ip'] != self.osc_output_ip:
                self.osc_output_ip = settings['osc_output_ip']
                changed = True
            if 'osc_output_port' in settings and settings['osc_output_port'] != self.osc_output_port:
                self.osc_output_port = settings['osc_output_port']
                changed = True
            if 'osc_input_port' in settings and settings['osc_input_port'] != getattr(self, 'osc_input_port', None):
                self.osc_input_port = settings['osc_input_port']
                changed = True
            midi_port_name = None
            if 'midi_output_port' in settings:
                midi_port_name = settings['midi_output_port']
            elif 'output_port' in settings:
                midi_port_name = settings['output_port']
            if midi_port_name:
                try:
                    self.midi = mido.open_output(midi_port_name)
                    self.logger.info(f"[UPDATE] Opened MIDI output port: {midi_port_name}")
                    midi_changed = True
                except Exception as e:
                    self.midi = None
                    self.logger.error(f"[UPDATE] Failed to open MIDI output port '{midi_port_name}': {e}")
            if changed or midi_changed:
                # Persist changes to config.yaml
                try:
                    with open(CONFIG_PATH, 'r') as f:
                        config = yaml.safe_load(f)
                    if 'osc' not in config:
                        config['osc'] = {}
                    config['osc']['output_ip'] = self.osc_output_ip
                    config['osc']['output_port'] = self.osc_output_port
                    config['osc']['input_port'] = self.osc_input_port
                    if midi_changed:
                        config['osc']['midi_output_port'] = settings.get('midi_output_port', config['osc'].get('midi_output_port'))
                    with open(CONFIG_PATH, 'w') as f:
                        yaml.safe_dump(config, f)
                except Exception as e:
                    self.logger.error(f"Failed to persist OSC settings to config.yaml: {e}")
                self._initialize_client()
                return True
            return False

    def _initialize_client(self):
        self.logger.info(f"Initializing OSC Client to {self.osc_output_ip}:{self.osc_output_port}")
        try:
            self.client = udp_client.SimpleUDPClient(self.osc_output_ip, self.osc_output_port)
            self.logger.info(f"OSC Client connected to {self.osc_output_ip}:{self.osc_output_port}")
        except Exception as e:
            self.logger.error(f"Client initialization failed: {str(e)}")
            raise

    def _attempt_recovery(self):
        self.logger.warning("Attempting recovery...")
        time.sleep(1)
        try:
            if hasattr(self, 'client'):
                del self.client
            self._initialize_client()
        except Exception:
            self.logger.error("Recovery failed - manual intervention needed")

    def shutdown(self):
        with self._lock:
            self._running = False
            if hasattr(self, 'server'):
                self.server.shutdown()
            if hasattr(self, 'client'):
                self.client._sock.close()
            if hasattr(self, 'ws_server'):
                self.ws_server.close()
            if hasattr(self, 'ws_thread'):
                self.ws_thread.join()
            self.logger.info("OSC services shut down")

    # WebSocket server logic (unified with OSC for now)
    async def handler(self, websocket):
        """Unified WebSocket handler"""
        while True:
            try:
                message = await websocket.recv()
                data = json.loads(message)
                if data.get('type') == 'update_settings':
                    self.update_settings(data['settings'])
                    await websocket.send(json.dumps({
                        'type': 'settings_updated',
                        'settings': {
                            'osc_output_ip': self.osc_output_ip,
                            'osc_output_port': self.osc_output_port
                        }
                    }))
                    continue
                if 'address' in data and 'value' in data:
                    self.send_osc_message(data['address'], data['value'])
            except Exception as e:
                self.logger.error(f"WS Error: {str(e)}")
                break

    async def start_websocket_server_async(self):
        async with websockets.serve(
            self.handler,
            host="0.0.0.0",
            port=self.ws_port
        ):
            self.logger.info(f"WebSocket server started on port {self.ws_port}")
            await asyncio.Future()  # Run forever

    def start_websocket_server(self):
        self.ws_thread = Thread(target=lambda: asyncio.run(self.start_websocket_server_async()))
        self.ws_thread.start()