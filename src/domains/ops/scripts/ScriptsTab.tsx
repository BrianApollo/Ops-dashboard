/**
 * ScriptsTab - Scripts table with expandable video rows.
 * Uses SlideInPanel for details view (not Dialog).
 * Uses useListController for assigned/unassigned filtering.
 */

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import Slide from '@mui/material/Slide';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { useListController, FilterPills, ListPagination } from '../../../core/list';
import {
  DetailPanel,
  DetailPanelBody,
  DetailHeader,
  DetailPills,
  DetailSection,
} from '../../../core/panel';
import type { PillConfig } from '../../../core/panel';
import { EmptyState } from '../../../core/state';
import { StatusPill, STATUS_LABELS, getEditorChipSx, getProductPillStyle } from '../../../ui';
import { AddHooksDialog } from '../../../pages/ops/components/AddHooksDialog';
import { RequestScrollstoppersDialog } from '../../../pages/ops/components/RequestScrollstoppersDialog';
import { VideoDetailPanel } from '../../../features/videos';
import { useDetailPanel } from '../products/hooks';
import type { Script } from '../../../features/scripts';
import type { VideoAsset } from '../../../features/videos';
import type { ScriptItem } from '../products/composition/types';
import { tableHeaderCellSx, tableDataCellSx } from '../products/composition/styles';
import { matchesAllTokens } from '../../../utils';

type AssignmentFilter = 'assigned' | 'unassigned';

interface ScriptFilters {
  assignment: AssignmentFilter | null;
}

interface ScriptsTabProps {
  scripts: ScriptItem[];
  videos: VideoAsset[];
  showProductColumn: boolean;
  onAssign: (scriptId: string, editorId?: string) => void;
  assigningScriptIds: Set<string>;
  onBulkAssign?: (scriptIds: string[], editorId?: string) => void;
  editors: { value: string; label: string }[];
  onVideoStatusChange?: (videoId: string, status: 'todo' | 'available') => Promise<void>;
  onVideoNotesChange?: (videoId: string, notes: string) => Promise<void>;
  isUpdatingVideo?: boolean;
  onScriptContentChange?: (scriptId: string, content: string) => Promise<void>;
  // Hook operations
  onCreateHooks?: (params: {
    productId: string;
    productName: string;
    authorId: string;
    authorName: string;
    baseScriptNumber: number;
    hooks: string[];
    body: string;
    existingScriptId?: string;
  }) => Promise<Script[]>;
  isCreatingHooks?: boolean;
  getHooksForScript?: (baseScriptNumber: number, productId: string) => Script[];
  extractScriptNumber?: (scriptName: string) => number | null;
  // Scrollstopper operations
  onRequestScrollstoppers?: (params: {
    scriptId: string;
    editorIds: string[];
    count: number;
  }) => Promise<void>;
  // External navigation (from Videos tab)
  initialScriptIdToOpen?: string | null;
  onScriptOpened?: () => void;
  // For AddHooksDialog
  selectedProductId: string | null;
  selectedProductName: string | null;
  authorOptions: { value: string; label: string }[];
  getNextScriptNumber: (productId: string) => number;
}

export function ScriptsTab({
  scripts,
  videos,
  showProductColumn,
  onAssign,
  assigningScriptIds,
  onBulkAssign,
  editors,
  onVideoStatusChange,
  onVideoNotesChange,
  isUpdatingVideo = false,
  onScriptContentChange,
  onCreateHooks,
  isCreatingHooks = false,
  getHooksForScript,
  extractScriptNumber,
  onRequestScrollstoppers,
  initialScriptIdToOpen,
  onScriptOpened,
  // selectedProductId,
  // selectedProductName,
  // authorOptions,
  // getNextScriptNumber,
}: ScriptsTabProps) {
  // Presentation state
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [detailScriptId, setDetailScriptId] = useState<string | null>(null);
  const [addHooksDialogOpen, setAddHooksDialogOpen] = useState(false);
  const [scrollstopperDialogOpen, setScrollstopperDialogOpen] = useState(false);

  // Assign menu state
  const [assignMenuAnchor, setAssignMenuAnchor] = useState<{ element: HTMLElement; scriptId: string } | null>(null);
  const [bulkAssignMenuAnchor, setBulkAssignMenuAnchor] = useState<HTMLElement | null>(null);

  // Script editing state
  const [scriptContentValue, setScriptContentValue] = useState('');
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [isScriptExpanded, setIsScriptExpanded] = useState(true);
  const [isEditingScript, setIsEditingScript] = useState(false);

  // Derive detailScript from current props (always up to date)
  const detailScript = detailScriptId
    ? scripts.find((s) => s.id === detailScriptId) ?? null
    : null;

  // Sync script content when detail script changes
  useEffect(() => {
    if (detailScript) {
      setScriptContentValue(detailScript.content ?? '');
      setIsScriptExpanded(true); // Reset to expanded when opening new script
      setIsEditingScript(false); // Reset to view mode when opening new script
    }
  }, [detailScript?.id, detailScript?.content]);

  // Handle external navigation from Videos tab
  useEffect(() => {
    if (initialScriptIdToOpen) {
      setDetailScriptId(initialScriptIdToOpen);
      onScriptOpened?.();
    }
  }, [initialScriptIdToOpen, onScriptOpened]);

  // Handle edit button click
  const handleEditScript = useCallback(() => {
    setIsEditingScript(true);
  }, []);

  // Handle cancel button click
  const handleCancelEdit = useCallback(() => {
    setScriptContentValue(detailScript?.content ?? '');
    setIsEditingScript(false);
  }, [detailScript?.content]);

  // Handle save button click
  const handleSaveScript = useCallback(async () => {
    if (!detailScript || !onScriptContentChange) return;
    if (scriptContentValue === (detailScript.content ?? '')) {
      setIsEditingScript(false);
      return;
    }
    setIsSavingContent(true);
    try {
      await onScriptContentChange(detailScript.id, scriptContentValue);
      setIsEditingScript(false);
    } finally {
      setIsSavingContent(false);
    }
  }, [detailScript, onScriptContentChange, scriptContentValue]);

  // Check if content has changed
  const isScriptDirty = scriptContentValue !== (detailScript?.content ?? '');

  // Video detail panel (uses shared hook)
  const videoDetail = useDetailPanel(videos);

  // List controller for filtering and search
  const list = useListController<ScriptItem, ScriptFilters>({
    records: scripts,
    initialFilters: { assignment: 'assigned' },
    initialPageSize: 20,
    filterFn: (records, filters) => {
      if (!filters.assignment) return records;
      if (filters.assignment === 'assigned') {
        return records.filter((s) => s.videos.length > 0);
      }
      return records.filter((s) => s.videos.length === 0);
    },
    searchFn: (records, searchTerm) => {
      if (!searchTerm.trim()) return records;
      return records.filter((s) => matchesAllTokens(searchTerm, s.name));
    },
  });

  // Derived counts for display
  const assignedCount = list.allRecords.filter((s) => s.videos.length > 0).length;
  const unassignedCount = list.allRecords.filter((s) => s.videos.length === 0).length;

  // Assign menu handlers
  const handleOpenAssignMenu = useCallback((event: React.MouseEvent<HTMLElement>, scriptId: string) => {
    event.stopPropagation();
    setAssignMenuAnchor({ element: event.currentTarget, scriptId });
  }, []);

  const handleCloseAssignMenu = useCallback(() => {
    setAssignMenuAnchor(null);
  }, []);

  const handleAssignToEditor = useCallback((editorId?: string) => {
    if (assignMenuAnchor) {
      onAssign(assignMenuAnchor.scriptId, editorId);
      setAssignMenuAnchor(null);
    }
  }, [assignMenuAnchor, onAssign]);

  // Sidebar assign handler
  const handleSidebarAssign = useCallback((editorId?: string) => {
    if (detailScript) {
      onAssign(detailScript.id, editorId);
    }
  }, [detailScript, onAssign]);

  // Toggle expand handler
  const handleToggleExpand = useCallback((e: React.MouseEvent, scriptId: string, hasVideos: boolean) => {
    e.stopPropagation();
    if (!hasVideos) return;
    setExpandedScript(expandedScript === scriptId ? null : scriptId);
  }, [expandedScript]);

  if (list.allRecords.length === 0) {
    return <EmptyState variant="filter" />;
  }

  // Calculate column count for colspan
  const columnCount = 5 + (showProductColumn ? 1 : 0);

  return (
    <Box>
      {/* Header with Filter Pills and Search */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <FilterPills<AssignmentFilter>
          options={[
            { value: 'assigned', status: 'assigned', label: `${assignedCount} Assigned` },
            { value: 'unassigned', status: 'unassigned', label: `${unassignedCount} Unassigned` },
          ]}
          activeFilter={list.filters.assignment}
          onFilterChange={(filter) => list.setFilters({ assignment: filter })}
        />
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Search scripts..."
          value={list.searchTerm}
          onChange={(e) => list.setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: 400,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'grey.100',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'grey.300' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
      </Box>

      {list.filteredRecords.length === 0 ? (
        <EmptyState variant="filter" />
      ) : (
        <>
          <TableContainer
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...tableHeaderCellSx, width: 48, px: 1 }}>
                    <Checkbox
                      size="small"
                      checked={list.visibleRecords.length > 0 && list.visibleRecords.every(r => list.isSelected(r.id))}
                      indeterminate={list.hasSelection && !list.visibleRecords.every(r => list.isSelected(r.id))}
                      onChange={() => list.hasSelection ? list.clearSelection() : list.selectAll()}
                    />
                  </TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, width: 48, px: 1 }} />
                  <TableCell sx={tableHeaderCellSx}>Script</TableCell>
                  {showProductColumn && (
                    <TableCell sx={tableHeaderCellSx}>Product</TableCell>
                  )}
                  <TableCell sx={tableHeaderCellSx}>Editors</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, width: 120 }}>Status</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, width: 120 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.visibleRecords.map((script) => {
                  const isExpanded = expandedScript === script.id;
                  const hasVideos = script.videos.length > 0;

                  return (
                    <>
                      {/* Main Script Row */}
                      <TableRow
                        key={script.id}
                        hover
                        onClick={() => setDetailScriptId(script.id)}
                        sx={{
                          cursor: 'pointer',
                          '&:last-child td': isExpanded ? {} : { borderBottom: 0 },
                        }}
                      >
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ px: 1 }}>
                          {assigningScriptIds.has(script.id) ? (
                            <CircularProgress size={20} />
                          ) : (
                            <Checkbox
                              size="small"
                              checked={list.isSelected(script.id)}
                              onChange={() => list.toggleSelection(script.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1.5, px: 1 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => handleToggleExpand(e, script.id, hasVideos)}
                            disabled={!hasVideos}
                            sx={{ opacity: hasVideos ? 1 : 0.3 }}
                          >
                            {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={tableDataCellSx}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {script.name}
                          </Typography>
                        </TableCell>
                        {showProductColumn && (
                          <TableCell sx={tableDataCellSx}>
                            <Typography variant="body2" color="text.secondary">
                              {script.productName}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell sx={tableDataCellSx}>
                          {script.videosByEditor.length > 0 ? (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {script.videosByEditor.map((ev) => (
                                <Chip
                                  key={ev.editorName}
                                  label={`${ev.editorName} (${ev.count})`}
                                  size="small"
                                  sx={getEditorChipSx(ev.editorName)}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={tableDataCellSx}>
                          <StatusPill
                            status={hasVideos ? 'assigned' : 'unassigned'}
                            label={hasVideos ? 'Assigned' : 'Unassigned'}
                          />
                        </TableCell>
                        <TableCell sx={tableDataCellSx}>
                          {!hasVideos && (
                            <Button
                              size="small"
                              variant="contained"
                              disabled={assigningScriptIds.has(script.id)}
                              onClick={(e) => handleOpenAssignMenu(e, script.id)}
                              endIcon={
                                assigningScriptIds.has(script.id) ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <KeyboardArrowDownIcon />
                                )
                              }
                            >
                              {assigningScriptIds.has(script.id) ? 'Assigning...' : 'Assign'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Videos Row */}
                      {hasVideos && (
                        <TableRow key={`${script.id}-videos`}>
                          <TableCell
                            colSpan={columnCount + 1}
                            sx={{
                              py: 0,
                              px: 0,
                              borderBottom: isExpanded ? '1px solid' : 0,
                              borderColor: 'divider',
                            }}
                          >
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box
                                sx={{
                                  py: 1.5,
                                  px: 2,
                                  pl: 7,
                                  bgcolor: (theme) =>
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(255,255,255,0.02)'
                                      : 'grey.50',
                                }}
                              >
                                <Table size="small">
                                  <TableBody>
                                    {script.videos.map((v) => {
                                      const fullVideo = videos.find((vid) => vid.id === v.id);
                                      return (
                                        <TableRow
                                          key={v.id}
                                          hover
                                          onClick={() => {
                                            if (fullVideo) {
                                              setDetailScriptId(null);
                                              videoDetail.openDetail(fullVideo.id);
                                            }
                                          }}
                                          sx={{
                                            cursor: 'pointer',
                                            '&:last-child td': { borderBottom: 0 },
                                          }}
                                        >
                                          <TableCell sx={{ py: 1, pl: 0, border: 0 }}>
                                            <Typography variant="body2">{v.name}</Typography>
                                          </TableCell>
                                          <TableCell sx={{ py: 1, width: 100, border: 0 }}>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                              sx={{ textTransform: 'capitalize' }}
                                            >
                                              {v.format ?? '—'}
                                            </Typography>
                                          </TableCell>
                                          <TableCell sx={{ py: 1, width: 100, border: 0 }}>
                                            <StatusPill
                                              status={v.status}
                                              label={STATUS_LABELS[v.status as keyof typeof STATUS_LABELS]}
                                            />
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <ListPagination
            pageIndex={list.pageIndex}
            totalPages={list.totalPages}
            totalRecords={list.filteredCount}
            onPageChange={list.setPageIndex}
          />
        </>
      )}

      {/* Details Panel */}
      <DetailPanel open={!!detailScript} onClose={() => setDetailScriptId(null)} width={520}>
        {detailScript && (
          <>
            <DetailHeader title={detailScript.name} onClose={() => setDetailScriptId(null)}>
              {/* Row 1: Product and Author pills */}
              {(() => {
                const productStyle = getProductPillStyle(detailScript.productName);
                const pills: PillConfig[] = [
                  {
                    label: detailScript.productName,
                    backgroundColor: productStyle.backgroundColor,
                    color: productStyle.color,
                    dotColor: productStyle.dotColor,
                  },
                ];
                if (detailScript.author) {
                  pills.push({ label: detailScript.author });
                }
                return <DetailPills pills={pills} />;
              })()}

              {/* Row 2: Assignments overview - editor chips with counts */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                {editors.map((editor) => {
                  const editorVideos = detailScript.videos.filter((v) => {
                    const fullVideo = videos.find((vid) => vid.id === v.id);
                    return fullVideo?.editor.name === editor.label;
                  });
                  const isAssigned = editorVideos.length > 0;
                  const canAssign = !isAssigned && !assigningScriptIds.has(detailScript.id);
                  return (
                    <Chip
                      key={editor.value}
                      label={`${editor.label} (${editorVideos.length}/6)`}
                      size="small"
                      onClick={canAssign ? () => handleSidebarAssign(editor.value) : undefined}
                      sx={{
                        ...getEditorChipSx(editor.label),
                        fontSize: '0.7rem',
                        height: 24,
                        cursor: canAssign ? 'pointer' : 'default',
                        opacity: isAssigned ? 1 : 0.6,
                        '&:hover': canAssign ? {
                          opacity: 1,
                          transform: 'scale(1.05)',
                        } : {},
                      }}
                    />
                  );
                })}
              </Box>

              {/* Row 3: Assign buttons (only show if not all editors assigned) */}
              {(() => {
                const assignedEditorNames = new Set(
                  detailScript.videos
                    .map((v) => videos.find((vid) => vid.id === v.id)?.editor.name)
                    .filter(Boolean)
                );
                const hasUnassignedEditors = editors.some((e) => !assignedEditorNames.has(e.label));
                const allUnassigned = assignedEditorNames.size === 0;

                if (!hasUnassignedEditors) return null;

                return (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    {allUnassigned && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={assigningScriptIds.has(detailScript.id) ? <CircularProgress size={14} color="inherit" /> : <PeopleIcon />}
                        onClick={() => handleSidebarAssign()}
                        disabled={assigningScriptIds.has(detailScript.id)}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Assign All
                      </Button>
                    )}
                    {editors
                      .filter((e) => !assignedEditorNames.has(e.label))
                      .map((editor) => (
                        <Button
                          key={editor.value}
                          size="small"
                          variant="outlined"
                          startIcon={<PersonIcon />}
                          onClick={() => handleSidebarAssign(editor.value)}
                          disabled={assigningScriptIds.has(detailScript.id)}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          {editor.label}
                        </Button>
                      ))}
                  </Box>
                );
              })()}

              {/* Row 4: +Hooks and +Scrollstoppers buttons */}
              {(onCreateHooks && extractScriptNumber) || (onRequestScrollstoppers && detailScript.videos.length > 0) ? (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
                  {onCreateHooks && extractScriptNumber && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setAddHooksDialogOpen(true)}
                    >
                      +Hooks
                    </Button>
                  )}
                  {onRequestScrollstoppers && detailScript.videos.length > 0 && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setScrollstopperDialogOpen(true)}
                    >
                      +Scrollstoppers
                    </Button>
                  )}
                </Box>
              ) : null}
            </DetailHeader>

            <DetailPanelBody>
              {/* Script Content - Collapsible and Editable with Edit/Save buttons */}
              <DetailSection label="">
                {/* Header row with label, expand toggle, and edit/save buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                  }}
                >
                  <Box
                    onClick={() => setIsScriptExpanded(!isScriptExpanded)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontSize: '0.65rem',
                        color: 'text.secondary',
                      }}
                    >
                      Script
                    </Typography>
                    <IconButton size="small" sx={{ p: 0.25, ml: 0.5 }}>
                      {isScriptExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Box>

                  {/* Edit/Save/Cancel buttons */}
                  {onScriptContentChange && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {isEditingScript ? (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleCancelEdit}
                            disabled={isSavingContent}
                            sx={{ minWidth: 'auto', px: 1.5, py: 0.25, fontSize: '0.75rem' }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={isSavingContent ? <CircularProgress size={12} color="inherit" /> : <SaveIcon sx={{ fontSize: 14 }} />}
                            onClick={handleSaveScript}
                            disabled={isSavingContent || !isScriptDirty}
                            sx={{ minWidth: 'auto', px: 1.5, py: 0.25, fontSize: '0.75rem' }}
                          >
                            {isSavingContent ? 'Saving...' : 'Save'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                          onClick={handleEditScript}
                          sx={{ minWidth: 'auto', px: 1.5, py: 0.25, fontSize: '0.75rem' }}
                        >
                          Edit
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>

                <Collapse in={isScriptExpanded}>
                  <TextField
                    multiline
                    minRows={8}
                    maxRows={20}
                    fullWidth
                    placeholder="Enter script content..."
                    value={scriptContentValue}
                    onChange={(e) => setScriptContentValue(e.target.value)}
                    disabled={!isEditingScript || isSavingContent}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: isEditingScript ? 'background.paper' : '#fafaf9',
                        fontSize: '0.85rem',
                        lineHeight: 1.65,
                        '& fieldset': {
                          borderColor: isEditingScript ? 'primary.main' : '#e7e5e4',
                        },
                        '&:hover fieldset': {
                          borderColor: isEditingScript ? 'primary.main' : '#d6d3d1',
                        },
                      },
                    }}
                  />
                </Collapse>
              </DetailSection>

              {/* Uploaded Videos */}
              {detailScript.uploadedVideos.length > 0 && (
                <DetailSection label={`Videos (${detailScript.uploadedVideos.length})`}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {detailScript.uploadedVideos.map((video) => (
                      <Paper key={video.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{video.name}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              {video.format && (
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                  {video.format}
                                </Typography>
                              )}
                              <StatusPill status={video.status} label={STATUS_LABELS[video.status as keyof typeof STATUS_LABELS]} />
                            </Box>
                          </Box>
                          {video.driveUrl && (
                            <Link
                              href={video.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </Link>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </DetailSection>
              )}
            </DetailPanelBody>
          </>
        )}
      </DetailPanel>

      {/* Video Detail Panel */}
      <VideoDetailPanel
        open={videoDetail.isOpen}
        video={videoDetail.detail}
        onClose={videoDetail.closeDetail}
        onStatusChange={onVideoStatusChange}
        onNotesChange={onVideoNotesChange}
        isUpdating={isUpdatingVideo}
      />

      {/* Add Hooks Dialog */}
      {detailScript && onCreateHooks && extractScriptNumber && getHooksForScript && (() => {
        const baseScriptNumber = extractScriptNumber(detailScript.name);
        if (baseScriptNumber === null) return null;

        // Convert ScriptItem to Script for the dialog
        const scriptForDialog: Script = {
          id: detailScript.id,
          name: detailScript.name,
          status: 'draft',
          product: {
            id: detailScript.productId,
            name: detailScript.productName,
          },
          author: detailScript.author
            ? { id: detailScript.authorId ?? '', name: detailScript.author }
            : undefined,
          content: detailScript.content,
          isApproved: false,
          needsRevision: false,
          createdAt: '',
        };

        const existingHooks = getHooksForScript(baseScriptNumber, detailScript.productId);

        return (
          <AddHooksDialog
            open={addHooksDialogOpen}
            onClose={() => setAddHooksDialogOpen(false)}
            script={scriptForDialog}
            existingHooks={existingHooks}
            onSubmit={onCreateHooks}
            isSubmitting={isCreatingHooks}
            baseScriptNumber={baseScriptNumber}
          />
        );
      })()}

      {/* Request Scrollstoppers Dialog */}
      {detailScript && onRequestScrollstoppers && (
        <RequestScrollstoppersDialog
          open={scrollstopperDialogOpen}
          onClose={() => setScrollstopperDialogOpen(false)}
          scriptId={detailScript.id}
          scriptName={detailScript.name}
          videos={videos}
          editors={editors}
          onSubmit={onRequestScrollstoppers}
          isSubmitting={assigningScriptIds.has(detailScript.id)}
        />
      )}

      {/* Assign Menu - dropdown for selecting editor */}
      <Menu
        anchorEl={assignMenuAnchor?.element}
        open={!!assignMenuAnchor}
        onClose={handleCloseAssignMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => handleAssignToEditor()}>
          <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>All Editors</ListItemText>
        </MenuItem>
        <Divider />
        {editors.map((editor) => (
          <MenuItem key={editor.value} onClick={() => handleAssignToEditor(editor.value)}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{editor.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {/* Floating Bulk Action Bar */}
      {onBulkAssign && (
        <Slide direction="up" in={list.hasSelection} mountOnEnter unmountOnExit>
          <Paper
            elevation={8}
            sx={{
              position: 'fixed',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1100,
              borderRadius: 2,
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <IconButton size="small" onClick={list.clearSelection}>
              <CloseIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" fontWeight={600}>
              {list.selection.size} script{list.selection.size !== 1 ? 's' : ''} selected
            </Typography>
            <Divider orientation="vertical" flexItem />
            <Button
              size="small"
              variant="contained"
              startIcon={<PeopleIcon />}
              endIcon={<KeyboardArrowDownIcon />}
              onClick={(e) => setBulkAssignMenuAnchor(e.currentTarget)}
            >
              Assign
            </Button>
          </Paper>
        </Slide>
      )}

      {/* Bulk Assign Editor Menu */}
      <Menu
        anchorEl={bulkAssignMenuAnchor}
        open={!!bulkAssignMenuAnchor}
        onClose={() => setBulkAssignMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MenuItem onClick={() => {
          onBulkAssign!(Array.from(list.selection));
          list.clearSelection();
          setBulkAssignMenuAnchor(null);
        }}>
          <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>All Editors</ListItemText>
        </MenuItem>
        <Divider />
        {editors.map((editor) => (
          <MenuItem key={editor.value} onClick={() => {
            onBulkAssign!(Array.from(list.selection), editor.value);
            list.clearSelection();
            setBulkAssignMenuAnchor(null);
          }}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{editor.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
