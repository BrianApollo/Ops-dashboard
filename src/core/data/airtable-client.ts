/**
 * Centralized Airtable Client
 *
 * ALL Airtable API calls route through the server-side proxy at /api/airtable/.
 * The Airtable API key and Base ID are NEVER in the browser — they live
 * as Cloudflare Pages secrets and are injected by the proxy.
 *
 * This replaces the duplicated airtableFetch() + validateConfig() pattern
 * that previously existed in every data.ts file.
 */

import { throttledAirtableFetch } from './airtable-throttle';

// =============================================================================
// AUTH TOKEN
// =============================================================================

let authToken: string | null = null;

/**
 * Set the JWT auth token. Called after login.
 * The token is sent with every proxied request.
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/**
 * Get the current auth token.
 */
export function getAuthToken(): string | null {
  return authToken;
}

// =============================================================================
// AIRTABLE FETCH (via server proxy)
// =============================================================================

/**
 * Centralized Airtable fetch wrapper.
 * Routes through /api/airtable/ server proxy.
 *
 * @param endpoint - Table name or path (e.g., 'Users', 'Products/rec123')
 * @param options - RequestInit options
 * @returns Response from the proxy
 */
export async function airtableFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Attach JWT for authentication
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await throttledAirtableFetch(`/api/airtable/${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Handle auth errors
    if (response.status === 401) {
      // Token expired or invalid — clear it
      authToken = null;
      throw new Error('Session expired. Please log in again.');
    }
    if (response.status === 403) {
      const data = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(data.message || 'Access denied');
    }

    let errorMessage = `Airtable API error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json() as { error?: { type?: string; message?: string } };
      if (errorData.error) {
        const errType = errorData.error.type || 'UNKNOWN_ERROR';
        const errMsg = errorData.error.message || '';
        errorMessage = `Airtable error (${errType}): ${errMsg}`;
      }
    } catch { /* use default */ }
    throw new Error(errorMessage);
  }

  return response;
}
