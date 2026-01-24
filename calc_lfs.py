#!/usr/bin/env python3
import subprocess

result = subprocess.run(['bash', 'check_lfs_sizes.sh'], capture_output=True, text=True)
lines = result.stdout.strip().split('\n')

total = 0
count = 0
for line in lines:
    if 'bytes' in line and ':' in line:
        try:
            size = int(line.split(':')[-1].strip().split()[0])
            total += size
            count += 1
        except:
            pass

print(f"Total image files: {count}")
print(f"Total size: {total:,} bytes")
print(f"Total size: {total / 1024 / 1024:.2f} MB")
print(f"Total size: {total / 1024 / 1024 / 1024:.2f} GB")
