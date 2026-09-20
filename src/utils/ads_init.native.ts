import { Platform } from 'react-native';
import appsFlyer from 'react-native-appsflyer';
import { Settings, AppEventsLogger } from 'react-native-fbsdk-next';

export const initAds = async () => {
    try {
        // 1. Initialize FB SDK (can be done early)
        Settings.initializeSDK();

        let attGranted = false;

        if (Platform.OS === 'ios') {
            // iOS: We must ask for ATT permission before initializing AppsFlyer
            const TrackingTransparency = await import('expo-tracking-transparency');
            const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
            attGranted = status === 'granted';
            
            await Settings.setAdvertiserTrackingEnabled(attGranted);
            Settings.setAdvertiserIDCollectionEnabled(true);
            Settings.setAutoLogAppEventsEnabled(true);
            AppEventsLogger.setFlushBehavior('auto');
            console.log('[FB SDK] iOS: ATT status:', status, '→ tracking:', attGranted);
        } else {
            // Android doesn't have ATT
            Settings.setAdvertiserIDCollectionEnabled(true);
            Settings.setAutoLogAppEventsEnabled(true);
            AppEventsLogger.setFlushBehavior('auto');
            console.log('[FB SDK] Android: Initialized and auto-logging enabled');
        }

        // Initialize AppsFlyer (standard v6 API)
        appsFlyer.setCurrencyCode('INR');
        appsFlyer.onDeepLink((result: any) => {
            console.log('[AppsFlyer] onDeepLink:', result);
        });

        appsFlyer.initSdk(
            {
                devKey: '3f7wku9hKnq4jHuor4NXaP',
                appId: '6758751814',
                isDebug: __DEV__,
                onInstallConversionDataListener: true,
                onDeepLinkListener: true,
                timeToWaitForATTUserAuthorization: 10,
            },
            (result: any) => {
                console.log('[AppsFlyer] Init SUCCESS:', result);
            },
            (error: any) => {
                console.error('[AppsFlyer] Init ERROR:', error);
            }
        );
    } catch (e) {
        console.error('[Ads SDK] Init Error:', e);
    }
};
