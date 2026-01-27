/**
 * usePresetController - Controller for ad preset editing in SetupTab.
 * Manages expansion state, draft editing, dirty detection, and save logic.
 */

import { useState, useMemo, useCallback } from 'react';
import { useToast } from '../../../../core/toast';
import type { AdPresetUpdatePayload, AdPreset } from '../../../../features/ad-presets';
import type { AdPresetItem } from '../composition/types';

/** Draft state for editing a preset */
export interface PresetDraft {
  name: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  cta: string;
  beneficiaryName: string;
  payerName: string;
}

interface UsePresetControllerOptions {
  presets: AdPresetItem[];
  onSave: (id: string, payload: AdPresetUpdatePayload) => Promise<void>;
  onCreatePreset: (productId: string) => Promise<AdPreset>;
  selectedProductId: string | null;
}

interface UsePresetControllerReturn {
  /** Currently expanded preset ID */
  expandedPresetId: string | null;
  /** Whether currently in edit mode */
  isEditing: boolean;
  /** Current draft being edited */
  draft: PresetDraft | null;
  /** Whether draft has unsaved changes */
  isDirty: boolean;
  /** Toggle expansion on preset click */
  handlePresetClick: (preset: AdPresetItem) => void;
  /** Enter edit mode */
  handleEdit: () => void;
  /** Cancel editing and reset draft */
  handleCancelEdit: () => void;
  /** Save changes */
  handleSave: () => Promise<void>;
  /** Create new preset and open for editing */
  handleCreatePreset: () => Promise<void>;
  /** Update a simple field in draft */
  updateDraftField: (field: keyof PresetDraft, value: string) => void;
  /** Update an array field item in draft */
  updateDraftArrayField: (field: 'primaryTexts' | 'headlines' | 'descriptions', index: number, value: string) => void;
  /** Add an item to an array field */
  addDraftArrayField: (field: 'primaryTexts' | 'headlines' | 'descriptions') => void;
  /** Remove an item from an array field */
  removeDraftArrayField: (field: 'primaryTexts' | 'headlines' | 'descriptions', index: number) => void;
}

export function usePresetController({
  presets,
  onSave,
  onCreatePreset,
  selectedProductId,
}: UsePresetControllerOptions): UsePresetControllerReturn {
  const toast = useToast();

  // Expansion and editing state
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PresetDraft | null>(null);
  const [originalDraft, setOriginalDraft] = useState<PresetDraft | null>(null);

  // Dirty state detection - compare draft to original
  const isDirty = useMemo(() => {
    if (!draft || !originalDraft) return false;
    const arraysEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((v, i) => v === b[i]);
    return (
      draft.name !== originalDraft.name ||
      draft.cta !== originalDraft.cta ||
      draft.beneficiaryName !== originalDraft.beneficiaryName ||
      draft.payerName !== originalDraft.payerName ||
      !arraysEqual(draft.primaryTexts, originalDraft.primaryTexts) ||
      !arraysEqual(draft.headlines, originalDraft.headlines) ||
      !arraysEqual(draft.descriptions, originalDraft.descriptions)
    );
  }, [draft, originalDraft]);

  /** Initialize draft from preset */
  const initializeDraft = useCallback((preset: AdPresetItem, storeAsOriginal = false) => {
    const newDraft: PresetDraft = {
      name: preset.name,
      primaryTexts: preset.primaryTexts.length > 0 ? [...preset.primaryTexts] : [''],
      headlines: preset.headlines.length > 0 ? [...preset.headlines] : [''],
      descriptions: preset.descriptions.length > 0 ? [...preset.descriptions] : [''],
      cta: preset.cta,
      beneficiaryName: preset.beneficiaryName,
      payerName: preset.payerName,
    };
    setDraft(newDraft);
    if (storeAsOriginal) {
      setOriginalDraft({
        ...newDraft,
        primaryTexts: [...newDraft.primaryTexts],
        headlines: [...newDraft.headlines],
        descriptions: [...newDraft.descriptions],
      });
    }
  }, []);

  /** Toggle expansion on card click */
  const handlePresetClick = useCallback((preset: AdPresetItem) => {
    if (expandedPresetId === preset.id) {
      // Collapse if already expanded
      setExpandedPresetId(null);
      setIsEditing(false);
      setDraft(null);
    } else {
      // Expand and initialize draft for viewing
      setExpandedPresetId(preset.id);
      setIsEditing(false);
      initializeDraft(preset);
    }
  }, [expandedPresetId, initializeDraft]);

  /** Enter edit mode */
  const handleEdit = useCallback(() => {
    if (draft) {
      setOriginalDraft({
        ...draft,
        primaryTexts: [...draft.primaryTexts],
        headlines: [...draft.headlines],
        descriptions: [...draft.descriptions],
      });
    }
    setIsEditing(true);
  }, [draft]);

  /** Cancel editing */
  const handleCancelEdit = useCallback(() => {
    const preset = presets.find((p) => p.id === expandedPresetId);
    if (preset) {
      initializeDraft(preset);
    }
    setOriginalDraft(null);
    setIsEditing(false);
  }, [presets, expandedPresetId, initializeDraft]);

  /** Save changes */
  const handleSave = useCallback(async () => {
    if (!expandedPresetId || !draft) return;
    if (!isDirty) return;

    const payload: AdPresetUpdatePayload = {
      name: draft.name,
      primaryText1: draft.primaryTexts[0] ?? '',
      primaryText2: draft.primaryTexts[1] ?? '',
      primaryText3: draft.primaryTexts[2] ?? '',
      primaryText4: draft.primaryTexts[3] ?? '',
      primaryText5: draft.primaryTexts[4] ?? '',
      headline1: draft.headlines[0] ?? '',
      headline2: draft.headlines[1] ?? '',
      headline3: draft.headlines[2] ?? '',
      headline4: draft.headlines[3] ?? '',
      headline5: draft.headlines[4] ?? '',
      description1: draft.descriptions[0] ?? '',
      description2: draft.descriptions[1] ?? '',
      description3: draft.descriptions[2] ?? '',
      description4: draft.descriptions[3] ?? '',
      description5: draft.descriptions[4] ?? '',
      callToAction: draft.cta,
      beneficiaryName: draft.beneficiaryName,
      payerName: draft.payerName,
    };

    try {
      await onSave(expandedPresetId, payload);
      setOriginalDraft(null);
      setIsEditing(false);
      toast.success('Preset saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save preset';
      toast.error(message);
    }
  }, [expandedPresetId, draft, isDirty, onSave, toast]);

  /** Create new preset and open for editing */
  const handleCreatePreset = useCallback(async () => {
    if (!selectedProductId) return;
    const newPreset = await onCreatePreset(selectedProductId);
    // Transform to AdPresetItem format
    const presetItem: AdPresetItem = {
      id: newPreset.id,
      name: newPreset.name,
      productName: newPreset.product.name,
      status: newPreset.status,
      primaryTexts: [],
      headlines: [],
      descriptions: [],
      cta: newPreset.callToAction ?? '',
      beneficiaryName: newPreset.beneficiaryName ?? '',
      payerName: newPreset.payerName ?? '',
    };
    // Expand and edit the new preset
    setExpandedPresetId(presetItem.id);
    initializeDraft(presetItem);
    setIsEditing(true);
  }, [selectedProductId, onCreatePreset, initializeDraft]);

  /** Update a simple field in draft */
  const updateDraftField = useCallback((field: keyof PresetDraft, value: string) => {
    setDraft((prev) => prev ? { ...prev, [field]: value } : null);
  }, []);

  /** Update an array field in draft */
  const updateDraftArrayField = useCallback((
    field: 'primaryTexts' | 'headlines' | 'descriptions',
    index: number,
    value: string
  ) => {
    setDraft((prev) => {
      if (!prev) return null;
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  }, []);

  /** Add an item to an array field */
  const addDraftArrayField = useCallback((field: 'primaryTexts' | 'headlines' | 'descriptions') => {
    setDraft((prev) => {
      if (!prev || prev[field].length >= 5) return prev;
      return { ...prev, [field]: [...prev[field], ''] };
    });
  }, []);

  /** Remove an item from an array field */
  const removeDraftArrayField = useCallback((
    field: 'primaryTexts' | 'headlines' | 'descriptions',
    index: number
  ) => {
    setDraft((prev) => {
      if (!prev || prev[field].length <= 1) return prev;
      const arr = [...prev[field]];
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
  }, []);

  return {
    expandedPresetId,
    isEditing,
    draft,
    isDirty,
    handlePresetClick,
    handleEdit,
    handleCancelEdit,
    handleSave,
    handleCreatePreset,
    updateDraftField,
    updateDraftArrayField,
    addDraftArrayField,
    removeDraftArrayField,
  };
}
