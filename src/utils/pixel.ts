import { Platform } from 'react-native';

/**
 * Meta Pixel Event Tracking Utility
 * 
 * Since the "Meta Event Setup Tool" is not compatible with Single Page Applications (React/Expo Web),
 * we must track events manually using code.
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
 * Track a standard Meta Pixel event.
 * @param event The name of the event (e.g., 'Purchase', 'Lead')
 * @param data Optional data to send with the event (e.g., { value: 10.00, currency: 'INR' })
 */
export const trackPixelEvent = (event: PixelEvent, data?: Record<string, any>) => {
    // Only run on Web
    if (Platform.OS !== 'web') return;

    if (typeof window !== 'undefined' && (window as any).fbq) {
        console.log(`[Meta Pixel] Tracking ${event}`, data);
        (window as any).fbq('track', event, data);
    } else {
        console.warn('[Meta Pixel] fbq not defined. Is the pixel script loaded?');
    }
};

/**
 * Track a custom event.
 * @param eventName Name of the custom event
 * @param data Optional data
 */
export const trackCustomPixelEvent = (eventName: string, data?: Record<string, any>) => {
    if (Platform.OS !== 'web') return;

    if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('trackCustom', eventName, data);
    }
};
