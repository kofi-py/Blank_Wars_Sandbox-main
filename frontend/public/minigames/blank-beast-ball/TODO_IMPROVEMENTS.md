# Blank Beast Ball - Improvements TODO

## Priority: HIGH

### 1. Add Mobile Touch Controls
- [ ] Create touch control overlay (similar to Arbor Apocalypse)
- [ ] Add virtual joystick for movement (WASD replacement)
- [ ] Add jump button for SPACE
- [ ] Add camera rotation buttons for Q/E
- [ ] Detect mobile device and show controls automatically
- [ ] Test on various screen sizes

### 2. Add Sound Effects & Music
- [ ] Background music for each level theme (Ocean, Volcano, Arctic)
- [ ] Ball bounce sounds (different pitch for each color)
- [ ] Jump sound effect
- [ ] Landing sound effect
- [ ] Combo achievement sound
- [ ] Checkpoint reached sound
- [ ] Victory/Game Over music
- [ ] Add volume controls

## Priority: MEDIUM

### 3. Make Character Stats Affect Gameplay
Current stats are defined but unused:
- `strength` - Could affect push/knockback resistance
- `agility` - Should affect movement speed and jump height
- `intelligence` - Could affect combo multiplier
- `vitality` - Could affect fall damage tolerance
- `wisdom` - Could show ball colors from further away
- `charisma` - Could affect score multiplier

Implementation:
- [ ] Create stat modifier system
- [ ] Apply agility to movement speed
- [ ] Apply agility to jump height
- [ ] Add stat display on character select screen
- [ ] Balance gameplay with stat differences

### 4. Improve Camera System
- [ ] Smoother camera follow with lerping
- [ ] Camera doesn't clip through geometry
- [ ] Better default camera angle
- [ ] Optional first-person mode?

### 5. Enhanced Visual Feedback
- [ ] Particle burst on ball bounces
- [ ] Trail effect behind player
- [ ] Combo counter animations (numbers flying up)
- [ ] Screen shake on big bounces
- [ ] Color flash when hitting different ball types

## Priority: LOW

### 6. Level Design Enhancements
- [ ] Moving platforms
- [ ] Rotating obstacles
- [ ] Wind zones that push player
- [ ] Bounce pads
- [ ] Collectible coins/stars for bonus points

### 7. Backend Integration
- [ ] Save high scores to Blank Wars backend
- [ ] Track character usage statistics
- [ ] Unlock characters based on main game progress
- [ ] Daily/Weekly leaderboards

### 8. Additional Features
- [ ] Replay system
- [ ] Ghost racing (race against your best time)
- [ ] Multiplayer mode (future)
- [ ] More levels (Level 4, 5, etc.)

---

## Files to Modify
- `game.js` - Main game logic, controls, stats
- `index.html` - Add mobile control HTML elements
- `style.css` - Style mobile controls
- `ball-physics.js` - May need adjustments for stat-based physics
- `level2.js`, `level3.js` - Level-specific enhancements

## Resources Needed
- Sound effects (free from freesound.org or similar)
- Background music (royalty-free)
- Particle textures (can generate procedurally)
