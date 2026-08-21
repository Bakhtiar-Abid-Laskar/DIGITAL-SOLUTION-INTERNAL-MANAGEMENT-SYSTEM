import { useState, useEffect, useRef, useReducer } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryWithProduct } from '@repairshop/shared';
import { X, Info } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Tabs } from '../common/Tabs';

export default function InventoryFormModal({ 
  item, 
  onClose, 
  onSuccess 
}: { 
  item?: InventoryWithProduct | null; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [state, setState] = useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      activeTab: 'product',
      productData: {
        name: item?.products?.name || '',
        sku: item?.products?.sku || '',
        hsn_sac: item?.products?.hsn_sac || '',
        unit: item?.products?.unit || 'pcs',
        tax_mode: item?.products?.tax_mode || 'exclusive',
        cgst_rate: item?.products?.cgst_rate || 9,
        sgst_rate: item?.products?.sgst_rate || 9,
        igst_rate: item?.products?.igst_rate || 18,
        is_active: item?.products?.is_active ?? true,
      },
      stockData: {
        opening_quantity: 0, 
        purchase_rate: item?.purchase_rate || 0,
        selling_rate: item?.selling_rate || 0,
        low_stock_threshold: item?.low_stock_threshold ?? 5,
        minimum_stock_level: item?.minimum_stock_level ?? 0,
        location: item?.location || '',
      },
      loading: false,
      error: '',
    }
  );

  const { activeTab, productData, stockData, loading, error } = state;
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    if (!productData.name.trim()) {
      setState({ error: 'Product name is required', activeTab: 'product' });
      return;
    }
    if (stockData.purchase_rate < 0 || stockData.selling_rate < 0 || stockData.opening_quantity < 0) {
      setState({ error: 'Rates and opening quantity cannot be negative', activeTab: 'stock' });
      return;
    }

    setState({ loading: true, error: '' });

    try {
      if (item?.id && item?.product_id) {
        // UPDATE MODE
        const [prodRes, invRes] = await Promise.all([
          supabase.from('products').update({
            name: productData.name,
            sku: productData.sku || null,
            hsn_sac: productData.hsn_sac || null,
            unit: productData.unit,
            tax_mode: productData.tax_mode,
            cgst_rate: productData.cgst_rate,
            sgst_rate: productData.sgst_rate,
            igst_rate: productData.igst_rate,
            is_active: productData.is_active,
            updated_at: new Date().toISOString()
          }).eq('id', item.product_id),
          supabase.from('inventory').update({
            purchase_rate: stockData.purchase_rate,
            selling_rate: stockData.selling_rate,
            low_stock_threshold: stockData.low_stock_threshold,
            minimum_stock_level: stockData.minimum_stock_level,
            location: stockData.location || null,
            last_updated: new Date().toISOString()
          }).eq('id', item.id)
        ]);

        if (prodRes.error) throw prodRes.error;
        if (invRes.error) throw invRes.error;

      } else {
        // INSERT MODE
        const { error: rpcErr } = await supabase.rpc('create_product_with_opening_stock', {
          p_name: productData.name,
          p_sku: productData.sku || null,
          p_unit: productData.unit,
          p_hsn_sac: productData.hsn_sac || null,
          p_cgst_rate: productData.cgst_rate,
          p_sgst_rate: productData.sgst_rate,
          p_igst_rate: productData.igst_rate,
          p_tax_mode: productData.tax_mode,
          p_is_active: productData.is_active,
          p_opening_quantity: stockData.opening_quantity,
          p_purchase_rate: stockData.purchase_rate,
          p_selling_rate: stockData.selling_rate,
          p_low_stock_threshold: stockData.low_stock_threshold,
          p_minimum_stock_level: stockData.minimum_stock_level,
          p_location: stockData.location || null
        });

        if (rpcErr) throw new Error(rpcErr.message);
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setState({ error: err.message || 'Failed to save product' });
    } finally {
      setState({ loading: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-admin-bg-dark/80 backdrop-blur-sm animate-fade-in">
      <div 
        ref={modalRef}
        className="bg-admin-bg-surface border border-admin-border rounded-xl shadow-xl max-w-xl w-full animate-scale-in flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-admin-border">
          <h2 className="text-xl font-bold text-admin-text-primary">
            {item ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="text-admin-text-muted hover:text-admin-text-primary">
            <X size={20} />
          </button>
        </div>

        <Tabs 
          items={[
            { id: 'product', label: 'Product Info' },
            { id: 'stock', label: 'Stock & Pricing' }
          ]} 
          activeId={activeTab} 
          onChange={(tab) => setState({ activeTab: tab })}
          className="px-6 mt-4 border-b border-admin-border"
        />
        
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-admin-urgent-bg text-admin-urgent-fg rounded border border-admin-urgent-fg/20 text-sm mb-4">
              {error}
            </div>
          )}

          {activeTab === 'product' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label htmlFor="field-92xu2f" className="block text-sm font-medium text-admin-text-secondary mb-1">Product Name *</label>
                <Input id="field-92xu2f" 
                  type="text" 
                  value={productData.name}
                  onChange={(e) => setState({ productData: {...productData, name: e.target.value} })}
                  placeholder="e.g. iPhone 13 Screen Replacement"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="field-2vx7jq" className="block text-sm font-medium text-admin-text-secondary mb-1">SKU</label>
                  <Input id="field-2vx7jq" 
                    type="text" 
                    value={productData.sku}
                    onChange={(e) => setState({ productData: {...productData, sku: e.target.value} })}
                    placeholder="e.g. IPH13-SCR"
                  />
                </div>
                <div>
                  <label htmlFor="field-f7wioi" className="block text-sm font-medium text-admin-text-secondary mb-1">Unit of Measure</label>
                  <Input id="field-f7wioi" 
                    type="text" 
                    value={productData.unit}
                    onChange={(e) => setState({ productData: {...productData, unit: e.target.value} })}
                    placeholder="e.g. pcs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="field-w0xq1t" className="block text-sm font-medium text-admin-text-secondary mb-1">HSN/SAC Code</label>
                  <Input id="field-w0xq1t" 
                    type="text" 
                    value={productData.hsn_sac}
                    onChange={(e) => setState({ productData: {...productData, hsn_sac: e.target.value} })}
                  />
                </div>
                <div>
                  <label htmlFor="field-x73qcg" className="block text-sm font-medium text-admin-text-secondary mb-1">Tax Mode</label>
                  <Select id="field-x73qcg" 
                    value={productData.tax_mode}
                    onChange={(e) => setState({ productData: {...productData, tax_mode: e.target.value as any} })}
                  >
                    <option value="exclusive">Exclusive (Tax added on top)</option>
                    <option value="inclusive">Inclusive (Tax baked into price)</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="field-gwvz3g" className="block text-sm font-medium text-admin-text-secondary mb-1">CGST %</label>
                  <Input id="field-gwvz3g" type="number" min="0" step="0.5" value={productData.cgst_rate} onChange={(e) => setState({ productData: {...productData, cgst_rate: Number(e.target.value)} })} />
                </div>
                <div>
                  <label htmlFor="field-5w4hqb" className="block text-sm font-medium text-admin-text-secondary mb-1">SGST %</label>
                  <Input id="field-5w4hqb" type="number" min="0" step="0.5" value={productData.sgst_rate} onChange={(e) => setState({ productData: {...productData, sgst_rate: Number(e.target.value)} })} />
                </div>
                <div>
                  <label htmlFor="field-07lneq" className="block text-sm font-medium text-admin-text-secondary mb-1">IGST %</label>
                  <Input id="field-07lneq" type="number" min="0" step="0.5" value={productData.igst_rate} onChange={(e) => setState({ productData: {...productData, igst_rate: Number(e.target.value)} })} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="field-5x0g3r" className="block text-sm font-medium text-admin-text-secondary mb-1">Purchase Rate (Cost)</label>
                  <Input id="field-5x0g3r" 
                    type="number" 
                    min="0" step="0.01"
                    value={stockData.purchase_rate}
                    onChange={(e) => setState({ stockData: {...stockData, purchase_rate: Number(e.target.value)} })}
                  />
                </div>
                <div>
                  <label htmlFor="field-4ud5t9" className="block text-sm font-medium text-admin-text-secondary mb-1">Selling Rate (Base)</label>
                  <Input id="field-4ud5t9" 
                    type="number" 
                    min="0" step="0.01"
                    value={stockData.selling_rate}
                    onChange={(e) => setState({ stockData: {...stockData, selling_rate: Number(e.target.value)} })}
                  />
                </div>
              </div>

              {!item && (
                <div className="bg-admin-bg-subtle p-4 rounded-lg border border-admin-border flex gap-3">
                  <Info className="text-admin-accent shrink-0 mt-0.5" size={18} />
                  <div>
                    <label htmlFor="field-8o3pf5" className="block text-sm font-medium text-admin-text-primary mb-1">Opening Stock Quantity</label>
                    <p className="text-xs text-admin-text-muted mb-3">
                      Enter the initial physical count. To add stock later, use the Purchase Order flow.
                    </p>
                    <Input id="field-8o3pf5" 
                      type="number" 
                      min="0"
                      value={stockData.opening_quantity}
                      onChange={(e) => setState({ stockData: {...stockData, opening_quantity: Number(e.target.value)} })}
                    />
                  </div>
                </div>
              )}
              {item && (
                <div className="bg-admin-bg-subtle p-3 rounded-lg border border-admin-border text-sm text-admin-text-secondary">
                  Current Stock: <strong>{item.quantity_cached} {item.products?.unit}</strong>
                  <br/>
                  <span className="text-xs text-admin-text-muted">(Stock quantity must be modified via transactions/POs in the new schema)</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="field-f9mctm" className="block text-sm font-medium text-admin-text-secondary mb-1">Low Stock Threshold</label>
                  <Input id="field-f9mctm" 
                    type="number" min="0"
                    value={stockData.low_stock_threshold}
                    onChange={(e) => setState({ stockData: {...stockData, low_stock_threshold: Number(e.target.value)} })}
                  />
                </div>
                <div>
                  <label htmlFor="field-4ixer2" className="block text-sm font-medium text-admin-text-secondary mb-1">Min Stock Level</label>
                  <Input id="field-4ixer2" 
                    type="number" min="0"
                    value={stockData.minimum_stock_level}
                    onChange={(e) => setState({ stockData: {...stockData, minimum_stock_level: Number(e.target.value)} })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="field-nqy6qa" className="block text-sm font-medium text-admin-text-secondary mb-1">Warehouse Location (optional)</label>
                <Input id="field-nqy6qa" 
                  type="text" 
                  placeholder="e.g. Aisle 3, Shelf B"
                  value={stockData.location}
                  onChange={(e) => setState({ stockData: {...stockData, location: e.target.value} })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-admin-border bg-admin-bg-subtle flex justify-end gap-3 rounded-b-xl">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} isLoading={loading}>
            {item ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </div>
    </div>
  );
}
