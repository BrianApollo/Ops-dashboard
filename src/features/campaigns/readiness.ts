/**
 * Campaign Readiness Logic
 *
 * Pure functions for deriving campaign readiness from product aggregates.
 * No side effects, no API calls, no state — just calculations.
 *
 * Readiness is calculated based on:
 * - Scripts: How many scripts are approved vs total
 * - Videos: How many videos are available vs total
 * - Images: How many images are ready vs total
 */

import type {
  Campaign,
  CampaignReadiness,
  AssetReadiness,
  ProductAssetAggregates,
} from './types';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Calculate percentage, handling division by zero.
 */
function calculatePercentage(ready: number, total: number): number {
  if (total === 0) return 100; // No assets required = 100% ready
  return Math.round((ready / total) * 100);
}

/**
 * Create an AssetReadiness object.
 */
function createAssetReadiness(ready: number, total: number): AssetReadiness {
  const percentage = calculatePercentage(ready, total);
  return {
    ready,
    total,
    percentage,
    isComplete: ready >= total,
  };
}

// =============================================================================
// CORE READINESS CALCULATION
// =============================================================================

/**
 * Derive campaign readiness from product asset aggregates.
 *
 * @param campaign - The campaign to calculate readiness for
 * @param aggregates - Asset counts for the campaign's product
 * @returns CampaignReadiness object
 */
export function deriveCampaignReadiness(
  campaign: Campaign,
  aggregates: ProductAssetAggregates | undefined
): CampaignReadiness {
  // If no aggregates available, return empty readiness
  if (!aggregates || aggregates.productId !== campaign.product.id) {
    return {
      scripts: createAssetReadiness(0, 0),
      videos: createAssetReadiness(0, 0),
      images: createAssetReadiness(0, 0),
      isFullyReady: true, // No requirements = ready
      overallPercentage: 100,
    };
  }

  // Calculate readiness for each asset type
  const scripts = createAssetReadiness(
    aggregates.scripts.approved,
    aggregates.scripts.total
  );

  const videos = createAssetReadiness(
    aggregates.videos.available,
    aggregates.videos.total
  );

  const images = createAssetReadiness(
    aggregates.images.ready,
    aggregates.images.total
  );

  // Overall readiness
  const isFullyReady = scripts.isComplete && videos.isComplete && images.isComplete;

  // Calculate overall percentage (weighted average)
  // Only count asset types that have requirements
  const assetTypes = [scripts, videos, images].filter((a) => a.total > 0);
  const overallPercentage = assetTypes.length > 0
    ? Math.round(
        assetTypes.reduce((sum, a) => sum + a.percentage, 0) / assetTypes.length
      )
    : 100;

  return {
    scripts,
    videos,
    images,
    isFullyReady,
    overallPercentage,
  };
}

// =============================================================================
// BATCH READINESS CALCULATION
// =============================================================================

/**
 * Calculate readiness for multiple campaigns.
 *
 * @param campaigns - List of campaigns
 * @param aggregatesMap - Map of productId → aggregates
 * @returns Map of campaignId → readiness
 */
export function deriveCampaignReadinessMap(
  campaigns: Campaign[],
  aggregatesMap: Map<string, ProductAssetAggregates>
): Map<string, CampaignReadiness> {
  const result = new Map<string, CampaignReadiness>();

  for (const campaign of campaigns) {
    const aggregates = aggregatesMap.get(campaign.product.id);
    const readiness = deriveCampaignReadiness(campaign, aggregates);
    result.set(campaign.id, readiness);
  }

  return result;
}

// =============================================================================
// READINESS HELPERS
// =============================================================================

/**
 * Get a human-readable readiness label.
 */
export function getReadinessLabel(readiness: CampaignReadiness): string {
  if (readiness.isFullyReady) {
    return 'Ready';
  }
  if (readiness.overallPercentage >= 75) {
    return 'Almost Ready';
  }
  if (readiness.overallPercentage >= 50) {
    return 'In Progress';
  }
  if (readiness.overallPercentage > 0) {
    return 'Started';
  }
  return 'Not Started';
}

/**
 * Get readiness color for UI display.
 */
export function getReadinessColor(
  readiness: CampaignReadiness
): 'success' | 'warning' | 'error' | 'default' {
  if (readiness.isFullyReady) {
    return 'success';
  }
  if (readiness.overallPercentage >= 50) {
    return 'warning';
  }
  if (readiness.overallPercentage > 0) {
    return 'error';
  }
  return 'default';
}

/**
 * Get blocking issues for a campaign.
 */
export function getBlockingIssues(readiness: CampaignReadiness): string[] {
  const issues: string[] = [];

  if (!readiness.scripts.isComplete && readiness.scripts.total > 0) {
    const missing = readiness.scripts.total - readiness.scripts.ready;
    issues.push(`${missing} script${missing !== 1 ? 's' : ''} pending approval`);
  }

  if (!readiness.videos.isComplete && readiness.videos.total > 0) {
    const missing = readiness.videos.total - readiness.videos.ready;
    issues.push(`${missing} video${missing !== 1 ? 's' : ''} not available`);
  }

  if (!readiness.images.isComplete && readiness.images.total > 0) {
    const missing = readiness.images.total - readiness.images.ready;
    issues.push(`${missing} image${missing !== 1 ? 's' : ''} not ready`);
  }

  return issues;
}

// =============================================================================
// EMPTY/DEFAULT READINESS
// =============================================================================

/**
 * Create an empty readiness object (no data available).
 */
export function createEmptyReadiness(): CampaignReadiness {
  return {
    scripts: createAssetReadiness(0, 0),
    videos: createAssetReadiness(0, 0),
    images: createAssetReadiness(0, 0),
    isFullyReady: true,
    overallPercentage: 100,
  };
}
