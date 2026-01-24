#!/bin/bash

# Create temp directory for images
mkdir -p /tmp/blank-wars-images

# Get list of all image files from the repo
echo "Getting list of image files..."
git ls-tree -r --name-only origin/main frontend/public/images/ | grep -E "\.(png|jpg|jpeg|webp)$" > /tmp/image_list.txt

total=$(wc -l < /tmp/image_list.txt)
echo "Found $total image files to download"

count=0
while read -r filepath; do
  count=$((count + 1))

  # Convert filepath to URL-encoded format
  encoded_path=$(echo "$filepath" | sed 's/ /%20/g')

  # Create directory structure
  dir=$(dirname "$filepath")
  mkdir -p "/tmp/blank-wars-images/$dir"

  # Download using GitHub raw URL
  echo "[$count/$total] Downloading: $filepath"
  curl -s -L "https://github.com/CPAIOS/Blank_Wars_2026/raw/main/$encoded_path" \
    -o "/tmp/blank-wars-images/$filepath"

  # Small delay to avoid rate limiting
  sleep 0.1
done < /tmp/image_list.txt

echo "Done! Images saved to /tmp/blank-wars-images/"
echo "Total size:"
du -sh /tmp/blank-wars-images/
