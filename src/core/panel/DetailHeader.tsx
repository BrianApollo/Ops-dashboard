/**
 * DetailHeader - Header component for detail panels.
 * Matches the Video Editor Portal visual style.
 */

import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

interface DetailHeaderProps {
  title: string;
  onClose: () => void;
  /** Pills or other content to show below the title */
  children?: ReactNode;
}

export function DetailHeader({ title, onClose, children }: DetailHeaderProps) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 2.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      {/* Title with close button */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: children ? 2 : 0 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: '1.1rem',
            lineHeight: 1.3,
            pr: 2,
            flex: 1,
          }}
        >
          {title}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ ml: 1, mt: -0.5, mr: -1 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      {children}
    </Box>
  );
}
