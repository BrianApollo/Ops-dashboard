/**
 * VideosTab - Videos list with status filter pills.
 * Uses useListController for filter state and derived counts.
 * Uses VideoTable for consistent table presentation with portal.
 * Click on video row to open detail panel.
 * Supports upload when product is selected (onUpload prop provided).
 */

import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { useListController, FilterPills, ListPagination } from '../../../core/list';
import { EmptyState } from '../../../core/state';
import { matchesAllTokens } from '../../../utils';
import { useDetailPanel } from '../products/hooks';
import {
  VideoDetailPanel,
  VideoTable,
  defaultVideoColumns,
  getColumnsWithoutProduct,
} from '../../../features/videos';
import type { VideoAsset, VideoStatus } from '../../../features/videos';
import type { UploadProgress, VideoUploadResult } from '../../../features/videos';

type StatusFilter = VideoStatus;

interface VideoFilters {
  status: VideoStatus | null;
}

interface VideosTabProps {
  videos: VideoAsset[];
  showProductColumn: boolean;
  onStatusChange?: (videoId: string, status: 'todo' | 'available') => Promise<void>;
  onNotesChange?: (videoId: string, notes: string) => Promise<void>;
  isUpdating?: boolean;
  onViewScript?: (scriptId: string) => void;
  /** Upload handler - only provided when product is selected */
  onUpload?: (params: {
    videoId: string;
    file: File;
    onProgress?: (progress: UploadProgress) => void;
  }) => Promise<VideoUploadResult>;
  /** Permission check for upload eligibility */
  canUploadToVideo?: (video: VideoAsset) => boolean;
}

export function VideosTab({
  videos,
  showProductColumn,
  onStatusChange,
  onNotesChange,
  isUpdating = false,
  onViewScript,
  onUpload,
  canUploadToVideo,
}: VideosTabProps) {
  // Video detail panel (uses shared hook)
  const videoDetail = useDetailPanel(videos);

  // Upload state tracking (local to this component)
  const [uploadingVideoIds, setUploadingVideoIds] = useState<Set<string>>(new Set());

  const startUpload = useCallback((videoId: string) => {
    setUploadingVideoIds((prev) => new Set(prev).add(videoId));
  }, []);

  const endUpload = useCallback((videoId: string) => {
    setUploadingVideoIds((prev) => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
  }, []);

  // Upload handler for VideoDetailPanel (with progress support)
  const handleUpload = useCallback(
    async (
      videoId: string,
      file: File,
      onProgress?: (progress: UploadProgress) => void
    ) => {
      if (!onUpload) return;
      startUpload(videoId);
      try {
        await onUpload({ videoId, file, onProgress });
      } finally {
        endUpload(videoId);
      }
    },
    [onUpload, startUpload, endUpload]
  );

  // Simplified handler for VideoTable (no progress)
  const handleTableUpload = useCallback(
    async (videoId: string, file: File) => {
      await handleUpload(videoId, file);
    },
    [handleUpload]
  );

  const list = useListController<VideoAsset, VideoFilters>({
    records: videos,
    initialFilters: { status: 'available' },
    initialPageSize: 20,
    filterFn: (records, filters) =>
      filters.status ? records.filter((v) => v.status === filters.status) : records,
    searchFn: (records, searchTerm) => {
      if (!searchTerm.trim()) return records;
      return records.filter((v) => matchesAllTokens(searchTerm, v.name));
    },
  });

  // Derive status counts from all records (not filtered)
  const statusCounts = {
    todo: list.allRecords.filter((v) => v.status === 'todo').length,
    review: list.allRecords.filter((v) => v.status === 'review').length,
    available: list.allRecords.filter((v) => v.status === 'available').length,
    used: list.allRecords.filter((v) => v.status === 'used').length,
  };

  // Use shared columns from portal (with/without product based on context)
  const columns = showProductColumn ? defaultVideoColumns : getColumnsWithoutProduct();

  if (list.allRecords.length === 0) {
    return <EmptyState variant="filter" />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Status Filter Pills + Search */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FilterPills<StatusFilter>
          options={[
            { value: 'todo', status: 'todo', label: `${statusCounts.todo} To Do` },
            { value: 'review', status: 'review', label: `${statusCounts.review} In Review` },
            { value: 'available', status: 'available', label: `${statusCounts.available} Available` },
            { value: 'used', status: 'used', label: `${statusCounts.used} Used` },
          ]}
          activeFilter={list.filters.status}
          onFilterChange={(filter) => list.setFilters({ status: filter })}
        />
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Search videos..."
          value={list.searchTerm}
          onChange={(e) => list.setSearchTerm(e.target.value)}
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
            width: 400,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'grey.100',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'grey.300' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
      </Box>

      {/* Video Table */}
      <VideoTable
        videos={list.visibleRecords}
        columns={columns}
        onVideoClick={(v) => videoDetail.openDetail(v.id)}
        canUpload={canUploadToVideo}
        onUpload={onUpload ? handleTableUpload : undefined}
        uploadingIds={uploadingVideoIds}
      />

      {/* Pagination */}
      <ListPagination
        pageIndex={list.pageIndex}
        totalPages={list.totalPages}
        totalRecords={list.filteredCount}
        onPageChange={list.setPageIndex}
      />

      {/* Video Detail Panel */}
      <VideoDetailPanel
        open={videoDetail.isOpen}
        video={videoDetail.detail}
        onClose={videoDetail.closeDetail}
        onStatusChange={onStatusChange}
        onNotesChange={onNotesChange}
        isUpdating={isUpdating}
        onViewScript={onViewScript ? () => {
          if (videoDetail.detail?.script.id) {
            videoDetail.closeDetail();
            onViewScript(videoDetail.detail.script.id);
          }
        } : undefined}
        onUpload={onUpload ? handleUpload : undefined}
        isUploading={videoDetail.detail ? uploadingVideoIds.has(videoDetail.detail.id) : false}
        canUpload={videoDetail.detail && canUploadToVideo ? canUploadToVideo(videoDetail.detail) : false}
      />
    </Box>
  );
}
