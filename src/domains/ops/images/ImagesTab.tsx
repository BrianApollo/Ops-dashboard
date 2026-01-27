/**
 * ImagesTab - Image grid with usage-based pill filtering.
 * Uses FilterPills for Available / Used filtering.
 * Click on image card to open detail panel.
 */

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import { useListController, FilterPills } from '../../../core/list';
import { matchesAllTokens } from '../../../utils';
import {
  DetailPanel,
  DetailPanelBody,
  DetailHeader,
  DetailPills,
  DetailSection,
  DetailMedia,
  DetailContent,
} from '../../../core/panel';
import type { PillConfig } from '../../../core/panel';
import { EmptyState } from '../../../core/state';
import { StatusPill, getProductPillStyle, getStatusPillStyle } from '../../../ui';
import { useDetailPanel } from '../products/hooks';
import type { ImageItem } from '../products/composition/types';
import { imageGridSx, thumbnailContainerSx, cardBaseSx, detailInfoBoxSx } from '../products/composition/styles';

type UsageFilter = 'available' | 'used' | 'new';

interface ImageFilters {
  usage: UsageFilter | null;
}

interface ImagesTabProps {
  images: ImageItem[];
  showProductColumn: boolean;
  onApprove?: (ids: string[]) => Promise<void>;
  isApproving?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

export function ImagesTab({
  images,
  showProductColumn,
  onApprove,
  isApproving = false,
  selectedIds: propsSelectedIds,
  onSelectionChange: propsOnSelectionChange,
}: ImagesTabProps) {
  // Image detail panel (uses shared hook)
  const imageDetail = useDetailPanel(images);
  const detailImage = imageDetail.detail;

  const list = useListController<ImageItem, ImageFilters>({
    records: images,
    initialFilters: { usage: null },
    filterFn: (records, filters) => {
      if (!filters.usage) return records.filter((i) => i.status !== 'new');
      if (filters.usage === 'new') {
        return records.filter((i) => i.status === 'new');
      }
      if (filters.usage === 'available') {
        return records.filter((i) => !i.isUsed && i.status !== 'new');
      }
      return records.filter((i) => i.isUsed && i.status !== 'new');
    },
    searchFn: (records, searchTerm) => {
      if (!searchTerm.trim()) return records;
      return records.filter((i) => matchesAllTokens(searchTerm, i.name));
    },
  });

  // Counts from all records (unfiltered)
  const newCount = list.allRecords.filter((i) => i.status === 'new').length;
  const availableCount = list.allRecords.filter((i) => !i.isUsed && i.status !== 'new').length;
  const usedCount = list.allRecords.filter((i) => i.isUsed && i.status !== 'new').length;

  // Selection Logic for 'new' status
  // Use props if available (lifted state), else local fallback (though we intend to use props)
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set());
  const effectiveSelectedIds = propsSelectedIds ?? localSelectedIds;
  const setEffectiveSelectedIds = propsOnSelectionChange ?? setLocalSelectedIds;

  // Reset selection when filter changes
  useEffect(() => {
    setEffectiveSelectedIds(new Set());
  }, [list.filters.usage]);

  const handleToggleSelect = (id: string) => {
    setEffectiveSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (effectiveSelectedIds.size === list.filteredRecords.length) {
      setEffectiveSelectedIds(new Set());
    } else {
      setEffectiveSelectedIds(new Set(list.filteredRecords.map((r) => r.id)));
    }
  };

  if (images.length === 0) {
    return <EmptyState variant="filter" />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Filter Pills + Search */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FilterPills<UsageFilter>
          options={[
            { value: 'new', status: 'new', label: `${newCount} New` },
            { value: 'available', status: 'available', label: `${availableCount} Available` },
            { value: 'used', status: 'used', label: `${usedCount} Used` },
          ]}
          activeFilter={list.filters.usage}
          onFilterChange={(filter) => list.setFilters({ usage: filter })}
        />

        {list.filters.usage === 'new' && list.filteredRecords.length > 0 && (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={list.filteredRecords.length > 0 && effectiveSelectedIds.size === list.filteredRecords.length}
                  indeterminate={effectiveSelectedIds.size > 0 && effectiveSelectedIds.size < list.filteredRecords.length}
                  onChange={handleToggleSelectAll}
                />
              }
              label={`Select All (${effectiveSelectedIds.size})`}
              sx={{ ml: 2, mr: 2 }}
            />
            {effectiveSelectedIds.size > 0 && onApprove && (
              <Button
                variant="contained"
                size="small"
                color="primary"
                onClick={() => onApprove(Array.from(effectiveSelectedIds))}
                disabled={isApproving}
              >
                {isApproving ? 'Approving...' : `Approve (${effectiveSelectedIds.size})`}
              </Button>
            )}
          </>
        )}

        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Search images..."
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

      {/* Image Grid */}
      {list.filteredRecords.length === 0 ? (
        <EmptyState variant="filter" />
      ) : (
        <Box sx={imageGridSx}>
          {list.filteredRecords.map((img) => (
            <Paper
              key={img.id}
              variant="outlined"
              onClick={() => imageDetail.openDetail(img.id)}
              sx={{ ...cardBaseSx, display: 'flex', flexDirection: 'column', gap: 1, border: effectiveSelectedIds.has(img.id) ? '2px solid #4caf50' : 'none', }}
            >
              {/* Thumbnail */}
              <Box
                sx={{
                  ...thumbnailContainerSx,
                  borderRadius: 1,
                  transition: 'border 0.2s ease',
                }}
              >
                {img.thumbnailUrl || img.image_url ? (
                  <Box
                    component="img"
                    src={img.thumbnailUrl || img.image_url}
                    alt={img.name}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    No preview
                  </Typography>
                )}
                {img.status === 'new' && (
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(img.id);
                    }}
                    sx={{ position: 'absolute', top: 4, left: 4, zIndex: 1 }}
                  >
                    <Checkbox
                      size="small"
                      checked={effectiveSelectedIds.has(img.id)}
                      sx={{
                        color: 'white',
                        padding: 0.5,
                        '&.Mui-checked': { color: 'primary.main' },
                        bgcolor: 'rgba(0,0,0,0.3)',
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' }
                      }}
                    />
                  </Box>
                )}
                {img.status === 'new' && (
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <StatusPill status='new' label='New' />
                  </Box>
                )}
              </Box>
              {/* Image info */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                  {img.name}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                  {showProductColumn && (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                      {img.productName}
                    </Typography>
                  )}
                  {img.status !== 'new' && (
                    <StatusPill status={img.isUsed ? 'used' : 'available'} label={img.isUsed ? 'Used' : 'Available'} />
                  )}
                </Box>
                {img.imageType && (
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {img.imageType}
                  </Typography>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Detail Panel */}
      <DetailPanel open={imageDetail.isOpen} onClose={imageDetail.closeDetail} width={520}>
        {detailImage && (
          <>
            <DetailHeader title={detailImage.name} onClose={imageDetail.closeDetail}>
              {(() => {
                const productStyle = getProductPillStyle(detailImage.productName);
                const statusStyle = getStatusPillStyle(detailImage.isUsed ? 'used' : 'available');
                const pills: PillConfig[] = [
                  {
                    label: detailImage.productName,
                    backgroundColor: productStyle.backgroundColor,
                    color: productStyle.color,
                    dotColor: productStyle.dotColor,
                  },
                  {
                    label: detailImage.isUsed ? 'Used' : 'Available',
                    backgroundColor: statusStyle.backgroundColor,
                    color: statusStyle.color,
                  },
                ];
                if (detailImage.imageType) {
                  pills.push({ label: detailImage.imageType });
                }
                return <DetailPills pills={pills} />;
              })()}
            </DetailHeader>

            <DetailPanelBody>
              {/* Image Preview */}
              <DetailSection label="Preview">
                <DetailMedia
                  type="image"
                  src={detailImage.thumbnailUrl}
                  driveFileId={detailImage.driveFileId}
                  format="square"
                  alt={detailImage.name}
                />
              </DetailSection>

              {/* Dimensions & File Info */}
              {(detailImage.width || detailImage.height || detailImage.fileSize) && (
                <DetailSection label="Details">
                  <Box
                    sx={{ ...detailInfoBoxSx, display: 'flex', gap: 4 }}
                  >
                    {(detailImage.width || detailImage.height) && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                          Dimensions
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {detailImage.width ?? '—'} x {detailImage.height ?? '—'} px
                        </Typography>
                      </Box>
                    )}
                    {detailImage.fileSize && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                          File Size
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {detailImage.fileSize >= 1024 * 1024
                            ? `${(detailImage.fileSize / (1024 * 1024)).toFixed(1)} MB`
                            : `${(detailImage.fileSize / 1024).toFixed(1)} KB`}
                        </Typography>
                      </Box>
                    )}
                    {detailImage.createdAt && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                          Created
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {new Date(detailImage.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </DetailSection>
              )}

              {/* Used In Campaigns */}
              {detailImage.usedInCampaigns.length > 0 && (
                <DetailSection label="Used In Campaigns">
                  <Box
                    sx={detailInfoBoxSx}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {detailImage.usedInCampaigns.length} campaign{detailImage.usedInCampaigns.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </DetailSection>
              )}

              {/* Notes */}
              {detailImage.notes && (
                <DetailSection label="Notes">
                  <DetailContent content={detailImage.notes} />
                </DetailSection>
              )}

              {/* View Asset */}
              {detailImage.image_url && (
                <Button
                  variant="text"
                  size="small"
                  startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  href={detailImage.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    px: 1,
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'transparent',
                    },
                  }}
                >
                  Open Asset
                </Button>
              )}
            </DetailPanelBody>
          </>
        )}
      </DetailPanel>
    </Box>
  );
}
