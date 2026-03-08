import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Snackbar from 'react-native-snackbar';
import {useNavigation} from '@react-navigation/native';
import {colors} from '../Utils/Colors';
import messaging from '@react-native-firebase/messaging';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';
import {backendurl} from '../../Config';
import NotFoundScreen from './404Page';
import {checkPermission} from '../Utils/Permission';
import {useAuthContext} from '../Context/AuthContext';
import { flykupLogo } from '../assets/assets';

const SplashScreen = () => {
  const navigation = useNavigation();
  const {initializeUserData, connectSocket, isInitialized} = useAuthContext();
  const [internetConnected, setInternetConnected] = useState(true);
  const [wasDisconnected, setWasDisconnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [readyToNavigate, setReadyToNavigate] = useState(false);
  const [showPage, setShowPage] = useState(false);
  const [navigationDestination, setNavigationDestination] = useState(null);
  const [message, setmessage] = useState(null);

  const getFcmTokenAndRequestPermission = async () => {
    try {
      // Request permission on iOS, Android permissions are handled automatically
      if (Platform.OS === 'ios') {
        const permissionStatus = await messaging().requestPermission();
        if (
          permissionStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          permissionStatus === messaging.AuthorizationStatus.PROVISIONAL
        ) {
          console.log('Notification permission granted!');
        } else {
          console.log('Notification permission denied!');
          return;
        }
      }
      // const isupdated=await AsyncStorage.getItem('updated')
      await checkPermission('notification');
      // return;
      // Get FCM token
      // const fcmToken = await messaging().getToken();
      //
      // if (fcmToken) {
      //   console.log('FCM Token:', fcmToken);
      //   if(!isupdated)
      //   await sendTokenToBackend(fcmToken);
      // You can now send this token to your server to register the device for push notifications
      // } else {
      //   console.log('No FCM token found');
      // }
    } catch (error) {
      console.error('Error  requesting permission', error);
    }
  };
  // Animation timer - sets animation as finished after 2 seconds
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setAnimationFinished(true);
  //   }, 5000);

  //   return () => clearTimeout(timer);
  // }, []);

  // Initial connection check and setup
  useEffect(() => {
    const checkInitialConnection = async () => {
      const state = await NetInfo.fetch();
      setInternetConnected(state.isConnected);

      if (state.isConnected) {
        await performVersionCheck();
      } else {
        // If no internet, prepare to navigate with cached data
        await prepareNavigation();
      }
    };

    checkInitialConnection();

    // Network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected;
      setInternetConnected(isConnected);

      if (!isConnected) {
        setWasDisconnected(true);
        Snackbar.show({
          text: 'No Internet Connection',
          backgroundColor: 'red',
        });
      } else {
        if (wasDisconnected) {
          Snackbar.dismiss();
          setTimeout(() => {
            Snackbar.show({
              text: 'Back Online',
              backgroundColor: 'green',
              duration: Snackbar.LENGTH_SHORT,
            });
          }, 250);
          // Re-check version when coming back online
          performVersionCheck();
        }
        setWasDisconnected(false);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wasDisconnected]);

  // ✅ OPTIMIZATION: Navigate when ready AND user data is initialized
  useEffect(() => {
    const navigate = () => {
      if (navigationDestination) {
        // Always pass params if they exist
        if (navigationDestination.params) {
          navigation.navigate(
            navigationDestination.screen,
            navigationDestination.params,
          );
        } else {
          navigation.navigate(navigationDestination.screen);
        }
        setIsLoading(false);
      }
    };

    if (readyToNavigate && navigationDestination && isInitialized) {
      navigate();
    }
  }, [readyToNavigate, navigationDestination, isInitialized, navigation]);

  const performVersionCheck = async () => {
    // console.log(backendurl)
    try {
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
      console.log(updateStatus.data)

      // setShowPage(true)
      // return
      if (updateStatus.data.requiresUpdate) {
        if (updateStatus.data.forceUpdate) {
          // Force update → navigate immediately regardless of animation
          setNavigationDestination({
            screen: 'update',
            params: {
              force: true,
              updateUrl: updateStatus.data.updateUrl,
              message: updateStatus.data.releaseNotes,
            },
          });
          setReadyToNavigate(true);
          return;
        } else {
          // Optional update → check if user skipped before
          // if (!showUpdate) {
          // Check if user skipped any update in the last 7 days
          const skipTimestamp = await AsyncStorage.getItem('update_skipped_at');

          if (skipTimestamp) {
            const skipDate = new Date(parseInt(skipTimestamp, 10));
            const now = new Date();
            const daysSinceSkip = Math.floor(
              (now.getTime() - skipDate.getTime()) / (1000 * 60 * 60 * 24),
            );
            console.log(skipTimestamp, daysSinceSkip);
            // Show update againconsol if skipped more than 7 days ago
            if (daysSinceSkip > 7) {
              setNavigationDestination({
                screen: 'update',
                params: {
                  force: false,
                  updateUrl: updateStatus.data.updateUrl,
                  message: updateStatus.data.releaseNotes,
                },
              });
              setReadyToNavigate(true);
              return;
            }
          } else {
            // Never skipped before, show update
            setNavigationDestination({
              screen: 'update',
              params: {
                force: false,
                updateUrl: updateStatus.data.updateUrl,
                message: updateStatus.data.releaseNotes,
              },
            });
            setReadyToNavigate(true);
            return;
          }
          // setNavigationDestination({
          //   screen: 'update',
          //   params: {
          //     force: false,
          //     updateUrl: updateStatus.data.updateUrl,
          //     message: updateStatus.data.releaseNotes,
          //   }
          // });
          // setReadyToNavigate(true);
          // return;
          // }
        }
      }

      // No update needed or user skipped optional update
      await prepareNavigation();
    } catch (error) {
      setmessage(error.response?.data?.message);
      setShowPage(true);
      console.log(
        'Version check error:',
        error.response?.data || error.message,
      );
      // On error, show optional update screen
      performVersionCheck();
      // setNavigationDestination({
      //   screen: 'update',
      //   params: {
      //     force: false,
      //   }
      // });
      // setReadyToNavigate(true);
    }
  };

  const prepareNavigation = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');

      if (!accessToken) {
        setNavigationDestination({screen: 'WelcomeScreen'});
        setReadyToNavigate(true);
      } else {
        // ✅ OPTIMIZATION: Initialize user data before navigating
        console.log('🚀 Starting user data initialization...');
        await initializeUserData();
        console.log('✅ User data initialized');

        // Validate token if online
        if (internetConnected) {
          const isValid = await validateToken(accessToken);
          if (isValid) {
            setNavigationDestination({screen: 'bottomtabbar'});
            // ✅ OPTIMIZATION: Connect socket after user data is ready
            setTimeout(() => {
              console.log('🔌 Connecting socket...');
              connectSocket();
            }, 500);
          } else {
            // Token invalid, clear and go to login
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
            setNavigationDestination({screen: 'WelcomeScreen'});
          }
        } else {
          // Offline, proceed with cached token
          setNavigationDestination({screen: 'bottomtabbar'});
        }

        setReadyToNavigate(true);
      }
    } catch (error) {
      console.error('Navigation preparation error:', error);
      setNavigationDestination({screen: 'WelcomeScreen'});
      setReadyToNavigate(true);
    } finally {
      await getFcmTokenAndRequestPermission();
    }
  };


  const validateToken = async token => {
    try {
      // You can add a lightweight endpoint to validate the token
      // For now, just check if token exists
      return !!token;
    } catch (error) {
      return false;
    }
  };

  return (
    <>
      {showPage && (
        <NotFoundScreen
          message={message}
          title="Page not Found"
          onGoBack={() => setShowPage(false)}
          onGoHome={() => setShowPage(false)}
        />
      )}
      <View style={styles.container}>
        <StatusBar
          backgroundColor={colors.primaryColor}
          barStyle="light-content"
        />
        {isLoading && (
          <View style={styles.content}>
            <Image
              source={{uri:flykupLogo}}
              style={styles.logo}
              resizeMode="contain"
            />
            <ActivityIndicator size={'small'} color="#fff" />
            {/* <Text style={styles.loadingText}>Preparing your experience...</Text> */}
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 159,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
});

export default SplashScreen;
