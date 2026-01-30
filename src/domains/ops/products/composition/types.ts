/**
 * Shared UI types for Products page components.
 * UI-only types: tabs, view modes, layout state.
 * Domain types (VideoStatus, etc.) are imported from features/.
 */

import type { CampaignStatus } from '../../../../features/campaigns/types';

export type WorkspaceTab = 'campaigns' | 'scripts' | 'videos' | 'images' | 'advertorials' | 'setup';
export type CampaignViewTab = 'manage' | 'redtrack-data' | 'launch-data';

export interface CampaignItem {
  id: string;
  name: string;
  productId: string;
  productName: string;
  status: CampaignStatus;
  platform?: string;
  createdAt: string;
  hasScripts: boolean;
  hasVideos: boolean;
  hasImages: boolean;
}

export interface EditorVideoCount {
  editorName: string;
  count: number;
}

export interface UploadedVideo {
  id: string;
  name: string;
  status: string;
  format?: string;
  driveUrl?: string;
}

export interface ScriptItem {
  id: string;
  name: string;
  productId: string;
  productName: string;
  authorId?: string;
  author?: string;
  content?: string;
  status: string;
  isApproved: boolean;
  /** All videos for this script */
  videos: Array<{ id: string; name: string; status: string; format?: string }>;
  /** Video counts grouped by editor - only editors with assignments */
  videosByEditor: EditorVideoCount[];
  /** Videos that have been uploaded (status !== 'todo') - for sidebar */
  uploadedVideos: UploadedVideo[];
}

export interface AdPresetItem {
  id: string;
  name: string;
  productName: string;
  status: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  cta: string;
  beneficiaryName: string;
  payerName: string;
}

export interface ImageItem {
  id: string;
  name: string;
  productName: string;
  imageType?: string;
  status: string;
  thumbnailUrl?: string;
  isUsed: boolean;
  driveFileId?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  notes?: string;
  usedInCampaigns: string[];
  createdAt?: string;
  image_url?: string;
}

export interface ProductAssetInfo {
  id: string;
  url: string;
  filename: string;
  driveFileId?: string;
}

export interface ProductInfo {
  id: string;
  name: string;
  status: string;
  driveFolderId?: string;
  images: ProductAssetInfo[];
  logos: ProductAssetInfo[];
}
