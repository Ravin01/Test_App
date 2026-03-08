/**
 * AppSync Events Utility for React Native
 * 
 * This utility provides real-time event streaming capabilities using AWS AppSync Events.
 * Adapted from web implementation for React Native compatibility.
 * 
 * Key Features:
 * - Real-time comments on live streams
 * - Real-time likes tracking
 * - Giveaway notifications and updates
 * - Auction bidding and updates
 * - Automatic reconnection handling
 * - Error recovery
 */

import { Amplify } from 'aws-amplify';
import { events } from 'aws-amplify/data';
import { appSyncConfig } from '../../Config';

// Type definitions for better TypeScript support
export interface Channel {
  subscribe: (options: SubscribeOptions) => Subscription;
  publish: (data: any) => Promise<void>;
  close: () => void;
}

export interface SubscribeOptions {
  next: (data: any) => void;
  error?: (error: any) => void;
}

export interface Subscription {
  unsubscribe: () => void;
}

export interface EventData {
  id?: string;
  type?: string;
  data?: any;
  timestamp?: number;
  userId?: string;
  streamId?: string;
  [key: string]: any;
}

/**
 * Configure AWS Amplify for AppSync Events
 * Call this once when your app starts, typically in App.tsx or index.js
 * 
 * @throws {Error} If configuration fails
 */
export const configureAppSync = (): void => {
  try {
    const { endpoint, region, apiKey } = appSyncConfig;

    Amplify.configure({
      API: {
        Events: {
          endpoint,
          region,
          defaultAuthMode: 'apiKey',
          apiKey,
        },
      },
    });

    // console.log('✅ AppSync Events configured successfully');
    // console.log(`📡 Endpoint: ${endpoint}`);
    // console.log(`🌍 Region: ${region}`);
  } catch (error) {
    console.error('❌ Failed to configure AppSync Events:', error);
    throw error;
  }
};

/**
 * Connect to an AppSync Events channel
 * 
 * @param channelPath - The channel path to connect to (e.g., '/default/stream-123-comments')
 * @returns Promise<Channel> - The connected channel object
 * @throws {Error} If connection fails
 * 
 * @example
 * const channel = await connectToChannel('/default/stream-123-comments');
 */
export const connectToChannel = async (channelPath: string): Promise<Channel> => {
  try {
    // console.log(`🔌 Connecting to AppSync channel: ${channelPath}`);
    const channel = await events.connect(channelPath);
    // console.log(`✅ Connected to channel: ${channelPath}`);
    return channel;
  } catch (error) {
    console.error(`❌ Failed to connect to channel ${channelPath}:`, error);
    throw error;
  }
};

/**
 * Generate a channel path for registrations on a specific show
 * @param {string} showId - The show ID
 * @returns {string} - The channel path
 */
export const getRegistrationChannelPath = (showId) => {
  return `/default/show-${showId}-registration`;
};

/**
 * Generate a channel path for comments on a specific stream
 * 
 * @param streamId - The stream ID
 * @returns The channel path for comments
 * 
 * @example
 * const channelPath = getCommentsChannelPath('stream-123');
 * // Returns: '/default/stream-stream-123-comments'
 */
export const getCommentsChannelPath = (streamId: string): string => {
  return `/default/stream-${streamId}-comments`;
};

/**
 * Generate a channel path for likes on a specific stream
 * 
 * @param streamId - The stream ID
 * @returns The channel path for likes
 * 
 * @example
 * const channelPath = getLikesChannelPath('stream-123');
 * // Returns: '/default/stream-stream-123-likes'
 */
export const getLikesChannelPath = (streamId: string): string => {
  return `/default/stream-${streamId}-likes`;
};

/**
 * Generate a channel path for giveaways on a specific stream
 * 
 * @param streamId - The stream ID
 * @returns The channel path for giveaways
 * 
 * @example
 * const channelPath = getGiveawaysChannelPath('stream-123');
 * // Returns: '/default/stream-stream-123-giveaways'
 */
export const getGiveawaysChannelPath = (streamId: string) => {
  return `/default/stream-${streamId}-giveaways`;
};

/**
 * Generate a channel path for a specific giveaway
 * Note: Currently uses the same channel as general giveaways.
 * Filtering should be done on the event data based on giveawayId.
 * 
 * @param streamId - The stream ID
 * @param giveawayId - The giveaway ID (optional, for future use)
 * @returns The channel path for the giveaway
 * 
 * @example
 * const channelPath = getGiveawayChannelPath('stream-123', 'giveaway-456');
 * // Returns: '/default/stream-stream-123-giveaways'
 */
export const getGiveawayChannelPath = (streamId: string, giveawayId?: string | null): string => {
  // Use same channel as general giveaways - filtering will be done on event data
  return `/default/stream-${streamId}-giveaways`;
};

/**
 * Generate a channel path for auctions on a specific stream
 * 
 * @param streamId - The stream ID
 * @returns The channel path for auctions
 * 
 * @example
 * const channelPath = getAuctionsChannelPath('stream-123');
 * // Returns: '/default/stream-stream-123-auctions'
 */
export const getAuctionsChannelPath = (streamId: string): string => {
  return `/default/stream-${streamId}-auctions`;
};

/**
 * Generate a channel path for a specific auction
 * Note: Currently uses the same channel as general auctions.
 * Filtering should be done on the event data based on auctionId.
 * 
 * @param streamId - The stream ID
 * @param auctionId - The auction ID (optional, for future use)
 * @returns The channel path for the auction
 * 
 * @example
 * const channelPath = getAuctionChannelPath('stream-123', 'auction-789');
 * // Returns: '/default/stream-stream-123-auctions'
 */
export const getAuctionChannelPath = (streamId: string, auctionId?: string | null): string => {
  // Use same channel as general auctions - filtering will be done on event data
  return `/default/stream-${streamId}-auctions`;
};

/**
 * Generate a channel path for IVS stream events
 * Used for real-time IVS streaming events such as stream state changes,
 * viewer count updates, and other IVS-specific notifications.
 * 
 * @param streamId - The stream ID
 * @returns The channel path for IVS events
 * 
 * @example
 * const channelPath = getIVSChannelPath('stream-123');
 * // Returns: '/default/stream-stream-123-ivs'
 */
export const getIVSChannelPath = (streamId: string): string => {
  return `/default/stream-${streamId}-ivs`;
};

/**
 * Generate a client-specific global channel path for stream events
 * Backend publishes stream:live and stream:ended to this channel
 * 
 * @param clientId - The client ID
 * @param isAdmin - Whether the user is admin
 * @returns The client-specific channel path
 * 
 * @example
 * const channelPath = getGlobalChannelPath('client-123', false);
 * // Returns: '/default/client-client-123/streams'
 */
export const getGlobalChannelPath = (clientId: string, isAdmin: boolean): string => {
  if (isAdmin) {
    return '/default/admin/streams';
  }
  return `/default/client-${clientId}/streams`;
};

/**
 * Subscribe to a channel with automatic error handling
 * 
 * @param channel - The channel object to subscribe to
 * @param onData - Callback function for incoming data
 * @param onError - Optional callback function for errors
 * @returns Subscription object with unsubscribe method
 * @throws {Error} If subscription fails
 * 
 * @example
 * const subscription = subscribeToChannel(
 *   channel,
 *   (data) => {
 *     console.log('New comment:', data);
 *     setComments(prev => [...prev, data]);
 *   },
 *   (error) => {
 *     console.error('Subscription error:', error);
 *     Alert.alert('Connection Error', 'Lost connection to live updates');
 *   }
 * );
 * 
 * // Later, when you want to unsubscribe:
 * subscription.unsubscribe();
 */
export const subscribeToChannel = (
  channel: Channel,
  onData: (data: EventData) => void,
  onError?: ((error: any) => void) | null
): Subscription => {
  try {
    return channel.subscribe({
      next: (eventData: EventData) => {
        try {
          onData(eventData);
        } catch (error) {
          console.log('❌ Error processing event data:', error);
          console.log('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            eventData,
          });
        }
      },
      error: (err: any) => {
        console.log('❌ Channel subscription error:', {
          error: err,
          errorType: err?.constructor?.name,
          errorMessage: err?.message,
          errors: err?.errors,
          errorDetails: JSON.stringify(err, null, 2),
        });
        if (onError) {
          onError(err);
        }
      },
    });
  } catch (error) {
    console.log ('❌ Failed to create subscription:', error);
    throw error;
  }
};

/**
 * Close a channel connection
 * Always call this when you're done with a channel to prevent memory leaks.
 * Typically called in useEffect cleanup or componentWillUnmount.
 * 
 * @param channel - The channel object to close
 * 
 * @example
 * useEffect(() => {
 *   let channel: Channel | null = null;
 *   
 *   const setupChannel = async () => {
 *     channel = await connectToChannel(channelPath);
 *     // ... subscribe to channel
 *   };
 *   
 *   setupChannel();
 *   
 *   return () => {
 *     if (channel) {
 *       closeChannel(channel);
 *     }
 *   };
 * }, [channelPath]);
 */
export const closeChannel = (channel: Channel | null): void => {
  if (channel) {
    try {
      channel.close();
      // console.log('🔌 Channel closed successfully');
    } catch (error) {
      console.error('❌ Error closing channel:', error);
    }
  }
};

/**
 * Utility function to create a complete channel subscription lifecycle
 * This is a convenience wrapper that handles connection, subscription, and cleanup.
 * 
 * @param channelPath - The channel path to connect to
 * @param onData - Callback for incoming data
 * @param onError - Optional callback for errors
 * @returns Cleanup function that closes the channel and unsubscribes
 * 
 * @example
 * useEffect(() => {
 *   const cleanup = await createChannelSubscription(
 *     getCommentsChannelPath(streamId),
 *     (comment) => setComments(prev => [...prev, comment]),
 *     (error) => console.error('Error:', error)
 *   );
 *   
 *   return cleanup;
 * }, [streamId]);
 */
export const createChannelSubscription = async (
  channelPath: string,
  onData: (data: EventData) => void,
  onError?: ((error: any) => void) | null
): Promise<() => void> => {
  try {
    const channel = await connectToChannel(channelPath);
    const subscription = subscribeToChannel(channel, onData, onError);

    // Return cleanup function
    return () => {
      subscription.unsubscribe();
      closeChannel(channel);
    };
  } catch (error) {
    console.error('❌ Failed to create channel subscription:', error);
    throw error;
  }
};

// Export all channel path generators as a convenient object
export const ChannelPaths = {
  comments: getCommentsChannelPath,
  likes: getLikesChannelPath,
  giveaways: getGiveawaysChannelPath,
  giveaway: getGiveawayChannelPath,
  auctions: getAuctionsChannelPath,
  auction: getAuctionChannelPath,
  ivs: getIVSChannelPath,
  registration: getRegistrationChannelPath,
  global: getGlobalChannelPath,
};

// Export a default object with all functions
export default {
  configureAppSync,
  connectToChannel,
  getCommentsChannelPath,
  getLikesChannelPath,
  getGiveawaysChannelPath,
  getGiveawayChannelPath,
  getAuctionsChannelPath,
  getAuctionChannelPath,
  getIVSChannelPath,
  getRegistrationChannelPath,
  getGlobalChannelPath,
  subscribeToChannel,
  closeChannel,
  createChannelSubscription,
  ChannelPaths,
};
