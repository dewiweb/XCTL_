# default_mapping.py
"""
Default mapping from UI events to OSC addresses and argument keys.
Extend or modify as needed for your application.
"""

# For each UI event type and channel, define the OSC address and the argument keys expected from the frontend
# Example: ('fader', 1) -> ('/channel/1/fader', ['value'])
def get_osc_mapping(event_type, channel=None):
    """
    Returns (osc_address, arg_keys) tuple for a given UI event type and channel.
    """
    if event_type == 'fader' and channel:
        return f"/channel/{channel}/fader", ['value']
    if event_type == 'knob' and channel:
        return f"/channel/{channel}/knob", ['value']
    if event_type == 'mute' and channel:
        return f"/channel/{channel}/mute", ['state']
    if event_type == 'solo' and channel:
        return f"/channel/{channel}/solo", ['state']
    # Add more mappings as needed
    return None, None

# Optionally, a dictionary for quick lookup of supported event types
SUPPORTED_EVENT_TYPES = ['fader', 'knob', 'mute', 'solo']
