import { JobMaterial } from './types';

/**
 * Validates a job material entry before insertion or update.
 * Enforces positive quantity, valid cost, and material name.
 * Serial number is purely optional.
 */
export function validateJobMaterial(
  item: Partial<JobMaterial>
): { valid: boolean; error?: string } {
  if (!item) {
    return { valid: false, error: 'Material details are required.' };
  }

  const name = item.material_name?.trim();
  if (!name) {
    return { valid: false, error: 'Material name is required.' };
  }

  const qty = Number(item.quantity);
  if (isNaN(qty) || qty <= 0) {
    return { valid: false, error: 'Quantity must be greater than zero.' };
  }

  const cost = Number(item.unit_cost);
  if (isNaN(cost) || cost < 0) {
    return { valid: false, error: 'Unit cost cannot be negative.' };
  }

  // Serial number is purely optional everywhere
  return { valid: true };
}

/**
 * Validates whether materials prevent a job from transitioning to 'Completed'.
 * Serial numbers are purely optional everywhere; completion is always permitted.
 */
export function canCompleteJobMaterials(
  materials: JobMaterial[] | null | undefined
): { allowed: boolean; missingMaterials: string[] } {
  void materials;
  return {
    allowed: true,
    missingMaterials: [],
  };
}

/**
 * Validates whether a tax invoice can be generated for a job.
 * Serial numbers are purely optional everywhere; invoice generation is always permitted.
 */
export function canGenerateTaxInvoice(
  materials: JobMaterial[] | null | undefined
): { allowed: boolean; missingMaterials: string[] } {
  void materials;
  return {
    allowed: true,
    missingMaterials: [],
  };
}

/**
 * Splits a potentially comma-separated or newline-separated serial number string into clean individual serials.
 */
export function parseSerialNumbers(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
