/**
 * Central Feature Flags Configuration for RepairShopApp.
 * 
 * Single source of truth for runtime rollout toggles, including
 * the Salary Coming Soon gate for staff.
 */

// Allow environment variable override if provided at build or runtime
const envSalaryComingSoon =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SALARY_COMING_SOON;

export const SALARY_COMING_SOON_ENABLED: boolean =
  envSalaryComingSoon !== undefined && envSalaryComingSoon !== ''
    ? envSalaryComingSoon === 'true' || envSalaryComingSoon === '1'
    : true;

export const SALARY_COMING_SOON_ROLES: readonly string[] = [
  'technician',
  'reception',
  'receptionist',
];

/**
 * Normalizes a role string safely (handles null, undefined, casing, whitespace).
 */
export function normalizeRole(role?: string | null): string {
  return String(role ?? '').trim().toLowerCase();
}

/**
 * Determines whether the Salary section should show "Coming Soon" for a given role.
 * 
 * Rules:
 * - If feature is disabled (SALARY_COMING_SOON_ENABLED === false) -> returns false.
 * - If role is 'admin', 'owner', or 'manager' -> returns false (always allowed).
 * - If role matches any staff role in SALARY_COMING_SOON_ROLES -> returns true.
 * - Any unrecognized or empty role -> returns false.
 * 
 * Note on loading: Callers must check auth loading state FIRST before evaluating
 * this helper, to prevent flashing content while the profile resolves.
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

// Alias for backwards compatibility
export const isSalaryComingSoon = isSalaryComingSoonFor;

