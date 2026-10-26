import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { AppConfigProvider } from './src/context/AppConfigContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ToastProvider } from './src/context/ToastContext';
import { PdfProgressProvider } from './src/context/PdfProgressContext';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Platform } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'repairshop-web-fixes';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Prevent iOS Safari auto-zoom on input focus by enforcing 16px min size */
      input, select, textarea {
        font-size: 16px !important;
      }
      /* Prevent elastic bounce scroll interference on mobile web */
      html, body, #root {
        height: 100%;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
      }
      /* Clean focus outlines on touch devices */
      [data-focusable="true"] {
        outline: none;
      }
    `;
    document.head.appendChild(style);
  }
}

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ToastProvider>
              <PdfProgressProvider>
                <AuthProvider>
                  <AppConfigProvider>
                    <RootNavigator />
                  </AppConfigProvider>
                </AuthProvider>
              </PdfProgressProvider>
            </ToastProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
