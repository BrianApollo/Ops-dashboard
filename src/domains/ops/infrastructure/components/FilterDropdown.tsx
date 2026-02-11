/**
 * FilterDropdown - Status filter dropdown for tree columns.
 */

import { useState, useRef } from 'react';
import { Box, Popover, Checkbox, FormControlLabel, Button, IconButton, Typography } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import type { TreeFilterState } from '../../../../features/infrastructure/types';

interface FilterDropdownProps {
  type: 'adaccount' | 'bm';
  filters: TreeFilterState;
  onToggle: (type: 'adaccount' | 'bm', status: keyof TreeFilterState['adaccount']) => void;
  onSelectAll: (type: 'adaccount' | 'bm') => void;
  onClearAll: (type: 'adaccount' | 'bm') => void;
}

export function FilterDropdown({ type, filters, onToggle, onSelectAll, onClearAll }: FilterDropdownProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const open = Boolean(anchorEl);

  const filterState = filters[type];
  const allSelected = Object.values(filterState).every(v => v);

  const statuses: Array<{ key: keyof typeof filterState; label: string }> = [
    { key: 'active', label: 'Active' },
    { key: 'disabled', label: 'Disabled' },
    { key: 'pending', label: 'Pending' },
    { key: 'unknown', label: 'Unknown' },
  ];

  return (
    <>
      <IconButton
        ref={btnRef}
        size="small"
        onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
        sx={{
          p: 0.5,
          color: allSelected ? 'text.secondary' : 'primary.main',
        }}
      >
        <FilterListIcon sx={{ fontSize: 16 }} />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 1.5, minWidth: 160 } } }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', px: 0.5 }}>
          Filter by Status
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, mb: 1 }}>
          <Button size="small" onClick={() => onSelectAll(type)} sx={{ fontSize: 11, minWidth: 0, px: 1 }}>
            All
          </Button>
          <Button size="small" onClick={() => onClearAll(type)} sx={{ fontSize: 11, minWidth: 0, px: 1 }}>
            None
          </Button>
        </Box>
        {statuses.map(({ key, label }) => (
          <FormControlLabel
            key={key}
            control={
              <Checkbox
                size="small"
                checked={filterState[key]}
                onChange={() => onToggle(type, key)}
                sx={{ py: 0.25 }}
              />
            }
            label={<Typography variant="body2" sx={{ fontSize: 13 }}>{label}</Typography>}
            sx={{ display: 'flex', mx: 0 }}
          />
        ))}
      </Popover>
    </>
  );
}
