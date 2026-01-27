/**
 * DetailActions - Sticky bottom action bar for detail panels.
 * Matches the Video Editor Portal visual style.
 */

import { ReactNode } from 'react';
import Box from '@mui/material/Box';

interface DetailActionsProps {
  children: ReactNode;
}

export function DetailActions({ children }: DetailActionsProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        px: 2.5,
        py: 2,
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {children}
    </Box>
  );
}
