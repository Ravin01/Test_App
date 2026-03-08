import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastAndroid, Alert } from 'react-native';

// import { setuser, navigation, getFcmTokenAndRequestPermission, setSelectedButton } from './your-import-path'; // Update with your import path
import api from '../../Utils/Api';

// Enhanced Google Sign-In function with better error handling
async function onGoogleButtonPress({ setuser, navigation, getFcmTokenAndRequestPermission, reinitialize, getPendingAction, clearPendingAction }) {
  let signInResult = null;
  
  try {
    // Step 1: Check Google Play Services with better error handling
    try {
      await GoogleSignin.hasPlayServices({ 
        showPlayServicesUpdateDialog: true,
        autoResolve: true 
      });
    } catch (playServicesError) {
      
      // Handle specific Play Services errors
      if (playServicesError.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        ToastAndroid.show('Google Play Services not available', ToastAndroid.LONG);
        return;
      } else if (playServicesError.code === 'PLAY_SERVICES_OUTDATED') {
        ToastAndroid.show('Please update Google Play Services', ToastAndroid.LONG);
        return;
      }
      
      throw playServicesError;
    }

    // Step 2: Sign in with better error handling
    try {
      signInResult = await GoogleSignin.signIn();
    } catch (signInError) {
      
      // Handle specific sign-in errors
      if (signInError.code === 'SIGN_IN_CANCELLED') {
        ToastAndroid.show('Sign-in cancelled', ToastAndroid.SHORT);
        return;
      } else if (signInError.code === 'IN_PROGRESS') {
        ToastAndroid.show('Sign-in already in progress', ToastAndroid.SHORT);
        return;
      } else if (signInError.code === 'SIGN_IN_REQUIRED') {
        ToastAndroid.show('Sign-in required', ToastAndroid.SHORT);
        return;
      }
      
      throw signInError;
    }

    // Step 3: Extract user data with fallback handling
    let idToken, userDetails;
    
    try {
      // Handle both old and new response formats
      if (signInResult?.data) {
        // New format
        idToken = signInResult.data.idToken;
        userDetails = signInResult.data.user;
      } else if (signInResult?.idToken) {
        // Old format fallback
        idToken = signInResult.idToken;
        userDetails = signInResult.user;
      } else {
        throw new Error('Invalid sign-in result format');
      }

      // console.log('User details extracted:', {
      //   hasIdToken: !!idToken,
      //   hasUserDetails: !!userDetails,
      //   userName: userDetails?.name,
      //   userEmail: userDetails?.email
      // });

      if (!idToken) {
        throw new Error('No ID token found in sign-in result');
      }

      if (!userDetails) {
        throw new Error('No user details found in sign-in result');
      }

    } catch (dataExtractionError) {
      throw new Error(`Failed to extract user data: ${dataExtractionError.message}`);
    }

    // Step 4: Create Google credential
    let googleCredential;
    try {
      googleCredential = auth.GoogleAuthProvider.credential(idToken);
    } catch (credentialError) {
      throw new Error(`Failed to create Google credential: ${credentialError.message}`);
    }

    // Step 5: API call with timeout and retry logic
    let response;
    try {
      // Add timeout to API call
      const apiCall = api.post('/auth/google', {
        name: userDetails.name,
        emailId: userDetails.email,
        profileURL: userDetails.photo,
        isLogin: googleCredential,
      });

      // Set timeout for API call (30 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API call timeout')), 30000)
      );

      response = await Promise.race([apiCall, timeoutPromise]);

    } catch (apiError) {
      if (apiError.message === 'API call timeout') {
        ToastAndroid.show('Login timeout. Please try again.', ToastAndroid.LONG);
      } else if (apiError.response) {
        ToastAndroid.show(
          `Login failed: ${apiError.response.data?.message || 'Server error'}`,
          ToastAndroid.LONG
        );
      } else if (apiError.request) {
        ToastAndroid.show('Network error. Please check your connection.', ToastAndroid.LONG);
      } else {
        ToastAndroid.show(`Login error: ${apiError.message}`, ToastAndroid.LONG);
      }
      
      throw apiError;
    }

    // Step 6: Handle API response and store tokens
    try {
      const responseData = response.data;
      
      if (!responseData) {
        throw new Error('Empty response from server');
      }

      // Store tokens with error handling
      const tokenPromises = [];
      
      if (responseData.accessToken) {
        tokenPromises.push(
          AsyncStorage.setItem('accessToken', responseData.accessToken)
            .catch(err => {})
        );
      }
      
      if (responseData.refreshToken) {
        tokenPromises.push(
          AsyncStorage.setItem('refreshToken', responseData.refreshToken)
            .catch(err => {})
        );
      }

      // Store user data with error handling
      if (responseData.data) {
        const userData = responseData.data;
        
        if (userData.userName) {
          tokenPromises.push(
            AsyncStorage.setItem('userName', userData.userName)
              .catch(err => {})
          );
        }
        
        if (userData._id) {
          tokenPromises.push(
            AsyncStorage.setItem('userId', userData._id)
              .catch(err => {})
          );
        }
        
        if (userData.sellerInfo?._id) {
          tokenPromises.push(
            AsyncStorage.setItem('sellerId', userData.sellerInfo._id)
              .catch(err => {})
          );
        }

        // Set user state
        if (typeof setuser === 'function') {
          setuser(userData);
        }
      }

      // Wait for all storage operations to complete
      await Promise.allSettled(tokenPromises);

    } catch (storageError) {
      // Don't throw here, continue with navigation
      ToastAndroid.show('Warning: Some data may not be saved locally', ToastAndroid.SHORT);
    }

    // Success message
    const successMessage = response?.data?.message || 'Login successful';
    ToastAndroid.show(successMessage, ToastAndroid.SHORT);

    // Step 7: Reinitialize AuthContext to fetch fresh data
    try {
      if (typeof reinitialize === 'function') {
        reinitialize();
      }
    } catch (reinitError) {
      // Silently handle reinitialize errors
    }

    // Step 8: Check profile setup status and navigate accordingly
    try {
      if (navigation && typeof navigation.navigate === 'function') {
        // Check if profile setup is needed
        const userData = response?.data?.data;
        const needsProfileSetup = !userData?.userName || !userData?.name || userData?.onboardingStatus !== 'completed';
        
        // Check for pending action
        let pendingAction = null;
        if (typeof getPendingAction === 'function') {
          try {
            pendingAction = await getPendingAction();
          } catch (pendingActionError) {
            console.log('Error getting pending action:', pendingActionError);
          }
        }
        
        // Navigate based on profile setup status
        if (needsProfileSetup) {
          // Navigate to profile setup screen with pending action
          navigation.navigate('ProfileSetupScreen', {
            pendingAction: pendingAction
          });
        } else if (pendingAction && pendingAction.screen === 'LiveScreen') {
          // Profile complete and has pending action
          console.log('🔄 Navigating back to LiveScreen with params:', pendingAction.params);
          if (typeof clearPendingAction === 'function') {
            await clearPendingAction();
          }
          navigation.navigate('LiveScreen', pendingAction.params);
        } else {
          // No pending action, navigate to dashboard
          navigation.navigate('bottomtabbar');
        }
      } else {
        ToastAndroid.show('Navigation error. Please restart the app.', ToastAndroid.LONG);
      }
      
    } catch (navigationError) {
      console.log('Navigation error:', navigationError);
      ToastAndroid.show('Navigation failed. Please restart the app.', ToastAndroid.LONG);
    }

    // Step 9: FCM token with error handling
    try {
      if (typeof getFcmTokenAndRequestPermission === 'function') {
        await getFcmTokenAndRequestPermission();
      }
    } catch (fcmError) {
      // Don't show error to user, this is not critical
    }

  } catch (error) {
    // Show user-friendly error message
    let errorMessage = 'Login failed. Please try again.';
    
    if (error.message.includes('network')) {
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Login timeout. Please try again.';
    } else if (error.message.includes('Play Services')) {
      errorMessage = 'Google Play Services issue. Please update and try again.';
    }

    ToastAndroid.show(errorMessage, ToastAndroid.LONG);

    // Optional: Send error to crash reporting service
    // crashlytics().recordError(error);
    
  } finally {
    // Cleanup
    // Reset any loading states
    // if (typeof setSelectedButton === 'function') {
    //   setSelectedButton(null);
    // }
  }
}

// Additional helper function for debugging device-specific issues
export const debugDeviceInfo = async () => {
  try {
    const deviceInfo = {
      isGooglePlayServicesAvailable: false,
      googleSignInConfiguration: null,
      currentUser: null,
    };

    // Check Google Play Services
    try {
      await GoogleSignin.hasPlayServices();
      deviceInfo.isGooglePlayServicesAvailable = true;
    } catch (error) {
      // Silently handle error
    }

    // Check current configuration
    try {
      deviceInfo.googleSignInConfiguration = await GoogleSignin.getTokens();
    } catch (error) {
      // Silently handle error
    }

    // Check current user
    try {
      deviceInfo.currentUser = await GoogleSignin.getCurrentUser();
    } catch (error) {
      // Silently handle error
    }

    return deviceInfo;
  } catch (error) {
    // Silently handle error
  }
};

export default onGoogleButtonPress;
