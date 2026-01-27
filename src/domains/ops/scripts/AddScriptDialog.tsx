/**
 * AddScriptDialog - Dialog for creating a new script.
 * UI only - calls controller method for actual creation.
 *
 * Features:
 * - Auto-generated name: "{ProductName} - Script {NNNN} - {AuthorName}"
 * - Author selection (required)
 * - Script content (optional for simple scripts)
 * - Hooks checkbox: when checked, allows creating script with multiple hooks
 */

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { AppDialog } from '../../../core/dialog';
import type { Script } from '../../../features/scripts';

interface AddScriptDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    productId: string,
    productName: string,
    authorId: string,
    authorName: string,
    content?: string
  ) => Promise<Script>;
  onSubmitWithHooks?: (params: {
    productId: string;
    productName: string;
    authorId: string;
    authorName: string;
    hooks: string[];
    body: string;
  }) => Promise<Script[]>;
  isSubmitting: boolean;
  productId: string;
  productName: string;
  authorOptions: { value: string; label: string }[];
  nextScriptNumber: number;
}

export function AddScriptDialog({
  open,
  onClose,
  onSubmit,
  onSubmitWithHooks,
  isSubmitting,
  productId,
  productName,
  authorOptions,
  nextScriptNumber,
}: AddScriptDialogProps) {
  const [selectedAuthorId, setSelectedAuthorId] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Hooks mode state
  const [addHooks, setAddHooks] = useState(false);
  const [hooks, setHooks] = useState<string[]>(['', '']); // Start with 2 hooks
  const [body, setBody] = useState('');

  // Get the selected author's name
  const selectedAuthorName = useMemo(() => {
    const author = authorOptions.find((a) => a.value === selectedAuthorId);
    return author?.label ?? null;
  }, [authorOptions, selectedAuthorId]);

  // Generate preview name
  const previewName = useMemo(() => {
    const paddedNumber = String(nextScriptNumber).padStart(4, '0');
    const authorPart = selectedAuthorName ?? '?';
    return `${productName} - Script ${paddedNumber} - ${authorPart}`;
  }, [productName, nextScriptNumber, selectedAuthorName]);

  // Can submit when author is selected
  const canSubmit = useMemo(() => {
    if (!selectedAuthorId || isSubmitting) return false;

    if (addHooks) {
      // Need at least one non-empty hook and non-empty body
      const validHooks = hooks.filter((h) => h.trim());
      return validHooks.length >= 1 && body.trim().length > 0;
    }

    // Simple script: author is enough (content optional)
    return true;
  }, [selectedAuthorId, isSubmitting, addHooks, hooks, body]);

  const handleSubmit = async () => {
    if (!selectedAuthorId || !selectedAuthorName) {
      setError('Please select an author');
      return;
    }

    setError(null);
    try {
      if (addHooks && onSubmitWithHooks) {
        // Filter out empty hooks
        const validHooks = hooks.filter((h) => h.trim());
        if (validHooks.length === 0) {
          setError('Please enter at least one hook');
          return;
        }
        if (!body.trim()) {
          setError('Please enter the body content');
          return;
        }

        await onSubmitWithHooks({
          productId,
          productName,
          authorId: selectedAuthorId,
          authorName: selectedAuthorName,
          hooks: validHooks,
          body: body.trim(),
        });
      } else {
        await onSubmit(
          productId,
          productName,
          selectedAuthorId,
          selectedAuthorName,
          content.trim() || undefined
        );
      }

      // Reset form
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create script');
    }
  };

  const resetForm = () => {
    setSelectedAuthorId('');
    setContent('');
    setError(null);
    setAddHooks(false);
    setHooks(['', '']);
    setBody('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleHookChange = (index: number, value: string) => {
    setHooks((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleAddHook = () => {
    setHooks((prev) => [...prev, '']);
  };

  const handleRemoveHook = (index: number) => {
    if (hooks.length <= 2) return; // Keep at least 2 hooks
    setHooks((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title={`Add Script - ${productName}`}
      size="md"
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
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Name Preview (read-only) */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.5,
              color: 'text.secondary',
              fontWeight: 500,
              textTransform: 'uppercase',
              fontSize: '0.7rem',
              letterSpacing: '0.05em',
            }}
          >
            Name (auto-generated)
          </Typography>
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: selectedAuthorName ? 'text.primary' : 'text.secondary',
              }}
            >
              {previewName}
            </Typography>
          </Box>
        </Box>

        {/* Author Select (required) */}
        <FormControl fullWidth error={!!error && !selectedAuthorId}>
          <InputLabel id="author-select-label">Author *</InputLabel>
          <Select
            labelId="author-select-label"
            value={selectedAuthorId}
            onChange={(e) => {
              setSelectedAuthorId(e.target.value);
              setError(null);
            }}
            label="Author *"
            disabled={isSubmitting}
          >
            {authorOptions.length === 0 ? (
              <MenuItem disabled>No authors available</MenuItem>
            ) : (
              authorOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {/* Add Hooks Checkbox */}
        {onSubmitWithHooks && (
          <FormControlLabel
            control={
              <Checkbox
                checked={addHooks}
                onChange={(e) => setAddHooks(e.target.checked)}
                disabled={isSubmitting}
              />
            }
            label="Add hooks"
            sx={{ ml: 0 }}
          />
        )}

        {/* Simple Script Content (when hooks not checked) */}
        {!addHooks && (
          <TextField
            label="Script Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            multiline
            rows={6}
            fullWidth
            disabled={isSubmitting}
            placeholder="Enter the script content here..."
          />
        )}

        {/* Hooks Mode (when hooks checked) */}
        {addHooks && (
          <>
            {/* Hook Inputs */}
            {hooks.map((hook, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label={`Hook ${index + 1}`}
                  value={hook}
                  onChange={(e) => handleHookChange(index, e.target.value)}
                  multiline
                  rows={3}
                  fullWidth
                  disabled={isSubmitting}
                  placeholder={`Enter hook ${index + 1} (intro/attention-grabber)...`}
                />
                {hooks.length > 2 && (
                  <IconButton
                    onClick={() => handleRemoveHook(index)}
                    disabled={isSubmitting}
                    size="small"
                    sx={{ alignSelf: 'flex-start', mt: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}

            {/* Add Another Hook Button */}
            <Button
              onClick={handleAddHook}
              startIcon={<AddIcon />}
              variant="text"
              size="small"
              disabled={isSubmitting}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add Another Hook
            </Button>

            {/* Body (shared across all hooks) */}
            <TextField
              label="Body (shared)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              multiline
              rows={6}
              fullWidth
              disabled={isSubmitting}
              placeholder="Enter the main body content (shared by all hooks)..."
              helperText="This content will be combined with each hook to create script variants"
            />
          </>
        )}

        {/* Error Display */}
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
      </Box>
    </AppDialog>
  );
}
