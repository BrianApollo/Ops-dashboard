/**
 * SidebarSection - Reusable collapsible section for the details sidebar.
 */

import { useState } from 'react';
import { Box, Typography, Collapse, IconButton, Tooltip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getStatusBadgeClass } from '../useTreeState';

interface SidebarItem {
  id: string;
  name: string;
  status: string;
  badge: string;
}

interface SidebarSectionProps {
  title: string;
  icon: React.ReactNode;
  items: SidebarItem[];
  defaultOpen?: boolean;
}

export function SidebarSection({ title, icon, items, defaultOpen = false }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const theme = useTheme();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.03) },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', '& svg': { width: 16, height: 16 } }}>
            {icon}
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
            {title}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              bgcolor: alpha(theme.palette.text.primary, 0.08),
              borderRadius: 1,
              px: 0.75,
              py: 0.125,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {items.length}
          </Typography>
          <ExpandMoreIcon
            sx={{
              fontSize: 18,
              color: 'text.secondary',
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s',
            }}
          />
        </Box>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 1.5 }}>
          {items.map(item => {
            const statusClass = getStatusBadgeClass(item.status);
            const isActive = statusClass === 'active';

            return (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.75,
                  '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
                }}
              >
                <Box
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.75,
                    fontSize: 10,
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    flexShrink: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.badge}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: isActive ? 'success.main' : 'grey.400',
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                      {item.status || 'Unknown'}
                    </Typography>
                  </Box>
                </Box>
                <Tooltip title="Copy ID">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(item.id); }}
                    sx={{ p: 0.5 }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
}
