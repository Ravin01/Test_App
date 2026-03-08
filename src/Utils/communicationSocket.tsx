/**
 * Socket.IO Client for Communication Backend
 * 
 * This module provides real-time notification updates via Socket.IO.
 * It handles connection management, authentication, and notification events.
 * 
 * Socket Server URL: https://communicationbe.onrender.com
 * 
 * Socket Events (Client → Server):
 * - request-notification-count: Request initial notification count
 * - mark-all-notifications-read: Mark all notifications as read
 * - mark-notification-read: Mark single notification as read
 * 
 * Socket Events (Server → Client):
 * - new-notification: Emitted when a new notification is created
 * - notification-count: Current unseen notification count
 * - notification-count-increment: Increment notification count by 1
 */

import { io, Socket } from 'socket.io-client';
import { CommunicationBackendUrl } from '../../Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

// ============================================
// Types & Interfaces
// ============================================

export interface NewNotificationPayload {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  isNew: boolean;
  link?: string;
  image?: string;
  icon?: string;
  createdAt: string;
  senderProfile?: {
    _id: string;
    userName: string;
    name?: string;
    profileURL?: string;
  };
  metadata?: Record<string, any>;
}

export interface NotificationCountPayload {
  count: number;
}

export type NotificationEventHandler = (notification: NewNotificationPayload) => void;
export type CountEventHandler = (count: number) => void;
export type ConnectionEventHandler = () => void;

// ============================================
// Socket Configuration
// ============================================

// Remove /api suffix from URL as Socket.IO should connect to base server URL, not API endpoint
const SOCKET_URL = CommunicationBackendUrl?.replace(/\/api\/?$/, '') || 'https://communication-server.flykup.live';

// Socket connection options
// Note: polling is more reliable for React Native, especially for Render.com backends
const SOCKET_OPTIONS = {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 3, // Reduced to prevent excessive retries
  reconnectionDelay: 3000,
  reconnectionDelayMax: 15000,
  timeout: 30000,
  transports: ['polling'], // Use polling only for Render.com (websocket often blocked/unsupported)
  upgrade: false, // Don't try to upgrade - polling is more stable
  forceNew: true,
  withCredentials: false, // Disable credentials for cross-origin
  path: '/socket.io/', // Default socket.io path
};

// Track connection failures for graceful degradation
let connectionFailureCount = 0;
const MAX_FAILURE_COUNT = 3;
let socketDisabledUntil: number | null = null;
const SOCKET_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown after max failures

/**
 * Check if socket is temporarily disabled due to failures
 */
const isSocketTemporarilyDisabled = (): boolean => {
  if (socketDisabledUntil && Date.now() < socketDisabledUntil) {
    console.log('[CommunicationSocket] Socket temporarily disabled, skipping connection');
    return true;
  }
  // Reset if cooldown expired
  if (socketDisabledUntil && Date.now() >= socketDisabledUntil) {
    socketDisabledUntil = null;
    connectionFailureCount = 0;
  }
  return false;
};

/**
 * Handle connection failure with graceful degradation
 */
const handleConnectionFailure = (): void => {
  connectionFailureCount++;
  console.log(`[CommunicationSocket] Connection failure ${connectionFailureCount}/${MAX_FAILURE_COUNT}`);
  
  if (connectionFailureCount >= MAX_FAILURE_COUNT) {
    socketDisabledUntil = Date.now() + SOCKET_COOLDOWN_MS;
    console.log(`[CommunicationSocket] Max failures reached. Socket disabled for ${SOCKET_COOLDOWN_MS / 60000} minutes`);
    
    // Disconnect to stop further retries
    if (socketInstance) {
      socketInstance.disconnect();
    }
  }
};

/**
 * Reset connection failure count on successful connection
 */
const resetConnectionFailures = (): void => {
  connectionFailureCount = 0;
  socketDisabledUntil = null;
};

// ============================================
// Socket Instance Management
// ============================================

let socketInstance: Socket | null = null;
let currentUserId: string | null = null;
let isConnecting = false;
let appStateSubscription: any = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

// Event handlers registry
const eventHandlers = {
  onNewNotification: new Set<NotificationEventHandler>(),
  onCountUpdate: new Set<CountEventHandler>(),
  onCountIncrement: new Set<CountEventHandler>(),
  onConnect: new Set<ConnectionEventHandler>(),
  onDisconnect: new Set<ConnectionEventHandler>(),
};

/**
 * Initialize and connect the socket
 * 
 * @param userId - The current user's ID for authentication
 * @returns Promise<Socket | null>
 * 
 * @example
 * ```typescript
 * const socket = await initializeCommunicationSocket(user._id);
 * ```
 */
export const initializeCommunicationSocket = async (userId: string): Promise<Socket | null> => {
  if (!userId) {
    console.warn('[CommunicationSocket] Cannot initialize without userId');
    return null;
  }

  // Check if socket is temporarily disabled due to too many failures
  if (isSocketTemporarilyDisabled()) {
    return null;
  }

  // If already connected with same user, return existing socket
  if (socketInstance?.connected && currentUserId === userId) {
    console.log('[CommunicationSocket] Already connected');
    return socketInstance;
  }

  // If currently connecting, wait
  if (isConnecting) {
    console.log('[CommunicationSocket] Connection in progress...');
    return socketInstance;
  }

  isConnecting = true;

  try {
    // Disconnect existing socket if different user
    if (socketInstance && currentUserId !== userId) {
      disconnectCommunicationSocket();
    }

    // Get access token for authentication
    const accessToken = await AsyncStorage.getItem('accessToken');

    // Create new socket instance
    socketInstance = io(SOCKET_URL, {
      ...SOCKET_OPTIONS,
      auth: {
        userId,
        token: accessToken,
      },
    });

    currentUserId = userId;

    // Setup event listeners
    setupSocketEventListeners();

    // Setup app state monitoring
    setupAppStateMonitoring();

    // Connect
    socketInstance.connect();

    console.log('[CommunicationSocket] Initialized for user:', userId);
    return socketInstance;
  } catch (error) {
    console.error('[CommunicationSocket] Initialization error:', error);
    return null;
  } finally {
    isConnecting = false;
  }
};

/**
 * Setup socket event listeners
 */
const setupSocketEventListeners = (): void => {
  if (!socketInstance) return;

  // Connection events
  socketInstance.on('connect', () => {
    console.log('[CommunicationSocket] Connected');
    // Reset failure count on successful connection
    resetConnectionFailures();
    eventHandlers.onConnect.forEach((handler) => handler());

    // Request initial notification count
    if (currentUserId) {
      requestNotificationCount(currentUserId);
    }
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[CommunicationSocket] Disconnected:', reason);
    eventHandlers.onDisconnect.forEach((handler) => handler());

    // Auto-reconnect on unexpected disconnections
    if (reason === 'io server disconnect' || reason === 'transport close') {
      scheduleReconnect();
    }
  });

  socketInstance.on('connect_error', (error) => {
    // console.error('[CommunicationSocket] Connection error:', error.message);
    // Track connection failure for graceful degradation
    handleConnectionFailure();
  });

  // Notification events
  socketInstance.on('new-notification', (notification: NewNotificationPayload) => {
    console.log('[CommunicationSocket] New notification received:', notification.type);
    eventHandlers.onNewNotification.forEach((handler) => handler(notification));
  });

  socketInstance.on('notification-count', (count: number) => {
    console.log('[CommunicationSocket] Notification count:', count);
    eventHandlers.onCountUpdate.forEach((handler) => handler(count));
  });

  socketInstance.on('notification-count-increment', () => {
    console.log('[CommunicationSocket] Notification count increment');
    eventHandlers.onCountIncrement.forEach((handler) => handler(1));
  });
};

/**
 * Setup app state monitoring for connection management
 */
const setupAppStateMonitoring = (): void => {
  if (appStateSubscription) {
    appStateSubscription.remove();
  }

  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
};

/**
 * Handle app state changes
 */
const handleAppStateChange = (nextAppState: AppStateStatus): void => {
  if (nextAppState === 'active') {
    // App came to foreground - reconnect if needed
    if (socketInstance && !socketInstance.connected && currentUserId) {
      console.log('[CommunicationSocket] App active, reconnecting...');
      socketInstance.connect();
    }
  } else if (nextAppState === 'background') {
    // App went to background - socket will maintain connection
    // React Native's socket.io should handle this automatically
    console.log('[CommunicationSocket] App in background');
  }
};

/**
 * Schedule reconnection attempt
 */
const scheduleReconnect = (): void => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  reconnectTimeout = setTimeout(() => {
    if (socketInstance && !socketInstance.connected && currentUserId) {
      console.log('[CommunicationSocket] Attempting reconnection...');
      socketInstance.connect();
    }
  }, 3000);
};

/**
 * Disconnect the socket
 */
export const disconnectCommunicationSocket = (): void => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }

  currentUserId = null;
  isConnecting = false;

  console.log('[CommunicationSocket] Disconnected and cleaned up');
};

/**
 * Get current socket instance
 */
export const getCommunicationSocket = (): Socket | null => {
  return socketInstance;
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = (): boolean => {
  return socketInstance?.connected ?? false;
};

// ============================================
// Socket Event Emitters (Client → Server)
// ============================================

/**
 * Request initial notification count from server
 * 
 * @param userId - The user's ID
 */
export const requestNotificationCount = (userId: string): void => {
  if (socketInstance?.connected) {
    socketInstance.emit('request-notification-count', userId);
    console.log('[CommunicationSocket] Requested notification count');
  }
};

/**
 * Mark all notifications as read
 * 
 * @param userId - The user's ID
 */
export const emitMarkAllNotificationsRead = (userId: string): void => {
  if (socketInstance?.connected) {
    socketInstance.emit('mark-all-notifications-read', userId);
    console.log('[CommunicationSocket] Emitted mark all notifications read');
  }
};

/**
 * Mark single notification as read
 * 
 * @param notificationId - The notification ID
 */
export const emitMarkNotificationRead = (notificationId: string): void => {
  if (socketInstance?.connected) {
    socketInstance.emit('mark-notification-read', notificationId);
    console.log('[CommunicationSocket] Emitted mark notification read:', notificationId);
  }
};

// ============================================
// Event Handler Registration
// ============================================

/**
 * Subscribe to new notification events
 * 
 * @param handler - Callback function for new notifications
 * @returns Unsubscribe function
 */
export const onNewNotification = (handler: NotificationEventHandler): (() => void) => {
  eventHandlers.onNewNotification.add(handler);
  return () => eventHandlers.onNewNotification.delete(handler);
};

/**
 * Subscribe to notification count updates
 * 
 * @param handler - Callback function for count updates
 * @returns Unsubscribe function
 */
export const onNotificationCountUpdate = (handler: CountEventHandler): (() => void) => {
  eventHandlers.onCountUpdate.add(handler);
  return () => eventHandlers.onCountUpdate.delete(handler);
};

/**
 * Subscribe to notification count increment events
 * 
 * @param handler - Callback function for count increment
 * @returns Unsubscribe function
 */
export const onNotificationCountIncrement = (handler: CountEventHandler): (() => void) => {
  eventHandlers.onCountIncrement.add(handler);
  return () => eventHandlers.onCountIncrement.delete(handler);
};

/**
 * Subscribe to connection events
 * 
 * @param handler - Callback function for connection
 * @returns Unsubscribe function
 */
export const onSocketConnect = (handler: ConnectionEventHandler): (() => void) => {
  eventHandlers.onConnect.add(handler);
  return () => eventHandlers.onConnect.delete(handler);
};

/**
 * Subscribe to disconnection events
 * 
 * @param handler - Callback function for disconnection
 * @returns Unsubscribe function
 */
export const onSocketDisconnect = (handler: ConnectionEventHandler): (() => void) => {
  eventHandlers.onDisconnect.add(handler);
  return () => eventHandlers.onDisconnect.delete(handler);
};

/**
 * Clear all event handlers
 */
export const clearAllEventHandlers = (): void => {
  eventHandlers.onNewNotification.clear();
  eventHandlers.onCountUpdate.clear();
  eventHandlers.onCountIncrement.clear();
  eventHandlers.onConnect.clear();
  eventHandlers.onDisconnect.clear();
};

// ============================================
// Export as Service Object
// ============================================

export const communicationSocket = {
  initialize: initializeCommunicationSocket,
  disconnect: disconnectCommunicationSocket,
  getSocket: getCommunicationSocket,
  isConnected: isSocketConnected,
  requestNotificationCount,
  emitMarkAllNotificationsRead,
  emitMarkNotificationRead,
  onNewNotification,
  onNotificationCountUpdate,
  onNotificationCountIncrement,
  onSocketConnect,
  onSocketDisconnect,
  clearAllEventHandlers,
};

export default communicationSocket;
