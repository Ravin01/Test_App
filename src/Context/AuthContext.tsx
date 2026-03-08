import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import api from '../Utils/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastAndroid, Linking } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import crashlytics from '@react-native-firebase/crashlytics';
import { Platform } from 'react-native';
import { checkPermission } from '../Utils/Permission';
import axiosInstance from '../Utils/Api';
import DeviceInfo from 'react-native-device-info';
import { getLocales, getTimeZone } from 'react-native-localize';
import { socketurl } from '../../Config';
import { io } from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';
import Snackbar from 'react-native-snackbar';
import axiosCommunication from '../Utils/axiosCommunication';
// Communication socket imports for real-time notifications
import {
  initializeCommunicationSocket,
  disconnectCommunicationSocket,
  onNewNotification,
  onNotificationCountUpdate,
  onNotificationCountIncrement,
  clearAllEventHandlers,
} from '../Utils/communicationSocket';
// Clarity Analytics
//import * as Clarity from '@microsoft/react-native-clarity';

export const AuthContext = createContext<any>(null);

// ✅ OPTIMIZATION: Create socket lazily, don't connect immediately
// Main socket for general app features
let socket = null;

// Store unsubscribers for communication socket events
let communicationSocketUnsubscribers: Array<() => void> = [];

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setuser] = useState<any>();
  const [sellerDetail, setSellerDetail] = useState({});
  const [_keys, _setkeys] = useState({});
  const [categories, setCategories] = useState([
    { categoryName: 'No Data Found' },
  ]);

  const [notifyCount, setNotifyCount] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialRoute, setInitialRoute] = useState<any>(null);
  const [internetConnected, setInternetConnected] = useState(true);

  // ✅ NEW: Track if force update has been detected to prevent re-initialization from overriding it
  const forceUpdateDetected = useRef(false);

  // ✅ OPTIMIZATION: Create main socket connection function (for general app features)
  const initializeMainSocket = useCallback(() => {
    if (!socket) {
      socket = io(socketurl, {
        transports: ['websocket'],
        autoConnect: false, // Don't connect automatically
      });
    }
  }, []);

  // ✅ OPTIMIZATION: Socket connection is now manual, called after initialization
  // This now uses both the main socket AND the communication socket for notifications
  const connectSocket = useCallback(async () => {
    if (!user || !user._id) {
      setNotifyCount(0);
      return;
    }

    // ===== COMMUNICATION SOCKET (Notifications) - SAME AS WEB APP =====
    // Clean up previous communication socket subscriptions
    if (communicationSocketUnsubscribers.length > 0) {
      console.log('🧹 [COMMUNICATION SOCKET] Cleaning up previous subscriptions');
      communicationSocketUnsubscribers.forEach(unsub => unsub());
      communicationSocketUnsubscribers = [];
    }
    clearAllEventHandlers();

    try {
      // Initialize communication socket for notifications
      console.log('🔌 [COMMUNICATION SOCKET] Connecting for user:', user._id);
      await initializeCommunicationSocket(user._id);

      // Subscribe to notification events from communication backend
      const unsubNewNotification = onNewNotification((notification) => {
        console.log('🔔 [COMMUNICATION SOCKET] New notification received:', notification?.type);
        setNotifyCount(prev => {
          const newCount = prev + 1;
          console.log('📊 [COUNT UPDATE] Previous:', prev, '→ New:', newCount);
          return newCount;
        });
      });

      const unsubCountUpdate = onNotificationCountUpdate((count) => {
        console.log('📊 [COMMUNICATION SOCKET] Notification count received from server:', count);
        setNotifyCount(count);
      });

      const unsubCountIncrement = onNotificationCountIncrement(() => {
        console.log('➕ [COMMUNICATION SOCKET] Notification count incremented');
        setNotifyCount(prev => prev + 1);
      });

      // Store unsubscribers for cleanup
      communicationSocketUnsubscribers = [
        unsubNewNotification,
        unsubCountUpdate,
        unsubCountIncrement,
      ];

      console.log('✅ [COMMUNICATION SOCKET] Initialized successfully');
    } catch (error) {
      console.error('❌ [COMMUNICATION SOCKET] Error initializing:', error);
      // Fallback to REST API for notification count
      console.log('🔄 [COMMUNICATION SOCKET] Falling back to REST API for count');
      fetchCount();
    }

    // ===== MAIN SOCKET (Other app features) =====
    initializeMainSocket();

    if (!socket) return;

    // Connect main socket with user authentication
    socket.auth = { userId: user._id };
    if (!socket.connected) {
      socket.connect();
    }

    const handleNewNotification = (_notification: any) => {
      // This is a fallback - communication socket should handle this
      console.log('🔔 [MAIN SOCKET] Fallback notification received');
    };

    const handleNotificationCount = (count: number) => {
      console.log('📊 [MAIN SOCKET] Fallback notification count:', count);
      setNotifyCount(count);
    };

    const handleNotificationCountIncrement = () => {
      console.log('➕ [MAIN SOCKET] Fallback count increment');
      setNotifyCount(prev => prev + 1);
    };

    // Set up event listeners on main socket (as fallback)
    socket.on('new-notification', handleNewNotification);
    socket.on('notification-count', handleNotificationCount);
    socket.on('notification-count-increment', handleNotificationCountIncrement);

    // Request initial count from main socket (fallback)
    socket.emit('request-notification-count', user._id);

    // Return cleanup function for main socket
    return () => {
      socket.off('new-notification', handleNewNotification);
      socket.off('notification-count', handleNotificationCount);
      socket.off(
        'notification-count-increment',
        handleNotificationCountIncrement,
      );
    };
  }, [user, initializeMainSocket]);

  const fetchCategories = async () => {
    try {
      const categoryResponse = await api.get('/categories/get');
      setCategories(categoryResponse.data);
      // console.log(categoryResponse.data)
    } catch (err) {
      console.log('Failed to fetch categories & products', err);
    }
  };
  const fetchuser = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      // console.log(accessToken)
      if (!accessToken) {
        setuser(null);
        return;
      }

      const res = await api.get('/auth/me');
      const userData = res.data.data;
      // console.log(res.data,"conttext")
      if (userData?.role == 'seller') await fetchSellerDetail();
      setuser(userData);

      console.log('userData', userData);

      // ✅ Crashlytics: Set user ID for crash tracking after user is authenticated
      if (userData?.userName) {
        try {
          await crashlytics().setUserId(String(userData?.userName));
          console.log('✅ Crashlytics: User ID set:', userData?.userName);
        } catch (crashlyticsError) {
          console.log('❌ Crashlytics: Error setting user ID:', crashlyticsError);
        }
      }

      // ✅ Clarity Analytics: Set custom user ID ONLY in release mode after user is authenticated
      // if (!__DEV__ && userData?.userName) {
      //   try {
      //     const success = await Clarity.setCustomUserId(userData?.userName);
      //     console.log('✅ Clarity: Custom User ID set:', success);
      //   } catch (err) {
      //     console.log('❌ Clarity error:', err);
      //   }
      // }

      // Save seller ID if available
      const sellerId = userData?.sellerInfo?._id;
      if (sellerId) {
        await AsyncStorage.setItem('sellerId', sellerId);
      }

      // Fetch additional user data after user is loaded
      await Promise.all([fetchCount(), fetcAddressData()]);

      //   await axiosInstance.put("/user/me/app-info", {
      //   appPlatform: Platform.OS, // or "ios" / "web"
      //   appVersion: DeviceInfo.getVersion()
      // });
    } catch (error) {
      // Only clear tokens on 401 (Unauthorized) errors
      // Network errors should not trigger logout
      if (error?.response?.status === 401) {
        ToastAndroid.show(
          'Session expired. Please login again.',
          ToastAndroid.SHORT,
        );
        // Clear tokens only on authentication failure
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        setuser(null);
      } else {
        // For network errors or other issues, just log but keep tokens
        console.log(
          'Error fetching user (tokens preserved):',
          error?.message || error,
        );
        // Don't clear tokens or user state on network errors
      }
    }
  };
  const fetchSellerDetail = async () => {
    try {
      const response = await axiosInstance.get(`/seller/details`);
      // console.log(response.data.data)
      setSellerDetail(response.data.data);
    } catch (err) {
      console.log('error from seller detail', err);
    }
  };
  // Function to get FCM token and request permission
  const getFcmTokenAndRequestPermission = async () => {
    try {
      // console.log('🔔 Starting notification permission and FCM token setup...');

      // Request permission on iOS, Android permissions are handled automatically for older versions
      if (Platform.OS === 'ios') {
        const permissionStatus = await messaging().requestPermission();
        if (
          permissionStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          permissionStatus === messaging.AuthorizationStatus.PROVISIONAL
        ) {
          // console.log('✅ iOS notification permission granted');
        } else {
          // console.log('❌ iOS notification permission denied');
          return;
        }
      } else if (Platform.OS === 'android') {
        // Android 13+ requires explicit runtime permission
        const androidVersion = Platform.Version;
        if (androidVersion >= 33) {
          // console.log('📱 Android 13+: Requesting POST_NOTIFICATIONS permission');
          await checkPermission('notification');
        } else {
          // console.log('📱 Android <13: Notifications enabled by default');
        }
      }

      // Get FCM token
      const fcmToken = await messaging().getToken();

      if (fcmToken) {
        // console.log('✅ FCM Token obtained',fcmToken);
        await sendTokenToBackend(fcmToken);
        // } else {
        // console.log('❌ No FCM token found');
      }

      // Set up token refresh listener
      const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
        // console.log('🔄 FCM Token refreshed');
        await sendTokenToBackend(newToken);
      });

      return unsubscribe;
    } catch (error) {
      console.log('❌ Error in notification setup:', error?.message || error);
    }
  };
  // Get or create device ID
  const getOrCreateDeviceId = async () => {
    try {
      let deviceId = await AsyncStorage.getItem('deviceId');

      if (!deviceId) {
        // Gather device and system info
        const brand = DeviceInfo.getBrand(); // e.g., "Apple" or "Samsung"
        const systemName = DeviceInfo.getSystemName(); // e.g., "iOS" or "Android"
        const systemVersion = DeviceInfo.getSystemVersion(); // e.g., "16.5"
        const uniqueId = DeviceInfo.getUniqueId(); // device-specific unique ID
        const language = getLocales()[0]?.languageTag || 'unknown';
        const timezone = getTimeZone();

        // Create a fingerprint string
        const fingerprint = `${brand}-${systemName}-${systemVersion}-${uniqueId}-${language}-${timezone}`;

        // Simple hash function
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
          const char = fingerprint.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash; // 32-bit integer
        }

        // Add random + timestamp to reduce collisions
        const randomComponent = Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now().toString(36);

        // Final device ID
        deviceId = `app_${Math.abs(hash).toString(
          36,
        )}_${randomComponent}_${timestamp}`;

        // Save in AsyncStorage for persistence
        await AsyncStorage.setItem('deviceId', deviceId);
      }

      return deviceId;
    } catch (error) {
      console.error('Error generating deviceId:', error);
      return null;
    }
  };

  const sendTokenToBackend = async token => {
    try {
      const accesstoken = await AsyncStorage.getItem('accessToken');
      if (!accesstoken) {
        // console.log('⚠️ No access token, skipping FCM token update');
        return;
      }
      const OS = Platform.OS;
      const deviceId = await getOrCreateDeviceId();

      // Check if token has changed to avoid unnecessary backend calls
      const storedToken = await AsyncStorage.getItem('fcmToken');
      if (storedToken === token) {
        // console.log('ℹ️ FCM token unchanged, skipping update');
        return;
      }

      // console.log('📤 Sending FCM token to backend');

      await api.post('/user/me/update-fcm-token', {
        fcmToken: token,
        deviceId: deviceId,
        platform: OS,
      });

      // Store the token locally after successful update
      await AsyncStorage.setItem('fcmToken', token);
      await AsyncStorage.setItem('updated', 'true');

      if (!selectedAddress) {
        fetcAddressData();
      }

      // console.log('✅ FCM token updated successfully');
    } catch (error) {
      console.log('❌ Error sending token to backend:', error?.response?.data || error.message);
    }
  };

  const fetchCount = async () => {
    try {
      const response = await axiosCommunication.get(`/notifications/count`);
      console.log(response.data, "===notification count response===");
      setNotifyCount(response.data.unseenCount);
    } catch (err) {
      console.log(err.response.data);
    }
  };

  // ✅ Version check is now handled in App.tsx to prevent duplicate update screens
  // App.tsx checks for updates BEFORE showing the app, and passes results via AsyncStorage

  // ✅ OPTIMIZED: Fast startup with proper auth state check
  useEffect(() => {
    let networkUnsubscribe: any;
    let wasDisconnected = false;

    // ✅ CRITICAL FIX: If force update was already detected, don't re-initialize
    if (forceUpdateDetected.current) {
      // console.log('⚠️ Force update detected - skipping re-initialization');
      return;
    }

    // ✅ Check auth state BEFORE showing UI (prevents login flash)
    const initializeApp = async () => {
      try {
        // console.log("INITIALIZING AUTHCONTEXT - START");

        // Always fetch categories (public data, no auth needed)
        await fetchCategories();
        // console.log("Categories fetched");

        // ✅ CHECK FOR PENDING FORCE UPDATE FROM App.tsx
        // App.tsx now handles the primary update check to prevent duplicate screens
        let updateRoute = null;

        try {
          // Check if App.tsx already detected a force update
          const pendingForceUpdate = await AsyncStorage.getItem('pending_force_update');

          if (pendingForceUpdate) {
            console.log('📦 Pending force update found from App.tsx');
            const updateParams = JSON.parse(pendingForceUpdate);

            // Clear the pending flag
            await AsyncStorage.removeItem('pending_force_update');

            updateRoute = {
              screen: 'update',
              params: updateParams,
            };

            // ✅ CRITICAL FIX: Mark that force update has been detected
            forceUpdateDetected.current = true;

            // ✅ CRITICAL: For force updates, ONLY set the update route and return
            setInitialRoute(updateRoute);
            setIsInitialized(true);
            console.log('✅ Initialization complete - update screen set from App.tsx flag');

            // ✅ Force return to prevent any further initialization
            return;
          }

          // If no pending update from App.tsx, skip duplicate version check
          // App.tsx has already performed the check
          console.log('✅ No pending force update, proceeding with normal startup');

        } catch (error) {
          console.log('❌ Error checking pending force update:', error);
          // Don't block app startup on errors
        }

        // Quick check for token (AsyncStorage is fast on modern devices)
        const accessToken = await AsyncStorage.getItem('accessToken');

        // 🔗 CHECK FOR DEEP LINK BEFORE SETTING INITIAL ROUTE
        let initialUrl: string | null = null;
        try {
          initialUrl = await Linking.getInitialURL();
          // console.log('🔗 Initial URL:', initialUrl);
        } catch (linkError: any) {
          console.log('⚠️ Linking: Failed to get initial URL (likely multiple awaits):', linkError?.message || linkError);
          // Default to null on failure to allow initialization to continue
          initialUrl = null;
        }

        // Set initial route based on token presence
        if (accessToken) {
          // console.log("✅ Access token found, setting up main app");

          // 🔗 If deep link exists, DON'T override with bottomtabbar
          // Let React Navigation handle the deep link naturally
          if (!initialUrl) {
            // console.log('📍 Setting initial route to bottomtabbar');
            setInitialRoute({ screen: 'bottomtabbar' });
          } else {
            // console.log('🔗 Deep link detected, letting React Navigation handle it');
            // Don't set initialRoute - let linking config handle it
            setInitialRoute(null);
          }

          // UI shows dashboard now, fetch data in background
          setIsInitialized(true);
          // console.log('✅ Initialization complete - app ready');

          // Fetch user data (which now also fetches count and address)
          await fetchuser();

          // Setup notifications after data loaded
          getFcmTokenAndRequestPermission();
          // console.log("INITIALIZING AUTHCONTEXT - COMPLETED");
        } else {
          // console.log("📍 No access token, setting initial route to WelcomeScreen");
          // No token - show welcome screen (unless deep link requires auth)
          setInitialRoute({ screen: 'WelcomeScreen' });
          setIsInitialized(true);
          // console.log('✅ Initialization complete - showing welcome screen');
        }
      } catch (error) {
        console.log('Error initializing app:', error);
        // On error, show welcome screen
        setInitialRoute({ screen: 'WelcomeScreen' });
        setIsInitialized(true);
      }
    };

    // Initialize app with auth check
    initializeApp();

    // Setup network monitoring (background)
    const setupNetwork = () => {
      networkUnsubscribe = NetInfo.addEventListener(state => {
        const isConnected = state.isConnected ?? true;

        setInternetConnected(prevState => {
          if (prevState === isConnected) return prevState;

          if (!isConnected) {
            wasDisconnected = true;
            Snackbar.show({
              text: 'No Internet Connection',
              backgroundColor: 'red',
            });
          } else if (wasDisconnected) {
            Snackbar.dismiss();
            setTimeout(() => {
              Snackbar.show({
                text: 'Back Online',
                backgroundColor: 'green',
                duration: Snackbar.LENGTH_SHORT,
              });
            }, 250);
          }

          return isConnected;
        });
      });

      // Initial network check (background)
      NetInfo.fetch().then(netState => {
        setInternetConnected(netState.isConnected ?? true);
      });
    };

    // Setup network monitoring (runs independently)
    setupNetwork();

    return () => {
      if (networkUnsubscribe) {
        networkUnsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const fetcAddressData = async () => {
    console.log('📍 [FETCH_ADDRESS] Starting to fetch address data...');
    try {
      const response = await axiosInstance.get('/user/addresses');
      const addresses = response.data.data || [];

      console.log('📍 [FETCH_ADDRESS] API Response - Total addresses found:', addresses.length);
      console.log('📍 [FETCH_ADDRESS] Addresses:', JSON.stringify(addresses.map(a => ({
        id: a._id,
        name: a.name,
        city: a.city,
        isDefault: a.isDefault
      })), null, 2));

      // Find default address first, otherwise use first available address
      const defaultAddress = addresses.find(addr => addr.isDefault);

      if (defaultAddress) {
        console.log('📍 [FETCH_ADDRESS] Found default address:', defaultAddress.name, '-', defaultAddress.city);
        setSelectedAddress(defaultAddress);
      } else if (addresses.length > 0) {
        // If no default address, use the first address
        console.log('📍 [FETCH_ADDRESS] No default address, using first address:', addresses[0].name, '-', addresses[0].city);
        setSelectedAddress(addresses[0]);
      } else {
        // No addresses found - explicitly set to null
        console.log('📍 [FETCH_ADDRESS] No addresses found - setting selectedAddress to null');
        setSelectedAddress(null);
      }
    } catch (error) {
      console.log('❌ [FETCH_ADDRESS] Error fetching address data:', error?.response?.data || error?.message || error);
      // On error, reset address to null to avoid stale data
      setSelectedAddress(null);
    }
  };

  // ✅ Comprehensive logout function that clears all user data
  const logout = async () => {
    try {
      // Get device ID before clearing
      const deviceId = await getOrCreateDeviceId();

      // 1. Delete FCM token from Firebase
      try {
        await messaging().deleteToken();
        // console.log('✅ FCM token deleted from Firebase');
      } catch (tokenError) {
        console.log('⚠️ Error deleting FCM token:', tokenError);
      }

      // 2. Notify backend about logout (to remove FCM token)
      try {
        if (deviceId) {
          await api.post('/auth/logout', { deviceId });
          // console.log('✅ Backend notified of logout');
        }
      } catch (backendError) {
        console.log('⚠️ Error notifying backend:', backendError);
      }

      // 3. Disconnect sockets if connected
      // Disconnect main socket
      if (socket && socket.connected) {
        socket.disconnect();
      }

      // Disconnect communication socket and cleanup subscriptions
      if (communicationSocketUnsubscribers.length > 0) {
        communicationSocketUnsubscribers.forEach(unsub => unsub());
        communicationSocketUnsubscribers = [];
      }
      disconnectCommunicationSocket();
      // console.log('✅ Communication socket disconnected');

      // 4. Clear all user-related state
      setuser(null);
      setSellerDetail({});
      setNotifyCount(0);
      setSelectedAddress(null); // Use null instead of empty string for clearer "no address" state

      // 5. Clear AsyncStorage tokens and data
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('sellerId');
      await AsyncStorage.removeItem('updated');
      await AsyncStorage.removeItem('fcmToken');

      // console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }
  };

  // ✅ Function to reinitialize context after login
  const reinitialize = async () => {
    console.log('🔄 [REINITIALIZE] Starting context reinitialization after login...');

    // Clear stale notification count and seller details first
    // Note: Don't clear selectedAddress here - it will be overwritten by fetcAddressData
    console.log('🧹 [REINITIALIZE] Clearing stale notification count and seller details');
    setNotifyCount(0);
    setSellerDetail({});

    // Fetch fresh user data
    console.log('👤 [REINITIALIZE] Fetching fresh user data...');
    await fetchuser();
    console.log('✅ [REINITIALIZE] User data fetched successfully');

    // ✅ CRITICAL: Explicitly fetch address data after login to ensure it's loaded
    // This is needed because the Promise.all in fetchuser might have timing issues
    // and the new user's address data needs to be fetched fresh
    console.log('📍 [REINITIALIZE] Fetching address data explicitly...');
    await fetcAddressData();
    console.log('✅ [REINITIALIZE] Address data fetched - Current selectedAddress:', selectedAddress);

    console.log('🎉 [REINITIALIZE] Context reinitialization complete!');
  };

  // ✅ NEW: Pending action storage for deeplinks and authentication flow
  const storePendingAction = async (actionData: {
    screen: string;
    params: any;
    action?: string;
    timestamp?: number;
  }) => {
    try {
      const pendingAction = {
        ...actionData,
        timestamp: actionData.timestamp || Date.now(),
      };
      await AsyncStorage.setItem('pendingAction', JSON.stringify(pendingAction));
      // console.log('📦 Stored pending action:', pendingAction);
    } catch (error) {
      console.log('❌ Error storing pending action:', error);
    }
  };

  const getPendingAction = async () => {
    try {
      const pendingActionStr = await AsyncStorage.getItem('pendingAction');
      if (!pendingActionStr) return null;

      const pendingAction = JSON.parse(pendingActionStr);

      // Check if action is stale (older than 30 minutes)
      const thirtyMinutes = 30 * 60 * 1000;
      if (Date.now() - pendingAction.timestamp > thirtyMinutes) {
        // console.log('⏰ Pending action expired, clearing...');
        await clearPendingAction();
        return null;
      }

      return pendingAction;
    } catch (error) {
      console.log('❌ Error getting pending action:', error);
      return null;
    }
  };

  const clearPendingAction = async () => {
    try {
      await AsyncStorage.removeItem('pendingAction');
      // console.log('🗑️ Cleared pending action');
    } catch (error) {
      console.log('❌ Error clearing pending action:', error);
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        categories,
        fetchuser,
        setuser,
        fetchCount,
        getFcmTokenAndRequestPermission,
        notifyCount,
        sellerDetail,
        fetcAddressData,
        setSelectedAddress,
        selectedAddress,
        isInitialized,
        initialRoute,
        internetConnected,
        connectSocket,
        logout,
        reinitialize,
        fetchCategories,
        storePendingAction,
        getPendingAction,
        clearPendingAction,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
