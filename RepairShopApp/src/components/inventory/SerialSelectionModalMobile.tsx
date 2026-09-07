import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  TextInput, FlatList, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { AvailableSerial, formatCurrency } from '@repairshop/shared';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { X, Search, Tag, Check, ScanLine, AlertCircle } from 'lucide-react-native';
import { CameraBarcodeScannerModalMobile } from '../common/CameraBarcodeScannerModalMobile';

interface SerialSelectionModalMobileProps {
  visible: boolean;
  onClose: () => void;
  productId: string | null;
  productName: string;
  maxQuantity: number;
  selectedSerialIds: string[];
  selectedSerialNumbers: string[];
  legacyFreeText?: string;
  onConfirm: (serialIds: string[], serialNumbers: string[], freeText?: string) => void;
}

export function SerialSelectionModalMobile({
  visible,
  onClose,
  productId,
  productName,
  maxQuantity = 1,
  selectedSerialIds = [],
  selectedSerialNumbers = [],
  legacyFreeText = '',
  onConfirm,
}: SerialSelectionModalMobileProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [availableSerials, setAvailableSerials] = useState<AvailableSerial[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIds, setCurrentIds] = useState<string[]>([]);
  const [currentNumbers, setCurrentNumbers] = useState<string[]>([]);
  const [manualText, setManualText] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Sync state on open
  useEffect(() => {
    if (visible) {
      setCurrentIds(selectedSerialIds || []);
      setCurrentNumbers(selectedSerialNumbers || []);
      setManualText(legacyFreeText || '');
      setSearchQuery('');
    }
  }, [visible, selectedSerialIds, selectedSerialNumbers, legacyFreeText]);

  // Fetch available serials from database
  const fetchSerials = useCallback(async (query: string) => {
    if (!productId) {
      setAvailableSerials([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_available_serials', {
        p_product_id: productId,
        p_query: query.trim() || null,
        p_limit: 30,
      });
      if (error) throw error;
      setAvailableSerials((data || []) as AvailableSerial[]);
    } catch (err) {
      console.warn('Error searching available serials mobile:', err);
      setAvailableSerials([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (visible && productId) {
      fetchSerials(searchQuery);
    }
  }, [visible, productId, searchQuery, fetchSerials]);

  const handleToggleSerial = (serial: AvailableSerial) => {
    const isSelected = currentIds.includes(serial.id);
    if (isSelected) {
      const nextIds = currentIds.filter((id) => id !== serial.id);
      const nextNumbers = currentNumbers.filter((num) => num !== serial.serial_number);
      setCurrentIds(nextIds);
      setCurrentNumbers(nextNumbers);
      return;
    }

    if (currentIds.length >= maxQuantity) {
      if (maxQuantity === 1) {
        setCurrentIds([serial.id]);
        setCurrentNumbers([serial.serial_number]);
        return;
      }
      return;
    }

    setCurrentIds([...currentIds, serial.id]);
    setCurrentNumbers([...currentNumbers, serial.serial_number]);
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    const codeClean = scannedCode.trim().toLowerCase();
    const match = availableSerials.find((s) => s.serial_number.toLowerCase() === codeClean);
    if (match) {
      handleToggleSerial(match);
    } else {
      // Direct query check
      supabase
        .rpc('search_available_serials', {
          p_product_id: productId,
          p_query: scannedCode.trim(),
          p_limit: 5,
        })
        .then(({ data }) => {
          const directMatch = (data as AvailableSerial[] | null)?.find(
            (s) => s.serial_number.toLowerCase() === codeClean
          );
          if (directMatch) {
            handleToggleSerial(directMatch);
          } else {
            setManualText(scannedCode.trim());
          }
        });
    }
  };

  const handleRemoveChip = (serialId: string) => {
    const idx = currentIds.indexOf(serialId);
    if (idx === -1) return;
    setCurrentIds(currentIds.filter((_, i) => i !== idx));
    setCurrentNumbers(currentNumbers.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onConfirm(currentIds, currentNumbers, manualText.trim());
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.title}>Select Serial Numbers</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {productName} • Required: {maxQuantity}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Selected Chips */}
          <View style={styles.chipsSection}>
            <View style={styles.chipsHeader}>
              <Text style={styles.chipsLabel}>
                Selected Units ({currentIds.length}/{maxQuantity}):
              </Text>
              {currentIds.length === maxQuantity && (
                <View style={styles.completePill}>
                  <Check size={10} color="#16A34A" />
                  <Text style={styles.completePillText}>Complete</Text>
                </View>
              )}
            </View>

            <View style={styles.chipsRow}>
              {currentNumbers.map((sNum, idx) => (
                <View key={`${sNum}-${idx}`} style={styles.chip}>
                  <Tag size={10} color={colors.primary} />
                  <Text style={styles.chipText}>{sNum}</Text>
                  <TouchableOpacity onPress={() => handleRemoveChip(currentIds[idx])}>
                    <X size={12} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}

              {manualText && currentNumbers.length === 0 ? (
                <View style={[styles.chip, styles.manualChip]}>
                  <Text style={styles.manualChipText}>{manualText}</Text>
                  <TouchableOpacity onPress={() => setManualText('')}>
                    <X size={12} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {currentNumbers.length === 0 && !manualText && (
                <Text style={styles.noSelectionText}>No serial numbers selected.</Text>
              )}
            </View>
          </View>

          {/* Search and Camera Row */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search serial number..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity 
              style={styles.cameraBtn}
              onPress={() => setIsCameraOpen(true)}
            >
              <ScanLine size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* List of Available Units */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Searching available units...</Text>
            </View>
          ) : availableSerials.length > 0 ? (
            <FlatList
              data={availableSerials}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = currentIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.serialCard, isSelected && styles.serialCardSelected]}
                    onPress={() => handleToggleSerial(item)}
                  >
                    <View>
                      <Text style={[styles.serialCode, isSelected && styles.serialCodeSelected]}>
                        {item.serial_number}
                      </Text>
                      {item.supplier_name && (
                        <Text style={styles.supplierText}>Supplier: {item.supplier_name}</Text>
                      )}
                    </View>

                    <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                      {isSelected && <Check size={12} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                {productId ? 'No tracked serials found in stock' : 'No catalog product selected'}
              </Text>
              <Text style={styles.emptySubtitle}>
                You can type a manual serial number for pre-existing untracked stock:
              </Text>
              <TextInput
                style={styles.manualInput}
                placeholder="Enter manual serial number..."
                value={manualText}
                onChangeText={setManualText}
              />
            </View>
          )}

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Apply Serials</Text>
            </TouchableOpacity>
          </View>
        </View>

        <CameraBarcodeScannerModalMobile
          visible={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          title={`Scan Serial for ${productName}`}
          continuous={maxQuantity > 1}
          targetCount={maxQuantity}
          currentCount={currentIds.length}
          onScan={handleBarcodeScanned}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: '85%',
    minHeight: '60%',
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  chipsSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  completePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  completePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.primary,
  },
  manualChip: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  manualChipText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textPrimary,
  },
  noSelectionText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  searchRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  cameraBtn: {
    backgroundColor: colors.primary,
    width: 38,
    height: 38,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  serialCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.xs,
    backgroundColor: '#FFFFFF',
  },
  serialCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  serialCode: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.textPrimary,
  },
  serialCodeSelected: {
    color: colors.primary,
  },
  supplierText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  loadingBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptyBox: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  manualInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 38,
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
