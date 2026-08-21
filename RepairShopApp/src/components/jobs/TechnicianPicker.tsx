import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, ActivityIndicator } from 'react-native';
import { AppPressable } from '../common/AppPressable';
import { supabase } from '../../lib/supabase';
import { TechnicianSummary } from '../../types/user';
import { colors, typography, spacing, radius } from '../../tokens';
import { Check } from 'lucide-react-native';
import Button from '../common/Button';

interface TechnicianPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (technicianIds: string[], technicianNames: string[]) => void;
  initialSelectedIds?: string[];
}

const TechRow = React.memo(function TechRow({ 
  item, 
  isSelected,
  onToggle 
}: { 
  item: TechnicianSummary, 
  isSelected: boolean,
  onToggle: (id: string, name: string) => void 
}) {
  const handlePress = useCallback(() => {
    onToggle(item.id, item.name);
  }, [item.id, item.name, onToggle]);

  return (
    <AppPressable style={[styles.techRow, isSelected && styles.techRowSelected]} onPress={handlePress}>
      <Text style={[styles.techName, isSelected && styles.techNameSelected]}>{item.name}</Text>
      {isSelected && <Check size={20} color={colors.primary} />}
    </AppPressable>
  );
});

export default function TechnicianPicker({ visible, onClose, onSelect, initialSelectedIds = [] }: TechnicianPickerProps) {
  const [technicians, setTechnicians] = useState<TechnicianSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const fetchTechnicians = useCallback(async (cancelled = false) => {
    if (!cancelled) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone, email')
        .eq('role', 'technician')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (cancelled) return;
      if (!error && data) {
        setTechnicians(data as TechnicianSummary[]);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (visible) {
      // Only sync selection + fetch when the sheet opens.
      // initialSelectedIds is intentionally omitted from deps: its default `= []`
      // creates a new array reference on every parent render, which would cause
      // an infinite loop (effect fires → setState → parent re-renders → new [] → repeat).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setSelectedIds(initialSelectedIds);
      fetchTechnicians(cancelled);
    }
    return () => { cancelled = true; };
  }, [visible, fetchTechnicians]); // intentionally excludes initialSelectedIds

  // Sync names on load
  useEffect(() => {
    if (technicians.length > 0 && selectedIds.length > 0) {
      const names = selectedIds.map(id => technicians.find(t => t.id === id)?.name).filter(Boolean) as string[];
      setSelectedNames(names);
    }
  }, [technicians, selectedIds]);

  const handleToggle = useCallback((id: string, name: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    setSelectedNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  }, []);

  const handleConfirm = () => {
    onSelect(selectedIds, selectedNames);
  };

  const renderTechItem = useCallback(({ item }: { item: TechnicianSummary }) => (
    <TechRow item={item} isSelected={selectedIds.includes(item.id)} onToggle={handleToggle} />
  ), [selectedIds, handleToggle]);

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Assign Technician</Text>
            <AppPressable onPress={onClose}><Text style={styles.closeBtn}>Close</Text></AppPressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ margin: 20 }} />
          ) : technicians.length === 0 ? (
            <Text style={styles.emptyText}>No active technicians available.</Text>
          ) : (
            <FlatList
              data={technicians}
              keyExtractor={(item) => item.id}
              renderItem={renderTechItem}
              contentContainerStyle={{ paddingBottom: 80 }}
            />
          )}

          {!loading && technicians.length > 0 && (
            <View style={styles.footer}>
              <Button label={`Confirm (${selectedIds.length})`} onPress={handleConfirm} style={{ width: '100%' }} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(28, 28, 30, 0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, maxHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm },
  title: { color: colors.textPrimary, ...typography.h2 },
  closeBtn: { color: colors.error, ...typography.bodyBold },
  emptyText: { color: colors.error, textAlign: 'center', padding: spacing.xl },
  techRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  techRowSelected: { backgroundColor: colors.backgroundAlt, paddingHorizontal: spacing.sm },
  techName: { color: colors.textPrimary, ...typography.bodyBold },
  techNameSelected: { color: colors.primary },
  footer: { marginTop: spacing.lg, paddingBottom: spacing.sm },
});
