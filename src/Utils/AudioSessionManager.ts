import { NativeModules } from 'react-native';

const { AudioSessionManager } = NativeModules;

/**
 * Configure audio session for call state
 * Manages audio focus and session configuration on both iOS and Android
 * 
 * @param isInCall - Whether user is currently in a phone call
 * @returns Promise<void>
 */
export const configureAudioForCallState = async (isInCall: boolean): Promise<void> => {
  if (!AudioSessionManager) {
    console.warn('[AudioSessionManager] Native module not available, videos will play normally');
    return Promise.reject(new Error('AudioSessionManager not available'));
  }

  try {
    if (isInCall) {
      // Configure for call state - allow playback with ducking
      // This allows video to play while call audio takes priority
      await AudioSessionManager.setCategory('playback', 'duckOthers');
      console.log('[AudioSession] ✅ Audio focus gained - videos play with sound');
    } else {
      // Normal playback - mix with other audio
      await AudioSessionManager.setCategory('playback', 'mixWithOthers');
      console.log('[AudioSession] ✅ Audio focus gained - videos play with sound');
    }
  } catch (error) {
    // Another app has audio focus (Meet, Zoom, WhatsApp call, etc.)
    console.warn('[AudioSession] ⚠️ Another app has audio focus - videos will be muted');
    // Re-throw so Promise rejects
    throw error;
  }
};

/**
 * Check if AudioSessionManager native module is available
 * @returns boolean
 */
export const isAudioSessionManagerAvailable = (): boolean => {
  return AudioSessionManager !== undefined && AudioSessionManager !== null;
};

export default {
  configureAudioForCallState,
  isAudioSessionManagerAvailable,
};
