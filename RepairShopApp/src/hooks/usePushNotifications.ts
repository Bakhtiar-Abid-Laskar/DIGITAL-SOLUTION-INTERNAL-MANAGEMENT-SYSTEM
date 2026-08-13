import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { navigationRef } from '../navigation/navigationRef';
import { useAuth } from '../context/AuthContext';

export interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken;
  notification?: Notifications.Notification;
}

export const usePushNotifications = (): PushNotificationState => {
  const isExpoGo = Constants.appOwnership === 'expo';
  const { session } = useAuth();
  const userId = session?.user?.id;

  if (!isExpoGo) {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          console.log('🔔 Notification received in handler:', JSON.stringify(notification.request.content));
          return {
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });
      console.log('✅ Notification handler set successfully');
    } catch (e) {
      console.log('Could not set notification handler', e);
    }
  }

  const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  async function registerForPushNotificationsAsync() {
    if (isExpoGo) {
      console.log('Push notifications are not supported in Expo Go on SDK 53+. Skipping.');
      return undefined;
    }

    let token;
    try {
      if (Platform.OS === 'android') {
        const channel = await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        console.log('📢 Android notification channel created:', channel?.id);
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!');
          return;
        }

        // Log the raw native FCM token to verify FCM registration
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          console.log('🔑 Raw FCM Device Token:', deviceToken.data);
        } catch (dtErr) {
          console.warn('Could not get raw device token:', dtErr);
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;

        console.log('🆔 Using EAS Project ID:', projectId);
        token = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
      } else {
        console.log('Must use physical device for Push Notifications');
      }
    } catch (e: any) {
      if (e?.message?.includes('FirebaseApp is not initialized')) {
        console.warn('Push Notifications skipped: Firebase not configured for Android. Add google-services.json to test push.');
      } else {
        console.warn('Error getting expo push token:', e);
      }
    }

    return token;
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let mounted = true;

    if (!userId || isExpoGo) return;

    registerForPushNotificationsAsync().then(async (token) => {
      setExpoPushToken(token);
      if (token && token.data) {
        console.log('\n================================');
        console.log('📱 EXPO PUSH TOKEN:');
        console.log(token.data);
        console.log('================================\n');
        
        const syncToken = async (attempts = 3) => {
          try {
            const { data: user, error: fetchError } = await supabase
              .from('users')
              .select('expo_push_token')
              .eq('id', userId)
              .single();
              
            if (fetchError) throw fetchError;
            
            if (user.expo_push_token !== token.data) {
              const { error: updateError } = await supabase.rpc('update_my_push_token', {
                new_token: token.data
              });
                
              if (updateError) throw updateError;
              if (mounted) console.log('Push token synced successfully.');
            }
          } catch (err) {
            if (!mounted) return;
            console.error(`Error saving push token to DB (${attempts} attempts left):`, err);
            if (attempts > 1) {
const PUSH_TOKEN_RETRY_DELAY_MS = 2000;
              timeoutId = setTimeout(() => {
                if (mounted) syncToken(attempts - 1);
              }, PUSH_TOKEN_RETRY_DELAY_MS);
            }
          }
        };
        if (mounted) syncToken();
      }
    });

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.screen === 'JobDetail' && data?.jobId) {
          if (navigationRef.isReady()) {
            // Need to route correctly depending on the role (or just route to JobDetail if it's uniquely named or available in the current stack)
            navigationRef.current?.navigate('UpdateWork', { jobId: data.jobId });
          }
        }
      });
    } catch (e) {
      console.log('Failed to add notification listeners', e);
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId, isExpoGo]);

  return { expoPushToken, notification };
};
