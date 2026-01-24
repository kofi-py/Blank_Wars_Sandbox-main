const { Pool } = require('pg');

async function extractSchema(connectionString, outputFile) {
  const pool = new Pool({ connectionString });

  try {
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const schema = {};

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;

      // Get columns for this table
      const columnsResult = await pool.query(`
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          column_default,
          is_nullable,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      // Get constraints
      const constraintsResult = await pool.query(`
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
        ORDER BY tc.constraint_type, kcu.ordinal_position;
      `, [tableName]);

      // Get indexes
      const indexesResult = await pool.query(`
        SELECT
          i.relname AS index_name,
          a.attname AS column_name,
          ix.indisunique AS is_unique,
          ix.indisprimary AS is_primary
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relkind = 'r'
          AND t.relname = $1
          AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY i.relname, a.attnum;
      `, [tableName]);

      schema[tableName] = {
        columns: columnsResult.rows,
        constraints: constraintsResult.rows,
        indexes: indexesResult.rows
      };
    }

    const fs = require('fs');
    fs.writeFileSync(outputFile, JSON.stringify(schema, null, 2));
    console.log(`Schema extracted to ${outputFile}`);
    console.log(`Total tables: ${Object.keys(schema).length}`);

  } finally {
    await pool.end();
  }
}

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node extract_schema.js <connection_string> <output_file>');
  process.exit(1);
}

extractSchema(args[0], args[1])
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
