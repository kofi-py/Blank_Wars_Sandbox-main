const http = require('http');

// Test the character API endpoint directly
const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/user/characters',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // Simulate being logged in as test@example.com
    'Cookie': 'auth-token=test-token'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.end();