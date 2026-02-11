/**
 * TreeColumn - A column or row section in the tree view.
 *
 * layout='column' (default): Vertical list with header. Used for Ad Accounts, Pixels, BMs.
 * layout='row': Horizontal wrapping inside a card container. Used for Pages, Profiles.
 *
 * wrapNodesInCard: Wraps nodes in an accent-bordered card (used for BMs in center).
 * accentColor: Colored border accent for headers and cards.
 */

import { Box, Typography, Collapse } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { TreeNode } from './TreeNode';
import { FilterDropdown } from './FilterDropdown';
import type { EntityType, TreeFilterState } from '../../../../features/infrastructure/types';

interface NodeData {
  id: string;
  name: string;
  status?: string;
  hasSystemUser?: boolean;
}

interface TreeColumnProps {
  title: string;
  type: EntityType;
  icon: string;
  visibleNodes: NodeData[];
  hiddenNodes: NodeData[];
  selectedNodeKey: string | null;
  connectedNodeKeys: Set<string>;
  isHiddenExpanded: boolean;
  onToggleHidden: () => void;
  onSelectNode: (type: EntityType, id: string) => void;
  nodeRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  filterType?: 'adaccount' | 'bm';
  filters?: TreeFilterState;
  onToggleFilter?: (type: 'adaccount' | 'bm', status: keyof TreeFilterState['adaccount']) => void;
  onFilterSelectAll?: (type: 'adaccount' | 'bm') => void;
  onFilterClearAll?: (type: 'adaccount' | 'bm') => void;
  layout?: 'column' | 'row';
  accentColor?: string;
  wrapNodesInCard?: boolean;
}

export function TreeColumn({
  title, type, icon,
  visibleNodes, hiddenNodes,
  selectedNodeKey, connectedNodeKeys,
  isHiddenExpanded, onToggleHidden,
  onSelectNode, nodeRefs,
  filterType, filters, onToggleFilter, onFilterSelectAll, onFilterClearAll,
  layout = 'column',
  accentColor,
  wrapNodesInCard = false,
}: TreeColumnProps) {
  const theme = useTheme();

  const registerRef = (nodeKey: string) => (el: HTMLDivElement | null) => {
    if (el) {
      nodeRefs.current.set(nodeKey, el);
    } else {
      nodeRefs.current.delete(nodeKey);
    }
  };

  const getNodeState = (nodeId: string) => {
    const key = `${type}-${nodeId}`;
    const isSelected = selectedNodeKey === key;
    const isHighlighted = !isSelected && connectedNodeKeys.has(key);
    const isDimmed = selectedNodeKey !== null && !isSelected && !isHighlighted;
    return { isSelected, isHighlighted, isDimmed };
  };

  const renderNodes = (nodes: NodeData[], isHidden = false) =>
    nodes.map(node => {
      const state = getNodeState(node.id);
      return (
        <TreeNode
          key={node.id}
          type={type}
          id={node.id}
          name={node.name}
          status={node.status}
          icon={icon}
          hasSystemUser={node.hasSystemUser}
          isSelected={state.isSelected}
          isHighlighted={state.isHighlighted}
          isDimmed={state.isDimmed}
          isHiddenItem={isHidden}
          onClick={() => onSelectNode(type, node.id)}
          nodeRef={registerRef(`${type}-${node.id}`)}
        />
      );
    });

  const renderHiddenSection = () => {
    if (hiddenNodes.length === 0) return null;
    const isRow = layout === 'row';
    return (
      <Box sx={{ mt: 1, borderTop: `1px dashed ${theme.palette.divider}`, pt: 1 }}>
        <Box
          onClick={onToggleHidden}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            px: 1,
            py: 0.5,
            cursor: 'pointer',
            borderRadius: '4px',
            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
          }}
        >
          <ExpandMoreIcon
            sx={{
              fontSize: 12,
              transform: isHiddenExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s',
              color: 'text.secondary',
            }}
          />
          <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>
            Hidden ({hiddenNodes.length})
          </Typography>
        </Box>
        <Collapse in={isHiddenExpanded}>
          <Box sx={{
            display: 'flex',
            flexDirection: isRow ? 'row' : 'column',
            flexWrap: isRow ? 'wrap' : 'nowrap',
            gap: '8px',
            pt: 1,
            justifyContent: isRow ? 'center' : 'flex-start',
          }}>
            {renderNodes(hiddenNodes, true)}
          </Box>
        </Collapse>
      </Box>
    );
  };

  /* ============ ROW LAYOUT (Pages, Profiles) ============ */
  if (layout === 'row') {
    return (
      <Box sx={{
        bgcolor: theme.palette.background.paper,
        borderRadius: '12px',
        p: '15px',
        border: `1px solid ${theme.palette.divider}`,
        borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
        width: 'fit-content',
        minWidth: 200,
      }}>
        {/* Row label */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          mb: '12px',
          pb: '8px',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}>
          <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
          <Typography sx={{
            fontWeight: 600,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'text.secondary',
          }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            ({visibleNodes.length + hiddenNodes.length})
          </Typography>
        </Box>
        {/* Nodes — horizontal wrapping */}
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          justifyContent: 'center',
        }}>
          {renderNodes(visibleNodes)}
        </Box>
        {renderHiddenSection()}
      </Box>
    );
  }

  /* ============ COLUMN LAYOUT (Ad Accounts, Pixels, BMs) ============ */
  const header = (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      px: '12px',
      py: '8px',
      borderRadius: '8px',
      bgcolor: theme.palette.background.paper,
      borderBottom: accentColor ? `3px solid ${accentColor}` : undefined,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
        <Typography sx={{
          fontWeight: 600,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          ({visibleNodes.length + hiddenNodes.length})
        </Typography>
      </Box>
      {filterType && filters && onToggleFilter && onFilterSelectAll && onFilterClearAll && (
        <FilterDropdown
          type={filterType}
          filters={filters}
          onToggle={onToggleFilter}
          onSelectAll={onFilterSelectAll}
          onClearAll={onFilterClearAll}
        />
      )}
    </Box>
  );

  const nodesContent = (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      alignItems: wrapNodesInCard ? 'center' : 'stretch',
    }}>
      {renderNodes(visibleNodes)}
      {renderHiddenSection()}
    </Box>
  );

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      ...(wrapNodesInCard && { alignItems: 'center', width: 'fit-content' }),
    }}>
      {header}
      {wrapNodesInCard ? (
        <Box sx={{
          bgcolor: theme.palette.background.paper,
          borderRadius: '12px',
          p: '15px',
          border: `1px solid ${theme.palette.divider}`,
          borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 'fit-content',
          minWidth: 200,
        }}>
          {nodesContent}
        </Box>
      ) : nodesContent}
    </Box>
  );
}
