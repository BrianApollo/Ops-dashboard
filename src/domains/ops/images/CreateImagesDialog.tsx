import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { Advertorial } from '../../../features/advertorials';

export interface CreateImagesData {
    numberOfImages: number;
    advertorial: string;
    imageSize: string;
    outputFormat: string;
}

interface CreateImagesDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateImagesData) => void;
    advertorials: Advertorial[];
}

const IMAGE_SIZES = ['Auto', '21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'];
const OUTPUT_FORMATS = ['png', 'jpeg', 'jpg'];

export function CreateImagesDialog({ open, onClose, onSubmit, advertorials }: CreateImagesDialogProps) {
    const [numberOfImages, setNumberOfImages] = useState('1');
    const [selectedAdvertorialId, setSelectedAdvertorialId] = useState('');
    const [imageSize, setImageSize] = useState('9:16');
    const [outputFormat, setOutputFormat] = useState('png');

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setNumberOfImages('1');
            setSelectedAdvertorialId('');
            setImageSize('9:16');
            setOutputFormat('png');
        }
    }, [open]);

    const handleSubmit = () => {
        const selectedAdv = advertorials.find(a => a.id === selectedAdvertorialId);
        onSubmit({
            numberOfImages: parseInt(numberOfImages, 10),
            advertorial: selectedAdv?.text || '',
            imageSize,
            outputFormat,
        });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>Create Images</DialogTitle>
            <DialogContent>
                <TextField
                    label="Number of Images"
                    type="number"
                    value={numberOfImages}
                    onChange={(e) => setNumberOfImages(e.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{
                        input: { inputProps: { min: 1, max: 20 } },
                    }}
                    sx={{ mt: 1 }}
                />
                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <InputLabel>Advertorial</InputLabel>
                    <Select
                        value={selectedAdvertorialId}
                        label="Advertorial"
                        onChange={(e) => setSelectedAdvertorialId(e.target.value)}
                    >
                        {advertorials.map((adv) => (
                            <MenuItem key={adv.id} value={adv.id}>
                                {adv.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <InputLabel>Image Size</InputLabel>
                    <Select
                        value={imageSize}
                        label="Image Size"
                        onChange={(e) => setImageSize(e.target.value)}
                    >
                        {IMAGE_SIZES.map((size) => (
                            <MenuItem key={size} value={size}>
                                {size}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <InputLabel>Output Format</InputLabel>
                    <Select
                        value={outputFormat}
                        label="Output Format"
                        onChange={(e) => setOutputFormat(e.target.value)}
                    >
                        {OUTPUT_FORMATS.map((format) => (
                            <MenuItem key={format} value={format}>
                                {format.toUpperCase()}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!numberOfImages || parseInt(numberOfImages) < 1 || !selectedAdvertorialId}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
