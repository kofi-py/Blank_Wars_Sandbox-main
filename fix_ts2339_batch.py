#!/usr/bin/env python3
"""
Batch fix TS2339 errors by converting camelCase to snake_case.
"""

import subprocess
import re
from collections import defaultdict

def get_ts2339_errors():
    """Get all TS2339 errors excluding archived files."""
    result = subprocess.run(
        ['npx', 'tsc', '--noEmit'],
        cwd='/Users/gabrielgreenstein/Blank_Wars_2026/frontend',
        capture_output=True,
        text=True
    )

    output = result.stdout + result.stderr
    lines = output.split('\n')
    errors = []

    for line in lines:
        # Filter out archived/backup files
        if any(x in line for x in ['archived_components', '_BACKUP', '_ORIGINAL', 'test-3d', '/archive/']):
            continue

        # Match TS2339 errors
        match = re.match(r'^(src/[^(]+)\((\d+),(\d+)\): error TS2339: (.+)$', line)
        if match:
            file_path, line_num, col, message = match.groups()

            # Extract property name
            prop_match = re.search(r"Property '([^']+)' does not exist on type '([^']+)'", message)
            if prop_match:
                prop_name, type_name = prop_match.groups()
                errors.append({
                    'file': file_path,
                    'line': int(line_num),
                    'col': int(col),
                    'property': prop_name,
                    'type': type_name,
                    'message': message
                })

    return errors

def camel_to_snake(name):
    """Convert camelCase to snake_case."""
    # Insert underscore before uppercase letters
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    # Insert underscore before uppercase letters preceded by lowercase
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def is_camel_case(name):
    """Check if a name is in camelCase (not snake_case, not all caps)."""
    # Has at least one uppercase letter
    # Doesn't contain underscores (already snake_case)
    # Not all uppercase (constants)
    return (any(c.isupper() for c in name) and
            '_' not in name and
            not name.isupper())

def analyze_conversion_opportunities(errors):
    """Analyze which properties can be batch converted."""

    # Group by property name
    by_property = defaultdict(list)
    for err in errors:
        by_property[err['property']].append(err)

    # Find camelCase properties
    camel_case_props = {}
    for prop, err_list in by_property.items():
        if is_camel_case(prop):
            snake = camel_to_snake(prop)
            camel_case_props[prop] = {
                'snake': snake,
                'count': len(err_list),
                'files': list(set(e['file'] for e in err_list)),
                'types': list(set(e['type'] for e in err_list))
            }

    return camel_case_props

def generate_fix_plan(camel_props):
    """Generate a fix plan for batch conversion."""

    print("=" * 80)
    print("TS2339 BATCH FIX PLAN")
    print("=" * 80)
    print(f"\nTotal camelCase properties to convert: {len(camel_props)}")

    # Sort by frequency
    sorted_props = sorted(camel_props.items(), key=lambda x: x[1]['count'], reverse=True)

    print(f"\n{'=' * 80}")
    print("CONVERSION TABLE (Top 30)")
    print("=" * 80)
    print(f"{'camelCase':<30} → {'snake_case':<30} {'Count':>6} Files")
    print("-" * 80)

    for prop, info in sorted_props[:30]:
        print(f"{prop:<30} → {info['snake']:<30} {info['count']:>6}  {len(info['files'])}")

    # Group by file for file-by-file fixes
    file_conversions = defaultdict(list)
    for prop, info in camel_props.items():
        for file_path in info['files']:
            file_conversions[file_path].append({
                'camel': prop,
                'snake': info['snake'],
                'type': info['types']
            })

    print(f"\n{'=' * 80}")
    print("FILES REQUIRING UPDATES (Top 20)")
    print("=" * 80)

    sorted_files = sorted(file_conversions.items(), key=lambda x: len(x[1]), reverse=True)
    for file_path, conversions in sorted_files[:20]:
        print(f"\n{file_path} - {len(conversions)} properties")
        for conv in conversions[:5]:  # Show first 5
            print(f"  • {conv['camel']} → {conv['snake']}")
        if len(conversions) > 5:
            print(f"  ... and {len(conversions) - 5} more")

    print(f"\n{'=' * 80}")
    print("RECOMMENDED APPROACH")
    print("=" * 80)
    print("""
1. START WITH INTERFACES: Update interface/type definitions first
   - This will cause NEW errors showing where properties are used

2. FILE-BY-FILE: Fix each file systematically
   - Update interface definition to snake_case
   - Find and replace all usages in that file
   - Verify with tsc --noEmit

3. BATCH RENAME: For high-frequency properties (5+ occurrences)
   - Use global find/replace with caution
   - Test after each batch

4. EXCLUSIONS: Skip these patterns
   - Native HTML/React props (className, onClick, etc.)
   - External library props
   - Already in snake_case
""")

    # Generate specific fix commands
    print(f"\n{'=' * 80}")
    print("TOP 10 QUICK WINS (3+ occurrences)")
    print("=" * 80)

    quick_wins = [(p, i) for p, i in sorted_props if i['count'] >= 3][:10]
    for i, (prop, info) in enumerate(quick_wins, 1):
        print(f"\n{i}. Fix '{prop}' → '{info['snake']}' ({info['count']} occurrences)")
        print(f"   Files affected: {', '.join(info['files'][:3])}")
        if len(info['files']) > 3:
            print(f"   ... and {len(info['files']) - 3} more")
        print(f"   Types: {', '.join(info['types'][:2])}")

    return sorted_props, file_conversions

if __name__ == '__main__':
    print("Analyzing TS2339 errors for batch conversion...")
    errors = get_ts2339_errors()
    print(f"Found {len(errors)} TS2339 errors")

    camel_props = analyze_conversion_opportunities(errors)
    print(f"\nIdentified {len(camel_props)} camelCase properties")

    sorted_props, file_conversions = generate_fix_plan(camel_props)

    # Save conversion map to file
    with open('/Users/gabrielgreenstein/Blank_Wars_2026/ts2339_conversion_map.txt', 'w') as f:
        f.write("TS2339 CAMELCASE → SNAKE_CASE CONVERSION MAP\n")
        f.write("=" * 80 + "\n\n")
        for prop, info in sorted_props:
            f.write(f"{prop} → {info['snake']} ({info['count']} occurrences)\n")
            f.write(f"  Files: {', '.join(info['files'])}\n")
            f.write(f"  Types: {', '.join(info['types'])}\n\n")

    print(f"\n✅ Conversion map saved to: ts2339_conversion_map.txt")
