/**
 * FinalCheckColumn - RIGHT column for Campaign Launch.
 * Readiness checklist, preview media, and launch action.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { textMd, textSm, textXs, helperText } from '../../../../theme/typography';
import type { ValidationGroup, SelectableVideo, SelectableImage } from './types';
import type { RedTrackCampaignDetails } from '../../../../features/redtrack';

// =============================================================================
// PROPS
// =============================================================================

interface FinalCheckColumnProps {
  validationGroups: ValidationGroup[];
  onLaunch: () => Promise<void>;
  isLaunching: boolean;
  allChecksPass: boolean;
  selectedVideos: SelectableVideo[];
  selectedImages: SelectableImage[];
  /** Redtrack campaign data for preview */
  redtrackData: RedTrackCampaignDetails | null;
  /** Whether Redtrack data is loading */
  redtrackLoading: boolean;
  /** Result of the launch operation */
  launchResult: {
    campaignId?: string;
    adSetId?: string;
    error?: string;
  } | null;
  /** Media progress counts */
  mediaCounts: {
    videos: { total: number; uploaded: number; ready: number };
    images: { total: number; uploaded: number; ready: number };
  };
  launchStatusActive: boolean;
  onToggleLaunchStatusActive: () => void;
  /** Simplified mode: hide readiness checklist and progress, show only launch action */
  simplified?: boolean;
  /** Whether data was prefilled from Redtrack */
  websiteUrlFromRedtrack?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FinalCheckColumn({
  validationGroups,
  onLaunch,
  isLaunching,
  allChecksPass,
  selectedVideos,
  selectedImages,
  redtrackData,
  redtrackLoading,
  launchResult,
  mediaCounts,
  launchStatusActive,
  onToggleLaunchStatusActive,
  simplified = false,
  websiteUrlFromRedtrack = false,
}: FinalCheckColumnProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [redtrackOpen, setRedtrackOpen] = useState(websiteUrlFromRedtrack);
  const [checklistOpen, setChecklistOpen] = useState(true);
  const totalSelected = selectedVideos.length + selectedImages.length;
  const hasRedtrackData = redtrackData && (redtrackData.landers.length > 0 || redtrackData.offers.length > 0);

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
      {/* Header */}
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
          <FactCheckIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography sx={textMd}>
            Preview
          </Typography>
        </Box>
        {!allChecksPass && (
          <Typography sx={{ ...textSm, color: 'error.main' }}>
            Fix validation errors
          </Typography>
        )}
      </Box>

      {/* Content - Hidden in simplified mode */}
      {!simplified && (
        <Box sx={{ p: 2.5 }}>
          {/* Launch Result */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ ...textXs, display: 'block', mb: 1, color: 'text.secondary' }}>
              Result
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Campaign Result */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography sx={{ ...textSm, minWidth: 80 }}>
                  Campaign
                </Typography>
                {launchResult?.campaignId ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                    <Typography sx={{ ...textSm, fontWeight: 600 }}>
                      Created (ID: {launchResult.campaignId})
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid currentColor' }} />
                    <Typography sx={textSm}>
                      Pending
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Ad Set Result */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography sx={{ ...textSm, minWidth: 80 }}>
                  Ad Set
                </Typography>
                {launchResult?.adSetId ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                    <CheckCircleIcon sx={{ fontSize: 16 }} />
                    <Typography sx={{ ...textSm, fontWeight: 600 }}>
                      Created (ID: {launchResult.adSetId})
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid currentColor' }} />
                    <Typography sx={textSm}>
                      Pending
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Media Progress */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ ...textXs, display: 'block', mb: 1, color: 'text.secondary' }}>
              Media
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Videos */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VideoLibraryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Box>
                    <Typography sx={textSm}>
                      Videos
                    </Typography>
                    <Typography sx={helperText}>
                      Uploaded: {mediaCounts.videos.uploaded}/{mediaCounts.videos.total}
                    </Typography>
                  </Box>
                </Box>
                <Typography sx={{ ...textSm, fontWeight: 600, color: mediaCounts.videos.total > 0 && mediaCounts.videos.ready === mediaCounts.videos.total ? 'success.main' : 'text.primary' }}>
                  Ads: {mediaCounts.videos.ready}/{mediaCounts.videos.total}
                </Typography>
              </Box>

              {/* Images */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ImageIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Box>
                    <Typography sx={textSm}>
                      Images
                    </Typography>
                    <Typography sx={helperText}>
                      Processed: {mediaCounts.images.uploaded}/{mediaCounts.images.total}
                    </Typography>
                  </Box>
                </Box>
                <Typography sx={{ ...textSm, fontWeight: 600, color: mediaCounts.images.total > 0 && mediaCounts.images.ready === mediaCounts.images.total ? 'success.main' : 'text.primary' }}>
                  Ads: {mediaCounts.images.ready}/{mediaCounts.images.total}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Checklist */}
          <Box>
            <Typography sx={textSm}>
              Checklist
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {validationGroups.map((group) => (
                <ValidationGroupSection key={group.name} group={group} />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Checklist - Collapsible in simplified mode */}
      {simplified && (
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            onClick={() => setChecklistOpen(!checklistOpen)}
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {checklistOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              <Typography sx={textSm}>
                Checklist
              </Typography>
            </Box>
            {allChecksPass ? (
              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
            ) : (
              <ErrorIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            )}
          </Box>

          <Collapse in={checklistOpen}>
            <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {validationGroups.map((group) => (
                <ValidationGroupSection key={group.name} group={group} />
              ))}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Preview Media - Collapsible */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          onClick={() => setPreviewOpen(!previewOpen)}
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {previewOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            <Typography sx={textSm}>
              {selectedVideos.length} Video{selectedVideos.length !== 1 ? 's' : ''}
              {selectedImages.length > 0 && `, ${selectedImages.length} Image${selectedImages.length !== 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Box>

        <Collapse in={previewOpen}>
          <Box sx={{ px: 2, pb: 2 }}>
            {totalSelected === 0 ? (
              <Typography sx={helperText}>
                Add videos or images above
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {selectedVideos.map((v) => (
                  <Box
                    key={v.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                      <VideoLibraryIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                      <Typography sx={{ ...textSm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</Typography>
                    </Box>
                    {v.creativeLink && (
                      <Link
                        href={v.creativeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'flex', ml: 1, flexShrink: 0 }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </Link>
                    )}
                  </Box>
                ))}
                {selectedImages.map((i) => (
                  <Box
                    key={i.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                      <ImageIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
                      <Typography sx={{ ...textSm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</Typography>
                    </Box>
                    {(i.image_url || i.image_drive_link) && (
                      <Link
                        href={i.image_url || i.image_drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'flex', ml: 1, flexShrink: 0 }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </Link>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Redtrack Data - Collapsible */}
      {(hasRedtrackData || redtrackLoading) && (
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            onClick={() => setRedtrackOpen(!redtrackOpen)}
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {redtrackOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              <Typography sx={textSm}>
                Redtrack Data
              </Typography>
              {redtrackLoading && <CircularProgress size={14} />}
            </Box>
          </Box>

          <Collapse in={redtrackOpen}>
            <Box sx={{ px: 2, pb: 2 }}>
              {redtrackData && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {/* Landers */}
                  {redtrackData.landers.length > 0 && (
                    <Box>
                      <Typography sx={{ ...textXs, display: 'block', mb: 0.5, color: 'text.secondary' }}>
                        Lander
                      </Typography>
                      {redtrackData.landers.map((lander) => (
                        <Box
                          key={lander.id}
                          sx={{
                            p: 1,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography sx={{ ...textSm, fontWeight: 500 }}>{lander.title}</Typography>
                          <Link
                            href={lander.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ ...textXs, wordBreak: 'break-all', display: 'block' }}
                          >
                            {lander.url}
                          </Link>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Offers */}
                  {redtrackData.offers.length > 0 && (
                    <Box>
                      <Typography sx={{ ...textXs, display: 'block', mb: 0.5, color: 'text.secondary' }}>
                        Offer
                      </Typography>
                      {redtrackData.offers.map((offer) => (
                        <Box
                          key={offer.id}
                          sx={{
                            p: 1,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography sx={{ ...textSm, fontWeight: 500 }}>{offer.title}</Typography>
                          {offer.url && (
                            <Link
                              href={offer.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ ...textXs, wordBreak: 'break-all', display: 'block' }}
                            >
                              {offer.url}
                            </Link>
                          )}
                          {offer.payout && (
                            <Typography sx={{ ...textSm, color: 'success.main', mt: 0.5 }}>
                              Payout: ${offer.payout.toFixed(2)}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Launch Action - Sticky Bottom */}
      <Box
        sx={{
          p: 2.5,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={launchStatusActive}
              onChange={onToggleLaunchStatusActive}
              size="small"
            />
          }
          label={
            <Typography variant="caption" color="text.secondary">
              Launch as active immediately
            </Typography>
          }
          sx={{ mb: 1, ml: -0.5 }}
        />
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={onLaunch}
          disabled={!allChecksPass || isLaunching}
          startIcon={
            isLaunching ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <RocketLaunchIcon />
            )
          }
          sx={{
            py: 1.5,
            ...textMd,
            fontWeight: 600,
            bgcolor: allChecksPass ? 'primary.main' : 'grey.400',
            '&:hover': {
              bgcolor: allChecksPass ? 'primary.dark' : 'grey.400',
            },
          }}
        >
          {isLaunching ? 'Launching...' : 'Launch Campaign'}
        </Button>
      </Box>
    </Paper>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ValidationGroupSectionProps {
  group: ValidationGroup;
}

function ValidationGroupSection({ group }: ValidationGroupSectionProps) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <Typography
          sx={{
            ...textSm,
            fontWeight: 600,
            textTransform: 'capitalize',
            color: group.allPassed ? 'success.main' : 'text.primary',
          }}
        >
          {group.name}
        </Typography>
        {group.allPassed ? (
          <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
        ) : (
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: 'warning.main',
            }}
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pl: 1 }}>
        {group.checks.map((check) => (
          <Box
            key={check.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {check.passed ? (
              <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
            ) : (
              <ErrorIcon sx={{ fontSize: 14, color: 'error.main' }} />
            )}
            <Typography
              sx={{
                ...textSm,
                color: check.passed ? 'text.secondary' : 'error.main',
              }}
            >
              {check.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
