import { Platform } from 'react-native';

export const initAds = async () => {
    try {
        const { Settings, AppEventsLogger } = await import('react-native-fbsdk-next');

        // STEP 1: Initialize SDK FIRST — required before any events or ATT
        Settings.initializeSDK();

        if (Platform.OS === 'android') {
            // STEP 2 (Android): Explicitly enable auto-log so the SDK activates its
            // internal flush mechanism for manual logPurchase calls.
            // Without this, events may be batched but never flushed when the app
            // navigates away — causing Purchase events to be silently dropped.
            Settings.setAutoLogAppEventsEnabled(true);
            Settings.setAdvertiserIDCollectionEnabled(true);

            // Set flush behavior to AUTO so SDK flushes on its own schedule
            // in addition to our manual flush() calls after Purchase.
            AppEventsLogger.setFlushBehavior('auto');

            console.log('[FB SDK] Android: Auto-logging and flush enabled');
        }

        if (Platform.OS === 'ios') {
            // STEP 2 (iOS): Request ATT permission first, THEN set tracking status
            const TrackingTransparency = await import('expo-tracking-transparency');
            const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
            // STEP 3: set AFTER we know the result
            await Settings.setAdvertiserTrackingEnabled(status === 'granted');
            console.log('[FB SDK] ATT status:', status, '→ tracking enabled:', status === 'granted');
        }

        console.log('[FB SDK] SDK initialized successfully');
    } catch (e) {
        console.error('[FB SDK] Init Error:', e);
    }
};
