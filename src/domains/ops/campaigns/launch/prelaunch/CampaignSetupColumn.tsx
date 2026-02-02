/**
 * CampaignSetupColumn - CENTER column for Campaign Launch.
 * Campaign identity, ad preset, infrastructure, delivery, URL/tracking.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { FormField } from '../../../../../core/form';
import { StatusPill } from '../../../../../ui';
import { textMd, textSm, textXs, helperText } from '../../../../../theme/typography';
import { RedtrackCampaignSelector } from './RedtrackCampaignSelector';
import type { CampaignDraft, InfraOption } from '../types';
import type { RedTrackCampaignDetails, CampaignOption } from '../../../../../features/redtrack';

// =============================================================================
// AD PRESET TYPE (from ad-presets feature)
// =============================================================================

interface AdPresetOption {
  id: string;
  name: string;
  primaryTexts: string[];
  headlines: string[];
  descriptions: string[];
  callToAction: string;
  beneficiaryName: string;
  payerName: string;
}

// =============================================================================
// PROPS
// =============================================================================

interface CampaignSetupColumnProps {
  draft: CampaignDraft;
  onDraftChange: (updates: Partial<CampaignDraft>) => void;
  adPresets: AdPresetOption[];
  adAccounts: InfraOption[];
  pages: InfraOption[];
  pixels: InfraOption[];
  /** Redtrack campaign data (for display name fallback) */
  redtrackData: RedTrackCampaignDetails | null;
  /** Pre-loaded list of Redtrack campaigns for selector */
  redtrackCampaigns: CampaignOption[];
  /** Whether Redtrack campaigns are loading */
  redtrackCampaignsLoading: boolean;
  /** Whether Website URL was auto-populated from Redtrack */
  websiteUrlFromRedtrack: boolean;
  /** Error message for pixels fetch */
  pixelsError?: string | null;
  /** Error message for pages fetch */
  pagesError?: string | null;
  /** Whether pixels are loading */
  pixelsLoading?: boolean;
  /** Whether pages are loading */
  pagesLoading?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CampaignSetupColumn({
  draft,
  onDraftChange,
  adPresets,
  adAccounts,
  pages,
  pixels,
  redtrackData,
  redtrackCampaigns,
  redtrackCampaignsLoading,
  websiteUrlFromRedtrack,
  pixelsError,
  pagesError,
  pixelsLoading,
  pagesLoading,
}: CampaignSetupColumnProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(draft.name);
  const [presetExpanded, setPresetExpanded] = useState(false);
  const [urlExpanded, setUrlExpanded] = useState(false);
  const selectedPreset = adPresets.find((p) => p.id === draft.adPresetId);

  const handleSaveName = () => {
    onDraftChange({ name: editedName });
    setIsEditingName(false);
  };

  const handleCancelName = () => {
    setEditedName(draft.name);
    setIsEditingName(false);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header with Ad Account Selector */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography sx={textMd}>
            Campaign Settings
          </Typography>
        </Box>
        <Select
          value={draft.adAccountId && adAccounts.some((acc) => acc.id === draft.adAccountId) ? draft.adAccountId : ''}
          onChange={(e) => onDraftChange({ adAccountId: e.target.value || null })}
          size="small"
          displayEmpty
          sx={{
            minWidth: 180,
            '& .MuiSelect-select': {
              ...textSm,
              py: 0.75,
            },
          }}
        >
          <MenuItem value="">Select ad account...</MenuItem>
          {adAccounts.map((acc) => (
            <MenuItem key={acc.id} value={acc.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={textSm}>{acc.name}</Typography>
                <StatusPill status={acc.status} />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Campaign Name */}
        <FormField label="Campaign Name" noMargin>
          {isEditingName ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                size="small"
                fullWidth
                autoFocus
                sx={{ '& .MuiInputBase-input': textSm }}
              />
              <IconButton
                size="small"
                onClick={handleSaveName}
                disabled={!editedName.trim()}
                color="primary"
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleCancelName}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <TextField
              value={draft.name}
              size="small"
              fullWidth
              disabled
              sx={{ '& .MuiInputBase-input': textSm }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setEditedName(draft.name); setIsEditingName(true); }} sx={{ color: 'primary.main' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}
        </FormField>

        {/* Redtrack Campaign */}
        <FormField label="Redtrack Campaign" noMargin>
          <RedtrackCampaignSelector
            value={draft.redtrackCampaignId}
            campaigns={redtrackCampaigns}
            campaignsLoading={redtrackCampaignsLoading}
            onSelect={(id, name) => onDraftChange({ redtrackCampaignId: id, redtrackCampaignName: name })}
            displayName={draft.redtrackCampaignName || redtrackData?.campaign?.title}
          />
        </FormField>

        {/* Pixel & Page on same row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <FormField label="Pixel" noMargin>
            <InfraSelect
              value={draft.pixelId}
              onChange={(v) => onDraftChange({ pixelId: v })}
              options={pixels}
              placeholder="Select a pixel..."
              disabled={!draft.adAccountId}
              error={pixelsError}
              loading={pixelsLoading}
            />
          </FormField>

          <FormField label="Page" noMargin>
            <InfraSelect
              value={draft.pageId}
              onChange={(v) => onDraftChange({ pageId: v })}
              options={pages}
              placeholder="Select a page..."
              disabled={!draft.adAccountId}
              error={pagesError}
              loading={pagesLoading}
            />
          </FormField>
        </Box>

        {/* Start Date & Budget */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <FormField label="Start Date & Time (GMT+7)" noMargin>
            <Box
              sx={(theme) => ({
                display: 'flex',
                width: '100%',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px',
                overflow: 'hidden',
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                },
                '&:focus-within': {
                  borderColor: 'primary.main',
                  borderWidth: 2,
                },
              })}
            >
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => onDraftChange({ startDate: e.target.value })}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  outline: 'none',
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  fontFamily: 'inherit',
                  background: 'transparent',
                  color: 'inherit',
                }}
              />
              <input
                type="time"
                value={draft.startTime || '00:00'}
                onChange={(e) => onDraftChange({ startTime: e.target.value })}
                style={{
                  width: '90px',
                  border: 'none',
                  outline: 'none',
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  fontFamily: 'inherit',
                  background: 'transparent',
                  color: 'inherit',
                }}
              />
            </Box>
          </FormField>

          <FormField label="Daily Budget (USD)" noMargin>
            <TextField
              type="number"
              value={draft.budget}
              onChange={(e) => onDraftChange({ budget: e.target.value })}
              size="small"
              fullWidth
              placeholder="50"
              sx={{ '& .MuiInputBase-input': textSm }}
            />
          </FormField>
        </Box>

        {/* Location & CTA */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <FormField label="Location Targeting" noMargin>
            <Select
              value={draft.geo}
              onChange={(e) => onDraftChange({ geo: e.target.value })}
              size="small"
              fullWidth
              displayEmpty
              sx={{ '& .MuiSelect-select': textSm }}
            >
              <MenuItem value="">Select location...</MenuItem>
              <MenuItem value="US">US</MenuItem>
              <MenuItem value="US,CA">US + Canada</MenuItem>
              <MenuItem value="US,CA,GB,IE,AU,NZ">US, CA, UK, IE, AU, NZ</MenuItem>
            </Select>
          </FormField>

          <FormField label="Call to Action" noMargin>
            <Select
              value={draft.ctaOverride}
              onChange={(e) => onDraftChange({ ctaOverride: e.target.value })}
              size="small"
              fullWidth
              displayEmpty
              sx={{ '& .MuiSelect-select': textSm }}
            >
              <MenuItem value="">Use preset CTA</MenuItem>
              <MenuItem value="Learn More">Learn More</MenuItem>
              <MenuItem value="Shop Now">Shop Now</MenuItem>
            </Select>
          </FormField>
        </Box>

        {/* Ad Preset */}
        <Box>
          <SectionHeader
            title="Ad Preset"
            expanded={presetExpanded}
            onToggle={() => setPresetExpanded(!presetExpanded)}
            hasContent={!!selectedPreset}
            dotColor={
              [...draft.primaryTexts, ...draft.headlines, ...draft.descriptions].some((t) =>
                t.includes('{{link}}')
              )
                ? 'primary.main'
                : 'success.main'
            }
          />
          <Select
            value={draft.adPresetId && adPresets.some((p) => p.id === draft.adPresetId) ? draft.adPresetId : ''}
            onChange={(e) => onDraftChange({ adPresetId: e.target.value || null })}
            size="small"
            fullWidth
            displayEmpty
            sx={{ '& .MuiSelect-select': textSm }}
          >
            <MenuItem value="">Select a preset...</MenuItem>
            {adPresets.map((preset) => (
              <MenuItem key={preset.id} value={preset.id}>
                {preset.name}
              </MenuItem>
            ))}
          </Select>
          {(() => {
            const textsHaveLink = [...draft.primaryTexts, ...draft.headlines, ...draft.descriptions].some(t => t.includes('{{link}}'));
            const presetHadLink = selectedPreset && [...selectedPreset.primaryTexts, ...selectedPreset.headlines, ...selectedPreset.descriptions].some(t => t.includes('{{link}}'));
            if (textsHaveLink) {
              return <Chip label="{{link}} not replaced" color="warning" size="small" sx={{ mt: 1 }} />;
            }
            if (draft.linkVariable && presetHadLink) {
              return <Chip label="{{link}} replaced" color="success" size="small" sx={{ mt: 1 }} />;
            }
            return null;
          })()}

          <Collapse in={presetExpanded && !!selectedPreset}>
            {selectedPreset && (
              <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <EditableCreativeSection
                  draft={draft}
                  onDraftChange={onDraftChange}
                  preset={selectedPreset}
                />
              </Box>
            )}
          </Collapse>
        </Box>

        {/* Website URL */}
        <Box sx={{ position: 'relative' }}>
          {websiteUrlFromRedtrack && (
            <Chip size="small" label="From Redtrack" color="info" sx={{ position: 'absolute', top: 0, right: 0, height: 18, ...textXs }} />
          )}
          <FormField label="Website URL" noMargin>
            <TextField
              value={draft.websiteUrl}
              onChange={(e) => onDraftChange({ websiteUrl: e.target.value })}
              size="small"
              fullWidth
              placeholder="https://example.com/landing"
              sx={{ '& .MuiInputBase-input': textSm }}
            />
          </FormField>
        </Box>

        {/* Tracking Parameters */}
        <Box sx={{ position: 'relative' }}>
          {websiteUrlFromRedtrack && draft.utms && (
            <Chip size="small" label="From Redtrack" color="info" sx={{ position: 'absolute', top: 0, right: 0, height: 18, ...textXs }} />
          )}
          <FormField label="Tracking Parameters" noMargin>
            <TextField
              value={draft.utms}
              onChange={(e) => onDraftChange({ utms: e.target.value })}
              size="small"
              fullWidth
              placeholder="cmpid=...&sub1={{ad.id}}&utm_source=facebook&utm_medium=paid"
              sx={{ '& .MuiInputBase-input': textSm }}
            />
          </FormField>
        </Box>

        {/* Display Link (Collapsed) */}
        <Box>
          <SectionHeader
            title="Display Link"
            expanded={urlExpanded}
            onToggle={() => setUrlExpanded(!urlExpanded)}
            subtitle="(optional)"
          />

          <Collapse in={urlExpanded}>
            <Box sx={{ mt: 1 }}>
              <FormField label="Display Link" noMargin>
                <TextField
                  value={draft.displayLink ?? ''}
                  onChange={(e) => onDraftChange({ displayLink: e.target.value })}
                  size="small"
                  fullWidth
                  placeholder="example.com"
                  sx={{ '& .MuiInputBase-input': textSm }}
                />
              </FormField>
              <Typography sx={helperText}>
                Shortened URL shown in the ad (e.g., example.com instead of full URL)
              </Typography>
            </Box>
          </Collapse>
        </Box>
      </Box>
    </Paper>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SectionHeaderProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  hasContent?: boolean;
  subtitle?: string;
  dotColor?: string;
}

function SectionHeader({ title, expanded, onToggle, hasContent, subtitle, dotColor = 'primary.main' }: SectionHeaderProps) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        mb: 1,
        cursor: 'pointer',
        '&:hover': { opacity: 0.8 },
      }}
    >
      {expanded ? (
        <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
      ) : (
        <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
      )}
      <Typography sx={{ ...textSm, color: 'text.secondary' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ ...textSm, color: 'text.disabled', ml: 0.5 }}>
          {subtitle}
        </Typography>
      )}
      {hasContent && (
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: dotColor,
            ml: 0.5,
          }}
        />
      )}
    </Box>
  );
}

interface InfraSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: InfraOption[];
  placeholder: string;
  disabled?: boolean;
  error?: string | null;
  loading?: boolean;
}

function InfraSelect({ value, onChange, options, placeholder, disabled, error, loading }: InfraSelectProps) {
  // Determine display text based on state
  const getPlaceholderText = () => {
    if (loading) return 'Loading...';
    if (disabled) return placeholder;
    if (options.length === 0) return 'No options available';
    return placeholder;
  };

  // Only use value if it exists in options, otherwise use empty string
  const validValue = value && options.some((opt) => opt.id === value) ? value : '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Select
        value={validValue}
        onChange={(e) => onChange(e.target.value || null)}
        size="small"
        fullWidth
        displayEmpty
        disabled={disabled || loading}
        error={!!error}
        sx={{ '& .MuiSelect-select': textSm }}
      >
        <MenuItem value="">{getPlaceholderText()}</MenuItem>
        {options.map((opt) => (
          <MenuItem key={opt.id} value={opt.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography sx={{ ...textSm, flex: 1 }}>
                {opt.name}
              </Typography>
              <StatusPill status={opt.status} sx={{ height: 18, '& .MuiChip-label': { px: 1 } }} />
            </Box>
          </MenuItem>
        ))}
      </Select>
      {error && (
        <Typography sx={{ ...textSm, color: 'error.main' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

interface EditableCreativeSectionProps {
  draft: CampaignDraft;
  onDraftChange: (updates: Partial<CampaignDraft>) => void;
  preset: AdPresetOption;
}

function EditableCreativeSection({ draft, onDraftChange, preset }: EditableCreativeSectionProps) {
  const updateArray = (field: 'primaryTexts' | 'headlines' | 'descriptions', index: number, value: string) => {
    const newArray = [...draft[field]];
    newArray[index] = value;
    onDraftChange({ [field]: newArray });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {draft.primaryTexts.length > 0 && (
        <EditableFieldGroup
          label={`Primary Text (${draft.primaryTexts.length})`}
          values={draft.primaryTexts}
          onChange={(i, v) => updateArray('primaryTexts', i, v)}
          multiline
        />
      )}
      {draft.headlines.length > 0 && (
        <EditableFieldGroup
          label={`Headlines (${draft.headlines.length})`}
          values={draft.headlines}
          onChange={(i, v) => updateArray('headlines', i, v)}
        />
      )}
      {draft.descriptions.length > 0 && (
        <EditableFieldGroup
          label={`Descriptions (${draft.descriptions.length})`}
          values={draft.descriptions}
          onChange={(i, v) => updateArray('descriptions', i, v)}
        />
      )}
      {preset.callToAction && (
        <Box>
          <Typography sx={{ ...textSm, display: 'block', mb: 0.5, color: 'text.secondary' }}>
            Call to Action
          </Typography>
          <Typography sx={textSm}>{preset.callToAction}</Typography>
        </Box>
      )}
      {(preset.beneficiaryName || preset.payerName) && (
        <Box>
          <Typography sx={{ ...textSm, display: 'block', mb: 0.5, color: 'text.secondary' }}>
            Compliance
          </Typography>
          {preset.beneficiaryName && (
            <Typography sx={textSm}>Beneficiary: {preset.beneficiaryName}</Typography>
          )}
          {preset.payerName && (
            <Typography sx={textSm}>Payer: {preset.payerName}</Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

interface EditableFieldGroupProps {
  label: string;
  values: string[];
  onChange: (index: number, value: string) => void;
  multiline?: boolean;
}

function EditableFieldGroup({ label, values, onChange, multiline }: EditableFieldGroupProps) {
  return (
    <Box>
      <Typography sx={{ ...textSm, display: 'block', mb: 0.5, color: 'text.secondary' }}>
        {label}
      </Typography>
      {values.map((v, i) => (
        <Box key={i} sx={{ mb: 1 }}>
          <TextField
            value={v}
            onChange={(e) => onChange(i, e.target.value)}
            size="small"
            fullWidth
            multiline={multiline}
            minRows={multiline ? 2 : 1}
            placeholder={`Variation ${i + 1}`}
            sx={{ '& .MuiInputBase-input': textSm }}
            InputProps={{
              startAdornment: (
                <Typography sx={{ ...textSm, color: 'text.secondary', mr: 1, userSelect: 'none' }}>
                  {i + 1}
                </Typography>
              ),
            }}
          />
        </Box>
      ))}
    </Box>
  );
}
