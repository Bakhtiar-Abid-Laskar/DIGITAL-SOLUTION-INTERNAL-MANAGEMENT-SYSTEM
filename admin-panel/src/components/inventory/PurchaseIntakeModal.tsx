"use client";

import { useState, useEffect, useRef, useReducer } from 'react';
import { supabase } from '@/lib/supabase';
import { Supplier, getImageThumbnailUrl, getFullImageUrl, isGoogleDriveUrl } from '@repairshop/shared';
import { X, ArrowRight, ArrowLeft, Building2, Package, Calendar, Phone, FileText, Upload, Link as LinkIcon, CheckCircle2, AlertTriangle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { SupplierTypeahead } from '../suppliers/SupplierTypeahead';
import { ProductTypeahead, ProductCatalogItem } from './ProductTypeahead';

interface PurchaseIntakeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function PurchaseIntakeModal({
  onClose,
  onSuccess,
}: PurchaseIntakeModalProps) {
  const [currentStep, setCurrentStep] = useState<'supplier_info' | 'product_details'>('supplier_info');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'gdrive' | 'upload'>('gdrive');

  const [state, setState] = useReducer(
    (prev: any, next: any) => ({ ...prev, ...next }),
    {
      // Step A: Supplier & Purchase Information
      supplier_id: null as string | null,
      supplier_name: '',
      supplier_phone: '',
      supplier_email: '',
      supplier_gstin: '',
      supplier_address: '',
      purchase_date: new Date().toISOString().split('T')[0],
      supplier_invoice_id: '',
      invoice_image_url: '',

      // Product Selection
      product_id: null as string | null,
      product_name: '',

      // Step B: Product & Stock Details
      sku: '',
      unit: 'Pcs',
      hsn_sac: '',
      tax_mode: 'exclusive',
      cgst_rate: 9,
      sgst_rate: 9,
      igst_rate: 18,
      quantity: 1,
      purchase_rate: 0,
      selling_rate: 0,
      low_stock_threshold: 5,
      minimum_stock_level: 0,
      location: '',
      notes: '',

      loading: false,
      error: '',
    }
  );

  const {
    supplier_id,
    supplier_name,
    supplier_phone,
    supplier_email,
    supplier_gstin,
    supplier_address,
    purchase_date,
    supplier_invoice_id,
    invoice_image_url,
    product_id,
    product_name,
    sku,
    unit,
    hsn_sac,
    tax_mode,
    cgst_rate,
    sgst_rate,
    igst_rate,
    quantity,
    purchase_rate,
    selling_rate,
    low_stock_threshold,
    minimum_stock_level,
    location,
    notes,
    loading,
    error,
  } = state;

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // When a supplier is selected from typeahead
  const handleSelectSupplier = (supplier: Supplier) => {
    setState({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      supplier_phone: supplier.phone || '',
      supplier_email: supplier.email || '',
      supplier_gstin: supplier.gstin || '',
      supplier_address: supplier.address || '',
      error: '',
    });
  };

  // When a product is selected from typeahead
  const handleSelectProduct = (product: ProductCatalogItem) => {
    setState({
      product_id: product.product_id,
      product_name: product.name,
      sku: product.sku || '',
      unit: product.unit || 'Pcs',
      hsn_sac: product.hsn_sac || '',
      tax_mode: product.tax_mode || 'exclusive',
      cgst_rate: product.cgst_rate ?? 9,
      sgst_rate: product.sgst_rate ?? 9,
      igst_rate: product.igst_rate ?? 18,
      purchase_rate: product.purchase_rate ?? 0,
      selling_rate: product.selling_rate ?? 0,
      low_stock_threshold: product.low_stock_threshold ?? 5,
      minimum_stock_level: product.minimum_stock_level ?? 0,
      location: product.location || '',
      error: '',
    });
  };

  // Handle image file upload to Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setState({ error: '' });
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `invoices/${fileName}`;

      const { data, error: uploadErr } = await supabase.storage
        .from('purchase-invoices')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage
        .from('purchase-invoices')
        .getPublicUrl(filePath);

      setState({ invoice_image_url: publicData.publicUrl });
    } catch (err: any) {
      console.error('Invoice upload failed:', err);
      setState({ error: err.message || 'Failed to upload invoice image' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Step A Validation before moving to Step B
  const handleProceedToStepB = () => {
    if (!supplier_name.trim()) {
      setState({ error: 'Please enter or select a supplier name' });
      return;
    }
    if (!product_name.trim()) {
      setState({ error: 'Please enter or select a product name' });
      return;
    }
    setState({ error: '' });
    setCurrentStep('product_details');
  };

  // Submit complete atomic purchase
  const handleSubmitPurchase = async () => {
    const parsedQty = Number(quantity);
    const parsedCost = Number(purchase_rate);
    const parsedSelling = Number(selling_rate);

    if (parsedQty <= 0) {
      setState({ error: 'Purchase quantity must be greater than 0' });
      return;
    }
    if (parsedCost < 0 || parsedSelling < 0) {
      setState({ error: 'Rates cannot be negative' });
      return;
    }

    setState({ loading: true, error: '' });

    try {
      const { data, error: rpcErr } = await supabase.rpc('log_inventory_purchase', {
        p_supplier_id: supplier_id || null,
        p_supplier_name: supplier_name.trim(),
        p_supplier_phone: supplier_phone.trim() || null,
        p_supplier_email: supplier_email.trim() || null,
        p_supplier_gstin: supplier_gstin.trim() || null,
        p_supplier_address: supplier_address.trim() || null,
        p_purchase_date: purchase_date || new Date().toISOString().split('T')[0],
        p_supplier_invoice_id: supplier_invoice_id.trim() || null,
        p_invoice_image_url: invoice_image_url.trim() || null,
        p_product_id: product_id || null,
        p_product_name: product_name.trim(),
        p_sku: sku.trim() || null,
        p_unit: unit || 'Pcs',
        p_hsn_sac: hsn_sac.trim() || null,
        p_cgst_rate: Number(cgst_rate) || 9,
        p_sgst_rate: Number(sgst_rate) || 9,
        p_igst_rate: Number(igst_rate) || 18,
        p_tax_mode: tax_mode || 'exclusive',
        p_quantity: parsedQty,
        p_purchase_rate: parsedCost,
        p_selling_rate: parsedSelling,
        p_low_stock_threshold: Number(low_stock_threshold) || 5,
        p_minimum_stock_level: Number(minimum_stock_level) || 0,
        p_location: location.trim() || null,
        p_notes: notes.trim() || null,
      });

      if (rpcErr) throw rpcErr;

      onSuccess();
    } catch (err: any) {
      console.error('Failed to log purchase:', err);
      setState({ error: err.message || 'Failed to log inventory purchase' });
    } finally {
      setState({ loading: false });
    }
  };

  // Calculation previews
  const subtotal = Number(quantity || 0) * Number(purchase_rate || 0);
  const taxRate = Number(cgst_rate || 0) + Number(sgst_rate || 0);
  const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2));
  const grandTotal = Number((subtotal + taxAmount).toFixed(2));

  const previewThumbnail = getImageThumbnailUrl(invoice_image_url, 300);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-admin-bg-dark/80 backdrop-blur-sm animate-fade-in">
      <div 
        ref={modalRef}
        className="bg-admin-bg-surface border border-admin-border rounded-2xl shadow-2xl max-w-2xl w-full animate-scale-in flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-admin-border bg-admin-bg-surface">
          <div>
            <h2 className="text-lg font-bold text-admin-text-primary flex items-center gap-2">
              <Package size={20} className="text-admin-brand" />
              Log Inventory Purchase
            </h2>
            <p className="text-xs text-admin-text-muted mt-0.5">
              {currentStep === 'supplier_info'
                ? 'Step 1 of 2: Supplier, Invoice & Product Intake'
                : 'Step 2 of 2: Product Specifications & Rates'}
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
            onClick={handleProceedToStepB}
            className={`py-2.5 text-center transition-colors flex items-center justify-center gap-2 ${
              currentStep === 'product_details'
                ? 'bg-admin-brand/10 text-admin-brand border-b-2 border-admin-brand'
                : 'text-admin-text-muted hover:text-admin-text-primary'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-admin-brand/20 text-admin-brand flex items-center justify-center text-[11px]">2</span>
            Stock & Product Details
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 bg-admin-urgent-bg/10 border border-admin-urgent-border/30 rounded-xl flex items-center gap-2.5 text-admin-urgent-fg text-sm">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ──────────────── STEP A: SUPPLIER & INVOICE DETAILS ──────────────── */}
          {currentStep === 'supplier_info' ? (
            <div className="space-y-4">
              {/* Supplier Search or Create */}
              <div>
                <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 size={14} className="text-admin-brand" />
                  Supplier Name <span className="text-admin-urgent-fg">*</span>
                </label>
                <SupplierTypeahead
                  name={supplier_name}
                  selectedSupplierId={supplier_id}
                  onChangeName={(val) => setState({ supplier_name: val, supplier_id: null })}
                  onSelectSupplier={handleSelectSupplier}
                  onClearSupplier={() => setState({ supplier_id: null })}
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
                    value={purchase_date}
                    onChange={(e) => setState({ purchase_date: e.target.value })}
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
                    value={supplier_phone}
                    onChange={(e) => setState({ supplier_phone: e.target.value })}
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
                    value={supplier_gstin}
                    onChange={(e) => setState({ supplier_gstin: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText size={14} className="text-admin-text-muted" />
                    Supplier Invoice Number / ID
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. INV-9842"
                    value={supplier_invoice_id}
                    onChange={(e) => setState({ supplier_invoice_id: e.target.value })}
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
                      value={invoice_image_url}
                      onChange={(e) => setState({ invoice_image_url: e.target.value })}
                    />
                    <p className="text-[11px] text-admin-text-muted mt-1">
                      Paste a Google Drive image link. It will automatically convert to a fast, zoomable thumbnail.
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
                        Choose Invoice Image
                      </Button>
                      {invoice_image_url && (
                        <span className="text-xs text-admin-success font-semibold flex items-center gap-1">
                          <CheckCircle2 size={13} /> Image Attached
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Live Image Preview */}
                {invoice_image_url && previewThumbnail && (
                  <div className="flex items-center gap-3 p-2 bg-admin-bg-surface border border-admin-border rounded-lg mt-2">
                    <img
                      src={previewThumbnail}
                      alt="Invoice Preview"
                      className="w-14 h-14 object-cover rounded-md border border-admin-border bg-black/10 shrink-0"
                      onError={(e) => {
                        // If direct load fails, render fallback icon
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-admin-text-primary truncate">
                        {isGoogleDriveUrl(invoice_image_url) ? 'Google Drive Invoice Document' : 'Uploaded Invoice Document'}
                      </p>
                      <a
                        href={getFullImageUrl(invoice_image_url) || invoice_image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-admin-brand hover:underline flex items-center gap-1 mt-0.5"
                      >
                        View Full Image <ExternalLink size={10} />
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => setState({ invoice_image_url: '' })}
                      className="p-1 text-admin-text-muted hover:text-admin-urgent-fg rounded"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Product Search or Create */}
              <div>
                <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Package size={14} className="text-admin-brand" />
                  Product Name <span className="text-admin-urgent-fg">*</span>
                </label>
                <ProductTypeahead
                  name={product_name}
                  selectedProductId={product_id}
                  onChangeName={(val) => setState({ product_name: val, product_id: null })}
                  onSelectProduct={handleSelectProduct}
                  onClearProduct={() => setState({ product_id: null })}
                />
                <p className="text-[11px] text-admin-text-muted mt-1">
                  Selecting an existing product auto-fills its specifications and rates in Step 2.
                </p>
              </div>
            </div>
          ) : (
            /* ──────────────── STEP B: PRODUCT DETAILS & STOCK INTAKE ──────────────── */
            <div className="space-y-4">
              {/* Product Header Banner */}
              <div className="p-3 bg-admin-brand/10 border border-admin-brand/20 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-admin-brand uppercase tracking-wider">
                    {product_id ? 'Existing Catalog Item' : 'New Product Intake'}
                  </div>
                  <div className="text-sm font-semibold text-admin-text-primary mt-0.5">
                    {product_name}
                  </div>
                </div>
                <div className="text-xs text-admin-text-muted">
                  Supplier: <strong className="text-admin-text-primary">{supplier_name}</strong>
                </div>
              </div>

              {/* Quantity Purchased & Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5">
                    Quantity Purchased <span className="text-admin-urgent-fg">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setState({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5">
                    Unit of Measure
                  </label>
                  <Select
                    value={unit}
                    onChange={(e) => setState({ unit: e.target.value })}
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Box">Box</option>
                    <option value="Set">Set</option>
                    <option value="Kg">Kg (Kilograms)</option>
                    <option value="Mtr">Mtr (Meters)</option>
                    <option value="Pack">Pack</option>
                  </Select>
                </div>
              </div>

              {/* Purchase Rate & Selling Rate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5">
                    Purchase Cost Rate (₹) <span className="text-admin-urgent-fg">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchase_rate}
                    onChange={(e) => setState({ purchase_rate: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5">
                    Default Selling Rate (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={selling_rate}
                    onChange={(e) => setState({ selling_rate: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
              </div>

              {/* SKU & HSN/SAC Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5">
                    SKU / Barcode
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. DISP-IP13-OEM"
                    value={sku}
                    onChange={(e) => setState({ sku: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5">
                    HSN / SAC Code
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 85177090"
                    value={hsn_sac}
                    onChange={(e) => setState({ hsn_sac: e.target.value })}
                  />
                </div>
              </div>

              {/* Tax Mode & Rates */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-admin-bg-elevated/40 border border-admin-border/60 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold text-admin-text-muted uppercase mb-1">
                    CGST Rate (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={cgst_rate}
                    onChange={(e) => setState({ cgst_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-admin-text-muted uppercase mb-1">
                    SGST Rate (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={sgst_rate}
                    onChange={(e) => setState({ sgst_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-admin-text-muted uppercase mb-1">
                    IGST Rate (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={igst_rate}
                    onChange={(e) => setState({ igst_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Stock Thresholds & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5">
                    Low Stock Threshold
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={low_stock_threshold}
                    onChange={(e) => setState({ low_stock_threshold: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-admin-text-primary uppercase tracking-wider mb-1.5">
                    Storage Shelf / Location
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Rack A-3, Drawer 2"
                    value={location}
                    onChange={(e) => setState({ location: e.target.value })}
                  />
                </div>
              </div>

              {/* Total Calculation Preview Badge */}
              <div className="p-4 bg-admin-brand/5 border border-admin-brand/20 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-admin-text-muted">Purchase Subtotal:</span>
                  <div className="text-sm font-semibold text-admin-text-primary">
                    {quantity} × ₹{purchase_rate} = ₹{subtotal}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-admin-text-muted">Total (incl. {taxRate}% GST):</span>
                  <div className="text-base font-bold text-admin-brand">
                    ₹{grandTotal}
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
                onClick={handleProceedToStepB}
              >
                Continue to Product Details
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
                isLoading={loading}
                leftIcon={<CheckCircle2 size={16} />}
                onClick={handleSubmitPurchase}
              >
                Log Purchase & Increment Stock
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
