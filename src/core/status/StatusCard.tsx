import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

interface StatusCardGridProps {
  children: React.ReactNode;
}

/**
 * Grid container for StatusCard components.
 */
export function StatusCardGrid({ children }: StatusCardGridProps) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
      {children}
    </Box>
  );
}

interface StatusCardProps {
  label: string;
  subtitle?: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
  size?: 'default' | 'compact';
  icon?: ReactNode;
}

export function StatusCard({
  label,
  subtitle,
  count,
  active = false,
  onClick,
  size = 'default',
  icon,
}: StatusCardProps) {
  const theme = useTheme();
  const isCompact = size === 'compact';
  const isClickable = !!onClick;

  return (
    <Paper
      variant={active ? 'elevation' : 'outlined'}
      elevation={active ? 3 : 0}
      onClick={onClick}
      sx={{
        height: isCompact ? 56 : 110,
        px: isCompact ? 2 : 3,
        py: isCompact ? 1 : 2.5,
        cursor: isClickable ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: isCompact ? 'row' : 'column',
        alignItems: isCompact ? 'center' : 'flex-start',
        justifyContent: isCompact ? 'space-between' : 'center',
        gap: isCompact ? 1.5 : 0,
        position: 'relative',
        bgcolor: active
          ? 'primary.main'
          : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.03),
        color: active ? 'primary.contrastText' : 'text.primary',
        borderRadius: 2,
        transition: 'all 0.15s ease-in-out',
        overflow: 'hidden',
        minWidth: isCompact ? 100 : 'auto',
        ...(isClickable && {
          '&:hover': {
            bgcolor: active
              ? 'primary.dark'
              : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
            borderColor: active ? 'primary.dark' : 'primary.main',
            boxShadow: active ? 3 : 1,
          },
        }),
      }}
    >
      {/* Subtle icon watermark in background */}
      {icon && !isCompact && (
        <Box
          sx={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: active ? 0.15 : 0.07,
            fontSize: 40,
            display: 'flex',
            color: active ? 'primary.contrastText' : 'primary.main',
            pointerEvents: 'none',
          }}
        >
          {icon}
        </Box>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Typography
          variant="body2"
          noWrap
          sx={{
            opacity: active ? 0.9 : 0.7,
            fontWeight: 500,
            fontSize: isCompact ? 12 : 14,
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            noWrap
            sx={{
              opacity: active ? 0.7 : 0.5,
              fontWeight: 400,
              fontSize: isCompact ? 10 : 11,
              lineHeight: 1.2,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      <Typography
        variant={isCompact ? 'h6' : 'h4'}
        sx={{
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        {count}
      </Typography>
    </Paper>
  );
}
