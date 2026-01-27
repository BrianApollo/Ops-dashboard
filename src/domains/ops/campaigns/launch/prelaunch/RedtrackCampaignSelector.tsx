/**
 * RedtrackCampaignSelector - Searchable dropdown for selecting Redtrack campaigns.
 *
 * Displays pre-loaded campaigns in a searchable autocomplete.
 * Shows campaign names but stores/returns both the campaign ID and name.
 */

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { textSm, textXs, monoText } from '../../../../../theme/typography';
import type { CampaignOption } from '../../../../../features/redtrack';
import { createAutocompleteFilter } from '../../../../../utils';

// =============================================================================
// PROPS
// =============================================================================

interface RedtrackCampaignSelectorProps {
  /** Current campaign ID (hex string) */
  value: string;
  /** Pre-loaded list of campaigns */
  campaigns: CampaignOption[];
  /** Whether campaigns are still loading */
  campaignsLoading: boolean;
  /** Callback when campaign is selected - returns both ID and name */
  onSelect: (campaignId: string, campaignName: string) => void;
  /** Campaign name to display when not editing (from Airtable) */
  displayName?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function RedtrackCampaignSelector({
  value,
  campaigns,
  campaignsLoading,
  onSelect,
  displayName,
}: RedtrackCampaignSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignOption | null>(null);

  // Find current campaign in list (for initializing edit mode)
  const currentCampaign = useMemo(() => {
    if (!value) return null;
    return campaigns.find((c) => c.id === value) ?? null;
  }, [value, campaigns]);

  // Display value when not editing
  const displayValue = useMemo(() => {
    if (displayName) return displayName;
    if (currentCampaign) return currentCampaign.name;
    if (value) return value; // Show ID if name not known
    return '';
  }, [displayName, currentCampaign, value]);

  const handleStartEdit = () => {
    setSelectedCampaign(currentCampaign);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setSelectedCampaign(null);
    setIsEditing(false);
  };

  const handleSelect = () => {
    if (!selectedCampaign) return;
    onSelect(selectedCampaign.id, selectedCampaign.name);
    setIsEditing(false);
  };

  // ==========================================================================
  // EDITING MODE
  // ==========================================================================

  if (isEditing) {
    return (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <Autocomplete
          value={selectedCampaign}
          onChange={(_, newValue) => setSelectedCampaign(newValue)}
          options={campaigns}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, val) => option.id === val.id}
          filterOptions={createAutocompleteFilter((c: CampaignOption) => c.name)}
          loading={campaignsLoading}
          size="small"
          fullWidth
          autoHighlight
          openOnFocus
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search campaigns..."
              autoFocus
              sx={{ '& .MuiInputBase-input': textSm }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {campaignsLoading ? (
                      <CircularProgress color="inherit" size={18} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            return (
              <Box
                component="li"
                key={option.id}
                {...rest}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important' }}
              >
                <Typography sx={textSm}>{option.name}</Typography>
                <Typography sx={{ ...textXs, color: 'text.secondary' }}>
                  {option.id}
                </Typography>
              </Box>
            );
          }}
          noOptionsText={
            campaignsLoading
              ? 'Loading campaigns...'
              : 'No campaigns found'
          }
          sx={{ flex: 1 }}
        />
        <IconButton
          size="small"
          onClick={handleSelect}
          disabled={!selectedCampaign}
          color="primary"
        >
          <CheckIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={handleCancel}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  // ==========================================================================
  // DISPLAY MODE
  // ==========================================================================

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        minHeight: 40,
      }}
    >
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {displayValue ? (
          <>
            <Typography sx={textSm}>{displayValue}</Typography>
            {value && (
              <Typography sx={monoText}>
                {value}
              </Typography>
            )}
          </>
        ) : (
          <Typography sx={{ ...textSm, color: 'text.disabled' }}>
            Not set
          </Typography>
        )}
      </Box>
      <IconButton size="small" onClick={handleStartEdit} sx={{ color: 'primary.main' }}>
        <EditIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
