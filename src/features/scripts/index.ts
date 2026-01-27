/**
 * Scripts Feature
 *
 * Public API for the scripts feature.
 * All imports from this feature should go through this file.
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  Script,
  ScriptStatus,
  ScriptFilters,
  ScriptCountsProvider,
} from './types';

// =============================================================================
// DATA LAYER (read-only)
// =============================================================================

export {
  listScripts,
  listScriptsByProduct,
  getScript,
  clearCaches,
  createScript,
} from './data';

// =============================================================================
// CONTROLLER
// =============================================================================

export {
  useScriptsController,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from './useScriptsController';

export type { UseScriptsControllerResult } from './useScriptsController';
