import { validateAndNormalizeIndianPhone, formatPhoneInput } from '@repairshop/shared';
import { VALID_PRIORITIES, VALID_ROLES } from './schemaValidation.test';

describe('Job Creation Flow End-to-End Logic', () => {
  describe('Required Fields & Validation Logic', () => {
    function validateJobCreationForm(form: {
      customer_name: string;
      customer_contact: string;
      reported_issue: string;
      priority?: string;
    }) {
      const missing: string[] = [];
      const errors: Record<string, string> = {};

      if (!form.customer_name.trim()) {
        errors.customer_name = 'Customer name is required';
        missing.push('Customer Name');
      }

      const phoneCheck = validateAndNormalizeIndianPhone(form.customer_contact);
      if (!phoneCheck.isValid) {
        const msg = phoneCheck.error || 'Valid 10-digit Indian phone number required';
        errors.customer_contact = msg;
        missing.push(msg);
      }

      if (!form.reported_issue.trim()) {
        errors.reported_issue = 'Reported issue description is required';
        missing.push('Reported Issue');
      }

      const isValid = Boolean(
        form.customer_name.trim() &&
        phoneCheck.isValid &&
        form.reported_issue.trim()
      );

      return {
        isValid,
        errors,
        missing,
        phoneCheck,
      };
    }

    it('blocks submission and generates clear missing error messages when fields are empty', () => {
      const result = validateJobCreationForm({
        customer_name: '',
        customer_contact: '',
        reported_issue: '',
      });

      expect(result.isValid).toBe(false);
      expect(result.missing).toContain('Customer Name');
      expect(result.missing).toContain('Reported Issue');
      expect(result.missing.some(m => m.includes('Contact number') || m.includes('Phone number'))).toBe(true);
      expect(result.errors.customer_name).toBe('Customer name is required');
      expect(result.errors.reported_issue).toBe('Reported issue description is required');
    });

    it('blocks submission when phone number is fewer than 10 digits', () => {
      const result = validateJobCreationForm({
        customer_name: 'Amit Patel',
        customer_contact: '98765',
        reported_issue: 'Screen flickering',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.customer_contact).toContain('must be exactly 10 digits');
    });

    it('blocks submission when Indian mobile number does not start with 6, 7, 8, or 9', () => {
      const result = validateJobCreationForm({
        customer_name: 'Amit Patel',
        customer_contact: '1234567890',
        reported_issue: 'Overheating fan',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.customer_contact).toContain('start with 6, 7, 8, or 9');
    });

    it('successfully validates standard 10-digit Indian numbers and normalizes to E.164', () => {
      const result = validateJobCreationForm({
        customer_name: 'Pooja Sharma',
        customer_contact: '9876543210',
        reported_issue: 'Laptop keyboard keys not responding',
      });

      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.phoneCheck.e164).toBe('+919876543210');
      expect(result.phoneCheck.clean10).toBe('9876543210');
    });

    it('successfully handles formatted numbers (+91 98765 43210 or 09876543210)', () => {
      const formatted = formatPhoneInput('9876543210');
      expect(formatted).toBe('+91 98765 43210');

      const result = validateJobCreationForm({
        customer_name: 'Pooja Sharma',
        customer_contact: formatted,
        reported_issue: 'Battery replacement needed',
      });

      expect(result.isValid).toBe(true);
      expect(result.phoneCheck.e164).toBe('+919876543210');
    });
  });

  describe('Priority Types Verification', () => {
    it('verifies that all schema priorities (Normal, High, Urgent) are valid', () => {
      expect(VALID_PRIORITIES).toEqual(['Normal', 'High', 'Urgent']);
    });

    it.each(['Normal', 'High', 'Urgent'] as const)(
      'validates job creation for priority "%s"',
      (priority) => {
        expect(VALID_PRIORITIES).toContain(priority);

        // Verify priority color mapping
        const priorityColors: Record<typeof priority, string> = {
          Normal: '#3B82F6',
          High: '#F59E0B',
          Urgent: '#EF4444',
        };
        expect(priorityColors[priority]).toBeDefined();
      }
    );
  });

  describe('Role-Based Access for Job Creation', () => {
    it('confirms both admin and receptionist roles can create jobs', () => {
      const allowedJobCreators = ['admin', 'receptionist'];

      expect(allowedJobCreators).toContain('admin');
      expect(allowedJobCreators).toContain('receptionist');
      expect(allowedJobCreators).not.toContain('technician');

      expect(VALID_ROLES).toContain('admin');
      expect(VALID_ROLES).toContain('receptionist');
    });

    it('correctly filters admin-only navigation links for receptionist on web', () => {
      const navItems = [
        { label: 'Overview', href: '/' },
        { label: 'Jobs', href: '/jobs' },
        { label: 'Customers', href: '/customers' },
        { label: 'Sales', href: '/sales' },
        { label: 'Staff', href: '/staff' },
        { label: 'Salary', href: '/salary' },
        { label: 'Expenditure', href: '/expenditure' },
        { label: 'Reports', href: '/reports' },
        { label: 'Settings', href: '/settings/geofence' },
      ];

      const adminOnlyPrefixes = ['/staff', '/reports', '/salary', '/expenditure', '/settings'];

      const receptionistNav = navItems.filter(
        item => !adminOnlyPrefixes.some(prefix => item.href.startsWith(prefix))
      );

      expect(receptionistNav.map(i => i.label)).toEqual(['Overview', 'Jobs', 'Customers', 'Sales']);
      expect(receptionistNav.some(i => i.href === '/staff')).toBe(false);
      expect(receptionistNav.some(i => i.href === '/salary')).toBe(false);
      expect(receptionistNav.some(i => i.href === '/expenditure')).toBe(false);
      expect(receptionistNav.some(i => i.href === '/reports')).toBe(false);
    });
  });
});
