/**
 * CampaignLaunchPage - Assemble, validate, and launch a campaign.
 *
 * Route: /ops/products/:id/campaigns/:campaignId/launch
 *
 * UI Modes:
 * - Pre-Launch: Configuration view (3-column layout)
 * - Launching: Progress view (execution in progress)
 * - Complete: Outcome view (success/failure with next actions)
 *
 * This page is pure wiring - all logic is in useCampaignLaunchController.
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
// Controller - canonical location
import { useCampaignLaunchController } from './useCampaignLaunchController';
// Components - canonical location
import { CreativesColumn } from './prelaunch/CreativesColumn';
import { CampaignSetupColumn } from './prelaunch/CampaignSetupColumn';
import { FinalCheckColumn } from './FinalCheckColumn';
// LaunchProgressView - canonical location
import { LaunchProgressView } from './LaunchProgressView';

// =============================================================================
// UI MODE TYPE
// =============================================================================

type UIMode = 'pre-launch' | 'launching' | 'complete';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CampaignLaunchPage() {
  const { id: productIdParam, campaignId } = useParams<{ id?: string; campaignId: string }>();
  const navigate = useNavigate();

  // Controller owns all business logic
  const c = useCampaignLaunchController(campaignId!, productIdParam);

  // UI-only state (not business logic)
  const [mediaCollapsed, setMediaCollapsed] = useState(false);

  // Derive UI mode from controller state
  const uiMode: UIMode = useMemo(() => {
    if (c.isLaunching) return 'launching';
    if (c.launchResult?.success || c.launchResult?.error) return 'complete';
    return 'pre-launch';
  }, [c.isLaunching, c.launchResult]);

  // ---------------------------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------------------------
  if (c.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!c.campaign) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">Campaign not found</Typography>
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: LAUNCHING / COMPLETE MODE
  // ---------------------------------------------------------------------------
  if (uiMode === 'launching' || uiMode === 'complete') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
        <LaunchProgressView
          campaignName={c.draft.name || 'Campaign'}
          progress={c.launchProgress}
          isLaunching={c.isLaunching}
          selectedVideos={c.selectedVideosForPreview.map((v) => ({ id: v.id, name: v.name }))}
          selectedImages={c.selectedImagesForPreview.map((i) => ({ id: i.id, name: i.name }))}
          launchResult={c.launchResult}
          adAccountId={c.draft.adAccountId}
          onBackToProduct={() => navigate(c.productId ? `/ops/products/${c.productId}` : '/ops/products')}
          onRetryItem={c.retryItem}
        />
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: PRE-LAUNCH MODE (Configuration)
  // ---------------------------------------------------------------------------
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={() => navigate(c.productId ? `/ops/products/${c.productId}` : '/ops/products')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h3" sx={{ fontWeight: 600, flex: 1 }}>
          Campaign Launcher - {c.campaign?.product.name || 'Product'}
        </Typography>

        {/* Profile Selector */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FormControl size="small" sx={{ minWidth: 200 }} error={!!c.profileError}>
            <InputLabel id="profile-select-label">Profile</InputLabel>
            <Select
              labelId="profile-select-label"
              id="profile-select"
              value={c.selectedProfile?.id ?? ''}
              label="Profile"
              onChange={(e) => c.selectProfile(e.target.value)}
              error={!!c.profileError}
            >
              {c.profiles.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  {profile.profileName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {c.profileError && (
            <Typography sx={{ fontSize: 12, color: 'error.main' }}>
              {c.profileError}
            </Typography>
          )}
        </Box>

        {/* Auto-save status indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
          {c.saveStatus === 'saving' && (
            <>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">Saving...</Typography>
            </>
          )}
          {c.saveStatus === 'saved' && (
            <>
              <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
              <Typography variant="body2" color="text.secondary">Saved</Typography>
            </>
          )}
          {c.saveStatus === 'error' && (
            <>
              <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />
              <Typography variant="body2" color="error.main">Save failed</Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Three Column Grid with blocking overlay */}
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {/* Blocking overlay when no profile selected */}
        {!c.isProfileSelected && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
              backdropFilter: 'blur(2px)',
            }}
          >
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Select a Profile to Continue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a profile from the dropdown above to enable campaign configuration
              </Typography>
            </Box>
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: mediaCollapsed ? '48px 1.5fr 1fr' : '1.2fr 1.2fr 1fr',
            gap: 3,
            height: '100%',
            transition: 'grid-template-columns 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: c.isProfileSelected ? 'auto' : 'none',
            opacity: c.isProfileSelected ? 1 : 0.5,
          }}
        >
          {/* LEFT: Creatives */}
          <CreativesColumn
            videos={c.availableVideos}
            images={c.availableImages}
            selectedVideoIds={c.selectedVideoIds}
            selectedImageIds={c.selectedImageIds}
            onToggleVideo={c.toggleVideo}
            onToggleImage={c.toggleImage}
            onSelectRandomVideos={c.selectRandomVideos}
            onSelectRandomImages={c.selectRandomImages}
            onUnselectAllVideos={c.unselectAllVideos}
            onUnselectAllImages={c.unselectAllImages}
            collapsed={mediaCollapsed}
            onToggleCollapse={() => setMediaCollapsed(!mediaCollapsed)}
            reuseCreatives={c.reuseCreatives}
            onToggleReuseCreatives={c.toggleReuseCreatives}
            prelaunchUploader={c.prelaunchUploader}
            canCheckLibrary={!!c.draft.adAccountId && !!c.selectedProfile}
            videosNotInLibraryCount={c.videosNotInLibraryCount}
            selectedNotInLibraryCount={c.selectedNotInLibraryCount}
          />

          {/* CENTER: Campaign Setup */}
          <Box sx={{ alignSelf: 'start', position: 'sticky', top: 24 }}>
            <CampaignSetupColumn
              draft={c.draft}
              onDraftChange={c.updateDraft}
              adPresets={c.productPresets}
              adAccounts={c.adAccounts}
              pages={c.pages}
              pixels={c.pixels}
              redtrackData={c.redtrackData}
              redtrackCampaigns={c.redtrackCampaigns}
              redtrackCampaignsLoading={c.redtrackCampaignsLoading}
              websiteUrlFromRedtrack={c.websiteUrlFromRedtrack}
              pixelsError={c.pixelsError}
              pagesError={c.pagesError}
              pixelsLoading={c.pixelsLoading}
              pagesLoading={c.pagesLoading}
            />
          </Box>

          {/* RIGHT: Final Check - Simplified for pre-launch */}
          <Box sx={{ alignSelf: 'start', position: 'sticky', top: 24 }}>
            <FinalCheckColumn
              validationGroups={c.validationGroups}
              onLaunch={c.launch}
              isLaunching={c.isLaunching}
              allChecksPass={c.allChecksPass}
              selectedVideos={c.selectedVideosForPreview}
              selectedImages={c.selectedImagesForPreview}
              redtrackData={c.redtrackData}
              redtrackLoading={c.redtrackLoading}
              launchResult={c.launchResult}
              mediaCounts={c.mediaCounts}
              launchStatusActive={c.launchStatusActive}
              onToggleLaunchStatusActive={c.toggleLaunchStatusActive}
              websiteUrlFromRedtrack={c.websiteUrlFromRedtrack}
              simplified
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
