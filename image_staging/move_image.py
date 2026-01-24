#!/usr/bin/env python3
"""
Move current image to specified category
Usage: python3 move_image.py <category_number>
"""

import os
import glob
import json
import shutil
import sys

# Paths
DOWNLOADS_PATH = "/Users/stevengreenstein/Downloads"
STAGING_PATH = "/Users/stevengreenstein/Documents/blank-wars-clean/image_staging"

# Categories
CATEGORIES = {
    '1': 'weapons',
    '2': 'armor', 
    '3': 'accessories',
    '4': 'items',
    '5': 'characters',
    '6': 'health_center',
    '7': 'other'
}

def get_gemini_images():
    pattern = os.path.join(DOWNLOADS_PATH, "Gemini_Generated_Image_*.png")
    return sorted(glob.glob(pattern))

def load_progress():
    progress_file = os.path.join(STAGING_PATH, "progress.json")
    if os.path.exists(progress_file):
        with open(progress_file, 'r') as f:
            return json.load(f)
    return {"processed": 0}

def save_progress(processed):
    progress_file = os.path.join(STAGING_PATH, "progress.json")
    with open(progress_file, 'w') as f:
        json.dump({"processed": processed}, f)

def move_image(img_path, category):
    filename = os.path.basename(img_path)
    
    # Determine destination folder
    if category in ['weapons', 'armor', 'accessories']:
        dest_folder = os.path.join(STAGING_PATH, 'equipment')
    elif category == 'items':
        dest_folder = os.path.join(STAGING_PATH, 'items')
    else:
        dest_folder = os.path.join(STAGING_PATH, category)
        
    # Create folder if needed
    os.makedirs(dest_folder, exist_ok=True)
    
    # Move file
    dest_path = os.path.join(dest_folder, filename)
    try:
        shutil.move(img_path, dest_path)
        print(f"✅ Moved {filename} to {category}/")
        return True
    except Exception as e:
        print(f"❌ Move failed: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 move_image.py <category_number>")
        print("Categories: 1=weapons, 2=armor, 3=accessories, 4=items, 5=characters, 6=health_center, 7=other")
        return
    
    category_num = sys.argv[1]
    if category_num not in CATEGORIES:
        print(f"Invalid category: {category_num}")
        return
    
    category = CATEGORIES[category_num]
    
    images = get_gemini_images()
    progress = load_progress()
    current = progress.get("processed", 0)
    
    if current >= len(images):
        print("🎉 All images processed!")
        return
    
    img_path = images[current]
    filename = os.path.basename(img_path)
    
    print(f"Moving image {current + 1}: {filename}")
    
    if move_image(img_path, category):
        save_progress(current + 1)
        print(f"📂 Categorized as: {category}")
        print(f"Progress: {current + 1}/{len(images)}")
    
if __name__ == "__main__":
    main()