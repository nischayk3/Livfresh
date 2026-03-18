import { Platform } from 'react-native';
import analytics from '@react-native-firebase/analytics';
import { getAnalytics, logEvent as logWebEvent, setUserId as setWebUserId } from 'firebase/analytics';
import app from './firebase'; // Import the initialized Firebase app

/**
 * Cross-platform Analytics Service
 * Seamlessly handles logging events for both Native (iOS/Android) and Web.
 */
class AnalyticsService {
  private webAnalytics: any = null;

  constructor() {
    if (Platform.OS === 'web') {
      try {
        this.webAnalytics = getAnalytics(app);
      } catch (error) {
        console.warn('Firebase Analytics not initialized on Web:', error);
      }
    }
  }

  /**
   * Log a custom event
   */
  async logEvent(name: string, params?: Record<string, any>) {
    try {
      if (Platform.OS === 'web') {
        if (this.webAnalytics) {
          logWebEvent(this.webAnalytics, name, params);
        }
      } else {
        await analytics().logEvent(name, params);
      }
    } catch (error) {
      console.warn('Analytics logEvent error:', error);
    }
  }

  /**
   * Log a screen view event
   */
  async logScreenView(screenName: string, screenClass?: string) {
    try {
      if (Platform.OS === 'web') {
        if (this.webAnalytics) {
          logWebEvent(this.webAnalytics, 'screen_view', {
            firebase_screen: screenName,
            firebase_screen_class: screenClass || screenName,
          });
        }
      } else {
        await analytics().logScreenView({
          screen_name: screenName,
          screen_class: screenClass || screenName,
        });
      }
    } catch (error) {
      console.warn('Analytics logScreenView error:', error);
    }
  }

  /**
   * Set user ID for tracking
   */
  async setUserId(userId: string | null) {
    try {
      if (Platform.OS === 'web') {
        if (this.webAnalytics) {
            setWebUserId(this.webAnalytics, userId || '');
        }
      } else {
        await analytics().setUserId(userId);
      }
    } catch (error) {
      console.warn('Analytics setUserId error:', error);
    }
  }
}

export default new AnalyticsService();
