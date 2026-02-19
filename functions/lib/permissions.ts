/**
 * Server-side permission checks.
 *
 * Enforces role-based access at the API proxy level.
 * This supplements (not replaces) the UI-level permission system.
 */

import type { UserSession } from './auth';

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

const ADMIN_ROLES = ['Admin', 'Ops', 'ops', 'admin'];
const EDITOR_ROLES = ['Video Editor', 'video editor'];

// =============================================================================
// TABLE ACCESS RULES
// =============================================================================

/**
 * Tables that are restricted to admin/ops roles only.
 * Editors cannot read or write these tables.
 */
const ADMIN_ONLY_TABLES = new Set([
  'Users',
  // Infrastructure table IDs
  'tble3Qky3A2j8LpSj', // Profiles (contains FB passwords, tokens, 2FA)
  'tbl1xnWkoju7WG8lb',  // Business Managers
  'tbltReEL235grY3Im',  // Ad Accounts
  'tblUwiY8UQVi3yXBU',  // Pages
  'tblsMDmQedp4B3pB8',  // Pixels
]);

/**
 * Tables that editors can read but not write.
 */
const EDITOR_READ_ONLY_TABLES = new Set([
  'Products',
  'Video Scripts',
  'Ad Presets',
  'Campaigns',
  'Advertorials',
  'Images',
]);

// =============================================================================
// SENSITIVE FIELDS
// =============================================================================

/**
 * Fields that should be stripped from API responses for non-admin users.
 * These contain credentials, tokens, and other sensitive data.
 */
const SENSITIVE_FIELDS = new Set([
  'Password',
  'Permanent Token',
  'Profile FB Password',
  'Profile Email Password',
  'Profile 2FA',
  'Security Email Password',
  'System User Token',
  'System User ID',
  'Session Cookie',
]);

// =============================================================================
// PERMISSION CHECKS
// =============================================================================

export function isAdmin(user: UserSession): boolean {
  return ADMIN_ROLES.includes(user.role);
}

export function isEditor(user: UserSession): boolean {
  return EDITOR_ROLES.includes(user.role);
}

/**
 * Check if a user can access a given Airtable table.
 */
export function canAccessTable(
  user: UserSession,
  tableName: string,
  method: string
): { allowed: boolean; reason?: string } {
  // Admins can do anything
  if (isAdmin(user)) {
    return { allowed: true };
  }

  // Admin-only tables
  if (ADMIN_ONLY_TABLES.has(tableName)) {
    return { allowed: false, reason: `Table "${tableName}" requires admin access` };
  }

  // Editor read-only tables
  if (isEditor(user) && EDITOR_READ_ONLY_TABLES.has(tableName) && method !== 'GET') {
    return { allowed: false, reason: `Editors cannot modify "${tableName}"` };
  }

  // Videos table: editors can only modify their own records
  // (Further record-level checks happen in the proxy)
  return { allowed: true };
}

/**
 * Strip sensitive fields from Airtable response records.
 * Only strips for non-admin users.
 */
export function stripSensitiveFields(
  records: Array<{ id: string; fields: Record<string, unknown> }>,
  user: UserSession
): Array<{ id: string; fields: Record<string, unknown> }> {
  if (isAdmin(user)) return records;

  return records.map((record) => {
    const cleanFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record.fields)) {
      if (!SENSITIVE_FIELDS.has(key)) {
        cleanFields[key] = value;
      }
    }
    return { ...record, fields: cleanFields };
  });
}
