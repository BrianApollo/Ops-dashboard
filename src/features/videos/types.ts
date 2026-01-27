/**
 * Canonical domain model for Video assets.
 * This is the UI-facing shape — NOT the Airtable schema.
 */

export type VideoStatus = 'todo' | 'review' | 'available' | 'used';
export type VideoFormat = 'square' | 'vertical' | 'YouTube';
export type TextVersion = 'text' | 'no-text';

export interface VideoAsset {
  id: string;
  name: string;
  status: VideoStatus;
  format: VideoFormat;
  hasText: boolean;
  editor: { id: string; name: string };
  product: { id: string; name: string; driveFolderId?: string };
  script: { id: string; name: string };
  createdAt: string;
  thumbnail: string;
  /** Google Drive file ID (extracted from Creative Link) */
  driveFileId?: string;
  /** Creative Link - Google Drive shareable URL (from Airtable "Creative Link" field) */
  creativeLink?: string;
  /** Video Upload attachment URL (from Airtable "Video Upload" field) */
  videoUploadUrl?: string;
  /** Last upload timestamp (from Airtable "Last Upload At" field) */
  lastUploadAt?: string;
  /** Script content text from Airtable */
  scriptContent?: string;
  /** Feedback/notes from Airtable Notes field */
  notes?: string;
  /** Used In Campaign info (from Airtable "Used In Campaign" field) */
  usedInCampaign?: string;
  /** Campaign info (only for 'used' status) */
  campaign?: {
    name: string;
    platform?: string;
    date?: string;
  };
  /** Direct download URL for Facebook upload (computed from videoUploadUrl or creativeLink) */
  sourceUrl?: string;
  /** Thumbnail URL for Facebook video creative */
  thumbnailUrl?: string;
  /** Scrollstopper number (2, 3, 4...). Undefined for original videos. */
  scrollstopperNumber?: number;
  /** Parent Drive Folder Link */
  parentDriveLink?: string;
}

export interface VideoFilters {
  status: VideoStatus[];
  format: VideoFormat[];
  textVersion: TextVersion[];
  editorId: string | null;
  productId: string | null;
}

export interface VideoSavePayload {
  name: string;
  format: VideoFormat;
  hasText: boolean;
  editorId: string;
  productId: string;
}
