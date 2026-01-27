import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { getDraftMetadata } from './useDraftState';
import { STATUS_COLORS } from '../../constants';

interface DraftIndicatorProps {
  draftKey: string;
  size?: 'small' | 'medium';
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Use centralized draft status colors
const draftColors = STATUS_COLORS.draft;

export function DraftIndicator({ draftKey, size = 'small' }: DraftIndicatorProps) {
  const draft = getDraftMetadata(draftKey);

  if (!draft) {
    return null;
  }

  const timeAgo = formatTimeAgo(draft.savedAt);

  return (
    <Tooltip title={`Unsaved draft from ${timeAgo}`} arrow>
      <Chip
        icon={<EditNoteIcon sx={{ fontSize: size === 'small' ? 14 : 16 }} />}
        label="Draft"
        size={size}
        sx={{
          height: size === 'small' ? 20 : 24,
          fontSize: size === 'small' ? '0.65rem' : '0.75rem',
          fontWeight: 500,
          bgcolor: draftColors.bg,
          color: draftColors.text,
          border: '1px solid',
          borderColor: draftColors.border,
          '& .MuiChip-icon': {
            color: draftColors.text,
            ml: 0.5,
          },
          '& .MuiChip-label': {
            px: 0.75,
          },
        }}
      />
    </Tooltip>
  );
}

/**
 * Hook to check if a draft exists (for conditional rendering without the component)
 */
export function useDraftExists(draftKey: string): boolean {
  return getDraftMetadata(draftKey) !== null;
}
