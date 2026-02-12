/**
 * Facebook Infrastructure API
 *
 * Port of facebook.js — typed Graph API calls for infrastructure management.
 * Handles token validation, exchange, sync, and system user operations.
 */

const FB_API_VERSION = 'v21.0';
const FB_GRAPH_URL = 'https://graph.facebook.com';

const FB_APP_ID = import.meta.env.VITE_FB_APP_ID as string;
const FB_APP_SECRET = import.meta.env.VITE_FB_APP_SECRET as string;

// =============================================================================
// HELPERS
// =============================================================================

export async function getAppSecretProof(accessToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(FB_APP_SECRET);
  const messageData = encoder.encode(accessToken);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function apiCall<T = Record<string, unknown>>(
  endpoint: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<T> {
  const appSecretProof = await getAppSecretProof(accessToken);
  const queryParams = new URLSearchParams({
    access_token: accessToken,
    appsecret_proof: appSecretProof,
    ...params,
  });

  const url = `${FB_GRAPH_URL}/${FB_API_VERSION}${endpoint}?${queryParams}`;
  const response = await fetch(url);
  const data = await response.json();

  // if (data.error) {
  //   throw new Error(data.error.message || 'API call failed');
  // }

  return data as T;
}

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
  scopes: string[];
  userId?: string;
  error?: string;
}

export async function validateToken(token: string): Promise<TokenValidation> {
  const appToken = `${FB_APP_ID}|${FB_APP_SECRET}`;
  const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/debug_token?input_token=${token}&access_token=${appToken}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.error || !data.data) {
    return { isValid: false, expiresAt: null, scopes: [], error: data.error?.message };
  }

  return {
    isValid: data.data.is_valid,
    expiresAt: data.data.expires_at ? new Date(data.data.expires_at * 1000) : null,
    scopes: data.data.scopes || [],
    userId: data.data.user_id,
  };
}

export async function exchangeToken(
  shortLivedToken: string
): Promise<{ token: string; expiresIn: number }> {
  const url =
    `${FB_GRAPH_URL}/${FB_API_VERSION}/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${FB_APP_ID}&` +
    `client_secret=${FB_APP_SECRET}&` +
    `fb_exchange_token=${shortLivedToken}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Token exchange failed');
  }

  return {
    token: data.access_token,
    expiresIn: data.expires_in || 5184000,
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
  const response = await apiCall<{ data: FBAdAccount[] }>(
    `/${bmId}/owned_ad_accounts`,
    token,
    {
      fields: 'id,name,account_status,currency,amount_spent,timezone_name',
      limit: '100',
    }
  );
  return response.data || [];
}

// export async function getBMAdAccounts(
//   token: string,
//   bmId: string
// ): Promise<FBAdAccount[]> {
//   const fields = 'id,name,account_status,currency,amount_spent,timezone_name';

//   const [ownedResponse, clientResponse] = await Promise.all([
//     apiCall<{ data: FBAdAccount[] }>(
//       `/${bmId}/owned_ad_accounts`,
//       token,
//       { fields, limit: '100' }
//     ),
//     apiCall<{ data: FBAdAccount[] }>(
//       `/${bmId}/client_ad_accounts`,
//       token,
//       { fields, limit: '100' }
//     ).catch(() => ({ data: [] as FBAdAccount[] })),
//   ]);

//   const owned = ownedResponse.data || [];
//   const client = clientResponse.data || [];

//   // Deduplicate by account ID
//   const seen = new Set(owned.map(a => a.id));
//   const unique = [...owned];
//   for (const acc of client) {
//     if (!seen.has(acc.id)) {
//       unique.push(acc);
//       seen.add(acc.id);
//     }
//   }

//   return unique;
// }


export async function getBMPixels(
  token: string,
  bmId: string
): Promise<FBPixel[]> {
  const response = await apiCall<{ data: FBPixel[] }>(
    `/${bmId}/owned_pixels`,
    token,
    { fields: 'id,name,last_fired_time', limit: '100' }
  );
  return response.data || [];
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
  const appSecretProof = await getAppSecretProof(token);
  const params = new URLSearchParams({
    name,
    role,
    access_token: token,
    appsecret_proof: appSecretProof,
  });

  const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/${bmId}/system_users`;
  const response = await fetch(url, { method: 'POST', body: params });
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Failed to create System User');
  }

  return data;
}

export async function generateSystemUserAccessToken(
  adminToken: string,
  systemUserId: string,
  scopes: string = 'business_management,ads_management,ads_read,pages_read_engagement,pages_manage_metadata'
): Promise<{ access_token: string }> {
  const appSecretProof = await getAppSecretProof(adminToken);
  const params = new URLSearchParams({
    business_app: FB_APP_ID,
    scope: scopes,
    access_token: adminToken,
    appsecret_proof: appSecretProof,
  });

  const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/${systemUserId}/access_tokens`;
  const response = await fetch(url, { method: 'POST', body: params });
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Failed to generate token');
  }

  return data;
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
