/**
 * Cloudflare Images API Helper
 * 
 * Handles deletion of images from Cloudflare Images (distinct from R2).
 * 
 * Required Env Vars:
 * - VITE_CLOUDFLARE_ACCOUNT_ID
 * - VITE_CLOUDFLARE_API_TOKEN
 */

const CF_ACCOUNT_ID = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = import.meta.env.VITE_CLOUDFLARE_API_TOKEN;

/**
 * Extract Cloudflare Image ID from a delivery URL.
 * 
 * Format: https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT>
 * Example: https://imagedelivery.net/abc-123/my-image-id/public
 */
export function extractImageIdFromUrl(url: string): string | null {
    if (!url || !url.includes('imagedelivery.net')) {
        return null;
    }

    try {
        const parts = url.split('/');
        if (parts.length >= 5) {
            return parts[4];
        }
        return null;
    } catch (e) {
        console.warn('Failed to extract image ID from URL:', url);
        return null;
    }
}

/**
 * Delete an image from Cloudflare Images.
 * 
 * @param imageId - The Cloudflare Image ID
 * @returns true if deleted or not found, false if error
 */
export async function deleteCloudflareImage(imageId: string): Promise<boolean> {
    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
        console.warn('Skipping Cloudflare Image deletion: Missing credentials.');
        return false;
    }

    // Use the custom Cloudflare Worker for deletion
    // Endpoint: https://image-delete.bitter-cake-eb3c.workers.dev/{account_id}/{image_id}
    const url = `https://image-delete.bitter-cake-eb3c.workers.dev/${CF_ACCOUNT_ID}/${imageId}`;

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${CF_API_TOKEN}`,
            },
        });

        if (response.ok) {
            console.log(`[Cloudflare Images] Deleted image: ${imageId}`);
            return true;
        }

        if (response.status === 404) {
            console.log(`[Cloudflare Images] Image not found (already deleted): ${imageId}`);
            return true;
        }

        const errorData = await response.json().catch(() => ({}));
        console.error(`[Cloudflare Images] Failed to delete image ${imageId}:`, errorData);
        return false;

    } catch (error) {
        console.error(`[Cloudflare Images] Network error deleting image ${imageId}:`, error);
        return false;
    }
}
