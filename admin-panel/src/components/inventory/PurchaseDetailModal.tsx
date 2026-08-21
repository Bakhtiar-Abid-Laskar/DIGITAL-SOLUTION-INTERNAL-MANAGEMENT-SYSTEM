"use client";

import React, { useEffect, useRef } from 'react';
import { PurchaseWithDetails, getImageThumbnailUrl, getFullImageUrl, isGoogleDriveUrl, formatCurrency } from '@repairshop/shared';
import { X, Building2, Package, Calendar, Phone, FileText, ExternalLink, Image as ImageIcon, CheckCircle2, User, Hash, DollarSign } from 'lucide-react';
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!purchase) return null;

  const invoiceUrl = purchase.invoice_image_url;
  const isGDrive = isGoogleDriveUrl(invoiceUrl);
  const fullImageUrl = getFullImageUrl(invoiceUrl) || invoiceUrl;
  const thumbnailUrl = getImageThumbnailUrl(invoiceUrl, 600) || invoiceUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-admin-bg-dark/80 backdrop-blur-sm animate-fade-in">
      <div 
        ref={modalRef}
        className="bg-admin-bg-surface border border-admin-border rounded-2xl shadow-2xl max-w-2xl w-full animate-scale-in flex flex-col max-h-[90vh] overflow-hidden"
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
              <span>• Logged by: {purchase.logged_by_name || 'Admin'}</span>
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
                {purchase.supplier_name}
              </div>
              {purchase.supplier_phone && (
                <div className="text-xs text-admin-text-muted flex items-center gap-1.5">
                  <Phone size={12} /> {purchase.supplier_phone}
                </div>
              )}
              {purchase.supplier_gstin && (
                <div className="text-xs text-admin-text-muted flex items-center gap-1.5">
                  <FileText size={12} /> GSTIN: {purchase.supplier_gstin}
                </div>
              )}
              {purchase.supplier_address && (
                <div className="text-xs text-admin-text-muted">
                  Address: {purchase.supplier_address}
                </div>
              )}
            </div>

            {/* Invoice Reference Card */}
            <div className="p-4 bg-admin-bg-elevated/40 border border-admin-border rounded-xl space-y-2">
              <div className="text-xs font-bold text-admin-brand uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} /> Invoice Reference
              </div>
              <div className="text-xs text-admin-text-muted">
                Invoice Number:
              </div>
              <div className="text-sm font-mono font-bold text-admin-text-primary">
                {purchase.supplier_invoice_number || 'N/A (No Invoice ID provided)'}
              </div>
              <div className="text-xs text-admin-text-muted flex items-center gap-1.5 pt-1">
                <Calendar size={12} /> Intake Recorded: {formatDate(purchase.created_at)}
              </div>
            </div>
          </div>

          {/* Product & Financial Details Table */}
          <div className="border border-admin-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-admin-bg-elevated/60 border-b border-admin-border flex items-center justify-between">
              <div className="text-xs font-bold text-admin-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-admin-brand" />
                Purchased Item
              </div>
              {purchase.product_sku && (
                <span className="text-[11px] font-mono bg-admin-bg-surface px-2 py-0.5 rounded border border-admin-border text-admin-text-muted">
                  SKU: {purchase.product_sku}
                </span>
              )}
            </div>

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

              <div className="border-t border-admin-border/50 pt-3 space-y-1.5 text-xs text-admin-text-secondary">
                <div className="flex justify-between">
                  <span>Subtotal ({purchase.quantity} × {formatCurrency(purchase.purchase_rate)})</span>
                  <span className="font-semibold text-admin-text-primary">{formatCurrency(purchase.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Applicable GST / Tax</span>
                  <span className="font-semibold text-admin-text-primary">{formatCurrency(purchase.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-admin-brand border-t border-admin-border/50 pt-2 mt-1">
                  <span>Grand Total</span>
                  <span>{formatCurrency(purchase.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes / Remarks */}
          {purchase.notes && (
            <div className="p-3 bg-admin-bg-elevated/40 border border-admin-border rounded-xl">
              <span className="text-xs font-bold text-admin-text-muted uppercase">Notes:</span>
              <p className="text-xs text-admin-text-secondary mt-1">{purchase.notes}</p>
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

              <div className="relative border border-admin-border rounded-lg overflow-hidden bg-black/10 flex items-center justify-center min-h-[220px]">
                <img
                  src={thumbnailUrl || invoiceUrl}
                  alt="Supplier Invoice Document"
                  className="max-h-[320px] w-auto object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
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
