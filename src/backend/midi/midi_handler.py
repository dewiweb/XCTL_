# midi_handler.py
"""
MIDI connection and message handling for XCTL_ backend.
Uses mido for MIDI I/O. Wraps input/output in a class for easy integration.
"""
import os
import mido
import threading
import logging
import time
from backend.utils.user_data import get_user_data_dir

class MidiHandler:
    def get_layer_status(self):
        """
        Return info about the current layer and mapping for API/frontend.
        """
        return {
            'active_layer': self.active_layer,
            'mapping_keys': list(self.active_mapping.keys()),
            'layer_names': {k: v.get('name', k) for k, v in self.layers_index.items()}
        }

    def __init__(self, input_port_name, output_port_name, event_loop=None, broadcast_ws=None):
        self.input_port_name = input_port_name
        self.output_port_name = output_port_name
        self.input_port = None
        self.output_port = None
        self.running = False
        self.logger = logging.getLogger('MidiHandler')
        self.event_loop = event_loop
        self.broadcast_ws = broadcast_ws
        self.osc = None  # Set this to an XctlOSC instance externally if OSC output is desired
        # Use the new OS-native user preset directory and "Default" preset by default
        preset_dir = os.path.join(get_user_data_dir(), "Default")
        self.layers_index_path = os.path.join(preset_dir, "layer_index.json")
        self.layers_dir = preset_dir  # Each layer file is in this folder
        self.layers_index = {}  # Always initialize before reload_mapping
        self.active_mapping = {}  # Always initialize before reload_mapping
        self.active_layer = 'layer_1'  # Default active layer
        self.reload_mapping()

    def reload_mapping(self):
        import json
        preset_dir = os.path.join(get_user_data_dir(), "Default")
        self.layers_index_path = os.path.join(preset_dir, "layer_index.json")
        self.layers_dir = preset_dir
        try:
            with open(self.layers_index_path, 'r') as f:
                layer_names = json.load(f)
            # Build a dict: {"layer_1": {"name": ..., "file": ...}, ...}
            self.layers_index = {
                f"layer_{i+1}": {"name": name, "file": f"layer_{i+1}.json"}
                for i, name in enumerate(layer_names)
            }
            if self.active_layer not in self.layers_index:
                self.active_layer = list(self.layers_index.keys())[0] if self.layers_index else 'layer_1'
            self._load_active_layer_mapping()
            self.logger.info(f'Layers index reloaded. Active layer: {self.active_layer}')
        except Exception as e:
            self.logger.error(f'Could not reload layers index: {e}')
            self.layers_index = {}
            self.active_layer = 'layer_1'
            self.active_mapping = {}

    def _load_active_layer_mapping(self):
        import json
        layer_info = self.layers_index.get(self.active_layer)
        if not layer_info:
            self.logger.warning(f'No layer info for {self.active_layer}')
            self.active_mapping = {}
            return
        layer_file = os.path.join(self.layers_dir, layer_info["file"])
        try:
            with open(layer_file, 'r') as f:
                layer_data = json.load(f)
            self.active_mapping = layer_data.get('mappings', {})
            self.logger.info(f'Loaded mappings for {self.active_layer} from {layer_file}')
        except Exception as e:
            self.logger.error(f'Could not load mapping file {layer_file}: {e}')
            self.active_mapping = {}

    def get_active_mapping(self):
        # Return mappings dict for the active layer
        return self.active_mapping

    def set_active_layer(self, layer_key):
        if layer_key in self.layers_index:
            self.active_layer = layer_key
            self._load_active_layer_mapping()
            self.logger.info(f'Active layer switched to: {layer_key}')
            # DEBUG: Print active mapping summary after switching
            mapping_keys = list(self.active_mapping.keys())
            print(f'[DEBUG] Layer switched to: {layer_key}')
            print(f'[DEBUG] Mapping keys: {mapping_keys}')
        else:
            self.logger.warning(f'Tried to switch to unknown layer: {layer_key}')

    def _send_full_scribble_strip(self, channel, top_text, bottom_text, color=0x07):
        # Send full scribble (top+bottom) using the proven format
        sysex = bytearray([0x00, 0x20, 0x32, 0x15, 0x4C, 0x20 + channel - 1, color])
        sysex.extend(top_text.ljust(7)[:7].encode('ascii', errors='replace'))
        sysex.extend(bottom_text.ljust(7)[:7].encode('ascii', errors='replace'))
        print(f"[DEBUG] SENDING FULL SCRIBBLE: {[hex(b) for b in sysex]}")
        print(f"[DEBUG] Output port: {self.output_port}")
        if self.output_port:
            self.output_port.send(mido.Message('sysex', data=sysex))
            print(f'[DEBUG] Sent full scribble for channel {channel}: {top_text} / {bottom_text}')

    def _send_layer_names_to_scribbles(self):
        # Defensive: avoid crash if layers_index is not set
        if not hasattr(self, 'layers_index') or not self.layers_index:
            print("[ERROR] layers_index not initialized! Attempting reload...")
            self.reload_mapping()
            if not self.layers_index:
                print("[ERROR] layers_index still empty after reload!")
                return
        print(f"[DEBUG] self.layers_index: {self.layers_index}")
        layer_items = list(self.layers_index.items())[:8]
        # Show layer names for available layers
        for idx, (layer_key, layer_obj) in enumerate(layer_items):
            name = layer_obj.get('name', f'Layer {idx+1}')
            print(f"[DEBUG] Layer {idx+1} key: {layer_key}, name: {name}")
            top = name[:7]
            bottom = f'Layer{idx+1}'[:7]
            self._send_full_scribble_strip(idx+1, top, bottom)
            print(f'[DEBUG] Sent scribble strip {idx+1}: {top} / {bottom}')
        # Blank out unused scribble strips
        for idx in range(len(layer_items), 8):
            self._send_full_scribble_strip(idx+1, '', '')
            print(f'[DEBUG] Blank scribble strip {idx+1}')
        # Set only select button LEDs corresponding to available layers ON (velocity=127)
        for idx in range(len(layer_items)):
            note = 32 + idx
            if self.output_port:
                self.output_port.send(mido.Message('note_on', note=note, velocity=127))
                print(f'[DEBUG] Set select button LED: note {note} (velocity=127)')
        # Ensure unused select buttons are OFF
        for idx in range(len(layer_items), 8):
            note = 32 + idx
            if self.output_port:
                self.output_port.send(mido.Message('note_on', note=note, velocity=0))
                print(f'[DEBUG] Set select button LED: note {note} (velocity=0)')

    def _restore_scribbles(self):
        # Restore scribble strips to normal channel display (implementation depends on your setup)
        # Here, just send a placeholder (could be improved to restore actual channel names)
        active_mapping = self.get_active_mapping()
        for idx in range(8):
            channel_name = f'Ch {idx+1}'
            self._send_scribble_strip(idx+1, channel_name)
            print(f'[DEBUG] Restored scribble strip {idx+1}: {channel_name}')
        # Turn off select button LEDs
        for note in range(32, 40):
            if self.output_port:
                msg = mido.Message('note_on', note=note, velocity=0)
                self.output_port.send(msg)
                print(f'[DEBUG] Turned off select button LED: note {note}')

    import time
    def _send_scribble_strip(self, channel, text, color=0x07):
        # Send SysEx for scribble strip (channel: 1-8, text: up to 7 chars, using new header)
        sysex = bytearray([0x00, 0x20, 0x32, 0x15, 0x4C, 0x20 + channel - 1, color])
        text_bytes = text.encode('ascii', errors='replace')[:7].ljust(7, b' ')
        sysex.extend(text_bytes)
        sysex.extend(b'       ')  # pad bottom row with spaces (for 14-byte format)
        if self.output_port:
            self.output_port.send(mido.Message('sysex', data=sysex))
            print(f'[DEBUG] Sent NEW scribble SysEx for channel {channel}: {text}')

    def _notify_layer_change(self, layer_key):
        # Notify frontend/UI via WebSocket
        try:
            import asyncio
            if self.event_loop and self.broadcast_ws:
                asyncio.run_coroutine_threadsafe(
                    self.broadcast_ws({
                        'type': 'layer_change',
                        'active_layer': layer_key,
                        'layer_names': [(k, v.get('name', k)) for k, v in self.layers.items()]
                    }),
                    self.event_loop
                )
        except Exception as e:
            self.logger.error(f'Failed to notify frontend of layer change: {e}')


    def open(self):
        self.logger.info(f"Opening MIDI ports: IN={self.input_port_name}, OUT={self.output_port_name}")
        available_inputs = mido.get_input_names()
        available_outputs = mido.get_output_names()

        # Handle input port
        if not self.input_port_name or self.input_port_name not in available_inputs:
            if available_inputs:
                self.logger.warning(f"Input port '{self.input_port_name}' not available. Using '{available_inputs[0]}' instead.")
                self.input_port_name = available_inputs[0]
            else:
                raise RuntimeError("No available MIDI input ports found.")

        # Handle output port
        if not self.output_port_name or self.output_port_name not in available_outputs:
            if available_outputs:
                self.logger.warning(f"Output port '{self.output_port_name}' not available. Using '{available_outputs[0]}' instead.")
                self.output_port_name = available_outputs[0]
            else:
                raise RuntimeError("No available MIDI output ports found.")

        self.input_port = mido.open_input(self.input_port_name)
        self.output_port = mido.open_output(self.output_port_name)
        self.running = True
        self.thread = threading.Thread(target=self._listen, daemon=True)
        self.thread.start()

        # Start handshake thread for X-Touch
        self._handshake_thread = threading.Thread(target=self._send_handshake_loop, daemon=True)
        self._handshake_thread.start()

    def _send_handshake_loop(self):
        # Send the required handshake SysEx every 6 seconds
        sysex = bytearray([0x00, 0x00, 0x66, 0x14, 0x00])
        while self.running:
            try:
                if self.output_port:
                    self.output_port.send(mido.Message('sysex', data=sysex))
                    self.logger.info(f"[HANDSHAKE] Sent: {[hex(b) for b in sysex]}")
            except Exception as e:
                self.logger.error(f"[HANDSHAKE] Failed to send: {e}")
            time.sleep(6)

    def _listen(self):
        self.logger.info("MIDI listener started")
        for msg in self.input_port:
            self.handle_message(msg)
            if not self.running:
                break

    # --- Layer selection mode state ---
    _LAYER_SELECT_NOTES = set(range(32, 40))  # select_1 to select_8
    _REC_1_NOTE = 8
    _REC_8_NOTE = 15

    def __init__(self, input_port_name, output_port_name, event_loop=None, broadcast_ws=None):
        self.input_port_name = input_port_name
        self.output_port_name = output_port_name
        self.input_port = None
        self.output_port = None
        self.running = False
        self.logger = logging.getLogger('MidiHandler')
        self.event_loop = event_loop
        self.broadcast_ws = broadcast_ws
        self.osc = None  # Set this to an XctlOSC instance externally if OSC output is desired
        self.mapping_path = os.path.join(os.path.dirname(__file__), '..', 'mapping', 'active_mapping.json')
        self.layers = {}  # All layers loaded from file
        self.active_layer = 'layer_1'  # Default active layer
        self.reload_mapping()
        self._pressed_notes = set()
        self._in_layer_select_mode = False

    def handle_message(self, msg):
        from backend.utils.value_mapping import remap_from_mapping
        print(f"MIDI RECEIVED: {msg}")
        self.logger.debug(f"Received MIDI: {msg}")
        midi_dict = msg.dict() if hasattr(msg, 'dict') else None
        ui_update = None
        active_mapping = self.active_mapping

        # --- Layer select mode logic ---
        if midi_dict and midi_dict.get('type') in ('note_on', 'note_off'):
            note = midi_dict.get('note')
            velocity = midi_dict.get('velocity', 0)
            if midi_dict['type'] == 'note_on' and velocity > 0:
                self._pressed_notes.add(note)
            else:
                self._pressed_notes.discard(note)

            # Enter layer-select mode when BOTH rec_1 and rec_8 are pressed
            if not self._in_layer_select_mode:
                if self._REC_1_NOTE in self._pressed_notes and self._REC_8_NOTE in self._pressed_notes:
                    self._in_layer_select_mode = True
                    print('[DEBUG] Entered layer-select mode')
                    self.logger.info('Entered layer-select mode')
                    self._send_layer_names_to_scribbles()
                    return

            # If in layer select mode, detect select_1 to select_8 press
            if self._in_layer_select_mode:
                if midi_dict['type'] == 'note_on' and note in self._LAYER_SELECT_NOTES:
                    layer_idx = note - 32  # select_1 (32) -> 0, ... select_8 (39) -> 7
                    # Use self.layers_index for deterministic button-to-layer mapping
                    layer_keys = list(self.layers_index.keys())
                    if 0 <= layer_idx < len(layer_keys):
                        self.set_active_layer(layer_keys[layer_idx])
                        self.reload_mapping()
                        # Notify frontend/UI (send only one correct message)
                        if self.broadcast_ws and self.event_loop:
                            try:
                                import asyncio
                                layer_names = {k: v.get('name', k) for k, v in self.layers_index.items()}
                                mapping_keys = list(self.active_mapping.keys()) if hasattr(self, 'active_mapping') and self.active_mapping else []
                                debug_msg = {
                                    'type': 'layer_change',
                                    'active_layer': layer_keys[layer_idx],
                                    'layer_names': layer_names,
                                    'mapping_keys': mapping_keys
                                }
                                print(f'[DEBUG] Broadcasting layer_change: {debug_msg}')
                                future = asyncio.run_coroutine_threadsafe(self.broadcast_ws(debug_msg), self.event_loop)
                                try:
                                    future.result()
                                except Exception as e:
                                    print(f'[DEBUG] Failed to broadcast layer_change: {e}')
                            except Exception as e:
                                print(f'[DEBUG] Exception in layer_change broadcast: {e}')
                    self._restore_scribbles()
                    self._in_layer_select_mode = False
                    print('[DEBUG] Exited layer-select mode (layer selected)')
                    self.logger.info('Exited layer-select mode (layer selected)')
                    return
                # Do NOT exit mode on rec_1/rec_8 release; only exit on layer select.

        # --- Normal mapping logic ---
        if midi_dict:
            if midi_dict.get('type') == 'control_change':
                for key, entry in active_mapping.items():
                    if entry.get('midi_cc') == midi_dict.get('control'):
                        try:
                            channel = int(key.split('_')[1])
                        except (IndexError, ValueError):
                            channel = 1
                        value = midi_dict.get('value', 0)
                        ui_update = {
                            'type': 'ui_update',
                            'event': key.split('_')[0],
                            'channel': channel,
                            'value': value
                        }
                        osc_address = entry.get('osc')
                        if osc_address and self.osc:
                            from backend.utils.value_mapping import remap_from_mapping
                            osc_value = remap_from_mapping(value, entry, direction="midi_to_osc")
                            self.osc.send_message(osc_address, osc_value)
                        break
            elif midi_dict.get('type') in ('note_on', 'note_off'):
                for key, entry in active_mapping.items():
                    if entry.get('midi_note') == midi_dict.get('note'):
                        try:
                            channel = int(key.split('_')[1])
                        except (IndexError, ValueError):
                            channel = 1
                        if midi_dict.get('type') == 'note_on':
                            midi_val = midi_dict.get('velocity', 127)
                        else:
                            midi_val = 0
                        value = True if midi_val == 127 else False
                        ui_update = {
                            'type': 'ui_update',
                            'event': key.split('_')[0],
                            'channel': channel,
                            'value': value
                        }
                        osc_address = entry.get('osc')
                        if osc_address and self.osc:
                            from backend.utils.value_mapping import remap_from_mapping
                            osc_value = remap_from_mapping(midi_val, entry, direction="midi_to_osc")
                            self.osc.send_message(osc_address, osc_value)
                        break

        # Broadcast to WebSocket clients (threadsafe)
        try:
            import asyncio
            if self.event_loop and self.broadcast_ws:
                if ui_update:
                    asyncio.run_coroutine_threadsafe(
                        self.broadcast_ws(ui_update),
                        self.event_loop
                    )
                else:
                    asyncio.run_coroutine_threadsafe(
                        self.broadcast_ws({
                            'type': 'midi',
                            'message': str(msg),
                            'data': midi_dict
                        }),
                        self.event_loop
                    )
            else:
                self.logger.error("No event loop or broadcast_ws provided for MIDI broadcast.")
        except Exception as e:
            self.logger.error(f"Failed to broadcast MIDI: {e}")

    def send(self, msg):
        self.logger.debug(f"Sending MIDI: {msg}")
        self.output_port.send(msg)

    def close(self):
        self.running = False
        if self.input_port:
            self.input_port.close()
        if self.output_port:
            self.output_port.close()
        self.logger.info("MIDI ports closed")
