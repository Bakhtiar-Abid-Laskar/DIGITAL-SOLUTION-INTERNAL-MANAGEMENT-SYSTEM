import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform, Alert } from 'react-native';
import { Toast } from '../components/common/Toast';
import Button from '../components/common/Button';
import { colors, radius, spacing, typography, shadow } from '../tokens';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: number;
}

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface ConfirmState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
  showConfirm: (title: string, message?: string, buttons?: AlertButton[]) => void;
  hideConfirm: () => void;
}

let globalAlertHandler: ((title: string, message?: string, buttons?: AlertButton[]) => void) | null = null;

/**
 * Universal showAlert that delegates to native Alert.alert on Android/iOS
 * and uses the themed confirmation dialog or Toast on Web.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
    return;
  }

  if (globalAlertHandler) {
    globalAlertHandler(title, message, buttons);
  } else {
    // Web fallback if provider not ready
    if (!buttons || buttons.length <= 1) {
      if (typeof window !== 'undefined') window.alert(`${title}\n\n${message || ''}`);
      if (buttons?.[0]?.onPress) buttons[0].onPress();
    } else {
      const ok = typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message || ''}`) : false;
      const confirmBtn = buttons.find(b => b.style !== 'cancel') || buttons[1];
      const cancelBtn = buttons.find(b => b.style === 'cancel') || buttons[0];
      if (ok && confirmBtn?.onPress) confirmBtn.onPress();
      else if (!ok && cancelBtn?.onPress) cancelBtn.onPress();
    }
  }
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showToast = useCallback((options: ToastOptions) => {
    setToast({ ...options, id: Date.now() });
    setIsVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setIsVisible(false);
    setToast(null);
  }, []);

  const showConfirm = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    const defaultButtons: AlertButton[] = buttons && buttons.length > 0 
      ? buttons 
      : [{ text: 'OK', style: 'default' }];

    // If 1 button with no custom action, toast is cleaner on web
    if (defaultButtons.length === 1 && !defaultButtons[0].onPress) {
      showToast({ title, message, type: 'info' });
      return;
    }

    setConfirmDialog({
      visible: true,
      title,
      message,
      buttons: defaultButtons,
    });
  }, [showToast]);

  const hideConfirm = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    globalAlertHandler = showConfirm;
    return () => {
      globalAlertHandler = null;
    };
  }, [showConfirm]);

  const contextValue = useMemo(() => ({
    showToast,
    hideToast,
    showConfirm,
    hideConfirm,
  }), [showToast, hideToast, showConfirm, hideConfirm]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast && (
        <Toast
          key={toast.id}
          id={toast.id}
          visible={isVisible}
          title={toast.title}
          message={toast.message}
          type={toast.type || 'info'}
          duration={toast.duration}
          onHide={hideToast}
        />
      )}

      {/* Themed Web Confirmation Modal */}
      {confirmDialog.visible && (
        <Modal
          transparent
          visible={true}
          animationType="fade"
          onRequestClose={hideConfirm}
        >
          <Pressable style={styles.modalOverlay} onPress={hideConfirm}>
            <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
              <Text style={styles.modalTitle}>{confirmDialog.title}</Text>
              {confirmDialog.message ? (
                <Text style={styles.modalMessage}>{confirmDialog.message}</Text>
              ) : null}

              <View style={styles.buttonRow}>
                {confirmDialog.buttons.map((btn, idx) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  const variant = isDestructive ? 'destructive' : isCancel ? 'secondary' : 'primary';

                  return (
                    <View key={idx} style={styles.buttonWrapper}>
                      <Button
                        label={btn.text || (isCancel ? 'Cancel' : 'Confirm')}
                        variant={variant}
                        onPress={() => {
                          hideConfirm();
                          if (btn.onPress) btn.onPress();
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 9999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalMessage: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  buttonWrapper: {
    minWidth: 100,
    flexGrow: 1,
  },
});


