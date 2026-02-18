/**
 * Infrastructure Mutation Actions
 *
 * Token validation, refresh, sync, system user generation, hide/unhide.
 * Uses features/infrastructure data + api layers.
 */

import { useCallback, useState } from 'react';
import { useToast } from '../../../core/toast/ToastContext';
import { FIELDS } from '../../../features/infrastructure/config';
import {
  updateInfraRecord,
  createInfraRecord,
  getInfraRecord,
} from '../../../features/infrastructure/data';
import * as fbApi from '../../../features/infrastructure/api';
import type { InfraData, InfraProfile } from '../../../features/infrastructure/types';

// =============================================================================
// TYPES
// =============================================================================

export interface SyncLogEntry {
  message: string;
  isError?: boolean;
  isSuccess?: boolean;
}

export interface GenerateTokenState {
  open: boolean;
  bmId: string;
  status: string;
  result: 'pending' | 'success' | 'error' | 'instructions';
  errorMessage: string;
  instructions: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useInfraActions(
  data: InfraData,
  refetchAll: () => Promise<void>
) {
  const toast = useToast();

  // Set Token dialog state
  const [setTokenDialog, setSetTokenDialog] = useState<{ open: boolean; bmId: string; currentToken: string; bmName: string }>({
    open: false, bmId: '', currentToken: '', bmName: '',
  });

  // Generate Token dialog state
  const [generateTokenState, setGenerateTokenState] = useState<GenerateTokenState>({
    open: false, bmId: '', status: '', result: 'pending', errorMessage: '', instructions: '',
  });

  // Sync Progress dialog state
  const [syncDialog, setSyncDialog] = useState<{ open: boolean; profileName: string; logs: SyncLogEntry[]; done: boolean }>({
    open: false, profileName: '', logs: [], done: false,
  });

  // =========================================================================
  // VALIDATE PROFILE TOKEN
  // =========================================================================

  const validateProfileToken = useCallback(async (profileId: string) => {
    const profile = data.profiles.find(p => p.id === profileId);
    if (!profile?.permanentToken) {
      toast.error('No token to validate');
      return;
    }

    toast.info('Checking token...');

    try {
      const result = await fbApi.validateToken(profile.permanentToken);

      const fields: Record<string, unknown> = { [FIELDS.profiles.tokenValid]: result.isValid };

      // Prefer data_access_expires_at if available (for long-lived tokens), otherwise standard expiry
      const expiryDate = result.dataAccessExpiresAt || result.expiresAt;

      if (expiryDate) {
        fields[FIELDS.profiles.permanentTokenEndDate] = expiryDate.toISOString().split('T')[0];
      }

      await updateInfraRecord('profiles', profileId, fields);
      await refetchAll();

      if (result.isValid) {
        const expiryDate = result.dataAccessExpiresAt || result.expiresAt;
        const days = expiryDate
          ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;
        toast.success(days ? `Token valid (${days}d left)` : 'Token valid (never expires)');
      } else {
        toast.error('Token is invalid or expired');
      }
    } catch (err) {
      toast.error('Validation failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [data.profiles, toast, refetchAll]);

  // =========================================================================
  // VALIDATE BM TOKEN
  // =========================================================================

  const validateBMToken = useCallback(async (bmId: string) => {
    const bm = data.bms.find(b => b.id === bmId);
    if (!bm?.systemUserToken) {
      toast.error('No token to validate');
      return;
    }

    toast.info('Checking token...');

    try {
      const result = await fbApi.validateToken(bm.systemUserToken);
      toast[result.isValid ? 'success' : 'error'](
        result.isValid ? 'System User token is valid!' : 'Token is invalid'
      );
    } catch (err) {
      toast.error('Validation failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [data.bms, toast]);

  // =========================================================================
  // REFRESH PROFILE TOKEN
  // =========================================================================

  const refreshProfileToken = useCallback(async (profileId: string) => {
    const profile = data.profiles.find(p => p.id === profileId);
    if (!profile?.permanentToken) {
      toast.error('No token found in this profile');
      return;
    }

    toast.info('Exchanging token for new long-lived token...');

    try {
      const result = await fbApi.exchangeToken(profile.permanentToken);
      const expiryDate = fbApi.calculateExpiryDate(result.expiresIn);
      const days = Math.ceil(result.expiresIn / (60 * 60 * 24));

      await updateInfraRecord('profiles', profileId, {
        [FIELDS.profiles.permanentToken]: result.token,
        [FIELDS.profiles.permanentTokenEndDate]: expiryDate,
        [FIELDS.profiles.tokenValid]: true,
      });

      await refetchAll();
      toast.success(`Token refreshed! Expires in ${days} days`);
    } catch (err) {
      toast.error('Error refreshing token: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [data.profiles, toast, refetchAll]);

  // =========================================================================
  // SET TOKEN DIALOG
  // =========================================================================

  const openSetTokenDialog = useCallback((bmId: string) => {
    const bm = data.bms.find(b => b.id === bmId);
    if (!bm) return;
    setSetTokenDialog({
      open: true,
      bmId,
      currentToken: bm.systemUserToken,
      bmName: bm.bmName || 'Business Manager',
    });
  }, [data.bms]);

  const closeSetTokenDialog = useCallback(() => {
    setSetTokenDialog(prev => ({ ...prev, open: false }));
  }, []);

  const saveSystemUserToken = useCallback(async (bmId: string, token: string) => {
    if (!token.trim()) {
      toast.error('Please enter a token');
      return;
    }

    toast.info('Validating token...');

    try {
      const validation = await fbApi.validateToken(token.trim());
      if (!validation.isValid) {
        toast.error('Invalid token - please check and try again');
        return;
      }

      await updateInfraRecord('bms', bmId, {
        [FIELDS.bms.systemUserToken]: token.trim(),
        [FIELDS.bms.systemUserCreated]: new Date().toISOString(),
      });

      closeSetTokenDialog();
      await refetchAll();
      toast.success('System User token saved!');
    } catch (err) {
      toast.error('Failed to save: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [toast, refetchAll, closeSetTokenDialog]);

  // =========================================================================
  // GENERATE SYSTEM USER TOKEN
  // =========================================================================

  const generateSystemUserToken = useCallback(async (bmId: string) => {
    const bm = data.bms.find(b => b.id === bmId);
    if (!bm || !bm.bmId) {
      toast.error('BM ID not found');
      return;
    }

    const FB = FIELDS.bms;

    const bmName = bm.bmName || 'Business Manager';
    const fbBmId = bm.bmId;

    setGenerateTokenState({
      open: true, bmId, status: 'Finding a profile with admin access...', result: 'pending', errorMessage: '', instructions: '',
    });

    const updateStatus = (status: string) => {
      setGenerateTokenState(prev => ({ ...prev, status }));
    };

    try {
      // Step 1: Find admin profile
      let adminProfile: InfraProfile | null = null;
      let adminToken: string | null = null;

      for (const profileId of bm.linkedProfile) {
        const profile = data.profiles.find(p => p.id === profileId);
        if (!profile?.permanentToken) continue;

        updateStatus(`Checking ${profile.profileName}...`);
        const hasAdmin = await fbApi.checkBMAdminAccess(profile.permanentToken, fbBmId);
        if (hasAdmin) {
          adminProfile = profile;
          adminToken = profile.permanentToken;
          break;
        }
      }

      if (!adminToken || !adminProfile) {
        setGenerateTokenState(prev => ({
          ...prev, result: 'instructions', errorMessage: 'No Admin Profile Found',
          instructions: `None of the linked profiles have ADMIN access to this Business Manager.\n\nTo fix:\n1. Go to Business Settings > People\n2. Add one of your linked profiles as Admin\n3. Run Sync Data on that profile\n4. Try again`,
        }));
        return;
      }

      updateStatus(`Using ${adminProfile.profileName} (ADMIN access confirmed)`);

      // Step 2: Check for existing system users
      updateStatus('Checking for existing System Users...');
      let systemUsers: Array<{ id: string; name: string }> = [];
      try {
        systemUsers = await fbApi.getBMSystemUsers(adminToken, fbBmId);
      } catch { systemUsers = []; }

      let systemUserId = bm.systemUserId;
      let systemUserName = '';

      if (systemUsers.length > 0) {
        const dashboardBot = systemUsers.find(u => u.name?.includes('Dashboard Bot'));
        const chosen = dashboardBot || systemUsers[0];
        systemUserId = chosen.id;
        systemUserName = chosen.name;
        updateStatus(`Found existing System User: ${chosen.name}`);
      } else if (systemUserId) {
        updateStatus(`Using saved System User ID: ${systemUserId}`);
      } else {
        updateStatus('Creating new System User...');
        try {
          const createResult = await fbApi.createSystemUser(adminToken, fbBmId, `Dashboard Bot - ${bmName}`, 'ADMIN');
          systemUserId = createResult.id;
          systemUserName = `Dashboard Bot - ${bmName}`;
          updateStatus(`Created: ${systemUserName}`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setGenerateTokenState(prev => ({
            ...prev, result: 'instructions', errorMessage: 'Cannot Create System User Automatically',
            instructions: `Facebook API error: ${msg}\n\nYou need to create the System User manually:\n1. Go to Business Settings > System Users (BM: ${fbBmId})\n2. Click "Add" and name it "Dashboard Bot - ${bmName}"\n3. Set role to "Admin" and add assets\n4. Generate token with ads_management, ads_read, business_management\n5. Copy and paste using "Paste Token"`,
          }));
          return;
        }
      }

      // Step 4: Generate access token
      updateStatus('Generating access token...');
      let tokenResult: { access_token: string };
      try {
        tokenResult = await fbApi.generateSystemUserAccessToken(adminToken, systemUserId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const isAppNotInBusiness = msg.includes('3953') || msg.includes('does not belong to the business');

        if (isAppNotInBusiness) {
          setGenerateTokenState(prev => ({
            ...prev, result: 'instructions', errorMessage: 'App Not Added to Business Manager',
            instructions: `Your Facebook App needs to be added to this BM first.\n\n1. Go to Business Settings > Apps (BM: ${fbBmId})\n2. Click "Add" > "Connect an app"\n3. Enter App ID: ${import.meta.env.VITE_FB_APP_ID}\n4. Click "Connect"\n5. Try "Generate Token" again`,
          }));
        } else {
          setGenerateTokenState(prev => ({
            ...prev, result: 'error', errorMessage: msg,
          }));
        }
        return;
      }

      // Step 5: Save
      updateStatus('Saving to database...');
      await updateInfraRecord('bms', bmId, {
        [FB.systemUserId]: systemUserId,
        [FB.systemUserToken]: tokenResult.access_token,
        [FB.systemUserCreated]: new Date().toISOString(),
      });

      await refetchAll();

      setGenerateTokenState(prev => ({
        ...prev,
        result: 'success',
        status: `System User Token Generated! (${systemUserName || 'System User'})`,
      }));
    } catch (err) {
      setGenerateTokenState(prev => ({
        ...prev, result: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [data, toast, refetchAll]);

  const closeGenerateTokenDialog = useCallback(() => {
    setGenerateTokenState(prev => ({ ...prev, open: false }));
  }, []);

  // =========================================================================
  // SYNC PROFILE DATA
  // =========================================================================

  const syncProfileData = useCallback(async (profileId: string) => {
    const profile = data.profiles.find(p => p.id === profileId);
    if (!profile?.permanentToken) {
      toast.error('No token available for sync');
      return;
    }

    const FP = FIELDS.profiles;
    const FB = FIELDS.bms;
    const FA = FIELDS.adaccounts;
    const FX = FIELDS.pixels;
    const FG = FIELDS.pages;

    const token = profile.permanentToken;
    const profileName = profile.profileName || 'Profile';
    const logs: SyncLogEntry[] = [];

    setSyncDialog({ open: true, profileName, logs: [{ message: 'Starting sync...' }], done: false });

    const addLog = (message: string, isError = false, isSuccess = false) => {
      logs.push({ message, isError, isSuccess });
      setSyncDialog(prev => ({ ...prev, logs: [...logs] }));
    };

    const bmRecordIdMap: Record<string, string> = {};
    const results = { bms: 0, pages: 0, adAccounts: 0, pixels: 0, errors: 0 };

    try {
      // Step 1: Validate
      addLog('Validating profile...');
      const meData = await fbApi.getMe(token);

      if (profile.profileId !== meData.id || profile.profileName !== meData.name) {
        addLog(`Updating profile: ${meData.name} (${meData.id})`);
        await updateInfraRecord('profiles', profileId, {
          [FP.profileId]: meData.id,
          [FP.profileName]: meData.name,
          [FP.profileStatus]: 'Active',
          [FP.tokenValid]: true,
        });
        addLog(`Profile updated: ${meData.name}`, false, true);
      } else {
        if (profile.profileStatus !== 'Active') {
          await updateInfraRecord('profiles', profileId, {
            [FP.profileStatus]: 'Active',
            [FP.tokenValid]: true,
          });
        }
        addLog(`Profile verified: ${meData.name} (${meData.id})`, false, true);
      }

      // Step 2: Fetch BMs and Pages
      addLog('Fetching Business Managers and Pages...');
      const [fbBms, fbPages] = await Promise.all([
        fbApi.getBusinesses(token),
        fbApi.getPages(token),
      ]);

      addLog(`Found ${fbBms.length} Business Manager(s)`, false, true);
      addLog(`Found ${fbPages.length} Page(s)`, false, true);

      // Step 3: Process BMs
      const statusMap: Record<number, string> = {
        1: 'ACTIVE', 2: 'DISABLED', 3: 'UNSETTLED', 7: 'PENDING_RISK_REVIEW',
        9: 'IN_GRACE_PERIOD', 100: 'PENDING_CLOSURE', 101: 'CLOSED',
      };

      for (const fbBm of fbBms) {
        try {
          addLog(`Processing BM: ${fbBm.name}`);
          const existingBm = data.bms.find(b => b.bmId === fbBm.id);
          let bmRecordId: string;

          if (existingBm) {
            bmRecordId = existingBm.id;
            const freshRecord = await getInfraRecord('bms', existingBm.id);
            const currentLinked: string[] = Array.isArray(freshRecord.fields?.[FB.linkedProfile])
              ? (freshRecord.fields[FB.linkedProfile] as string[])
              : [];
            const needsLink = !currentLinked.includes(profileId);

            const updateFields: Record<string, unknown> = {
              [FB.bmStatus]: fbBm.verification_status || 'Active',
              [FB.verificationStatus]: fbBm.verification_status || 'not_verified',
              [FB.lastSynced]: new Date().toISOString(),
            };

            if (needsLink) {
              updateFields[FB.linkedProfile] = [...currentLinked, profileId];
              addLog(`  + Linking profile to BM`, false, true);
            } else {
              addLog(`  - Already linked`);
            }

            await updateInfraRecord('bms', existingBm.id, updateFields);
          } else {
            const newBm = await createInfraRecord('bms', {
              [FB.bmId]: fbBm.id,
              [FB.bmName]: fbBm.name,
              [FB.bmStatus]: fbBm.verification_status || 'Active',
              [FB.linkedProfile]: [profileId],
            });
            bmRecordId = newBm.id;
            addLog(`  Created new: ${fbBm.name}`, false, true);
          }
          results.bms++;

          bmRecordIdMap[fbBm.id] = bmRecordId;

          // Fetch children
          addLog(`  Fetching Ad Accounts & Pixels...`);
          let fbAdAccs: Awaited<ReturnType<typeof fbApi.getBMAdAccounts>> = [];
          let fbPixels: Awaited<ReturnType<typeof fbApi.getBMPixels>> = [];

          try {
            [fbAdAccs, fbPixels] = await Promise.all([
              fbApi.getBMAdAccounts(token, fbBm.id),
              fbApi.getBMPixels(token, fbBm.id),
            ]);
            addLog(`  Found ${fbAdAccs.length} Ad Acc(s), ${fbPixels.length} Pixel(s)`);
          } catch (e) {
            addLog(`  Error fetching: ${e instanceof Error ? e.message : String(e)}`, true);
            results.errors++;
          }

          // Process Ad Accounts
          for (const fbAdAcc of fbAdAccs) {
            try {
              const adAccId = fbAdAcc.id.replace('act_', '');
              const existing = data.adaccounts.find(a => a.adAccId === adAccId);
              const status = statusMap[fbAdAcc.account_status] || 'Unknown';

              if (existing) {
                const fresh = await getInfraRecord('adaccounts', existing.id);
                const currentLinked: string[] = Array.isArray(fresh.fields?.[FA.linkedBm])
                  ? (fresh.fields[FA.linkedBm] as string[])
                  : [];
                const needsLink = bmRecordId && !currentLinked.includes(bmRecordId);

                const updateFields: Record<string, unknown> = {
                  [FA.adAccStatus]: status,
                  [FA.currency]: fbAdAcc.currency,
                  [FA.amountSpent]: parseFloat(fbAdAcc.amount_spent || '0') / 100,
                  [FA.timezone]: fbAdAcc.timezone_name || '',
                };

                if (needsLink) {
                  updateFields[FA.linkedBm] = [...currentLinked, bmRecordId];
                }

                await updateInfraRecord('adaccounts', existing.id, updateFields);
              } else {
                await createInfraRecord('adaccounts', {
                  [FA.adAccId]: adAccId,
                  [FA.adAccName]: fbAdAcc.name,
                  [FA.adAccStatus]: status,
                  [FA.currency]: fbAdAcc.currency,
                  [FA.amountSpent]: parseFloat(fbAdAcc.amount_spent || '0') / 100,
                  [FA.timezone]: fbAdAcc.timezone_name || '',
                  [FA.linkedBm]: bmRecordId ? [bmRecordId] : [],
                });
                addLog(`    + Ad Acc: ${fbAdAcc.name} (created)`, false, true);
              }
              results.adAccounts++;
            } catch (e) {
              addLog(`    Error: ${e instanceof Error ? e.message : String(e)}`, true);
              results.errors++;
            }
          }

          // Process Pixels
          for (const fbPixel of fbPixels) {
            try {
              const existing = data.pixels.find(p => p.pixelId === fbPixel.id);

              if (existing) {
                const fresh = await getInfraRecord('pixels', existing.id);
                const currentLinked: string[] = Array.isArray(fresh.fields?.[FX.linkedBms])
                  ? (fresh.fields[FX.linkedBms] as string[])
                  : [];
                const needsLink = bmRecordId && !currentLinked.includes(bmRecordId);

                const updateFields: Record<string, unknown> = {
                  [FX.lastFiredTime]: fbPixel.last_fired_time || null,
                  [FX.available]: 'Yes',
                };

                if (needsLink) {
                  updateFields[FX.linkedBms] = [...currentLinked, bmRecordId];
                }

                await updateInfraRecord('pixels', existing.id, updateFields);
              } else {
                await createInfraRecord('pixels', {
                  [FX.pixelId]: fbPixel.id,
                  [FX.pixelName]: fbPixel.name,
                  [FX.lastFiredTime]: fbPixel.last_fired_time || null,
                  [FX.available]: 'Yes',
                  [FX.linkedBms]: bmRecordId ? [bmRecordId] : [],
                  [FX.ownerBm]: bmRecordId ? [bmRecordId] : [],
                });
                addLog(`    + Pixel: ${fbPixel.name} (created)`, false, true);
              }
              results.pixels++;
            } catch (e) {
              addLog(`    Error: ${e instanceof Error ? e.message : String(e)}`, true);
              results.errors++;
            }
          }
        } catch (e) {
          addLog(`  Error: ${e instanceof Error ? e.message : String(e)}`, true);
          results.errors++;
        }
      }

      // Step 4: Process Pages
      addLog('');
      addLog('Processing Pages...');
      for (const fbPage of fbPages) {
        try {
          const existing = data.pages.find(p => p.pageId === fbPage.id);

          if (existing) {
            const fresh = await getInfraRecord('pages', existing.id);
            const currentLinked: string[] = Array.isArray(fresh.fields?.[FG.linkedProfiles])
              ? (fresh.fields[FG.linkedProfiles] as string[])
              : [];
            const needsLink = !currentLinked.includes(profileId);

            const updateFields: Record<string, unknown> = {
              [FG.published]: fbPage.is_published ? 'Published' : 'Unpublished',
              [FG.fanCount]: fbPage.fan_count,
              [FG.pageLink]: fbPage.link,
            };

            if (needsLink) {
              updateFields[FG.linkedProfiles] = [...currentLinked, profileId];
              addLog(`  + Page: ${fbPage.name} (linking)`, false, true);
            }

            await updateInfraRecord('pages', existing.id, updateFields);
          } else {
            await createInfraRecord('pages', {
              [FG.pageId]: fbPage.id,
              [FG.pageName]: fbPage.name,
              [FG.published]: fbPage.is_published ? 'Published' : 'Unpublished',
              [FG.fanCount]: fbPage.fan_count,
              [FG.pageLink]: fbPage.link,
              [FG.linkedProfiles]: [profileId],
            });
            addLog(`  + Page: ${fbPage.name} (created)`, false, true);
          }
          results.pages++;
        } catch (e) {
          addLog(`  Error: ${e instanceof Error ? e.message : String(e)}`, true);
          results.errors++;
        }
      }

      // Step 5: Update last sync
      await updateInfraRecord('profiles', profileId, {
        [FP.lastSync]: new Date().toISOString(),
      });

      await refetchAll();

      addLog('');
      const hasErrors = results.errors > 0;
      addLog(hasErrors ? '=== SYNC COMPLETE (with errors) ===' : '=== SYNC COMPLETE ===', hasErrors, !hasErrors);
      addLog(`BMs: ${results.bms}, Pages: ${results.pages}, Ad Accs: ${results.adAccounts}, Pixels: ${results.pixels}`);
      if (hasErrors) addLog(`Errors: ${results.errors}`, true);

    } catch (err) {
      addLog(`ERROR: ${err instanceof Error ? err.message : String(err)}`, true);
    }

    setSyncDialog(prev => ({ ...prev, done: true }));
  }, [data, toast, refetchAll]);

  const closeSyncDialog = useCallback(() => {
    setSyncDialog(prev => ({ ...prev, open: false }));
  }, []);

  // =========================================================================
  // TOGGLE HIDDEN
  // =========================================================================

  const toggleItemHidden = useCallback(async (type: keyof typeof FIELDS, recordId: string) => {
    const fieldMap: Record<string, string> = {
      profiles: FIELDS.profiles.hidden,
      bms: FIELDS.bms.hidden,
      adaccounts: FIELDS.adaccounts.hidden,
      pages: FIELDS.pages.hidden,
      pixels: FIELDS.pixels.hidden,
    };

    const hiddenField = fieldMap[type];
    if (!hiddenField) return;

    // Find current hidden state
    const lookup: Record<string, Array<{ id: string; hidden: boolean }>> = {
      profiles: data.profiles,
      bms: data.bms,
      adaccounts: data.adaccounts,
      pages: data.pages,
      pixels: data.pixels,
    };

    const record = lookup[type]?.find(r => r.id === recordId);
    if (!record) return;

    try {
      await updateInfraRecord(type as 'profiles' | 'bms' | 'adaccounts' | 'pages' | 'pixels', recordId, {
        [hiddenField]: !record.hidden,
      });
      await refetchAll();
      toast.success(record.hidden ? 'Item unhidden' : 'Item hidden');
    } catch (err) {
      toast.error('Failed to update: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [data, toast, refetchAll]);

  const updateProfileSetup = useCallback(async (profileId: string, updates: Partial<InfraProfile>) => {
    try {
      const fieldMap: Partial<Record<keyof InfraProfile, string>> = FIELDS.profiles;
      const airtableUpdates: Record<string, unknown> = {};

      Object.entries(updates).forEach(([key, value]) => {
        const fieldName = fieldMap[key as keyof InfraProfile];
        if (fieldName && value !== '') {
          airtableUpdates[fieldName] = value;
        }
      });

      if (Object.keys(airtableUpdates).length > 0) {
        await updateInfraRecord('profiles', profileId, airtableUpdates);
        await refetchAll();
        toast.success('Profile setup updated');
      }
    } catch (err) {
      toast.error('Failed to update profile: ' + (err instanceof Error ? err.message : String(err)));
      throw err;
    }
  }, [refetchAll, toast]);

  return {
    validateProfileToken,
    validateBMToken,
    refreshProfileToken,
    openSetTokenDialog,
    closeSetTokenDialog,
    saveSystemUserToken,
    setTokenDialog,
    generateSystemUserToken,
    closeGenerateTokenDialog,
    generateTokenState,
    syncProfileData,
    closeSyncDialog,
    syncDialog,
    toggleItemHidden,
    updateProfileSetup,
  };
}
