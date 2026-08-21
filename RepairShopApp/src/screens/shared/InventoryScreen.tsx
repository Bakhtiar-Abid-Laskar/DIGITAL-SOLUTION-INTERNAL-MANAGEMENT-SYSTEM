import { AppPressable } from '../../components/common/AppPressable';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Search, Plus, PackageOpen, Layers, History, ExternalLink, Calendar, Building2, Package, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PurchaseWithDetails, getImageThumbnailUrl, isGoogleDriveUrl, formatCurrency, formatDate } from '@repairshop/shared';
import AppHeader from '../../components/common/AppHeader';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonList } from '../../components/common/SkeletonCard';
import { colors, radius, spacing, shadow, typography } from '../../tokens';
import { useBottomInsetPadding } from '../../hooks/useBottomInsetPadding';
import { useToast } from '../../context/ToastContext';
import { InventoryRow, InventoryItem } from '../../components/inventory/InventoryRow';
import { InventoryFormSheet } from '../../components/inventory/InventoryFormSheet';
import { PurchaseIntakeModalMobile } from '../../components/inventory/PurchaseIntakeModalMobile';
import { PurchaseDetailModalMobile } from '../../components/inventory/PurchaseDetailModalMobile';

type TabValue = 'All' | 'Low Stock' | 'Out of Stock';
type MainSection = 'stock' | 'purchases';

const PAGE_SIZE = 20;

export default function InventoryScreen() {
  const bottomPadding = useBottomInsetPadding('nav');
  const channelName = useRef(`inventory-admin-${Date.now()}`).current;
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [mainSection, setMainSection] = useState<MainSection>('stock');
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

  // Purchase History State
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithDetails | null>(null);

  // Modals
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [modalVisible, setModalVisible]   = useState(false);
  const [editingItem, setEditingItem]     = useState<InventoryItem | null>(null);
  const [counts, setCounts]               = useState<Record<string, number>>({ All: 0, 'Low Stock': 0, 'Out of Stock': 0 });
  const { showToast } = useToast();

  // Form fields for editing existing product
  const [itemName, setItemName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [hsnSac, setHsnSac] = useState('');
  const [taxMode, setTaxMode] = useState<'inclusive' | 'exclusive'>('exclusive');
  const [cgstRate, setCgstRate] = useState('9');
  const [sgstRate, setSgstRate] = useState('9');
  const [igstRate, setIgstRate] = useState('18');
  
  const [costPrice, setCostPrice] = useState('0');
  const [sellingRate, setSellingRate] = useState('0');
  const [quantity, setQuantity] = useState('0');
  const [threshold, setThreshold] = useState('5');
  const [minStockLevel, setMinStockLevel] = useState('0');
  const [location, setLocation] = useState('');
  const [saving,     setSaving]     = useState(false);

  const fetchTabCounts = async () => {
    try {
      const [allRes, lowRes, outRes] = await Promise.all([
        supabase.from('inventory').select('id, products!inner(id)', { count: 'exact', head: true }).eq('products.is_active', true),
        supabase.from('inventory').select('id, products!inner(id)', { count: 'exact', head: true }).gt('quantity_cached', 0).lte('quantity_cached', 5).eq('products.is_active', true),
        supabase.from('inventory').select('id, products!inner(id)', { count: 'exact', head: true }).lte('quantity_cached', 0).eq('products.is_active', true),
      ]);
      setCounts({ All: allRes.count ?? 0, 'Low Stock': lowRes.count ?? 0, 'Out of Stock': outRes.count ?? 0 });
    } catch (err) { console.error('Error fetching inventory counts:', err); }
  };

  const fetchInventory = async (pageNum: number, replace: boolean) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      let query = supabase.from('inventory').select(`
        id, item_name, quantity_cached, purchase_rate, selling_rate, low_stock_threshold, minimum_stock_level, product_id, location, last_updated,
        products(name, sku, unit, hsn_sac, tax_mode, cgst_rate, sgst_rate, igst_rate)
      `).eq('products.is_active', true).order('last_updated', { ascending: false });
      if (activeTab === 'Out of Stock') query = query.lte('quantity_cached', 0);
      if (searchQuery.trim()) query = query.ilike('products.name', `%${searchQuery.trim()}%`);
      const from = pageNum * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);
      const { data, error } = await query;
      if (error) throw error;
      let mapped = (data || []).map((row: any) => ({
        id: row.id, 
        product_id: row.product_id,
        item_name: row.item_name || row.products?.name || 'Unknown',
        quantity: row.quantity_cached, 
        cost_price: row.purchase_rate,
        selling_rate: row.selling_rate,
        minimum_stock_level: row.minimum_stock_level,
        location: row.location,
        unit: row.products?.unit || 'pcs', 
        low_stock_threshold: row.low_stock_threshold,
        last_updated: row.last_updated,
        products: row.products
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

  const fetchPurchaseHistory = async () => {
    setPurchaseLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_purchase_history', {
        p_search: searchQuery.trim() || null,
        p_limit: 30,
        p_offset: 0,
      });
      if (error) throw error;
      setPurchases((data || []) as PurchaseWithDetails[]);
    } catch (err) {
      console.error('Error fetching mobile purchase history:', err);
    } finally {
      setPurchaseLoading(false);
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
    if (mainSection === 'purchases') fetchPurchaseHistory();
  }, [activeTab, searchQuery, mainSection]));

  const onRefresh = () => {
    setRefreshing(true); setPage(0);
    fetchTabCounts(); fetchInventory(0, true);
    if (mainSection === 'purchases') fetchPurchaseHistory();
  };

  const onLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1; setPage(nextPage); setLoadingMore(true); fetchInventory(nextPage, false);
  };

  const handleEdit = useCallback((item: InventoryItem) => {
    setEditingItem(item); 
    setItemName(item.item_name); 
    setSku(item.products?.sku || '');
    setUnit(item.products?.unit || item.unit || 'Pcs');
    setHsnSac(item.products?.hsn_sac || '');
    setTaxMode((item.products?.tax_mode as any) || 'exclusive');
    setCgstRate(item.products?.cgst_rate?.toString() || '9');
    setSgstRate(item.products?.sgst_rate?.toString() || '9');
    setIgstRate(item.products?.igst_rate?.toString() || '18');

    setQuantity(item.quantity.toString());
    setCostPrice(item.cost_price?.toString() || '0'); 
    setSellingRate(item.selling_rate?.toString() || '0');
    setThreshold(item.low_stock_threshold?.toString() || '5');
    setMinStockLevel(item.minimum_stock_level?.toString() || '0');
    setLocation(item.location || '');
    
    setModalVisible(true);
  }, []);

  const handleSave = async () => {
    if (!isAdmin) { showToast({ title: 'Permission Error', message: 'Only administrators can add or edit inventory items.', type: 'error' }); return; }
    if (!itemName.trim()) { showToast({ title: 'Validation Error', message: 'Item name is required.', type: 'error' }); return; }
    
    const parsedQty = parseFloat(quantity) || 0;
    const parsedCost = parseFloat(costPrice) || 0;
    const parsedSelling = parseFloat(sellingRate) || 0;
    const parsedThreshold = parseFloat(threshold) || 5;
    const parsedMinStock = parseFloat(minStockLevel) || 0;
    
    const parsedCgst = parseFloat(cgstRate) || 0;
    const parsedSgst = parseFloat(sgstRate) || 0;
    const parsedIgst = parseFloat(igstRate) || 0;

    setSaving(true);
    try {
      if (editingItem) {
        const { error: prodErr } = await supabase.from('products').update({ 
          name: itemName.trim(), 
          sku: sku.trim(),
          unit: unit.trim(),
          hsn_sac: hsnSac.trim(),
          tax_mode: taxMode,
          cgst_rate: parsedCgst,
          sgst_rate: parsedSgst,
          igst_rate: parsedIgst,
        }).eq('id', editingItem.product_id);
        if (prodErr) throw prodErr;
        
        const { error: invErr } = await supabase.from('inventory').update({
          item_name: itemName.trim(),
          purchase_rate: parsedCost,
          selling_rate: parsedSelling,
          low_stock_threshold: parsedThreshold,
          minimum_stock_level: parsedMinStock,
          location: location.trim(),
          last_updated: new Date().toISOString(),
        }).eq('id', editingItem.id);
        if (invErr) throw invErr;
        
        showToast({ title: 'Success', message: 'Item updated successfully', type: 'success' });
      }
      setModalVisible(false);
      setPage(0); fetchTabCounts(); fetchInventory(0, true);
    } catch (err: any) {
      showToast({ title: 'Error', message: err.message || 'Failed to save item', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    if (!isAdmin) { showToast({ title: 'Permission Error', message: 'Only admins can delete inventory.', type: 'error' }); return; }
    const targetItem = items.find(i => i.id === id);
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${targetItem?.item_name || 'this item'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) },
      ]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      const inv = items.find(i => i.id === id);
      if (inv?.product_id) {
        const { error: prodErr } = await supabase.from('products').delete().eq('id', inv.product_id);
        if (prodErr && prodErr.code === '23503') {
          const { error: softErr } = await supabase.from('products').update({ is_active: false }).eq('id', inv.product_id);
          if (softErr) throw softErr;
        } else if (prodErr) {
          throw prodErr;
        }
      }

      showToast({ title: 'Success', message: 'Item deleted', type: 'success' });
      setPage(0); fetchTabCounts(); fetchInventory(0, true);
    } catch (err: any) {
      showToast({ title: 'Error', message: 'Failed to delete item', type: 'error' });
    }
  };

  const renderInventoryItem = useCallback(({ item }: { item: InventoryItem }) => (
    <InventoryRow item={item} isAdmin={isAdmin} onEdit={handleEdit} onDelete={confirmDelete} />
  ), [isAdmin]);

  const renderPurchaseCard = useCallback(({ item }: { item: PurchaseWithDetails }) => {
    const thumb = getImageThumbnailUrl(item.invoice_image_url, 150);
    const isGDrive = isGoogleDriveUrl(item.invoice_image_url);

    return (
      <AppPressable
        style={styles.purchaseCard}
        onPress={() => setSelectedPurchase(item)}
      >
        <View style={styles.purchaseCardHeader}>
          <View style={styles.poBadge}>
            <Text style={styles.poBadgeText}>{item.purchase_code}</Text>
          </View>
          <Text style={styles.purchaseDate}>{formatDate(item.purchase_date)}</Text>
        </View>

        <View style={styles.purchaseCardBody}>
          <View style={styles.purchaseMain}>
            <Text style={styles.purchaseProductName} numberOfLines={1}>
              {item.product_name}
            </Text>
            <View style={styles.purchaseSupplierRow}>
              <Building2 size={12} color={colors.textMuted} />
              <Text style={styles.purchaseSupplierName} numberOfLines={1}>
                {item.supplier_name}
              </Text>
            </View>
            <Text style={styles.purchaseQtyText}>
              Qty: <Text style={styles.boldText}>{item.quantity} {item.product_unit}</Text> @ {formatCurrency(item.purchase_rate)}
            </Text>
          </View>

          {item.invoice_image_url ? (
            <View style={styles.purchaseThumbWrapper}>
              <Image
                source={{ uri: thumb || item.invoice_image_url }}
                style={styles.purchaseThumb}
                resizeMode="cover"
              />
            </View>
          ) : null}
        </View>

        <View style={styles.purchaseCardFooter}>
          <Text style={styles.purchaseTotalLabel}>Total Amount:</Text>
          <Text style={styles.purchaseTotalValue}>{formatCurrency(item.total_amount)}</Text>
          <ChevronRight size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
        </View>
      </AppPressable>
    );
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title="Inventory & Purchases" showBack={false} />

      {/* Main Section Tabs */}
      <View style={styles.mainNav}>
        <AppPressable
          style={[styles.mainNavTab, mainSection === 'stock' && styles.mainNavTabActive]}
          onPress={() => setMainSection('stock')}
        >
          <Layers size={15} color={mainSection === 'stock' ? '#ffffff' : colors.textSecondary} />
          <Text style={[styles.mainNavText, mainSection === 'stock' && styles.mainNavTextActive]}>
            Stock ({counts.All || 0})
          </Text>
        </AppPressable>

        <AppPressable
          style={[styles.mainNavTab, mainSection === 'purchases' && styles.mainNavTabActive]}
          onPress={() => setMainSection('purchases')}
        >
          <History size={15} color={mainSection === 'purchases' ? '#ffffff' : colors.textSecondary} />
          <Text style={[styles.mainNavText, mainSection === 'purchases' && styles.mainNavTextActive]}>
            Purchase History
          </Text>
        </AppPressable>
      </View>

      {/* Search Header */}
      <View style={styles.headerArea}>
        <View style={[styles.searchContainer, isSearchFocused && styles.searchFocused]}>
          <Search size={16} color={isSearchFocused ? colors.textPrimary : colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={mainSection === 'stock' ? "Search products..." : "Search POs, suppliers..."}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>

        {mainSection === 'stock' && (
          <View style={styles.tabsContainer}>
            {(['All', 'Low Stock', 'Out of Stock'] as TabValue[]).map((tab) => (
              <AppPressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab} ({counts[tab] || 0})
                </Text>
              </AppPressable>
            ))}
          </View>
        )}
      </View>

      {/* Content Section */}
      {mainSection === 'stock' ? (
        loading ? <SkeletonList count={4} /> : (
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
                subtext={searchQuery ? 'Try adjusting your search terms.' : 'Add items via Purchase Intake.'}
              />
            }
            renderItem={renderInventoryItem}
          />
        )
      ) : (
        purchaseLoading ? <SkeletonList count={4} /> : (
          <FlatList
            data={purchases}
            keyExtractor={item => item.purchase_id}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding + spacing.xl }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <EmptyState
                icon={<History size={48} color={colors.textMuted} />}
                heading={searchQuery ? 'No purchase records found' : 'No purchase history'}
                subtext={searchQuery ? 'Try adjusting your search terms.' : 'Log a purchase intake to see history.'}
              />
            }
            renderItem={renderPurchaseCard}
          />
        )
      )}

      {/* FAB: Log Purchase Intake */}
      {isAdmin && (
        <AppPressable
          style={[styles.fab, { bottom: bottomPadding + spacing.md }]}
          onPress={() => setPurchaseModalVisible(true)}
        >
          <Plus size={24} color="#ffffff" />
        </AppPressable>
      )}

      {/* Two-Step Purchase Intake Modal */}
      <PurchaseIntakeModalMobile
        visible={purchaseModalVisible}
        onClose={() => setPurchaseModalVisible(false)}
        onSuccess={() => {
          setPurchaseModalVisible(false);
          fetchTabCounts();
          fetchInventory(0, true);
          fetchPurchaseHistory();
          showToast({ title: 'Success', message: 'Purchase logged & stock updated!', type: 'success' });
        }}
      />

      {/* Purchase Detail Modal */}
      <PurchaseDetailModalMobile
        purchase={selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
      />

      {/* Edit Catalog Item Sheet */}
      <InventoryFormSheet
        visible={modalVisible}
        isEditing={!!editingItem}
        saving={saving}
        
        itemName={itemName} sku={sku} unit={unit} hsnSac={hsnSac} taxMode={taxMode}
        cgstRate={cgstRate} sgstRate={sgstRate} igstRate={igstRate}
        costPrice={costPrice} sellingRate={sellingRate} quantity={quantity} 
        threshold={threshold} minStockLevel={minStockLevel} location={location}
        
        onChangeName={setItemName} onChangeSku={setSku} onChangeUnit={setUnit} 
        onChangeHsnSac={setHsnSac} onChangeTaxMode={setTaxMode} 
        onChangeCgst={setCgstRate} onChangeSgst={setSgstRate} onChangeIgst={setIgstRate}
        onChangeCost={setCostPrice} onChangeSelling={setSellingRate} onChangeQty={setQuantity} 
        onChangeThreshold={setThreshold} onChangeMinStock={setMinStockLevel} onChangeLocation={setLocation}
        
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mainNav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mainNavTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    gap: 6,
  },
  mainNavTabActive: {
    backgroundColor: colors.primary,
  },
  mainNavText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  mainNavTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  headerArea: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  searchFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
  searchIcon: { marginRight: spacing.xs },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, height: '100%' },
  tabsContainer: { flexDirection: 'row', gap: spacing.xs, marginTop: 4 },
  tab: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  tabText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.background },
  listContent: { padding: spacing.md },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.card,
  },
  purchaseCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  purchaseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  poBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  poBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  purchaseDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  purchaseCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  purchaseMain: {
    flex: 1,
  },
  purchaseProductName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  purchaseSupplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  purchaseSupplierName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  purchaseQtyText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  boldText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  purchaseThumbWrapper: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  purchaseThumb: {
    width: '100%',
    height: '100%',
  },
  purchaseCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  purchaseTotalLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginRight: 4,
  },
  purchaseTotalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
});
