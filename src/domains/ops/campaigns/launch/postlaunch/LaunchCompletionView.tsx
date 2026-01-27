/**
 * LaunchCompletionView - Post-launch summary UI.
 *
 * Renders the completion states:
 * - Complete: Full success summary with stats and IDs
 * - Failed: Error message with back button
 * - Stopped: Stopped message with back button
 *
 * Pure presentational component - no hooks other than React,
 * no side effects, no imports from prelaunch/ or execution logic.
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { textMd, textSm, textXs, textBase, helperText, statNumber } from '../../../../../theme/typography';

// =============================================================================
// TYPES
// =============================================================================

interface MediaItemForDisplay {
  id: string;
  name: string;
  type: 'video' | 'image';
  adStatus: 'waiting' | 'creating' | 'created' | 'failed';
  adId?: string;
}

export type CompletionPhase = 'complete' | 'error' | 'stopped';

export interface LaunchCompletionViewProps {
  /** Which completion phase to render */
  phase: CompletionPhase;
  /** Campaign name for display */
  campaignName: string;
  /** Media items with ad status */
  mediaItems: MediaItemForDisplay[];
  /** Launch result data */
  launchResult?: {
    campaignId?: string;
    adSetId?: string;
    error?: string;
  } | null;
  /** Progress state data */
  progress?: {
    campaignId?: string | null;
    adsetId?: string | null;
    error?: string | null;
  } | null;
  /** URL to Ads Manager (for complete state) */
  adsManagerUrl?: string | null;
  /** Callback to navigate back */
  onBackToProduct?: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LaunchCompletionView({
  phase,
  campaignName,
  mediaItems,
  launchResult,
  progress,
  adsManagerUrl,
  onBackToProduct,
}: LaunchCompletionViewProps) {
  const adsCreatedCount = mediaItems.filter(m => m.adStatus === 'created').length;

  // -------------------------------------------------------------------------
  // STOPPED PHASE
  // -------------------------------------------------------------------------
  if (phase === 'stopped') {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography sx={{ ...textBase, color: 'warning.main', mb: 2 }}>
          Launch was stopped
        </Typography>
        {onBackToProduct && (
          <Button variant="outlined" onClick={onBackToProduct}>
            Back to Campaign
          </Button>
        )}
      </Box>
    );
  }

  // -------------------------------------------------------------------------
  // FAILED PHASE
  // -------------------------------------------------------------------------
  if (phase === 'error') {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography sx={{ ...textBase, color: 'error.main', mb: 2 }}>
          {launchResult?.error || progress?.error || 'An error occurred during launch'}
        </Typography>
        {onBackToProduct && (
          <Button variant="outlined" onClick={onBackToProduct}>
            Back to Campaign
          </Button>
        )}
      </Box>
    );
  }

  // -------------------------------------------------------------------------
  // COMPLETE PHASE
  // -------------------------------------------------------------------------
  return (
    <Box>
      <Typography sx={{ ...textMd, mb: 2, color: 'success.main' }}>
        {campaignName}
      </Typography>

      {/* Summary Stats */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
        <Box sx={{ flex: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography sx={{ ...statNumber, color: 'primary.main' }}>
            {adsCreatedCount}
          </Typography>
          <Typography sx={helperText}>
            Ads Created
          </Typography>
        </Box>
        <Box sx={{ flex: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography sx={statNumber}>
            {mediaItems.filter(m => m.type === 'video').length}
          </Typography>
          <Typography sx={helperText}>
            Videos
          </Typography>
        </Box>
        <Box sx={{ flex: 1, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography sx={statNumber}>
            {mediaItems.filter(m => m.type === 'image').length}
          </Typography>
          <Typography sx={helperText}>
            Images
          </Typography>
        </Box>
      </Box>

      {/* Campaign & Ad Set IDs */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ ...textSm, fontWeight: 600, mb: 1, color: 'text.secondary', display: 'block' }}>
          Facebook IDs
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {(launchResult?.campaignId || progress?.campaignId) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography sx={{ ...textMd, minWidth: 80 }}>Campaign</Typography>
              <Typography sx={{ ...textBase, fontFamily: 'monospace', flex: 1 }}>
                {launchResult?.campaignId || progress?.campaignId}
              </Typography>
            </Box>
          )}
          {(launchResult?.adSetId || progress?.adsetId) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography sx={{ ...textMd, minWidth: 80 }}>Ad Set</Typography>
              <Typography sx={{ ...textBase, fontFamily: 'monospace', flex: 1 }}>
                {launchResult?.adSetId || progress?.adsetId}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* All Ads Created */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ ...textSm, fontWeight: 600, mb: 1, color: 'text.secondary', display: 'block' }}>
          Ads Created ({adsCreatedCount})
        </Typography>
        <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
          {mediaItems.filter(m => m.adStatus === 'created').map(item => (
            <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 14, color: 'primary.main' }} />
              <Typography sx={{ ...textSm, flex: 1 }}>{item.name}</Typography>
              <Typography sx={{ ...textXs, color: 'text.secondary', fontFamily: 'monospace' }}>
                {item.type === 'video' ? '📹' : '🖼️'}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {onBackToProduct && (
          <Button variant="outlined" onClick={onBackToProduct}>
            Back to Product
          </Button>
        )}
        {adsManagerUrl && (
          <Button
            variant="contained"
            component={Link}
            href={adsManagerUrl}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
          >
            View in Ads Manager
          </Button>
        )}
      </Box>
    </Box>
  );
}
