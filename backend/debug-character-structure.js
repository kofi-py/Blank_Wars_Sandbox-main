const http = require('http');

// First get a dev session token, then get characters and analyze structure
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
  let cookies = '';
  if (devRes.headers['set-cookie']) {
    cookies = devRes.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
  }
  
  let devData = '';
  devRes.on('data', (chunk) => {
    devData += chunk;
  });
  
  devRes.on('end', () => {
    if (devRes.statusCode === 200) {
      console.log('Step 2: Getting character structure...');
      
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
        let charData = '';
        charRes.on('data', (chunk) => {
          charData += chunk;
        });
        
        charRes.on('end', () => {
          try {
            const response = JSON.parse(charData);
            if (response.success && response.characters && response.characters.length > 0) {
              const char = response.characters[0]; // Test first character
              
              console.log('=== CHARACTER STRUCTURE ANALYSIS ===');
              console.log('Character ID:', char.id);
              console.log('Character Name:', char.name);
              
              // Check each property that ConflictDB validates
              console.log('\n--- ConflictDB Expected Properties ---');
              
              // Basic properties
              console.log('✓ id:', typeof char.id, char.id ? '✓' : '❌');
              console.log('✓ characterId:', typeof char.characterId, char.characterId ? '✓' : '❌');
              console.log('✓ name:', typeof char.name, char.name ? '✓' : '❌');
              console.log('✓ archetype:', typeof char.archetype, char.archetype ? '✓' : '❌');
              console.log('✓ level:', typeof char.level, char.level ? '✓' : '❌');
              
              // Traditional stats that ConflictDB needs
              console.log('\n--- Traditional Stats ---');
              console.log('traditionalStats object:', !!char.traditionalStats ? '✓' : '❌');
              if (char.traditionalStats) {
                console.log('  stamina (base_health):', typeof char.traditionalStats.stamina, char.traditionalStats.stamina);
                console.log('  strength (base_attack):', typeof char.traditionalStats.strength, char.traditionalStats.strength);
              } else {
                console.log('  ❌ traditionalStats missing entirely');
              }
              
              // Bond level
              console.log('\n--- Bond Level ---');
              console.log('bondLevel:', typeof char.bondLevel, char.bondLevel);
              
              // Personality traits
              console.log('\n--- Personality Traits ---');
              console.log('personalityTraits:', Array.isArray(char.personalityTraits) ? '✓ Array' : '❌', 
                          char.personalityTraits ? char.personalityTraits.length + ' items' : 'missing');
              
              // ConflictDB specific properties that might be missing
              console.log('\n--- ConflictDB Specific Properties ---');
              console.log('speakingStyle:', typeof char.speakingStyle, char.speakingStyle || 'MISSING');
              console.log('decisionMaking:', typeof char.decisionMaking, char.decisionMaking || 'MISSING');
              console.log('conflictResponse:', typeof char.conflictResponse, char.conflictResponse || 'MISSING');
              
              // Financials
              console.log('\n--- Financials ---');
              console.log('financials object:', !!char.financials ? '✓' : '❌');
              if (char.financials) {
                console.log('  wallet:', typeof char.financials.wallet, char.financials.wallet);
                console.log('  debt:', typeof char.financials.debt, char.financials.debt);
                console.log('  monthlyEarnings:', typeof char.financials.monthlyEarnings, char.financials.monthlyEarnings);
                console.log('  financialStress:', typeof char.financials.financialStress, char.financials.financialStress);
                console.log('  coachFinancialTrust:', typeof char.financials.coachFinancialTrust, char.financials.coachFinancialTrust);
                console.log('  recentDecisions:', Array.isArray(char.financials.recentDecisions) ? '✓ Array' : '❌',
                            char.financials.recentDecisions ? char.financials.recentDecisions.length + ' items' : 'missing');
              } else {
                console.log('  ❌ financials missing entirely');
              }
              
              // Test the validation logic manually
              console.log('\n=== VALIDATION TEST ===');
              try {
                // Simulate ConflictDB validation
                if (!/^userchar_/.test(char.id)) {
                  throw new Error('Invalid userchar ID format');
                }
                
                if (typeof char.level !== 'number' || !Number.isFinite(char.level)) {
                  throw new Error('Invalid level');
                }
                
                if (!char.traditionalStats || typeof char.traditionalStats.stamina !== 'number' || !Number.isFinite(char.traditionalStats.stamina)) {
                  throw new Error('Invalid traditionalStats.stamina');
                }
                
                if (typeof char.traditionalStats.strength !== 'number' || !Number.isFinite(char.traditionalStats.strength)) {
                  throw new Error('Invalid traditionalStats.strength');
                }
                
                if (typeof char.bondLevel !== 'number' || !Number.isFinite(char.bondLevel)) {
                  throw new Error('Invalid bondLevel');
                }
                
                if (!Array.isArray(char.personalityTraits)) {
                  throw new Error('Invalid personalityTraits');
                }
                
                if (!char.financials) {
                  throw new Error('Missing financials');
                }
                
                const f = char.financials;
                const mustNum = (v, k) => {
                  if (typeof v !== 'number' || !Number.isFinite(v)) {
                    throw new Error(`invalid financials.${k}`);
                  }
                  return v;
                };
                
                mustNum(f.wallet, 'wallet');
                mustNum(f.debt, 'debt');
                mustNum(f.monthlyEarnings, 'monthlyEarnings');
                mustNum(f.financialStress, 'financialStress');
                mustNum(f.coachFinancialTrust, 'coachFinancialTrust');
                
                if (!Array.isArray(f.recentDecisions)) {
                  throw new Error('Invalid recentDecisions');
                }
                
                console.log('✅ Validation PASSED - character should be accepted by ConflictDB');
                
              } catch (validationError) {
                console.log('❌ Validation FAILED:', validationError.message);
                console.log('This is why ConflictDB is dropping all characters!');
              }
              
            } else {
              console.log('No characters in response');
            }
          } catch (e) {
            console.log('Error parsing response:', e.message);
          }
        });
      });
      
      charReq.on('error', (error) => {
        console.error('Characters API Error:', error);
      });
      
      charReq.end();
    }
  });
});

devReq.on('error', (error) => {
  console.error('Dev session Error:', error);
});

devReq.end();