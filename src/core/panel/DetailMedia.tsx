/**
 * DetailMedia - Video or image preview component.
 * Matches the Video Editor Portal visual style.
 */

import { useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';

type MediaFormat = 'square' | 'vertical' | 'youtube' | '16:9' | '1:1' | '9:16';

interface DetailMediaProps {
  type: 'video' | 'image';
  /** Direct URL to the media file */
  src?: string | null;
  /** Google Drive file ID for iframe embed */
  driveFileId?: string | null;
  /** Format for aspect ratio */
  format?: MediaFormat;
  /** Alt text for images */
  alt?: string;
  /** Callback for opening in external viewer */
  onOpenExternal?: () => void;
  /** External link URL (for "Open in Drive" button) */
  externalUrl?: string | null;
  /** Max height constraint */
  maxHeight?: number;
}

function getAspectRatio(format?: MediaFormat): string {
  switch (format) {
    case 'vertical':
    case '9:16':
      return '9/16';
    case 'square':
    case '1:1':
      return '1/1';
    case 'youtube':
    case '16:9':
    default:
      return '16/9';
  }
}

export function DetailMedia({
  type,
  src,
  driveFileId,
  format,
  alt = 'Media preview',
  onOpenExternal,
  externalUrl,
  maxHeight = 340,
}: DetailMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFullscreen = () => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleOpenExternal = () => {
    if (onOpenExternal) {
      onOpenExternal();
    } else if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    } else if (src) {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  };

  const hasMedia = Boolean(src);
  const showExternalLink = hasMedia && (externalUrl || src || onOpenExternal);

  return (
    <Box>
      <Box
        sx={{
          width: '100%',
          aspectRatio: getAspectRatio(format),
          maxHeight,
          bgcolor: 'grey.900',
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {type === 'video' && src ? (
          /* Direct video source - show native player */
          <>
            <Box
              component="video"
              ref={videoRef}
              src={src}
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
        ) : type === 'image' && src ? (
          /* Direct image source */
          <Box
            component="img"
            src={src}
            alt={alt}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          /* No media - show placeholder */
          <Box sx={{ textAlign: 'center', color: 'grey.500' }}>
            {type === 'video' ? (
              <VideocamIcon sx={{ fontSize: 48, opacity: 0.4 }} />
            ) : (
              <ImageIcon sx={{ fontSize: 48, opacity: 0.4 }} />
            )}
            <Typography variant="body2" sx={{ mt: 1, color: 'grey.400', fontSize: '0.85rem' }}>
              No {type} available
            </Typography>
          </Box>
        )}
      </Box>

      {/* Open in external viewer button */}
      {showExternalLink && (
        <Button
          variant="text"
          size="small"
          startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
          onClick={handleOpenExternal}
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
    </Box>
  );
}
