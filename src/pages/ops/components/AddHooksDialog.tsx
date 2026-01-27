/**
 * AddHooksDialog - Dialog for adding hooks to an existing script.
 *
 * Two modes:
 * - Mode A (First-time hooks): 2-step process to split original script
 *   - Step 1: Select text in original to define hook vs body (no copy/paste)
 *   - Step 2: Add more hooks (optional)
 * - Mode B (Adding to existing family): Single step to add new hooks
 */

import { useState, useMemo, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { AppDialog } from '../../../core/dialog';
import type { Script } from '../../../features/scripts';

interface AddHooksDialogProps {
  open: boolean;
  onClose: () => void;
  script: Script;
  existingHooks: Script[];
  onSubmit: (params: {
    productId: string;
    productName: string;
    authorId: string;
    authorName: string;
    baseScriptNumber: number;
    hooks: string[];
    body: string;
    existingScriptId?: string;
  }) => Promise<Script[]>;
  isSubmitting: boolean;
  baseScriptNumber: number;
}

export function AddHooksDialog({
  open,
  onClose,
  script,
  existingHooks,
  onSubmit,
  isSubmitting,
  baseScriptNumber,
}: AddHooksDialogProps) {
  // Determine mode: Mode A (first-time) or Mode B (adding to existing)
  const hasExistingHooks = existingHooks.length > 0;
  const nextHookNumber = hasExistingHooks
    ? Math.max(...existingHooks.map((h) => h.hookNumber ?? 0)) + 1
    : 1;

  // Step state (for Mode A only)
  const [step, setStep] = useState<0 | 1>(0);

  // Selection state for Step 1
  const [hookEndIndex, setHookEndIndex] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Derived hook and body from selection
  const originalContent = script.content || '';
  const hook1 = hookEndIndex !== null ? originalContent.slice(0, hookEndIndex).trim() : '';
  const body = hookEndIndex !== null ? originalContent.slice(hookEndIndex).trim() : '';

  // Step 2 state / Mode B state
  const [additionalHooks, setAdditionalHooks] = useState<string[]>(['']);

  const [error, setError] = useState<string | null>(null);

  // Get existing body for Mode B
  const existingBody = existingHooks[0]?.body ?? '';

  // Reset form when dialog opens/closes
  const handleClose = () => {
    setStep(0);
    setHookEndIndex(null);
    setAdditionalHooks(['']);
    setError(null);
    onClose();
  };

  // Handle text selection in the original script
  const handleSetHookFromSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setError('Please select the hook portion of the script first');
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setError('Please select the hook portion of the script first');
      return;
    }

    // Find where the selection ends in the original content
    const selectionStart = originalContent.indexOf(selectedText);
    if (selectionStart === -1) {
      setError('Selection not found in script. Please try again.');
      return;
    }

    const selectionEnd = selectionStart + selectedText.length;
    setHookEndIndex(selectionEnd);
    setError(null);
    selection.removeAllRanges();
  }, [originalContent]);

  // Reset selection
  const handleResetSelection = () => {
    setHookEndIndex(null);
    setError(null);
  };

  // Step 1 validation
  const canContinueStep1 = hook1.length > 0 && body.length > 0;

  // Mode B / Step 2 validation
  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;

    if (hasExistingHooks) {
      return additionalHooks.some((h) => h.trim().length > 0);
    } else {
      return true;
    }
  }, [isSubmitting, hasExistingHooks, additionalHooks]);

  const handleContinueToStep2 = () => {
    if (!canContinueStep1) {
      setError('Please select the hook portion from the script above');
      return;
    }
    setError(null);
    setStep(1);
  };

  const handleBackToStep1 = () => {
    setStep(0);
    setError(null);
  };

  const handleAddHook = () => {
    setAdditionalHooks([...additionalHooks, '']);
  };

  const handleRemoveHook = (index: number) => {
    if (additionalHooks.length > 1) {
      setAdditionalHooks(additionalHooks.filter((_, i) => i !== index));
    }
  };

  const handleHookChange = (index: number, value: string) => {
    const newHooks = [...additionalHooks];
    newHooks[index] = value;
    setAdditionalHooks(newHooks);
  };

  const handleSubmit = async () => {
    setError(null);

    try {
      if (hasExistingHooks) {
        const validHooks = additionalHooks.filter((h) => h.trim().length > 0);
        if (validHooks.length === 0) {
          setError('Please enter at least one hook');
          return;
        }

        await onSubmit({
          productId: script.product.id,
          productName: script.product.name,
          authorId: script.author?.id ?? '',
          authorName: script.author?.name ?? 'Unknown',
          baseScriptNumber,
          hooks: validHooks,
          body: existingBody,
        });
      } else {
        const allHooks = [hook1, ...additionalHooks.filter((h) => h.trim().length > 0)];

        await onSubmit({
          productId: script.product.id,
          productName: script.product.name,
          authorId: script.author?.id ?? '',
          authorName: script.author?.name ?? 'Unknown',
          baseScriptNumber,
          hooks: allHooks,
          body: body,
          existingScriptId: script.id,
        });
      }

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create hooks');
    }
  };

  // Shared label style
  const labelSx = {
    display: 'block',
    mb: 1,
    color: 'text.secondary',
    fontWeight: 500,
    textTransform: 'uppercase',
    fontSize: '0.7rem',
    letterSpacing: '0.05em',
  };

  // =========================================================================
  // RENDER: Mode B (Adding to existing hook family)
  // =========================================================================
  if (hasExistingHooks) {
    return (
      <AppDialog
        open={open}
        onClose={handleClose}
        title="Add More Hooks"
        size="lg"
        actions={
          <>
            <Button onClick={handleClose} variant="outlined" color="inherit" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!canSubmit}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isSubmitting ? 'Creating...' : 'Create Hooks'}
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Existing Hooks Info */}
          <Box>
            <Typography variant="caption" sx={labelSx}>
              Existing Hooks ({existingHooks.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {existingHooks.map((h) => (
                <Box
                  key={h.id}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  Hook {h.hookNumber}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Existing Body (read-only) */}
          <Box>
            <Typography variant="caption" sx={labelSx}>
              Body (shared, read-only)
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: 150,
                overflow: 'auto',
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem' }}>
                {existingBody || 'No body content'}
              </Typography>
            </Box>
          </Box>

          <Divider />

          {/* New Hook Inputs */}
          <Box>
            <Typography variant="caption" sx={labelSx}>
              New Hooks
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {additionalHooks.map((hook, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    label={`Hook ${nextHookNumber + index}`}
                    value={hook}
                    onChange={(e) => handleHookChange(index, e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                    disabled={isSubmitting}
                    placeholder="Enter new hook content..."
                  />
                  {additionalHooks.length > 1 && (
                    <IconButton
                      onClick={() => handleRemoveHook(index)}
                      disabled={isSubmitting}
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>

            <Button
              startIcon={<AddIcon />}
              onClick={handleAddHook}
              disabled={isSubmitting}
              size="small"
              sx={{ mt: 1.5 }}
            >
              Add Another Hook
            </Button>
          </Box>

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Box>
      </AppDialog>
    );
  }

  // =========================================================================
  // RENDER: Mode A - 2-Step Process
  // =========================================================================
  const steps = ['Split Original Script', 'Add More Hooks'];

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title="Add Hooks"
      size="lg"
      actions={
        step === 0 ? (
          <>
            <Button onClick={handleClose} variant="outlined" color="inherit" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleContinueToStep2}
              variant="contained"
              disabled={!canContinueStep1}
              endIcon={<ArrowForwardIcon />}
            >
              Continue
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={handleBackToStep1}
              variant="outlined"
              color="inherit"
              disabled={isSubmitting}
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
            <Button onClick={handleClose} variant="outlined" color="inherit" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!canSubmit}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isSubmitting ? 'Creating...' : 'Create Hooks'}
            </Button>
          </>
        )
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Stepper */}
        <Stepper activeStep={step} sx={{ pt: 1, pb: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* =============================================================== */}
        {/* STEP 1: Split Original Script by Selection */}
        {/* =============================================================== */}
        {step === 0 && (
          <>
            {/* Instructions */}
            <Alert severity="info">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {hookEndIndex === null
                  ? 'Select the HOOK portion of your script below, then click "Set as Hook"'
                  : 'Review the split below. Click "Reset" to change your selection.'}
              </Typography>
            </Alert>

            {/* Original Script - Selectable */}
            {hookEndIndex === null ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={labelSx}>
                    Select the Hook portion
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CheckIcon />}
                    onClick={handleSetHookFromSelection}
                  >
                    Set as Hook
                  </Button>
                </Box>
                <Box
                  ref={contentRef}
                  sx={{
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1.5,
                    border: '2px solid',
                    borderColor: 'primary.main',
                    maxHeight: 300,
                    overflow: 'auto',
                    cursor: 'text',
                    userSelect: 'text',
                    '&::selection': {
                      bgcolor: 'warning.light',
                    },
                    '& *::selection': {
                      bgcolor: 'warning.light',
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.875rem',
                      lineHeight: 1.7,
                    }}
                  >
                    {originalContent || 'No content in original script'}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Highlight the intro/attention-grabber text, then click "Set as Hook". The rest becomes the Body.
                </Typography>
              </Box>
            ) : (
              /* Preview of split */
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RestartAltIcon />}
                    onClick={handleResetSelection}
                  >
                    Reset Selection
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                  {/* Hook Preview */}
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        p: 0.75,
                        mb: 1,
                        bgcolor: 'warning.main',
                        color: 'warning.contrastText',
                        borderRadius: 1,
                        display: 'inline-block',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                        Hook (Intro)
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'warning.50',
                        border: '2px solid',
                        borderColor: 'warning.main',
                        borderRadius: 1.5,
                        maxHeight: 150,
                        overflow: 'auto',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem', lineHeight: 1.6 }}
                      >
                        {hook1}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Body Preview */}
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        p: 0.75,
                        mb: 1,
                        bgcolor: 'success.main',
                        color: 'success.contrastText',
                        borderRadius: 1,
                        display: 'inline-block',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                        Body (Main Content)
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'success.50',
                        border: '2px solid',
                        borderColor: 'success.main',
                        borderRadius: 1.5,
                        maxHeight: 150,
                        overflow: 'auto',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem', lineHeight: 1.6 }}
                      >
                        {body}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
          </>
        )}

        {/* =============================================================== */}
        {/* STEP 2: Add More Hooks */}
        {/* =============================================================== */}
        {step === 1 && (
          <>
            {/* Confirmation */}
            <Alert severity="success">
              <Typography variant="body2">
                Your original script will become <strong>Hook 1</strong>. Add alternate hooks below (optional).
              </Typography>
            </Alert>

            {/* Summary of Step 1 */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
              {/* Hook 1 Summary */}
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    p: 0.75,
                    mb: 1,
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    borderRadius: 1,
                    display: 'inline-block',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Hook 1 (from original)
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    maxHeight: 100,
                    overflow: 'auto',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem' }}>
                    {hook1}
                  </Typography>
                </Box>
              </Box>

              {/* Body Summary */}
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    p: 0.75,
                    mb: 1,
                    bgcolor: 'success.main',
                    color: 'success.contrastText',
                    borderRadius: 1,
                    display: 'inline-block',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Body (shared)
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    maxHeight: 100,
                    overflow: 'auto',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem' }}>
                    {body}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider />

            {/* Additional Hook Inputs */}
            <Box>
              <Typography variant="caption" sx={labelSx}>
                Add Alternate Hooks (optional)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create different intros that will each be combined with the body above.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {additionalHooks.map((hook, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                      label={`Hook ${index + 2}`}
                      value={hook}
                      onChange={(e) => handleHookChange(index, e.target.value)}
                      multiline
                      rows={3}
                      fullWidth
                      disabled={isSubmitting}
                      placeholder="Enter alternate hook content..."
                    />
                    {additionalHooks.length > 1 && (
                      <IconButton
                        onClick={() => handleRemoveHook(index)}
                        disabled={isSubmitting}
                        size="small"
                        sx={{ mt: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Box>

              <Button
                startIcon={<AddIcon />}
                onClick={handleAddHook}
                disabled={isSubmitting}
                size="small"
                sx={{ mt: 1.5 }}
              >
                Add Another Hook
              </Button>
            </Box>

            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}

            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              You can skip adding more hooks and just create Hook 1 with the split you defined.
            </Typography>
          </>
        )}
      </Box>
    </AppDialog>
  );
}
