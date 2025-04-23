# midi_handler.py
"""
MIDI connection and message handling for XCTL_ backend.
Uses mido for MIDI I/O. Wraps input/output in a class for easy integration.
"""
import mido
import threading
import logging

class MidiHandler:
    def __init__(self, input_port_name, output_port_name):
        self.input_port_name = input_port_name
        self.output_port_name = output_port_name
        self.input_port = None
        self.output_port = None
        self.running = False
        self.logger = logging.getLogger('MidiHandler')

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
        # Placeholder: integrate with mapping/bridge logic
        self.logger.debug(f"Received MIDI: {msg}")

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
