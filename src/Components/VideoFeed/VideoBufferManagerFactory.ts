/**
 * 🚀 VIDEO BUFFER MANAGER FACTORY
 * Creates platform-specific buffer managers without circular dependencies
 */

import { Platform } from 'react-native';
import { IVideoBufferManager } from './IVideoBufferManager';
import PlatformDetection from './PlatformDetection';

class VideoBufferManagerFactory {
  private static instance: IVideoBufferManager | null = null;

  static async getInstance(): Promise<IVideoBufferManager> {
    if (!VideoBufferManagerFactory.instance) {
      // Ensure platform detection is initialized
      try {
        await PlatformDetection.initialize();
      } catch (error) {
        console.warn('⚠️ Platform detection failed in buffer manager factory:', error);
      }

      const platform = Platform.OS;
      
      if (platform === 'ios') {
        const { IOSBufferManager } = await import('./VideoBufferManager.ios');
        VideoBufferManagerFactory.instance = new IOSBufferManager();
      } else {
        const { AndroidBufferManager } = await import('./VideoBufferManager.android');
        VideoBufferManagerFactory.instance = new AndroidBufferManager();
      }

      await VideoBufferManagerFactory.instance.initialize();
    }
    
    return VideoBufferManagerFactory.instance;
  }

  static reset() {
    if (VideoBufferManagerFactory.instance) {
      VideoBufferManagerFactory.instance.cleanup();
      VideoBufferManagerFactory.instance = null;
    }
  }
}

export default VideoBufferManagerFactory;