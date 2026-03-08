/**
 * 📺 PICTURE-IN-PICTURE HOOK
 * Manages PIP state and provides cross-platform PIP functionality
 * 
 * Features:
 * - Cross-platform PIP support (iOS/Android)
 * - PIP state management
 * - Error handling and fallbacks
 * - Auto-enter PIP ONLY on incoming calls (not general background)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform, AppStateStatus, NativeModules, DeviceEventEmitter } from 'react-native';

// Native PIP module for Android
const { PictureInPictureModule } = NativeModules;

export interface PIPState {
  isActive: boolean;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface PIPActions {
  enterPIP: () => Promise<boolean>;
  exitPIP: () => Promise<boolean>;
  togglePIP: () => Promise<boolean>;
  resetError: () => void;
  setCallActive: (isActive: boolean) => void;
}

interface UsePictureInPictureProps {
  autoEnterOnBackground?: boolean; // Deprecated - PIP now only enters on incoming calls
  autoEnterOnIncomingCall?: boolean; // NEW: Enable PIP only for incoming calls
  onPIPStatusChanged?: (isActive: boolean) => void;
  onError?: (error: string) => void;
}

export const usePictureInPicture = ({
  autoEnterOnBackground: _autoEnterOnBackground = false, // Deprecated - kept for backward compatibility but ignored
  autoEnterOnIncomingCall: _autoEnterOnIncomingCall = true, // NEW: Default to true - PIP only on incoming calls
  onPIPStatusChanged,
  onError,
}: UsePictureInPictureProps = {}): [PIPState, PIPActions] => {
  
  // State management
  const [pipState, setPipState] = useState<PIPState>({
    isActive: false,
    isSupported: true, // Assume supported until proven otherwise
    isLoading: false,
    error: null,
  });

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const mountedRef = useRef(true);
  const pipActiveRef = useRef(false);

  // Keep pipActiveRef in sync with pipState.isActive
  useEffect(() => {
    pipActiveRef.current = pipState.isActive;
  }, [pipState.isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Safe state updater
  const safeSetState = useCallback((updater: (prev: PIPState) => PIPState) => {
    if (mountedRef.current) {
      setPipState(updater);
    }
  }, []);

  // Handle PIP status changes from video player
  const handlePIPStatusChanged = useCallback((data: { isActive: boolean }) => {
    // console.log(`📺 [Hook] PIP status event received:`, JSON.stringify(data));
    // console.log(`📺 [Hook] Setting isActive to: ${data.isActive}`);
    
    safeSetState(prev => {
      // console.log(`📺 [Hook] Previous state:`, JSON.stringify(prev));
      const newState = {
        ...prev,
        isActive: data.isActive,
        isLoading: false,
        error: null,
      };
      // console.log(`📺 [Hook] New state:`, JSON.stringify(newState));
      return newState;
    });

    onPIPStatusChanged?.(data.isActive);
  }, [safeSetState, onPIPStatusChanged]);

  // Listen to native PIP events (Android)
  useEffect(() => {
    if (Platform.OS === 'android') {
      const subscription = DeviceEventEmitter.addListener(
        'onPictureInPictureStatusChanged',
        handlePIPStatusChanged
      );

      return () => {
        subscription?.remove();
      };
    }
  }, [handlePIPStatusChanged]);

  // Error handler
  const handleError = useCallback((error: string) => {
    console.error('🚫 PIP Error:', error);
    
    safeSetState(prev => ({
      ...prev,
      isLoading: false,
      error,
    }));

    onError?.(error);
  }, [safeSetState, onError]);

  // Enter PIP mode
  const enterPIP = useCallback(async (): Promise<boolean> => {
    if (pipState.isActive) {
      // console.log('📺 PIP already active');
      return true;
    }

    try {
      safeSetState(prev => ({ ...prev, isLoading: true, error: null }));

      // console.log('📺 Attempting to enter PIP mode...');
      
      if (Platform.OS === 'android') {
        if (!PictureInPictureModule) {
          throw new Error('PIP module not available. Please rebuild the app.');
        }
        
        // Use native Android PIP module
        const success = await PictureInPictureModule.enterPictureInPictureMode();
        // console.log('📺 Android PIP result:', success);
        
        if (success) {
          safeSetState(prev => ({
            ...prev,
            isActive: true,
            isLoading: false,
            error: null,
          }));
        }
        
        return success;
      } else if (Platform.OS === 'ios') {
        // iOS PIP is handled automatically by react-native-video
        // when the app goes to background (if video is playing)
        // console.log('📺 iOS PIP handled by react-native-video');
        safeSetState(prev => ({
          ...prev,
          isActive: true,
          isLoading: false,
          error: null,
        }));
        return true;
      } else {
        throw new Error('PIP not supported on this platform');
      }
    } catch (error) {
      console.error('📺 PIP Error Details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to enter PIP mode';
      handleError(errorMessage);
      return false;
    }
  }, [pipState.isActive, safeSetState, handleError]);

  // Exit PIP mode
  const exitPIP = useCallback(async (): Promise<boolean> => {
    if (!pipState.isActive) {
      // console.log('📺 PIP not active');
      return true;
    }

    try {
      safeSetState(prev => ({ ...prev, isLoading: true, error: null }));

      // console.log('📺 Attempting to exit PIP mode...');
      
      // On react-native-video, PIP exit is usually handled by user interaction
      // or by dismissing the PIP window
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to exit PIP';
      handleError(errorMessage);
      return false;
    }
  }, [pipState.isActive, safeSetState, handleError]);

  // Toggle PIP mode
  const togglePIP = useCallback(async (): Promise<boolean> => {
    if (pipState.isActive) {
      return await exitPIP();
    } else {
      return await enterPIP();
    }
  }, [pipState.isActive, enterPIP, exitPIP]);

  // Reset error state
  const resetError = useCallback(() => {
    safeSetState(prev => ({ ...prev, error: null }));
  }, [safeSetState]);

  // Handle app state changes for PIP state management
  // IMPORTANT: We ALWAYS need to listen for app state changes to reset PIP state
  // when the app returns to foreground, regardless of autoEnterOnBackground setting
  useEffect(() => {
    // console.log('📺 Setting up AppState listener for PIP state management');

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // console.log('📺 App state changed:', {
      //   previous: appStateRef.current,
      //   next: nextAppState,
      //   pipActive: pipActiveRef.current
      // });

      // Note: Auto-ENTER PIP is now handled natively in MainActivity.onUserLeaveHint()
      // This is more reliable as it happens before the activity pauses
      
      // ✅ CRITICAL FIX: Always reset PIP state when app returns to foreground
      // This ensures the PIP button can be clicked again after exiting PIP mode
      if (
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
        nextAppState === 'active'
      ) {
        if (pipActiveRef.current) {
          console.log('📺 ✅ App became active - resetting PIP state to inactive');
          safeSetState(prev => ({
            ...prev,
            isActive: false,
            isLoading: false,
            error: null,
          }));
          // Also notify the callback
          onPIPStatusChanged?.(false);
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // console.log('📺 Removing AppState listener');
      subscription?.remove();
    };
  }, [safeSetState, onPIPStatusChanged]);

  // Check PIP support on mount
  useEffect(() => {
    const checkPIPSupport = async () => {
      try {
        let isSupported = false;
        
        if (Platform.OS === 'android' && PictureInPictureModule) {
          // Check Android PIP support via native module
          isSupported = await PictureInPictureModule.isPictureInPictureSupported();
          // console.log('📺 Android PIP support:', isSupported);
        } else if (Platform.OS === 'ios') {
          // iOS 14+ supports PIP automatically
          isSupported = true;
          // console.log('📺 iOS PIP support: assumed true');
        }
        
        safeSetState(prev => ({
          ...prev,
          isSupported,
        }));

        if (!isSupported) {
          // console.warn('📺 PIP not supported on this platform');
        }
      } catch (error) {
        console.log('📺 Error checking PIP support:', error);
        safeSetState(prev => ({ ...prev, isSupported: false }));
      }
    };

    checkPIPSupport();
  }, [safeSetState]);

  // Return state and actions
  return [
    pipState,
    {
      enterPIP,
      exitPIP,
      togglePIP,
      resetError,
      // Expose the handler for video components to use
      handlePIPStatusChanged,
    } as PIPActions & { handlePIPStatusChanged: (data: { isActive: boolean }) => void },
  ];
};

export default usePictureInPicture;
