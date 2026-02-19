/**
 * Airtable API Proxy — /api/airtable/[[path]]
 *
 * Routes ALL Airtable requests through the server.
 * The Airtable API key NEVER reaches the browser.
 *
 * - Authenticates the request via JWT
 * - Checks table-level permissions
 * - Strips sensitive fields from responses
 * - Forwards to Airtable with the server-side API key
 */

import { authenticateRequest } from '../../lib/auth';
import { canAccessTable, stripSensitiveFields } from '../../lib/permissions';

interface Env {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  JWT_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  // 1. Authenticate
  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Build Airtable URL from the path segments
  const pathSegments = params.path as string[];
  const airtablePath = pathSegments.join('/');

  // Extract table name (first path segment, URL-decoded)
  const tableName = decodeURIComponent(pathSegments[0] || '');

  // 3. Check table-level permissions
  const access = canAccessTable(user, tableName, request.method);
  if (!access.allowed) {
    return new Response(
      JSON.stringify({ error: 'Forbidden', message: access.reason }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. Build the Airtable API URL
  const url = new URL(request.url);
  const airtableUrl = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${airtablePath}${url.search}`;

  // 5. Forward the request with server-side API key
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  // Forward request body for POST/PATCH/PUT/DELETE
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = await request.text();
  }

  const airtableResponse = await fetch(airtableUrl, fetchOptions);

  // 6. Process response
  const responseBody = await airtableResponse.text();

  // Strip sensitive fields from GET responses
  if (request.method === 'GET' && airtableResponse.ok) {
    try {
      const data = JSON.parse(responseBody);
      if (data.records && Array.isArray(data.records)) {
        data.records = stripSensitiveFields(data.records, user);
        return new Response(JSON.stringify(data), {
          status: airtableResponse.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {
      // Not JSON or no records — pass through
    }
  }

  return new Response(responseBody, {
    status: airtableResponse.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
