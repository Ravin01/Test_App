import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { NavigationContainerRef, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { analytics } from './Analytics';
import { Alert, DeviceEventEmitter } from 'react-native';

type ChatNotificationPayload = {
  type: 'chat' | 'chat_message';
  userId?: string;
  userName?: string;
  message?: string;
  chatId?: string;
  chatRoomId?: string;
  senderId?: string;
  senderName?: string;
  notification_id?: string;
};

type NavigationParams = {
  chatRoomId: string;
  userId?: string;
  senderId?: string;
  type?: string;
  senderName?: string;
  source: 'notification';
  notification_id?: string;
};

class NotificationHandler {
  private static instance: NotificationHandler;
  private navigationRef: NavigationContainerRef<RootStackParamList> | null = null;
  private isNavigationReady = false;
  private pendingNavigation: NavigationParams | null = null;
  private hasHandledInitialNotification = false;
  
  // Track if app was launched by notification
  private launchedByNotification = false;
  private initialNotificationProcessed = false;

  private constructor() {}

  static getInstance(): NotificationHandler {
    if (!NotificationHandler.instance) {
      NotificationHandler.instance = new NotificationHandler();
    }
    return NotificationHandler.instance;
  }

  /**
   * Initialize notification handling with navigation reference
   */
  initialize(navigationRef: NavigationContainerRef<RootStackParamList>) {
    // console.log('🔔 NotificationHandler initializing...');
    this.navigationRef = navigationRef;
    this.setupNotificationListeners();
  }

  /**
   * Mark navigation as ready and process any pending navigation
   */
  setNavigationReady() {
    // console.log('🚀 Navigation is ready');
    this.isNavigationReady = true;
    
    if (this.pendingNavigation) {
      // console.log('📬 Processing pending navigation:', this.pendingNavigation);
      // Add small delay to ensure navigation stack is fully ready
      setTimeout(() => {
        this.navigateToChat(this.pendingNavigation!);
        this.pendingNavigation = null;
      }, 100);
    }
  }

  /**
   * Check if app was launched by notification (call this before normal navigation)
   */
  wasLaunchedByNotification(): boolean {
    return this.launchedByNotification;
  }

  /**
   * Get initial navigation target (for custom initial route)
   */
  getInitialRoute(): string | null {
    if (this.launchedByNotification && this.pendingNavigation) {
      // Return appropriate screen based on notification type
      return this.pendingNavigation.type === 'chat_message' ? 'ChatScreen' : 'NotificationScreen';
    }
    return null; // Use default initial route
  }

  /**
   * Get initial route params
   */
  getInitialRouteParams(): any {
    if (this.launchedByNotification && this.pendingNavigation) {
      if (this.pendingNavigation.type === 'chat_message') {
        return {
          roomId: this.pendingNavigation.chatRoomId,
          userId: this.pendingNavigation.userId,
        };
      } else {
        return {
          notificationData: this.pendingNavigation,
        };
      }
    }
    return null;
  }

  /**
   * Extract chat notification data from FCM payload
   */
  private extractChatData(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ): NavigationParams | null {
    try {
      // console.log('🔍 Extracting notification data:', remoteMessage);
      
      // Check data payload first (background/killed state)
      const data = remoteMessage.data as ChatNotificationPayload;
      
      // Check notification payload (foreground state)
      const notification = remoteMessage.notification;
      
      // console.log('📦 Data payload:', data);
      // console.log('🔔 Notification payload:', notification);
      // console.log('📦 Raw data keys:', Object.keys(data || {}));

      // Handle empty or malformed data
      if (!data || Object.keys(data).length === 0) {
        console.log('⚠️ Empty notification data - treating as general notification');
        const navigationParams: NavigationParams = {
          chatRoomId: 'unknown',
          type: 'general',
          source: 'notification',
          notification_id: `notif_${Date.now()}`
        };
        return navigationParams;
      }

      // Extract chat room ID (priority: chatRoomId > chatId > userId)
      const chatRoomId = data?.chatRoomId || data?.chatId || data?.userId;
      const notificationType = data?.type || 'general';
      
      // Only require chatRoomId for chat_message type
      if (!chatRoomId && notificationType === 'chat_message') {
        // console.error('❌ No chat identifier found in chat_message notification');
        // console.log('Available data fields:', Object.keys(data));
        analytics.trackError('notification_missing_chat_id', {
          data: JSON.stringify(data),
          notification_id: data?.notification_id,
          available_keys: Object.keys(data).join(',')
        });
        
        // Fallback to general notification instead of returning null
        const fallbackParams: NavigationParams = {
          chatRoomId: 'unknown',
          type: 'general',
          source: 'notification',
          notification_id: data?.notification_id || `notif_${Date.now()}`
        };
        return fallbackParams;
      }

      const navigationParams: NavigationParams = {
        chatRoomId: chatRoomId || 'unknown',
        userId: data?.userId,
        senderId: data?.senderId,
        type: notificationType,
        senderName: data?.senderName || data?.userName,
        source: 'notification',
        notification_id: data?.notification_id || `notif_${Date.now()}`
      };

      // console.log('✅ Extracted navigation params:', navigationParams);
      
      analytics.trackNotification(notificationType, 'data_extracted', {
        has_chat_room_id: !!chatRoomId,
        has_user_id: !!data?.userId,
        has_sender_id: !!data?.senderId,
        notification_id: navigationParams.notification_id,
        notification_type: notificationType,
        data_empty: Object.keys(data || {}).length === 0
      });

      return navigationParams;
    } catch (error) {
      console.error('❌ Error extracting notification data:', error);
      analytics.trackError('notification_data_extraction_failed', {
        error: error?.message || 'unknown_extraction_error',
        raw_message: JSON.stringify(remoteMessage)
      });
      
      // Return fallback params instead of null to prevent crashes
      return {
        chatRoomId: 'unknown',
        type: 'general',
        source: 'notification',
        notification_id: `error_notif_${Date.now()}`
      };
    }
  }

  /**
   * Navigate to appropriate screen based on notification type
   */
  private navigateToChat(params: NavigationParams) {
    try {
      if (!this.navigationRef) {
        console.error('❌ Navigation ref not available for navigation');
        return;
      }

      if (!this.isNavigationReady) {
        console.log('⏳ Navigation not ready, queuing navigation');
        this.pendingNavigation = params;
        return;
      }

      // console.log('🎯 Navigating based on notification type:', params.type, 'with params:', params);

      // Navigate based on notification type and validate required data
      if (params.type === 'chat_message' && params.chatRoomId && params.chatRoomId !== 'unknown') {
        // console.log('💬 Navigating to ChatScreen with roomId:', params.chatRoomId);
        
        if (this.launchedByNotification && !this.initialNotificationProcessed) {
          // console.log('🔄 App launched by notification - direct navigation to ChatScreen');
          this.navigationRef.navigate('ChatScreen', {
            roomId: params.chatRoomId,
            userId: params.userId,
          });
          this.initialNotificationProcessed = true;
        } else {
          // Normal navigation for background/foreground taps
          this.navigationRef.navigate('ChatScreen', {
            roomId: params.chatRoomId,
            userId: params.userId,
          });
        }
      } else {
        // console.log('📋 Navigating to NotificationScreen (type:', params.type, ', chatRoomId:', params.chatRoomId, ')');
        
        if (this.launchedByNotification && !this.initialNotificationProcessed) {
          // console.log('🔄 App launched by notification - direct navigation to NotificationScreen');
          this.navigationRef.navigate('NotificationScreen', {
            notificationData: params,
          });
          this.initialNotificationProcessed = true;
        } else {
          // Normal navigation for background/foreground taps
          this.navigationRef.navigate('NotificationScreen', {
            notificationData: params,
          });
        }
      }

      // console.log('✅ Successfully navigated (user tapped notification)');
      
      analytics.trackNotification(params.type || 'notification', 'navigation_success', {
        chat_room_id: params.chatRoomId,
        notification_id: params.notification_id,
        notification_type: params.type,
        has_sender_info: !!(params.senderId || params.senderName),
        triggered_by_tap: true,
        launched_by_notification: this.launchedByNotification,
        valid_chat_room_id: !!(params.chatRoomId && params.chatRoomId !== 'unknown')
      });

    } catch (error) {
      console.error('❌ Navigation failed:', error);
      
      // Fallback to NotificationScreen on error
      try {
        // console.log('🔄 Attempting fallback navigation to NotificationScreen');
        this.navigationRef?.navigate('NotificationScreen', {
          notificationData: params,
        });
        // console.log('✅ Fallback navigation successful');
      } catch (fallbackError) {
        console.error('❌ Fallback navigation also failed:', fallbackError);
      }
      
      analytics.trackError('notification_navigation_failed', {
        error: error?.message || 'unknown_navigation_error',
        chat_room_id: params.chatRoomId,
        notification_id: params.notification_id,
        notification_type: params.type,
        triggered_by_tap: true
      });
    }
  }

  /**
   * Setup notification listeners - handles both foreground display and tap events
   */
  private setupNotificationListeners() {
    // console.log('📡 Setting up notification listeners...');

    // 1. FOREGROUND: App is open and active - show in-app notification
    messaging().onMessage(async (remoteMessage) => {
      // console.log('📱 FOREGROUND notification received:', remoteMessage);
      
      const notificationData = this.extractChatData(remoteMessage);
      if (notificationData) {
        // console.log('💬 Showing in-app notification for:', notificationData.type);
        this.showInAppNotification(notificationData, remoteMessage);
      }
    });

    // 2. BACKGROUND: App is in background - ONLY when user taps notification
    messaging().onNotificationOpenedApp((remoteMessage) => {
      // console.log('🔄 BACKGROUND notification TAPPED by user:', remoteMessage);
      
      const notificationData = this.extractChatData(remoteMessage);
      if (notificationData) {
        // console.log('👆 User tapped notification - navigating to:', notificationData.type === 'chat_message' ? 'ChatScreen' : 'NotificationScreen');
        this.navigateToChat(notificationData);
      }
    });

    // 3. KILLED: App was completely closed - ONLY when user taps notification
    this.checkInitialNotification();
  }

  /**
   * Show in-app notification for foreground messages
   */
  private showInAppNotification(
    notificationData: NavigationParams,
    remoteMessage: FirebaseMessagingTypes.RemoteMessage
  ) {
    try {
      const data = remoteMessage.data;
      const notification = remoteMessage.notification;
      
      const title = data?.title || notification?.title || 'New Notification';
      const message = data?.body || notification?.body || 
        (notificationData.type === 'chat_message' 
          ? `Message from ${notificationData.senderName || 'someone'}` 
          : 'You have a new notification');
      
      // console.log('🔔 Showing in-app notification:', {
      //   title,
      //   message,
      //   type: notificationData.type
      // });
      
      // Emit event for in-app notification components to handle
      DeviceEventEmitter.emit('inAppNotification', {
        title,
        message,
        chatData: notificationData,
        timestamp: Date.now(),
        senderProfileURL: data?.senderProfileURL,
        type: notificationData.type
      });
      // console.log("showing notifys")
      
      // Track foreground notification received
      analytics.trackNotification(notificationData.type || 'notification', 'foreground_received', {
        has_chat_room_id: !!notificationData.chatRoomId,
        notification_id: notificationData.notification_id,
        notification_type: notificationData.type,
        auto_navigation: false
      });
      
    } catch (error) {
      console.log('❌ Error showing in-app notification:', error);
    }
  }

  /**
   * Check for notification that opened the app (killed state) - ONLY when user tapped
   */
  async checkInitialNotification() {
    try {
      if (this.hasHandledInitialNotification) {
        return;
      }

      // console.log('💀 Checking for initial notification (killed app - TAP ONLY)...');
      
      const remoteMessage = await messaging().getInitialNotification();
      
      if (remoteMessage) {
        // console.log('🎯 KILLED app opened by USER TAPPING notification:', remoteMessage);
        this.hasHandledInitialNotification = true;
        this.launchedByNotification = true;
        
        const notificationData = this.extractChatData(remoteMessage);
        if (notificationData) {
          // App is starting up because user tapped notification, queue the navigation
          this.pendingNavigation = notificationData;
          // console.log('📋 Queued navigation for when app is ready (user tapped notification)');
          
          // Track that app was opened by notification tap
          analytics.trackNotification(notificationData.type || 'notification', 'app_opened_by_tap', {
            chat_room_id: notificationData.chatRoomId,
            notification_id: notificationData.notification_id,
            notification_type: notificationData.type
          });
        }
      } else {
        // console.log('📱 App opened normally (no notification tap)');
        this.launchedByNotification = false;
      }
    } catch (error) {
      console.error('❌ Error checking initial notification:', error);
      analytics.trackError('initial_notification_check_failed', {
        error: error?.message || 'unknown_initial_check_error'
      });
    }
  }

  /**
   * Get pending navigation (for external polling if needed)
   */
  getPendingNavigation(): NavigationParams | null {
    return this.pendingNavigation;
  }

  /**
   * Clear pending navigation (after successful navigation)
   */
  clearPendingNavigation() {
    this.pendingNavigation = null;
  }

  /**
   * Test method to simulate notification
   */
  simulateNotification(chatRoomId: string, userId?: string, senderName?: string, type: string = 'chat_message') {
    const testParams: NavigationParams = {
      chatRoomId,
      userId,
      senderName,
      type,
      source: 'notification',
      notification_id: `test_${Date.now()}`
    };
    
    console.log('🧪 Simulating notification:', testParams);
    this.navigateToChat(testParams);
  }
}

export default NotificationHandler.getInstance();