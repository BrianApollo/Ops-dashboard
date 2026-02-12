import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Grid, Box
} from '@mui/material';
import { InfraProfile } from '../../../../features/infrastructure/types';

interface SetupInfoDialogProps {
    open: boolean;
    profile: InfraProfile;
    onClose: () => void;
    onSave: (id: string, updates: Partial<InfraProfile>) => Promise<void>;
}

export function SetupInfoDialog({ open, profile, onClose, onSave }: SetupInfoDialogProps) {
    const [formData, setFormData] = useState<Partial<InfraProfile>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && profile) {
            setFormData({
                profileFbPassword: profile.profileFbPassword || '',
                profileEmail: profile.profileEmail || '',
                profileEmailPassword: profile.profileEmailPassword || '',
                profile2fa: profile.profile2fa || '',
                profileBirthDate: profile.profileBirthDate || '',
                profileGender: profile.profileGender || '',
                profileLocation: profile.profileLocation || '',
                profileLink: profile.profileLink || '',
                profileReviewDate: profile.profileReviewDate || '',
                profileSecurityEmail: profile.profileSecurityEmail || '',
                securityEmailPassword: profile.securityEmailPassword || '',
                proxy: profile.proxy || '',
                profileYearCreated: profile.profileYearCreated || '',
                profileYoutubeHandle: profile.profileYoutubeHandle || '',
                uid: profile.uid || '',
            });
        }
    }, [open, profile]);

    const handleChange = (field: keyof InfraProfile) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [field]: event.target.value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(profile.id, formData);
            onClose();
        } catch (error) {
            console.error('Failed to save profile setup info', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Edit Setup Information</DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1 }}>
                    <Grid container spacing={2}>
                        {/* Account Credentials */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="FB Password"
                                value={formData.profileFbPassword || ''}
                                onChange={handleChange('profileFbPassword')}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Email"
                                value={formData.profileEmail || ''}
                                onChange={handleChange('profileEmail')}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Email Password"
                                value={formData.profileEmailPassword || ''}
                                onChange={handleChange('profileEmailPassword')}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="2FA Secret"
                                value={formData.profile2fa || ''}
                                onChange={handleChange('profile2fa')}
                                size="small"
                            />
                        </Grid>

                        {/* Profile Details */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Birth Date"
                                type="date"
                                value={formData.profileBirthDate || ''}
                                onChange={handleChange('profileBirthDate')}
                                size="small"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Gender"
                                value={formData.profileGender || ''}
                                onChange={handleChange('profileGender')}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Location"
                                value={formData.profileLocation || ''}
                                onChange={handleChange('profileLocation')}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Year Created"
                                value={formData.profileYearCreated || ''}
                                onChange={handleChange('profileYearCreated')}
                                size="small"
                            />
                        </Grid>

                        {/* Links & IDs */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Profile Link"
                                value={formData.profileLink || ''}
                                onChange={handleChange('profileLink')}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="YouTube Handle"
                                value={formData.profileYoutubeHandle || ''}
                                onChange={handleChange('profileYoutubeHandle')}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="UID"
                                value={formData.uid || ''}
                                onChange={handleChange('uid')}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Review Date"
                                type="date"
                                value={formData.profileReviewDate || ''}
                                onChange={handleChange('profileReviewDate')}
                                size="small"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {/* Security */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Security Email"
                                value={formData.profileSecurityEmail || ''}
                                onChange={handleChange('profileSecurityEmail')}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Security Email Password"
                                value={formData.securityEmailPassword || ''}
                                onChange={handleChange('securityEmailPassword')}
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Proxy"
                                value={formData.proxy || ''}
                                onChange={handleChange('proxy')}
                                size="small"
                            />
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
