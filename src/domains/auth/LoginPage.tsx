import React, { useState } from 'react';
import { Box, Button, Container, TextField, Typography, Paper, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../core/auth/AuthContext';
import { useNavigate } from 'react-router-dom';

import { useToast } from '../../core/toast';

const LoginPage = () => {
    const theme = useTheme();
    const { login, isLoading } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [loginError, setLoginError] = useState('');

    const validateEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);
        if (value && !validateEmail(value)) {
            setEmailError('Please enter a valid email address');
        } else {
            setEmailError('');
            setLoginError(''); // Clear login error on input change
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateEmail(email)) {
            setEmailError('Please enter a valid email address');
            return;
        }

        const user = await login(email, password);
        if (user) {
            if (user.role === 'Video Editor') {
                navigate('/videos');
            } else {
                navigate('/ops');
            }
        } else {
            setLoginError('Invalid email or password');
            toast.error('Email or password is incorrect');
        }
    };

    return (
        <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                    Login to Trust Apollo
                </Typography>
                {loginError && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{loginError}</Alert>}
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={handleEmailChange}
                        error={!!emailError}
                        helperText={emailError}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={isLoading}
                        sx={{
                            mt: 3,
                            mb: 2,
                            bgcolor: theme.palette.primary.main,
                            color: 'white',
                            '&:hover': {
                                bgcolor: theme.palette.primary.dark,
                            },
                        }}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default LoginPage;
