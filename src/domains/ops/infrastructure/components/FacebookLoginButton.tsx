import { useState, useEffect } from 'react';
import { Button, CircularProgress } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import { useInfrastructureController } from '../../../../features/infrastructure/useInfrastructureController';
import { exchangeToken, getMe, validateToken } from '../../../../features/infrastructure/api';
import { listProfiles, createInfraRecord, updateInfraRecord } from '../../../../features/infrastructure/data';
import { FIELDS } from '../../../../features/infrastructure/config';

// Add FB SDK types
declare global {
    interface Window {
        fbAsyncInit: () => void;
        FB: any;
    }
}

const FB_APP_ID = import.meta.env.VITE_FB_APP_ID;

export function FacebookLoginButton() {
    const [loading, setLoading] = useState(false);
    const [sdkLoaded, setSdkLoaded] = useState(false);
    const { refetchAll } = useInfrastructureController();

    useEffect(() => {
        // Load SDK if not present
        if (document.getElementById('facebook-jssdk')) {
            setSdkLoaded(true);
            return;
        }

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: FB_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v21.0'
            });
            setSdkLoaded(true);
        };

        (function (d, s, id) {
            let js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s) as HTMLScriptElement;
            js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            if (fjs && fjs.parentNode) {
                fjs.parentNode.insertBefore(js, fjs);
            } else {
                d.head.appendChild(js);
            }
        }(document, 'script', 'facebook-jssdk'));
    }, []);

    const handleLogin = async () => {
        if (!sdkLoaded || !window.FB) return;

        setLoading(true);

        try {
            // 1. Login with FB
            const response = await new Promise<any>((resolve) => {
                window.FB.login((response: any) => {
                    resolve(response);
                }, {
                    scope: 'public_profile,email,business_management,ads_management,ads_read,pages_read_engagement,pages_show_list,pages_manage_metadata'
                });
            });

            if (response.status !== 'connected') {
                throw new Error('User cancelled login or did not authorize.');
            }

            const shortLivedToken = response.authResponse.accessToken;

            // 2. Exchange for long-lived token
            const tokenData = await exchangeToken(shortLivedToken);

            // 3. Get User Profile
            // We use the long-lived token to fetch user details to be sure it works
            const userInfo = await getMe(tokenData.token);

            // 4. Check if profile exists and save
            const profiles = await listProfiles();
            const F = FIELDS.profiles;

            const existingProfile = profiles.find(p => p.profileId === userInfo.id || p.profileName === userInfo.name);

            // 2a. Validate token to get accurate expiry (data_access_expires_at)
            const validation = await validateToken(tokenData.token);
            const expiryDate = validation.dataAccessExpiresAt || new Date();
            if (!validation.dataAccessExpiresAt) {
                expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expiresIn);
            }
            const expiryDateStr = expiryDate.toISOString().split('T')[0];

            const fields: Record<string, unknown> = {
                [F.profileName]: userInfo.name,
                [F.profileId]: userInfo.id, // Ensure we save the UID
                [F.permanentToken]: tokenData.token,
                [F.permanentTokenEndDate]: expiryDateStr,
                [F.profileStatus]: 'Active',
                [F.lastSync]: new Date().toISOString()
            };

            if (existingProfile) {
                await updateInfraRecord('profiles', existingProfile.id, fields);
            } else {
                await createInfraRecord('profiles', fields);
            }

            // 5. Refresh Data
            await refetchAll();

        } catch (error) {
            console.error('Facebook Login Error:', error);
            alert('Failed to connect Facebook profile: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="contained"
            onClick={handleLogin}
            disabled={loading || !sdkLoaded}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FacebookIcon />}
            sx={{
                bgcolor: '#1877f2',
                '&:hover': { bgcolor: '#166fe5' },
                textTransform: 'none',
                fontWeight: 600
            }}
        >
            {loading ? 'Connecting...' : 'Connect Facebook'}
        </Button>
    );
}
