# XCTL LCD 7-Segment Display Control

## Segment Identification

**Schematic Layout:**
```
 -- a --
|       |
f       b
|       |
 -- g --
|       |
e       c
|       |
 -- d --  • dp
```

| Bit | Segment | Position |
|-----|---------|----------|
| 0 | a | Top |
| 1 | b | Upper right |
| 2 | c | Lower right |
| 3 | g | Middle |
| 4 | d | Bottom |
| 5 | e | Lower left |
| 6 | f | Upper left |
| 7 | dp | Decimal point (bottom right) |

## General Principles
*Note 1:* LCD control only works through physical MIDI ports in "pure" XCTL mode (not in XCTL/MC or XCTLHUI)
- All LCD digits follow the same segment mapping pattern shown above
- Each digit can display:
  - Numbers 0-9
  - Letters A-F (hexadecimal)
  - Some special characters
- Decimal point is controlled separately via a different MIDI CC:
  - Located in bottom right corner of each digit
  - Example: To show "5." send both the digit value and decimal point CC

**Exception:**
- The MAIN display (digit 8) has slightly different segment mapping for special characters

## MIDI Value Mapping

| Value | a | b | c | d | e | f | g |
|-------|---|---|---|---|---|---|---|
| 0     |   |   |   |   |   |   |   |
| 1     | x |   |   |   |   |   |   |
| 2     |   | x |   |   |   |   |   |
| 3     | x | x |   |   |   |   |   |
| 4     |   |   | x |   |   |   |   |
| 5     | x |   | x |   |   |   |   |
| 6     |   | x | x |   |   |   |   |
| 7     | x | x | x |   |   |   |   |
| 8     |   |   |   | x |   |   |   |
| 9     | x |   |   | x |   |   |   |
| 10    |   | x |   | x |   |   |   |
| 11    | x | x |   | x |   |   |   |
| 12    |   |   | x | x |   |   |   |
| 13    | x |   | x | x |   |   |   |
| 14    |   | x | x | x |   |   |   |
| 15    | x | x | x | x |   |   |   |
| 16    |   |   |   |   | x |   |   |
| 17    | x |   |   |   | x |   |   |
| 18    |   | x |   |   | x |   |   |
| 19    | x | x |   |   | x |   |   |
| 20    |   |   | x |   | x |   |   |
| 21    | x |   | x |   | x |   |   |
| 22    |   | x | x |   | x |   |   |
| 23    | x | x | x |   | x |   |   |
| 24    |   |   |   | x | x |   |   |
| 25    | x |   |   | x | x |   |   |
| 26    |   | x |   | x | x |   |   |
| 27    | x | x |   | x | x |   |   |
| 28    |   |   | x | x | x |   |   |
| 29    | x |   | x | x | x |   |   |
| 30    |   | x | x | x | x |   |   |
| 31    | x | x | x | x | x |   |   |
| 32    |   |   |   |   |   | x |   |
| 33    | x |   |   |   |   | x |   |
| 34    |   | x |   |   |   | x |   |
| 35    | x | x |   |   |   | x |   |
| 36    |   |   | x |   |   | x |   |
| 37    | x |   | x |   |   | x |   |
| 38    |   | x | x |   |   | x |   |
| 39    | x | x | x |   |   | x |   |
| 40    |   |   |   | x |   | x |   |
| 41    | x |   |   | x |   | x |   |
| 42    |   | x |   | x |   | x |   |
| 43    | x | x |   | x |   | x |   |
| 44    |   |   | x | x |   | x |   |
| 45    | x |   | x | x |   | x |   |
| 46    |   | x | x | x |   | x |   |
| 47    | x | x | x | x |   | x |   |
| 48    |   |   |   |   | x | x |   |
| 49    | x |   |   |   | x | x |   |
| 50    |   | x |   |   | x | x |   |
| 51    | x | x |   |   | x | x |   |
| 52    |   |   | x |   | x | x |   |
| 53    | x |   | x |   | x | x |   |
| 54    |   | x | x |   | x | x |   |
| 55    | x | x | x |   | x | x |   |
| 56    |   |   |   | x | x | x |   |
| 57    | x |   |   | x | x | x |   |
| 58    |   | x |   | x | x | x |   |
| 59    | x | x |   | x | x | x |   |
| 60    |   |   | x | x | x | x |   |
| 61    | x |   | x | x | x | x |   |
| 62    |   | x | x | x | x | x |   |
| 63    | x | x | x | x | x | x |   |
| 64    |   |   |   |   |   |   | x |
| 65    | x |   |   |   |   |   | x |
| 66    |   | x |   |   |   |   | x |
| 67    | x | x |   |   |   |   | x |
| 68    |   |   | x |   |   |   | x |
| 69    | x |   | x |   |   |   | x |
| 70    |   | x | x |   |   |   | x |
| 71    | x | x | x |   |   |   | x |
| 72    |   |   |   | x |   |   | x |
| 73    | x |   |   | x |   |   | x |
| 74    |   | x |   | x |   |   | x |
| 75    | x | x |   | x |   |   | x |
| 76    |   |   | x | x |   |   | x |
| 77    | x |   | x | x |   |   | x |
| 78    |   | x | x | x |   |   | x |
| 79    | x | x | x | x |   |   | x |
| 80    |   |   |   |   | x |   | x |
| 81    | x |   |   |   | x |   | x |
| 82    |   | x |   |   | x |   | x |
| 83    | x | x |   |   | x |   | x |
| 84    |   |   | x |   | x |   | x |
| 85    | x |   | x |   | x |   | x |
| 86    |   | x | x |   | x |   | x |
| 87    | x | x | x |   | x |   | x |
| 88    |   |   |   | x | x |   | x |
| 89    | x |   |   | x | x |   | x |
| 90    |   | x |   | x | x |   | x |
| 91    | x | x |   | x | x |   | x |
| 92    |   |   | x | x | x |   | x |
| 93    | x |   | x | x | x |   | x |
| 94    |   | x | x | x | x |   | x |
| 95    | x | x | x | x | x |   | x |
| 96    |   |   |   |   |   | x | x |
| 97    | x |   |   |   |   | x | x |
| 98    |   | x |   |   |   | x | x |
| 99    | x | x |   |   |   | x | x |
| 100   |   |   | x |   |   | x | x |
| 101   | x |   | x |   |   | x | x |
| 102   |   | x | x |   |   | x | x |
| 103   | x | x | x |   |   | x | x |
| 104   |   |   |   | x |   | x | x |
| 105   | x |   |   | x |   | x | x |
| 106   |   | x |   | x |   | x | x |
| 107   | x | x |   | x |   | x | x |
| 108   |   |   | x | x |   | x | x |
| 109   | x |   | x | x |   | x | x |
| 110   |   | x | x | x |   | x | x |
| 111   | x | x | x | x |   | x | x |
| 112   |   |   |   |   | x | x | x |
| 113   | x |   |   |   | x | x | x |
| 114   |   | x |   |   | x | x | x |
| 115   | x | x |   |   | x | x | x |
| 116   |   |   | x |   | x | x | x |
| 117   | x |   | x |   | x | x | x |
| 118   |   | x | x |   | x | x | x |
| 119   | x | x | x |   | x | x | x |
| 120   |   |   |   | x | x | x | x |
| 121   | x |   |   | x | x | x | x |
| 122   |   | x |   | x | x | x | x |
| 123   | x | x |   | x | x | x | x |
| 124   |   |   | x | x | x | x | x |
| 125   | x |   | x | x | x | x | x |
| 126   |   | x | x | x | x | x | x |
| 127   | x | x | x | x | x | x | x |

*Complete mapping for all 128 MIDI values*

## ASSIGNMENT Section
| Digit Position | MIDI CC (no decimal) | MIDI CC (w/ decimal) |
|----------------|----------------------|----------------------|
| Left digit | 96 | 112 |
| Right digit | 97 | 113 |

## TIMECODE DISPLAY SECTIONS

### BARS/HOURS
| Digit Position | MIDI CC (no decimal) | MIDI CC (w/ decimal) | Notes |
|----------------|----------------------|----------------------|-------|
| Left digit | 98 | 114 | *1 |
| Middle digit | 99 | 115 | *1 |
| Right digit | 100 | 116 | *1 |

### BEATS/MINUTES
| Digit Position | MIDI CC (no decimal) | MIDI CC (w/ decimal) | Notes |
|----------------|----------------------|----------------------|-------|
| Left digit | 101 | 117 | *1 |
| Right digit | 102 | 118 | *1 |

### SUB DIVISION/SECONDS
| Digit Position | MIDI CC (no decimal) | MIDI CC (w/ decimal) | Notes |
|----------------|----------------------|----------------------|-------|
| Left digit | 103 | 119 | *1 |
| Right digit | 104 | 120 | *1 |

### TICKS/FRAMES
| Digit Position | MIDI CC (no decimal) | MIDI CC (w/ decimal) | Notes |
|----------------|----------------------|----------------------|-------|
| Left digit | 105 | 121 | *1 |
| Middle digit | 106 | 122 | *1 |
| Right digit | 107 | 123 | *1 |

*Note 1:* Only through physical MIDI ports in "pure" XCTL mode (not in XCTL/MC or XCTLHUI)
