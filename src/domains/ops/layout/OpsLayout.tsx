/**
 * Ops Layout - Modern sidebar navigation with dark/light mode toggle.
 *
 * Features:
 * - Collapsible sidebar navigation
 * - Theme toggle with smooth transitions
 * - Product-scoped navigation
 * - Responsive design
 */

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import { NavItem } from './NavItem';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';

// Icons
import InventoryIcon from '@mui/icons-material/Inventory';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

// =============================================================================
// CONSTANTS
// =============================================================================

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 72;

// =============================================================================
// NAV ITEMS (Base items without role-specific paths)
// =============================================================================

// Removed static mainNavItems definition

const secondaryNavItems = [
  { to: '/ops/infrastructure', label: 'Infrastructure', icon: SettingsInputComponentIcon },
];

// =============================================================================
// LAYOUT COMPONENT
// =============================================================================

export function OpsLayout() {
  const theme = useTheme();
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  // Dynamic navigation items based on role
  const mainNavItems = [
    ...(user?.role !== 'Video Editor' ? [{ to: '/ops', label: 'Products', icon: InventoryIcon }] : []),
  ];

  // Check if a nav item is active
  const isActive = (path: string) => {
    if (path === '/ops') {
      return location.pathname === '/ops' || location.pathname.startsWith('/ops/products');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease-in-out',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1200,
        }}
      >
        {/* Logo / Header */}
        <Box
          sx={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            px: collapsed ? 0 : 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {!collapsed && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                M
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Media Ops
              </Typography>
            </Box>
          )}
          <IconButton
            onClick={() => setCollapsed(!collapsed)}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {collapsed ? <MenuIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Box>

        {/* Main Navigation */}
        <Box sx={{ flex: 1, py: 2, px: collapsed ? 2 : 1.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {mainNavItems.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                active={isActive(item.to)}
                collapsed={collapsed}
              />
            ))}

            {secondaryNavItems
              .filter(() => user?.role !== 'Video Editor')
              .map((item) => (
                <NavItem
                  key={item.to}
                  {...item}
                  active={isActive(item.to)}
                  collapsed={collapsed}
                />
              ))}
          </Box>
        </Box>

        {/* Footer with Theme Toggle */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <UserMenu collapsed={collapsed} />
            <Divider />
            <ThemeToggle collapsed={collapsed} />
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          ml: `${sidebarWidth}px`,
          transition: 'margin-left 0.2s ease-in-out',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Content Area */}
        <Box
          sx={{
            flex: 1,
            p: 3,
            width: '100%',
            maxWidth: location.pathname === '/ops/infrastructure' ? '100%' : 1600,
            mx: location.pathname === '/ops/infrastructure' ? 0 : 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
