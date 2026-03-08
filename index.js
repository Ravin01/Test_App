/**
 * OPTIMIZED index.js - Fixed background notification handling
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Critical polyfills only - load synchronously
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// CRITICAL: Import Firebase messaging and Notifee at TOP LEVEL for background notifications
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle, EventType } from '@notifee/react-native';

// Silence deprecation warnings
/* global globalThis */
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

// Constants
const FLYKUP_LOGO_URL = "https://d2jp9e7w3mhbvf.cloudfront.net/products/ec4ac153-63a2-4db7-8538-dfe30cb45a08_appicon.png";
const CDN_BASE_URL = "https://d2jp9e7w3mhbvf.cloudfront.net/";

// Track if notification channel has been created
let channelCreated = false;
const CHANNEL_ID = 'flykup_default';

// Track displayed notifications to prevent duplicates in background
const displayedNotifications = new Map();
const NOTIFICATION_CACHE_DURATION = 5000; // 5 seconds

// Clean up old entries from the cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of displayedNotifications.entries()) {
    if (now - timestamp > NOTIFICATION_CACHE_DURATION) {
      displayedNotifications.delete(key);
    }
  }
}, 10000); // Clean every 10 seconds

// Enhanced deduplication check - prevent exact duplicates within 5 seconds
const shouldShowNotification = (remoteMessage) => {
  const currentTime = Date.now();
  const data = remoteMessage.data || {};
  
  // Create a more specific unique identifier for live stream notifications
  // Include showId/streamId for live_stream_start notifications
  let uniqueKey;
  if (data.type === 'live_stream_start') {
    // For live stream notifications, use showId/streamId + seller info
    const showId = data.showId || data.streamId || data.liveStreamId || '';
    const sellerId = data.sellerId || data.senderUserId || '';
    uniqueKey = `${remoteMessage.messageId}_live_stream_${showId}_${sellerId}`;
  } else {
    // For other notifications, use standard key
    uniqueKey = `${remoteMessage.messageId}_${data.type}_${data.chatRoomId || ''}_${data.body || ''}`;
  }
  
  // Check if this notification was already displayed recently
  if (displayedNotifications.has(uniqueKey)) {
    const lastDisplayTime = displayedNotifications.get(uniqueKey);
    if (currentTime - lastDisplayTime < NOTIFICATION_CACHE_DURATION) {
      console.log('🚫 [BACKGROUND] Duplicate notification blocked:', uniqueKey);
      return false;
    }
  }
  
  // Mark this notification as displayed
  displayedNotifications.set(uniqueKey, currentTime);
  console.log('✅ [BACKGROUND] Notification allowed:', uniqueKey);
  return true;
};

// Create notification channel once
const ensureChannelExists = async () => {
  if (channelCreated) return CHANNEL_ID;
  
  try {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Flykup Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'soundtrack',
      vibration: true,
      lights: true,
      lightColor: '#F7CE45',
    });
    channelCreated = true;
    console.log('✅ Notification channel created');
  } catch (error) {
    console.error('❌ Error creating notification channel:', error);
  }
  
  return CHANNEL_ID;
};

// Helper: Get navigation route for background notifications
const getNavigationRoute = (data, action) => {
  if (action === 'dismiss') return null;

  const type = data.type;
  
  // Parse metadata if it exists
  let metadata = {};
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
    // Fallback to main chat list
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

  // Handle cohost_invite type
  if (type === 'cohost_invite'||type === 'cohost_accepted' || type === 'cohost_rejected') {
    return { screen: 'cohostInvitations', params: {} };
  }

  // Handle flash_sale_started type
  if (type === 'flash_sale_started') {
    const productId = metadata.productId || data.productId;
    if (productId) {
      return { screen: 'ProductDetails', params: { id: productId, type: 'static' } };
    }
    return { screen: 'NotificationScreen', params: {} };
  }

  // Default fallback
  return { screen: 'NotificationScreen', params: {} };
};

// Helper: Get notification actions based on type
const getNotificationActions = (type) => {
  switch (type) {
    case 'chat_message':
      return [
        // { id: 'open_chat', title: ' Open Chat' },
        { id: 'dismiss', title: 'Dismiss' }
      ];
    
    case 'follow':
      return [
        // { id: 'see_profile', title: ' See Profile' },
        { id: 'dismiss', title: ' Dismiss' }
      ];
    
    case 'new_video':
    case 'new_product':
    case 'live_stream_start':
    case 'new_show_scheduled':
    case 'flash_sale_started':
      return [
        // { id: 'view_content', title: ' View' },
        { id: 'dismiss', title: ' Dismiss' }
      ];
    
    case 'order_placed':
    case 'order_status':
    case 'order_cancelled':
    case 'seller_order_update':
      return [
        // { id: 'view_orders', title: '📦 Orders' },
        { id: 'dismiss', title: ' Dismiss' }
      ];
    
    default:
      return [
        // { id: 'view', title: ' View' },
        { id: 'dismiss', title: ' Dismiss' }
      ];
  }
};

// CRITICAL: Setup background message handler at TOP LEVEL (before AppRegistry)
// This MUST be here for background notifications to work
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('📩 Background message received in index.js:', remoteMessage);
  
  try {
    // Deduplication check - prevent exact duplicates
    if (!shouldShowNotification(remoteMessage)) {
      console.log('⏭️ Background notification blocked due to deduplication');
      return;
    }

    // Check if notification should be shown
    if (remoteMessage.data?.showNotification === 'false') {
      console.log('⏭️ Notification suppressed by showNotification flag');
      return;
    }

    const data = remoteMessage.data || {};
    const notification = remoteMessage.notification || {};
    
    // CRITICAL: Support data-only messages (backend sends only data object, no notification object)
    // Priority: data.title > notification.title > fallback
    const title = data.title || notification.title || "Flykup Notification";
    const body = data.body || notification.body || "You have a new notification";
    const type = data.type || "general";

    // console.log('📋 Message structure:', {
    //   hasNotificationObject: !!remoteMessage.notification,
    //   hasDataObject: !!remoteMessage.data,
    //   dataKeys: Object.keys(data),
    //   notificationKeys: Object.keys(notification)
    // });

    // Validate we have minimum required data
    if (!title || !body) {
      console.error('❌ Invalid notification: Missing title or body', { title, body, data, notification });
      return;
    }

    // Generate unique notification ID to prevent grouping/replacement
    const notificationId = `flykup_${remoteMessage.messageId || data.messageId || Date.now()}_${Date.now()}`;
    
    // console.log('📬 Displaying background notification:', { title, body, type, notificationId });
    
    // Ensure channel exists (created only once)
    const channelId = await ensureChannelExists();

    // Get icon and image with validation - handle "undefined" strings
    const isValidUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      if (url === 'undefined' || url === 'null' || url === '') return false;
      return url.startsWith('http://') || url.startsWith('https://');
    };
    
    // Parse metadata if it exists for image extraction
    let metadata = {};
    try {
      if (data.metadata) {
        metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
      }
    } catch (e) {
      console.error("Error parsing metadata for image:", e);
    }
    
    // Get image URL - check data.image, metadata.image, and fallback to data.icon (same as foreground)
    const getBackgroundNotificationImage = (notifData, notifMetadata) => {
      // Check if image exists and is valid
      if (notifData.image && notifData.image !== '' && notifData.image !== 'undefined' && notifData.image !== 'null') {
        if (notifData.image.startsWith('http')) {
          return notifData.image;
        }
        return CDN_BASE_URL + notifData.image;
      }
      
      // Check metadata.image
      if (notifMetadata.image && notifMetadata.image !== '' && notifMetadata.image !== 'undefined' && notifMetadata.image !== 'null') {
        if (notifMetadata.image.startsWith('http')) {
          return notifMetadata.image;
        }
        return CDN_BASE_URL + notifMetadata.image;
      }
      
      // Check metadata.productImage
      if (notifMetadata.productImage && notifMetadata.productImage !== '' && notifMetadata.productImage !== 'undefined' && notifMetadata.productImage !== 'null') {
        if (notifMetadata.productImage.startsWith('http')) {
          return notifMetadata.productImage;
        }
        return CDN_BASE_URL + notifMetadata.productImage;
      }
      
      // Fallback to icon if image is not available (same as foreground)
      if (notifData.icon && notifData.icon !== '' && notifData.icon !== 'undefined' && notifData.icon !== 'null') {
        if (notifData.icon.startsWith('http')) {
          return notifData.icon;
        }
        return CDN_BASE_URL + notifData.icon;
      }
      
      return null;
    };
    
    const imageUrl = getBackgroundNotificationImage(data, metadata);
    
    // Get actions for this notification type
    const actions = getNotificationActions(type);
    
    // Build base android config with actions
    const androidConfig = {
      channelId,
      smallIcon: 'ic_stat_notification',
      sound: 'soundtrack',
      vibrationPattern: [300, 500],
      showTimestamp: true,
      timestamp: Date.now(),
      showChronometer: false,
      autoCancel: true,
      onlyAlertOnce: false,
      pressAction: {
        id: 'default',
      },
      groupSummary: false,
      actions: actions.map(action => ({
        title: action.title,
        pressAction: {
          id: action.id,
        },
      })),
    };

    // IMPROVED: Try to display rich notification with images and actions
    // Use progressive fallback strategy if images fail
    // console.log('📱 Attempting rich background notification with images and actions');
    // console.log('📊 Notification data:', JSON.stringify({ type, hasImage: !!data.image, hasIcon: !!data.icon }));
    
    let notificationDisplayed = false;
    
    // Strategy 1: Try full rich notification with BigPicture style (best experience)
    if (isValidUrl(imageUrl) && ['new_product', 'new_video', 'live_stream_start', 'new_show_scheduled', 'seller_broadcast', 'admin_broadcast', 'flash_sale_started'].includes(type)) {
      try {
        console.log('🖼️ Strategy 1: Attempting BigPicture notification with image:', imageUrl);
        await notifee.displayNotification({
          id: notificationId,
          title,
          body,
          data: {
            ...data,
            metadata: typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {})
          },
          android: {
            ...androidConfig,
            style: {
              type: AndroidStyle.BIGPICTURE,
              picture: imageUrl,
            },
          },
        });
        notificationDisplayed = true;
        console.log('✅ SUCCESS: Rich notification with BigPicture displayed');
      } catch (error) {
        console.warn('⚠️ Strategy 1 failed:', error.message);
      }
    } else {
      console.log('⏭️ Skipping Strategy 1 (BigPicture) - not applicable for type:', type, 'or no valid image:', imageUrl);
    }
    
    // Strategy 2: Try notification with largeIcon only (good experience)
    if (!notificationDisplayed) {
      try {
        const iconUrl = isValidUrl(data.icon) ? data.icon : FLYKUP_LOGO_URL;
        // console.log('🔔 Strategy 2: Attempting notification with largeIcon:', iconUrl);
        
        await notifee.displayNotification({
          id: notificationId,
          title,
          body,
          data: {
            ...data,
            metadata: typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {})
          },
          android: {
            ...androidConfig,
            largeIcon: iconUrl,
          },
        });
        notificationDisplayed = true;
        console.log('✅ SUCCESS: Notification with largeIcon and actions displayed');
      } catch (error) {
        console.warn('⚠️ Strategy 2 failed:', error.message, error.stack);
      }
    }
    
    // Strategy 3: Try with Flykup logo as largeIcon (safe fallback)
    if (!notificationDisplayed) {
      try {
        console.log('🏢 Strategy 3: Attempting notification with Flykup logo');
        await notifee.displayNotification({
          id: notificationId,
          title,
          body,
          data: {
            ...data,
            metadata: typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {})
          },
          android: {
            ...androidConfig,
            largeIcon: FLYKUP_LOGO_URL,
          },
        });
        notificationDisplayed = true;
        console.log('✅ SUCCESS: Notification with Flykup logo and actions displayed');
      } catch (error) {
        console.warn('⚠️ Strategy 3 failed:', error.message, error.stack);
      }
    }
    
    // Strategy 4: Text-only notification with actions (guaranteed to work)
    if (!notificationDisplayed) {
      try {
        console.log('📝 Strategy 4: Displaying text-only notification with actions');
        await notifee.displayNotification({
          id: notificationId,
          title,
          body,
          data: {
            ...data,
            metadata: typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {})
          },
          android: androidConfig,
        });
        notificationDisplayed = true;
        console.log('✅ SUCCESS: Text-only notification with actions displayed');
      } catch (error) {
        console.error('❌ Strategy 4 failed:', error.message, error.stack);
      }
    }
    
    // Strategy 5: Absolute minimum config (last resort)
    if (!notificationDisplayed) {
      try {
        console.log('🔧 Strategy 5: Last resort - Minimal notification');
        await notifee.displayNotification({
          id: notificationId,
          title: title || 'Flykup',
          body: body || 'New notification',
          data: {
            type: type || 'general',
          },
          android: {
            channelId: CHANNEL_ID,
            smallIcon: 'ic_stat_notification',
            sound: 'soundtrack',
            pressAction: {
              id: 'default',
            },
          },
        });
        notificationDisplayed = true;
        console.log('✅ SUCCESS: Minimal notification displayed');
      } catch (finalError) {
        console.error('❌ CRITICAL: Strategy 5 (minimal) failed:', finalError.message, finalError.stack);
      }
    }
    
    if (!notificationDisplayed) {
      console.error('💥 FATAL: All 5 notification strategies failed - notification not displayed');
    } else {
      console.log('🎉 Notification successfully displayed using one of the fallback strategies');
    }

  } catch (error) {
    console.log('❌ Error in background message handler:', error);
  }
});

// CRITICAL: Setup notification background event handler at TOP LEVEL
// This MUST be here to satisfy Notifee's requirement
// Store navigation data so NotificationService can navigate when app opens
notifee.onBackgroundEvent(async ({type, detail}) => {
  console.log('🎯 Background event in index.js:', type);
  
  if (type === EventType.DISMISSED) {
    console.log('🗑️ Notification dismissed');
    return;
  }
  
  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    const actionId = detail.pressAction?.id || 'default';
    console.log('👆 User tapped notification with action:', actionId);
    
    if (actionId === 'dismiss') {
      if (detail.notification?.id) {
        await notifee.cancelNotification(detail.notification.id);
      }
      return;
    }
    
    // Store navigation data for NotificationService to handle when app opens
    const data = detail.notification?.data || {};
    const route = getNavigationRoute(data, actionId);
    
    if (route) {
      console.log('📦 Storing navigation for app:', route);
      global.pendingNotificationNavigation = {
        route: route.screen,
        params: route.params,
        timestamp: Date.now(),
        fromBackground: true
      };
    }
    
    // Cancel notification
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
    
    console.log('✅ Navigation stored, system will open app');
  }
});

// console.log('✅ Background message handler and event handler registered at top level');

// Defer other heavy Firebase features
let firebaseInitialized = false;

const initializeFirebase = async () => {
  if (firebaseInitialized) return;
  
  try {
    // Import crashlytics separately (non-critical)
    const { default: crashlytics } = await import('@react-native-firebase/crashlytics');
    
    // Enable crashlytics
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    
    firebaseInitialized = true;
    console.log('✅ Firebase crashlytics initialized');
  } catch (error) {
    console.error('❌ Firebase crashlytics initialization error:', error);
  }
};

// Defer WebRTC registration
const initializeWebRTC = async () => {
  try {
    const {registerGlobals} = await import('react-native-webrtc');
    registerGlobals();
    console.log('✅ WebRTC initialized');
  } catch (error) {
    console.error('❌ WebRTC initialization error:', error);
  }
};

// Initialize non-critical heavy dependencies after app loads
setTimeout(() => {
  Promise.all([
    initializeFirebase(),
    initializeWebRTC()
  ]);
}, 10);

// Register the app component
AppRegistry.registerComponent(appName, () => App);

// console.log('✅ App registered with working background notification handler');
