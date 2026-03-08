import { NativeModules, Platform } from 'react-native';

interface VideoActivityModuleInterface {
  isActivityReady(): Promise<boolean>;
  waitForActivity(timeoutMs: number): Promise<boolean>;
}

const { VideoActivityModule }: { VideoActivityModule: VideoActivityModuleInterface } = NativeModules;

class ActivityManager {
  private static instance: ActivityManager;
  private isAndroid = Platform.OS === 'android';

  public static getInstance(): ActivityManager {
    if (!ActivityManager.instance) {
      ActivityManager.instance = new ActivityManager();
    }
    return ActivityManager.instance;
  }

  /**
   * Check if the Activity is ready for ExoPlayer initialization
   */
  async isActivityReady(): Promise<boolean> {
    if (!this.isAndroid) {
      return true; // iOS doesn't have this issue
    }

    try {
      if (!VideoActivityModule) {
        console.warn('VideoActivityModule not available, assuming activity is ready');
        return true;
      }

      return await VideoActivityModule.isActivityReady();
    } catch (error) {
      console.error('Error checking activity readiness:', error);
      return true; // Fail safe - assume ready
    }
  }

  /**
   * Wait for Activity to be ready with a timeout
   */
  async waitForActivity(timeoutMs: number = 3000): Promise<boolean> {
    if (!this.isAndroid) {
      return true; // iOS doesn't have this issue
    }

    try {
      if (!VideoActivityModule) {
        console.warn('VideoActivityModule not available, assuming activity is ready');
        return true;
      }

      return await VideoActivityModule.waitForActivity(timeoutMs);
    } catch (error) {
      console.error('Error waiting for activity:', error);
      return false;
    }
  }

  /**
   * Safe delay for video initialization
   */
  async safeVideoDelay(): Promise<void> {
    if (!this.isAndroid) {
      return;
    }

    // Wait a bit for Activity to be fully ready after lifecycle events
    return new Promise(resolve => setTimeout(resolve, 500));
  }
}

export default ActivityManager;