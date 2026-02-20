/**
 * Facebook Graph API Proxy — /api/facebook/proxy
 *
 * Routes ALL Facebook API calls that need the App Secret through the server.
 * The FB_APP_SECRET NEVER reaches the browser.
 *
 * Supports three actions:
 * - graph_call: General FB Graph API call (adds appsecret_proof server-side)
 * - validate_token: Token validation (uses server-side app token)
 * - exchange_token: Short→long-lived token exchange (uses server-side client_secret)
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  FB_APP_ID: string;
  FB_APP_SECRET: string;
  JWT_SECRET: string;
}

const FB_API_VERSION = 'v21.0';
const FB_GRAPH_URL = 'https://graph.facebook.com';

// =============================================================================
// HELPERS
// =============================================================================

async function computeAppSecretProof(
  accessToken: string,
  appSecret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(accessToken));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// HANDLER
// =============================================================================

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Authenticate
  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // 2. Only ops/admin can use infrastructure features
  if (!['admin', 'ops'].includes(user.role)) {
    return jsonResponse({ error: 'Forbidden — infrastructure access requires ops or admin role' }, 403);
  }

  // 3. Parse request body
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { action } = body;

  // =========================================================================
  // ACTION: graph_call — General FB Graph API proxy
  // =========================================================================
  if (action === 'graph_call') {
    const endpoint = body.endpoint as string;
    const method = (body.method as string) || 'GET';
    const accessToken = body.accessToken as string;
    const params = (body.params as Record<string, string>) || {};

    if (!endpoint || !accessToken) {
      return jsonResponse({ error: 'Missing endpoint or accessToken' }, 400);
    }

    const proof = await computeAppSecretProof(accessToken, env.FB_APP_SECRET);
    const allParams: Record<string, string> = {
      ...params,
      access_token: accessToken,
      appsecret_proof: proof,
    };

    let fbResponse: Response;

    if (method === 'GET') {
      const qs = new URLSearchParams(allParams);
      const url = `${FB_GRAPH_URL}/${FB_API_VERSION}${endpoint}?${qs}`;
      fbResponse = await fetch(url);
    } else {
      const url = `${FB_GRAPH_URL}/${FB_API_VERSION}${endpoint}`;
      fbResponse = await fetch(url, {
        method: 'POST',
        body: new URLSearchParams(allParams),
      });
    }

    const responseText = await fbResponse.text();
    return new Response(responseText, {
      status: fbResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // =========================================================================
  // ACTION: validate_token — Token debug/validation
  // =========================================================================
  if (action === 'validate_token') {
    const inputToken = body.inputToken as string;
    if (!inputToken) {
      return jsonResponse({ error: 'Missing inputToken' }, 400);
    }

    const appToken = `${env.FB_APP_ID}|${env.FB_APP_SECRET}`;
    const qs = new URLSearchParams({
      input_token: inputToken,
      access_token: appToken,
    });
    const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/debug_token?${qs}`;

    const fbResponse = await fetch(url);
    const responseText = await fbResponse.text();
    return new Response(responseText, {
      status: fbResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // =========================================================================
  // ACTION: exchange_token — Short-lived → long-lived token exchange
  // =========================================================================
  if (action === 'exchange_token') {
    const shortLivedToken = body.shortLivedToken as string;
    if (!shortLivedToken) {
      return jsonResponse({ error: 'Missing shortLivedToken' }, 400);
    }

    const qs = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: env.FB_APP_ID,
      client_secret: env.FB_APP_SECRET,
      fb_exchange_token: shortLivedToken,
    });
    const url = `${FB_GRAPH_URL}/${FB_API_VERSION}/oauth/access_token?${qs}`;

    const fbResponse = await fetch(url);
    const responseText = await fbResponse.text();
    return new Response(responseText, {
      status: fbResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return jsonResponse({ error: `Unknown action: ${action}` }, 400);
};
