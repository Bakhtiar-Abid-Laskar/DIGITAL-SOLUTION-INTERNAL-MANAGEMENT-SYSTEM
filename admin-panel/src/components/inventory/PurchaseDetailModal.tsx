"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { 
  PurchaseWithDetails, 
  PurchaseOrderDetails,
  getImageThumbnailUrl, 
  getFullImageUrl, 
  isGoogleDriveUrl, 
  formatCurrency 
} from '@repairshop/shared';
import { 
  X, Building2, Package, Calendar, Phone, FileText, ExternalLink, 
  Image as ImageIcon, User, Tag, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { Button } from '../common/Button';
import { formatDate } from '@/utils/formatDate';

interface PurchaseDetailModalProps {
  purchase: PurchaseWithDetails | null;
  onClose: () => void;
}

export default function PurchaseDetailModal({
  purchase,
  onClose,
}: PurchaseDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [orderDetails, setOrderDetails] = useState<PurchaseOrderDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!purchase?.purchase_id) return;

    let isMounted = true;
    async function fetchDetails() {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_purchase_order_details', {
          p_purchase_id: purchase?.purchase_id,
        });
        if (error) throw error;
        if (isMounted && data) {
          setOrderDetails(data as PurchaseOrderDetails);
        }
      } catch (err) {
        console.warn('Failed to load multi-item purchase details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [purchase?.purchase_id]);

  if (!purchase) return null;

  const invoiceUrl = orderDetails?.invoice_image_url || purchase.invoice_image_url;
  const isGDrive = isGoogleDriveUrl(invoiceUrl);
  const fullImageUrl = getFullImageUrl(invoiceUrl) || invoiceUrl;
  const thumbnailUrl = getImageThumbnailUrl(invoiceUrl, 600) || invoiceUrl;

  const hasMultiItems = orderDetails && orderDetails.items && orderDetails.items.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-admin-bg-dark/80 backdrop-blur-sm animate-fade-in">
      <div 
        ref={modalRef}
        className="bg-admin-bg-surface border border-admin-border rounded-2xl shadow-2xl max-w-3xl w-full animate-scale-in flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-admin-border bg-admin-bg-surface">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-admin-brand/10 text-admin-brand border border-admin-brand/20">
                {purchase.purchase_code}
              </span>
              <h2 className="text-lg font-bold text-admin-text-primary">
                Purchase Order Details
              </h2>
            </div>
            <p className="text-xs text-admin-text-muted mt-0.5 flex items-center gap-2">
              <span>Date: {formatDate(purchase.purchase_date)}</span>
              <span>• Logged by: {orderDetails?.logged_by_name || purchase.logged_by_name || 'Admin'}</span>
            </p>
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
          {/* Supplier & Invoice Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Card */}
            <div className="p-4 bg-admin-bg-elevated/40 border border-admin-border rounded-xl space-y-2">
              <div className="text-xs font-bold text-admin-brand uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} /> Supplier Information
              </div>
              <div className="text-sm font-bold text-admin-text-primary">
                {orderDetails?.supplier?.name || purchase.supplier_name}
              </div>
              {(orderDetails?.supplier?.phone || purchase.supplier_phone) && (
                <div className="text-xs text-admin-text-muted flex items-center gap-1.5">
                  <Phone size={12} /> {orderDetails?.supplier?.phone || purchase.supplier_phone}
                </div>
              )}
              {(orderDetails?.supplier?.gstin || purchase.supplier_gstin) && (
                <div className="text-xs text-admin-text-muted flex items-center gap-1.5">
                  <FileText size={12} /> GSTIN: {orderDetails?.supplier?.gstin || purchase.supplier_gstin}
                </div>
              )}
              {(orderDetails?.supplier?.address || purchase.supplier_address) && (
                <div className="text-xs text-admin-text-muted">
                  Address: {orderDetails?.supplier?.address || purchase.supplier_address}
                </div>
              )}
            </div>

            {/* Invoice Reference Card */}
            <div className="p-4 bg-admin-bg-elevated/40 border border-admin-border rounded-xl space-y-2">
              <div className="text-xs font-bold text-admin-brand uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} /> Invoice Reference
              </div>
              <div className="text-xs text-admin-text-muted">
                Supplier Bill / Invoice Number:
              </div>
              <div className="text-sm font-mono font-bold text-admin-text-primary">
                {orderDetails?.supplier_invoice_number || purchase.supplier_invoice_number || 'N/A'}
              </div>
              <div className="text-xs text-admin-text-muted flex items-center gap-1.5 pt-1">
                <Calendar size={12} /> Intake Recorded: {formatDate(purchase.created_at)}
              </div>
            </div>
          </div>

          {/* Product Line Items */}
          <div className="border border-admin-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-admin-bg-elevated/60 border-b border-admin-border flex items-center justify-between">
              <div className="text-xs font-bold text-admin-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-admin-brand" />
                Purchased Product Lines {hasMultiItems ? `(${orderDetails.items.length})` : ''}
              </div>
            </div>

            {hasMultiItems ? (
              <div className="divide-y divide-admin-border/60">
                {orderDetails.items.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-admin-brand">#{idx + 1}</span>
                          <h4 className="text-sm font-bold text-admin-text-primary">{item.product_name}</h4>
                          {item.sku && (
                            <span className="text-[10px] font-mono bg-admin-bg-surface px-2 py-0.5 rounded border border-admin-border text-admin-text-muted">
                              SKU: {item.sku}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-admin-text-muted mt-0.5">
                          Quantity: <strong className="text-admin-text-primary">{item.quantity} {item.unit || 'Pcs'}</strong> @ {formatCurrency(item.purchase_rate)}/unit
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-admin-text-primary">
                          {formatCurrency(item.total_amount || item.purchase_rate * item.quantity)}
                        </div>
                        {item.tax_amount > 0 && (
                          <div className="text-[11px] text-admin-text-muted">
                            incl. {formatCurrency(item.tax_amount)} GST
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Serials List */}
                    {item.serials && item.serials.length > 0 && (
                      <div className="pt-2">
                        <div className="text-[11px] font-bold text-admin-text-muted uppercase tracking-wider flex items-center gap-1 mb-1.5">
                          <Tag size={12} className="text-admin-brand" /> Tracked Serials ({item.serials.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {item.serials.map((s) => (
                            <span
                              key={s.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border ${
                                s.status === 'available'
                                  ? 'bg-admin-success/10 text-admin-success border-admin-success/20'
                                  : s.status === 'sold'
                                  ? 'bg-admin-text-muted/10 text-admin-text-muted border-admin-border line-through'
                                  : 'bg-admin-warning/10 text-admin-warning border-admin-warning/20'
                              }`}
                              title={`Status: ${s.status}${s.sold_at ? ` (Sold on ${formatDate(s.sold_at)})` : ''}`}
                            >
                              <span>{s.serial_number}</span>
                              <span className="text-[9px] uppercase font-sans font-semibold">({s.status})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Legacy single-item fallback */
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-admin-text-primary">{purchase.product_name}</h3>
                    <p className="text-xs text-admin-text-muted">Quantity: {purchase.quantity} {purchase.product_unit}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-admin-text-muted">Rate / Unit</div>
                    <div className="text-sm font-semibold text-admin-text-primary">{formatCurrency(purchase.purchase_rate)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Totals */}
            <div className="bg-admin-bg-elevated/40 border-t border-admin-border p-4 space-y-1.5 text-xs text-admin-text-secondary">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-admin-text-primary">
                  {formatCurrency(orderDetails?.subtotal ?? purchase.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Applicable GST / Tax</span>
                <span className="font-semibold text-admin-text-primary">
                  {formatCurrency(orderDetails?.tax_amount ?? purchase.tax_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-admin-brand border-t border-admin-border/50 pt-2 mt-1">
                <span>Grand Total</span>
                <span>{formatCurrency(orderDetails?.total_amount ?? purchase.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notes / Remarks */}
          {(orderDetails?.notes || purchase.notes) && (
            <div className="p-3 bg-admin-bg-elevated/40 border border-admin-border rounded-xl">
              <span className="text-xs font-bold text-admin-text-muted uppercase">Notes:</span>
              <p className="text-xs text-admin-text-secondary mt-1">{orderDetails?.notes || purchase.notes}</p>
            </div>
          )}

          {/* Invoice Document Viewer */}
          {invoiceUrl ? (
            <div className="border border-admin-border rounded-xl p-4 bg-admin-bg-elevated/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-admin-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-admin-brand" />
                  Attached Invoice Document {isGDrive && '(Google Drive)'}
                </div>

                <a
                  href={fullImageUrl || invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-admin-brand hover:underline bg-admin-brand/10 hover:bg-admin-brand/20 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <ExternalLink size={13} /> Open in {isGDrive ? 'Google Drive' : 'New Tab'}
                </a>
              </div>

              <div className="relative border border-admin-border rounded-lg overflow-hidden bg-black/10 flex items-center justify-center min-h-[220px] p-2">
                <Image
                  src={thumbnailUrl || invoiceUrl}
                  alt="Supplier Invoice Document"
                  width={600}
                  height={400}
                  className="max-h-[320px] w-auto object-contain rounded"
                  unoptimized
                />
              </div>
            </div>
          ) : (
            <div className="p-4 border border-dashed border-admin-border rounded-xl text-center text-xs text-admin-text-muted">
              No invoice document was attached for this purchase.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center px-6 py-4 border-t border-admin-border bg-admin-bg-surface">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
