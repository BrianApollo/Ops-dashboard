import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { ToggleTabs } from '../../ui';

export interface FilterOption {
  value: string | null;
  label: string;
}

interface ListToolbarProps {
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  bulkActions?: ReactNode;
  actions?: ReactNode;
  hasSelection?: boolean;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  // Dropdown filters
  editorOptions?: FilterOption[];
  selectedEditor?: string | null;
  onEditorChange?: (value: string | null) => void;
  editorDisabled?: boolean;
  productOptions?: FilterOption[];
  selectedProduct?: string | null;
  onProductChange?: (value: string | null) => void;
  scriptOptions?: FilterOption[];
  selectedScript?: string | null;
  onScriptChange?: (value: string | null) => void;
  // View toggle
  viewMode?: 'table' | 'grid';
  onViewModeChange?: (mode: 'table' | 'grid') => void;
}

export function ListToolbar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  bulkActions,
  actions,
  hasSelection,
  editorOptions,
  selectedEditor,
  onEditorChange,
  editorDisabled,
  productOptions,
  selectedProduct,
  onProductChange,
  scriptOptions,
  selectedScript,
  onScriptChange,
  viewMode,
  onViewModeChange,
}: ListToolbarProps) {
  const dropdownSx = {
    minWidth: 140,
    '& .MuiOutlinedInput-root': {
      bgcolor: '#F1F5F9',
      borderRadius: 1,
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'transparent',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(0, 0, 0, 0.1)',
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'primary.main',
      },
    },
    '& .MuiSelect-select': {
      py: 1,
      fontSize: '0.8125rem',
    },
  };

  return (
    <Box
      data-component="list-toolbar"
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.5,
        py: 1.5,
        minHeight: 52,
      }}
    >
      {/* Dropdown Filters - Order: Editor, Product, Script */}
      {editorOptions && editorOptions.length > 0 && (
        <FormControl size="small" sx={dropdownSx}>
          <Select
            value={selectedEditor ?? ''}
            onChange={(e) => onEditorChange?.(e.target.value === '' ? null : e.target.value)}
            displayEmpty
            disabled={editorDisabled}
          >
            <MenuItem value="">
              <em>All Editors</em>
            </MenuItem>
            {editorOptions.filter(opt => opt.value !== null).map((option) => (
              <MenuItem key={option.value} value={option.value!}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {productOptions && productOptions.length > 0 && (
        <FormControl size="small" sx={dropdownSx}>
          <Select
            value={selectedProduct ?? ''}
            onChange={(e) => onProductChange?.(e.target.value === '' ? null : e.target.value)}
            displayEmpty
          >
            <MenuItem value="">
              <em>All Products</em>
            </MenuItem>
            {productOptions.filter(opt => opt.value !== null).map((option) => (
              <MenuItem key={option.value} value={option.value!}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {scriptOptions && scriptOptions.length > 0 && (
        <FormControl size="small" sx={dropdownSx}>
          <Select
            value={selectedScript ?? ''}
            onChange={(e) => onScriptChange?.(e.target.value === '' ? null : e.target.value)}
            displayEmpty
          >
            <MenuItem value="">
              <em>All Scripts</em>
            </MenuItem>
            {scriptOptions.filter(opt => opt.value !== null).map((option) => (
              <MenuItem key={option.value} value={option.value!}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Search Input - Last in filter row */}
      {onSearchChange && (
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={searchTerm ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            minWidth: 180,
            maxWidth: 220,
            '& .MuiOutlinedInput-root': {
              bgcolor: '#F1F5F9',
              borderRadius: 1,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'transparent',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0, 0, 0, 0.1)',
              },
              '&.Mui-focused': {
                bgcolor: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              },
            },
          }}
        />
      )}

      {/* Legacy filters slot */}
      {filters && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {filters}
        </Box>
      )}

      {/* Bulk actions when selection exists */}
      {hasSelection && bulkActions && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {bulkActions}
        </Box>
      )}

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Custom actions slot */}
      {actions && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {actions}
        </Box>
      )}

      {/* View Toggle - Right aligned */}
      {viewMode && onViewModeChange && (
        <ToggleTabs
          value={viewMode}
          onChange={onViewModeChange}
          options={[
            { value: 'table', label: 'Table' },
            { value: 'grid', label: 'Grid' },
          ]}
          size="small"
        />
      )}
    </Box>
  );
}
