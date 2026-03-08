import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Dimensions } from 'react-native';
import { useResponsive } from './ResponsiveSystem';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

interface DeviceInfo {
  platform: string;
  screenWidth: number;
  screenHeight: number;
  deviceType: string;
  breakpoint: string;
  orientation: string;
}

interface NavigationEvent {
  screen: string;
  previousScreen?: string;
  timestamp: number;
  timeSpent?: number;
}

class AnalyticsManager {
  private sessionId: string;
  private userId?: string;
  private events: AnalyticsEvent[] = [];
  private navigationStack: NavigationEvent[] = [];
  private sessionStartTime: number;
  
  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.loadUserId();
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async loadUserId() {
    try {
      const stored = await AsyncStorage.getItem('analytics_user_id');
      if (stored) {
        this.userId = stored;
      }
    } catch (error) {
      console.warn('Failed to load user ID for analytics:', error);
    }
  }
  
  async setUserId(userId: string) {
    this.userId = userId;
    try {
      await AsyncStorage.setItem('analytics_user_id', userId);
    } catch (error) {
      console.warn('Failed to save user ID for analytics:', error);
    }
  }
  
  private getDeviceInfo(): DeviceInfo {
    const { width, height } = Dimensions.get('window');
    const deviceType = width >= 768 ? 'tablet' : 'phone';
    const breakpoint = width >= 1280 ? 'xl' : width >= 1024 ? 'lg' : width >= 768 ? 'md' : width >= 430 ? 'sm' : 'xs';
    
    return {
      platform: Platform.OS,
      screenWidth: width,
      screenHeight: height,
      deviceType,
      breakpoint,
      orientation: width > height ? 'landscape' : 'portrait',
    };
  }
  
  // Track generic events
  track(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        ...this.getDeviceInfo(),
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };
    
    this.events.push(analyticsEvent);
    
    // Console log for development
    if (__DEV__) {
      console.log('📊 Analytics Event:', event, properties);
    }
    
    // Auto-flush events periodically
    if (this.events.length >= 10) {
      this.flush();
    }
  }
  
  // Track screen views
  trackScreenView(screenName: string, previousScreen?: string) {
    const now = Date.now();
    
    // Calculate time spent on previous screen
    if (this.navigationStack.length > 0) {
      const lastScreen = this.navigationStack[this.navigationStack.length - 1];
      lastScreen.timeSpent = now - lastScreen.timestamp;
    }
    
    const navigationEvent: NavigationEvent = {
      screen: screenName,
      previousScreen,
      timestamp: now,
    };
    
    this.navigationStack.push(navigationEvent);
    
    this.track('screen_view', {
      screen_name: screenName,
      previous_screen: previousScreen,
    });
  }
  
  // Track user interactions
  trackInteraction(element: string, action: string, properties?: Record<string, any>) {
    this.track('user_interaction', {
      element,
      action,
      ...properties,
    });
  }
  
  // Track feature usage
  trackFeatureUsage(feature: string, enabled: boolean, properties?: Record<string, any>) {
    this.track('feature_usage', {
      feature,
      enabled,
      ...properties,
    });
  }
  
  // Track performance metrics
  trackPerformance(metric: string, value: number, unit: string = 'ms') {
    this.track('performance', {
      metric,
      value,
      unit,
    });
  }
  
  // Track errors
  trackError(error: string, context?: Record<string, any>) {
    this.track('error', {
      error_message: error,
      context,
    });
  }
  
  // Track responsive layout changes
  trackLayoutChange(newDeviceType: string, newBreakpoint: string) {
    this.track('layout_change', {
      new_device_type: newDeviceType,
      new_breakpoint: newBreakpoint,
    });
  }
  
  // Track chat notifications
  trackNotification(type: string, action: string, properties?: Record<string, any>) {
    this.track('notification', {
      notification_type: type,
      action,
      ...properties,
    });
  }
  
  // Get session summary
  getSessionSummary() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const uniqueScreens = new Set(this.navigationStack.map(n => n.screen)).size;
    const totalInteractions = this.events.filter(e => e.event === 'user_interaction').length;
    
    return {
      sessionId: this.sessionId,
      duration: sessionDuration,
      screenViews: this.navigationStack.length,
      uniqueScreens,
      totalInteractions,
      eventCount: this.events.length,
    };
  }
  
  // Flush events to storage/server
  async flush() {
    if (this.events.length === 0) return;
    
    try {
      // Store locally for now (you can send to your analytics server here)
      const existingEvents = await AsyncStorage.getItem('analytics_events');
      const allEvents = existingEvents ? JSON.parse(existingEvents) : [];
      allEvents.push(...this.events);
      
      // Keep only last 1000 events to prevent storage bloat
      const recentEvents = allEvents.slice(-1000);
      await AsyncStorage.setItem('analytics_events', JSON.stringify(recentEvents));
      
      console.log(`📊 Flushed ${this.events.length} analytics events`);
      
      // TODO: Send to your analytics endpoint
      // await this.sendToServer(this.events);
      
      this.events = [];
    } catch (error) {
      console.warn('Failed to flush analytics events:', error);
    }
  }
  
  // Get stored events for debugging
  async getStoredEvents(): Promise<AnalyticsEvent[]> {
    try {
      const stored = await AsyncStorage.getItem('analytics_events');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to get stored events:', error);
      return [];
    }
  }
  
  // Clear all stored events
  async clearEvents() {
    try {
      await AsyncStorage.removeItem('analytics_events');
      this.events = [];
      console.log('📊 Analytics events cleared');
    } catch (error) {
      console.warn('Failed to clear analytics events:', error);
    }
  }
}

// Global analytics instance
export const analytics = new AnalyticsManager();

// React hook for analytics
export const useAnalytics = () => {
  const responsive = useResponsive();
  
  return {
    track: analytics.track.bind(analytics),
    trackScreenView: analytics.trackScreenView.bind(analytics),
    trackInteraction: analytics.trackInteraction.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackNotification: analytics.trackNotification.bind(analytics),
    
    // Convenience methods with responsive context
    trackLayoutChange: (newDeviceType: string, newBreakpoint: string) => {
      analytics.trackLayoutChange(newDeviceType, newBreakpoint);
    },
    
    setUserId: analytics.setUserId.bind(analytics),
    getSessionSummary: analytics.getSessionSummary.bind(analytics),
    flush: analytics.flush.bind(analytics),
  };
};