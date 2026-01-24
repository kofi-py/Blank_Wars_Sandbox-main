#!/bin/bash

# Fix Naming Mismatches (Verified from Manual Audit)
# Run this script from the root of your Blank-Wars_Images-2 repository

echo "Starting Naming Mismatch Fixes..."

# Helper function to rename files
rename_file() {
    dir="$1"
    old="$2"
    new="$3"
    if [ -f "$dir/$old" ]; then
        mv "$dir/$old" "$dir/$new"
        echo "✅ Fixed: $dir/$old -> $new"
    fi
}

# 1. Fix 'Little Bo Peep' (hyphens -> underscores)
echo "Fixing Little Bo Peep..."
rename_file "Progression" "little-bo-peep_progression_1.png" "little_bo_peep_progression_1.png"
rename_file "Progression" "little-bo-peep_progression_2.png" "little_bo_peep_progression_2.png"
rename_file "Progression" "little-bo-peep_progression_3.png" "little_bo_peep_progression_3.png"

rename_file "Equipment" "little-bo-peep_equipment.png" "little_bo_peep_equipment.png"

rename_file "Training" "little-bo-peep_training_1.png" "little_bo_peep_training_1.png"
rename_file "Training" "little-bo-peep_training_2.png" "little_bo_peep_training_2.png"
rename_file "Training" "little-bo-peep_training_3.png" "little_bo_peep_training_3.png"

rename_file "Therapy" "little-bo-peep_therapy_1.png" "little_bo_peep_therapy_1.png"
rename_file "Therapy" "little-bo-peep_therapy_2.png" "little_bo_peep_therapy_2.png"
rename_file "Therapy" "little-bo-peep_therapy_3.png" "little_bo_peep_therapy_3.png"

rename_file "Finance" "little-bo-peep_finance_1.png" "little_bo_peep_finance_1.png"
rename_file "Finance" "little-bo-peep_finance_2.png" "little_bo_peep_finance_2.png"
rename_file "Finance" "little-bo-peep_finance_3.png" "little_bo_peep_finance_3.png"

rename_file "Group Activities" "little-bo-peep_group_activity_1.png" "little_bo_peep_group_activity_1.png"
rename_file "Group Activities" "little-bo-peep_group_activity_2.png" "little_bo_peep_group_activity_2.png"
rename_file "Group Activities" "little-bo-peep_group_activity_3.png" "little_bo_peep_group_activity_3.png"

rename_file "Clubhouse" "little-bo-peep_clubhouse.png" "little_bo_peep_clubhouse.png"
rename_file "Graffiti Wall" "little-bo-peep_graffiti.png" "little_bo_peep_graffiti.png"
rename_file "Community Board" "little-bo-peep_community_board.png" "little_bo_peep_community_board.png"

# 2. Fix 'Shaka Zulu' (zulu -> shaka_zulu)
echo "Fixing Shaka Zulu..."
rename_file "Progression" "zulu_progression_1.png" "shaka_zulu_progression_1.png"
rename_file "Progression" "zulu_progression_2.png" "shaka_zulu_progression_2.png"
rename_file "Progression" "zulu_progression_3.png" "shaka_zulu_progression_3.png"

rename_file "Equipment" "zulu_equipment.png" "shaka_zulu_equipment.png"

rename_file "Training" "zulu_training_1.png" "shaka_zulu_training_1.png"
rename_file "Training" "zulu_training_2.png" "shaka_zulu_training_2.png"
rename_file "Training" "zulu_training_3.png" "shaka_zulu_training_3.png"

rename_file "Therapy" "zulu_therapy_1.png" "shaka_zulu_therapy_1.png"
rename_file "Therapy" "zulu_therapy_2.png" "shaka_zulu_therapy_2.png"
rename_file "Therapy" "zulu_therapy_3.png" "shaka_zulu_therapy_3.png"

rename_file "Finance" "zulu_finance_1.png" "shaka_zulu_finance_1.png"
rename_file "Finance" "zulu_finance_2.png" "shaka_zulu_finance_2.png"
rename_file "Finance" "zulu_finance_3.png" "shaka_zulu_finance_3.png"

rename_file "Group Activities" "zulu_group_activity_1.png" "shaka_zulu_group_activity_1.png"
rename_file "Group Activities" "zulu_group_activity_2.png" "shaka_zulu_group_activity_2.png"
rename_file "Group Activities" "zulu_group_activity_3.png" "shaka_zulu_group_activity_3.png"

rename_file "Clubhouse" "zulu_clubhouse.png" "shaka_zulu_clubhouse.png"
rename_file "Graffiti Wall" "zulu_graffiti.png" "shaka_zulu_graffiti.png"
rename_file "Community Board" "zulu_community_board.png" "shaka_zulu_community_board.png"

# 3. Fix Colosseaum Typos
echo "Fixing Colosseaum Typos..."
rename_file "Colosseaum" "liitle_bo_peep.png" "little_bo_peep_colosseaum.png"
rename_file "Colosseaum" "saka_zulu_colosseaum.png" "shaka_zulu_colosseaum.png"
rename_file "Colosseaum" "rames_II_colosseaum.png" "ramses_colosseaum.png" 
rename_file "Colosseaum" "velociraptor_colosseaum.png" "raptor_colosseaum.png"

echo "Fixes complete."
