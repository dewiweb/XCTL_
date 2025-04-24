"""
value_mapping.py
Utility functions for remapping/scaling values between MIDI, OSC, and UI ranges.
"""

def remap_value(value, in_min, in_max, out_min, out_max):
    """
    Linearly scale a value from [in_min, in_max] to [out_min, out_max].
    Handles edge cases where in_max == in_min.
    """
    if in_max == in_min:
        return out_min  # Avoid division by zero; treat as constant mapping
    scaled = (float(value) - in_min) / (in_max - in_min)
    return out_min + scaled * (out_max - out_min)


def remap_from_mapping(value, mapping_entry, direction="midi_to_osc"):
    """
    Remap a value using a mapping entry dict.
    direction: 'midi_to_osc' or 'osc_to_midi'
    """
    if direction == "midi_to_osc":
        in_min = mapping_entry.get("midi_min", 0)
        in_max = mapping_entry.get("midi_max", 127)
        out_min = mapping_entry.get("osc_min", 0.0)
        out_max = mapping_entry.get("osc_max", 1.0)
    elif direction == "osc_to_midi":
        in_min = mapping_entry.get("osc_min", 0.0)
        in_max = mapping_entry.get("osc_max", 1.0)
        out_min = mapping_entry.get("midi_min", 0)
        out_max = mapping_entry.get("midi_max", 127)
    else:
        raise ValueError(f"Unknown direction: {direction}")
    return remap_value(value, in_min, in_max, out_min, out_max)
