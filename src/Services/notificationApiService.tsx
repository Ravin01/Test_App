/**
 * Notification API Service for Communication Backend
 * 
 * This service handles all notification-related operations including:
 * - Fetching unseen notification count
 * - Getting paginated notifications
 * - Marking notifications as seen/read
 * - Deleting notifications
 * - Clearing all notifications
 * 
 * Base URL: https://communicationbe.onrender.com
 */

import axiosCommunication from '../Utils/axiosCommunication';

// ============================================
// Types & Interfaces
// ============================================

export type NotificationType = 
  | 'order_placed'
  | 'order_status'
  | 'order_cancelled'
  | 'return_requested'
  | 'return_status'
  | 'approval'
  | 'seller_status'
  | 'new_product'
  | 'new_video'
  | 'admin_broadcast'
  | 'seller_broadcast'
  | 'live_stream_start'
  | 'seller_order_update'
  | 'new_show_scheduled'
  | 'cohost_invite'
  | 'cohost_accepted'
  | 'cohost_rejected'
  | 'cohost_join_live'
  | 'flash_sale_started'
  | 'chat_message'
  | 'follow'
  | string;

export interface SenderProfile {
  _id: string;
  userName: string;
  name?: string;
  profileURL?: string;
}

export interface NotificationMetadata {
  productId?: string;
  showId?: string;
  liveStreamId?: string;
  hostName?: string;
  cohostName?: string;
  [key: string]: any;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  isNew: boolean;
  link?: string;
  image?: string;
  icon?: string;
  createdAt: string;
  senderProfile?: SenderProfile;
  metadata?: NotificationMetadata;
  amount?: string | number;
  secondaryAction?: string;
  accentColor?: string;
}

export interface NotificationCountResponse {
  unseenCount: number;
}

export interface NotificationListResponse {
  data: Notification[];
  page: number;
  limit: number;
  totalPages: number;
  totalNotifications: number;
}

export interface NotificationActionResponse {
  success: boolean;
  message: string;
}

// ============================================
// Notification API Functions
// ============================================

/**
 * Fetch Unseen Notification Count
 * 
 * Retrieves the count of unseen notifications for the logged-in user.
 * 
 * @returns Promise with unseen notification count
 * 
 * @example
 * ```typescript
 * const count = await fetchUnseenNotificationCount();
 * console.log(`You have ${count} new notifications`);
 * ```
 */
export const fetchUnseenNotificationCount = async (): Promise<number> => {
  try {
    const response = await axiosCommunication.get<NotificationCountResponse>('/notifications/count');
    return response.data.unseenCount;
  } catch (error: any) {
    console.error('Error fetching notification count:', error.message);
    return 0;
  }
};

/**
 * Fetch Notifications (Paginated)
 * 
 * Retrieves a paginated list of notifications for the logged-in user.
 * 
 * @param page - Page number for pagination (default: 1)
 * @param limit - Number of notifications per page (default: 10)
 * @returns Promise with paginated notifications
 * 
 * @example
 * ```typescript
 * const result = await fetchNotifications(1, 10);
 * console.log(`Page ${result.page} of ${result.totalPages}`);
 * result.data.forEach(notification => {
 *   console.log(notification.title);
 * });
 * ```
 */
export const fetchNotifications = async (
  page: number = 1,
  limit: number = 10
): Promise<NotificationListResponse> => {
  try {
    const response = await axiosCommunication.get<NotificationListResponse>(
      `/notifications/get?page=${page}&limit=${limit}`
    );
    
    // Handle both response formats (data wrapped or direct)
    const data = response.data.data || response.data;
    
    return {
      data: Array.isArray(data) ? data : [],
      page: response.data.page || page,
      limit: response.data.limit || limit,
      totalPages: response.data.totalPages || 1,
      totalNotifications: response.data.totalNotifications || 0,
    };
  } catch (error: any) {
    console.error('Error fetching notifications:', error.message);
    return {
      data: [],
      page,
      limit,
      totalPages: 0,
      totalNotifications: 0,
    };
  }
};

/**
 * Mark All Notifications As Seen
 * 
 * Marks all notifications as seen (but not necessarily read) for the logged-in user.
 * This is typically called when the user opens the notification panel.
 * 
 * @returns Promise with success status
 * 
 * @example
 * ```typescript
 * await markAllAsSeen();
 * // Notification badge count should now be 0
 * ```
 */
export const markAllAsSeen = async (): Promise<NotificationActionResponse> => {
  try {
    const response = await axiosCommunication.put<NotificationActionResponse>('/notifications/mark-as-seen');
    return response.data;
  } catch (error: any) {
    console.error('Error marking notifications as seen:', error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to mark notifications as seen',
    };
  }
};

/**
 * Mark Single Notification As Read
 * 
 * Marks a specific notification as read when the user interacts with it.
 * 
 * @param notificationId - The notification ID to mark as read
 * @returns Promise with success status
 * 
 * @example
 * ```typescript
 * const result = await markNotificationRead('677d123abc456def');
 * if (result.success) {
 *   console.log('Notification marked as read');
 * }
 * ```
 */
export const markNotificationRead = async (
  notificationId: string
): Promise<NotificationActionResponse> => {
  try {
    const response = await axiosCommunication.put<NotificationActionResponse>(
      `/notifications/${notificationId}/read`
    );
    return response.data;
  } catch (error: any) {
    console.error('Error marking notification as read:', error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to mark notification as read',
    };
  }
};

/**
 * Delete Single Notification
 * 
 * Deletes a specific notification.
 * 
 * @param notificationId - The notification ID to delete
 * @returns Promise with success status
 * 
 * @example
 * ```typescript
 * const result = await deleteNotification('677d123abc456def');
 * if (result.success) {
 *   // Remove from local state
 * }
 * ```
 */
export const deleteNotification = async (
  notificationId: string
): Promise<NotificationActionResponse> => {
  try {
    const response = await axiosCommunication.delete<NotificationActionResponse>(
      `/notifications/${notificationId}`
    );
    return response.data;
  } catch (error: any) {
    console.error('Error deleting notification:', error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to delete notification',
    };
  }
};

/**
 * Clear All Notifications
 * 
 * Deletes all notifications for a specific user.
 * 
 * @param userId - The user's ID
 * @returns Promise with success status
 * 
 * @example
 * ```typescript
 * const result = await clearAllNotifications('user123abc');
 * if (result.success) {
 *   // Clear local notification state
 * }
 * ```
 */
export const clearAllNotifications = async (
  userId: string
): Promise<NotificationActionResponse> => {
  try {
    const response = await axiosCommunication.delete<NotificationActionResponse>(
      `/notifications/delete/${userId}`
    );
    return response.data;
  } catch (error: any) {
    console.error('Error clearing all notifications:', error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to clear notifications',
    };
  }
};

// ============================================
// Export as Service Object
// ============================================

export const notificationApiService = {
  fetchUnseenNotificationCount,
  fetchNotifications,
  markAllAsSeen,
  markNotificationRead,
  deleteNotification,
  clearAllNotifications,
};

export default notificationApiService;
