/**
 * Admin Service
 * Handles admin authorization and utilities
 * NO ENV VARIABLES - everything hardcoded
 */

// List of admin emails - hardcoded for security
const ADMIN_EMAILS = [
  'greensteing2@southernct.edu',
  'bb85001@gmail.com',
  'steven.greenstein003@gmail.com',
  'greensteins1@southernct.edu',
  'green003@icloud.com',
  'mikejohanning@gmail.com',
  'joedon.tyler@gmail.com',
  'trbertolino0@gmail.com',
  'gabegreenstein@gmail.com'
];

// Admin secret key - hardcoded (change this value to update password)
const ADMIN_SECRET_KEY = 'blankwars_admin_2025';

/**
 * Check if a user email is an admin
 */
export function isAdmin(user_email: string): boolean {
  return ADMIN_EMAILS.includes(user_email.toLowerCase());
}

/**
 * Validate admin secret key from request
 */
export function validateAdminSecret(provided_secret: string): boolean {
  return provided_secret === ADMIN_SECRET_KEY;
}

/**
 * Get the admin secret key (for frontend password check)
 */
export function getAdminSecret(): string {
  return ADMIN_SECRET_KEY;
}

export const admin_service = {
  isAdmin,
  validateAdminSecret,
  getAdminSecret,
  ADMIN_SECRET_KEY
};
