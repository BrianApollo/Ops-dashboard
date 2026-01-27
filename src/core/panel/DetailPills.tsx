/**
 * DetailPills - Pill row component for detail panel headers.
 * Matches the Video Editor Portal visual style.
 */

import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { basePillStyle, NEUTRAL_PILL } from '../../ui';

// Larger pill style for sidebar (matches Video Editor Portal)
const largePillStyle: React.CSSProperties = {
  ...basePillStyle,
  fontSize: 11,
  fontWeight: 500,
  padding: '5px 10px',
  borderRadius: 6,
};

export interface PillConfig {
  label: string;
  backgroundColor?: string;
  color?: string;
  /** Optional dot color (shows a colored dot before the label) */
  dotColor?: string;
}

interface DetailPillsProps {
  pills: PillConfig[];
}

export function DetailPills({ pills }: DetailPillsProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {pills.map((pill, index) => (
        <span
          key={index}
          style={{
            ...largePillStyle,
            backgroundColor: pill.backgroundColor || NEUTRAL_PILL.bg,
            color: pill.color || NEUTRAL_PILL.text,
          }}
        >
          {pill.dotColor && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: pill.dotColor,
                mr: 1,
                verticalAlign: 'middle',
              }}
            />
          )}
          {pill.label}
        </span>
      ))}
    </Box>
  );
}

/**
 * Single pill component for custom layouts.
 */
interface DetailPillProps {
  children: ReactNode;
  backgroundColor?: string;
  color?: string;
}

export function DetailPill({ children, backgroundColor, color }: DetailPillProps) {
  return (
    <span
      style={{
        ...largePillStyle,
        backgroundColor: backgroundColor || NEUTRAL_PILL.bg,
        color: color || NEUTRAL_PILL.text,
      }}
    >
      {children}
    </span>
  );
}
