/**
 * DetailSection - Labeled section wrapper for detail panels.
 * Matches the Video Editor Portal visual style.
 */

import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface DetailSectionProps {
  label: string;
  children: ReactNode;
}

export function DetailSection({ label, children }: DetailSectionProps) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 1,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: '0.65rem',
          color: 'text.secondary',
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}
