import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import notifee, { EventType } from '@notifee/react-native';
import type { PendingNotificationNavigation, NotificationData } from '../types/notifications';

// Use the properly typed global declaration from notifications.d.ts

// Helper function to parse navigation route (same logic as index.js)
const getNavigationRoute = (data: any, action: string) => {
  if (action === 'dismiss') return null;

  const type = data.type;
  
  // Parse metadata if it exists
  let metadata: any = {};
  try {
    if (data.metadata) {
      metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
    }
  } catch (e) {
    console.error("Error parsing metadata:", e);
  }

  // Check for metadata navigation first
  if (metadata.navigation && metadata.navigation.route) {
    return { screen: metadata.navigation.route, params: metadata.navigation.params || {} };
  }

  // Handle chat messages
  if (type === 'chat_message' || action === 'open_chat') {
    const chatRoomId = data.chatRoomId || data.chatRoomID || metadata.chatRoomId;
    if (chatRoomId) {
      return { screen: 'ChatScreen', params: { roomId: chatRoomId } };
    }
    console.log('⚠️ Chat notification without roomId, opening chat list');
    return { screen: 'Chat', params: {} };
  }

  // Handle other action types
  if (action === 'view_orders') {
    return { 
        screen: 'bottomtabbar', 
        params: {
          screen: 'HomeTabs',
          params: { screen: 'myactivity' }
        }
      };
  }
  
  if (action === 'see_profile' && data.userId) {
    return { screen: 'Profile', params: { userId: data.userId } };
  }

  // Default fallback
  return { screen: 'NotificationScreen', params: {} };
};

export const useNotificationNavigation = () => {
  const navigation = useNavigation();
  const hasCheckedPending = useRef(false);

  useEffect(() => {
    console.log('🔔 NotificationNavigationService: Initializing...');

    // CRITICAL: Check for pending navigation from background
    const checkPendingNavigation = () => {
      if (global.pendingNotificationNavigation && !hasCheckedPending.current) {
        hasCheckedPending.current = true;
        
        const { route, params, timestamp } = global.pendingNotificationNavigation;
        
        // Only navigate if the data is recent (within last 10 seconds)
        const age = Date.now() - timestamp;
        if (age < 10000) {
          console.log('📍 Found pending navigation from background:', route, params);
          
          // Small delay to ensure navigation is ready
          setTimeout(() => {
            try {
              console.log('🚀 Navigating to:', route);
              navigation.navigate(route as never, params as never);
            } catch (error) {
              console.error('❌ Navigation failed:', error);
            }
          }, 800); // Increased delay for reliability
        } else {
          console.log('⏱️ Pending navigation too old, ignoring. Age:', age, 'ms');
        }
        
        // Clear the pending navigation
        delete global.pendingNotificationNavigation;
      }
    };

    // Check immediately
    checkPendingNavigation();
    
    // Check again after delays to ensure navigation is ready
    const timer1 = setTimeout(checkPendingNavigation, 500);
    const timer2 = setTimeout(checkPendingNavigation, 1500);

    // CRITICAL: Setup foreground notification handler
    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      console.log('🔔 Foreground notification event:', type);

      if (type === EventType.DISMISSED) {
        console.log('🗑️ Notification dismissed in foreground');
        return;
      }

      if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
        const actionId = detail.pressAction?.id || 'default';
        console.log('👆 Foreground notification tapped. Action:', actionId);

        // Handle dismiss action
        if (actionId === 'dismiss') {
          if (detail.notification?.id) {
            await notifee.cancelNotification(detail.notification.id);
            console.log('🗑️ Notification dismissed via action button');
          }
          return;
        }

        // Get navigation route
        const data = detail.notification?.data || {};
        const route = getNavigationRoute(data, actionId);

        if (route) {
          console.log('📍 Navigating from foreground notification:', route.screen);
          try {
            navigation.navigate(route.screen as never, route.params as never);
          } catch (error) {
            console.error('❌ Foreground navigation failed:', error);
          }
        }

        // Cancel the notification
        if (detail.notification?.id) {
          await notifee.cancelNotification(detail.notification.id);
        }
      }
    });

    console.log('✅ NotificationNavigationService: Ready');

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      unsubscribe();
      console.log('🔕 NotificationNavigationService: Cleaned up');
    };
  }, [navigation]);
};
