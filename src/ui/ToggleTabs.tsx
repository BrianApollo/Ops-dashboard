/**
 * ToggleTabs - Reusable button-group style tabs.
 *
 * A unified toggle component that can be used for:
 * - View mode switches (Table/Grid)
 * - Page section navigation (Campaigns/Videos/Images)
 * - Any multi-option selection
 */

import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
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
// STYLES
// =============================================================================

const getButtonSx = (size: 'small' | 'medium', isActive: boolean): SxProps<Theme> => {
  const baseStyles: SxProps<Theme> = {
    textTransform: 'none',
    fontWeight: isActive ? 600 : 500,
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    ...(size === 'small' ? {
      fontSize: '0.8125rem',
      px: 1.5,
      py: 0.5,
      minHeight: 32,
    } : {
      fontSize: '0.875rem',
      px: 2.5,
      py: 0.75,
      minHeight: 40,
    }),
  };

  return baseStyles;
};

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
  return (
    <ButtonGroup
      size={size === 'small' ? 'small' : 'medium'}
      variant="outlined"
      sx={{
        ...(fullWidth && { width: '100%' }),
        '& .MuiButtonGroup-grouped': {
          ...(fullWidth && { flex: 1 }),
        },
        ...sx,
      }}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const label = option.count !== undefined
          ? `${option.label} (${option.count})`
          : option.label;

        return (
          <Button
            key={option.value}
            variant={isActive ? 'contained' : 'outlined'}
            onClick={() => onChange(option.value)}
            startIcon={option.icon}
            disableElevation
            sx={getButtonSx(size, isActive)}
          >
            {label}
          </Button>
        );
      })}
    </ButtonGroup>
  );
}
