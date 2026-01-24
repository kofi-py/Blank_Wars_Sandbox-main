async function test() {
  // Try testuser with common password
  const passwords = ['testuser', 'password', 'password123', 'test123'];
  
  for (const pwd of passwords) {
    const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', password: pwd })
    });
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful with password:', pwd);
      
      // Get characters
      const charResponse = await fetch('http://localhost:4000/api/user/characters', {
        headers: {
          'Authorization': 'Bearer ' + loginData.token,
          'Content-Type': 'application/json'
        }
      });
      
      const charData = await charResponse.json();
      console.log('\nCharacters count:', charData.characters?.length || 0);
      
      if (charData.characters && charData.characters.length > 0) {
        console.log('\n=== FIRST CHARACTER (RAW DATA) ===');
        const char = charData.characters[0];
        console.log('id:', char.id);
        console.log('name:', char.name);
        console.log('character_id:', char.character_id);
        console.log('archetype:', char.archetype);
        console.log('level:', char.level);
        console.log('experience:', char.experience);
        console.log('bond_level:', char.bond_level);
        console.log('base_attack:', char.base_attack);
        console.log('attack:', char.attack);
        console.log('health:', char.health);
        console.log('max_health:', char.max_health);
        console.log('\n=== TESTING THERAPY MAPPINGS ===');
        console.log('Will therapy mapping work?');
        console.log('- id exists?', char.id !== undefined);
        console.log('- name exists?', char.name !== undefined);
        console.log('- character_id exists?', char.character_id !== undefined);
        console.log('- archetype exists?', char.archetype !== undefined);
        console.log('- level exists?', char.level !== undefined);
        console.log('- experience exists?', char.experience !== undefined);
        console.log('- bond_level exists?', char.bond_level !== undefined);
        console.log('- max_health exists?', char.max_health !== undefined);
        console.log('- base_attack exists?', char.base_attack !== undefined);
      }
      
      return;
    }
  }
  
  console.log('❌ All passwords failed');
}

test().catch(console.error);
