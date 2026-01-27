import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';

interface SlideInPanelProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}

export function SlideInPanel({
  open,
  onClose,
  width = 450,
  children,
}: SlideInPanelProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      }}
      PaperProps={{
        sx: {
          width,
          maxWidth: '100vw',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>
    </Drawer>
  );
}
