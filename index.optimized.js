/**
 * OPTIMIZED index.js - Deferred initialization for faster launch
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Critical polyfills only - load synchronously
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Defer heavy Firebase setup to after app mount
let firebaseInitialized = false;

const initializeFirebase = async () => {
  if (firebaseInitialized) return;
  
  try {
    const [
      notifee,
      messaging,
      {getCrashlytics}
    ] = await Promise.all([
      import('@notifee/react-native'),
      import('@react-native-firebase/messaging'),
      import('@react-native-firebase/crashlytics')
    ]);

    // Silence deprecation warnings
    globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
    
    // Enable crashlytics
    getCrashlytics().setCrashlyticsCollectionEnabled(true);
    
    // Setup background message handler
    messaging.default().setBackgroundMessageHandler(async (remoteMessage) => {
      // Handle background messages
      console.log('Background message:', remoteMessage);
    });

    // Setup notification background events
    notifee.default.onBackgroundEvent(async ({type, detail}) => {
      const {EventType} = await import('@notifee/react-native');
      if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
        if (detail.pressAction?.id === 'dismiss') {
          if (detail.notification?.id) {
            await notifee.default.cancelNotification(detail.notification.id);
          }
        }
      }
    });

    firebaseInitialized = true;
    console.log('✅ Firebase initialized');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
  }
};

// Defer WebRTC registration
const initializeWebRTC = async () => {
  try {
    const {registerGlobals} = await import('react-native-webrtc');
    registerGlobals();
    console.log('✅ WebRTC initialized');
  } catch (error) {
    console.error('❌ WebRTC initialization error:', error);
  }
};

// Initialize heavy dependencies after app loads
setTimeout(() => {
  Promise.all([
    initializeFirebase(),
    initializeWebRTC()
  ]);
}, 100);

AppRegistry.registerComponent(appName, () => App);
