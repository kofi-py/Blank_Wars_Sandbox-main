# Arbor Apocalypse - Improvements TODO

## Priority: HIGH

### 1. Add Sound Effects & Music
- [ ] Engine sound (revving based on speed)
- [ ] Tire screech on sharp turns
- [ ] Crash/collision sounds
- [ ] Meteor impact explosion
- [ ] Fire crackling when trees burn
- [ ] Water splash through puddles
- [ ] Zombie growls
- [ ] Monster roars
- [ ] Background music per theme/level
- [ ] Victory jingle
- [ ] Game over sound
- [ ] Add mute/volume controls

### 2. Power-Up System
- [ ] Water tank power-up (instantly extinguish all fires)
- [ ] Speed boost (temporary speed increase)
- [ ] Shield (temporary invincibility)
- [ ] Magnet (attract coins/bonuses)
- [ ] Slow-mo (slow down hazards temporarily)
- [ ] Visual indicators for active power-ups
- [ ] Power-up spawn system on road

## Priority: MEDIUM

### 3. Enhanced Particle Effects
- [ ] Better fire particles (more realistic flames)
- [ ] Smoke trail from burning trees
- [ ] Meteor trail effects
- [ ] Explosion particles on impact
- [ ] Dust/dirt when driving off-road
- [ ] Rain particles in certain levels
- [ ] Sparks on collision

### 4. Tutorial/First-Time Player Experience
- [ ] Optional tutorial level
- [ ] On-screen hints for first few hazards
- [ ] Practice mode without scoring
- [ ] Gradual difficulty introduction

### 5. Visual Polish
- [ ] Improve horizon wall graphics
- [ ] Add more environmental details (buildings, signs)
- [ ] Weather effects (rain, fog, sandstorm)
- [ ] Day/night cycle per level
- [ ] Better truck damage visualization
- [ ] Rearview mirror showing hazards behind

## Priority: LOW

### 6. Backend Integration
- [ ] Global leaderboards via Blank Wars API
- [ ] Player profiles and statistics
- [ ] Daily challenges
- [ ] Achievement system
- [ ] Unlock new trucks/tree types

### 7. Additional Content
- [ ] More tree types with unique properties
- [ ] Different truck models
- [ ] Boss levels (giant meteor, mega zombie)
- [ ] Endless mode
- [ ] Time trial mode

### 8. Gameplay Refinements
- [ ] Combo system for consecutive deliveries
- [ ] Near-miss bonus points
- [ ] Draft mechanic (following other vehicles)
- [ ] Brake lights on other traffic
- [ ] Turn signals/indicators

---

## Files to Modify
- `game.js` - Main game logic, power-ups, sounds
- `index.html` - Volume controls, tutorial UI
- `landscape-themes.js` - Enhanced themes, weather

## Resources Needed
- Sound effects library
- Background music tracks
- Power-up icons/sprites
- Additional 3D models (power-ups, new hazards)

## Current Hazard System (Reference)
```javascript
// From getDifficultyConfig()
- trafficChance: Starts 3%, ramps up slowly
- meteorChance: Starts level 2 at 0.5%
- puddleChance: Starts 3%, ramps up
- monsterChance: Starts level 4
- zombieChance: Starts level 5
```

## Tree Economics (Reference)
```javascript
// treeTypes
budget: { cost: 10, sellPrice: 30 }    // $20 profit/tree
standard: { cost: 15, sellPrice: 40 }  // $25 profit/tree
premium: { cost: 20, sellPrice: 50 }   // $30 profit/tree
```
