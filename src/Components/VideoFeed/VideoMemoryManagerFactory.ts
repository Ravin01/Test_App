/**
 * 🚀 VIDEO MEMORY MANAGER FACTORY
 * Creates platform-specific memory managers without circular dependencies
 */

import { Platform } from 'react-native';
import { IVideoMemoryManagerInternal } from './IVideoMemoryManager';
import { FallbackMemoryManager } from './FallbackMemoryManager';

class VideoMemoryManagerFactory {
  private static instance: IVideoMemoryManagerInternal | null = null;

  static async getInstance(): Promise<IVideoMemoryManagerInternal> {
    if (!VideoMemoryManagerFactory.instance) {
      const platform = Platform.OS;
      
      try {
        console.log(`🏗️ Creating ${platform} memory manager`);
        
        // Try to load platform-specific manager
        if (platform === 'ios') {
          try {
            // Use simplified iOS manager to avoid circular dependencies
            const { IOSMemoryManagerSimple } = require('./IOSMemoryManagerSimple');
            if (IOSMemoryManagerSimple) {
              VideoMemoryManagerFactory.instance = new IOSMemoryManagerSimple();
              console.log('✅ iOS memory manager created (simplified)');
            }
          } catch (iosError) {
            console.warn('⚠️ iOS memory manager failed:', iosError.message);
          }
        } else if (platform === 'android') {
          try {
            // Use simplified Android manager to avoid circular dependencies
            const { AndroidMemoryManagerSimple } = require('./AndroidMemoryManagerSimple');
            if (AndroidMemoryManagerSimple) {
              VideoMemoryManagerFactory.instance = new AndroidMemoryManagerSimple();
              console.log('✅ Android memory manager created (simplified)');
            }
          } catch (androidError) {
            console.warn('⚠️ Android memory manager failed:', androidError.message);
          }
        }

        // Use fallback if platform-specific manager failed
        if (!VideoMemoryManagerFactory.instance) {
          console.warn('⚠️ Using fallback memory manager');
          VideoMemoryManagerFactory.instance = new FallbackMemoryManager();
        }

        // Initialize the manager
        console.log('🧠 Initializing memory manager');
        await VideoMemoryManagerFactory.instance.initialize();
        console.log('✅ Memory manager initialized successfully');
        
      } catch (error) {
        console.error('❌ Critical error in memory manager factory:', error);
        // Last resort: use fallback
        console.warn('🔧 Creating emergency fallback memory manager');
        VideoMemoryManagerFactory.instance = new FallbackMemoryManager();
        await VideoMemoryManagerFactory.instance.initialize();
      }
    }
    
    return VideoMemoryManagerFactory.instance;
  }

  static reset() {
    if (VideoMemoryManagerFactory.instance) {
      VideoMemoryManagerFactory.instance.shutdown();
      VideoMemoryManagerFactory.instance = null;
    }
  }
}

export default VideoMemoryManagerFactory;