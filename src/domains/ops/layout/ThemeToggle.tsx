/**
 * ThemeToggle - Dark/light mode toggle button.
 * Used in OpsLayout sidebar footer.
 */

import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useThemeMode } from '../../../theme';

export interface ThemeToggleProps {
  collapsed: boolean;
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const isDark = mode === 'dark';

  const button = (
    <IconButton
      onClick={toggleTheme}
      sx={{
        width: collapsed ? 40 : '100%',
        height: 40,
        borderRadius: 2,
        bgcolor: isDark
          ? alpha(theme.palette.primary.main, 0.1)
          : alpha('#000', 0.04),
        color: theme.palette.text.secondary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 1.5,
        px: collapsed ? 0 : 2,
        transition: 'all 0.15s ease-in-out',
        '&:hover': {
          bgcolor: isDark
            ? alpha(theme.palette.primary.main, 0.15)
            : alpha('#000', 0.08),
        },
      }}
    >
      {isDark ? (
        <LightModeIcon sx={{ fontSize: 20 }} />
      ) : (
        <DarkModeIcon sx={{ fontSize: 20 }} />
      )}
      {!collapsed && (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </Typography>
      )}
    </IconButton>
  );

  return collapsed ? (
    <Tooltip title={isDark ? 'Light Mode' : 'Dark Mode'} placement="right" arrow>
      {button}
    </Tooltip>
  ) : (
    button
  );
}
