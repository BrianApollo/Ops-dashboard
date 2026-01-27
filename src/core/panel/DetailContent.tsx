/**
 * DetailContent - Content box with warm stone styling.
 * Used for script content, read-only notes, etc.
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface DetailContentProps {
  content: string | null | undefined;
  placeholder?: string;
  /** Max height in pixels. Default 280 (larger for better readability) */
  maxHeight?: number;
}

export function DetailContent({
  content,
  placeholder = 'No content available',
  maxHeight = 280,
}: DetailContentProps) {
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: '#fafaf9',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: '#e7e5e4',
        maxHeight,
        overflow: 'auto',
      }}
    >
      {content ? (
        <Typography
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.65,
            fontSize: '0.85rem',
            color: 'text.primary',
          }}
        >
          {content}
        </Typography>
      ) : (
        <Typography
          variant="body2"
          color="text.disabled"
          sx={{ fontStyle: 'italic', fontSize: '0.85rem' }}
        >
          {placeholder}
        </Typography>
      )}
    </Box>
  );
}
