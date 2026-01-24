#!/bin/bash

# Define the root directory
ROOT_DIR="/Users/gabrielgreenstein/Blank-Wars_Images-2"

# Function to rename files
rename_files() {
    local old_name="$1"
    local new_name="$2"
    
    echo "Renaming $old_name to $new_name..."
    
    # Find and rename files (depth-first to handle files inside directories safely)
    find "$ROOT_DIR" -depth -name "*${old_name}*" | while read file; do
        # Check if the file name actually contains the old name as a standalone word or prefix
        # This prevents renaming "napoleon_bonaparte" to "napoleon_bonaparte_bonaparte" if run twice
        if [[ "$file" == *"${new_name}"* ]]; then
            echo "Skipping $file (already correct)"
            continue
        fi
        
        # Construct new file path
        new_file="${file//$old_name/$new_name}"
        
        echo "Moving: $file -> $new_file"
        mv "$file" "$new_file"
    done
}

# Mappings based on DB Schema vs File System
rename_files "napoleon" "napoleon_bonaparte"
rename_files "ramses" "ramses_ii"
rename_files "aleister" "aleister_crowley"
rename_files "archangel" "archangel_michael"

# Verify others match (No action needed if they match)
# jack_the_ripper -> Matches
# don_quixote -> Matches
# kali -> Matches
# kangaroo -> Matches
# karna -> Matches
# little_bo_peep -> Matches
# mami_wata -> Matches
# quetzalcoatl -> Matches
# shaka_zulu -> Matches
# unicorn -> Matches
# velociraptor -> Matches

echo "Renaming complete."
