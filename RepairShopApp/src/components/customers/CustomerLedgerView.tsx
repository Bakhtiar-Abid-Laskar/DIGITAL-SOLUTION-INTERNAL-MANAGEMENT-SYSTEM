import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { 
  Wallet, 
  ArrowDownLeft, 
  RefreshCw, 
  Plus, 
  FileText, 
  AlertCircle, 
  History,
  CheckCircle2,
  Clock,
  CreditCard,
  X,
  Download
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { AppPressable } from '../common/AppPressable';
import { supabase } from '../../lib/supabase';
import { colors, spacing, typography, radius, shadow } from '../../tokens';
import { Customer, formatCurrency } from '@repairshop/shared';
import Button from '../common/Button';
import { useToast } from '../../context/ToastContext';

interface InvoicePayment {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  recorded_by: string;
  notes: string | null;
  created_at: string;
}

interface WalletTransaction {
  id: string;
  customer_id: string;
  type: 'deposit' | 'applied_to_invoice' | 'refund';
  amount: number;
  applied_invoice_id: string | null;
  recorded_by: string;
  notes: string | null;
  created_at: string;
}

interface InvoiceRecord {
  id: string;
  invoice_code: string;
  grand_total: number;
  amount_paid: number;
  status: string;
  created_at: string;
  payment_method?: string;
  job_id?: string | null;
  jobs?: {
    id: string;
    job_code: string;
  } | null;
}

interface LedgerInstallmentRow {
  rowId: string;
  invoiceId: string;
  customerName: string;
  invoiceCode: string;
  jobCode: string;
  totalAmount: number;
  paymentDate: string | null;
  amountPaid: number;
  paymentMethod: string;
  referenceNumber: string;
  amountLeftAfterPayment: number;
  status: 'paid' | 'partial' | 'pending' | 'historical';
  isHistorical: boolean;
  notes?: string | null;
}

interface CustomerLedgerViewProps {
  customer: Customer;
}

export default function CustomerLedgerView({ customer }: CustomerLedgerViewProps) {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [showWalletHistory, setShowWalletHistory] = useState(false);

  // Deposit Advance Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('Cash');
  const [depositRef, setDepositRef] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const fetchLedgerData = useCallback(async () => {
    if (!customer?.id) return;
    try {
      setLoading(true);

      const [invRes, payRes, walletRes] = await Promise.all([
        supabase
          .from('invoices')
          .select(`
            id,
            invoice_code,
            grand_total,
            amount_paid,
            status,
            created_at,
            payment_method,
            job_id,
            jobs (
              id,
              job_code
            )
          `)
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('invoice_payments')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: true }),

        supabase
          .from('customer_wallet_transactions')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
      ]);

      if (invRes.error) throw invRes.error;
      if (payRes.error) throw payRes.error;
      if (walletRes.error) throw walletRes.error;

      setInvoices((invRes.data as any) || []);
      setPayments((payRes.data as any) || []);
      setWalletTransactions((walletRes.data as any) || []);
    } catch (err: any) {
      console.error('Error fetching mobile customer ledger:', err);
      showToast({ title: 'Error', message: err.message || 'Failed to load ledger.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [customer?.id, showToast]);

  useEffect(() => {
    fetchLedgerData();

    // Scoped real-time subscription for mobile
    const channel = supabase
      .channel(`mobile-customer-ledger-${customer.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoice_payments', filter: `customer_id=eq.${customer.id}` },
        () => fetchLedgerData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_wallet_transactions', filter: `customer_id=eq.${customer.id}` },
        () => fetchLedgerData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `customer_id=eq.${customer.id}` },
        () => fetchLedgerData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customer.id, fetchLedgerData]);

  // Derived live wallet balance
  const walletBalance = useMemo(() => {
    return walletTransactions.reduce((acc, tx) => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'deposit') return acc + amt;
      if (tx.type === 'applied_to_invoice' || tx.type === 'refund') return acc - amt;
      return acc;
    }, 0);
  }, [walletTransactions]);

  // Summary figures
  const summary = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;

    invoices.forEach((inv) => {
      totalInvoiced += Number(inv.grand_total || 0);
      totalPaid += Number(inv.amount_paid || 0);
    });

    const pendingBalance = Math.max(0, totalInvoiced - totalPaid);

    return {
      totalInvoiced,
      totalPaid,
      pendingBalance,
      invoiceCount: invoices.length,
    };
  }, [invoices]);

  // Grouped ledger installments
  const groupedLedger = useMemo(() => {
    return invoices.map((inv) => {
      const invPayments = payments.filter((p) => p.invoice_id === inv.id);
      const grandTotal = Number(inv.grand_total || 0);
      const rows: LedgerInstallmentRow[] = [];

      if (invPayments.length > 0) {
        const sorted = [...invPayments].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        let runningPaid = 0;
        sorted.forEach((p) => {
          const amt = Number(p.amount || 0);
          runningPaid += amt;
          const leftAfter = Math.max(0, grandTotal - runningPaid);
          const isFull = leftAfter <= 0;

          rows.push({
            rowId: p.id,
            invoiceId: inv.id,
            customerName: customer.name,
            invoiceCode: inv.invoice_code || '—',
            jobCode: (inv.jobs as any)?.job_code || 'Direct Sale',
            totalAmount: grandTotal,
            paymentDate: p.created_at,
            amountPaid: amt,
            paymentMethod: p.payment_method,
            referenceNumber: p.reference_number || '—',
            amountLeftAfterPayment: leftAfter,
            status: isFull ? 'paid' : 'partial',
            isHistorical: false,
            notes: p.notes
          });
        });
      } else {
        const storedPaid = Number(inv.amount_paid || 0);
        if (storedPaid > 0) {
          const leftAfter = Math.max(0, grandTotal - storedPaid);
          rows.push({
            rowId: `legacy-${inv.id}`,
            invoiceId: inv.id,
            customerName: customer.name,
            invoiceCode: inv.invoice_code || '—',
            jobCode: (inv.jobs as any)?.job_code || 'Direct Sale',
            totalAmount: grandTotal,
            paymentDate: inv.created_at,
            amountPaid: storedPaid,
            paymentMethod: inv.payment_method || 'Historical Record',
            referenceNumber: '—',
            amountLeftAfterPayment: leftAfter,
            status: 'historical',
            isHistorical: true,
            notes: 'Legacy pre-ledger lump-sum entry'
          });
        } else {
          rows.push({
            rowId: `unpaid-${inv.id}`,
            invoiceId: inv.id,
            customerName: customer.name,
            invoiceCode: inv.invoice_code || '—',
            jobCode: (inv.jobs as any)?.job_code || 'Direct Sale',
            totalAmount: grandTotal,
            paymentDate: null,
            amountPaid: 0,
            paymentMethod: '—',
            referenceNumber: '—',
            amountLeftAfterPayment: grandTotal,
            status: 'pending',
            isHistorical: false,
            notes: 'No payments recorded yet'
          });
        }
      }

      return {
        invoice: inv,
        rows
      };
    });
  }, [invoices, payments, customer.name]);

  const handleDepositAdvance = async () => {
    const numAmt = parseFloat(depositAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      showToast({ title: 'Validation error', message: 'Enter a valid amount > 0.', type: 'error' });
      return;
    }

    setSubmittingDeposit(true);
    try {
      const { error } = await supabase.rpc('deposit_customer_advance', {
        p_customer_id: customer.id,
        p_amount: numAmt,
        p_payment_method: depositMethod,
        p_reference_number: depositRef.trim() || null,
        p_notes: depositNotes.trim() || null
      });

      if (error) throw error;

      showToast({ title: 'Deposit Successful', message: `Added ${formatCurrency(numAmt)} to wallet.`, type: 'success' });
      setIsDepositModalOpen(false);
      setDepositAmount('');
      setDepositRef('');
      setDepositNotes('');
      fetchLedgerData();
    } catch (err: any) {
      showToast({ title: 'Deposit Failed', message: err.message || 'Could not deposit advance.', type: 'error' });
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Mobile: Call Edge Function to generate XLSX and share via expo-sharing
  const handleDownloadLedgerXLSX = async () => {
    try {
      setExportingXlsx(true);

      const { data, error } = await supabase.functions.invoke('export-customer-ledger', {
        body: { customer_id: customer.id }
      });

      if (error) throw error;
      if (!data?.success || !data?.base64) {
        throw new Error(data?.error || 'Failed to generate ledger spreadsheet.');
      }

      const cleanCustomerName = customer.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = data.filename || `Customer_Ledger_${cleanCustomerName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, data.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `Share Customer Ledger - ${customer.name}`,
          UTI: 'com.microsoft.excel.xlsx'
        });
      } else {
        showToast({ title: 'Export Complete', message: `Saved file: ${filename}`, type: 'success' });
      }
    } catch (err: any) {
      console.error('Error downloading customer ledger XLSX on mobile:', err);
      showToast({ title: 'Export Failed', message: err.message || 'Failed to generate XLSX.', type: 'error' });
    } finally {
      setExportingXlsx(false);
    }
  };

  const renderStatusBadge = (status: LedgerInstallmentRow['status'], isHistorical: boolean) => {
    if (isHistorical) {
      return (
        <View style={[styles.badgeBase, styles.badgeHistorical]}>
          <Text style={styles.badgeTextHistorical}>Historical</Text>
        </View>
      );
    }
    switch (status) {
      case 'paid':
        return (
          <View style={[styles.badgeBase, styles.badgePaid]}>
            <Text style={styles.badgeTextPaid}>Paid</Text>
          </View>
        );
      case 'partial':
        return (
          <View style={[styles.badgeBase, styles.badgePartial]}>
            <Text style={styles.badgeTextPartial}>Partial</Text>
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.badgeBase, styles.badgePending]}>
            <Text style={styles.badgeTextPending}>Pending</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Wallet Balance Hero Card */}
      <View style={styles.walletCard}>
        <View style={styles.walletTopRow}>
          <View style={styles.walletLabelWrap}>
            <Wallet size={16} color="#4338ca" />
            <Text style={styles.walletLabel}>Wallet Advance Balance</Text>
          </View>
          <View style={[styles.walletBadge, walletBalance > 0 ? styles.walletBadgeActive : styles.walletBadgeZero]}>
            <Text style={[styles.walletBadgeText, walletBalance > 0 ? styles.walletBadgeTextActive : styles.walletBadgeTextZero]}>
              {walletBalance > 0 ? 'Active Credit' : 'Zero Balance'}
            </Text>
          </View>
        </View>

        <Text style={styles.walletAmount}>{formatCurrency(walletBalance)}</Text>
        <Text style={styles.walletSubtext}>Available unallocated credit for future invoices</Text>

        <View style={styles.walletActionRow}>
          <AppPressable
            style={styles.depositBtn}
            onPress={() => setIsDepositModalOpen(true)}
          >
            <Plus size={14} color="#ffffff" />
            <Text style={styles.depositBtnText}>Deposit Advance</Text>
          </AppPressable>

          <AppPressable
            style={styles.walletHistoryToggle}
            onPress={() => setShowWalletHistory(!showWalletHistory)}
          >
            <History size={14} color="#4338ca" />
            <Text style={styles.walletHistoryToggleText}>
              {showWalletHistory ? 'Hide Activity' : `Activity (${walletTransactions.length})`}
            </Text>
          </AppPressable>
        </View>
      </View>

      {/* Wallet Activity Accordion */}
      {showWalletHistory && (
        <View style={styles.walletHistoryCard}>
          <Text style={styles.walletHistoryTitle}>Wallet Activity Log</Text>
          {walletTransactions.length === 0 ? (
            <Text style={styles.emptyActivityText}>No wallet transactions recorded.</Text>
          ) : (
            walletTransactions.map((tx) => (
              <View key={tx.id} style={styles.walletTxRow}>
                <View style={styles.walletTxLeft}>
                  <Text style={styles.walletTxType}>
                    {tx.type === 'deposit' ? 'Deposit (+)' : tx.type === 'applied_to_invoice' ? 'Applied to Invoice (-)' : 'Refund (-)'}
                  </Text>
                  <Text style={styles.walletTxDate}>{formatDate(tx.created_at)}</Text>
                </View>
                <Text style={[
                  styles.walletTxAmount,
                  tx.type === 'deposit' ? styles.txDeposit : styles.txDeduct
                ]}>
                  {formatCurrency(tx.amount)}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Invoiced</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.totalInvoiced)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: '#047857' }]}>Collected</Text>
          <Text style={[styles.summaryValue, { color: '#047857' }]}>{formatCurrency(summary.totalPaid)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: summary.pendingBalance > 0 ? '#b91c1c' : colors.textSecondary }]}>
            Pending Due
          </Text>
          <Text style={[styles.summaryValue, { color: summary.pendingBalance > 0 ? '#b91c1c' : colors.textPrimary }]}>
            {formatCurrency(summary.pendingBalance)}
          </Text>
        </View>
      </View>

      {/* Installment Breakdown Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Invoice & Installment Ledger</Text>
        <View style={styles.sectionHeaderRight}>
          <AppPressable 
            onPress={handleDownloadLedgerXLSX} 
            disabled={exportingXlsx}
            style={styles.exportBtn}
          >
            {exportingXlsx ? (
              <ActivityIndicator size="small" color="#047857" />
            ) : (
              <>
                <Download size={13} color="#047857" />
                <Text style={styles.exportBtnText}>Export XLSX</Text>
              </>
            )}
          </AppPressable>

          <AppPressable onPress={fetchLedgerData} style={styles.refreshBtn}>
            <RefreshCw size={13} color={colors.textSecondary} />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </AppPressable>
        </View>
      </View>

      {/* Loading or Ledger List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading ledger records...</Text>
        </View>
      ) : groupedLedger.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FileText size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Invoices Found</Text>
          <Text style={styles.emptySubtext}>
            Invoices and installment payments for {customer.name} will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.ledgerList}>
          {groupedLedger.map(({ invoice, rows }) => (
            <View key={invoice.id} style={styles.invoiceGroupCard}>
              {/* Invoice Header */}
              <View style={styles.invoiceGroupHeader}>
                <View>
                  <View style={styles.invoiceCodeRow}>
                    <Text style={styles.invoiceCodeText}>{invoice.invoice_code || 'Invoice'}</Text>
                    <Text style={styles.invoiceDateText}>• {formatDate(invoice.created_at)}</Text>
                  </View>
                  <Text style={styles.invoiceJobText}>
                    {(invoice.jobs as any)?.job_code ? `Job: ${(invoice.jobs as any).job_code}` : 'Direct Sale'}
                  </Text>
                </View>
                <View style={styles.invoiceGroupRight}>
                  <Text style={styles.invoiceTotalLabel}>Grand Total</Text>
                  <Text style={styles.invoiceTotalAmount}>{formatCurrency(invoice.grand_total)}</Text>
                </View>
              </View>

              {/* Installment Rows */}
              <View style={styles.installmentsContainer}>
                {rows.map((row, idx) => (
                  <View 
                    key={row.rowId} 
                    style={[
                      styles.installmentRow,
                      idx < rows.length - 1 && styles.installmentBorder,
                      row.isHistorical && styles.historicalRow
                    ]}
                  >
                    <View style={styles.installmentTop}>
                      <View style={styles.installmentMeta}>
                        <Text style={styles.installmentDate}>
                          {row.paymentDate ? formatDate(row.paymentDate) : 'Unpaid Entry'}
                        </Text>
                        <Text style={styles.installmentMethod}>
                          {row.paymentMethod} {row.referenceNumber !== '—' ? `(${row.referenceNumber})` : ''}
                        </Text>
                      </View>
                      {renderStatusBadge(row.status, row.isHistorical)}
                    </View>

                    <View style={styles.installmentFinancials}>
                      <View>
                        <Text style={styles.financialLabel}>Paid (Installment)</Text>
                        <Text style={styles.paidAmountText}>{formatCurrency(row.amountPaid)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.financialLabel}>Amount Left After</Text>
                        <Text style={[
                          styles.amountLeftText,
                          row.amountLeftAfterPayment > 0 ? styles.amountLeftPending : styles.amountLeftZero
                        ]}>
                          {formatCurrency(row.amountLeftAfterPayment)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Deposit Advance Modal */}
      {isDepositModalOpen && (
        <Modal
          visible={isDepositModalOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsDepositModalOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalSheetHeader}>
                <Text style={styles.modalSheetTitle}>Deposit Customer Advance</Text>
                <AppPressable onPress={() => setIsDepositModalOpen(false)} style={styles.closeBtn}>
                  <X size={18} color={colors.textSecondary} />
                </AppPressable>
              </View>

              <ScrollView style={styles.modalSheetBody}>
                <View style={styles.depositNotice}>
                  <Text style={styles.depositNoticeText}>
                    Deposits money into <Text style={{ fontWeight: '700' }}>{customer.name}</Text>'s wallet. Can be used for any repair job or direct counter sale.
                  </Text>
                </View>

                <View style={styles.modalFieldGroup}>
                  <Text style={styles.modalFieldLabel}>Deposit Amount (₹) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={depositAmount}
                    onChangeText={setDepositAmount}
                    placeholder="e.g. 1000.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>

                <View style={styles.modalFieldGroup}>
                  <Text style={styles.modalFieldLabel}>Payment Method *</Text>
                  <View style={styles.methodSelectorRow}>
                    {['Cash', 'UPI', 'Card', 'Bank Transfer'].map((m) => (
                      <AppPressable
                        key={m}
                        style={[styles.methodPill, depositMethod === m && styles.methodPillActive]}
                        onPress={() => setDepositMethod(m)}
                      >
                        <Text style={[styles.methodPillText, depositMethod === m && styles.methodPillTextActive]}>
                          {m}
                        </Text>
                      </AppPressable>
                    ))}
                  </View>
                </View>

                <View style={styles.modalFieldGroup}>
                  <Text style={styles.modalFieldLabel}>Reference Number (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={depositRef}
                    onChangeText={setDepositRef}
                    placeholder="UTR / Cheque No. / Transaction ID"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.modalFieldGroup}>
                  <Text style={styles.modalFieldLabel}>Notes / Purpose (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                    value={depositNotes}
                    onChangeText={setDepositNotes}
                    placeholder="e.g. Advance for screen replacement"
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                </View>
              </ScrollView>

              <View style={styles.modalSheetFooter}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setIsDepositModalOpen(false)}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  label="Confirm Deposit"
                  onPress={handleDepositAdvance}
                  loading={submittingDeposit}
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
    paddingVertical: spacing.sm,
  },
  walletCard: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  walletTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  walletBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  walletBadgeActive: {
    backgroundColor: '#e0e7ff',
  },
  walletBadgeZero: {
    backgroundColor: '#f1f5f9',
  },
  walletBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  walletBadgeTextActive: {
    color: '#4338ca',
  },
  walletBadgeTextZero: {
    color: colors.textMuted,
  },
  walletAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e1b4b',
    marginVertical: spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  walletSubtext: {
    fontSize: 12,
    color: '#6366f1',
  },
  walletActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#ede9fe',
  },
  depositBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: 4,
  },
  depositBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  walletHistoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: 4,
  },
  walletHistoryToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338ca',
  },
  walletHistoryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  walletHistoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  emptyActivityText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  walletTxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  walletTxLeft: {
    flex: 1,
  },
  walletTxType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  walletTxDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  walletTxAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  txDeposit: {
    color: '#047857',
  },
  txDeduct: {
    color: '#4338ca',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  ledgerList: {
    gap: spacing.md,
  },
  invoiceGroupCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  invoiceGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  invoiceCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  invoiceDateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  invoiceJobText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  invoiceGroupRight: {
    alignItems: 'flex-end',
  },
  invoiceTotalLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  invoiceTotalAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  installmentsContainer: {
    paddingHorizontal: spacing.md,
  },
  installmentRow: {
    paddingVertical: spacing.sm,
  },
  installmentBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  historicalRow: {
    backgroundColor: '#f8fafc',
  },
  installmentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  installmentMeta: {
    flex: 1,
  },
  installmentDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  installmentMethod: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  installmentFinancials: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  financialLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  paidAmountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  amountLeftText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  amountLeftPending: {
    color: '#b91c1c',
  },
  amountLeftZero: {
    color: '#047857',
  },
  badgeBase: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgePaid: {
    backgroundColor: '#dcfce7',
  },
  badgeTextPaid: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  badgePartial: {
    backgroundColor: '#fef3c7',
  },
  badgeTextPartial: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  badgePending: {
    backgroundColor: '#ffe4e6',
  },
  badgeTextPending: {
    fontSize: 10,
    fontWeight: '700',
    color: '#be123c',
  },
  badgeHistorical: {
    backgroundColor: '#e2e8f0',
  },
  badgeTextHistorical: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalSheetBody: {
    padding: spacing.md,
  },
  depositNotice: {
    backgroundColor: '#e0e7ff',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  depositNoticeText: {
    fontSize: 12,
    color: '#3730a3',
    lineHeight: 18,
  },
  modalFieldGroup: {
    marginBottom: spacing.md,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
  methodSelectorRow: {
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
