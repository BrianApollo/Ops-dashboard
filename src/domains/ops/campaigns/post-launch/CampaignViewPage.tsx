/**
 * CampaignViewPage - View and manage launched Facebook campaigns.
 * Route: /ops/products/:id/campaigns/:campaignId
 *
 * Tabs:
 * - Launch Data: Read-only view of campaign info and structure
 * - Manage: Interactive management with inline editing, bulk operations
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useTheme, alpha, type Theme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
// FolderIcon removed - no longer used in redesigned layout
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import { ToggleTabs } from '../../../../ui';
import {
  getCampaign,
  useFacebookCampaign,
  updateFbCampaignStatus,
  updateFbCampaignBudget,
  updateFbAdSetStatus,
  updateFbAdStatus,
  deleteFbAd,
  getFbCreative,
  uploadFbVideo,
  createFbCreative,
  createFbAd,
  getFbVideoStatus,
  getFbVideoThumbnail,
  updateCampaignStatus,
} from '../../../../features/campaigns';
import { useProfilesController } from '../../../../features/profiles';
import { fetchRedtrackReport, type RedTrackReportRow } from '../../../../features/redtrack';
import type { Campaign, FbAdSet, FbAd, FbCreative } from '../../../../features/campaigns';
import type { CampaignViewTab } from '../../products/composition/types';
import { AddAdsModal } from './AddAdsModal';

// RedTrack API key from environment
const REDTRACK_API_KEY = import.meta.env.VITE_REDTRACK_API_KEY as string | undefined;

// =============================================================================
// STYLES
// =============================================================================

const createStyles = (theme: Theme) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    statusPill: (isActive: boolean) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1.5,
      py: 0.5,
      borderRadius: '20px',
      bgcolor: isActive
        ? alpha(theme.palette.success.main, isDark ? 0.15 : 0.08)
        : isDark ? alpha(theme.palette.common.white, 0.06) : 'grey.100',
      border: '1px solid',
      borderColor: isActive
        ? alpha(theme.palette.success.main, isDark ? 0.3 : 0.25)
        : isDark ? alpha(theme.palette.common.white, 0.1) : 'grey.300',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      '&:hover': {
        bgcolor: isActive
          ? alpha(theme.palette.success.main, isDark ? 0.2 : 0.14)
          : isDark ? alpha(theme.palette.common.white, 0.1) : 'grey.200',
      },
    }),
    statusDot: (isActive: boolean) => ({
      width: 8,
      height: 8,
      borderRadius: '50%',
      bgcolor: isActive ? 'success.main' : 'grey.400',
    }),
    adCard: (isSelected: boolean) => ({
      p: 1.5,
      borderRadius: 1.5,
      border: '1px solid',
      borderColor: isSelected
        ? 'primary.main'
        : isDark ? alpha(theme.palette.common.white, 0.08) : 'divider',
      bgcolor: isSelected
        ? alpha(theme.palette.primary.main, isDark ? 0.1 : 0.04)
        : 'background.paper',
      transition: 'all 0.15s ease',
      '&:hover': {
        borderColor: isSelected ? 'primary.main' : isDark ? alpha(theme.palette.common.white, 0.15) : 'grey.400',
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
      },
    }),
  };
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CampaignViewPage() {
  const { id: productId, campaignId } = useParams<{ id: string; campaignId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CampaignViewTab>('manage');
  const [overrideProfileId, setOverrideProfileId] = useState<string | null>(null);

  // Fetch campaign from Airtable
  const campaignQuery = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => getCampaign(campaignId!),
    enabled: !!campaignId,
  });

  const campaign = campaignQuery.data;

  // Get profiles for access token
  const { profiles, isLoading: profilesLoading } = useProfilesController();

  // Determine active profile
  const activeProfileId = overrideProfileId ?? campaign?.launchProfileId;
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const accessToken = activeProfile?.permanentToken;

  // Fetch Facebook campaign data
  const fbData = useFacebookCampaign(campaign?.fbCampaignId, accessToken);

  // Loading state
  if (campaignQuery.isLoading || profilesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // No campaign found
  if (!campaign) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">Campaign not found</Typography>
        <Button onClick={() => navigate('/ops/products')} sx={{ mt: 2 }}>
          Back to Products
        </Button>
      </Box>
    );
  }

  // No FB Campaign ID
  if (!campaign.fbCampaignId) {
    return (
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton
            onClick={() => navigate(productId ? `/ops/products/${productId}` : '/ops/products')}
            sx={{ bgcolor: 'action.hover' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {campaign.name}
          </Typography>
        </Box>
        <Alert severity="info">
          This campaign has not been launched yet. No Facebook campaign data available.
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate(`/ops/products/${productId}/campaigns/${campaignId}/launch`)}
          sx={{ mt: 2 }}
        >
          Launch Campaign
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <IconButton
          onClick={() => navigate(productId ? `/ops/products/${productId}` : '/ops/products')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {campaign.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            FB Campaign: {campaign.fbCampaignId}
          </Typography>
        </Box>

        {/* Profile Selector */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Profile</InputLabel>
          <Select
            value={activeProfileId ?? ''}
            label="Profile"
            onChange={(e) => setOverrideProfileId(e.target.value || null)}
          >
            {profiles.map((profile) => (
              <MenuItem key={profile.id} value={profile.id}>
                {profile.profileName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <IconButton onClick={() => fbData.refetch()} disabled={fbData.isLoading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Box sx={{ mb: 2 }}>
        <ToggleTabs
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'manage', label: 'Manage' },
            { value: 'redtrack-data', label: 'RedTrack Data' },
            { value: 'launch-data', label: 'Launch Data' },
          ]}
          size="small"
        />
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'manage' && (
          <ManageTab
            campaign={campaign}
            fbData={fbData}
            accessToken={accessToken}
            adAccountId={campaign.fbAdAccountId}
          />
        )}
        {activeTab === 'redtrack-data' && (
          <RedTrackDataTab redtrackCampaignId={campaign.redtrackCampaignId} />
        )}
        {activeTab === 'launch-data' && (
          <LaunchDataTab campaign={campaign} />
        )}
      </Box>
    </Box>
  );
}

// =============================================================================
// LAUNCH DATA TAB (Read-only) — Redesigned Layout
// =============================================================================

type ContentSection = 'utms' | 'texts' | 'headlines' | 'descriptions';

interface LaunchDataTabProps {
  campaign: Campaign;
}

function LaunchDataTab({ campaign }: LaunchDataTabProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [activeSection, setActiveSection] = useState<ContentSection>('utms');
  const [showAdIds, setShowAdIds] = useState(false);
  const [showRefs, setShowRefs] = useState(false);

  // Parse launched data JSON
  let snapshot: import('../../../../features/campaigns/launch/types').LaunchSnapshot | null = null;
  if (campaign.launchedData) {
    try {
      snapshot = JSON.parse(campaign.launchedData);
    } catch {
      // Invalid JSON — fall through to null guard
    }
  }

  if (!snapshot) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No launch snapshot data available.
      </Alert>
    );
  }

  const { config, facebook, profile, adPreset, media, result } = snapshot;

  // Determine result status
  const resultStatus = result.success ? 'success' : result.partialSuccess ? 'partial' : 'failed';
  const chipColor = resultStatus === 'success' ? 'success' : resultStatus === 'partial' ? 'warning' : 'error';
  const chipLabel = resultStatus === 'success' ? 'Success' : resultStatus === 'partial' ? 'Partial' : 'Failed';

  const allFailed = [...media.videos.failed, ...media.images.failed];

  // Build content sections for the accordion
  const contentSections: { key: ContentSection; label: string; count?: number }[] = [];
  if (config.utms) contentSections.push({ key: 'utms', label: 'UTMs' });
  if (adPreset?.primaryTexts?.length) contentSections.push({ key: 'texts', label: 'Primary Texts', count: adPreset.primaryTexts.length });
  if (adPreset?.headlines?.length) contentSections.push({ key: 'headlines', label: 'Headlines', count: adPreset.headlines.length });
  if (adPreset?.descriptions?.length) contentSections.push({ key: 'descriptions', label: 'Descriptions', count: adPreset.descriptions.length });

  // Striped row styling
  const stripedRow = (index: number) => ({
    display: 'flex',
    gap: 2,
    px: 2,
    py: 1,
    bgcolor: index % 2 === 0 ? 'transparent' : (isDark ? alpha(theme.palette.common.white, 0.02) : alpha(theme.palette.common.black, 0.015)),
  });

  const sectionHeader = {
    display: 'block',
    px: 2,
    py: 1,
    color: '#fff',
    bgcolor: theme.palette.primary.main,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    fontWeight: 600,
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* 1. Result Banner */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderLeft: 4,
          borderLeftColor: `${chipColor}.main`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={chipLabel} color={chipColor as 'success' | 'warning' | 'error'} size="small" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {result.adsCreated}/{result.adsAttempted} ads created
          </Typography>
          {profile.name && (
            <Typography variant="body2" color="text.secondary">
              Profile: {profile.name}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {new Date(snapshot.launchedAt).toLocaleString()}
          </Typography>
        </Box>
        {result.errors.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            {result.errors.map((err, i) => (
              <Typography key={i} variant="caption" color="error.main" sx={{ display: 'block' }}>
                {err.mediaName}: {err.message} ({err.stage})
              </Typography>
            ))}
          </Box>
        )}
      </Paper>

      {/* 2. Two-column grid: Campaign & Ad Set (left) + Ad Settings (right) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
        {/* Left Column — Campaign + Ad Set */}
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Typography variant="caption" sx={sectionHeader}>Campaign</Typography>
          {[
            ['Name', config.campaignName],
            ['Budget', `$${(config.budgetCents / 100).toFixed(2)}/day`],
            ['Status', config.launchStatus],
            ['Campaign ID', facebook.campaignId || 'N/A'],
          ].map(([label, value], i) => (
            <Box key={label} sx={stripedRow(i)}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, maxWidth: 120, flexShrink: 0 }}>{label}</Typography>
              {label === 'Status' ? (
                <Chip label={value} color={value === 'ACTIVE' ? 'success' : 'default'} size="small" />
              ) : (
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{value}</Typography>
              )}
            </Box>
          ))}
          <Divider />
          <Typography variant="caption" sx={sectionHeader}>Ad Set</Typography>
          {[
            ['Ad Set ID', facebook.adSetId || 'N/A'],
            ['Targeting', config.geo.length > 0 ? config.geo.join(', ') : 'N/A'],
            ['Pixel ID', facebook.pixelId || 'N/A'],
            ['Start Date', config.startDate || 'N/A'],
            ['Start Time', config.startTime || 'N/A'],
            ['Website URL', config.websiteUrl || 'N/A'],
          ].map(([label, value], i) => (
            <Box key={label} sx={stripedRow(i)}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, maxWidth: 120, flexShrink: 0 }}>{label}</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{value}</Typography>
            </Box>
          ))}
        </Paper>

        {/* Right Column — Ad Settings */}
        <Paper variant="outlined" sx={{ overflow: 'hidden', alignSelf: 'start' }}>
          <Typography variant="caption" sx={sectionHeader}>Ad Settings</Typography>
          {[
            ['Preset', adPreset?.name || 'N/A'],
            ['CTA', adPreset?.callToAction || config.ctaOverride || 'N/A'],
            ['Display Link', config.displayLink || 'N/A'],
          ].map(([label, value], i) => (
            <Box key={label} sx={stripedRow(i)}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, maxWidth: 120, flexShrink: 0 }}>{label}</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{value}</Typography>
            </Box>
          ))}

          {/* Content Section Tabs */}
          {contentSections.length > 0 && (
            <>
              <Divider />
              <Box sx={{ display: 'inline-flex', gap: '2px', p: '3px', bgcolor: isDark ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.04), borderRadius: '8px', mx: 2, my: 1.5 }}>
                {contentSections.map((section) => {
                  const isActive = activeSection === section.key;
                  return (
                    <ButtonBase
                      key={section.key}
                      onClick={() => { if (!isActive) setActiveSection(section.key); }}
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        minHeight: 30,
                        borderRadius: '6px',
                        fontWeight: isActive ? 600 : 500,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        ...(isActive ? {
                          bgcolor: theme.palette.primary.main,
                          color: '#fff',
                          boxShadow: `0 1px 3px ${alpha(theme.palette.primary.main, 0.3)}`,
                        } : {
                          bgcolor: 'transparent',
                          color: 'text.secondary',
                          '&:hover': {
                            bgcolor: isDark
                              ? alpha(theme.palette.common.white, 0.06)
                              : alpha(theme.palette.primary.main, 0.04),
                            color: isDark ? 'text.primary' : theme.palette.primary.main,
                          },
                        }),
                      }}
                    >
                      {section.label}{section.count !== undefined ? ` (${section.count})` : ''}
                    </ButtonBase>
                  );
                })}
              </Box>

              {/* Active Section Content */}
              <Collapse in>
                <Box sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                  {activeSection === 'utms' && config.utms && (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {config.utms}
                    </Typography>
                  )}
                  {activeSection === 'texts' && adPreset?.primaryTexts?.map((text, i) => (
                    <Typography key={i} variant="body2" sx={{ mb: 1.5 }}>
                      <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary', mr: 1 }}>{i + 1}.</Box>
                      {text}
                    </Typography>
                  ))}
                  {activeSection === 'headlines' && adPreset?.headlines?.map((text, i) => (
                    <Typography key={i} variant="body2" sx={{ mb: 0.75 }}>
                      <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary', mr: 1 }}>{i + 1}.</Box>
                      {text}
                    </Typography>
                  ))}
                  {activeSection === 'descriptions' && adPreset?.descriptions?.map((text, i) => (
                    <Typography key={i} variant="body2" sx={{ mb: 0.75 }}>
                      <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary', mr: 1 }}>{i + 1}.</Box>
                      {text}
                    </Typography>
                  ))}
                </Box>
              </Collapse>
            </>
          )}
        </Paper>
      </Box>

      {/* 3. Creatives */}
      {(media.videos.succeeded.length > 0 || media.images.succeeded.length > 0 || allFailed.length > 0) && (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Typography variant="caption" sx={sectionHeader}>
            Creatives
          </Typography>
          <Box sx={{ p: 2 }}>
            {/* Side-by-side Videos + Images */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: (media.videos.succeeded.length > 0 && media.images.succeeded.length > 0) ? { xs: '1fr', md: '1fr 1fr' } : '1fr',
              gap: 3,
            }}>
              {/* Videos */}
              {media.videos.succeeded.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    Videos ({media.videos.succeeded.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {media.videos.succeeded.map((v) => (
                      <Typography key={v.localId} variant="body2" sx={{ py: 0.25 }}>
                        {v.name}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Images */}
              {media.images.succeeded.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    Images ({media.images.succeeded.length})
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1.5 }}>
                    {media.images.succeeded.map((img) => (
                      <Box key={img.localId} sx={{ textAlign: 'center' }}>
                        <MediaThumb src={img.imageUrl} alt={img.name} fallbackLabel="No preview" isDark={isDark} />
                        <Typography variant="caption" noWrap sx={{ display: 'block', mt: 0.5, px: 0.5 }}>{img.name}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            {/* Failed Media */}
            {allFailed.length > 0 && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: isDark ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.error.main, 0.04), borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main', display: 'block', mb: 0.5 }}>
                  Failed ({allFailed.length})
                </Typography>
                {allFailed.map((f, i) => (
                  <Typography key={i} variant="caption" color="error.main" sx={{ display: 'block' }}>
                    {f.name} — {f.error} ({f.failedAt})
                  </Typography>
                ))}
              </Box>
            )}

            {media.videos.succeeded.length === 0 && media.images.succeeded.length === 0 && allFailed.length === 0 && (
              <Typography color="text.secondary" variant="body2">No media data recorded.</Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* 4. Reference IDs — Compact collapsible footer */}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box
          onClick={() => setShowRefs(!showRefs)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            cursor: 'pointer',
            bgcolor: theme.palette.primary.main,
            color: '#fff',
            '&:hover': { bgcolor: theme.palette.primary.dark },
          }}
        >
          {showRefs ? <ExpandMoreIcon sx={{ fontSize: 18, color: '#fff' }} /> : <ChevronRightIcon sx={{ fontSize: 18, color: '#fff' }} />}
          <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, color: '#fff' }}>
            Reference IDs
          </Typography>
          {!showRefs && (
            <Box sx={{ display: 'flex', gap: 1, ml: 1, flexWrap: 'wrap' }}>
              {[
                facebook.campaignId && `Campaign: ${facebook.campaignId}`,
                facebook.adSetId && `Ad Set: ${facebook.adSetId}`,
              ].filter(Boolean).map((text, i) => (
                <Chip key={i} label={text} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6875rem', color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.3)' }} />
              ))}
            </Box>
          )}
        </Box>
        <Collapse in={showRefs}>
          <Divider />
          {[
            ['Ad Account', facebook.adAccountId],
            ['Page', facebook.pageId],
            ['Pixel', facebook.pixelId],
            ['Campaign ID', facebook.campaignId],
            ['Ad Set ID', facebook.adSetId],
            ['RedTrack ID', snapshot.redtrack?.campaignId],
            ['Profile ID', profile.id],
          ].map(([label, value], i) => (
            <Box key={label} sx={stripedRow(i)}>
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, maxWidth: 120, flexShrink: 0 }}>{label}</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{value || 'N/A'}</Typography>
            </Box>
          ))}

          {/* Ad IDs */}
          {facebook.adIds.length > 0 && (
            <>
              <Divider />
              <Box
                onClick={() => setShowAdIds(!showAdIds)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1,
                  cursor: 'pointer',
                  bgcolor: theme.palette.primary.main,
                  color: '#fff',
                  '&:hover': { bgcolor: theme.palette.primary.dark },
                }}
              >
                {showAdIds ? <ExpandMoreIcon sx={{ fontSize: 16, color: '#fff' }} /> : <ChevronRightIcon sx={{ fontSize: 16, color: '#fff' }} />}
                <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff' }}>
                  Ad IDs ({facebook.adIds.length})
                </Typography>
              </Box>
              <Collapse in={showAdIds}>
                <Box sx={{ px: 2, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {facebook.adIds.map((adId, i) => (
                    <Typography key={i} variant="body2" color="text.secondary">
                      {adId}
                    </Typography>
                  ))}
                </Box>
              </Collapse>
            </>
          )}
        </Collapse>
      </Paper>
    </Box>
  );
}

// =============================================================================
// REDTRACK DATA TAB
// =============================================================================

interface RedTrackDataTabProps {
  redtrackCampaignId?: string;
}

function RedTrackDataTab({ redtrackCampaignId }: RedTrackDataTabProps) {
  const theme = useTheme();
  const [showExpanded, setShowExpanded] = useState(false);

  // Use React Query for data fetching - handles caching and deduplication
  const reportQuery = useQuery({
    queryKey: ['redtrack-report', redtrackCampaignId],
    queryFn: async () => {
      if (!REDTRACK_API_KEY) throw new Error('RedTrack API key not configured');

      // Get last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];

      const report = await fetchRedtrackReport(REDTRACK_API_KEY, {
        campaignId: redtrackCampaignId!,
        dateFrom,
        dateTo,
        group: 'date',
      });

      // Sort by date descending (newest first)
      report.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return b.date.localeCompare(a.date);
      });

      return report;
    },
    enabled: !!redtrackCampaignId && !!REDTRACK_API_KEY,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  if (!redtrackCampaignId) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No RedTrack campaign linked. Link a RedTrack campaign to view tracking data.
      </Alert>
    );
  }

  if (!REDTRACK_API_KEY) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        RedTrack API key not configured.
      </Alert>
    );
  }

  if (reportQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (reportQuery.isError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {reportQuery.error instanceof Error ? reportQuery.error.message : 'Failed to load RedTrack data'}
      </Alert>
    );
  }

  const data = reportQuery.data || [];

  if (data.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No data available for the last 30 days.
      </Alert>
    );
  }

  // Calculate totals
  const totals = data.reduce(
    (acc, row) => ({
      cost: acc.cost + row.cost,
      conversions: acc.conversions + row.conversions,
      revenue: acc.revenue + row.revenue,
      clicks: acc.clicks + row.clicks,
      lp_clicks: acc.lp_clicks + row.lp_clicks,
    }),
    { cost: 0, conversions: 0, revenue: 0, clicks: 0, lp_clicks: 0 }
  );

  const totalRoas = totals.cost > 0 ? totals.revenue / totals.cost : 0;
  const totalRoi = totals.cost > 0 ? ((totals.revenue - totals.cost) / totals.cost) * 100 : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Total Cost</Typography>
          <Typography variant="h5">${totals.cost.toFixed(2)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Purchases</Typography>
          <Typography variant="h5">{totals.conversions}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Revenue</Typography>
          <Typography variant="h5">${totals.revenue.toFixed(2)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>ROAS</Typography>
          <Typography variant="h5">{totalRoas.toFixed(2)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>ROI</Typography>
          <Typography variant="h5">{totalRoi.toFixed(1)}%</Typography>
        </Paper>
      </Box>

      {/* Expand/Collapse Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          onClick={() => setShowExpanded(!showExpanded)}
          startIcon={showExpanded ? <ExpandMoreIcon /> : <AddIcon />}
        >
          {showExpanded ? 'Show Less Columns' : 'Show More Columns'}
        </Button>
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ '& .MuiTableCell-head': { bgcolor: theme.palette.primary.main, color: '#fff' } }}>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Cost</TableCell>
              <TableCell align="right">Purchase</TableCell>
              <TableCell align="right">Revenue</TableCell>
              <TableCell align="right">ROAS</TableCell>
              <TableCell align="right">ROI</TableCell>
              {showExpanded && (
                <>
                  <TableCell align="right">CPA</TableCell>
                  <TableCell align="right">AOV</TableCell>
                  <TableCell align="right">EPC</TableCell>
                  <TableCell align="right">Clicks</TableCell>
                  <TableCell align="right">LP Clicks</TableCell>
                  <TableCell align="right">LP CTR</TableCell>
                  <TableCell align="right">CR</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={row.date || index}>
                <TableCell>{row.date || '-'}</TableCell>
                <TableCell align="right">${row.cost.toFixed(2)}</TableCell>
                <TableCell align="right">{row.conversions}</TableCell>
                <TableCell align="right">${row.revenue.toFixed(2)}</TableCell>
                <TableCell align="right">{row.roas.toFixed(2)}</TableCell>
                <TableCell align="right">{(row.roi * 100).toFixed(2)}%</TableCell>
                {showExpanded && (
                  <>
                    <TableCell align="right">${row.cpa.toFixed(2)}</TableCell>
                    <TableCell align="right">${row.aov.toFixed(2)}</TableCell>
                    <TableCell align="right">${row.epc.toFixed(4)}</TableCell>
                    <TableCell align="right">{row.clicks}</TableCell>
                    <TableCell align="right">{row.lp_clicks}</TableCell>
                    <TableCell align="right">{(row.lp_ctr * 100).toFixed(2)}%</TableCell>
                    <TableCell align="right">{(row.cr * 100).toFixed(2)}%</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// =============================================================================
// MANAGE TAB
// =============================================================================

interface ManageTabProps {
  campaign: Campaign;
  fbData: ReturnType<typeof useFacebookCampaign>;
  accessToken: string | undefined;
  adAccountId: string | undefined;
}

function ManageTab({ campaign, fbData, accessToken, adAccountId }: ManageTabProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const isDark = theme.palette.mode === 'dark';
  const queryClient = useQueryClient();

  // Local UI state
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState<string>('');
  const [budgetDirty, setBudgetDirty] = useState(false);

  // Modal state
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [addAdsOpen, setAddAdsOpen] = useState<{ adSetId: string; templateCreativeId: string } | null>(null);

  if (fbData.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (fbData.isError || !fbData.data) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Cannot manage campaign - failed to load Facebook data. Try selecting a different profile.
      </Alert>
    );
  }

  const { campaign: fbCampaign, adSets, ads } = fbData.data;

  // Initialize budget value from FB data
  if (!budgetDirty && fbCampaign.daily_budget) {
    const currentBudget = (parseInt(fbCampaign.daily_budget) / 100).toFixed(2);
    if (budgetValue !== currentBudget) {
      setBudgetValue(currentBudget);
    }
  }

  // Handlers
  const handleCampaignStatusToggle = async () => {
    if (!accessToken || isUpdating) return;
    const newStatus = fbCampaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setIsUpdating('campaign-status');
    try {
      await updateFbCampaignStatus(campaign.fbCampaignId!, newStatus, accessToken);

      // Sync to Airtable
      // PAUSED -> Cancelled
      // ACTIVE -> Launched
      const airtableStatus = newStatus === 'PAUSED' ? 'Cancelled' : 'Launched';
      await updateCampaignStatus(campaign.id, airtableStatus);

      queryClient.invalidateQueries({ queryKey: ['fb-campaign'] });
      // Invalidate campaign query to reflect Airtable status change
      queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleBudgetSave = async () => {
    if (!accessToken || !budgetValue || isUpdating) return;
    const budgetCents = Math.round(parseFloat(budgetValue) * 100);
    if (isNaN(budgetCents) || budgetCents <= 0) return;
    setIsUpdating('campaign-budget');
    try {
      await updateFbCampaignBudget(campaign.fbCampaignId!, budgetCents, accessToken);
      setBudgetDirty(false);
      queryClient.invalidateQueries({ queryKey: ['fb-campaign'] });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleAdSetStatusToggle = async (adSet: FbAdSet) => {
    if (!accessToken || isUpdating) return;
    const newStatus = adSet.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setIsUpdating(`adset-${adSet.id}`);
    try {
      await updateFbAdSetStatus(adSet.id, newStatus, accessToken);
      queryClient.invalidateQueries({ queryKey: ['fb-campaign'] });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleAdStatusToggle = async (ad: FbAd) => {
    if (!accessToken || isUpdating) return;
    const newStatus = ad.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setIsUpdating(`ad-${ad.id}`);
    try {
      await updateFbAdStatus(ad.id, newStatus, accessToken);
      queryClient.invalidateQueries({ queryKey: ['fb-campaign'] });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteAd = async (ad: FbAd) => {
    if (!accessToken || isUpdating) return;
    if (!window.confirm(`Delete ad "${ad.name}"?`)) return;
    setIsUpdating(`ad-${ad.id}`);
    try {
      await deleteFbAd(ad.id, accessToken);
      setSelectedAds((prev) => {
        const next = new Set(prev);
        next.delete(ad.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['fb-campaign'] });
    } finally {
      setIsUpdating(null);
    }
  };

  const handlePreviewAd = (adId: string) => {
    window.open(`https://www.facebook.com/ads/manager/creative_hub/preview/?ad_id=${adId}`, '_blank');
  };

  const toggleAdSetExpand = (adSetId: string) => {
    setExpandedAdSets((prev) => {
      const next = new Set(prev);
      if (next.has(adSetId)) {
        next.delete(adSetId);
      } else {
        next.add(adSetId);
      }
      return next;
    });
  };

  const toggleAdSelection = (adId: string) => {
    setSelectedAds((prev) => {
      const next = new Set(prev);
      if (next.has(adId)) {
        next.delete(adId);
      } else {
        next.add(adId);
      }
      return next;
    });
  };

  const toggleAdSetSelection = (adSetId: string, select: boolean) => {
    const adSetAds = ads.filter((ad) => ad.adset_id === adSetId);
    setSelectedAds((prev) => {
      const next = new Set(prev);
      adSetAds.forEach((ad) => {
        if (select) {
          next.add(ad.id);
        } else {
          next.delete(ad.id);
        }
      });
      return next;
    });
  };

  const getSelectedAdsForAdSet = (adSetId: string) => {
    const adSetAds = ads.filter((ad) => ad.adset_id === adSetId);
    return adSetAds.filter((ad) => selectedAds.has(ad.id));
  };

  const selectedAdsList = ads.filter((ad) => selectedAds.has(ad.id));

  // Count active/paused ads per ad set for quick summary
  const activeAdCount = ads.filter((ad) => ad.status === 'ACTIVE').length;
  const pausedAdCount = ads.filter((ad) => ad.status === 'PAUSED').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Bulk Actions Bar */}
      {selectedAds.size > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.06),
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, isDark ? 0.25 : 0.2),
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
            <strong>{selectedAds.size}</strong> ad{selectedAds.size > 1 ? 's' : ''} selected
          </Typography>
          <Button variant="outlined" size="small" onClick={() => setSelectedAds(new Set())}>
            Clear
          </Button>
          <Button variant="contained" size="small" onClick={() => setBulkEditOpen(true)}>
            Bulk Edit
          </Button>
        </Paper>
      )}

      {/* Campaign Card - visually distinct as the parent level */}
      <Paper
        elevation={0}
        sx={{
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            borderLeft: '3px solid',
            borderLeftColor: fbCampaign.status === 'ACTIVE' ? 'success.main' : 'grey.400',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
              {fbCampaign.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {adSets.length} ad set{adSets.length !== 1 ? 's' : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {ads.length} ad{ads.length !== 1 ? 's' : ''}
              </Typography>
              {activeAdCount > 0 && (
                <Chip
                  label={`${activeAdCount} active`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.success.main, isDark ? 0.15 : 0.08),
                    color: 'success.main',
                  }}
                />
              )}
              {pausedAdCount > 0 && (
                <Chip
                  label={`${pausedAdCount} paused`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    bgcolor: isDark ? alpha(theme.palette.common.white, 0.06) : 'grey.100',
                    color: 'text.secondary',
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Budget Input */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.75,
              borderRadius: 1.5,
              bgcolor: isDark ? alpha(theme.palette.common.white, 0.04) : 'grey.50',
              border: '1px solid',
              borderColor: isDark ? alpha(theme.palette.common.white, 0.08) : 'divider',
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>$</Typography>
            <TextField
              size="small"
              value={budgetValue}
              onChange={(e) => {
                setBudgetValue(e.target.value);
                setBudgetDirty(true);
              }}
              onBlur={handleBudgetSave}
              onKeyDown={(e) => e.key === 'Enter' && handleBudgetSave()}
              sx={{
                width: 70,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'transparent',
                  '& fieldset': { border: 'none' },
                },
                '& .MuiOutlinedInput-input': {
                  textAlign: 'right',
                  py: 0,
                  px: 0.5,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                },
              }}
              disabled={isUpdating === 'campaign-budget'}
            />
            <Typography variant="caption" color="text.secondary">/day</Typography>
          </Box>

          {/* Status Toggle */}
          <StatusTogglePill
            styles={styles}
            status={fbCampaign.status}
            onClick={handleCampaignStatusToggle}
            disabled={isUpdating === 'campaign-status'}
          />
        </Box>
      </Paper>

      {/* Ad Sets */}
      {adSets.map((adSet) => {
        const adSetAds = ads.filter((ad) => ad.adset_id === adSet.id);
        const isExpanded = expandedAdSets.has(adSet.id);
        const selectedInSet = getSelectedAdsForAdSet(adSet.id);
        const allSelected = adSetAds.length > 0 && selectedInSet.length === adSetAds.length;
        const activeInSet = adSetAds.filter((a) => a.status === 'ACTIVE').length;

        return (
          <Paper
            key={adSet.id}
            elevation={0}
            sx={{
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              ...(isExpanded && {
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.06)',
              }),
              transition: 'box-shadow 0.15s ease',
            }}
          >
            {/* Ad Set Header */}
            <Box
              sx={{
                px: 2.5,
                py: 1.75,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => toggleAdSetExpand(adSet.id)}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  bgcolor: isDark ? alpha(theme.palette.common.white, 0.06) : 'grey.100',
                  transition: 'transform 0.15s ease',
                  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                }}
              >
                <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{adSet.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    {adSetAds.length} ad{adSetAds.length !== 1 ? 's' : ''}
                  </Typography>
                  {activeInSet > 0 && (
                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 500 }}>
                      {activeInSet} active
                    </Typography>
                  )}
                  {selectedInSet.length > 0 && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 500 }}>
                      {selectedInSet.length} selected
                    </Typography>
                  )}
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {formatBudget(adSet.daily_budget, adSet.lifetime_budget)}
              </Typography>

              <Box onClick={(e) => e.stopPropagation()}>
                <StatusTogglePill
                  styles={styles}
                  status={adSet.status}
                  onClick={() => handleAdSetStatusToggle(adSet)}
                  disabled={isUpdating === `adset-${adSet.id}`}
                  size="small"
                />
              </Box>
            </Box>

            {/* Expanded Content */}
            <Collapse in={isExpanded}>
              <Box
                sx={{
                  px: 2.5,
                  pb: 2.5,
                  pt: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: isDark ? alpha(theme.palette.common.white, 0.02) : 'grey.50',
                }}
              >
                {/* Ad Set Toolbar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={selectedInSet.length > 0 && !allSelected}
                    onChange={(e) => toggleAdSetSelection(adSet.id, e.target.checked)}
                    sx={{ p: 0.5 }}
                  />
                  <Typography variant="caption" color="text.secondary">Select All</Typography>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const templateAd = adSetAds[0];
                      if (templateAd?.creative?.id) {
                        setAddAdsOpen({ adSetId: adSet.id, templateCreativeId: templateAd.creative.id });
                      } else {
                        alert('No template ad found in this ad set');
                      }
                    }}
                    disabled={adSetAds.length === 0}
                  >
                    Add Ads
                  </Button>
                </Box>

                {/* Ads Grid */}
                {adSetAds.length === 0 ? (
                  <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>
                    No ads in this ad set
                  </Typography>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                    {adSetAds.map((ad) => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
                        styles={styles}
                        isSelected={selectedAds.has(ad.id)}
                        isUpdating={isUpdating === `ad-${ad.id}`}
                        onSelect={() => toggleAdSelection(ad.id)}
                        onStatusToggle={() => handleAdStatusToggle(ad)}
                        onPreview={() => handlePreviewAd(ad.id)}
                        onDelete={() => handleDeleteAd(ad)}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Collapse>
          </Paper>
        );
      })}

      {/* Bulk Edit Modal */}
      {bulkEditOpen && accessToken && adAccountId && (
        <BulkEditModal
          open={bulkEditOpen}
          onClose={() => setBulkEditOpen(false)}
          selectedAds={selectedAdsList}
          campaignId={campaign.fbCampaignId!}
          adAccountId={adAccountId}
          accessToken={accessToken}
          onSuccess={() => {
            setSelectedAds(new Set());
            queryClient.invalidateQueries({ queryKey: ['fb-campaign'] });
          }}
        />
      )}

      {/* Add Ads Modal */}
      {addAdsOpen && accessToken && adAccountId && (
        <AddAdsModal
          open={!!addAdsOpen}
          onClose={() => setAddAdsOpen(null)}
          adSetId={addAdsOpen.adSetId}
          templateCreativeId={addAdsOpen.templateCreativeId}
          campaignRecord={campaign}
          adAccountId={adAccountId}
          accessToken={accessToken}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['fb-campaign'] });
          }}
        />
      )}
    </Box>
  );
}

// =============================================================================
// STATUS TOGGLE PILL
// =============================================================================

interface StatusTogglePillProps {
  styles: ReturnType<typeof createStyles>;
  status: string;
  onClick: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

function StatusTogglePill({ styles, status, onClick, disabled, size = 'medium' }: StatusTogglePillProps) {
  const isActive = status === 'ACTIVE';

  return (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      sx={{
        ...styles.statusPill(isActive),
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        py: size === 'small' ? 0.25 : 0.5,
        px: size === 'small' ? 1 : 1.5,
      }}
    >
      <Box sx={styles.statusDot(isActive)} />
      <Typography
        variant={size === 'small' ? 'caption' : 'body2'}
        sx={{ fontWeight: 500, color: isActive ? 'success.dark' : 'text.secondary' }}
      >
        {status}
      </Typography>
    </Box>
  );
}

// =============================================================================
// AD CARD
// =============================================================================

interface AdCardProps {
  ad: FbAd;
  styles: ReturnType<typeof createStyles>;
  isSelected: boolean;
  isUpdating: boolean;
  onSelect: () => void;
  onStatusToggle: () => void;
  onPreview: () => void;
  onDelete: () => void;
}

function AdCard({ ad, styles, isSelected, isUpdating, onSelect, onStatusToggle, onPreview, onDelete }: AdCardProps) {
  return (
    <Box sx={styles.adCard(isSelected)}>
      {/* Header row: checkbox + status */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Checkbox
          size="small"
          checked={isSelected}
          onChange={onSelect}
          sx={{ p: 0 }}
        />
        <StatusTogglePill
          styles={styles}
          status={ad.status}
          onClick={onStatusToggle}
          disabled={isUpdating}
          size="small"
        />
      </Box>

      {/* Thumbnail - 16:9 aspect ratio */}
      {ad.creative?.thumbnail_url ? (
        <Box
          component="img"
          src={ad.creative.thumbnail_url}
          alt={ad.name}
          sx={{
            width: '100%',
            aspectRatio: '16/9',
            objectFit: 'cover',
            borderRadius: 1.5,
            mb: 1.5,
            display: 'block',
          }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            aspectRatio: '16/9',
            bgcolor: (t) => t.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
            borderRadius: 1.5,
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">No preview</Typography>
        </Box>
      )}

      {/* Name */}
      <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 500, mb: 1 }}>
        {ad.name}
      </Typography>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <IconButton size="small" onClick={onPreview} title="Preview" sx={{ p: 0.5 }}>
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onDelete} disabled={isUpdating} title="Delete" color="error" sx={{ p: 0.5 }}>
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

// =============================================================================
// BULK EDIT MODAL
// =============================================================================

interface BulkEditModalProps {
  open: boolean;
  onClose: () => void;
  selectedAds: FbAd[];
  campaignId: string;
  adAccountId: string;
  accessToken: string;
  onSuccess: () => void;
}

function BulkEditModal({ open, onClose, selectedAds, campaignId, adAccountId, accessToken, onSuccess }: BulkEditModalProps) {
  const [urls, setUrls] = useState('');
  const [names, setNames] = useState('');
  const [utm, setUtm] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const urlList = urls.split('\n').map((u) => u.trim()).filter(Boolean);
    let nameList = names.split('\n').map((n) => n.trim());

    if (urlList.length !== selectedAds.length) {
      setError(`Please enter exactly ${selectedAds.length} URLs (you entered ${urlList.length})`);
      return;
    }

    // Auto-generate names from URLs if not provided
    if (nameList.filter(Boolean).length === 0) {
      nameList = urlList.map((url) => extractFilenameFromUrl(url));
    }

    // Ensure names match URLs
    while (nameList.length < urlList.length) {
      nameList.push(extractFilenameFromUrl(urlList[nameList.length]));
    }

    setError(null);
    setProgress({ current: 0, total: selectedAds.length, message: 'Starting...' });

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < selectedAds.length; i++) {
      const ad = selectedAds[i];
      const rawUrl = urlList[i];
      const name = nameList[i] || extractFilenameFromUrl(rawUrl);
      const directUrl = convertToDirectUrl(rawUrl);

      setProgress({ current: i + 1, total: selectedAds.length, message: `Processing ${i + 1}/${selectedAds.length}: ${name}` });

      try {
        await swapAdCreative({
          adAccountId,
          adSetId: ad.adset_id,
          templateCreativeId: ad.creative?.id || '',
          videoUrl: directUrl,
          name,
          utm: utm || undefined,
          accessToken,
        });
        successCount++;
      } catch (err) {
        errors.push(`${ad.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    setProgress(null);

    if (errors.length > 0) {
      setError(`Completed with ${errors.length} error(s):\n${errors.join('\n')}`);
    } else {
      alert(`Successfully updated ${successCount} ads!`);
      onSuccess();
      onClose();
    }
  };

  const autoNames = urls.split('\n').map((u) => u.trim()).filter(Boolean).map((url) => extractFilenameFromUrl(url)).join('\n');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Bulk Edit {selectedAds.length} Ads</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Selected Ads:</Typography>
          <Box sx={{ maxHeight: 100, overflow: 'auto', bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
            {selectedAds.map((ad, i) => (
              <Typography key={ad.id} variant="caption" sx={{ display: 'block' }}>
                {i + 1}. {ad.name}
              </Typography>
            ))}
          </Box>
        </Box>

        <TextField
          label={`Video URLs (${selectedAds.length} required, one per line)`}
          multiline
          rows={6}
          fullWidth
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder="https://drive.google.com/file/d/.../view"
          sx={{ mb: 2 }}
          disabled={!!progress}
        />

        <TextField
          label="Ad Names (optional, one per line)"
          multiline
          rows={4}
          fullWidth
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder={autoNames || 'Auto-generated from URLs...'}
          sx={{ mb: 2 }}
          disabled={!!progress}
        />

        <TextField
          label="UTM Parameters (optional, applied to all)"
          fullWidth
          value={utm}
          onChange={(e) => setUtm(e.target.value)}
          placeholder="utm_source=facebook&utm_medium=paid"
          disabled={!!progress}
        />

        {progress && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>{progress.message}</Typography>
            <LinearProgress variant="determinate" value={(progress.current / progress.total) * 100} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{error}</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={!!progress}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!!progress || !urls.trim()}>
          {progress ? 'Processing...' : `Apply to All (${selectedAds.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}



// =============================================================================
// HELPER COMPONENTS
// =============================================================================

// =============================================================================
// MEDIA THUMBNAIL (handles broken image URLs gracefully)
// =============================================================================

function MediaThumb({ src, alt, fallbackLabel, isDark }: { src?: string; alt: string; fallbackLabel: string; isDark: boolean }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <Box
        sx={{
          width: '100%',
          height: 90,
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'grey.50',
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">{fallbackLabel}</Typography>
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      sx={{
        width: '100%',
        height: 90,
        objectFit: 'cover',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
      }}
    />
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatBudget(daily?: string, lifetime?: string): string {
  if (daily) {
    const dollars = parseInt(daily) / 100;
    return `$${dollars.toFixed(2)}/day`;
  }
  if (lifetime) {
    const dollars = parseInt(lifetime) / 100;
    return `$${dollars.toFixed(2)} lifetime`;
  }
  return 'No budget set';
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString();
}

// =============================================================================
// CREATIVE SWAP HELPER (used by BulkEditModal)
// =============================================================================

interface SwapAdCreativeParams {
  adAccountId: string;
  adSetId: string;
  templateCreativeId: string;
  videoUrl: string;
  name: string;
  utm?: string;
  accessToken: string;
}

async function swapAdCreative({
  adAccountId,
  adSetId,
  templateCreativeId,
  videoUrl,
  name,
  utm,
  accessToken,
}: SwapAdCreativeParams): Promise<{ adId: string; creativeId: string }> {
  // 1. Upload video
  const videoResult = await uploadFbVideo(adAccountId, videoUrl, name, accessToken);
  const videoId = videoResult.id;

  // 2. Wait for video to be ready
  let videoReady = false;
  let attempts = 0;
  while (!videoReady && attempts < 120) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const status = await getFbVideoStatus(videoId, accessToken);
    const videoStatus = status.status?.video_status;

    if (videoStatus === 'ready') {
      videoReady = true;
    } else if (videoStatus === 'error') {
      throw new Error('Video processing failed');
    }
    attempts++;
  }

  if (!videoReady) {
    throw new Error('Video processing timed out');
  }

  // 3. Get thumbnail
  const thumbnailUrl = await getFbVideoThumbnail(videoId, accessToken);
  if (!thumbnailUrl) {
    throw new Error('Could not get video thumbnail');
  }

  // 4. Get template creative
  const template = await getFbCreative(templateCreativeId, accessToken);

  // 5. Build new creative
  const creativeParams: Parameters<typeof createFbCreative>[1] = {
    name,
  };

  if (template.object_story_spec) {
    creativeParams.object_story_spec = {
      page_id: template.object_story_spec.page_id,
      instagram_user_id: template.object_story_spec.instagram_user_id,
      video_data: {
        video_id: videoId,
        image_url: thumbnailUrl,
        call_to_action: template.object_story_spec.video_data?.call_to_action,
      },
    };
  }

  if (template.asset_feed_spec) {
    creativeParams.asset_feed_spec = template.asset_feed_spec;
  }

  if (template.degrees_of_freedom_spec) {
    creativeParams.degrees_of_freedom_spec = {
      creative_features_spec: {
        advantage_plus_creative: { enroll_status: 'OPT_IN' },
      },
    };
  }

  if (utm) {
    creativeParams.url_tags = utm;
  } else if (template.url_tags) {
    creativeParams.url_tags = template.url_tags;
  }

  // 6. Create creative
  const newCreative = await createFbCreative(adAccountId, creativeParams, accessToken);

  // 7. Create ad
  const newAd = await createFbAd(
    adAccountId,
    {
      name,
      adset_id: adSetId,
      creative: { creative_id: newCreative.id },
      status: 'PAUSED',
    },
    accessToken
  );

  return { adId: newAd.id, creativeId: newCreative.id };
}

function convertToDirectUrl(url: string): string {
  if (url.includes('.r2.dev/') || url.includes('r2.cloudflarestorage.com')) {
    return url;
  }
  const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  return url;
}

function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || '';
    return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim() || 'Untitled';
  } catch {
    return 'Untitled';
  }
}

