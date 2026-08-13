// admin-panel/src/types/inventory.ts
// Local admin-panel inventory types that re-export from shared and add form shapes.

export type {
  Product,
  InventoryRow,
  InventoryWithProduct,
  TaxMode,
} from '@repairshop/shared';

/** Shape of the product section of the add/edit form */
export interface ProductFormData {
  name: string;
  sku: string;
  hsn_sac: string;
  unit: string;
  tax_mode: 'exclusive' | 'inclusive';
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  is_active: boolean;
}

/** Shape of the stock/pricing section of the add/edit form */
export interface StockFormData {
  opening_quantity: number;   // only used when adding a new product
  purchase_rate: number;
  selling_rate: number;
  low_stock_threshold: number;
  minimum_stock_level: number;
  location: string;
}

export interface InventoryFormState {
  product: ProductFormData;
  stock: StockFormData;
}
