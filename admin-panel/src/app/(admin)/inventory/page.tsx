"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { InventoryWithProduct, useDebounceValue, formatCurrency } from '@repairshop/shared';
import { Plus, Edit2, Trash2, AlertTriangle, Package, PlusCircle, History, Layers } from "lucide-react";
import InventoryFormModal from "@/components/inventory/InventoryFormModal";
import PurchaseIntakeModal from "@/components/inventory/PurchaseIntakeModal";
import AddStockModal from "@/components/inventory/AddStockModal";
import { PurchaseHistoryTab } from "@/components/inventory/PurchaseHistoryTab";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabItem } from "@/components/common/Tabs";
import { SearchFilterBar } from "@/components/common/SearchFilterBar";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { DataTableSkeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { useToast } from "@/components/common/ToastProvider";
import { Pagination } from "@/components/common/Pagination";
import { formatDate } from "@/utils/formatDate";

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'inventory' | 'purchases'>('inventory');
  const [inventory, setInventory] = useState<InventoryWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryWithProduct | null>(null);
  
  const { showToast } = useToast();
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const fetchInventory = useCallback(async (cancelled = false) => {
    if (!cancelled) setLoading(true);
    try {
      let query = supabase
        .from('inventory')
        .select('*, products!inner(*)', { count: 'exact' })
        .eq('products.is_active', true)
        .order('name', { referencedTable: 'products', ascending: true });

      if (debouncedSearchQuery) {
        query = query.or(`name.ilike.%${debouncedSearchQuery}%,sku.ilike.%${debouncedSearchQuery}%`, { referencedTable: 'products' });
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
        
      if (cancelled) return;
      if (error) throw error;
      if (data) setInventory(data as unknown as InventoryWithProduct[]);
      if (count !== null) setTotalPages(Math.ceil(count / PAGE_SIZE) || 1);
    } catch (err: unknown) {
      if (cancelled) return;
      console.error(err);
      showToast('Failed to fetch inventory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, showToast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    fetchInventory(cancelled);
    
    const channel = supabase.channel('admin-inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        fetchInventory();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [fetchInventory]);

  const handleDelete = (productId: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Item',
      message: `Are you sure you want to delete "${name}"? This will remove all associated stock data.`,
      onConfirm: async () => {
        let { error } = await supabase.from('products').delete().eq('id', productId);
        if (error && error.code === '23503') {
          const { error: softDeleteError } = await supabase.from('products').update({ is_active: false }).eq('id', productId);
          error = softDeleteError;
        }

        if (error) {
          showToast('Failed to delete item. It might be used in existing invoices.', 'error');
        } else {
          showToast('Item deleted successfully.', 'success');
          fetchInventory();
        }
        setConfirmModal(null);
      }
    });
  };

  const lowStockCount = inventory.filter(item => item.quantity_cached <= item.low_stock_threshold).length;

  const tabs: TabItem[] = [
    {
      id: 'inventory',
      label: `Current Stock & Items (${inventory.length})`,
      icon: <Layers size={16} />,
    },
    {
      id: 'purchases',
      label: 'Purchase History',
      icon: <History size={16} />,
    },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Inventory & Purchases" 
        description="Manage your shop's stock, log supplier purchase intake, and track purchase history."
        actions={
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="primary"
              leftIcon={<Plus size={15} />} 
              onClick={() => setShowPurchaseModal(true)}
            >
              Log Purchase
            </Button>
          </div>
        }
      />

      {/* Standardized Tabs */}
      <Tabs
        items={tabs}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as 'inventory' | 'purchases')}
      />

      {activeTab === 'purchases' ? (
        <PurchaseHistoryTab onOpenIntakeModal={() => setShowPurchaseModal(true)} />
      ) : (
        <>
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by product name or SKU..."
            showClearButton={Boolean(searchQuery)}
            onClearFilters={() => setSearchQuery("")}
            actions={
              lowStockCount > 0 ? (
                <div className="flex items-center gap-2 text-admin-urgent-fg bg-admin-urgent-bg px-3 py-1.5 rounded-lg font-semibold text-xs border border-admin-urgent-fg/20">
                  <AlertTriangle size={14} />
                  <span>{lowStockCount} items running low</span>
                </div>
              ) : undefined
            }
          />

          {loading ? (
            <DataTableSkeleton rows={6} cols={9} hasFilterBar={false} />
          ) : (
            <Card noAccentLine className="flex-1 flex flex-col overflow-hidden border border-admin-border bg-admin-bg-surface rounded-lg shadow-xs">
              <div className="overflow-x-auto flex-1 table-scroll-shadow">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-admin-bg-subtle text-admin-text-secondary sticky top-0 z-10 border-b border-admin-border text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">Item Name</th>
                      <th scope="col" className="px-6 py-3.5">SKU</th>
                      <th scope="col" className="px-6 py-3.5 text-center">Qty</th>
                      <th scope="col" className="px-6 py-3.5 text-right">Purchase Rate</th>
                      <th scope="col" className="px-6 py-3.5 text-right">Selling Rate</th>
                      <th scope="col" className="px-6 py-3.5">Unit</th>
                      <th scope="col" className="px-6 py-3.5 text-center">Min Threshold</th>
                      <th scope="col" className="px-6 py-3.5">Last Updated</th>
                      <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border bg-admin-bg-surface">
                    {inventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8">
                        <EmptyState 
                          icon={<Package size={40} className="text-admin-text-muted" />}
                          heading="No inventory items found"
                          subtext="Try adjusting your search query or log a new purchase intake."
                          asCard={false}
                          action={
                            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowPurchaseModal(true)}>
                              Log Purchase Intake
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    inventory.map(item => {
                      const isLowStock = item.quantity_cached <= item.low_stock_threshold;
                      return (
                        <tr key={item.id} className={`transition-colors hover:bg-admin-bg-hover ${isLowStock ? 'bg-admin-urgent-bg/10' : ''}`}>
                          <td className="px-6 py-4 font-semibold text-admin-text-primary">
                            <div className="flex items-center gap-2">
                              {isLowStock && <AlertTriangle size={14} className="text-admin-urgent-fg shrink-0" />}
                              <span>{item.products?.name || 'Unknown Product'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-admin-text-muted">{item.products?.sku || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                              isLowStock 
                                ? 'bg-admin-urgent-bg text-admin-urgent-fg border border-admin-urgent-fg/20' 
                                : 'bg-admin-bg-subtle text-admin-text-primary border border-admin-border'
                            }`}>
                              {item.quantity_cached}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-admin-text-secondary">
                            {formatCurrency(item.purchase_rate || 0)}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-admin-text-primary">
                            {formatCurrency(item.selling_rate || 0)}
                          </td>
                          <td className="px-6 py-4 text-admin-text-secondary text-xs">{item.products?.unit || '-'}</td>
                          <td className="px-6 py-4 text-center text-admin-text-muted text-xs font-mono">{item.low_stock_threshold}</td>
                          <td className="px-6 py-4 text-admin-text-muted text-xs">{formatDate(item.last_updated)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => { setEditingItem(item); setShowAddStockModal(true); }}
                                className="p-1.5 text-admin-text-secondary hover:text-admin-accent hover:bg-admin-bg-subtle rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Quick Add Stock"
                                aria-label="Quick Add Stock"
                              >
                                <PlusCircle size={15} />
                              </button>
                              <button 
                                onClick={() => { setEditingItem(item); setShowEditModal(true); }}
                                className="p-1.5 text-admin-text-secondary hover:text-admin-accent hover:bg-admin-bg-subtle rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Edit Item Details"
                                aria-label="Edit Item Details"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button 
                                onClick={() => handleDelete(item.product_id, item.products?.name)}
                                className="p-1.5 text-admin-text-secondary hover:text-admin-danger hover:bg-admin-urgent-bg/20 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Delete Item"
                                aria-label="Delete Item"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
              
            {inventory.length > 0 && (
              <div className="p-4 border-t border-admin-border bg-admin-bg-surface">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </Card>
          )}
        </>
      )}

      {/* Two-Step Purchase Intake Modal */}
      {showPurchaseModal && (
        <PurchaseIntakeModal
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={() => {
            setShowPurchaseModal(false);
            fetchInventory();
            showToast('Purchase order logged and stock incremented successfully!', 'success');
          }}
        />
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <InventoryFormModal 
          item={editingItem}
          onClose={() => { setShowEditModal(false); setEditingItem(null); }}
          onSuccess={() => { setShowEditModal(false); setEditingItem(null); fetchInventory(); showToast('Product details updated', 'success'); }}
        />
      )}

      {/* Quick Add Stock Modal */}
      {showAddStockModal && editingItem && (
        <AddStockModal 
          item={editingItem}
          onClose={() => { setShowAddStockModal(false); setEditingItem(null); }}
          onSuccess={() => { setShowAddStockModal(false); setEditingItem(null); fetchInventory(); showToast('Stock added successfully', 'success'); }}
        />
      )}

      {confirmModal?.isOpen && (
        <ConfirmationModal
          title={confirmModal.title}
          message={confirmModal.message}
          isDestructive={true}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
