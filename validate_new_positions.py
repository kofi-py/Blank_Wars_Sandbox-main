#!/usr/bin/env python3
"""Quick validation of NEW bubble positions after fixes"""

# NEW positions after fixes
NEW_POSITIONS = {
    'merlin': {'x': 20, 'y': 15},
    'achilles': {'x': 40, 'y': 35},
    'cleopatra': {'x': 70, 'y': 5},
    'joan': {'x': 60, 'y': 55},
    'dracula': {'x': 30, 'y': 55}
}

# Character positions
CHAR_POSITIONS = {
    'merlin': {'x': 10, 'y': 40},
    'achilles': {'x': 40, 'y': 20},
    'cleopatra': {'x': 70, 'y': 30},
    'joan': {'x': 60, 'y': 80},
    'dracula': {'x': 20, 'y': 80}
}

BUBBLE_WIDTH = 20
BUBBLE_HEIGHT = 10
CHAR_MARGIN = 8

def check_overlap(bubble_pos, char_pos):
    """Check if bubble overlaps character"""
    bubble_box = {
        'left': bubble_pos['x'] - BUBBLE_WIDTH/2,
        'right': bubble_pos['x'] + BUBBLE_WIDTH/2,
        'top': bubble_pos['y'],
        'bottom': bubble_pos['y'] + BUBBLE_HEIGHT
    }

    char_box = {
        'left': char_pos['x'] - CHAR_MARGIN,
        'right': char_pos['x'] + CHAR_MARGIN,
        'top': char_pos['y'] - CHAR_MARGIN,
        'bottom': char_pos['y'] + CHAR_MARGIN
    }

    return not (bubble_box['right'] < char_box['left'] or
               bubble_box['left'] > char_box['right'] or
               bubble_box['bottom'] < char_box['top'] or
               bubble_box['top'] > char_box['bottom'])

print("=" * 60)
print("✅ VALIDATING NEW POSITIONS")
print("=" * 60)

overlaps = 0
for char_id in NEW_POSITIONS:
    bubble_pos = NEW_POSITIONS[char_id]
    char_pos = CHAR_POSITIONS[char_id]

    has_overlap = check_overlap(bubble_pos, char_pos)

    status = "🚨 OVERLAP" if has_overlap else "✅ CLEAR"
    print(f"{char_id:12} {status}")

    if has_overlap:
        overlaps += 1

print("=" * 60)
if overlaps == 0:
    print("✅ SUCCESS! All bubbles are properly positioned.")
    print("   No character overlaps detected.")
else:
    print(f"❌ FAILED! {overlaps} overlap(s) still detected.")
print("=" * 60)
