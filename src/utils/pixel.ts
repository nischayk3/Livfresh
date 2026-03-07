import { Platform } from 'react-native';

/**
 * Meta Pixel & Facebook SDK Event Tracking Utility
 * 
 * Since the "Meta Event Setup Tool" is not compatible with Single Page Applications (React/Expo Web),
 * we must track events manually using code.
 * This utility handles both Web (Meta Pixel) and Native (Facebook SDK).
 */

type PixelEvent =
    | 'PageView'
    | 'Lead'
    | 'Purchase'
    | 'AddToCart'
    | 'InitiateCheckout'
    | 'Search'
    | 'ViewContent'
    | 'CompleteRegistration'
    | 'Contact'
    | 'Subscribe';

/**
 * Track a standard Meta Pixel or FB SDK event.
 * @param event The name of the event (e.g., 'Purchase', 'Lead')
 * @param data Optional data to send with the event (e.g., { value: 10.00, currency: 'INR' })
 */
export const trackPixelEvent = async (event: PixelEvent, data?: Record<string, any>) => {
    // 1. WEB TRACKING (Meta Pixel)
    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && (window as any).fbq) {
            console.log(`[Meta Pixel] Tracking ${event}`, data);
            (window as any).fbq('track', event, data);
        } else {
            console.warn('[Meta Pixel] fbq not defined. Is the pixel script loaded?');
        }
        return;
    }

    // 2. NATIVE TRACKING (Facebook SDK) — dynamic import avoids web bundler crash
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
        console.log(`[FB SDK] Tracking ${event}`, data);
        try {
            const { AppEventsLogger } = await import('react-native-fbsdk-next');
            AppEventsLogger.logEvent(event, data as any);
        } catch (error) {
            console.error('[FB SDK] Error logging event:', error);
        }
    }
};

/**
 * Track a custom event.
 * @param eventName Name of the custom event
 * @param data Optional data
 */
export const trackCustomPixelEvent = async (eventName: string, data?: Record<string, any>) => {
    // WEB
    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && (window as any).fbq) {
            (window as any).fbq('trackCustom', eventName, data);
        }
        return;
    }

    // NATIVE — dynamic import avoids web bundler crash
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
        try {
            const { AppEventsLogger } = await import('react-native-fbsdk-next');
            AppEventsLogger.logEvent(eventName, data as any);
        } catch (error) {
            console.error('[FB SDK] Error logging custom event:', error);
        }
    }
};
