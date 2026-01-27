/**
 * Tracking Parameters Parser for Redtrack
 *
 * Pure function to extract tracking parameters from Redtrack trackback_url.
 * This is a DATA layer utility - no React or side effects.
 */

// =============================================================================
// PARSER
// =============================================================================

/**
 * Extract tracking parameters string from a trackback URL.
 *
 * Takes the campaign ID from the URL path and combines with query params.
 *
 * @param trackbackUrl - The Redtrack trackback_url field
 * @returns Tracking parameters string (e.g., 'cmpid=abc123&sub1={{ad.id}}&utm_source=facebook')
 *
 * @example
 * extractTrackingParams('https://trk.example.com/abc123?sub1={{ad.id}}&utm_source=facebook')
 * // => 'cmpid=abc123&sub1={{ad.id}}&utm_source=facebook'
 */
export function extractTrackingParams(trackbackUrl: string | undefined | null): string {
  if (!trackbackUrl) {
    return '';
  }

  try {
    const url = new URL(trackbackUrl);

    // Get campaign ID from path (remove leading slash)
    const campaignId = url.pathname.replace(/^\//, '');

    // Get query string (without leading ?)
    const queryString = url.search.replace(/^\?/, '');

    if (!campaignId) {
      return queryString;
    }

    if (!queryString) {
      return `cmpid=${campaignId}`;
    }

    return `cmpid=${campaignId}&${queryString}`;
  } catch {
    // Invalid URL - return empty
    return '';
  }
}
