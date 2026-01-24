#!/usr/bin/env python3
"""
Show next image to categorize
"""

import os
import glob
import json

# Paths
DOWNLOADS_PATH = "/Users/stevengreenstein/Downloads"
STAGING_PATH = "/Users/stevengreenstein/Documents/blank-wars-clean/image_staging"

def get_gemini_images():
    pattern = os.path.join(DOWNLOADS_PATH, "Gemini_Generated_Image_*.png")
    return sorted(glob.glob(pattern))

def load_progress():
    progress_file = os.path.join(STAGING_PATH, "progress.json")
    if os.path.exists(progress_file):
        with open(progress_file, 'r') as f:
            return json.load(f)
    return {"processed": 0}

def main():
    images = get_gemini_images()
    progress = load_progress()
    current = progress.get("processed", 0)
    
    if current >= len(images):
        print("🎉 All images processed!")
        return
    
    img_path = images[current]
    filename = os.path.basename(img_path)
    
    print(f"Image {current + 1} of {len(images)}: {filename}")
    
    # Open image
    os.system(f'open "{img_path}"')
    
    print("\nCategories:")
    print("1. 🗡️  Weapons")
    print("2. 🛡️  Armor")  
    print("3. 👑 Accessories")
    print("4. 🧪 Items")
    print("5. 👤 Characters")
    print("6. 🏥 Health Center")
    print("7. ❓ Other")

if __name__ == "__main__":
    main()