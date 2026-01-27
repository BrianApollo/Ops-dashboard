/**
 * Cloudflare R2 Storage Configuration
 *
 * Environment variables for R2 bucket access.
 * Uses a Cloudflare Worker to handle uploads (required for browser S3 signing).
 *
 * Required environment variables:
 * - VITE_CF_STORAGE_WORKER_URL: Cloudflare Worker endpoint for upload/delete
 * - VITE_CF_R2_PUBLIC_URL: Public URL prefix for the R2 bucket
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

export const CF_STORAGE_WORKER_URL = import.meta.env.VITE_CF_STORAGE_WORKER_URL as string | undefined;
export const CF_R2_PUBLIC_URL = import.meta.env.VITE_CF_R2_PUBLIC_URL as string | undefined;

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if Cloudflare storage is configured.
 * Returns true if all required environment variables are set.
 */
export function isCloudflareConfigured(): boolean {
  return !!(CF_STORAGE_WORKER_URL && CF_R2_PUBLIC_URL);
}

/**
 * Validate configuration and throw if missing required variables.
 */
export function validateConfig(): void {
  const missing: string[] = [];

  if (!CF_STORAGE_WORKER_URL) missing.push('VITE_CF_STORAGE_WORKER_URL');
  if (!CF_R2_PUBLIC_URL) missing.push('VITE_CF_R2_PUBLIC_URL');

  if (missing.length > 0) {
    throw new Error(
      `Cloudflare Storage configuration error: Missing environment variables: ${missing.join(', ')}`
    );
  }
}
