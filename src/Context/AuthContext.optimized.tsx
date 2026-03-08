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
import {ToastAndroid, AppState} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import {checkPermission} from '../Utils/Permission';
import axiosInstance from '../Utils/Api';
import DeviceInfo from 'react-native-device-info';
import {getLocales, getTimeZone} from 'react-native-localize';
import {socketurl, backendurl} from '../../Config';
import {io} from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';
import Snackbar from 'react-native-snackbar';
import axios from 'axios';

export const AuthContext = createContext<any>(null);

// ✅ OPTIMIZATION: Create socket lazily, don't connect immediately
let socket = null;

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({children}) => {
  const [user, setuser] = useState<any>();
  const [sellerDetail, setSellerDetail] = useState({});
  const [_keys, _setkeys] = useState({});
  const [categories, setCategories] = useState([
    {categoryName: 'No Data Found'},
  ]);

  const [notifyCount, setNotifyCount] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialRoute, setInitialRoute] = useState<any>(null);
  const [internetConnected, setInternetConnected] = useState(true);
  const [shouldRefetch, setShouldRefetch] = useState(0);
  
  // ✅ OPTIMIZATION: Track app state for socket and network management
  const appStateRef = useRef(AppState.currentState);
  const socketCleanupRef = useRef<(() => void) | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationCountDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const versionCheckCacheRef = useRef<{result: any; timestamp: number} | null>(null);
  const networkDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ OPTIMIZATION: Create socket connection function with better config
  const initializeSocket = useCallback(() => {
    if (!socket) {
      socket = io(socketurl, {
        transports: ['websocket'],
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 5000, // Wait 5s before reconnecting
        reconnectionAttempts: 5, // Limit reconnection attempts
        timeout: 10000, // 10s connection timeout
      });

      // ✅ Add connection error handling
      socket.on('connect_error', (error) => {
        console.log('🔴 Socket connection error:', error.message);
      });

      socket.on('connect', () => {
        console.log('✅ Socket connected');
      });

      socket.on('disconnect', (reason) => {
        console.log('🔴 Socket disconnected:', reason);
      });
    }
  }, []);

  // ✅ OPTIMIZATION: Disconnect socket when app goes to background
  const disconnectSocket = useCallback(() => {
    if (socket && socket.connected) {
      console.log('🔌 Disconnecting socket (background mode)');
      socket.disconnect();
    }
    
    // Clean up cleanup function
    if (socketCleanupRef.current) {
      socketCleanupRef.current();
      socketCleanupRef.current = null;
    }

    // Clear any pending reconnect timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // ✅ OPTIMIZATION: Debounced notification count update
  const updateNotificationCount = useCallback((count: number) => {
    if (notificationCountDebounceRef.current) {
      clearTimeout(notificationCountDebounceRef.current);
    }

    notificationCountDebounceRef.current = setTimeout(() => {
      setNotifyCount(count);
    }, 300); // Debounce by 300ms
  }, []);

  // ✅ OPTIMIZATION: Socket connection is now manual with app state awareness
  const connectSocket = useCallback(() => {
    // Don't connect if app is in background
    if (appStateRef.current !== 'active') {
      console.log('⏸️ Skipping socket connection (app not active)');
      return;
    }

    if (!user || !user._id) {
      setNotifyCount(0);
      return;
    }

    initializeSocket();

    if (!socket) return;

    // Disconnect before reconnecting
    if (socket.connected) {
      socket.disconnect();
    }

    // Connect socket with user authentication
    socket.auth = {userId: user._id};
    socket.connect();

    const handleNewNotification = (_notification: any) => {
      // Notification handled elsewhere, just keep count synced
      updateNotificationCount(notifyCount + 1);
    };

    const handleNotificationCount = (count: number) => {
      updateNotificationCount(count);
    };

    const handleNotificationCountIncrement = () => {
      updateNotificationCount(notifyCount + 1);
    };

    // Set up event listeners
    socket.on('new-notification', handleNewNotification);
    socket.on('notification-count', handleNotificationCount);
    socket.on('notification-count-increment', handleNotificationCountIncrement);

    // Request initial count (debounced)
    setTimeout(() => {
      if (socket && socket.connected) {
        socket.emit('request-notification-count', user._id);
      }
    }, 1000);

    // Store cleanup function
    socketCleanupRef.current = () => {
      if (socket) {
        socket.off('new-notification', handleNewNotification);
        socket.off('notification-count', handleNotificationCount);
        socket.off('notification-count-increment', handleNotificationCountIncrement);
      }
    };

    return socketCleanupRef.current;
  }, [user, initializeSocket, updateNotificationCount, notifyCount]);

  const fetchCategories = async () => {
    try {
      const categoryResponse = await api.get('/categories/get');
      setCategories(categoryResponse.data);
    } catch (err) {
      console.log('Failed to fetch categories & products', err);
    }
  };

  const fetchuser = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) {
        setuser(null);
        return;
      }

      const res = await api.get('/auth/me');
      const userData = res.data.data;
      if (userData.role == 'seller') await fetchSellerDetail();
      setuser(userData);

      const sellerId = userData?.sellerInfo?._id;
      if (sellerId) {
        await AsyncStorage.setItem('sellerId', sellerId);
      }

      await Promise.all([fetchCount(), fetcAddressData()]);
    } catch (error) {
      if (error?.response?.status === 401) {
        ToastAndroid.show(
          'Session expired. Please login again.',
          ToastAndroid.SHORT,
        );
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        setuser(null);
      } else {
        console.log(
          'Error fetching user (tokens preserved):',
          error?.message || error,
        );
      }
    }
  };

  const fetchSellerDetail = async () => {
    try {
      const response = await axiosInstance.get(`/seller/details`);
      setSellerDetail(response.data.data);
    } catch (err) {
      console.log('error from seller detail', err);
    }
  };

  const getFcmTokenAndRequestPermission = async () => {
    try {
      console.log('🔔 Starting notification permission and FCM token setup...');
      
      if (Platform.OS === 'ios') {
        const permissionStatus = await messaging().requestPermission();
        if (
          permissionStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          permissionStatus === messaging.AuthorizationStatus.PROVISIONAL
        ) {
          console.log('✅ iOS notification permission granted');
        } else {
          console.log('❌ iOS notification permission denied');
          return;
        }
      } else if (Platform.OS === 'android') {
        const androidVersion = Platform.Version;
        if (androidVersion >= 33) {
          console.log('📱 Android 13+: Requesting POST_NOTIFICATIONS permission');
          await checkPermission('notification');
        } else {
          console.log('📱 Android <13: Notifications enabled by default');
        }
      }
      
      const fcmToken = await messaging().getToken();

      if (fcmToken) {
        console.log('✅ FCM Token obtained', fcmToken);
        await sendTokenToBackend(fcmToken);
      } else {
        console.log('❌ No FCM token found');
      }
      
      const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
        console.log('🔄 FCM Token refreshed');
        await sendTokenToBackend(newToken);
      });
      
      return unsubscribe;
    } catch (error) {
      console.log('❌ Error in notification setup:', error?.message || error);
    }
  };

  const getOrCreateDeviceId = async () => {
    try {
      let deviceId = await AsyncStorage.getItem('deviceId');

      if (!deviceId) {
        const brand = DeviceInfo.getBrand();
        const systemName = DeviceInfo.getSystemName();
        const systemVersion = DeviceInfo.getSystemVersion();
        const uniqueId = DeviceInfo.getUniqueId();
        const language = getLocales()[0]?.languageTag || 'unknown';
        const timezone = getTimeZone();

        const fingerprint = `${brand}-${systemName}-${systemVersion}-${uniqueId}-${language}-${timezone}`;

        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
          const char = fingerprint.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }

        const randomComponent = Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now().toString(36);

        deviceId = `app_${Math.abs(hash).toString(36)}_${randomComponent}_${timestamp}`;

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
        console.log('⚠️ No access token, skipping FCM token update');
        return;
      }
      const OS = Platform.OS;
      const deviceId = await getOrCreateDeviceId();

      const storedToken = await AsyncStorage.getItem('fcmToken');
      if (storedToken === token) {
        console.log('ℹ️ FCM token unchanged, skipping update');
        return;
      }

      console.log('📤 Sending FCM token to backend');

      await api.post('/user/me/update-fcm-token', {
        fcmToken: token,
        deviceId: deviceId,
        platform: OS,
      });
      
      await AsyncStorage.setItem('fcmToken', token);
      await AsyncStorage.setItem('updated', 'true');
      
      if (!selectedAddress) {
        fetcAddressData();
      }
      
      console.log('✅ FCM token updated successfully');
    } catch (error) {
      console.log('❌ Error sending token to backend:', error?.response?.data || error.message);
    }
  };

  const fetchCount = async () => {
    try {
      const response = await axiosInstance.get(`/notifications/count`);
      setNotifyCount(response.data.unseenCount);
    } catch (err) {
      console.log(err.response?.data);
    }
  };

  // ✅ OPTIMIZATION: Version check with caching (check once per session)
  const performVersionCheck = useCallback(async () => {
    try {
      // Check cache first (valid for 1 hour)
      if (versionCheckCacheRef.current) {
        const cacheAge = Date.now() - versionCheckCacheRef.current.timestamp;
        if (cacheAge < 3600000) { // 1 hour
          console.log('✅ Using cached version check result');
          return versionCheckCacheRef.current.result;
        }
      }

      const updateStatus = await axios.get(`${backendurl}/versions/check`, {
        params: {
          platform: Platform.OS,
          appVersion: DeviceInfo.getVersion(),
          versionCode: DeviceInfo.getBuildNumber(),
        },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          'X-App-Version': DeviceInfo.getVersion(),
          'X-App-Version-Code': String(DeviceInfo.getBuildNumber()),
        },
        timeout: 10000,
        validateStatus: status => status === 200,
      });

      let result = null;

      if (updateStatus.data.requiresUpdate) {
        if (updateStatus.data.forceUpdate) {
          result = {
            screen: 'update',
            params: {
              force: true,
              updateUrl: updateStatus.data.updateUrl,
              message: updateStatus.data.releaseNotes,
            },
          };
        } else {
          const skipTimestamp = await AsyncStorage.getItem('update_skipped_at');

          if (skipTimestamp) {
            const skipDate = new Date(parseInt(skipTimestamp, 10));
            const now = new Date();
            const daysSinceSkip = Math.floor(
              (now.getTime() - skipDate.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysSinceSkip > 7) {
              result = {
                screen: 'update',
                params: {
                  force: false,
                  updateUrl: updateStatus.data.updateUrl,
                  message: updateStatus.data.releaseNotes,
                },
              };
            }
          } else {
            result = {
              screen: 'update',
              params: {
                force: false,
                updateUrl: updateStatus.data.updateUrl,
                message: updateStatus.data.releaseNotes,
              },
            };
          }
        }
      }

      // Cache the result
      versionCheckCacheRef.current = {
        result,
        timestamp: Date.now(),
      };

      return result;
    } catch (error) {
      console.log('Version check error:', error.response?.data || error.message);
      return null;
    }
  }, []);

  // ✅ OPTIMIZATION: Main initialization with app state monitoring
  useEffect(() => {
    let networkUnsubscribe: any;
    let appStateSubscription: any;
    let wasDisconnected = false;

    const initializeApp = async () => {
      try {
        await fetchCategories();

        const accessToken = await AsyncStorage.getItem('accessToken');

        if (accessToken) {
          setInitialRoute({screen: 'bottomtabbar'});
          setIsInitialized(true);
          await fetchuser();
          getFcmTokenAndRequestPermission();
        } else {
          setInitialRoute({screen: 'WelcomeScreen'});
          setIsInitialized(true);
        }
      } catch (error) {
        console.log('Error initializing app:', error);
        setInitialRoute({screen: 'WelcomeScreen'});
        setIsInitialized(true);
      }
    };

    // ✅ Monitor app state for socket management
    appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('📱 App going to background - disconnecting socket');
        disconnectSocket();
      } else if (nextAppState === 'active' && previousState !== 'active') {
        console.log('📱 App becoming active - reconnecting socket');
        // Delay reconnection slightly to ensure app is fully active
        reconnectTimeoutRef.current = setTimeout(() => {
          if (user && user._id) {
            connectSocket();
          }
        }, 1000);
      }
    });

    // ✅ OPTIMIZATION: Debounced network monitoring
    const setupNetwork = () => {
      networkUnsubscribe = NetInfo.addEventListener(state => {
        const isConnected = state.isConnected ?? true;

        // Debounce network state changes
        if (networkDebounceRef.current) {
          clearTimeout(networkDebounceRef.current);
        }

        networkDebounceRef.current = setTimeout(() => {
          setInternetConnected(prevState => {
            if (prevState === isConnected) return prevState;

            if (!isConnected) {
              wasDisconnected = true;
              // Disconnect socket when offline
              disconnectSocket();
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
                // Reconnect socket when online
                if (user && user._id && appStateRef.current === 'active') {
                  connectSocket();
                }
              }, 250);
            }

            return isConnected;
          });
        }, 2000); // 2 second debounce
      });

      NetInfo.fetch().then(netState => {
        setInternetConnected(netState.isConnected ?? true);

        if (netState.isConnected) {
          performVersionCheck()
            .then(updateRoute => {
              if (updateRoute) {
                setInitialRoute(updateRoute);
              }
            })
            .catch(error => {
              console.log('Version check error:', error);
            });
        }
      });
    };

    initializeApp();
    setupNetwork();

    return () => {
      if (networkUnsubscribe) {
        networkUnsubscribe();
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (notificationCountDebounceRef.current) {
        clearTimeout(notificationCountDebounceRef.current);
      }
      if (networkDebounceRef.current) {
        clearTimeout(networkDebounceRef.current);
      }
      disconnectSocket();
    };
  }, [shouldRefetch, user, connectSocket, disconnectSocket, performVersionCheck]);

  const fetcAddressData = async () => {
    try {
      const response = await axiosInstance.get('/user/addresses');
      const defaultAddress = response.data.data.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      }
    } catch (error) {
      console.log('Error fetching address data:', error);
    }
  };

  const logout = async () => {
    try {
      const deviceId = await getOrCreateDeviceId();
      
      try {
        await messaging().deleteToken();
        console.log('✅ FCM token deleted from Firebase');
      } catch (tokenError) {
        console.log('⚠️ Error deleting FCM token:', tokenError);
      }

      try {
        if (deviceId) {
          await api.post('/auth/logout', { deviceId });
          console.log('✅ Backend notified of logout');
        }
      } catch (backendError) {
        console.log('⚠️ Error notifying backend:', backendError);
      }

      // ✅ Disconnect socket on logout
      disconnectSocket();

      setuser(null);
      setSellerDetail({});
      setNotifyCount(0);
      setSelectedAddress('');

      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('sellerId');
      await AsyncStorage.removeItem('updated');
      await AsyncStorage.removeItem('fcmToken');

      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }
  };

  const reinitialize = () => {
    setShouldRefetch(prev => prev + 1);
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
        disconnectSocket,
        logout,
        reinitialize,
        fetchCategories,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
