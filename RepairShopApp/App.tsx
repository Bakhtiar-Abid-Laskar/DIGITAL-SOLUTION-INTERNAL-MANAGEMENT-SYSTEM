import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { AppConfigProvider } from './src/context/AppConfigContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ToastProvider } from './src/context/ToastContext';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

const queryClient = new QueryClient();

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Keep splash screen visible until fonts are ready — avoids FOUT
  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ToastProvider>
            <AuthProvider>
              <AppConfigProvider>
                <RootNavigator />
              </AppConfigProvider>
            </AuthProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
