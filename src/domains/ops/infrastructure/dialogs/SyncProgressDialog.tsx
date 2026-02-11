/**
 * SyncProgressDialog - Real-time sync progress log.
 */

import { useRef, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { SyncLogEntry } from '../useInfraActions';

interface SyncProgressDialogProps {
  open: boolean;
  profileName: string;
  logs: SyncLogEntry[];
  done: boolean;
  onClose: () => void;
}

export function SyncProgressDialog({ open, profileName, logs, done, onClose }: SyncProgressDialogProps) {
  const theme = useTheme();
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <Dialog open={open} onClose={done ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>Syncing {profileName}</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            fontFamily: 'monospace',
            fontSize: 12,
            maxHeight: 400,
            overflow: 'auto',
            p: 1.5,
            borderRadius: 1,
            bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
          }}
        >
          {logs.map((entry, idx) => (
            <Typography
              key={idx}
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: entry.isError
                  ? 'error.main'
                  : entry.isSuccess
                    ? 'success.main'
                    : 'text.primary',
                mt: 0.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {entry.message}
            </Typography>
          ))}
          <div ref={logEndRef} />
        </Box>
      </DialogContent>
      {done && (
        <DialogActions>
          <Button variant="contained" onClick={onClose}>Close</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
