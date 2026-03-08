import React, { useEffect, Suspense, useState } from 'react';
import { Platform, BackHandler, LogBox, View, ActivityIndicator, StyleSheet } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import messaging from '@react-native-firebase/messaging';
import "./global.css";

import codePush from "@revopush/react-native-code-push";
import RNBootSplash from 'react-native-bootsplash';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import { backendurl } from './Config';
// Direct imports for faster startup
import StackNavigate from './src/Navigation/Stack';
import { useAuthContext } from './src/Context/AuthContext';
import { OptimizedProviders } from './src/Context/OptimizedProviders';
import { accessibilityUtils } from './src/Utils/AccessibilityUtils';
import NoInternetScreen from './src/Components/NoInternetScreen';
import CodePushSplash from './src/Components/CodePushSplash';
import { configureAppSync } from './src/Utils/appSyncConfig';

// Ignore non-critical warnings
LogBox.ignoreLogs(['Text strings must be rendered within a <Text> component.']);
// Suspense fallback component
const AppFallback = () => (
  <View style={styles.fallbackContainer}>
    <ActivityIndicator size="large" color="#FFD700" />
  </View>
);


// Enable native screens for Android performance
if (Platform.OS === 'android') {
  enableScreens(true);
}

// Defer Google Sign-in configuration
let googleConfigured = false;
const configureGoogleSignIn = async () => {
  if (googleConfigured) return;
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    const { webClientId1 } = await import('./Config');
    GoogleSignin.configure({
      webClientId: webClientId1,
      offlineAccess: true
    });
    googleConfigured = true;
    console.log('✅ Google Sign-In configured');
  } catch (error) {
    console.log('❌ Google Sign-In configuration error:', error);
  }
};

// Network wrapper component - NOW WITH NOTIFICATION HANDLING
const AppWithNetworkCheck = () => {
  const { internetConnected } = useAuthContext();
  
  return (
    <>
      <StackNavigate />
      {!internetConnected && (
        <View style={StyleSheet.absoluteFillObject}>
          <NoInternetScreen />
        </View>
      )}
    </>
  );
};

function App(): React.JSX.Element {
  // CodePush state
  // const [isUpdating, setIsUpdating] = useState(false);
  // const [isCheckingUpdate, setIsCheckingUpdate] = useState(true); // Start with checking state
  // const [isRestarting, setIsRestarting] = useState(false);
  // const [downloadProgress, setDownloadProgress] = useState(0);
  // const [updateStatus, setUpdateStatus] = useState('Checking for updates...');
  // const [hasForceUpdate, setHasForceUpdate] = useState(false); // Track if force update is required
  
  useEffect(() => {
    // Initialize accessibility utilities for font management
    accessibilityUtils.initialize();

    // Configure Google Sign-In after mount (non-blocking)
    setTimeout(() => configureGoogleSignIn(), 100);

    // Request notification permissions on mount
    const requestNotificationPermission = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('✅ Notification permission granted');
        } else {
          console.log('⚠️ Notification permission denied');
        }
      } catch (error) {
        console.error('❌ Error requesting notification permission:', error);
      }
    };

    requestNotificationPermission();

    // Android back button handling
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return false;
      });
      return () => {
        backHandler.remove();
      };
    }

    // Cleanup accessibility listeners on unmount
    return () => {
      accessibilityUtils.dispose();
    };
  }, []);

  useEffect(() => {
    configureAppSync();
  }, []);

  // Hide BootSplash immediately so CodePushSplash is visible
  useEffect(() => {
    const hideBootSplash = async () => {
      try {
        console.log('🎬 Hiding BootSplash immediately...');
        await RNBootSplash.hide({ fade: false }); // No fade for immediate visibility
        console.log('✅ BootSplash hidden');
      } catch (error) {
        console.log('⚠️ BootSplash hide error:', error);
      }
    };
    hideBootSplash();
  }, []);

  // Check for force update first, then CodePush sync
  // useEffect(() => {
  //   // First, notify that app is ready (important for confirming previous updates)
  //   codePush.notifyAppReady();
    
  //   const checkAndSync = async () => {
  //     try {
  //       console.log('🔍 Checking for force update first...');
  //       setUpdateStatus('Checking for updates...');
  //       setIsCheckingUpdate(true);
        
  //       // Step 1: Check for Play Store force update via API
  //       const appVersion = DeviceInfo.getVersion(); // e.g., "1.0.7"
  //       const versionCode = DeviceInfo.getBuildNumber(); // e.g., "7"
  //       const platform = Platform.OS; // "android" or "ios"
        
  //       console.log('📱 Checking version:', { appVersion, versionCode, platform });
        
  //       let forceUpdateRequired = false;
  //       let updateParams: any = null;
        
  //       try {
  //         const response = await axios.get(`${backendurl}/versions/check`, {
  //           params: {
  //             platform,
  //             appVersion,
  //             versionCode,
  //           },
  //           headers: {
  //             'Cache-Control': 'no-cache, no-store, must-revalidate',
  //             'Pragma': 'no-cache',
  //             'Expires': '0',
  //           },
  //           timeout: 10000,
  //         });
          
  //         console.log('📱 Version check API response:', response.data);
          
  //         const appSettings = response.data?.data?.appSettings;
  //         if (appSettings) {
  //           // Check if force update is required
  //           const currentVersionCode = parseInt(versionCode, 10) || 0;
  //           const minVersionCode = appSettings.minVersionCode || 0;
            
  //           forceUpdateRequired = appSettings.forceUpdate === true && currentVersionCode < minVersionCode;
            
  //           console.log('📱 Version comparison:', {
  //             currentVersionCode,
  //             minVersionCode,
  //             forceUpdate: appSettings.forceUpdate,
  //             forceUpdateRequired,
  //           });
            
  //           if (forceUpdateRequired) {
  //             updateParams = {
  //               requiresUpdate: true,
  //               forceUpdate: true,
  //               updateUrl: 'https://play.google.com/store/apps/details?id=com.flykup.app',
  //               message: appSettings.updateMessage || 'A new version is available. Please update to continue.',
  //             };
  //           }
  //         }
  //       } catch (apiError) {
  //         console.log('⚠️ Version check API error (continuing without force update check):', apiError);
  //         // On API error, don't block the app - continue with CodePush
  //       }
        
  //       // If force update is required, skip CodePush and let AuthContext handle it
  //       if (forceUpdateRequired && updateParams) {
  //         console.log('🚨 Force update required - skipping CodePush, will show update screen');
  //         setHasForceUpdate(true);
  //         setIsCheckingUpdate(false);
  //         setIsUpdating(false);
          
  //         // Store the force update info for AuthContext to pick up
  //         await AsyncStorage.setItem('pending_force_update', JSON.stringify(updateParams));
          
  //         return; // Don't proceed with CodePush
  //       }
        
  //       console.log('✅ No force update required, proceeding with CodePush...');
        
  //       // Step 2: Run CodePush sync if no force update
  //       await codePush.sync(
  //         {
  //           installMode: codePush.InstallMode.IMMEDIATE,
  //           mandatoryInstallMode: codePush.InstallMode.IMMEDIATE,
  //         },
  //         // Sync status callback
  //         (syncStatus) => {
  //           console.log('📱 Sync status:', syncStatus);
  //           switch (syncStatus) {
  //             case codePush.SyncStatus.CHECKING_FOR_UPDATE:
  //               console.log('🔍 Checking for CodePush update...');
  //               setUpdateStatus('Checking for updates...');
  //               setIsCheckingUpdate(true);
  //               break;
                
  //             case codePush.SyncStatus.DOWNLOADING_PACKAGE:
  //               console.log('📥 Downloading package...');
  //               setIsCheckingUpdate(false);
  //               setIsUpdating(true);
  //               setUpdateStatus('Downloading update...');
  //               break;
                
  //             case codePush.SyncStatus.INSTALLING_UPDATE:
  //               console.log('📦 Installing update...');
  //               setUpdateStatus('Installing update...');
  //               setDownloadProgress(100);
  //               break;
                
  //             case codePush.SyncStatus.UP_TO_DATE:
  //               console.log('✅ App is up to date');
  //               setIsCheckingUpdate(false);
  //               setIsUpdating(false);
  //               break;
                
  //             case codePush.SyncStatus.UPDATE_INSTALLED:
  //               console.log('✅ Update installed, app should restart...');
  //               setUpdateStatus('Restarting app...');
  //               setIsRestarting(true);
  //               // Force restart after a short delay
  //               setTimeout(() => {
  //                 console.log('🔄 Forcing restart...');
  //                 codePush.restartApp();
  //               }, 500);
  //               break;
                
  //             case codePush.SyncStatus.UNKNOWN_ERROR:
  //               console.log('❌ Unknown error');
  //               setIsCheckingUpdate(false);
  //               setIsUpdating(false);
  //               break;
                
  //             case codePush.SyncStatus.SYNC_IN_PROGRESS:
  //               console.log('⏳ Sync already in progress');
  //               break;
                
  //             case codePush.SyncStatus.AWAITING_USER_ACTION:
  //               console.log('⏳ Awaiting user action');
  //               break;
                
  //             case codePush.SyncStatus.UPDATE_IGNORED:
  //               console.log('⏭️ Update ignored');
  //               setIsCheckingUpdate(false);
  //               setIsUpdating(false);
  //               break;
  //           }
  //         },
  //         // Download progress callback
  //         (progress) => {
  //           const percent = Math.round((progress.receivedBytes / progress.totalBytes) * 100);
  //           console.log(`📊 Download progress: ${percent}%`);
  //           setDownloadProgress(percent);
  //         }
  //       );
        
  //     } catch (error) {
  //       console.error('❌ Update check error:', error);
  //       setIsUpdating(false);
  //       setIsCheckingUpdate(false);
  //       setIsRestarting(false);
  //     }
  //   };

  //   // Start check after a short delay
  //   const timer = setTimeout(() => {
  //     checkAndSync();
  //   }, 100);
    
  //   return () => clearTimeout(timer);
  // }, []);

  // Show CodePush splash screen when checking, updating, or restarting
  // But NOT when force update is detected - let AuthContext handle that
  // if ((isCheckingUpdate || isUpdating || isRestarting) && !hasForceUpdate) {
  //   return (
  //     <CodePushSplash
  //       downloadProgress={downloadProgress}
  //       isDownloading={isUpdating && !isRestarting}
  //       isChecking={isCheckingUpdate}
  //       isRestarting={isRestarting}
  //       status={updateStatus}
  //     />
  //   );
  // }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Suspense fallback={<AppFallback />}>
        <OptimizedProviders>
          <AppWithNetworkCheck />
        </OptimizedProviders>
      </Suspense>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  fallbackText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    letterSpacing: 0.5,
  },
});

// IMPORTANT: DO NOT use CodePush HOC wrapper when using manual sync with progress
// The HOC would auto-sync without our progress tracking
// Instead, we handle sync manually in the useEffect above

// CodePush configuration - MANUAL mode (no auto sync from HOC)
const codePushOptions = {
  // MANUAL: We control when to check for updates
  checkFrequency: codePush.CheckFrequency.MANUAL,
};

// Export with CodePush wrapper but with MANUAL check frequency
// This prevents HOC from auto-syncing and lets our manual sync handle it
export default  codePush(codePushOptions)(App);