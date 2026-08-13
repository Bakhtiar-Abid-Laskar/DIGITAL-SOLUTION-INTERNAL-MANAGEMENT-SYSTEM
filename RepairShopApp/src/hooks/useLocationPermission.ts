import * as Location from 'expo-location';
import { Linking } from 'react-native';

export const requirePermission = async () => {
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
};

export const useLocationPermission = () => {
  return { requirePermission };
};
