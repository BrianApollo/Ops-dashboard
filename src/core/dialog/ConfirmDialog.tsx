/**
 * ConfirmDialog - Confirmation dialog for destructive/important actions.
 * Uses AppDialog for consistent styling.
 */

import DialogContentText from '@mui/material/DialogContentText';
import Button from '@mui/material/Button';
import { AppDialog } from './AppDialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'error' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AppDialog
      open={open}
      onClose={onCancel}
      title={title}
      size="xs"
      actions={
        <>
          <Button onClick={onCancel} variant="outlined" color="inherit">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} variant="contained" color={confirmColor}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <DialogContentText sx={{ color: 'text.secondary' }}>
        {message}
      </DialogContentText>
    </AppDialog>
  );
}
