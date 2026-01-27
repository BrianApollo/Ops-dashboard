/**
 * ProductSelector - Header component with product dropdown.
 * Handles product selection, status change, and drive link.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Link from '@mui/material/Link';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import Divider from '@mui/material/Divider';
import { StatusPill } from '../../../ui';
import type { ProductInfo } from './composition/types';

// Product status options (for dropdowns)
export const PRODUCT_STATUSES = ['Active', 'Preparing', 'Benched'] as const;

interface ProductSelectorProps {
  products: ProductInfo[];
  selectedProduct: ProductInfo | null;
  onSelect: (productId: string | null) => void;
  onStatusChange: (status: string) => void;
  onCreateProduct: () => void;
}

export function ProductSelector({
  products,
  selectedProduct,
  onSelect,
  onStatusChange,
  onCreateProduct,
}: ProductSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1,
        minHeight: 56,
        bgcolor: 'background.paper',
      }}
    >
      {selectedProduct ? (
        <>
          {/* Logo */}
          {selectedProduct.logos[0]?.url ? (
            <Box
              component="img"
              src={selectedProduct.logos[0].url}
              alt={`${selectedProduct.name} logo`}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                objectFit: 'contain',
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'divider',
                p: 0.5,
              }}
            />
          ) : (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: 'primary.50',
                border: '1px solid',
                borderColor: 'primary.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              {selectedProduct.name.charAt(0).toUpperCase()}
            </Box>
          )}

          {/* Product Name - Clickable */}
          <Box
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 },
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              {selectedProduct.name}
            </Typography>
            <KeyboardArrowDownIcon sx={{ color: 'text.secondary', fontSize: '1.25rem' }} />
          </Box>

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Status Pill */}
          <Box
            onClick={(e) => setStatusAnchor(e.currentTarget)}
            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
          >
            <StatusPill status={selectedProduct.status} />
          </Box>

          {/* Status Menu */}
          <Menu
            anchorEl={statusAnchor}
            open={Boolean(statusAnchor)}
            onClose={() => setStatusAnchor(null)}
          >
            {PRODUCT_STATUSES.map((s) => (
              <MenuItem
                key={s}
                onClick={() => { onStatusChange(s); setStatusAnchor(null); }}
                selected={selectedProduct.status === s}
                sx={{ textTransform: 'capitalize' }}
              >
                {s}
              </MenuItem>
            ))}
          </Menu>

          {/* Asset folder link - removed during Cloudflare migration */}

          {/* Clear Button */}
          <IconButton
            size="small"
            onClick={() => onSelect(null)}
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      ) : (
        <>
          {/* No Product Selected State */}
          <Button
            variant="text"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              px: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            All Products
          </Button>
        </>
      )}

      {/* Product Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { minWidth: 260, maxHeight: 360 } }}
      >
        <MenuItem
          onClick={() => { onSelect(null); setAnchorEl(null); }}
          selected={!selectedProduct}
          sx={{ fontWeight: !selectedProduct ? 600 : 400 }}
        >
          All Products
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={() => { onCreateProduct(); setAnchorEl(null); }}
          sx={{ color: 'primary.main', gap: 1, fontWeight: 500 }}
        >
          <AddIcon fontSize="small" />
          Create New Product
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        {products.map((p) => (
          <MenuItem
            key={p.id}
            onClick={() => { onSelect(p.id); setAnchorEl(null); }}
            selected={selectedProduct?.id === p.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 1,
            }}
          >
            {p.logos[0]?.url ? (
              <Box
                component="img"
                src={p.logos[0].url}
                alt=""
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 0.5,
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 0.5,
                  bgcolor: 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                }}
              >
                {p.name.charAt(0)}
              </Box>
            )}
            <span style={{ flex: 1 }}>{p.name}</span>
            <StatusPill status={p.status} />
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}
