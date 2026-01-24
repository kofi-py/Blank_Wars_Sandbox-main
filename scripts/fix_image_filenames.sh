#!/bin/bash

# Fix Image Filenames Script
# Run this script from the root of the Blank-Wars_Images-2 repository.

echo "Starting image filename cleanup..."

# 1. Global Renames: Zeta -> Rilak
echo "Renaming 'zeta' to 'rilak'..."
find . -depth -name "*zeta*" -exec bash -c 'mv "$1" "${1//zeta/rilak}"' _ {} \;

# 2. Fix Specific Typos
echo "Fixing specific typos..."
# Equipment
if [ -f "Equipment/crumbsworth_equipmen.png" ]; then
    mv "Equipment/crumbsworth_equipmen.png" "Equipment/crumbsworth_equipment.png"
fi

# Group Activities
if [ -f "Group Activities/kali_group_activities_1.png" ]; then
    mv "Group Activities/kali_group_activities_1.png" "Group Activities/kali_group_activity_1.png"
fi

# Therapy
if [ -f "Therapy/sherlock_holmes_therapy_1(1).png" ]; then
    mv "Therapy/sherlock_holmes_therapy_1(1).png" "Therapy/sherlock_holmes_therapy_1.png"
fi

# 3. Standardize Performance Coaching (Spaces to Underscores)
echo "Standardizing Performance Coaching filenames..."
if [ -d "Performance Coaching" ]; then
    cd "Performance Coaching"
    for file in *; do
        if [[ "$file" == *" "* ]]; then
            mv "$file" "${file// /_}"
        fi
    done
    # Fix specific inconsistencies
    if [ -f "space_cyborg_1-on-1_01.png" ]; then mv "space_cyborg_1-on-1_01.png" "space_cyborg_1-on-1_1.png"; fi
    if [ -f "space_cyborg_1-on-1_02.png" ]; then mv "space_cyborg_1-on-1_02.png" "space_cyborg_1-on-1_2.png"; fi
    if [ -f "space_cyborg_1-on-1_03.png" ]; then mv "space_cyborg_1-on-1_03.png" "space_cyborg_1-on-1_3.png"; fi
    cd ..
fi

# 4. Clean up Confessional / Spartan Apartment
echo "Cleaning up Confessional folder..."
# Create clean Confessional directory if it doesn't exist
mkdir -p "Confessional"

# Source directory for Spartan Apartment images
SPARTAN_DIR="Headquarters/ConfessionalUntitled folder/Confessional/Spartan Apartment"

if [ -d "$SPARTAN_DIR" ]; then
    echo "Processing Spartan Apartment images..."
    
    # Move and rename specific files to root Confessional
    # Rilak
    if [ -f "$SPARTAN_DIR/Rilak-Trelkar.png" ]; then cp "$SPARTAN_DIR/Rilak-Trelkar.png" "Confessional/rilak_confessional.png"; fi
    if [ -f "$SPARTAN_DIR/rilak_confessional.png" ]; then cp "$SPARTAN_DIR/rilak_confessional.png" "Confessional/rilak_confessional.png"; fi # In case rename happened inside

    # Standardize others (best effort mapping)
    cp "$SPARTAN_DIR/Achilles_Conf_SptnApt.png" "Confessional/achilles_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Agent_X_Conf_SptnApt.png" "Confessional/agent_x_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Billy_the_kid_Conf_SptnApt.png" "Confessional/billy_the_kid_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Cleopatra_Conf_SptnApt.png" "Confessional/cleopatra_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Don_Quixote_Conf_SptnApt.png" "Confessional/don_quixote_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Fenrir_Conf_SptnApt.png" "Confessional/fenrir_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Frenkenstein_s_Monster_Conf_SptnApt.png" "Confessional/frankenstein_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Genghis_Khan_Conf_SptnApt.png" "Confessional/genghis_khan_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Jack_The_Ripper_SptnApt .png" "Confessional/jack_the_ripper_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Kali_SptnApt .png" "Confessional/kali_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Kangeroo_SptnApt .png" "Confessional/kangaroo_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Little_Bo_peep_SptnApt .png" "Confessional/little_bo_peep_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Merlin.png" "Confessional/merlin_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Napolean_Conf_SptnApt .png" "Confessional/napoleon_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Quetzalcoatl_SptnApt .png" "Confessional/quetzalcoatl_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Robin Hood.png" "Confessional/robin_hood_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Sam_spade_Conf_SptnApt.png" "Confessional/sam_spade_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Sun_Wukong_SpartanApt.png" "Confessional/sun_wukong_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/Unicorn_SptnApt .png" "Confessional/unicorn_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/dracula_Conf_SptnApt.png" "Confessional/dracula_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/john_of_arc_Conf_SptnApt.png" "Confessional/joan_of_arc_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/nikola_tesla_Conf_SptnApt.png" "Confessional/tesla_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/sherlock_holmes_Conf_SptnApt.png" "Confessional/sherlock_holmes_confessional.png" 2>/dev/null
    cp "$SPARTAN_DIR/space_cyborg_Conf_SptnApt.png" "Confessional/space_cyborg_confessional.png" 2>/dev/null
    
    echo "Confessional images standardized."
else
    echo "Warning: Spartan Apartment folder not found at expected path."
fi

# 5. Process New Character Images
echo "Processing New Character Images..."
NEW_CHARS_DIR="Headquarters/New Character Images_Nov24"
if [ -d "$NEW_CHARS_DIR" ]; then
    # Move these to a staging area or integrate them? 
    # For now, we'll just rename spaces to underscores in place to make them usable
    cd "$NEW_CHARS_DIR"
    for file in *; do
        if [[ "$file" == *" "* ]]; then
            mv "$file" "${file// /_}"
        fi
    done
    cd ../..
fi

echo "Cleanup complete! Please verify the changes and push to GitHub."
