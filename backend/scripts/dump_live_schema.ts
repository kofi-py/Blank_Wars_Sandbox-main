/**
 * Dump Live Database Schema
 *
 * Connects to the live database and generates a readable schema file
 * showing all tables, columns, types, constraints, indexes, and foreign keys.
 *
 * Usage: npx ts-node scripts/dump_live_schema.ts
 * Output: backend/LIVE_SCHEMA.md
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface TableInfo {
  table_name: string;
  columns: ColumnInfo[];
  primary_key: string[];
  foreign_keys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  is_generated: string;
  generation_expression: string | null;
}

interface ForeignKeyInfo {
  constraint_name: string;
  column_name: string;
  foreign_table: string;
  foreign_column: string;
  on_delete: string;
  on_update: string;
}

interface IndexInfo {
  index_name: string;
  column_names: string;
  is_unique: boolean;
  index_type: string;
}

interface ConstraintInfo {
  constraint_name: string;
  constraint_type: string;
  definition: string;
}

async function getTables(): Promise<string[]> {
  const result = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  return result.rows.map(r => r.table_name);
}

async function getColumns(tableName: string): Promise<ColumnInfo[]> {
  const result = await db.query(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      is_generated,
      generation_expression
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `, [tableName]);
  return result.rows;
}

async function getPrimaryKey(tableName: string): Promise<string[]> {
  const result = await db.query(`
    SELECT a.attname as column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE i.indisprimary
      AND n.nspname = 'public'
      AND c.relname = $1;
  `, [tableName]);
  return result.rows.map(r => r.column_name);
}

async function getForeignKeys(tableName: string): Promise<ForeignKeyInfo[]> {
  const result = await db.query(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column,
      rc.delete_rule as on_delete,
      rc.update_rule as on_update
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = $1;
  `, [tableName]);
  return result.rows;
}

async function getIndexes(tableName: string): Promise<IndexInfo[]> {
  const result = await db.query(`
    SELECT
      i.relname as index_name,
      array_to_string(array_agg(a.attname ORDER BY k.n), ', ') as column_names,
      ix.indisunique as is_unique,
      am.amname as index_type
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_am am ON am.oid = i.relam
    JOIN pg_namespace n ON n.oid = t.relnamespace
    CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
    WHERE t.relkind = 'r'
      AND n.nspname = 'public'
      AND t.relname = $1
      AND NOT ix.indisprimary
    GROUP BY i.relname, ix.indisunique, am.amname
    ORDER BY i.relname;
  `, [tableName]);
  return result.rows;
}

async function getCheckConstraints(tableName: string): Promise<ConstraintInfo[]> {
  const result = await db.query(`
    SELECT
      con.conname as constraint_name,
      'CHECK' as constraint_type,
      pg_get_constraintdef(con.oid) as definition
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE con.contype = 'c'
      AND nsp.nspname = 'public'
      AND rel.relname = $1;
  `, [tableName]);
  return result.rows;
}

async function getTableInfo(tableName: string): Promise<TableInfo> {
  const [columns, primary_key, foreign_keys, indexes, constraints] = await Promise.all([
    getColumns(tableName),
    getPrimaryKey(tableName),
    getForeignKeys(tableName),
    getIndexes(tableName),
    getCheckConstraints(tableName)
  ]);

  return {
    table_name: tableName,
    columns,
    primary_key,
    foreign_keys,
    indexes,
    constraints
  };
}

function formatType(col: ColumnInfo): string {
  let type = col.data_type.toUpperCase();
  if (col.character_maximum_length) {
    type += `(${col.character_maximum_length})`;
  }
  return type;
}

function generateMarkdown(tables: TableInfo[], generatedAt: string): string {
  let md = `# Live Database Schema\n\n`;
  md += `> Generated: ${generatedAt}\n`;
  md += `> Tables: ${tables.length}\n\n`;
  md += `---\n\n`;
  md += `## Table of Contents\n\n`;

  for (const table of tables) {
    md += `- [${table.table_name}](#${table.table_name.replace(/_/g, '-')})\n`;
  }

  md += `\n---\n\n`;

  for (const table of tables) {
    md += `## ${table.table_name}\n\n`;

    // Columns table
    md += `### Columns\n\n`;
    md += `| Column | Type | Nullable | Default | Generated |\n`;
    md += `|--------|------|----------|---------|----------|\n`;

    for (const col of table.columns) {
      const pk = table.primary_key.includes(col.column_name) ? ' **PK**' : '';
      const nullable = col.is_nullable === 'YES' ? 'YES' : 'NO';
      const defaultVal = col.column_default ? `\`${col.column_default.substring(0, 50)}${col.column_default.length > 50 ? '...' : ''}\`` : '-';
      const generated = col.is_generated === 'ALWAYS' ? `YES: \`${col.generation_expression?.substring(0, 30) || ''}...\`` : '-';

      md += `| ${col.column_name}${pk} | ${formatType(col)} | ${nullable} | ${defaultVal} | ${generated} |\n`;
    }
    md += `\n`;

    // Primary Key
    if (table.primary_key.length > 0) {
      md += `**Primary Key:** ${table.primary_key.join(', ')}\n\n`;
    }

    // Foreign Keys
    if (table.foreign_keys.length > 0) {
      md += `### Foreign Keys\n\n`;
      md += `| Column | References | On Delete | On Update |\n`;
      md += `|--------|------------|-----------|----------|\n`;
      for (const fk of table.foreign_keys) {
        md += `| ${fk.column_name} | ${fk.foreign_table}(${fk.foreign_column}) | ${fk.on_delete} | ${fk.on_update} |\n`;
      }
      md += `\n`;
    }

    // Indexes
    if (table.indexes.length > 0) {
      md += `### Indexes\n\n`;
      md += `| Name | Columns | Unique | Type |\n`;
      md += `|------|---------|--------|------|\n`;
      for (const idx of table.indexes) {
        md += `| ${idx.index_name} | ${idx.column_names} | ${idx.is_unique ? 'YES' : 'NO'} | ${idx.index_type} |\n`;
      }
      md += `\n`;
    }

    // Check Constraints
    if (table.constraints.length > 0) {
      md += `### Constraints\n\n`;
      for (const con of table.constraints) {
        md += `- **${con.constraint_name}**: \`${con.definition}\`\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }

  return md;
}

async function main() {
  console.log('🔍 Connecting to database...');

  try {
    // Test connection
    await db.query('SELECT 1');
    console.log('✅ Connected to database');

    // Get all tables
    console.log('📋 Fetching tables...');
    const tableNames = await getTables();
    console.log(`   Found ${tableNames.length} tables`);

    // Get info for each table
    console.log('📊 Fetching schema details...');
    const tables: TableInfo[] = [];
    for (const tableName of tableNames) {
      process.stdout.write(`   Processing ${tableName}...`);
      const info = await getTableInfo(tableName);
      tables.push(info);
      console.log(` ✓ (${info.columns.length} cols, ${info.indexes.length} idx, ${info.foreign_keys.length} fk)`);
    }

    // Generate markdown
    const generatedAt = new Date().toISOString();
    const markdown = generateMarkdown(tables, generatedAt);

    // Write to file
    const outputPath = path.join(__dirname, '..', 'LIVE_SCHEMA.md');
    fs.writeFileSync(outputPath, markdown);
    console.log(`\n✅ Schema written to: ${outputPath}`);
    console.log(`   ${tables.length} tables documented`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();
