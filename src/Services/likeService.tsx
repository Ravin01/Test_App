/**
 * Like Service for AppSync Events
 * Handles like/unlike operations and real-time like updates via AppSync Events
 */

import { bgaBackendUrl } from '../../Config';
import axiosInstance from '../Utils/Api';
import { 
  connectToChannel, 
  getLikesChannelPath, 
  subscribeToChannel,
  closeChannel,
  type Channel,
  type Subscription 
} from '../Utils/appSyncConfig';

// Type definitions
export interface LikeData {
  likes: number;
  likedBy: string[];
  userId: string;
  userName: string;
  isLiked: boolean;
  action: 'liked' | 'unliked';
  timestamp?: string;
  streamId?: string;
  eventType?: string;
}

export interface LikeResponse {
  success: boolean;
  message: string;
  data: LikeData;
}

/**
 * Toggle like on a show/stream via REST API
 * This replaces the socket.emit('toggle_like') functionality
 * 
 * @param showId - The show/stream ID
 * @param userId - The user ID performing the action
 * @param userName - The user's display name
 * @returns Promise with like response data
 */
export const toggleLike = async (
  showId: string,
  userId: string,
  userName: string
): Promise<LikeResponse> => {
  try {
    console.log('❤️ [LikeService] Toggling like:', { showId, userId, userName });
    
    const response = await axiosInstance.post(`${bgaBackendUrl}api/likes/show/${showId}`, {
      userId,
      userName,
    });

    console.log('✅ [LikeService] Like toggled successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ [LikeService] Error toggling like:', error);
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to toggle like'
    );
  }
};

/**
 * Get current like count and liked users for a show
 * 
 * @param showId - The show/stream ID
 * @returns Promise with like data
 */
export const getLikes = async (showId: string): Promise<LikeResponse> => {
  try {
    // console.log('📊 [LikeService] Fetching likes for show:', showId);
    
    const response = await axiosInstance.get(`${bgaBackendUrl}api/likes/show/${showId}`);
    
    // console.log('✅ [LikeService] Likes fetched successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ [LikeService] Error fetching likes:', error);
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to fetch likes'
    );
  }
};

/**
 * Subscribe to real-time like updates for a stream via AppSync Events
 * 
 * @param streamId - The stream ID to subscribe to
 * @param onLikeUpdate - Callback function when likes are updated
 * @param onError - Optional error callback
 * @returns Cleanup function to unsubscribe and close the channel
 */
export const subscribeLikeUpdates = async (
  streamId: string,
  onLikeUpdate: (data: LikeData) => void,
  onError?: (error: any) => void
): Promise<() => void> => {
  let channel: Channel | null = null;
  let subscription: Subscription | null = null;

  try {
    console.log('🔌 [LikeService] Setting up AppSync subscription for stream:', streamId);
    
    const channelPath = getLikesChannelPath(streamId);
    channel = await connectToChannel(channelPath);
    
    subscription = subscribeToChannel(
      channel,
      (eventData: any) => {
        // console.log('💛 [LikeService] Received like update:', eventData);
        
        // AppSync Events wraps data in an 'event' property
        const actualData = eventData.event || eventData.event.event || eventData;
        
        // Extract like data from event
        const likeData: LikeData = {
          likes: actualData.likes || 0,
          likedBy: actualData.likedBy || [],
          userId: actualData.userId || '',
          userName: actualData.userName || 'User',
          isLiked: actualData.isLiked || false,
          action: actualData.action || 'liked',
          timestamp: actualData.timestamp,
          streamId: actualData.streamId,
        };
        
        console.log('💛 [LikeService] Parsed like data:', likeData);
        onLikeUpdate(likeData);
      },
      (error) => {
        console.error('❌ [LikeService] AppSync subscription error:', error);
        if (onError) {
          onError(error);
        }
      }
    );

    console.log('✅ [LikeService] AppSync subscription established');

    // Return cleanup function
    return () => {
      console.log('🔌 [LikeService] Cleaning up like subscription');
      if (subscription) {
        subscription.unsubscribe();
      }
      if (channel) {
        closeChannel(channel);
      }
    };
  } catch (error) {
    console.error('❌ [LikeService] Failed to subscribe to like updates:', error);
    
    // Cleanup on error
    if (subscription) {
      subscription.unsubscribe();
    }
    if (channel) {
      closeChannel(channel);
    }
    
    throw error;
  }
};

export default {
  toggleLike,
  getLikes,
  subscribeLikeUpdates,
};
