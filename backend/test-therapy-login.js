async function test() {
  // Login first
  const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testuser', password: 'password123' })
  });
  
  const loginData = await loginResponse.json();
  console.log('Login status:', loginResponse.status);
  
  if (!loginData.token) {
    console.log('Login failed:', loginData);
    return;
  }
  
  console.log('Token obtained\n');
  
  // Get characters
  const charResponse = await fetch('http://localhost:4000/api/user/characters', {
    headers: {
      'Authorization': 'Bearer ' + loginData.token,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Characters API status:', charResponse.status);
  const charData = await charResponse.json();
  
  console.log('\n=== CHARACTER DATA ===');
  console.log(JSON.stringify(charData, null, 2));
  
  if (charData.characters && charData.characters.length > 0) {
    console.log('\n=== FIRST CHARACTER FIELDS ===');
    const char = charData.characters[0];
    console.log('id:', char.id);
    console.log('name:', char.name);
    console.log('character_id:', char.character_id);
    console.log('archetype:', char.archetype);
    console.log('level:', char.level);
    console.log('experience:', char.experience);
    console.log('bond_level:', char.bond_level);
    console.log('base_attack:', char.base_attack);
    console.log('health:', char.health);
    console.log('max_health:', char.max_health);
  }
}

test().catch(console.error);
