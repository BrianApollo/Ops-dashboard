/**
 * DetailNotes - Editable notes text field with auto-save.
 * Matches the Video Editor Portal visual style.
 */

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

interface DetailNotesProps {
  value: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
}

export function DetailNotes({
  value: externalValue,
  onChange,
  onSave,
  disabled = false,
  placeholder = 'Add notes...',
  minRows = 2,
  maxRows = 6,
}: DetailNotesProps) {
  const [value, setValue] = useState(externalValue);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with external value
  useEffect(() => {
    setValue(externalValue);
  }, [externalValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange?.(newValue);
  };

  const handleBlur = useCallback(async () => {
    if (!onSave || value === externalValue) return;
    setIsSaving(true);
    try {
      await onSave(value);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, value, externalValue]);

  return (
    <Box>
      <TextField
        multiline
        minRows={minRows}
        maxRows={maxRows}
        fullWidth
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled || isSaving}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: '#fafaf9',
            fontSize: '0.85rem',
            '& fieldset': {
              borderColor: '#e7e5e4',
            },
            '&:hover fieldset': {
              borderColor: '#d6d3d1',
            },
          },
        }}
      />
      {isSaving && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Saving...
        </Typography>
      )}
    </Box>
  );
}
