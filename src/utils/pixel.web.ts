import { PixelEvent } from './pixel.types';

/**
 * Track a standard Meta Pixel event (Web).
 */
export const trackPixelEvent = async (event: PixelEvent, data?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
        console.log(`[Meta Pixel] Tracking ${event}`, data);
        (window as any).fbq('track', event, data);
    } else {
        console.warn('[Meta Pixel] fbq not defined. Is the pixel script loaded?');
    }
};

/**
 * Track a custom Meta Pixel event (Web).
 */
export const trackCustomPixelEvent = async (eventName: string, data?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('trackCustom', eventName, data);
    }
};
