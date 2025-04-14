# XCTL Project

Tools and documentation for working with Behringer X-Touch control surface MIDI protocol

## Project Structure

```
.
├── docs/               - Protocol documentation
│   ├── XCTL_PROTOCOL.md
│   └── XCTL_MIDI_MAPPINGS_SUMMARY.md
├── tools/              - Web-based utilities
│   └── scribble_generator.html
├── scripts/            - Python scripts
│   └── send_scribble.py
└── examples/           - Example configurations
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
2. Open `tools/scribble_generator.html` in browser

## Dependencies

- Python 3.x
- python-rtmidi
- Web browser for HTML tools
