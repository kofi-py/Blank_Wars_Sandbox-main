#!/usr/bin/env python3
"""
Analyze ALL TypeScript errors to find case-related issues.
"""

import subprocess
import re
from collections import defaultdict, Counter

def camel_to_snake(name):
    """Convert camelCase to snake_case."""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def snake_to_camel(name):
    """Convert snake_case to camelCase."""
    components = name.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def is_camel_case(name):
    """Check if name is camelCase."""
    return any(c.isupper() for c in name) and '_' not in name and not name.isupper()

def is_snake_case(name):
    """Check if name is snake_case."""
    return '_' in name and name.islower()

def get_all_ts_errors():
    """Get all TypeScript errors."""
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

        # Match error lines
        match = re.match(r'^(src/[^(]+)\((\d+),(\d+)\): error (TS\d+): (.+)$', line)
        if match:
            file_path, line_num, col, error_code, message = match.groups()
            errors.append({
                'file': file_path,
                'line': int(line_num),
                'col': int(col),
                'code': error_code,
                'message': message
            })

    return errors

def extract_identifier_from_error(error_code, message):
    """Extract identifier name from error message based on error type."""

    identifiers = []

    if error_code == 'TS2339':
        # Property 'foo' does not exist on type 'Bar'
        match = re.search(r"Property '([^']+)' does not exist", message)
        if match:
            identifiers.append(('property', match.group(1)))

    elif error_code == 'TS2552':
        # Cannot find name 'foo'. Did you mean 'bar'?
        match = re.search(r"Cannot find name '([^']+)'", message)
        if match:
            identifiers.append(('variable', match.group(1)))
        suggestion = re.search(r"Did you mean '([^']+)'", message)
        if suggestion:
            identifiers.append(('suggestion', suggestion.group(1)))

    elif error_code in ['TS2741', 'TS2739']:
        # Missing properties: foo, bar, baz
        props = re.findall(r"properties?[^:]*: ([^\.]+)", message)
        if props:
            for prop in props[0].split(','):
                prop = prop.strip()
                if prop:
                    identifiers.append(('missing_property', prop))

    elif error_code == 'TS2322':
        # Type '{ foo: X }' is not assignable to type '{ bar: Y }'
        # Look for property names in braces
        props = re.findall(r"(\w+):", message)
        for prop in props:
            if prop and not prop in ['Type', 'type', 'to']:
                identifiers.append(('type_property', prop))

    elif error_code == 'TS2345':
        # Argument of type 'Foo' is not assignable to parameter of type 'Bar'
        # Often involves property mismatches
        types = re.findall(r"type '([^']+)'", message)
        for t in types:
            if '_' in t or is_camel_case(t):
                identifiers.append(('argument_type', t))

    return identifiers

def analyze_case_errors(errors):
    """Analyze which errors are case-related."""

    case_conversions = {
        'camel_to_snake': defaultdict(list),  # camelCase → snake_case
        'snake_to_camel': defaultdict(list),  # snake_case → camelCase
    }

    error_stats = Counter()
    case_error_count = Counter()

    for err in errors:
        error_stats[err['code']] += 1
        identifiers = extract_identifier_from_error(err['code'], err['message'])

        for id_type, identifier in identifiers:
            if is_camel_case(identifier):
                snake = camel_to_snake(identifier)
                case_conversions['camel_to_snake'][identifier].append({
                    'file': err['file'],
                    'code': err['code'],
                    'line': err['line'],
                    'snake_version': snake,
                    'id_type': id_type
                })
                case_error_count[err['code']] += 1

            elif is_snake_case(identifier):
                camel = snake_to_camel(identifier)
                case_conversions['snake_to_camel'][identifier].append({
                    'file': err['file'],
                    'code': err['code'],
                    'line': err['line'],
                    'camel_version': camel,
                    'id_type': id_type
                })
                case_error_count[err['code']] += 1

    return case_conversions, error_stats, case_error_count

def print_analysis(case_conversions, error_stats, case_error_count):
    """Print analysis results."""

    print("=" * 80)
    print("CASE-RELATED ERROR ANALYSIS")
    print("=" * 80)

    print(f"\nTotal errors by type:")
    for code in sorted(error_stats.keys()):
        case_count = case_error_count.get(code, 0)
        total = error_stats[code]
        pct = (case_count / total * 100) if total > 0 else 0
        if case_count > 0:
            print(f"  {code}: {case_count}/{total} ({pct:.1f}%) are case-related")
        else:
            print(f"  {code}: {total} (0% case-related)")

    # Camel to Snake conversions
    camel_items = case_conversions['camel_to_snake']
    print(f"\n{'=' * 80}")
    print(f"CAMELCASE → SNAKE_CASE CONVERSIONS: {len(camel_items)} unique identifiers")
    print("=" * 80)

    sorted_camel = sorted(camel_items.items(), key=lambda x: len(x[1]), reverse=True)

    print(f"\n{'camelCase':<35} → {'snake_case':<35} {'Count':>6}")
    print("-" * 80)
    for identifier, occurrences in sorted_camel[:40]:
        snake = occurrences[0]['snake_version']
        print(f"{identifier:<35} → {snake:<35} {len(occurrences):>6}")

    if len(sorted_camel) > 40:
        print(f"... and {len(sorted_camel) - 40} more")

    # Snake to Camel conversions
    snake_items = case_conversions['snake_to_camel']
    print(f"\n{'=' * 80}")
    print(f"SNAKE_CASE → CAMELCASE CONVERSIONS: {len(snake_items)} unique identifiers")
    print("=" * 80)

    sorted_snake = sorted(snake_items.items(), key=lambda x: len(x[1]), reverse=True)

    if sorted_snake:
        print(f"\n{'snake_case':<35} → {'camelCase':<35} {'Count':>6}")
        print("-" * 80)
        for identifier, occurrences in sorted_snake[:20]:
            camel = occurrences[0]['camel_version']
            print(f"{identifier:<35} → {camel:<35} {len(occurrences):>6}")

        if len(sorted_snake) > 20:
            print(f"... and {len(sorted_snake) - 20} more")
    else:
        print("\n(None found)")

    # Error code breakdown
    print(f"\n{'=' * 80}")
    print("ERROR CODES WITH CASE ISSUES")
    print("=" * 80)

    # Count by error code
    code_breakdown = Counter()
    for identifier, occurrences in camel_items.items():
        for occ in occurrences:
            code_breakdown[occ['code']] += 1

    for identifier, occurrences in snake_items.items():
        for occ in occurrences:
            code_breakdown[occ['code']] += 1

    print("\nError codes with case-related issues:")
    for code, count in sorted(code_breakdown.items(), key=lambda x: x[1], reverse=True):
        print(f"  {code}: {count} case issues")

    # Generate bulk conversion script
    print(f"\n{'=' * 80}")
    print("BULK CONVERSION RECOMMENDATION")
    print("=" * 80)

    total_camel = sum(len(v) for v in camel_items.values())
    total_snake = sum(len(v) for v in snake_items.values())

    print(f"\nTotal case-related issues: {total_camel + total_snake}")
    print(f"  • camelCase → snake_case: {total_camel} issues")
    print(f"  • snake_case → camelCase: {total_snake} issues")

    print("\nRECOMMENDED STRATEGY:")
    print("1. PRIMARY: Convert ALL camelCase → snake_case (convention standard)")
    print(f"   This will fix ~{total_camel} issues")
    print("2. SECONDARY: Check remaining errors for snake_case → camelCase")
    print(f"   These are likely external libraries/React props")

    # Save conversion maps
    with open('/Users/gabrielgreenstein/Blank_Wars_2026/bulk_camel_to_snake.txt', 'w') as f:
        f.write("BULK CAMELCASE → SNAKE_CASE CONVERSION MAP\n")
        f.write("=" * 80 + "\n\n")
        for identifier, occurrences in sorted_camel:
            snake = occurrences[0]['snake_version']
            f.write(f"{identifier} → {snake}\n")
            f.write(f"  Occurrences: {len(occurrences)}\n")
            files = list(set(occ['file'] for occ in occurrences))
            f.write(f"  Files: {', '.join(files[:5])}")
            if len(files) > 5:
                f.write(f" ... and {len(files) - 5} more")
            f.write("\n\n")

    print(f"\n✅ Conversion map saved to: bulk_camel_to_snake.txt")

    return sorted_camel, sorted_snake

if __name__ == '__main__':
    print("Analyzing ALL TypeScript errors for case issues...")
    errors = get_all_ts_errors()
    print(f"Found {len(errors)} total errors\n")

    case_conversions, error_stats, case_error_count = analyze_case_errors(errors)
    sorted_camel, sorted_snake = print_analysis(case_conversions, error_stats, case_error_count)
