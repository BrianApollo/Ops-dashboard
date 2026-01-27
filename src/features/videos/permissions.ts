/**
 * Video Permissions Module
 *
 * Defines permission rules for different user roles.
 * Same UI components, different powers based on role.
 *
 * Roles:
 * - Editor: Can upload (To Do), replace (Review), view (Available/Used)
 * - Ops: Full access, all status transitions allowed
 */

import type { VideoAsset } from './types';

// =============================================================================
// TYPES
// =============================================================================

export type UserRole = 'editor' | 'ops';

export interface UserContext {
  role: UserRole;
  userId: string;
  userName: string;
}

export interface VideoPermissions {
  /** Can view this video */
  canView: boolean;
  /** Can upload a file to this video (To Do status) */
  canUpload: boolean;
  /** Can replace the file for this video (Review status) */
  canReplace: boolean;
  /** Can edit video metadata (name, format, etc.) */
  canEdit: boolean;
  /** Can change video status */
  canChangeStatus: boolean;
  /** Can delete this video */
  canDelete: boolean;
  /** Can approve this video (move to Available) */
  canApprove: boolean;
  /** Can archive this video (move to Used) */
  canArchive: boolean;
}

// =============================================================================
// PERMISSION RULES
// =============================================================================

/**
 * Get permissions for a video based on user context.
 *
 * Editor rules:
 * - Can only act on videos assigned to them
 * - Upload: To Do status only
 * - Replace: Review status only
 * - View only: Available / Used
 * - Cannot change status, delete, approve, or archive
 *
 * Ops rules:
 * - Full access to all videos
 * - All actions allowed
 */
export function getVideoPermissions(
  video: VideoAsset,
  user: UserContext
): VideoPermissions {
  // Ops has full access
  if (user.role === 'ops') {
    return {
      canView: true,
      canUpload: video.status === 'todo',
      canReplace: video.status === 'review',
      canEdit: video.status !== 'used',
      canChangeStatus: true,
      canDelete: true,
      canApprove: video.status === 'todo' || video.status === 'review',
      canArchive: video.status === 'available',
    };
  }

  // Editor: Check if video is assigned to them
  const isAssignedToUser = video.editor.id === user.userId;

  // Editors can only act on their assigned videos
  if (!isAssignedToUser) {
    return {
      canView: true, // Can always view
      canUpload: false,
      canReplace: false,
      canEdit: false,
      canChangeStatus: false,
      canDelete: false,
      canApprove: false,
      canArchive: false,
    };
  }

  // Editor permissions for assigned videos
  return {
    canView: true,
    canUpload: video.status === 'todo',
    canReplace: video.status === 'review',
    canEdit: false, // Editors cannot edit metadata
    canChangeStatus: false, // Status changes happen automatically via upload
    canDelete: false,
    canApprove: false,
    canArchive: false,
  };
}

/**
 * Check if user can perform upload/replace on a video.
 * This is the main permission check for the grid upload flow.
 */
export function canUploadToVideo(video: VideoAsset, user: UserContext): boolean {
  const permissions = getVideoPermissions(video, user);
  return permissions.canUpload || permissions.canReplace;
}

/**
 * Check if user can edit video metadata.
 */
export function canEditVideo(video: VideoAsset, user: UserContext): boolean {
  return getVideoPermissions(video, user).canEdit;
}

/**
 * Get bulk action permissions for a set of videos.
 */
export interface BulkPermissions {
  canApproveAny: boolean;
  canApproveAll: boolean;
  canArchiveAny: boolean;
  canArchiveAll: boolean;
  canDeleteAny: boolean;
  canDeleteAll: boolean;
}

export function getBulkPermissions(
  videos: VideoAsset[],
  user: UserContext
): BulkPermissions {
  if (videos.length === 0) {
    return {
      canApproveAny: false,
      canApproveAll: false,
      canArchiveAny: false,
      canArchiveAll: false,
      canDeleteAny: false,
      canDeleteAll: false,
    };
  }

  const permissions = videos.map((v) => getVideoPermissions(v, user));

  return {
    canApproveAny: permissions.some((p) => p.canApprove),
    canApproveAll: permissions.every((p) => p.canApprove),
    canArchiveAny: permissions.some((p) => p.canArchive),
    canArchiveAll: permissions.every((p) => p.canArchive),
    canDeleteAny: permissions.some((p) => p.canDelete),
    canDeleteAll: permissions.every((p) => p.canDelete),
  };
}

// =============================================================================
// DEFAULT USER CONTEXT (for development/testing)
// =============================================================================

/**
 * Get the current user context.
 * TODO: Replace with actual auth context in production.
 */
export function getCurrentUser(): UserContext {
  // For development, check URL or localStorage for role override
  const urlParams = new URLSearchParams(window.location.search);
  const roleOverride = urlParams.get('role') as UserRole | null;

  // Default to 'ops' for development
  const role: UserRole = roleOverride || 'ops';

  // Mock user based on role
  if (role === 'editor') {
    return {
      role: 'editor',
      userId: 'editor-1', // Matches mock data editor ID
      userName: 'Test Editor',
    };
  }

  return {
    role: 'ops',
    userId: 'ops-1',
    userName: 'Ops User',
  };
}
