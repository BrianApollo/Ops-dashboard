/**
 * LaunchProgressView - Compact launch progress display.
 *
 * Shows:
 * - Timeline at top (Validate → Upload → Campaign & AdSet → Ads → Done)
 * - Current action section (Upload OR Ads, not both)
 * - Completed items footer (Campaign ID, Ad Set ID)
 * - Full summary on complete
 */

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { textLg, textMd, textSm, textXs, helperText } from '../../../../theme/typography';
import type { FbLaunchState, LaunchPhase, FbLaunchMediaState } from '../../../../features/campaigns/launch';
import { LaunchCompletionView } from './postlaunch/LaunchCompletionView';

// =============================================================================
// TYPES
// =============================================================================

interface MediaItemForDisplay {
  id: string;
  name: string;
  type: 'video' | 'image';
  uploadStatus: 'pending' | 'sent' | 'fb-downloading' | 'processing' | 'ready' | 'failed';
  uploadProgress?: number;
  adStatus: 'waiting' | 'creating' | 'created' | 'failed';
  adId?: string;
  error?: string;
}

interface LaunchProgressViewProps {
  campaignName: string;
  progress: FbLaunchState | null;
  isLaunching: boolean;
  onCancel?: () => void;
  selectedVideos: Array<{ id: string; name: string }>;
  selectedImages: Array<{ id: string; name: string }>;
  /** Launch result for complete state */
  launchResult?: {
    campaignId?: string;
    adSetId?: string;
    success: boolean;
    error?: string;
  } | null;
  /** Ad account ID for Ads Manager link */
  adAccountId?: string | null;
  /** Callback to navigate back to product */
  onBackToProduct?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

type StepStatus = 'done' | 'active' | 'pending';

/**
 * Map FbLaunchRunner phases to timeline step statuses
 * Phases: idle | checking | uploading | polling | creating_campaign | creating_ads | stopped | complete | error
 */
function getStepStatuses(phase: LaunchPhase): {
  validate: StepStatus;
  upload: StepStatus;
  setup: StepStatus;
  ads: StepStatus;
  done: StepStatus;
} {
  // Phase progression: checking -> uploading -> polling -> creating_campaign -> creating_ads -> complete
  const phaseOrder: LaunchPhase[] = ['idle', 'checking', 'uploading', 'polling', 'creating_campaign', 'creating_ads', 'complete'];
  const idx = phaseOrder.indexOf(phase);

  // Handle special cases
  if (phase === 'error' || phase === 'stopped') {
    return {
      validate: 'done',
      upload: 'done',
      setup: 'done',
      ads: 'pending',
      done: 'pending',
    };
  }

  return {
    validate: idx > 1 ? 'done' : (idx === 0 || idx === 1) ? 'active' : 'pending', // idle/checking
    upload: idx > 3 ? 'done' : (idx === 2 || idx === 3) ? 'active' : 'pending',   // uploading/polling
    setup: idx > 4 ? 'done' : idx === 4 ? 'active' : 'pending',                   // creating_campaign
    ads: idx > 5 ? 'done' : idx === 5 ? 'active' : 'pending',                     // creating_ads
    done: phase === 'complete' ? 'done' : 'pending',
  };
}

/**
 * Build display items from FbLaunchState media array
 * Maps the new state shape (stage/status) to display format
 */
function buildMediaItems(
  selectedVideos: Array<{ id: string; name: string }>,
  selectedImages: Array<{ id: string; name: string }>,
  progress: FbLaunchState | null
): MediaItemForDisplay[] {
  // Build a map of media by name for lookup
  const mediaStateMap = new Map<string, FbLaunchMediaState>();
  if (progress?.media) {
    for (const m of progress.media) {
      mediaStateMap.set(m.name, m);
    }
  }

  const items: MediaItemForDisplay[] = [];

  for (const video of selectedVideos) {
    const state = mediaStateMap.get(video.name);
    items.push({
      id: video.id,
      name: video.name,
      type: 'video',
      uploadStatus: mapUploadStatusFromState(state),
      adStatus: mapAdStatusFromState(state),
      adId: state?.adId || undefined,
      error: state?.error || undefined,
    });
  }

  for (const image of selectedImages) {
    const state = mediaStateMap.get(image.name);
    items.push({
      id: image.id,
      name: image.name,
      type: 'image',
      uploadStatus: mapUploadStatusFromState(state),
      adStatus: mapAdStatusFromState(state),
      adId: state?.adId || undefined,
      error: state?.error || undefined,
    });
  }

  return items;
}

/**
 * Map FbLaunchMediaState (stage/status) to upload display status
 * Stages: upload | poll | ad | done | failed
 * Status: queued | in_progress | retry | completed | failed
 */
function mapUploadStatusFromState(state?: FbLaunchMediaState): MediaItemForDisplay['uploadStatus'] {
  if (!state) return 'pending';

  // Check stage first
  if (state.stage === 'failed') return 'failed';
  if (state.stage === 'done') return 'ready';
  if (state.stage === 'ad') return 'ready'; // Video ready for ad creation
  if (state.stage === 'poll') return 'processing'; // Video uploaded, waiting for FB processing
  if (state.stage === 'upload') {
    if (state.status === 'in_progress') return 'sent';
    if (state.status === 'failed') return 'failed';
    return 'pending';
  }

  // For images (which skip upload/poll stages)
  if (state.type === 'image') {
    if (state.stage === 'ad' || state.stage === 'done') return 'ready';
    return 'pending';
  }

  return 'pending';
}

/**
 * Map FbLaunchMediaState to ad creation display status
 */
function mapAdStatusFromState(state?: FbLaunchMediaState): MediaItemForDisplay['adStatus'] {
  if (!state) return 'waiting';

  if (state.stage === 'done' && state.adId) return 'created';
  if (state.stage === 'ad' && state.status === 'in_progress') return 'creating';
  if (state.stage === 'ad') return 'waiting'; // Queued for ad creation
  if (state.stage === 'failed') return 'failed';

  return 'waiting';
}

/**
 * Calculate overall progress percentage based on phase and media state
 */
function calculateOverallProgress(phase: LaunchPhase, mediaItems: MediaItemForDisplay[]): number {
  const total = mediaItems.length || 1;

  switch (phase) {
    case 'idle':
      return 0;
    case 'checking':
      return 2;
    case 'uploading': {
      const ready = mediaItems.filter(m => m.uploadStatus === 'ready' || m.uploadStatus === 'processing').length;
      return 5 + Math.round((ready / total) * 20);
    }
    case 'polling': {
      const ready = mediaItems.filter(m => m.uploadStatus === 'ready').length;
      return 25 + Math.round((ready / total) * 20);
    }
    case 'creating_campaign':
      return 50;
    case 'creating_ads': {
      const created = mediaItems.filter(m => m.adStatus === 'created').length;
      return 55 + Math.round((created / total) * 40);
    }
    case 'complete':
      return 100;
    case 'error':
    case 'stopped':
      return 0;
    default:
      return 0;
  }
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
}: LaunchProgressViewProps) {
  // Derive phase from progress state or fallback to launchResult
  const phase: LaunchPhase = progress?.phase || (launchResult?.success ? 'complete' : launchResult?.error ? 'error' : 'idle');
  const mediaItems = buildMediaItems(selectedVideos, selectedImages, progress);
  const overallProgress = calculateOverallProgress(phase, mediaItems);
  const stepStatuses = getStepStatuses(phase);

  const uploadedCount = mediaItems.filter(m => m.uploadStatus === 'ready').length;
  const adsCreatedCount = mediaItems.filter(m => m.adStatus === 'created').length;
  const totalMedia = mediaItems.length;

  // Get stats from progress state
  const stats = progress?.stats;
  const pollingCount = stats?.poll?.waiting || 0;

  // Phase checks using new phase names
  const isCheckingPhase = phase === 'checking';
  const isUploadPhase = phase === 'uploading' || phase === 'polling';
  const isAdPhase = phase === 'creating_ads';
  const isSetupPhase = phase === 'creating_campaign';
  const isComplete = phase === 'complete';
  const isFailed = phase === 'error';
  const isStopped = phase === 'stopped';

  const adsManagerUrl = adAccountId
    ? `https://business.facebook.com/adsmanager/manage/campaigns?act=${adAccountId.replace('act_', '')}`
    : null;

  return (
    <Box sx={{ maxWidth: 750, mx: 'auto', py: 3 }}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: isComplete ? 'success.main' : isFailed ? 'error.main' : 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 3, textAlign: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
            {isComplete ? (
              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 28 }} />
            ) : isFailed ? (
              <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 28 }} />
            ) : (
              <RocketLaunchIcon sx={{ color: 'primary.main' }} />
            )}
            <Typography sx={textLg}>
              {isComplete ? 'Launch Complete!' : isFailed ? 'Launch Failed' : campaignName}
            </Typography>
          </Box>

          {/* Timeline - hide on complete/failed/stopped */}
          {!isComplete && !isFailed && !isStopped && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <TimelineStep label="Validate" status={stepStatuses.validate} />
                <TimelineConnector done={stepStatuses.validate === 'done'} />
                <TimelineStep label="Upload" status={stepStatuses.upload} detail={`${uploadedCount}/${totalMedia}`} />
                <TimelineConnector done={stepStatuses.upload === 'done'} />
                <TimelineStep label="Campaign" status={stepStatuses.setup} subLabel="& AdSet" />
                <TimelineConnector done={stepStatuses.setup === 'done'} />
                <TimelineStep label="Ads" status={stepStatuses.ads} detail={`${adsCreatedCount}/${totalMedia}`} />
                <TimelineConnector done={stepStatuses.ads === 'done'} />
                <TimelineStep label="Done" status={stepStatuses.done} />
              </Box>

              <Box sx={{ px: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={overallProgress}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography sx={{ ...helperText, mt: 0.5, display: 'block' }}>
                  {overallProgress}% complete
                </Typography>
              </Box>
            </>
          )}
        </Box>

        {/* Current Action Section */}
        <Box sx={{ p: 2.5 }}>
          {/* Upload Phase (includes uploading and polling) */}
          {isUploadPhase && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={textMd}>
                  {phase === 'uploading' ? 'Uploading Videos' : 'Processing Videos'}
                </Typography>
                <Typography sx={helperText}>
                  {uploadedCount}/{totalMedia} ready
                </Typography>
              </Box>
              <Typography sx={{ ...helperText, mb: 2, display: 'block' }}>
                {phase === 'uploading'
                  ? 'Sending videos to Facebook...'
                  : `Waiting for Facebook to process ${pollingCount} video${pollingCount !== 1 ? 's' : ''}...`}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {mediaItems
                  .filter(m => m.uploadStatus !== 'pending' && m.uploadStatus !== 'ready')
                  .slice(0, 5)
                  .map(item => (
                    <UploadItemRow key={item.id} item={item} />
                  ))}
                {mediaItems
                  .filter(m => m.uploadStatus === 'ready')
                  .slice(0, 3)
                  .map(item => (
                    <UploadItemRow key={item.id} item={item} />
                  ))}
              </Box>

              {mediaItems.filter(m => m.uploadStatus === 'pending').length > 0 && (
                <Typography sx={{ ...helperText, mt: 1.5, display: 'block' }}>
                  Queue: {mediaItems.filter(m => m.uploadStatus === 'pending').map(m => m.name).slice(0, 3).join(', ')}
                  {mediaItems.filter(m => m.uploadStatus === 'pending').length > 3 &&
                    ` +${mediaItems.filter(m => m.uploadStatus === 'pending').length - 3} more`}
                </Typography>
              )}
            </>
          )}

          {/* Checking Phase */}
          {isCheckingPhase && (
            <>
              <Typography sx={{ ...textMd, mb: 1 }}>
                Checking Library
              </Typography>
              <Typography sx={{ ...helperText, display: 'block' }}>
                Looking for existing videos in your ad account...
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Spinner />
              </Box>
            </>
          )}

          {/* Setup Phase (Campaign & Ad Set) */}
          {isSetupPhase && (
            <>
              <Typography sx={{ ...textMd, mb: 1 }}>
                Creating Campaign & Ad Set
              </Typography>
              <Typography sx={{ ...helperText, display: 'block' }}>
                Setting up campaign and ad set on Facebook Ads Manager...
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Spinner />
              </Box>
            </>
          )}

          {/* Ads Phase */}
          {isAdPhase && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={textMd}>
                  Creating Ads
                </Typography>
                <Typography sx={helperText}>
                  {adsCreatedCount}/{totalMedia} created
                </Typography>
              </Box>
              <Typography sx={{ ...helperText, mb: 2, display: 'block' }}>
                Building ad creatives on Facebook...
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 250, overflow: 'auto' }}>
                {mediaItems.map(item => (
                  <AdItemRow key={item.id} item={item} />
                ))}
              </Box>
            </>
          )}

          {/* Post-launch states: stopped, failed, complete */}
          {(isStopped || isFailed || isComplete) && (
            <LaunchCompletionView
              phase={isStopped ? 'stopped' : isFailed ? 'error' : 'complete'}
              campaignName={campaignName}
              mediaItems={mediaItems}
              launchResult={launchResult}
              progress={progress}
              adsManagerUrl={adsManagerUrl}
              onBackToProduct={onBackToProduct}
            />
          )}
        </Box>

        {/* Footer - Completed Items (only during progress, not on complete) */}
        {!isComplete && !isFailed && !isStopped && (progress?.campaignId || progress?.adsetId) && (
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              gap: 3,
              flexWrap: 'wrap',
            }}
          >
            {progress?.campaignId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography sx={{ ...textSm, fontWeight: 500 }}>Campaign</Typography>
                <Typography sx={{ ...textXs, color: 'text.secondary', fontFamily: 'monospace' }}>
                  {progress.campaignId}
                </Typography>
              </Box>
            )}
            {progress?.adsetId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography sx={{ ...textSm, fontWeight: 500 }}>Ad Set</Typography>
                <Typography sx={{ ...textXs, color: 'text.secondary', fontFamily: 'monospace' }}>
                  {progress.adsetId}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Cancel Button (only during progress) */}
        {isLaunching && onCancel && !isComplete && !isFailed && !isStopped && (
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Button variant="outlined" color="inherit" size="small" onClick={onCancel}>
              Stop
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function Spinner() {
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '3px solid',
        borderColor: 'primary.main',
        borderTopColor: 'transparent',
        animation: 'spin 1s linear infinite',
        '@keyframes spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      }}
    />
  );
}

interface TimelineStepProps {
  label: string;
  subLabel?: string;
  status: StepStatus;
  detail?: string;
}

function TimelineStep({ label, subLabel, status, detail }: TimelineStepProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 55 }}>
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: status === 'done' ? 'success.main' : status === 'active' ? 'primary.main' : 'grey.300',
          mb: 0.5,
        }}
      >
        {status === 'done' ? (
          <CheckCircleIcon sx={{ fontSize: 16, color: 'white' }} />
        ) : status === 'active' ? (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'white',
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.4 },
              },
            }}
          />
        ) : (
          <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: 'white' }} />
        )}
      </Box>
      <Typography
        sx={{
          ...textXs,
          fontWeight: status === 'active' ? 600 : 400,
          color: status === 'pending' ? 'text.disabled' : 'text.primary',
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      {subLabel && (
        <Typography sx={{ ...textXs, fontSize: '0.5625rem', color: 'text.secondary', lineHeight: 1 }}>
          {subLabel}
        </Typography>
      )}
      {detail && (
        <Typography sx={{ ...textXs, fontSize: '0.5625rem', color: 'text.secondary' }}>
          {detail}
        </Typography>
      )}
    </Box>
  );
}

function TimelineConnector({ done }: { done: boolean }) {
  return (
    <Box
      sx={{
        width: 30,
        height: 2,
        bgcolor: done ? 'success.main' : 'grey.300',
        mx: 0.5,
        mt: -2,
      }}
    />
  );
}

interface UploadItemRowProps {
  item: MediaItemForDisplay;
}

function UploadItemRow({ item }: UploadItemRowProps) {
  const getStatusText = () => {
    switch (item.uploadStatus) {
      case 'sent': return 'Sent to Facebook';
      case 'fb-downloading': return 'FB downloading file...';
      case 'processing': return item.uploadProgress ? `Processing ${item.uploadProgress}%` : 'Processing...';
      case 'ready': return 'Ready';
      case 'failed': return item.error || 'Failed';
      default: return 'Waiting';
    }
  };

  const getProgressWidth = () => {
    switch (item.uploadStatus) {
      case 'sent': return '10%';
      case 'fb-downloading': return '30%';
      case 'processing': return `${30 + (item.uploadProgress || 0) * 0.7}%`;
      case 'ready': return '100%';
      default: return '0%';
    }
  };

  const isActive = item.uploadStatus !== 'pending' && item.uploadStatus !== 'ready';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Typography
        sx={{
          ...textSm,
          fontWeight: isActive ? 500 : 400,
          minWidth: 160,
          maxWidth: 160,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={item.name}
      >
        {item.name}
      </Typography>
      <Box sx={{ flex: 1, height: 6, bgcolor: 'grey.200', borderRadius: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            width: getProgressWidth(),
            height: '100%',
            bgcolor: item.uploadStatus === 'ready' ? 'success.main' : item.uploadStatus === 'failed' ? 'error.main' : 'primary.main',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
      <Typography
        sx={{
          ...textXs,
          color: item.uploadStatus === 'ready' ? 'success.main' : item.uploadStatus === 'failed' ? 'error.main' : 'text.secondary',
          minWidth: 120,
          textAlign: 'right',
        }}
      >
        {getStatusText()}
      </Typography>
    </Box>
  );
}

interface AdItemRowProps {
  item: MediaItemForDisplay;
}

function AdItemRow({ item }: AdItemRowProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
      {item.adStatus === 'created' ? (
        <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
      ) : item.adStatus === 'creating' ? (
        <Box
          sx={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: 'primary.main',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      ) : (
        <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: 'grey.400' }} />
      )}
      <Typography
        sx={{
          ...textSm,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: item.adStatus === 'waiting' ? 'text.secondary' : 'text.primary',
        }}
        title={item.name}
      >
        {item.name}
      </Typography>
      <Typography
        sx={{
          ...textXs,
          color: item.adStatus === 'created' ? 'success.main' : item.adStatus === 'creating' ? 'primary.main' : 'text.disabled',
        }}
      >
        {item.adStatus === 'created' ? 'Ad created' : item.adStatus === 'creating' ? 'Creating...' : 'Waiting'}
      </Typography>
    </Box>
  );
}
