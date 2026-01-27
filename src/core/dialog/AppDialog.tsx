/**
 * AppDialog - Base dialog component.
 * All dialogs in the app should use this for consistent styling.
 */

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

type DialogSize = 'xs' | 'sm' | 'md' | 'lg';

interface AppDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: DialogSize;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function AppDialog({
  open,
  onClose,
  title,
  size = 'xs',
  children,
  actions,
}: AppDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={size}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        {children}
      </DialogContent>
      {actions && (
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
