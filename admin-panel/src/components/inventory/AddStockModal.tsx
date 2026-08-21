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
  const [serialNumbers, setSerialNumbers] = useState('');
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
        p_notes: notes || 'Manual stock entry',
        p_serial_numbers: serialNumbers || null
      });

      if (rpcErr) throw new Error(rpcErr.message);

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
              <label htmlFor="field-qty" className="block text-sm font-medium text-admin-text-secondary mb-1">Quantity to Add *</label>
              <Input id="field-qty" 
                type="number" 
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label htmlFor="field-rate" className="block text-sm font-medium text-admin-text-secondary mb-1">Purchase Rate (₹) *</label>
              <Input id="field-rate" 
                type="number" 
                value={rate}
                onChange={e => setRate(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="field-notes" className="block text-sm font-medium text-admin-text-secondary mb-1">Notes (Optional)</label>
              <Input id="field-notes" 
                type="text" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Reason for stock entry"
              />
            </div>
            <div>
              <label htmlFor="field-serial" className="block text-sm font-medium text-admin-text-secondary mb-1">Serial Number(s) (Optional)</label>
              <textarea 
                id="field-serial" 
                value={serialNumbers}
                onChange={e => setSerialNumbers(e.target.value)}
                placeholder="Comma or newline separated"
                className="w-full rounded-md border border-admin-border bg-admin-bg-base px-3 py-2 text-sm text-admin-text-primary focus:outline-none focus:ring-2 focus:ring-admin-primary/50"
                rows={3}
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
