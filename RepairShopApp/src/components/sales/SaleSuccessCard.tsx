import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import Button from '../common/Button';
import { Printer, MessageCircle } from 'lucide-react-native';
import { colors, radius, spacing, shadow, typography } from '../../tokens';

interface Props {
  saleCode: string;
  totalAmount: number;
  onPrint: () => void;
  onWhatsApp: () => void;
  onCreateAnother: () => void;
  onDone: () => void;
}

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function SaleSuccessCard({ saleCode, totalAmount, onPrint, onWhatsApp, onCreateAnother, onDone }: Props) {
  return (
    <View style={styles.successWrap}>
      <View style={styles.successCard}>
        <Text style={styles.successTitle}>Sale recorded</Text>
        <Text style={styles.saleCode}>{saleCode}</Text>
        <Text style={styles.successAmount}>{currency.format(totalAmount)}</Text>

        <View style={styles.actionsGrid}>
          <AppPressable style={styles.actionCard} onPress={onPrint}>
            <Printer size={20} color={colors.primary} />
            <Text style={styles.actionText}>Print</Text>
          </AppPressable>
          <AppPressable style={styles.actionCard} onPress={onWhatsApp}>
            <MessageCircle size={20} color={colors.accentGreen} />
            <Text style={styles.actionText}>WhatsApp</Text>
          </AppPressable>
        </View>

        <View style={styles.actions}>
          <Button label="Create Another" onPress={onCreateAnother} style={styles.actionBtn} />
          <Button label="Done" variant="secondary" onPress={onDone} style={styles.actionBtn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  successWrap: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  successCard: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.xl, ...shadow.card,
  },
  successTitle: { ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  saleCode: { ...typography.h1, color: colors.navBackground, textAlign: 'center', marginBottom: spacing.sm },
  successAmount: { ...typography.bodyBold, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.lg },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  actionCard: {
    flexGrow: 1, minWidth: '30%', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundAlt, gap: spacing.xs,
  },
  actionText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionBtn: { flex: 1 },
});
