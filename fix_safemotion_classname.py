#!/usr/bin/env python3
"""
Fix SafeMotion component className → class_name errors.
These show up as TS2322 errors but are actually case convention issues.
"""
import subprocess
import re
import os
from collections import defaultdict

def get_safemotion_errors():
    """Get all TS2322 errors related to SafeMotion components"""
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
        if line.startswith('src/') and 'error TS2322' in line:
            # Skip archived/backup files
            if any(pattern in line for pattern in exclude_patterns):
                continue
            # Only get SafeMotion-related errors
            if 'SafeMotion' in line:
                errors.append(line)

    return errors

def extract_files_with_safemotion_errors(errors):
    """Extract files that have SafeMotion className errors"""
    files = set()

    for error in errors:
        match = re.match(r'(src/[^(]+)\((\d+),(\d+)\): error TS2322: (.+)', error)
        if match:
            file_path = match.group(1)
            files.add(file_path)

    return sorted(files)

def fix_safemotion_classname_in_file(file_path):
    """
    Fix className → class_name and other camelCase → snake_case conversions
    in SafeMotion component props.
    """
    # Define camelCase → snake_case conversions for SafeMotion props
    # These are React/Motion props that should be snake_case in our custom wrapper
    PROP_CONVERSIONS = {
        'className': 'class_name',
        'backgroundColor': 'background_color',
        'backgroundImage': 'background_image',
        'onClick': 'on_click',
        'onChange': 'on_change',
        'onSubmit': 'on_submit',
        'onClose': 'on_close',
        'whileHover': 'while_hover',
        'whileTap': 'while_tap',
        'whileDrag': 'while_drag',
        'whileFocus': 'while_focus',
        'whileInView': 'while_in_view',
    }

    full_path = os.path.join('frontend', file_path)

    if not os.path.exists(full_path):
        return 0

    with open(full_path, 'r') as f:
        lines = f.readlines()

    modified = False
    changes = 0
    i = 0

    while i < len(lines):
        line = lines[i]

        # Look for SafeMotion component tags
        if '<SafeMotion' in line:
            # Check if className is on this line or following lines
            # We need to find the closing > or />
            component_lines = [line]
            j = i + 1

            # Collect all lines until we find the closing tag
            while j < len(lines) and '>' not in lines[j-1]:
                component_lines.append(lines[j])
                j += 1

            # Join the component lines
            component_text = ''.join(component_lines)

            # Apply all prop conversions
            original_text = component_text

            for camel_prop, snake_prop in PROP_CONVERSIONS.items():
                # Replace camelCase= with snake_case= (prop assignment)
                component_text = re.sub(r'\b' + camel_prop + r'=', snake_prop + '=', component_text)

            if component_text != original_text:
                # Split back into lines and update
                new_lines = component_text.split('\n')
                # Re-add newlines except for last line
                new_lines = [nl + '\n' if idx < len(new_lines) - 1 else nl
                            for idx, nl in enumerate(new_lines)]

                # Replace the original lines
                lines[i:j] = new_lines
                changes += component_text.count('class_name=') - original_text.count('class_name=')
                modified = True

                # Adjust index for new lines
                i += len(new_lines)
            else:
                i = j
        else:
            i += 1

    if modified:
        with open(full_path, 'w') as f:
            f.writelines(lines)

    return changes

def main():
    print("SafeMotion className → class_name Fixer")
    print("=" * 80)
    print("Analyzing TS2322 SafeMotion errors...")

    # Get initial error count
    initial_errors = get_safemotion_errors()
    print(f"Found {len(initial_errors)} SafeMotion TS2322 errors\n")

    if not initial_errors:
        print("No SafeMotion className errors found!")
        return

    # Extract files that need fixing
    files_to_fix = extract_files_with_safemotion_errors(initial_errors)
    print(f"Files with SafeMotion className errors: {len(files_to_fix)}\n")

    print("FIXING FILES:")
    print("=" * 80)

    total_changes = 0

    for file_path in files_to_fix:
        changes = fix_safemotion_classname_in_file(file_path)
        if changes > 0:
            print(f"✓ {file_path}: {changes} className → class_name")
            total_changes += changes

    print("\n" + "=" * 80)
    print("CONVERSION SUMMARY")
    print("=" * 80)
    print(f"Files modified: {len(files_to_fix)}")
    print(f"Total className → class_name replacements: {total_changes}")

    # Re-run TypeScript to check results
    print("\n" + "=" * 80)
    print("RE-CHECKING TYPESCRIPT ERRORS...")
    print("=" * 80)

    # Get all errors (not just SafeMotion)
    result = subprocess.run(
        ['npx', 'tsc', '--noEmit'],
        cwd='frontend',
        capture_output=True,
        text=True
    )

    output = result.stdout + result.stderr
    lines = output.split('\n')

    exclude_patterns = [
        'archived_components', '_BACKUP', '_ORIGINAL',
        'test-3d', '/archive/'
    ]

    final_all_errors = []
    final_safemotion_errors = []

    for line in lines:
        if line.startswith('src/') and 'error TS' in line:
            if any(pattern in line for pattern in exclude_patterns):
                continue
            final_all_errors.append(line)
            if 'error TS2322' in line and 'SafeMotion' in line:
                final_safemotion_errors.append(line)

    print(f"\nSafeMotion TS2322 errors: {len(initial_errors)} → {len(final_safemotion_errors)}")
    print(f"Total errors: {len(final_all_errors)}")

    if len(final_safemotion_errors) < len(initial_errors):
        print(f"\n✅ SUCCESS! Fixed {len(initial_errors) - len(final_safemotion_errors)} SafeMotion errors!")
    elif len(final_safemotion_errors) > len(initial_errors):
        print(f"\n⚠️  WARNING! Introduced {len(final_safemotion_errors) - len(initial_errors)} new errors!")
    else:
        print("\n⚠️  No change. Errors may be more complex than simple className→class_name.")

    # Show remaining SafeMotion errors if any
    if final_safemotion_errors:
        print("\n" + "=" * 80)
        print(f"REMAINING {len(final_safemotion_errors)} SafeMotion ERRORS:")
        print("=" * 80)
        for error in final_safemotion_errors[:10]:
            print(error)
        if len(final_safemotion_errors) > 10:
            print(f"... and {len(final_safemotion_errors) - 10} more")

if __name__ == '__main__':
    main()
