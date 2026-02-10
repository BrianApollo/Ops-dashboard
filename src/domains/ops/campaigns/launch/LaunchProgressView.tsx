/**
 * LaunchProgressView - Full-width launch progress display.
 *
 * Shows:
 * - Header with campaign name, progress bar, elapsed time, API rate
 * - Steps summary row (Upload, Processing, Campaign, Ads) — always visible
 * - Tick summary bar showing what happened on the latest tick
 * - Videos table with per-item progress bar, state, Video ID, Ad ID
 * - Images table with per-item progress bar, state, Ad ID
 * - Completion/error/stopped view at the end
 */

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { textLg, textMd, textSm, textXs } from '../../../../theme/typography';
import type { FbLaunchState, LaunchPhase, FbLaunchMediaState, MediaItemState } from '../../../../features/campaigns/launch';
import { LaunchCompletionView } from './postlaunch/LaunchCompletionView';

// =============================================================================
// TYPES
// =============================================================================

interface MediaItemForDisplay {
  id: string;
  name: string;
  type: 'video' | 'image';
  /** Single state from the pipeline */
  itemState: MediaItemState;
  /** Progress percentage (0-100) based on state */
  progressPercent: number;
  /** Display label for the current state */
  stateLabel: string;
  fbVideoId?: string;
  adId?: string;
  retryCount: number;
  error?: string;
  // Legacy fields for LaunchCompletionView compatibility
  uploadStatus: 'pending' | 'sent' | 'fb-downloading' | 'processing' | 'ready' | 'failed';
  adStatus: 'waiting' | 'creating' | 'created' | 'failed';
}

interface LaunchProgressViewProps {
  campaignName: string;
  progress: FbLaunchState | null;
  isLaunching: boolean;
  onCancel?: () => void;
  selectedVideos: Array<{ id: string; name: string }>;
  selectedImages: Array<{ id: string; name: string }>;
  launchResult?: {
    campaignId?: string;
    adSetId?: string;
    success: boolean;
    error?: string;
  } | null;
  adAccountId?: string | null;
  onBackToProduct?: () => void;
  onRetryItem?: (name: string) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

type StepStatus = 'done' | 'active' | 'pending';

function getStepStatuses(
  phase: LaunchPhase,
  stats: FbLaunchState['stats'] | null,
  campaignId?: string,
  adSetId?: string,
): {
  upload: { status: StepStatus; label: string };
  processing: { status: StepStatus; label: string };
  campaign: { status: StepStatus; label: string };
  adSet: { status: StepStatus; label: string };
  ads: { status: StepStatus; label: string };
} {
  const phaseOrder: LaunchPhase[] = ['idle', 'checking', 'uploading', 'polling', 'creating_campaign', 'creating_ads', 'complete'];
  const idx = phaseOrder.indexOf(phase);
  const isFinal = phase === 'error' || phase === 'stopped' || phase === 'complete';

  const total = stats?.total || 0;
  const uploaded = (stats?.processing || 0) + (stats?.ready || 0) + (stats?.creatingAd || 0) + (stats?.done || 0);
  const processed = (stats?.ready || 0) + (stats?.creatingAd || 0) + (stats?.done || 0);
  const adsDone = stats?.done || 0;

  // Determine Ad Set Status
  // If we have an adSetId, it's done. 
  // If we have campaignId but no adSetId, and phase is creating_ads (or later), it's active.
  const adSetStatus: StepStatus = adSetId
    ? 'done'
    : (campaignId && (idx >= 5)) // creating_ads is index 5
      ? 'active'
      : 'pending';

  return {
    upload: {
      status: idx > 3 || isFinal ? 'done' : (idx === 2 || idx === 3) ? 'active' : idx > 1 ? 'done' : 'pending',
      label: total > 0 ? `${uploaded}/${total}` : '',
    },
    processing: {
      status: idx > 3 || isFinal ? 'done' : idx === 3 ? 'active' : idx > 3 ? 'done' : 'pending',
      label: total > 0 ? `${processed}/${total}` : '',
    },
    campaign: {
      status: campaignId ? 'done' : (idx === 4 ? 'active' : (idx > 4 || isFinal ? 'done' : 'pending')),
      label: campaignId || (phase === 'creating_campaign' ? 'Creating...' : (idx > 4 || isFinal) ? 'Created' : ''),
    },
    adSet: {
      status: adSetStatus,
      label: adSetId || (adSetStatus === 'active' ? 'Creating...' : ''),
    },
    ads: {
      status: phase === 'complete' ? 'done' : idx === 5 ? 'active' : 'pending',
      label: total > 0 ? `${adsDone}/${total}` : '',
    },
  };
}

function getItemProgressPercent(state: MediaItemState, type: 'video' | 'image'): number {
  if (type === 'image') {
    // Images skip upload/processing: queued(0) → ready(60) → creating_ad(80) → done(100)
    switch (state) {
      case 'queued': return 0;
      case 'ready': return 60;
      case 'creating_ad': return 80;
      case 'done': return 100;
      case 'failed': return 0;
      default: return 0;
    }
  }
  // Videos go through all stages
  switch (state) {
    case 'queued': return 0;
    case 'uploading': return 20;
    case 'processing': return 40;
    case 'ready': return 60;
    case 'creating_ad': return 80;
    case 'done': return 100;
    case 'failed': return 0;
    default: return 0;
  }
}

function getStateLabel(state: MediaItemState, retryCount: number, maxRetries: number): string {
  // Items that fail temporarily go back to queued/ready and retry next tick.
  // Don't show retry counts for in-progress states — only for permanently failed items.
  switch (state) {
    case 'queued': return 'Queued';
    case 'uploading': return 'Uploading...';
    case 'processing': return 'Processing';
    case 'ready': return 'Ready';
    case 'creating_ad': return 'Creating Ad...';
    case 'done': return 'Done';
    case 'failed': return `Failed (${retryCount}/${maxRetries})`;
    default: return state;
  }
}

function buildMediaItems(
  selectedVideos: Array<{ id: string; name: string }>,
  selectedImages: Array<{ id: string; name: string }>,
  progress: FbLaunchState | null
): MediaItemForDisplay[] {
  const mediaStateMap = new Map<string, FbLaunchMediaState>();
  if (progress?.media) {
    for (const m of progress.media) {
      mediaStateMap.set(m.name, m);
    }
  }

  const items: MediaItemForDisplay[] = [];

  for (const video of selectedVideos) {
    const ms = mediaStateMap.get(video.name);
    const itemState: MediaItemState = ms?.state || 'queued';
    items.push({
      id: video.id,
      name: video.name,
      type: 'video',
      itemState,
      progressPercent: getItemProgressPercent(itemState, 'video'),
      stateLabel: getStateLabel(itemState, ms?.retryCount || 0, 3),
      fbVideoId: ms?.fbVideoId || undefined,
      adId: ms?.adId || undefined,
      retryCount: ms?.retryCount || 0,
      error: ms?.error || undefined,
      // Legacy for CompletionView
      uploadStatus: mapUploadStatus(itemState),
      adStatus: mapAdStatus(itemState, ms?.adId),
    });
  }

  for (const image of selectedImages) {
    const ms = mediaStateMap.get(image.name);
    const itemState: MediaItemState = ms?.state || 'queued';
    items.push({
      id: image.id,
      name: image.name,
      type: 'image',
      itemState,
      progressPercent: getItemProgressPercent(itemState, 'image'),
      stateLabel: getStateLabel(itemState, ms?.retryCount || 0, 3),
      adId: ms?.adId || undefined,
      retryCount: ms?.retryCount || 0,
      error: ms?.error || undefined,
      // Legacy for CompletionView
      uploadStatus: mapUploadStatus(itemState),
      adStatus: mapAdStatus(itemState, ms?.adId),
    });
  }

  return items;
}

function mapUploadStatus(state: MediaItemState): MediaItemForDisplay['uploadStatus'] {
  switch (state) {
    case 'queued': return 'pending';
    case 'uploading': return 'sent';
    case 'processing': return 'processing';
    case 'ready':
    case 'creating_ad':
    case 'done': return 'ready';
    case 'failed': return 'failed';
    default: return 'pending';
  }
}

function mapAdStatus(state: MediaItemState, adId?: string | null): MediaItemForDisplay['adStatus'] {
  switch (state) {
    case 'done': return 'created';
    case 'creating_ad': return 'creating';
    case 'failed': return adId ? 'created' : 'failed';
    default: return 'waiting';
  }
}



/** Sort: done first, then in-progress, then waiting, then failed */
const STATE_SORT_ORDER: Record<MediaItemState, number> = {
  done: 0,
  creating_ad: 1,
  ready: 2,
  processing: 3,
  uploading: 4,
  queued: 5,
  failed: 6,
};

function sortMediaItems(items: MediaItemForDisplay[]): MediaItemForDisplay[] {
  return [...items].sort((a, b) => STATE_SORT_ORDER[a.itemState] - STATE_SORT_ORDER[b.itemState]);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LaunchProgressView({
  campaignName,
  progress,
  isLaunching,
  onCancel,
  selectedVideos,
  selectedImages,
  launchResult,
  adAccountId,
  onBackToProduct,
  onRetryItem,
}: LaunchProgressViewProps) {
  const phase: LaunchPhase = progress?.phase || (launchResult?.success ? 'complete' : launchResult?.error ? 'error' : 'idle');
  const stats = progress?.stats || null;
  const mediaItems = buildMediaItems(selectedVideos, selectedImages, progress);
  const stepStatuses = getStepStatuses(phase, stats, progress?.campaignId || undefined, progress?.adsetId || undefined);

  const videoItems = sortMediaItems(mediaItems.filter(m => m.type === 'video'));
  const imageItems = sortMediaItems(mediaItems.filter(m => m.type === 'image'));

  const isComplete = phase === 'complete';
  const isFailed = phase === 'error';
  const isStopped = phase === 'stopped';
  const isFinished = isComplete || isFailed || isStopped;

  const adsManagerUrl = adAccountId
    ? `https://business.facebook.com/adsmanager/manage/campaigns?act=${adAccountId.replace('act_', '')}`
    : null;



  // Summary counts for table headers
  const videoDone = videoItems.filter(m => m.itemState === 'done').length;
  const videoFailed = videoItems.filter(m => m.itemState === 'failed').length;
  const videoInProgress = videoItems.length - videoDone - videoFailed - videoItems.filter(m => m.itemState === 'queued').length;
  const imageDone = imageItems.filter(m => m.itemState === 'done').length;
  const imageFailed = imageItems.filter(m => m.itemState === 'failed').length;
  const imageInProgress = imageItems.length - imageDone - imageFailed - imageItems.filter(m => m.itemState === 'queued').length;

  return (
    <Box sx={{ py: 3 }}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: isComplete ? 'success.main' : isFailed ? 'error.main' : 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <>
          {/* ============================================================= */}
          {/* HEADER: Campaign name + progress bar + metadata               */}
          {/* ============================================================= */}
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <RocketLaunchIcon sx={{ color: 'primary.main' }} />
              <Typography sx={{ ...textLg, flex: 1 }}>{campaignName}</Typography>
            </Box>

            {/* Campaign & Ad Set IDs removed from here */}

          </Box>

          {/* ============================================================= */}
          {/* STEPS SUMMARY ROW                                             */}
          {/* ============================================================= */}
          <Box sx={{ display: 'flex', gap: 1.5, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <StepCard label="Upload" status={stepStatuses.upload.status} detail={stepStatuses.upload.label} />
            <StepCard label="Processing" status={stepStatuses.processing.status} detail={stepStatuses.processing.label} />
            <StepCard label="Campaign" status={stepStatuses.campaign.status} detail={stepStatuses.campaign.label} />
            <StepCard label="Ad Set" status={stepStatuses.adSet.status} detail={stepStatuses.adSet.label} />
            <StepCard label="Ads" status={stepStatuses.ads.status} detail={stepStatuses.ads.label} />
          </Box>

          {/* ============================================================= */}
          {/* TICK SUMMARY BAR                                              */}
          {/* ============================================================= */}
          {progress?.tickSummary && (
            <Box sx={{ px: 2.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
              <Typography sx={{ ...textXs, color: 'text.secondary' }}>
                Tick {progress.tick}/{progress.maxTicks} — {progress.tickSummary}
              </Typography>
            </Box>
          )}

          {/* ============================================================= */}
          {/* MEDIA TABLES — side by side                                   */}
          {/* ============================================================= */}
          <Box sx={{ display: 'flex', gap: 0, borderBottom: '1px solid', borderColor: 'divider', minHeight: 200 }}>
            {/* VIDEOS TABLE */}
            {videoItems.length > 0 && (
              <Box sx={{
                flex: 1,
                p: 2.5,
                borderRight: imageItems.length > 0 ? '1px solid' : 'none',
                borderColor: 'divider',
                minWidth: 0,
              }}>
                <Typography sx={{ ...textSm, fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                  Videos ({videoItems.length}: {videoDone} done
                  {videoInProgress > 0 ? ` \u00B7 ${videoInProgress} in progress` : ''}
                  {videoFailed > 0 ? ` \u00B7 ${videoFailed} failed` : ''})
                </Typography>

                {/* Column headers */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, px: 0.5 }}>
                  <Typography sx={{ ...textXs, color: 'text.disabled', width: 180, minWidth: 100 }}>Name</Typography>
                  <Typography sx={{ ...textXs, color: 'text.disabled', flex: 1 }}>Progress</Typography>
                  <Typography sx={{ ...textXs, color: 'text.disabled', width: 100, textAlign: 'right' }}>State</Typography>
                  <Typography sx={{ ...textXs, color: 'text.disabled', width: 100, textAlign: 'right' }}>Video ID</Typography>
                  <Typography sx={{ ...textXs, color: 'text.disabled', width: 100, textAlign: 'right' }}>Ad ID</Typography>
                </Box>

                <Box sx={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {videoItems.map(item => (
                    <MediaItemRow
                      key={item.id}
                      item={item}
                      showVideoId
                      onRetry={() => onRetryItem?.(item.name)}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* IMAGES TABLE */}
            {imageItems.length > 0 && (
              <Box sx={{
                flex: 1,
                p: 2.5,
                minWidth: 0,
              }}>
                <Typography sx={{ ...textSm, fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                  Images ({imageItems.length}: {imageDone} done
                  {imageInProgress > 0 ? ` \u00B7 ${imageInProgress} in progress` : ''}
                  {imageFailed > 0 ? ` \u00B7 ${imageFailed} failed` : ''})
                </Typography>

                {/* Column headers */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, px: 0.5 }}>
                  <Typography sx={{ ...textXs, color: 'text.disabled', width: 180, minWidth: 100 }}>Name</Typography>
                  <Typography sx={{ ...textXs, color: 'text.disabled', flex: 1 }}>Progress</Typography>
                  <Typography sx={{ ...textXs, color: 'text.disabled', width: 100, textAlign: 'right' }}>State</Typography>
                  <Typography sx={{ ...textXs, color: 'text.disabled', width: 100, textAlign: 'right' }}>Ad ID</Typography>
                </Box>

                <Box sx={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {imageItems.map(item => (
                    <MediaItemRow
                      key={item.id}
                      item={item}
                      onRetry={() => onRetryItem?.(item.name)}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* ============================================================= */}
          {/* CANCEL BUTTON                                                 */}
          {/* ============================================================= */}
          {isLaunching && onCancel && (
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
              <Button variant="outlined" color="inherit" size="small" onClick={onCancel}>
                Stop
              </Button>
            </Box>
          )}
        </>
      </Paper>
    </Box>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StepCard({ label, status, detail }: { label: string; status: StepStatus; detail: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 1.5,
        border: '1px solid',
        borderColor: status === 'done' ? 'success.main' : status === 'active' ? 'primary.main' : 'divider',
        borderRadius: 1,
        bgcolor: status === 'active' ? 'primary.50' : 'transparent',
        textAlign: 'center',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
        {status === 'done' ? (
          <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
        ) : status === 'active' ? (
          <AutorenewIcon
            sx={{
              fontSize: 14,
              color: 'primary.main',
              animation: 'spin 2s linear infinite',
              '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
            }}
          />
        ) : (
          <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: 'grey.400' }} />
        )}
        <Typography
          sx={{
            ...textSm,
            fontWeight: status === 'active' ? 600 : 500,
            color: status === 'pending' ? 'text.disabled' : 'text.primary',
          }}
        >
          {label}
        </Typography>
      </Box>
      {detail && (
        <Typography sx={{ ...textXs, color: status === 'done' ? 'success.main' : 'text.secondary' }}>
          {detail}
        </Typography>
      )}
    </Box>
  );
}

function MediaItemRow({ item, showVideoId, onRetry }: { item: MediaItemForDisplay; showVideoId?: boolean; onRetry?: () => void }) {
  const isFailed = item.itemState === 'failed';
  const isDone = item.itemState === 'done';
  const isActive = !isDone && !isFailed && item.itemState !== 'queued';

  const progressColor = isDone ? 'success.main' : isFailed ? 'error.main' : 'primary.main';
  const stateColor = isDone ? 'success.main' : isFailed ? 'error.main' : isActive ? 'primary.main' : 'text.disabled';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.5,
        px: 0.5,
        borderRadius: 0.5,
        bgcolor: isFailed ? 'error.50' : 'transparent',
        '&:hover': { bgcolor: isFailed ? 'error.100' : 'action.hover' },
      }}
    >
      {/* Retry Button (only if failed and callback provided) */}
      {isFailed && onRetry && (
        <IconButton size="small" onClick={onRetry} sx={{ p: 0.25, mr: 0.5, color: 'error.main' }} title="Retry">
          <AutorenewIcon fontSize="small" />
        </IconButton>
      )}

      {/* Name */}
      <Typography
        sx={{
          ...textSm,
          width: 180,
          minWidth: 100,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: isActive ? 500 : 400,
        }}
        title={item.name}
      >
        {item.name}
      </Typography>

      {/* Progress bar */}
      <Box sx={{ flex: 1, height: 6, bgcolor: 'grey.200', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
        <Box
          sx={{
            width: `${item.progressPercent}%`,
            height: '100%',
            bgcolor: progressColor,
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </Box>

      {/* State label */}
      <Typography
        sx={{
          ...textXs,
          color: stateColor,
          width: 100,
          textAlign: 'right',
          fontWeight: isActive ? 500 : 400,
        }}
      >
        {item.stateLabel}
      </Typography>

      {/* Video ID (only for videos table) */}
      {showVideoId && (
        <Typography
          sx={{
            ...textXs,
            color: 'text.secondary',
            fontFamily: 'monospace',
            width: 100,
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.fbVideoId || ''}
        >
          {item.fbVideoId || '\u2014'}
        </Typography>
      )}

      {/* Ad ID */}
      <Typography
        sx={{
          ...textXs,
          color: 'text.secondary',
          fontFamily: 'monospace',
          width: 100,
          textAlign: 'right',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={item.adId || ''}
      >
        {item.adId || '\u2014'}
      </Typography>
    </Box>
  );
}
