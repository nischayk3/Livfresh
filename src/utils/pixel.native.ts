import { Platform } from 'react-native';
import { PixelEvent } from './pixel.types';

/**
 * Track a standard FB SDK event (Native).
 */
export const trackPixelEvent = async (event: PixelEvent, data?: Record<string, any>) => {
    try {
        const { AppEventsLogger, Settings } = await import('react-native-fbsdk-next');

        if (Platform.OS === 'ios') {
            await Settings.setAdvertiserTrackingEnabled(true);
        }

        if (event === 'Purchase') {
            const amount = Number(data?.value || 0);
            const currency = String(data?.currency || 'INR');
            const params = { ...data };
            delete params.value;
            delete params.currency;

            console.log(`[FB SDK] Logging Purchase: ${amount} ${currency}`, params);
            AppEventsLogger.logPurchase(amount, currency, params);
        } else {
            console.log(`[FB SDK] Tracking ${event}`, data);
            AppEventsLogger.logEvent(event, data as any);
        }
    } catch (error) {
        console.error('[FB SDK] Error logging event:', error);
    }
};

/**
 * Track a custom FB SDK event (Native).
 */
export const trackCustomPixelEvent = async (eventName: string, data?: Record<string, any>) => {
    try {
        const { AppEventsLogger } = await import('react-native-fbsdk-next');
        AppEventsLogger.logEvent(eventName, data as any);
    } catch (error) {
        console.error('[FB SDK] Error logging custom event:', error);
    }
};
