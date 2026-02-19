import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

type LoadingVariant = 'spinner' | 'skeleton' | 'inline';

interface LoadingStateProps {
  variant?: LoadingVariant;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  skeletonRows?: number;
  skeletonHeight?: number;
  fullHeight?: boolean;
  children?: ReactNode;
}

const sizeMap = {
  small: 24,
  medium: 40,
  large: 56,
};

export function LoadingState({
  variant = 'spinner',
  message,
  size = 'medium',
  skeletonRows = 3,
  skeletonHeight = 48,
  fullHeight = false,
  children,
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <CircularProgress size={16} />
        {message && (
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  if (variant === 'skeleton') {
    return (
      <Box sx={{ width: '100%' }}>
        {Array.from({ length: skeletonRows }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={skeletonHeight}
            sx={{ mb: 1, borderRadius: 1 }}
          />
        ))}
        {children}
      </Box>
    );
  }

  // Default: spinner variant
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: fullHeight ? 0 : 8,
        minHeight: fullHeight ? '100%' : 'auto',
      }}
    >
      <CircularProgress size={sizeMap[size]} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
      {children}
    </Box>
  );
}
