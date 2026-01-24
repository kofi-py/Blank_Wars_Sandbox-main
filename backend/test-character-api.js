const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxOTQzNjUwLTU4ZjAtN2UzNS04Y2RkLTNkNjZhYTUwNmM2YiIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJpYXQiOjE3MzA2MDI4MTQsImV4cCI6MTczMzE5NDgxNH0.mZ5P6MoECYUOGbQ5XR0t9qmNZuqD8l_u7gVJv6Nwvuw';

async function testCharacterAPI() {
  try {
    const response = await fetch('http://localhost:4000/api/user/characters', {
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('\n=== FULL RESPONSE ===');
    console.log(JSON.stringify(data, null, 2));

    if (data.characters && data.characters.length > 0) {
      console.log('\n=== FIRST CHARACTER FIELDS ===');
      const first = data.characters[0];
      console.log('ID:', first.id);
      console.log('Name:', first.name);
      console.log('character_id:', first.character_id);
      console.log('Archetype:', first.archetype);
      console.log('Level:', first.level);
      console.log('Experience:', first.experience);
      console.log('Bond Level:', first.bond_level);
      console.log('Base Health:', first.max_health);
      console.log('Base Attack:', first.base_attack);
      console.log('\nAll fields:', Object.keys(first));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCharacterAPI();
