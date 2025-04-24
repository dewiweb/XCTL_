# midi_handler.py
"""
MIDI connection and message handling for XCTL_ backend.
Uses mido for MIDI I/O. Wraps input/output in a class for easy integration.
"""
import os
import mido
import threading
import logging

class MidiHandler:
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
        self.active_mapping = {}
        self.reload_mapping()

    def reload_mapping(self):
        import json
        try:
            with open(self.mapping_path, 'r') as f:
                self.active_mapping = json.load(f)
            self.logger.info('Active mapping reloaded.')
        except Exception as e:
            self.logger.error(f'Could not reload active mapping: {e}')
            self.active_mapping = {}

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

    def _listen(self):
        self.logger.info("MIDI listener started")
        for msg in self.input_port:
            self.handle_message(msg)
            if not self.running:
                break

    def handle_message(self, msg):
        from backend.utils.value_mapping import remap_from_mapping
        print(f"MIDI RECEIVED: {msg}")
        self.logger.debug(f"Received MIDI: {msg}")
        midi_dict = msg.dict() if hasattr(msg, 'dict') else None
        ui_update = None
        active_mapping = self.active_mapping

        # Only handle control_change and note_on/note_off for mapping
        if midi_dict:
            if midi_dict.get('type') == 'control_change':
                # Find mapping entry by midi_cc
                for key, entry in active_mapping.items():
                    if entry.get('midi_cc') == midi_dict.get('control'):
                        # Extract channel from mapping key, e.g. 'fader_2' -> 2
                        try:
                            channel = int(key.split('_')[1])
                        except (IndexError, ValueError):
                            channel = 1  # fallback
                        value = midi_dict.get('value', 0)  # Use raw MIDI value for UI
                        ui_update = {
                            'type': 'ui_update',
                            'event': key.split('_')[0],
                            'channel': channel,
                            'value': value
                        }
                        # --- Send OSC message ---
                        osc_address = entry.get('osc')
                        if osc_address and self.osc:
                            from backend.utils.value_mapping import remap_from_mapping
                            osc_value = remap_from_mapping(value, entry, direction="midi_to_osc")
                            self.osc.send_message(osc_address, osc_value)
                        break
            elif midi_dict.get('type') in ('note_on', 'note_off'):
                for key, entry in active_mapping.items():
                    if entry.get('midi_note') == midi_dict.get('note'):
                        # Extract channel from mapping key, e.g. 'mute_2' -> 2
                        try:
                            channel = int(key.split('_')[1])
                        except (IndexError, ValueError):
                            channel = 1  # fallback
                        # For buttons: MIDI 127 = True, MIDI 0 = False
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
                        # --- Send OSC message ---
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
                # If mapping found, broadcast ui_update; else, fallback to raw MIDI
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
