/**
 * Scripts Controller
 *
 * The brain of the Scripts feature. Owns ALL logic:
 * - List fetching via TanStack Query
 * - Filtering by status, product, approval
 * - Search
 *
 * Contains NO UI imports — pure logic only.
 */

import { useMemo, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  Script,
  ScriptStatus,
  ScriptFilters,
} from './types';
import {
  listScripts,
  createScript,
  listUsers,
  updateScriptContent,
  createHookScript,
  updateScriptHookFields,
} from './data';
import { STATUS_LABELS as GLOBAL_STATUS_LABELS } from '../../constants';
import { sortByNameDesc } from '../../utils';

// =============================================================================
// CONSTANTS
// =============================================================================

export const STATUS_LABELS: Record<ScriptStatus, string> = {
  draft: GLOBAL_STATUS_LABELS.draft,
  pending_review: GLOBAL_STATUS_LABELS.pending_review,
  approved: GLOBAL_STATUS_LABELS.approved,
  revision_needed: GLOBAL_STATUS_LABELS.revision_needed,
  archived: GLOBAL_STATUS_LABELS.archived,
};

export const STATUS_OPTIONS: ScriptStatus[] = [
  'draft',
  'pending_review',
  'approved',
  'revision_needed',
  'archived',
];

// =============================================================================
// CONTROLLER RESULT TYPE
// =============================================================================

export interface UseScriptsControllerResult {
  // Data
  scripts: Script[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;

  // Filters
  filters: ScriptFilters;
  setFilters: (filters: ScriptFilters) => void;
  activeStatus: ScriptStatus | null;
  setStatusFilter: (status: ScriptStatus | null) => void;
  setProductFilter: (productId: string | null) => void;
  setApprovedFilter: (isApproved: boolean | null) => void;
  clearFilters: () => void;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Filtered results
  filteredScripts: Script[];

  // Status counts
  statusCounts: {
    all: number;
    draft: number;
    pending_review: number;
    approved: number;
    revision_needed: number;
    archived: number;
  };

  // Approval counts
  approvalCounts: {
    approved: number;
    needsRevision: number;
    pending: number;
  };

  // Selection
  selectedScriptId: string | null;
  setSelectedScriptId: (id: string | null) => void;
  selectedScript: Script | null;

  // Counts provider for other features
  getApprovedScriptsCount: (productId: string) => number;
  getTotalScriptsCount: (productId: string) => number;
  getNextScriptNumber: (productId: string) => number;

  // Authors (for Add Script dialog)
  authorOptions: { value: string; label: string }[];
  isLoadingAuthors: boolean;

  // Mutations
  createNewScript: (
    productId: string,
    productName: string,
    authorId: string,
    authorName: string,
    content?: string
  ) => Promise<Script>;
  isCreating: boolean;
  updateContent: (scriptId: string, content: string) => Promise<void>;
  isUpdatingContent: boolean;

  // Hook operations
  getHooksForScript: (baseScriptNumber: number, productId: string) => Script[];
  getNextHookNumber: (baseScriptNumber: number, productId: string) => number;
  hasHooks: (script: Script) => boolean;
  extractScriptNumber: (scriptName: string) => number | null;
  createHookVariants: (params: {
    productId: string;
    productName: string;
    authorId: string;
    authorName: string;
    baseScriptNumber: number;
    hooks: string[];
    body: string;
    existingScriptId?: string;
  }) => Promise<Script[]>;
  isCreatingHooks: boolean;

  // Create new scripts with hooks from AddScriptDialog
  createScriptWithHooks: (params: {
    productId: string;
    productName: string;
    authorId: string;
    authorName: string;
    hooks: string[];
    body: string;
  }) => Promise<Script[]>;
}

// =============================================================================
// CONTROLLER HOOK
// =============================================================================

interface UseScriptsControllerOptions {
  /**
   * Initial filters.
   */
  initialFilters?: Partial<ScriptFilters>;
}

export function useScriptsController(
  options: UseScriptsControllerOptions = {}
): UseScriptsControllerResult {
  const { initialFilters } = options;

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [filters, setFilters] = useState<ScriptFilters>({
    status: [],
    productId: null,
    isApproved: null,
    ...initialFilters,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingContent, setIsUpdatingContent] = useState(false);
  const [isCreatingHooks, setIsCreatingHooks] = useState(false);

  // ---------------------------------------------------------------------------
  // QUERY
  // ---------------------------------------------------------------------------

  const scriptsQuery = useQuery({
    queryKey: ['scripts'],
    queryFn: listScripts,
    staleTime: 30 * 1000, // 30 seconds
  });

  const scripts = scriptsQuery.data ?? [];

  // Users query (for author selection)
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const users = usersQuery.data ?? [];

  // ---------------------------------------------------------------------------
  // DERIVED: AUTHOR OPTIONS
  // ---------------------------------------------------------------------------

  const authorOptions = useMemo(() => {
    return users
      .map((u) => ({ value: u.id, label: u.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [users]);

  // ---------------------------------------------------------------------------
  // DERIVED: STATUS COUNTS
  // ---------------------------------------------------------------------------

  const statusCounts = useMemo(() => ({
    all: scripts.length,
    draft: scripts.filter((s) => s.status === 'draft').length,
    pending_review: scripts.filter((s) => s.status === 'pending_review').length,
    approved: scripts.filter((s) => s.status === 'approved').length,
    revision_needed: scripts.filter((s) => s.status === 'revision_needed').length,
    archived: scripts.filter((s) => s.status === 'archived').length,
  }), [scripts]);

  // ---------------------------------------------------------------------------
  // DERIVED: APPROVAL COUNTS
  // ---------------------------------------------------------------------------

  const approvalCounts = useMemo(() => ({
    approved: scripts.filter((s) => s.isApproved).length,
    needsRevision: scripts.filter((s) => s.needsRevision).length,
    pending: scripts.filter((s) => !s.isApproved && !s.needsRevision).length,
  }), [scripts]);

  // ---------------------------------------------------------------------------
  // DERIVED: FILTERED SCRIPTS
  // ---------------------------------------------------------------------------

  const filteredScripts = useMemo(() => {
    let result = scripts;

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter((s) => filters.status.includes(s.status));
    }

    // Product filter
    if (filters.productId) {
      result = result.filter((s) => s.product.id === filters.productId);
    }

    // Approved filter
    if (filters.isApproved !== null) {
      result = result.filter((s) => s.isApproved === filters.isApproved);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(term) ||
        s.content?.toLowerCase().includes(term) ||
        s.notes?.toLowerCase().includes(term)
      );
    }

    // Sort by name descending (Z→A)
    result = [...result].sort(sortByNameDesc);

    return result;
  }, [scripts, filters, searchTerm]);

  // ---------------------------------------------------------------------------
  // DERIVED: SELECTED SCRIPT
  // ---------------------------------------------------------------------------

  const selectedScript = useMemo(() => {
    if (!selectedScriptId) return null;
    return scripts.find((s) => s.id === selectedScriptId) ?? null;
  }, [scripts, selectedScriptId]);

  // ---------------------------------------------------------------------------
  // COUNTS PROVIDER FUNCTIONS
  // ---------------------------------------------------------------------------

  const getApprovedScriptsCount = useCallback((productId: string): number => {
    return scripts.filter((s) => s.product.id === productId && s.isApproved).length;
  }, [scripts]);

  const getTotalScriptsCount = useCallback((productId: string): number => {
    return scripts.filter((s) => s.product.id === productId).length;
  }, [scripts]);

  const getNextScriptNumber = useCallback((productId: string): number => {
    const productScripts = scripts.filter((s) => s.product.id === productId);

    // Extract script numbers from names and find the maximum
    let maxNumber = 1000; // Start at 1000 so first script is 1001
    for (const script of productScripts) {
      const match = script.name.match(/Script\s+(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    return maxNumber + 1;
  }, [scripts]);

  // ---------------------------------------------------------------------------
  // FILTER HANDLERS
  // ---------------------------------------------------------------------------

  const activeStatus = filters.status.length === 1 ? filters.status[0] : null;

  const handleSetStatusFilter = useCallback((status: ScriptStatus | null) => {
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

  const handleSetApprovedFilter = useCallback((isApproved: boolean | null) => {
    setFilters((prev) => ({
      ...prev,
      isApproved,
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ status: [], productId: null, isApproved: null });
    setSearchTerm('');
  }, []);

  // ---------------------------------------------------------------------------
  // CREATE HANDLER
  // ---------------------------------------------------------------------------

  const handleCreateScript = useCallback(async (
    productId: string,
    productName: string,
    authorId: string,
    authorName: string,
    content?: string
  ): Promise<Script> => {
    // Get next script number (finds max existing number + 1)
    const scriptNumber = getNextScriptNumber(productId);
    const paddedNumber = String(scriptNumber).padStart(4, '0');
    const scriptName = `${productName} - Script ${paddedNumber} - ${authorName}`;

    setIsCreating(true);
    try {
      const newScript = await createScript(productId, scriptName, authorId, scriptNumber, content);
      await scriptsQuery.refetch();
      return newScript;
    } finally {
      setIsCreating(false);
    }
  }, [getNextScriptNumber, scriptsQuery]);

  // ---------------------------------------------------------------------------
  // UPDATE CONTENT HANDLER
  // ---------------------------------------------------------------------------

  const handleUpdateContent = useCallback(async (
    scriptId: string,
    content: string
  ): Promise<void> => {
    setIsUpdatingContent(true);
    try {
      await updateScriptContent(scriptId, content);
      await scriptsQuery.refetch();
    } finally {
      setIsUpdatingContent(false);
    }
  }, [scriptsQuery]);

  // ---------------------------------------------------------------------------
  // HOOK HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Extract the script number from a script name.
   * e.g., "VitalTac - Script 1014 - Nick" => 1014
   * e.g., "VitalTac - Script 1014 Hk2 - Nick" => 1014
   */
  const extractScriptNumber = useCallback((scriptName: string): number | null => {
    // Match "Script NNNN" or "Script NNNN Hk" pattern
    const match = scriptName.match(/Script\s+(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  }, []);

  /**
   * Get all hooks for a base script number within a product.
   * Only returns scripts that have hookNumber populated (actual hook variants).
   */
  const getHooksForScript = useCallback((baseScriptNumber: number, productId: string): Script[] => {
    return scripts.filter((s) =>
      s.product.id === productId &&
      s.baseScriptNumber === baseScriptNumber &&
      s.hookNumber !== undefined && s.hookNumber !== null
    );
  }, [scripts]);

  /**
   * Get the next hook number for a script.
   * If no hooks exist yet, returns 1.
   */
  const getNextHookNumber = useCallback((baseScriptNumber: number, productId: string): number => {
    const existingHooks = scripts.filter((s) =>
      s.product.id === productId &&
      s.baseScriptNumber === baseScriptNumber &&
      s.hookNumber !== undefined && s.hookNumber !== null
    );
    if (existingHooks.length === 0) {
      return 1;
    }
    const maxHookNumber = Math.max(...existingHooks.map((s) => s.hookNumber!));
    return maxHookNumber + 1;
  }, [scripts]);

  /**
   * Check if a script has hooks (is part of a hook family).
   */
  const hasHooks = useCallback((script: Script): boolean => {
    return script.hookNumber !== undefined && script.hookNumber !== null;
  }, []);

  /**
   * Create hook variants for a script.
   */
  const handleCreateHookVariants = useCallback(async (params: {
    productId: string;
    productName: string;
    authorId: string;
    authorName: string;
    baseScriptNumber: number;
    hooks: string[];
    body: string;
    existingScriptId?: string;
  }): Promise<Script[]> => {
    const {
      productId,
      productName,
      authorId,
      authorName,
      baseScriptNumber,
      hooks,
      body,
      existingScriptId,
    } = params;

    setIsCreatingHooks(true);
    try {
      const createdScripts: Script[] = [];
      const paddedBaseNumber = String(baseScriptNumber).padStart(4, '0');

      // If updating existing script, make it hook 1
      if (existingScriptId && hooks.length > 0) {
        const updatedScript = await updateScriptHookFields(
          existingScriptId,
          hooks[0],
          body,
          1, // hookNumber
          baseScriptNumber
        );
        createdScripts.push(updatedScript);

        // Create remaining hooks starting at 2
        for (let i = 1; i < hooks.length; i++) {
          const hookNumber = i + 1;
          const hookName = `${productName} - Script ${paddedBaseNumber} Hk${hookNumber} - ${authorName}`;
          const newScript = await createHookScript(
            productId,
            hookName,
            authorId,
            hooks[i],
            body,
            hookNumber,
            baseScriptNumber
          );
          createdScripts.push(newScript);
        }
      } else {
        // Creating all new hooks (from Add Script dialog with hooks checkbox)
        for (let i = 0; i < hooks.length; i++) {
          const hookNumber = i + 1;
          const hookName = hookNumber === 1
            ? `${productName} - Script ${paddedBaseNumber} - ${authorName}`
            : `${productName} - Script ${paddedBaseNumber} Hk${hookNumber} - ${authorName}`;

          const newScript = await createHookScript(
            productId,
            hookName,
            authorId,
            hooks[i],
            body,
            hookNumber,
            baseScriptNumber
          );
          createdScripts.push(newScript);
        }
      }

      await scriptsQuery.refetch();
      return createdScripts;
    } finally {
      setIsCreatingHooks(false);
    }
  }, [scriptsQuery]);

  /**
   * Create new scripts with hooks from AddScriptDialog.
   * Auto-calculates the next script number.
   */
  const handleCreateScriptWithHooks = useCallback(async (params: {
    productId: string;
    productName: string;
    authorId: string;
    authorName: string;
    hooks: string[];
    body: string;
  }): Promise<Script[]> => {
    const { productId, productName, authorId, authorName, hooks, body } = params;

    // Get the next script number
    const baseScriptNumber = getNextScriptNumber(productId);

    // Use createHookVariants without existingScriptId to create all new
    return handleCreateHookVariants({
      productId,
      productName,
      authorId,
      authorName,
      baseScriptNumber,
      hooks,
      body,
      // No existingScriptId - creating all new scripts
    });
  }, [getNextScriptNumber, handleCreateHookVariants]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    scripts,
    isLoading: scriptsQuery.isLoading,
    isError: scriptsQuery.isError,
    error: scriptsQuery.error,
    refetch: scriptsQuery.refetch,

    // Filters
    filters,
    setFilters,
    activeStatus,
    setStatusFilter: handleSetStatusFilter,
    setProductFilter: handleSetProductFilter,
    setApprovedFilter: handleSetApprovedFilter,
    clearFilters: handleClearFilters,

    // Search
    searchTerm,
    setSearchTerm,

    // Filtered results
    filteredScripts,

    // Status counts
    statusCounts,

    // Approval counts
    approvalCounts,

    // Selection
    selectedScriptId,
    setSelectedScriptId,
    selectedScript,

    // Counts provider
    getApprovedScriptsCount,
    getTotalScriptsCount,
    getNextScriptNumber,

    // Authors
    authorOptions,
    isLoadingAuthors: usersQuery.isLoading,

    // Mutations
    createNewScript: handleCreateScript,
    isCreating,
    updateContent: handleUpdateContent,
    isUpdatingContent,

    // Hook operations
    getHooksForScript,
    getNextHookNumber,
    hasHooks,
    extractScriptNumber,
    createHookVariants: handleCreateHookVariants,
    isCreatingHooks,
    createScriptWithHooks: handleCreateScriptWithHooks,
  };
}
