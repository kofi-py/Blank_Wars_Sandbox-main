# Lost & Found Wars - Asset Documentation

**Date:** October 25, 2025
**Status:** Asset Sourcing Complete - Ready for 3D Model Creation

---

## 📋 Asset Status Overview

### ✅ Completed
- [x] UI Graphics (13 SVG icons created)
- [x] Location image sources identified
- [x] Asset structure defined

### 🎨 In Progress (Meshy/Blender)
- [ ] Container 3D models (8 total)
- [ ] Item 3D models (62 total)

### ⏳ Pending
- [ ] Location background images (download from sources)
- [ ] Character sprites/models integration
- [ ] Inventory room scene

---

## 🎨 UI Graphics (Created - SVG Format)

All files located in: `/frontend/public/images/lost-and-found/ui/`

### Core Icons
1. ✅ `currency-icon.svg` - Gold coin with $ symbol
2. ✅ `xp-icon.svg` - Blue badge with XP text and star
3. ✅ `equipment-icon.svg` - Treasure chest with sword
4. ✅ `achievement-badge.svg` - Gold trophy badge with star
5. ✅ `timer-icon.svg` - Clock icon for countdown
6. ✅ `rogue-behavior-alert.svg` - Red warning banner

### Rarity Indicators (Color-coded circles)
7. ✅ `rarity-junk.svg` - Gray circle
8. ✅ `rarity-common.svg` - White circle
9. ✅ `rarity-decent.svg` - Blue circle
10. ✅ `rarity-valuable.svg` - Purple circle
11. ✅ `rarity-rare.svg` - Gold circle with glow
12. ✅ `rarity-legendary.svg` - Red/orange circle with double glow

### UI Components
13. ✅ `adherence-meter-frame.svg` - Progress bar frame with markers

**Color System:**
- **Junk:** Gray (#808080)
- **Common:** White (#FFFFFF)
- **Decent:** Blue (#1E90FF)
- **Valuable:** Purple (#9C27B0)
- **Rare:** Gold (#FFD700)
- **Legendary:** Red/Orange (#FF4500) with gold glow

---

## 📷 Location Background Images

### Public Domain Image Sources

All images can be sourced from **Unsplash** or **Pexels** (free for commercial use, no attribution required).

### Exterior Shots (Establishing)

| Location | Image Type | Source URLs | Notes |
|----------|-----------|-------------|-------|
| **Airport** | JFK terminal exterior with planes | [Unsplash](https://unsplash.com/s/photos/jfk-airport) / [Pexels](https://www.pexels.com/search/jfk%20airport/) | 100+ free images available |
| **Subway** | NYC subway entrance with green globe lights | [Unsplash](https://unsplash.com/s/photos/nyc-subway) | 45,000+ images |
| **Hotel** | Vegas hotel exterior (Bellagio-style) with fountains | [Pixabay](https://pixabay.com/p-282812) / [Unsplash](https://unsplash.com/s/photos/bellagio-las-vegas) | Multiple fountain shots |
| **College** | Campus quad with brick buildings | [Unsplash](https://unsplash.com/s/photos/college-campus) / [Pexels](https://www.pexels.com/search/campus/) | 100+ university images |
| **Police** | Police station exterior with squad cars | [Unsplash](https://unsplash.com/s/photos/police-station) / [Pexels](https://www.pexels.com/search/police%20station/) | 30,000+ police images |
| **Amusement Park** | Ferris wheel and carnival lights | [Unsplash](https://unsplash.com/s/photos/ferris-wheel) / [Pexels](https://www.pexels.com/photo/photo-of-ferris-wheel-with-neon-lights-at-night-1821349/) | 500+ ferris wheel images |
| **Rest Stop** | Highway rest stop with big rig trucks | [Unsplash](https://unsplash.com/s/photos/truck-stop) / [Pexels](https://www.pexels.com/search/highway/) | 100+ truck stop images |

### Interior Shots (Context/Atmosphere)

| Location | Image Type | Source URLs | Notes |
|----------|-----------|-------------|-------|
| **Airport** | Lost property warehouse, luggage shelves | [Unsplash](https://unsplash.com/s/photos/warehouse) / [Pexels](https://www.pexels.com/photo/interior-of-warehouse-10697106/) | Industrial storage aesthetic |
| **Subway** | MTA lost & found office, metal shelves | [Unsplash](https://unsplash.com/s/photos/lost-and-found) | Institutional fluorescent look |
| **Hotel** | Back corridor, bellhop cart, storage | [Unsplash](https://unsplash.com/s/photos/hotel-corridor) / [Pexels](https://www.pexels.com/search/hotel%20hallway/) | 100+ hotel hallway images |
| **College** | Campus lost & found bin room | [Unsplash](https://unsplash.com/s/photos/storage-facility) | Cluttered, informal |
| **Police** | Evidence room, metal cages, lockers | [Pexels](https://www.pexels.com/search/locker%20room/) / [Freepik](https://www.freepik.com/free-photos-vectors/police-station-evidence-room) | Institutional, serious |
| **Amusement Park** | Mascot storage/lost & found booth | [Unsplash](https://unsplash.com/s/photos/amusement-park) | Whimsical, colorful |
| **Rest Stop** | Manager's office, trucker memorabilia | [Unsplash](https://unsplash.com/s/photos/garage-workshop) / [PICRYL](https://picryl.com/topics/garage) | Americana, road-worn |

### Inventory Room Scene

| Scene | Image Type | Source | Notes |
|-------|-----------|---------|-------|
| **Reveal Room** | Warehouse/garage with workbench/table | [Unsplash](https://unsplash.com/s/photos/garage-workshop) / [Pexels](https://www.pexels.com/search/warehouse/) | Universal scene for item reveals |

**Recommended Resolution:** 1920x1080 minimum for backgrounds

---

## 🎁 3D Models Needed (Meshy/Blender Pipeline)

### Container Models (8 total)

**File Format:** `.glb` or `.gltf` (Three.js compatible)
**Target Poly Count:** 5k-15k triangles
**Textures:** PBR materials (albedo, normal, roughness, metallic)

| # | Location | Container Type | Description | Priority |
|---|----------|----------------|-------------|----------|
| 1 | Airport | Hard-shell aluminum suitcase | TSA lock, travel stickers, scuff marks, handle | High |
| 2 | Subway | Cardboard box (MTA) | "MTA" stamp, worn edges, tape, "Lost Property" label | High |
| 3 | Hotel | Designer luggage set | Louis Vuitton pattern, leather trim, monogram, pristine | High |
| 4 | College | Clear plastic storage bin | Translucent sides, college logo sticker, visible clutter | Medium |
| 5 | Police | Metal evidence locker/filing cabinet | Drawer with evidence tag, official seals, dented metal | Medium |
| 6 | Amusement Park | Oversized duffle bag | Park mascot logo, colorful, bulging/overstuffed, zipper | Medium |
| 7 | Rest Stop | Cardboard box + trash bag combo | Duct tape, Route 66 marking, weathered | Medium |
| 8 | **Vegas** | **Ornate gold chest** | **Gold leaf, jewels, velvet interior, ridiculous** | **HIGHEST** |

**Vegas chest is the hero piece - most iconic, should be created first.**

---

## 🏆 Item 3D Models (62 total)

**File Format:** `.glb` or `.gltf`
**Target Poly Count:** 2k-8k triangles (need to stay lightweight)
**Textures:** PBR materials, optimized for web

### Legendary Tier (5 items) - Highest Priority
1. Rolex watch
2. Diamond engagement ring
3. Platinum jewelry set
4. Crypto hardware wallet
5. Rare baseball card

### Rare Tier (10 items) - High Priority
6. Gibson Les Paul guitar
7. Vintage Fender Stratocaster
8. Gold coins
9. Gold bracelet
10. Designer handbag
11. Professional DSLR camera
12. Vintage movie prop
13. Original painting
14. Rare comic books
15. Professional drone

### Valuable Tier (10 items) - Medium Priority
16. Jade sculpture
17. Designer luggage set
18. Rare stamps
19. Prototype tech device
20. Bluetooth speaker
21. Tablet device
22. Gaming laptop
23. Designer jeans
24. Leather jacket
25. Electric guitar

### Decent Tier (10 items) - Medium Priority
26. Telescope
27. Vintage camera
28. Office chair
29. Professional blender
30. Signed sports memorabilia
31. Synthesizer
32. Luxury watch
33. Rare vinyl records
34. Antique pocket watch
35. Designer suit

### Common Tier (10 items) - Low Priority
36. Used backpack
37. Paperback books
38. Cheap headphones
39. Coffee maker
40. Winter coat
41. Basic tool set
42. Sports shoes
43. Bedding set
44. Kitchen utensils
45. Laptop bag

### Junk Tier (8 items) - Low Priority (comedic value)
46. Single sock
47. Broken phone charger
48. Expired gum
49. Mystery stain item
50. Plastic fork
51. Old lottery ticket
52. Torn magazine
53. Broken sunglasses

### Special/Mystery Items (4 items) - Medium Priority
54. Mystery key
55. Treasure map
56. Lucky charm
57. Cursed object

### Equipment Items (4 items) - Medium Priority
58. Training sword
59. Athletic gear
60. Meditation cushion
61. Strategy books

**Total: 62 items**

---

## 🎬 Creation Workflow

### Phase 1: Hero Assets (Week 1)
1. **Vegas Gold Chest** (container)
2. **Rolex Watch** (legendary item)
3. **Diamond Ring** (legendary item)
4. **Gibson Les Paul** (rare item)

**Goal:** Test pipeline, create most iconic pieces

### Phase 2: Core Containers (Week 2)
5. Airport suitcase
6. Subway cardboard box
7. Hotel designer luggage

**Goal:** Have 4 locations playable

### Phase 3: Top 20 Items (Weeks 3-4)
- All legendary tier
- All rare tier
- 50% of valuable tier

**Goal:** Enough variety for compelling gameplay

### Phase 4: Complete Library (Ongoing)
- Remaining containers
- Remaining items
- Polish and optimization

---

## 📂 File Structure

```
/frontend/public/
├── images/
│   └── lost-and-found/
│       ├── ui/                    ✅ Complete (13 SVG files)
│       │   ├── currency-icon.svg
│       │   ├── xp-icon.svg
│       │   ├── equipment-icon.svg
│       │   ├── achievement-badge.svg
│       │   ├── timer-icon.svg
│       │   ├── adherence-meter-frame.svg
│       │   ├── rogue-behavior-alert.svg
│       │   ├── rarity-junk.svg
│       │   ├── rarity-common.svg
│       │   ├── rarity-decent.svg
│       │   ├── rarity-valuable.svg
│       │   ├── rarity-rare.svg
│       │   └── rarity-legendary.svg
│       │
│       ├── locations/             ⏳ To Download
│       │   ├── exteriors/
│       │   │   ├── airport.jpg
│       │   │   ├── subway.jpg
│       │   │   ├── hotel.jpg
│       │   │   ├── college.jpg
│       │   │   ├── police.jpg
│       │   │   ├── amusement.jpg
│       │   │   └── rest-stop.jpg
│       │   │
│       │   ├── interiors/
│       │   │   ├── airport-warehouse.jpg
│       │   │   ├── subway-office.jpg
│       │   │   ├── hotel-corridor.jpg
│       │   │   ├── college-bin-room.jpg
│       │   │   ├── police-evidence.jpg
│       │   │   ├── amusement-storage.jpg
│       │   │   └── rest-stop-office.jpg
│       │   │
│       │   └── inventory-room.jpg
│       │
│       └── models/                🎨 Meshy/Blender Pipeline
│           ├── containers/
│           │   ├── airport-suitcase.glb
│           │   ├── subway-box.glb
│           │   ├── hotel-luggage.glb
│           │   ├── college-bin.glb
│           │   ├── police-locker.glb
│           │   ├── amusement-duffle.glb
│           │   ├── rest-stop-box.glb
│           │   └── vegas-chest.glb        👑 HERO PIECE
│           │
│           └── items/
│               ├── legendary/
│               ├── rare/
│               ├── valuable/
│               ├── decent/
│               ├── common/
│               ├── junk/
│               ├── special/
│               └── equipment/
```

---

## 🎯 Next Steps

### Immediate (This Weekend)
1. ✅ UI graphics created
2. ⏳ Download location background images from sources
3. 🎨 Create Vegas gold chest in Meshy
4. 🎨 Create Rolex watch in Meshy

### Short-term (Next Week)
1. Polish Vegas chest and Rolex in Blender
2. Export optimized .glb files
3. Create remaining 3 hero items
4. Download remaining location images

### Medium-term (2-3 Weeks)
1. Create core container models (airport, subway, hotel)
2. Create top 20 item models
3. Begin frontend integration with Three.js

---

## 📝 Notes

- **Meshy Prompts:** Keep detailed, PBR-ready prompts for each model
- **Blender Polish:** Focus on topology cleanup, UV mapping, texture optimization
- **File Sizes:** Target <5MB per container, <2MB per item
- **Naming Convention:** Use kebab-case for all file names
- **Version Control:** Save source .blend files separately from exported .glb

---

**Status:** Ready to begin 3D asset creation pipeline
**Updated:** October 25, 2025
