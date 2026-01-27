/**
 * VideoNameCell - Video name with format/text version pills.
 * Used in table and list views.
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import VideocamIcon from '@mui/icons-material/Videocam';
import { DraftIndicator } from '../../../core/form';
import { FORMAT_LABELS, FORMAT_COLORS, TEXT_VERSION_COLORS } from '../status';
import type { VideoAsset } from '../types';

const miniPillSx = {
  display: 'inline-flex',
  alignItems: 'center',
  px: 0.75,
  py: 0.25,
  borderRadius: 0.75,
  fontSize: '0.65rem',
  fontWeight: 500,
  lineHeight: 1,
};

interface VideoNameCellProps {
  video: VideoAsset;
  showDraftIndicator?: boolean;
}

export function VideoNameCell({ video, showDraftIndicator = true }: VideoNameCellProps) {
  const formatColors = FORMAT_COLORS[video.format] ?? FORMAT_COLORS.square;
  const textColors = video.hasText ? TEXT_VERSION_COLORS.text : TEXT_VERSION_COLORS['no-text'];

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
      {/* Video icon indicator */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1,
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <VideocamIcon sx={{ fontSize: 18, color: 'grey.500' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
          {video.name}
        </Typography>
        {/* Format + Text Version pills */}
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
          {video.format && FORMAT_LABELS[video.format] && (
            <Box
              component="span"
              sx={{
                ...miniPillSx,
                bgcolor: formatColors.bg,
                color: formatColors.text,
              }}
            >
              {FORMAT_LABELS[video.format]}
            </Box>
          )}
          <Box
            component="span"
            sx={{
              ...miniPillSx,
              bgcolor: textColors.bg,
              color: textColors.text,
            }}
          >
            {video.hasText ? 'Text' : 'No Text'}
          </Box>
        </Box>
      </Box>
      {showDraftIndicator && <DraftIndicator draftKey={`video-edit:${video.id}`} />}
    </Box>
  );
}
