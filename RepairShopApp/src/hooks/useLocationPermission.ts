import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export const requirePermission = async () => {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        const response = await Location.requestForegroundPermissionsAsync();
        return response.granted;
      }
      return false;
    }

    const { status: existingStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }
    
    if (!canAskAgain) {
      Linking.openSettings();
      return false;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[useLocationPermission] Error checking location permissions:', err);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const response = await Location.requestForegroundPermissionsAsync();
        return response.granted;
      } catch {
        return false;
      }
    }
    return false;
  }
};

export const useLocationPermission = () => {
  return { requirePermission };
};
