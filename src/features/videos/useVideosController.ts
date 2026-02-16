/**
 * Videos Controller
 *
 * The brain of the Videos feature. Owns ALL logic:
 * - List configuration
 * - Filtering, search, sorting
 * - Status counts
 * - Bulk actions
 * - Save handlers
 *
 * Reusable by any page that needs video management.
 * Contains NO UI imports — pure logic only.
 */

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { useListController } from '../../core/list';
import { useBulkActions } from '../../core/bulk';
import { useToast } from '../../core/toast';
import type { FilterOption } from '../../core/list';
import type { VideoAsset, VideoFilters, VideoStatus, VideoFormat, VideoSavePayload } from './types';
import { useQuery } from '@tanstack/react-query';
import { listVideos, updateVideo, updateVideoStatus, deleteVideos, updateVideoAfterUpload, createVideoBatch, getEditors } from './data';
import { listUsers } from '../scripts/data';
import type { CreateVideoInput } from './data';
import { generateVideoName } from './generateVideoName';
import { uploadVideoWithFolder, isUploadInProgress } from './drive';
import type { UploadProgress, VideoUploadResult } from './drive';
import { deleteFile } from '../../core/storage/cloudflare';
import { CF_R2_PUBLIC_URL } from '../../core/storage/cloudflare/config';
import { canUploadToVideo, getBulkPermissions } from './permissions';
import type { UserContext } from './permissions';
import { matchesAllTokens } from '../../utils/tokenizedSearch';

const videosListConfig = {
  queryKey: ['videos'],
  queryFn: listVideos,
  initialFilters: {
    status: [] as VideoStatus[],
    format: [] as VideoFormat[],
    textVersion: [] as ('text' | 'no-text')[],
    editorId: null as string | null,
    productId: null as string | null,
  },
  initialSort: { field: 'name', direction: 'desc' as const },
  initialPageSize: 25,
  clearSelectionOnFilterChange: true,
  clearSelectionOnSearchChange: true,

  searchFn(records: VideoAsset[], searchTerm: string): VideoAsset[] {
    if (!searchTerm.trim()) {
      return records;
    }
    // Tokenized search: "2001 square" matches "VitalTac - Script 2001 - Jay - Square - Text"
    return records.filter((record) => {
      const searchableText = `${record.name} ${record.editor.name} ${record.product.name}`;
      return matchesAllTokens(searchTerm, searchableText);
    });
  },

  filterFn(records: VideoAsset[], filters: VideoFilters): VideoAsset[] {
    return records.filter((record) => {
      if (filters.status.length > 0 && !filters.status.includes(record.status)) {
        return false;
      }
      if (filters.format.length > 0 && !filters.format.includes(record.format)) {
        return false;
      }
      if (filters.textVersion.length > 0) {
        const hasTextMatch = filters.textVersion.includes('text') && record.hasText;
        const noTextMatch = filters.textVersion.includes('no-text') && !record.hasText;
        if (!hasTextMatch && !noTextMatch) {
          return false;
        }
      }
      if (filters.editorId && record.editor.id !== filters.editorId) {
        return false;
      }
      if (filters.productId && record.product.id !== filters.productId) {
        return false;
      }
      return true;
    });
  },

  compareFn(
    a: VideoAsset,
    b: VideoAsset,
    sort: { field: string; direction: 'asc' | 'desc' }
  ): number {
    const direction = sort.direction === 'asc' ? 1 : -1;

    switch (sort.field) {
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'status':
        return direction * a.status.localeCompare(b.status);
      case 'createdAt':
        return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default:
        return 0;
    }
  },
};

export interface UseVideosControllerResult {
  // List controller
  list: ReturnType<typeof useListController<VideoAsset, VideoFilters>>;

  // Current user context
  user: UserContext;

  // Derived data
  statusCounts: {
    all: number;
    todo: number;
    review: number;
    available: number;
    used: number;
  };
  editorOptions: FilterOption[];
  productOptions: FilterOption[];
  selectedVideos: VideoAsset[];
  activeStatus: VideoStatus | null;

  // Bulk actions
  bulkActions: ReturnType<typeof useBulkActions<VideoAsset>>;

  // Handlers
  handleStatusCardClick: (status: VideoStatus) => void;
  handleEditorChange: (value: string | null) => void;
  handleProductChange: (value: string | null) => void;
  handleVideoSave: (videoId: string, values: VideoSavePayload) => Promise<void>;
  handleClearFilters: () => void;

  // Upload
  uploadCreative: (params: {
    videoId: string;
    file: File;
    onProgress?: (progress: UploadProgress) => void;
  }) => Promise<VideoUploadResult>;
  isUploading: boolean;
  isVideoUploading: (videoId: string) => boolean;

  // Permission helpers
  canUploadToVideo: (video: VideoAsset) => boolean;

  // Script assignment
  assigningScriptIds: Set<string>;
  bulkAssignScriptsToEditor: (
    scripts: Array<{ id: string; name: string; product: { id: string } }>,
    editorId?: string
  ) => Promise<{ created: number; skipped: number }>;

  // Scrollstopper requests
  requestScrollstoppers: (params: {
    scriptId: string;
    editorIds: string[];
    count: number;
  }) => Promise<void>;
  getMaxScrollstopperNumber: (scriptId: string, editorId: string) => number;
}

export function useVideosController(): UseVideosControllerResult {
  const list = useListController<VideoAsset, VideoFilters>(videosListConfig);
  const toast = useToast();
  // Use real auth user
  const { user: authUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [assigningScriptIds, setAssigningScriptIds] = useState<Set<string>>(new Set());

  // Get current user context (role-based permissions)
  // Map Auth User -> Permissions UserContext
  const user = useMemo((): UserContext => {
    if (!authUser) {
      // Fallback or empty context if not logged in
      return { role: 'ops', userId: '', userName: 'Guest' };
    }
    return {
      role: authUser.role === 'Video Editor' ? 'editor' : 'ops',
      userId: authUser.id,
      userName: authUser.email,
    };
  }, [authUser]);

  const hasSetInitialEditor = useRef(false);

  // Auto-select logged-in editor on mount (once), but allow updates
  useEffect(() => {
    if (user.role === 'editor' && user.userId && !hasSetInitialEditor.current) {
      if (list.filters.editorId !== user.userId) {
        list.setFilters({ ...list.filters, editorId: user.userId });
      }
      hasSetInitialEditor.current = true;
    }
  }, [user.role, user.userId, list.filters, list.setFilters]);


  // Permission helper - check if current user can upload to a video
  const canUploadToVideoFn = useCallback(
    (video: VideoAsset): boolean => canUploadToVideo(video, user),
    [user]
  );

  // Derive status counts from all records
  const statusCounts = useMemo(
    () => ({
      all: list.allRecords.length,
      todo: list.allRecords.filter((v) => v.status === 'todo').length,
      review: list.allRecords.filter((v) => v.status === 'review').length,
      available: list.allRecords.filter((v) => v.status === 'available').length,
      used: list.allRecords.filter((v) => v.status === 'used').length,
    }),
    [list.allRecords]
  );

  // Fetch all users (cached by React Query if used elsewhere)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter to only Video Editors for the dropdown
  const editorOptions = useMemo<FilterOption[]>(() => {
    return allUsers
      .filter((u) => u.role === 'Video Editor')
      .map((u) => ({ value: u.id, label: u.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allUsers]);

  // Derive unique product options from all records
  const productOptions = useMemo<FilterOption[]>(() => {
    const uniqueProducts = new Map<string, string>();
    list.allRecords.forEach((v) => {
      uniqueProducts.set(v.product.id, v.product.name);
    });
    return Array.from(uniqueProducts.entries())
      .map(([id, name]) => ({ value: id, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [list.allRecords]);

  // Get selected videos
  const selectedVideos = useMemo(
    () => list.allRecords.filter((v) => list.selection.has(v.id)),
    [list.allRecords, list.selection]
  );

  // Active status for status cards
  const activeStatus = list.filters.status.length === 1 ? list.filters.status[0] : null;

  // Bulk actions configuration (no icons — page decorates with UI)
  // Permission-aware: Editors cannot perform bulk actions
  const bulkActions = useBulkActions<VideoAsset>({
    actions: [
      {
        id: 'approve',
        label: 'Approve',
        onExecute: async (videos) => {
          await updateVideoStatus(videos.map((v) => v.id), 'available');
          toast.success(`${videos.length} video${videos.length !== 1 ? 's' : ''} approved`);
          list.clearSelection();
        },
        // Disabled if user is editor OR if videos can't be approved
        disabled: (videos) => {
          if (user.role === 'editor') return true;
          const perms = getBulkPermissions(videos, user);
          return !perms.canApproveAll;
        },
      },
      {
        id: 'archive',
        label: 'Archive',
        onExecute: async (videos) => {
          await updateVideoStatus(videos.map((v) => v.id), 'used');
          toast.info(`${videos.length} video${videos.length !== 1 ? 's' : ''} archived`);
          list.clearSelection();
        },
        // Disabled if user is editor OR if videos can't be archived
        disabled: (videos) => {
          if (user.role === 'editor') return true;
          const perms = getBulkPermissions(videos, user);
          return !perms.canArchiveAll;
        },
      },
      {
        id: 'delete',
        label: 'Delete',
        variant: 'destructive',
        requiresConfirmation: true,
        confirmationMessage: 'This action cannot be undone. The selected videos will be permanently deleted.',
        onExecute: async (videos) => {
          await deleteVideos(videos.map((v) => v.id));
          toast.success(`${videos.length} video${videos.length !== 1 ? 's' : ''} deleted`);
          list.clearSelection();
        },
        // Disabled if user is editor OR if videos can't be deleted
        disabled: (videos) => {
          if (user.role === 'editor') return true;
          const perms = getBulkPermissions(videos, user);
          return !perms.canDeleteAll;
        },
      },
    ],
    onError: (actionId, error) => {
      toast.error(`Failed to ${actionId}: ${error.message}`);
    },
  });

  // Handler: Status card click
  const handleStatusCardClick = useCallback(
    (status: VideoStatus) => {
      if (activeStatus === status) {
        list.setFilters({ ...list.filters, status: [] });
      } else {
        list.setFilters({ ...list.filters, status: [status] });
      }
    },
    [activeStatus, list]
  );

  // Handler: Editor filter change
  const handleEditorChange = useCallback(
    (value: string | null) => {
      list.setFilters({ ...list.filters, editorId: value });
    },
    [list]
  );

  // Handler: Product filter change
  const handleProductChange = useCallback(
    (value: string | null) => {
      list.setFilters({ ...list.filters, productId: value });
    },
    [list]
  );

  // Handler: Video save
  const handleVideoSave = useCallback(
    async (videoId: string, values: VideoSavePayload) => {
      await updateVideo(videoId, {
        name: values.name,
        format: values.format,
        hasText: values.hasText,
        editorId: values.editorId,
        productId: values.productId,
      });
    },
    []
  );

  // Handler: Clear all filters
  const handleClearFilters = useCallback(() => {
    list.setSearchTerm('');
    list.setFilters({
      status: [],
      format: [],
      textVersion: [],
      editorId: null,
      productId: null,
    });
  }, [list]);

  // Handler: Upload creative to Drive and update Airtable
  //
  // UPLOAD ALGORITHM:
  // 1. Read Video record from list
  // 2. Read linked Product's driveFolderId (from Product.Drive Link)
  // 3. Validate driveFolderId exists (blocks upload if missing)
  // 4. Upload to: {Product Drive Link}/Videos/{Video.Record Name}
  // 5. Update Airtable with Creative Link, status → 'review'
  //
  // RULES:
  // - Filename parsing is FORBIDDEN
  // - Product.Drive Link determines upload location
  // - Shared Drive only — never My Drive
  // - No nested Product/Script/Editor folders
  const uploadCreative = useCallback(
    async ({
      videoId,
      file,
      onProgress,
    }: {
      videoId: string;
      file: File;
      onProgress?: (progress: UploadProgress) => void;
    }): Promise<VideoUploadResult> => {
      // Step 1: Find the video record
      const video = list.allRecords.find((v) => v.id === videoId);
      if (!video) {
        throw new Error(`Video not found: ${videoId}`);
      }

      // Step 2: Get Product storage key (product name, NOT Airtable record ID)
      const productStorageKey = video.product.name;
      if (!productStorageKey) {
        throw new Error(
          `Upload blocked: Video "${video.name}" is not associated with a product.`
        );
      }

      // Permission check: Can current user upload to this video?
      if (!canUploadToVideo(video, user)) {
        if (user.role === 'editor' && video.editor.id !== user.userId) {
          throw new Error('You can only upload to videos assigned to you.');
        }
        throw new Error(`Cannot upload to video in '${video.status}' status. Only 'todo' or 'review' videos can receive uploads.`);
      }

      // CLEANUP FLOW: Capture old URL BEFORE upload (Airtable is source of truth)
      // This URL uniquely identifies the Cloudflare object to delete after successful upload
      // Status does NOT control cleanup - if a file exists, it must be deleted after new upload
      // (Handles: replace in review, re-upload after reject, any scenario with existing file)
      const oldCreativeLink = video.creativeLink ?? null;

      setIsUploading(true);
      try {
        // Step 3: Upload to storage
        // Location: {productStorageKey}/Videos/
        // Filename: {Video.Record Name} (from Airtable, NOT from uploaded file)
        console.log(`[Upload] Starting upload for video: ${video.name}`);
        console.log(`[Upload] Storage path: ${productStorageKey}/Videos/`);

        const result = await uploadVideoWithFolder({
          videoId,
          videoName: video.name, // Use Airtable record name, NOT original filename
          file,
          productStorageKey, // Product name for storage path prefix (NOT Airtable record ID)
          onProgress,
        });

        // =======================================================================
        // INVARIANT: Only write to Airtable if we have a valid Cloudflare URL
        // This ensures no URL is stored unless the file actually exists in R2
        // =======================================================================
        if (!result.url || !result.url.includes(import.meta.env.VITE_CF_R2_DOMAIN)) {
          throw new Error(
            `Upload invariant violated: Invalid or missing URL. Got: ${result.url}`
          );
        }

        // Step 4: Update Airtable with Creative Link and status
        // ONLY called after successful upload with valid URL
        await updateVideoAfterUpload(
          videoId,
          result.url, // Creative Link field - ONLY from uploadFile() return value
          'review'    // Status transitions to 'review' after upload
        );

        // Step 5: Delete old file AFTER successful upload and Airtable update
        // This ensures no data loss - we only delete once the new file is confirmed
        if (oldCreativeLink && CF_R2_PUBLIC_URL && oldCreativeLink.includes('trustapollo.media')) {
          try {
            // Extract key by stripping the public URL base
            // URL: https://trustapollo.media/ProductName/Videos/VideoName.mov
            // Key: ProductName/Videos/VideoName.mov
            let oldKey = oldCreativeLink.replace(CF_R2_PUBLIC_URL, '');
            if (oldKey.startsWith('/')) {
              oldKey = oldKey.slice(1);
            }

            if (oldKey) {
              console.log(`[Upload] Deleting old file: ${oldKey}`);
              await deleteFile(oldKey);
            }
          } catch (deleteError) {
            // Best-effort deletion - log but don't fail the upload
            console.warn('Failed to delete old file:', deleteError);
          }
        }

        // Refresh list to reflect changes
        await list.refetch();

        return result;
      } finally {
        setIsUploading(false);
      }
    },
    [list, user]
  );

  // Check if a specific video is currently uploading
  const isVideoUploading = useCallback((videoId: string): boolean => {
    return isUploadInProgress(videoId);
  }, []);

  // ---------------------------------------------------------------------------
  // SCRIPT ASSIGNMENT
  // ---------------------------------------------------------------------------

  /**
   * Bulk assign multiple scripts to an editor (or all editors).
   * - Fetches editors + videos ONCE
   * - Builds all CreateVideoInput[] in one pass
   * - Batch creates via createVideoBatch (handles 10-record Airtable chunking)
   * - Refetches once at the end
   */
  const bulkAssignScriptsToEditor = useCallback(
    async (
      scripts: Array<{ id: string; name: string; product: { id: string } }>,
      editorId?: string
    ): Promise<{ created: number; skipped: number }> => {
      // Guard: filter out scripts already being assigned (prevent double-fire)
      const newScripts = scripts.filter(s => !assigningScriptIds.has(s.id));
      if (newScripts.length === 0) {
        return { created: 0, skipped: scripts.length };
      }

      // Add all IDs to the assigning set in one call
      const newIds = newScripts.map(s => s.id);
      setAssigningScriptIds(prev => {
        const next = new Set(prev);
        newIds.forEach(id => next.add(id));
        return next;
      });

      try {
        // Phase 1: Fetch once
        const [allEditors, existingVideos] = await Promise.all([
          getEditors(),
          listVideos(),
        ]);

        // Resolve editor name for toast
        const editorName = editorId
          ? allEditors.find(e => e.id === editorId)?.name ?? 'Unknown Editor'
          : 'all editors';

        toast.info(`Assigning ${newScripts.length} script${newScripts.length !== 1 ? 's' : ''} to ${editorName}...`);

        // Filter to target editors
        const editors = editorId
          ? allEditors.filter(e => e.id === editorId)
          : allEditors;

        if (editors.length === 0) {
          throw new Error(editorId ? `Editor not found: ${editorId}` : 'No editors found');
        }

        const FORMATS: VideoFormat[] = ['vertical', 'square', 'youtube'];
        const TEXT_VERSIONS = [true, false];

        // Phase 2: Build all inputs
        const allInputs: CreateVideoInput[] = [];

        for (const script of newScripts) {
          for (const editor of editors) {
            for (const format of FORMATS) {
              for (const hasText of TEXT_VERSIONS) {
                const exists = existingVideos.some(
                  v =>
                    v.script.id === script.id &&
                    v.editor.id === editor.id &&
                    v.format === format &&
                    v.hasText === hasText
                );

                if (!exists) {
                  const formatLabel =
                    format === 'youtube'
                      ? 'YouTube'
                      : format.charAt(0).toUpperCase() + format.slice(1);
                  const name = generateVideoName(script.name, formatLabel, editor.name, hasText);

                  allInputs.push({
                    name,
                    format,
                    hasText,
                    editorId: editor.id,
                    productId: script.product.id,
                    scriptId: script.id,
                  });
                }
              }
            }
          }
        }

        // Phase 3: Batch create
        if (allInputs.length > 0) {
          await createVideoBatch(allInputs);
        }

        const skipped = (newScripts.length * editors.length * FORMATS.length * TEXT_VERSIONS.length) - allInputs.length;

        // Phase 4: Refetch once
        await list.refetch();

        toast.success(`Done — ${allInputs.length} video${allInputs.length !== 1 ? 's' : ''} created for ${editorName}`);

        return { created: allInputs.length, skipped };
      } catch (error) {
        toast.error(`Failed to assign scripts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      } finally {
        // Remove all IDs from the set
        setAssigningScriptIds(prev => {
          const next = new Set(prev);
          newIds.forEach(id => next.delete(id));
          return next;
        });
      }
    },
    [list, toast, assigningScriptIds]
  );

  // ---------------------------------------------------------------------------
  // SCROLLSTOPPER REQUESTS
  // ---------------------------------------------------------------------------

  /**
   * Get the maximum scrollstopper number for a script+editor combination.
   * Returns 1 if no scrollstoppers exist (original videos are implicitly SS1).
   * Returns 0 if no videos exist at all.
   */
  const getMaxScrollstopperNumber = useCallback(
    (scriptId: string, editorId: string): number => {
      const relevantVideos = list.allRecords.filter(
        (v) => v.script.id === scriptId && v.editor.id === editorId
      );

      if (relevantVideos.length === 0) return 0; // No videos at all

      // Map each video to its scrollstopper number (original = 1)
      const scrollstopperNumbers = relevantVideos.map(
        (v) => v.scrollstopperNumber ?? 1
      );

      return Math.max(...scrollstopperNumbers);
    },
    [list.allRecords]
  );

  /**
   * Request scrollstoppers for a script.
   * Creates additional video slots with SS2, SS3, etc. suffix.
   *
   * Algorithm:
   * 1. For each editor, find max existing scrollstopper number
   * 2. Create `count` new scrollstoppers starting from max+1
   * 3. Each scrollstopper creates 6 videos (3 formats × 2 text versions)
   */
  const requestScrollstoppers = useCallback(
    async (params: {
      scriptId: string;
      editorIds: string[];
      count: number;
    }): Promise<void> => {
      const { scriptId, editorIds, count } = params;

      if (count < 1) {
        throw new Error('Count must be at least 1');
      }

      setAssigningScriptIds(prev => new Set(prev).add(scriptId));
      try {
        // Get editors (cached) and use already-loaded videos
        const allEditors = await getEditors();
        const existingVideos = list.allRecords;

        // Filter to requested editors
        const editors = editorIds.length > 0
          ? allEditors.filter((e) => editorIds.includes(e.id))
          : allEditors;

        if (editors.length === 0) {
          throw new Error('No valid editors specified');
        }

        // Get script info from existing videos
        const existingVideoForScript = existingVideos.find((v) => v.script.id === scriptId);
        if (!existingVideoForScript) {
          throw new Error('No existing videos found for this script. Assign the script first.');
        }

        const productId = existingVideoForScript.product.id;
        const scriptName = existingVideoForScript.script.name;

        const FORMATS: VideoFormat[] = ['vertical', 'square', 'youtube'];
        const TEXT_VERSIONS = [true, false];

        // Build list of videos to create
        const videosToCreate: CreateVideoInput[] = [];

        for (const editor of editors) {
          // Find max scrollstopper number for this script+editor
          const editorVideos = existingVideos.filter(
            (v) => v.script.id === scriptId && v.editor.id === editor.id
          );

          // If editor has no videos for this script, start at SS1 (so first request creates SS2)
          // If editor has videos, find max scrollstopper number
          const maxSSNumber = editorVideos.length === 0
            ? 1  // No videos = treat as having only "original" (SS1) conceptually
            : Math.max(...editorVideos.map((v) => v.scrollstopperNumber ?? 1));

          // Create `count` scrollstoppers starting from maxSSNumber + 1
          for (let i = 1; i <= count; i++) {
            const ssNumber = maxSSNumber + i;

            for (const format of FORMATS) {
              for (const hasText of TEXT_VERSIONS) {
                const formatLabel =
                  format === 'youtube'
                    ? 'YouTube'
                    : format.charAt(0).toUpperCase() + format.slice(1);

                const name = generateVideoName(
                  scriptName,
                  formatLabel,
                  editor.name,
                  hasText,
                  ssNumber
                );

                videosToCreate.push({
                  name,
                  format,
                  hasText,
                  editorId: editor.id,
                  productId,
                  scriptId,
                  scrollstopperNumber: ssNumber,
                });
              }
            }
          }
        }

        // Batch create all videos
        if (videosToCreate.length > 0) {
          await createVideoBatch(videosToCreate);
          toast.success(
            `Created ${videosToCreate.length} scrollstopper video${videosToCreate.length !== 1 ? 's' : ''}`
          );
        } else {
          toast.info('No scrollstoppers to create. Please select at least one editor.');
        }

        // Refresh data
        await list.refetch();
      } finally {
        setAssigningScriptIds(prev => { const next = new Set(prev); next.delete(scriptId); return next; });
      }
    },
    [list, toast]
  );

  return {
    list,
    user,
    statusCounts,
    editorOptions,
    productOptions,
    selectedVideos,
    activeStatus,
    bulkActions,
    handleStatusCardClick,
    handleEditorChange,
    handleProductChange,
    handleVideoSave,
    handleClearFilters,
    uploadCreative,
    isUploading,
    isVideoUploading,
    canUploadToVideo: canUploadToVideoFn,
    assigningScriptIds,
    bulkAssignScriptsToEditor,
    requestScrollstoppers,
    getMaxScrollstopperNumber,
  };
}
