#!/usr/bin/env python3
"""
Word Bubble Position Analyzer for Blank Wars 2026
Based on Comic Book Industry Best Practices

Applies standard rules:
1. Never cover characters with bubbles
2. Tail points to character's mouth
3. Never cross tails
4. 30-40% bubble space, 60-70% character visibility
5. Minimum distance from character (15-20%)
6. Keep bubbles 5-10% from screen edges

Usage:
    python analyze_word_bubble_positions.py
"""

import json
import math
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class AnchorPoint(Enum):
    """Bubble tail anchor points"""
    TOP = "top"
    TOP_LEFT = "top-left"
    TOP_RIGHT = "top-right"
    BOTTOM = "bottom"
    BOTTOM_LEFT = "bottom-left"
    BOTTOM_RIGHT = "bottom-right"
    LEFT = "left"
    RIGHT = "right"


@dataclass
class Position:
    """2D position with percentage coordinates (0-100%)"""
    x: float
    y: float
    scale: float = 1.0

    def distance_to(self, other: 'Position') -> float:
        """Euclidean distance to another position"""
        return math.sqrt((self.x - other.x)**2 + (self.y - other.y)**2)

    def __str__(self):
        return f"({self.x:.1f}%, {self.y:.1f}%)"


@dataclass
class BoundingBox:
    """Rectangular bounding box for collision detection"""
    left: float
    right: float
    top: float
    bottom: float

    def overlaps(self, other: 'BoundingBox') -> bool:
        """Check if this box overlaps another"""
        return not (self.right < other.left or
                   self.left > other.right or
                   self.bottom < other.top or
                   self.top > other.bottom)

    def area(self) -> float:
        """Calculate area of bounding box"""
        return (self.right - self.left) * (self.bottom - self.top)


@dataclass
class Issue:
    """Represents a positioning issue"""
    severity: str  # "critical", "warning", "info"
    category: str  # "overlap", "edge_cutoff", "wrong_anchor", "tail_cross"
    character_id: str
    description: str
    current_value: str
    recommended_fix: str


@dataclass
class BubbleLayout:
    """Complete bubble layout for a character"""
    character_id: str
    context: str  # "kitchen" or "confessional"

    # Character position (where sprite is)
    character_pos: Position
    character_mouth_offset: Tuple[float, float]  # Offset from center to mouth

    # Current bubble position
    current_bubble_pos: Position
    current_anchor: str

    # Recommended bubble position
    recommended_bubble_pos: Optional[Position] = None
    recommended_anchor: Optional[str] = None

    # Analysis results
    issues: List[Issue] = None

    def __post_init__(self):
        if self.issues is None:
            self.issues = []

    def get_mouth_position(self) -> Position:
        """Get character's mouth position for tail pointing"""
        return Position(
            self.character_pos.x + self.character_mouth_offset[0],
            self.character_pos.y + self.character_mouth_offset[1]
        )

    def get_bubble_bbox(self, pos: Position, width: float = 20, height: float = 10) -> BoundingBox:
        """Get bounding box for bubble at given position"""
        return BoundingBox(
            left=pos.x - width/2,
            right=pos.x + width/2,
            top=pos.y,
            bottom=pos.y + height
        )

    def get_character_bbox(self, margin: float = 8) -> BoundingBox:
        """Get bounding box for character sprite"""
        return BoundingBox(
            left=self.character_pos.x - margin,
            right=self.character_pos.x + margin,
            top=self.character_pos.y - margin,
            bottom=self.character_pos.y + margin
        )


class WordBubbleAnalyzer:
    """Analyzes word bubble positioning using comic book best practices"""

    # Bubble dimensions (percentage of screen)
    BUBBLE_WIDTH = 20
    BUBBLE_HEIGHT = 10

    # Safety margins
    CHARACTER_CLEARANCE = 15  # Minimum distance from character center
    EDGE_MARGIN = 5  # Minimum distance from screen edges
    TAIL_CLEARANCE = 3  # Minimum distance between tails

    # Character data from WordBubbleSystem.tsx
    # Grid positions: A-H (rows, top to bottom), 0-9 (columns, left to right)
    # Each grid cell is roughly 10% x 10%

    KITCHEN_CHARACTERS = {
        'merlin': {
            'grid': 'D1',
            'char_pos': Position(10, 40),  # Grid D1 = row D (40%), col 1 (10%)
            'mouth_offset': (0, -3),  # Mouth is slightly above center
            'current_bubble': Position(15, 20),
            'current_anchor': 'bottom'
        },
        'achilles': {
            'grid': 'B4',
            'char_pos': Position(40, 20),  # Grid B4 = row B (20%), col 4 (40%)
            'mouth_offset': (0, -3),
            'current_bubble': Position(50, 10),
            'current_anchor': 'bottom'
        },
        'cleopatra': {
            'grid': 'C7',
            'char_pos': Position(70, 30),  # Grid C7 = row C (30%), col 7 (70%)
            'mouth_offset': (0, -3),
            'current_bubble': Position(75, 20),
            'current_anchor': 'bottom'
        },
        'joan': {
            'grid': 'H6',
            'char_pos': Position(60, 80),  # Grid H6 = row H (80%), col 6 (60%)
            'mouth_offset': (0, -3),
            'current_bubble': Position(65, 45),  # Current position is way off!
            'current_anchor': 'bottom'
        },
        'dracula': {
            'grid': 'H2',
            'char_pos': Position(20, 80),  # Grid H2 = row H (80%), col 2 (20%)
            'mouth_offset': (0, -3),
            'current_bubble': Position(25, 45),
            'current_anchor': 'bottom'
        }
    }

    CONFESSIONAL_CHARACTER = {
        'char_pos': Position(30, 50, 1.2),
        'mouth_offset': (0, -4),  # Larger character, mouth offset bigger
        'interviewer_pos': Position(80, 50, 0.8)
    }

    def __init__(self):
        self.all_issues = []
        self.all_recommendations = []

    def analyze_kitchen_table(self) -> Dict:
        """Analyze Kitchen Table using comic book best practices"""
        print("=" * 80)
        print("🍽️  KITCHEN TABLE ANALYSIS - Comic Book Standards Applied")
        print("=" * 80)

        results = {
            "context": "kitchen",
            "characters": [],
            "issues": [],
            "code_fixes": {}
        }

        layouts = []

        # Analyze each character
        for char_id, data in self.KITCHEN_CHARACTERS.items():
            layout = BubbleLayout(
                character_id=char_id,
                context="kitchen",
                character_pos=data['char_pos'],
                character_mouth_offset=data['mouth_offset'],
                current_bubble_pos=data['current_bubble'],
                current_anchor=data['current_anchor']
            )

            # Run all checks
            self._check_character_overlap(layout)
            self._check_edge_cutoff(layout)
            self._check_optimal_position(layout)
            self._check_anchor_direction(layout)

            layouts.append(layout)

            # Print individual character analysis
            print(f"\n{'─'*80}")
            print(f"📍 {char_id.upper()} (Grid: {data['grid']})")
            print(f"{'─'*80}")
            print(f"   Character at: {layout.character_pos}")
            print(f"   Mouth at: {layout.get_mouth_position()}")
            print(f"   Current bubble: {layout.current_bubble_pos}")

            if layout.recommended_bubble_pos:
                print(f"   ✨ Recommended: {layout.recommended_bubble_pos}")

            if layout.recommended_anchor:
                print(f"   🎯 Anchor should be: '{layout.recommended_anchor}' (currently: '{layout.current_anchor}')")

            # Print issues
            if layout.issues:
                print(f"\n   Issues found:")
                for issue in layout.issues:
                    icon = {"critical": "🚨", "warning": "⚠️", "info": "💡"}[issue.severity]
                    print(f"   {icon} {issue.description}")
                    print(f"      Fix: {issue.recommended_fix}")
            else:
                print(f"\n   ✅ No issues - position is optimal!")

            # Store results
            char_result = {
                "character_id": char_id,
                "grid": data['grid'],
                "current_position": asdict(layout.current_bubble_pos),
                "recommended_position": asdict(layout.recommended_bubble_pos) if layout.recommended_bubble_pos else None,
                "current_anchor": layout.current_anchor,
                "recommended_anchor": layout.recommended_anchor,
                "issues": [asdict(i) for i in layout.issues]
            }
            results["characters"].append(char_result)
            results["issues"].extend([asdict(i) for i in layout.issues])

        # Check for tail crossing (requires all layouts)
        print(f"\n{'='*80}")
        print("🔀 TAIL CROSSING ANALYSIS")
        print(f"{'='*80}")
        crossing_issues = self._check_tail_crossings(layouts)
        if crossing_issues:
            for issue in crossing_issues:
                print(f"⚠️  {issue.description}")
                print(f"   Fix: {issue.recommended_fix}")
                results["issues"].append(asdict(issue))
        else:
            print("✅ No tail crossings detected")

        # Generate code fixes
        results["code_fixes"] = self._generate_code_fixes(layouts)

        return results

    def analyze_confessional(self) -> Dict:
        """Analyze Confessional positioning"""
        print("\n" + "=" * 80)
        print("🎭 CONFESSIONAL ANALYSIS")
        print("=" * 80)

        conf = self.CONFESSIONAL_CHARACTER

        # Recommended bubble position for confessional
        # Should be above and slightly right of character
        recommended_pos = Position(35, 30)

        print(f"\n📐 Confessional Layout:")
        print(f"   Character seat: {conf['char_pos']}")
        print(f"   Character mouth: ({conf['char_pos'].x + conf['mouth_offset'][0]:.1f}%, "
              f"{conf['char_pos'].y + conf['mouth_offset'][1]:.1f}%)")
        print(f"   Interviewer: {conf['interviewer_pos']}")

        print(f"\n✨ Recommended Bubble Position:")
        print(f"   Position: {recommended_pos}")
        print(f"   Anchor: 'bottom' (pointing down to character's mouth)")
        print(f"   Reasoning: Above character, clear of sprite, points to mouth")

        return {
            "context": "confessional",
            "recommended_position": asdict(recommended_pos),
            "recommended_anchor": "bottom",
            "character_position": asdict(conf['char_pos']),
            "interviewer_position": asdict(conf['interviewer_pos'])
        }

    def _check_character_overlap(self, layout: BubbleLayout):
        """RULE 1: Never cover characters with bubbles"""
        bubble_box = layout.get_bubble_bbox(layout.current_bubble_pos)
        char_box = layout.get_character_bbox()

        if bubble_box.overlaps(char_box):
            layout.issues.append(Issue(
                severity="critical",
                category="overlap",
                character_id=layout.character_id,
                description="Bubble overlaps character sprite (covers character)",
                current_value=f"Bubble at {layout.current_bubble_pos}",
                recommended_fix="Move bubble at least 15% away from character center"
            ))

    def _check_edge_cutoff(self, layout: BubbleLayout):
        """Check if bubble goes off screen edges"""
        bubble_box = layout.get_bubble_bbox(layout.current_bubble_pos)

        issues = []
        if bubble_box.left < self.EDGE_MARGIN:
            issues.append("left")
        if bubble_box.right > 100 - self.EDGE_MARGIN:
            issues.append("right")
        if bubble_box.top < self.EDGE_MARGIN:
            issues.append("top")
        if bubble_box.bottom > 100 - self.EDGE_MARGIN:
            issues.append("bottom")

        if issues:
            layout.issues.append(Issue(
                severity="critical",
                category="edge_cutoff",
                character_id=layout.character_id,
                description=f"Bubble extends off screen: {', '.join(issues)} edge(s)",
                current_value=f"Bubble at {layout.current_bubble_pos}",
                recommended_fix=f"Keep bubble {self.EDGE_MARGIN}% from all edges"
            ))

    def _check_optimal_position(self, layout: BubbleLayout):
        """Calculate optimal bubble position based on character location"""
        char_pos = layout.character_pos
        mouth_pos = layout.get_mouth_position()

        # Determine optimal placement based on character position
        # Prefer above character, but adjust based on screen position

        # Default: above character
        target_x = char_pos.x
        target_y = char_pos.y - self.CHARACTER_CLEARANCE - self.BUBBLE_HEIGHT

        # If character is in top 30% of screen, place bubble below instead
        if char_pos.y < 30:
            target_y = char_pos.y + self.CHARACTER_CLEARANCE

        # If character is near left edge, shift bubble right
        if char_pos.x < 25:
            target_x = char_pos.x + 10
        # If character is near right edge, shift bubble left
        elif char_pos.x > 75:
            target_x = char_pos.x - 10

        # Ensure bubble stays within screen bounds
        half_width = self.BUBBLE_WIDTH / 2
        if target_x - half_width < self.EDGE_MARGIN:
            target_x = self.EDGE_MARGIN + half_width
        if target_x + half_width > 100 - self.EDGE_MARGIN:
            target_x = 100 - self.EDGE_MARGIN - half_width

        if target_y < self.EDGE_MARGIN:
            target_y = self.EDGE_MARGIN
        if target_y + self.BUBBLE_HEIGHT > 100 - self.EDGE_MARGIN:
            target_y = 100 - self.EDGE_MARGIN - self.BUBBLE_HEIGHT

        optimal_pos = Position(target_x, target_y)

        # Check if current position is significantly different
        distance = layout.current_bubble_pos.distance_to(optimal_pos)
        if distance > 5:  # More than 5% away
            layout.recommended_bubble_pos = optimal_pos
            layout.issues.append(Issue(
                severity="warning",
                category="suboptimal_position",
                character_id=layout.character_id,
                description=f"Bubble is {distance:.1f}% away from optimal position",
                current_value=str(layout.current_bubble_pos),
                recommended_fix=f"Move to {optimal_pos}"
            ))

    def _check_anchor_direction(self, layout: BubbleLayout):
        """RULE 2: Tail should point to character's mouth"""
        mouth_pos = layout.get_mouth_position()
        bubble_pos = layout.current_bubble_pos

        # Calculate direction from bubble to mouth
        dx = mouth_pos.x - bubble_pos.x
        dy = mouth_pos.y - bubble_pos.y

        # Determine optimal anchor based on angle
        if abs(dy) > abs(dx):  # Primarily vertical
            if dy > 0:
                optimal_anchor = "bottom"
            else:
                optimal_anchor = "top"
        else:  # Primarily horizontal
            if dx > 0:
                optimal_anchor = "right"
            else:
                optimal_anchor = "left"

        # Refine for diagonal directions
        if abs(dy) > 5 and abs(dx) > 5:
            if dy > 0 and dx > 0:
                optimal_anchor = "bottom-right"
            elif dy > 0 and dx < 0:
                optimal_anchor = "bottom-left"
            elif dy < 0 and dx > 0:
                optimal_anchor = "top-right"
            elif dy < 0 and dx < 0:
                optimal_anchor = "top-left"

        if optimal_anchor != layout.current_anchor:
            layout.recommended_anchor = optimal_anchor
            layout.issues.append(Issue(
                severity="warning",
                category="wrong_anchor",
                character_id=layout.character_id,
                description=f"Tail not pointing to mouth (using '{layout.current_anchor}')",
                current_value=layout.current_anchor,
                recommended_fix=f"Change anchor to '{optimal_anchor}'"
            ))

    def _check_tail_crossings(self, layouts: List[BubbleLayout]) -> List[Issue]:
        """RULE 3: Never cross tails"""
        issues = []

        # For each pair of characters, check if their tails would cross
        for i, layout1 in enumerate(layouts):
            for layout2 in layouts[i+1:]:
                # Simplified check: if bubbles are on opposite sides of their characters
                # and characters are close together, tails might cross

                mouth1 = layout1.get_mouth_position()
                mouth2 = layout2.get_mouth_position()
                bubble1 = layout1.current_bubble_pos
                bubble2 = layout2.current_bubble_pos

                # Check if line segments (bubble1->mouth1) and (bubble2->mouth2) intersect
                if self._segments_intersect(bubble1, mouth1, bubble2, mouth2):
                    issues.append(Issue(
                        severity="warning",
                        category="tail_cross",
                        character_id=f"{layout1.character_id} & {layout2.character_id}",
                        description=f"Tails cross between {layout1.character_id} and {layout2.character_id}",
                        current_value="Tails intersect",
                        recommended_fix="Reposition bubbles to avoid tail crossing"
                    ))

        return issues

    def _segments_intersect(self, p1: Position, p2: Position, p3: Position, p4: Position) -> bool:
        """Check if line segments (p1,p2) and (p3,p4) intersect"""
        def ccw(A, B, C):
            return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x)

        return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)

    def _generate_code_fixes(self, layouts: List[BubbleLayout]) -> Dict:
        """Generate TypeScript code fixes"""
        code_fixes = {
            "getFallbackPosition": {},
            "getSmartSpoutPosition": {}
        }

        for layout in layouts:
            if layout.recommended_bubble_pos:
                code_fixes["getFallbackPosition"][layout.character_id] = {
                    "x": round(layout.recommended_bubble_pos.x),
                    "y": round(layout.recommended_bubble_pos.y)
                }

            if layout.recommended_anchor:
                code_fixes["getSmartSpoutPosition"][layout.character_id] = {
                    "anchor_point": layout.recommended_anchor
                }

        return code_fixes

    def print_code_recommendations(self, kitchen_results: Dict, confessional_results: Dict):
        """Print TypeScript code to fix issues"""
        print("\n" + "=" * 80)
        print("💻 CODE FIXES - Copy/Paste into WordBubbleSystem.tsx")
        print("=" * 80)

        if kitchen_results["code_fixes"]["getFallbackPosition"]:
            print("\n🔧 Update getFallbackPosition() function:")
            print("```typescript")
            print("const positions = {")
            for char_id, pos in kitchen_results["code_fixes"]["getFallbackPosition"].items():
                print(f"  '{char_id}': {{ x: {pos['x']}, y: {pos['y']} }},")
            print("};")
            print("```")

        if kitchen_results["code_fixes"]["getSmartSpoutPosition"]:
            print("\n🔧 Update getSmartSpoutPosition() function:")
            print("```typescript")
            print("const spoutConfigs = {")
            for char_id, config in kitchen_results["code_fixes"]["getSmartSpoutPosition"].items():
                print(f"  '{char_id}': {{ anchor_point: '{config['anchor_point']}' }},")
            print("};")
            print("```")

        # Confessional code
        if confessional_results.get("recommended_position"):
            print("\n🔧 For Confessional context:")
            print("```typescript")
            pos = confessional_results["recommended_position"]
            print(f"// Character bubble position")
            print(f"const confessionalBubblePos = {{ x: {pos['x']:.0f}, y: {pos['y']:.0f} }};")
            print(f"const confessionalAnchor = '{confessional_results['recommended_anchor']}';")
            print("```")

    def run_full_analysis(self):
        """Run complete analysis and generate report"""
        print("\n" + "🎬" * 40)
        print(" BLANK WARS 2026 - WORD BUBBLE POSITION ANALYZER")
        print(" Based on Comic Book Industry Best Practices")
        print("🎬" * 40 + "\n")

        kitchen_results = self.analyze_kitchen_table()
        confessional_results = self.analyze_confessional()

        self.print_code_recommendations(kitchen_results, confessional_results)

        # Summary
        print("\n" + "=" * 80)
        print("📊 SUMMARY")
        print("=" * 80)

        total_issues = len(kitchen_results["issues"])
        critical = sum(1 for i in kitchen_results["issues"] if i["severity"] == "critical")
        warnings = sum(1 for i in kitchen_results["issues"] if i["severity"] == "warning")

        print(f"\n   Total Issues: {total_issues}")
        print(f"   🚨 Critical: {critical}")
        print(f"   ⚠️  Warnings: {warnings}")

        if total_issues == 0:
            print("\n   ✅ Perfect! All bubbles follow comic book best practices.")
        else:
            print(f"\n   Top Issues:")
            for issue in kitchen_results["issues"][:5]:
                icon = {"critical": "🚨", "warning": "⚠️", "info": "💡"}[issue["severity"]]
                print(f"   {icon} {issue['character_id']}: {issue['description']}")

        print("\n" + "=" * 80)

        # Save results
        output = {
            "kitchen": kitchen_results,
            "confessional": confessional_results,
            "summary": {
                "total_issues": total_issues,
                "critical": critical,
                "warnings": warnings,
                "timestamp": "2025-11-26"
            }
        }

        with open("word_bubble_analysis_results.json", "w") as f:
            json.dump(output, f, indent=2)

        print("📄 Full results saved to: word_bubble_analysis_results.json")
        print("=" * 80 + "\n")

        return output


def main():
    """Main entry point"""
    analyzer = WordBubbleAnalyzer()
    analyzer.run_full_analysis()


if __name__ == "__main__":
    main()
