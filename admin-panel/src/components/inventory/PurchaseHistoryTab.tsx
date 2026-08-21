"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PurchaseWithDetails, getImageThumbnailUrl, isGoogleDriveUrl, formatCurrency, useDebounceValue } from '@repairshop/shared';
import { Search, Filter, Calendar, Building2, Package, Eye, ExternalLink, Image as ImageIcon, Plus, FileText, ArrowUpDown } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Card } from '../common/Card';
import { Pagination } from '../common/Pagination';
import { DataTableSkeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { formatDate } from '@/utils/formatDate';
import PurchaseDetailModal from './PurchaseDetailModal';

interface PurchaseHistoryTabProps {
  onOpenIntakeModal: () => void;
}

export function PurchaseHistoryTab({ onOpenIntakeModal }: PurchaseHistoryTabProps) {
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounceValue(searchQuery, 300);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithDetails | null>(null);

  const PAGE_SIZE = 15;

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_purchase_history', {
        p_search: debouncedSearch.trim() || null,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_limit: PAGE_SIZE,
        p_offset: (currentPage - 1) * PAGE_SIZE,
      });

      if (error) throw error;
      setPurchases((data || []) as PurchaseWithDetails[]);
    } catch (err) {
      console.error('Error fetching purchase history:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, startDate, endDate, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, startDate, endDate]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  return (
    <div className="space-y-4 flex-1 flex flex-col">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-admin-bg-surface p-4 rounded-xl border border-admin-border shadow-sm">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Input
              type="text"
              placeholder="Search by PO code, supplier, product, or invoice ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted pointer-events-none" />
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs"
              placeholder="Start Date"
            />
            <span className="text-xs text-admin-text-muted">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs"
              placeholder="End Date"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-admin-brand hover:underline shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus size={15} />}
          onClick={onOpenIntakeModal}
        >
          Log Purchase
        </Button>
      </div>

      {/* Table / List View */}
      <Card className="flex-1 overflow-hidden flex flex-col border border-admin-border shadow-sm">
        {loading ? (
          <div className="p-6">
            <DataTableSkeleton rows={6} />
          </div>
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={<Package size={40} className="text-admin-text-muted" />}
            heading="No Purchase Records Found"
            subtext="Log your first inventory purchase intake with supplier details to track purchase history."
            asCard={false}
            action={
              <Button size="sm" leftIcon={<Plus size={14} />} onClick={onOpenIntakeModal}>
                Log First Purchase
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-admin-text-secondary">
              <thead className="bg-admin-bg-elevated/80 border-b border-admin-border text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
                <tr>
                  <th className="py-3 px-4">PO Code & Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Product & SKU</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Cost Rate</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Invoice Doc</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border/60">
                {purchases.map((item) => {
                  const thumb = getImageThumbnailUrl(item.invoice_image_url, 150);
                  const isGDrive = isGoogleDriveUrl(item.invoice_image_url);

                  return (
                    <tr 
                      key={item.purchase_id}
                      onClick={() => setSelectedPurchase(item)}
                      className="hover:bg-admin-bg-hover cursor-pointer transition-colors"
                    >
                      {/* PO Code & Date */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-xs text-admin-brand">
                          {item.purchase_code}
                        </div>
                        <div className="text-[11px] text-admin-text-muted mt-0.5">
                          {formatDate(item.purchase_date)}
                        </div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-admin-text-primary text-sm">
                          {item.supplier_name}
                        </div>
                        {item.supplier_phone && (
                          <div className="text-xs text-admin-text-muted">
                            {item.supplier_phone}
                          </div>
                        )}
                      </td>

                      {/* Product */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-admin-text-primary text-sm">
                          {item.product_name}
                        </div>
                        {item.product_sku && (
                          <span className="text-[10px] font-mono bg-admin-bg-elevated px-1.5 py-0.2 rounded border border-admin-border text-admin-text-muted">
                            {item.product_sku}
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 text-center font-bold text-admin-text-primary">
                        {item.quantity} <span className="text-xs font-normal text-admin-text-muted">{item.product_unit}</span>
                      </td>

                      {/* Cost Rate */}
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(item.purchase_rate)}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 text-right font-bold text-admin-text-primary">
                        {formatCurrency(item.total_amount)}
                      </td>

                      {/* Invoice Doc Thumbnail */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {item.invoice_image_url ? (
                          <a
                            href={item.invoice_image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 p-1 bg-admin-bg-elevated hover:bg-admin-bg-hover rounded-lg border border-admin-border transition-colors group"
                            title={isGDrive ? "Open in Google Drive" : "View Invoice Image"}
                          >
                            <img
                              src={thumb || item.invoice_image_url}
                              alt="Invoice Thumb"
                              className="w-7 h-7 object-cover rounded bg-black/10"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <ExternalLink size={12} className="text-admin-text-muted group-hover:text-admin-brand" />
                          </a>
                        ) : (
                          <span className="text-xs text-admin-text-muted">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Eye size={13} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPurchase(item);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {purchases.length >= PAGE_SIZE && (
          <div className="p-4 border-t border-admin-border flex justify-between items-center">
            <Button
              size="sm"
              variant="secondary"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-admin-text-muted">Page {currentPage}</span>
            <Button
              size="sm"
              variant="secondary"
              disabled={purchases.length < PAGE_SIZE}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Purchase Detail Modal */}
      {selectedPurchase && (
        <PurchaseDetailModal
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
        />
      )}
    </div>
  );
}
