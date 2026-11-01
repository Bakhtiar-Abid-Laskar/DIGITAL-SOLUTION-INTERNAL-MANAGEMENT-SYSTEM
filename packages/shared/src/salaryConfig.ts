import { Role } from './types';

/**
 * Roles that should see the "Coming Soon" placeholder on the Salary page
 * instead of live salary data and calculation panels.
 */
export const SALARY_COMING_SOON_ENABLED = true;

export const SALARY_COMING_SOON_ROLES: (Role | string)[] = [
  'receptionist',
  'technician',
  'reception',
];

export function normalizeRole(role?: string | null): string {
  return String(role ?? '').trim().toLowerCase();
}

/**
 * Checks whether a given staff role should be shown the "Coming Soon" screen.
 */
export function isSalaryComingSoonFor(role?: string | null): boolean {
  if (!SALARY_COMING_SOON_ENABLED) return false;
  if (!role) return false;
  const normalized = normalizeRole(role);
  if (['admin', 'owner', 'manager'].includes(normalized)) {
    return false;
  }
  return SALARY_COMING_SOON_ROLES.some((r) => normalizeRole(r) === normalized);
}

// Backward compatibility alias
export const isSalaryComingSoon = isSalaryComingSoonFor;
