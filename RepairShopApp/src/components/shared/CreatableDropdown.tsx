import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { ChevronDown, Check, Search, Plus } from 'lucide-react-native';
import { colors, radius, spacing, typography, shadow } from '../../tokens';

export interface DropdownOption {
  label: string;
  value: string;
}

interface CreatableDropdownProps {
  label?: string;
  options: DropdownOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
}

const DropdownRow = React.memo(function DropdownRow({ 
  item, 
  isSelected, 
  onSelectOption,
  isCreateOption
}: { 
  item: DropdownOption, 
  isSelected: boolean, 
  onSelectOption: (val: string) => void,
  isCreateOption?: boolean
}) {
  const handlePress = useCallback(() => {
    onSelectOption(item.value);
  }, [item.value, onSelectOption]);

  return (
    <AppPressable style={styles.optionRow} onPress={handlePress}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {isCreateOption && <Plus size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />}
        <Text style={[styles.optionText, isSelected && styles.optionTextSelected, isCreateOption && { color: colors.primary }]}>
          {item.label}
        </Text>
      </View>
      {isSelected && <Check size={20} color={colors.primary} />}
    </AppPressable>
  );
});

export default function CreatableDropdown({ label, options, selectedValue, onSelect, placeholder = 'Select or type...', icon, error }: CreatableDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = useMemo(() => {
    // It might be a custom typed value not in the original options list
    return options.find(o => o.value === selectedValue) || (selectedValue ? { label: selectedValue, value: selectedValue } : null);
  }, [options, selectedValue]);

  const filteredOptions = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();
    if (!lowerQuery) return options;
    return options.filter(o => o.label.toLowerCase().includes(lowerQuery));
  }, [options, searchQuery]);

  const showCreateOption = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return false;
    // Don't show create if exact match exists (case-insensitive)
    return !options.some(o => o.label.toLowerCase() === trimmed.toLowerCase());
  }, [options, searchQuery]);

  const handleSelectOption = useCallback((val: string) => {
    onSelect(val);
    setModalVisible(false);
    setSearchQuery('');
  }, [onSelect]);

  const renderDropdownItem = useCallback(({ item }: { item: DropdownOption & { isCreate?: boolean } }) => {
    const isSelected = item.value === selectedValue;
    return (
      <DropdownRow 
        item={item} 
        isSelected={isSelected} 
        onSelectOption={handleSelectOption} 
        isCreateOption={item.isCreate}
      />
    );
  }, [selectedValue, handleSelectOption]);

  const listData = useMemo(() => {
    const data: (DropdownOption & { isCreate?: boolean })[] = [...filteredOptions];
    if (showCreateOption) {
      data.unshift({
        label: `Use "${searchQuery.trim()}"`,
        value: searchQuery.trim(),
        isCreate: true
      });
    }
    return data;
  }, [filteredOptions, showCreateOption, searchQuery]);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {label.includes('*') && <Text style={styles.asterisk}> *</Text>}
        </Text>
      )}
      <AppPressable 
        style={[styles.inputBox, error ? styles.inputError : null]} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.inputLeft}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.valueText, !selectedOption && styles.placeholderText]}>
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} />
      </AppPressable>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <AppPressable style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <View style={styles.searchInputContainer}>
                  <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search or type a new one..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    autoCorrect={false}
                  />
                </View>
              </View>
              <FlatList
                data={listData}
                keyExtractor={(item, index) => item.value + index}
                renderItem={renderDropdownItem}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Start typing to add a new option.</Text>
                }
              />
            </View>
          </AppPressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  asterisk: {
    color: colors.error,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  inputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
  },
  valueText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30,27,24,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '75%',
    minHeight: '50%',
    paddingBottom: spacing.xxl,
    ...shadow.card,
  },
  modalHeader: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    height: 44,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  }
});
