// PostgreSQL database connection for all environments
// Ensures development and production parity
// Now uses migration-driven schema management

export * from './postgres';

// Re-export key functions for backwards compatibility
export { 
  db, 
  query, 
  initialize_database, 
  seed_characters_if_empty, 
  cache,
  getDatabase,
  closeDatabase 
} from './postgres';
