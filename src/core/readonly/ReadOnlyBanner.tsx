import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LockIcon from '@mui/icons-material/Lock';
import { useReadOnly } from './ReadOnlyContext';

interface ReadOnlyBannerProps {
  showToggle?: boolean;
  toggleLabel?: string;
  customMessage?: string;
}

export function ReadOnlyBanner({
  showToggle = false,
  toggleLabel = 'Enable Editing',
  customMessage,
}: ReadOnlyBannerProps) {
  const { isReadOnly, reason, toggleReadOnly } = useReadOnly();

  if (!isReadOnly) {
    return null;
  }

  const message = customMessage || reason || 'You are viewing this in read-only mode. Changes cannot be made.';

  return (
    <Alert
      severity="info"
      icon={<LockIcon />}
      action={
        showToggle ? (
          <Button color="inherit" size="small" onClick={toggleReadOnly}>
            {toggleLabel}
          </Button>
        ) : undefined
      }
      sx={{ mb: 2 }}
    >
      {message}
    </Alert>
  );
}

// Compact version for inline use
interface ReadOnlyIndicatorProps {
  showLabel?: boolean;
}

export function ReadOnlyIndicator({ showLabel = true }: ReadOnlyIndicatorProps) {
  const { isReadOnly } = useReadOnly();

  if (!isReadOnly) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        color: 'text.secondary',
        fontSize: '0.75rem',
      }}
    >
      <LockIcon sx={{ fontSize: 14 }} />
      {showLabel && 'Read-only'}
    </Box>
  );
}
