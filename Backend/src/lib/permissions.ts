export const ROLES = ['owner', 'inventory_manager', 'sales_assistant'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'dashboard:read',
  'vehicles:read',
  'vehicles:write',
  'vehicles:images',
  'vehicles:archive',
  'vehicles:delete',
  'enquiries:read',
  'enquiries:update',
  'enquiries:assign',
  'staff:manage',
  'settings:manage',
  'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/**
 * Single source of truth for role capabilities. Every protected route checks one of
 * these permissions server-side; the frontend only uses the list to hide controls.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  inventory_manager: ['dashboard:read', 'vehicles:read', 'vehicles:write', 'vehicles:images'],
  sales_assistant: ['dashboard:read', 'vehicles:read', 'enquiries:read', 'enquiries:update'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
