
import { io, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 4000;
const SOCKET_URL = `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'default_secret';

// Database configuration
const dbConfig = {
    user: process.env.DB_USER || process.env.USER || 'gabrielgreenstein',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'blankwars',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432'),
};

async function createTestUsers(client: Client) {
    console.log('🛠 Creating test users...');

    // Debug Schema
    const schemaRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'characters'
    `);
    console.log('📊 Characters Table Columns:', schemaRes.rows.map(r => r.column_name).join(', '));

    const user1Id = uuidv4();
    const user2Id = uuidv4();
    const char1Id = uuidv4();
    const char2Id = uuidv4();
    const userChar1Id = uuidv4();
    const userChar2Id = uuidv4();

    // Create Users
    await client.query(`
    INSERT INTO users (id, username, email, password_hash)
    VALUES 
      ($1, 'test_user_1', 'test1_' || $1 || '@example.com', 'hash'),
      ($2, 'test_user_2', 'test2_' || $2 || '@example.com', 'hash')
    ON CONFLICT (username) DO NOTHING
  `, [user1Id, user2Id]);

    // Create Characters
    await client.query(`
    INSERT INTO characters (
      id, name, speed, defense, 
      max_health, attack, magic_attack,
      species, archetype, rarity,
      battle_image_name,
      abilities, personality_traits
    )
    VALUES 
      ($1, 'Test Char 1', 50, 10, 
       100, 10, 10,
       'human', 'warrior', 'common',
       'default_warrior',
       '[]', '[]'),
      ($2, 'Test Char 2', 60, 10,
       100, 10, 10,
       'human', 'mage', 'common',
       'default_mage',
       '[]', '[]')
    ON CONFLICT (id) DO UPDATE SET 
      abilities = EXCLUDED.abilities,
      personality_traits = EXCLUDED.personality_traits;
  `, [char1Id, char2Id]);

    // Link User Characters
    // We need to fetch the actual user IDs in case they already existed
    const usersRes = await client.query(`SELECT id, username FROM users WHERE username IN ('test_user_1', 'test_user_2')`);
    const u1 = usersRes.rows.find(u => u.username === 'test_user_1');
    const u2 = usersRes.rows.find(u => u.username === 'test_user_2');

    if (u1 && u2) {
        await client.query(`
      INSERT INTO user_characters (
        id, user_id, character_id,
        current_health, max_health,
        current_attack, current_defense, current_speed, current_special,
        current_max_health,
        current_training, current_team_player, current_ego,
        current_mental_health, current_communication
      )
      VALUES 
        ($1, $2, $3, 100, 100, 10, 10, 50, 10, 100, 50, 50, 50, 50, 50),
        ($4, $5, $6, 100, 100, 10, 10, 60, 10, 100, 50, 50, 50, 50, 50)
      ON CONFLICT DO NOTHING
    `, [userChar1Id, u1.id, char1Id, userChar2Id, u2.id, char2Id]);
    }
    console.log('✅ Test users created/verified');
}

async function getTestUsers() {
    const client = new Client(dbConfig);
    await client.connect();

    try {
        // Find 2 users with characters
        let res = await client.query(`
      SELECT u.id, u.username, uc.id as user_character_id, c.name as character_name, c.speed, c.dexterity
      FROM users u
      JOIN user_characters uc ON u.id = uc.user_id
      JOIN characters c ON uc.character_id = c.id
      WHERE u.username IN ('test_user_1', 'test_user_2')
      LIMIT 2
    `);

        if (res.rows.length < 2) {
            await createTestUsers(client);
            res = await client.query(`
        SELECT u.id, u.username, uc.id as user_character_id, c.name as character_name, c.speed, c.dexterity
        FROM users u
        JOIN user_characters uc ON u.id = uc.user_id
        JOIN characters c ON uc.character_id = c.id
        WHERE u.username IN ('test_user_1', 'test_user_2')
        LIMIT 2
      `);
        }

        if (res.rows.length < 2) {
            console.error('❌ Failed to create/find test users.');
            process.exit(1);
        }

        return res.rows;
    } finally {
        await client.end();
    }
}

function createSocket(token: string): Socket {
    const socket = io(SOCKET_URL, {
        transports: ['websocket'],
        auth: { token },
        forceNew: true,
    });

    return socket;
}

async function simulateBattle() {
    console.log('🚀 Starting Battle Flow Simulation...');

    const users = await getTestUsers();
    const user1 = users[0];
    const user2 = users[1];

    console.log(`👤 User 1: ${user1.username} (${user1.character_name})`);
    console.log(`👤 User 2: ${user2.username} (${user2.character_name})`);

    // Generate tokens
    const token1 = jwt.sign({ user_id: user1.id, type: 'access' }, JWT_SECRET, { expiresIn: '1h' });
    const token2 = jwt.sign({ user_id: user2.id, type: 'access' }, JWT_SECRET, { expiresIn: '1h' });

    const socket1 = createSocket(token1);
    const socket2 = createSocket(token2);

    const cleanup = () => {
        socket1.disconnect();
        socket2.disconnect();
        process.exit(0);
    };

    // Socket 1 Events
    socket1.on('connect', () => {
        console.log('✅ User 1 connected');
        socket1.emit('auth', token1);
    });

    socket1.on('auth_success', () => {
        console.log('🔐 User 1 authenticated');
        // 4. Initiate Matchmaking (PVE)
        console.log('🔍 User 1 searching for PVE match...');
        socket1.emit('find_match', { character_id: user1.user_character_id, mode: 'pve' });
    });

    socket1.on('match_found', (data) => {
        console.log('🎉 User 1 Match Found!', data);
    });

    socket1.on('battle_started', (data) => {
        console.log('⚔️ User 1 Battle Started!', data);
    });

    socket1.on('turn_update', (data) => {
        console.log('🔄 User 1 Turn Update:', data);
        if (data.active_character_id === user1.character_id) {
            console.log('👉 User 1 Turn! Executing action...');
            // Simulate action (e.g., move or attack)
            // This requires knowing the battle state which is complex to mock fully here without more context
            // But we can verify we got the turn
        }
    });

    // Socket 2 Events
    socket2.on('connect', () => {
        console.log('✅ User 2 connected');
        socket2.emit('auth', token2);
    });

    socket2.on('auth_success', () => {
        console.log('🔐 User 2 authenticated');
        console.log('⚔️ User 2 searching for match...');
        socket2.emit('find_match', { character_id: user2.user_character_id, mode: 'ranked' });
    });

    socket2.on('match_found', (data) => {
        console.log('🎉 User 2 Match Found!', data);
    });

    socket2.on('battle_started', (data) => {
        console.log('⚔️ User 2 Battle Started!', data);
    });

    // Timeout
    setTimeout(() => {
        console.log('⏰ Simulation timeout');
        cleanup();
    }, 30000);
}

simulateBattle().catch(console.error);
