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
            console.log('[FB SDK] iOS: ATT status:', status, '→ tracking:', attGranted);
        } else {
            // Android doesn't have ATT
            Settings.setAdvertiserIDCollectionEnabled(true);
            Settings.setAutoLogAppEventsEnabled(true);
            AppEventsLogger.setFlushBehavior('auto');
            console.log('[FB SDK] Android: Initialized and auto-logging enabled');
        }

        // Now initialize AppsFlyer (v7 API)
        if (__DEV__) {
            appsFlyer.enableDebug({ enabled: true });
        }
        
        appsFlyer.registerDeepLinkListener({
            onDeepLinking: (result: any) => {
                 console.log('[AppsFlyer] deepLinkListener', result);
            }
        });

        appsFlyer.init({
            devKey: '3f7wku9hKnq4jHuor4NXaP',
            appId: '6758751814',
        });
        
        appsFlyer.registerConversionListener({
            onConversionDataSuccess: (conversionData: any) => {
                console.log('[AppsFlyer] onConversionDataSuccess', conversionData);
            },
            onConversionDataFail: (error: any) => {
                console.log('[AppsFlyer] onConversionDataFail', error);
            }
        });

        appsFlyer.registerSessionReadyListener(() => {
            appsFlyer.start().then(
                () => console.log('[AppsFlyer] Init SUCCESS'),
                (error) => console.error('[AppsFlyer] Init ERROR:', error)
            );
        });

        if (Platform.OS === 'ios') {
            Settings.setAutoLogAppEventsEnabled(true);
        }
    } catch (e) {
        console.error('[Ads SDK] Init Error:', e);
    }
};
