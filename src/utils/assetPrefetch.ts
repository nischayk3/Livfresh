import { Image } from 'expo-image';
import { ASSET_URLS } from './assetUrls';

/**
 * Prefetch critical app images into expo-image's disk cache.
 * Call this during the app's loading/splash phase so images
 * render instantly when the user reaches the screens.
 */
export const prefetchCriticalAssets = async (): Promise<void> => {
  try {
    const criticalUrls = [
      // Onboarding (shown first if new user)
      ASSET_URLS.onboarding_screen_1,
      ASSET_URLS.onboarding_screen_2,
      ASSET_URLS.onboarding_pickup_v2,
      // Home screen promo banner (first visible)
      ASSET_URLS.banner_offer_3d,
      // Service cards (visible immediately on home)
      ASSET_URLS.services_wash_fold,
      ASSET_URLS.services_wash_iron,
      ASSET_URLS.services_ironing,
      ASSET_URLS.services_blanket_wash,
    ];

    await Image.prefetch(criticalUrls);
  } catch (error) {
    // Silently fail — images will load on demand with a brief transition
    console.warn('Asset prefetch warning:', error);
  }
};
