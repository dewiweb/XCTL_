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

## Launching the XCTL_ App

To start the full XCTL_ application (backend API, WebSocket server, and frontend):

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **(Optional) Install frontend dependencies:**
   If you use any frontend package manager (npm/yarn), install as needed. For pure HTML/JS, skip this step.

3. **Start the backend (API + WebSocket + OSC):**
   ```bash
   python -m src.backend.main
   ```
   This will launch the backend server, including OSC and WebSocket support.

4. **Open the frontend:**
   - By default, the web UI is served at [http://localhost:8000](http://localhost:8000) (or as configured).
   - Open this address in your browser to use the XCTL_ interface.

**Note:**
- OSC and MIDI device configuration can be changed in `src/config.yaml` or via the web UI settings panel.
- For troubleshooting, check backend logs for WebSocket and OSC connectivity.
