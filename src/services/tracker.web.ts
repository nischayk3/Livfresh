import { getAnalytics, logEvent as logWebEvent, setUserId as setWebUserId } from 'firebase/analytics';
import app from './firebase';
import {
  ViewItemParams,
  AddToCartParams,
  BeginCheckoutParams,
  PurchaseParams,
  ScreenViewParams,
  OnboardingParams,
  AuthParams,
} from './tracker.types';

const ADMIN_SCREENS = new Set([
  'Admin',
  'AdminLogin',
  'AdminTabs',
  'Dashboard',
  'Orders',
  'Subscriptions',
  'Settings',
  'UserManagement',
  'BannerManagement',
  'PricingManagement',
]);

class UnifiedTrackerWeb {
  private currentScreen: string | null = null;
  private isAdminMode: boolean = false;
  private webAnalytics: any = null;

  constructor() {
    try {
      this.webAnalytics = getAnalytics(app);
    } catch (error) {
      console.warn('[UnifiedTrackerWeb] Firebase Analytics initialization note:', error);
    }
  }

  setCurrentScreen(screenName: string) {
    this.currentScreen = screenName;
  }

  setAdminMode(isAdmin: boolean) {
    this.isAdminMode = isAdmin;
  }

  private isSuppressed(): boolean {
    if (this.isAdminMode) return true;
    if (this.currentScreen && ADMIN_SCREENS.has(this.currentScreen)) return true;
    return false;
  }

  private trackFbPixel(event: string, params?: Record<string, any>, isCustom = false) {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      if (isCustom) {
        (window as any).fbq('trackCustom', event, params);
      } else {
        (window as any).fbq('track', event, params);
      }
    }
  }

  async setUserId(userId: string | null) {
    try {
      if (this.isSuppressed()) return;

      if (this.webAnalytics && userId) {
        setWebUserId(this.webAnalytics, userId);
      }
    } catch (error) {
      console.warn('[UnifiedTrackerWeb] Error setting user ID:', error);
    }
  }

  async setUserProperties(_properties: Record<string, any>) {
    // No-op for web or implement if needed
  }

  async logScreenView(params: ScreenViewParams) {
    this.setCurrentScreen(params.screen_name);

    if (this.isSuppressed()) {
      console.log(`[UnifiedTrackerWeb] 🛡️ Suppressed screen view for admin: ${params.screen_name}`);
      return;
    }

    try {
      if (this.webAnalytics) {
        logWebEvent(this.webAnalytics, 'screen_view' as any, {
          firebase_screen: params.screen_name,
          firebase_screen_class: params.screen_class || params.screen_name,
        });
      }
      this.trackFbPixel('PageView', { screen: params.screen_name });
    } catch (error) {
      console.warn('[UnifiedTrackerWeb] Error logging screen view:', error);
    }
  }

  async logOnboardingViewed(params?: OnboardingParams) {
    if (this.isSuppressed()) return;

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, 'tutorial_begin', params || {});
    }
    this.trackFbPixel('ViewContent', { content_name: 'onboarding_screen' });
  }

  async logOnboardingCompleted(params?: OnboardingParams) {
    if (this.isSuppressed()) return;

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, 'tutorial_complete', params || {});
    }
    this.trackFbPixel('CompleteOnboarding', params || {}, true);
  }

  async logLoginScreenViewed(params?: { source?: string }) {
    if (this.isSuppressed()) return;

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, 'screen_view' as any, {
        firebase_screen: 'Login',
      });
    }
    this.trackFbPixel('ViewContent', { content_name: 'login_screen' });
  }

  async logOtpRequested(params?: AuthParams) {
    if (this.isSuppressed()) return;

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, 'generate_lead', { method: 'phone_otp' });
    }
    this.trackFbPixel('Lead', { method: 'phone_otp' });
  }

  async logUserLogin(params?: AuthParams) {
    if (this.isSuppressed()) return;

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, 'login', { method: params?.method || 'phone_otp' });
    }
    this.trackFbPixel('Login', { method: params?.method || 'phone_otp' }, true);
  }

  async logCompleteRegistration(params?: AuthParams) {
    if (this.isSuppressed()) return;

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, 'sign_up', { method: params?.method || 'phone_otp' });
    }
    this.trackFbPixel('CompleteRegistration', { currency: 'INR', value: 0 });
  }

  async logHomeViewed(_params?: { source?: string }) {
    if (this.isSuppressed()) return;

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, 'screen_view' as any, { firebase_screen: 'Home' });
    }
    this.trackFbPixel('ViewContent', { content_name: 'home_screen' });
  }

  async logViewItem(params: ViewItemParams) {
    if (this.isSuppressed()) return;

    const currency = params.currency || 'INR';
    const price = params.price || 0;

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, 'view_item', {
        currency,
        value: price,
        items: [
          {
            item_id: params.item_id,
            item_name: params.item_name,
            price,
          },
        ],
      });
    }
    this.trackFbPixel('ViewContent', {
      content_ids: [params.item_id],
      content_type: 'product',
      content_name: params.item_name,
      currency,
      value: price,
    });
  }

  async logAddToCart(params: AddToCartParams) {
    if (this.isSuppressed()) return;

    const currency = params.currency || 'INR';
    const totalValue = params.total_value || params.price * (params.quantity || 1);

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, 'add_to_cart', {
        currency,
        value: totalValue,
        items: [
          {
            item_id: params.item_id,
            item_name: params.item_name,
            price: params.price,
            quantity: params.quantity,
          },
        ],
      });
    }
    this.trackFbPixel('AddToCart', {
      content_ids: [params.item_id],
      content_type: 'product',
      content_name: params.item_name,
      currency,
      value: totalValue,
    });
  }

  async logBeginCheckout(params: BeginCheckoutParams) {
    if (this.isSuppressed()) return;

    const currency = params.currency || 'INR';

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, 'begin_checkout', {
        currency,
        value: params.value,
        items: params.items || [],
      });
    }
    this.trackFbPixel('InitiateCheckout', {
      content_ids: params.items?.map((i) => i.item_id) || [],
      content_type: 'product',
      num_items: params.num_items,
      currency,
      value: params.value,
    });
  }

  async logPurchase(params: PurchaseParams) {
    if (this.isSuppressed()) return;

    const currency = params.currency || 'INR';
    const amount = Number(params.value || 0);

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, 'purchase', {
        transaction_id: params.transaction_id,
        value: amount,
        currency,
        payment_mode: params.payment_mode,
        items: params.items || [],
      });
    }
    this.trackFbPixel('Purchase', {
      value: amount,
      currency,
      content_type: 'product',
      num_items: params.items?.length || 1,
      order_id: params.transaction_id,
    });
  }

  async logCustomEvent(eventName: string, params?: Record<string, any>) {
    if (this.isSuppressed()) return;

    if (this.webAnalytics) {
      logWebEvent(this.webAnalytics, eventName, params);
    }
    this.trackFbPixel(eventName, params, true);
  }
}

export default new UnifiedTrackerWeb();
