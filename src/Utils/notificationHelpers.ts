/**
 * Notification Navigation Helpers
 * Shared utilities for handling notification navigation across the app
 */

import type {
  NotificationData,
  NotificationMetadata,
  NotificationNavigationRoute,
  NotificationActionId,
} from '../types/notifications';

/**
 * Parse metadata from notification data
 * Handles both string and object metadata formats
 */
export const parseNotificationMetadata = (data: NotificationData): NotificationMetadata => {
  try {
    if (!data.metadata) return {};
    
    if (typeof data.metadata === 'string') {
      return JSON.parse(data.metadata);
    }
    
    return data.metadata;
  } catch (error) {
    console.error('❌ Error parsing notification metadata:', error);
    return {};
  }
};

/**
 * Extract ID from URL
 * Helper to get the last segment of a URL path
 */
export const getIdFromUrl = (url?: string): string | null => {
  if (!url) return null;
  
  try {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    
    // Remove query parameters if present
    return lastPart?.split('?')[0] || null;
  } catch (error) {
    console.error('❌ Error extracting ID from URL:', error);
    return null;
  }
};

/**
 * Get navigation route based on notification data and action
 * Returns the screen name and params to navigate to
 */
export const getNavigationRoute = (
  data: NotificationData,
  actionId: NotificationActionId = 'default'
): NotificationNavigationRoute | null => {
  // Handle dismiss action
  if (actionId === 'dismiss') {
    return null;
  }

  const type = data.type || 'general';
  const metadata = parseNotificationMetadata(data);

  // PRIORITY: Check for navigation object in metadata first
  if (metadata.navigation?.route) {
    console.log('📱 Using navigation from metadata:', metadata.navigation);
    return {
      screen: metadata.navigation.route,
      params: metadata.navigation.params || {},
    };
  }

  // Handle specific action IDs
  switch (actionId) {
    case 'open_chat': {
      const chatRoomId = data.chatRoomId || data.chatRoomID || metadata.chatRoomId;
      if (chatRoomId) {
        return {
          screen: 'ChatScreen',
          params: { roomId: chatRoomId },
        };
      }
      // Fallback to main chat list
      return { screen: 'Chat', params: {} };
    }

    case 'see_profile': {
      const userName = data.senderUserName || metadata.userName;
      if (userName) {
        return {
          screen: 'ViewSellerProdile',
          params: { id: userName },
        };
      }
      break;
    }

    case 'view_content':
    case 'view': {
      return getContentNavigationRoute(type, data, metadata);
    }

    case 'view_orders':
      return { 
        screen: 'SellerOrders', 
        params: {}
      };

    case 'view_seller':
      return { screen: 'sellerPortal', params: {} };

    case 'view_returns':
      return { 
        screen: 'bottomtabbar', 
        params: {
          screen: 'HomeTabs',
          params: { screen: 'myactivity' }
        }
      };

    case 'view_seller_profile': {
      const userName = data.senderUserName || metadata.userName || metadata.sellerName;
      if (userName) {
        return {
          screen: 'ViewSellerProdile',
          params: { id: userName },
        };
      }
      break;
    }

    case 'view_admin_broadcast':
      return { screen: 'NotificationScreen', params: {} };
  }

  // Type-based navigation fallback
  return getTypeBasedNavigationRoute(type, data, metadata);
};

/**
 * Get navigation route based on content type
 * Used for view_content and view actions
 */
const getContentNavigationRoute = (
  type: string,
  data: NotificationData,
  metadata: NotificationMetadata
): NotificationNavigationRoute | null => {
  switch (type) {
    case 'new_video': {
      const videoId = getIdFromUrl(data.link || metadata.link || data.url);
      if (videoId) {
        return {
          screen: 'reel',
          params: { id: videoId },
        };
      }
      break;
    }
    case 'cohost_accepted':
    case 'cohost_rejected':
    case 'cohost_invite': {
      return { screen: 'cohostInvitations', params: {} };
    }

    case 'new_product': {
      const productId = getIdFromUrl(data.url || metadata.url || data.link);
      if (productId) {
        return {
          screen: 'ProductDetails',
          params: { id: productId, type: 'static' },
        };
      }
      break;
    }

    case 'live_stream_start': {
      const streamId = getIdFromUrl(data.link || metadata.link || data.url);
      if (streamId) {
        return {
          screen: 'LiveScreen',
          params: { stream: { _id: streamId } },
        };
      }
      break;
    }

    case 'new_show_scheduled': {
      const showId = getIdFromUrl(data.link || metadata.link || data.url);
      if (showId) {
        return {
          screen: 'UpcomingShowDetail',
          params: {
            id: showId,
            hostId: data.fromUser?._id,
          },
        };
      }
      break;
    }

    case 'flash_sale_started': {
      const productId = metadata.productId || getIdFromUrl(data.link || data.url);
      if (productId) {
        return {
          screen: 'ProductDetails',
          params: { id: productId, type: 'static' },
        };
      }
      break;
    }
  }

  return null;
};

/**
 * Get navigation route based on notification type
 * Fallback when action-based routing doesn't apply
 */
const getTypeBasedNavigationRoute = (
  type: string,
  data: NotificationData,
  metadata: NotificationMetadata
): NotificationNavigationRoute => {
  switch (type) {
    case 'chat_message': {
      const chatRoomId = data.chatRoomId || data.chatRoomID || metadata.chatRoomId;
      if (chatRoomId) {
        return {
          screen: 'ChatScreen',
          params: { roomId: chatRoomId },
        };
      }
      // Fallback to main chat list
      console.log('⚠️ Chat notification without roomId, opening chat list');
      return { screen: 'Chat', params: {} };
    }

    case 'follow': {
      const userName = data.senderUserName || metadata.userName;
      if (userName) {
        return {
          screen: 'ViewSellerProdile',
          params: { id: userName },
        };
      }
      return { screen: 'NotificationScreen', params: {} };
    }

    case 'new_video': {
      const videoId = getIdFromUrl(data.link || metadata.link || data.url);
      if (videoId) {
        return {
          screen: 'reel',
          params: { id: videoId },
        };
      }
      return { screen: 'NotificationScreen', params: {} };
    }

    case 'new_product': {
      const productId = getIdFromUrl(data.url || metadata.url || data.link);
      if (productId) {
        return {
          screen: 'ProductDetails',
          params: { id: productId, type: 'static' },
        };
      }
      return { screen: 'NotificationScreen', params: {} };
    }

    case 'live_stream_start':
    case 'new_show_scheduled': {
      const streamId = getIdFromUrl(data.link || metadata.link || data.url);
      if (streamId) {
        return {
          screen: 'LiveScreen',
          params: { stream: { _id: streamId } },
        };
      }
      // return { screen: 'userShows', params: {} };
    }

    case 'cohost_invite':
      return { screen: 'cohostInvitations', params: {} };

    // Order placed - navigate to SellerOrders
    case 'order_placed':
      return { 
        screen: 'SellerOrders', 
        params: {}
      };

    // Other order-related notifications
    case 'order_status':
    case 'order_cancelled':
    case 'seller_order_update':
    case 'return_requested':
    case 'return_status':
      return { 
        screen: 'bottomtabbar', 
        params: {
          screen: 'HomeTabs',
          params: { screen: 'myactivity' }
        }
      };

    case 'approval':
    case 'seller_status':
      return { screen: 'sellerPortal', params: {} };

    case 'seller_broadcast': {
      const userName = data.senderUserName || metadata.userName;
      if (userName) {
        return {
          screen: 'ViewSellerProdile',
          params: { id: userName },
        };
      }
      return { screen: 'NotificationScreen', params: {} };
    }

    case 'flash_sale_started': {
      const productId = metadata.productId || getIdFromUrl(data.link || data.url);
      if (productId) {
        return {
          screen: 'ProductDetails',
          params: { id: productId, type: 'static' },
        };
      }
      return { screen: 'NotificationScreen', params: {} };
    }

    case 'admin_broadcast':
    default:
      return { screen: 'NotificationScreen', params: {} };
  }
};

/**
 * Check if navigation data is stale (older than specified duration)
 * @param timestamp - Timestamp when navigation data was created
 * @param maxAge - Maximum age in milliseconds (default: 10 seconds)
 */
export const isNavigationStale = (timestamp: number, maxAge: number = 10000): boolean => {
  const now = Date.now();
  return now - timestamp > maxAge;
};

/**
 * Validate notification navigation data
 * Ensures all required fields are present
 */
export const isValidNavigationData = (data: any): boolean => {
  if (!data) return false;
  if (!data.route || typeof data.route !== 'string') return false;
  if (!data.timestamp || typeof data.timestamp !== 'number') return false;
  
  return true;
};

/**
 * Log navigation event for debugging
 */
export const logNavigationEvent = (
  event: string,
  data?: any
): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔔 ${event}`, data || '');
};
