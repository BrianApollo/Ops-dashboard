/**
 * Products Feature
 *
 * Public API for the products feature.
 * All imports from this feature should go through this file.
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  Product,
  ProductStatus,
  ProductWithCounts,
  ProductFilters,
  ProductCountsProvider,
} from './types';

// =============================================================================
// DATA LAYER (read-only)
// =============================================================================

export { listProducts, getProduct } from './data';

// =============================================================================
// CONTROLLER
// =============================================================================

export {
  useProductsController,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from './useProductsController';

export type { UseProductsControllerResult } from './useProductsController';

// =============================================================================
// STATS
// =============================================================================

export { calculateProductStats } from './calculateProductStats';
export type { ProductStats } from './calculateProductStats';
