#!/bin/bash

# List of files to check
declare -a POTENTIALLY_ORPHANED=(
  "core/form/useFormState.ts"
  "core/permissions/opsRoles.ts"
  "core/bulk/BulkActionBar.tsx"
  "core/dialog/ConfirmDialog.tsx"
  "core/form/DraftIndicator.tsx"
  "core/form/FormField.tsx"
  "core/list/FilterPills.tsx"
  "core/list/ListPagination.tsx"
  "core/list/ListTableView.tsx"
  "core/list/ListToolbar.tsx"
  "core/list/useListController.ts"
  "core/modals/useModal.ts"
  "core/panel/DetailActions.tsx"
  "core/panel/DetailContent.tsx"
  "core/panel/DetailHeader.tsx"
  "core/panel/DetailMedia.tsx"
  "core/panel/DetailNotes.tsx"
  "core/panel/DetailPanel.tsx"
  "core/panel/DetailPills.tsx"
  "core/panel/DetailSection.tsx"
  "core/panel/SlideInPanelHeader.tsx"
  "core/permissions/Can.tsx"
  "core/permissions/usePermissions.ts"
  "core/readonly/ReadOnlyBanner.tsx"
  "core/state/EmptyState.tsx"
  "core/state/ErrorState.tsx"
  "core/state/LoadingState.tsx"
  "core/status/ReadinessIndicator.tsx"
  "core/status/StatusCard.tsx"
  "core/storage/cloudflare/upload.ts"
  "core/toast/ToastContext.tsx"
  "domains/ops/campaigns/launch/FinalCheckColumn.tsx"
  "domains/ops/campaigns/launch/LaunchCompletionView.tsx"
  "domains/ops/campaigns/launch/LaunchProgressView.tsx"
  "domains/ops/campaigns/launch/prelaunch/CreativesColumn.tsx"
  "domains/ops/campaigns/launch/prelaunch/useLaunchAutoSave.ts"
  "domains/ops/campaigns/launch/prelaunch/useLaunchDraftState.ts"
  "domains/ops/campaigns/launch/prelaunch/useLaunchFacebookInfra.ts"
  "domains/ops/campaigns/launch/prelaunch/useLaunchMediaState.ts"
  "domains/ops/campaigns/launch/prelaunch/useLaunchRedtrack.ts"
  "domains/ops/campaigns/launch/prelaunch/useLaunchSelectionState.ts"
  "domains/ops/campaigns/launch/prelaunch/useLaunchValidation.ts"
  "domains/ops/campaigns/launch/postlaunch/writeLaunchSnapshot.ts"
  "domains/ops/campaigns/launch/launch/useRunLaunchPipeline.ts"
  "domains/ops/campaigns/launch/useLaunchExecution.ts"
)

ORPHANED=()

for file in "${POTENTIALLY_ORPHANED[@]}"; do
  # Get the base name without extension for searching
  base=$(basename "$file" .tsx)
  base=$(basename "$base" .ts)
  
  # Special case: files that might be imported via a different name
  case "$file" in
    "core/form/useFormState.ts") search_term="useFormState" ;;
    "core/permissions/opsRoles.ts") search_term="opsRoles" ;;
    "core/storage/cloudflare/upload.ts") search_term="uploadFile\|deleteFile\|buildPublicUrl" ;;
    "domains/ops/campaigns/launch/postlaunch/writeLaunchSnapshot.ts") search_term="writeLaunchSnapshot" ;;
    "domains/ops/campaigns/launch/launch/useRunLaunchPipeline.ts") search_term="useRunLaunchPipeline" ;;
    *) search_term="$base" ;;
  esac
  
  # Count matches
  count=$(grep -r "$search_term" . --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
  
  if [ "$count" -eq 0 ] || ([ "$count" -eq 1 ] && [ "$base" != "useFormState" ]); then
    ORPHANED+=("$file")
  fi
done

echo "=== ORPHANED FILES (NO IMPORTS FOUND) ==="
echo ""
for file in "${ORPHANED[@]}"; do
  echo "$file"
done

echo ""
echo "Total orphaned: ${#ORPHANED[@]}"
