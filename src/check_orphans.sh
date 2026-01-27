#!/bin/bash

# List of all files we need to check
declare -a files=(
"core/auth/AuthContext.tsx"
"core/auth/AuthGuard.tsx"
"core/auth/index.ts"
"core/bulk/BulkActionBar.tsx"
"core/bulk/index.ts"
"core/bulk/useBulkActions.ts"
"core/data/airtable-throttle.ts"
"core/data/query-client.ts"
"core/dialog/AppDialog.tsx"
"core/dialog/ConfirmDialog.tsx"
"core/dialog/index.ts"
"core/form/DraftIndicator.tsx"
"core/form/FormField.tsx"
"core/form/index.ts"
"core/form/useDraftState.ts"
"core/form/useFormState.ts"
"core/list/FilterPills.tsx"
"core/list/index.ts"
"core/list/ListPagination.tsx"
"core/list/ListTableView.tsx"
"core/list/ListToolbar.tsx"
"core/list/useListController.ts"
"core/modals/index.ts"
"core/modals/ModalProvider.tsx"
"core/modals/types.ts"
"core/modals/useModal.ts"
"core/panel/DetailActions.tsx"
"core/panel/DetailContent.tsx"
"core/panel/DetailHeader.tsx"
"core/panel/DetailMedia.tsx"
"core/panel/DetailNotes.tsx"
"core/panel/DetailPanel.tsx"
"core/panel/DetailPills.tsx"
"core/panel/DetailSection.tsx"
"core/panel/index.ts"
"core/panel/SlideInPanel.tsx"
"core/panel/SlideInPanelBody.tsx"
"core/panel/SlideInPanelHeader.tsx"
"core/permissions/Can.tsx"
"core/permissions/index.ts"
"core/permissions/opsRoles.ts"
"core/permissions/PermissionsProvider.tsx"
"core/permissions/usePermissions.ts"
"core/readonly/index.ts"
"core/readonly/ReadOnlyBanner.tsx"
"core/readonly/ReadOnlyContext.tsx"
"core/state/EmptyState.tsx"
"core/state/ErrorState.tsx"
"core/state/index.ts"
"core/state/LoadingState.tsx"
"core/status/index.ts"
"core/status/ReadinessIndicator.tsx"
"core/status/StatusCard.tsx"
"core/storage/cloudflare/config.ts"
"core/storage/cloudflare/index.ts"
"core/storage/cloudflare/upload.ts"
"core/storage/index.ts"
"core/toast/index.ts"
"core/toast/ToastContext.tsx"
)

for file in "${files[@]}"; do
  file_without_ext="${file%.*}"
  base=$(basename "$file_without_ext")
  
  # Skip index files - those are re-exports
  if [ "$base" = "index" ]; then
    continue
  fi
  
  # Search for imports of this file
  # Try multiple patterns
  if ! grep -r "import.*from.*['\"].*$file_without_ext['\"]" . --include="*.ts" --include="*.tsx" >/dev/null 2>&1 && \
     ! grep -r "import.*from.*['\"].*${file_without_ext##*/}['\"]" . --include="*.ts" --include="*.tsx" >/dev/null 2>&1; then
    echo "$file"
  fi
done

