/**
 * useCampaignLaunchController
 *
 * FACADE: Top-level controller hook for CampaignLaunchPage.
 *
 * Role in lifecycle architecture:
 * - Composes ALL prelaunch hooks (selection, draft, validation, etc.)
 * - Composes useLaunchExecution (which bridges launch → postlaunch)
 * - Exposes a unified API for the page component
 *
 * Hierarchy:
 *   CampaignLaunchPage.tsx (UI)
 *     └── useCampaignLaunchController (FACADE - this file)
 *           ├── prelaunch/* hooks (data preparation)
 *           └── useLaunchExecution (BRIDGE)
 *                 ├── useRunLaunchPipeline (ENGINE - launch/)
 *                 └── writeLaunchSnapshot (postlaunch/)
 *
 * Page should only wire this to components - no direct hook usage.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useCampaignsController } from '../../../../features/campaigns';
import { useVideosController } from '../../../../features/videos/useVideosController';
import { useImagesController } from '../../../../features/images';
import { useAdPresetsController, getPrimaryTexts, getHeadlines, getDescriptions } from '../../../../features/ad-presets';
import { useProfilesController } from '../../../../features/profiles';
import { usePrelaunchUploader } from './prelaunch/usePrelaunchUploader';
import { useLaunchSelectionState } from './prelaunch/useLaunchSelectionState';
import { useLaunchDraftState } from './prelaunch/useLaunchDraftState';
import { useLaunchAutoSave } from './prelaunch/useLaunchAutoSave';
import { useLaunchRedtrack, type UseLaunchRedtrackReturn } from './prelaunch/useLaunchRedtrack';
import { useLaunchFacebookInfra } from './prelaunch/useLaunchFacebookInfra';
import { useLaunchMediaState } from './prelaunch/useLaunchMediaState';
import { useLaunchValidation } from './prelaunch/useLaunchValidation';
import { useLaunchExecution } from './useLaunchExecution';
import type { FbLaunchState } from '../../../../features/campaigns/launch';
import type {
  SelectableVideo,
  SelectableImage,
  CampaignDraft,
  InfraOption,
  ValidationGroup,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

interface AdPresetForLaunch {
  id: string;
  name: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  callToAction: string;
  beneficiaryName: string;
  payerName: string;
}

export interface UseCampaignLaunchControllerReturn {
  // Data
  campaign: ReturnType<typeof useCampaignsController>['campaigns'][0] | undefined;
  productId: string | undefined;
  availableVideos: SelectableVideo[];
  availableImages: SelectableImage[];
  productPresets: AdPresetForLaunch[];

  // Facebook entities
  adAccounts: InfraOption[];
  pixels: InfraOption[];
  pages: InfraOption[];
  pixelsLoading: boolean;
  pagesLoading: boolean;
  pixelsError: string | null;
  pagesError: string | null;

  // Selection
  selectedVideoIds: Set<string>;
  selectedImageIds: Set<string>;
  toggleVideo: (id: string) => void;
  toggleImage: (id: string) => void;
  selectRandomVideos: (count: number) => void;
  selectRandomImages: (count: number) => void;
  unselectAllVideos: () => void;
  unselectAllImages: () => void;
  reuseCreatives: boolean;
  toggleReuseCreatives: () => void;
  launchStatusActive: boolean;
  toggleLaunchStatusActive: () => void;

  // Draft
  draft: CampaignDraft;
  updateDraft: (updates: Partial<CampaignDraft>) => void;
  websiteUrlFromRedtrack: boolean;

  // Profile
  profiles: ReturnType<typeof useProfilesController>['profiles'];
  selectedProfile: ReturnType<typeof useProfilesController>['profiles'][0] | undefined;
  selectProfile: (id: string) => void;
  profileError: string | null;
  isProfileSelected: boolean;

  // Redtrack
  redtrackCampaigns: UseLaunchRedtrackReturn['redtrackCampaigns'];
  redtrackCampaignsLoading: boolean;
  redtrackData: UseLaunchRedtrackReturn['redtrackData'];
  redtrackLoading: boolean;

  // Validation
  validationGroups: ValidationGroup[];
  allChecksPass: boolean;
  selectedVideosForPreview: SelectableVideo[];
  selectedImagesForPreview: SelectableImage[];

  // Actions
  launch: () => Promise<void>;
  retryItem: (name: string) => void;

  // Auto-save status
  saveStatus: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;

  // Loading states
  isLoading: boolean;
  isLaunching: boolean;

  // Launch Result
  launchResult: {
    campaignId?: string;
    adSetId?: string;
    success: boolean;
    error?: string;
  } | null;

  // Media Progress
  mediaCounts: {
    videos: { total: number; uploaded: number; ready: number };
    images: { total: number; uploaded: number; ready: number };
  };

  // Launch Progress (detailed state for LaunchProgressView)
  launchProgress: FbLaunchState | null;

  // Prelaunch Uploader
  prelaunchUploader: {
    checkLibrary: () => Promise<void>;
    uploadVideos: (videoNames: string[]) => Promise<void>;
    uploadAllNotInLibrary: () => Promise<void>;
    isChecking: boolean;
    isUploading: boolean;
    isPolling: boolean;
    error: string | null;
    processingCount: number;
    readyCount: number;
    failedCount: number;
  };
  videosNotInLibraryCount: number;
  selectedNotInLibraryCount: number;
}

// =============================================================================
// HOOK
// =============================================================================

export function useCampaignLaunchController(
  campaignId: string,
  productIdParam?: string
): UseCampaignLaunchControllerReturn {
  // ---------------------------------------------------------------------------
  // CONTROLLERS
  // ---------------------------------------------------------------------------
  const campaignsController = useCampaignsController();
  const videosController = useVideosController();
  const imagesController = useImagesController();
  const adPresetsController = useAdPresetsController();
  const profilesController = useProfilesController();

  // ---------------------------------------------------------------------------
  // CAMPAIGN & PRODUCT
  // ---------------------------------------------------------------------------
  const campaign = useMemo(() => {
    return campaignsController.campaigns.find((c) => c.id === campaignId);
  }, [campaignsController.campaigns, campaignId]);

  const productId = campaign?.product.id ?? productIdParam;

  // ---------------------------------------------------------------------------
  // PROFILE SELECTION (kept here - needed before profile derivation)
  // ---------------------------------------------------------------------------
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // ---------------------------------------------------------------------------
  // WEBSITEURLFROMREDTRACK STATE (defined early - needed by draft hook)
  // ---------------------------------------------------------------------------
  const [websiteUrlFromRedtrack, setWebsiteUrlFromRedtrack] = useState(false);
  const handleWebsiteUrlChange = useCallback(() => {
    setWebsiteUrlFromRedtrack(false);
  }, []);

  // ---------------------------------------------------------------------------
  // INIT CALLBACKS REF (for draft hook to initialize external state)
  // Refs are populated after selection hook is called, but effect runs after
  // campaign data loads, so timing is safe.
  // ---------------------------------------------------------------------------
  const initCallbacksRef = useRef<{
    setReuseCreatives?: (v: boolean) => void;
    setLaunchStatusActive?: (v: boolean) => void;
  }>({});

  // ---------------------------------------------------------------------------
  // DRAFT STATE (delegated to extracted hook)
  // ---------------------------------------------------------------------------
  const {
    draft,
    setDraft,
    updateDraft,
    draftInitializedRef,
  } = useLaunchDraftState({
    campaign,
    onWebsiteUrlChange: handleWebsiteUrlChange,
    onInitReuseCreatives: (v) => initCallbacksRef.current.setReuseCreatives?.(v),
    onInitLaunchStatusActive: (v) => initCallbacksRef.current.setLaunchStatusActive?.(v),
    onInitSelectedProfileId: (v) => setSelectedProfileId(v),
  });

  // ---------------------------------------------------------------------------
  // PROFILE (moved up - needed before prelaunch uploader)
  // ---------------------------------------------------------------------------
  const selectedProfile = profilesController.profiles.find((p) => p.id === selectedProfileId);
  const isProfileSelected = !!selectedProfileId;
  const isProfileInvalid = selectedProfileId !== '' && !selectedProfile;
  const profileError = isProfileInvalid
    ? 'Selected profile not found. It may have been deleted.'
    : selectedProfile && !selectedProfile.permanentToken
      ? 'Profile is missing access token. Please re-authenticate.'
      : null;

  // ---------------------------------------------------------------------------
  // BASE VIDEOS (without library/upload state - needed for prelaunch uploader)
  // ---------------------------------------------------------------------------
  const baseVideos = useMemo(() => {
    if (!productId) return [];
    return videosController.list.allRecords
      .filter((v) => v.product.id === productId && ['available', 'review'].includes(v.status) && v.format !== 'YouTube')
      .map((v) => ({
        id: v.id,
        name: v.name,
        creativeLink: v.creativeLink,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [videosController.list.allRecords, productId]);

  // ---------------------------------------------------------------------------
  // PRELAUNCH UPLOADER
  // ---------------------------------------------------------------------------
  const prelaunchUploader = usePrelaunchUploader({
    accessToken: selectedProfile?.permanentToken ?? null,
    adAccountId: draft.adAccountId,
    videos: baseVideos,
  });

  // Reset uploader when ad account changes
  const prevAdAccountId = useRef(draft.adAccountId);
  useEffect(() => {
    if (draft.adAccountId !== prevAdAccountId.current) {
      prelaunchUploader.reset();
      prevAdAccountId.current = draft.adAccountId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.adAccountId]);

  // ---------------------------------------------------------------------------
  // AVAILABLE MEDIA (delegated to extracted hook)
  // ---------------------------------------------------------------------------
  const { availableVideos, availableImages } = useLaunchMediaState({
    productId,
    videosController,
    imagesController,
    prelaunchUploader,
  });

  // ---------------------------------------------------------------------------
  // SELECTION STATE (delegated to extracted hook)
  // ---------------------------------------------------------------------------
  const selection = useLaunchSelectionState(availableVideos, availableImages);

  // Destructure for ease of use and backward compatibility
  const {
    selectedVideoIds,
    selectedImageIds,
    reuseCreatives,
    launchStatusActive,
    setReuseCreatives,
    setLaunchStatusActive,
    toggleVideo,
    toggleImage,
    selectRandomVideos,
    selectRandomImages,
    unselectAllVideos,
    unselectAllImages,
    toggleReuseCreatives,
    toggleLaunchStatusActive,
    videosNotInLibraryCount,
    selectedNotInLibraryCount,
  } = selection;

  // Populate init callbacks ref now that selection hook has been called
  initCallbacksRef.current.setReuseCreatives = setReuseCreatives;
  initCallbacksRef.current.setLaunchStatusActive = setLaunchStatusActive;

  // ---------------------------------------------------------------------------
  // PRODUCT PRESETS
  // ---------------------------------------------------------------------------
  const productPresets = useMemo((): AdPresetForLaunch[] => {
    if (!productId) return [];
    return adPresetsController.adPresets
      .filter((p) => p.product?.id === productId)
      .map((p) => ({
        id: p.id,
        name: p.name,
        primaryTexts: getPrimaryTexts(p),
        headlines: getHeadlines(p),
        descriptions: getDescriptions(p),
        callToAction: p.callToAction ?? '',
        beneficiaryName: p.beneficiaryName ?? '',
        payerName: p.payerName ?? '',
      }));
  }, [adPresetsController.adPresets, productId]);

  // ---------------------------------------------------------------------------
  // AUTO-SAVE (delegated to extracted hook)
  // ---------------------------------------------------------------------------
  const { saveStatus, lastSavedAt } = useLaunchAutoSave({
    campaignId,
    draft,
    selectedProfileId,
    reuseCreatives,
    launchStatusActive,
    draftInitializedRef,
  });

  // ---------------------------------------------------------------------------
  // REDTRACK (delegated to extracted hook)
  // ---------------------------------------------------------------------------
  const {
    redtrackCampaigns,
    redtrackCampaignsLoading,
    redtrackData,
    redtrackLoading,
    trackingParams: redtrackTrackingParams,
  } = useLaunchRedtrack({
    redtrackCampaignId: draft.redtrackCampaignId,
    websiteUrl: draft.websiteUrl,
    websiteUrlFromRedtrack,
    setWebsiteUrlFromRedtrack,
    setDraft,
    primaryTexts: draft.primaryTexts,
    headlines: draft.headlines,
    descriptions: draft.descriptions,
  });

  // Auto-select first preset when presets load and none is selected
  useEffect(() => {
    if (!draft.adPresetId && productPresets.length > 0 && draftInitializedRef.current) {
      updateDraft({ adPresetId: productPresets[0].id });
    }
  }, [productPresets, draft.adPresetId]);

  // Sync draft texts when Ad Preset is selected (once per preset change)
  const lastAppliedPresetId = useRef<string | null>(null);
  useEffect(() => {
    // Only apply when adPresetId changes, not when productPresets refetches
    if (!draft.adPresetId || draft.adPresetId === lastAppliedPresetId.current) return;
    const preset = productPresets.find(p => p.id === draft.adPresetId);
    if (preset) {
      setDraft(prev => ({
        ...prev,
        primaryTexts: preset.primaryTexts,
        headlines: preset.headlines,
        descriptions: preset.descriptions,
      }));
      lastAppliedPresetId.current = draft.adPresetId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.adPresetId, productPresets]);

  // ---------------------------------------------------------------------------
  // FACEBOOK INFRASTRUCTURE (delegated to extracted hook)
  // ---------------------------------------------------------------------------
  const {
    adAccounts,
    pixels,
    pages,
    // adAccountsLoading - available but unused
    pixelsLoading,
    pagesLoading,
    pixelsError,
    pagesError,
  } = useLaunchFacebookInfra({
    permanentToken: selectedProfile?.permanentToken ?? null,
    adAccountId: draft.adAccountId,
  });

  // ---------------------------------------------------------------------------
  // LAUNCH EXECUTION (delegated to extracted hook)
  // ---------------------------------------------------------------------------
  const {
    isLaunching,
    launchResult,
    mediaCounts,
    launchProgress,
    launch,
    retryItem,
  } = useLaunchExecution({
    campaignId,
    draft,
    selectedProfile: selectedProfile ? {
      id: selectedProfile.id,
      permanentToken: selectedProfile.permanentToken,
      profileName: selectedProfile.profileName,
    } : undefined,
    availableVideos,
    availableImages,
    selectedVideoIds,
    selectedImageIds,
    productPresets,
    reuseCreatives,
    launchStatusActive,
    redtrackTrackingParams,
  });

  // ---------------------------------------------------------------------------
  // VALIDATION (delegated to extracted hook)
  // ---------------------------------------------------------------------------
  const {
    validationGroups,
    allChecksPass,
    selectedVideosForPreview,
    selectedImagesForPreview,
  } = useLaunchValidation({
    draft,
    selectedVideoIds,
    selectedImageIds,
    availableVideos,
    availableImages,
  });

  // ---------------------------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------------------------
  const isLoading =
    campaignsController.isLoading ||
    videosController.list.isLoading ||
    imagesController.isLoading ||
    adPresetsController.isLoading;

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------
  return {
    // Data
    campaign,
    productId,
    availableVideos,
    availableImages,
    productPresets,

    // Facebook entities
    adAccounts,
    pixels,
    pages,
    pixelsLoading,
    pagesLoading,
    pixelsError,
    pagesError,

    // Selection
    selectedVideoIds,
    selectedImageIds,
    toggleVideo,
    toggleImage,
    selectRandomVideos,
    selectRandomImages,
    unselectAllVideos,
    unselectAllImages,
    reuseCreatives,
    toggleReuseCreatives,
    launchStatusActive,
    toggleLaunchStatusActive,

    // Draft
    draft,
    updateDraft,
    websiteUrlFromRedtrack,

    // Profile
    profiles: profilesController.profiles,
    selectedProfile,
    selectProfile: setSelectedProfileId,
    profileError,
    isProfileSelected,

    // Redtrack
    redtrackCampaigns,
    redtrackCampaignsLoading,
    redtrackData,
    redtrackLoading,

    // Validation
    validationGroups,
    allChecksPass,
    selectedVideosForPreview,
    selectedImagesForPreview,

    // Actions
    launch,
    retryItem,

    // Auto-save status
    saveStatus,
    lastSavedAt,

    // Launch result & progress
    launchResult,
    mediaCounts,
    launchProgress,

    // Loading states
    isLoading,
    isLaunching,

    // Prelaunch Uploader
    prelaunchUploader: {
      checkLibrary: prelaunchUploader.checkLibrary,
      uploadVideos: prelaunchUploader.uploadVideos,
      uploadAllNotInLibrary: prelaunchUploader.uploadAllNotInLibrary,
      isChecking: prelaunchUploader.isChecking,
      isUploading: prelaunchUploader.isUploading,
      isPolling: prelaunchUploader.isPolling,
      error: prelaunchUploader.error,
      processingCount: prelaunchUploader.processingCount,
      readyCount: prelaunchUploader.readyCount,
      failedCount: prelaunchUploader.failedCount,
    },
    videosNotInLibraryCount,
    selectedNotInLibraryCount,
  };
}
