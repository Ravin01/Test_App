/**
 * 🚀 ANDROID-SPECIFIC BUFFER MANAGER  
 * Optimized for Android device fragmentation and ExoPlayer behavior
 */

import { BaseVideoBufferManager } from './BaseVideoBufferManager';
import { VideoData } from './VideoTypes';
import { NativeModules } from 'react-native';
import { AWS_CDN_URL } from '../../Utils/aws';

export class AndroidBufferManager extends BaseVideoBufferManager {
  private videoRefs: Map<string, any> = new Map();
  private preloadTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private exoPlayerInstances: Map<string, any> = new Map();

  async preloadVideo(video: VideoData, priority: number): Promise<boolean> {
    const videoId = video._id;
    
    try {
      console.log(`🤖 Android preloading video ${videoId} with priority ${priority}`);
      
      // Create video source with Android-specific optimizations
      const videoSource = this.getVideoSource(video);
      if (!videoSource) {
        throw new Error('No valid video source');
      }

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.log(`⏰ Android preload timeout for ${videoId}`);
          this.cleanupVideoRef(videoId);
          resolve(false);
        }, priority > 80 ? 12000 : 6000); // Android needs more time than iOS

        this.preloadTimeouts.set(videoId, timeout);

        // Android-specific video configuration
        const videoComponent = {
          source: videoSource,
          paused: true,
          muted: true,
          resizeMode: 'contain',
          playInBackground: false,
          playWhenInactive: false,
          ignoreSilentSwitch: 'ignore',
          mixWithOthers: 'duck',
          
          // Android ExoPlayer specific settings
          bufferConfig: {
            minBufferMs: priority > 80 ? 2000 : 1000,
            maxBufferMs: priority > 80 ? 10000 : 5000,
            bufferForPlaybackMs: 500,
            bufferForPlaybackAfterRebufferMs: 1000,
          },
          
          onLoad: (data: any) => {
            console.log(`✅ Android video ${videoId} loaded:`, {
              duration: data.duration,
              naturalSize: data.naturalSize,
            });
            clearTimeout(timeout);
            this.preloadTimeouts.delete(videoId);
            resolve(true);
          },
          
          onError: (error: any) => {
            console.log(`❌ Android video ${videoId} load error:`, error);
            clearTimeout(timeout);
            this.preloadTimeouts.delete(videoId);
            this.cleanupVideoRef(videoId);
            resolve(false);
          },
          
          onBuffer: ({ isBuffering }: { isBuffering: boolean }) => {
            if (!isBuffering && priority > 80) {
              console.log(`📊 Android high-priority video ${videoId} buffering complete`);
            }
          },
          
          onProgress: (data: any) => {
            // For high-priority videos, ensure good preload progress
            if (priority > 80 && data.currentTime > 2) {
              console.log(`⚡ Android video ${videoId} preloaded ${data.currentTime}s`);
            }
          },
        };

        this.videoRefs.set(videoId, videoComponent);
      });
    } catch (error) {
      console.error(`💥 Android preload error for ${videoId}:`, error);
      return false;
    }
  }

  async releaseVideo(videoId: string): Promise<void> {
    console.log(`🗑️ Android releasing video ${videoId}`);
    
    // Clear any pending timeouts
    const timeout = this.preloadTimeouts.get(videoId);
    if (timeout) {
      clearTimeout(timeout);
      this.preloadTimeouts.delete(videoId);
    }
    
    // Android-specific cleanup
    this.cleanupVideoRef(videoId);
    
    // Android GC is more aggressive, but we can still hint
    if (global.gc && __DEV__) {
      // Delayed GC to allow cleanup to complete
      setTimeout(() => {
        global.gc();
      }, 200);
    }
  }

  isVideoReady(videoId: string): boolean {
    return this.videoRefs.has(videoId) && this.bufferState.ready.includes(videoId);
  }

  private getVideoSource(video: VideoData): any {
    // Android can handle more source types efficiently
    if (video.hlsMasterPlaylistUrl) {
      return { 
        uri: video.hlsMasterPlaylistUrl,
        type: 'hls', // Explicit type for ExoPlayer
      };
    }
    
    if (video.masterPlaylistKey) {
      const cdnUrl = process.env.AWS_CDN_URL || 'https://your-cdn-url.com/';
      return { 
        uri: `${AWS_CDN_URL}${video.masterPlaylistKey}`,
        type: 'hls',
      };
    }
    
    return null;
  }

  private cleanupVideoRef(videoId: string): void {
    const videoRef = this.videoRefs.get(videoId);
    if (videoRef) {
      try {
        // Android-specific cleanup
        this.videoRefs.delete(videoId);
        
        // Remove ExoPlayer instance if exists
        const exoPlayer = this.exoPlayerInstances.get(videoId);
        if (exoPlayer) {
          this.exoPlayerInstances.delete(videoId);
        }
      } catch (error) {
        console.error(`Error cleaning up Android video ref for ${videoId}:`, error);
      }
    }
  }

  // Android-specific optimization methods

  async handleAppStateChange(appState: string): Promise<void> {
    if (appState === 'background') {
      console.log('🤖 Android app backgrounded - moderate cleanup');
      
      // Android is more forgiving with background resources
      // Keep current + next video for faster resume
      const currentVideoId = this.videos[this.currentIndex]?._id;
      const nextVideoId = this.videos[this.currentIndex + 1]?._id;
      const toKeep = [currentVideoId, nextVideoId].filter(Boolean);
      const toRelease = Array.from(this.videoRefs.keys()).filter(id => !toKeep.includes(id));
      
      await Promise.all(toRelease.map(id => this.releaseVideo(id)));
      
      // Update buffer state
      this.bufferState.ready = this.bufferState.ready.filter(id => toKeep.includes(id));
    } else if (appState === 'active') {
      console.log('🤖 Android app foregrounded - resume preloading');
      
      // Resume normal preloading
      await this.onVideoIndexChange(this.currentIndex);
    }
  }

  async handleTrimMemory(level: number): Promise<void> {
    console.log(`🚨 Android trim memory level: ${level}`);
    
    // Android trim memory levels
    // TRIM_MEMORY_RUNNING_MODERATE = 5
    // TRIM_MEMORY_RUNNING_LOW = 10
    // TRIM_MEMORY_RUNNING_CRITICAL = 15
    
    if (level >= 15) {
      await this.onMemoryPressure('critical');
    } else if (level >= 10) {
      await this.onMemoryPressure('warning');
    } else if (level >= 5) {
      // Moderate cleanup
      const toRelease = this.bufferState.ready.slice(0, -2); // Keep last 2
      await Promise.all(toRelease.map(id => this.releaseVideo(id)));
    }
  }

  // Android device-specific optimizations

  optimizeForAndroidPerformance(deviceInfo: any): void {
    const { manufacturer, model, totalMemory, apiLevel } = deviceInfo;
    
    console.log(`🤖 Optimizing for Android device: ${manufacturer} ${model}`);
    
    // Manufacturer-specific optimizations
    if (manufacturer.toLowerCase().includes('samsung')) {
      this.optimizeForSamsung(model, apiLevel);
    } else if (manufacturer.toLowerCase().includes('xiaomi')) {
      this.optimizeForXiaomi(model, totalMemory);
    } else if (manufacturer.toLowerCase().includes('huawei')) {
      this.optimizeForHuawei(model, apiLevel);
    } else {
      this.optimizeForGenericAndroid(totalMemory, apiLevel);
    }
  }

  private optimizeForSamsung(model: string, apiLevel: number): void {
    // Samsung devices often have good hardware but aggressive battery optimization
    if (model.toLowerCase().includes('galaxy a')) {
      // Mid-range Samsung
      this.currentStrategy = {
        ahead: 2,
        behind: 1,
        maxConcurrentLoads: 1,
        preloadTriggers: ['currentVideo > 75%'],
      };
    } else {
      // Flagship Samsung
      this.currentStrategy = {
        ahead: 4,
        behind: 2,
        maxConcurrentLoads: 2,
        preloadTriggers: ['scrollBeginDrag', 'currentVideo > 60%'],
      };
    }
  }

  private optimizeForXiaomi(model: string, totalMemory: number): void {
    // Xiaomi devices have aggressive memory management (MIUI)
    const memoryGB = totalMemory / (1024 * 1024 * 1024);
    
    if (memoryGB < 4) {
      this.currentStrategy = {
        ahead: 1,
        behind: 0,
        maxConcurrentLoads: 1,
        preloadTriggers: ['currentVideo > 85%'],
      };
    } else {
      this.currentStrategy = {
        ahead: 3,
        behind: 1,
        maxConcurrentLoads: 2,
        preloadTriggers: ['currentVideo > 70%'],
      };
    }
  }

  private optimizeForHuawei(model: string, apiLevel: number): void {
    // Huawei devices (pre-Google ban) have custom optimizations
    if (apiLevel >= 28) {
      this.currentStrategy = {
        ahead: 3,
        behind: 1,
        maxConcurrentLoads: 2,
        preloadTriggers: ['scrollBeginDrag', 'currentVideo > 65%'],
      };
    } else {
      // Older Huawei devices
      this.currentStrategy = {
        ahead: 2,
        behind: 0,
        maxConcurrentLoads: 1,
        preloadTriggers: ['currentVideo > 80%'],
      };
    }
  }

  private optimizeForGenericAndroid(totalMemory: number, apiLevel: number): void {
    const memoryGB = totalMemory / (1024 * 1024 * 1024);
    
    if (memoryGB < 3 || apiLevel < 26) {
      // Low-end or old Android
      this.currentStrategy = {
        ahead: 1,
        behind: 0,
        maxConcurrentLoads: 1,
        preloadTriggers: ['currentVideo > 85%'],
      };
    } else if (memoryGB > 6 && apiLevel >= 29) {
      // High-end modern Android
      this.currentStrategy = {
        ahead: 5,
        behind: 2,
        maxConcurrentLoads: 3,
        preloadTriggers: ['scrollBeginDrag', 'currentVideo > 50%'],
      };
    } else {
      // Mid-range Android
      this.currentStrategy = {
        ahead: 3,
        behind: 1,
        maxConcurrentLoads: 2,
        preloadTriggers: ['currentVideo > 70%'],
      };
    }
  }

  // Android-specific error recovery

  async recoverFromExoPlayerError(videoId: string, error: any): Promise<boolean> {
    console.log(`🔄 Android ExoPlayer error recovery for ${videoId}:`, error);
    
    // ExoPlayer-specific error handling
    const errorType = error.errorType || error.type;
    
    switch (errorType) {
      case 'RENDERER':
        // Renderer errors - often recoverable with retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.retryFailedVideo(videoId);
        
      case 'SOURCE':
        // Source errors - check network and retry
        if (this.networkState?.quality === 'offline') {
          return false; // Don't retry if offline
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.retryFailedVideo(videoId);
        
      case 'UNEXPECTED':
        // Unexpected errors - memory or system issues
        await this.handleTrimMemory(15); // Critical cleanup
        await new Promise(resolve => setTimeout(resolve, 3000));
        return this.retryFailedVideo(videoId);
        
      case 'REMOTE':
        // Remote/network errors
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.retryFailedVideo(videoId);
        
      default:
        // Generic retry with backoff
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.retryFailedVideo(videoId);
    }
  }

  // Android-specific performance monitoring

  getAndroidSpecificMetrics(): any {
    return {
      exoPlayerInstances: this.exoPlayerInstances.size,
      videoRefs: this.videoRefs.size,
      strategy: this.currentStrategy,
      bufferHealth: this.getBufferHealth(),
    };
  }

  // Missing methods that are referenced in the code
  private async onVideoIndexChange(index: number): Promise<void> {
    this.currentIndex = index;
    this.updateBufferWindow();
  }

  private async onMemoryPressure(level: 'warning' | 'critical'): Promise<void> {
    console.log(`🚨 Android memory pressure: ${level}`);
    
    if (level === 'critical') {
      // Keep only current video
      const currentVideoId = this.videos[this.currentIndex]?._id;
      const toRelease = Array.from(this.videoRefs.keys()).filter(id => id !== currentVideoId);
      await Promise.all(toRelease.map(id => this.releaseVideo(id)));
    } else {
      // Keep current and next video
      const currentVideoId = this.videos[this.currentIndex]?._id;
      const nextVideoId = this.videos[this.currentIndex + 1]?._id;
      const toKeep = [currentVideoId, nextVideoId].filter(Boolean);
      const toRelease = Array.from(this.videoRefs.keys()).filter(id => !toKeep.includes(id));
      await Promise.all(toRelease.map(id => this.releaseVideo(id)));
    }
  }

  private async retryFailedVideo(videoId: string): Promise<boolean> {
    const video = this.videos.find(v => v._id === videoId);
    if (!video) return false;
    
    const priority = Math.abs(this.videos.findIndex(v => v._id === videoId) - this.currentIndex);
    return this.preloadVideo(video, priority);
  }

  private getBufferHealth(): number {
    const totalVideos = this.videos.length;
    const readyVideos = this.bufferState.ready.length;
    return totalVideos > 0 ? (readyVideos / totalVideos) * 100 : 0;
  }
}