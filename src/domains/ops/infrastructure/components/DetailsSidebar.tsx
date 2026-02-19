/**
 * DetailsSidebar - Right panel showing entity details, actions, and connected items.
 */

import { useState } from 'react';
import {
  Box, Typography, Button, LinearProgress, IconButton, Collapse, Link,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import KeyIcon from '@mui/icons-material/Key';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WebIcon from '@mui/icons-material/Web';
import GridViewIcon from '@mui/icons-material/GridView';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import { SidebarSection } from './SidebarSection';
import { SetupInfoDialog } from './SetupInfoDialog';
import { getStatusBadgeClass } from '../useTreeState';
import type {
  SelectedNode, InfraData, ConnectedByType, EntityType,
  InfraProfile, InfraBM, InfraAdAccount, InfraPage, InfraPixel,
} from '../../../../features/infrastructure/types';

interface DetailsSidebarProps {
  selectedNode: SelectedNode;
  data: InfraData;
  connectedByType: ConnectedByType;
  onValidateProfileToken: (id: string) => void;
  onValidateBMToken: (id: string) => void;
  onRefreshProfileToken: (id: string) => void;
  onSyncProfileData: (id: string) => void;
  onGenerateToken: (id: string) => void;
  onPasteToken: (id: string) => void;
  onToggleHidden: (type: EntityType, id: string) => void;
  onUpdateProfile: (id: string, updates: Partial<InfraProfile>) => Promise<void>;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DetailsSidebar({
  selectedNode,
  data,
  connectedByType,
  onValidateProfileToken,
  onValidateBMToken,
  onRefreshProfileToken,
  onSyncProfileData,
  onGenerateToken,
  onPasteToken,
  onToggleHidden,
  onUpdateProfile,
}: DetailsSidebarProps) {
  const { type, id } = selectedNode;

  const record = (data[type] as Array<{ id: string }>).find(r => r.id === id);
  if (!record) return null;

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        bgcolor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'divider',
      }}
    >
      {type === 'profiles' && <ProfileSidebar record={record as InfraProfile} connectedByType={connectedByType} onValidate={onValidateProfileToken} onRefresh={onRefreshProfileToken} onSync={onSyncProfileData} onToggleHidden={onToggleHidden} onUpdateProfile={onUpdateProfile} />}
      {type === 'bms' && <BMSidebar record={record as InfraBM} connectedByType={connectedByType} onValidate={onValidateBMToken} onGenerate={onGenerateToken} onPaste={onPasteToken} onToggleHidden={onToggleHidden} />}
      {type === 'adaccounts' && <AdAccountSidebar record={record as InfraAdAccount} connectedByType={connectedByType} onToggleHidden={onToggleHidden} />}
      {type === 'pages' && <PageSidebar record={record as InfraPage} connectedByType={connectedByType} onToggleHidden={onToggleHidden} />}
      {type === 'pixels' && <PixelSidebar record={record as InfraPixel} connectedByType={connectedByType} onToggleHidden={onToggleHidden} />}
    </Box>
  );
}

// =============================================================================
// SHARED HELPERS
// =============================================================================

function AvatarHeader({ name, entityId, lastSync, statusRing, hidden }: {
  name: string; entityId: string; lastSync: string; statusRing?: 'danger' | 'warning' | ''; hidden: boolean;
}) {
  const theme = useTheme();
  const parts = (name || 'NA').split(' ').filter(n => n.length > 0);
  const initials = parts.map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';

  const ringColor = statusRing === 'danger' ? theme.palette.error.main
    : statusRing === 'warning' ? theme.palette.warning.main
      : undefined;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, pt: 2, pb: 1 }}>
      <Box sx={{ position: 'relative' }}>
        {ringColor && (
          <Box sx={{
            position: 'absolute', inset: -3, borderRadius: '50%',
            border: '2px solid', borderColor: ringColor,
          }} />
        )}
        <Box sx={{
          width: 40, height: 40, borderRadius: '50%',
          bgcolor: alpha(theme.palette.primary.main, 0.15),
          color: 'primary.main', fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {initials}
        </Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </Typography>
          {hidden && (
            <Typography variant="caption" sx={{
              bgcolor: alpha(theme.palette.warning.main, 0.15), color: 'warning.main',
              px: 0.75, py: 0.125, borderRadius: 0.5, fontSize: 10, fontWeight: 600,
            }}>
              Hidden
            </Typography>
          )}
        </Box>
        <Typography
          variant="caption"
          onClick={() => copyToClipboard(entityId)}
          sx={{ cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
        >
          {entityId || 'N/A'}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontSize: 11 }}>
          {lastSync ? new Date(lastSync).toLocaleString() : 'Not synced'}
        </Typography>
      </Box>
    </Box>
  );
}

function StatusBadge({ status }: { status: string }) {
  const theme = useTheme();
  const cls = getStatusBadgeClass(status);
  const colorMap = {
    active: theme.palette.success, disabled: theme.palette.error,
    pending: theme.palette.warning, unknown: { main: theme.palette.grey[500] },
  };
  const color = colorMap[cls];

  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1, py: 0.375, borderRadius: 1,
      bgcolor: alpha(color.main, 0.1), color: color.main, fontSize: 12, fontWeight: 600,
    }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color.main }} />
      {status || 'Unknown'}
    </Box>
  );
}

function buildSidebarItems<T extends { id: string }>(
  items: T[],
  nameField: keyof T,
  statusField: keyof T,
  badge: string,
) {
  return items.map(item => ({
    id: item.id,
    name: String(item[nameField] || 'Unnamed'),
    status: String(item[statusField] || 'Unknown'),
    badge,
  }));
}

function ConnectedSections({ connectedByType, excludeType }: { connectedByType: ConnectedByType; excludeType: EntityType }) {
  return (
    <>
      {excludeType !== 'profiles' && connectedByType.profiles.length > 0 && (
        <SidebarSection title="Profiles" icon={<PersonIcon />} items={buildSidebarItems(connectedByType.profiles as InfraProfile[], 'profileName', 'profileStatus', 'PR')} />
      )}
      {excludeType !== 'bms' && connectedByType.bms.length > 0 && (
        <SidebarSection title="Business Managers" icon={<BusinessIcon />} items={buildSidebarItems(connectedByType.bms as InfraBM[], 'bmName', 'bmStatus', 'BM')} />
      )}
      {excludeType !== 'adaccounts' && connectedByType.adaccounts.length > 0 && (
        <SidebarSection title="Ad Accounts" icon={<AttachMoneyIcon />} items={buildSidebarItems(connectedByType.adaccounts as InfraAdAccount[], 'adAccName', 'adAccStatus', 'AA')} />
      )}
      {excludeType !== 'pages' && connectedByType.pages.length > 0 && (
        <SidebarSection title="Pages" icon={<WebIcon />} items={buildSidebarItems(connectedByType.pages as InfraPage[], 'pageName', 'published', 'PG')} />
      )}
      {excludeType !== 'pixels' && connectedByType.pixels.length > 0 && (
        <SidebarSection title="Pixels" icon={<GridViewIcon />} items={buildSidebarItems(connectedByType.pixels as InfraPixel[], 'pixelName', 'available', 'PX')} />
      )}
    </>
  );
}

// =============================================================================
// PROFILE SIDEBAR
// =============================================================================

function ProfileSidebar({ record, connectedByType, onValidate, onRefresh, onSync, onToggleHidden, onUpdateProfile }: {
  record: InfraProfile; connectedByType: ConnectedByType;
  onValidate: (id: string) => void; onRefresh: (id: string) => void; onSync: (id: string) => void;
  onToggleHidden: (type: EntityType, id: string) => void;
  onUpdateProfile: (id: string, updates: Partial<InfraProfile>) => Promise<void>;
}) {
  const theme = useTheme();
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupEditOpen, setSetupEditOpen] = useState(false);

  const handleUpdateProfile = async (id: string, updates: Partial<InfraProfile>) => {
    await onUpdateProfile(id, updates);
    setSetupEditOpen(false);
  };

  // Token health
  let healthPercent = 0;
  let healthColor = theme.palette.grey[500];
  let daysText = 'No token';
  let ringClass: 'danger' | 'warning' | '' = '';

  if (record.permanentTokenEndDate) {
    const endDate = new Date(record.permanentTokenEndDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const maxDays = 60;

    if (daysUntilExpiry < 0) {
      healthPercent = 0; healthColor = theme.palette.error.main;
      daysText = `Expired ${Math.abs(daysUntilExpiry)}d ago`; ringClass = 'danger';
    } else if (daysUntilExpiry <= 7) {
      healthPercent = Math.max(5, (daysUntilExpiry / maxDays) * 100);
      healthColor = theme.palette.error.main;
      daysText = `${daysUntilExpiry} days remaining`; ringClass = 'danger';
    } else if (daysUntilExpiry <= 14) {
      healthPercent = (daysUntilExpiry / maxDays) * 100;
      healthColor = theme.palette.warning.main;
      daysText = `${daysUntilExpiry} days remaining`; ringClass = 'warning';
    } else {
      healthPercent = Math.min(100, (daysUntilExpiry / maxDays) * 100);
      healthColor = theme.palette.success.main;
      daysText = `${daysUntilExpiry} days remaining`; ringClass = '';
    }
  }

  // Setup fields
  const setupFields = [
    { label: 'Email', value: record.profileEmail },
    { label: 'Birth Date', value: record.profileBirthDate },
    { label: 'Profile Link', value: record.profileLink, isLink: true },
    { label: 'FB Password', value: record.profileFbPassword, isPassword: true },
    { label: 'Email Password', value: record.profileEmailPassword, isPassword: true },
    { label: '2FA', value: record.profile2fa },
    { label: 'Review Date', value: record.profileReviewDate },
    { label: 'Security Email', value: record.profileSecurityEmail },
    { label: 'Security Email Pwd', value: record.securityEmailPassword, isPassword: true },
    { label: 'Proxy', value: record.proxy },
    { label: 'YouTube Handle', value: record.profileYoutubeHandle },
    { label: 'UID', value: record.uid },
  ].filter(f => f.value);

  return (
    <Box>
      <AvatarHeader name={record.profileName} entityId={record.profileId} lastSync={record.lastSync} statusRing={ringClass} hidden={record.hidden} />

      {/* Token health bar */}
      <Box sx={{ px: 2, py: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 500 }}>Token Status</Typography>
          <Typography variant="caption" sx={{ color: healthColor, fontWeight: 600 }}>{daysText}</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={healthPercent}
          sx={{
            height: 6, borderRadius: 3,
            bgcolor: alpha(healthColor, 0.15),
            '& .MuiLinearProgress-bar': { bgcolor: healthColor, borderRadius: 3 },
          }}
        />
      </Box>

      {/* Status + Check Token */}
      <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <StatusBadge status={record.profileStatus} />
        {record.permanentToken && (
          <Button size="small" variant="outlined" onClick={() => onValidate(record.id)} sx={{ fontSize: 11, py: 0.25, textTransform: 'none' }}>
            Check Token
          </Button>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ px: 2, py: 1, display: 'flex', gap: 1 }}>
        <Button size="small" variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 14 }} />} onClick={() => onRefresh(record.id)} sx={{ flex: 1, fontSize: 12, textTransform: 'none' }}>
          Refresh
        </Button>
        {record.permanentToken && (
          <Button size="small" variant="contained" startIcon={<SyncIcon sx={{ fontSize: 14 }} />} onClick={() => onSync(record.id)} sx={{ flex: 1, fontSize: 12, textTransform: 'none' }}>
            Sync Data
          </Button>
        )}
      </Box>

      {/* Setup Information */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2, py: 1.5,
            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.03) },
          }}
        >
          <Box
            onClick={() => setSetupOpen(!setupOpen)}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', flex: 1 }}
          >
            <SettingsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>Setup Information</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSetupEditOpen(true); }} sx={{ p: 0.5 }}>
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <Box onClick={() => setSetupOpen(!setupOpen)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary', transform: setupOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
            </Box>
          </Box>
        </Box>
        <Collapse in={setupOpen}>
          <Box sx={{ px: 2, pb: 1.5 }}>
            {setupFields.length > 0 ? (
              setupFields.map((field, idx) => (
                <SetupRow key={idx} label={field.label} value={field.value} isPassword={field.isPassword} isLink={field.isLink} />
              ))
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>No setup details available</Typography>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Dialogs */}
      <SetupInfoDialog
        open={setupEditOpen}
        profile={record}
        onClose={() => setSetupEditOpen(false)}
        onSave={handleUpdateProfile}
      />

      <ConnectedSections connectedByType={connectedByType} excludeType="profiles" />

      {/* Bottom action */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button fullWidth size="small" variant="outlined" onClick={() => onToggleHidden('profiles', record.id)} sx={{ textTransform: 'none' }}>
          {record.hidden ? 'Unhide Profile' : 'Hide Profile'}
        </Button>
      </Box>
    </Box>
  );
}

function SetupRow({ label, value, isPassword, isLink }: { label: string; value: string; isPassword?: boolean; isLink?: boolean }) {
  const [visible, setVisible] = useState(false);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, flexShrink: 0 }}>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
        {isPassword ? (
          <>
            <Typography variant="caption" sx={{ fontSize: 11, fontFamily: 'monospace' }}>
              {visible ? value : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
            </Typography>
            <IconButton size="small" onClick={() => setVisible(!visible)} sx={{ p: 0.25 }}>
              {visible ? <VisibilityOffIcon sx={{ fontSize: 12 }} /> : <VisibilityIcon sx={{ fontSize: 12 }} />}
            </IconButton>
          </>
        ) : isLink ? (
          <Link href={value} target="_blank" rel="noopener" variant="caption" sx={{ fontSize: 11 }}>
            View Link
          </Link>
        ) : (
          <Typography variant="caption" sx={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value}
          </Typography>
        )}
        <IconButton size="small" onClick={() => copyToClipboard(value)} sx={{ p: 0.25 }}>
          <ContentCopyIcon sx={{ fontSize: 11 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

// =============================================================================
// BM SIDEBAR
// =============================================================================


function BMSidebar({ record, connectedByType, onValidate, onGenerate, onPaste, onToggleHidden }: {
  record: InfraBM; connectedByType: ConnectedByType;
  onValidate: (id: string) => void; onGenerate: (id: string) => void; onPaste: (id: string) => void;
  onToggleHidden: (type: EntityType, id: string) => void;
}) {
  const theme = useTheme();
  const hasToken = !!record.systemUserToken;

  return (
    <Box>
      <AvatarHeader name={record.bmName} entityId={record.bmId} lastSync={record.lastSynced} statusRing={hasToken ? '' : 'danger'} hidden={record.hidden} />

      {/* System User Token bar */}
      <Box sx={{ px: 2, py: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 500 }}>System User Token</Typography>
          <Typography variant="caption" sx={{ color: hasToken ? theme.palette.success.main : theme.palette.error.main, fontWeight: 600 }}>
            {hasToken ? 'Configured' : 'Not Set'}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={hasToken ? 100 : 0}
          sx={{
            height: 6, borderRadius: 3,
            bgcolor: alpha(hasToken ? theme.palette.success.main : theme.palette.error.main, 0.15),
            '& .MuiLinearProgress-bar': { bgcolor: hasToken ? theme.palette.success.main : theme.palette.error.main, borderRadius: 3 },
          }}
        />
      </Box>

      {/* Status + Check Token */}
      <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <StatusBadge status={record.bmStatus} />
        {hasToken && (
          <Button size="small" variant="outlined" onClick={() => onValidate(record.id)} sx={{ fontSize: 11, py: 0.25, textTransform: 'none' }}>
            Check Token
          </Button>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ px: 2, py: 1, display: 'flex', gap: 1 }}>
        <Button
          size="small"
          variant={hasToken ? 'outlined' : 'contained'}
          startIcon={<KeyIcon sx={{ fontSize: 14 }} />}
          onClick={() => onGenerate(record.id)}
          sx={{ flex: 1, fontSize: 12, textTransform: 'none' }}
        >
          {hasToken ? 'Regenerate' : 'Generate Token'}
        </Button>
        <Button size="small" variant="outlined" startIcon={<EditIcon sx={{ fontSize: 14 }} />} onClick={() => onPaste(record.id)} sx={{ flex: 1, fontSize: 12, textTransform: 'none' }}>
          Paste Token
        </Button>
      </Box>

      {/* Details */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
        <SidebarSection
          title="Details"
          icon={<SettingsIcon />}
          items={[
            record.verificationStatus && { id: 'verification', name: record.verificationStatus, status: record.verificationStatus, badge: 'VR' },
            record.systemUserId && { id: 'sysuser', name: `ID: ${record.systemUserId}`, status: 'Active', badge: 'SU' },
            hasToken && { id: 'token', name: `${record.systemUserToken.substring(0, 25)}...`, status: 'Active', badge: 'TK' },
          ].filter(Boolean) as Array<{ id: string; name: string; status: string; badge: string }>}
        />
      </Box>

      <ConnectedSections connectedByType={connectedByType} excludeType="bms" />

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button fullWidth size="small" variant="outlined" onClick={() => onToggleHidden('bms', record.id)} sx={{ textTransform: 'none' }}>
          {record.hidden ? 'Unhide' : 'Hide'}
        </Button>
      </Box>
    </Box>
  );
}

// =============================================================================
// AD ACCOUNT SIDEBAR
// =============================================================================

function AdAccountSidebar({ record, connectedByType, onToggleHidden }: {
  record: InfraAdAccount; connectedByType: ConnectedByType;
  onToggleHidden: (type: EntityType, id: string) => void;
}) {
  const theme = useTheme();

  return (
    <Box>
      <AvatarHeader name={record.adAccName} entityId={record.adAccId} lastSync={record.lastSynced} hidden={record.hidden} />

      <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <StatusBadge status={record.adAccStatus} />
        {record.currency && (
          <Typography variant="caption" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', px: 1, py: 0.25, borderRadius: 1, fontWeight: 600, fontSize: 11 }}>
            {record.currency}
          </Typography>
        )}
        {record.timezone && (
          <Typography variant="caption" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', px: 1, py: 0.25, borderRadius: 1, fontWeight: 600, fontSize: 11 }}>
            {record.timezone}
          </Typography>
        )}
      </Box>

      <ConnectedSections connectedByType={connectedByType} excludeType="adaccounts" />

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button fullWidth size="small" variant="outlined" onClick={() => onToggleHidden('adaccounts', record.id)} sx={{ textTransform: 'none' }}>
          {record.hidden ? 'Unhide' : 'Hide'}
        </Button>
      </Box>
    </Box>
  );
}

// =============================================================================
// PAGE SIDEBAR
// =============================================================================

function PageSidebar({ record, connectedByType, onToggleHidden }: {
  record: InfraPage; connectedByType: ConnectedByType;
  onToggleHidden: (type: EntityType, id: string) => void;
}) {
  return (
    <Box>
      <AvatarHeader name={record.pageName} entityId={record.pageId} lastSync={record.lastSynced} hidden={record.hidden} />

      <Box sx={{ px: 2, pb: 1 }}>
        <StatusBadge status={record.published || 'Unknown'} />
      </Box>

      {record.pageLink && (
        <Box sx={{ px: 2, py: 1 }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            onClick={() => window.open(record.pageLink, '_blank')}
            sx={{ fontSize: 12, textTransform: 'none' }}
          >
            View Page
          </Button>
        </Box>
      )}

      <ConnectedSections connectedByType={connectedByType} excludeType="pages" />

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button fullWidth size="small" variant="outlined" onClick={() => onToggleHidden('pages', record.id)} sx={{ textTransform: 'none' }}>
          {record.hidden ? 'Unhide' : 'Hide'}
        </Button>
      </Box>
    </Box>
  );
}

// =============================================================================
// PIXEL SIDEBAR
// =============================================================================

function PixelSidebar({ record, connectedByType, onToggleHidden }: {
  record: InfraPixel; connectedByType: ConnectedByType;
  onToggleHidden: (type: EntityType, id: string) => void;
}) {
  return (
    <Box>
      <AvatarHeader name={record.pixelName} entityId={record.pixelId} lastSync={record.lastSynced} hidden={record.hidden} />

      <Box sx={{ px: 2, pb: 1 }}>
        <StatusBadge status={record.available || 'Unknown'} />
      </Box>

      <SidebarSection
        title="Pixel Details"
        icon={<GridViewIcon />}
        items={[
          { id: 'status', name: record.available || 'Unknown', status: record.available || 'Unknown', badge: 'ST' },
          { id: 'lastFired', name: record.lastFiredTime ? new Date(record.lastFiredTime).toLocaleString() : 'Never', status: record.lastFiredTime ? 'Active' : 'Unknown', badge: 'LF' },
        ]}
      />

      <ConnectedSections connectedByType={connectedByType} excludeType="pixels" />

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button fullWidth size="small" variant="outlined" onClick={() => onToggleHidden('pixels', record.id)} sx={{ textTransform: 'none' }}>
          {record.hidden ? 'Unhide' : 'Hide'}
        </Button>
      </Box>
    </Box>
  );
}
