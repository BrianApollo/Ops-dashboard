/**
 * Infrastructure Page - Top-level orchestrator
 *
 * Composes the data controller, tree state, and actions hooks.
 * Renders the full interactive tree visualization.
 */

import { Box } from '@mui/material';
import { useInfrastructureController } from '../../../features/infrastructure/useInfrastructureController';
import { LoadingState } from '../../../core/state';
import { ErrorState } from '../../../core/state';
import { useTreeState } from './useTreeState';
import { useInfraActions } from './useInfraActions';
import { TreeCanvas } from './components/TreeCanvas';
import { SetTokenDialog } from './dialogs/SetTokenDialog';
import { GenerateTokenDialog } from './dialogs/GenerateTokenDialog';
import { SyncProgressDialog } from './dialogs/SyncProgressDialog';
import { FacebookLoginButton } from './components/FacebookLoginButton';

export function InfrastructurePage() {
  const { data, isLoading, error, refetchAll } = useInfrastructureController();

  const treeState = useTreeState(data);
  const actions = useInfraActions(data, refetchAll);

  if (isLoading) {
    return <LoadingState message="Loading infrastructure..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load infrastructure"
        message={error instanceof Error ? error.message : 'Unknown error'}
        onRetry={refetchAll}
      />
    );
  }

  return (
    <Box
      sx={{
        // Full-bleed: cancel OpsLayout p:3 (24px) padding
        mx: -3,
        mt: -3,
        mb: -3,
        height: 'calc(100vh - 64px)', // subtract header height
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid', borderColor: 'divider' }}>
        <FacebookLoginButton />
      </Box>

      <TreeCanvas
        data={data}
        connections={treeState.connections}
        selectedNode={treeState.selectedNode}
        connectedNodeKeys={treeState.connectedNodeKeys}
        highlightedConnectionKeys={treeState.highlightedConnectionKeys}
        connectedByType={treeState.connectedByType}
        treeFilters={treeState.treeFilters}
        expandedHiddenSections={treeState.expandedHiddenSections}
        visibility={treeState.visibility}
        onSelectNode={treeState.selectNode}
        onClearSelection={treeState.clearSelection}
        onToggleHidden={treeState.toggleHiddenSection}
        onToggleFilter={treeState.toggleFilter}
        onFilterSelectAll={treeState.filterSelectAll}
        onFilterClearAll={treeState.filterClearAll}
        onValidateProfileToken={actions.validateProfileToken}
        onValidateBMToken={actions.validateBMToken}
        onRefreshProfileToken={actions.refreshProfileToken}
        onSyncProfileData={actions.syncProfileData}
        onGenerateToken={actions.generateSystemUserToken}
        onPasteToken={actions.openSetTokenDialog}
        onToggleItemHidden={actions.toggleItemHidden}
        onUpdateProfile={actions.updateProfileSetup}
      />

      {/* Dialogs */}
      <SetTokenDialog
        open={actions.setTokenDialog.open}
        bmName={actions.setTokenDialog.bmName}
        currentToken={actions.setTokenDialog.currentToken}
        onSave={(token) => actions.saveSystemUserToken(actions.setTokenDialog.bmId, token)}
        onClose={actions.closeSetTokenDialog}
      />

      <GenerateTokenDialog
        state={actions.generateTokenState}
        onClose={actions.closeGenerateTokenDialog}
      />

      <SyncProgressDialog
        open={actions.syncDialog.open}
        profileName={actions.syncDialog.profileName}
        logs={actions.syncDialog.logs}
        done={actions.syncDialog.done}
        onClose={actions.closeSyncDialog}
      />
    </Box>
  );
}
