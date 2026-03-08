// notificationService.js
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle, EventType } from '@notifee/react-native';
import { DeviceEventEmitter } from 'react-native';
import { AWS_CDN_URL } from '../../Config';
import RootNavigation from '../Navigation/RootNavigation';
import { getNavigationRoute as getRouteFromHelpers } from '../Utils/notificationHelpers';

const FLYKUP_LOGO_URL = "https://d2jp9e7w3mhbvf.cloudfront.net/products/ec4ac153-63a2-4db7-8538-dfe30cb45a08_appicon.png";
const CDN_BASE_URL = AWS_CDN_URL

// Track if listeners are already registered with timestamp
let listenersRegistered = false;
let listenersRegisteredAt = 0;
const LISTENER_REGISTRATION_TIMEOUT = 30000; // 30 seconds - reset if exceeded

// Track displayed notifications to prevent duplicates
// CRITICAL: Use global cache to share between foreground (NotificationService) and background (index.js)
// This prevents duplicate notifications when both handlers process the same message
if (!global.sharedNotificationCache) {
  global.sharedNotificationCache = new Map();
}
const displayedNotifications = global.sharedNotificationCache;
const NOTIFICATION_CACHE_DURATION = 5000; // 5 seconds
let cacheCleanupInterval = global.notificationCacheCleanupInterval || null;

// ✅ OPTIMIZATION: Start cache cleanup only when needed
const startCacheCleanup = () => {
  if (cacheCleanupInterval) return;
  
  cacheCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of displayedNotifications.entries()) {
      if (now - timestamp > NOTIFICATION_CACHE_DURATION) {
        displayedNotifications.delete(key);
      }
    }
    
    // Stop cleanup if cache is empty to save battery
    if (displayedNotifications.size === 0 && cacheCleanupInterval) {
      clearInterval(cacheCleanupInterval);
      cacheCleanupInterval = null;
    }
  }, 30000); // Clean every 30 seconds (reduced from 10s)
};

// ✅ OPTIMIZATION: Stop cache cleanup
const stopCacheCleanup = () => {
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
  }
};

// Track if notification channel has been created
let channelCreated = false;
const CHANNEL_ID = 'flykup_default';

// Validate image URLs to prevent bitmap errors
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url === 'undefined' || url === 'null') return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    
  // Check for valid image extensions or known image services
  const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(url);
  const isFromCDN = url.includes('cloudfront') || url.includes('ui-avatars');
  
  return hasImageExtension || isFromCDN;
};

// Create notification channel once to avoid duplicate sounds
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
  } catch (error) {
    console.error('❌ Error creating foreground notification channel:', error);
  }
  
  return CHANNEL_ID;
};

// Generate unique ID for each notification (no deduplication)
const generateNotificationId = (remoteMessage) => {
  const data = remoteMessage.data || {};
  const messageId = remoteMessage.messageId || data.messageId || Date.now().toString();
  // Add timestamp to ensure uniqueness for rapid notifications
  return `flykup_${messageId}_${Date.now()}`;
};

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
      console.log('🚫 [FOREGROUND] Duplicate notification blocked:', uniqueKey);
      return false;
    }
  }
  
  // Mark this notification as displayed
  displayedNotifications.set(uniqueKey, currentTime);
  console.log('✅ [FOREGROUND] Notification allowed:', uniqueKey);
  return true;
};

// Generate UI avatar from username
const generateUIAvatar = (userName) => {
  if (!userName) return FLYKUP_LOGO_URL;
  
  const initials = userName.slice(0, 2).toUpperCase();
  return `https://ui-avatars.com/api/?name=${initials}&background=000000&color=F7CE45&size=128`;
};

// Get notification icon based on type
const getNotificationIcon = (data) => {
  const type = data.type;
  
  const systemNotifications = [
    'admin_broadcast',
    'approval', 
    'seller_status',
    'order_status',
    'order_cancelled',
    'return_status',
    'seller_order_update'
  ];
  
  if (systemNotifications.includes(type)) {
    return FLYKUP_LOGO_URL;
  }
  
  // Flash sale notifications - use seller icon or Flykup logo
  if (type === 'flash_sale_started') {
    if (data.icon && data.icon !== 'undefined' && data.icon.startsWith('http')) {
      return data.icon;
    }
    
    const sellerName = data.sellerName || data.senderUserName;
    if (sellerName) {
      return generateUIAvatar(sellerName);
    }
    
    return FLYKUP_LOGO_URL;
  }
  
  if (type === 'chat_message') {
    if (data.icon && data.icon !== 'undefined' && data.icon.startsWith('http')) {
      return data.icon;
    }
    
    if (data.senderProfileURL && data.senderProfileURL !== 'undefined' && data.senderProfileURL.startsWith('http')) {
      return data.senderProfileURL;
    }
    
    const senderName = data.senderUserName || data.senderName;
    if (senderName) {
      return generateUIAvatar(senderName);
    }
    
    return FLYKUP_LOGO_URL;
  }
  
  if (type === 'follow') {
    if (data.icon && data.icon !== 'undefined' && data.icon.startsWith('http')) {
      return data.icon;
    }
    
    const senderName = data.senderUserName || data.senderName;
    if (senderName) {
      return generateUIAvatar(senderName);
    }
  }
  
  if (type === 'seller_broadcast') {
    if (data.icon && data.icon !== 'undefined' && data.icon.startsWith('http')) {
      return data.icon;
    }
    
    const senderName = data.senderUserName || data.sellerName;
    if (senderName) {
      return generateUIAvatar(senderName);
    }
  }
  
  if (['new_video', 'new_product', 'live_stream_start', 'new_show_scheduled'].includes(type)) {
    if (data.icon && data.icon !== 'undefined' && data.icon.startsWith('http')) {
      return data.icon;
    }
    
    const senderName = data.senderUserName || data.senderName;
    if (senderName) {
      return generateUIAvatar(senderName);
    }
  }
  
  return FLYKUP_LOGO_URL;
};

// Encode URL to handle special characters like spaces
const encodeImageUrl = (url) => {
  if (!url) return null;
  // Only encode spaces and other special characters in the path, not the entire URL
  try {
    const urlObj = new URL(url);
    // Encode only the pathname part to handle spaces in filenames
    urlObj.pathname = urlObj.pathname.split('/').map(segment => encodeURIComponent(decodeURIComponent(segment))).join('/');
    return urlObj.toString();
  } catch (e) {
    // Fallback: simple space encoding
    return url.replace(/ /g, '%20');
  }
};

// Convert S3 key to full CDN URL
const getNotificationImage = (data) => {
  // console.log('🔍 Getting notification image from data:', JSON.stringify(data));
  
  // Check if image exists and is valid
  if (data.image && data.image !== '' && data.image !== 'undefined' && data.image !== 'null') {
    let imageUrl = data.image;
    if (!data.image.startsWith('http') && !data.image.startsWith('https')) {
      imageUrl = CDN_BASE_URL + data.image;
    }
    const encodedUrl = encodeImageUrl(imageUrl);
    console.log('🖼️ Notification image URL (encoded):', encodedUrl);
    return encodedUrl;
  }
  
  // Fallback to icon if image is not available
  if (data.icon && data.icon !== '' && data.icon !== 'undefined' && data.icon !== 'null') {
    let iconUrl = data.icon;
    if (!data.icon.startsWith('http')) {
      iconUrl = CDN_BASE_URL + data.icon;
    }
    const encodedUrl = encodeImageUrl(iconUrl);
    console.log('🖼️ Notification image (from icon) URL (encoded):', encodedUrl);
    return encodedUrl;
  }
  
  console.log('⚠️ No notification image found in data');
  return null;
};

// Get notification actions based on type
const getNotificationActions = (type) => {
  switch (type) {
    case 'chat_message':
      return [
        { id: 'open_chat', title: 'Open Chat' },
        { id: 'dismiss', title: 'Dismiss' }
      ];
    
    case 'follow':
      return [
        { id: 'see_profile', title: 'See Profile' },
        { id: 'dismiss', title: 'Dismiss' }
      ];
    
    case 'new_video':
    case 'new_product':
    case 'live_stream_start':
    case 'new_show_scheduled':
    case 'flash_sale_started':
      return [
        { id: 'view_content', title: 'View' },
        { id: 'dismiss', title: 'Dismiss' }
      ];
    
    case 'order_placed':
    case 'order_status':
    case 'order_cancelled':
    case 'seller_order_update':
      return [
        { id: 'view_orders', title: 'Orders' },
        { id: 'dismiss', title: 'Dismiss' }
      ];
    
    case 'approval':
    case 'seller_status':
      return [
        { id: 'view_seller', title: 'Seller' },
        { id: 'dismiss', title: 'Dismiss' }
      ];
    
    case 'return_requested':
    case 'return_status':
      return [
        { id: 'view_returns', title: 'Returns' },
        { id: 'dismiss', title: 'Dismiss' }
      ];
    
    case 'seller_broadcast':
      return [
        { id: 'view_seller_profile', title: 'Profile' },
        { id: 'dismiss', title: 'Dismiss' }
      ];
    
    case 'admin_broadcast':
      return [
        { id: 'view_admin_broadcast', title: 'View' },
        { id: 'dismiss', title: 'Dismiss' }
      ];
    
    default:
      return [
        { id: 'view', title: 'View' },
        { id: 'dismiss', title: 'Dismiss' }
      ];
  }
};

// Display notification using Notifee
const displayNotification = async (remoteMessage) => {
  try {
    // Deduplication check
    if (!shouldShowNotification(remoteMessage)) {
      return;
    }

    const data = remoteMessage.data || {};
    const notification = remoteMessage.notification || {};
    
    const title = data.title || notification.title || "Flykup Notification";
    const body = data.body || notification.body || "You have a new notification";
    const type = data.type || "general";
    
    const icon = getNotificationIcon(data);
    const image = getNotificationImage(data);
    const actions = getNotificationActions(type);
    const notificationId = generateNotificationId(remoteMessage);

    // Ensure channel exists (created only once to prevent duplicate sounds)
    const channelId = await ensureChannelExists();

    // Build iOS configuration
    const iosConfig: any = {
      categoryId: type,
    };
    
    // Safely add iOS attachments to prevent bitmap errors
    try {
      if (image && isValidImageUrl(image)) {
        iosConfig.attachments = [{
          url: image,
        }];
      }
    } catch (attachmentError) {
      console.warn('⚠️ iOS attachment error:', attachmentError);
    }

    // Build Android configuration with proper error handling for images
    const androidConfig: any = {
      channelId,
      smallIcon: 'ic_stat_notification',
      sound: 'soundtrack',
      vibrationPattern: [300, 500],
      showTimestamp: true,
      timestamp: Date.now(),
      showChronometer: false,
      autoCancel: true,
      onlyAlertOnce: false, // Always alert for new notifications
      actions: actions.map(action => ({
        title: action.title,
        pressAction: {
          id: action.id,
        },
      })),
      pressAction: {
        id: 'default',
      },
      // Don't group notifications - each should be separate
      groupSummary: false,
    };

    // IMPROVED: Rich notification display with progressive fallback
    console.log('🎨 Displaying rich foreground notification with images and actions');
    
    const hasValidImage = image && isValidImageUrl(image);
    const hasValidIcon = icon && isValidImageUrl(icon);
    
    // Determine which notifications should use BigPicture style
    const contentTypesNeedingImages = [
      'new_product',
      'new_video', 
      'live_stream_start',
      'new_show_scheduled',
      'seller_broadcast',
      'admin_broadcast',
      'flash_sale_started'
    ];
    
    const shouldUseBigPicture = hasValidImage && contentTypesNeedingImages.includes(type);
    
    let notificationDisplayed = false;
    
    // Strategy 1: Try BigPicture for content-rich notifications
    if (shouldUseBigPicture) {
      try {
        // Image should already be encoded from getNotificationImage
        const encodedImage = image;
        const iconUrl = hasValidIcon ? encodeImageUrl(icon) : FLYKUP_LOGO_URL;
        
        console.log('🖼️ [BigPicture] Attempting with:');
        console.log('   - picture:', encodedImage);
        console.log('   - largeIcon:', iconUrl);
        console.log('   - type:', type);
        
        // Set largeIcon first (shown in collapsed state)
        androidConfig.largeIcon = iconUrl;
        
        // Configure BigPicture style for expanded state
        // IMPORTANT: summary is required for BigPicture to display properly in foreground
        androidConfig.style = {
          type: AndroidStyle.BIGPICTURE,
          picture: encodedImage,
          // largeIcon in style is shown when notification is expanded (set to null to show the picture fully)
          largeIcon: null,
          // title shown when expanded
          title: title,
          // summary text shown when expanded (required for foreground display)
          summary: body,
        };
        
        const notificationPayload = {
          id: notificationId,
          title,
          body,
          data: {
            ...data,
            metadata: typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {})
          },
          android: androidConfig,
          ios: iosConfig,
        };
        
        console.log('🖼️ [BigPicture] Displaying notification with payload:', JSON.stringify({
          id: notificationPayload.id,
          title: notificationPayload.title,
          hasImage: !!androidConfig.style?.picture,
          hasLargeIcon: !!androidConfig.largeIcon,
          styleType: androidConfig.style?.type,
          picture: androidConfig.style?.picture,
          summary: androidConfig.style?.summary,
        }));
        
        await notifee.displayNotification(notificationPayload);
        notificationDisplayed = true;
        console.log('✅ [BigPicture] Rich notification displayed successfully with image:', encodedImage);
      } catch (error) {
        console.warn('⚠️ [BigPicture] Failed:', error.message);
        console.warn('⚠️ [BigPicture] Error details:', JSON.stringify(error));
        // Reset style for next strategy
        delete androidConfig.style;
        delete androidConfig.largeIcon;
      }
    }
    
    // Strategy 2: Try with largeIcon
    if (!notificationDisplayed) {
      try {
        const iconUrl = hasValidIcon ? icon : FLYKUP_LOGO_URL;
        androidConfig.largeIcon = iconUrl;
        
        // Remove style if it was set for BigPicture
        delete androidConfig.style;
        
        await notifee.displayNotification({
          id: notificationId,
          title,
          body,
          data: {
            ...data,
            metadata: typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {})
          },
          android: androidConfig,
          ios: iosConfig,
        });
        notificationDisplayed = true;
        console.log('✅ Notification with largeIcon and actions displayed');
      } catch (error) {
        console.warn('⚠️ LargeIcon failed, trying text-only:', error.message);
      }
    }
    
    // Strategy 3: Text-only with actions (fallback)
    if (!notificationDisplayed) {
      try {
        // Remove largeIcon
        delete androidConfig.largeIcon;
        
        await notifee.displayNotification({
          id: notificationId,
          title,
          body,
          data: {
            ...data,
            metadata: typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {})
          },
          android: androidConfig,
          ios: iosConfig,
        });
        notificationDisplayed = true;
        console.log('✅ Text-only notification with actions displayed');
      } catch (error) {
        console.error('❌ Text-only notification failed:', error.message);
      }
    }
    
    // Strategy 4: Absolute minimum (last resort)
    if (!notificationDisplayed) {
      try {
        await notifee.displayNotification({
          id: `fallback_${Date.now()}`,
          title,
          body,
          android: {
            channelId: CHANNEL_ID,
            smallIcon: 'ic_stat_notification',
            sound: 'soundtrack',
          },
        });
        console.log('✅ Minimal fallback notification displayed');
      } catch (fallbackError) {
        console.error('❌ CRITICAL: All notification attempts failed:', fallbackError);
      }
    }
  } catch (error) {
    console.log('❌ Error displaying notification:', error);
  }
};

// Handle notification press using RootNavigation
const handleNotificationPress = async (detail) => {
  const { notification, pressAction } = detail;
  const data = notification?.data || {};
  const actionId = pressAction?.id || 'default';

  console.log('🔔 Handling notification press:', { type: data.type, actionId });

  if (actionId === 'dismiss') {
    // Remove the notification when dismissed
    if (notification?.id) {
      await notifee.cancelNotification(notification.id);
    }
    return;
  }

  const route = getRouteFromHelpers(data, actionId);
  
  if (route) {
    try {
      // Cancel the notification when opened
      if (notification?.id) {
        await notifee.cancelNotification(notification.id);
      }
      
      // Use RootNavigation to navigate
      console.log('📱 Navigating to:', route.screen, 'with params:', route.params);
      
      // Small delay to ensure smooth transition
      setTimeout(() => {
        RootNavigation.navigate(route.screen as any, route.params);
      }, 100);
    } catch (err) {
      console.error('❌ Navigation failed:', err);
    }
  } else {
    console.log('⚠️ No route found for notification');
  }
};

// ✅ OPTIMIZATION: Add AppState monitoring for battery efficiency
import { AppState } from 'react-native';

let appStateSubscription = null;
let isAppInBackground = false;

// Initialize notification service
export const initializeNotificationService = (_navigationRef: any) => {
  const now = Date.now();
  
  // Enhanced prevention of multiple registrations with timeout check
  if (listenersRegistered) {
    const timeSinceRegistration = now - listenersRegisteredAt;
    
    // If registered recently (within timeout), skip
    if (timeSinceRegistration < LISTENER_REGISTRATION_TIMEOUT) {
      console.log(`⚠️ Notification service already initialized ${Math.round(timeSinceRegistration / 1000)}s ago, skipping...`);
      return getFCMToken();
    } else {
      // If registration is old, allow re-initialization
      console.log('⚡ Listener registration timeout exceeded, re-initializing...');
      listenersRegistered = false;
    }
  }
  
  // Set flag immediately to prevent race conditions
  listenersRegistered = true;
  listenersRegisteredAt = now;
  console.log('✅ Initializing notification service at:', new Date(now).toISOString());

  // ✅ Monitor app state to optimize notification processing
  appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      isAppInBackground = true;
      // Stop cache cleanup when in background
      stopCacheCleanup();
    } else if (nextAppState === 'active') {
      isAppInBackground = false;
      // Resume cache cleanup when app becomes active
      if (displayedNotifications.size > 0) {
        startCacheCleanup();
      }
    }
  });

  // Check for pending background notification navigation with retry mechanism
  const processPendingNavigation = (attempt = 1, maxAttempts = 10) => {
    if (!global.pendingNotificationNavigation) {
      if (attempt === 1) {
        console.log('✓ No pending background notification navigation');
      }
      return;
    }

    const pending = global.pendingNotificationNavigation;
    const now = Date.now();
    
    // Check if navigation has expired (older than 30 seconds)
    if (now - pending.timestamp > 30000) {
      console.log('⏰ Pending notification navigation is stale, ignoring');
      global.pendingNotificationNavigation = null;
      return;
    }

    // Only process background notifications
    if (!pending.fromBackground) {
      console.log('⏭️ Skipping - not from background tap');
      global.pendingNotificationNavigation = null;
      return;
    }

    console.log(`🔄 [Attempt ${attempt}/${maxAttempts}] Processing pending background notification:`, {
      route: pending.route,
      params: pending.params,
      age: `${Math.round((now - pending.timestamp) / 1000)}s ago`
    });
    
    try {
      // Check if RootNavigation is ready
      if (RootNavigation.isReady()) {
        console.log('✅ Navigation ready, navigating to:', pending.route);
        RootNavigation.navigate(pending.route as any, pending.params);
        console.log('✅ Successfully navigated from background notification');
        
        // Clear the pending navigation
        global.pendingNotificationNavigation = null;
      } else {
        console.log(`⚠️ Navigation not ready yet (attempt ${attempt}/${maxAttempts})`);
        
        // Retry if we haven't exceeded max attempts
        if (attempt < maxAttempts) {
          const retryDelay = Math.min(500 * attempt, 2000); // Exponential backoff, max 2s
          console.log(`⏱️ Retrying in ${retryDelay}ms...`);
          setTimeout(() => processPendingNavigation(attempt + 1, maxAttempts), retryDelay);
        } else {
          console.error('❌ Max retry attempts reached, navigation failed');
          global.pendingNotificationNavigation = null;
        }
      }
    } catch (error) {
      console.error('❌ Error navigating from background notification:', error);
      global.pendingNotificationNavigation = null;
    }
  };

  // Start checking for pending navigation after a brief delay
  setTimeout(() => processPendingNavigation(), 500);

  // Request permission (iOS)
  const requestPermission = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const token = await messaging().getToken();
        return token;
      }
      return null;
    } catch (error) {
      console.log('❌ Error requesting permission:', error);
      return null;
    }
  };

  // NOTE: Background message handler is set in index.js at the top level
  // This is required by Firebase - it must be set before AppRegistry.registerComponent
  // Here we only handle FOREGROUND messages to avoid duplicate notifications

  // ✅ OPTIMIZATION: Handle foreground messages with background check
  messaging().onMessage(async (remoteMessage) => {
    // Skip processing if app is in background (handled by background handler)
    if (isAppInBackground) {
      console.log('📴 Skipping foreground notification (app in background)');
      return;
    }
    
    // Check if notification should be shown
    if (remoteMessage.data?.showNotification !== 'false') {
      await displayNotification(remoteMessage);
    }

    //console.log('remoteMessage received in foreground:', remoteMessage);

    // Update unread count for chat notifications
    // if (remoteMessage.data?.type === 'chat_message') {
    //   DeviceEventEmitter.emit('updateUnreadCount');
    // }
  });

  // Handle notification press events
  const setupNotifeeListeners = () => {
    // Handle foreground events only
    // Background events are handled by index.js top-level handler
    notifee.onForegroundEvent(async ({ type, detail }) => {
      switch (type) {
        case EventType.DISMISSED:
          if (detail.notification?.id) {
            await notifee.cancelNotification(detail.notification.id);
          }
          break;
          
        case EventType.PRESS:
          await handleNotificationPress(detail);
          break;
          
        case EventType.ACTION_PRESS:
          await handleNotificationPress(detail);
          break;
      }
    });
  };

  setupNotifeeListeners();

  // Request permission and get token
  return requestPermission();
};

// ✅ OPTIMIZATION: Cleanup function for notification service
export const cleanupNotificationService = () => {
  stopCacheCleanup();
  displayedNotifications.clear();
  
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  
  listenersRegistered = false;
  console.log('🧹 Notification service cleaned up');
};

// Get FCM token
export const getFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Subscribe to topic
export const subscribeToTopic = async (topic) => {
  try {
    await messaging().subscribeToTopic(topic);
  } catch (error) {
    console.error(`❌ Error subscribing to topic ${topic}:`, error);
  }
};

// Unsubscribe from topic
export const unsubscribeFromTopic = async (topic) => {
  try {
    await messaging().unsubscribeFromTopic(topic);
  } catch (error) {
    console.error(`❌ Error unsubscribing from topic ${topic}:`, error);
  }
};

// Clear all notifications
export const clearAllNotifications = async () => {
  try {
    await notifee.cancelAllNotifications();
  } catch (error) {
    console.log('❌ Error clearing notifications:', error);
  }
};

export default {
  initializeNotificationService,
  getFCMToken,
  subscribeToTopic,
  unsubscribeFromTopic,
  clearAllNotifications,
};
