#!/bin/bash

# Fix Image Repository Structure (Furniture Only)
# Run this script from the root of your Blank-Wars_Images-2 repository

echo "Starting repository cleanup for Furniture..."

# 1. Create clean directory structure: HQ/Living_Quarters
mkdir -p "HQ/Living_Quarters/bed"
mkdir -p "HQ/Living_Quarters/bunk_bed"
mkdir -p "HQ/Living_Quarters/floor"

# 2. Move files from messy 'Headquarters/HQ/Living Quarters' OR 'Headquarters/HQ/Living_Quarters'
SOURCE_DIR=""
if [ -d "Headquarters/HQ/Living Quarters" ]; then
    SOURCE_DIR="Headquarters/HQ/Living Quarters"
elif [ -d "Headquarters/HQ/Living_Quarters" ]; then
    SOURCE_DIR="Headquarters/HQ/Living_Quarters"
fi

if [ -n "$SOURCE_DIR" ]; then
    echo "Found source at '$SOURCE_DIR'. Moving files..."
    
    # Move beds
    if [ -d "$SOURCE_DIR/bed" ]; then
        cp -n "$SOURCE_DIR/bed"/*.png "HQ/Living_Quarters/bed/" 2>/dev/null
        echo "Moved beds."
    fi
    
    # Move bunk beds
    if [ -d "$SOURCE_DIR/bunk_bed" ]; then
        cp -n "$SOURCE_DIR/bunk_bed"/*.png "HQ/Living_Quarters/bunk_bed/" 2>/dev/null
        echo "Moved bunk beds."
    fi
    
    # Move floors
    if [ -d "$SOURCE_DIR/floor" ]; then
        cp -n "$SOURCE_DIR/floor"/*.png "HQ/Living_Quarters/floor/" 2>/dev/null
        echo "Moved floors."
    fi
    
    echo "Files moved to 'HQ/Living_Quarters'."
else
    echo "Did not find 'Headquarters/HQ/Living Quarters' (or Living_Quarters). Checking for other locations..."
fi

echo "Cleanup complete. Please verify 'HQ/Living_Quarters' contains your images."
