# 3D Obstacle Course Mini-Game Architecture
**Project:** Blank Wars - Reality Show Challenge Integration
**Created:** 2025-10-04
**Status:** Planning Phase

## Overview
A 3D obstacle course mini-game where characters navigate slippery platforms, avoid obstacles, and compete to be the last one standing. Integrates with existing Challenges system.

---

## Tech Stack

### Core Technologies
- **Three.js** - 3D rendering engine
- **React Three Fiber (@react-three/fiber)** - React integration for Three.js
- **@react-three/drei** - Useful helpers (controls, loaders, effects)
- **Rapier** (@dimforge/rapier3d-compat) - Physics engine (better than Cannon.js)
- **@react-three/rapier** - React wrapper for Rapier physics

### Optional Enhancements
- **Socket.io** - Real-time multiplayer sync (already in project)
- **Zustand** - State management for game state
- **GLTF models** - 3D character models (can start with primitives)

---

## Phase 1: Basic Prototype (Week 1)

### Installation
```bash
cd frontend
npm install three @react-three/fiber @react-three/drei @dimforge/rapier3d-compat @react-three/rapier
```

### File Structure
```
frontend/src/
├── app/
│   └── challenges/
│       └── mini-game/
│           └── page.tsx              # Main game page
├── components/
│   └── MiniGame/
│       ├── ObstacleCourse.tsx        # Main game component
│       ├── Player.tsx                # Player character controller
│       ├── Platform.tsx              # Game platform
│       ├── Obstacles/
│       │   ├── RotatingPaddle.tsx
│       │   ├── MovingBlock.tsx
│       │   └── SwingingHammer.tsx
│       ├── GameUI.tsx                # HUD, timer, score
│       └── GameCamera.tsx            # Camera controller
└── hooks/
    └── useGameState.ts               # Game state management
```

### Core Components

#### 1. ObstacleCourse.tsx
```tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls, Sky } from '@react-three/drei';
import Platform from './Platform';
import Player from './Player';
import RotatingPaddle from './Obstacles/RotatingPaddle';
import GameUI from './GameUI';

export default function ObstacleCourse({ challengeId, players }) {
  return (
    <>
      <Canvas camera={{ position: [0, 10, 15], fov: 60 }}>
        <Sky />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        <Physics gravity={[0, -20, 0]}>
          <Platform />

          {/* Players */}
          {players.map((player, idx) => (
            <Player
              key={player.id}
              position={[idx * 2, 2, 0]}
              color={player.color}
              characterData={player.character}
            />
          ))}

          {/* Obstacles */}
          <RotatingPaddle position={[0, 1, -5]} />
          <RotatingPaddle position={[5, 1, -10]} rotation={Math.PI / 2} />
        </Physics>

        <OrbitControls />
      </Canvas>

      <GameUI players={players} />
    </>
  );
}
```

#### 2. Player.tsx
```tsx
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';

export default function Player({ position, color, characterData }) {
  const bodyRef = useRef();
  const [, getKeys] = useKeyboardControls();

  useFrame(() => {
    if (!bodyRef.current) return;

    const { forward, backward, left, right, jump } = getKeys();
    const impulse = { x: 0, y: 0, z: 0 };
    const speed = characterData.agility * 0.05; // Use character stats

    if (forward) impulse.z -= speed;
    if (backward) impulse.z += speed;
    if (left) impulse.x -= speed;
    if (right) impulse.x += speed;
    if (jump) impulse.y = 5;

    bodyRef.current.applyImpulse(impulse, true);

    // Check if fallen off platform
    const pos = bodyRef.current.translation();
    if (pos.y < -10) {
      // Player eliminated
      bodyRef.current.setTranslation({ x: 0, y: 10, z: 0 }, true);
    }
  });

  return (
    <RigidBody ref={bodyRef} position={position} colliders={false}>
      <CapsuleCollider args={[0.5, 0.5]} />
      <mesh castShadow>
        <capsuleGeometry args={[0.5, 1]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}
```

#### 3. Platform.tsx
```tsx
import { RigidBody } from '@react-three/rapier';

export default function Platform() {
  return (
    <RigidBody type="fixed" friction={0.1}> {/* Low friction = slippery */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[20, 0.5, 30]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.1} />
      </mesh>
    </RigidBody>
  );
}
```

#### 4. RotatingPaddle.tsx
```tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';

export default function RotatingPaddle({ position, rotation = 0 }) {
  const paddleRef = useRef();

  useFrame((state) => {
    if (!paddleRef.current) return;
    const time = state.clock.elapsedTime;
    const angle = time * 2; // Rotation speed
    paddleRef.current.setRotation({
      x: 0,
      y: angle + rotation,
      z: 0,
      w: 1
    }, true);
  });

  return (
    <RigidBody
      ref={paddleRef}
      position={position}
      type="kinematicPosition"
      colliders="cuboid"
    >
      <mesh castShadow>
        <boxGeometry args={[8, 0.3, 1]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </RigidBody>
  );
}
```

---

## Phase 2: Challenge Integration (Week 2)

### Database Integration

#### Link to Challenges System
```tsx
// frontend/src/app/challenges/mini-game/[challengeId]/page.tsx

export default function MiniGamePage({ params }) {
  const { challengeId } = params;
  const [challenge, setChallenge] = useState(null);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    loadChallengeData();
  }, [challengeId]);

  const loadChallengeData = async () => {
    // Get challenge details
    const challengeRes = await apiClient.get(`/challenges/${challengeId}`);
    setChallenge(challengeRes.data);

    // Get participants
    const participantsRes = await apiClient.get(`/challenges/${challengeId}/participants`);
    setParticipants(participantsRes.data.participants);
  };

  const handleGameEnd = async (winner) => {
    // Submit results
    await apiClient.post(`/challenges/${challengeId}/complete`, {
      winnerId: winner.user_character_id,
      results: {
        placements: finalPlacements,
        duration: gameDuration
      }
    });
  };

  return (
    <ObstacleCourse
      challengeId={challengeId}
      players={participants}
      onGameEnd={handleGameEnd}
    />
  );
}
```

### Backend API Updates
```typescript
// backend/src/routes/challengeRoutes.ts

// Start mini-game challenge
router.post('/:id/start-minigame', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Update challenge status to in_progress
  await db.query(
    `UPDATE active_challenges
     SET status = 'in_progress', start_time = NOW()
     WHERE id = $1`,
    [id]
  );

  // Get all participants with their character stats
  const participants = await db.query(
    `SELECT cp.*, uc.base_name, uc.stats
     FROM challenge_participants cp
     JOIN user_characters uc ON cp.user_character_id = uc.id
     WHERE cp.active_challenge_id = $1`,
    [id]
  );

  res.json({ success: true, participants: participants.rows });
});

// Submit mini-game results
router.post('/:id/complete', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { winnerId, results } = req.body;

  // Record results
  const resultId = await db.query(
    `INSERT INTO challenge_results (
      active_challenge_id,
      winner_character_id,
      total_participants,
      full_results,
      completed_at
    ) VALUES ($1, $2, $3, $4, NOW())
    RETURNING id`,
    [id, winnerId, results.placements.length, JSON.stringify(results)]
  );

  // Distribute rewards
  await distributeChallengeRewards(resultId.rows[0].id, winnerId);

  res.json({ success: true, resultId: resultId.rows[0].id });
});
```

---

## Phase 3: Multiplayer (Week 3-4)

### Real-time Sync with Socket.io

#### Server-side (backend/src/server.ts)
```typescript
// Add to existing socket.io setup
io.of('/minigame').on('connection', (socket) => {
  console.log('Player connected to mini-game:', socket.id);

  socket.on('join-game', async (challengeId) => {
    socket.join(challengeId);

    // Broadcast player joined
    io.of('/minigame').to(challengeId).emit('player-joined', {
      playerId: socket.id,
      timestamp: Date.now()
    });
  });

  socket.on('player-position', (data) => {
    // Broadcast position to other players
    socket.to(data.challengeId).emit('player-moved', {
      playerId: socket.id,
      position: data.position,
      velocity: data.velocity
    });
  });

  socket.on('player-eliminated', (data) => {
    io.of('/minigame').to(data.challengeId).emit('player-out', {
      playerId: socket.id,
      placement: data.placement
    });
  });
});
```

#### Client-side
```tsx
// useMultiplayer.ts
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useMultiplayer(challengeId) {
  const [socket, setSocket] = useState(null);
  const [remotePlayers, setRemotePlayers] = useState({});

  useEffect(() => {
    const newSocket = io('https://api.blankwars.com/minigame');
    setSocket(newSocket);

    newSocket.emit('join-game', challengeId);

    newSocket.on('player-moved', (data) => {
      setRemotePlayers(prev => ({
        ...prev,
        [data.playerId]: {
          position: data.position,
          velocity: data.velocity
        }
      }));
    });

    return () => newSocket.close();
  }, [challengeId]);

  const broadcastPosition = (position, velocity) => {
    socket?.emit('player-position', {
      challengeId,
      position,
      velocity
    });
  };

  return { remotePlayers, broadcastPosition };
}
```

---

## Phase 4: Polish & Features (Week 5-6)

### Advanced Features

#### 1. Character Models
- Use GLTF models from character assets
- Implement animations (walk, fall, celebrate)
- Map character stats to gameplay (agility → speed, strength → knockback resistance)

#### 2. More Obstacles
- **Swinging Hammers** - pendulum motion
- **Moving Platforms** - disappear/reappear
- **Rotating Rings** - must jump through
- **Spinning Wheels** - knockback on contact
- **Rising Walls** - block pathways

#### 3. Particle Effects
```tsx
import { useParticles } from '@react-three/rapier';

function ImpactEffect({ position }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color="orange" />
    </mesh>
  );
}
```

#### 4. Camera System
```tsx
import { useThree, useFrame } from '@react-three/fiber';

function FollowCamera({ target }) {
  const { camera } = useThree();

  useFrame(() => {
    if (!target.current) return;
    const pos = target.current.translation();
    camera.position.lerp(
      new THREE.Vector3(pos.x, pos.y + 10, pos.z + 15),
      0.1
    );
    camera.lookAt(pos.x, pos.y, pos.z);
  });

  return null;
}
```

#### 5. Sound Effects
```tsx
import { useEffect } from 'react';
import { Audio, AudioListener } from 'three';

function GameSounds() {
  useEffect(() => {
    const listener = new AudioListener();
    const sound = new Audio(listener);

    // Load sounds
    const audioLoader = new AudioLoader();
    audioLoader.load('/sounds/impact.mp3', (buffer) => {
      sound.setBuffer(buffer);
    });
  }, []);
}
```

---

## Performance Optimization

### Best Practices
1. **Instancing** - Use `<instancedMesh>` for repeated objects (platforms, obstacles)
2. **LOD** - Level of Detail for distant objects
3. **Occlusion Culling** - Don't render off-screen objects
4. **Physics Optimization** - Use simplified collision shapes
5. **Texture Atlasing** - Combine textures to reduce draw calls

### Example: Instanced Platforms
```tsx
function InstancedPlatforms({ count = 10 }) {
  const meshRef = useRef();

  useEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(i * 5, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count]);

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[4, 0.5, 4]} />
      <meshStandardMaterial color="blue" />
    </instancedMesh>
  );
}
```

---

## Testing Strategy

### Unit Tests
- Player movement logic
- Collision detection
- Score calculation
- Physics interactions

### Integration Tests
- Challenge creation → game start → results submission
- Multiplayer sync
- Reward distribution

### Manual Testing Checklist
- [ ] Player can move in all directions
- [ ] Player gets knocked off by obstacles
- [ ] Falling off platform eliminates player
- [ ] Timer counts down correctly
- [ ] Winner is correctly determined
- [ ] Results save to database
- [ ] Rewards distribute properly
- [ ] Multiplayer syncs positions
- [ ] Game handles disconnections
- [ ] Mobile performance (30+ FPS)

---

## Mobile Considerations

### Touch Controls
```tsx
import { useGesture } from '@use-gesture/react';

function MobileControls({ onMove }) {
  const bind = useGesture({
    onDrag: ({ movement: [mx, my] }) => {
      onMove({ x: mx * 0.01, z: my * 0.01 });
    }
  });

  return (
    <div
      {...bind()}
      className="fixed bottom-0 left-0 w-full h-48 touch-none"
    />
  );
}
```

### Performance
- Lower physics tick rate on mobile (30Hz vs 60Hz)
- Reduce particle count
- Simplify shadows
- Lower texture resolution

---

## Deployment

### Build Configuration
```json
// package.json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

### Environment Variables
```env
NEXT_PUBLIC_GAME_PHYSICS_TICK_RATE=60
NEXT_PUBLIC_MAX_PLAYERS_PER_GAME=8
NEXT_PUBLIC_GAME_DURATION_SECONDS=180
```

### Railway Deployment
- Frontend auto-deploys on push to main
- Backend already has Socket.io configured
- No additional infrastructure needed

---

## Future Enhancements

### Advanced Features
- **Tournament Brackets** - Multi-round elimination
- **Power-ups** - Speed boost, shield, jump boost
- **Custom Levels** - User-created obstacle courses
- **Spectator Mode** - Watch ongoing games
- **Replay System** - Save and watch past games
- **Seasonal Themes** - Holiday-themed obstacles
- **Character Abilities** - Special moves based on character type
- **Team Mode** - 2v2 or 4v4 cooperative
- **Progressive Difficulty** - Obstacles speed up over time
- **Daily Challenges** - Unique obstacle patterns each day

### Analytics
- Track player performance metrics
- Heatmaps of where players get eliminated
- Balance adjustments based on win rates
- A/B test obstacle difficulty

---

## Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Phase 1: Prototype | 1-2 weeks | Basic playable game, single-player |
| Phase 2: Integration | 1 week | Challenge system connected, DB working |
| Phase 3: Multiplayer | 1-2 weeks | Real-time sync, 2-8 players |
| Phase 4: Polish | 1-2 weeks | Models, effects, sounds, UI |
| **Total** | **4-7 weeks** | Production-ready mini-game |

---

## Success Metrics

### Technical
- ✅ Runs at 60 FPS on desktop, 30 FPS on mobile
- ✅ Multiplayer latency < 100ms
- ✅ Zero physics bugs (no clipping, no flying)
- ✅ 100% uptime for game sessions

### User Experience
- ✅ Average game duration: 2-5 minutes
- ✅ 80%+ completion rate (players finish games)
- ✅ < 5 second load time
- ✅ Intuitive controls (no tutorial needed)

### Business
- ✅ 50%+ of challenge participants try mini-game
- ✅ 30%+ replay rate (play multiple times)
- ✅ Drives challenge engagement up 2x
- ✅ Increases average session duration

---

## Notes
- Start with Phase 1 MVP - validate concept before investing in polish
- Reuse existing Socket.io infrastructure for multiplayer
- Character stats already in DB - easy to integrate
- Challenge system tables ready - minimal backend work
- Can soft-launch with 1-2 obstacle types, expand later

**Next Steps:** Install dependencies and build Phase 1 prototype
