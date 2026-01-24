#!/usr/bin/env python3
"""
Bulk fix case-related TypeScript errors by converting camelCase to snake_case.
Excludes React/Motion/Lucide native props that should remain camelCase.
"""
import subprocess
import re
import os
from collections import defaultdict

# Props that MUST stay camelCase (React, Motion, Lucide, DOM standard)
EXCLUDE_PROPS = {
    # React standard props
    'className', 'onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur',
    'onKeyDown', 'onKeyUp', 'onKeyPress', 'onMouseDown', 'onMouseUp',
    'onMouseEnter', 'onMouseLeave', 'onMouseOver', 'onMouseOut',
    'onTouchStart', 'onTouchEnd', 'onTouchMove', 'onDragStart', 'onDragEnd',
    'onDrop', 'onScroll', 'htmlFor', 'tabIndex', 'autoFocus', 'readOnly',
    'defaultValue', 'defaultChecked', 'dangerouslySetInnerHTML',

    # Framer Motion props
    'whileHover', 'whileTap', 'whileDrag', 'whileFocus', 'whileInView',
    'initial', 'animate', 'exit', 'transition', 'variants',
    'dragConstraints', 'dragElastic', 'dragMomentum',
    'layoutId', 'transformTemplate',

    # Framer Motion 3D/transform props
    'rotateX', 'rotateY', 'rotateZ', 'scaleX', 'scaleY', 'scaleZ',
    'translateX', 'translateY', 'translateZ', 'perspective',
    'transformOrigin', 'transformPerspective',

    # Lucide icon props
    'strokeWidth', 'strokeLinecap', 'strokeLinejoin',

    # Three.js / React Three Fiber props
    'castShadow', 'receiveShadow', 'renderOrder',

    # Standard DOM/HTML props
    'innerHTML', 'textContent', 'contentEditable', 'spellCheck',
    'autoComplete', 'autoCorrect', 'autoCapitalize'
}

def camel_to_snake(name):
    """Convert camelCase to snake_case"""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def get_ts_errors():
    """Get all TypeScript errors from active code (excluding archives)"""
    result = subprocess.run(
        ['npx', 'tsc', '--noEmit'],
        cwd='frontend',
        capture_output=True,
        text=True
    )

    output = result.stdout + result.stderr
    lines = output.split('\n')
    errors = []

    exclude_patterns = [
        'archived_components', '_BACKUP', '_ORIGINAL',
        'test-3d', '/archive/'
    ]

    for line in lines:
        if line.startswith('src/') and 'error TS' in line:
            # Skip archived/backup files
            if any(pattern in line for pattern in exclude_patterns):
                continue
            errors.append(line)

    return errors

def extract_case_conversions(errors):
    """Extract identifiers that need camelCase → snake_case conversion"""
    conversions = defaultdict(set)  # {camelCase: {files}}

    for error in errors:
        # Extract file path
        match = re.match(r'(src/[^(]+)\((\d+),(\d+)\): error (TS\d+): (.+)', error)
        if not match:
            continue

        file_path, line_num, col_num, error_code, message = match.groups()

        # Look for property name patterns in error messages
        # "Property 'camelCase' does not exist"
        prop_match = re.search(r"Property '(\w+)' does not exist", message)
        if prop_match:
            prop_name = prop_match.group(1)
            # Only convert if it's camelCase and not in exclusion list
            if prop_name not in EXCLUDE_PROPS and re.match(r'^[a-z]+[A-Z]', prop_name):
                snake_name = camel_to_snake(prop_name)
                conversions[prop_name].add(file_path)

        # "Cannot find name 'camelCase'"
        name_match = re.search(r"Cannot find name '(\w+)'", message)
        if name_match:
            name = name_match.group(1)
            if name not in EXCLUDE_PROPS and re.match(r'^[a-z]+[A-Z]', name):
                snake_name = camel_to_snake(name)
                conversions[name].add(file_path)

        # "Type '{ camelCase: ..." - property in object literal
        type_match = re.finditer(r'\b([a-z][a-zA-Z0-9]*[A-Z]\w*)\s*:', message)
        for match in type_match:
            prop_name = match.group(1)
            if prop_name not in EXCLUDE_PROPS:
                conversions[prop_name].add(file_path)

    return conversions

def apply_conversion(file_path, old_name, new_name):
    """Apply a single camelCase → snake_case conversion in a file"""
    full_path = os.path.join('frontend', file_path)

    if not os.path.exists(full_path):
        return 0

    with open(full_path, 'r') as f:
        content = f.read()

    # Count occurrences before
    before_count = len(re.findall(r'\b' + re.escape(old_name) + r'\b', content))

    if before_count == 0:
        return 0

    # Replace word boundaries only (not partial matches)
    new_content = re.sub(r'\b' + re.escape(old_name) + r'\b', new_name, content)

    # Write back
    with open(full_path, 'w') as f:
        f.write(new_content)

    return before_count

def main():
    print("Bulk Case Error Fixer")
    print("=" * 80)
    print("Analyzing TypeScript errors...")

    # Get initial error count
    initial_errors = get_ts_errors()
    print(f"Found {len(initial_errors)} errors in active code\n")

    # Extract conversions needed
    conversions = extract_case_conversions(initial_errors)

    if not conversions:
        print("No camelCase → snake_case conversions found!")
        return

    print(f"Found {len(conversions)} unique identifiers to convert\n")
    print("CONVERSIONS TO APPLY:")
    print("=" * 80)

    total_replacements = 0
    conversion_log = []

    # Sort by number of files affected (most widespread first)
    sorted_conversions = sorted(conversions.items(),
                                key=lambda x: len(x[1]),
                                reverse=True)

    for old_name, files in sorted_conversions:
        new_name = camel_to_snake(old_name)
        print(f"\n{old_name} → {new_name} (in {len(files)} files)")

        file_replacements = 0
        for file_path in sorted(files):
            count = apply_conversion(file_path, old_name, new_name)
            if count > 0:
                print(f"  ✓ {file_path}: {count} replacements")
                file_replacements += count

        total_replacements += file_replacements
        conversion_log.append({
            'old': old_name,
            'new': new_name,
            'files': len(files),
            'replacements': file_replacements
        })

    print("\n" + "=" * 80)
    print("CONVERSION SUMMARY")
    print("=" * 80)
    print(f"Total identifiers converted: {len(conversions)}")
    print(f"Total replacements made: {total_replacements}")
    print(f"Files modified: {len(set(f for files in conversions.values() for f in files))}")

    # Re-run TypeScript to check results
    print("\n" + "=" * 80)
    print("RE-CHECKING TYPESCRIPT ERRORS...")
    print("=" * 80)

    final_errors = get_ts_errors()
    print(f"\nInitial errors: {len(initial_errors)}")
    print(f"Final errors: {len(final_errors)}")
    print(f"Net change: {len(final_errors) - len(initial_errors)} ({((len(final_errors) - len(initial_errors)) / len(initial_errors) * 100):.1f}%)")

    if len(final_errors) < len(initial_errors):
        print(f"\n✅ SUCCESS! Fixed {len(initial_errors) - len(final_errors)} errors!")
    elif len(final_errors) > len(initial_errors):
        print(f"\n⚠️  WARNING! Introduced {len(final_errors) - len(initial_errors)} new errors!")
        print("Some conversions may need to be reverted.")
    else:
        print("\n⚠️  No change in error count. May need different approach.")

    # Save conversion log
    with open('conversion_log.txt', 'w') as f:
        f.write("BULK CASE CONVERSION LOG\n")
        f.write("=" * 80 + "\n\n")
        for item in conversion_log:
            f.write(f"{item['old']} → {item['new']}\n")
            f.write(f"  Files: {item['files']}, Replacements: {item['replacements']}\n\n")

    print("\nConversion log saved to: conversion_log.txt")

if __name__ == '__main__':
    main()
