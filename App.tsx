import React, { useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold
} from '@expo-google-fonts/outfit';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BrandAlert } from './src/components/BrandAlert';
import { initAds } from './src/utils/ads_init';
import { prefetchCriticalAssets } from './src/utils/assetPrefetch';
import { View, Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { setupAndroidChannel, setupNotificationHandlers } from './src/services/notificationService';
import Constants from 'expo-constants';
import { db, doc, getDoc } from './src/services/firebase';
import { ForceUpdateScreen } from './src/screens/ForceUpdateScreen';

Sentry.init({
  dsn: 'https://4823ae2cb52c014cbaa58bda55d5ce78@o4510713966166016.ingest.de.sentry.io/4510714043367504',
  debug: false,
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default Sentry.wrap(function App() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  const [needsUpdate, setNeedsUpdate] = React.useState(false);
  const [configLoaded, setConfigLoaded] = React.useState(false);
  const currentVersion = Constants.expoConfig?.version || '1.0.0';

  useEffect(() => {
    // 1. Fetch remote config to check for forced updates
    const checkVersion = async () => {
      try {
        const configRef = doc(db, 'config', 'app_settings');
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
          const minVersion = configSnap.data().minAppVersion;
          if (minVersion) {
            // Simple semantic version compare (e.g., '1.0.8' < '1.0.9')
            const v1 = currentVersion.split('.').map(Number);
            const v2 = minVersion.split('.').map(Number);
            
            let isOutdated = false;
            for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
              const num1 = v1[i] || 0;
              const num2 = v2[i] || 0;
              if (num1 < num2) {
                isOutdated = true;
                break;
              } else if (num1 > num2) {
                break;
              }
            }
            
            if (isOutdated) {
              setNeedsUpdate(true);
            }
          }
        }
      } catch (error) {
        console.log('Failed to fetch config, allowing app to proceed:', error);
      } finally {
        setConfigLoaded(true);
      }
    };
    checkVersion();
    // Setup notification handlers immediately (lightweight)
    setupAndroidChannel();
    const unsubscribe = setupNotificationHandlers();

    // Defer non-critical operations to reduce JS bridge contention on Android cold start
    const deferredTimer = setTimeout(() => {
      initAds();
      prefetchCriticalAssets();
    }, 2000);

    return () => {
      clearTimeout(deferredTimer);
      unsubscribe();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // Swallow — hideAsync can throw on some Android devices if called multiple times
        console.warn('SplashScreen.hideAsync warning:', e);
      }
    }
  }, [fontsLoaded, fontError]);

  if ((!fontsLoaded && !fontError) || !configLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      {needsUpdate ? (
        <ForceUpdateScreen currentVersion={currentVersion} />
      ) : (
        <>
          <RootNavigator />
          <BrandAlert />
        </>
      )}
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
});