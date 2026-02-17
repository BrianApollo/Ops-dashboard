/**
 * Images Controller
 *
 * The brain of the Images feature. Owns ALL logic:
 * - List fetching via TanStack Query
 * - Filtering by status, product, type
 * - Search
 *
 * Contains NO UI imports — pure logic only.
 */

import { useMemo, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  Image,
  ImageStatus,
  ImageType,
  ImageFilters,
} from './types';
import { listImages, createImage, deleteTempImage } from './data';
import { STATUS_LABELS as GLOBAL_STATUS_LABELS } from '../../constants';
import { sortByNameDesc } from '../../utils';
import { uploadImageToStorage } from './storage';
import { deleteCloudflareImage, extractImageIdFromUrl } from '../../core/storage/cloudflare/images';

// =============================================================================
// CONSTANTS
// =============================================================================

export const STATUS_LABELS: Record<ImageStatus, string> = {
  pending: GLOBAL_STATUS_LABELS.pending,
  available: GLOBAL_STATUS_LABELS.available,
  archived: GLOBAL_STATUS_LABELS.archived,
  new: 'New',
};

export const STATUS_OPTIONS: ImageStatus[] = ['pending', 'available', 'archived', 'new'];

export const TYPE_LABELS: Record<ImageType, string> = {
  thumbnail: 'Thumbnail',
  banner: 'Banner',
  square: 'Square',
  story: 'Story',
  other: 'Other',
};

export const TYPE_OPTIONS: ImageType[] = ['thumbnail', 'banner', 'square', 'story', 'other'];

// =============================================================================
// CONTROLLER RESULT TYPE
// =============================================================================

export interface UseImagesControllerResult {
  // Data
  images: Image[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;

  // Filters
  filters: ImageFilters;
  setFilters: (filters: ImageFilters) => void;
  activeStatus: ImageStatus | null;
  setStatusFilter: (status: ImageStatus | null) => void;
  setProductFilter: (productId: string | null) => void;
  setTypeFilter: (imageType: ImageType | null) => void;
  clearFilters: () => void;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Filtered results
  filteredImages: Image[];

  // Status counts
  statusCounts: {
    all: number;
    pending: number;
    available: number;
    archived: number;
  };

  // Type counts
  typeCounts: {
    thumbnail: number;
    banner: number;
    square: number;
    story: number;
    other: number;
  };

  // Selection
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  selectedImage: Image | null;

  // Counts provider for other features
  getAvailableImagesCount: (productId: string) => number;
  getTotalImagesCount: (productId: string) => number;
  getNextImageNumber: (productId: string) => number;

  // Upload
  uploadImages: (
    productId: string,
    productName: string,
    productDriveFolderId: string,
    files: File[]
  ) => Promise<void>;
  approveImages: (
    imageIds: string[],
    productId: string,
    productName: string,
    productDriveFolderId: string
  ) => Promise<void>;
  isUploading: boolean;
  uploadProgress: { current: number; total: number } | null;
}

// =============================================================================
// CONTROLLER HOOK
// =============================================================================

interface UseImagesControllerOptions {
  /**
   * Initial filters.
   */
  initialFilters?: Partial<ImageFilters>;
}

export function useImagesController(
  options: UseImagesControllerOptions = {}
): UseImagesControllerResult {
  const { initialFilters } = options;

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [filters, setFilters] = useState<ImageFilters>({
    status: [],
    productId: null,
    imageType: null,
    ...initialFilters,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // ---------------------------------------------------------------------------
  // QUERY
  // ---------------------------------------------------------------------------

  const imagesQuery = useQuery({
    queryKey: ['images'],
    queryFn: listImages,
    staleTime: 30 * 1000, // 30 seconds
  });

  const images = imagesQuery.data ?? [];

  // ---------------------------------------------------------------------------
  // DERIVED: STATUS COUNTS
  // ---------------------------------------------------------------------------

  const statusCounts = useMemo(() => ({
    all: images.length,
    pending: images.filter((i) => i.status === 'pending').length,
    available: images.filter((i) => i.status === 'available').length,
    archived: images.filter((i) => i.status === 'archived').length,
    new: images.filter((i) => i.status === 'new').length,
  }), [images]);

  // ---------------------------------------------------------------------------
  // DERIVED: TYPE COUNTS
  // ---------------------------------------------------------------------------

  const typeCounts = useMemo(() => ({
    thumbnail: images.filter((i) => i.imageType === 'thumbnail').length,
    banner: images.filter((i) => i.imageType === 'banner').length,
    square: images.filter((i) => i.imageType === 'square').length,
    story: images.filter((i) => i.imageType === 'story').length,
    other: images.filter((i) => i.imageType === 'other' || !i.imageType).length,
  }), [images]);

  // ---------------------------------------------------------------------------
  // DERIVED: FILTERED IMAGES
  // ---------------------------------------------------------------------------

  const filteredImages = useMemo(() => {
    let result = images;

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter((i) => filters.status.includes(i.status));
    }

    // Product filter
    if (filters.productId) {
      result = result.filter((i) => i.product.id === filters.productId);
    }

    // Type filter
    if (filters.imageType) {
      result = result.filter((i) => i.imageType === filters.imageType);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((i) =>
        i.name.toLowerCase().includes(term) ||
        i.notes?.toLowerCase().includes(term)
      );
    }

    // Sort by name descending (Z→A)
    result = [...result].sort(sortByNameDesc);

    return result;
  }, [images, filters, searchTerm]);

  // ---------------------------------------------------------------------------
  // DERIVED: SELECTED IMAGE
  // ---------------------------------------------------------------------------

  const selectedImage = useMemo(() => {
    if (!selectedImageId) return null;
    return images.find((i) => i.id === selectedImageId) ?? null;
  }, [images, selectedImageId]);

  // ---------------------------------------------------------------------------
  // COUNTS PROVIDER FUNCTIONS
  // ---------------------------------------------------------------------------

  const getAvailableImagesCount = useCallback((productId: string): number => {
    return images.filter((i) => i.product.id === productId && i.status === 'available').length;
  }, [images]);

  const getTotalImagesCount = useCallback((productId: string): number => {
    return images.filter((i) => i.product.id === productId).length;
  }, [images]);

  const getNextImageNumber = useCallback((productId: string): number => {
    const productImages = images.filter((i) => i.product.id === productId);
    if (productImages.length === 0) return 1;

    const maxCount = Math.max(...productImages.map((i) => i.count || 0));
    return maxCount + 1;
  }, [images]);

  // ---------------------------------------------------------------------------
  // UPLOAD HANDLER
  // ---------------------------------------------------------------------------

  const handleUploadImages = useCallback(async (
    productId: string,
    productName: string,
    _productDriveFolderId: string, // Deprecated: no longer used
    files: File[]
  ): Promise<void> => {
    if (files.length === 0) return;

    if (!productId) {
      throw new Error('Upload blocked: Product ID is required.');
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      // Get base number from max count
      const productImages = images.filter((i) => i.product.id === productId);
      const maxCount = productImages.length > 0
        ? Math.max(...productImages.map((i) => i.count || 0))
        : 0;
      const baseNumber = maxCount + 1;

      // Upload all files
      const uploadPromises = files.map(async (file, index) => {
        const imageNumber = baseNumber + index;

        // Upload via canonical helper
        const result = await uploadImageToStorage({
          productName,
          imageNumber,
          source: file,
        });

        // Create Airtable record AFTER upload succeeds
        await createImage(productId, result.finalFilename, result.url, imageNumber);

        // Update progress
        setUploadProgress((prev) =>
          prev ? { ...prev, current: prev.current + 1 } : null
        );
      });

      await Promise.all(uploadPromises);

      // Refetch images list
      await imagesQuery.refetch();
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [images, imagesQuery]);

  const handleApproveImages = useCallback(async (
    imageIds: string[],
    productId: string,
    productName: string,
    _productDriveFolderId: string // Deprecated: no longer used
  ): Promise<void> => {
    if (imageIds.length === 0) return;

    if (!productId) {
      throw new Error('Product ID is required.');
    }

    setIsUploading(true);

    try {
      // Get base number from max count
      const productImages = images.filter((i) => i.product.id === productId);
      const maxCount = productImages.length > 0
        ? Math.max(...productImages.map((i) => i.count || 0))
        : 0;
      const baseNumber = maxCount + 1;

      const approvePromises = imageIds.map(async (id, index) => {
        const image = images.find((i) => i.id === id);
        if (!image || !image.image_url) {
          console.warn(`Skipping approval: Image not found or missing URL (${id})`);
          return;
        }

        // Fetch image from source URL
        const response = await fetch(image.image_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch source image from ${image.image_url}`);
        }
        const blob = await response.blob();
        const mimeType = blob.type;

        const imageNumber = baseNumber + index;

        // Upload via canonical helper
        const result = await uploadImageToStorage({
          productName,
          imageNumber,
          source: blob,
          mimeType,
        });

        // Create Airtable record AFTER upload succeeds
        await createImage(productId, result.finalFilename, result.url, imageNumber);

        // Delete temp image record AFTER Airtable write succeeds
        await deleteTempImage(id);

        // Delete from Cloudflare Images (best effort)
        const cloudflareImageId = extractImageIdFromUrl(image.image_url!);
        console.log(`[Debug] Extracted CF Image ID: ${cloudflareImageId} from URL: ${image.image_url}`);

        if (cloudflareImageId) {
          const deleted = await deleteCloudflareImage(cloudflareImageId);
          console.log(`[Debug] Cloudflare delete result for ${cloudflareImageId}: ${deleted}`);
        } else {
          console.warn(`[Debug] Could not extract Cloudflare Image ID from: ${image.image_url}`);
        }
      });

      await Promise.all(approvePromises);
      await imagesQuery.refetch();
    } finally {
      setIsUploading(false);
    }
  }, [images, imagesQuery]);

  // ---------------------------------------------------------------------------
  // FILTER HANDLERS
  // ---------------------------------------------------------------------------

  const activeStatus = filters.status.length === 1 ? filters.status[0] : null;

  const handleSetStatusFilter = useCallback((status: ImageStatus | null) => {
    setFilters((prev) => ({
      ...prev,
      status: status ? [status] : [],
    }));
  }, []);

  const handleSetProductFilter = useCallback((productId: string | null) => {
    setFilters((prev) => ({
      ...prev,
      productId,
    }));
  }, []);

  const handleSetTypeFilter = useCallback((imageType: ImageType | null) => {
    setFilters((prev) => ({
      ...prev,
      imageType,
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ status: [], productId: null, imageType: null });
    setSearchTerm('');
  }, []);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    images,
    isLoading: imagesQuery.isLoading,
    isError: imagesQuery.isError,
    error: imagesQuery.error,
    refetch: imagesQuery.refetch,

    // Filters
    filters,
    setFilters,
    activeStatus,
    setStatusFilter: handleSetStatusFilter,
    setProductFilter: handleSetProductFilter,
    setTypeFilter: handleSetTypeFilter,
    clearFilters: handleClearFilters,

    // Search
    searchTerm,
    setSearchTerm,

    // Filtered results
    filteredImages,

    // Status counts
    statusCounts,

    // Type counts
    typeCounts,

    // Selection
    selectedImageId,
    setSelectedImageId,
    selectedImage,

    // Counts provider
    getAvailableImagesCount,
    getTotalImagesCount,
    getNextImageNumber,

    // Upload
    uploadImages: handleUploadImages,
    approveImages: handleApproveImages,
    isUploading,
    uploadProgress,
  };
}
