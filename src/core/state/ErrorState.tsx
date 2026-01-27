import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

type ErrorVariant = 'default' | 'inline' | 'alert';

interface ErrorStateProps {
  variant?: ErrorVariant;
  title?: string;
  message?: string;
  error?: Error | string | null;
  icon?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
  outlined?: boolean;
}

function getErrorMessage(error: Error | string | null | undefined): string {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;
  return error.message || 'An unexpected error occurred.';
}

export function ErrorState({
  variant = 'default',
  title = 'Something went wrong',
  message,
  error,
  icon,
  onRetry,
  retryLabel = 'Try Again',
  compact = false,
  outlined = true,
}: ErrorStateProps) {
  const displayMessage = message ?? getErrorMessage(error);

  if (variant === 'inline') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'error.main',
        }}
      >
        <ErrorOutlineIcon fontSize="small" />
        <Typography variant="body2">{displayMessage}</Typography>
        {onRetry && (
          <Button size="small" onClick={onRetry} startIcon={<RefreshIcon />}>
            {retryLabel}
          </Button>
        )}
      </Box>
    );
  }

  if (variant === 'alert') {
    return (
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button color="inherit" size="small" onClick={onRetry}>
              {retryLabel}
            </Button>
          )
        }
      >
        <AlertTitle>{title}</AlertTitle>
        {displayMessage}
      </Alert>
    );
  }

  // Default: full error state
  const displayIcon = icon ?? (
    <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main' }} />
  );

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: compact ? 4 : 8,
        px: 3,
      }}
    >
      {displayIcon}
      <Typography
        variant={compact ? 'subtitle1' : 'h6'}
        sx={{ mt: 2, fontWeight: 600, color: 'error.main' }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 1, maxWidth: 400 }}
      >
        {displayMessage}
      </Typography>
      {onRetry && (
        <Button
          variant="outlined"
          color="error"
          onClick={onRetry}
          startIcon={<RefreshIcon />}
          sx={{ mt: 3 }}
        >
          {retryLabel}
        </Button>
      )}
    </Box>
  );

  if (outlined) {
    return (
      <Paper variant="outlined" sx={{ width: '100%' }}>
        {content}
      </Paper>
    );
  }

  return content;
}
