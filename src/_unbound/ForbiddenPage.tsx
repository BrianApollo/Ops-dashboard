import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';

export default function ForbiddenPage() {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                bgcolor: 'background.default',
                color: 'text.primary',
                p: 3,
                textAlign: 'center',
            }}
        >
            <DoNotDisturbIcon sx={{ fontSize: 96, color: 'error.main', opacity: 0.8 }} />

            <Box>
                <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
                    403
                </Typography>
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    Access Denied
                </Typography>
            </Box>

            <Typography variant="body1" sx={{ maxWidth: 480, color: 'text.secondary' }}>
                You do not have permission to access this page. If you believe this is an error, please contact your administrator.
            </Typography>

            <Button
                variant="contained"
                onClick={() => navigate(-1)}
                sx={{ mt: 2 }}
            >
                Go Back
            </Button>
        </Box>
    );
}
