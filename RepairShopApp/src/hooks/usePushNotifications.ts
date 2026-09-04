import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { navigationRef } from '../navigation/navigationRef';
import { useAuth } from '../context/AuthContext';
import { playNotificationSound } from '../utils/playNotificationSound';

export interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken;
  notification?: Notifications.Notification;
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

export const usePushNotifications = (): PushNotificationState => {
  const { session, role } = useAuth();
  const userId = session?.user?.id;

  const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  async function registerForPushNotificationsAsync() {
    let token: Notifications.ExpoPushToken | undefined;
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'default') {
            await Notification.requestPermission().catch(() => {});
          }
        }
        return undefined;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Digital Solution',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563EB',
          sound: 'default',
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Push notification permission not granted.');
          return undefined;
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId ??
          '9e74d61a-0e68-4312-a3ce-4114cf44a72d';

        token = await Notifications.getExpoPushTokenAsync({ projectId });
      } else {
        console.log('Push notification tokens require a physical device.');
      }
    } catch (e: any) {
      console.warn('Push notification token registration info:', e?.message || e);
    }

    return token;
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let mounted = true;

    if (!userId) return;

    // A. Register and sync Expo Push Token to Supabase users table
    registerForPushNotificationsAsync().then(async (token) => {
      if (!mounted) return;
      setExpoPushToken(token);
      if (token && token.data) {
        console.log('[Push] EXPO PUSH TOKEN:', token.data);
        
        const syncToken = async (attempts = 3) => {
          try {
            const { data: user, error: fetchError } = await supabase
              .from('users')
              .select('expo_push_token')
              .eq('id', userId)
              .single();
              
            if (fetchError) throw fetchError;
            
            if (user?.expo_push_token !== token.data) {
              const { error: updateError } = await supabase
                .from('users')
                .update({ expo_push_token: token.data })
                .eq('id', userId);
                
              if (updateError) throw updateError;
              if (mounted) console.log('Push token synced successfully.');
            }
          } catch (err) {
            if (!mounted) return;
            console.error(`Error saving push token to DB (${attempts} attempts left):`, err);
            if (attempts > 1) {
              timeoutId = setTimeout(() => {
                if (mounted) syncToken(attempts - 1);
              }, 2000);
            }
          }
        };
        if (mounted) syncToken();
      }
    });

    // B. Realtime In-App Notification Listener (Guarantees immediate local banner & sound)
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

          // Play sound (Web Audio on Web, expo-av on native)
          playNotificationSound().catch(() => {});

          // Schedule local notification banner immediately
          try {
            if (Platform.OS === 'web') {
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const notifInstance = new window.Notification(newNotif.title || 'Digital Solution', {
                  body: newNotif.message || '',
                  icon: '/assets/logo.png',
                  tag: `notif-${newNotif.id}`,
                });
                notifInstance.onclick = () => {
                  window.focus();
                  if (navigationRef.isReady()) {
                    if (newNotif.screen === 'AllottedMaterialsScreen' || newNotif.type === 'material_return') {
                      navigationRef.current?.navigate('AllottedMaterialsScreen', {
                        mode: role === 'technician' ? 'scoped' : 'all',
                        jobId: newNotif.job_id,
                      });
                    } else if (newNotif.job_id) {
                      if (role === 'admin') {
                        navigationRef.current?.navigate('AdminJobDetail', { jobId: newNotif.job_id });
                      } else if (role === 'technician') {
                        navigationRef.current?.navigate('UpdateWork', { jobId: newNotif.job_id });
                      } else if (role === 'receptionist') {
                        navigationRef.current?.navigate('JobDetail', { jobId: newNotif.job_id });
                      }
                    }
                  }
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
                trigger: null, // deliver immediately
              });
            }
          } catch (notifErr) {
            console.log('Could not schedule notification banner:', notifErr);
          }
        }
      )
      .subscribe();

    // C. OS Notification Listeners
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener((received) => {
        setNotification(received);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, any> | undefined;
        
        if (!navigationRef.isReady()) return;

        const screen = typeof data?.screen === 'string' ? data.screen : '';
        const type = typeof data?.type === 'string' ? data.type.toLowerCase() : '';
        const msg = typeof data?.message === 'string' ? data.message.toLowerCase() : '';
        const targetJobId = data?.jobId || data?.job_id;

        // 1. Material return or Allotted Materials (prioritized before generic jobId)
        if (screen === 'AllottedMaterialsScreen' || type === 'material_return' || msg.includes('return material') || msg.includes('material return')) {
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
      });
    } catch (e) {
      console.log('Failed to add notification listeners', e);
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(realtimeChannel);
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId, role]);

  return { expoPushToken, notification };
};
