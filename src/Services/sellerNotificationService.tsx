/**
 * Seller Notification Panel API Service
 * 
 * This service handles all seller notification operations including:
 * - Fetching seller's followers
 * - Sending notifications to selected followers
 * - Broadcasting notifications to all followers
 * 
 * Base URL: https://communicationbe.onrender.com
 */

import axiosCommunication from '../Utils/axiosCommunication';

// ============================================
// Types & Interfaces
// ============================================

export interface FollowerProfile {
  _id: string;
  userName: string;
  name: string;
  profileURL?: {
    key: string;
    full: string;
  };
}

export interface Follower {
  _id: string;
  follower: FollowerProfile;
  followedAt: string;
}

export interface GetFollowersResponse {
  followers: Follower[];
  hasMore: boolean;
  page: number;
  limit: number;
  totalFollowers: number;
}

export interface SendNotificationRequest {
  title: string;
  message: string;
  followerIds?: string[];
  link?: string;
  image?: string; // S3 key of uploaded image (not full URL)
}

export interface SendNotificationResponse {
  success: boolean;
  message: string;
  successful: number;
  failed: number;
  details: {
    totalAttempted?: number;
    totalFollowers?: number;
    successfulDeliveries: number;
    failedDeliveries: string[];
  };
}

// ============================================
// Seller Notification API Functions
// ============================================

/**
 * Get Seller Followers
 * 
 * Retrieves a paginated list of followers for the logged-in seller with search functionality.
 * 
 * @param page - Page number for pagination (default: 1)
 * @param limit - Number of followers per page (default: 20)
 * @param search - Optional search term for follower name/username
 * @returns Promise with paginated followers list
 * 
 * @example
 * ```typescript
 * const result = await getSellerFollowers(1, 20, 'john');
 * result.followers.forEach(f => {
 *   console.log(f.follower.userName);
 * });
 * ```
 */
export const getSellerFollowers = async (
  page: number = 1,
  limit: number = 20,
  search: string = ''
): Promise<GetFollowersResponse> => {
  try {
    const params: Record<string, any> = { page, limit };
    if (search.trim()) {
      params.search = search.trim();
    }

    const response = await axiosCommunication.get<GetFollowersResponse>(
      'seller/notifications/followers',
      { params }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error fetching seller followers:', error.message);
    return {
      followers: [],
      hasMore: false,
      page,
      limit,
      totalFollowers: 0,
    };
  }
};

/**
 * Send Notification to Selected Followers
 * 
 * Sends a notification to specific selected followers.
 * 
 * @param title - Notification title
 * @param message - Notification message body
 * @param followerIds - Array of follower user IDs
 * @param image - Optional S3 key of uploaded image
 * @param link - Optional link/URL
 * @returns Promise with send status
 * 
 * @example
 * ```typescript
 * const result = await sendToSelectedFollowers(
 *   'New Product Launch! 🎉',
 *   'Check out our latest collection!',
 *   ['user_id_1', 'user_id_2'],
 *   'notification-images/product.jpg',
 *   '/products/new-collection'
 * );
 * console.log(`Sent to ${result.successful} followers`);
 * ```
 */
export const sendToSelectedFollowers = async (
  title: string,
  message: string,
  followerIds: string[],
  image?: string,
  link?: string
): Promise<SendNotificationResponse> => {
  try {
    if (!followerIds || followerIds.length === 0) {
      return {
        success: false,
        message: 'Please select at least one follower',
        successful: 0,
        failed: 0,
        details: {
          totalAttempted: 0,
          successfulDeliveries: 0,
          failedDeliveries: [],
        },
      };
    }

    const payload: SendNotificationRequest = {
      title,
      message,
      followerIds,
    };

    if (link) {
      payload.link = link;
    }

    if (image) {
      payload.image = image;
    }

    const response = await axiosCommunication.post<SendNotificationResponse>(
      'seller/notifications/notify-selected',
      payload
    );

    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'Failed to send notifications';
    console.error('Error sending to selected followers:', errorMessage);
    return {
      success: false,
      message: errorMessage,
      successful: 0,
      failed: followerIds.length,
      details: {
        totalAttempted: followerIds.length,
        successfulDeliveries: 0,
        failedDeliveries: followerIds,
      },
    };
  }
};

/**
 * Send Notification to All Followers
 * 
 * Broadcasts a notification to all followers of the seller.
 * 
 * @param title - Notification title
 * @param message - Notification message body
 * @param image - Optional S3 key of uploaded image
 * @param link - Optional link/URL
 * @returns Promise with broadcast status
 * 
 * @example
 * ```typescript
 * const result = await sendToAllFollowers(
 *   'Flash Sale Alert! ⚡',
 *   '50% off on all items for the next 2 hours!',
 *   'notification-images/flash-sale.jpg',
 *   '/flash-sale'
 * );
 * console.log(`Broadcast sent to ${result.successful} of ${result.details.totalFollowers} followers`);
 * ```
 */
export const sendToAllFollowers = async (
  title: string,
  message: string,
  image?: string,
  link?: string
): Promise<SendNotificationResponse> => {
  try {
    const payload: Omit<SendNotificationRequest, 'followerIds'> = {
      title,
      message,
    };

    if (link) {
      payload.link = link;
    }

    if (image) {
      payload.image = image;
    }

    const response = await axiosCommunication.post<SendNotificationResponse>(
      'seller/notifications/notify-all',
      payload
    );

    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'Failed to broadcast notification';
    console.error('Error broadcasting to all followers:', errorMessage);
    return {
      success: false,
      message: errorMessage,
      successful: 0,
      failed: 0,
      details: {
        totalFollowers: 0,
        successfulDeliveries: 0,
        failedDeliveries: [],
      },
    };
  }
};

// ============================================
// Export as Service Object
// ============================================

export const sellerNotificationService = {
  getSellerFollowers,
  sendToSelectedFollowers,
  sendToAllFollowers,
};

export default sellerNotificationService;
