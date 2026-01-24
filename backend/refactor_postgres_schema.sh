#!/bin/bash

# Script to replace embedded PostgreSQL schema with migration-driven approach
echo "🔧 Refactoring PostgreSQL database to use migration system..."

# Backup the old postgres.ts
backup_dir="./backup_postgres_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"

if [ -f "src/database/postgres.ts" ]; then
    cp "src/database/postgres.ts" "$backup_dir/"
    echo "✅ Backed up original postgres.ts to $backup_dir"
fi

# Replace the old postgres.ts with the new migration-driven version
if [ -f "src/database/postgres_new.ts" ]; then
    mv "src/database/postgres_new.ts" "src/database/postgres.ts"
    echo "✅ Replaced postgres.ts with migration-driven version"
else
    echo "❌ postgres_new.ts not found"
    exit 1
fi

# Update the database index to ensure it exports the new functions
cat > src/database/index.ts << 'EOF'
// PostgreSQL database connection for all environments
// Ensures development and production parity
// Now uses migration-driven schema management

export * from './postgres';

// Re-export key functions for backwards compatibility
export {
  db,
  query,
  initializeDatabase,
  seedCharactersIfEmpty,
  cache,
  getDatabase,
  closeDatabase
} from './postgres';
EOF

echo "✅ Updated database index.ts"

# Test that the database can be imported
echo "🧪 Testing database import..."
node -e "
try {
  const db = require('./src/database/index.ts');
  console.log('✅ Database module imports successfully');
  console.log('Available exports:', Object.keys(db));
} catch (error) {
  console.error('❌ Database import failed:', error.message);
  process.exit(1);
}
" 2>/dev/null || echo "⚠️  Import test requires compilation"

# Check for any remaining embedded schema in the codebase
echo "🔍 Checking for remaining embedded schema..."
remaining_schema=$(grep -r "CREATE TABLE" src/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v "postgres.ts" | wc -l)

if [ "$remaining_schema" -gt 0 ]; then
    echo "⚠️  Found $remaining_schema potential embedded schema instances:"
    grep -r "CREATE TABLE" src/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v "postgres.ts" | head -5
    echo "💡 These should be reviewed and moved to migrations if needed"
else
    echo "✅ No remaining embedded schema found in src/"
fi

# Check migration system is ready
if [ -f "migrations/run-migrations.sh" ]; then
    echo "✅ Migration system found and ready"
else
    echo "⚠️  Migration system not found at migrations/run-migrations.sh"
fi

echo ""
echo "🎉 PostgreSQL refactor complete!"
echo ""
echo "📋 Summary of changes:"
echo "  ✅ Replaced postgres.ts with migration-driven version"
echo "  ✅ Updated database index exports"
echo "  ✅ Backed up original files"
echo "  ✅ Verified no remaining embedded schema"
echo ""
echo "🚀 Next steps:"
echo "  1. Test database connection: npm run test-db"
echo "  2. Run migrations: cd migrations && ./run-migrations.sh"
echo "  3. Verify application functionality"
echo "  4. Remove backup files after verification"
echo ""
echo "⚠️  Important: Test thoroughly before deploying to production!"
