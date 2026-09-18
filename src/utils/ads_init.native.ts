import { Platform } from 'react-native';

export const initAds = async () => {
    try {
        const { Settings, AppEventsLogger } = await import('react-native-fbsdk-next');

        // 1. ALWAYS Initialize the SDK immediately so it can start caching/tracking.
        // It won't send advertiser IDs until we explicitly allow it below.
        Settings.initializeSDK();

        if (Platform.OS === 'android') {
            // Android doesn't have ATT. We can immediately enable everything.
            Settings.setAdvertiserIDCollectionEnabled(true);
            Settings.setAutoLogAppEventsEnabled(true);
            AppEventsLogger.setFlushBehavior('auto');
            console.log('[FB SDK] Android: Initialized and auto-logging enabled');
            return; // Exit early for Android
        }

        if (Platform.OS === 'ios') {
            // iOS: We must ask for ATT permission
            const TrackingTransparency = await import('expo-tracking-transparency');
            
            // Ask for permission (this pauses execution)
            const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
            const isGranted = status === 'granted';
            
            // 2. Tell FB SDK if it's allowed to track advertiser data
            await Settings.setAdvertiserTrackingEnabled(isGranted);
            
            // 3. Now that consent is resolved, turn on auto-logging. 
            // Any events the SDK cached during the wait will now flush.
            Settings.setAutoLogAppEventsEnabled(true);
            
            console.log('[FB SDK] iOS: ATT status:', status, '→ tracking:', isGranted);
        }

    } catch (e) {
        console.error('[FB SDK] Init Error:', e);
    }
};
