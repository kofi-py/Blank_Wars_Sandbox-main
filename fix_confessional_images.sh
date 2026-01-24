#!/bin/bash

# Fix Confessional Images (Spartan Apartment)
# Run this script from the root of your Blank-Wars_Images-2 repository

echo "Starting Confessional cleanup..."

# 1. Create clean directory
mkdir -p "Confessional/Spartan_Apartment"

# 2. Define Source Directory
SOURCE_DIR="Headquarters/ConfessionalUntitled folder/Confessional/Spartan_Apartment"

if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory '$SOURCE_DIR' not found."
    exit 1
fi

# 3. Move and Rename Files (Explicit Mapping)

# Function to move and rename
move_file() {
    src="$1"
    dest="$2"
    if [ -f "$SOURCE_DIR/$src" ]; then
        cp -n "$SOURCE_DIR/$src" "Confessional/Spartan_Apartment/$dest"
        echo "✅ Moved: $src -> $dest"
    else
        echo "⚠️  Missing: $src"
    fi
}

echo "Processing files..."

# Original Cast
move_file "Achilles_Conf_SptnApt.png" "achilles_confessional_spartan_apt.png"
move_file "Agent_X_Conf_SptnApt.png" "agent_x_confessional_spartan_apt.png"
move_file "Billy_the_kid_Conf_SptnApt.png" "billy_the_kid_confessional_spartan_apt.png"
move_file "Cleopatra_Conf_SptnApt.png" "cleopatra_confessional_spartan_apt.png"
move_file "space_cyborg_Conf_SptnApt.png" "space_cyborg_confessional_spartan_apt.png"
move_file "dracula_Conf_SptnApt.png" "dracula_confessional_spartan_apt.png"
move_file "Fenrir_Conf_SptnApt.png" "fenrir_confessional_spartan_apt.png"
move_file "Frenkenstein_s_Monster_Conf_SptnApt.png" "frankenstein_confessional_spartan_apt.png"
move_file "Genghis_Khan_Conf_SptnApt.png" "genghis_khan_confessional_spartan_apt.png"
move_file "john_of_arc_Conf_SptnApt.png" "joan_of_arc_confessional_spartan_apt.png"
move_file "Merlin_SptnApt.png" "merlin_confessional_spartan_apt.png"
move_file "Robin_Hood_SptnApt.png" "robin_hood_confessional_spartan_apt.png"
move_file "sherlock_holmes_Conf_SptnApt.png" "sherlock_holmes_confessional_spartan_apt.png"
move_file "Sun_Wukong_SpartanApt.png" "sun_wukong_confessional_spartan_apt.png"
move_file "nikola_tesla_Conf_SptnApt.png" "tesla_confessional_spartan_apt.png"
move_file "Rilak-Trelkar_SptnApt.png" "rilak_confessional_spartan_apt.png"
move_file "Sam_spade_Conf_SptnApt.png" "sam_spade_confessional_spartan_apt.png"

# New Cast
move_file "Aleister_Crowley_Conf_SptnApt.png" "aleister_confessional_spartan_apt.png"
move_file "Archangel_Micheal_Conf_SptnApt.png" "archangel_confessional_spartan_apt.png"
move_file "Don_Quixote_Conf_SptnApt.png" "don_quixote_confessional_spartan_apt.png"
move_file "Jack_The_Ripper_SptnApt.png" "jack_the_ripper_confessional_spartan_apt.png"
move_file "Kali_SptnApt.png" "kali_confessional_spartan_apt.png"
move_file "Kangeroo_SptnApt.png" "kangaroo_confessional_spartan_apt.png"
move_file "Karna_SptnApt.png" "karna_confessional_spartan_apt.png"
move_file "Little_Bo_peep_SptnApt.png" "little_bo_peep_confessional_spartan_apt.png"
move_file "Mami-Wata_SptnApt.png" "mami_wata_confessional_spartan_apt.png"
move_file "Napolean_Conf_SptnApt.png" "napoleon_confessional_spartan_apt.png"
move_file "Quetzalcoatl_SptnApt.png" "quetzalcoatl_confessional_spartan_apt.png"
move_file "Shaki_Zulu_SptnApt.png" "shaka_zulu_confessional_spartan_apt.png"

# Extras (Just in case)
move_file "Ramses_SptnApt.png" "ramses_confessional_spartan_apt.png"
move_file "Raptor_SptnApt.png" "raptor_confessional_spartan_apt.png"
move_file "Unicorn_SptnApt.png" "unicorn_confessional_spartan_apt.png"

echo "Cleanup complete. Check 'Confessional/Spartan_Apartment' for results."
