import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Alert, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { navigationRef } from '../navigation/navigationRef';
import { useAuth } from '../context/AuthContext';
import { playNotificationSound } from '../utils/playNotificationSound';
import { checkWebPushSupport, subscribeToWebPush } from '../utils/webPushManager';

export interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken | Notifications.DevicePushToken;
  notification?: Notifications.Notification;
}

let cachedCurrentToken: string | null = null;

export async function unregisterCurrentDeviceToken(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  if (!cachedCurrentToken) return;
  try {
    await supabase.rpc('unregister_device_token', {
      p_token_or_endpoint: cachedCurrentToken,
    });
    cachedCurrentToken = null;
  } catch (err) {
    console.warn('[Push] Error unregistering device token on logout:', err);
  }
}

// 1. Configure foreground notification presentation unconditionally
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  console.log('[Push] Notification handler set successfully');
} catch (e) {
  console.log('Could not set notification handler', e);
}

// Ensure notification channel is initialized early on Android
export async function initializeNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'RepairShop',
        description: 'Digital Solution job and service updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
      console.log('[Push] Notification channel "default" initialized');
    } catch (err) {
      console.warn('[Push] Could not initialize notification channel:', err);
    }
  }
}

export const usePushNotifications = (): PushNotificationState => {
  const { session, role } = useAuth();
  const userId = session?.user?.id;

  const [expoPushToken, setExpoPushToken] = useState<
    Notifications.ExpoPushToken | Notifications.DevicePushToken | undefined
  >();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const tokenListener = useRef<any>(null);

  // Deep link handler when notification banner is clicked
  const handleNotificationNavigation = (data?: Record<string, any>) => {
    if (!navigationRef.isReady() || !data) return;

    const screen = typeof data?.screen === 'string' ? data.screen : '';
    const type = typeof data?.type === 'string' ? data.type.toLowerCase() : '';
    const msg = typeof data?.message === 'string' ? data.message.toLowerCase() : '';
    const targetJobId = data?.jobId || data?.job_id;

    // 1. Material return or Allotted Materials
    if (
      screen === 'AllottedMaterialsScreen' ||
      type === 'material_return' ||
      msg.includes('return material') ||
      msg.includes('material return')
    ) {
      navigationRef.current?.navigate('AllottedMaterialsScreen', {
        mode: role === 'technician' ? 'scoped' : 'all',
        jobId: targetJobId,
      });
    }
    // 2. Explicit Job Screen or Job with screen === 'JobDetail'
    else if ((screen === 'JobDetail' || screen === 'AdminJobDetail' || screen === 'UpdateWork') && targetJobId) {
      if (role === 'admin') {
        navigationRef.current?.navigate('AdminJobDetail', { jobId: targetJobId });
      } else if (role === 'receptionist') {
        navigationRef.current?.navigate('JobDetail', { jobId: targetJobId });
      } else if (role === 'technician') {
        navigationRef.current?.navigate('UpdateWork', { jobId: targetJobId });
      }
    }
    // 3. Salary, Advance Salary, Payroll, Leave
    else if (
      screen === 'Salary' ||
      type.includes('salary') ||
      type.includes('finance') ||
      type.includes('leave') ||
      msg.includes('salary') ||
      msg.includes('payslip') ||
      msg.includes('leave')
    ) {
      navigationRef.current?.navigate('Salary');
    }
    // 4. Attendance, Late Check-in
    else if (
      screen === 'Attendance' ||
      screen === 'StaffAttendanceOverview' ||
      type.includes('attendance') ||
      type.includes('late') ||
      type.includes('checkin') ||
      msg.includes('late') ||
      msg.includes('check-in') ||
      msg.includes('check in') ||
      msg.includes('attendance')
    ) {
      if (role === 'admin') {
        navigationRef.current?.navigate('StaffAttendanceOverview');
      } else {
        navigationRef.current?.navigate('Attendance');
      }
    }
    // 5. Counter Sale or Sales
    else if (
      screen === 'SalesList' ||
      type.includes('sale') ||
      msg.includes('sale') ||
      msg.includes('counter sale')
    ) {
      navigationRef.current?.navigate('SalesList');
    }
    // 6. Inventory & Low Stock
    else if (
      screen === 'Inventory' ||
      screen === 'InventoryScreen' ||
      type.includes('inventory') ||
      type.includes('stock') ||
      msg.includes('low stock') ||
      msg.includes('inventory')
    ) {
      if (role === 'receptionist') {
        navigationRef.current?.navigate('InventoryScreen');
      } else {
        navigationRef.current?.navigate('Inventory');
      }
    }
    // 7. Generic Fallback with targetJobId
    else if (targetJobId) {
      if (role === 'admin') {
        navigationRef.current?.navigate('AdminJobDetail', { jobId: targetJobId });
      } else if (role === 'technician') {
        navigationRef.current?.navigate('UpdateWork', { jobId: targetJobId });
      } else if (role === 'receptionist') {
        navigationRef.current?.navigate('JobDetail', { jobId: targetJobId });
      }
    }
    // 8. Default fallback to notifications list
    else {
      navigationRef.current?.navigate('Notifications');
    }
  };

  async function registerForPushNotificationsAsync() {
    let token: Notifications.ExpoPushToken | undefined;
    try {
      if (Platform.OS === 'web') {
        return undefined;
      }

      await initializeNotificationChannel();

      if (Device.isDevice) {
        const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('[Push] Notification permission not granted. Final status:', finalStatus);
          if (!canAskAgain && Platform.OS === 'android') {
            Alert.alert(
              'Notifications Disabled',
              'To receive immediate job assignments and urgent repair updates, please enable notifications in your phone Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
              ]
            );
          }
          return undefined;
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId ??
          '9e74d61a-0e68-4312-a3ce-4114cf44a72d';

        token = await Notifications.getExpoPushTokenAsync({ projectId });
      } else {
        console.log('[Push] Push notification tokens require a physical device.');
      }
    } catch (e: any) {
      console.warn('[Push] Notification token registration info:', e?.message || e);
    }

    return token;
  }

  // Sync token to device_tokens via RPC
  const syncDeviceTokenToBackend = async (tokenString: string, attempts = 3) => {
    try {
      cachedCurrentToken = tokenString;
      const { error } = await supabase.rpc('register_device_token', {
        p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
        p_token_or_endpoint: tokenString,
        p_keys: null,
        p_device_info: {
          brand: Device.brand,
          manufacturer: Device.manufacturer,
          modelName: Device.modelName,
          osVersion: Device.osVersion,
          appVersion: Constants.expoConfig?.version || '1.0.2',
        },
      });

      if (error) throw error;
      console.log('[Push] Device token registered to database successfully.');
    } catch (err) {
      console.error(`[Push] Error saving push token to DB (${attempts} attempts left):`, err);
      if (attempts > 1) {
        setTimeout(() => syncDeviceTokenToBackend(tokenString, attempts - 1), 2500);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!userId) return;

    // A. Native Mobile Registration Flow
    if (Platform.OS !== 'web') {
      registerForPushNotificationsAsync().then((token) => {
        if (!mounted || !token?.data) return;
        setExpoPushToken(token);
        syncDeviceTokenToBackend(token.data);
      });

      // Token rotation listener
      try {
        tokenListener.current = Notifications.addPushTokenListener((newToken) => {
          if (newToken?.data && mounted) {
            console.log('[Push] Device push token refreshed:', newToken.data);
            setExpoPushToken(newToken);
            syncDeviceTokenToBackend(newToken.data);
          }
        });
      } catch (err) {
        console.warn('[Push] Could not attach push token listener:', err);
      }

      // Check cold-start notification response (launched from killed state)
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response && mounted) {
          const data = response.notification.request.content.data as Record<string, any> | undefined;
          setTimeout(() => handleNotificationNavigation(data), 600);
        }
      }).catch(() => {});
    } else {
      // Web / Safari PWA check
      checkWebPushSupport().then((status) => {
        if (status.supported && status.isSubscribed) {
          console.log('[Web Push] Active web push subscription detected.');
        }
      }).catch(() => {});
    }

    // B. Realtime In-App Notification Listener
    const realtimeChannel = supabase
      .channel(`user-push-notifs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${userId}`,
        },
        async (payload) => {
          const newNotif = payload.new as any;
          if (!newNotif) return;
          console.log('🔔 Realtime notification received:', newNotif.title, newNotif.message);

          playNotificationSound().catch(() => {});

          try {
            if (Platform.OS === 'web') {
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const notifInstance = new window.Notification(newNotif.title || 'Digital Solution', {
                  body: newNotif.message || '',
                  icon: '/assets/icon.png',
                  tag: `notif-${newNotif.id}`,
                });
                notifInstance.onclick = () => {
                  window.focus();
                  handleNotificationNavigation(newNotif);
                  notifInstance.close();
                };
              }
            } else {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: newNotif.title || 'Digital Solution',
                  body: newNotif.message || '',
                  data: { jobId: newNotif.job_id, ...newNotif },
                  sound: true,
                },
                trigger: null,
              });
            }
          } catch (notifErr) {
            console.log('Could not schedule notification banner:', notifErr);
          }
        }
      )
      .subscribe();

    // Reconnect Realtime channel when web tab returns to foreground
    let handleVisibilityChange: (() => void) | null = null;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && mounted) {
          if (realtimeChannel.state === 'closed' || realtimeChannel.state === 'errored') {
            realtimeChannel.subscribe();
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // C. OS Notification Listeners
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener((received) => {
        setNotification(received);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, any> | undefined;
        handleNotificationNavigation(data);
      });
    } catch (e) {
      console.log('Failed to add notification listeners', e);
    }

    return () => {
      mounted = false;
      if (handleVisibilityChange && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      supabase.removeChannel(realtimeChannel);
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      if (tokenListener.current) {
        tokenListener.current.remove();
      }
    };
  }, [userId, role]);

  return { expoPushToken, notification };
};
