import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppPressable } from '../../components/common/AppPressable';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, radius, shadow } from '../../tokens';
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Briefcase, 
  ShoppingBag, 
  ChevronRight, 
  Edit3, 
  Check, 
  X,
  Plus
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Customer, CustomerAuditLog, formatCurrency } from '@repairshop/shared';
import AppHeader from '../../components/common/AppHeader';
import Button from '../../components/common/Button';
import { SkeletonList } from '../../components/common/SkeletonCard';
import { useToast } from '../../context/ToastContext';

export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const navigation = useNavigation<any>();

  // Selected Customer Modal State
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [linkedJobs, setLinkedJobs] = useState<any[]>([]);
  const [linkedSales, setLinkedSales] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'sales'>('overview');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('search_customers', {
        p_query: debouncedSearch.trim(),
        p_limit: 50,
      });

      if (error) throw error;
      setCustomers((data || []) as Customer[]);
    } catch (err: any) {
      console.error('Error fetching customers on mobile:', err);
      showToast({ title: 'Error', message: err.message || 'Failed to load customers.', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, showToast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCust(cust);
    setEditForm({ ...cust });
    setIsEditing(false);
    setActiveTab('overview');
    setLoadingDetails(true);

    try {
      const [jobsRes, salesRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, job_code, status, priority, device_type_id, reported_issue, created_at')
          .eq('customer_id', cust.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('sales')
          .select('id, sale_code, invoice_number, grand_total, status, created_at')
          .eq('customer_id', cust.id)
          .order('created_at', { ascending: false }),
      ]);

      setLinkedJobs(jobsRes.data || []);
      setLinkedSales(salesRes.data || []);
    } catch (err) {
      console.error('Error loading customer details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedCust || !editForm.name?.trim()) {
      showToast({ title: 'Validation error', message: 'Customer name is required.', type: 'error' });
      return;
    }

    setSavingEdit(true);
    try {
      const { data, error } = await supabase.rpc('update_customer_profile', {
        p_customer_id: selectedCust.id,
        p_name: editForm.name.trim(),
        p_phone: editForm.phone?.trim() || null,
        p_email: editForm.email?.trim() || null,
        p_gstin: editForm.gstin?.trim() || null,
        p_address: editForm.address?.trim() || null,
      });

      if (error) throw error;

      showToast({ title: 'Success', message: 'Customer profile updated!', type: 'success' });
      const updated = data as Customer;
      setSelectedCust(updated);
      setIsEditing(false);
      fetchCustomers();
    } catch (err: any) {
      showToast({ title: 'Save Failed', message: err.message || 'Could not update profile.', type: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => {
    const hasJobs = Number(item.total_jobs || 0) > 0;
    const hasSales = Number(item.total_sales || 0) > 0;

    return (
      <AppPressable
        style={styles.card}
        onPress={() => handleSelectCustomer(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName} numberOfLines={1}>{item.name}</Text>
            {item.phone ? (
              <Text style={styles.customerPhone}>{item.phone}</Text>
            ) : (
              <Text style={styles.customerPhoneMuted}>No contact number</Text>
            )}
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>

        {(item.email || item.address || item.gstin) ? (
          <View style={styles.cardSubDetails}>
            {item.email ? (
              <View style={styles.detailRow}>
                <Mail size={12} color={colors.textMuted} />
                <Text style={styles.detailText} numberOfLines={1}>{item.email}</Text>
              </View>
            ) : null}
            {item.address ? (
              <View style={styles.detailRow}>
                <MapPin size={12} color={colors.textMuted} />
                <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.tagsRow}>
            {hasJobs && (
              <View style={styles.activityBadge}>
                <Briefcase size={11} color={colors.primary} />
                <Text style={styles.activityBadgeText}>{item.total_jobs} Jobs</Text>
              </View>
            )}
            {hasSales && (
              <View style={[styles.activityBadge, styles.saleBadge]}>
                <ShoppingBag size={11} color={colors.success} />
                <Text style={[styles.activityBadgeText, styles.saleBadgeText]}>{item.total_sales} Sales</Text>
              </View>
            )}
            {!hasJobs && !hasSales && (
              <Text style={styles.newClientText}>New client</Text>
            )}
          </View>
          <Text style={styles.sourceText}>{item.created_via || 'manual'}</Text>
        </View>
      </AppPressable>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Customers Directory" showBack={true} />

      <View style={styles.searchContainer}>
        <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, or email..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search ? (
          <AppPressable onPress={() => setSearch('')} style={styles.searchClear}>
            <X size={16} color={colors.textSecondary} />
          </AppPressable>
        ) : null}
      </View>

      {loading && !refreshing ? (
        <SkeletonList count={5} />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomerItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchCustomers();
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <User size={48} color={colors.border} />
              <Text style={styles.emptyTitle}>No customers found</Text>
              <Text style={styles.emptySubtext}>
                {debouncedSearch
                  ? "Try searching with a different name or phone number"
                  : "Customers will automatically appear here as jobs and sales are recorded"}
              </Text>
            </View>
          }
        />
      )}

      {/* Customer Details & History Modal */}
      {selectedCust && (
        <Modal
          visible={!!selectedCust}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedCust(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalSheet}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>
                      {selectedCust.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.modalTitleTextWrap}>
                    <Text style={styles.modalCustomerName} numberOfLines={1}>
                      {selectedCust.name}
                    </Text>
                    <Text style={styles.modalSubId}>
                      ID: {selectedCust.id.slice(0, 8)}
                    </Text>
                  </View>
                </View>

                <View style={styles.headerActions}>
                  {!isEditing && (
                    <AppPressable
                      style={styles.editIconBtn}
                      onPress={() => setIsEditing(true)}
                    >
                      <Edit3 size={16} color={colors.primary} />
                    </AppPressable>
                  )}
                  <AppPressable
                    style={styles.closeBtn}
                    onPress={() => setSelectedCust(null)}
                  >
                    <X size={20} color={colors.textSecondary} />
                  </AppPressable>
                </View>
              </View>

              {/* Tabs */}
              <View style={styles.tabsRow}>
                <AppPressable
                  style={[styles.tabBtn, activeTab === 'overview' && styles.activeTabBtn]}
                  onPress={() => setActiveTab('overview')}
                >
                  <Text style={[styles.tabBtnText, activeTab === 'overview' && styles.activeTabText]}>
                    Overview
                  </Text>
                </AppPressable>
                <AppPressable
                  style={[styles.tabBtn, activeTab === 'jobs' && styles.activeTabBtn]}
                  onPress={() => setActiveTab('jobs')}
                >
                  <Text style={[styles.tabBtnText, activeTab === 'jobs' && styles.activeTabText]}>
                    Jobs ({linkedJobs.length})
                  </Text>
                </AppPressable>
                <AppPressable
                  style={[styles.tabBtn, activeTab === 'sales' && styles.activeTabBtn]}
                  onPress={() => setActiveTab('sales')}
                >
                  <Text style={[styles.tabBtnText, activeTab === 'sales' && styles.activeTabText]}>
                    Sales ({linkedSales.length})
                  </Text>
                </AppPressable>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                {activeTab === 'overview' && (
                  <View style={styles.tabSection}>
                    {isEditing ? (
                      <View style={styles.editForm}>
                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>Customer Name *</Text>
                          <TextInput
                            style={styles.modalInput}
                            value={editForm.name || ''}
                            onChangeText={(val) => setEditForm({ ...editForm, name: val })}
                            placeholder="Name"
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>

                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>Contact Phone</Text>
                          <TextInput
                            style={styles.modalInput}
                            value={editForm.phone || ''}
                            onChangeText={(val) => setEditForm({ ...editForm, phone: val })}
                            placeholder="Phone number"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="phone-pad"
                          />
                        </View>

                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>Email Address</Text>
                          <TextInput
                            style={styles.modalInput}
                            value={editForm.email || ''}
                            onChangeText={(val) => setEditForm({ ...editForm, email: val })}
                            placeholder="Email"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="email-address"
                            autoCapitalize="none"
                          />
                        </View>

                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>GSTIN</Text>
                          <TextInput
                            style={styles.modalInput}
                            value={editForm.gstin || ''}
                            onChangeText={(val) => setEditForm({ ...editForm, gstin: val.toUpperCase() })}
                            placeholder="GSTIN"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="characters"
                            maxLength={15}
                          />
                        </View>

                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>Billing & Delivery Address</Text>
                          <TextInput
                            style={[styles.modalInput, styles.modalTextarea]}
                            value={editForm.address || ''}
                            onChangeText={(val) => setEditForm({ ...editForm, address: val })}
                            placeholder="Physical address"
                            placeholderTextColor={colors.textMuted}
                            multiline={true}
                            numberOfLines={2}
                          />
                        </View>

                        <View style={styles.saveActionsRow}>
                          <Button
                            label="Cancel"
                            variant="secondary"
                            onPress={() => setIsEditing(false)}
                            style={{ flex: 1, marginRight: spacing.sm }}
                          />
                          <Button
                            label="Save Changes"
                            onPress={handleSaveProfile}
                            loading={savingEdit}
                            style={{ flex: 1 }}
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.detailsGrid}>
                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>Contact Number</Text>
                          <Text style={styles.infoValue}>{selectedCust.phone || '—'}</Text>
                        </View>

                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>Email Address</Text>
                          <Text style={styles.infoValue} numberOfLines={1}>{selectedCust.email || '—'}</Text>
                        </View>

                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>GSTIN</Text>
                          <Text style={styles.infoValue}>{selectedCust.gstin || '—'}</Text>
                        </View>

                        <View style={styles.infoBox}>
                          <Text style={styles.infoLabel}>Registered Via</Text>
                          <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>{selectedCust.created_via || 'manual'}</Text>
                        </View>

                        <View style={[styles.infoBox, styles.fullWidthInfo]}>
                          <Text style={styles.infoLabel}>Billing & Delivery Address</Text>
                          <Text style={styles.infoValue}>{selectedCust.address || 'No address on file.'}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {activeTab === 'jobs' && (
                  <View style={styles.tabSection}>
                    {loadingDetails ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ margin: spacing.lg }} />
                    ) : linkedJobs.length === 0 ? (
                      <Text style={styles.emptyTabText}>No repair jobs recorded for this customer.</Text>
                    ) : (
                      linkedJobs.map((job) => (
                        <AppPressable
                          key={job.id}
                          style={styles.historyCard}
                          onPress={() => {
                            setSelectedCust(null);
                            navigation.navigate('Jobs', { screen: 'JobDetail', params: { jobId: job.id } });
                          }}
                        >
                          <View style={styles.historyCardHeader}>
                            <Text style={styles.historyCode}>{job.job_code}</Text>
                            <View style={[
                              styles.historyStatusBadge,
                              job.status === 'Completed' ? styles.statusSuccess : styles.statusDefault
                            ]}>
                              <Text style={styles.historyStatusText}>{job.status}</Text>
                            </View>
                          </View>
                          <Text style={styles.historyIssue} numberOfLines={1}>
                            {job.reported_issue || 'Repair Service'}
                          </Text>
                          <Text style={styles.historyDate}>
                            {new Date(job.created_at).toLocaleDateString()}
                          </Text>
                        </AppPressable>
                      ))
                    )}
                  </View>
                )}

                {activeTab === 'sales' && (
                  <View style={styles.tabSection}>
                    {loadingDetails ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ margin: spacing.lg }} />
                    ) : linkedSales.length === 0 ? (
                      <Text style={styles.emptyTabText}>No counter sales recorded for this customer.</Text>
                    ) : (
                      linkedSales.map((sale) => (
                        <View key={sale.id} style={styles.historyCard}>
                          <View style={styles.historyCardHeader}>
                            <Text style={styles.historyCode}>{sale.invoice_number || sale.sale_code}</Text>
                            <Text style={styles.historyAmount}>{formatCurrency(sale.grand_total)}</Text>
                          </View>
                          <Text style={styles.historyDate}>
                            {new Date(sale.created_at).toLocaleDateString()} · {sale.status}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 46,
    ...typography.body,
    color: colors.textPrimary,
  },
  searchClear: {
    padding: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.statusInProgressBg,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  customerInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  customerName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  customerPhone: {
    ...typography.caption,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    marginTop: 1,
  },
  customerPhoneMuted: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 1,
  },
  cardSubDetails: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.statusInProgressBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    gap: 3,
  },
  activityBadgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  saleBadge: {
    backgroundColor: colors.statusCompletedBg,
  },
  saleBadgeText: {
    color: colors.success,
  },
  newClientText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  sourceText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: '85%',
    minHeight: 450,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.statusInProgressBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  modalAvatarText: {
    ...typography.h2,
    color: colors.primary,
  },
  modalTitleTextWrap: {
    flex: 1,
  },
  modalCustomerName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalSubId: {
    ...typography.caption,
    color: colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editIconBtn: {
    padding: spacing.xs,
    backgroundColor: colors.statusInProgressBg,
    borderRadius: radius.md,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    borderBottomColor: colors.primary,
  },
  tabBtnText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  tabSection: {
    gap: spacing.md,
  },
  detailsGrid: {
    gap: spacing.md,
  },
  infoBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fullWidthInfo: {
    marginTop: spacing.xs,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 10,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  editForm: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  modalInput: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    ...typography.body,
  },
  modalTextarea: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  saveActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emptyTabText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  historyCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  historyCode: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyAmount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusSuccess: {
    backgroundColor: colors.statusCompletedBg,
  },
  statusDefault: {
    backgroundColor: colors.border,
  },
  historyStatusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyIssue: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  historyDate: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
});
