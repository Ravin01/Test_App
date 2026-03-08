/**
 * Communication Notification Context
 * 
 * React Context for global notification state management with Socket.IO integration.
 * This context provides:
 * - Real-time notification count updates
 * - Notification list management
 * - Socket.IO event handling
 * - API integration for notification operations
 * 
 * Usage:
 * 1. Wrap your app with CommunicationNotificationProvider
 * 2. Use useCommunicationNotifications() hook in components
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Services
import {
  fetchUnseenNotificationCount,
  fetchNotifications,
  markAllAsSeen,
  markNotificationRead,
  deleteNotification,
  clearAllNotifications,
  Notification,
} from '../Services/notificationApiService';

// Socket
import {
  initializeCommunicationSocket,
  disconnectCommunicationSocket,
  onNewNotification,
  onNotificationCountUpdate,
  onNotificationCountIncrement,
  emitMarkAllNotificationsRead,
  emitMarkNotificationRead,
  NewNotificationPayload,
} from '../Utils/communicationSocket';

// ============================================
// Types & Interfaces
// ============================================

interface CommunicationNotificationContextValue {
  // State
  notificationCount: number;
  notifications: Notification[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  totalNotifications: number;
  isConnected: boolean;

  // Actions
  initializeSocket: (userId: string) => Promise<void>;
  disconnectSocket: () => void;
  refreshNotificationCount: () => Promise<void>;
  loadNotifications: (page?: number) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markAllNotificationsAsSeen: () => Promise<void>;
  markOneAsRead: (notificationId: string) => Promise<void>;
  deleteOne: (notificationId: string) => Promise<void>;
  clearAll: (userId: string) => Promise<void>;
  resetState: () => void;
}

interface CommunicationNotificationProviderProps {
  children: ReactNode;
}

// ============================================
// Context
// ============================================

const CommunicationNotificationContext = createContext<CommunicationNotificationContextValue | undefined>(undefined);

// ============================================
// Provider Component
// ============================================

export const CommunicationNotificationProvider: React.FC<CommunicationNotificationProviderProps> = ({
  children,
}) => {
  // State
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalNotifications, setTotalNotifications] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Refs
  const userIdRef = useRef<string | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isMountedRef = useRef<boolean>(true);

  const PAGE_LIMIT = 10;

  // ============================================
  // Socket Initialization
  // ============================================

  const initializeSocket = useCallback(async (userId: string): Promise<void> => {
    if (!userId) {
      console.warn('[NotificationContext] Cannot initialize without userId');
      return;
    }

    userIdRef.current = userId;

    try {
      // Initialize socket connection
      await initializeCommunicationSocket(userId);

      // Setup socket event listeners
      const unsubNewNotification = onNewNotification((notification: NewNotificationPayload) => {
        if (!isMountedRef.current) return;

        // Add new notification to the top of the list
        const newNotification: Notification = {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          isRead: notification.isRead,
          isNew: notification.isNew,
          link: notification.link,
          image: notification.image,
          icon: notification.icon,
          createdAt: notification.createdAt,
          senderProfile: notification.senderProfile,
          metadata: notification.metadata,
        };

        setNotifications((prev) => [newNotification, ...prev]);
        setNotificationCount((prev) => prev + 1);
        setTotalNotifications((prev) => prev + 1);
      });

      const unsubCountUpdate = onNotificationCountUpdate((count: number) => {
        if (!isMountedRef.current) return;
        setNotificationCount(count);
      });

      const unsubCountIncrement = onNotificationCountIncrement(() => {
        if (!isMountedRef.current) return;
        setNotificationCount((prev) => prev + 1);
      });

      // Store unsubscribers for cleanup
      unsubscribersRef.current = [
        unsubNewNotification,
        unsubCountUpdate,
        unsubCountIncrement,
      ];

      setIsConnected(true);

      // Fetch initial count
      const count = await fetchUnseenNotificationCount();
      if (isMountedRef.current) {
        setNotificationCount(count);
      }

      console.log('[NotificationContext] Socket initialized for user:', userId);
    } catch (error) {
      console.error('[NotificationContext] Socket initialization error:', error);
      setIsConnected(false);
    }
  }, []);

  const disconnectSocket = useCallback((): void => {
    // Unsubscribe from all events
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];

    // Disconnect socket
    disconnectCommunicationSocket();

    setIsConnected(false);
    userIdRef.current = null;

    console.log('[NotificationContext] Socket disconnected');
  }, []);

  // ============================================
  // Notification Count
  // ============================================

  const refreshNotificationCount = useCallback(async (): Promise<void> => {
    try {
      const count = await fetchUnseenNotificationCount();
      if (isMountedRef.current) {
        setNotificationCount(count);
      }
    } catch (error) {
      console.error('[NotificationContext] Error refreshing count:', error);
    }
  }, []);

  // ============================================
  // Load Notifications
  // ============================================

  const loadNotifications = useCallback(async (page: number = 1): Promise<void> => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const result = await fetchNotifications(page, PAGE_LIMIT);

      if (isMountedRef.current) {
        if (page === 1) {
          setNotifications(result.data);
        } else {
          setNotifications((prev) => [...prev, ...result.data]);
        }

        setCurrentPage(result.page);
        setTotalNotifications(result.totalNotifications);
        setHasMore(result.data.length >= PAGE_LIMIT && result.page < result.totalPages);
      }
    } catch (error) {
      console.error('[NotificationContext] Error loading notifications:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  const loadMoreNotifications = useCallback(async (): Promise<void> => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const result = await fetchNotifications(nextPage, PAGE_LIMIT);

      if (isMountedRef.current) {
        setNotifications((prev) => [...prev, ...result.data]);
        setCurrentPage(result.page);
        setHasMore(result.data.length >= PAGE_LIMIT && result.page < result.totalPages);
      }
    } catch (error) {
      console.error('[NotificationContext] Error loading more notifications:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [isLoadingMore, hasMore, currentPage]);

  // ============================================
  // Mark As Seen/Read
  // ============================================

  const markAllNotificationsAsSeen = useCallback(async (): Promise<void> => {
    try {
      await markAllAsSeen();

      // Also emit to socket
      if (userIdRef.current) {
        emitMarkAllNotificationsRead(userIdRef.current);
      }

      if (isMountedRef.current) {
        setNotificationCount(0);
        // Update local notifications to mark as seen
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isNew: false }))
        );
      }
    } catch (error) {
      console.error('[NotificationContext] Error marking all as seen:', error);
    }
  }, []);

  const markOneAsRead = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await markNotificationRead(notificationId);

      // Also emit to socket
      emitMarkNotificationRead(notificationId);

      if (isMountedRef.current) {
        // Update local notification
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, isRead: true } : n
          )
        );
      }
    } catch (error) {
      console.error('[NotificationContext] Error marking as read:', error);
    }
  }, []);

  // ============================================
  // Delete Notifications
  // ============================================

  const deleteOne = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await deleteNotification(notificationId);

      if (isMountedRef.current) {
        setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
        setTotalNotifications((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('[NotificationContext] Error deleting notification:', error);
      throw error;
    }
  }, []);

  const clearAll = useCallback(async (userId: string): Promise<void> => {
    try {
      await clearAllNotifications(userId);

      if (isMountedRef.current) {
        setNotifications([]);
        setNotificationCount(0);
        setTotalNotifications(0);
        setCurrentPage(1);
        setHasMore(false);
      }
    } catch (error) {
      console.error('[NotificationContext] Error clearing all notifications:', error);
      throw error;
    }
  }, []);

  // ============================================
  // Reset State
  // ============================================

  const resetState = useCallback((): void => {
    setNotificationCount(0);
    setNotifications([]);
    setIsLoading(false);
    setIsLoadingMore(false);
    setHasMore(true);
    setCurrentPage(1);
    setTotalNotifications(0);
    setIsConnected(false);
    disconnectSocket();
  }, [disconnectSocket]);

  // ============================================
  // App State Handling
  // ============================================

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        userIdRef.current
      ) {
        // App came to foreground - refresh count
        refreshNotificationCount();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [refreshNotificationCount]);

  // ============================================
  // Cleanup
  // ============================================

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      disconnectSocket();
    };
  }, [disconnectSocket]);

  // ============================================
  // Context Value
  // ============================================

  const value: CommunicationNotificationContextValue = {
    // State
    notificationCount,
    notifications,
    isLoading,
    isLoadingMore,
    hasMore,
    currentPage,
    totalNotifications,
    isConnected,

    // Actions
    initializeSocket,
    disconnectSocket,
    refreshNotificationCount,
    loadNotifications,
    loadMoreNotifications,
    markAllNotificationsAsSeen,
    markOneAsRead,
    deleteOne,
    clearAll,
    resetState,
  };

  return (
    <CommunicationNotificationContext.Provider value={value}>
      {children}
    </CommunicationNotificationContext.Provider>
  );
};

// ============================================
// Hook
// ============================================

/**
 * Hook to access Communication Notification Context
 * 
 * @returns CommunicationNotificationContextValue
 * @throws Error if used outside of CommunicationNotificationProvider
 * 
 * @example
 * ```typescript
 * const {
 *   notificationCount,
 *   notifications,
 *   loadNotifications,
 *   markAllNotificationsAsSeen,
 * } = useCommunicationNotifications();
 * ```
 */
export const useCommunicationNotifications = (): CommunicationNotificationContextValue => {
  const context = useContext(CommunicationNotificationContext);

  if (context === undefined) {
    throw new Error(
      'useCommunicationNotifications must be used within a CommunicationNotificationProvider'
    );
  }

  return context;
};

export default CommunicationNotificationContext;
