"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { InventoryWithProduct, useDebounceValue } from '@repairshop/shared';
import { Plus, Edit2, Trash2, AlertTriangle, Package, Search, PlusCircle } from "lucide-react";
import InventoryFormModal from "@/components/inventory/InventoryFormModal";
import AddStockModal from "@/components/inventory/AddStockModal";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { LoadingState, TableSkeleton } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { useToast } from "@/components/common/ToastProvider";
import { Pagination } from "@/components/common/Pagination";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  const [showModal, setShowModal] = useState(false);
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
        // Sort by product name via the joined table
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
    let cancelled = false;
    fetchInventory(cancelled);
    
    // Subscribe to both products and inventory changes
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
        // Deleting from products cascades to inventory
        const { error } = await supabase.from('products').delete().eq('id', productId);
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

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader 
        title="Inventory" 
        description="Manage your shop's products, parts, and materials."
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={() => { setEditingItem(null); setShowModal(true); }}>
            Add Product
          </Button>
        }
      />

      <Card noAccentLine className="p-4 flex flex-wrap gap-4 items-center justify-between bg-admin-bg-surface">
        <div className="relative flex-1 min-w-[250px] max-w-sm">
          <Search className="absolute left-3 top-2.5 text-admin-text-muted" size={16} />
          <Input aria-label="Search by name or SKU..." 
            type="text" 
            placeholder="Search by name or SKU..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 text-admin-danger bg-admin-danger-dim px-4 py-2 rounded-lg font-medium text-sm border border-admin-danger/20">
            <AlertTriangle size={16} />
            <span>{lowStockCount} items are running low!</span>
          </div>
        )}
      </Card>

      {loading ? (
        <TableSkeleton />
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-admin-bg-subtle text-admin-text-secondary sticky top-0 z-10 border-b border-admin-border">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">Item Name</th>
                  <th scope="col" className="px-6 py-4 font-medium">SKU</th>
                  <th scope="col" className="px-6 py-4 font-medium">Qty</th>
                  <th scope="col" className="px-6 py-4 font-medium">Purchase Rate</th>
                  <th scope="col" className="px-6 py-4 font-medium">Selling Rate</th>
                  <th scope="col" className="px-6 py-4 font-medium">Unit</th>
                  <th scope="col" className="px-6 py-4 font-medium">Threshold</th>
                  <th scope="col" className="px-6 py-4 font-medium">Last Updated</th>
                  <th scope="col" className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {inventory.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState 
                      icon={<Package size={40} className="text-admin-text-muted" />}
                      heading="No inventory items found"
                      subtext="Try adjusting your search query or add a new product."
                      asCard={false}
                    />
                  </td>
                </tr>
              ) : (
                inventory.map(item => {
                  const isLowStock = item.quantity_cached <= item.low_stock_threshold;
                  return (
                    <tr key={item.id} className={`transition-colors hover:bg-admin-bg-hover ${isLowStock ? 'bg-admin-pending-bg/50' : ''}`}>
                      <td className="px-6 py-4 font-medium text-admin-text-primary flex items-center gap-2">
                        {isLowStock && <AlertTriangle size={14} className="text-admin-danger" />}
                        {item.products?.name || 'Unknown Product'}
                      </td>
                      <td className="px-6 py-4 text-admin-text-secondary">{item.products?.sku || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${isLowStock ? 'text-admin-danger' : 'text-admin-text-primary'}`}>
                          {item.quantity_cached}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-admin-text-primary">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.purchase_rate || 0)}
                      </td>
                      <td className="px-6 py-4 font-medium text-admin-text-primary">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.selling_rate || 0)}
                      </td>
                      <td className="px-6 py-4 text-admin-text-secondary">{item.products?.unit || '-'}</td>
                      <td className="px-6 py-4 text-admin-text-secondary">{item.low_stock_threshold}</td>
                      <td className="px-6 py-4 text-admin-text-secondary">{new Date(item.last_updated).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => { setEditingItem(item); setShowAddStockModal(true); }}
                          className="p-2 text-admin-primary bg-admin-primary/10 hover:bg-admin-primary hover:text-white rounded-md transition-colors inline-flex items-center justify-center"
                          title="Quick Add Stock"
                          aria-label="Quick Add Stock"
                        >
                          <PlusCircle size={16} />
                        </button>
                        <button 
                          onClick={() => { setEditingItem(item); setShowModal(true); }}
                          className="p-2 text-admin-accent bg-admin-accent-dim hover:bg-admin-accent hover:text-white rounded-md transition-colors inline-flex items-center justify-center"
                          title="Edit Item"
                          aria-label="Edit Item"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.product_id, item.products?.name)}
                          className="p-2 text-admin-danger bg-admin-danger-dim hover:bg-admin-danger hover:text-white rounded-md transition-colors inline-flex items-center justify-center"
                          title="Delete Item"
                          aria-label="Delete Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
          
          {inventory.length > 0 && (
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </Card>
      )}

      {showModal && (
        <InventoryFormModal 
          item={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          onSuccess={() => { setShowModal(false); setEditingItem(null); fetchInventory(); }}
        />
      )}

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
