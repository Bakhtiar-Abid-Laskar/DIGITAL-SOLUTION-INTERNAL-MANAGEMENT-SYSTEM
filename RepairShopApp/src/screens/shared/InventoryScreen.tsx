import { AppPressable } from '../../components/common/AppPressable';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Search, Plus, PackageOpen } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/common/AppHeader';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonList } from '../../components/common/SkeletonCard';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { useToast } from '../../context/ToastContext';
import { InventoryRow, InventoryItem } from '../../components/inventory/InventoryRow';
import { InventoryFormSheet } from '../../components/inventory/InventoryFormSheet';

type TabValue = 'All' | 'Low Stock' | 'Out of Stock';

const PAGE_SIZE = 20;

export default function InventoryScreen() {
  const bottomPadding = useBottomInsetPadding('nav');
  const channelName = useRef(`inventory-admin-${Date.now()}`).current;
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems]           = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeTab, setActiveTab]   = useState<TabValue>('All');
  const [page, setPage]             = useState(0);
  const [hasMore, setHasMore]       = useState(true);
  const fetchingRef                 = useRef(false);

  const [modalVisible, setModalVisible]   = useState(false);
  const [editingItem, setEditingItem]     = useState<InventoryItem | null>(null);
  const [counts, setCounts]               = useState<Record<string, number>>({ All: 0, 'Low Stock': 0, 'Out of Stock': 0 });
  const { showToast } = useToast();

  // Form state (lifted from InventoryFormSheet)
  const [itemName,   setItemName]   = useState('');
  const [quantity,   setQuantity]   = useState('0');
  const [costPrice,  setCostPrice]  = useState('0');
  const [unit,       setUnit]       = useState('pcs');
  const [threshold,  setThreshold]  = useState('5');
  const [saving,     setSaving]     = useState(false);

  const fetchTabCounts = async () => {
    try {
      const [allRes, lowRes, outRes] = await Promise.all([
        supabase.from('inventory').select('id', { count: 'exact', head: true }),
        supabase.from('inventory').select('id', { count: 'exact', head: true }).gt('quantity_cached', 0).lte('quantity_cached', 5),
        supabase.from('inventory').select('id', { count: 'exact', head: true }).lte('quantity_cached', 0),
      ]);
      setCounts({ All: allRes.count ?? 0, 'Low Stock': lowRes.count ?? 0, 'Out of Stock': outRes.count ?? 0 });
    } catch (err) { console.error('Error fetching inventory counts:', err); }
  };

  const fetchInventory = async (pageNum: number, replace: boolean) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      let query = supabase.from('inventory').select('*, products!inner(*)').order('last_updated', { ascending: false });
      if (activeTab === 'Out of Stock') query = query.lte('quantity_cached', 0);
      if (searchQuery.trim()) query = query.ilike('products.name', `%${searchQuery.trim()}%`);
      const from = pageNum * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);
      const { data, error } = await query;
      if (error) throw error;
      let mapped = (data || []).map((row: any) => ({
        id: row.id, product_id: row.product_id,
        item_name: row.products?.name || 'Unknown',
        quantity: row.quantity_cached, cost_price: row.purchase_rate,
        unit: row.products?.unit || 'pcs', low_stock_threshold: row.low_stock_threshold,
        last_updated: row.last_updated,
      }));
      if (activeTab === 'Low Stock') {
        mapped = mapped.filter((i: any) => i.quantity <= i.low_stock_threshold && i.quantity > 0);
      }
      if (replace) setItems(mapped); else setItems(prev => [...prev, ...mapped]);
      setHasMore((data || []).length === PAGE_SIZE);
    } catch (err) { console.error('Error fetching inventory:', err); }
    finally {
      fetchingRef.current = false;
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
  };

  const fetchInventoryRef = useRef(fetchInventory);
  useEffect(() => { fetchInventoryRef.current = fetchInventory; });
  const fetchTabCountsRef = useRef(fetchTabCounts);
  useEffect(() => { fetchTabCountsRef.current = fetchTabCounts; });

  useEffect(() => {
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        fetchInventoryRef.current(0, true);
        fetchTabCountsRef.current();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useFocusEffect(useCallback(() => {
    setPage(0); setLoading(true);
    fetchTabCounts(); fetchInventory(0, true);
  }, [activeTab, searchQuery]));

  const onRefresh = () => { setRefreshing(true); setPage(0); fetchTabCounts(); fetchInventory(0, true); };
  const onLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1; setPage(nextPage); setLoadingMore(true); fetchInventory(nextPage, false);
  };

  const openAddModal = () => {
    setEditingItem(null); setItemName(''); setQuantity('0'); setCostPrice('0'); setUnit('pcs'); setThreshold('5');
    setModalVisible(true);
  };

  const handleEdit = useCallback((item: InventoryItem) => {
    setEditingItem(item); setItemName(item.item_name); setQuantity(item.quantity.toString());
    setCostPrice(item.cost_price.toString()); setUnit(item.unit); setThreshold(item.low_stock_threshold.toString());
    setModalVisible(true);
  }, []);

  const handleSave = async () => {
    if (!isAdmin) { showToast({ title: 'Permission Error', message: 'Only administrators can add or edit inventory items.', type: 'error' }); return; }
    if (!itemName.trim()) { showToast({ title: 'Validation Error', message: 'Item name is required.', type: 'error' }); return; }
    const parsedQty = parseFloat(quantity) || 0;
    const parsedCost = parseFloat(costPrice) || 0;
    const parsedThreshold = parseFloat(threshold) || 5;

    setSaving(true);
    try {
      if (editingItem) {
        const { error: prodErr } = await supabase.from('products').update({ name: itemName.trim(), unit: unit.trim() }).eq('id', editingItem.product_id);
        if (prodErr) throw prodErr;
        const { error: invErr } = await supabase.from('inventory').update({ purchase_rate: parsedCost, low_stock_threshold: parsedThreshold, last_updated: new Date().toISOString() }).eq('id', editingItem.id);
        if (invErr) throw invErr;
        if (parsedQty !== editingItem.quantity) {
          const diff = Math.abs(parsedQty - editingItem.quantity);
          await supabase.from('stock_entries').insert({ product_id: editingItem.product_id, quantity: diff, entry_type: parsedQty > editingItem.quantity ? 'restock' : 'adjustment', cost_price: parsedCost, notes: 'Manual inventory edit' });
        }
        showToast({ title: 'Success', message: 'Item updated successfully', type: 'success' });
      } else {
        const { data: prodData, error: prodErr } = await supabase.from('products').insert({ name: itemName.trim(), description: '', category: 'general', unit: unit.trim() }).select('id').single();
        if (prodErr) throw prodErr;
        const { error: invErr } = await supabase.from('inventory').insert({ product_id: prodData.id, quantity_cached: 0, purchase_rate: parsedCost, selling_rate: 0, low_stock_threshold: parsedThreshold }).select('id').single();
        if (invErr) throw invErr;
        if (parsedQty > 0) await supabase.from('stock_entries').insert({ product_id: prodData.id, quantity: parsedQty, entry_type: 'restock', cost_price: parsedCost, notes: 'Initial stock' });
        showToast({ title: 'Success', message: 'Item added successfully', type: 'success' });
      }
      setModalVisible(false); setPage(0); fetchTabCounts(); fetchInventory(0, true);
    } catch (err: any) {
      showToast({ title: 'Error', message: err.message || 'Failed to save item', type: 'error' });
    } finally { setSaving(false); }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this inventory item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) },
    ]);
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: inv } = await supabase.from('inventory').select('product_id').eq('id', id).single();
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw error;
      if (inv?.product_id) await supabase.from('products').delete().eq('id', inv.product_id);
      showToast({ title: 'Success', message: 'Item deleted', type: 'success' });
      setPage(0); fetchTabCounts(); fetchInventory(0, true);
    } catch (err: any) {
      showToast({ title: 'Error', message: 'Failed to delete item', type: 'error' });
    }
  };

  const renderInventoryItem = useCallback(({ item }: { item: InventoryItem }) => (
    <InventoryRow item={item} isAdmin={isAdmin} onEdit={handleEdit} onDelete={confirmDelete} />
  ), [isAdmin]);

  return (
    <View style={styles.container}>
      <AppHeader title="Inventory" showBack={false} />

      <View style={styles.headerArea}>
        <View style={[styles.searchContainer, isSearchFocused && styles.searchFocused]}>
          <Search size={16} color={isSearchFocused ? colors.textPrimary : colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput} placeholder="Search items..."
            placeholderTextColor={colors.textMuted} value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>

        <View style={styles.tabsContainer}>
          {(['All', 'Low Stock', 'Out of Stock'] as TabValue[]).map((tab) => (
            <AppPressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab} ({counts[tab] || 0})
              </Text>
            </AppPressable>
          ))}
        </View>
      </View>

      {loading ? <SkeletonList count={4} /> : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + spacing.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ margin: spacing.md }} /> : null}
          ListEmptyComponent={
            <EmptyState
              icon={<PackageOpen size={48} color={colors.textMuted} />}
              heading={searchQuery ? 'No items found' : 'No inventory items'}
              subtext={searchQuery ? 'Try adjusting your search terms.' : 'Add items to track your stock.'}
            />
          }
          renderItem={renderInventoryItem}
        />
      )}

      {isAdmin && (
        <AppPressable style={[styles.fab, { bottom: bottomPadding + spacing.md }]} onPress={openAddModal}>
          <Plus size={24} color={colors.background} />
        </AppPressable>
      )}

      <InventoryFormSheet
        visible={modalVisible}
        isEditing={!!editingItem}
        saving={saving}
        itemName={itemName} quantity={quantity} costPrice={costPrice} unit={unit} threshold={threshold}
        onChangeName={setItemName} onChangeQty={setQuantity} onChangeCost={setCostPrice}
        onChangeUnit={setUnit} onChangeThreshold={setThreshold}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerArea: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  searchFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, height: '100%' },
  tabsContainer: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.pill,
    backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  tabText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.background },
  listContent: { padding: spacing.lg },
  fab: {
    position: 'absolute', right: spacing.lg, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', ...(shadow as any).md,
  },
});
