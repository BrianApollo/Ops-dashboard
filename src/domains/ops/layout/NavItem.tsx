/**
 * NavItem - Sidebar navigation link component.
 * Used in OpsLayout for main and secondary navigation.
 */

import { NavLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';

export interface NavItemProps {
  to: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
}

export function NavItem({ to, label, icon: Icon, active, collapsed }: NavItemProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const content = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: collapsed ? 0 : 2,
        py: 1.25,
        borderRadius: 2,
        justifyContent: collapsed ? 'center' : 'flex-start',
        color: active
          ? theme.palette.primary.main
          : theme.palette.text.secondary,
        bgcolor: active
          ? alpha(theme.palette.primary.main, isDark ? 0.15 : 0.08)
          : 'transparent',
        fontWeight: active ? 600 : 500,
        fontSize: '0.875rem',
        transition: 'all 0.15s ease-in-out',
        '&:hover': {
          bgcolor: active
            ? alpha(theme.palette.primary.main, isDark ? 0.2 : 0.12)
            : theme.palette.action.hover,
          color: active
            ? theme.palette.primary.main
            : theme.palette.text.primary,
        },
      }}
    >
      <Icon
        sx={{
          fontSize: 20,
          flexShrink: 0,
        }}
      />
      {!collapsed && (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'inherit',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );

  return (
    <NavLink to={to} style={{ textDecoration: 'none' }}>
      {collapsed ? (
        <Tooltip title={label} placement="right" arrow>
          {content}
        </Tooltip>
      ) : (
        content
      )}
    </NavLink>
  );
}
