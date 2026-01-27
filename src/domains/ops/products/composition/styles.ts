/**
 * Shared styles for ops tab components.
 *
 * Theme-aware styles that work in both light and dark modes.
 * Uses MUI theme tokens for proper theming support.
 */

import type { SxProps, Theme } from '@mui/material/styles';

// =============================================================================
// FIELD LABELS
// =============================================================================

/**
 * Detail panel field label - used for metadata fields in slide-in panels.
 * Example: "Product", "Script", "Editor", "Format", "Status"
 */
export const fieldLabelSx: SxProps<Theme> = {
  fontWeight: 500,
  fontSize: '0.75rem', // 12px - matches theme caption
  color: 'text.secondary',
};

/**
 * Form field label - used for editable form fields.
 * Uses theme-consistent body2 sizing (14px).
 */
export const formLabelSx: SxProps<Theme> = {
  display: 'block',
  mb: 0.5,
  fontWeight: 500,
  fontSize: '0.875rem', // 14px - matches theme body2
  color: 'text.secondary',
};

/**
 * Section header label - used for section titles.
 */
export const sectionLabelSx: SxProps<Theme> = {
  display: 'block',
  mb: 1.5,
  fontWeight: 600,
  fontSize: '0.875rem', // 14px - matches theme body2
  color: 'text.primary',
};

// =============================================================================
// THUMBNAILS
// =============================================================================

/**
 * Video thumbnail container (16:9 aspect ratio).
 */
export const videoThumbnailSx: SxProps<Theme> = {
  width: '100%',
  aspectRatio: '16/9',
  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
  borderRadius: 1.5,
  overflow: 'hidden',
};

/**
 * Square thumbnail container (1:1 aspect ratio) for images.
 */
export const squareThumbnailSx: SxProps<Theme> = {
  width: '100%',
  aspectRatio: '1',
  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
  borderRadius: 1.5,
  overflow: 'hidden',
};

/**
 * Thumbnail image styles.
 */
export const thumbnailImageSx: SxProps<Theme> = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

// =============================================================================
// TEXT FIELDS
// =============================================================================

/**
 * Notes text field styling.
 */
export const notesTextFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50',
    fontSize: '0.85rem',
  },
};

/**
 * Read-only content display (for script content, notes, etc.).
 */
export const contentDisplaySx: SxProps<Theme> = {
  whiteSpace: 'pre-wrap',
  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50',
  p: 1.5,
  borderRadius: 1.5,
  border: '1px solid',
  borderColor: 'divider',
};

// =============================================================================
// LIST ITEMS
// =============================================================================

/**
 * Clickable list row styling.
 */
export const clickableRowSx: SxProps<Theme> = {
  p: 2,
  cursor: 'pointer',
  transition: 'background-color 0.1s ease-in-out',
  '&:hover': { bgcolor: 'action.hover' },
};

/**
 * Nested/indented row styling (e.g., video rows under scripts).
 */
export const nestedRowSx: SxProps<Theme> = {
  p: 1.5,
  mb: 0.5,
  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50',
  borderRadius: 1,
  cursor: 'pointer',
  transition: 'background-color 0.1s ease-in-out',
  '&:hover': {
    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'grey.100',
  },
};

// =============================================================================
// TABLE STYLES
// =============================================================================

/**
 * Table header cell - grey background, small font.
 * Used in ListTableView, CampaignsTab.
 */
export const tableHeaderCellSx: SxProps<Theme> = {
  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#FAFBFC',
  borderBottom: '1px solid',
  borderColor: 'divider',
  fontWeight: 600,
  fontSize: '0.75rem', // 12px - matches theme caption
  color: 'text.secondary',
  py: 1.25,
  px: 2,
};

/**
 * Table data cell - standard padding and font size.
 */
export const tableDataCellSx: SxProps<Theme> = {
  fontSize: '0.8125rem',
  color: 'text.primary',
  py: 1.5,
  px: 2,
  borderColor: 'divider',
};

/**
 * Clickable table row - cursor and transition.
 */
export const tableRowClickableSx: SxProps<Theme> = {
  cursor: 'pointer',
  transition: 'all 0.1s ease-in-out',
  '&:last-child td': { borderBottom: 0 },
};

/**
 * Selected table row - primary color tint.
 */
export const tableRowSelectedSx: SxProps<Theme> = {
  '&.Mui-selected': {
    bgcolor: (theme) =>
      theme.palette.mode === 'dark'
        ? 'rgba(251, 146, 60, 0.12)'
        : 'rgba(249, 115, 22, 0.06)',
    '&:hover': {
      bgcolor: (theme) =>
        theme.palette.mode === 'dark'
          ? 'rgba(251, 146, 60, 0.16)'
          : 'rgba(249, 115, 22, 0.1)',
    },
  },
};

// =============================================================================
// CARD STYLES
// =============================================================================

/**
 * Base card - outlined paper with hover effect.
 * Use with Paper variant="outlined".
 */
export const cardBaseSx: SxProps<Theme> = {
  p: 2,
  cursor: 'pointer',
  transition: 'all 0.15s ease-in-out',
  '&:hover': {
    bgcolor: 'action.hover',
    transform: 'translateY(-1px)',
  },
};

/**
 * Expanded card state - adds shadow.
 * Spread with cardBaseSx: { ...cardBaseSx, ...(isExpanded && cardExpandedSx) }
 */
export const cardExpandedSx: SxProps<Theme> = {
  boxShadow: (theme) =>
    theme.palette.mode === 'dark'
      ? '0 4px 20px rgba(0,0,0,0.4)'
      : '0 4px 20px rgba(0,0,0,0.08)',
};

/**
 * Nested card (items under expanded parent).
 * Same as nestedRowSx - alias for semantic clarity.
 */
export const cardNestedSx: SxProps<Theme> = {
  p: 1.5,
  mb: 0.5,
  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50',
  borderRadius: 1,
  cursor: 'pointer',
  transition: 'background-color 0.1s ease-in-out',
  '&:hover': {
    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'grey.100',
  },
};

/**
 * Expanded content area (inside expanded card).
 */
export const cardExpandedContentSx: SxProps<Theme> = {
  px: 3,
  pb: 3,
  pt: 1,
  borderTop: '1px solid',
  borderColor: 'divider',
  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'grey.50',
};

// =============================================================================
// DETAIL PANEL STYLES
// =============================================================================

/**
 * Info box in detail panels - light background with border.
 */
export const detailInfoBoxSx: SxProps<Theme> = {
  p: 2,
  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafaf9',
  borderRadius: 1.5,
  border: '1px solid',
  borderColor: 'divider',
};

/**
 * TextField in view mode (disabled/readonly).
 */
export const textFieldViewModeSx: SxProps<Theme> = {
  '& .MuiInputBase-root': {
    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50',
  },
};

/**
 * TextField in edit mode (active).
 */
export const textFieldEditModeSx: SxProps<Theme> = {
  '& .MuiInputBase-root': { bgcolor: 'background.paper' },
};

// =============================================================================
// GRID STYLES
// =============================================================================

/**
 * Responsive image grid - auto-fill columns.
 */
export const imageGridSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 2,
};

/**
 * Square thumbnail container with centered content.
 * Similar to squareThumbnailSx but includes flex centering.
 */
export const thumbnailContainerSx: SxProps<Theme> = {
  width: '100%',
  aspectRatio: '1',
  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
  borderRadius: 1.5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};

/**
 * Asset thumbnail - fixed 80x80 size (for SetupTab assets).
 */
export const assetThumbnailSx: SxProps<Theme> = {
  width: 80,
  height: 80,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden',
};

// =============================================================================
// LAYOUT STYLES
// =============================================================================

/**
 * Tab toolbar - flex row with space-between.
 */
export const tabToolbarSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  mb: 3,
};

/**
 * Section with vertical gap - flex column with gap 3.
 */
export const sectionGapSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
};

// =============================================================================
// STATUS CARD STYLES
// =============================================================================

/**
 * Status card container - grid of status filter cards.
 */
export const statusCardGridSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 2,
};

/**
 * Individual status card styling.
 */
export const statusCardSx: SxProps<Theme> = {
  p: 2,
  borderRadius: 2,
  cursor: 'pointer',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  transition: 'all 0.15s ease-in-out',
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: 'action.hover',
  },
};
