import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import type { ProductStatus } from '../../../features/products/types';

interface ProductCreationModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, image: File | null, status: ProductStatus) => Promise<void>;
    isCreating: boolean;
}

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Benched', label: 'Benched' }, // User paused == benched in UI usually
    { value: 'Preparing', label: 'Preparing' },
];

export function ProductCreationModal({
    open,
    onClose,
    onSubmit,
    isCreating,
}: ProductCreationModalProps) {
    const [name, setName] = useState('');
    // Default to 'preparing' as requested
    const [status, setStatus] = useState<ProductStatus>('Preparing');
    const [image, setImage] = useState<File | null>(null);

    // Reset form when opening
    useEffect(() => {
        if (open) {
            setName('');
            setStatus('Preparing');
            setImage(null);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await onSubmit(name, image, status);
        onClose();
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Create New Product
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ color: (theme) => theme.palette.grey[500] }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            autoFocus
                            label="Product Name"
                            fullWidth
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={isCreating}
                        />

                        <TextField
                            select
                            label="Status"
                            fullWidth
                            value={status}
                            // Cast string back to ProductStatus safely
                            onChange={(e) => setStatus(e.target.value as ProductStatus)}
                            disabled={isCreating}
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Product Image
                            </Typography>
                            <Box
                                sx={{
                                    border: '1px dashed',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    p: 2,
                                    display: 'block',
                                    textAlign: 'center',
                                    bgcolor: 'action.hover',
                                    cursor: isCreating ? 'default' : 'pointer',
                                    '&:hover': {
                                        bgcolor: isCreating ? 'action.hover' : 'action.selected',
                                    }
                                }}
                                component="label"
                            >
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    disabled={isCreating}
                                />
                                <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    {image ? image.name : 'Click to upload image'}
                                </Typography>
                            </Box>
                            {image && (
                                <Button
                                    size="small"
                                    color="error"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setImage(null);
                                    }}
                                    sx={{ mt: 1 }}
                                    disabled={isCreating}
                                >
                                    Remove Image
                                </Button>
                            )}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={onClose} disabled={isCreating}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!name.trim() || isCreating}
                    >
                        {isCreating ? 'Creating...' : 'Create Product'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
