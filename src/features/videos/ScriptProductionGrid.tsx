/**
 * Script Production Grid Component
 *
 * Displays videos grouped by (Script × Editor) with 6 deterministic slots per card.
 *
 * Layout: 2 rows × 3 columns
 *   Columns: Square | Vertical | YouTube
 *   Rows: Text | No Text
 *
 * Slot Behavior (normalized - all 6 slots behave identically):
 * - All slots are always interactive (pointer cursor)
 * - CLICK: Opens sidebar for that video (if exists)
 * - DRAG & DROP: Triggers upload immediately (does NOT open sidebar)
 * - Only 1 video per slot
 *
 * Slot State Display:
 * - Pills show ONLY state: "To Do", "Review", "Available", "Used"
 * - NO action labels (Upload, View, Replace)
 *
 * Slot Background:
 * - Binary: Highlighted (matches active tab) or Neutral
 * - NOT color-coded by state
 *
 * Upload permissions (implicit, not displayed):
 * - To Do: Can upload (new file)
 * - Review: Can upload (replace existing file)
 * - Available/Used: No upload allowed
 */

import { useMemo, useState, useCallback } from 'react';
import type { VideoAsset, VideoFormat, VideoStatus } from './types';
import type { UploadProgress } from './drive';
import { STATUS_LABELS } from './status';
import {
  getStatusPillStyle,
  getEditorPillStyle,
  getProductPillStyle,
  basePillStyle,
  NEUTRAL_PILL,
  type StatusKey,
} from '../../ui';

// =============================================================================
// GRID DATA MODEL
// =============================================================================

export type SlotKey =
  | 'square-text'
  | 'square-notext'
  | 'vertical-text'
  | 'vertical-notext'
  | 'youtube-text'
  | 'youtube-notext';

export const SLOT_DEFINITIONS: {
  key: SlotKey;
  format: VideoFormat;
  hasText: boolean;
  label: string;
  columnLabel: string;
  rowLabel: string;
}[] = [
    { key: 'square-text', format: 'square', hasText: true, label: 'Square + Text', columnLabel: 'Square', rowLabel: 'Text' },
    { key: 'vertical-text', format: 'vertical', hasText: true, label: 'Vertical + Text', columnLabel: 'Vertical', rowLabel: 'Text' },
    { key: 'youtube-text', format: 'youtube', hasText: true, label: 'YouTube + Text', columnLabel: 'YouTube', rowLabel: 'Text' },
    { key: 'square-notext', format: 'square', hasText: false, label: 'Square + No Text', columnLabel: 'Square', rowLabel: 'No Text' },
    { key: 'vertical-notext', format: 'vertical', hasText: false, label: 'Vertical + No Text', columnLabel: 'Vertical', rowLabel: 'No Text' },
    { key: 'youtube-notext', format: 'youtube', hasText: false, label: 'YouTube + No Text', columnLabel: 'YouTube', rowLabel: 'No Text' },
  ];

export interface SlotState {
  slot: typeof SLOT_DEFINITIONS[number];
  videos: VideoAsset[];
  hasError: boolean;
}

export interface GridCard {
  scriptId: string;
  scriptName: string;
  editorId: string;
  editorName: string;
  productId: string;
  productName: string;
  slots: SlotState[];
  totalFilled: number;
  hasErrors: boolean;
  allUsed: boolean;
}

// =============================================================================
// GRID LOGIC
// =============================================================================

function getSlotKey(format: VideoFormat, hasText: boolean): SlotKey {
  return `${format}-${hasText ? 'text' : 'notext'}` as SlotKey;
}

function getSlotStatus(slotState: SlotState): VideoStatus {
  if (slotState.videos.length === 0) {
    return 'todo';
  }
  return slotState.videos[0].status;
}

/**
 * Check if upload/replace is allowed for a given status.
 * - To Do: Can upload (new file)
 * - Review: Can replace (existing file)
 * - Available/Used: No upload allowed
 */
function canUploadForStatus(status: VideoStatus): boolean {
  return status === 'todo' || status === 'review';
}

export function buildGridCards(videos: VideoAsset[]): GridCard[] {
  const cardMap = new Map<string, {
    videos: VideoAsset[];
    script: { id: string; name: string };
    editor: { id: string; name: string };
    product: { id: string; name: string }
  }>();

  for (const video of videos) {
    const key = `${video.script.id}::${video.editor.id}`;
    if (!cardMap.has(key)) {
      cardMap.set(key, {
        videos: [],
        script: video.script,
        editor: video.editor,
        product: video.product,
      });
    }
    cardMap.get(key)!.videos.push(video);
  }

  const cards: GridCard[] = [];

  for (const [, group] of cardMap) {
    const slotMap = new Map<SlotKey, VideoAsset[]>();
    for (const slotDef of SLOT_DEFINITIONS) {
      slotMap.set(slotDef.key, []);
    }

    for (const video of group.videos) {
      const slotKey = getSlotKey(video.format, video.hasText);
      slotMap.get(slotKey)?.push(video);
    }

    const slots: SlotState[] = SLOT_DEFINITIONS.map((slotDef) => {
      const videosInSlot = slotMap.get(slotDef.key) ?? [];
      return {
        slot: slotDef,
        videos: videosInSlot,
        hasError: videosInSlot.length > 1,
      };
    });

    const totalFilled = slots.filter((s) => s.videos.length > 0).length;
    const hasErrors = slots.some((s) => s.hasError);
    const allUsed = slots.every((s) => getSlotStatus(s) === 'used');

    cards.push({
      scriptId: group.script.id,
      scriptName: group.script.name,
      editorId: group.editor.id,
      editorName: group.editor.name,
      productId: group.product.id,
      productName: group.product.name,
      slots,
      totalFilled,
      hasErrors,
      allUsed,
    });
  }

  cards.sort((a, b) => {
    const scriptCompare = a.scriptName.localeCompare(b.scriptName);
    if (scriptCompare !== 0) return scriptCompare;
    return a.editorName.localeCompare(b.editorName);
  });

  return cards;
}

// =============================================================================
// COMPONENT
// =============================================================================

const CARDS_PER_PAGE = 12;

interface ScriptProductionGridProps {
  /** ALL videos (grid handles its own filtering) */
  videos: VideoAsset[];
  onVideoClick?: (video: VideoAsset) => void;
  /** Upload handler - accepts progress callback for real-time progress updates */
  onUpload?: (
    videoId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ) => Promise<void>;
  /** Permission check: Can current user upload to this video? */
  canUploadToVideo?: (video: VideoAsset) => boolean;
  /** Active status tab - cards with ANY slot matching this status are shown */
  activeStatus?: VideoStatus | null;
  /** Filter by editor ID */
  editorId?: string | null;
  /** Filter by product ID */
  productId?: string | null;
  /** Search term */
  searchTerm?: string;
}

/**
 * Check if a card has ANY slot matching the given status.
 * Used to determine card placement in status tabs.
 */
function cardHasStatus(card: GridCard, status: VideoStatus): boolean {
  return card.slots.some((slot) => getSlotStatus(slot) === status);
}

export function ScriptProductionGrid({
  videos,
  onVideoClick,
  onUpload,
  canUploadToVideo,
  activeStatus = null,
  editorId = null,
  productId = null,
  searchTerm = '',
}: ScriptProductionGridProps) {
  // Build ALL cards from ALL videos
  const allCards = useMemo(() => buildGridCards(videos), [videos]);
  console.log(videos.filter(video => video.name === 'GhostWing - Script 1058 - Nick - Square - Waqar'))


  // Card pagination state
  const [cardPageIndex, setCardPageIndex] = useState(0);

  // Filter cards based on:
  // 1. Editor filter (matches card's editor)
  // 2. Product filter (matches card's product)
  // 3. Search term (matches script name, editor name, or product name)
  // 4. Active status (card has ANY slot with this status)
  const filteredCards = useMemo(() => {
    let result = allCards;

    // Editor filter
    if (editorId) {
      result = result.filter((card) => card.editorId === editorId);
    }

    // Product filter
    if (productId) {
      result = result.filter((card) => card.productId === productId);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (card) =>
          card.scriptName.toLowerCase().includes(term) ||
          card.editorName.toLowerCase().includes(term) ||
          card.productName.toLowerCase().includes(term)
      );
    }

    // Status filter - card appears if ANY slot has the active status
    if (activeStatus) {
      result = result.filter((card) => cardHasStatus(card, activeStatus));
    }

    return result;
  }, [allCards, editorId, productId, searchTerm, activeStatus]);

  // Reset pagination when filters change
  useMemo(() => {
    setCardPageIndex(0);
  }, [editorId, productId, searchTerm, activeStatus]);

  // Paginate filtered cards
  const totalCards = filteredCards.length;
  const totalPages = Math.ceil(totalCards / CARDS_PER_PAGE);
  const paginatedCards = useMemo(() => {
    const start = cardPageIndex * CARDS_PER_PAGE;
    return filteredCards.slice(start, start + CARDS_PER_PAGE);
  }, [filteredCards, cardPageIndex]);

  // Track uploading slots
  const [uploadingSlots, setUploadingSlots] = useState<Set<string>>(new Set());
  // Track upload progress per slot (percentage 0-100)
  const [slotProgress, setSlotProgress] = useState<Map<string, number>>(new Map());
  // Track error messages
  const [slotErrors, setSlotErrors] = useState<Map<string, string>>(new Map());

  const handleSlotUpload = useCallback(
    async (video: VideoAsset, file: File, slotUniqueKey: string) => {
      if (!onUpload) return;

      // Set uploading state and clear any previous errors/progress
      setUploadingSlots((prev) => new Set(prev).add(slotUniqueKey));
      setSlotProgress((prev) => {
        const next = new Map(prev);
        next.set(slotUniqueKey, 0);
        return next;
      });
      setSlotErrors((prev) => {
        const next = new Map(prev);
        next.delete(slotUniqueKey);
        return next;
      });

      // Progress callback for real-time updates
      const handleProgress = (progress: UploadProgress) => {
        setSlotProgress((prev) => {
          const next = new Map(prev);
          next.set(slotUniqueKey, progress.percentage);
          return next;
        });
      };

      try {
        await onUpload(video.id, file, handleProgress);
        // Success: uploading state cleared, UI updates when videos prop changes
      } catch (error) {
        // Failure: show error
        setSlotErrors((prev) => {
          const next = new Map(prev);
          next.set(slotUniqueKey, error instanceof Error ? error.message : 'Upload failed');
          return next;
        });
      } finally {
        setUploadingSlots((prev) => {
          const next = new Set(prev);
          next.delete(slotUniqueKey);
          return next;
        });
        setSlotProgress((prev) => {
          const next = new Map(prev);
          next.delete(slotUniqueKey);
          return next;
        });
      }
    },
    [onUpload]
  );

  // System font stack (matches MUI theme)
  const fontFamily = '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  if (paginatedCards.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13, fontFamily }}>
        No scripts to display.
      </div>
    );
  }

  return (
    <div style={{ fontFamily }}>
      {/* Card Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
          padding: 16,
        }}
      >
        {paginatedCards.map((card) => (
          <GridCardComponent
            key={`${card.scriptId}::${card.editorId}`}
            card={card}
            onVideoClick={onVideoClick}
            onSlotUpload={onUpload ? handleSlotUpload : undefined}
            canUploadToVideo={canUploadToVideo}
            uploadingSlots={uploadingSlots}
            slotProgress={slotProgress}
            slotErrors={slotErrors}
            activeStatus={activeStatus}
          />
        ))}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Showing {paginatedCards.length} of {totalCards} scripts
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCardPageIndex((p) => Math.max(0, p - 1))}
              disabled={cardPageIndex === 0}
              style={{
                padding: '6px 12px',
                fontSize: 13,
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                backgroundColor: cardPageIndex === 0 ? '#f1f3f6' : '#ffffff',
                color: cardPageIndex === 0 ? '#9ca3af' : '#374151',
                cursor: cardPageIndex === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: '#6b7280' }}>
              {cardPageIndex + 1} / {totalPages}
            </span>
            <button
              onClick={() => setCardPageIndex((p) => Math.min(totalPages - 1, p + 1))}
              disabled={cardPageIndex >= totalPages - 1}
              style={{
                padding: '6px 12px',
                fontSize: 13,
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                backgroundColor: cardPageIndex >= totalPages - 1 ? '#f1f3f6' : '#ffffff',
                color: cardPageIndex >= totalPages - 1 ? '#9ca3af' : '#374151',
                cursor: cardPageIndex >= totalPages - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// GRID CARD COMPONENT
// =============================================================================

interface GridCardComponentProps {
  card: GridCard;
  onVideoClick?: (video: VideoAsset) => void;
  onSlotUpload?: (video: VideoAsset, file: File, slotUniqueKey: string) => void;
  canUploadToVideo?: (video: VideoAsset) => boolean;
  uploadingSlots: Set<string>;
  slotProgress: Map<string, number>;
  slotErrors: Map<string, string>;
  activeStatus: VideoStatus | null;
}

function GridCardComponent({
  card,
  onVideoClick,
  onSlotUpload,
  canUploadToVideo,
  uploadingSlots,
  slotProgress,
  slotErrors,
  activeStatus,
}: GridCardComponentProps) {
  const cardKey = `${card.scriptId}::${card.editorId}`;

  // Get pill styles from shared UI system
  const productPillStyle = getProductPillStyle(card.productId);
  const editorPillStyle = getEditorPillStyle(card.editorId);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      {/* Header: Title left, Pills right */}
      <div
        style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* Title - left */}
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', lineHeight: 1.3, flex: 1, minWidth: 0 }}>
          {card.scriptName}
        </div>
        {/* Pills - right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Product pill with colored dot */}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10,
              fontWeight: 500,
              padding: '3px 8px',
              borderRadius: 6,
              backgroundColor: productPillStyle.backgroundColor,
              color: productPillStyle.color,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: productPillStyle.dotColor,
              }}
            />
            {card.productName}
          </span>
          {/* Editor pill - deterministic color */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '3px 8px',
              borderRadius: 6,
              backgroundColor: editorPillStyle.backgroundColor,
              color: editorPillStyle.color,
            }}
          >
            {card.editorName}
          </span>
        </div>
      </div>

      {/* Slot Grid */}
      <div style={{ padding: '12px 12px 14px' }}>
        {/* Column Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
          <ColHeader>Square</ColHeader>
          <ColHeader>Vertical</ColHeader>
          <ColHeader>YouTube</ColHeader>
        </div>

        {/* Row 1: Text */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
          {card.slots.slice(0, 3).map((slotState) => {
            const slotUniqueKey = `${cardKey}::${slotState.slot.key}`;
            const slotStatus = getSlotStatus(slotState);
            return (
              <SlotTile
                key={slotState.slot.key}
                slotState={slotState}
                rowLabel="Text"
                onVideoClick={onVideoClick}
                onUpload={onSlotUpload}
                canUploadToVideo={canUploadToVideo}
                slotUniqueKey={slotUniqueKey}
                isUploading={uploadingSlots.has(slotUniqueKey)}
                uploadProgress={slotProgress.get(slotUniqueKey)}
                errorMessage={slotErrors.get(slotUniqueKey)}
                isEmphasized={activeStatus === slotStatus}
                isFaded={activeStatus !== null && activeStatus !== slotStatus}
              />
            );
          })}
        </div>

        {/* Row 2: No Text */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {card.slots.slice(3, 6).map((slotState) => {
            const slotUniqueKey = `${cardKey}::${slotState.slot.key}`;
            const slotStatus = getSlotStatus(slotState);
            return (
              <SlotTile
                key={slotState.slot.key}
                slotState={slotState}
                rowLabel="No Text"
                onVideoClick={onVideoClick}
                onUpload={onSlotUpload}
                canUploadToVideo={canUploadToVideo}
                slotUniqueKey={slotUniqueKey}
                isUploading={uploadingSlots.has(slotUniqueKey)}
                uploadProgress={slotProgress.get(slotUniqueKey)}
                errorMessage={slotErrors.get(slotUniqueKey)}
                isEmphasized={activeStatus === slotStatus}
                isFaded={activeStatus !== null && activeStatus !== slotStatus}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}


function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 600,
        color: '#9ca3af',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// SLOT TILE COMPONENT
// =============================================================================

interface SlotTileProps {
  slotState: SlotState;
  rowLabel: string;
  onVideoClick?: (video: VideoAsset) => void;
  onUpload?: (video: VideoAsset, file: File, slotUniqueKey: string) => void;
  /** Permission check: Can current user upload to this video? */
  canUploadToVideo?: (video: VideoAsset) => boolean;
  slotUniqueKey: string;
  isUploading: boolean;
  /** Upload progress percentage (0-100) */
  uploadProgress?: number;
  errorMessage?: string;
  /** Slot is emphasized (matches active tab) */
  isEmphasized?: boolean;
  /** Slot is faded (does not match active tab) */
  isFaded?: boolean;
}

function SlotTile({
  slotState,
  rowLabel,
  onVideoClick,
  onUpload,
  canUploadToVideo,
  slotUniqueKey,
  isUploading,
  uploadProgress,
  errorMessage,
  isEmphasized = false,
  isFaded = false,
}: SlotTileProps) {
  const { videos, hasError } = slotState;
  const video = videos[0];
  const status: VideoStatus = video ? video.status : 'todo';

  // Can upload via drag & drop if:
  // - Video exists (has Airtable record)
  // - User has permission (or fallback to status-based check)
  // - Not currently uploading
  // - Upload handler provided
  const canUpload = video && (canUploadToVideo ? canUploadToVideo(video) : canUploadForStatus(video.status));
  const canDrop = canUpload && !isUploading && !!onUpload;

  // Drag state
  const [isDragOver, setIsDragOver] = useState(false);
  // Hover state for lift effect
  const [isHovered, setIsHovered] = useState(false);
  // Active/pressed state
  const [isPressed, setIsPressed] = useState(false);

  // CLICK: Opens sidebar if video exists (does NOT trigger upload)
  const handleClick = () => {
    if (isUploading) return;
    if (video && onVideoClick) {
      onVideoClick(video);
    }
  };

  // DRAG & DROP: Triggers upload (does NOT open sidebar)
  const handleDragOver = (e: React.DragEvent) => {
    if (!canDrop) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!canDrop || !video || !onUpload) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUpload(video, file, slotUniqueKey);
    }
  };

  // BINARY BACKGROUND: Highlighted (matches active tab) or Neutral
  // Primary neutral grey: #f1f3f6
  const HIGHLIGHT_BG = '#f8f9fb';  // Slightly lighter for emphasis
  const HIGHLIGHT_BORDER = '#e5e7eb';  // Subtle border
  const NEUTRAL_BG = '#f1f3f6';  // Primary neutral grey
  const NEUTRAL_BORDER = '#e5e7eb';  // Consistent border

  let tileBackground = NEUTRAL_BG;
  let tileBorder = `1px solid ${NEUTRAL_BORDER}`;
  let transform = 'none';
  let boxShadow = 'none';

  if (isDragOver && canDrop) {
    tileBackground = '#fef3c7';  // Warm amber for drop target
    tileBorder = '2px dashed #f59e0b';
  } else if (isUploading) {
    tileBackground = '#f1f3f6';
  } else if (isPressed) {
    // Active/pressed: slightly darken, no lift
    tileBackground = '#e8eaee';
    transform = 'none';
    boxShadow = 'none';
  } else if (isHovered) {
    // Hover: lift, soft shadow, shift toward white
    tileBackground = '#f8f9fb';
    transform = 'translateY(-1px)';
    boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
  } else if (isEmphasized) {
    tileBackground = HIGHLIGHT_BG;
    tileBorder = `1px solid ${HIGHLIGHT_BORDER}`;
  }

  // Opacity for non-matching slots when a tab is active
  const opacity = isFaded ? 0.5 : 1;

  // All slots are always interactive
  const cursor = isUploading ? 'wait' : 'pointer';

  // Status label and colors from centralized UI system
  const statusLabel = STATUS_LABELS[status];
  const statusPillColors = getStatusPillStyle(status as StatusKey);

  return (
    <div
      style={{
        backgroundColor: tileBackground,
        borderRadius: 8,
        border: tileBorder,
        height: 68,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor,
        transition: 'background-color 0.15s, border-color 0.15s, opacity 0.15s, transform 0.15s, box-shadow 0.15s',
        position: 'relative',
        opacity,
        transform,
        boxShadow,
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Row label - top left, muted */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 6,
          fontSize: 8,
          fontWeight: 500,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        {rowLabel}
      </div>

      {/* Content - centered */}
      {isUploading ? (
        // Upload progress display
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 4, width: '80%' }}>
          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: 4,
              backgroundColor: '#e2e8f0',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${uploadProgress ?? 0}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                borderRadius: 2,
                transition: 'width 0.2s ease-out',
              }}
            />
          </div>
          {/* Progress text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Spinner />
            <span style={{ fontSize: 9, color: '#64748b' }}>
              {uploadProgress !== undefined ? `${uploadProgress}%` : 'Uploading...'}
            </span>
          </div>
        </div>
      ) : errorMessage ? (
        // Error state
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <span style={{ ...basePillStyle, backgroundColor: NEUTRAL_PILL.bg, color: NEUTRAL_PILL.text }}>Error</span>
          <div style={{ fontSize: 7, color: '#dc2626', marginTop: 3, maxWidth: 80, lineHeight: 1.2 }}>
            {errorMessage.length > 25 ? errorMessage.slice(0, 25) + '...' : errorMessage}
          </div>
        </div>
      ) : hasError ? (
        // Duplicate error
        <span style={{ ...basePillStyle, marginTop: 4, backgroundColor: '#fef2f2', color: '#dc2626' }}>
          {videos.length} Dup
        </span>
      ) : isDragOver && canDrop ? (
        // Drag hover state - show action hint (warm amber)
        <span style={{ ...basePillStyle, marginTop: 4, backgroundColor: '#fef3c7', color: '#92400e' }}>
          Drop File
        </span>
      ) : (
        // Normal state: Status pill (no border, colors only)
        <span
          style={{
            ...basePillStyle,
            marginTop: 4,
            backgroundColor: statusPillColors.backgroundColor,
            color: statusPillColors.color,
          }}
        >
          {statusLabel}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// SPINNER COMPONENT
// =============================================================================

function Spinner() {
  return (
    <div
      style={{
        width: 12,
        height: 12,
        border: '2px solid #e5e7eb',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    >
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
