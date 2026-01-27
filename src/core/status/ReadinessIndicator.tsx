/**
 * ReadinessIndicator - Shows S/V/I (Scripts/Videos/Images) readiness status.
 * Used in campaign tables and detail views.
 */

import Box from '@mui/material/Box';

interface DotProps {
  ok: boolean;
  label: string;
}

function Dot({ ok, label }: DotProps) {
  return (
    <Box
      sx={{
        width: 20,
        height: 20,
        borderRadius: 0.5,
        fontSize: '0.65rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: ok ? '#d1fae5' : '#fee2e2',
        color: ok ? '#065f46' : '#991b1b',
      }}
    >
      {label}
    </Box>
  );
}

interface ReadinessIndicatorProps {
  /** Has approved scripts */
  scripts: boolean;
  /** Has available videos */
  videos: boolean;
  /** Has available images */
  images: boolean;
}

export function ReadinessIndicator({ scripts, videos, images }: ReadinessIndicatorProps) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Dot ok={scripts} label="S" />
      <Dot ok={videos} label="V" />
      <Dot ok={images} label="I" />
    </Box>
  );
}
