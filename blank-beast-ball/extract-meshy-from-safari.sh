#!/bin/bash

# Extract cookies from Safari for meshy.ai
echo "Extracting Meshy cookies from Safari..."

# Safari cookies are stored in ~/Library/Cookies/Cookies.binarycookies
# We need to use a Python script to read the binary format

cat > extract_safari_cookies.py << 'EOF'
import os
import sys
import struct
import sqlite3
from datetime import datetime, timedelta

# Safari stores cookies in ~/Library/Cookies/Cookies.binarycookies for older versions
# For newer versions, it's in a SQLite database

cookie_db = os.path.expanduser('~/Library/Cookies/Cookies.binarycookies')

# Check if it's an SQLite database
try:
    conn = sqlite3.connect(cookie_db)
    cursor = conn.cursor()
    cursor.execute("SELECT name, value, host_key FROM moz_cookies WHERE host_key LIKE '%meshy.ai%'")
    for row in cursor.fetchall():
        print(f"{row[0]}={row[1]}; Domain={row[2]}")
    conn.close()
except:
    print("Error: Unable to read Safari cookies")
    print("Try running this from Safari Console instead:")
    print("document.cookie.split(';').forEach(c => console.log(c.trim()))")
    sys.exit(1)
EOF

python3 extract_safari_cookies.py
rm extract_safari_cookies.py
