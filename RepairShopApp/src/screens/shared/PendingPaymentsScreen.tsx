import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  FlatList, 
  RefreshControl, 
  TextInput, 
  ActivityIndicator, 
  Linking, 
  Modal, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import * as Print from 'expo-print';
import AppHeader from '../../components/common/AppHeader';
import { AppPressable } from '../../components/common/AppPressable';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonList } from '../../components/common/SkeletonCard';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { formatCurrency, formatDate, useDebounceValue } from '@repairshop/shared';
import { 
  Search, 
  CreditCard, 
  MessageCircle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  ExternalLink, 
  RefreshCw, 
  X,
  FileText
} from 'lucide-react-native';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button';

interface PendingInvoiceItem {
  id: string; // invoices.id
  type: 'Job' | 'Sale';
  reference: string;
  grand_total: number;
  amount_paid: number;
  balance: number;
  created_at: string;
  job_id?: string | null;
}

interface CustomerPendingGroup {
  key: string;
  customerId?: string | null;
  customerName: string;
  customerContact: string;
  totalPendingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  invoices: PendingInvoiceItem[];
}

function parseMobilePendingInvoices(data: any[]): CustomerPendingGroup[] {
  const groupsMap = new Map<string, CustomerPendingGroup>();

  data.forEach((inv: any) => {
    const total = Number(inv.grand_total) || 0;
    const paid = Number(inv.amount_paid) || 0;
    const balance = inv.balance !== undefined ? Number(inv.balance) : (total - paid);

    if (balance > 0) {
      const isJob = !!inv.job_id;
      let name = inv.customer_name;
      if (!name || name.trim() === '') {
        name = isJob ? (inv.job_customer_name || inv.jobs?.customer_name || 'Unknown') : 'Unknown';
      }
      let contact = inv.customer_contact;
      if (!contact || contact.trim() === '') {
        contact = isJob ? (inv.job_customer_contact || inv.jobs?.customer_contact || '') : '';
      }

      name = (name || 'Unknown').replace(/\n/g, ' ').trim();
      contact = (contact || '').replace(/\n/g, ' ').trim();

      const groupKey = inv.customer_id ? `cid_${inv.customer_id}` : `contact_${contact || name.toLowerCase()}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          key: groupKey,
          customerId: inv.customer_id || null,
          customerName: name,
          customerContact: contact,
          totalPendingBalance: 0,
          totalInvoiced: 0,
          totalPaid: 0,
          invoices: []
        });
      }

      const group = groupsMap.get(groupKey)!;
      group.totalPendingBalance += balance;
      group.totalInvoiced += total;
      group.totalPaid += paid;
      group.invoices.push({
        id: inv.id,
        type: isJob ? 'Job' : 'Sale',
        reference: isJob ? (inv.job_code || inv.jobs?.job_code || inv.invoice_code) : inv.invoice_code,
        grand_total: total,
        amount_paid: paid,
        balance: balance,
        created_at: inv.created_at,
        job_id: inv.job_id || null,
      });
    }
  });

  const groupsArray = Array.from(groupsMap.values());
  groupsArray.forEach(g => {
    g.invoices.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });

  groupsArray.sort((a, b) => b.totalPendingBalance - a.totalPendingBalance);
  return groupsArray;
}

export default function PendingPaymentsScreen() {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounceValue(searchQuery, 300);

  // Record Installment Payment Modal State
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<{
    invoice: PendingInvoiceItem;
    customerName: string;
    customerContact: string;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [printReceipt, setPrintReceipt] = useState(true);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // TanStack Query for Cached Pending Invoices with Database RPC
  const {
    data: customerGroups = [],
    isLoading: loading,
    isRefetching: refreshing,
    error: queryError,
    refetch,
  } = useQuery<CustomerPendingGroup[]>({
    queryKey: ['mobile-pending-payments'],
    queryFn: async () => {
      // 1. High-Performance RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_pending_invoices');
      if (!rpcError && rpcData) {
        return parseMobilePendingInvoices(rpcData);
      }

      // 2. Fallback query
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_code,
          customer_id,
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
        .neq('status', 'cancelled');

      if (fetchError) throw fetchError;
      return parseMobilePendingInvoices(data || []);
    },
    staleTime: 60 * 1000,
  });

  const error = queryError ? (queryError as Error).message || 'Failed to load pending payments.' : null;

  // Auto-expand top debtor on initial load
  useEffect(() => {
    if (customerGroups.length > 0 && expandedKeys.size === 0) {
      setExpandedKeys(new Set([customerGroups[0].key]));
    }
  }, [customerGroups, expandedKeys.size]);

  // Real-time subscriptions to auto-invalidate cache
  useEffect(() => {
    const channel = supabase
      .channel('mobile-pending-payments-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        queryClient.invalidateQueries({ queryKey: ['mobile-pending-payments'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['mobile-pending-payments'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const filteredGroups = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return customerGroups;
    const q = debouncedSearchQuery.toLowerCase();
    return customerGroups.filter(g => {
      const matchCustomer = g.customerName.toLowerCase().includes(q) || g.customerContact.includes(q);
      const matchInvoice = g.invoices.some(inv => inv.reference.toLowerCase().includes(q));
      return matchCustomer || matchInvoice;
    });
  }, [customerGroups, debouncedSearchQuery]);

  const summary = useMemo(() => {
    let customerCount = filteredGroups.length;
    let totalInvoices = 0;
    let totalBalance = 0;

    filteredGroups.forEach(g => {
      totalInvoices += g.invoices.length;
      totalBalance += g.totalPendingBalance;
    });

    return {
      customerCount,
      totalInvoices,
      totalBalance,
    };
  }, [filteredGroups]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const openPaymentModal = (invoice: PendingInvoiceItem, customerName: string, customerContact: string) => {
    setActivePaymentInvoice({ invoice, customerName, customerContact });
    setPaymentAmount(invoice.balance.toString());
    setPaymentMethod('Cash');
    setPaymentRef('');
    setPaymentNotes('');
    setPrintReceipt(true);
  };

  const closePaymentModal = () => setActivePaymentInvoice(null);
  
  const printMoneyReceiptMobile = async (
    activeInvoice: { invoice: PendingInvoiceItem; customerName: string; customerContact: string }, 
    paymentAmount: number, 
    paymentMethod: string, 
    paymentRef: string, 
    paymentNotes: string
  ) => {
    const receiptHtml = `
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <title>Money Receipt - ${activeInvoice.invoice.reference}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; color: #111827; }
          .receipt-container { margin: 0 auto; padding: 10px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 2px; text-transform: uppercase; }
          .subtitle { font-size: 14px; color: #6b7280; margin-top: 5px; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
          .detail-item { font-size: 14px; }
          .detail-label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .detail-value { font-weight: bold; margin-top: 2px; font-size: 15px; }
          .amount-box { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
          .amount-title { font-size: 14px; color: #4b5563; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
          .amount-value { font-size: 32px; font-weight: bold; color: #059669; }
          .summary-box { border-top: 1px dashed #d1d5db; padding-top: 20px; font-size: 14px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6; }
          .summary-row:last-child { border-bottom: none; }
          .summary-row.total { font-weight: bold; font-size: 16px; border-top: 1px solid #000; padding-top: 8px; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #9ca3af; }
          .signature { margin-top: 50px; display: flex; justify-content: space-between; }
          .sig-line { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1 class="title">MONEY RECEIPT</h1>
            <div class="subtitle">RepairShop - Service & Repair Management</div>
          </div>
  
          <div class="details-grid">
            <div class="detail-item">
              <div class="detail-label">Receipt No</div>
              <div class="detail-value">RCPT-${Math.floor(Date.now() / 1000)}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Date</div>
              <div class="detail-value">${new Date().toLocaleString('en-IN')}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Customer Name</div>
              <div class="detail-value">${activeInvoice.customerName}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Phone</div>
              <div class="detail-value">${activeInvoice.customerContact || 'N/A'}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Reference (Invoice)</div>
              <div class="detail-value">${activeInvoice.invoice.reference}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Payment Mode</div>
              <div class="detail-value">${paymentMethod} ${paymentRef ? `(${paymentRef})` : ''}</div>
            </div>
          </div>
  
          <div class="amount-box">
            <div class="amount-title">Amount Received</div>
            <div class="amount-value">₹${paymentAmount.toFixed(2)}</div>
          </div>
  
          <div class="summary-box">
            <div class="summary-row">
              <span>Total Bill Amount:</span>
              <span>₹${activeInvoice.invoice.grand_total.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Previously Paid:</span>
              <span>₹${activeInvoice.invoice.amount_paid.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Payment Received:</span>
              <span style="color: #059669; font-weight: bold;">₹${paymentAmount.toFixed(2)}</span>
            </div>
            <div class="summary-row total">
              <span>Remaining Balance:</span>
              <span style="color: #e11d48;">₹${Math.max(0, activeInvoice.invoice.balance - paymentAmount).toFixed(2)}</span>
            </div>
          </div>
          
          ${paymentNotes ? `<div style="margin-top: 20px; font-size: 13px; color: #4b5563;"><strong>Notes:</strong> ${paymentNotes}</div>` : ''}
  
          <div class="signature">
            <div class="sig-line">Customer Signature</div>
            <div class="sig-line">Authorized Signatory</div>
          </div>
  
          <div class="footer">
            This is a computer-generated receipt and does not require a physical signature.
          </div>
        </div>
      </body>
      </html>
    `;
    try {
      await Print.printAsync({ html: receiptHtml });
    } catch (err) {
      console.warn("Print receipt failed", err);
    }
  };

  const handleConfirmPayment = async () => {
    if (!activePaymentInvoice) return;
    const numAmt = parseFloat(paymentAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      showToast({ title: 'Validation error', message: 'Enter a valid amount > 0.', type: 'error' });
      return;
    }
    if (numAmt > activePaymentInvoice.invoice.balance) {
      showToast({
        title: 'Validation error',
        message: `Amount cannot exceed balance of ${formatCurrency(activePaymentInvoice.invoice.balance)}.`,
        type: 'error'
      });
      return;
    }

    setSubmittingPayment(true);
    try {
      const { error: rpcErr } = await supabase.rpc('record_installment_payment', {
        p_invoice_id: activePaymentInvoice.invoice.id,
        p_cash_amount: numAmt,
        p_payment_method: paymentMethod,
        p_reference_number: paymentRef.trim() || null,
        p_notes: paymentNotes.trim() || null,
      });

      if (rpcErr) throw rpcErr;

      showToast({
        title: 'Payment Recorded',
        message: `Saved ${formatCurrency(numAmt)} for ${activePaymentInvoice.invoice.reference}!`,
        type: 'success'
      });
      
      if (printReceipt) {
        await printMoneyReceiptMobile(
          activePaymentInvoice, 
          numAmt, 
          paymentMethod, 
          paymentRef, 
          paymentNotes
        );
      }
      
      setActivePaymentInvoice(null);
      refetch();
    } catch (err: any) {
      console.error('Error saving installment payment:', err);
      showToast({ title: 'Error', message: err.message || 'Failed to record payment.', type: 'error' });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleNotifyCustomer = async (invoice: PendingInvoiceItem, customerName: string, customerContact: string) => {
    if (!customerContact) {
      showToast({ title: 'Error', message: 'No contact number available for this customer.', type: 'error' });
      return;
    }

    try {
      showToast({ title: 'Sending WhatsApp...', message: `Notifying ${customerName}`, type: 'info' });
      const { data, error } = await supabase.functions.invoke('notify-on-finance-event', {
        body: {
          action: 'SEND_PENDING_REMINDER',
          phone: customerContact,
          customerName: customerName,
          reference: invoice.reference,
          balanceDue: invoice.balance,
          totalAmount: invoice.grand_total,
          jobId: invoice.type === 'Job' ? invoice.id : undefined,
          saleId: invoice.type === 'Sale' ? invoice.id : undefined,
        },
      });

      if (!error && data?.success) {
        showToast({ title: 'WhatsApp Sent', message: `Reminder delivered to ${customerName}`, type: 'success' });
        return;
      }
    } catch {
      // Fall through to client deep link
    }

    // Fallback: Open WhatsApp app directly
    const cleanPhone = customerContact.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const text = `Hello ${customerName}, a payment of ${formatCurrency(invoice.balance)} is pending for ${invoice.reference}. Please arrange payment at your earliest convenience. Thank you.`;
    const url = `whatsapp://send?phone=${phoneWithCountry}&text=${encodeURIComponent(text)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`);
        }
      })
      .catch(() => {
        showToast({ title: 'Error', message: 'Could not launch WhatsApp.', type: 'error' });
      });
  };

  const handleOpenLedger = (group: CustomerPendingGroup) => {
    // Navigate to Customers screen with search query to easily view their ledger
    navigation.navigate('Customers', { search: group.customerName });
  };

  const renderCustomerGroup = ({ item }: { item: CustomerPendingGroup }) => {
    const isExpanded = expandedKeys.has(item.key);

    return (
      <View style={styles.groupCard}>
        {/* Customer Header Row */}
        <AppPressable 
          style={styles.groupHeader} 
          onPress={() => toggleExpand(item.key)}
        >
          <View style={styles.groupHeaderLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{item.customerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.customerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{item.invoices.length} due</Text>
                </View>
              </View>
              <Text style={styles.customerPhone}>
                {item.customerContact || 'No contact on file'}
              </Text>
            </View>
          </View>

          <View style={styles.groupHeaderRight}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.balanceDueLabel}>Total Due</Text>
              <Text style={styles.groupBalanceText}>{formatCurrency(item.totalPendingBalance)}</Text>
            </View>
            <View style={styles.chevronWrap}>
              {isExpanded ? (
                <ChevronUp size={18} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={18} color={colors.textSecondary} />
              )}
            </View>
          </View>
        </AppPressable>

        {/* Action shortcut bar */}
        <View style={styles.groupActionsBar}>
          <AppPressable 
            style={styles.ledgerBtn} 
            onPress={() => handleOpenLedger(item)}
          >
            <ExternalLink size={12} color="#4338ca" />
            <Text style={styles.ledgerBtnText}>View Customer Ledger</Text>
          </AppPressable>

          <Text style={styles.invoiceCountLabel}>
            {item.invoices.length} {item.invoices.length === 1 ? 'Invoice' : 'Invoices'} Pending
          </Text>
        </View>

        {/* Expanded Invoice Breakdown */}
        {isExpanded && (
          <View style={styles.invoicesList}>
            {item.invoices.map((inv, idx) => (
              <View 
                key={inv.id} 
                style={[
                  styles.invoiceItem,
                  idx < item.invoices.length - 1 && styles.invoiceItemBorder
                ]}
              >
                <View style={styles.invoiceItemTop}>
                  <View style={styles.referenceWrap}>
                    <Text style={styles.invoiceRefText}>{inv.reference}</Text>
                    <View style={[
                      styles.typeBadge,
                      inv.type === 'Job' ? styles.typeJob : styles.typeSale
                    ]}>
                      <Text style={[
                        styles.typeBadgeText,
                        inv.type === 'Job' ? styles.typeJobText : styles.typeSaleText
                      ]}>
                        {inv.type}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.invoiceDateText}>{formatDate(inv.created_at)}</Text>
                </View>

                {/* Financial breakdown */}
                <View style={styles.financialRow}>
                  <View>
                    <Text style={styles.finSubLabel}>Total</Text>
                    <Text style={styles.finValue}>{formatCurrency(inv.grand_total)}</Text>
                  </View>
                  <View>
                    <Text style={styles.finSubLabel}>Paid</Text>
                    <Text style={[styles.finValue, { color: '#047857' }]}>{formatCurrency(inv.amount_paid)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.finSubLabel}>Balance Due</Text>
                    <Text style={[styles.finValue, { color: '#b91c1c', fontWeight: '800' }]}>
                      {formatCurrency(inv.balance)}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.invoiceActionsRow}>
                  {item.customerContact ? (
                    <AppPressable
                      style={styles.notifyBtn}
                      onPress={() => handleNotifyCustomer(inv, item.customerName, item.customerContact)}
                    >
                      <MessageCircle size={13} color="#25D366" />
                      <Text style={styles.notifyBtnText}>WhatsApp</Text>
                    </AppPressable>
                  ) : null}

                  <AppPressable
                    style={styles.recordPaymentBtn}
                    onPress={() => openPaymentModal(inv, item.customerName, item.customerContact)}
                  >
                    <Plus size={13} color="#047857" />
                    <Text style={styles.recordPaymentBtnText}>Record Payment</Text>
                  </AppPressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Pending Payments" showBack />

      {/* Summary KPI Strip */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Customers Due</Text>
          <Text style={styles.kpiValue}>{summary.customerCount}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Invoices</Text>
          <Text style={styles.kpiValue}>{summary.totalInvoices}</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiCardHighlight]}>
          <Text style={[styles.kpiLabel, { color: '#b91c1c' }]}>Total Outstanding</Text>
          <Text style={[styles.kpiValue, { color: '#b91c1c' }]}>
            {formatCurrency(summary.totalBalance)}
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer name, phone, or invoice..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <AppPressable onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textMuted} />
            </AppPressable>
          ) : null}
        </View>
      </View>

      {/* Main List */}
      {error ? (
        <ErrorState message={error} onRetry={() => { refetch(); }} />
      ) : loading && customerGroups.length === 0 ? (
        <SkeletonList count={5} />
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={48} color={colors.textMuted} />}
          heading="No pending payments"
          subtext={searchQuery ? 'No records match your search.' : 'All customer accounts are settled and paid up!'}
        />
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.key}
          renderItem={renderCustomerGroup}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}

      {/* Record Installment Payment Modal */}
      {activePaymentInvoice && (
        <Modal
          visible={!!activePaymentInvoice}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setActivePaymentInvoice(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalSheetHeader}>
                <Text style={styles.modalSheetTitle}>
                  Record Payment — {activePaymentInvoice.invoice.reference}
                </Text>
                <AppPressable onPress={() => setActivePaymentInvoice(null)} style={{ padding: 4 }}>
                  <X size={18} color={colors.textSecondary} />
                </AppPressable>
              </View>

              <ScrollView style={styles.modalSheetBody}>
                {/* Balance summary card */}
                <View style={styles.invoiceSummaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summarySubLabel}>Customer:</Text>
                    <Text style={styles.summaryValueText}>{activePaymentInvoice.customerName}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summarySubLabel}>Total Invoiced:</Text>
                    <Text style={styles.summaryValueText}>{formatCurrency(activePaymentInvoice.invoice.grand_total)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summarySubLabel}>Paid so far:</Text>
                    <Text style={[styles.summaryValueText, { color: '#047857' }]}>
                      {formatCurrency(activePaymentInvoice.invoice.amount_paid)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: 4, marginTop: 4 }]}>
                    <Text style={[styles.summarySubLabel, { fontWeight: '700', color: '#b91c1c' }]}>Balance Due:</Text>
                    <Text style={[styles.summaryValueText, { fontWeight: '800', color: '#b91c1c', fontSize: 14 }]}>
                      {formatCurrency(activePaymentInvoice.invoice.balance)}
                    </Text>
                  </View>
                </View>

                {/* Amount field */}
                <View style={styles.fieldGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                    <Text style={styles.fieldLabel}>Installment Amount (₹) *</Text>
                    <AppPressable onPress={() => setPaymentAmount(activePaymentInvoice.invoice.balance.toFixed(2))}>
                      <Text style={styles.payFullShortcut}>Pay Full ({formatCurrency(activePaymentInvoice.invoice.balance)})</Text>
                    </AppPressable>
                  </View>
                  <TextInput
                    style={styles.modalInput}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    placeholder="Enter amount..."
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>

                {/* Payment Method Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Payment Method *</Text>
                  <View style={styles.methodPillRow}>
                    {['Cash', 'UPI', 'Card', 'Bank Transfer'].map(m => (
                      <AppPressable
                        key={m}
                        style={[styles.methodPill, paymentMethod === m && styles.methodPillActive]}
                        onPress={() => setPaymentMethod(m)}
                      >
                        <Text style={[styles.methodPillText, paymentMethod === m && styles.methodPillTextActive]}>
                          {m}
                        </Text>
                      </AppPressable>
                    ))}
                  </View>
                </View>

                {/* Reference Number */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Reference No. (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={paymentRef}
                    onChangeText={setPaymentRef}
                    placeholder="UTR / Cheque No. / Transaction ID"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 55, textAlignVertical: 'top' }]}
                    value={paymentNotes}
                    onChangeText={setPaymentNotes}
                    placeholder="e.g. Counter collection"
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                </View>
              </ScrollView>

              <View style={styles.modalSheetFooter}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setActivePaymentInvoice(null)}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  label="Confirm Payment"
                  onPress={handleConfirmPayment}
                  loading={submittingPayment}
                  style={{ flex: 1 }}
                />
              </View>
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
  kpiContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...shadow.card,
  },
  kpiCardHighlight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 42,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4338ca',
  },
  customerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  customerPhone: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceDueLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  groupBalanceText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#b91c1c',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  chevronWrap: {
    padding: 2,
  },
  groupActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  ledgerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ledgerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },
  invoiceCountLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  invoicesList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#ffffff',
  },
  invoiceItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  invoiceItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  invoiceItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  referenceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceRefText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  typeJob: {
    backgroundColor: '#eff6ff',
  },
  typeJobText: {
    color: '#1d4ed8',
    fontSize: 9,
    fontWeight: '700',
  },
  typeSale: {
    backgroundColor: '#ecfdf5',
  },
  typeSaleText: {
    color: '#047857',
    fontSize: 9,
    fontWeight: '700',
  },
  invoiceDateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: spacing.xs,
    borderRadius: radius.sm,
    marginVertical: 4,
  },
  finSubLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  finValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  invoiceActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  notifyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  recordPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  recordPaymentBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: '85%',
    ...shadow.medium,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  modalSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSheetBody: {
    padding: spacing.md,
  },
  invoiceSummaryBox: {
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  summarySubLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  summaryValueText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  payFullShortcut: {
    fontSize: 11,
    color: '#4338ca',
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  methodPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  methodPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  methodPillActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#6366f1',
  },
  methodPillText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  methodPillTextActive: {
    color: '#4338ca',
    fontWeight: '700',
  },
  modalSheetFooter: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
});
