/**
 * AddCampaignDialog - Dialog for creating a new campaign.
 * Simple form: just name input, product is preselected.
 * Status defaults to "Preparing".
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { AppDialog } from '../../../../core/dialog';

interface AddCampaignDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, productId: string) => Promise<void>;
  isSubmitting: boolean;
  productId: string;
  productName: string;
}

export function AddCampaignDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  productId,
  productName,
}: AddCampaignDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a campaign name');
      return;
    }

    setError(null);
    try {
      await onSubmit(name.trim(), productId);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    }
  };

  const resetForm = () => {
    setName('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) {
      handleSubmit();
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title="Add Campaign"
      size="sm"
      actions={
        <>
          <Button onClick={handleClose} variant="outlined" color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!canSubmit}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Product (read-only) */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.5,
              color: 'text.secondary',
              fontWeight: 500,
              textTransform: 'uppercase',
              fontSize: '0.7rem',
              letterSpacing: '0.05em',
            }}
          >
            Product
          </Typography>
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {productName}
            </Typography>
          </Box>
        </Box>

        {/* Campaign Name */}
        <TextField
          label="Campaign Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          fullWidth
          autoFocus
          disabled={isSubmitting}
          error={!!error}
          placeholder="Enter campaign name..."
        />

        {/* Status Info */}
        <Typography variant="caption" color="text.secondary">
          Campaign will be created with status "Preparing"
        </Typography>

        {/* Error Display */}
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
      </Box>
    </AppDialog>
  );
}
