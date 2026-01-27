import { ReactNode } from 'react';
import { usePermissionsContext } from './PermissionsProvider';

type Permission = string;
type Role = string;

interface CanProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  role?: Role;
  roles?: Role[];
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on permissions or roles
 *
 * @example
 * // Single permission
 * <Can permission="video.edit">
 *   <EditButton />
 * </Can>
 *
 * @example
 * // Multiple permissions (any)
 * <Can permissions={["video.edit", "video.delete"]}>
 *   <ActionMenu />
 * </Can>
 *
 * @example
 * // Multiple permissions (all required)
 * <Can permissions={["video.edit", "video.publish"]} requireAll>
 *   <PublishButton />
 * </Can>
 *
 * @example
 * // Role-based
 * <Can role="admin">
 *   <AdminPanel />
 * </Can>
 *
 * @example
 * // With fallback
 * <Can permission="video.delete" fallback={<DisabledButton />}>
 *   <DeleteButton />
 * </Can>
 */
export function Can({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  fallback = null,
}: CanProps) {
  const ctx = usePermissionsContext();

  let allowed = true;

  // Check single permission
  if (permission) {
    allowed = ctx.can(permission);
  }

  // Check multiple permissions
  if (allowed && permissions && permissions.length > 0) {
    allowed = requireAll ? ctx.canAll(permissions) : ctx.canAny(permissions);
  }

  // Check single role
  if (allowed && role) {
    allowed = ctx.hasRole(role);
  }

  // Check multiple roles
  if (allowed && roles && roles.length > 0) {
    allowed = ctx.hasAnyRole(roles);
  }

  if (allowed) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Inverse of Can - render when permission is NOT granted
 */
interface CannotProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  role?: Role;
  roles?: Role[];
}

export function Cannot({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
}: CannotProps) {
  const ctx = usePermissionsContext();

  let allowed = true;

  if (permission) {
    allowed = ctx.can(permission);
  }

  if (allowed && permissions && permissions.length > 0) {
    allowed = requireAll ? ctx.canAll(permissions) : ctx.canAny(permissions);
  }

  if (allowed && role) {
    allowed = ctx.hasRole(role);
  }

  if (allowed && roles && roles.length > 0) {
    allowed = ctx.hasAnyRole(roles);
  }

  // Render when NOT allowed
  if (!allowed) {
    return <>{children}</>;
  }

  return null;
}
