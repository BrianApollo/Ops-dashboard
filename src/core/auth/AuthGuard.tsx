import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { CircularProgress, Box } from '@mui/material';
import ForbiddenPage from '../../_unbound/ForbiddenPage';
export function RequireAuth() {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        // Redirect to login page but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Block access to /ops routes for Video Editor role
    if (user.role === 'Video Editor' && location.pathname.startsWith('/ops')) {
        return <ForbiddenPage />;
    }

    return <Outlet />;
}

export function RedirectIfAuthenticated() {
    const { user } = useAuth();

    if (user) {
        if (user.role === 'Video Editor') {
            return <Navigate to="/videos" replace />;
        }
        return <Navigate to="/ops" replace />;
    }

    return <Outlet />;
}

export function RootRedirect() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null; // Let RequireAuth handle the loading spinner if wrapped, or show nothing
    }

    if (user?.role === 'Video Editor') {
        return <Navigate to="/videos" replace />;
    }

    return <Navigate to="/ops" replace />;
}
