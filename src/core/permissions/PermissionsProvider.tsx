import { createContext, useContext, useMemo, ReactNode } from 'react';

type Permission = string;
type Role = string;

interface PermissionsContextValue {
  permissions: Set<Permission>;
  roles: Set<Role>;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

interface PermissionsProviderProps {
  children: ReactNode;
  permissions?: Permission[];
  roles?: Role[];
  rolePermissions?: Record<Role, Permission[]>;
  defaultAllow?: boolean;
}

export function PermissionsProvider({
  children,
  permissions = [],
  roles = [],
  rolePermissions = {},
  defaultAllow = true,
}: PermissionsProviderProps) {
  const value = useMemo((): PermissionsContextValue => {
    // Expand role-based permissions
    const expandedPermissions = new Set<Permission>(permissions);
    const roleSet = new Set<Role>(roles);

    roles.forEach((role) => {
      const rolePerms = rolePermissions[role];
      if (rolePerms) {
        rolePerms.forEach((perm) => expandedPermissions.add(perm));
      }
    });

    const can = (permission: Permission): boolean => {
      // If no provider configured or defaultAllow, allow everything
      if (defaultAllow && expandedPermissions.size === 0) {
        return true;
      }
      return expandedPermissions.has(permission);
    };

    const canAny = (perms: Permission[]): boolean => {
      if (defaultAllow && expandedPermissions.size === 0) {
        return true;
      }
      return perms.some((p) => expandedPermissions.has(p));
    };

    const canAll = (perms: Permission[]): boolean => {
      if (defaultAllow && expandedPermissions.size === 0) {
        return true;
      }
      return perms.every((p) => expandedPermissions.has(p));
    };

    const hasRole = (role: Role): boolean => {
      if (defaultAllow && roleSet.size === 0) {
        return true;
      }
      return roleSet.has(role);
    };

    const hasAnyRole = (checkRoles: Role[]): boolean => {
      if (defaultAllow && roleSet.size === 0) {
        return true;
      }
      return checkRoles.some((r) => roleSet.has(r));
    };

    return {
      permissions: expandedPermissions,
      roles: roleSet,
      can,
      canAny,
      canAll,
      hasRole,
      hasAnyRole,
    };
  }, [permissions, roles, rolePermissions, defaultAllow]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext(): PermissionsContextValue {
  const context = useContext(PermissionsContext);

  // Return permissive defaults if no provider
  if (!context) {
    return {
      permissions: new Set(),
      roles: new Set(),
      can: () => true,
      canAny: () => true,
      canAll: () => true,
      hasRole: () => true,
      hasAnyRole: () => true,
    };
  }

  return context;
}

export { PermissionsContext };
