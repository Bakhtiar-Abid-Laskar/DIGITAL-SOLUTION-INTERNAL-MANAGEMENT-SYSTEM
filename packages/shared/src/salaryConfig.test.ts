import { isSalaryComingSoon, SALARY_COMING_SOON_ROLES } from './salaryConfig';

describe('Salary Coming Soon Config (SALARY_COMING_SOON_ROLES)', () => {
  it('returns true for receptionist role', () => {
    expect(isSalaryComingSoon('receptionist')).toBe(true);
    expect(isSalaryComingSoon('Receptionist')).toBe(true);
    expect(isSalaryComingSoon('  RECEPTIONIST  ')).toBe(true);
  });

  it('returns true for technician role', () => {
    expect(isSalaryComingSoon('technician')).toBe(true);
    expect(isSalaryComingSoon('Technician')).toBe(true);
    expect(isSalaryComingSoon('  TECHNICIAN  ')).toBe(true);
  });

  it('returns false for admin role', () => {
    expect(isSalaryComingSoon('admin')).toBe(false);
    expect(isSalaryComingSoon('Admin')).toBe(false);
  });

  it('handles null, undefined, and empty string gracefully', () => {
    expect(isSalaryComingSoon(null)).toBe(false);
    expect(isSalaryComingSoon(undefined)).toBe(false);
    expect(isSalaryComingSoon('')).toBe(false);
  });

  it('verifies config flipping mechanism', () => {
    // If SALARY_COMING_SOON_ROLES contains the roles, they are gated
    expect(SALARY_COMING_SOON_ROLES).toContain('receptionist');
    expect(SALARY_COMING_SOON_ROLES).toContain('technician');
  });
});
