const fs = require('fs');
const { Pool } = require('pg');

// Read both schemas
const prodSchema = JSON.parse(fs.readFileSync('/tmp/production_schema.json', 'utf8'));
const localSchema = JSON.parse(fs.readFileSync('/tmp/local_schema.json', 'utf8'));

// Merge schemas - take from production first, then add local-only tables
const mergedSchema = { ...prodSchema };
Object.keys(localSchema).forEach(tableName => {
  if (!mergedSchema[tableName]) {
    mergedSchema[tableName] = localSchema[tableName];
  } else {
    // Table exists in both - merge columns
    const prodCols = mergedSchema[tableName].columns.map(c => c.column_name);
    localSchema[tableName].columns.forEach(col => {
      if (!prodCols.includes(col.column_name)) {
        mergedSchema[tableName].columns.push(col);
      }
    });
  }
});

async function generateFullSchema(connectionString) {
  const pool = new Pool({ connectionString });

  try {
    const result = await pool.query(`
      SELECT
        'CREATE TABLE ' || table_name || ' (' ||
        array_to_string(
          array_agg(
            column_name || ' ' ||
            CASE
              WHEN data_type = 'USER-DEFINED' THEN udt_name
              WHEN data_type = 'character varying' THEN
                'VARCHAR' || COALESCE('(' || character_maximum_length || ')', '')
              ELSE UPPER(data_type)
            END ||
            CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END
          ),
          ', '
        ) || ');' as create_statement
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name NOT IN ('migration_log', 'migration_meta')
      GROUP BY table_name
      ORDER BY table_name;
    `);

    // Get constraints
    const constraints = await pool.query(`
      SELECT
        tc.table_name,
        'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || ' ' ||
        CASE tc.constraint_type
          WHEN 'PRIMARY KEY' THEN 'PRIMARY KEY (' || string_agg(DISTINCT kcu.column_name, ', ' ORDER BY kcu.column_name) || ')'
          WHEN 'UNIQUE' THEN 'UNIQUE (' || string_agg(DISTINCT kcu.column_name, ', ' ORDER BY kcu.column_name) || ')'
          WHEN 'FOREIGN KEY' THEN
            'FOREIGN KEY (' || string_agg(DISTINCT kcu.column_name, ', ' ORDER BY kcu.column_name) || ') ' ||
            'REFERENCES ' || ccu.table_name || ' (' || ccu.column_name || ')' ||
            CASE
              WHEN rc.delete_rule IS NOT NULL THEN ' ON DELETE ' || rc.delete_rule
              ELSE ''
            END
        END || ';' as constraint_statement
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      LEFT JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name NOT IN ('migration_log', 'migration_meta')
      GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type, ccu.table_name, ccu.column_name, rc.delete_rule
      ORDER BY tc.table_name, tc.constraint_type;
    `);

    // Get indexes
    const indexes = await pool.query(`
      SELECT
        'CREATE ' ||
        CASE WHEN ix.indisunique THEN 'UNIQUE ' ELSE '' END ||
        'INDEX ' || i.relname || ' ON ' || t.relname ||
        ' (' || string_agg(a.attname, ', ' ORDER BY a.attnum) || ');' as index_statement
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relkind = 'r'
        AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND t.relname NOT IN ('migration_log', 'migration_meta')
        AND NOT ix.indisprimary
        AND i.relname NOT LIKE '%_pkey'
      GROUP BY t.relname, i.relname, ix.indisunique
      ORDER BY t.relname, i.relname;
    `);

    return {
      tables: result.rows,
      constraints: constraints.rows,
      indexes: indexes.rows
    };

  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('Generating baseline migration from production database...\n');

  const prodUrl = "postgresql://postgres:GhHFpHejdRUKEfKabfDcvuDgUtlmYwOu@gondola.proxy.rlwy.net:52976/railway";
  const localUrl = "postgresql://localhost:5432/blankwars";

  const prodData = await generateFullSchema(prodUrl);
  const localData = await generateFullSchema(localUrl);

  // Get local-only tables
  const prodTableNames = prodData.tables.map(t => {
    const match = t.create_statement.match(/CREATE TABLE (\w+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

  const localOnlyTables = localData.tables.filter(t => {
    const match = t.create_statement.match(/CREATE TABLE (\w+)/);
    const tableName = match ? match[1] : null;
    return tableName && !prodTableNames.includes(tableName);
  });

  console.log(`Production tables: ${prodData.tables.length}`);
  console.log(`Local-only tables: ${localOnlyTables.length}`);
  console.log('Building comprehensive baseline migration...\n');

  // Build the migration file
  let migration = `-- =====================================================
-- Blank Wars - Baseline Migration
-- Generated: ${new Date().toISOString()}
--
-- This migration creates a complete database schema that
-- includes all tables from both production and local
-- development environments.
-- =====================================================

-- Create migration tracking tables
CREATE TABLE IF NOT EXISTS migration_log (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS migration_meta (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLES
-- =====================================================

`;

  // Add all production tables
  prodData.tables.forEach(t => {
    migration += t.create_statement + '\n\n';
  });

  // Add local-only tables
  if (localOnlyTables.length > 0) {
    migration += `-- =====================================================
-- LOCAL-ONLY TABLES (not yet in production)
-- =====================================================

`;
    localOnlyTables.forEach(t => {
      migration += t.create_statement + '\n\n';
    });
  }

  // Add constraints
  migration += `-- =====================================================
-- CONSTRAINTS
-- =====================================================

`;
  prodData.constraints.forEach(c => {
    migration += c.constraint_statement + '\n';
  });

  // Add indexes
  migration += `\n-- =====================================================
-- INDEXES
-- =====================================================

`;
  prodData.indexes.forEach(i => {
    migration += i.index_statement + '\n';
  });

  // Add local-only indexes if any
  const localOnlyIndexes = localData.indexes.filter(i => {
    const match = i.index_statement.match(/ON (\w+)/);
    const tableName = match ? match[1] : null;
    return tableName && !prodTableNames.includes(tableName);
  });

  if (localOnlyIndexes.length > 0) {
    migration += `\n-- Local-only table indexes\n`;
    localOnlyIndexes.forEach(i => {
      migration += i.index_statement + '\n';
    });
  }

  migration += `\n-- =====================================================
-- MARK MIGRATION AS COMPLETE
-- =====================================================

INSERT INTO migration_log (version, name) VALUES (1, '001_baseline_schema');
INSERT INTO migration_meta (key, value) VALUES ('last_migration', '1');

-- =====================================================
-- END OF BASELINE MIGRATION
-- =====================================================
`;

  fs.writeFileSync('/tmp/001_baseline_schema.sql', migration);
  console.log('✅ Baseline migration created: /tmp/001_baseline_schema.sql');
  console.log(`   Total size: ${(migration.length / 1024).toFixed(2)} KB`);
}

main().catch(console.error);
