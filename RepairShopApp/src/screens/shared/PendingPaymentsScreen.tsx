import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, FlatList, RefreshControl, TextInput, ActivityIndicator, Linking, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/common/AppHeader';
import { AppPressable } from '../../components/common/AppPressable';
import EmptyState from '../../components/common/EmptyState';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { formatCurrency, formatDate, useDebounceValue, createWhatsAppUrl } from '@repairshop/shared';
import { Search, CreditCard, MessageCircle, CheckCircle } from 'lucide-react-native';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../context/ToastContext';

interface PendingPayment {
  id: string;
  type: 'Sale' | 'Job';
  reference: string;
  customer_name: string;
  customer_contact: string;
  grand_total: number;
  amount_paid: number;
  balance: number;
  created_at: string;
  job_id?: string | null;
}

export default function PendingPaymentsScreen() {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Website uses client-side search without debounce delay, but small debounce is good for mobile text input
  const debouncedSearchQuery = useDebounceValue(searchQuery, 100);

  const fetchPayments = async () => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_code,
          customer_name,
          customer_contact,
          status,
          grand_total,
          amount_paid,
          created_at,
          paid_at,
          job_id,
          jobs ( job_code, customer_name, customer_contact )
        `)
        .gt('grand_total', 0)
        .neq('status', 'cancelled');  // cancelled invoices are voided — never pending

      if (fetchError) throw fetchError;

      const combined: PendingPayment[] = [];
      (data || []).forEach((inv: any) => {
        const total = Number(inv.grand_total) || 0;
        const paid = Number(inv.amount_paid) || 0;
        const balance = total - paid;
        
        if (balance > 0) {
          const isJob = !!inv.job_id;
          
          let name = inv.customer_name;
          if (!name || name.trim() === '') {
            name = (isJob && inv.jobs) ? inv.jobs.customer_name : 'Unknown';
          }
          
          let contact = inv.customer_contact;
          if (!contact || contact.trim() === '') {
            contact = (isJob && inv.jobs) ? inv.jobs.customer_contact : '';
          }

          combined.push({
            id: inv.id,
            type: isJob ? 'Job' : 'Sale',
            reference: (isJob && inv.jobs) ? inv.jobs.job_code : inv.invoice_code,
            customer_name: (name || 'Unknown').replace(/\n/g, ' ').trim(),
            customer_contact: (contact || '').replace(/\n/g, ' ').trim(),
            grand_total: total,
            amount_paid: paid,
            balance: balance,
            created_at: inv.created_at,
            job_id: inv.job_id || null,
          });
        }
      });

      // Oldest first priority (same as web)
      combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      setPayments(combined);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load pending payments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPayments();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayments();
  }, []);

  const handleMarkAsPaid = async (item: PendingPayment) => {
    Alert.alert(
      "Mark as Paid",
      `Are you sure you want to mark ${item.reference} as fully paid?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: async () => {
            try {
              const { error: updateError } = await supabase.rpc('record_payment', {
                p_invoice_id: item.id,
                p_amount: item.grand_total,
                p_payment_method: 'Cash',
              });
                
              if (updateError) throw updateError;
              
              fetchPayments();
            } catch (err: any) {
              showToast({ title: 'Error', message: err.message || "Failed to update payment status.", type: 'error' });
            }
          }
        }
      ]
    );
  };


  const handleNotifyCustomer = async (item: PendingPayment) => {
    if (!item.customer_contact) {
      showToast({ title: 'Error', message: "No contact number available for this customer.", type: 'error' });
      return;
    }

    try {
      showToast({ title: 'Sending WhatsApp...', message: `Notifying ${item.customer_name}`, type: 'info' });
      const { data, error } = await supabase.functions.invoke('notify-on-finance-event', {
        body: {
          action: 'SEND_PENDING_REMINDER',
          phone: item.customer_contact,
          customerName: item.customer_name,
          reference: item.reference,
          balanceDue: item.balance,
          totalAmount: item.grand_total,
          jobId: item.type === 'Job' ? item.id : undefined,
          saleId: item.type === 'Sale' ? item.id : undefined,
        },
      });

      if (!error && data?.success) {
        showToast({ title: 'WhatsApp Sent', message: `Reminder delivered to ${item.customer_name}`, type: 'success' });
        return;
      }
    } catch {
      // Fall through to client deep link
    }

    // Fallback: Open WhatsApp app directly
    const msg = `Hello ${item.customer_name}, a payment of ₹${item.balance.toFixed(2)} is pending for ${item.reference}. Please arrange the payment at your earliest convenience. Thank you.`;
    const url = createWhatsAppUrl(item.customer_contact, msg);
    
    if (!url) {
      showToast({ title: 'Error', message: "Could not format the contact number for WhatsApp.", type: 'error' });
      return;
    }
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        showToast({ title: 'Error', message: "WhatsApp is not installed on this device.", type: 'error' });
        return;
      }
      await Linking.openURL(url);
    } catch {
      showToast({ title: 'Error', message: "Could not open WhatsApp.", type: 'error' });
    }
  };

  const filtered = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return payments;
    const lowerQ = debouncedSearchQuery.toLowerCase();
    return payments.filter(p => 
      p.customer_name.toLowerCase().includes(lowerQ) ||
      p.reference.toLowerCase().includes(lowerQ) ||
      p.customer_contact.includes(lowerQ)
    );
  }, [payments, debouncedSearchQuery]);

  const renderItem = ({ item }: { item: PendingPayment }) => {
    const isUnpaid = item.amount_paid === 0;
    
    return (
      <AppPressable 
        style={styles.card} 
        onPress={() => {
          if (item.type === 'Job' && item.job_id) {
            navigation.navigate('Billing', { jobId: item.job_id });
          } else {
            navigation.navigate('SaleDetail', { invoiceId: item.id });
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <CreditCard size={16} color={colors.primary} />
            <Text style={styles.codeText}>{item.reference}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isUnpaid ? colors.accentRed + '20' : colors.accentOrange + '20' }]}>
            <Text style={[styles.statusText, { color: isUnpaid ? colors.accentRed : colors.accentOrange }]}>
              {isUnpaid ? 'UNPAID' : 'PARTIAL'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerText} numberOfLines={1}>{item.customer_name}</Text>
            {!!item.customer_contact && <Text style={styles.contactText} numberOfLines={1}>{item.customer_contact}</Text>}
            <Text style={styles.dateText} numberOfLines={1}>{formatDate(item.created_at)}</Text>
          </View>
          
          <View style={styles.amountsBox}>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Total:</Text>
              <Text style={styles.amountValue}>{formatCurrency(item.grand_total)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Paid:</Text>
              <Text style={styles.amountValue}>{formatCurrency(item.amount_paid)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, styles.dueLabel]}>Due:</Text>
              <Text style={[styles.amountValue, styles.dueValue]}>{formatCurrency(item.balance)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.cardActions}>
          <AppPressable style={styles.actionBtn} onPress={() => handleNotifyCustomer(item)}>
            <MessageCircle size={16} color={colors.primary} />
            <Text style={styles.actionText}>Notify</Text>
          </AppPressable>
          <AppPressable style={[styles.actionBtn, { borderColor: colors.success, backgroundColor: colors.success + '05' }]} onPress={() => handleMarkAsPaid(item)}>
            <CheckCircle size={16} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.success }]}>Mark Paid</Text>
          </AppPressable>
        </View>
      </AppPressable>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Pending Payments" showBack={true} />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer, reference, or phone..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchPayments} />
      ) : filtered.length === 0 ? (
        <EmptyState 
          icon={<CreditCard size={48} color={colors.textMuted} />}
          message="No pending payments"
          subMessage={searchQuery ? "No records match your search." : "All accounts are settled and paid up."}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.textPrimary,
    fontSize: 15,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  codeText: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusText: {
    ...typography.caption,
    fontWeight: 'bold',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  customerText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  contactText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  amountsBox: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 2,
  },
  amountLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  amountValue: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  dueLabel: {
    fontWeight: 'bold',
    color: colors.accentRed,
    marginTop: 4,
  },
  dueValue: {
    fontWeight: 'bold',
    color: colors.accentRed,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  }
});
