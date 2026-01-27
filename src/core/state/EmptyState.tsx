import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';

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

const variantDefaults: Record<EmptyVariant, { icon: ReactNode; title: string; message: string }> = {
  default: {
    icon: <InboxIcon sx={{ fontSize: 48, color: 'text.disabled' }} />,
    title: 'No items yet',
    message: 'Get started by creating your first item.',
  },
  search: {
    icon: <SearchOffIcon sx={{ fontSize: 48, color: 'text.disabled' }} />,
    title: 'No results found',
    message: 'Try adjusting your search terms or clearing the search.',
  },
  filter: {
    icon: <FilterListOffIcon sx={{ fontSize: 48, color: 'text.disabled' }} />,
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
  const defaults = variantDefaults[variant];
  const displayIcon = icon ?? defaults.icon;
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
      {displayIcon}
      <Typography
        variant={compact ? 'subtitle1' : 'h6'}
        sx={{ mt: 2, fontWeight: 600 }}
      >
        {displayTitle}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 1, maxWidth: 400 }}
      >
        {displayMessage}
      </Typography>
      {(action || secondaryAction) && (
        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          {action && (
            <Button variant="contained" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outlined" onClick={secondaryAction.onClick}>
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
