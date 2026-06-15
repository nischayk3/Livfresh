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

  useEffect(() => {
    initAds();
    prefetchCriticalAssets();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <RootNavigator />
      <BrandAlert />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
});