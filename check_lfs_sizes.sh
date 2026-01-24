#!/bin/bash
total_size=0
count=0

git diff-tree --no-commit-id --name-only -r 15dbb02d | grep -E "\.(png|jpg|jpeg)$" | while read file; do
  size=$(git show "15dbb02d:$file" 2>/dev/null | grep "^size" | awk '{print $2}')
  if [ -n "$size" ]; then
    echo "$file: $size bytes"
    total_size=$((total_size + size))
    count=$((count + 1))
  fi
done

echo "---"
echo "Total files checked: $count"
echo "Total size: $total_size bytes"
