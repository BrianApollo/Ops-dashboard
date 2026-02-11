/**
 * GenerateTokenDialog - Auto-generate system user token with step-by-step progress.
 */

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import type { GenerateTokenState } from '../useInfraActions';

interface GenerateTokenDialogProps {
  state: GenerateTokenState;
  onClose: () => void;
}

export function GenerateTokenDialog({ state, onClose }: GenerateTokenDialogProps) {
  const theme = useTheme();

  return (
    <Dialog open={state.open} maxWidth="sm" fullWidth>
      <DialogTitle>Generate System User Token</DialogTitle>
      <DialogContent>
        {state.result === 'pending' && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CircularProgress size={32} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {state.status}
            </Typography>
          </Box>
        )}

        {state.result === 'success' && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              System User Token Generated!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Token saved to database
            </Typography>
          </Box>
        )}

        {state.result === 'error' && (
          <Box sx={{ py: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'error.main', fontWeight: 600, mb: 1 }}>
              Error
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {state.errorMessage}
            </Typography>
          </Box>
        )}

        {state.result === 'instructions' && (
          <Box sx={{ py: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'warning.main', fontWeight: 600, mb: 1 }}>
              {state.errorMessage}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8 }}
            >
              {state.instructions}
            </Typography>
          </Box>
        )}
      </DialogContent>
      {state.result !== 'pending' && (
        <DialogActions>
          <Button variant="contained" onClick={onClose}>Close</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
