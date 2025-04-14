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

1. For LCD control:
   ```bash
   python scripts/send_scribble.py
   ```
2. Open [Scribble Generator](https://dewiweb.github.io/XCTL_/scribble_generator.html) in browser

## Dependencies

- Python 3.x
- python-rtmidi
- Web browser for HTML tools
