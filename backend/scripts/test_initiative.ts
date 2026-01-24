
import { determineTurnOrder, BattleCharacter } from '../src/services/battleMechanicsService';

function testInitiative() {
    console.log('🧪 Testing Advanced Initiative Formula...');

    const charA: BattleCharacter = {
        id: 'charA',
        name: 'Speedy but Clumsy',
        speed: 50,
        dexterity: 10,
        intelligence: 10,
        wisdom: 10,
        spirit: 10,
        // Minimal required fields for interface compliance
        health: 100, max_health: 100, attack: 10, defense: 10, magic_attack: 10, magic_defense: 10,
        effects: []
    };

    const charB: BattleCharacter = {
        id: 'charB',
        name: 'Slow but Agile & Smart',
        speed: 30,
        dexterity: 50,
        intelligence: 50,
        wisdom: 10,
        spirit: 10,
        // Minimal required fields for interface compliance
        health: 100, max_health: 100, attack: 10, defense: 10, magic_attack: 10, magic_defense: 10,
        effects: []
    };

    // Calculate expected initiative
    // Char A: 50 + (10*0.5) + (10*0.2) + (10*0.2) + (10*0.1) = 50 + 5 + 2 + 2 + 1 = 60
    // Char B: 30 + (50*0.5) + (50*0.2) + (10*0.2) + (10*0.1) = 30 + 25 + 10 + 2 + 1 = 68

    console.log('Char A (Speed 50, Dex 10) Expected Init: 60');
    console.log('Char B (Speed 30, Dex 50, Int 50) Expected Init: 68');

    const order = determineTurnOrder([charA, charB]);

    console.log('Turn Order:');
    order.forEach((c, i) => {
        console.log(`${i + 1}. ${c.name} (Speed: ${c.speed})`);
    });

    if (order[0].id === 'charB') {
        console.log('✅ SUCCESS: Char B went first despite lower speed!');
        process.exit(0);
    } else {
        console.error('❌ FAILURE: Char A went first.');
        process.exit(1);
    }
}

testInitiative();
