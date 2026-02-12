/**
 * TreeCanvas - Main layout: 3-column CSS Grid tree + sliding sidebar.
 *
 * Grid: Left (Ad Accounts, 200px) | Center (Pages/Profiles/BMs, 1fr) | Right (Pixels, 200px)
 * Gap: 40px, Padding: 30px, Sidebar: 360px
 */

import { useRef, useMemo } from 'react';
import { Box, Slide } from '@mui/material';
import { TreeColumn } from './TreeColumn';
import { TreeConnections } from './TreeConnections';
import { DetailsSidebar } from './DetailsSidebar';
import type {
  InfraData, TreeConnection, TreeFilterState,
  SelectedNode, EntityType, ConnectedByType,
  InfraProfile,
} from '../../../../features/infrastructure/types';

interface TreeCanvasProps {
  data: InfraData;
  connections: TreeConnection[];
  selectedNode: SelectedNode | null;
  connectedNodeKeys: Set<string>;
  highlightedConnectionKeys: Set<string>;
  connectedByType: ConnectedByType;
  treeFilters: TreeFilterState;
  expandedHiddenSections: Record<EntityType, boolean>;
  visibility: {
    visibleBmIds: Set<string>; hiddenBmIds: Set<string>;
    visibleAdAccountIds: Set<string>; hiddenAdAccountIds: Set<string>;
    visiblePixelIds: Set<string>; hiddenPixelIds: Set<string>;
    visibleProfileIds: Set<string>; hiddenProfileIds: Set<string>;
    visiblePageIds: Set<string>; hiddenPageIds: Set<string>;
  };
  onSelectNode: (type: EntityType, id: string) => void;
  onClearSelection: () => void;
  onToggleHidden: (type: EntityType) => void;
  onToggleFilter: (type: 'adaccount' | 'bm', status: keyof TreeFilterState['adaccount']) => void;
  onFilterSelectAll: (type: 'adaccount' | 'bm') => void;
  onFilterClearAll: (type: 'adaccount' | 'bm') => void;
  // Actions
  onValidateProfileToken: (id: string) => void;
  onValidateBMToken: (id: string) => void;
  onRefreshProfileToken: (id: string) => void;
  onSyncProfileData: (id: string) => void;
  onGenerateToken: (id: string) => void;
  onPasteToken: (id: string) => void;
  onToggleItemHidden: (type: EntityType, id: string) => void;
  onUpdateProfile: (id: string, updates: Partial<InfraProfile>) => Promise<void>;
}

export function TreeCanvas({
  data,
  connections,
  selectedNode,
  connectedNodeKeys,
  highlightedConnectionKeys,
  connectedByType,
  treeFilters,
  expandedHiddenSections,
  visibility,
  onSelectNode,
  onClearSelection,
  onToggleHidden,
  onToggleFilter,
  onFilterSelectAll,
  onFilterClearAll,
  onValidateProfileToken,
  onValidateBMToken,
  onRefreshProfileToken,
  onSyncProfileData,
  onGenerateToken,
  onPasteToken,
  onToggleItemHidden,
  onUpdateProfile,
}: TreeCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const selectedNodeKey = selectedNode ? `${selectedNode.type}-${selectedNode.id}` : null;

  // Prepare node data for each column
  const adAccountNodes = useMemo(() => {
    const visible = data.adaccounts
      .filter(a => visibility.visibleAdAccountIds.has(a.id) && !visibility.hiddenAdAccountIds.has(a.id))
      .map(a => ({ id: a.id, name: a.adAccName, status: a.adAccStatus }));
    const hidden = data.adaccounts
      .filter(a => visibility.hiddenAdAccountIds.has(a.id))
      .map(a => ({ id: a.id, name: a.adAccName, status: a.adAccStatus }));
    return { visible, hidden };
  }, [data.adaccounts, visibility]);

  const pageNodes = useMemo(() => {
    const visible = data.pages
      .filter(p => visibility.visiblePageIds.has(p.id) && !visibility.hiddenPageIds.has(p.id))
      .map(p => ({ id: p.id, name: p.pageName, status: p.published === 'Published' ? 'Published' : 'Unpublished' }));
    const hidden = data.pages
      .filter(p => visibility.hiddenPageIds.has(p.id))
      .map(p => ({ id: p.id, name: p.pageName, status: p.published === 'Published' ? 'Published' : 'Unpublished' }));
    return { visible, hidden };
  }, [data.pages, visibility]);

  const profileNodes = useMemo(() => {
    const visible = data.profiles
      .filter(p => visibility.visibleProfileIds.has(p.id) && !visibility.hiddenProfileIds.has(p.id))
      .map(p => ({ id: p.id, name: p.profileName, status: undefined as string | undefined }));
    const hidden = data.profiles
      .filter(p => visibility.hiddenProfileIds.has(p.id))
      .map(p => ({ id: p.id, name: p.profileName, status: undefined as string | undefined }));
    return { visible, hidden };
  }, [data.profiles, visibility]);

  const bmNodes = useMemo(() => {
    const visible = data.bms
      .filter(b => visibility.visibleBmIds.has(b.id) && !visibility.hiddenBmIds.has(b.id))
      .map(b => ({ id: b.id, name: b.bmName, status: b.bmStatus, hasSystemUser: !!b.systemUserToken }));
    const hidden = data.bms
      .filter(b => visibility.hiddenBmIds.has(b.id))
      .map(b => ({ id: b.id, name: b.bmName, status: b.bmStatus, hasSystemUser: !!b.systemUserToken }));
    return { visible, hidden };
  }, [data.bms, visibility]);

  const pixelNodes = useMemo(() => {
    const visible = data.pixels
      .filter(p => visibility.visiblePixelIds.has(p.id) && !visibility.hiddenPixelIds.has(p.id))
      .map(p => ({ id: p.id, name: p.pixelName, status: p.available === 'Yes' ? 'Available' : 'Unavailable' }));
    const hidden = data.pixels
      .filter(p => visibility.hiddenPixelIds.has(p.id))
      .map(p => ({ id: p.id, name: p.pixelName, status: p.available === 'Yes' ? 'Available' : 'Unavailable' }));
    return { visible, hidden };
  }, [data.pixels, visibility]);

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Tree area — scrollable CSS Grid */}
      <Box
        ref={canvasRef}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('[data-type]')) {
            onClearSelection();
          }
        }}
        sx={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '200px 1fr 200px',
          gap: '40px',
          p: '30px',
          alignItems: 'start',
          alignContent: 'start',
          bgcolor: 'background.default',
        }}
      >
        <TreeConnections
          connections={connections}
          nodeRefs={nodeRefs}
          canvasRef={canvasRef}
          selectedNodeKey={selectedNodeKey}
          highlightedConnectionKeys={highlightedConnectionKeys}
        />

        {/* LEFT: Ad Accounts */}
        <TreeColumn
          title="Ad Accounts"
          type="adaccounts"
          icon={'\u{1F4B0}'}
          accentColor="#10b981"
          visibleNodes={adAccountNodes.visible}
          hiddenNodes={adAccountNodes.hidden}
          selectedNodeKey={selectedNodeKey}
          connectedNodeKeys={connectedNodeKeys}
          isHiddenExpanded={expandedHiddenSections.adaccounts}
          onToggleHidden={() => onToggleHidden('adaccounts')}
          onSelectNode={onSelectNode}
          nodeRefs={nodeRefs}
          filterType="adaccount"
          filters={treeFilters}
          onToggleFilter={onToggleFilter}
          onFilterSelectAll={onFilterSelectAll}
          onFilterClearAll={onFilterClearAll}
        />

        {/* CENTER: Pages, Profiles, BMs stacked vertically */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <TreeColumn
            title="Pages"
            type="pages"
            icon="P"
            layout="row"
            accentColor="#f59e0b"
            visibleNodes={pageNodes.visible}
            hiddenNodes={pageNodes.hidden}
            selectedNodeKey={selectedNodeKey}
            connectedNodeKeys={connectedNodeKeys}
            isHiddenExpanded={expandedHiddenSections.pages}
            onToggleHidden={() => onToggleHidden('pages')}
            onSelectNode={onSelectNode}
            nodeRefs={nodeRefs}
          />
          <TreeColumn
            title="Profiles"
            type="profiles"
            icon={'\u{1F464}'}
            layout="row"
            accentColor="#8b5cf6"
            visibleNodes={profileNodes.visible}
            hiddenNodes={profileNodes.hidden}
            selectedNodeKey={selectedNodeKey}
            connectedNodeKeys={connectedNodeKeys}
            isHiddenExpanded={expandedHiddenSections.profiles}
            onToggleHidden={() => onToggleHidden('profiles')}
            onSelectNode={onSelectNode}
            nodeRefs={nodeRefs}
          />
          <TreeColumn
            title="Business Managers"
            type="bms"
            icon={'\u{1F3E2}'}
            layout="column"
            accentColor="#3b82f6"
            wrapNodesInCard
            visibleNodes={bmNodes.visible}
            hiddenNodes={bmNodes.hidden}
            selectedNodeKey={selectedNodeKey}
            connectedNodeKeys={connectedNodeKeys}
            isHiddenExpanded={expandedHiddenSections.bms}
            onToggleHidden={() => onToggleHidden('bms')}
            onSelectNode={onSelectNode}
            nodeRefs={nodeRefs}
            filterType="bm"
            filters={treeFilters}
            onToggleFilter={onToggleFilter}
            onFilterSelectAll={onFilterSelectAll}
            onFilterClearAll={onFilterClearAll}
          />
        </Box>

        {/* RIGHT: Pixels */}
        <TreeColumn
          title="Pixels"
          type="pixels"
          icon={'\u{1F4CA}'}
          accentColor="#ec4899"
          visibleNodes={pixelNodes.visible}
          hiddenNodes={pixelNodes.hidden}
          selectedNodeKey={selectedNodeKey}
          connectedNodeKeys={connectedNodeKeys}
          isHiddenExpanded={expandedHiddenSections.pixels}
          onToggleHidden={() => onToggleHidden('pixels')}
          onSelectNode={onSelectNode}
          nodeRefs={nodeRefs}
        />
      </Box>

      {/* Sidebar — slides in on selection */}
      <Slide direction="left" in={!!selectedNode} mountOnEnter unmountOnExit>
        <Box
          sx={{
            width: 360,
            flexShrink: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {selectedNode && (
            <DetailsSidebar
              selectedNode={selectedNode}
              data={data}
              connectedByType={connectedByType}
              onValidateProfileToken={onValidateProfileToken}
              onValidateBMToken={onValidateBMToken}
              onRefreshProfileToken={onRefreshProfileToken}
              onSyncProfileData={onSyncProfileData}
              onGenerateToken={onGenerateToken}
              onPasteToken={onPasteToken}
              onToggleHidden={onToggleItemHidden}
              onUpdateProfile={onUpdateProfile}
            />
          )}
        </Box>
      </Slide>
    </Box>
  );
}
