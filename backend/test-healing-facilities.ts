import dotenv from 'dotenv';
import { initializeHealingFacilities } from './src/services/healingFacilitiesData';

// Load environment variables
dotenv.config();

async function testHealingFacilitiesInit() {
  try {
    console.log('🏥 Testing healing facilities initialization...');

    await initializeHealingFacilities();

    console.log('✅ Healing facilities initialization completed successfully!');

  } catch (error) {
    console.error('❌ Healing facilities initialization failed:', error.message);
    console.error('📋 Full error:', error);
    process.exit(1);
  }
}

testHealingFacilitiesInit();
