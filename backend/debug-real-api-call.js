const http = require('http');

// First get a dev session token
console.log('Step 1: Getting dev session token...');

const devSessionOptions = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/auth/dev-session',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const devReq = http.request(devSessionOptions, (devRes) => {
  console.log(`Dev session status: ${devRes.statusCode}`);
  
  let cookies = '';
  if (devRes.headers['set-cookie']) {
    cookies = devRes.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
    console.log('Got cookies:', cookies);
  }
  
  let devData = '';
  devRes.on('data', (chunk) => {
    devData += chunk;
  });
  
  devRes.on('end', () => {
    console.log('Dev session response:', devData);
    
    if (devRes.statusCode === 200) {
      console.log('\nStep 2: Testing character API with dev token...');
      
      // Now test the character API with the cookie
      const charOptions = {
        hostname: 'localhost',
        port: 4000,
        path: '/api/user/characters',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        }
      };
      
      const charReq = http.request(charOptions, (charRes) => {
        console.log(`Characters API status: ${charRes.statusCode}`);
        console.log('Response headers:', charRes.headers);
        
        let charData = '';
        charRes.on('data', (chunk) => {
          charData += chunk;
        });
        
        charRes.on('end', () => {
          console.log('Characters API response:');
          try {
            const parsed = JSON.parse(charData);
            console.log(JSON.stringify(parsed, null, 2));
          } catch (e) {
            console.log('Raw response:', charData);
          }
        });
      });
      
      charReq.on('error', (error) => {
        console.error('Characters API Error:', error);
      });
      
      charReq.end();
    } else {
      console.log('Dev session failed, cannot test character API');
    }
  });
});

devReq.on('error', (error) => {
  console.error('Dev session Error:', error);
});

devReq.end();