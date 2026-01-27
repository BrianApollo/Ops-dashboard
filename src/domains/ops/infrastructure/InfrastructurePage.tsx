/**
 * Infrastructure Page
 *
 * Read-only view of Facebook infrastructure health.
 * Shows Tokens, Ad Accounts, Pages, Pixels.
 */

import { Box, Typography, Paper, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help';

// =============================================================================
// MOCK DATA
// =============================================================================

type InfraStatus = 'active' | 'disabled' | 'unknown';

const MOCK_TOKENS: Array<{ id: string; name: string; status: InfraStatus; lastSync: string }> = [
  { id: '1', name: 'Main System Token', status: 'active', lastSync: '2 hours ago' },
  { id: '2', name: 'Backup Token', status: 'active', lastSync: '2 hours ago' },
];

const MOCK_AD_ACCOUNTS: Array<{ id: string; name: string; accountId: string; status: InfraStatus; lastSync: string }> = [
  { id: '1', name: 'Primary Ad Account', accountId: 'act_123456789', status: 'active', lastSync: '1 hour ago' },
  { id: '2', name: 'Secondary Ad Account', accountId: 'act_987654321', status: 'active', lastSync: '1 hour ago' },
  { id: '3', name: 'Test Account', accountId: 'act_111222333', status: 'disabled', lastSync: '3 days ago' },
];

const MOCK_PAGES: Array<{ id: string; name: string; pageId: string; status: InfraStatus; lastSync: string }> = [
  { id: '1', name: 'Brand Main Page', pageId: '123456789', status: 'active', lastSync: '30 minutes ago' },
  { id: '2', name: 'Product Launch Page', pageId: '987654321', status: 'active', lastSync: '30 minutes ago' },
];

const MOCK_PIXELS: Array<{ id: string; name: string; pixelId: string; status: InfraStatus; lastSync: string }> = [
  { id: '1', name: 'Main Conversion Pixel', pixelId: 'px_123456', status: 'active', lastSync: '15 minutes ago' },
  { id: '2', name: 'Retargeting Pixel', pixelId: 'px_789012', status: 'unknown', lastSync: 'Never' },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface StatusChipProps {
  status: 'active' | 'disabled' | 'unknown';
}

function StatusChip({ status }: StatusChipProps) {
  const config = {
    active: { label: 'Active', color: '#065f46', bg: '#d1fae5', icon: CheckCircleIcon },
    disabled: { label: 'Disabled', color: '#991b1b', bg: '#fee2e2', icon: ErrorIcon },
    unknown: { label: 'Unknown', color: '#6b7280', bg: '#f3f4f6', icon: HelpIcon },
  }[status];

  const Icon = config.icon;

  return (
    <Chip
      size="small"
      icon={<Icon sx={{ fontSize: 14, color: `${config.color} !important` }} />}
      label={config.label}
      sx={{
        bgcolor: config.bg,
        color: config.color,
        fontWeight: 500,
        fontSize: 12,
      }}
    />
  );
}

interface InfrastructureSectionProps {
  title: string;
  items: Array<{
    id: string;
    name: string;
    status: InfraStatus;
    lastSync: string;
    [key: string]: string | InfraStatus;
  }>;
  idField?: string;
}

function InfrastructureSection({ title, items, idField }: InfrastructureSectionProps) {
  return (
    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', mb: 3 }}>
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e5e7eb' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
      </Box>
      <Box>
        {items.map((item, index) => (
          <Box
            key={item.id}
            sx={{
              px: 3,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: index < items.length - 1 ? '1px solid #e5e7eb' : 'none',
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {item.name}
              </Typography>
              {idField && item[idField] && (
                <Typography variant="caption" color="text.secondary">
                  {item[idField]}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  Last Sync
                </Typography>
                <Typography variant="body2" sx={{ fontSize: 12 }}>
                  {item.lastSync}
                </Typography>
              </Box>
              <StatusChip status={item.status as 'active' | 'disabled' | 'unknown'} />
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export function InfrastructurePage() {
  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Infrastructure
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Facebook platform health overview (read-only)
        </Typography>
      </Box>

      {/* Sections */}
      <InfrastructureSection title="Tokens" items={MOCK_TOKENS} />
      <InfrastructureSection title="Ad Accounts" items={MOCK_AD_ACCOUNTS} idField="accountId" />
      <InfrastructureSection title="Pages" items={MOCK_PAGES} idField="pageId" />
      <InfrastructureSection title="Pixels" items={MOCK_PIXELS} idField="pixelId" />

      {/* Info Note */}
      <Box sx={{ mt: 4, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Infrastructure is managed separately from product workflows. No editing available here.
        </Typography>
      </Box>
    </Box>
  );
}
