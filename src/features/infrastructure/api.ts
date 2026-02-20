/**
 * Facebook Infrastructure API
 *
 * Port of facebook.js — typed Graph API calls for infrastructure management.
 * Handles token validation, exchange, sync, and system user operations.
 *
 * All calls that need the App Secret are routed through /api/facebook/proxy.
 * The FB_APP_SECRET never reaches the browser.
 */

import { getAuthToken } from '../../core/data/airtable-client';

const FB_APP_ID = import.meta.env.VITE_FB_APP_ID as string;

// =============================================================================
// PROXY HELPER
// =============================================================================

/**
 * Call the server-side Facebook proxy.
 * The proxy adds appsecret_proof, client_secret, etc. server-side.
 */
async function fbProxyCall<T = Record<string, unknown>>(
  body: Record<string, unknown>
): Promise<T> {
  const token = getAuthToken();
  const response = await fetch('/api/facebook/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
    const message = (data as Record<string, Record<string, string>>)?.error?.message || `Facebook proxy error: ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// INTERNAL GRAPH API CALL (via proxy)
// =============================================================================

async function apiCall<T = Record<string, unknown>>(
  endpoint: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<T> {
  return fbProxyCall<T>({
    action: 'graph_call',
    method: 'GET',
    endpoint,
    accessToken,
    params,
  });
}

// =============================================================================
// HELPERS
// =============================================================================

export function calculateExpiryDate(expiresIn: number): string {
  const expiryDate = new Date();
  expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);
  return expiryDate.toISOString().split('T')[0];
}

// =============================================================================
// TOKEN OPERATIONS
// =============================================================================

interface TokenValidation {
  isValid: boolean;
  expiresAt: Date | null;
  dataAccessExpiresAt: Date | null;
  scopes: string[];
  userId?: string;
  error?: string;
}

export async function validateToken(token: string): Promise<TokenValidation> {
  const data = await fbProxyCall<Record<string, unknown>>({
    action: 'validate_token',
    inputToken: token,
  });

  const d = data.data as Record<string, unknown> | undefined;
  if (data.error || !d) {
    return {
      isValid: false,
      expiresAt: null,
      dataAccessExpiresAt: null,
      scopes: [],
      error: (data.error as Record<string, string>)?.message,
    };
  }

  return {
    isValid: d.is_valid as boolean,
    expiresAt: d.expires_at ? new Date((d.expires_at as number) * 1000) : null,
    dataAccessExpiresAt: d.data_access_expires_at
      ? new Date((d.data_access_expires_at as number) * 1000)
      : null,
    scopes: (d.scopes as string[]) || [],
    userId: d.user_id as string | undefined,
  };
}

export async function exchangeToken(
  shortLivedToken: string
): Promise<{ token: string; expiresIn: number }> {
  const data = await fbProxyCall<Record<string, unknown>>({
    action: 'exchange_token',
    shortLivedToken,
  });

  if (data.error) {
    throw new Error(
      ((data.error as Record<string, string>)?.message) || 'Token exchange failed'
    );
  }

  return {
    token: data.access_token as string,
    expiresIn: (data.expires_in as number) || 5184000,
  };
}

// =============================================================================
// SYNC METHODS
// =============================================================================

interface FBUser {
  id: string;
  name: string;
}

interface FBBusiness {
  id: string;
  name: string;
  verification_status?: string;
  permitted_roles?: string[];
}

interface FBPage {
  id: string;
  name: string;
  is_published?: boolean;
  fan_count?: number;
  link?: string;
}

interface FBAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency?: string;
  amount_spent?: string;
  timezone_name?: string;
}

interface FBPixel {
  id: string;
  name: string;
  last_fired_time?: string;
}

interface FBSystemUser {
  id: string;
  name: string;
  role: string;
}

export async function getMe(token: string): Promise<FBUser> {
  return apiCall('/me', token, { fields: 'id,name' });
}

export async function getBusinesses(token: string): Promise<FBBusiness[]> {
  const response = await apiCall<{ data: FBBusiness[] }>('/me/businesses', token, {
    fields: 'id,name,verification_status,permitted_roles',
    limit: '100',
  });
  return response.data || [];
}

export async function getPages(token: string): Promise<FBPage[]> {
  const response = await apiCall<{ data: FBPage[] }>('/me/accounts', token, {
    fields: 'id,name,access_token,is_published,fan_count,link',
    limit: '100',
  });
  return response.data || [];
}

export async function getBMAdAccounts(
  token: string,
  bmId: string
): Promise<FBAdAccount[]> {
  const fields = 'id,name,account_status,currency,amount_spent,timezone_name';

  const [ownedResponse, clientResponse] = await Promise.all([
    apiCall<{ data: FBAdAccount[] }>(
      `/${bmId}/owned_ad_accounts`,
      token,
      { fields, limit: '100' }
    ),
    apiCall<{ data: FBAdAccount[] }>(
      `/${bmId}/client_ad_accounts`,
      token,
      { fields, limit: '100' }
    ).catch(() => ({ data: [] as FBAdAccount[] })),
  ]);

  const owned = ownedResponse.data || [];
  const client = clientResponse.data || [];

  // Deduplicate by account ID
  const seen = new Set(owned.map(a => a.id));
  const unique = [...owned];
  for (const acc of client) {
    if (!seen.has(acc.id)) {
      unique.push(acc);
      seen.add(acc.id);
    }
  }

  return unique;
}


export async function getBMPixels(
  token: string,
  bmId: string
): Promise<FBPixel[]> {
  const fields = 'id,name,last_fired_time';

  const [ownedResponse, clientResponse] = await Promise.all([
    apiCall<{ data: FBPixel[] }>(
      `/${bmId}/owned_pixels`,
      token,
      { fields, limit: '100' }
    ),
    apiCall<{ data: FBPixel[] }>(
      `/${bmId}/adspixels`,
      token,
      { fields, limit: '100' }
    ).catch(() => ({ data: [] as FBPixel[] })),
  ]);

  const owned = ownedResponse.data || [];
  const client = clientResponse.data || [];

  // Deduplicate by pixel ID
  const seen = new Set(owned.map(p => p.id));
  const unique = [...owned];
  for (const pixel of client) {
    if (!seen.has(pixel.id)) {
      unique.push(pixel);
      seen.add(pixel.id);
    }
  }

  return unique;
}

// =============================================================================
// SYSTEM USER METHODS
// =============================================================================

export async function getBMSystemUsers(
  token: string,
  bmId: string
): Promise<FBSystemUser[]> {
  const response = await apiCall<{ data: FBSystemUser[] }>(
    `/${bmId}/system_users`,
    token,
    { fields: 'id,name,role' }
  );
  return response.data || [];
}

export async function createSystemUser(
  token: string,
  bmId: string,
  name: string,
  role: string = 'ADMIN'
): Promise<{ id: string }> {
  return fbProxyCall<{ id: string }>({
    action: 'graph_call',
    method: 'POST',
    endpoint: `/${bmId}/system_users`,
    accessToken: token,
    params: { name, role },
  });
}

export async function generateSystemUserAccessToken(
  adminToken: string,
  systemUserId: string,
  scopes: string = 'business_management,ads_management,ads_read,pages_read_engagement,pages_manage_metadata'
): Promise<{ access_token: string }> {
  return fbProxyCall<{ access_token: string }>({
    action: 'graph_call',
    method: 'POST',
    endpoint: `/${systemUserId}/access_tokens`,
    accessToken: adminToken,
    params: { business_app: FB_APP_ID, scope: scopes },
  });
}

export async function checkBMAdminAccess(
  token: string,
  bmId: string
): Promise<boolean> {
  try {
    const businesses = await getBusinesses(token);
    const bm = businesses.find(b => b.id === bmId);
    return !!(bm && bm.permitted_roles && bm.permitted_roles.includes('ADMIN'));
  } catch {
    return false;
  }
}
