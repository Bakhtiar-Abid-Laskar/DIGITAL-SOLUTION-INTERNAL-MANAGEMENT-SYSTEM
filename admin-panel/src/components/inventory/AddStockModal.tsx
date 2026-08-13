import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryWithProduct } from '@repairshop/shared';
import { X } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

export default function AddStockModal({ 
  item, 
  onClose, 
  onSuccess 
}: { 
  item: InventoryWithProduct; 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState(() => item.purchase_rate.toString());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const qty = Number(quantity);
    const rt = Number(rate);
    
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be a positive number');
      return;
    }
    if (isNaN(rt) || rt < 0) {
      setError('Rate cannot be negative');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: rpcErr } = await supabase.rpc('add_stock', {
        p_product_id: item.product_id,
        p_quantity: qty,
        p_rate: rt,
        p_notes: notes || 'Manual stock entry'
      });

      if (rpcErr) throw rpcErr;

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-admin-bg-base/80 backdrop-blur-sm">
      <div className="bg-admin-bg-surface w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col border border-admin-border">
        <div className="flex items-center justify-between p-4 border-b border-admin-border bg-admin-bg-subtle">
          <h2 className="text-lg font-semibold text-admin-text-primary">Add Stock: {item.products?.name}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-bg-hover transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="mb-4 p-3 bg-admin-danger-dim border border-admin-danger/20 text-admin-danger rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="field-6bkrdw" className="block text-sm font-medium text-admin-text-secondary mb-1">Quantity to Add *</label>
              <Input id="field-6bkrdw" 
                type="number" 
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label htmlFor="field-mu38cy" className="block text-sm font-medium text-admin-text-secondary mb-1">Purchase Rate (₹) *</label>
              <Input id="field-mu38cy" 
                type="number" 
                value={rate}
                onChange={e => setRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="field-hscv0n" className="block text-sm font-medium text-admin-text-secondary mb-1">Notes (Optional)</label>
              <Input id="field-hscv0n" 
                type="text" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Reason for stock entry"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-admin-border bg-admin-bg-subtle">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} isLoading={loading}>
            Add Stock
          </Button>
        </div>
      </div>
    </div>
  );
}
