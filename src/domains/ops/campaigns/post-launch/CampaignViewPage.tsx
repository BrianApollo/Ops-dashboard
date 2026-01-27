/**
 * CampaignViewPage - View and manage launched Facebook campaigns.
 * Route: /ops/products/:id/campaigns/:campaignId
 *
 * Tabs:
 * - Launch Data: Read-only view of campaign info and structure
 * - Manage: Interactive management with inline editing, bulk operations
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
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
import LinearProgress from '@mui/material/LinearProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
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
} from '../../../../features/campaigns';
import { useProfilesController } from '../../../../features/profiles';
import { fetchRedtrackReport, type RedTrackReportRow } from '../../../../features/redtrack';
import type { Campaign, FbAdSet, FbAd, FbCreative } from '../../../../features/campaigns';
import type { CampaignViewTab } from '../../products/composition/types';

// RedTrack API key from environment
const REDTRACK_API_KEY = import.meta.env.VITE_REDTRACK_API_KEY as string | undefined;

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  statusPill: (isActive: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1,
    px: 1.5,
    py: 0.5,
    borderRadius: '20px',
    bgcolor: isActive ? 'success.50' : 'grey.100',
    border: '1px solid',
    borderColor: isActive ? 'success.200' : 'grey.300',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      bgcolor: isActive ? 'success.100' : 'grey.200',
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
    borderRadius: 1,
    border: '2px solid',
    borderColor: isSelected ? 'primary.main' : 'grey.200',
    bgcolor: isSelected ? 'primary.50' : 'background.paper',
    cursor: 'pointer',
    transition: 'all 0.15s',
    '&:hover': {
      borderColor: isSelected ? 'primary.main' : 'grey.400',
    },
  }),
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
          <LaunchDataTab campaign={campaign} fbData={fbData} />
        )}
      </Box>
    </Box>
  );
}

// =============================================================================
// LAUNCH DATA TAB (Read-only)
// =============================================================================

interface LaunchDataTabProps {
  campaign: Campaign;
  fbData: ReturnType<typeof useFacebookCampaign>;
}

function LaunchDataTab({ campaign, fbData }: LaunchDataTabProps) {
  if (fbData.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (fbData.isError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load Facebook data: {fbData.error?.message}
        <br />
        Try selecting a different profile.
      </Alert>
    );
  }

  if (!fbData.data) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No Facebook data available. Select a profile to load campaign data.
      </Alert>
    );
  }

  const { campaign: fbCampaign, adSets, ads } = fbData.data;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Campaign Overview */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Campaign Overview
        </Typography>
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <InfoBox label="Name" value={fbCampaign.name} />
          <InfoBox
            label="Status"
            value={
              <Chip
                label={fbCampaign.status}
                color={fbCampaign.status === 'ACTIVE' ? 'success' : 'default'}
                size="small"
              />
            }
          />
          <InfoBox label="Budget" value={formatBudget(fbCampaign.daily_budget, fbCampaign.lifetime_budget)} />
          <InfoBox label="Objective" value={fbCampaign.objective} />
          <InfoBox label="Created" value={formatDate(fbCampaign.created_time)} />
        </Box>
      </Paper>

      {/* Campaign Info (Airtable) */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Campaign Info
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <InfoRow label="Airtable Campaign ID" value={campaign.id} />
          <InfoRow label="Facebook Campaign ID" value={campaign.fbCampaignId || 'N/A'} />
          <InfoRow label="Ad Account ID" value={campaign.fbAdAccountId || 'N/A'} />
          <InfoRow label="Launch Profile ID" value={campaign.launchProfileId || 'N/A'} />
          <InfoRow label="Product" value={campaign.product.name} />
        </Box>
      </Paper>

      {/* Ad Sets */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Ad Sets ({adSets.length})
        </Typography>
        {adSets.length === 0 ? (
          <Typography color="text.secondary">No ad sets found</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {adSets.map((adSet) => {
              const adSetAds = ads.filter((ad) => ad.adset_id === adSet.id);
              return (
                <Paper key={adSet.id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography sx={{ fontWeight: 500 }}>{adSet.name}</Typography>
                    <Chip
                      label={adSet.status}
                      color={adSet.status === 'ACTIVE' ? 'success' : 'default'}
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                      {formatBudget(adSet.daily_budget, adSet.lifetime_budget)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {adSetAds.map((ad) => (
                      <Paper key={ad.id} variant="outlined" sx={{ p: 1.5, width: 140, textAlign: 'center' }}>
                        {ad.creative?.thumbnail_url ? (
                          <Box
                            component="img"
                            src={ad.creative.thumbnail_url}
                            alt={ad.name}
                            sx={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 1, mb: 1 }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: '100%',
                              height: 80,
                              bgcolor: 'grey.100',
                              borderRadius: 1,
                              mb: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">No preview</Typography>
                          </Box>
                        )}
                        <Typography variant="caption" noWrap sx={{ display: 'block' }}>{ad.name}</Typography>
                        <Chip label={ad.status} color={ad.status === 'ACTIVE' ? 'success' : 'default'} size="small" sx={{ mt: 0.5 }} />
                      </Paper>
                    ))}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
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
      {/* Summary Card */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Last 30 Days Summary
        </Typography>
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <InfoBox label="Total Cost" value={`$${totals.cost.toFixed(2)}`} />
          <InfoBox label="Purchases" value={totals.conversions.toString()} />
          <InfoBox label="Revenue" value={`$${totals.revenue.toFixed(2)}`} />
          <InfoBox label="ROAS" value={totalRoas.toFixed(2)} />
          <InfoBox label="ROI" value={`${totalRoi.toFixed(1)}%`} />
        </Box>
      </Paper>

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
      <Paper sx={{ overflow: 'auto' }}>
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            '& th, & td': {
              px: 1.5,
              py: 1,
              textAlign: 'right',
              borderBottom: '1px solid',
              borderColor: 'grey.200',
              whiteSpace: 'nowrap',
            },
            '& th': {
              fontWeight: 600,
              bgcolor: 'grey.50',
              position: 'sticky',
              top: 0,
            },
            '& th:first-of-type, & td:first-of-type': {
              textAlign: 'left',
            },
          }}
        >
          <thead>
            <tr>
              <th>Date</th>
              <th>Cost</th>
              <th>Purchase</th>
              <th>Revenue</th>
              <th>ROAS</th>
              <th>ROI</th>
              {showExpanded && (
                <>
                  <th>CPA</th>
                  <th>AOV</th>
                  <th>EPC</th>
                  <th>Clicks</th>
                  <th>LP Clicks</th>
                  <th>LP CTR</th>
                  <th>CR</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.date || index}>
                <td>{row.date || '-'}</td>
                <td>${row.cost.toFixed(2)}</td>
                <td>{row.conversions}</td>
                <td>${row.revenue.toFixed(2)}</td>
                <td>{row.roas.toFixed(2)}</td>
                <td>{row.roi.toFixed(1)}%</td>
                {showExpanded && (
                  <>
                    <td>${row.cpa.toFixed(2)}</td>
                    <td>${row.aov.toFixed(2)}</td>
                    <td>${row.epc.toFixed(4)}</td>
                    <td>{row.clicks}</td>
                    <td>{row.lp_clicks}</td>
                    <td>{row.lp_ctr.toFixed(2)}%</td>
                    <td>{row.cr.toFixed(2)}%</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </Box>
      </Paper>
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
  const queryClient = useQueryClient();

  // Local UI state
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState<string>('');
  const [budgetDirty, setBudgetDirty] = useState(false);

  // Modal state
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [addAdsOpen, setAddAdsOpen] = useState<{ adSetId: string; templateAdId: string } | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ['fb-campaign'] });
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Bulk Actions Bar */}
      {selectedAds.size > 0 && (
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
          <Typography sx={{ flex: 1 }}>
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

      {/* Campaign Row */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{fbCampaign.name}</Typography>
            <Typography variant="caption" color="text.secondary">Campaign</Typography>
          </Box>

          {/* Budget Input */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">$</Typography>
            <TextField
              size="small"
              value={budgetValue}
              onChange={(e) => {
                setBudgetValue(e.target.value);
                setBudgetDirty(true);
              }}
              onBlur={handleBudgetSave}
              onKeyDown={(e) => e.key === 'Enter' && handleBudgetSave()}
              sx={{ width: 80 }}
              slotProps={{ input: { sx: { textAlign: 'right' } } }}
              disabled={isUpdating === 'campaign-budget'}
            />
            <Typography variant="body2" color="text.secondary">/day</Typography>
          </Box>

          {/* Status Toggle */}
          <StatusTogglePill
            status={fbCampaign.status}
            onClick={handleCampaignStatusToggle}
            disabled={isUpdating === 'campaign-status'}
          />
        </Box>
      </Paper>

      {/* Ad Sets */}
      <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>
        Ad Sets ({adSets.length})
      </Typography>

      {adSets.map((adSet) => {
        const adSetAds = ads.filter((ad) => ad.adset_id === adSet.id);
        const isExpanded = expandedAdSets.has(adSet.id);
        const selectedInSet = getSelectedAdsForAdSet(adSet.id);
        const allSelected = adSetAds.length > 0 && selectedInSet.length === adSetAds.length;

        return (
          <Paper key={adSet.id} sx={{ overflow: 'hidden' }}>
            {/* Ad Set Header */}
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => toggleAdSetExpand(adSet.id)}
            >
              <IconButton size="small" sx={{ p: 0 }}>
                {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
              </IconButton>

              <FolderIcon sx={{ color: 'text.secondary' }} />

              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 500 }}>{adSet.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {adSetAds.length} ad{adSetAds.length !== 1 ? 's' : ''}
                  {selectedInSet.length > 0 && ` (${selectedInSet.length} selected)`}
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary">
                {formatBudget(adSet.daily_budget, adSet.lifetime_budget)}
              </Typography>

              <Box onClick={(e) => e.stopPropagation()}>
                <StatusTogglePill
                  status={adSet.status}
                  onClick={() => handleAdSetStatusToggle(adSet)}
                  disabled={isUpdating === `adset-${adSet.id}`}
                  size="small"
                />
              </Box>
            </Box>

            {/* Expanded Content */}
            <Collapse in={isExpanded}>
              <Box sx={{ px: 2, pb: 2, bgcolor: 'grey.50' }}>
                {/* Ad Set Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, borderBottom: '1px solid', borderColor: 'grey.200', mb: 2 }}>
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={selectedInSet.length > 0 && !allSelected}
                    onChange={(e) => toggleAdSetSelection(adSet.id, e.target.checked)}
                  />
                  <Typography variant="body2" color="text.secondary">Select All</Typography>
                  <Box sx={{ flex: 1 }} />
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const templateAd = adSetAds[0];
                      if (templateAd?.creative?.id) {
                        setAddAdsOpen({ adSetId: adSet.id, templateAdId: templateAd.creative.id });
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
                  <Typography color="text.secondary" sx={{ py: 2 }}>No ads in this ad set</Typography>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2 }}>
                    {adSetAds.map((ad) => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
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
          templateCreativeId={addAdsOpen.templateAdId}
          campaignId={campaign.fbCampaignId!}
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
  status: string;
  onClick: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

function StatusTogglePill({ status, onClick, disabled, size = 'medium' }: StatusTogglePillProps) {
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
  isSelected: boolean;
  isUpdating: boolean;
  onSelect: () => void;
  onStatusToggle: () => void;
  onPreview: () => void;
  onDelete: () => void;
}

function AdCard({ ad, isSelected, isUpdating, onSelect, onStatusToggle, onPreview, onDelete }: AdCardProps) {
  return (
    <Box sx={styles.adCard(isSelected)}>
      {/* Selection Checkbox */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Checkbox
          size="small"
          checked={isSelected}
          onChange={onSelect}
          sx={{ p: 0 }}
        />
        <StatusTogglePill
          status={ad.status}
          onClick={onStatusToggle}
          disabled={isUpdating}
          size="small"
        />
      </Box>

      {/* Thumbnail */}
      {ad.creative?.thumbnail_url ? (
        <Box
          component="img"
          src={ad.creative.thumbnail_url}
          alt={ad.name}
          sx={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 1, mb: 1 }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            height: 80,
            bgcolor: 'grey.200',
            borderRadius: 1,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">No preview</Typography>
        </Box>
      )}

      {/* Name */}
      <Typography variant="caption" noWrap sx={{ display: 'block', mb: 1 }}>
        {ad.name}
      </Typography>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <IconButton size="small" onClick={onPreview} title="Preview">
          <OpenInNewIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onDelete} disabled={isUpdating} title="Delete" color="error">
          <DeleteIcon fontSize="small" />
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
// ADD ADS MODAL
// =============================================================================

interface AddAdsModalProps {
  open: boolean;
  onClose: () => void;
  adSetId: string;
  templateCreativeId: string;
  campaignId: string;
  adAccountId: string;
  accessToken: string;
  onSuccess: () => void;
}

function AddAdsModal({ open, onClose, adSetId, templateCreativeId, campaignId, adAccountId, accessToken, onSuccess }: AddAdsModalProps) {
  const [creatives, setCreatives] = useState<Array<{ url: string; name: string }>>([{ url: '', name: '' }]);
  const [utm, setUtm] = useState('');
  const [templateCreative, setTemplateCreative] = useState<FbCreative | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load template creative on mount
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const creative = await getFbCreative(templateCreativeId, accessToken);
        setTemplateCreative(creative);
        if (creative.url_tags) {
          setUtm(creative.url_tags);
        }
      } catch (err) {
        setError(`Failed to load template: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateCreativeId, accessToken]);

  const addCreativeRow = () => {
    setCreatives([...creatives, { url: '', name: '' }]);
  };

  const removeCreativeRow = (index: number) => {
    setCreatives(creatives.filter((_, i) => i !== index));
  };

  const updateCreative = (index: number, field: 'url' | 'name', value: string) => {
    const updated = [...creatives];
    updated[index][field] = value;
    // Auto-fill name from URL
    if (field === 'url' && !updated[index].name) {
      updated[index].name = extractFilenameFromUrl(value);
    }
    setCreatives(updated);
  };

  const handleSubmit = async () => {
    const validCreatives = creatives.filter((c) => c.url.trim());
    if (validCreatives.length === 0) {
      setError('Please enter at least one video URL');
      return;
    }

    setError(null);
    setProgress({ current: 0, total: validCreatives.length, message: 'Starting...' });

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < validCreatives.length; i++) {
      const { url, name } = validCreatives[i];
      const finalName = name || extractFilenameFromUrl(url);
      const directUrl = convertToDirectUrl(url);

      setProgress({ current: i + 1, total: validCreatives.length, message: `Creating ${i + 1}/${validCreatives.length}: ${finalName}` });

      try {
        await swapAdCreative({
          adAccountId,
          adSetId,
          templateCreativeId,
          videoUrl: directUrl,
          name: finalName,
          utm: utm || undefined,
          accessToken,
        });
        successCount++;
      } catch (err) {
        errors.push(`${finalName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    setProgress(null);

    if (errors.length > 0) {
      setError(`Completed with ${errors.length} error(s):\n${errors.join('\n')}`);
    } else {
      alert(`Successfully created ${successCount} ad${successCount !== 1 ? 's' : ''}!`);
      onSuccess();
      onClose();
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading template settings...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Ads</DialogTitle>
      <DialogContent>
        {/* Template Info */}
        {templateCreative && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>Settings copied from template:</Typography>
            <Typography variant="caption" color="text.secondary">
              Page ID: {templateCreative.object_story_spec?.page_id || 'N/A'}
              {' • '}
              CTA: {templateCreative.object_story_spec?.video_data?.call_to_action?.type || 'N/A'}
            </Typography>
          </Box>
        )}

        {/* Creative Rows */}
        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>Creatives (Videos):</Typography>
        {creatives.map((creative, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
            <Typography sx={{ width: 24, pt: 1, color: 'text.secondary' }}>{index + 1}.</Typography>
            <TextField
              size="small"
              placeholder="Video URL (Google Drive or direct link)"
              value={creative.url}
              onChange={(e) => updateCreative(index, 'url', e.target.value)}
              sx={{ flex: 2 }}
              disabled={!!progress}
            />
            <TextField
              size="small"
              placeholder={creative.url ? extractFilenameFromUrl(creative.url) : 'Ad Name'}
              value={creative.name}
              onChange={(e) => updateCreative(index, 'name', e.target.value)}
              sx={{ flex: 1 }}
              disabled={!!progress}
            />
            {creatives.length > 1 && (
              <IconButton size="small" onClick={() => removeCreativeRow(index)} disabled={!!progress}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}
        <Button size="small" onClick={addCreativeRow} disabled={!!progress} sx={{ mt: 1 }}>
          + Add Another
        </Button>

        <TextField
          label="UTM Parameters (applied to all)"
          fullWidth
          value={utm}
          onChange={(e) => setUtm(e.target.value)}
          placeholder="utm_source=facebook&utm_medium=paid"
          sx={{ mt: 2 }}
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
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!!progress || !creatives.some((c) => c.url.trim())}
        >
          {progress ? 'Creating...' : 'Create Ads'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// =============================================================================
// CREATIVE SWAP HELPER
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
  console.log('Uploading video:', videoUrl);
  const videoResult = await uploadFbVideo(adAccountId, videoUrl, name, accessToken);
  const videoId = videoResult.id;
  console.log('Video uploaded:', videoId);

  // 2. Wait for video to be ready
  let videoReady = false;
  let attempts = 0;
  while (!videoReady && attempts < 120) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const status = await getFbVideoStatus(videoId, accessToken);
    const videoStatus = status.status?.video_status;
    console.log(`Video status check ${attempts + 1}:`, videoStatus);

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
  console.log('Creative created:', newCreative.id);

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
  console.log('Ad created:', newAd.id);

  return { adId: newAd.id, creativeId: newCreative.id };
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function InfoBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>{label}:</Typography>
      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{value}</Typography>
    </Box>
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

/**
 * Convert Google Drive share URL to direct download URL.
 * Also handles Cloudflare R2 URLs (returns as-is).
 */
function convertToDirectUrl(url: string): string {
  // Handle Cloudflare R2 URLs (already direct)
  if (url.includes('.r2.dev/') || url.includes('r2.cloudflarestorage.com')) {
    return url;
  }

  // Handle Google Drive share URLs
  const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }

  // Return as-is if not recognized
  return url;
}

/**
 * Extract filename from URL for auto-generating ad names.
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || '';
    // Remove extension and clean up
    return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim() || 'Untitled';
  } catch {
    return 'Untitled';
  }
}
