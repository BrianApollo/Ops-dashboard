import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import { useTheme, alpha } from '@mui/material/styles';

type EmptyVariant = 'default' | 'search' | 'filter';

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
  outlined?: boolean;
}

const variantIcons: Record<EmptyVariant, ReactNode> = {
  default: <InboxIcon sx={{ fontSize: 28, color: 'text.disabled' }} />,
  search: <SearchOffIcon sx={{ fontSize: 28, color: 'text.disabled' }} />,
  filter: <FilterListOffIcon sx={{ fontSize: 28, color: 'text.disabled' }} />,
};

const variantDefaults: Record<EmptyVariant, { title: string; message: string }> = {
  default: {
    title: 'No items yet',
    message: 'Get started by creating your first item.',
  },
  search: {
    title: 'No results found',
    message: 'Try adjusting your search terms or clearing the search.',
  },
  filter: {
    title: 'No matching items',
    message: 'No items match your current filters. Try adjusting or clearing them.',
  },
};

export function EmptyState({
  variant = 'default',
  title,
  message,
  icon,
  action,
  secondaryAction,
  compact = false,
  outlined = true,
}: EmptyStateProps) {
  const theme = useTheme();
  const defaults = variantDefaults[variant];
  const displayIcon = icon ?? variantIcons[variant];
  const displayTitle = title ?? defaults.title;
  const displayMessage = message ?? defaults.message;

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
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.06),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        {displayIcon}
      </Box>
      <Typography
        variant={compact ? 'subtitle1' : 'h6'}
        sx={{ fontWeight: 600, color: 'text.primary' }}
      >
        {displayTitle}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.75, maxWidth: 360, lineHeight: 1.6 }}
      >
        {displayMessage}
      </Typography>
      {(action || secondaryAction) && (
        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          {action && (
            <Button variant="contained" size="small" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outlined" size="small" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </Box>
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
