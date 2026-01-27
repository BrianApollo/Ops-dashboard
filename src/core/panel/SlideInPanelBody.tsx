import { ReactNode } from 'react';
import Box from '@mui/material/Box';

interface SlideInPanelBodyProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function SlideInPanelBody({
  children,
  noPadding = false,
}: SlideInPanelBodyProps) {
  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        px: noPadding ? 0 : 3,
        py: noPadding ? 0 : 2.5,
      }}
    >
      {children}
    </Box>
  );
}
