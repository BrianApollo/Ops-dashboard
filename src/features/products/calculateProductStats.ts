/**
 * Pure function for calculating product stats.
 * Handles cross-domain relationships (e.g., scripts ↔ videos).
 */

import type { Script } from '../scripts';
import type { VideoAsset } from '../videos';
import type { Image } from '../images';
import type { Campaign } from '../campaigns';

export interface ProductStats {
  unassignedScripts: number;
  availableVideos: number;
  availableImages: number;
  activeCampaigns: number;
}

/**
 * Calculate product stats for display in the header.
 * When productId is provided, filters to that product only.
 * When productId is undefined, returns totals across all products.
 */
export function calculateProductStats(
  scripts: Script[],
  videos: VideoAsset[],
  images: Image[],
  campaigns: Campaign[],
  productId?: string
): ProductStats {
  // Scripts that have videos assigned
  const assignedScriptIds = new Set(
    videos.map((v) => v.script?.id).filter(Boolean)
  );

  return {
    unassignedScripts: scripts.filter(
      (s) => !assignedScriptIds.has(s.id) && (!productId || s.product.id === productId)
    ).length,
    availableVideos: videos.filter(
      (v) => v.status === 'available' && (!productId || v.product.id === productId)
    ).length,
    availableImages: images.filter(
      (i) => i.status === 'available' && (!productId || i.product.id === productId)
    ).length,
    activeCampaigns: campaigns.filter(
      (c) => c.status === 'Launched' && (!productId || c.product.id === productId)
    ).length,
  };
}
