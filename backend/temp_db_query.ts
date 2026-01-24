import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const db = new Pool({
  connection_string: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { reject_unauthorized: false } : false
});

async function queryEquipment() {
  try {
    console.log('Connecting to database...');
    
    // First check what columns exist in equipment table
    console.log('\n=== EQUIPMENT TABLE STRUCTURE ===');
    const tableInfo = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'equipment'
      ORDER BY ordinal_position
    `);
    
    console.log('Equipment table columns:');
    tableInfo.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Get all equipment to understand the data structure
    console.log('\n=== ALL EQUIPMENT ITEMS ===');
    const allEquipment = await db.query(`
      SELECT * FROM equipment 
      ORDER BY name
      LIMIT 10
    `);
    
    console.log(`Found ${allEquipment.rows.length} equipment items (showing first 10):`);
    allEquipment.rows.forEach(item => {
      console.log(`- ID: ${item.id}`);
      console.log(`  Name: ${item.name}`);
      console.log(`  Description: ${item.description}`);
      console.log(`  Type: ${item.type || item.equipment_type}`);
      console.log('  ---');
    });
    
    // Search for technology/tactical items
    console.log('\n=== SEARCHING FOR TECH/TACTICAL ITEMS ===');
    const techEquipment = await db.query(`
      SELECT * FROM equipment 
      WHERE LOWER(name) LIKE '%phone%' 
         OR LOWER(name) LIKE '%device%'
         OR LOWER(name) LIKE '%tech%'
         OR LOWER(name) LIKE '%tactical%'
         OR LOWER(name) LIKE '%holo%'
         OR LOWER(name) LIKE '%communication%'
         OR LOWER(name) LIKE '%smartphone%'
         OR LOWER(description) LIKE '%phone%'
         OR LOWER(description) LIKE '%device%'
         OR LOWER(description) LIKE '%holographic%'
         OR LOWER(description) LIKE '%tactical%'
         OR LOWER(description) LIKE '%smartphone%'
      ORDER BY name
    `);
    
    console.log(`Found ${techEquipment.rows.length} technology/tactical equipment items:`);
    techEquipment.rows.forEach(item => {
      console.log(`- ${item.name} (${item.id})`);
      console.log(`  Description: ${item.description}`);
      console.log(`  Type: ${item.type || item.equipment_type}`);
      console.log(`  Character restriction: ${item.restriction_value || 'Generic'}`);
      console.log('  ---');
    });
    
  } catch (error) {
    console.error('Database query error:', error);
  } finally {
    await db.end();
  }
}

queryEquipment();