import { useCameraPermissions } from 'expo-camera';
import { useToast } from '../context/ToastContext';

export const useCameraPermission = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const { showToast } = useToast();

  const requirePermission = async () => {
    if (permission?.granted) return true;
    
    const response = await requestPermission();
    if (!response.granted) {
      showToast({
        title: 'Permission Denied',
        message: 'Camera permission is required to capture your attendance selfie. Please enable it in your device settings.',
        type: 'error'
      });
      return false;
    }
    return true;
  };

  return { permission, requirePermission };
};
