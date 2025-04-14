# XCTL Protocol Documentation

## Preamble

This documentation is based on reverse engineering work made possible by AVPlus in Adelaide, Australia, who provided an XR16 for examination. All findings are based on:

- Behringer X-Touch running firmware 1.15 (1.03)
- Behringer XR16 running firmware 1.12
- Behringer X-AIR-Edit Mac V1.3

This work claims no invention or intellectual ownership, and no hacking attempts were made. The observations concern purely educational analysis of MIDI data exchange between devices.

## Overview

```
[Host Application] ← MIDI → [X-Touch]
   ↑                     ↑
   │                     │
   SysEx              User Input
   Handshake         (Notes/CC)

Operating Modes:
1. Pure XCTL - Full control via MIDI
2. XCTL/MC - Mixed Mackie Control
3. XCTLHUI - HUI protocol emulation
```

## Conventions

The original documentation uses color coding to distinguish between different data flows:

- **Green**: Data sent TO the X-Touch (LED control, fader movement, scribble strip updates)
- **Red**: Data sent FROM the X-Touch (user interactions like button presses, encoder turns, fader touches)

## Essential Hardware Handshake

The X-Touch requires constant MIDI SysEx messages to maintain connection (without start F0/end F7 bytes):

### Ping from X-Touch (every 2 seconds)
`00 20 32 58 54 00`

### Required Response (every 6-8 seconds)
`00 00 66 14 00`

Notes:
- No strict call-response relationship required
- Missing responses will trigger "MIDI: No Link" error
- Example implementation: Simple timed loop sending response every 6 seconds

## Protocol Principles

All controls follow these principles (exceptions noted):

- *1: Only through physical MIDI ports in "pure" Xctl Mode (not in Xctl/MC or XctlHUI)
- *2: LEDs without button action
- *3: Buttons without LED action

## Message Structure

### Basic Message Types
1. **SysEx Messages** (System Exclusive):
   - Handshake: `00 20 32 58 54 00` (ping) / `00 00 66 14 00` (response)
   - Always omit F0/F7 bytes in XCTL mode

2. **MIDI CC Messages** (Control Change):
   - Format: `[Status] [CC#] [Value]`
   - Channel 1-16 for channel-specific controls
   - Special CC# ranges for:
     * LED rings (48-55)
     * LCD segments (96-123)

3. **Note Messages**:
   - Button presses: Note On/Off
   - Velocity 127 = press, 0 = release

### Data Formats
- **LED Values**: 0-127 (7-bit)
- **Fader Positions**: 14-bit (Pitch Bend messages)
- **Encoder Values**: Relative +/- 1 (CC messages)

### Timing Requirements
- Minimum 1ms between messages
- Maximum 8s between handshake responses

## Command Reference

### LED Control (Outbound)

<table>
  <thead>
    <tr>
      <th></th>
      <th colspan="3">Control name(s) on X‐Touch</th>
    </tr>
    <tr>
      <th>MIDI Value</th>
      <th>OFF</th>
      <th>FLASHING</th>
      <th>SOLID</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>0</td>
      <td>Note On</td>
      <td>-</td>
      <td>-</td>
    </tr>
    <tr>
      <td>1</td>
      <td>-</td>
      <td>Note On</td>
      <td>-</td>
    </tr>
    <tr>
      <td>2-127</td>
      <td>-</td>
      <td>-</td>
      <td>Note On</td>
    </tr>
  </tbody>
</table>

*Applies to all LED controls listed below*

### Button Actions (Inbound)
| | Control name(s) on X-Touch |
|----------------|---------------------------|
| MIDI Value | <Control name> |
| NOTE<MIDI Note> | |
| PRESS | RELEASE |
|----------------|---------|
| 0 | Note Off |
| 127 | Note On | |

*Note: Replace <...> placeholders with actual control names*

## Control Mappings

### FADER Section (Ch 1-8 + MAIN)
| Control | MIDI Note | LED Color | Notes |
|---------|-----------|-----------|-------|
| REC/CLIP | 0-7 | RED | |
| SOLO | 8-15 | ORANGE | |
| MUTE | 16-23 | RED | |
| SELECT/SIG | 24-31 | GREEN | |
| FLIP | 50 | ORANGE | |

### FADER Section (Ch 1-8 + MAIN)

**Setting Motor (Outbound - Green)**
| MIDI Value | Pitch Bend MIDI Ch 1-9 |
|------------|------------------------|
| -8192 | -inf dB (x) |
| 4396 | 0 dB (x) |
| 8191 | +10dB (x) |

**Moving/Transmitting (Inbound - Red)**
| MIDI Value | Pitch Bend MIDI Ch 1-9 |
|------------|------------------------|
| -8192 | -inf dB (x) |
| 4396 | 0 dB (x) |
| 8191 | +10dB (x) |

**Touching Faders (Inbound - Red)**
| MIDI Value | NOTE 104-112 |
|------------|--------------|
| 0 | RELEASE (Note Off) |
| 127 | TOUCH (Note On) |

### ENCODER ASSIGN Section
| Control | MIDI Note | LED Color | Notes |
|---------|-----------|-----------|-------|
| TRACK | 40 | ORANGE | |
| SEND | 41 | ORANGE | |
| PAN/SURROUND | 42 | ORANGE | |
| PLUG-IN | 43 | ORANGE | |
| EQ | 44 | ORANGE | |
| INST | 45 | ORANGE | |

### Encoder LED Rings (Ch 1-8)
See [XCTL_LED_RING_MAPPINGS.md](XCTL_LED_RING_MAPPINGS.md) for complete control patterns and LED ring documentation.

### TIMECODE DISPLAY Section
| Control | MIDI Note | LED Color | Notes |
|---------|-----------|-----------|-------|
| DISPLAY | 52 | - | *3 |
| SOLO | 115 | ORANGE | *2 |
| SMPTE (LED) | 113 | RED | *1,*2 |
| SMPTE/BEATS | 53 | - | *1,*3 |
| BEATS (LED) | 114 | RED | *1,*2 |

### VIEW Section
| Control | MIDI Note | LED Color | Notes |
|---------|-----------|-----------|-------|
| GLOBAL VIEW | 51 | ORANGE | |
| MIDI TRACKS | 62 | ORANGE | |
| INPUTS | 63 | ORANGE | |
| AUDIO TRACKS | 64 | ORANGE | |
| AUDIO INST | 65 | ORANGE | |
| AUX | 66 | ORANGE | |
| BUSES | 67 | ORANGE | |
| OUTPUTS | 68 | ORANGE | |
| USER | 69 | ORANGE | |

### FUNCTION Section
| Control | MIDI Note | LED Color | Notes |
|---------|-----------|-----------|-------|
| F1-F8 | 54-61 | ORANGE | |

### MODIFY Section
| Control | MIDI Note | LED Color | Notes |
|---------|-----------|-----------|-------|
| SHIFT | 70 | ORANGE | |
| OPTION | 71 | ORANGE | |
| CONTROL | 72 | ORANGE | |
| / ALT | 73 | ORANGE | |

### AUTOMATION Section
| Control | MIDI Note | LED Color | Notes |
|---------|-----------|-----------|-------|
| READ/OFF | 74 | GREEN | |
| WRITE | 75 | RED | |
| TRIM | 76 | ORANGE | |
| TOUCH | 77 | ORANGE | |
| LATCH | 78 | ORANGE | |
| GROUP | 79 | GREEN | |

### UTILITY Section
| Control | MIDI Note | LED Color | Notes |
|---------|-----------|-----------|-------|
| SAVE | 80 | RED | |
| UNDO | 81 | GREEN | |
| CANCEL | 82 | ORANGE | |
| ENTER | 83 | ORANGE | |

### TRANSPORT Section
| Control | MIDI Note | LED Color | Notes |
|---------|-----------|-----------|-------|
| MARKER | 84 | GREEN | *1 |
| NUDGE | 85 | GREEN | *1 |
| CYCLE | 86 | GREEN | *1 |
| DROP | 87 | RED | *1 |
| REPLACE | 88 | RED | *1 |
| CLICK | 89 | GREEN | *1 |
| SOLO | 90 | ORANGE | *1 |
| REW | 91 | ORANGE | *1 |
| FF | 92 | ORANGE | *1 |
| STOP | 93 | ORANGE | *1 |
| PLAY | 94 | GREEN | *1 |
| RECORD | 95 | RED | *1 |

### PAGE Section
| Control | MIDI Note | LED Color | Notes |
|---------|-----------|-----------|-------|
| FADER BANK 3-4 | 46-47 | ORANGE | |
| CHANNEL 3-4 | 48-49 | ORANGE | |

### NAVIGATION Section
| Control | MIDI Note | LED Color | Notes |
|---------|-----------|-----------|-------|
| UP | 96 | ORANGE | *1 |
| DOWN | 97 | ORANGE | *1 |
| LEFT | 98 | ORANGE | *1 |
| RIGHT | 99 | ORANGE | *1 |
| ZOOM | 100 | BLUE | *1 |
| SCRUB | 101 | RED | *1 |

### WHEEL Section (Inbound - Red)

**Encoder Action**
| MIDI Value | CC 60 |
|------------|-------|
| 1 | CW (x) |
| 65 | CCW (x) |

### SCRIBBLE STRIP Section (Ch 1-8)

**Message Format Notes:**
- All MIDI SysEx messages omit the required starting F0 and ending F7
- Example below sets Scribble strip 1 (Channel 20h) to:
  - Line 1: Centered "Ch 1" (bright font on dark background)
  - Line 2: Right-aligned "aB3" (dark font on bright background)

**Message Structure:**
| Header | Channel (20h-27h) | Color* | Line 1 (7 ASCII bytes) | Line 2 (7 ASCII bytes) |
|--------|------------------|--------|------------------------|------------------------|
| 00 00 66 58 | 20 | 41 | 43 68 20 31 00 00 00 | 20 20 20 20 61 42 33 |
| (fixed) | (Ch 1) | (Red) | "Ch 1" (centered) | "aB3" (right-aligned) |

**Color Reference (Full):**
| Hex Value | 00/08/10...38 | 01/09/11...39 | 02/0A/12...3A | 03/0B/13...3B | 04/0C/14...3C | 05/0D/15...3D | 06/0E/16...3E | 07/0F/17...3F |
|-----------|---------------|---------------|---------------|---------------|---------------|---------------|---------------|---------------|
| Effect | Display OFF | Red | Green | Yellow | Blue | Pink | Cyan | White |

**Color Reference (Inverted Line 2):**
| Hex Value | 40/48/50...78 | 41/49/51...79 | 42/4A/52...7A | 43/4B/53...7B | 44/4C/54...7C | 45/4D/55...7D | 46/4E/56...7E | 47/4F/57...7F |
|-----------|---------------|---------------|---------------|---------------|---------------|---------------|---------------|---------------|
| Effect | Display OFF | Red | Green | Yellow | Blue | Pink | Cyan | White |

*Note: 00h centers text, 20h works as non-breakable space*

### LCD 7-Segment Displays
See [XCTL_LCD_7SEGMENT.md](XCTL_LCD_7SEGMENT.md) for complete segment mappings and display controls.

### CHANNEL METERING Section

**Protocol Details:**
- Uses Channel Pressure messages on MIDI Channel 1 (Outbound - from host to X-Touch)
- Each channel distinguished by value range:
  - Channel 1: 00-0F
  - Channel 2: 10-1F
  - ... 
  - Channel 8: 70-7F

**Behavior Characteristics:**
- Fast automatic decay (peaks only)
- X-AIR mixers send zero values every ~0.06s during silence
- Minimum viable update rate: ~1.2s (no visible flicker)

**Implementation Notes:**
- 8-segment LED meters
- Values map linearly to meter position
- Works only in pure XCTL mode

**Fader Metering Channels:**
| Channel on X-Touch | MIDI Value Offset |
|--------------------|-------------------|
| Ch 1 | 0 |
| Ch 2 | 16 |
| Ch 3 | 32 |
| Ch 4 | 48 |
| Ch 5 | 64 |
| Ch 6 | 80 |
| Ch 7 | 96 |
| Ch 8 | 112 |

**Meter LED Mapping:**
| MIDI Value | 1 (Green) | 2 (Green) | 3 (Green) | 4 (Green) | 5 (Orange) | 6 (Orange) | 7 (Orange) | 8 (Red) |
|------------|-----------|-----------|-----------|-----------|------------|------------|------------|---------|
| <Ch Offset> + 0 | | | | | | | | |
| +1 | x | | | | | | | |
| +2 | x | x | | | | | | |
| +3 | x | x | x | | | | | |
| +4 | x | x | x | x | | | | |
| +5 | x | x | x | x | x | | | |
| +6 | x | x | x | x | x | x | | |
| +7 | x | x | x | x | x | x | x | |
| +8 to +15 | x | x | x | x | x | x | x | x |

*Channel Offsets:*
- Ch1: 00-0F
- Ch2: 10-1F
- ...
- Ch8: 70-7F

## Verification

| Component | Tested Firmware | Verified Behavior | Notes |
|-----------|-----------------|-------------------|-------|
| X-Touch | 1.15 (1.03) | Full protocol support | Pure XCTL mode only |
| XR16 | 1.12 | Partial support | Limited to fader/transport controls |
| X-AIR-Edit | V1.3 | Basic communication | Requires handshake |

**Known Limitations:**
1. USB MIDI has reduced functionality in XCTL/MC mode
2. Some controls remain assigned to MC/HUI side in hybrid mode
3. Network mode not fully documented

## Implementation Notes

(To be filled with practical usage information)

## Implementation Findings

### Xctl Network Option
- Appears to replicate MIDI messages but transferred via raw network protocol
- Currently not fully documented in this reference

### Hybrid Mode Behavior
When using both physical MIDI ports and USB MIDI:
- Some controls remain assigned to MC/HUI side regardless of Xctl/MC mode:
  * Parts of TIMECODE display
  * Entire TRANSPORT section
  * NAVIGATION section
  * JOG DIAL WHEEL
- Marked with *1 in documentation
- For full physical MIDI control, may need to use "pure" Xctl protocol

## Resources

- [Original PDF Documentation](Xctl Protocol for X-Touch V1.0.pdf)
- [LED Ring Mappings](XCTL_LED_RING_MAPPINGS.md) - Detailed MIDI CC to LED pattern mappings
- [LCD 7-Segment Control](XCTL_LCD_7SEGMENT.md) - Segment mapping and timecode display controls
