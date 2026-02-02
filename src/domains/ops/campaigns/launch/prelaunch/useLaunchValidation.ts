/**
 * useLaunchValidation
 *
 * Computes validation state for campaign launch:
 * - validationGroups (Assets, Infrastructure, Delivery, System)
 * - allChecksPass
 * - selectedVideosForPreview
 * - selectedImagesForPreview
 *
 * Pure computation only - no effects, no writes.
 *
 * Extracted from useCampaignLaunchController (Phase 7.2 Step 6B).
 */

import { useMemo } from 'react';
import type { CampaignDraft, ValidationGroup, SelectableVideo, SelectableImage } from '../types';

export interface UseLaunchValidationOptions {
  draft: CampaignDraft;
  selectedVideoIds: Set<string>;
  selectedImageIds: Set<string>;
  availableVideos: SelectableVideo[];
  availableImages: SelectableImage[];
}

export interface UseLaunchValidationReturn {
  validationGroups: ValidationGroup[];
  allChecksPass: boolean;
  selectedVideosForPreview: SelectableVideo[];
  selectedImagesForPreview: SelectableImage[];
}

export function useLaunchValidation({
  draft,
  selectedVideoIds,
  selectedImageIds,
  availableVideos,
  availableImages,
}: UseLaunchValidationOptions): UseLaunchValidationReturn {
  // ---------------------------------------------------------------------------
  // VALIDATION GROUPS
  // ---------------------------------------------------------------------------
  const validationGroups = useMemo((): ValidationGroup[] => {
    const hasValidCreatives = selectedVideoIds.size > 0 || selectedImageIds.size > 0;

    const selectedVideos = availableVideos.filter((v) => selectedVideoIds.has(v.id));
    const allVideosValid = selectedVideos.every((v) => ['review', 'available'].includes(v.status));

    // Images don't have a status workflow like videos - they're always valid
    const allImagesValid = true;

    const groups: ValidationGroup[] = [
      {
        name: 'Assets',
        checks: [
          { id: 'preset', label: 'Ad preset', group: 'assets', passed: !!draft.adPresetId },
          {
            id: 'link-replaced',
            label: '{{link}} replaced',
            group: 'assets',
            passed: !draft.primaryTexts.concat(draft.headlines, draft.descriptions)
              .some(t => t.includes('{{link}}')),
          },
          { id: 'creatives', label: 'At least 1 creative', group: 'assets', passed: hasValidCreatives },
          { id: 'valid-status', label: 'Valid statuses', group: 'assets', passed: !hasValidCreatives || (allVideosValid && allImagesValid) },
        ],
        allPassed: false,
      },
      {
        name: 'Infrastructure',
        checks: [
          { id: 'ad-account', label: 'Ad account', group: 'infrastructure', passed: !!draft.adAccountId },
          { id: 'page', label: 'Page', group: 'infrastructure', passed: !!draft.pageId },
          { id: 'pixel', label: 'Pixel', group: 'infrastructure', passed: !!draft.pixelId },
        ],
        allPassed: false,
      },
      {
        name: 'Delivery',
        checks: [
          { id: 'budget', label: 'Budget', group: 'delivery', passed: !!draft.budget && parseFloat(draft.budget) > 0 },
          { id: 'date', label: 'Start date', group: 'delivery', passed: !!draft.startDate },
          { id: 'geo', label: 'Location', group: 'delivery', passed: !!draft.geo },
        ],
        allPassed: false,
      },
      {
        name: 'System',
        checks: [
          { id: 'name', label: 'Campaign name', group: 'system', passed: !!draft.name.trim() },
        ],
        allPassed: false,
      },
    ];

    groups.forEach((g) => {
      g.allPassed = g.checks.every((c) => c.passed);
    });

    return groups;
  }, [draft, selectedVideoIds, selectedImageIds, availableVideos, availableImages]);

  // ---------------------------------------------------------------------------
  // ALL CHECKS PASS
  // ---------------------------------------------------------------------------
  const allChecksPass = validationGroups.every((g) => g.allPassed);

  // ---------------------------------------------------------------------------
  // SELECTED MEDIA FOR PREVIEW
  // ---------------------------------------------------------------------------
  const selectedVideosForPreview = useMemo(
    () => availableVideos.filter((v) => selectedVideoIds.has(v.id)),
    [availableVideos, selectedVideoIds]
  );

  const selectedImagesForPreview = useMemo(
    () => availableImages.filter((i) => selectedImageIds.has(i.id)),
    [availableImages, selectedImageIds]
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    validationGroups,
    allChecksPass,
    selectedVideosForPreview,
    selectedImagesForPreview,
  };
}
