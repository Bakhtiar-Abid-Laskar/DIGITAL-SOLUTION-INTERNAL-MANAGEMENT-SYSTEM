"use client";

import { useState, useEffect, useRef, useReducer } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { 
  Supplier, 
  getImageThumbnailUrl, 
  getFullImageUrl, 
  isGoogleDriveUrl, 
  formatCurrency,
  MultiItemPurchaseLinePayload 
} from '@repairshop/shared';
import { 
  X, ArrowRight, ArrowLeft, Building2, Package, Calendar, Phone, 
  FileText, Upload, Link as LinkIcon, CheckCircle2, AlertTriangle, 
  ExternalLink, Image as ImageIcon, Plus, Trash2, ScanLine, Tag, 
  Layers, Check, ChevronRight
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { SupplierTypeahead } from '../suppliers/SupplierTypeahead';
import { ProductTypeahead, ProductCatalogItem } from './ProductTypeahead';
import { useHardwareBarcodeScanner } from '@/hooks/useHardwareBarcodeScanner';
import { CameraBarcodeScannerModal } from '../common/CameraBarcodeScannerModal';

interface PurchaseIntakeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export interface PurchaseLineItemState {
  id: string; // temporary client id
  product_id: string | null;
  product_name: string;
  sku: string;
  unit: string;
  hsn_sac: string;
  tax_mode: 'inclusive' | 'exclusive';
  tax_percent: number;
  quantity: number;
  purchase_rate: number;
  selling_rate: number;
  is_serial_tracked: boolean;
  serials: string[];
  new_serial_input: string;
}

export default function PurchaseIntakeModal({
  onClose,
  onSuccess,
}: PurchaseIntakeModalProps) {
  const [currentStep, setCurrentStep] = useState<'supplier_info' | 'line_items'>('supplier_info');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'gdrive' | 'upload'>('gdrive');

  // Active line item index for camera or hardware scanner
  const [activeScannerLineIdx, setActiveScannerLineIdx] = useState<number | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Supplier & PO Header State
  const [poHeader, setPoHeader] = useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      supplier_id: null as string | null,
      supplier_name: '',
      supplier_phone: '',
      supplier_email: '',
      supplier_gstin: '',
      supplier_address: '',
      purchase_date: new Date().toISOString().split('T')[0],
      supplier_invoice_id: '',
      invoice_image_url: '',
      notes: '',
      loading: false,
      error: '',
    }
  );

  // Line items state
  const [items, setItems] = useState<PurchaseLineItemState[]>([
    {
      id: 'item-1',
      product_id: null,
      product_name: '',
      sku: '',
      unit: 'Pcs',
      hsn_sac: '',
      tax_mode: 'exclusive',
      tax_percent: 18,
      quantity: 1,
      purchase_rate: 0,
      selling_rate: 0,
      is_serial_tracked: true,
      serials: [],
      new_serial_input: '',
    },
  ]);

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCameraScannerOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isCameraScannerOpen]);

  // Hardware Scanner Hook: automatically adds to active item
  useHardwareBarcodeScanner({
    enabled: currentStep === 'line_items' && !isCameraScannerOpen,
    onScan: (scannedCode) => {
      if (activeScannerLineIdx !== null && activeScannerLineIdx < items.length) {
        handleAddSerial(activeScannerLineIdx, scannedCode);
      } else if (items.length > 0) {
        // Fallback to first line item that is tracked and needs serials
        const neededIdx = items.findIndex(
          (it) => it.is_serial_tracked && it.serials.length < it.quantity
        );
        if (neededIdx !== -1) {
          handleAddSerial(neededIdx, scannedCode);
        }
      }
    },
  });

  // When a supplier is selected from typeahead
  const handleSelectSupplier = (supplier: Supplier) => {
    setPoHeader({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      supplier_phone: supplier.phone || '',
      supplier_email: supplier.email || '',
      supplier_gstin: supplier.gstin || '',
      supplier_address: supplier.address || '',
      error: '',
    });
  };

  // Handle invoice image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setPoHeader({ error: '' });
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `invoices/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('purchase-invoices')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage
        .from('purchase-invoices')
        .getPublicUrl(filePath);

      setPoHeader({ invoice_image_url: publicData.publicUrl });
    } catch (err: any) {
      console.error('Invoice upload failed:', err);
      setPoHeader({ error: err.message || 'Failed to upload invoice image' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Add line item
  const handleAddLineItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        product_id: null,
        product_name: '',
        sku: '',
        unit: 'Pcs',
        hsn_sac: '',
        tax_mode: 'exclusive',
        tax_percent: 18,
        quantity: 1,
        purchase_rate: 0,
        selling_rate: 0,
        is_serial_tracked: true,
        serials: [],
        new_serial_input: '',
      },
    ]);
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    if (items.length <= 1) {
      setPoHeader({ error: 'Purchase order must have at least one product item.' });
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (activeScannerLineIdx === index) {
      setActiveScannerLineIdx(null);
    }
  };

  // Update line item property
  const updateLineItem = (index: number, patch: Partial<PurchaseLineItemState>) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  // Select catalog product for a line item
  const handleSelectProduct = (index: number, product: ProductCatalogItem) => {
    const totalGst = (product.cgst_rate ?? 9) + (product.sgst_rate ?? 9);
    updateLineItem(index, {
      product_id: product.product_id,
      product_name: product.name,
      sku: product.sku || '',
      unit: product.unit || 'Pcs',
      hsn_sac: product.hsn_sac || '',
      tax_mode: (product.tax_mode as 'inclusive' | 'exclusive') || 'exclusive',
      tax_percent: totalGst > 0 ? totalGst : 18,
      purchase_rate: product.purchase_rate ?? 0,
      selling_rate: product.selling_rate ?? 0,
    });
    setPoHeader({ error: '' });
  };

  // Add a serial to a line item
  const handleAddSerial = (index: number, rawSerial: string) => {
    const serial = rawSerial.trim();
    if (!serial) return;

    const currentItem = items[index];
    if (!currentItem) return;

    // Check if duplicate within this item
    if (currentItem.serials.some((s) => s.toLowerCase() === serial.toLowerCase())) {
      setPoHeader({
        error: `Serial "${serial}" has already been entered for "${currentItem.product_name || 'this item'}".`,
      });
      return;
    }

    // Check if duplicate across other items in this PO
    for (let i = 0; i < items.length; i++) {
      if (i !== index && items[i].serials.some((s) => s.toLowerCase() === serial.toLowerCase())) {
        setPoHeader({
          error: `Serial "${serial}" is already scanned in another item line.`,
        });
        return;
      }
    }

    // Check if already captured enough
    if (currentItem.serials.length >= currentItem.quantity) {
      setPoHeader({
        error: `Item "${currentItem.product_name || 'Item'}" already has all ${currentItem.quantity} serial(s) captured. Increase quantity if you wish to add more.`,
      });
      return;
    }

    // Add serial and clear input
    updateLineItem(index, {
      serials: [...currentItem.serials, serial],
      new_serial_input: '',
    });
    setPoHeader({ error: '' });
  };

  // Remove a serial
  const handleRemoveSerial = (itemIdx: number, serialIdx: number) => {
    const currentItem = items[itemIdx];
    if (!currentItem) return;
    const updated = currentItem.serials.filter((_, i) => i !== serialIdx);
    updateLineItem(itemIdx, { serials: updated });
  };

  // Step 1 Validation
  const handleProceedToStep2 = () => {
    if (!poHeader.supplier_name.trim()) {
      setPoHeader({ error: 'Please enter or select a supplier name' });
      return;
    }
    setPoHeader({ error: '' });
    setCurrentStep('line_items');
  };

  // Calculate totals
  const summary = items.reduce(
    (acc, it) => {
      const lineSubtotal = (Number(it.quantity) || 0) * (Number(it.purchase_rate) || 0);
      const lineTax = (lineSubtotal * (Number(it.tax_percent) || 0)) / 100;
      const lineTotal = lineSubtotal + lineTax;
      return {
        totalUnits: acc.totalUnits + (Number(it.quantity) || 0),
        subtotal: acc.subtotal + lineSubtotal,
        taxAmount: acc.taxAmount + lineTax,
        grandTotal: acc.grandTotal + lineTotal,
      };
    },
    { totalUnits: 0, subtotal: 0, taxAmount: 0, grandTotal: 0 }
  );

  // Submit complete atomic purchase
  const handleSubmitPurchase = async () => {
    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itemName = it.product_name.trim() || `Item #${i + 1}`;

      if (!it.product_name.trim()) {
        setPoHeader({ error: `Please enter a product name for Item #${i + 1}.` });
        return;
      }
      if (it.quantity <= 0) {
        setPoHeader({ error: `Quantity for "${itemName}" must be greater than 0.` });
        return;
      }
      if (it.purchase_rate < 0) {
        setPoHeader({ error: `Purchase rate for "${itemName}" cannot be negative.` });
        return;
      }
      if (it.is_serial_tracked && it.serials.length !== it.quantity) {
        setPoHeader({
          error: `Item "${itemName}" requires ${it.quantity} serial number(s), but ${it.serials.length} provided. Please capture all serials before submitting.`,
        });
        return;
      }
    }

    setPoHeader({ loading: true, error: '' });

    try {
      const itemsPayload: MultiItemPurchaseLinePayload[] = items.map((it) => ({
        product_id: it.product_id || null,
        product_name: it.product_name.trim(),
        sku: it.sku.trim() || null,
        unit: it.unit || 'Pcs',
        hsn_sac: it.hsn_sac.trim() || null,
        tax_percent: Number(it.tax_percent) || 18,
        tax_mode: it.tax_mode || 'exclusive',
        quantity: Number(it.quantity),
        purchase_rate: Number(it.purchase_rate),
        selling_rate: Number(it.selling_rate) || 0,
        is_serial_tracked: it.is_serial_tracked,
        serials: it.is_serial_tracked ? it.serials : [],
      }));

      const { data, error: rpcErr } = await supabase.rpc('log_multi_item_purchase', {
        p_supplier_id: poHeader.supplier_id || null,
        p_supplier_name: poHeader.supplier_name.trim(),
        p_supplier_phone: poHeader.supplier_phone.trim() || null,
        p_supplier_email: poHeader.supplier_email.trim() || null,
        p_supplier_gstin: poHeader.supplier_gstin.trim() || null,
        p_supplier_address: poHeader.supplier_address.trim() || null,
        p_purchase_date: poHeader.purchase_date || new Date().toISOString().split('T')[0],
        p_supplier_invoice_id: poHeader.supplier_invoice_id.trim() || null,
        p_invoice_image_url: poHeader.invoice_image_url.trim() || null,
        p_notes: poHeader.notes.trim() || null,
        p_items: itemsPayload as any,
      });

      if (rpcErr) throw rpcErr;

      onSuccess();
    } catch (err: any) {
      console.error('Failed to log multi-item purchase:', err);
      setPoHeader({ error: err.message || 'Failed to log inventory purchase' });
    } finally {
      setPoHeader({ loading: false });
    }
  };

  const previewThumbnail = getImageThumbnailUrl(poHeader.invoice_image_url, 300);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-admin-bg-dark/80 backdrop-blur-sm animate-fade-in">
      <div 
        ref={modalRef}
        className="bg-admin-bg-surface border border-admin-border rounded-2xl shadow-2xl max-w-4xl w-full animate-scale-in flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-admin-border bg-admin-bg-surface">
          <div>
            <h2 className="text-lg font-bold text-admin-text-primary flex items-center gap-2">
              <Package size={20} className="text-admin-brand" />
              Log Inventory Purchase Order
            </h2>
            <p className="text-xs text-admin-text-muted mt-0.5">
              {currentStep === 'supplier_info'
                ? 'Step 1 of 2: Supplier, Invoice & Purchase Metadata'
                : `Step 2 of 2: Multi-Item Stock Intake & Serial Number Capture (${items.length} Product${items.length > 1 ? 's' : ''})`}
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-admin-text-muted hover:text-admin-text-primary rounded-lg hover:bg-admin-bg-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div className="grid grid-cols-2 border-b border-admin-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCurrentStep('supplier_info')}
            className={`py-2.5 text-center transition-colors flex items-center justify-center gap-2 ${
              currentStep === 'supplier_info'
                ? 'bg-admin-brand/10 text-admin-brand border-b-2 border-admin-brand'
                : 'text-admin-text-muted hover:text-admin-text-primary'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-admin-brand/20 text-admin-brand flex items-center justify-center text-[11px]">1</span>
            Supplier & Invoice Details
          </button>

          <button
            type="button"
            onClick={handleProceedToStep2}
            className={`py-2.5 text-center transition-colors flex items-center justify-center gap-2 ${
              currentStep === 'line_items'
                ? 'bg-admin-brand/10 text-admin-brand border-b-2 border-admin-brand'
                : 'text-admin-text-muted hover:text-admin-text-primary'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-admin-brand/20 text-admin-brand flex items-center justify-center text-[11px]">2</span>
            Product Lines & Serial Tracking
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {poHeader.error && (
            <div className="p-3 bg-admin-urgent-bg/10 border border-admin-urgent-border/30 rounded-xl flex items-center gap-2.5 text-admin-urgent-fg text-sm">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{poHeader.error}</span>
            </div>
          )}

          {/* ──────────────── STEP 1: SUPPLIER & INVOICE DETAILS ──────────────── */}
          {currentStep === 'supplier_info' ? (
            <div className="space-y-4">
              {/* Supplier Search or Create */}
              <div>
                <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 size={14} className="text-admin-brand" />
                  Supplier Name <span className="text-admin-urgent-fg">*</span>
                </label>
                <SupplierTypeahead
                  name={poHeader.supplier_name}
                  selectedSupplierId={poHeader.supplier_id}
                  onChangeName={(val) => setPoHeader({ supplier_name: val, supplier_id: null })}
                  onSelectSupplier={handleSelectSupplier}
                  onClearSupplier={() => setPoHeader({ supplier_id: null })}
                />
              </div>

              {/* Purchase Date & Supplier Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar size={14} className="text-admin-text-muted" />
                    Purchase Date <span className="text-admin-urgent-fg">*</span>
                  </label>
                  <Input
                    type="date"
                    value={poHeader.purchase_date}
                    onChange={(e) => setPoHeader({ purchase_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Phone size={14} className="text-admin-text-muted" />
                    Supplier Phone
                  </label>
                  <Input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={poHeader.supplier_phone}
                    onChange={(e) => setPoHeader({ supplier_phone: e.target.value })}
                  />
                </div>
              </div>

              {/* GSTIN & Invoice ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText size={14} className="text-admin-text-muted" />
                    Supplier GSTIN (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    value={poHeader.supplier_gstin}
                    onChange={(e) => setPoHeader({ supplier_gstin: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText size={14} className="text-admin-text-muted" />
                    Supplier Invoice Number / Bill Ref
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. INV-9842"
                    value={poHeader.supplier_invoice_id}
                    onChange={(e) => setPoHeader({ supplier_invoice_id: e.target.value })}
                  />
                </div>
              </div>

              {/* Invoice Image: Google Drive Link or Upload */}
              <div className="p-4 bg-admin-bg-elevated/40 border border-admin-border/70 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-admin-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-admin-brand" />
                    Supplier Invoice Document (Optional)
                  </label>

                  <div className="flex items-center gap-1 bg-admin-bg-surface p-0.5 rounded-lg border border-admin-border text-xs">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('gdrive')}
                      className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                        imageInputMode === 'gdrive'
                          ? 'bg-admin-brand text-white font-medium shadow-sm'
                          : 'text-admin-text-muted hover:text-admin-text-primary'
                      }`}
                    >
                      <LinkIcon size={12} /> Google Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                        imageInputMode === 'upload'
                          ? 'bg-admin-brand text-white font-medium shadow-sm'
                          : 'text-admin-text-muted hover:text-admin-text-primary'
                      }`}
                    >
                      <Upload size={12} /> Direct Upload
                    </button>
                  </div>
                </div>

                {imageInputMode === 'gdrive' ? (
                  <div>
                    <Input
                      type="url"
                      placeholder="Paste Google Drive sharing link (e.g. https://drive.google.com/file/d/...)"
                      value={poHeader.invoice_image_url}
                      onChange={(e) => setPoHeader({ invoice_image_url: e.target.value })}
                    />
                    <p className="text-[11px] text-admin-text-muted mt-1">
                      Paste a Google Drive image link. It will automatically convert to a fast, zoomable preview.
                    </p>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        isLoading={uploadingImage}
                        leftIcon={<Upload size={14} />}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose Invoice File
                      </Button>
                      {poHeader.invoice_image_url && (
                        <span className="text-xs text-admin-success font-semibold flex items-center gap-1">
                          <CheckCircle2 size={13} /> Document Attached
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Live Image Preview */}
                {poHeader.invoice_image_url && previewThumbnail && (
                  <div className="flex items-center gap-3 p-2 bg-admin-bg-surface border border-admin-border rounded-lg mt-2">
                    <Image
                      src={previewThumbnail}
                      alt="Invoice Preview"
                      width={56}
                      height={56}
                      className="w-14 h-14 object-cover rounded-md border border-admin-border bg-black/10 shrink-0"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-admin-text-primary truncate">
                        {isGoogleDriveUrl(poHeader.invoice_image_url) ? 'Google Drive Invoice Document' : 'Uploaded Invoice Document'}
                      </p>
                      <a
                        href={getFullImageUrl(poHeader.invoice_image_url) || poHeader.invoice_image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-admin-brand hover:underline flex items-center gap-1 mt-0.5"
                      >
                        View Full Document <ExternalLink size={10} />
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPoHeader({ invoice_image_url: '' })}
                      className="p-1 text-admin-text-muted hover:text-admin-urgent-fg rounded"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Remarks / Notes */}
              <div>
                <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5">
                  Purchase Order Notes (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Shipment received via Delhivery in good condition"
                  value={poHeader.notes}
                  onChange={(e) => setPoHeader({ notes: e.target.value })}
                />
              </div>
            </div>
          ) : (
            /* ──────────────── STEP 2: MULTI-ITEM STOCK INTAKE & SERIALS ──────────────── */
            <div className="space-y-6">
              {/* Supplier Header Pill */}
              <div className="flex items-center justify-between p-3 bg-admin-brand/5 border border-admin-brand/20 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-admin-text-secondary">
                  <span>Supplier: <strong className="text-admin-text-primary">{poHeader.supplier_name}</strong></span>
                  <span>• Date: <strong className="text-admin-text-primary">{poHeader.purchase_date}</strong></span>
                  {poHeader.supplier_invoice_id && (
                    <span>• Invoice: <strong className="text-admin-text-primary">{poHeader.supplier_invoice_id}</strong></span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={handleAddLineItem}
                >
                  Add Another Product
                </Button>
              </div>

              {/* Repeatable Line Items */}
              <div className="space-y-5">
                {items.map((item, idx) => {
                  const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.purchase_rate) || 0);
                  const isCapturedComplete = item.is_serial_tracked && item.serials.length === item.quantity;
                  const hasMissingSerials = item.is_serial_tracked && item.serials.length < item.quantity;

                  return (
                    <div 
                      key={item.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        activeScannerLineIdx === idx
                          ? 'border-admin-brand bg-admin-brand/5 shadow-md'
                          : 'border-admin-border bg-admin-bg-elevated/20'
                      }`}
                    >
                      {/* Line Item Header */}
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-admin-border/60">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-admin-brand/20 text-admin-brand flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-bold text-admin-text-primary">
                            {item.product_name ? item.product_name : `Product Line #${idx + 1}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Track Serials Toggle */}
                          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-admin-text-secondary bg-admin-bg-surface px-2.5 py-1 rounded-lg border border-admin-border">
                            <input
                              type="checkbox"
                              checked={item.is_serial_tracked}
                              onChange={(e) => updateLineItem(idx, { is_serial_tracked: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-admin-brand focus:ring-0"
                            />
                            <span>Track Individual Serials</span>
                          </label>

                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="p-1.5 text-admin-text-muted hover:text-admin-urgent-fg rounded-lg hover:bg-admin-urgent-bg/10 transition-colors"
                              title="Remove this product line"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Product Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5">
                            Product Name <span className="text-admin-urgent-fg">*</span>
                          </label>
                          <ProductTypeahead
                            name={item.product_name}
                            selectedProductId={item.product_id}
                            onChangeName={(val) => updateLineItem(idx, { product_name: val, product_id: null })}
                            onSelectProduct={(p) => handleSelectProduct(idx, p)}
                            onClearProduct={() => updateLineItem(idx, { product_id: null })}
                            placeholder="Select catalog product or type new name..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5">
                            SKU / Model Code
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. DISP-IP13-OEM"
                            value={item.sku}
                            onChange={(e) => updateLineItem(idx, { sku: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Quantity, Rates & GST */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div>
                          <label className="block text-[11px] font-bold text-admin-text-primary uppercase mb-1">
                            Quantity <span className="text-admin-urgent-fg">*</span>
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-admin-text-primary uppercase mb-1">
                            Unit
                          </label>
                          <Select
                            value={item.unit}
                            onChange={(e) => updateLineItem(idx, { unit: e.target.value })}
                          >
                            <option value="Pcs">Pcs</option>
                            <option value="Box">Box</option>
                            <option value="Set">Set</option>
                            <option value="Kg">Kg</option>
                            <option value="Pack">Pack</option>
                          </Select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-admin-text-primary uppercase mb-1">
                            Purchase Cost (₹) <span className="text-admin-urgent-fg">*</span>
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.purchase_rate}
                            onChange={(e) => updateLineItem(idx, { purchase_rate: Math.max(0, parseFloat(e.target.value) || 0) })}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-admin-text-primary uppercase mb-1">
                            Selling Rate (₹)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.selling_rate}
                            onChange={(e) => updateLineItem(idx, { selling_rate: Math.max(0, parseFloat(e.target.value) || 0) })}
                          />
                        </div>
                      </div>

                      {/* Line Subtotal Preview */}
                      <div className="flex justify-between items-center text-xs text-admin-text-muted px-2 py-1 mb-3">
                        <span>Rate: ₹{item.purchase_rate} × {item.quantity} {item.unit}</span>
                        <span>Line Subtotal: <strong className="text-admin-text-primary">₹{lineSubtotal.toFixed(2)}</strong></span>
                      </div>

                      {/* ─── SERIAL NUMBER CAPTURE SECTION ─── */}
                      {item.is_serial_tracked && (
                        <div className="p-4 bg-admin-bg-surface border border-admin-border/80 rounded-xl space-y-3">
                          {/* Status and Action bar */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Tag size={14} className="text-admin-brand" />
                              <span className="text-xs font-bold text-admin-text-primary uppercase tracking-wider">
                                Serial Numbers
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                                  isCapturedComplete
                                    ? 'bg-admin-success/15 text-admin-success border border-admin-success/30'
                                    : 'bg-admin-warning/15 text-admin-warning border border-admin-warning/30'
                                }`}
                              >
                                {isCapturedComplete ? (
                                  <>
                                    <Check size={12} /> Captured {item.serials.length} of {item.quantity}
                                  </>
                                ) : (
                                  <>Captured {item.serials.length} of {item.quantity}</>
                                )}
                              </span>
                            </div>

                            {/* Camera Barcode Scanner trigger */}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              leftIcon={<ScanLine size={14} className="text-admin-brand" />}
                              onClick={() => {
                                setActiveScannerLineIdx(idx);
                                setIsCameraScannerOpen(true);
                              }}
                            >
                              Scan with Camera
                            </Button>
                          </div>

                          {/* Serial Entry Input */}
                          {hasMissingSerials && (
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                placeholder={`Scan or type serial #${item.serials.length + 1} and press Enter...`}
                                value={item.new_serial_input}
                                onFocus={() => setActiveScannerLineIdx(idx)}
                                onChange={(e) => updateLineItem(idx, { new_serial_input: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSerial(idx, item.new_serial_input);
                                  }
                                }}
                                className="font-mono text-xs"
                              />
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => handleAddSerial(idx, item.new_serial_input)}
                                disabled={!item.new_serial_input.trim()}
                              >
                                Add
                              </Button>
                            </div>
                          )}

                          {/* Captured Serials Chips */}
                          {item.serials.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                              {item.serials.map((s, sIdx) => (
                                <span
                                  key={`${s}-${sIdx}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-admin-brand/10 border border-admin-brand/30 text-admin-brand text-xs font-mono font-medium shadow-xs"
                                >
                                  <span className="text-[10px] text-admin-text-muted">#{sIdx + 1}</span>
                                  <span>{s}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSerial(idx, sIdx)}
                                    className="p-0.5 hover:text-admin-urgent-fg rounded transition-colors ml-0.5"
                                    title="Remove this serial"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-admin-text-muted italic">
                              No serial numbers captured yet. Scan with barcode reader or type manually above.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Product Button */}
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  leftIcon={<Plus size={16} />}
                  onClick={handleAddLineItem}
                  className="w-full py-2.5 border-dashed"
                >
                  Add Another Product Line Item
                </Button>
              </div>

              {/* Order Total Summary Banner */}
              <div className="p-4 bg-admin-brand/5 border border-admin-brand/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-admin-text-muted">Purchase Order Summary</div>
                  <div className="text-sm font-semibold text-admin-text-primary mt-0.5">
                    {items.length} Product Line{items.length > 1 ? 's' : ''} • {summary.totalUnits} Total Units
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:text-right">
                  <div>
                    <span className="text-xs text-admin-text-muted block">Subtotal</span>
                    <span className="text-sm font-semibold text-admin-text-primary">
                      ₹{summary.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-admin-text-muted block">Tax Amount</span>
                    <span className="text-sm font-semibold text-admin-text-primary">
                      ₹{summary.taxAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-l border-admin-border pl-6">
                    <span className="text-xs text-admin-text-muted block">Grand Total</span>
                    <span className="text-base font-bold text-admin-brand">
                      ₹{summary.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-admin-border bg-admin-bg-surface">
          {currentStep === 'supplier_info' ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>

              <Button
                type="button"
                variant="primary"
                rightIcon={<ArrowRight size={16} />}
                onClick={handleProceedToStep2}
              >
                Continue to Product Lines ({items.length})
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                leftIcon={<ArrowLeft size={16} />}
                onClick={() => setCurrentStep('supplier_info')}
              >
                Back to Supplier Info
              </Button>

              <Button
                type="button"
                variant="primary"
                isLoading={poHeader.loading}
                leftIcon={<CheckCircle2 size={16} />}
                onClick={handleSubmitPurchase}
              >
                Submit Purchase Order & Save Serials
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      {activeScannerLineIdx !== null && items[activeScannerLineIdx] && (
        <CameraBarcodeScannerModal
          isOpen={isCameraScannerOpen}
          onClose={() => setIsCameraScannerOpen(false)}
          title={`Scan Barcode for ${items[activeScannerLineIdx].product_name || 'Product'}`}
          continuous={true}
          targetCount={items[activeScannerLineIdx].quantity}
          currentCount={items[activeScannerLineIdx].serials.length}
          onScan={(scannedCode) => {
            handleAddSerial(activeScannerLineIdx, scannedCode);
          }}
        />
      )}
    </div>
  );
}
