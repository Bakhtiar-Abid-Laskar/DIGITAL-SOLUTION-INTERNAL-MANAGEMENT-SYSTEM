import {
  validateJobMaterial,
  canCompleteJobMaterials,
  canGenerateTaxInvoice,
  parseSerialNumbers,
} from './jobMaterials';
import { JobMaterial } from './types';

describe('Job Materials Optional Serial Number Rules', () => {
  describe('validateJobMaterial', () => {
    it('accepts a material with missing or blank serial number (purely optional)', () => {
      const res = validateJobMaterial({
        material_name: 'SSD 512GB NVMe',
        quantity: 1,
        unit_cost: 2800,
        serial_number: '',
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('accepts a material with null or undefined serial number', () => {
      const res = validateJobMaterial({
        material_name: 'Display Panel 15.6"',
        quantity: 1,
        unit_cost: 4500,
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('accepts a material with whitespace-only serial number', () => {
      const res = validateJobMaterial({
        material_name: 'RAM 16GB DDR4',
        quantity: 1,
        unit_cost: 2100,
        serial_number: '   ',
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('rejects an invalid material without name', () => {
      const res = validateJobMaterial({
        material_name: '',
        quantity: 1,
        unit_cost: 100,
        serial_number: 'SN-12345',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Material name is required');
    });

    it('rejects an invalid material with quantity <= 0', () => {
      const res = validateJobMaterial({
        material_name: 'Battery',
        quantity: 0,
        unit_cost: 1800,
        serial_number: 'BAT-9988',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Quantity must be greater than zero');
    });

    it('accepts a valid material with all fields including serial number', () => {
      const res = validateJobMaterial({
        material_name: 'Crucial 500GB SSD',
        quantity: 1,
        unit_cost: 3200,
        serial_number: 'CRU-500-SN88291',
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  describe('canCompleteJobMaterials', () => {
    const baseMaterial: JobMaterial = {
      id: 'mat-1',
      job_id: 'job-1',
      material_name: 'SMPS 450W',
      serial_number: 'SMPS-77441',
      quantity: 1,
      unit_cost: 1200,
      total_cost: 1200,
    };

    it('allows completion when job has no materials', () => {
      const res = canCompleteJobMaterials([]);
      expect(res.allowed).toBe(true);
      expect(res.missingMaterials).toHaveLength(0);
    });

    it('allows completion when all materials have serial numbers', () => {
      const materials: JobMaterial[] = [
        baseMaterial,
        {
          id: 'mat-2',
          job_id: 'job-1',
          material_name: 'Motherboard H610',
          serial_number: 'MB-993821',
          quantity: 1,
          unit_cost: 5400,
          total_cost: 5400,
        },
      ];
      const res = canCompleteJobMaterials(materials);
      expect(res.allowed).toBe(true);
      expect(res.missingMaterials).toHaveLength(0);
    });

    it('allows completion even if materials lack a serial number', () => {
      const materials: JobMaterial[] = [
        baseMaterial,
        {
          id: 'mat-2',
          job_id: 'job-1',
          material_name: 'Graphics Card GTX 1650',
          serial_number: '',
          quantity: 1,
          unit_cost: 11000,
          total_cost: 11000,
        },
      ];
      const res = canCompleteJobMaterials(materials);
      expect(res.allowed).toBe(true);
      expect(res.missingMaterials).toHaveLength(0);
    });

    it('ignores materials marked with status "unused"', () => {
      const materials: JobMaterial[] = [
        baseMaterial,
        {
          id: 'mat-2',
          job_id: 'job-1',
          material_name: 'Extra Cable',
          serial_number: '',
          quantity: 1,
          unit_cost: 150,
          total_cost: 150,
          status: 'unused',
        },
      ];
      const res = canCompleteJobMaterials(materials);
      expect(res.allowed).toBe(true);
    });
  });

  describe('canGenerateTaxInvoice', () => {
    it('allows invoice generation when job parts lack serial numbers', () => {
      const materials: JobMaterial[] = [
        {
          id: 'mat-1',
          job_id: 'job-1',
          material_name: 'Laptop Keyboard Replacement',
          serial_number: '',
          quantity: 1,
          unit_cost: 1200,
          total_cost: 1200,
        },
      ];
      const res = canGenerateTaxInvoice(materials);
      expect(res.allowed).toBe(true);
      expect(res.missingMaterials).toHaveLength(0);
    });

    it('allows invoice generation when all job parts have valid serial numbers', () => {
      const materials: JobMaterial[] = [
        {
          id: 'mat-1',
          job_id: 'job-1',
          material_name: 'Laptop Keyboard Replacement',
          serial_number: 'KB-DELL-88392',
          quantity: 1,
          unit_cost: 1200,
          total_cost: 1200,
        },
      ];
      const res = canGenerateTaxInvoice(materials);
      expect(res.allowed).toBe(true);
    });
  });

  describe('parseSerialNumbers', () => {
    it('parses comma-separated serial numbers into trimmed array', () => {
      const input = 'SN-1001, SN-1002,   SN-1003';
      expect(parseSerialNumbers(input)).toEqual(['SN-1001', 'SN-1002', 'SN-1003']);
    });

    it('parses newline-separated serial numbers', () => {
      const input = 'SN-A\nSN-B\r\nSN-C';
      expect(parseSerialNumbers(input)).toEqual(['SN-A', 'SN-B', 'SN-C']);
    });

    it('handles empty or null inputs gracefully', () => {
      expect(parseSerialNumbers('')).toEqual([]);
      expect(parseSerialNumbers(null)).toEqual([]);
      expect(parseSerialNumbers(undefined)).toEqual([]);
    });
  });
});
