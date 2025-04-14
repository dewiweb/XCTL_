# XCTL Project

Tools and documentation for working with Behringer X-Touch control surface MIDI protocol

## Verified Project Structure

```
.
├── docs/
│   ├── XCTL_PROTOCOL.md          - Core protocol documentation
│   ├── XCTL_LCD_7SEGMENT.md      - 7-segment display mappings
│   ├── XCTL_LED_RING_MAPPINGS.md - LED ring behavior documentation
│   └── references/
│       ├── Xctl Protocol for X-Touch V1.0.pdf
│       └── xctl.xlsx             - Spreadsheet reference
├── tools/
│   └── scribble_generator.html   - Interactive SysEx generator
├── scripts/
│   └── send_scribble.py          - Python MIDI sender
├── examples/                     - (Planned for future use)
├── LICENSE                       - Project license
└── README.md                     - This documentation
```

## Key Features

- **Scribble Strip Control**: Generate and send custom LCD messages
- **MIDI Protocol Documentation**: Complete mapping of SysEx messages
- **Web Interface**: User-friendly tool for message generation

## Quick Start

### Option 1: Python Script
For direct MIDI control:
```bash
python scripts/send_scribble.py --text "YOUR_TEXT" --color 01 --align center
```

### Option 2: Web Interface
1. Generate your message using the [Scribble Generator](https://dewiweb.github.io/XCTL_/tools/scribble_generator.html)
2. Copy the output SysEx message
3. Send via MIDI software or the included script:
```bash
python scripts/send_scribble.py --sysex "00 00 66 58..."
```

## Dependencies

- Python 3.x
- python-rtmidi
- Web browser for HTML tools
