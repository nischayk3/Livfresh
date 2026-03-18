import { PixelEvent } from './pixel.types';

// Cache SDK module at module level to avoid race conditions on every event call
let _fbsdk: any = null;
const getFBSDK = async () => {
    if (!_fbsdk) {
        _fbsdk = await import('react-native-fbsdk-next');
    }
    return _fbsdk;
};

/**
 * Track a standard FB SDK event (Native).
 * NOTE: setAdvertiserTrackingEnabled is NOT called here.
 * It is handled once during app init in ads_init.native.ts
 */
export const trackPixelEvent = async (event: PixelEvent, data?: Record<string, any>) => {
    try {
        const { AppEventsLogger } = await getFBSDK();

        if (event === 'Purchase') {
            const amount = Number(data?.value || 0);
            const currency = String(data?.currency || 'INR');
            // Strip value/currency from params — logPurchase takes them as dedicated args
            const params = { ...data };
            delete params.value;
            delete params.currency;

            console.log(`[FB SDK] Logging Purchase: ${amount} ${currency}`, params);
            AppEventsLogger.logPurchase(amount, currency, params);

            // CRITICAL: Flush immediately after Purchase
            AppEventsLogger.flush();

            // ⚠️ RACE CONDITION FIX: The SDK's flush() queues a network request
            // internally but doesn't block until it completes. If we navigate
            // immediately (especially CommonActions.reset()), Android tears down
            // the activity before the HTTP POST finishes, silently dropping the event.
            // We wait 400ms to give the native network layer time to send.
            await new Promise<void>(resolve => setTimeout(resolve, 400));

            console.log('[FB SDK] Purchase flush wait complete');
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
        const { AppEventsLogger } = await getFBSDK();
        AppEventsLogger.logEvent(eventName, data as any);
    } catch (error) {
        console.error('[FB SDK] Error logging custom event:', error);
    }
};
