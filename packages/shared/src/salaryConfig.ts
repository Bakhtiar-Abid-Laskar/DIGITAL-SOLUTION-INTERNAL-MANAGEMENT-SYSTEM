import { Role } from './types';

/**
 * Roles that should see the "Coming Soon" placeholder on the Salary page
 * instead of live salary data and calculation panels.
 *
 * To restore the full salary page for Receptionist or Technician in the future,
 * simply remove the role from this array (e.g. set to `[]`).
 */
export const SALARY_COMING_SOON_ROLES: (Role | string)[] = [
  'receptionist',
  'technician',
  'reception',
];

/**
 * Checks whether a given staff role should be shown the "Coming Soon" screen.
 */
export function isSalaryComingSoon(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return SALARY_COMING_SOON_ROLES.some((r) => r.toLowerCase().trim() === normalized);
}
