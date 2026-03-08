import { useState, useEffect, useRef } from 'react';
import { Platform, NativeModules, NativeEventEmitter, AppState } from 'react-native';

interface CallState {
  isInCall: boolean;
  callType: 'incoming' | 'outgoing' | 'idle';
}

/**
 * Custom hook to detect phone calls and manage video playback accordingly
 * Handles both iOS and Android call detection
 * Returns callStateChanged timestamp to trigger video reload on call state changes
 */
export const useCallDetection = () => {
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    callType: 'idle',
  });
  const [shouldMuteForCall, setShouldMuteForCall] = useState(false);
  const [callStateChanged, setCallStateChanged] = useState(Date.now());
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let callDetectorSubscription: any = null;
    let appStateSubscription: any = null;

    // Check initial app state on mount - only mute audio, don't pause
    const checkInitialState = () => {
      const currentState = AppState.currentState;
      if (currentState === 'inactive') {
        console.log('📞 App opened in inactive state - possible ongoing call, muting audio only');
        // Only mute audio, don't set isInCall to true (to avoid pausing video)
        setShouldMuteForCall(true);
      }
    };

    // Fallback: Monitor AppState changes - only control audio muting, not video playback
    const setupAppStateFallback = () => {
      // Check state on mount
      checkInitialState();
      
      appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        // When app goes inactive, mute audio (but don't pause video)
        if (appState.current === 'active' && nextAppState === 'inactive') {
          console.log('📞 App inactive - muting audio for possible call');
          // Only mute audio, keep video playing
          setShouldMuteForCall(true);
          setCallState(prev => ({...prev, isInCall: true}));
        } else if (appState.current !== 'active' && nextAppState === 'active') {
          // App becomes active again - unmute audio
          console.log('📞 App active - unmuting audio');
          setTimeout(() => {
            setShouldMuteForCall(false);
            setCallState({
              isInCall: false,
              callType: 'idle',
            });
          }, 300); // Small delay for smooth transition
        }

        appState.current = nextAppState;
      });
    };

    // Android: Use PhoneStateListener via native module if available
    const setupAndroidCallDetection = () => {
      try {
        // Check if call detection module exists
        if (NativeModules.CallDetection) {
          const CallDetectionModule = NativeModules.CallDetection;
          const eventEmitter = new NativeEventEmitter(CallDetectionModule);

          callDetectorSubscription = eventEmitter.addListener('PhoneCallStateChanged', (event) => {
            console.log('📞 Call state changed:', event);
            
            if (event.state === 'OFFHOOK' || event.state === 'RINGING') {
              // Call active or ringing
              setCallState({
                isInCall: true,
                callType: event.state === 'RINGING' ? 'incoming' : 'outgoing',
              });
              setShouldMuteForCall(true);
              setCallStateChanged(Date.now());
            } else if (event.state === 'IDLE') {
              // Call ended
              setCallState({
                isInCall: false,
                callType: 'idle',
              });
              setShouldMuteForCall(false);
              setCallStateChanged(Date.now());
            }
          });

          // Start listening
          CallDetectionModule.startListening();
        }
      } catch (error) {
        console.warn('Call detection not available:', error);
        // Fallback to AppState monitoring
        setupAppStateFallback();
      }
    };

    // iOS: Use AppState changes as fallback (iOS doesn't allow direct call detection)
    const setupiOSCallDetection = () => {
      setupAppStateFallback();
    };

    // Setup based on platform
    if (Platform.OS === 'android') {
      setupAndroidCallDetection();
    } else {
      setupiOSCallDetection();
    }

    // Cleanup
    return () => {
      if (callDetectorSubscription) {
        callDetectorSubscription.remove();
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
      if (Platform.OS === 'android' && NativeModules.CallDetection) {
        try {
          NativeModules.CallDetection.stopListening();
        } catch (error) {
          console.warn('Error stopping call detection:', error);
        }
      }
    };
  }, []);

  return {
    isInCall: callState.isInCall,
    callType: callState.callType,
    shouldMuteForCall,
    shouldPauseForCall: false, // Keep playing but muted during calls
    callStateChanged, // Timestamp to trigger video reload
  };
};

export default useCallDetection;
