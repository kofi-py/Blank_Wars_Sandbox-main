#!/usr/bin/env python3
"""
Generate Coach-Perspective ERDs for Blank Wars
Shows the game from the coach's point of view managing AI characters
"""

import psycopg2

DB_URL = "postgresql://localhost:5432/blankwars"

# Define table groups from coach's perspective
DIAGRAM_GROUPS = {
    '1_roster_and_ai': {
        'name': 'Your Roster & Character AI',
        'description': 'Who you\'re coaching - AI fighters with personality, finances, psychology',
        'tables': [
            'users', 'characters', 'user_characters',
            'financial_tiers', 'tier_to_rarity',
            'user_character_echoes'
        ],
        'color': '#E74C3C'  # Red
    },
    '2_competitive_events': {
        'name': 'Competitive Events',
        'description': 'Where your AIs compete - Battles & Reality Show Challenges',
        'tables': [
            'battles',
            'challenge_templates', 'active_challenges', 'challenge_participants',
            'challenge_results', 'challenge_leaderboard', 'challenge_alliances'
        ],
        'color': '#3498DB'  # Blue
    },
    '3_team_management': {
        'name': 'Team Management & Drama',
        'description': 'Keeping your AIs functional - Therapy, conflicts, HQ drama',
        'tables': [
            'character_healing_sessions',
            'user_headquarters', 'headquarters_rooms',
            'team_context', 'character_memories', 'chat_messages', 'healing_facilities',
            'chat_sessions'
        ],
        'color': '#9B59B6'  # Purple
    },
    '4_ai_autonomy': {
        'name': 'AI Autonomy & Psychology',
        'description': 'How characters think & decide - They have agency!',
        'tables': [
            'user_characters',  # Shows financial_personality, psychstats
            'financial_decisions',
            'character_memories',
            'memory_entries'
        ],
        'color': '#E67E22'  # Orange
    },
    '5_economy_resources': {
        'name': 'Economy & Resources',
        'description': 'Managing team money & gear - Both you AND your characters have wallets',
        'tables': [
            'user_currency', 'user_characters',  # wallet column
            'equipment', 'user_equipment', 'user_items',
            'card_packs', 'claimable_packs', 'claimable_pack_contents',
            'purchases', 'qr_codes',
            'challenge_rewards', 'distributed_challenge_rewards'
        ],
        'color': '#27AE60'  # Green
    }
}

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

def get_important_columns(table_name, columns):
    """Filter columns to show only the most relevant ones"""

    # Always show these if they exist
    priority_cols = {
        'id', 'user_id', 'character_id', 'name', 'wallet', 'debt',
        'financial_personality', 'current_mental_health', 'bond_level',
        'gameplan_adherence', 'strategy_deviation_risk', 'psychstats',
        'rarity', 'financial_tier', 'status', 'team_trust', 'morale',
        'winner_character_id', 'placement', 'currency_amount'
    }

    # Table-specific important columns
    special_cols = {
        'user_characters': ['wallet', 'financial_personality', 'current_mental_health',
                           'bond_level', 'gameplan_adherence', 'strategy_deviation_risk'],
        'characters': ['role', 'rarity', 'comedy_style', 'comedian_name', 'species'],
        'financial_decisions': ['amount', 'wallet_delta', 'debt_delta'],
        'therapy_sessions': ['patient_id', 'therapist_id', 'intensityStrategy'],
        'battles': ['status', 'winner_user_id', 'current_round'],
        'team_context': ['master_bed_character_id', 'hq_tier', 'current_scene_type']
    }

    important = []
    for col, dtype, nullable, default in columns:
        if col in priority_cols or (table_name in special_cols and col in special_cols[table_name]):
            important.append((col, dtype, nullable, default))

    # If we filtered everything, take first 10
    if not important:
        important = columns[:10]

    return important[:12]  # Max 12 columns per table

def generate_diagram_dot(schema, group_key, group_info, output_file):
    """Generate a single focused DOT file"""

    tables_in_group = set(group_info['tables'])
    color = group_info['color']

    with open(output_file, 'w') as f:
        f.write(f'digraph "{group_info["name"]}" {{\n')
        f.write('  rankdir=TB;\n')
        f.write('  node [shape=plaintext];\n')
        f.write('  edge [color="#666666", penwidth=1.5];\n')
        f.write('  bgcolor="transparent";\n\n')

        # Add title
        f.write(f'  labelloc="t";\n')
        f.write(f'  label="{group_info["name"]}\\n{group_info["description"]}";\n')
        f.write(f'  fontsize=16;\n')
        f.write(f'  fontname="Arial Bold";\n\n')

        # Define tables that exist in this group
        for table in tables_in_group:
            if table not in schema:
                continue

            data = schema[table]
            important_cols = get_important_columns(table, data['columns'])

            f.write(f'  {table} [label=<\n')
            f.write('    <TABLE BORDER="2" CELLBORDER="0" CELLSPACING="0" BGCOLOR="white">\n')
            f.write(f'      <TR><TD BGCOLOR="{color}" ALIGN="CENTER"><FONT COLOR="white" POINT-SIZE="14"><B>{table}</B></FONT></TD></TR>\n')

            for col, dtype, nullable, default in important_cols:
                pk_marker = ' 🔑' if col in data['pks'] else ''
                # Highlight important AI columns
                if col in ['wallet', 'financial_personality', 'current_mental_health',
                          'gameplan_adherence', 'strategy_deviation_risk', 'psychstats',
                          'master_bed_character_id']:
                    f.write(f'      <TR><TD ALIGN="LEFT" PORT="{col}"><B>{col}{pk_marker}</B> : {dtype}</TD></TR>\n')
                else:
                    f.write(f'      <TR><TD ALIGN="LEFT" PORT="{col}">{col}{pk_marker} : {dtype}</TD></TR>\n')

            if len(data['columns']) > len(important_cols):
                remaining = len(data['columns']) - len(important_cols)
                f.write(f'      <TR><TD ALIGN="CENTER" BGCOLOR="#F0F0F0"><I>+ {remaining} more columns</I></TD></TR>\n')

            f.write('    </TABLE>\n')
            f.write('  >];\n\n')

        # Define relationships (only between tables in this group)
        f.write('  // Relationships\n')
        for table in tables_in_group:
            if table not in schema:
                continue
            for col, ftable, fcol in schema[table]['fks']:
                if ftable in tables_in_group:
                    f.write(f'  {table}:{col} -> {ftable}:{fcol};\n')

        f.write('}\n')

def main():
    print("🎮 Generating Coach-Perspective ERDs for Blank Wars\n")
    print("Extracting schema from database...")
    schema = get_schema()
    print(f"✓ Found {len(schema)} tables\n")

    generated = []

    for group_key, group_info in DIAGRAM_GROUPS.items():
        filename = f"coach_erd_{group_key}.dot"
        print(f"📊 {group_info['name']}")
        print(f"   {group_info['description']}")

        # Count how many tables actually exist
        existing_tables = [t for t in group_info['tables'] if t in schema]
        print(f"   Tables: {len(existing_tables)}")

        generate_diagram_dot(schema, group_key, group_info, filename)
        generated.append(filename)
        print(f"   ✓ Generated {filename}\n")

    print("\n🎨 To render all diagrams, run:")
    print("=" * 60)
    for dotfile in generated:
        pngfile = dotfile.replace('.dot', '.png')
        svgfile = dotfile.replace('.dot', '.svg')
        print(f"dot -Tpng {dotfile} -o {pngfile}")
        print(f"dot -Tsvg {dotfile} -o {svgfile}")

    print("\n💡 Or run all at once:")
    print("for f in coach_erd_*.dot; do dot -Tpng \"$f\" -o \"${f%.dot}.png\"; dot -Tsvg \"$f\" -o \"${f%.dot}.svg\"; done")

if __name__ == '__main__':
    main()
