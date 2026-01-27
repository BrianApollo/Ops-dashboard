import { ReactNode, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Slide from '@mui/material/Slide';
import CloseIcon from '@mui/icons-material/Close';
import { ConfirmDialog } from '../dialog';
import type { BulkAction } from './useBulkActions';

interface BulkActionBarProps<T> {
  selectedCount: number;
  selectedItems: T[];
  actions: BulkAction<T>[];
  onClearSelection: () => void;
  isExecuting?: boolean;
  executingActionId?: string | null;
  onExecuteAction: (actionId: string, items: T[]) => Promise<void>;
  isActionDisabled?: (action: BulkAction<T>, items: T[]) => boolean;
  position?: 'top' | 'bottom';
  countLabel?: (count: number) => string;
}

export function BulkActionBar<T>({
  selectedCount,
  selectedItems,
  actions,
  onClearSelection,
  isExecuting = false,
  executingActionId = null,
  onExecuteAction,
  isActionDisabled,
  position = 'bottom',
  countLabel = (count) => `${count} selected`,
}: BulkActionBarProps<T>) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: BulkAction<T> | null;
  }>({ open: false, action: null });

  const handleActionClick = (action: BulkAction<T>) => {
    if (action.requiresConfirmation) {
      setConfirmDialog({ open: true, action });
    } else {
      onExecuteAction(action.id, selectedItems);
    }
  };

  const handleConfirm = () => {
    if (confirmDialog.action) {
      onExecuteAction(confirmDialog.action.id, selectedItems);
    }
    setConfirmDialog({ open: false, action: null });
  };

  const handleCancelConfirm = () => {
    setConfirmDialog({ open: false, action: null });
  };

  const positionStyles = position === 'top'
    ? { top: 0, left: 0, right: 0 }
    : { bottom: 0, left: 0, right: 0 };

  return (
    <>
      <Slide direction={position === 'top' ? 'down' : 'up'} in={selectedCount > 0} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            ...positionStyles,
            zIndex: 1100,
            mx: 2,
            mb: position === 'bottom' ? 2 : 0,
            mt: position === 'top' ? 2 : 0,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 2,
              py: 1.5,
            }}
          >
            {/* Selection Count */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={onClearSelection}
                aria-label="Clear selection"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              <Typography variant="body2" fontWeight={600}>
                {countLabel(selectedCount)}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              {actions.map((action) => {
                const disabled = isActionDisabled?.(action, selectedItems) ?? false;
                const isThisExecuting = executingActionId === action.id;

                return (
                  <Button
                    key={action.id}
                    size="small"
                    variant={action.variant === 'destructive' ? 'outlined' : 'contained'}
                    color={action.variant === 'destructive' ? 'error' : 'primary'}
                    disabled={disabled || isExecuting}
                    onClick={() => handleActionClick(action)}
                    startIcon={
                      isThisExecuting ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        action.icon
                      )
                    }
                  >
                    {action.label}
                  </Button>
                );
              })}
            </Box>
          </Box>
        </Paper>
      </Slide>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={`Confirm ${confirmDialog.action?.label || 'Action'}`}
        message={
          confirmDialog.action?.confirmationMessage ||
          `Are you sure you want to ${confirmDialog.action?.label.toLowerCase()} ${selectedCount} item${selectedCount !== 1 ? 's' : ''}?`
        }
        confirmLabel={confirmDialog.action?.label || 'Confirm'}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />
    </>
  );
}

// Render prop version for custom layouts
interface BulkActionRenderProps<T> {
  selectedCount: number;
  selectedItems: T[];
  actions: BulkAction<T>[];
  isExecuting: boolean;
  executingActionId: string | null;
  onExecuteAction: (actionId: string) => void;
  onClearSelection: () => void;
}

interface BulkActionContainerProps<T> {
  selectedItems: T[];
  actions: BulkAction<T>[];
  onClearSelection: () => void;
  isExecuting?: boolean;
  executingActionId?: string | null;
  onExecuteAction: (actionId: string, items: T[]) => Promise<void>;
  children: (props: BulkActionRenderProps<T>) => ReactNode;
}

export function BulkActionContainer<T>({
  selectedItems,
  actions,
  onClearSelection,
  isExecuting = false,
  executingActionId = null,
  onExecuteAction,
  children,
}: BulkActionContainerProps<T>) {
  const handleExecute = (actionId: string) => {
    onExecuteAction(actionId, selectedItems);
  };

  return (
    <>
      {children({
        selectedCount: selectedItems.length,
        selectedItems,
        actions,
        isExecuting,
        executingActionId,
        onExecuteAction: handleExecute,
        onClearSelection,
      })}
    </>
  );
}
