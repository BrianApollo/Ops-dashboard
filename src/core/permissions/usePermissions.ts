import { usePermissionsContext } from './PermissionsProvider';

type Permission = string;
type Role = string;

/**
 * Check if user has a specific permission
 */
export function useCan(permission: Permission): boolean {
  const { can } = usePermissionsContext();
  return can(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function useCanAny(permissions: Permission[]): boolean {
  const { canAny } = usePermissionsContext();
  return canAny(permissions);
}

/**
 * Check if user has all of the specified permissions
 */
export function useCanAll(permissions: Permission[]): boolean {
  const { canAll } = usePermissionsContext();
  return canAll(permissions);
}

/**
 * Check if user has a specific role
 */
export function useHasRole(role: Role): boolean {
  const { hasRole } = usePermissionsContext();
  return hasRole(role);
}

/**
 * Check if user has any of the specified roles
 */
export function useHasAnyRole(roles: Role[]): boolean {
  const { hasAnyRole } = usePermissionsContext();
  return hasAnyRole(roles);
}

/**
 * Full permissions context access
 */
export function usePermissions() {
  return usePermissionsContext();
}
