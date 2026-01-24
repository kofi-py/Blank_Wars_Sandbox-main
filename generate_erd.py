#!/usr/bin/env python3
"""
Generate ERD for Blank Wars database
Extracts schema and creates DOT file for Graphviz rendering
"""

import psycopg2
import sys

# Database connection
DB_URL = "postgresql://localhost:5432/blankwars"

def get_schema():
    """Extract complete schema from PostgreSQL"""
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # Get all tables
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)
    tables = [row[0] for row in cur.fetchall()]

    schema = {}

    for table in tables:
        # Get columns
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
        """, (table,))
        columns = cur.fetchall()

        # Get primary keys
        cur.execute("""
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public'
                AND tc.table_name = %s
                AND tc.constraint_type = 'PRIMARY KEY'
        """, (table,))
        pks = [row[0] for row in cur.fetchall()]

        # Get foreign keys
        cur.execute("""
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table,
                ccu.column_name AS foreign_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_schema = 'public'
                AND tc.table_name = %s
                AND tc.constraint_type = 'FOREIGN KEY'
        """, (table,))
        fks = cur.fetchall()

        schema[table] = {
            'columns': columns,
            'pks': pks,
            'fks': fks
        }

    cur.close()
    conn.close()

    return schema

def generate_dot(schema, output_file='erd.dot'):
    """Generate DOT file from schema"""

    with open(output_file, 'w') as f:
        f.write('digraph BlankWarsERD {\n')
        f.write('  rankdir=LR;\n')
        f.write('  node [shape=plaintext];\n')
        f.write('  edge [color="#666666"];\n\n')

        # Define tables
        for table, data in schema.items():
            f.write(f'  {table} [label=<\n')
            f.write('    <TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" BGCOLOR="white">\n')
            f.write(f'      <TR><TD BGCOLOR="#4A90E2" ALIGN="CENTER"><FONT COLOR="white"><B>{table}</B></FONT></TD></TR>\n')

            for col, dtype, nullable, default in data['columns'][:15]:  # Limit columns for readability
                pk_marker = ' 🔑' if col in data['pks'] else ''
                f.write(f'      <TR><TD ALIGN="LEFT" PORT="{col}">{col}{pk_marker} : {dtype}</TD></TR>\n')

            if len(data['columns']) > 15:
                f.write('      <TR><TD ALIGN="LEFT">...</TD></TR>\n')

            f.write('    </TABLE>\n')
            f.write('  >];\n\n')

        # Define relationships
        f.write('  // Foreign Key Relationships\n')
        for table, data in schema.items():
            for col, ftable, fcol in data['fks']:
                f.write(f'  {table}:{col} -> {ftable}:{fcol} [label="FK"];\n')

        f.write('}\n')

    print(f"✓ Generated {output_file}")

def main():
    print("Extracting schema from blankwars database...")
    schema = get_schema()
    print(f"✓ Found {len(schema)} tables")

    print("\nGenerating DOT file...")
    generate_dot(schema, 'blankwars_erd.dot')

    print("\nTo generate PNG, run:")
    print("  dot -Tpng blankwars_erd.dot -o blankwars_erd.png")
    print("\nOr SVG:")
    print("  dot -Tsvg blankwars_erd.dot -o blankwars_erd.svg")

if __name__ == '__main__':
    main()
