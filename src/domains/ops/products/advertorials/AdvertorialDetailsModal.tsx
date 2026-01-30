import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Link from '@mui/material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import Typography from '@mui/material/Typography';
import { Advertorial } from '../../../../features/advertorials';

interface AdvertorialDetailsModalProps {
    open: boolean;
    onClose: () => void;
    advertorial: Advertorial | null;
}

export function AdvertorialDetailsModal({
    open,
    onClose,
    advertorial,
}: AdvertorialDetailsModalProps) {
    if (!advertorial) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Advertorial Details
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ color: (theme) => theme.palette.grey[500] }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                        label="Advertorial Name"
                        value={advertorial.name}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                    />

                    <TextField
                        label="Product"
                        value={advertorial.productName}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                    />

                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            Final Advertorial Link
                        </Typography>
                        {advertorial.link ? (
                            <Link
                                href={advertorial.link}
                                target="_blank"
                                rel="noopener"
                                underline="hover"
                                sx={{ fontSize: '1rem' }}
                            >
                                {advertorial.link}
                            </Link>
                        ) : (
                            <Typography color="text.disabled">-</Typography>
                        )}
                    </Box>

                    <TextField
                        label="Advertorial Text"
                        value={advertorial.text || ''}
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={10}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">Checked Status:</Typography>
                        {advertorial.isChecked ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                                <CheckCircleIcon fontSize="small" />
                                <Typography variant="body2" fontWeight={500}>Checked</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
                                <CancelIcon fontSize="small" />
                                <Typography variant="body2" fontWeight={500}>Unchecked</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} variant="contained">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
