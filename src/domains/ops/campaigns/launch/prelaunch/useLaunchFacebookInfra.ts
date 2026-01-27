/**
 * useLaunchFacebookInfra
 *
 * Manages Facebook infrastructure data for campaign launch:
 * - Ad accounts fetching
 * - Pixels fetching (per ad account)
 * - Pages fetching (per ad account)
 * - Maps raw Facebook entities to InfraOption format
 *
 * Does NOT include launch execution logic (useFbLaunchRunner stays in orchestrator).
 *
 * Extracted from useCampaignLaunchController (Phase 7.2 Step 5).
 */

import { useMemo, useEffect } from 'react';
import { useFacebookAds, useFacebookPixels, useFacebookPages } from '../../../../../features/facebook';
import type { InfraOption } from '../types';

export interface UseLaunchFacebookInfraOptions {
  permanentToken: string | null;
  adAccountId: string | null;
}

export interface UseLaunchFacebookInfraReturn {
  adAccounts: InfraOption[];
  pixels: InfraOption[];
  pages: InfraOption[];
  adAccountsLoading: boolean;
  pixelsLoading: boolean;
  pagesLoading: boolean;
  pixelsError: string | null;
  pagesError: string | null;
}

export function useLaunchFacebookInfra({
  permanentToken,
  adAccountId,
}: UseLaunchFacebookInfraOptions): UseLaunchFacebookInfraReturn {
  // ---------------------------------------------------------------------------
  // FACEBOOK HOOKS
  // ---------------------------------------------------------------------------
  const facebookAds = useFacebookAds(permanentToken);
  const facebookPixels = useFacebookPixels();
  const facebookPages = useFacebookPages();

  // Extract stable function references to avoid object deps in useEffect
  const { fetchByAdAccount: fetchPixels, clear: clearPixels } = facebookPixels;
  const { fetchByAdAccount: fetchPages, clear: clearPages } = facebookPages;

  // ---------------------------------------------------------------------------
  // MAPPED DATA (InfraOption format)
  // ---------------------------------------------------------------------------

  // Map Facebook ad accounts to InfraOption format
  const adAccounts = useMemo((): InfraOption[] => {
    if (!facebookAds.data?.adAccounts) return [];
    return facebookAds.data.adAccounts.map((acc) => ({
      id: acc.id,
      name: acc.name || `Account ${acc.account_id}`,
      externalId: acc.account_id,
      status: acc.account_status === 1 ? 'active' : 'unknown',
    }));
  }, [facebookAds.data?.adAccounts]);

  // Map Facebook pixels to InfraOption format
  const pixels = useMemo((): InfraOption[] => {
    return facebookPixels.pixels.map((px) => ({
      id: px.id,
      name: px.name || `Pixel ${px.id}`,
      externalId: px.id,
      status: 'active',
    }));
  }, [facebookPixels.pixels]);

  // Map Facebook pages to InfraOption format
  const pages = useMemo((): InfraOption[] => {
    return facebookPages.pages.map((page) => ({
      id: page.id,
      name: page.name || `Page ${page.id}`,
      externalId: page.id,
      status: 'active',
    }));
  }, [facebookPages.pages]);

  // ---------------------------------------------------------------------------
  // FETCH PIXELS/PAGES WHEN AD ACCOUNT CHANGES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (permanentToken && adAccountId) {
      fetchPixels(adAccountId, permanentToken);
      fetchPages(adAccountId, permanentToken);
    } else {
      clearPixels();
      clearPages();
    }
  }, [adAccountId, permanentToken, fetchPixels, fetchPages, clearPixels, clearPages]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    adAccounts,
    pixels,
    pages,
    adAccountsLoading: facebookAds.isLoading,
    pixelsLoading: facebookPixels.isLoading,
    pagesLoading: facebookPages.isLoading,
    pixelsError: facebookPixels.error,
    pagesError: facebookPages.error,
  };
}
