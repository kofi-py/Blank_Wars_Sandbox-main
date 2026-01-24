const http = require('http');

// Test user registration to verify zero errors
const testData = JSON.stringify({
  username: 'zeroerrors' + Date.now(),
  email: 'zeroerrors' + Date.now() + '@example.com',
  password: 'SecurePass123!'
});

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

console.log('🧪 Testing user registration for zero errors...\n');

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📤 Response Body:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));

      if (res.statusCode === 201 && response.success) {
        console.log('\n✅ SUCCESS: Registration completed with zero errors!');
        console.log(`🎉 User created: ${response.user.username}`);
        console.log(`🎁 Starter pack: ${response.user.starter_pack_generated ? 'Generated' : 'Not generated'}`);
      } else {
        console.log('\n❌ ERRORS DETECTED:');
        console.log(response);
      }
    } catch (e) {
      console.log('Raw response:', data);
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err.message);
});

req.write(testData);
req.end();
