import analytics from '@react-native-firebase/analytics';
import appsFlyer from 'react-native-appsflyer';
import { AppEventsLogger } from 'react-native-fbsdk-next';
import {
  StandardEventName,
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

class UnifiedTracker {
  private currentScreen: string | null = null;
  private isAdminMode: boolean = false;

  /**
   * Set the active screen to suppress marketing events on admin views
   */
  setCurrentScreen(screenName: string) {
    this.currentScreen = screenName;
  }

  /**
   * Toggle admin mode flag
   */
  setAdminMode(isAdmin: boolean) {
    this.isAdminMode = isAdmin;
  }

  /**
   * Check whether current screen/context is an admin section
   */
  private isSuppressed(): boolean {
    if (this.isAdminMode) return true;
    if (this.currentScreen && ADMIN_SCREENS.has(this.currentScreen)) return true;
    return false;
  }

  /**
   * Identify user across all platforms
   */
  async setUserId(userId: string | null) {
    try {
      if (this.isSuppressed()) return;

      console.log(`[UnifiedTracker] 👤 Setting User ID: ${userId}`);

      // 1. Firebase GA4
      await analytics().setUserId(userId);

      // 2. AppsFlyer
      if (userId) {
        appsFlyer.setCustomerUserId(userId, (res) => {
          console.log('[AppsFlyer] setCustomerUserId success:', res);
        });
      }

      // 3. Meta App Events
      if (userId) {
        AppEventsLogger.setUserID(userId);
      }
    } catch (error) {
      console.warn('[UnifiedTracker] Error setting user ID:', error);
    }
  }

  /**
   * Set user properties across all platforms
   */
  async setUserProperties(properties: Record<string, any>) {
    try {
      if (this.isSuppressed()) return;

      // 1. Firebase GA4
      await analytics().setUserProperties(properties);

      // 2. AppsFlyer
      appsFlyer.setAdditionalData(properties, (res) => {
        console.log('[AppsFlyer] setAdditionalData success:', res);
      });

      // 3. Meta App Events
      AppEventsLogger.setUserData(properties);
    } catch (error) {
      console.warn('[UnifiedTracker] Error setting user properties:', error);
    }
  }

  /**
   * Log screen view event
   */
  async logScreenView(params: ScreenViewParams) {
    this.setCurrentScreen(params.screen_name);

    if (this.isSuppressed()) {
      console.log(`[UnifiedTracker] 🛡️ Suppressed screen view for admin route: ${params.screen_name}`);
      return;
    }

    try {
      // 1. Firebase GA4
      await analytics().logScreenView({
        screen_name: params.screen_name,
        screen_class: params.screen_class || params.screen_name,
      });

      // 2. Meta App Events (ViewContent for main screens)
      AppEventsLogger.logEvent('ViewContent', {
        content_name: params.screen_name,
        content_type: 'screen',
      });
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging screen view:', error);
    }
  }

  /**
   * Log Onboarding Viewed
   */
  async logOnboardingViewed(params?: OnboardingParams) {
    if (this.isSuppressed()) return;

    try {
      console.log('[UnifiedTracker] 📱 Onboarding Viewed', params);

      // 1. Firebase GA4
      await analytics().logEvent('tutorial_begin', params || {});

      // 2. AppsFlyer
      appsFlyer.logEvent('af_tutorial_completion', {
        af_success: 0,
        step_index: params?.step_index || 0,
      });

      // 3. Meta App Events
      AppEventsLogger.logEvent('ViewContent', {
        content_name: 'onboarding_screen',
        step: params?.step_index || 0,
      });
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging onboarding view:', error);
    }
  }

  /**
   * Log Onboarding Completed
   */
  async logOnboardingCompleted(params?: OnboardingParams) {
    if (this.isSuppressed()) return;

    try {
      console.log('[UnifiedTracker] 🎓 Onboarding Completed', params);

      // 1. Firebase GA4
      await analytics().logEvent('tutorial_complete', params || {});

      // 2. AppsFlyer
      appsFlyer.logEvent('af_tutorial_completion', {
        af_success: 1,
        total_steps: params?.total_steps || 3,
      });

      // 3. Meta App Events
      AppEventsLogger.logEvent('CompleteOnboarding', {
        total_steps: params?.total_steps || 3,
      });
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging onboarding complete:', error);
    }
  }

  /**
   * Log Login Screen Viewed
   */
  async logLoginScreenViewed(params?: { source?: string }) {
    if (this.isSuppressed()) return;

    try {
      console.log('[UnifiedTracker] 🔑 Login Screen Viewed', params);

      // 1. Firebase GA4
      await analytics().logScreenView({
        screen_name: 'Login',
        screen_class: 'PhoneLoginScreen',
      });

      // 2. AppsFlyer
      appsFlyer.logEvent('af_login_view', params || {});

      // 3. Meta App Events
      AppEventsLogger.logEvent('ViewContent', {
        content_name: 'login_screen',
        source: params?.source || 'direct',
      });
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging login screen view:', error);
    }
  }

  /**
   * Log OTP Requested (Lead)
   */
  async logOtpRequested(params?: AuthParams) {
    if (this.isSuppressed()) return;

    try {
      console.log('[UnifiedTracker] 📨 OTP Requested (Lead)');

      // 1. Firebase GA4
      await analytics().logEvent('generate_lead', {
        method: 'phone_otp',
      });

      // 2. AppsFlyer
      appsFlyer.logEvent('af_otp_requested', {
        af_login_method: 'phone',
      });

      // 3. Meta App Events
      AppEventsLogger.logEvent('Lead', {
        content_name: 'otp_verification_request',
        method: 'phone',
      });
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging OTP request:', error);
    }
  }

  /**
   * Log User Login (Existing User)
   */
  async logUserLogin(params?: AuthParams) {
    if (this.isSuppressed()) return;

    try {
      console.log('[UnifiedTracker] 🔓 User Logged In', params);

      // 1. Firebase GA4
      await analytics().logEvent('login', {
        method: params?.method || 'phone_otp',
      });

      // 2. AppsFlyer
      appsFlyer.logEvent('af_login', {
        af_login_method: params?.method || 'phone_otp',
      });

      // 3. Meta App Events
      AppEventsLogger.logEvent('Login', {
        method: params?.method || 'phone_otp',
      });
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging user login:', error);
    }
  }

  /**
   * Log Complete Registration (New User Profile Created)
   */
  async logCompleteRegistration(params?: AuthParams) {
    if (this.isSuppressed()) return;

    try {
      console.log('[UnifiedTracker] 📝 Complete Registration', params);

      // 1. Firebase GA4
      await analytics().logEvent('sign_up', {
        method: params?.method || 'phone_otp',
      });

      // 2. AppsFlyer
      appsFlyer.logEvent('af_complete_registration', {
        af_registration_method: params?.method || 'phone_otp',
      });

      // 3. Meta App Events
      AppEventsLogger.logEvent('CompleteRegistration', {
        currency: 'INR',
        value: 0,
        method: params?.method || 'phone_otp',
      });
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging registration:', error);
    }
  }

  /**
   * Log Home Screen Viewed
   */
  async logHomeViewed(params?: { source?: string }) {
    if (this.isSuppressed()) return;

    try {
      console.log('[UnifiedTracker] 🏠 Home Viewed');

      // 1. Firebase GA4
      await analytics().logScreenView({
        screen_name: 'Home',
        screen_class: 'HomeScreen',
      });

      // 2. AppsFlyer
      appsFlyer.logEvent('af_home_view', params || {});

      // 3. Meta App Events
      AppEventsLogger.logEvent('ViewContent', {
        content_name: 'home_screen',
      });
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging home view:', error);
    }
  }

  /**
   * Log View Item (Service Details)
   */
  async logViewItem(params: ViewItemParams) {
    if (this.isSuppressed()) return;

    const currency = params.currency || 'INR';
    const price = params.price || 0;

    try {
      console.log(`[UnifiedTracker] 🔍 View Item: ${params.item_name} (₹${price})`);

      // 1. Firebase GA4
      await analytics().logEvent('view_item', {
        currency,
        value: price,
        items: [
          {
            item_id: params.item_id,
            item_name: params.item_name,
            item_category: params.item_category || 'Laundry Service',
            price,
          },
        ],
      });

      // 2. AppsFlyer
      appsFlyer.logEvent('af_content_view', {
        af_content_id: params.item_id,
        af_content_type: 'product',
        af_price: price,
        af_currency: currency,
        af_content_name: params.item_name,
      });

      // 3. Meta App Events
      AppEventsLogger.logEvent('ViewContent', {
        content_id: params.item_id,
        content_type: 'product',
        content_name: params.item_name,
        currency,
        value: price,
      });
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging view item:', error);
    }
  }

  /**
   * Log Add To Cart
   */
  async logAddToCart(params: AddToCartParams) {
    if (this.isSuppressed()) return;

    const currency = params.currency || 'INR';
    const totalValue = params.total_value || params.price * (params.quantity || 1);

    try {
      console.log(`[UnifiedTracker] 🛒 Add To Cart: ${params.item_name} (₹${totalValue})`);

      // 1. Firebase GA4
      await analytics().logEvent('add_to_cart', {
        currency,
        value: totalValue,
        items: [
          {
            item_id: params.item_id,
            item_name: params.item_name,
            item_category: params.item_category || 'Laundry Service',
            price: params.price,
            quantity: params.quantity,
          },
        ],
      });

      // 2. AppsFlyer
      appsFlyer.logEvent('af_add_to_cart', {
        af_content_id: params.item_id,
        af_content_type: 'product',
        af_price: params.price,
        af_quantity: params.quantity,
        af_currency: currency,
        af_content_name: params.item_name,
      });

      // 3. Meta App Events
      AppEventsLogger.logEvent('AddToCart', {
        content_id: params.item_id,
        content_type: 'product',
        content_name: params.item_name,
        currency,
        value: totalValue,
      });
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging add to cart:', error);
    }
  }

  /**
   * Log Begin Checkout
   */
  async logBeginCheckout(params: BeginCheckoutParams) {
    if (this.isSuppressed()) return;

    const currency = params.currency || 'INR';

    try {
      console.log(`[UnifiedTracker] 💳 Begin Checkout: ₹${params.value} (${params.num_items} items)`);

      // 1. Firebase GA4
      await analytics().logEvent('begin_checkout', {
        currency,
        value: params.value,
        items: params.items?.map((item) => ({
          item_id: item.item_id,
          item_name: item.item_name,
          price: item.price,
          quantity: item.quantity || 1,
        })) || [],
      });

      // 2. AppsFlyer
      appsFlyer.logEvent('af_initiated_checkout', {
        af_revenue: params.value,
        af_currency: currency,
        af_quantity: params.num_items,
      });

      // 3. Meta App Events
      AppEventsLogger.logEvent('InitiateCheckout', {
        content_ids: (params.items?.map((i) => i.item_id) || []).join(','),
        content_type: 'product',
        num_items: params.num_items,
        currency,
        value: params.value,
      });
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging begin checkout:', error);
    }
  }

  /**
   * Log Purchase (Conversion Payment)
   */
  async logPurchase(params: PurchaseParams) {
    if (this.isSuppressed()) return;

    const currency = params.currency || 'INR';
    const amount = Number(params.value || 0);

    try {
      console.log(`[UnifiedTracker] 💰 PURCHASE: Order #${params.transaction_id} — ₹${amount} ${currency}`);

      // 1. Firebase GA4
      await analytics().logEvent('purchase', {
        transaction_id: params.transaction_id,
        value: amount,
        currency,
        payment_mode: params.payment_mode || 'unknown',
        items: params.items?.map((item) => ({
          item_id: item.item_id,
          item_name: item.item_name,
          price: item.price,
          quantity: item.quantity || 1,
        })) || [],
      });

      // 2. AppsFlyer
      appsFlyer.logEvent('af_purchase', {
        af_revenue: amount,
        af_currency: currency,
        af_order_id: params.transaction_id,
        af_content_type: 'product',
        af_content_id: params.items?.map((i) => i.item_id).join(',') || '',
        af_quantity: params.items?.length || 1,
      });

      // 3. Meta App Events
      AppEventsLogger.logPurchase(amount, currency, {
        order_id: params.transaction_id,
        content_type: 'product',
        num_items: params.items?.length || 1,
        content_ids: (params.items?.map((i) => i.item_id) || []).join(','),
      });

      // Flush Meta network buffer
      AppEventsLogger.flush();

      // Grace period to ensure async native network queue flushes before navigation
      await new Promise<void>((resolve) => setTimeout(resolve, 350));
      console.log('[UnifiedTracker] ✅ Purchase flushed across all channels');
    } catch (error) {
      console.warn('[UnifiedTracker] Error logging purchase:', error);
    }
  }

  /**
   * Log Custom Event
   */
  async logCustomEvent(eventName: string, params?: Record<string, any>) {
    if (this.isSuppressed()) return;

    try {
      console.log(`[UnifiedTracker] ⚡ Custom Event: ${eventName}`, params);

      // 1. Firebase GA4
      await analytics().logEvent(eventName, params || {});

      // 2. AppsFlyer
      appsFlyer.logEvent(eventName, params || {});

      // 3. Meta App Events
      AppEventsLogger.logEvent(eventName, params as any);
    } catch (error) {
      console.warn(`[UnifiedTracker] Error logging custom event ${eventName}:`, error);
    }
  }
}

export default new UnifiedTracker();
