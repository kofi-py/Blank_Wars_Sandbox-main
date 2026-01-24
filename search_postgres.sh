#!/bin/bash

# Database connection URL
DB_URL="postgresql://blankwars:devpass123@localhost:5432/blankwars_dev"

# Search term
SEARCH_TERM="baker"

# Get a list of all tables in the public schema
TABLES=$(psql "$DB_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")

# Loop through each table
for TBL in $TABLES; do
  # Get a list of all columns for the current table
  COLUMNS=$(psql "$DB_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = '$TBL' AND table_schema = 'public'")

  # Loop through each column
  for COL in $COLUMNS; do
    # Check if the column type is searchable (text-like)
    IS_TEXT=$(psql "$DB_URL" -t -c "SELECT 1 FROM information_schema.columns WHERE table_name = '$TBL' AND column_name = '$COL' AND data_type IN ('character varying', 'varchar', 'text', 'char')")

    if [[ $IS_TEXT -eq 1 ]]; then
      # Search for the term in the current column
      psql "$DB_URL" -c "SELECT * FROM \"$TBL\" WHERE \"$COL\" ILIKE '%$SEARCH_TERM%'"
    fi
  
  done
done
