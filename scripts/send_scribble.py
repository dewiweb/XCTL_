import time
import rtmidi

# Color reference based on protocol docs
COLORS = {
    # Format: {'name': (bg_value, text_bright_bit)}
    # Dark text options
    'black': (0x00, 0x00),
    'red': (0x01, 0x00),
    'green': (0x02, 0x00),
    'yellow': (0x03, 0x00),
    'blue': (0x04, 0x00),
    'magenta': (0x05, 0x00),
    'cyan': (0x06, 0x00),
    'white': (0x07, 0x00),
    
    # Bright text options
    'black_bright': (0x00, 0x40),
    'red_bright': (0x01, 0x40),
    'green_bright': (0x02, 0x40),
    'yellow_bright': (0x03, 0x40),
    'blue_bright': (0x04, 0x40),
    'magenta_bright': (0x05, 0x40),
    'cyan_bright': (0x06, 0x40),
    'white_bright': (0x07, 0x40)
}

def send_scribble(channel, line1_text, line1_color, line1_align,
                 line2_text, line2_color, line2_align):
    """Send complete scribble strip message"""
    # Initialize MIDI
    midiout = rtmidi.MidiOut()
    
    try:
        if midiout.get_ports():
            midiout.open_port(0)
        else:
            midiout.open_virtual_port("XCTL Virtual")
        
        # Calculate color byte
        l1_bg, l1_bit = COLORS[line1_color]
        l2_bg, l2_bit = COLORS[line2_color]
        color_byte = l1_bg | l2_bg | l1_bit | (l2_bit << 1)
        
        # Format lines
        def format_line(text, align):
            if align == 'left':
                return text.ljust(7)
            elif align == 'right':
                return text.rjust(7)
            else:  # center
                return text.center(7)
                
        line1 = format_line(line1_text, line1_align)
        line2 = format_line(line2_text, line2_align)
        
        # Build message
        message = [
            0x00, 0x00, 0x66, 0x58,  # Header
            int(channel, 16),          # Channel (20h-27h)
            color_byte                 # Color control
        ]
        
        # Add text (convert to ASCII codes)
        message.extend(ord(c) for c in line1)
        message.extend(ord(c) for c in line2)
        
        # Send message
        midiout.send_message(message)
        print(f"Sent: {' '.join(f'{x:02x}' for x in message)}")
        
    finally:
        midiout.close_port()

# Example usage
if __name__ == "__main__":
    send_scribble(
        channel="20",
        line1_text="Ch 1",
        line1_color="white_bright",
        line1_align="center",
        line2_text="aB3",
        line2_color="black",
        line2_align="right"
    )
