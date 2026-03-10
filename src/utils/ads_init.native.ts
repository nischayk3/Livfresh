import { Platform } from 'react-native';

export const initAds = async () => {
    try {
        const TrackingTransparency = await import('expo-tracking-transparency');
        const { Settings } = await import('react-native-fbsdk-next');
        const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();

        Settings.initializeSDK();
        if (Platform.OS === 'ios') {
            Settings.setAdvertiserTrackingEnabled(status === 'granted');
        }
    } catch (e) {
        console.error('FB SDK / Tracking Init Error:', e);
    }
};
