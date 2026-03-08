/**
 * Notification Type Declarations
 * Defines TypeScript types for notification handling
 */

// Navigation route configuration
export interface NotificationNavigationRoute {
  screen: string;
  params?: Record<string, any>;
}

// Pending notification navigation data
export interface PendingNotificationNavigation {
  route: string;
  params: Record<string, any>;
  timestamp: number;
  fromBackground: boolean;
  actionId?: string;
}

// Notification data structure from Firebase/Notifee
export interface NotificationData {
  type?: string;
  title?: string;
  body?: string;
  chatRoomId?: string;
  chatRoomID?: string;
  senderUserName?: string;
  senderName?: string;
  senderProfileURL?: string;
  icon?: string;
  image?: string;
  link?: string;
  url?: string;
  messageId?: string;
  showNotification?: string;
  metadata?: string | NotificationMetadata;
  [key: string]: any;
}

// Notification metadata structure
export interface NotificationMetadata {
  navigation?: {
    route: string;
    params?: Record<string, any>;
  };
  chatRoomId?: string;
  userName?: string;
  userId?: string;
  link?: string;
  url?: string;
  [key: string]: any;
}

// Notification types
export type NotificationType =
  | 'chat_message'
  | 'follow'
  | 'new_video'
  | 'new_product'
  | 'live_stream_start'
  | 'new_show_scheduled'
  | 'order_placed'
  | 'order_status'
  | 'order_cancelled'
  | 'seller_order_update'
  | 'approval'
  | 'seller_status'
  | 'return_requested'
  | 'return_status'
  | 'seller_broadcast'
  | 'admin_broadcast'
  | 'general';

// Notification action IDs
export type NotificationActionId =
  | 'default'
  | 'open_chat'
  | 'see_profile'
  | 'view_content'
  | 'view'
  | 'view_orders'
  | 'view_seller'
  | 'view_returns'
  | 'view_seller_profile'
  | 'view_admin_broadcast'
  | 'dismiss';

// Global type augmentation for pending navigation
declare global {
  var pendingNotificationNavigation: PendingNotificationNavigation | null;
}

export {};
