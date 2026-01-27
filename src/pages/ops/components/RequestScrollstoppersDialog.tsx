/**
 * RequestScrollstoppersDialog - Dialog for requesting scrollstopper variations.
 *
 * Features:
 * - Select how many scrollstoppers to create (1-5)
 * - Select which editor(s) to assign to
 * - Shows current scrollstopper count per editor
 * - Preview of what will be created
 */

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { AppDialog } from '../../../core/dialog';
import type { VideoAsset } from '../../../features/videos';

interface RequestScrollstoppersDialogProps {
  open: boolean;
  onClose: () => void;
  scriptId: string;
  scriptName: string;
  videos: VideoAsset[];
  editors: { value: string; label: string }[];
  onSubmit: (params: {
    scriptId: string;
    editorIds: string[];
    count: number;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export function RequestScrollstoppersDialog({
  open,
  onClose,
  scriptId,
  scriptName,
  videos,
  editors,
  onSubmit,
  isSubmitting,
}: RequestScrollstoppersDialogProps) {
  const [count, setCount] = useState<number>(1);
  const [selectedEditorIds, setSelectedEditorIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Calculate existing scrollstopper info per editor
  // Any editor can be assigned scrollstoppers, even if they didn't make the original
  const editorScrollstopperInfo = useMemo(() => {
    const scriptVideos = videos.filter((v) => v.script.id === scriptId);

    return editors.map((editor) => {
      const editorVideos = scriptVideos.filter((v) => v.editor.id === editor.value);
      const hasVideos = editorVideos.length > 0;
      const maxSS = hasVideos
        ? Math.max(...editorVideos.map((v) => v.scrollstopperNumber ?? 1))
        : 1; // If no videos, treat as if they have "original" (SS1) conceptually

      return {
        id: editor.value,
        name: editor.label,
        hasVideos,
        maxScrollstopper: maxSS,
        // If editor has no videos yet, start at SS2 (they don't have the original)
        nextScrollstopper: hasVideos ? maxSS + 1 : 2,
        videoCount: editorVideos.length,
      };
    });
  }, [videos, scriptId, editors]);

  const handleClose = () => {
    setCount(1);
    setSelectedEditorIds([]);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (selectedEditorIds.length === 0) {
      setError('Please select at least one editor');
      return;
    }

    setError(null);
    try {
      await onSubmit({
        scriptId,
        editorIds: selectedEditorIds,
        count,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scrollstoppers');
    }
  };

  const handleEditorChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const value = (event.target as HTMLInputElement).value;
    setSelectedEditorIds(typeof value === 'string' ? value.split(',') : (value as string[]));
  };

  // Preview what will be created
  const preview = useMemo(() => {
    if (selectedEditorIds.length === 0) return null;

    const totalVideos = selectedEditorIds.length * count * 6; // 6 videos per scrollstopper per editor
    const details = selectedEditorIds
      .map((editorId) => {
        const info = editorScrollstopperInfo.find((e) => e.id === editorId);
        if (!info) return null;

        const ssNumbers = Array.from(
          { length: count },
          (_, i) => info.nextScrollstopper + i
        );
        return {
          editorName: info.name,
          scrollstoppers: ssNumbers.map((n) => `SS${n}`),
        };
      })
      .filter(Boolean);

    return { totalVideos, details };
  }, [selectedEditorIds, count, editorScrollstopperInfo]);

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title="Request Scrollstoppers"
      size="sm"
      actions={
        <>
          <Button onClick={handleClose} variant="outlined" color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSubmitting || selectedEditorIds.length === 0}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isSubmitting ? 'Creating...' : 'Create Scrollstoppers'}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Script Info */}
        <Box>
          <Typography variant="body2" color="text.secondary">
            Creating scrollstoppers for:
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {scriptName}
          </Typography>
        </Box>

        {/* No editors available warning */}
        {editorScrollstopperInfo.length === 0 && (
          <Alert severity="warning">
            No editors available. Add editors to the system first.
          </Alert>
        )}

        {editorScrollstopperInfo.length > 0 && (
          <>
            {/* Count Selector */}
            <FormControl fullWidth>
              <InputLabel>How many scrollstoppers?</InputLabel>
              <Select
                value={count}
                label="How many scrollstoppers?"
                onChange={(e) => setCount(Number(e.target.value))}
                disabled={isSubmitting}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n} scrollstopper{n !== 1 ? 's' : ''} ({n * 6} videos per editor)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Editor Selector */}
            <FormControl fullWidth>
              <InputLabel>Assign to which editor(s)?</InputLabel>
              <Select
                multiple
                value={selectedEditorIds}
                label="Assign to which editor(s)?"
                onChange={handleEditorChange as any}
                disabled={isSubmitting}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((id) => {
                      const editor = editorScrollstopperInfo.find((e) => e.id === id);
                      return <Chip key={id} label={editor?.name ?? id} size="small" />;
                    })}
                  </Box>
                )}
              >
                {editorScrollstopperInfo.map((editor) => (
                  <MenuItem key={editor.id} value={editor.id}>
                    <Checkbox checked={selectedEditorIds.includes(editor.id)} />
                    <ListItemText
                      primary={editor.name}
                      secondary={
                        !editor.hasVideos
                          ? 'No videos yet - will start at SS2'
                          : editor.maxScrollstopper > 1
                            ? `Currently has SS1-SS${editor.maxScrollstopper}`
                            : 'Has original videos only'
                      }
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Preview */}
            {preview && (
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  Preview
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Will create <strong>{preview.totalVideos} videos</strong>:
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {preview.details.map((detail) => (
                    <Typography key={detail!.editorName} variant="body2" sx={{ ml: 1 }}>
                      {detail!.editorName}: {detail!.scrollstoppers.join(', ')}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}

        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
      </Box>
    </AppDialog>
  );
}
