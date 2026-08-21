import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { PurchaseWithDetails, getImageThumbnailUrl, getFullImageUrl, isGoogleDriveUrl, formatCurrency, formatDate } from '@repairshop/shared';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { AppPressable } from '../common/AppPressable';
import {
  X,
  Building2,
  Package,
  Calendar,
  Phone,
  FileText,
  ExternalLink,
  DollarSign,
  User,
} from 'lucide-react-native';

interface PurchaseDetailModalMobileProps {
  purchase: PurchaseWithDetails | null;
  onClose: () => void;
}

export function PurchaseDetailModalMobile({
  purchase,
  onClose,
}: PurchaseDetailModalMobileProps) {
  if (!purchase) return null;

  const invoiceUrl = purchase.invoice_image_url;
  const isGDrive = isGoogleDriveUrl(invoiceUrl);
  const fullImageUrl = getFullImageUrl(invoiceUrl) || invoiceUrl;
  const thumbnailUrl = getImageThumbnailUrl(invoiceUrl, 600) || invoiceUrl;

  const handleOpenExternal = async () => {
    if (!invoiceUrl) return;
    try {
      await Linking.openURL(fullImageUrl || invoiceUrl);
    } catch (err) {
      console.error('Failed to open invoice link:', err);
    }
  };

  return (
    <Modal
      visible={Boolean(purchase)}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.poBadge}>
                <Text style={styles.poBadgeText}>{purchase.purchase_code}</Text>
              </View>
              <Text style={styles.title}>Purchase Order Details</Text>
              <Text style={styles.subtitle}>
                {formatDate(purchase.purchase_date)} • {purchase.logged_by_name || 'Staff'}
              </Text>
            </View>

            <AppPressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </AppPressable>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
          >
            {/* Supplier Info Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Building2 size={15} color={colors.primary} />
                <Text style={styles.cardTitle}>Supplier Details</Text>
              </View>
              <Text style={styles.supplierName}>{purchase.supplier_name}</Text>
              {purchase.supplier_phone ? (
                <Text style={styles.metaRow}>
                  <Phone size={12} color={colors.textMuted} /> {purchase.supplier_phone}
                </Text>
              ) : null}
              {purchase.supplier_gstin ? (
                <Text style={styles.metaRow}>
                  <FileText size={12} color={colors.textMuted} /> GSTIN: {purchase.supplier_gstin}
                </Text>
              ) : null}
              {purchase.supplier_address ? (
                <Text style={styles.metaRow}>Address: {purchase.supplier_address}</Text>
              ) : null}
            </View>

            {/* Product & Financial Breakdown */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Package size={15} color={colors.primary} />
                <Text style={styles.cardTitle}>Purchased Product</Text>
              </View>
              <Text style={styles.productName}>{purchase.product_name}</Text>
              {purchase.product_sku ? (
                <Text style={styles.skuBadge}>SKU: {purchase.product_sku}</Text>
              ) : null}

              <View style={styles.breakdownBox}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Quantity:</Text>
                  <Text style={styles.breakdownValue}>{purchase.quantity} {purchase.product_unit}</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Rate / Unit:</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(purchase.purchase_rate)}</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subtotal:</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(purchase.subtotal)}</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tax / GST:</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(purchase.tax_amount)}</Text>
                </View>

                <View style={[styles.breakdownRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Grand Total:</Text>
                  <Text style={styles.totalValue}>{formatCurrency(purchase.total_amount)}</Text>
                </View>
              </View>
            </View>

            {/* Invoice Reference */}
            {purchase.supplier_invoice_number ? (
              <View style={styles.card}>
                <Text style={styles.metaLabel}>Supplier Invoice / Bill No:</Text>
                <Text style={styles.metaValue}>{purchase.supplier_invoice_number}</Text>
              </View>
            ) : null}

            {/* Attached Invoice Document */}
            {invoiceUrl ? (
              <View style={styles.card}>
                <View style={styles.docHeader}>
                  <Text style={styles.cardTitle}>
                    Attached Invoice {isGDrive ? '(Google Drive)' : ''}
                  </Text>
                  <AppPressable
                    onPress={handleOpenExternal}
                    style={styles.openExternalBtn}
                  >
                    <Text style={styles.openExternalText}>
                      Open in {isGDrive ? 'Google Drive' : 'Viewer'}
                    </Text>
                    <ExternalLink size={12} color={colors.primary} />
                  </AppPressable>
                </View>

                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: thumbnailUrl || invoiceUrl }}
                    style={styles.invoiceImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <AppPressable onPress={onClose} style={styles.closeActionBtn}>
              <Text style={styles.closeActionText}>Close</Text>
            </AppPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
    minHeight: '50%',
    ...shadow.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  poBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  poBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  supplierName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  skuBadge: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  metaRow: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  breakdownBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    marginTop: spacing.xs,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  openExternalText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  imageWrapper: {
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closeActionBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  closeActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
