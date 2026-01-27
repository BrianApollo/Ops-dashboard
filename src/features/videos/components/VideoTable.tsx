/**
 * VideoTable - Reusable video table with selection, sorting, and drag-drop upload.
 * Role-agnostic: permissions injected via props.
 */

import { useCallback, useState } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Checkbox from '@mui/material/Checkbox';
import TableSortLabel from '@mui/material/TableSortLabel';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import type { VideoAsset } from '../types';
import { tableHeaderCellSx, tableDataCellSx, tableRowSelectedSx } from '../../../domains/ops/products/composition/styles';

export interface VideoTableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  render: (video: VideoAsset) => React.ReactNode;
}

export interface VideoTableProps {
  videos: VideoAsset[];
  columns: VideoTableColumn[];
  onVideoClick: (video: VideoAsset) => void;
  // Selection (optional)
  selection?: {
    selected: Set<string>;
    isSelected: (id: string) => boolean;
    toggleSelection: (id: string) => void;
    selectAll: () => void;
    clearSelection: () => void;
    hasSelection: boolean;
  };
  // Sorting (optional)
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  } | null;
  onSort?: (field: string) => void;
  // Upload permissions (optional - role-agnostic)
  canUpload?: (video: VideoAsset) => boolean;
  onUpload?: (videoId: string, file: File) => Promise<void>;
  uploadingIds?: Set<string>;
}

export function VideoTable({
  videos,
  columns,
  onVideoClick,
  selection,
  sort,
  onSort,
  canUpload,
  onUpload,
  uploadingIds = new Set(),
}: VideoTableProps) {
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

  // Drag & drop handlers
  const handleRowDragOver = useCallback((e: React.DragEvent, videoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const video = videos.find((v) => v.id === videoId);
    if (video && canUpload?.(video)) {
      setDragOverRowId(videoId);
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  }, [videos, canUpload]);

  const handleRowDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverRowId(null);
  }, []);

  const handleRowDrop = useCallback(async (e: React.DragEvent, videoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverRowId(null);

    if (!onUpload) return;

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('video/')) return;

    const video = videos.find((v) => v.id === videoId);
    if (!video || !canUpload?.(video)) return;

    await onUpload(videoId, file);
  }, [videos, canUpload, onUpload]);

  const showUploadColumn = !!canUpload && !!onUpload;
  const showSelectionColumn = !!selection;

  return (
    <TableContainer
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            {showSelectionColumn && (
              <TableCell
                padding="checkbox"
                sx={{ ...tableHeaderCellSx, width: 48, py: 1 }}
              >
                <Checkbox
                  size="small"
                  checked={videos.length > 0 && videos.every((r) => selection.isSelected(r.id))}
                  indeterminate={selection.hasSelection && !videos.every((r) => selection.isSelected(r.id))}
                  onChange={() => (selection.hasSelection ? selection.clearSelection() : selection.selectAll())}
                />
              </TableCell>
            )}
            {columns.map((column) => (
              <TableCell
                key={column.field}
                sx={{ ...tableHeaderCellSx, whiteSpace: 'nowrap' }}
              >
                {column.sortable !== false && onSort ? (
                  <TableSortLabel
                    active={sort?.field === column.field}
                    direction={sort?.field === column.field ? sort.direction : 'asc'}
                    onClick={() => onSort(column.field)}
                  >
                    {column.header}
                  </TableSortLabel>
                ) : (
                  column.header
                )}
              </TableCell>
            ))}
            {showUploadColumn && (
              <TableCell
                sx={{ ...tableHeaderCellSx, width: 48, py: 1 }}
              />
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {videos.map((video) => {
            const isDropTarget = dragOverRowId === video.id;
            const isUploading = uploadingIds.has(video.id);
            const canDrop = canUpload?.(video) ?? false;

            return (
              <TableRow
                key={video.id}
                hover
                selected={selection?.isSelected(video.id)}
                onDragOver={showUploadColumn ? (e) => handleRowDragOver(e, video.id) : undefined}
                onDragLeave={showUploadColumn ? handleRowDragLeave : undefined}
                onDrop={showUploadColumn ? (e) => handleRowDrop(e, video.id) : undefined}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:last-child td': { borderBottom: 0 },
                  ...tableRowSelectedSx,
                  ...(isDropTarget && canDrop && {
                    bgcolor: 'primary.50',
                    outline: '2px dashed',
                    outlineColor: 'primary.main',
                    outlineOffset: -2,
                  }),
                  ...(isUploading && {
                    bgcolor: 'action.hover',
                    pointerEvents: 'none',
                  }),
                }}
                onClick={() => onVideoClick(video)}
              >
                {showSelectionColumn && (
                  <TableCell
                    padding="checkbox"
                    onClick={(e) => e.stopPropagation()}
                    sx={{ py: 1.5 }}
                  >
                    <Checkbox
                      size="small"
                      checked={selection.isSelected(video.id)}
                      onChange={() => selection.toggleSelection(video.id)}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.field}
                    sx={tableDataCellSx}
                  >
                    {column.render(video)}
                  </TableCell>
                ))}
                {showUploadColumn && (
                  <TableCell sx={{ py: 1.5, px: 1 }}>
                    {isUploading ? (
                      <CircularProgress size={18} />
                    ) : isDropTarget && canDrop ? (
                      <CloudUploadIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    ) : canDrop ? (
                      <Tooltip title="Drop video to upload">
                        <CloudUploadIcon sx={{ fontSize: 18, color: 'action.disabled', opacity: 0.5 }} />
                      </Tooltip>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
