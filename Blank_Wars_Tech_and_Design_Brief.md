# Blank Wars Tech and Design Brief

## High-Level Overview

Blank Wars is a turn-based team combat game with a unique focus on character psychology and coaching, all wrapped in a "Reality Show" format. Players collect and manage a roster of historical and mythological characters, battling them in a strategic, hex-grid arena. The core gameplay revolves around a deep battle system that models not just physical combat, but also the mental and emotional states of the characters. AI agents, acting as a "Hostmaster" or narrator, provide running commentary on the battles, enhancing the reality show feel. The world is persistent, with characters remembering past events, and evolving relationships with the player and other characters.

## Current Architecture Snapshot

The application is a modern web application with a clear separation between the frontend and backend.

### Frontend Stack

*   **Framework**: React with Next.js
*   **3D Rendering**: Three.js with React Three Fiber for 3D battle arenas and mini-games.
*   **Physics**: Rapier for 3D physics simulation.
*   **State Management**: Zustand
*   **Real-time Communication**: Socket.io client for WebSocket communication with the backend.

### Backend Services

*   **Framework**: Node.js with Express.
*   **Real-time Communication**: Socket.io for handling real-time battle events and chat.
*   **Database**: PostgreSQL
*   **Matchmaking**: A sophisticated matchmaking system with both single-server and distributed (Redis) queue support.
*   **Architecture**: Service-oriented, with dedicated services for battles, character progression, coaching, and more.
*   **Deployment**: The application is deployed on Railway.

### Database Overview

The database is built on PostgreSQL and features a comprehensive schema that supports the core game features. Key tables include:

*   `users`: Manages user accounts, subscriptions, and overall progression.
*   `characters`: A master registry of all characters in the game, including their base stats, personality traits, and abilities.
*   `user_characters`: Stores the user-specific data for each character, including their level, experience, bond level, and memories.
*   `battles`: Records the details of each battle, including the participants, status, combat log, and rewards.
*   `chat_messages`: Logs conversations between players and characters.
*   `card_packs`, `qr_codes`: Manages the card collection and redemption system.
*   `tournaments`: Supports the tournament game mode.

### Blockchain Hooks

While the terms "Cardano" or "NFT" are not explicitly mentioned in the codebase, the database schema includes a `qr_codes` table with fields like `serial_number`, `signature`, `is_redeemed`, `redeemed_by`, and `redeemed_at`. This strongly suggests a system for redeeming unique digital assets, which could be an implementation of or a placeholder for an NFT system. This would allow for the creation of unique, verifiable digital collectibles tied to in-game characters or items.

## Character System

The character system is deep and detailed, with a focus on both stats and personality.

### Character Model

The `characters` table defines the master template for each character with the following fields:

*   `id`: `VARCHAR(20)`
*   `name`: `VARCHAR(100)`
*   `title`: `VARCHAR(200)`
*   `archetype`: `character_archetype` (enum)
*   `origin_era`: `VARCHAR(100)`
*   `rarity`: `character_rarity` (enum)
*   `base_health`, `base_attack`, `base_defense`, `base_speed`, `base_special`: `INTEGER`
*   `personality_traits`, `emotional_range`, `conversation_topics`: `JSONB`
*   `backstory`, `dialogue_intro`, `dialogue_victory`, `dialogue_defeat`: `TEXT`
*   `abilities`: `JSONB`

The `user_characters` table stores the user-specific instance of a character:

*   `level`, `experience`, `bond_level`: `INTEGER`
*   `current_health`, `max_health`: `INTEGER`
*   `is_injured`: `BOOLEAN`
*   `recovery_time`: `TIMESTAMP`
*   `conversation_memory`, `significant_memories`, `personality_drift`: `JSONB`

### Implemented vs. Roadmap

*   **Implemented**: The backend systems for character stats, progression, abilities, and the psychology system are largely complete. The database schema is fully defined.
*   **Roadmap**: The frontend UI for visualizing character stats, progression, and memories needs to be fully connected. The 3D character models (GLTF) are planned but not yet implemented.

## AI and Memory

AI and memory are central to the Blank Wars experience, creating the feeling that characters are living, breathing entities.

### How Characters Remember

*   **Conversation Memory**: The `user_characters.conversation_memory` field (a JSONB array) stores a log of recent conversations.
*   **Significant Memories**: The `user_characters.significant_memories` field (a JSONB array) stores key events and interactions that have a lasting impact on the character.
*   **Event Bus**: A centralized `GameEventBus` and `EventContextService` are responsible for managing character memory and relationship tracking across different domains (battle, therapy, social, etc.).

### How Agents Read and Write Memory

*   AI agents (like the "Hostmaster" or the characters themselves during chat) can read from the `conversation_memory` and `significant_memories` to inform their responses and behavior.
*   After significant events (like a major battle victory or a deep conversation), the system can write new entries to the `significant_memories` array.
*   The `personality_drift` field allows for a character's personality to evolve over time based on their experiences.

### Personality and Behavior Modeling

*   **Personality Traits**: The `characters.personality_traits` field defines the core personality of a character.
*   **Psychology Stats**: The battle system includes psychology stats like `stress`, `confidence`, and `mental_health` which affect a character's performance in battle.
*   **Coaching System**: The coaching system allows players to interact with their characters, giving them pep talks and strategic advice, which in turn affects their mental state and performance.

## Battle and Progression Loop

### A Typical Match

A typical match in Blank Wars is a turn-based, 3v3 team battle on a hex grid. The battle unfolds in the following phases:

1.  **Matchmaking**: Players are matched based on their rating.
2.  **Strategy Select**: Players choose a team-wide strategy (aggressive, defensive, or balanced).
3.  **Round Combat**: The battle consists of up to 3 rounds, with each round having 3 turns per team. Characters take turns moving, attacking, and using abilities. The damage calculation is physics-based and there is a deep status effect system.
4.  **Chat Break**: Between rounds, players can chat with their characters, which can affect their morale and performance in the next round.
5.  **Battle End**: The battle ends when one team is defeated. The winner is determined by the team with the most health remaining.

### Character Evolution

After each battle, characters evolve in several ways:

*   **XP and Leveling**: Characters gain experience points (XP) and level up, which increases their stats.
*   **Currency and Rewards**: Players earn currency which can be used to buy items and card packs.
*   **Bond Progression**: Interacting with characters in and out of battle increases the bond level, unlocking new dialogue and abilities.
*   **Injuries**: Characters can get injured in battle and require time to recover.

### Cardano NFT Interactions

As mentioned before, while not explicitly named "Cardano" or "NFT", the `qr_codes` system provides a clear place for NFT interactions. We envision a system where physical merchandise (like trading cards) can have a QR code that, when scanned, redeems a unique NFT of that character in the game. This NFT would be a `user_characters` entry in the database, with a unique `id` and a record of its acquisition from a QR code. This would create a bridge between the physical and digital worlds, and allow for true ownership of in-game assets.

## Future Games and Interoperability Vision

Blank Wars is designed to be an extensible platform for a variety of game experiences. The core character system is designed to be interoperable across different games and modes.

### Future Games and Modes

1.  **3D Obstacle Course Mini-Game**: A fully planned mini-game where characters navigate a 3D obstacle course, competing to be the last one standing. This would be integrated into the existing "Challenges" system.
2.  **Tournament Mode**: A competitive mode where players can enter tournaments with their teams to win prizes. The database schema for this is already in place.
3.  **Card Collection and Trading Game**: The `card_packs` and `qr_codes` systems lay the foundation for a full-fledged card collection and trading game, where players can collect, trade, and battle with their character cards.

### Character Identity Reuse

The `user_characters` table is the key to interoperability. A user's character, with its unique ID, stats, memories, and personality, can be used across all of these different games and modes. For example, a character's `agility` stat could be used to determine their speed in the 3D obstacle course, while their `attack` and `defense` stats would be used in the turn-based combat game. This allows for a deep and persistent connection between the player and their characters, as they grow and evolve together across a variety of experiences.