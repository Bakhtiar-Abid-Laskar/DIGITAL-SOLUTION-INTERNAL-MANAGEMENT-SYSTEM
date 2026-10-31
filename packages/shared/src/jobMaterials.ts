import { JobMaterial } from './types';

/**
 * Validates a job material entry before insertion or update.
 * Enforces compulsory serial number, positive quantity, valid cost, and material name.
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

  const serial = item.serial_number?.trim();
  if (!serial) {
    return {
      valid: false,
      error: `Compulsory serial number required for "${name}". Every part used on a job must have a recorded serial number.`,
    };
  }

  return { valid: true };
}

/**
 * Validates whether all materials associated with a job have compulsory serial numbers
 * before the job can transition to 'Completed'.
 */
export function canCompleteJobMaterials(
  materials: JobMaterial[] | null | undefined
): { allowed: boolean; missingMaterials: string[] } {
  if (!materials || materials.length === 0) {
    return { allowed: true, missingMaterials: [] };
  }

  const missing: string[] = [];
  for (const mat of materials) {
    // Only check materials that are confirmed/used (ignore status === 'unused' or returned)
    if (mat.status === 'unused') continue;
    const serial = mat.serial_number?.trim();
    if (!serial) {
      missing.push(mat.material_name || 'Unnamed Material');
    }
  }

  return {
    allowed: missing.length === 0,
    missingMaterials: missing,
  };
}

/**
 * Validates whether a tax invoice can be generated for a job.
 * Disallows invoice generation if any material line is missing a compulsory serial number.
 */
export function canGenerateTaxInvoice(
  materials: JobMaterial[] | null | undefined
): { allowed: boolean; missingMaterials: string[] } {
  if (!materials || materials.length === 0) {
    return { allowed: true, missingMaterials: [] };
  }

  const missing: string[] = [];
  for (const mat of materials) {
    if (mat.status === 'unused') continue;
    const serial = mat.serial_number?.trim();
    if (!serial) {
      missing.push(mat.material_name || 'Unnamed Material');
    }
  }

  return {
    allowed: missing.length === 0,
    missingMaterials: missing,
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
    .filter(Boolean);
}
