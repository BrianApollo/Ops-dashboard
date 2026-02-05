/**
 * CreativesColumn - LEFT column for Campaign Launch.
 * Videos/Images tabs with checkbox selection.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import FormControlLabel from '@mui/material/FormControlLabel';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ImageIcon from '@mui/icons-material/Image';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import { StatusPill } from '../../../../../ui';
import { EmptyState } from '../../../../../core/state';
import { textMd, textSm } from '../../../../../theme/typography';
import type { SelectableVideo, SelectableImage, CreativeTab, VideoUploadStatus } from '../types';

const QUICK_SELECT_OPTIONS = [15, 20, 25, 30, 50];

interface PrelaunchUploaderProps {
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
}

interface CreativesColumnProps {
  videos: SelectableVideo[];
  images: SelectableImage[];
  selectedVideoIds: Set<string>;
  selectedImageIds: Set<string>;
  onToggleVideo: (id: string) => void;
  onToggleImage: (id: string) => void;
  onSelectRandomVideos?: (count: number) => void;
  onSelectRandomImages?: (count: number) => void;
  onUnselectAllVideos?: () => void;
  onUnselectAllImages?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  reuseCreatives?: boolean;
  onToggleReuseCreatives?: () => void;
  // Prelaunch uploader
  prelaunchUploader?: PrelaunchUploaderProps;
  canCheckLibrary?: boolean;
  videosNotInLibraryCount?: number;
  selectedNotInLibraryCount?: number;
}

export function CreativesColumn({
  videos,
  images,
  selectedVideoIds,
  selectedImageIds,
  onToggleVideo,
  onToggleImage,
  onSelectRandomVideos,
  onSelectRandomImages,
  onUnselectAllVideos,
  onUnselectAllImages,
  collapsed = false,
  onToggleCollapse,
  reuseCreatives = false,
  onToggleReuseCreatives,
  prelaunchUploader,
  canCheckLibrary = false,
  videosNotInLibraryCount = 0,
  selectedNotInLibraryCount = 0,
}: CreativesColumnProps) {
  const [activeTab, setActiveTab] = useState<CreativeTab>('videos');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleQuickSelect = (count: number) => {
    if (activeTab === 'videos' && onSelectRandomVideos) {
      onSelectRandomVideos(count);
    } else if (activeTab === 'images' && onSelectRandomImages) {
      onSelectRandomImages(count);
    }
    setMenuAnchor(null);
  };

  const handleUnselectAll = () => {
    if (activeTab === 'videos' && onUnselectAllVideos) {
      onUnselectAllVideos();
    } else if (activeTab === 'images' && onUnselectAllImages) {
      onUnselectAllImages();
    }
    setMenuAnchor(null);
  };

  const currentList = activeTab === 'videos' ? videos : images;
  const currentSelectedCount = activeTab === 'videos' ? selectedVideoIds.size : selectedImageIds.size;
  const totalSelected = selectedVideoIds.size + selectedImageIds.size;

  // Collapsed view - just show icon and count
  if (collapsed) {
    return (
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2,
          height: '100%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <IconButton onClick={onToggleCollapse} size="small" sx={{ mb: 1 }}>
          <ChevronRightIcon />
        </IconButton>
        <VideoLibraryIcon sx={{ fontSize: 20, color: 'text.secondary', mb: 0.5 }} />
        <Typography variant="caption" sx={{ fontWeight: 600, writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          {totalSelected} selected
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header with Tabs */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <VideoLibraryIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography sx={textMd}>
            Media Sources
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            disabled={currentList.length === 0}
            sx={{ p: 0.5 }}
          >
            <ShuffleIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            {currentSelectedCount > 0 && (
              <MenuItem onClick={handleUnselectAll}>
                <Typography variant="body2">Unselect all</Typography>
              </MenuItem>
            )}
            {QUICK_SELECT_OPTIONS.map((count) => (
              <MenuItem
                key={count}
                onClick={() => handleQuickSelect(count)}
                disabled={count > currentList.length}
              >
                <Typography variant="body2">Select {count}</Typography>
              </MenuItem>
            ))}
          </Menu>
          {/* Check Video Library Button */}
          {activeTab === 'videos' && prelaunchUploader && (
            <Tooltip title={!canCheckLibrary ? "Select an ad account first" : "Check if videos exist in FB library"}>
              <span>
                <IconButton
                  size="small"
                  onClick={prelaunchUploader.checkLibrary}
                  disabled={!canCheckLibrary || prelaunchUploader.isChecking}
                  sx={{ p: 0.5 }}
                >
                  {prelaunchUploader.isChecking ? (
                    <CircularProgress size={16} />
                  ) : (
                    <CloudSyncIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}
          {/* Upload Videos Button */}
          {activeTab === 'videos' && prelaunchUploader && videosNotInLibraryCount > 0 && (
            <Tooltip title={
              selectedVideoIds.size === 0
                ? `Upload all ${videosNotInLibraryCount} videos not in library`
                : `Upload ${selectedNotInLibraryCount} selected videos`
            }>
              <span>
                <IconButton
                  size="small"
                  onClick={() => {
                    if (selectedVideoIds.size === 0) {
                      prelaunchUploader.uploadAllNotInLibrary();
                    } else {
                      const selectedNames = videos
                        .filter(v => selectedVideoIds.has(v.id) && !v.inLibrary)
                        .map(v => v.name);
                      prelaunchUploader.uploadVideos(selectedNames);
                    }
                  }}
                  disabled={!canCheckLibrary || prelaunchUploader.isUploading || (selectedVideoIds.size > 0 && selectedNotInLibraryCount === 0)}
                  sx={{ p: 0.5 }}
                >
                  {prelaunchUploader.isUploading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <CloudUploadIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}
          {/* Processing/Polling indicator */}
          {activeTab === 'videos' && prelaunchUploader && prelaunchUploader.isPolling && (
            <Tooltip title={`${prelaunchUploader.processingCount} video(s) processing on Facebook`}>
              <Chip
                label={`${prelaunchUploader.processingCount} processing`}
                size="small"
                color="info"
                sx={{ height: 22, fontSize: '0.7rem' }}
              />
            </Tooltip>
          )}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              minHeight: 32,
              '& .MuiTab-root': {
                minHeight: 32,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.75rem',
                px: 1.5,
                py: 0.5,
              },
              '& .MuiTabs-indicator': {
                height: 2,
              },
            }}
          >
            <Tab
              icon={<VideoLibraryIcon sx={{ fontSize: 14 }} />}
              iconPosition="start"
              label={`Videos (${videos.length})`}
              value="videos"
            />
            <Tab
              icon={<ImageIcon sx={{ fontSize: 14 }} />}
              iconPosition="start"
              label={`Images (${images.length})`}
              value="images"
            />
          </Tabs>
          <IconButton
            size="small"
            onClick={onToggleCollapse}
            sx={{ p: 0.5 }}
          >
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Reuse Creatives Option */}
      {onToggleReuseCreatives && (
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={reuseCreatives}
                onChange={onToggleReuseCreatives}
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
        </Box>
      )}
      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 'videos' && (
          <VideosList
            videos={videos}
            selectedIds={selectedVideoIds}
            onToggle={onToggleVideo}
          />
        )}
        {activeTab === 'images' && (
          <ImagesList
            images={images}
            selectedIds={selectedImageIds}
            onToggle={onToggleImage}
          />
        )}
      </Box>
    </Paper>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface VideosListProps {
  videos: SelectableVideo[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

function VideosList({ videos, selectedIds, onToggle }: VideosListProps) {
  if (videos.length === 0) {
    return <EmptyState variant="filter" />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {videos.map((video) => (
        <Box
          key={video.id}
          onClick={() => onToggle(video.id)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: 1,
            border: selectedIds.has(video.id) ? '2px solid' : '1px solid',
            borderColor: selectedIds.has(video.id) ? 'primary.main' : 'divider',
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': {
              borderColor: 'primary.main',
            },
          }}
        >
          <Checkbox
            checked={selectedIds.has(video.id)}
            size="small"
            sx={{ p: 0 }}
          />
          <Typography
            sx={{
              ...textSm,
              flex: 1,
              minWidth: 0,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {video.name}
          </Typography>
          {/* Upload Status Pills */}
          {video.uploadStatus === 'queued' && (
            <Chip
              label="Queued"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                bgcolor: '#e0e7ff',
                color: '#3730a3',
                fontWeight: 500,
                mr: 0.5,
              }}
            />
          )}
          {video.uploadStatus === 'uploading' && (
            <Chip
              label="Uploading..."
              size="small"
              icon={<CircularProgress size={10} sx={{ color: '#1d4ed8 !important' }} />}
              sx={{
                height: 18,
                fontSize: '0.65rem',
                bgcolor: '#dbeafe',
                color: '#1d4ed8',
                fontWeight: 500,
                mr: 0.5,
                '& .MuiChip-icon': { ml: 0.5 },
              }}
            />
          )}
          {video.uploadStatus === 'processing' && (
            <Chip
              label="Processing..."
              size="small"
              icon={<CircularProgress size={10} sx={{ color: '#c2410c !important' }} />}
              sx={{
                height: 18,
                fontSize: '0.65rem',
                bgcolor: '#ffedd5',
                color: '#c2410c',
                fontWeight: 500,
                mr: 0.5,
                '& .MuiChip-icon': { ml: 0.5 },
              }}
            />
          )}
          {video.uploadStatus === 'failed' && (
            <Tooltip title={video.uploadError || 'Upload failed'}>
              <Chip
                label="Failed"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: '#fee2e2',
                  color: '#b91c1c',
                  fontWeight: 500,
                  mr: 0.5,
                }}
              />
            </Tooltip>
          )}
          {(video.inLibrary || video.uploadStatus === 'ready') && (
            <Chip
              label="In Library"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                bgcolor: '#d1fae5',
                color: '#065f46',
                fontWeight: 500,
                mr: 0.5,
              }}
            />
          )}
          <StatusPill status={video.status} />
        </Box>
      ))}
    </Box>
  );
}

interface ImagesListProps {
  images: SelectableImage[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

function ImagesList({ images, selectedIds, onToggle }: ImagesListProps) {
  if (images.length === 0) {
    return <EmptyState variant="filter" />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {images.map((image) => (
        <Box
          key={image.id}
          onClick={() => onToggle(image.id)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: 1,
            border: selectedIds.has(image.id) ? '2px solid' : '1px solid',
            borderColor: selectedIds.has(image.id) ? 'primary.main' : 'divider',
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': {
              borderColor: 'primary.main',
            },
          }}
        >
          <Checkbox
            checked={selectedIds.has(image.id)}
            size="small"
            sx={{ p: 0 }}
          />
          {image.thumbnailUrl && (
            <Tooltip
              title={
                <Box
                  component="img"
                  src={image.thumbnailUrl}
                  alt={image.name}
                  sx={{
                    width: 280,
                    height: 280,
                    objectFit: 'cover',
                    borderRadius: 1,
                    display: 'block',
                  }}
                />
              }
              placement="right"
              arrow
              slotProps={{
                tooltip: {
                  sx: {
                    bgcolor: 'background.paper',
                    p: 0.5,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    '& .MuiTooltip-arrow': {
                      color: 'background.paper',
                    },
                  },
                },
              }}
            >
              <Box
                component="img"
                src={image.thumbnailUrl}
                alt={image.name}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 0.5,
                  objectFit: 'cover',
                  cursor: 'zoom-in',
                }}
              />
            </Tooltip>
          )}
          <Typography
            sx={{
              ...textSm,
              flex: 1,
              minWidth: 0,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {image.name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
