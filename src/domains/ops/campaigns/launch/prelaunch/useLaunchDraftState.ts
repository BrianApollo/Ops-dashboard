/**
 * useLaunchDraftState
 *
 * Manages draft form state for campaign launch:
 * - Draft state initialization from campaign data
 * - updateDraft handler with special cases (adAccount resets pixel/page)
 * - draftInitializedRef for tracking initialization status
 * - Coordinates initialization of external state via callbacks
 *
 * Extracted from useCampaignLaunchController (Phase 7.2 Step 2).
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CampaignDraft } from '../types';

// Campaign shape for initialization (minimal interface to avoid tight coupling)
interface CampaignForDraft {
  name?: string | null;
  redtrackCampaignId?: string | null;
  redTrackName?: string | null;
  selectedAdProfile?: string | null;
  adAccUsed?: string | null;
  pageUsed?: string | null;
  pixelUsed?: string | null;
  launchDate?: string | null;
  launchTime?: string | null;
  budget?: number | null;
  locationTargeting?: string | null;
  cta?: string | null;
  websiteUrl?: string | null;
  utms?: string | null;
  displayLink?: string | null;
  linkVariable?: string | null;
  reuseCreatives?: boolean;
  launchAsActive?: boolean;
  draftProfileId?: string | null;
}

export interface UseLaunchDraftStateOptions {
  // Campaign to initialize from
  campaign: CampaignForDraft | undefined;
  // Callback for updateDraft side effect (websiteUrl change)
  onWebsiteUrlChange?: () => void;
  // Callbacks to initialize external state from campaign
  onInitReuseCreatives?: (value: boolean) => void;
  onInitLaunchStatusActive?: (value: boolean) => void;
  onInitSelectedProfileId?: (value: string) => void;
}

export interface UseLaunchDraftStateReturn {
  draft: CampaignDraft;
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
  updateDraft: (updates: Partial<CampaignDraft>) => void;
  draftInitializedRef: React.MutableRefObject<boolean>;
}

const INITIAL_DRAFT: CampaignDraft = {
  name: '',
  redtrackCampaignId: '',
  redtrackCampaignName: '',
  adPresetId: null,
  adAccountId: null,
  pageId: null,
  pixelId: null,
  startDate: '',
  startTime: '',
  budget: '',
  geo: '',
  ctaOverride: '',
  websiteUrl: '',
  utms: '',
  displayLink: '',
  linkVariable: '',
  primaryTexts: [],
  headlines: [],
  descriptions: [],
};

export function useLaunchDraftState({
  campaign,
  onWebsiteUrlChange,
  onInitReuseCreatives,
  onInitLaunchStatusActive,
  onInitSelectedProfileId,
}: UseLaunchDraftStateOptions): UseLaunchDraftStateReturn {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [draft, setDraft] = useState<CampaignDraft>(() => ({ ...INITIAL_DRAFT }));

  // Track if draft has been initialized from campaign data
  const draftInitializedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // INITIALIZATION FROM CAMPAIGN
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!campaign || draftInitializedRef.current) return;

    draftInitializedRef.current = true;

    setDraft({
      name: campaign.name ?? '',
      redtrackCampaignId: campaign.redtrackCampaignId ?? '',
      redtrackCampaignName: campaign.redTrackName ?? '',
      adPresetId: campaign.selectedAdProfile ?? null,
      adAccountId: campaign.adAccUsed ?? null,
      pageId: campaign.pageUsed ?? null,
      pixelId: campaign.pixelUsed ?? null,
      startDate: campaign.launchDate ?? '',
      startTime: campaign.launchTime ?? '',
      budget: campaign.budget?.toString() ?? '',
      geo: campaign.locationTargeting ?? '',
      ctaOverride: campaign.cta ?? '',
      websiteUrl: campaign.websiteUrl ?? '',
      utms: campaign.utms ?? '',
      displayLink: campaign.displayLink ?? '',
      linkVariable: campaign.linkVariable ?? '',
      primaryTexts: [],
      headlines: [],
      descriptions: [],
    });

    // Initialize external state via callbacks
    if (campaign.reuseCreatives !== undefined && onInitReuseCreatives) {
      onInitReuseCreatives(campaign.reuseCreatives);
    }
    if (campaign.launchAsActive !== undefined && onInitLaunchStatusActive) {
      onInitLaunchStatusActive(campaign.launchAsActive);
    }
    if (campaign.draftProfileId && onInitSelectedProfileId) {
      onInitSelectedProfileId(campaign.draftProfileId);
    }
  }, [campaign, onInitReuseCreatives, onInitLaunchStatusActive, onInitSelectedProfileId]);

  // ---------------------------------------------------------------------------
  // UPDATE HANDLER
  // ---------------------------------------------------------------------------
  const updateDraft = useCallback((updates: Partial<CampaignDraft>) => {
    // Reset websiteUrlFromRedtrack flag if user manually changes URL
    if ('websiteUrl' in updates && onWebsiteUrlChange) {
      onWebsiteUrlChange();
    }

    // Reset pixel and page when ad account changes (library reset is handled by effect)
    if ('adAccountId' in updates) {
      setDraft((prev) => ({
        ...prev,
        ...updates,
        pixelId: null,
        pageId: null,
      }));
      return;
    }

    setDraft((prev) => ({ ...prev, ...updates }));
  }, [onWebsiteUrlChange]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    draft,
    setDraft,
    updateDraft,
    draftInitializedRef,
  };
}
