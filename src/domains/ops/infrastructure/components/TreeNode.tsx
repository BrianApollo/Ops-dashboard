/**
 * TreeNode - Card-style clickable entity node in the tree.
 *
 * Vertical layout: icon on top, name below, status badge below.
 * Left border colored by status. Hover lifts card.
 */

import { Box, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import type { EntityType } from '../../../../features/infrastructure/types';
import { getStatusBadgeClass } from '../useTreeState';

interface TreeNodeProps {
  type: EntityType;
  id: string;
  name: string;
  status?: string;
  icon: string;
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  isHiddenItem?: boolean;
  hasSystemUser?: boolean;
  onClick: () => void;
  nodeRef: (el: HTMLDivElement | null) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  disabled: '#ef4444',
  pending: '#f59e0b',
  unknown: '#6b7280',
};

export function TreeNode({
  type, id, name, status, icon,
  isSelected, isHighlighted, isDimmed, isHiddenItem, hasSystemUser,
  onClick, nodeRef,
}: TreeNodeProps) {
  const theme = useTheme();
  const statusClass = getStatusBadgeClass(status);
  const sc = STATUS_COLORS[statusClass];

  const borderColor = isSelected || isHighlighted
    ? theme.palette.primary.main
    : theme.palette.divider;

  return (
    <Box
      ref={nodeRef}
      data-type={type}
      data-id={id}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        px: '14px',
        py: '10px',
        borderRadius: '10px',
        cursor: 'pointer',
        border: `2px solid ${borderColor}`,
        borderLeft: `4px solid ${sc}`,
        bgcolor: isSelected
          ? alpha(theme.palette.primary.main, 0.15)
          : isHighlighted
            ? alpha(theme.palette.primary.main, 0.1)
            : theme.palette.background.paper,
        opacity: isDimmed ? 0.3 : isHiddenItem ? 0.5 : 1,
        transition: 'all 0.2s',
        minWidth: 100,
        maxWidth: 140,
        position: 'relative',
        boxShadow: isSelected
          ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`
          : 'none',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 12px ${alpha(theme.palette.text.primary, 0.15)}`,
        },
        ...(isHiddenItem && { borderStyle: 'dashed' }),
      }}
    >
      <Box sx={{ fontSize: 20, mb: '5px', lineHeight: 1 }}>{icon}</Box>
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: 11,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          mb: status ? '3px' : 0,
        }}
      >
        {name || 'Unnamed'}
      </Typography>
      {status && (
        <Box
          sx={{
            px: '6px',
            py: '2px',
            borderRadius: '3px',
            fontSize: 9,
            fontWeight: 600,
            display: 'inline-block',
            bgcolor: alpha(sc, 0.1),
            color: sc,
          }}
        >
          {status}
        </Box>
      )}
      {type === 'bms' && (
        <Box
          title={hasSystemUser ? 'System User configured' : 'No System User'}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            fontSize: 10,
            opacity: hasSystemUser ? 0.7 : 0.5,
            lineHeight: 1,
          }}
        >
          {hasSystemUser ? '\u{1F916}' : '\u26A0\uFE0F'}
        </Box>
      )}
    </Box>
  );
}
