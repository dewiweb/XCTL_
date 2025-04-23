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

from backend.utils.config import load_config

class XctlOSC:
    """
    Main OSC controller class with server and client components.
    Loads configuration from config.yaml.
    """
    def __init__(self, config_path=None):
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
        with self._lock:
            self.logger.debug(f"Received OSC: {address} {args}")
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
                self.client.send(msg.build())
                self.logger.debug(f"Sent OSC: {address} {args}")
            except Exception as e:
                self.logger.error(f"Message send failed: {str(e)}")
                self._attempt_recovery()

    def send_osc_message(self, address, value):
        """Send OSC message with debug logging"""
        try:
            self.logger.debug(f"Sending OSC: {address} = {value} to {self.osc_output_ip}:{self.osc_output_port}")
            self.client.send_message(address, value)
            return True
        except Exception as e:
            self.logger.error(f"Failed to send OSC: {str(e)}")
            return False

    def update_settings(self, settings):
        """Centralized settings update"""
        with self._lock:
            changed = False
            if 'osc_output_ip' in settings and settings['osc_output_ip'] != self.osc_output_ip:
                self.osc_output_ip = settings['osc_output_ip']
                changed = True
            if 'osc_output_port' in settings and settings['osc_output_port'] != self.osc_output_port:
                self.osc_output_port = settings['osc_output_port']
                changed = True
            if changed:
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
