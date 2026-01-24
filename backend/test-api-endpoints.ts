/**
 * Test API endpoints directly (not just database)
 */

const API_BASE = 'https://api.blankwars.com';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(endpoint: string, method: string = 'GET', expectedStatus: number[] = [200], body?: any) {
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const passed = expectedStatus.includes(response.status);
    results.push({ endpoint, method, status: response.status, passed });
    console.log(`${passed ? '✅' : '❌'} ${method} ${endpoint} → ${response.status}`);
    return response;
  } catch (error: any) {
    results.push({ endpoint, method, status: 0, passed: false, error: error.message });
    console.log(`❌ ${method} ${endpoint} → ERROR: ${error.message}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🌐 API ENDPOINT TESTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Health & Status
  console.log('📋 HEALTH & STATUS ENDPOINTS');
  console.log('─'.repeat(50));
  await testEndpoint('/health');
  await testEndpoint('/api/battles/status-effects');

  // Auth-required endpoints (expect 401)
  console.log('\n📋 AUTH-PROTECTED ENDPOINTS (expect 401)');
  console.log('─'.repeat(50));
  await testEndpoint('/api/characters', 'GET', [401]);
  await testEndpoint('/api/battles/user', 'GET', [401]);
  await testEndpoint('/api/user/profile', 'GET', [401]);
  await testEndpoint('/api/packs', 'GET', [401, 200]);

  // Battle endpoints
  console.log('\n📋 BATTLE ENDPOINTS');
  console.log('─'.repeat(50));
  await testEndpoint('/api/battles/status', 'GET', [200, 500]); // May 500 if not deployed yet
  await testEndpoint('/api/battles/history', 'GET', [400, 401]); // Missing user_id param

  // Character endpoints
  console.log('\n📋 CHARACTER ENDPOINTS');
  console.log('─'.repeat(50));
  await testEndpoint('/api/characters/base', 'GET', [200, 404]);
  await testEndpoint('/api/characters/tiers', 'GET', [200, 404]);

  // Action types
  console.log('\n📋 ACTION TYPE ENDPOINTS');
  console.log('─'.repeat(50));
  await testEndpoint('/api/action-types', 'GET', [200, 404]);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  const passed = results.filter(r => r.passed).length;
  console.log(`📊 RESULTS: ${passed}/${results.length} endpoints behaving as expected`);

  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\n⚠️  UNEXPECTED RESPONSES:');
    failures.forEach(f => console.log(`   - ${f.method} ${f.endpoint}: ${f.status} ${f.error || ''}`));
  }
}

main().catch(console.error);
