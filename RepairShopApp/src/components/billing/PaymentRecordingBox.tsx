import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { formatCurrency, validatePaymentAmount, derivePaymentStatus } from '@repairshop/shared';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import Button from '../common/Button';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { CreditCard, CheckCircle2, AlertCircle } from 'lucide-react-native';

interface PaymentRecordingBoxProps {
  invoiceId?: string;
  grandTotal: number;
  amountPaid: number;         // Current running total already paid (server-driven)
  paymentMethod?: string;
  status?: string;
  onPaymentRecorded?: (updatedInvoice: any) => void;
  disabled?: boolean;
}

const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Bank Transfer'];

export default function PaymentRecordingBox({
  invoiceId,
  grandTotal,
  amountPaid,
  paymentMethod = 'Cash',
  status,
  onPaymentRecorded,
  disabled = false,
}: PaymentRecordingBoxProps) {
  const { showToast } = useToast();
  // Delta amount for THIS installment only (not cumulative)
  const [amountInput, setAmountInput] = useState<string>('');
  const [method, setMethod] = useState<string>(paymentMethod || 'Cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setMethod(paymentMethod || 'Cash');
  }, [paymentMethod]);

  const balanceDue = Math.max(0, grandTotal - amountPaid);  // server-driven remaining balance
  const numAmount = parseFloat(amountInput) || 0;
  const derivedStatus = derivePaymentStatus(amountPaid, grandTotal);

  const handleAmountChange = (val: string) => {
    setAmountInput(val);
    const parsed = parseFloat(val);
    if (val.trim() === '') {
      setValidationError(null);
      return;
    }
    if (isNaN(parsed) || parsed <= 0) {
      setValidationError('Enter a positive installment amount');
    } else if (parsed > balanceDue) {
      setValidationError(`Cannot exceed remaining balance (${formatCurrency(balanceDue)})`);
    } else {
      setValidationError(null);
    }
  };

  const handleSetFullAmount = () => {
    setAmountInput(String(balanceDue));
    setValidationError(null);
  };

  const handleRecordPayment = async () => {
    const parsed = parseFloat(amountInput);
    if (isNaN(parsed) || parsed <= 0) {
      setValidationError('Enter a positive installment amount');
      return;
    }
    if (parsed > balanceDue) {
      setValidationError(`Cannot exceed remaining balance (${formatCurrency(balanceDue)})`);
      showToast({ title: 'Invalid Amount', message: `Amount exceeds remaining balance of ${formatCurrency(balanceDue)}`, type: 'error' });
      return;
    }
    if (!invoiceId) {
      showToast({ title: 'Save Required', message: 'Please save the bill first before recording payment', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('record_installment_payment', {
        p_invoice_id: invoiceId,
        p_cash_amount: parsed,
        p_payment_method: method,
        p_reference_number: referenceNumber.trim() || null,
      });

      if (error) throw new Error(error.message);

      setAmountInput('');
      setReferenceNumber('');

      showToast({
        title: 'Payment Recorded',
        message:
          parsed >= grandTotal
            ? 'Invoice marked as fully Paid.'
            : parsed > 0
            ? `Partial payment of ${formatCurrency(parsed)} recorded.`
            : 'Payment updated: Invoice is Unpaid/Pending.',
        type: 'success',
      });

      if (onPaymentRecorded) {
        onPaymentRecorded(data);
      }
    } catch (err: any) {
      showToast({ title: 'Payment Failed', message: err.message || 'Could not record payment.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const isFullPaid = derivedStatus === 'paid' && grandTotal > 0;
  const isInvalid = Boolean(validationError) || numAmount <= 0 || numAmount > balanceDue;

  const badgeStyles =
    derivedStatus === 'paid'
      ? { bg: '#DCFCE7', fg: '#15803D', border: '#BBF7D0' }
      : derivedStatus === 'partial'
      ? { bg: '#FEF3C7', fg: '#B45309', border: '#FDE68A' }
      : { bg: '#FEE2E2', fg: '#B91C1C', border: '#FECACA' };

  return (
    <View style={styles.container}>
      {/* Header matching Website */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <CreditCard size={18} color={colors.primary} />
          <Text style={styles.headerTitle}>Payment Recording</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badgeStyles.bg, borderColor: badgeStyles.border }]}>
          <Text style={[styles.statusBadgeText, { color: badgeStyles.fg }]}>
            {derivedStatus.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Bill Amount Display (Read-Only Container) */}
      <View style={styles.totalDisplayBox}>
        <Text style={styles.totalDisplayLabel}>TOTAL BILL AMOUNT</Text>
        <Text style={styles.totalDisplayValue}>{formatCurrency(grandTotal)}</Text>
      </View>

      {/* Editable Amount Input with Header Shortcut */}
      <View style={styles.fieldGroup}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>Installment Amount (₹)</Text>
          {balanceDue > 0 && (
            <AppPressable onPress={handleSetFullAmount} disabled={disabled || loading}>
              <Text style={styles.payFullLink}>Pay Full ({formatCurrency(balanceDue)})</Text>
            </AppPressable>
          )}
        </View>
        <TextInput
          style={[styles.input, isInvalid && styles.inputError]}
          keyboardType="numeric"
          value={amountInput}
          onChangeText={handleAmountChange}
          editable={!disabled && !loading}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
        />
        {validationError && (
          <View style={styles.errorRow}>
            <AlertCircle size={14} color={colors.error} />
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}
      </View>

      {/* Payment Method Selector */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Payment Method</Text>
        <View style={styles.methodRow}>
          {PAYMENT_METHODS.map((m) => {
            const isSelected = method.toLowerCase() === m.toLowerCase();
            return (
              <AppPressable
                key={m}
                onPress={() => setMethod(m)}
                disabled={disabled || loading}
                style={[styles.methodChip, isSelected && styles.methodChipSelected]}
              >
                <Text style={[styles.methodChipText, isSelected && styles.methodChipTextSelected]}>
                  {m}
                </Text>
              </AppPressable>
            );
          })}
        </View>
      </View>

      {/* Reference Number (UPI ID, Cheque No., etc.) */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Reference No. (optional)</Text>
        <TextInput
          style={styles.input}
          value={referenceNumber}
          onChangeText={setReferenceNumber}
          editable={!disabled && !loading}
          placeholder="UPI ref, cheque no., etc."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
      </View>

      {/* Balance Remaining Display */}
      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>Balance Remaining:</Text>
        <Text
          style={[
            styles.balanceValue,
            { color: balanceDue > 0 ? colors.error : colors.success },
          ]}
        >
          {formatCurrency(balanceDue)}
        </Text>
      </View>

      {/* Action Button */}
      <Button
        label={isFullPaid ? 'Mark as Paid' : 'Record Payment'}
        onPress={handleRecordPayment}
        loading={loading}
        disabled={disabled || loading || isInvalid || !invoiceId}
        variant="primary"
        style={styles.actionBtn}
      />

      {!invoiceId && (
        <Text style={styles.helperText}>
          Save billing statement first to enable payment recording.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  totalDisplayBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  totalDisplayLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  totalDisplayValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  payFullLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: colors.textPrimary,
    ...typography.bodyBold,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 46,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  methodChip: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  methodChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  methodChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  methodChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.md,
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
