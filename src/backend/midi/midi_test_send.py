import mido
import time

# Change this to your correct output port if needed:
MIDI_OUT_PORT = 'LCL301201 1'

def blink_all_buttons(block_size=8, on_time=0.5, off_time=0.5):
    """
    Blink button notes (0-50) in blocks of 8. Each block blinks in a loop until Enter is pressed in the terminal, then moves to the next block.
    Prints which block is currently flashing to help identify physical mapping.
    """
    import sys
    notes = list(range(0, 51))  # Button notes 0-50 inclusive
    blocks = [notes[i:i+block_size] for i in range(0, len(notes), block_size)]
    with mido.open_output(MIDI_OUT_PORT) as out:
        for block_idx, block in enumerate(blocks):
            print(f"\n[BLINK TEST] Flashing block {block_idx+1}/{len(blocks)} (notes {block[0]} to {block[-1]})...")
            print("Press Enter to move to the next block...")
            try:
                import threading
                stop = False
                def wait_for_enter():
                    nonlocal stop
                    input()
                    stop = True
                t = threading.Thread(target=wait_for_enter)
                t.daemon = True
                t.start()
                while not stop:
                    # ON
                    for note in block:
                        out.send(mido.Message('note_on', note=note, velocity=127))
                    time.sleep(on_time)
                    # OFF
                    for note in block:
                        out.send(mido.Message('note_on', note=note, velocity=0))
                    time.sleep(off_time)
            finally:
                # Ensure block is off before moving on
                for note in block:
                    out.send(mido.Message('note_on', note=note, velocity=0))
        print("[BLINK TEST] Done flashing all blocks.")

if __name__ == "__main__":
    blink_all_buttons()