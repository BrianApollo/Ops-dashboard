/**
 * Tree View State Hook
 *
 * Pure client-side state: selection, filters, hidden sections, connections.
 * Ported from infrastructure.js state management + selection logic.
 */

import { useState, useMemo, useCallback } from 'react';
import type {
  InfraData,
  TreeConnection,
  TreeFilterState,
  SelectedNode,
  EntityType,
  ConnectedByType,
} from '../../../features/infrastructure/types';

// =============================================================================
// HELPERS
// =============================================================================

export function getStatusBadgeClass(status: string | undefined): 'active' | 'disabled' | 'pending' | 'unknown' {
  if (!status) return 'unknown';
  const lower = status.toLowerCase();
  if (lower.includes('active') || lower === 'published' || lower === 'yes') return 'active';
  if (lower.includes('disabled') || lower.includes('closed') || lower === 'unpublished' || lower === 'no') return 'disabled';
  if (lower.includes('pending')) return 'pending';
  return 'unknown';
}

function matchesTreeFilter(
  type: 'adaccount' | 'bm',
  status: string,
  filters: TreeFilterState
): boolean {
  const lower = (status || '').toLowerCase();
  if (lower.includes('active')) return filters[type].active;
  if (lower.includes('disabled') || lower.includes('closed')) return filters[type].disabled;
  if (lower.includes('pending')) return filters[type].pending;
  return filters[type].unknown;
}

// =============================================================================
// HOOK
// =============================================================================

export function useTreeState(data: InfraData) {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [treeFilters, setTreeFilters] = useState<TreeFilterState>({
    adaccount: { active: true, disabled: true, pending: true, unknown: true },
    bm: { active: true, disabled: true, pending: true, unknown: true },
  });
  const [expandedHiddenSections, setExpandedHiddenSections] = useState<Record<EntityType, boolean>>({
    profiles: false,
    bms: false,
    adaccounts: false,
    pages: false,
    pixels: false,
  });

  // Compute visible/hidden sets
  const visibility = useMemo(() => {
    const visibleBmIds = new Set<string>();
    const hiddenBmIds = new Set<string>();

    data.bms.forEach(bm => {
      if (!matchesTreeFilter('bm', bm.bmStatus, treeFilters)) return;
      if (bm.hidden) {
        hiddenBmIds.add(bm.id);
        if (expandedHiddenSections.bms) visibleBmIds.add(bm.id);
      } else {
        visibleBmIds.add(bm.id);
      }
    });

    const visibleAdAccountIds = new Set<string>();
    const hiddenAdAccountIds = new Set<string>();
    data.adaccounts.forEach(acc => {
      if (!matchesTreeFilter('adaccount', acc.adAccStatus, treeFilters)) return;
      const hasVisibleBM = acc.linkedBm.some(bmId => visibleBmIds.has(bmId));
      if (!hasVisibleBM) return;
      if (acc.hidden) {
        hiddenAdAccountIds.add(acc.id);
        if (expandedHiddenSections.adaccounts) visibleAdAccountIds.add(acc.id);
      } else {
        visibleAdAccountIds.add(acc.id);
      }
    });

    const visiblePixelIds = new Set<string>();
    const hiddenPixelIds = new Set<string>();
    data.pixels.forEach(pixel => {
      const hasVisibleBM = pixel.linkedBms.some(bmId => visibleBmIds.has(bmId));
      if (!hasVisibleBM) return;
      if (pixel.hidden) {
        hiddenPixelIds.add(pixel.id);
        if (expandedHiddenSections.pixels) visiblePixelIds.add(pixel.id);
      } else {
        visiblePixelIds.add(pixel.id);
      }
    });

    const visibleProfileIds = new Set<string>();
    const hiddenProfileIds = new Set<string>();
    data.profiles.forEach(profile => {
      if (profile.hidden) {
        hiddenProfileIds.add(profile.id);
        if (expandedHiddenSections.profiles) visibleProfileIds.add(profile.id);
      } else {
        visibleProfileIds.add(profile.id);
      }
    });

    const visiblePageIds = new Set<string>();
    const hiddenPageIds = new Set<string>();
    data.pages.forEach(page => {
      const hasVisibleProfile = page.linkedProfiles.some(pId => visibleProfileIds.has(pId));
      if (!hasVisibleProfile) return;
      if (page.hidden) {
        hiddenPageIds.add(page.id);
        if (expandedHiddenSections.pages) visiblePageIds.add(page.id);
      } else {
        visiblePageIds.add(page.id);
      }
    });

    return {
      visibleBmIds, hiddenBmIds,
      visibleAdAccountIds, hiddenAdAccountIds,
      visiblePixelIds, hiddenPixelIds,
      visibleProfileIds, hiddenProfileIds,
      visiblePageIds, hiddenPageIds,
    };
  }, [data, treeFilters, expandedHiddenSections]);

  // Build connections
  const connections = useMemo<TreeConnection[]>(() => {
    const conns: TreeConnection[] = [];

    data.profiles.forEach(profile => {
      if (profile.hidden) return;
      profile.linkedBm.forEach(bmId => {
        const bm = data.bms.find(b => b.id === bmId);
        if (bm && !bm.hidden) {
          conns.push({ from: `profiles-${profile.id}`, to: `bms-${bmId}`, type: 'profile-bm' });
        }
      });
      profile.linkedPages.forEach(pageId => {
        const page = data.pages.find(p => p.id === pageId);
        if (page && !page.hidden) {
          conns.push({ from: `profiles-${profile.id}`, to: `pages-${pageId}`, type: 'profile-page' });
        }
      });
    });

    data.bms.forEach(bm => {
      if (bm.hidden) return;
      bm.linkedAdAccs.forEach(accId => {
        const acc = data.adaccounts.find(a => a.id === accId);
        if (acc && !acc.hidden) {
          conns.push({ from: `bms-${bm.id}`, to: `adaccounts-${accId}`, type: 'bm-adaccount' });
        }
      });
      bm.linkedPixels.forEach(pixelId => {
        const pixel = data.pixels.find(p => p.id === pixelId);
        if (pixel && !pixel.hidden) {
          const isOwner = pixel.ownerBm.includes(bm.id);
          conns.push({ from: `bms-${bm.id}`, to: `pixels-${pixelId}`, type: 'bm-pixel', isOwner });
        }
      });
    });

    return conns;
  }, [data]);

  // Selection logic — find connected nodes recursively
  const { connectedNodeKeys, highlightedConnectionKeys } = useMemo(() => {
    if (!selectedNode) return { connectedNodeKeys: new Set<string>(), highlightedConnectionKeys: new Set<string>() };

    const nodeKey = `${selectedNode.type}-${selectedNode.id}`;
    const connected = new Set<string>([nodeKey]);
    const highlighted = new Set<string>();

    function findParents(key: string, visited: Set<string>) {
      connections.forEach(conn => {
        const connKey = `${conn.from}->${conn.to}`;
        if (conn.to === key && !visited.has(connKey)) {
          visited.add(connKey);
          connected.add(conn.from);
          highlighted.add(connKey);
          findParents(conn.from, visited);
        }
      });
    }

    function findChildren(key: string, visited: Set<string>) {
      connections.forEach(conn => {
        const connKey = `${conn.from}->${conn.to}`;
        if (conn.from === key && !visited.has(connKey)) {
          visited.add(connKey);
          connected.add(conn.to);
          highlighted.add(connKey);
          findChildren(conn.to, visited);
        }
      });
    }

    findParents(nodeKey, new Set());
    findChildren(nodeKey, new Set());

    return { connectedNodeKeys: connected, highlightedConnectionKeys: highlighted };
  }, [selectedNode, connections]);

  // Connected items grouped by type for sidebar
  const connectedByType = useMemo<ConnectedByType>(() => {
    const result: ConnectedByType = { profiles: [], bms: [], adaccounts: [], pages: [], pixels: [] };
    if (!selectedNode) return result;

    connectedNodeKeys.forEach(key => {
      if (key === `${selectedNode.type}-${selectedNode.id}`) return;
      const dashIdx = key.indexOf('-');
      const nodeType = key.substring(0, dashIdx) as EntityType;
      const nodeId = key.substring(dashIdx + 1);

      const lookup: Record<EntityType, unknown[]> = {
        profiles: data.profiles,
        bms: data.bms,
        adaccounts: data.adaccounts,
        pages: data.pages,
        pixels: data.pixels,
      };

      const item = (lookup[nodeType] as Array<{ id: string }>).find(r => r.id === nodeId);
      if (item) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result[nodeType] as any[]).push(item);
      }
    });

    return result;
  }, [selectedNode, connectedNodeKeys, data]);

  // Actions
  const selectNode = useCallback((type: EntityType, id: string) => {
    setSelectedNode({ type, id });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const toggleFilter = useCallback((type: 'adaccount' | 'bm', status: keyof TreeFilterState['adaccount']) => {
    setTreeFilters(prev => ({
      ...prev,
      [type]: { ...prev[type], [status]: !prev[type][status] },
    }));
  }, []);

  const filterSelectAll = useCallback((type: 'adaccount' | 'bm') => {
    setTreeFilters(prev => ({
      ...prev,
      [type]: { active: true, disabled: true, pending: true, unknown: true },
    }));
  }, []);

  const filterClearAll = useCallback((type: 'adaccount' | 'bm') => {
    setTreeFilters(prev => ({
      ...prev,
      [type]: { active: false, disabled: false, pending: false, unknown: false },
    }));
  }, []);

  const toggleHiddenSection = useCallback((type: EntityType) => {
    setExpandedHiddenSections(prev => ({ ...prev, [type]: !prev[type] }));
  }, []);

  return {
    selectedNode,
    connectedNodeKeys,
    highlightedConnectionKeys,
    connectedByType,
    connections,
    treeFilters,
    expandedHiddenSections,
    visibility,
    selectNode,
    clearSelection,
    toggleFilter,
    filterSelectAll,
    filterClearAll,
    toggleHiddenSection,
  };
}
