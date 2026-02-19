/**
 * ToggleTabs - Pill-style segmented control.
 *
 * A unified toggle component that can be used for:
 * - View mode switches (Table/Grid)
 * - Page section navigation (Campaigns/Videos/Images)
 * - Any multi-option selection
 */

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface ToggleTabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface ToggleTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ToggleTabOption<T>[];
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ToggleTabs<T extends string>({
  value,
  onChange,
  options,
  size = 'medium',
  fullWidth = false,
  sx,
}: ToggleTabsProps<T>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isSmall = size === 'small';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        bgcolor: isDark
          ? alpha(theme.palette.common.white, 0.06)
          : alpha(theme.palette.common.black, 0.04),
        borderRadius: '8px',
        p: '3px',
        gap: '2px',
        ...(fullWidth && { width: '100%' }),
        ...sx,
      }}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const label = option.count !== undefined
          ? `${option.label} (${option.count})`
          : option.label;

        return (
          <ButtonBase
            key={option.value}
            onClick={() => onChange(option.value)}
            sx={{
              borderRadius: '6px',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              ...(fullWidth && { flex: 1 }),
              ...(isSmall ? {
                px: 1.5,
                py: 0.5,
                minHeight: 30,
              } : {
                px: 2,
                py: 0.75,
                minHeight: 36,
              }),
              ...(isActive ? {
                bgcolor: theme.palette.primary.main,
                color: '#fff',
                boxShadow: `0 1px 3px ${alpha(theme.palette.primary.main, 0.3)}`,
              } : {
                bgcolor: 'transparent',
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: isDark
                    ? alpha(theme.palette.common.white, 0.06)
                    : alpha(theme.palette.primary.main, 0.04),
                  color: isDark ? 'text.primary' : theme.palette.primary.main,
                },
              }),
            }}
          >
            {option.icon}
            <Typography
              variant="body2"
              sx={{
                fontWeight: isActive ? 600 : 500,
                fontSize: isSmall ? '0.8125rem' : '0.875rem',
                lineHeight: 1,
              }}
            >
              {label}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
