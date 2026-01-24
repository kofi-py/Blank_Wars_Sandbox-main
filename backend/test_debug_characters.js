const http = require('http');

// Test character retrieval for the last created user
const userId = '831e05b1-26bb-47f4-82bf-eb9ad43107b7'; // From the previous test

const options = {
  hostname: 'localhost',
  port: 4000,
  path: `/api/user/debug-characters/${userId}`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🎭 Testing character retrieval debug endpoint...');
console.log('🆔 User ID:', userId);
console.log('🔗 Endpoint:', `http://localhost:4000${options.path}`);
console.log('');

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📤 Response:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));

      if (response.charactersFromJoin > 0) {
        console.log('\n✅ Characters found!');
      } else {
        console.log('\n❌ No characters found');
        console.log('📊 Debug info:');
        console.log(`  - Characters from JOIN: ${response.charactersFromJoin}`);
        console.log(`  - Characters from RAW count: ${response.charactersFromRaw}`);
      }
    } catch (e) {
      console.log('❌ Parse error:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.end();
