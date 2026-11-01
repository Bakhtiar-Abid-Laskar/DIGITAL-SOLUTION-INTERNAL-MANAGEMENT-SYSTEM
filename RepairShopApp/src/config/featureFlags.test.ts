import {
  SALARY_COMING_SOON_ENABLED,
  SALARY_COMING_SOON_ROLES,
  normalizeRole,
  isSalaryComingSoonFor,
} from './featureFlags';

describe('Feature Flags - Salary Coming Soon', () => {
  it('has SALARY_COMING_SOON_ENABLED enabled by default', () => {
    expect(SALARY_COMING_SOON_ENABLED).toBe(true);
  });

  it('contains staff roles: technician, reception, receptionist', () => {
    expect(SALARY_COMING_SOON_ROLES).toContain('technician');
    expect(SALARY_COMING_SOON_ROLES).toContain('reception');
    expect(SALARY_COMING_SOON_ROLES).toContain('receptionist');
  });

  it('normalizes role strings with trimming and lowercase', () => {
    expect(normalizeRole('  Technician  ')).toBe('technician');
    expect(normalizeRole('RECEPTIONIST')).toBe('receptionist');
    expect(normalizeRole(null)).toBe('');
    expect(normalizeRole(undefined)).toBe('');
  });

  it('returns true for technician and receptionist roles', () => {
    expect(isSalaryComingSoonFor('technician')).toBe(true);
    expect(isSalaryComingSoonFor('Technician')).toBe(true);
    expect(isSalaryComingSoonFor('  TECHNICIAN  ')).toBe(true);
    expect(isSalaryComingSoonFor('receptionist')).toBe(true);
    expect(isSalaryComingSoonFor('Receptionist')).toBe(true);
    expect(isSalaryComingSoonFor('reception')).toBe(true);
  });

  it('returns false for admin, owner, manager', () => {
    expect(isSalaryComingSoonFor('admin')).toBe(false);
    expect(isSalaryComingSoonFor('Admin')).toBe(false);
    expect(isSalaryComingSoonFor('owner')).toBe(false);
    expect(isSalaryComingSoonFor('manager')).toBe(false);
  });

  it('returns false for empty or unresolved role', () => {
    expect(isSalaryComingSoonFor(null)).toBe(false);
    expect(isSalaryComingSoonFor(undefined)).toBe(false);
    expect(isSalaryComingSoonFor('')).toBe(false);
  });
});

