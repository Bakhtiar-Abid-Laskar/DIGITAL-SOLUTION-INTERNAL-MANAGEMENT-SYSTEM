"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryWithProduct, formatCurrency, formatDate } from '@repairshop/shared';
import { 
  X, Tag, Plus, CheckCircle2, AlertTriangle, ScanLine, 
  Trash2, Package, Layers, Info 
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { CameraBarcodeScannerModal } from '../common/CameraBarcodeScannerModal';
import { useHardwareBarcodeScanner } from '@/hooks/useHardwareBarcodeScanner';

interface StockSerialBackfillModalProps {
  item: InventoryWithProduct | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface UnitSerialRow {
  id: string;
  serial_number: string;
  status: string;
  created_at: string;
  unit_cost: number;
}

export default function StockSerialBackfillModal({
  item,
  onClose,
  onSuccess,
}: StockSerialBackfillModalProps) {
  const [existingSerials, setExistingSerials] = useState<UnitSerialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New serials to register in this session
  const [newSerials, setNewSerials] = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState('');
  const [unitCost, setUnitCost] = useState<number>(item?.purchase_rate || 0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCameraOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isCameraOpen]);

  // Load existing registered serials for this product
  useEffect(() => {
    if (!item?.product_id) return;

    let isMounted = true;
    async function loadSerials() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from('inventory_unit_serials')
          .select('id, serial_number, status, created_at, unit_cost')
          .eq('product_id', item?.product_id)
          .order('created_at', { ascending: false });

        if (qErr) throw qErr;
        if (isMounted) {
          setExistingSerials((data || []) as UnitSerialRow[]);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load tracked serials');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSerials();

    return () => {
      isMounted = false;
    };
  }, [item?.product_id]);

  // Hardware Scanner integration
  useHardwareBarcodeScanner({
    enabled: !isCameraOpen,
    onScan: (scannedCode) => {
      handleAddSerial(scannedCode);
    },
  });

  const handleAddSerial = (rawSerial: string) => {
    const clean = rawSerial.trim();
    if (!clean) return;

    // Check duplicate in current queue
    if (newSerials.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setError(`Serial "${clean}" is already added in this queue.`);
      return;
    }

    // Check duplicate in existing DB records for this product
    if (existingSerials.some((s) => s.serial_number.toLowerCase() === clean.toLowerCase())) {
      setError(`Serial "${clean}" is already registered in inventory.`);
      return;
    }

    setNewSerials((prev) => [...prev, clean]);
    setSerialInput('');
    setError(null);
  };

  const handleRemoveNewSerial = (index: number) => {
    setNewSerials((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit backfilled serials
  const handleSaveSerials = async () => {
    if (newSerials.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const rowsToInsert = newSerials.map((s) => ({
        product_id: item?.product_id,
        inventory_id: item?.id,
        serial_number: s,
        serial_number_clean: s.toLowerCase().trim(),
        unit_cost: Number(unitCost) || item?.purchase_rate || 0,
        status: 'available',
        created_by: userData.user?.id || null,
      }));

      const { error: insErr } = await supabase
        .from('inventory_unit_serials')
        .insert(rowsToInsert);

      if (insErr) throw insErr;

      // Ensure product is marked as serial-tracked
      await supabase
        .from('products')
        .update({ is_serial_tracked: true })
        .eq('id', item?.product_id);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to backfill serials:', err);
      setError(err.message || 'Failed to save serials');
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  const totalStock = item.quantity_cached || 0;
  const availableCount = existingSerials.filter((s) => s.status === 'available').length;
  const soldCount = existingSerials.filter((s) => s.status === 'sold').length;
  const untrackedCount = Math.max(0, totalStock - availableCount - newSerials.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-admin-bg-dark/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-admin-bg-surface border border-admin-border rounded-2xl shadow-2xl max-w-2xl w-full animate-scale-in flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-admin-border bg-admin-bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-admin-brand/10 text-admin-brand flex items-center justify-center">
              <Tag size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-admin-text-primary">
                Manage Tracked Serials
              </h2>
              <p className="text-xs text-admin-text-muted">
                {item.products?.name} {item.products?.sku ? `(${item.products.sku})` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-admin-text-muted hover:text-admin-text-primary rounded-lg hover:bg-admin-bg-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 bg-admin-urgent-bg/10 border border-admin-urgent-border/30 rounded-xl flex items-center gap-2.5 text-admin-urgent-fg text-sm">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-admin-bg-elevated/40 border border-admin-border rounded-xl text-center">
            <div>
              <span className="text-[11px] text-admin-text-muted uppercase tracking-wider block">
                Total Physical Stock
              </span>
              <span className="text-base font-bold text-admin-text-primary">
                {totalStock} {item.products?.unit || 'Pcs'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-admin-text-muted uppercase tracking-wider block">
                Tracked in Stock
              </span>
              <span className="text-base font-bold text-admin-success">
                {availableCount + newSerials.length}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-admin-text-muted uppercase tracking-wider block">
                Untracked Stock
              </span>
              <span className="text-base font-bold text-admin-warning">
                {untrackedCount}
              </span>
            </div>
          </div>

          {/* Serial Entry Section */}
          <div className="p-4 bg-admin-bg-elevated/20 border border-admin-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-admin-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-admin-brand" />
                Register New Serial Number
              </label>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<ScanLine size={14} className="text-admin-brand" />}
                onClick={() => setIsCameraOpen(true)}
              >
                Camera Scanner
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Scan with barcode gun or type serial and press Enter..."
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSerial(serialInput);
                  }
                }}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleAddSerial(serialInput)}
                disabled={!serialInput.trim()}
              >
                Add
              </Button>
            </div>

            <p className="text-[11px] text-admin-text-muted flex items-center gap-1">
              <Info size={12} />
              Hardware barcode scanner automatically adds scanned codes without clicking.
            </p>
          </div>

          {/* New Serials to be Saved Chips */}
          {newSerials.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-admin-brand uppercase tracking-wider">
                  Pending Registration ({newSerials.length})
                </span>
                <button
                  type="button"
                  onClick={() => setNewSerials([])}
                  className="text-[11px] text-admin-urgent-fg hover:underline"
                >
                  Clear Queue
                </button>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-admin-brand/5 border border-admin-brand/20 rounded-xl max-h-36 overflow-y-auto">
                {newSerials.map((s, idx) => (
                  <span
                    key={`${s}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-admin-brand/10 border border-admin-brand/30 text-admin-brand text-xs font-mono font-medium shadow-2xs"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewSerial(idx)}
                      className="p-0.5 hover:text-admin-urgent-fg rounded transition-colors"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Existing Registered Serials Table / List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-admin-text-primary uppercase tracking-wider block">
              Currently Registered Serials ({existingSerials.length})
            </span>

            {loading ? (
              <div className="p-4 text-center text-xs text-admin-text-muted">
                Loading existing serial records...
              </div>
            ) : existingSerials.length > 0 ? (
              <div className="max-h-48 overflow-y-auto border border-admin-border rounded-xl divide-y divide-admin-border/50">
                {existingSerials.map((s) => (
                  <div key={s.id} className="px-3.5 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Tag size={12} className="text-admin-text-muted" />
                      <span className="font-mono font-bold text-admin-text-primary">
                        {s.serial_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          s.status === 'available'
                            ? 'bg-admin-success/15 text-admin-success'
                            : s.status === 'sold'
                            ? 'bg-admin-text-muted/15 text-admin-text-muted line-through'
                            : 'bg-admin-warning/15 text-admin-warning'
                        }`}
                      >
                        {s.status}
                      </span>
                      <span className="text-[11px] text-admin-text-muted">
                        {formatDate(s.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-admin-text-muted border border-dashed border-admin-border rounded-xl">
                No serial numbers have been registered for this item yet.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-admin-border bg-admin-bg-surface">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>

          <Button
            type="button"
            variant="primary"
            isLoading={saving}
            disabled={newSerials.length === 0}
            leftIcon={<CheckCircle2 size={16} />}
            onClick={handleSaveSerials}
          >
            Save {newSerials.length} Serial{newSerials.length !== 1 ? 's' : ''} to Inventory
          </Button>
        </div>
      </div>

      <CameraBarcodeScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        title={`Scan Serial for ${item.products?.name}`}
        continuous={true}
        onScan={handleAddSerial}
      />
    </div>
  );
}
