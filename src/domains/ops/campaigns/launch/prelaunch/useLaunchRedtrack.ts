/**
 * useLaunchRedtrack
 *
 * Manages Redtrack integration for campaign launch:
 * - Fetches Redtrack campaign list
 * - Fetches Redtrack campaign details
 * - Auto-populates websiteUrl and utms from lander data
 *
 * Extracted from useCampaignLaunchController (Phase 7.2 Step 4).
 */

import { useEffect, useRef } from 'react';
import { useRedtrackCampaign, useRedtrackCampaignList } from '../../../../../features/redtrack';
import type { CampaignDraft } from '../types';

export interface UseLaunchRedtrackOptions {
  redtrackCampaignId: string;
  websiteUrl: string;
  websiteUrlFromRedtrack: boolean;
  setWebsiteUrlFromRedtrack: React.Dispatch<React.SetStateAction<boolean>>;
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
}

export interface UseLaunchRedtrackReturn {
  redtrackCampaigns: ReturnType<typeof useRedtrackCampaignList>['campaigns'];
  redtrackCampaignsLoading: boolean;
  redtrackData: ReturnType<typeof useRedtrackCampaign>['data'];
  redtrackLoading: boolean;
  // Expose trackingParams for launch() to use
  trackingParams: string | null;
}

export function useLaunchRedtrack({
  redtrackCampaignId,
  websiteUrl,
  websiteUrlFromRedtrack,
  setWebsiteUrlFromRedtrack,
  setDraft,
  primaryTexts,
  headlines,
  descriptions,
}: UseLaunchRedtrackOptions): UseLaunchRedtrackReturn {
  // ---------------------------------------------------------------------------
  // REDTRACK HOOKS
  // ---------------------------------------------------------------------------
  const redtrackCampaignList = useRedtrackCampaignList(true);
  const redtrack = useRedtrackCampaign(redtrackCampaignId || null);

  // ---------------------------------------------------------------------------
  // REFS FOR AUTO-POPULATE LOGIC
  // ---------------------------------------------------------------------------
  const lastAppliedLanderUrl = useRef<string | null>(null);
  const lastRedtrackCampaignId = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // AUTO-POPULATE EFFECTS
  // ---------------------------------------------------------------------------

  // When Redtrack campaign changes, allow auto-populate to overwrite
  useEffect(() => {
    if (redtrackCampaignId && redtrackCampaignId !== lastRedtrackCampaignId.current) {
      // Redtrack campaign changed - reset to allow auto-populate
      setWebsiteUrlFromRedtrack(true); // Mark as "from redtrack" so it can be overwritten
      lastAppliedLanderUrl.current = null; // Reset so new URL will be applied
      lastRedtrackCampaignId.current = redtrackCampaignId;
    }
  }, [redtrackCampaignId, setWebsiteUrlFromRedtrack]);

  // Auto-populate websiteUrl and utms when Redtrack data becomes available
  useEffect(() => {
    const landerUrl = redtrack.landerUrl;
    const trackingParams = redtrack.trackingParams;

    if (
      landerUrl &&
      landerUrl !== lastAppliedLanderUrl.current &&
      (!websiteUrl || websiteUrlFromRedtrack)
    ) {
      setDraft((prev) => ({
        ...prev,
        websiteUrl: landerUrl,
        // Also update UTMs if available and current field is empty or was auto-populated
        utms: trackingParams && (!prev.utms || websiteUrlFromRedtrack) ? trackingParams : prev.utms,
      }));
      setWebsiteUrlFromRedtrack(true);
      lastAppliedLanderUrl.current = landerUrl;
    }
  }, [redtrack.landerUrl, redtrack.trackingParams, websiteUrl, websiteUrlFromRedtrack, setDraft, setWebsiteUrlFromRedtrack]);

  // Auto-replace {{link}} in ad texts when lander URL is available
  useEffect(() => {
    const landerUrl = redtrack.landerUrl;
    if (!landerUrl) return;

    setDraft((prev) => {
      const has = (arr: string[]) => arr.some(t => t.includes('{{link}}'));
      if (!has(prev.primaryTexts) && !has(prev.headlines) && !has(prev.descriptions)) return prev;
      const replace = (arr: string[]) => arr.map(t => t.replaceAll('{{link}}', landerUrl));
      return {
        ...prev,
        linkVariable: landerUrl,
        primaryTexts: replace(prev.primaryTexts),
        headlines: replace(prev.headlines),
        descriptions: replace(prev.descriptions),
      };
    });
  }, [redtrack.landerUrl, primaryTexts, headlines, descriptions, setDraft]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    redtrackCampaigns: redtrackCampaignList.campaigns,
    redtrackCampaignsLoading: redtrackCampaignList.isLoading,
    redtrackData: redtrack.data,
    redtrackLoading: redtrack.isLoading,
    trackingParams: redtrack.trackingParams,
  };
}
