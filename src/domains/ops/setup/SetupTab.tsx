/**
 * SetupTab - Product assets and ad presets management.
 * Uses inline expansion for preset editing instead of sidebar.
 * Controller logic extracted to usePresetController.
 */

import { useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Collapse from '@mui/material/Collapse';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { EmptyState } from '../../../core/state';
import { StatusPill } from '../../../ui';
import { usePresetController } from '../products/hooks';
import type { AdPresetUpdatePayload, AdPreset } from '../../../features/ad-presets';
import type { AdPresetItem, ProductInfo, ProductAssetInfo } from '../products/composition/types';
import {
  formLabelSx,
  sectionLabelSx,
  cardExpandedSx,
  cardExpandedContentSx,
  textFieldViewModeSx,
  textFieldEditModeSx,
} from '../products/composition/styles';

interface SetupTabProps {
  presets: AdPresetItem[];
  showProductColumn: boolean;
  selectedProduct: ProductInfo | null;
  onSave: (id: string, payload: AdPresetUpdatePayload) => Promise<void>;
  onCreatePreset: (productId: string) => Promise<AdPreset>;
  onDuplicatePreset: (presetId: string) => Promise<void>;
  onUploadAsset: (productId: string, file: File, assetType: 'image' | 'logo') => Promise<void>;
  onDeleteAsset: (productId: string, assetId: string, driveFileId: string | undefined, assetType: 'image' | 'logo') => Promise<void>;
  isSaving: boolean;
  isCreating: boolean;
  isUploading: boolean;
  isDeleting: boolean;
  uploadProgress: number;
}

export function SetupTab({
  presets,
  showProductColumn,
  selectedProduct,
  onSave,
  onCreatePreset,
  onDuplicatePreset,
  onUploadAsset,
  onDeleteAsset,
  isSaving,
  isCreating,
  isUploading,
  isDeleting,
  uploadProgress,
}: SetupTabProps) {
  // Preset editing controller
  const presetController = usePresetController({
    presets,
    onSave,
    onCreatePreset,
    selectedProductId: selectedProduct?.id ?? null,
  });

  // File input refs for upload
  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  /** Handle file upload */
  const handleFileChange = async (assetType: 'image' | 'logo', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProduct) return;

    await onUploadAsset(selectedProduct.id, file, assetType);

    // Reset input
    event.target.value = '';
  };

  /** Handle asset deletion */
  const handleDeleteAsset = async (asset: ProductAssetInfo, assetType: 'image' | 'logo') => {
    if (!selectedProduct) return;
    await onDeleteAsset(selectedProduct.id, asset.id, asset.driveFileId, assetType);
  };

  /** Render asset grid for images or logos */
  const renderAssetGrid = (assets: ProductAssetInfo[], assetType: 'image' | 'logo', label: string) => {
    const inputRef = assetType === 'image' ? imageInputRef : logoInputRef;
    const isOperating = isUploading || isDeleting;

    return (
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {label} ({assets.length})
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {assets.map((asset) => (
            <Box
              key={asset.id}
              sx={{
                position: 'relative',
                width: 80,
                height: 80,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover .delete-btn': { opacity: 1 },
              }}
            >
              <Box
                component="img"
                src={asset.url}
                alt={asset.filename}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: assetType === 'logo' ? 'contain' : 'cover',
                  bgcolor: 'grey.100',
                }}
              />
              <IconButton
                className="delete-btn"
                size="small"
                onClick={() => handleDeleteAsset(asset, assetType)}
                disabled={isOperating}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  bgcolor: 'rgba(255,255,255,0.9)',
                  '&:hover': { bgcolor: 'error.light', color: 'white' },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          {/* Add button */}
          <Box
            onClick={() => !isOperating && inputRef.current?.click()}
            sx={{
              width: 80,
              height: 80,
              borderRadius: 1,
              border: '2px dashed',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isOperating ? 'not-allowed' : 'pointer',
              opacity: isOperating ? 0.5 : 1,
              '&:hover': { borderColor: isOperating ? 'divider' : 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            <AddIcon color="action" />
          </Box>
        </Box>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(assetType, e)}
        />
      </Box>
    );
  };

  /** Render text column for Primary Texts, Headlines, or Descriptions */
  const renderTextColumn = (
    label: string,
    field: 'primaryTexts' | 'headlines' | 'descriptions',
    multiline: boolean = false
  ) => {
    if (!presetController.draft) return null;
    const items = presetController.draft[field];

    return (
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ ...formLabelSx, mb: 1 }}
        >
          {label} ({items.length}/5)
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {items.map((text, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 0.5 }}>
              <TextField
                placeholder={`${label.replace(' (1-5)', '')} ${i + 1}`}
                value={text}
                onChange={(e) => presetController.updateDraftArrayField(field, i, e.target.value)}
                fullWidth
                size="small"
                multiline={multiline}
                minRows={multiline ? 3 : 1}
                maxRows={multiline ? 8 : 1}
                disabled={!presetController.isEditing || isSaving}
                sx={presetController.isEditing ? textFieldEditModeSx : textFieldViewModeSx}
              />
              {presetController.isEditing && items.length > 1 && (
                <IconButton
                  size="small"
                  onClick={() => presetController.removeDraftArrayField(field, i)}
                  disabled={isSaving}
                  sx={{ flexShrink: 0 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          {presetController.isEditing && items.length < 5 && (
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => presetController.addDraftArrayField(field)}
              disabled={isSaving}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add
            </Button>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Product Assets Section */}
      {selectedProduct && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={sectionLabelSx}
          >
            Product Assets
          </Typography>

          {/* Upload Progress */}
          {isUploading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Uploading... {uploadProgress}%
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 4 }}>
            {renderAssetGrid(selectedProduct.images, 'image', 'Product Images')}
            {renderAssetGrid(selectedProduct.logos, 'logo', 'Product Logos')}
          </Box>
        </Paper>
      )}

      {/* Ad Presets Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ ...sectionLabelSx, display: 'inline', mb: 0 }}
        >
          Ad Presets ({presets.length})
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={isCreating ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
          onClick={presetController.handleCreatePreset}
          disabled={!selectedProduct || isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Preset'}
        </Button>
      </Box>

      {/* Ad Presets List with Inline Expansion */}
      {presets.length === 0 ? (
        <EmptyState variant="filter" />
      ) : (
        <Box>
          {presets.map((p) => {
            const isExpanded = presetController.expandedPresetId === p.id;

            return (
              <Paper
                key={p.id}
                variant="outlined"
                sx={{
                  mb: 1,
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                  ...(isExpanded && cardExpandedSx),
                }}
              >
                {/* Preset Header Row - Always Visible */}
                <Box
                  onClick={() => presetController.handlePresetClick(p)}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isExpanded ? (
                      <ExpandLessIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    )}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        {showProductColumn && (
                          <Typography variant="caption" color="text.secondary">{p.productName}</Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {p.primaryTexts.length} texts
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.headlines.length} headlines
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.descriptions.length} descriptions
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePreset(p.id);
                      }}
                      disabled={isCreating}
                      title="Duplicate Preset"
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <StatusPill status={p.status} />
                  </Box>
                </Box>

                {/* Expanded Content */}
                <Collapse in={isExpanded}>
                  <Box
                    sx={cardExpandedContentSx}
                  >
                    {presetController.draft && (
                      <>
                        {/* Action Row */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
                          {presetController.isEditing ? (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={presetController.handleCancelEdit}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                                onClick={presetController.handleSave}
                                disabled={isSaving || !presetController.isDirty}
                              >
                                {isSaving ? 'Saving...' : 'Save'}
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={presetController.handleEdit}
                            >
                              Edit
                            </Button>
                          )}
                        </Box>

                        {/* Row 1: Preset Name, Beneficiary, Payer */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={formLabelSx}
                            >
                              Preset Name
                            </Typography>
                            <TextField
                              value={presetController.draft.name}
                              onChange={(e) => presetController.updateDraftField('name', e.target.value)}
                              fullWidth
                              size="small"
                              disabled={!presetController.isEditing || isSaving}
                              sx={{
                                '& .MuiInputBase-root': {
                                  bgcolor: presetController.isEditing ? 'background.paper' : 'grey.100',
                                },
                              }}
                            />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={formLabelSx}
                            >
                              Beneficiary Name (EU)
                            </Typography>
                            <TextField
                              value={presetController.draft.beneficiaryName}
                              onChange={(e) => presetController.updateDraftField('beneficiaryName', e.target.value)}
                              fullWidth
                              size="small"
                              disabled={!presetController.isEditing || isSaving}
                              sx={{
                                '& .MuiInputBase-root': {
                                  bgcolor: presetController.isEditing ? 'background.paper' : 'grey.100',
                                },
                              }}
                            />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={formLabelSx}
                            >
                              Payer Name (EU)
                            </Typography>
                            <TextField
                              value={presetController.draft.payerName}
                              onChange={(e) => presetController.updateDraftField('payerName', e.target.value)}
                              fullWidth
                              size="small"
                              disabled={!presetController.isEditing || isSaving}
                              sx={{
                                '& .MuiInputBase-root': {
                                  bgcolor: presetController.isEditing ? 'background.paper' : 'grey.100',
                                },
                              }}
                            />
                          </Box>
                        </Box>

                        {/* Row 2: Three columns for text arrays */}
                        <Box sx={{ display: 'flex', gap: 3 }}>
                          {renderTextColumn('Primary Texts (1-5)', 'primaryTexts', true)}
                          {renderTextColumn('Headlines (1-5)', 'headlines', false)}
                          {renderTextColumn('Descriptions (1-5)', 'descriptions', false)}
                        </Box>
                      </>
                    )}
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
