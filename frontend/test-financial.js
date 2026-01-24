// Test financial data retrieval to verify the fix
import ConflictDatabaseService from './src/services/ConflictDatabaseService.ts';

async function testFinancialData() {
  try {
    console.log('🧪 Testing financial data retrieval...');
    
    const service = ConflictDatabaseService.getInstance();
    
    console.log('1. Testing buildTherapyContext...');
    const context = await service.buildTherapyContext('userchar_1756684356714_bjbiv0ycn');
    console.log('✅ buildTherapyContext succeeded');
    
    console.log('2. Testing getTherapyFinancialSummary...');
    const result = service.getTherapyFinancialSummary('userchar_1756684356714_bjbiv0ycn');
    console.log('✅ getTherapyFinancialSummary succeeded:', result);
    
    console.log('🎉 All financial data tests passed!');
    
  } catch (error) {
    console.error('❌ Error during financial data test:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testFinancialData();