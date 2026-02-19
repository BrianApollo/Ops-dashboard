import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

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
}

export function StatusCard({
  label,
  subtitle,
  count,
  active = false,
  onClick,
  size = 'default',
}: StatusCardProps) {
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
        bgcolor: active ? 'primary.main' : 'background.paper',
        color: active ? 'primary.contrastText' : 'text.primary',
        borderRadius: 2,
        transition: 'all 0.15s ease-in-out',
        overflow: 'hidden',
        minWidth: isCompact ? 100 : 'auto',
        ...(isClickable && {
          '&:hover': {
            bgcolor: active ? 'primary.dark' : 'action.hover',
            transform: 'translateY(-2px)',
            boxShadow: active ? 4 : 2,
          },
        }),
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isCompact ? 'flex-start' : 'flex-start' }}>
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
