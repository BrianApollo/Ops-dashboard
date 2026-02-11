/**
 * SetTokenDialog - Manual token paste dialog for System User tokens.
 */

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Link,
} from '@mui/material';

interface SetTokenDialogProps {
  open: boolean;
  bmName: string;
  currentToken: string;
  onSave: (token: string) => void;
  onClose: () => void;
}

export function SetTokenDialog({ open, bmName, currentToken, onSave, onClose }: SetTokenDialogProps) {
  const [token, setToken] = useState(currentToken);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Set System User Token</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Enter the System User access token for <strong>{bmName}</strong>
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2 }}>
          Create a System User in{' '}
          <Link href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener">
            Business Settings &rarr; System Users
          </Link>
          , then generate an access token with ads_management and business_management permissions.
        </Typography>
        <TextField
          multiline
          minRows={4}
          fullWidth
          placeholder="Paste System User token here..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 11 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(token)}>Save Token</Button>
      </DialogActions>
    </Dialog>
  );
}
