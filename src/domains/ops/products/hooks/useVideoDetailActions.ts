/**
 * useVideoDetailActions - Shared hook for video detail panel actions.
 * Consolidates notes editing and status change logic from ScriptsTab and VideosTab.
 */

import { useState, useCallback, useEffect } from 'react';
import type { VideoAsset } from '../../../../features/videos';

interface UseVideoDetailActionsOptions {
  video: VideoAsset | null;
  onStatusChange?: (videoId: string, status: 'todo' | 'available') => Promise<void>;
  onNotesChange?: (videoId: string, notes: string) => Promise<void>;
}

interface UseVideoDetailActionsReturn {
  /** Current notes value (synced from video, editable locally) */
  notesValue: string;
  /** Update local notes value */
  setNotesValue: (value: string) => void;
  /** Whether notes are currently being saved */
  isSavingNotes: boolean;
  /** Handler for notes blur - saves if changed */
  handleNotesBlur: () => Promise<void>;
  /** Handler for reject action - sets status to 'todo' */
  handleReject: () => Promise<void>;
  /** Handler for accept action - sets status to 'available' */
  handleAccept: () => Promise<void>;
}

/**
 * Hook to manage video detail panel actions (notes editing, status changes).
 * Syncs notes from video prop and handles save-on-blur pattern.
 */
export function useVideoDetailActions({
  video,
  onStatusChange,
  onNotesChange,
}: UseVideoDetailActionsOptions): UseVideoDetailActionsReturn {
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Sync notes when video changes
  useEffect(() => {
    setNotesValue(video?.notes ?? '');
  }, [video?.id, video?.notes]);

  // Handle notes save on blur
  const handleNotesBlur = useCallback(async () => {
    if (!video || !onNotesChange) return;
    if (notesValue === (video.notes ?? '')) return;
    setIsSavingNotes(true);
    try {
      await onNotesChange(video.id, notesValue);
    } finally {
      setIsSavingNotes(false);
    }
  }, [video, onNotesChange, notesValue]);

  // Handle reject (set to 'todo')
  const handleReject = useCallback(async () => {
    if (!video || !onStatusChange) return;
    await onStatusChange(video.id, 'todo');
  }, [video, onStatusChange]);

  // Handle accept (set to 'available')
  const handleAccept = useCallback(async () => {
    if (!video || !onStatusChange) return;
    await onStatusChange(video.id, 'available');
  }, [video, onStatusChange]);

  return {
    notesValue,
    setNotesValue,
    isSavingNotes,
    handleNotesBlur,
    handleReject,
    handleAccept,
  };
}
