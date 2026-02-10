/**
 * AddAdsModal
 *
 * Self-contained modal for adding ads to an existing ad set.
 * - Shows system videos + images filtered by campaign product
 * - Reuses prelaunch uploader for library check / upload / poll
 * - Uses createAdsBatch for batch ad creation with retry
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import { useAddAdsFlow } from './useAddAdsFlow';
import type { Campaign } from '../../../../features/campaigns';
import type { SelectableVideo, SelectableImage } from '../launch/types';

// =============================================================================
// TYPES
// =============================================================================

interface AddAdsModalProps {
  open: boolean;
  onClose: () => void;
  adSetId: string;
  templateCreativeId: string;
  campaignRecord: Campaign;
  adAccountId: string;
  accessToken: string;
  onSuccess: () => void;
}

// =============================================================================
// STATUS CHIP (matches CreativesColumn pattern)
// =============================================================================

const chipSx = { height: 18, fontSize: '0.65rem', fontWeight: 500, mr: 0.5 };

function VideoStatusChip({ video }: { video: SelectableVideo }) {
  if (video.inLibrary || video.uploadStatus === 'ready') {
    return <Chip label="In Library" size="small" sx={{ ...chipSx, bgcolor: '#d1fae5', color: '#065f46' }} />;
  }
  if (video.uploadStatus === 'queued') {
    return <Chip label="Queued" size="small" sx={{ ...chipSx, bgcolor: '#e0e7ff', color: '#3730a3' }} />;
  }
  if (video.uploadStatus === 'uploading') {
    return (
      <Chip
        label="Uploading"
        size="small"
        icon={<CircularProgress size={10} sx={{ color: '#1d4ed8' }} />}
        sx={{ ...chipSx, bgcolor: '#dbeafe', color: '#1d4ed8' }}
      />
    );
  }
  if (video.uploadStatus === 'processing') {
    return (
      <Chip
        label="Processing"
        size="small"
        icon={<CircularProgress size={10} sx={{ color: '#c2410c' }} />}
        sx={{ ...chipSx, bgcolor: '#ffedd5', color: '#c2410c' }}
      />
    );
  }
  if (video.uploadStatus === 'failed') {
    return (
      <Tooltip title={video.uploadError || 'Failed'}>
        <Chip label="Failed" size="small" sx={{ ...chipSx, bgcolor: '#fee2e2', color: '#b91c1c' }} />
      </Tooltip>
    );
  }
  return <Chip label="Not in Library" size="small" sx={{ ...chipSx, bgcolor: '#f3f4f6', color: '#6b7280' }} />;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AddAdsModal({
  open,
  onClose,
  adSetId,
  templateCreativeId,
  campaignRecord,
  adAccountId,
  accessToken,
  onSuccess,
}: AddAdsModalProps) {
  const productId = campaignRecord.product?.id;

  const flow = useAddAdsFlow({
    adSetId,
    templateCreativeId,
    campaignId: campaignRecord.id,
    productId,
    adAccountId,
    accessToken,
  });

  const [mediaTab, setMediaTab] = useState<'videos' | 'images'>('videos');

  // ---------------------------------------------------------------------------
  // LOADING / ERROR STATES
  // ---------------------------------------------------------------------------

  if (flow.isLoadingTemplate) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading template settings…</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (flow.templateError) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <Alert severity="error">{flow.templateError}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    await flow.createAds();
    // Result is shown in the dialog; user clicks "Done" to close.
  };

  const handleDone = () => {
    if (flow.creationResult && flow.creationResult.success > 0) {
      onSuccess();
    }
    onClose();
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Ads</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Template info banner */}
        {flow.templateCreative && (
          <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Page: {flow.templateCreative.object_story_spec?.page_id ?? 'N/A'}
              {' · '}
              CTA: {flow.templateCreative.object_story_spec?.video_data?.call_to_action?.type ?? 'N/A'}
              {' · '}
              URL: {flow.templateCreative.object_story_spec?.video_data?.call_to_action?.value?.link ?? 'N/A'}
            </Typography>
          </Box>
        )}

        {/* Media tab toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={mediaTab}
            exclusive
            onChange={(_, v) => v && setMediaTab(v)}
            size="small"
          >
            <ToggleButton value="videos">
              Videos ({flow.availableVideos.length})
            </ToggleButton>
            <ToggleButton value="images">
              Images ({flow.availableImages.length})
            </ToggleButton>
          </ToggleButtonGroup>

          {mediaTab === 'videos' && (
            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={() => flow.uploader.checkLibrary()}
                disabled={flow.uploader.isChecking || flow.availableVideos.length === 0}
              >
                {flow.uploader.isChecking ? 'Checking…' : 'Check Library'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => flow.uploader.uploadAllNotInLibrary()}
                disabled={flow.uploader.isUploading || flow.uploader.isChecking}
              >
                {flow.uploader.isUploading ? 'Uploading…' : 'Upload All'}
              </Button>
            </Box>
          )}
        </Box>

        {flow.uploader.error && <Alert severity="error" sx={{ py: 0.5 }}>{flow.uploader.error}</Alert>}

        {/* Video list */}
        {mediaTab === 'videos' && (
          <Box sx={{ maxHeight: 350, overflow: 'auto', border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
            {flow.availableVideos.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No videos available for this product.
              </Typography>
            ) : (
              flow.availableVideos.map((video) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  selected={flow.selectedVideoIds.has(video.id)}
                  onToggle={() => flow.toggleVideo(video.id)}
                />
              ))
            )}
          </Box>
        )}

        {/* Image list */}
        {mediaTab === 'images' && (
          <Box sx={{ maxHeight: 350, overflow: 'auto', border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
            {flow.availableImages.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No images available for this product.
              </Typography>
            ) : (
              flow.availableImages.map((image) => (
                <ImageRow
                  key={image.id}
                  image={image}
                  selected={flow.selectedImageIds.has(image.id)}
                  onToggle={() => flow.toggleImage(image.id)}
                />
              ))
            )}
          </Box>
        )}

        {/* Status toggle */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={flow.reuseCreatives}
                onChange={(e) => flow.setReuseCreatives(e.target.checked)}
                size="small"
                sx={{ py: 0 }}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                Use existing creatives if already in ad account
              </Typography>
            }
            sx={{ m: 0 }}
          />
          <FormControlLabel
            sx={{ marginLeft: 0.5 }}
            control={
              <Switch
                checked={flow.adStatus === 'ACTIVE'}
                onChange={(e) => flow.setAdStatus(e.target.checked ? 'ACTIVE' : 'PAUSED')}
                size="small"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 500, marginLeft: 2 }}>
                Active Immediately
              </Typography>
            }
          />
        </Box>

        {/* Progress */}
        {flow.creationProgress && (
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>{flow.creationProgress.message}</Typography>
            <LinearProgress
              variant="determinate"
              value={(flow.creationProgress.current / flow.creationProgress.total) * 100}
            />
          </Box>
        )}

        {/* Result */}
        {flow.creationResult && (
          <Alert severity={flow.creationResult.failed === 0 ? 'success' : 'warning'}>
            Created {flow.creationResult.success} ad{flow.creationResult.success !== 1 ? 's' : ''}.
            {flow.creationResult.failed > 0 && (
              <>
                {' '}{flow.creationResult.failed} failed.
                <Box component="ul" sx={{ m: 0, mt: 1, pl: 2 }}>
                  {flow.creationResult.errors.map((e, i) => (
                    <li key={i}>
                      <Typography variant="caption">{e}</Typography>
                    </li>
                  ))}
                </Box>
              </>
            )}
          </Alert>
        )}

        {/* Selection summary */}
        {flow.totalSelectedCount > 0 && !flow.creationResult && (
          <Typography variant="body2" color="text.secondary">
            {flow.readyCount}/{flow.totalSelectedCount} selected media ready
            {!flow.allMediaReady && ' — upload remaining videos before creating ads'}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        {flow.creationResult ? (
          <Button variant="contained" onClick={handleDone}>Done</Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={flow.isCreating}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={flow.isCreating || flow.totalSelectedCount === 0}
              startIcon={flow.isCreating ? <CircularProgress size={16} /> : undefined}
            >
              {flow.isCreating
                ? 'Creating…'
                : `Create ${flow.totalSelectedCount} Ad${flow.totalSelectedCount !== 1 ? 's' : ''}`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// =============================================================================
// ROW COMPONENTS
// =============================================================================

function VideoRow({
  video,
  selected,
  onToggle,
}: {
  video: SelectableVideo;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'grey.100',
        bgcolor: selected ? 'primary.50' : 'transparent',
        '&:hover': { bgcolor: selected ? 'primary.50' : 'grey.50' },
        cursor: 'pointer',
      }}
      onClick={onToggle}
    >
      <Checkbox size="small" checked={selected} sx={{ p: 0 }} tabIndex={-1} />

      {/* Thumbnail */}
      {video.fbThumbnailUrl || video.thumbnailUrl ? (
        <Box
          component="img"
          src={video.fbThumbnailUrl || video.thumbnailUrl}
          alt=""
          sx={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 0.5, flexShrink: 0 }}
        />
      ) : (
        <Box
          sx={{
            width: 48,
            height: 36,
            bgcolor: 'grey.200',
            borderRadius: 0.5,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
            VID
          </Typography>
        </Box>
      )}

      <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {video.name}
      </Typography>

      <VideoStatusChip video={video} />

      {(video.inLibrary || video.uploadStatus === 'ready') && (
        <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
      )}
    </Box>
  );
}

function ImageRow({
  image,
  selected,
  onToggle,
}: {
  image: SelectableImage;
  selected: boolean;
  onToggle: () => void;
}) {
  const imgSrc = image.thumbnailUrl || image.image_url || image.image_drive_link;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'grey.100',
        bgcolor: selected ? 'primary.50' : 'transparent',
        '&:hover': { bgcolor: selected ? 'primary.50' : 'grey.50' },
        cursor: 'pointer',
      }}
      onClick={onToggle}
    >
      <Checkbox size="small" checked={selected} sx={{ p: 0 }} tabIndex={-1} />

      {imgSrc ? (
        <Box
          component="img"
          src={imgSrc}
          alt=""
          sx={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 0.5, flexShrink: 0 }}
        />
      ) : (
        <Box
          sx={{
            width: 48,
            height: 36,
            bgcolor: 'grey.200',
            borderRadius: 0.5,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
            IMG
          </Typography>
        </Box>
      )}

      <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {image.name}
      </Typography>

      {image.imageType && (
        <Chip label={image.imageType} size="small" sx={{ ...chipSx, bgcolor: '#e0e7ff', color: '#3730a3' }} />
      )}

      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
    </Box>
  );
}
