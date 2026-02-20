/**
 * Auth utilities for Cloudflare Pages Functions.
 *
 * Uses Web Crypto API (available in CF Workers) for:
 * - Password hashing (PBKDF2)
 * - JWT signing/verification (HMAC-SHA256)
 *
 * No external dependencies required.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface JwtPayload {
  sub: string; // user Airtable record ID
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface UserSession {
  id: string;
  email: string;
  role: string;
}

// =============================================================================
// PASSWORD HASHING (PBKDF2)
// =============================================================================

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Hash a password with PBKDF2. Returns "salt:hash" in base64.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_LENGTH * 8
  );

  return `${arrayBufferToBase64(salt.buffer)}:${arrayBufferToBase64(hash)}`;
}

/**
 * Verify a password against a stored "salt:hash" string.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;

  const salt = new Uint8Array(base64ToArrayBuffer(saltB64));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_LENGTH * 8
  );

  const storedHash = new Uint8Array(base64ToArrayBuffer(hashB64));
  const computedHash = new Uint8Array(hash);

  if (storedHash.length !== computedHash.length) return false;
  let match = 0;
  for (let i = 0; i < storedHash.length; i++) {
    match |= storedHash[i] ^ computedHash[i];
  }
  return match === 0;
}

// =============================================================================
// JWT (HMAC-SHA256 via Web Crypto)
// =============================================================================

const JWT_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(data: string): string {
  const padded = data + '='.repeat((4 - (data.length % 4)) % 4);
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Create a signed JWT token.
 */
export async function createJwt(user: UserSession, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + JWT_EXPIRY_SECONDS,
    } satisfies JwtPayload)
  );

  const encoder = new TextEncoder();
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${header}.${payload}`)
  );

  const sig = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${header}.${payload}.${sig}`;
}

/**
 * Verify and decode a JWT token. Returns null if invalid or expired.
 */
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, sig] = parts;

  try {
    const encoder = new TextEncoder();
    const key = await getSigningKey(secret);
    const signatureBytes = Uint8Array.from(
      base64UrlDecode(sig),
      (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(`${header}.${payload}`)
    );

    if (!valid) return null;

    const decoded = JSON.parse(base64UrlDecode(payload)) as JwtPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return null;

    return decoded;
  } catch {
    return null;
  }
}

// =============================================================================
// REQUEST HELPERS
// =============================================================================

/**
 * Extract JWT from Authorization header or cookie.
 */
export function extractToken(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)ops_session=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

/**
 * Authenticate a request. Returns the user session or null.
 */
export async function authenticateRequest(
  request: Request,
  jwtSecret: string
): Promise<UserSession | null> {
  const token = extractToken(request);
  if (!token) return null;

  const payload = await verifyJwt(token, jwtSecret);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}
