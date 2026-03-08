// utils/appSyncFlashSaleConfig.js - AWS AppSync Configuration for Flash Sales
import { connectToChannel, subscribeToChannel } from './appSyncConfig';

/**
 * Channel paths for flash sale subscriptions
 */
export const FLASH_SALE_CHANNELS = {
  // Global flash sales channel (for homepage/normal flash sales)
  GLOBAL: '/default/global-flashsales',
  
  // Live stream flash sales channel (dynamic based on showId)
  getLiveStreamChannel: (showId) => `/default/stream-${showId}-flashsales`
};

/**
 * Subscribe to a flash sale channel
 * @param {string} channelPath - The channel path to subscribe to
 * @param {Function} onMessage - Callback function for incoming messages
 * @returns {Promise<Object>} - Returns the connected channel object
 */
export const subscribeToFlashSaleChannel = async (channelPath, onMessage) => {
  try {
    // console.log(`🔌 Subscribing to flash sale channel: ${channelPath}`);
    
    // Connect to the channel
    const channel = await connectToChannel(channelPath);
    
    // Subscribe to messages
    const subscription = subscribeToChannel(channel, (data) => {
      try {
        // Extract event data with multiple fallback paths
        let eventData = null;
        
        if (data?.event?.event?.eventType) {
          eventData = data.event.event;
        } else if (data?.event?.eventType) {
          eventData = data.event;
        } else if (data?.eventType) {
          eventData = data;
        }
        
        // Call the message handler with extracted event data
        if (eventData && onMessage) {
          onMessage(eventData);
        }
      } catch (error) {
        console.error('❌ Error processing flash sale message:', error);
      }
    });
    
    // console.log(`✅ Successfully subscribed to flash sale channel: ${channelPath}`);
    return channel;
  } catch (error) {
    console.error(`❌ Error subscribing to channel ${channelPath}:`, error);
    throw error;
  }
};

/**
 * Event type mappings from Socket.io to AppSync
 */
export const FLASH_SALE_EVENT_TYPES = {
  // Global flash sales
  FLASH_SALE_UPDATE: 'flash_sale_update',
  FLASH_SALE_ACTIVATED: 'flash_sale_activated',
  FLASH_SALE_EXPIRED: 'flash_sale_expired',
  STOCK_UPDATE: 'stock_update',
  
  // Live stream flash sales
  LIVE_FLASH_SALE_STARTED: 'live_flash_sale_started',
  LIVE_FLASH_SALE_ENDED: 'live_flash_sale_ended',
  LIVE_STOCK_UPDATE: 'live_stock_update',
  
  // Bundle flash sales
  BUNDLE_FLASH_SALE_STARTED: 'bundle_flash_sale_started',
  BUNDLE_FLASH_SALE_ENDED: 'bundle_flash_sale_ended',
BUNDLE_STOCK_UPDATE: 'bundle_flash_sale_stock_update',
  
  // Viewer and purchase events
  VIEWER_COUNT_UPDATE: 'viewer_count_update',
  PURCHASE_SUCCESS: 'purchase_success',
  INSUFFICIENT_STOCK: 'insufficient_stock',
  
  // Error events
  FLASH_SALE_ERROR: 'flash_sale_error',
  LIVE_FLASH_SALE_ERROR: 'live_flash_sale_error',
  BUNDLE_FLASH_SALE_ERROR: 'bundle_flash_sale_error'
};

export default {
  subscribeToFlashSaleChannel,
  FLASH_SALE_CHANNELS,
  FLASH_SALE_EVENT_TYPES
};
