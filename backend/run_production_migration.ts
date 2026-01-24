import { createMigrationBackup } from './backup_before_migration';
import { productionVegaMigration } from './production_vega_migration';

async function runProductionMigration() {
  console.log('🚀 STARTING PRODUCTION VEGA TO SPACE_CYBORG MIGRATION');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Create backup
    console.log('\n🔷 PHASE 1: Creating backup...');
    const backupFile = await createMigrationBackup();
    console.log(`✅ Backup completed: ${backupFile}`);
    
    // Step 2: Run migration
    console.log('\n🔷 PHASE 2: Running migration...');
    await productionVegaMigration();
    console.log('✅ Migration completed successfully!');
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 PRODUCTION MIGRATION COMPLETED SUCCESSFULLY!');
    console.log(`📄 Backup file: ${backupFile}`);
    console.log('🔄 Card packs should now return "space_cyborg" instead of "vega"');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n' + '=' .repeat(60));
    console.error('❌ PRODUCTION MIGRATION FAILED!');
    console.error('Error:', error.message);
    console.error('=' .repeat(60));
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runProductionMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}