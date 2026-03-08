/**
 * Communication Backend API - Main Export File
 * 
 * This file exports all communication backend services for easy imports.
 * 
 * Base URL: https://communicationbe.onrender.com
 * 
 * Services included:
 * 1. OTP Service - Mobile number verification
 * 2. Notification API Service - User notifications management
 * 3. Seller Notification Service - Seller broadcast notifications
 * 
 * Usage:
 * ```typescript
 * import { otpService, notificationApiService, sellerNotificationService } from '../Services/communicationApi';
 * 
 * // Send OTP
 * await otpService.sendMobileOTP('+919876543210');
 * 
 * // Get notifications
 * const notifications = await notificationApiService.fetchNotifications(1, 10);
 * 
 * // Send seller broadcast
 * await sellerNotificationService.sendToAllFollowers('Title', 'Message');
 * ```
 */

// ============================================
// OTP Service Exports
// ============================================
export {
  otpService,
  sendMobileOTP,
  verifyMobileOTP,
  getMobileVerificationStatus,
  resendMobileOTP,
  // Types
  type OTPPurpose,
  type SendOTPRequest,
  type SendOTPResponse,
  type VerifyOTPRequest,
  type VerifyOTPResponse,
  type MobileStatusResponse,
  type OTPError,
} from './otpService';

// ============================================
// Notification API Service Exports
// ============================================
export {
  notificationApiService,
  fetchUnseenNotificationCount,
  fetchNotifications,
  markAllAsSeen,
  markNotificationRead,
  deleteNotification,
  clearAllNotifications,
  // Types
  type NotificationType,
  type SenderProfile,
  type NotificationMetadata,
  type Notification,
  type NotificationCountResponse,
  type NotificationListResponse,
  type NotificationActionResponse,
} from './notificationApiService';

// ============================================
// Seller Notification Service Exports
// ============================================
export {
  sellerNotificationService,
  getSellerFollowers,
  sendToSelectedFollowers,
  sendToAllFollowers,
  // Types
  type FollowerProfile,
  type Follower,
  type GetFollowersResponse,
  type SendNotificationRequest,
  type SendNotificationResponse,
} from './sellerNotificationService';

// ============================================
// Axios Communication Instance
// ============================================
export {
  default as axiosCommunication,
  clearCachedToken,
  updateCachedToken,
  type CommunicationAPIError,
} from '../Utils/axiosCommunication';

// ============================================
// Socket.IO Communication
// ============================================
export {
  communicationSocket,
  initializeCommunicationSocket,
  disconnectCommunicationSocket,
  getCommunicationSocket,
  isSocketConnected,
  requestNotificationCount,
  emitMarkAllNotificationsRead,
  emitMarkNotificationRead,
  onNewNotification,
  onNotificationCountUpdate,
  onNotificationCountIncrement,
  onSocketConnect,
  onSocketDisconnect,
  clearAllEventHandlers,
  // Types
  type NewNotificationPayload,
  type NotificationCountPayload,
  type NotificationEventHandler,
  type CountEventHandler,
  type ConnectionEventHandler,
} from '../Utils/communicationSocket';

// ============================================
// Context Exports
// ============================================
export {
  CommunicationNotificationProvider,
  useCommunicationNotifications,
  default as CommunicationNotificationContext,
} from '../Context/CommunicationNotificationContext';

// ============================================
// Default Export - All Services
// ============================================
import { otpService } from './otpService';
import { notificationApiService } from './notificationApiService';
import { sellerNotificationService } from './sellerNotificationService';
import { communicationSocket } from '../Utils/communicationSocket';

const communicationApi = {
  otp: otpService,
  notifications: notificationApiService,
  seller: sellerNotificationService,
  socket: communicationSocket,
};

export default communicationApi;
