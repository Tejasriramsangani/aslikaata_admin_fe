import type { AdminRole } from '../context/AdminAuthContext';

/**
 * Which staff roles may open which admin screen. This mirrors the backend's
 * @StaffAccess rules (aslikaata_be) - the API is the real gatekeeper, this only
 * keeps people from landing on screens whose data they cannot load.
 */
const ALL: AdminRole[] = ['SUPER_ADMIN', 'YARD_MANAGER', 'DISPATCHER', 'ACCOUNTANT'];

export const ROUTE_ACCESS: Record<string, AdminRole[]> = {
  '/': ALL,
  '/dispatch': ['SUPER_ADMIN', 'DISPATCHER'],
  '/inward': ['SUPER_ADMIN', 'YARD_MANAGER', 'ACCOUNTANT'],
  '/outward': ['SUPER_ADMIN', 'YARD_MANAGER', 'ACCOUNTANT'],
  '/pricing': ['SUPER_ADMIN'],
  '/fleet': ['SUPER_ADMIN', 'DISPATCHER', 'ACCOUNTANT'],
  '/calendar': ['SUPER_ADMIN', 'DISPATCHER'],
  '/workforce': ['SUPER_ADMIN', 'DISPATCHER', 'ACCOUNTANT'],
  '/users': ['SUPER_ADMIN'],
  '/picker-requests': ['SUPER_ADMIN', 'DISPATCHER'],
  '/analytics': ['SUPER_ADMIN', 'ACCOUNTANT'],
  '/audits': ['SUPER_ADMIN', 'ACCOUNTANT'],
};

/** Roles allowed on a path (matched by its first segment). Unknown paths are open. */
export function rolesForPath(pathname: string): AdminRole[] | null {
  const key = pathname === '/' ? '/' : '/' + pathname.split('/')[1];
  return ROUTE_ACCESS[key] ?? null;
}

export function canAccessPath(role: AdminRole | undefined, pathname: string): boolean {
  const allowed = rolesForPath(pathname);
  if (!allowed) return true;
  return !!role && allowed.includes(role);
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  YARD_MANAGER: 'Yard Manager',
  DISPATCHER: 'Fleet Dispatcher',
  ACCOUNTANT: 'Chief Accountant',
};
