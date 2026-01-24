#!/usr/bin/env python3
"""
Analyze TypeScript errors to find patterns for bulk fixes.
Excludes archived/backup files.
"""

import subprocess
import re
from collections import defaultdict, Counter

def get_typescript_errors():
    """Get all TypeScript errors excluding archived files."""
    result = subprocess.run(
        ['npx', 'tsc', '--noEmit'],
        cwd='/Users/gabrielgreenstein/Blank_Wars_2026/backend',
        capture_output=True,
        text=True
    )

    # TypeScript outputs to stdout, not stderr
    output = result.stdout + result.stderr
    lines = output.split('\n')
    errors = []

    for line in lines:
        # Filter out archived/backup files
        if any(x in line for x in ['archived_components', '_BACKUP', '_ORIGINAL', 'test-3d', '/archive/']):
            continue

        # Match error lines: src/path/file.tsx(line,col): error TSXXXX: message
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

def extract_property_name(message):
    """Extract property name from error message."""
    # "Property 'foo' does not exist on type 'Bar'"
    match = re.search(r"Property '([^']+)' does not exist", message)
    if match:
        return match.group(1)
    return None

def extract_missing_properties(message):
    """Extract missing properties from TS2741/TS2739 errors."""
    # "Property 'foo' is missing in type..."
    # "Type X is missing the following properties from type Y: a, b, c"
    matches = re.findall(r"properties?[^:]*: ([^\.]+)", message)
    if matches:
        props = matches[0].split(',')
        return [p.strip() for p in props if p.strip()]
    return []

def analyze_errors(errors):
    """Analyze errors and find patterns."""

    # Group by error type
    by_error_code = defaultdict(list)
    for err in errors:
        by_error_code[err['code']].append(err)

    # TS2339 analysis (Property does not exist)
    ts2339_properties = Counter()
    ts2339_by_file = defaultdict(list)

    for err in by_error_code.get('TS2339', []):
        prop = extract_property_name(err['message'])
        if prop:
            ts2339_properties[prop] += 1
            ts2339_by_file[err['file']].append(prop)

    # TS2322 analysis (Type not assignable)
    ts2322_patterns = Counter()
    for err in by_error_code.get('TS2322', []):
        # Look for class_name vs className patterns
        if 'class_name' in err['message'] or 'className' in err['message']:
            ts2322_patterns['class_name/className mismatch'] += 1
        elif 'snake_case' in err['message'] or 'camelCase' in err['message']:
            ts2322_patterns['naming convention mismatch'] += 1
        else:
            # Extract simplified pattern
            simplified = re.sub(r"'[^']*'", "'X'", err['message'][:100])
            ts2322_patterns[simplified] += 1

    # TS2741/TS2739 analysis (Missing properties)
    missing_props = Counter()
    for err in by_error_code.get('TS2741', []) + by_error_code.get('TS2739', []):
        props = extract_missing_properties(err['message'])
        for prop in props:
            missing_props[prop] += 1

    # Files with most errors
    errors_by_file = Counter(err['file'] for err in errors)

    # Print analysis
    print("=" * 80)
    print("BACKEND TYPESCRIPT ERROR ANALYSIS")
    print("=" * 80)
    print(f"\nTotal Errors: {len(errors)}")
    print(f"\nError Types:")
    for code in sorted(by_error_code.keys()):
        print(f"  {code}: {len(by_error_code[code])} errors")

    print(f"\n{'=' * 80}")
    print("TOP 20 TS2339 ERRORS (Property does not exist)")
    print("=" * 80)
    for prop, count in ts2339_properties.most_common(20):
        print(f"  '{prop}' - {count} occurrences")

    print(f"\n{'=' * 80}")
    print("POTENTIAL BATCH FIXES FOR TS2339")
    print("=" * 80)

    # Find snake_case vs camelCase patterns
    snake_to_camel = {}
    for prop, count in ts2339_properties.most_common(50):
        if '_' in prop:
            camel_version = ''.join(word.capitalize() if i > 0 else word
                                   for i, word in enumerate(prop.split('_')))
            if camel_version in ts2339_properties:
                snake_to_camel[prop] = {
                    'camel': camel_version,
                    'snake_count': count,
                    'camel_count': ts2339_properties[camel_version]
                }

    if snake_to_camel:
        print("\n🔍 Detected naming convention conflicts:")
        for snake, info in sorted(snake_to_camel.items(), key=lambda x: x[1]['snake_count'], reverse=True):
            print(f"  {snake} ({info['snake_count']}x) ↔️ {info['camel']} ({info['camel_count']}x)")

    print(f"\n{'=' * 80}")
    print("TOP 15 FILES WITH MOST ERRORS")
    print("=" * 80)
    for file_path, count in errors_by_file.most_common(15):
        print(f"  {count:3d} errors - {file_path}")
        # Show top properties in this file
        if file_path in ts2339_by_file:
            props = Counter(ts2339_by_file[file_path]).most_common(3)
            if props:
                prop_str = ", ".join(f"'{p}' ({c}x)" for p, c in props)
                print(f"       └─ Common TS2339: {prop_str}")

    print(f"\n{'=' * 80}")
    print("TOP 10 MISSING PROPERTIES (TS2741/TS2739)")
    print("=" * 80)
    for prop, count in missing_props.most_common(10):
        print(f"  '{prop}' - {count} occurrences")

    print(f"\n{'=' * 80}")
    print("RECOMMENDED BATCH FIXES")
    print("=" * 80)

    # Generate recommendations
    recommendations = []

    # Check for common property patterns
    for prop, count in ts2339_properties.most_common(20):
        if count >= 5:  # Appears 5+ times
            recommendations.append({
                'type': 'Property rename/add',
                'pattern': f"Property '{prop}'",
                'count': count,
                'action': f"Search all files for '.{prop}' and verify correct property name"
            })

    # Check for files with many errors
    for file_path, count in errors_by_file.most_common(5):
        if count >= 10:
            recommendations.append({
                'type': 'File-level fix',
                'pattern': f"{file_path}",
                'count': count,
                'action': f"Review entire file - may need interface updates or systematic renames"
            })

    for i, rec in enumerate(recommendations[:10], 1):
        print(f"\n{i}. [{rec['type']}] {rec['count']} errors")
        print(f"   Pattern: {rec['pattern']}")
        print(f"   Action: {rec['action']}")

    print(f"\n{'=' * 80}")
    print("SUMMARY STATISTICS")
    print("=" * 80)
    print(f"Total files with errors: {len(errors_by_file)}")
    if len(errors_by_file) > 0:
        print(f"Average errors per file: {len(errors) / len(errors_by_file):.1f}")
    print(f"Files with 10+ errors: {sum(1 for c in errors_by_file.values() if c >= 10)}")
    print(f"Unique TS2339 properties: {len(ts2339_properties)}")
    print(f"Properties appearing 5+ times: {sum(1 for c in ts2339_properties.values() if c >= 5)}")
    print("=" * 80)

if __name__ == '__main__':
    print("Analyzing Backend TypeScript errors...")
    errors = get_typescript_errors()
    print(f"Found {len(errors)} errors in active code")
    analyze_errors(errors)
