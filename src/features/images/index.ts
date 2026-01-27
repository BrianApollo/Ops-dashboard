/**
 * Images Feature
 *
 * Public API for the images feature.
 * All imports from this feature should go through this file.
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  Image,
  ImageStatus,
  ImageType,
  ImageFilters,
  ImageCountsProvider,
} from './types';

// =============================================================================
// DATA LAYER (read-only)
// =============================================================================

export {
  listImages,
  listImagesByProduct,
  getImage,
  clearProductsCache,
} from './data';

// =============================================================================
// STORAGE
// =============================================================================

export { uploadImageToStorage } from './storage';
export type { ImageUploadOptions, ImageUploadResult } from './storage';

// =============================================================================
// CONTROLLER
// =============================================================================

export {
  useImagesController,
  STATUS_LABELS,
  STATUS_OPTIONS,
  TYPE_LABELS,
  TYPE_OPTIONS,
} from './useImagesController';

export type { UseImagesControllerResult } from './useImagesController';
