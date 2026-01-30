/**
 * UpdateAdvertorialDialog - Dialog for updating an existing advertorial.
 * Form includes: Name, Advertorial Text (textarea), and Link (input).
 * Pre-filled with current values.
 */

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { AppDialog } from '../../../../core/dialog';
import { Advertorial } from '../../../../features/advertorials';

interface UpdateAdvertorialDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (id: string, fields: Partial<Advertorial>) => Promise<void>;
    isSubmitting: boolean;
    advertorial: Advertorial | null;
}

export function UpdateAdvertorialDialog({
    open,
    onClose,
    onSubmit,
    isSubmitting,
    advertorial,
}: UpdateAdvertorialDialogProps) {
    const [name, setName] = useState('');
    const [text, setText] = useState('');
    const [link, setLink] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (advertorial && open) {
            setName(advertorial.name);
            setText(advertorial.text || '');
            setLink(advertorial.link || '');
            setError(null);
        }
    }, [advertorial, open]);

    const canSubmit = name.trim().length > 0 && !isSubmitting;

    const handleSubmit = async () => {
        if (!advertorial) return;
        if (!name.trim()) {
            setError('Please enter an advertorial name');
            return;
        }

        setError(null);
        try {
            await onSubmit(advertorial.id, {
                name: name.trim(),
                text: text.trim() || undefined,
                link: link.trim() || undefined,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update advertorial');
        }
    };

    const handleClose = () => {
        setError(null);
        onClose();
    };

    if (!advertorial) return null;

    return (
        <AppDialog
            open={open}
            onClose={handleClose}
            title="Update Advertorial"
            size="sm"
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
                        {isSubmitting ? 'Updating...' : 'Update'}
                    </Button>
                </>
            }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                {/* Product (read-only) */}
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
                        Product
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
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {advertorial.productName}
                        </Typography>
                    </Box>
                </Box>

                {/* Advertorial Name */}
                <TextField
                    label="Advertorial Name"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setError(null);
                    }}
                    fullWidth
                    autoFocus
                    disabled={isSubmitting}
                    placeholder="Enter advertorial name..."
                    required
                />

                {/* Advertorial Text */}
                <TextField
                    label="Advertorial Text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                    maxRows={6}
                    disabled={isSubmitting}
                    placeholder="Enter advertorial text content..."
                />

                {/* Advertorial Link */}
                <TextField
                    label="Advertorial Link"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    fullWidth
                    disabled={isSubmitting}
                    placeholder="https://example.com/advertorial"
                    type="url"
                />

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
