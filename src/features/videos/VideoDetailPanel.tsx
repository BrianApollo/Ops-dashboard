/**
 * VideoDetailPanel - Video detail slide-in panel.
 * Uses the shared DetailPanel components for consistent styling.
 * Handles video-specific logic: upload, status changes, notes.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CampaignIcon from '@mui/icons-material/Campaign';
import CheckIcon from '@mui/icons-material/Check';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import {
  DetailPanel,
  DetailPanelBody,
  DetailHeader,
  DetailPills,
  DetailSection,
  DetailContent,
  DetailActions,
} from '../../core/panel';
import type { PillConfig } from '../../core/panel';
import {
  getStatusPillStyle,
  getProductPillStyle,
  getEditorPillStyle,
  NEUTRAL_PILL,
} from '../../ui';
import type { VideoAsset, VideoStatus } from './types';
import { useAuth } from '../../core/auth/AuthContext';

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_LABELS: Record<VideoStatus, string> = {
  todo: 'To Do',
  review: 'In Review',
  available: 'Available',
  used: 'Used',
};

const FORMAT_LABELS: Record<string, string> = {
  square: 'Square',
  vertical: 'Vertical',
  youtube: 'YouTube',
};

// =============================================================================
// PROPS
// =============================================================================

interface VideoDetailPanelProps {
  video: VideoAsset | null;
  open: boolean;
  onClose: () => void;
  onUpload?: (
    videoId: string,
    file: File,
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  ) => Promise<void>;
  isUploading?: boolean;
  editorOptions?: { value: string; label: string }[];
  productOptions?: { value: string; label: string }[];
  onSave?: unknown;
  onStatusChange?: (videoId: string, status: 'todo' | 'available') => Promise<void>;
  onNotesChange?: (videoId: string, notes: string) => Promise<void>;
  isUpdating?: boolean;
  onViewScript?: (scriptId: string) => void;
  canUpload?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VideoDetailPanel({
  video,
  open,
  onClose,
  onUpload,
  isUploading = false,
  onStatusChange,
  onNotesChange,
  isUpdating = false,
  onViewScript,
  canUpload = true,
}: VideoDetailPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [notesValue, setNotesValue] = useState(video?.notes ?? '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const { user } = useAuth();

  // Sync notesValue when video changes
  useEffect(() => {
    setNotesValue(video?.notes ?? '');
  }, [video?.id, video?.notes]);

  // Status-based permissions
  const isTodo = video?.status === 'todo';
  const isReview = video?.status === 'review';
  const isUsed = video?.status === 'used';
  // Video exists if we have either Video Upload attachment OR Creative Link
  const hasVideo = Boolean(video?.videoUploadUrl || video?.creativeLink || video?.driveFileId);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!video || !onUpload || !canUpload) return;
      await onUpload(video.id, file);
    },
    [video, onUpload, canUpload]
  );

  // Trigger file picker
  const handleUploadClick = () => {
    if (!isUploading && canUpload) {
      fileInputRef.current?.click();
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = '';
  };

  // Drag & drop handlers (To Do only)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isTodo && !isUploading && canUpload) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isTodo || isUploading || !canUpload) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleFileUpload(file);
    }
  };

  // Open asset in new tab
  const handleOpenAsset = () => {
    if (video?.creativeLink) {
      window.open(video.creativeLink, '_blank', 'noopener,noreferrer');
    } else if (video?.videoUploadUrl) {
      window.open(video.videoUploadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle fullscreen toggle for video
  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Handle notes save on blur
  const handleNotesBlur = useCallback(async () => {
    if (!video || !onNotesChange) return;
    if (notesValue === (video.notes ?? '')) return; // No change
    setIsSavingNotes(true);
    try {
      await onNotesChange(video.id, notesValue);
    } finally {
      setIsSavingNotes(false);
    }
  }, [video, onNotesChange, notesValue]);

  // Handle reject (Review → To Do)
  const handleReject = useCallback(async () => {
    if (!video || !onStatusChange) return;
    await onStatusChange(video.id, 'todo');
  }, [video, onStatusChange]);

  // Handle accept (Review → Available)
  const handleAccept = useCallback(async () => {
    if (!video || !onStatusChange) return;
    await onStatusChange(video.id, 'available');
  }, [video, onStatusChange]);

  // Get the video URL for preview (prefer attachment, fallback to Creative Link)
  const getVideoPreviewUrl = (): string | null => {
    if (video?.videoUploadUrl) {
      return video.videoUploadUrl;
    }
    if (video?.creativeLink) {
      return video.creativeLink;
    }
    return null;
  };

  const videoPreviewUrl = video ? getVideoPreviewUrl() : null;

  if (!video) {
    return null;
  }

  // Title = Airtable Video Name field (primary field)
  const title = video.name;

  // Get pill styles
  const statusStyle = getStatusPillStyle(video.status);
  const productStyle = getProductPillStyle(video.product.id);
  const editorStyle = getEditorPillStyle(video.editor.id);

  // Build pill configs for rows
  const row1Pills: PillConfig[] = [
    {
      label: video.product.name,
      backgroundColor: productStyle.backgroundColor,
      color: productStyle.color,
      dotColor: productStyle.dotColor,
    },
    {
      label: video.editor.name,
      backgroundColor: editorStyle.backgroundColor,
      color: editorStyle.color,
    },
    {
      label: STATUS_LABELS[video.status],
      backgroundColor: statusStyle.backgroundColor,
      color: statusStyle.color,
    },
  ];

  const row2Pills: PillConfig[] = [
    {
      label: FORMAT_LABELS[video.format] || video.format,
      backgroundColor: NEUTRAL_PILL.bg,
      color: NEUTRAL_PILL.text,
    },
    {
      label: video.hasText ? 'Text' : 'No Text',
      backgroundColor: NEUTRAL_PILL.bg,
      color: NEUTRAL_PILL.text,
    },
  ];

  // Show bottom button?
  const showUploadButton = isTodo && canUpload;
  const showReplaceButton = isReview && canUpload;
  const showBottomButton = showUploadButton || showReplaceButton;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <DetailPanel open={open} onClose={onClose} width={520}>
        {/* Header with pills */}
        <DetailHeader title={title} onClose={onClose}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <DetailPills pills={row1Pills} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DetailPills pills={row2Pills} />
              {video.parentDriveLink && (
                <IconButton
                  size="small"
                  onClick={() => window.open(video.parentDriveLink, '_blank', 'noopener,noreferrer')}
                  sx={{
                    color: 'text.secondary',
                    bgcolor: 'action.hover',
                    width: 24,
                    height: 24,
                    '&:hover': {
                      bgcolor: 'action.selected',
                      color: 'primary.main',
                    },
                  }}
                >
                  <FolderOpenIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
          </Box>
        </DetailHeader>

        {/* Body - with bottom padding for sticky button */}
        <DetailPanelBody hasActions={showBottomButton}>
          {/* 1. Script Section */}
          <DetailSection label="Script">
            <DetailContent
              content={video.scriptContent}
              placeholder="No script content available"
            />
            {onViewScript && video.script?.id && (
              <Button
                variant="text"
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                onClick={() => onViewScript(video.script.id)}
                sx={{
                  mt: 1,
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  px: 1,
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: 'transparent',
                  },
                }}
              >
                View Script
              </Button>
            )}
          </DetailSection>

          {/* 2. Video Preview Section (only show when video is uploaded) */}
          {hasVideo && (
            <DetailSection label="Video">
              <Box
                sx={{
                  width: '100%',
                  aspectRatio: video.format === 'vertical' ? '9/16' : video.format === 'square' ? '1/1' : '16/9',
                  maxHeight: 340,
                  bgcolor: 'grey.900',
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {videoPreviewUrl ? (
                  <>
                    <Box
                      component="video"
                      ref={videoRef}
                      src={videoPreviewUrl}
                      controls
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        bgcolor: 'grey.900',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleFullscreen}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'rgba(0,0,0,0.7)',
                        },
                      }}
                    >
                      <FullscreenIcon fontSize="small" />
                    </IconButton>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No video available
                  </Typography>
                )}
              </Box>

              {videoPreviewUrl && (
                <Button
                  variant="text"
                  size="small"
                  startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  onClick={handleOpenAsset}
                  sx={{
                    mt: 1,
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    px: 1,
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'transparent',
                    },
                  }}
                >
                  Open Asset
                </Button>
              )}
            </DetailSection>
          )}

          {/* 3. Upload Zone (To Do only) */}
          {isTodo && canUpload && (
            <DetailSection label="Upload">
              <Box
                onClick={isUploading ? undefined : handleUploadClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragOver ? 'primary.main' : '#d6d3d1',
                  borderRadius: 1.5,
                  p: 2.5,
                  textAlign: 'center',
                  bgcolor: isDragOver ? 'primary.50' : '#fafaf9',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  opacity: isUploading ? 0.6 : 1,
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': isUploading
                    ? {}
                    : {
                      borderColor: 'primary.main',
                      bgcolor: 'primary.50',
                    },
                }}
              >
                <CloudUploadIcon
                  sx={{
                    fontSize: 32,
                    color: isDragOver ? 'primary.main' : '#78716c',
                    mb: 0.5,
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#57534e' }}>
                  {isUploading ? 'Uploading...' : 'Click or drop to upload video'}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#a8a29e' }}>
                  MP4, MOV, WebM supported
                </Typography>
              </Box>
            </DetailSection>
          )}

          {/* 4. Notes Section */}
          <DetailSection label="Notes">
            <TextField
              multiline
              minRows={2}
              maxRows={6}
              fullWidth
              placeholder="Add notes..."
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              onBlur={handleNotesBlur}
              disabled={isSavingNotes}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#fafaf9',
                  fontSize: '0.85rem',
                  '& fieldset': {
                    borderColor: '#e7e5e4',
                  },
                  '&:hover fieldset': {
                    borderColor: '#d6d3d1',
                  },
                },
              }}
            />
            {isSavingNotes && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Saving...
              </Typography>
            )}
          </DetailSection>

          {/* 5. Used in Campaign (Used status only) */}
          {isUsed && (video.usedInCampaign || video.campaign) && (
            <DetailSection label="Used in Campaign">
              <Box
                sx={{
                  p: 2,
                  bgcolor: '#fafaf9',
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: '#e7e5e4',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      bgcolor: 'primary.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CampaignIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                      {video.usedInCampaign || video.campaign?.name || 'Campaign'}
                    </Typography>
                    {video.campaign?.platform && (
                      <Typography variant="caption" color="text.secondary">
                        {video.campaign.platform}
                      </Typography>
                    )}
                    {video.campaign?.date && (
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                        {video.campaign.date}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </DetailSection>
          )}

          {/* Show placeholder if used but no campaign info */}
          {isUsed && !video.usedInCampaign && !video.campaign && (
            <DetailSection label="Used in Campaign">
              <Box
                sx={{
                  p: 2,
                  bgcolor: '#fafaf9',
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: '#e7e5e4',
                }}
              >
                <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Campaign information not available
                </Typography>
              </Box>
            </DetailSection>
          )}
        </DetailPanelBody>

        {/* Bottom Action Button (pinned) */}
        {showBottomButton && (
          <DetailActions>
            {isReview && user?.role === 'Video Editor' ? (
              // Editor viewing review status: show Replace Video button
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<CloudUploadIcon />}
                onClick={handleUploadClick}
                disabled={isUploading}
                sx={{
                  py: 1.25,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  borderRadius: 1.5,
                }}
              >
                {isUploading ? 'Uploading...' : 'Replace Video'}
              </Button>
            ) : isReview ? (
              // Ops viewing review status: show Reject/Accept buttons
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={<CloseOutlinedIcon />}
                  onClick={handleReject}
                  disabled={isUpdating}
                  sx={{
                    py: 1.25,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    borderRadius: 1.5,
                    borderColor: '#d6d3d1',
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: 'error.main',
                      bgcolor: 'error.50',
                    },
                  }}
                >
                  Reject
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<CheckIcon />}
                  onClick={handleAccept}
                  disabled={isUpdating}
                  color="success"
                  sx={{
                    py: 1.25,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    borderRadius: 1.5,
                  }}
                >
                  Accept
                </Button>
              </Box>
            ) : (
              // Todo status: show Upload Video button
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<CloudUploadIcon />}
                onClick={handleUploadClick}
                disabled={isUploading}
                sx={{
                  py: 1.25,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  borderRadius: 1.5,
                }}
              >
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </Button>
            )}
          </DetailActions>
        )}
      </DetailPanel>
    </>
  );
}
