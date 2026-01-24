#!/usr/bin/env python3
"""
Simple Image Categorizer - One image at a time to avoid crashes
"""

import os
import glob
import shutil
import json

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

def categorize_image(img_path, index, total):
    filename = os.path.basename(img_path)
    
    print(f"\n{'='*50}")
    print(f"Image {index + 1} of {total}")
    print(f"File: {filename}")
    print(f"{'='*50}")
    
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
    print("s. ⏭️  Skip")
    print("q. 💾 Quit")
    
    while True:
        try:
            choice = input("\nEnter category (1-7, s, q): ").strip().lower()
            
            if choice == 'q':
                return 'quit'
            elif choice == 's':
                return 'skip'
            elif choice in CATEGORIES:
                return CATEGORIES[choice]
            else:
                print("❌ Invalid choice. Try again.")
        except KeyboardInterrupt:
            return 'quit'

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
        print(f"✅ Moved to {category}/")
        return True
    except Exception as e:
        print(f"❌ Move failed: {e}")
        return False

def main():
    print("🏛️ SIMPLE IMAGE CATEGORIZER")
    print("One image at a time")
    
    images = get_gemini_images()
    if not images:
        print("❌ No images found")
        return
    
    progress = load_progress()
    start_idx = progress.get("processed", 0)
    
    print(f"\nFound {len(images)} images")
    print(f"Starting from image {start_idx + 1}")
    
    for i in range(start_idx, len(images)):
        img_path = images[i]
        category = categorize_image(img_path, i, len(images))
        
        if category == 'quit':
            save_progress(i)
            print(f"\n💾 Saved progress at image {i + 1}")
            break
        elif category == 'skip':
            print("⏭️ Skipped")
        else:
            if move_image(img_path, category):
                print(f"📂 Categorized as: {category}")
        
        # Save progress after each image
        save_progress(i + 1)
    
    print("\n🎉 Done!")

if __name__ == "__main__":
    main()