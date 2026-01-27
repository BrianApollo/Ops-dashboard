/**
 * useLaunchAutoSave
 *
 * Manages auto-save persistence for campaign launch:
 * - Debounced save with 2-second delay
 * - Save status tracking (idle, pending, saving, saved, error)
 * - Last saved timestamp
 *
 * Extracted from useCampaignLaunchController (Phase 7.2 Step 3).
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { saveCampaignDraft } from '../../../../../features/campaigns';
import type { CampaignDraft } from '../types';

export interface UseLaunchAutoSaveOptions {
  campaignId: string;
  draft: CampaignDraft;
  selectedProfileId: string;
  reuseCreatives: boolean;
  launchStatusActive: boolean;
  draftInitializedRef: React.MutableRefObject<boolean>;
}

export interface UseLaunchAutoSaveReturn {
  saveStatus: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
}

export function useLaunchAutoSave({
  campaignId,
  draft,
  selectedProfileId,
  reuseCreatives,
  launchStatusActive,
  draftInitializedRef,
}: UseLaunchAutoSaveOptions): UseLaunchAutoSaveReturn {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const draftRef = useRef(draft);
  draftRef.current = draft; // Keep ref in sync for cleanup function

  // Serialize draft to detect actual content changes (not just object reference)
  const draftHash = useMemo(() => JSON.stringify(draft), [draft]);

  // ---------------------------------------------------------------------------
  // DEBOUNCED AUTO-SAVE EFFECT
  // Uses draftHash (string) instead of draft (object) to prevent spurious re-runs
  // when object reference changes but content is identical
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Skip first render and when draft not initialized
    if (isFirstRender.current || !draftInitializedRef.current || !campaignId) {
      isFirstRender.current = false;
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Mark as pending - a save is queued but not yet executing
    setSaveStatus('pending');

    // Set new timeout for debounced save (2 seconds)
    // Read from draftRef.current to get latest values at save time
    autoSaveTimeoutRef.current = setTimeout(async () => {
      const currentDraft = draftRef.current;
      setSaveStatus('saving');
      try {
        await saveCampaignDraft({
          campaignId,
          name: currentDraft.name,
          redtrackCampaignId: currentDraft.redtrackCampaignId,
          redtrackCampaignName: currentDraft.redtrackCampaignName,
          adPresetId: currentDraft.adPresetId,
          adAccountId: currentDraft.adAccountId,
          pageId: currentDraft.pageId,
          pixelId: currentDraft.pixelId,
          startDate: currentDraft.startDate,
          startTime: currentDraft.startTime,
          budget: currentDraft.budget,
          geo: currentDraft.geo,
          ctaOverride: currentDraft.ctaOverride,
          websiteUrl: currentDraft.websiteUrl,
          utms: currentDraft.utms,
          displayLink: currentDraft.displayLink,
          linkVariable: currentDraft.linkVariable,
          selectedProfileId,
          reuseCreatives,
          launchStatusActive,
        });
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('error');
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        // Best-effort flush: attempt immediate save on unmount if a save was pending
        // Fire-and-forget since component is unmounting and we can't update state
        const currentDraft = draftRef.current;
        if (draftInitializedRef.current && campaignId) {
          saveCampaignDraft({
            campaignId,
            name: currentDraft.name,
            redtrackCampaignId: currentDraft.redtrackCampaignId,
            redtrackCampaignName: currentDraft.redtrackCampaignName,
            adPresetId: currentDraft.adPresetId,
            adAccountId: currentDraft.adAccountId,
            pageId: currentDraft.pageId,
            pixelId: currentDraft.pixelId,
            startDate: currentDraft.startDate,
            startTime: currentDraft.startTime,
            budget: currentDraft.budget,
            geo: currentDraft.geo,
            ctaOverride: currentDraft.ctaOverride,
            websiteUrl: currentDraft.websiteUrl,
            utms: currentDraft.utms,
            displayLink: currentDraft.displayLink,
            linkVariable: currentDraft.linkVariable,
            selectedProfileId,
            reuseCreatives,
            launchStatusActive,
          }).catch(err => {
            console.error('Unmount flush save failed:', err);
          });
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, draftHash, selectedProfileId, reuseCreatives, launchStatusActive]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    saveStatus,
    lastSavedAt,
  };
}
