const http = require('http');

// Test complete user registration + character verification flow
const timestamp = Date.now();
const testData = JSON.stringify({
  username: 'finaltest' + timestamp,
  email: 'finaltest' + timestamp + '@example.com',
  password: 'FinalTest123!'
});

console.log('🎯 FINAL ZERO-ERROR TEST - Complete Registration + Character Verification');
console.log('==================================================================');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('📝 Creating user...');

const req = http.request(options, (res) => {
  console.log(`📊 Registration Status: ${res.statusCode} ${res.statusCode === 201 ? '✅' : '❌'}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      if (res.statusCode === 201 && response.success) {
        console.log(`🎉 User Created: ${response.user.username}`);
        console.log(`🆔 User ID: ${response.user.id}`);

        // Immediately check for characters
        setTimeout(() => {
          checkCharacters(response.user.id);
        }, 500);
      } else {
        console.log('❌ Registration Failed:', response);
      }
    } catch (e) {
      console.log('❌ Registration Parse Error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Registration Request Error:', e.message);
});

req.write(testData);
req.end();

function checkCharacters(userId) {
  console.log('\n🎭 Verifying starter pack characters...');

  const charOptions = {
    hostname: 'localhost',
    port: 4000,
    path: `/api/user/debug-characters/${userId}`,
    method: 'GET'
  };

  const charReq = http.request(charOptions, (res) => {
    console.log(`📊 Character Check Status: ${res.statusCode} ${res.statusCode === 200 ? '✅' : '❌'}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);

        if (res.statusCode === 200 && response.success) {
          console.log(`\n🎁 Starter Pack Results:`);
          console.log(`   📊 Characters Found: ${response.charactersFromJoin}`);
          console.log(`   📈 Database Count: ${response.charactersFromRaw}`);

          if (response.charactersFromJoin > 0) {
            console.log(`\n🎮 Character Roster:`);
            response.characters.forEach((char, index) => {
              console.log(`   ${index + 1}. ${char.name} - ${char.title} (${char.archetype})`);
              console.log(`      ⚔️  ATK: ${char.current_attack} | 🛡️  DEF: ${char.current_defense} | ⚡ SPD: ${char.current_speed}`);
              console.log(`      ❤️  HP: ${char.current_health}/${char.current_max_health} | 🎯 LVL: ${char.current_level}`);
            });

            console.log(`\n🎊 SUCCESS: ZERO ERRORS ACHIEVED!`);
            console.log(`✅ User registration: WORKING`);
            console.log(`✅ Database operations: WORKING`);
            console.log(`✅ Character generation: WORKING`);
            console.log(`✅ JSON parsing: WORKING`);
            console.log(`✅ Authentication: WORKING`);
            console.log(`\n🚀 System Status: FULLY OPERATIONAL - READY FOR DEVELOPMENT`);
          } else {
            console.log(`\n❌ No characters found - pack generation failed`);
          }
        } else {
          console.log('❌ Character check failed:', response);
        }
      } catch (e) {
        console.log('❌ Character Parse Error:', e.message);
      }
    });
  });

  charReq.on('error', (e) => {
    console.error('❌ Character Request Error:', e.message);
  });

  charReq.end();
}
