/**
 * Video table column definitions.
 * Reusable across different pages with different permissions.
 */

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { STATUS_LABELS } from '../status';
import { getStatusChipSx, getEditorChipSx, getProductChipSx, getProductDotColor } from '../../../ui';
import { VideoNameCell } from './VideoNameCell';
import type { VideoAsset } from '../types';
import type { VideoTableColumn } from './VideoTable';

/**
 * Default columns for video tables.
 * Can be filtered or extended by pages.
 */
export const defaultVideoColumns: VideoTableColumn[] = [
  {
    field: 'name',
    header: 'Video',
    render: (v: VideoAsset) => <VideoNameCell video={v} />,
  },
  {
    field: 'status',
    header: 'Status',
    render: (v: VideoAsset) => (
      <Chip
        label={STATUS_LABELS[v.status]}
        size="small"
        sx={getStatusChipSx(v.status)}
      />
    ),
  },
  {
    field: 'editor',
    header: 'Editor',
    sortable: false,
    render: (v: VideoAsset) => (
      <Chip
        label={v.editor.name}
        size="small"
        sx={getEditorChipSx(v.editor.id)}
      />
    ),
  },
  {
    field: 'product',
    header: 'Product',
    sortable: false,
    render: (v: VideoAsset) => (
      <Chip
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: getProductDotColor(v.product.id),
                flexShrink: 0,
              }}
            />
            {v.product.name}
          </Box>
        }
        size="small"
        sx={getProductChipSx(v.product.id)}
      />
    ),
  },
  {
    field: 'createdAt',
    header: 'Created',
    render: (v: VideoAsset) => (
      <Typography variant="body2" color="text.secondary">
        {new Date(v.createdAt).toLocaleDateString()}
      </Typography>
    ),
  },
];

/**
 * Get columns without the product column (for product-scoped views).
 */
export function getColumnsWithoutProduct(): VideoTableColumn[] {
  return defaultVideoColumns.filter((c) => c.field !== 'product');
}

/**
 * Get columns without the editor column (for editor-scoped views).
 */
export function getColumnsWithoutEditor(): VideoTableColumn[] {
  return defaultVideoColumns.filter((c) => c.field !== 'editor');
}
