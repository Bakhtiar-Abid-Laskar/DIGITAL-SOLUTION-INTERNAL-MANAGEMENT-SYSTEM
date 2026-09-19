import { useCameraPermissions } from 'expo-camera';
import { useToast } from '../context/ToastContext';

export const useCameraPermission = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const { showToast } = useToast();

  const requirePermission = async () => {
    try {
      if (permission?.granted) return true;
      
      const response = await requestPermission();
      if (!response.granted) {
        showToast({
          title: 'Permission Denied',
          message: 'Camera permission is required. Please enable it in your browser or device settings.',
          type: 'error'
        });
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('[useCameraPermission] Error:', err);
      showToast({
        title: 'Camera Error',
        message: err?.message || 'Unable to access camera on this device.',
        type: 'error'
      });
      return false;
    }
  };

  return { permission, requirePermission };
};
