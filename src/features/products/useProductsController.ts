/**
 * Products Controller
 *
 * The brain of the Products feature. Owns ALL logic:
 * - List fetching via TanStack Query
 * - Filtering by status
 * - Search
 * - Derived counts (injected from other features)
 *
 * Contains NO UI imports — pure logic only.
 */

import { useMemo, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  Product,
  ProductWithCounts,
  ProductStatus,
  ProductFilters,
  ProductCountsProvider,
} from './types';
import { listProducts, uploadAsset, deleteAsset, createProduct, updateProductStatus } from './data';
import type { UploadProgress } from './drive';
import { STATUS_LABELS as GLOBAL_STATUS_LABELS } from '../../constants';

// =============================================================================
// CONSTANTS
// =============================================================================

export const STATUS_LABELS: Record<ProductStatus, string> = {
  Active: GLOBAL_STATUS_LABELS.active,
  Preparing: GLOBAL_STATUS_LABELS.preparing,
  Benched: GLOBAL_STATUS_LABELS.benched,
};

export const STATUS_OPTIONS: ProductStatus[] = ['Active', 'Preparing', 'Benched'];

// =============================================================================
// CONTROLLER RESULT TYPE
// =============================================================================

export interface UseProductsControllerResult {
  // Data
  products: Product[];
  productsWithCounts: ProductWithCounts[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;

  // Filters
  filters: ProductFilters;
  setFilters: (filters: ProductFilters) => void;
  activeStatus: ProductStatus | null;
  setStatusFilter: (status: ProductStatus | null) => void;
  clearFilters: () => void;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Filtered results
  filteredProducts: ProductWithCounts[];

  // Status counts
  statusCounts: {
    all: number;
    Active: number;
    Preparing: number;
    Benched: number;
  };

  // Selection
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedProduct: ProductWithCounts | null;

  // Asset operations
  uploadProductAsset: (
    productId: string,
    file: File,
    assetType: 'image' | 'logo',
    onProgress?: (progress: UploadProgress) => void
  ) => Promise<void>;
  deleteProductAsset: (
    productId: string,
    assetId: string,
    driveFileId: string | undefined,
    assetType: 'image' | 'logo'
  ) => Promise<void>;
  createProduct: (
    name: string,
    image: File | null,
    status: ProductStatus
  ) => Promise<void>;
  updateStatus: (productId: string, status: ProductStatus) => Promise<void>;
  isCreating: boolean;
  isUploading: boolean;
  isDeleting: boolean;
  isUpdatingStatus: boolean;
  uploadProgress: number;
}

// =============================================================================
// CONTROLLER HOOK
// =============================================================================

interface UseProductsControllerOptions {
  /**
   * Initial filters.
   */
  initialFilters?: Partial<ProductFilters>;

  /**
   * Counts provider (injected from other features).
   * If not provided, all counts default to 0.
   */
  countsProvider?: ProductCountsProvider;
}

/**
 * Default counts provider (returns 0 for all counts).
 */
const defaultCountsProvider: ProductCountsProvider = {
  getAvailableVideosCount: () => 0,
  getAvailableImagesCount: () => 0,
  getActiveCampaignsCount: () => 0,
};

export function useProductsController(
  options: UseProductsControllerOptions = {}
): UseProductsControllerResult {
  const {
    initialFilters,
    countsProvider = defaultCountsProvider,
  } = options;

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [filters, setFilters] = useState<ProductFilters>({
    status: [],
    ...initialFilters,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Asset operation states
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ---------------------------------------------------------------------------
  // QUERY
  // ---------------------------------------------------------------------------

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: listProducts,
    staleTime: 30 * 1000, // 30 seconds
  });

  const products = productsQuery.data ?? [];

  // ---------------------------------------------------------------------------
  // DERIVED: PRODUCTS WITH COUNTS
  // ---------------------------------------------------------------------------

  const productsWithCounts = useMemo<ProductWithCounts[]>(() => {
    return products.map((product) => ({
      ...product,
      availableVideosCount: countsProvider.getAvailableVideosCount(product.id),
      availableImagesCount: countsProvider.getAvailableImagesCount(product.id),
      activeCampaignsCount: countsProvider.getActiveCampaignsCount(product.id),
    }));
  }, [products, countsProvider]);

  // ---------------------------------------------------------------------------
  // DERIVED: STATUS COUNTS
  // ---------------------------------------------------------------------------

  const statusCounts = useMemo(() => ({
    all: products.length,
    Active: products.filter((p) => p.status === 'Active').length,
    Preparing: products.filter((p) => p.status === 'Preparing').length,
    Benched: products.filter((p) => p.status === 'Benched').length,
  }), [products]);

  // ---------------------------------------------------------------------------
  // DERIVED: FILTERED PRODUCTS
  // ---------------------------------------------------------------------------

  const filteredProducts = useMemo(() => {
    let result = productsWithCounts;

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter((p) => filters.status.includes(p.status));
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(term)
      );
    }

    return result;
  }, [productsWithCounts, filters, searchTerm]);

  // ---------------------------------------------------------------------------
  // DERIVED: SELECTED PRODUCT
  // ---------------------------------------------------------------------------

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return productsWithCounts.find((p) => p.id === selectedProductId) ?? null;
  }, [productsWithCounts, selectedProductId]);

  // ---------------------------------------------------------------------------
  // FILTER HANDLERS
  // ---------------------------------------------------------------------------

  const activeStatus = filters.status.length === 1 ? filters.status[0] : null;

  const handleSetStatusFilter = useCallback((status: ProductStatus | null) => {
    setFilters((prev) => ({
      ...prev,
      status: status ? [status] : [],
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ status: [] });
    setSearchTerm('');
  }, []);

  // ---------------------------------------------------------------------------
  // ASSET OPERATIONS
  // ---------------------------------------------------------------------------

  const handleUploadAsset = useCallback(
    async (
      productId: string,
      file: File,
      assetType: 'image' | 'logo',
      onProgress?: (progress: UploadProgress) => void
    ) => {
      const product = products.find((p) => p.id === productId);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      if (!product.driveFolderId) {
        throw new Error('Product does not have a Drive Link configured');
      }

      const existingCount = assetType === 'image'
        ? product.images.length
        : product.logos.length;

      setIsUploading(true);
      setUploadProgress(0);

      try {
        await uploadAsset({
          productId,
          productName: product.name,
          driveFolderId: product.driveFolderId,
          file,
          assetType,
          existingCount,
          onProgress: (progress) => {
            setUploadProgress(progress.percentage);
            onProgress?.(progress);
          },
        });

        // Refetch products to get updated attachments
        await productsQuery.refetch();
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [products, productsQuery]
  );

  const handleDeleteAsset = useCallback(
    async (
      productId: string,
      assetId: string,
      driveFileId: string | undefined,
      assetType: 'image' | 'logo'
    ) => {
      setIsDeleting(true);

      try {
        await deleteAsset({
          productId,
          assetId,
          driveFileId,
          assetType,
        });

        // Refetch products to get updated attachments
        await productsQuery.refetch();
      } finally {
        setIsDeleting(false);
      }
    },
    [productsQuery]
  );

  const handleCreateProduct = useCallback(
    async (name: string, image: File | null, status: ProductStatus) => {
      setIsCreating(true);
      try {
        // 1. Create product
        const newProduct = await createProduct(name, status);

        // 2. Upload image if provided
        if (image) {
          if (newProduct.driveFolderId) {
            // Use data-layer uploadAsset directly to avoid looking up product in stale 'products' list
            // associated with handleUploadAsset
            setIsUploading(true);
            try {
              await uploadAsset({
                productId: newProduct.id,
                productName: newProduct.name,
                driveFolderId: newProduct.driveFolderId,
                file: image,
                assetType: 'image',
                existingCount: 0,
                onProgress: (progress) => setUploadProgress(progress.percentage),
              });
            } finally {
              setIsUploading(false);
              setUploadProgress(0);
            }
          } else {
            console.warn('Product created but image skipped: No Drive Link returned.');
          }
        }

        // 3. Refetch list
        await productsQuery.refetch();

        // 4. Select the new product
        setSelectedProductId(newProduct.id);
      } finally {
        setIsCreating(false);
      }
    },
    [productsQuery]
  );

  const handleUpdateStatus = useCallback(
    async (productId: string, status: ProductStatus) => {
      setIsUpdatingStatus(true);
      try {
        await updateProductStatus(productId, status);
        await productsQuery.refetch();
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [productsQuery]
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    products,
    productsWithCounts,
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    error: productsQuery.error,
    refetch: productsQuery.refetch,

    // Filters
    filters,
    setFilters,
    activeStatus,
    setStatusFilter: handleSetStatusFilter,
    clearFilters: handleClearFilters,

    // Search
    searchTerm,
    setSearchTerm,

    // Filtered results
    filteredProducts,

    // Status counts
    statusCounts,

    // Selection
    selectedProductId,
    setSelectedProductId,
    selectedProduct,

    // Asset operations
    uploadProductAsset: handleUploadAsset,
    deleteProductAsset: handleDeleteAsset,
    createProduct: handleCreateProduct,
    updateStatus: handleUpdateStatus,
    isCreating,
    isUploading,
    isDeleting,
    isUpdatingStatus,
    uploadProgress,
  };
}
