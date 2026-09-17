import { Platform } from 'react-native';

export const initAds = async () => {
    try {
        const { Settings, AppEventsLogger } = await import('react-native-fbsdk-next');

        if (Platform.OS === 'ios') {
            // STEP 1 (iOS): Request ATT permission FIRST
            const TrackingTransparency = await import('expo-tracking-transparency');
            const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
            
            // STEP 2 (iOS): Set tracking enabled status based on ATT result
            await Settings.setAdvertiserTrackingEnabled(status === 'granted');
            console.log('[FB SDK] ATT status:', status, '→ tracking enabled:', status === 'granted');
        } else if (Platform.OS === 'android') {
            // STEP 1/2 (Android): Explicitly set tracking collection
            Settings.setAdvertiserIDCollectionEnabled(true);
        }

        // STEP 3: Initialize SDK AFTER ATT status is determined
        Settings.initializeSDK();

        // STEP 4: Enable Auto Log App Events now that tracking status is correct
        Settings.setAutoLogAppEventsEnabled(true);

        if (Platform.OS === 'android') {
            // Set flush behavior to AUTO so SDK flushes on its own schedule
            // in addition to our manual flush() calls after Purchase.
            AppEventsLogger.setFlushBehavior('auto');
            console.log('[FB SDK] Android: Auto-logging and flush enabled');
        }

        console.log('[FB SDK] SDK initialized successfully');
    } catch (e) {
        console.error('[FB SDK] Init Error:', e);
    }
};
