import { getStatusBadgeConfig, getPriorityBadgeConfig } from './badgeConfig';

describe('Badge Configuration & Styling (@repairshop/shared/badgeConfig.ts)', () => {
  describe('getStatusBadgeConfig', () => {
    it('maps repair job statuses to appropriate color badge variants', () => {
      expect(getStatusBadgeConfig('Received')).toEqual({ label: 'Received', variant: 'default' });
      expect(getStatusBadgeConfig('In Progress')).toEqual({ label: 'In Progress', variant: 'accent' });
      expect(getStatusBadgeConfig('Waiting for Materials')).toEqual({ label: 'Waiting for Materials', variant: 'warning' });
      expect(getStatusBadgeConfig('Completed')).toEqual({ label: 'Completed', variant: 'success' });
      expect(getStatusBadgeConfig('Delivered')).toEqual({ label: 'Delivered', variant: 'neutral' });
      expect(getStatusBadgeConfig('Cancelled')).toEqual({ label: 'Cancelled', variant: 'danger' });
    });

    it('defaults to default variant for unmapped statuses', () => {
      expect(getStatusBadgeConfig('UnknownStatus')).toEqual({ label: 'UnknownStatus', variant: 'default' });
    });
  });

  describe('getPriorityBadgeConfig', () => {
    it('maps priorities to danger, warning, and success badge variants', () => {
      expect(getPriorityBadgeConfig('High')).toEqual({ label: 'High', variant: 'danger' });
      expect(getPriorityBadgeConfig('Medium')).toEqual({ label: 'Medium', variant: 'warning' });
      expect(getPriorityBadgeConfig('Low')).toEqual({ label: 'Low', variant: 'success' });
    });

    it('defaults to default variant for Normal or other priority tags', () => {
      expect(getPriorityBadgeConfig('Normal')).toEqual({ label: 'Normal', variant: 'default' });
      expect(getPriorityBadgeConfig('Urgent')).toEqual({ label: 'Urgent', variant: 'default' });
    });
  });
});
