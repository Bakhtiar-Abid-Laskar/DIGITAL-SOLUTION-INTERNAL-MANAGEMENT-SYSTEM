import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Supplier } from '@repairshop/shared';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography, shadow } from '../../tokens';
import { AppPressable } from '../common/AppPressable';
import { Search, Building2, Phone, CheckCircle2, X } from 'lucide-react-native';

interface SupplierTypeaheadMobileProps {
  name: string;
  selectedSupplierId?: string | null;
  onChangeName: (name: string) => void;
  onSelectSupplier: (supplier: Supplier) => void;
  onClearSupplier?: () => void;
  placeholder?: string;
  error?: string;
}

export function SupplierTypeaheadMobile({
  name,
  selectedSupplierId,
  onChangeName,
  onSelectSupplier,
  onClearSupplier,
  placeholder = "Search existing supplier or enter name...",
  error,
}: SupplierTypeaheadMobileProps) {
  const [results, setResults] = useState<Supplier[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('search_suppliers', {
        p_query: query.trim(),
        p_limit: 5,
      });

      if (rpcError) throw rpcError;
      setResults((data || []) as Supplier[]);
      setIsOpen(true);
    } catch (err) {
      console.error('Error searching suppliers on mobile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (val: string) => {
    onChangeName(val);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (val.trim().length >= 2) {
      timeoutRef.current = setTimeout(() => {
        fetchResults(val);
      }, 300);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (supplier: Supplier) => {
    onSelectSupplier(supplier);
    setIsOpen(false);
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <Building2 size={18} color={colors.textMuted} style={styles.leadingIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={handleChangeText}
          onFocus={() => {
            if (name.trim().length >= 2 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          autoCapitalize="words"
        />

        {selectedSupplierId ? (
          <View style={styles.existingBadge}>
            <CheckCircle2 size={12} color={colors.success} />
            <Text style={styles.existingText}>Linked</Text>
            {onClearSupplier && (
              <AppPressable onPress={onClearSupplier} style={styles.clearBtn}>
                <X size={12} color={colors.textSecondary} />
              </AppPressable>
            )}
          </View>
        ) : loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.trailingIcon} />
        ) : (
          <Search size={16} color={colors.textMuted} style={styles.trailingIcon} />
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Floating Suggestions List */}
      {isOpen && results.length > 0 && (
        <View style={styles.dropdownCard}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderText}>Matching Suppliers ({results.length})</Text>
            <AppPressable onPress={() => setIsOpen(false)}>
              <X size={14} color={colors.textMuted} />
            </AppPressable>
          </View>

          {results.map((supp) => (
            <AppPressable
              key={supp.id}
              style={styles.resultItem}
              onPress={() => handleSelect(supp)}
            >
              <View style={styles.resultMain}>
                <Text style={styles.resultName} numberOfLines={1}>{supp.name}</Text>
                <View style={styles.resultMeta}>
                  {supp.phone ? (
                    <Text style={styles.resultPhone}>
                      <Phone size={11} color={colors.textMuted} /> {supp.phone}
                    </Text>
                  ) : (
                    <Text style={styles.resultPhone}>No phone</Text>
                  )}
                  {supp.gstin ? (
                    <Text style={styles.resultGstin}>GST: {supp.gstin}</Text>
                  ) : null}
                </View>
              </View>
            </AppPressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 20,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 48,
  },
  inputError: {
    borderColor: colors.error,
  },
  leadingIcon: {
    marginRight: spacing.xs,
  },
  trailingIcon: {
    marginLeft: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  existingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.pill,
    gap: 3,
  },
  existingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  clearBtn: {
    marginLeft: 2,
    padding: 2,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    marginTop: 4,
  },
  dropdownCard: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xs,
    zIndex: 999,
    ...shadow.card,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xxs,
  },
  dropdownHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  resultItem: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: 2,
  },
  resultMain: {
    flex: 1,
  },
  resultName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  resultPhone: {
    fontSize: 11,
    color: colors.textMuted,
  },
  resultGstin: {
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
});
