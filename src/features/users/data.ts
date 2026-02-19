/**
 * Data abstraction layer for Users.
 *
 * Authentication is now handled server-side at /api/auth/login.
 * The Airtable API key and password verification never reach the browser.
 */

import type { User } from './types.ts';

// =============================================================================
// AUTH OPERATIONS (via server-side proxy)
// =============================================================================

/**
 * Verify credentials via the server-side login endpoint.
 * The Airtable API key and password comparison happen server-side.
 * Returns user + JWT token on success.
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { user: User; token: string };
    return data;
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return null;
  }
}

/**
 * Restore session from JWT token via the server-side /api/auth/me endpoint.
 */
export async function restoreSession(token: string): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return null;

    const data = await response.json() as { user: User };
    return data.user;
  } catch {
    return null;
  }
}
