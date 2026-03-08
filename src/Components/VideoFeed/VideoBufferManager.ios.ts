/**
 * 🚀 iOS-SPECIFIC BUFFER MANAGER
 * Optimized for iOS memory constraints and AVPlayer behavior
 */

import { BaseVideoBufferManager } from './BaseVideoBufferManager';
import { VideoData } from './VideoTypes';
import { AWS_CDN_URL } from '../../Utils/aws';

export class IOSBufferManager extends BaseVideoBufferManager {
  private videoRefs: Map<string, any> = new Map();
  private preloadTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async preloadVideo(video: VideoData, priority: number): Promise<boolean> {
    const videoId = video._id;
    
    try {
      console.log(`🍎 iOS preloading video ${videoId} with priority ${priority}`);
      
      // Create video instance for preloading
      const videoSource = this.getVideoSource(video);
      if (!videoSource) {
        throw new Error('No valid video source');
      }

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.log(`⏰ iOS preload timeout for ${videoId}`);
          this.cleanupVideoRef(videoId);
          resolve(false);
        }, priority > 80 ? 10000 : 5000); // Longer timeout for high priority

        this.preloadTimeouts.set(videoId, timeout);

        // Create invisible video component for preloading
        const videoComponent = {
          source: videoSource,
          paused: true,
          muted: true,
          resizeMode: 'contain',
          onLoad: () => {
            console.log(`✅ iOS video ${videoId} loaded successfully`);
            clearTimeout(timeout);
            this.preloadTimeouts.delete(videoId);
            resolve(true);
          },
          onError: (error: any) => {
            console.log(`❌ iOS video ${videoId} load error:`, error);
            clearTimeout(timeout);
            this.preloadTimeouts.delete(videoId);
            this.cleanupVideoRef(videoId);
            resolve(false);
          },
          onBuffer: ({ isBuffering }: { isBuffering: boolean }) => {
            if (!isBuffering) {
              console.log(`📊 iOS video ${videoId} buffering complete`);
            }
          },
        };

        this.videoRefs.set(videoId, videoComponent);
      });
    } catch (error) {
      console.error(`💥 iOS preload error for ${videoId}:`, error);
      return false;
    }
  }

  async releaseVideo(videoId: string): Promise<void> {
    console.log(`🗑️ iOS releasing video ${videoId}`);
    
    // Clear any pending timeouts
    const timeout = this.preloadTimeouts.get(videoId);
    if (timeout) {
      clearTimeout(timeout);
      this.preloadTimeouts.delete(videoId);
    }
    
    // Remove video reference
    this.cleanupVideoRef(videoId);
    
    // iOS-specific: Force garbage collection hint
    if (global.gc && __DEV__) {
      setTimeout(() => {
        global.gc();
      }, 100);
    }
  }

  isVideoReady(videoId: string): boolean {
    return this.videoRefs.has(videoId) && this.bufferState.ready.includes(videoId);
  }

  private getVideoSource(video: VideoData): any {
    // Priority order for video sources
    if (video.hlsMasterPlaylistUrl) {
      return { uri: video.hlsMasterPlaylistUrl };
    }
    
    if (video.masterPlaylistKey) {
      // Construct URL from CDN + key
      const cdnUrl = process.env.AWS_CDN_URL || 'https://your-cdn-url.com/';
      return { uri: `${cdnUrl}${video.masterPlaylistKey}` };
    }
    
    return null;
  }

  private cleanupVideoRef(videoId: string): void {
    const videoRef = this.videoRefs.get(videoId);
    if (videoRef) {
      // iOS-specific cleanup
      try {
        // If we have a ref to the actual component, we could call cleanup methods
        // For now, just remove the reference
        this.videoRefs.delete(videoId);
      } catch (error) {
        console.error(`Error cleaning up video ref for ${videoId}:`, error);
      }
    }
  }

  // iOS-specific optimization methods

  async handleAppStateChange(appState: string): Promise<void> {
    if (appState === 'background') {
      console.log('🍎 iOS app backgrounded - aggressive cleanup');
      
      // iOS is very strict about background resource usage
      // Keep only the current video
      const currentVideoId = this.videos[this.currentIndex]?._id;
      const toRelease = Array.from(this.videoRefs.keys()).filter(id => id !== currentVideoId);
      
      await Promise.all(toRelease.map(id => this.releaseVideo(id)));
      
      // Update buffer state
      this.bufferState.ready = this.bufferState.ready.filter(id => id === currentVideoId);
    } else if (appState === 'active') {
      console.log('🍎 iOS app foregrounded - resume preloading');
      
      // Resume normal preloading strategy
      await this.onVideoIndexChange(this.currentIndex);
    }
  }

  async handleMemoryWarning(): Promise<void> {
    console.log('🚨 iOS memory warning received');
    
    // iOS memory warnings are serious - immediate aggressive cleanup
    await this.onMemoryPressure('critical');
    
    // Additional iOS-specific cleanup
    const currentVideoId = this.videos[this.currentIndex]?._id;
    const toRelease = Array.from(this.videoRefs.keys()).filter(id => id !== currentVideoId);
    
    await Promise.all(toRelease.map(id => this.releaseVideo(id)));
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  // iOS-specific performance optimizations
  
  optimizeForIOSBattery(): void {
    // Reduce preload aggressiveness for battery optimization
    this.currentStrategy = {
      ...this.currentStrategy,
      ahead: Math.max(1, this.currentStrategy.ahead - 1),
      maxConcurrentLoads: 1,
      preloadTriggers: ['currentVideo > 85%'], // Later trigger
    };
    
    console.log('🔋 iOS battery optimization applied');
  }

  optimizeForIOSPerformance(): void {
    const capabilities = this.deviceCapabilities;
    if (!capabilities) return;

    if (capabilities.isLowEnd) {
      // Ultra-conservative for older iOS devices
      this.currentStrategy = {
        ahead: 1,
        behind: 0,
        maxConcurrentLoads: 1,
        preloadTriggers: ['currentVideo > 90%'],
      };
    } else {
      // More aggressive for newer iOS devices
      this.currentStrategy = {
        ahead: 3,
        behind: 1,
        maxConcurrentLoads: 2,
        preloadTriggers: ['scrollBeginDrag', 'currentVideo > 60%'],
      };
    }
    
    console.log('⚡ iOS performance optimization applied');
  }

  // iOS-specific error recovery
  
  async recoverFromAVPlayerError(videoId: string, error: any): Promise<boolean> {
    console.log(`🔄 iOS AVPlayer error recovery for ${videoId}:`, error);
    
    // iOS-specific error types
    if (error.domain === 'AVFoundationErrorDomain') {
      switch (error.code) {
        case -11800: // AVErrorUnknown
        case -11801: // AVErrorOutOfMemory
          // Memory-related errors - cleanup and retry
          await this.handleMemoryWarning();
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.retryFailedVideo(videoId);
          
        case -11838: // AVErrorContentIsNotAuthorized
        case -11839: // AVErrorApplicationIsNotAuthorized
          // Authorization errors - don't retry
          return false;
          
        case -11849: // AVErrorNoDataCaptured
        case -11850: // AVErrorSessionNotRunning
          // Session-related errors - reset and retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.retryFailedVideo(videoId);
          
        default:
          // Generic retry with backoff
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.retryFailedVideo(videoId);
      }
    }
    
    // Non-AVFoundation errors - generic retry
    return this.retryFailedVideo(videoId);
  }

  // Missing methods that are referenced in the code
  private getVideoSource(video: VideoData): any {
    // iOS can handle HLS efficiently
    if (video.hlsMasterPlaylistUrl) {
      return { 
        uri: video.hlsMasterPlaylistUrl,
        type: 'm3u8',
      };
    }
    
    if (video.masterPlaylistKey) {
      return { 
        uri: `${AWS_CDN_URL}${video.masterPlaylistKey}`,
        type: 'm3u8',
      };
    }
    
    return null;
  }

  private cleanupVideoRef(videoId: string): void {
    const videoRef = this.videoRefs.get(videoId);
    if (videoRef) {
      try {
        this.videoRefs.delete(videoId);
      } catch (error) {
        console.error(`Error cleaning up iOS video ref for ${videoId}:`, error);
      }
    }
  }

  async releaseVideo(videoId: string): Promise<void> {
    console.log(`🗑️ iOS releasing video ${videoId}`);
    
    // Clear any pending timeouts
    const timeout = this.preloadTimeouts.get(videoId);
    if (timeout) {
      clearTimeout(timeout);
      this.preloadTimeouts.delete(videoId);
    }
    
    // iOS cleanup
    this.cleanupVideoRef(videoId);
    
    // iOS has good automatic memory management
    // but we can still hint for immediate cleanup in low memory
    if (this.deviceCapabilities?.availableMemory && this.deviceCapabilities.availableMemory < 2) {
      if (global.gc && __DEV__) {
        setTimeout(() => {
          global.gc();
        }, 100);
      }
    }
  }

  isVideoReady(videoId: string): boolean {
    return this.videoRefs.has(videoId) && this.bufferState.ready.includes(videoId);
  }

  private async onVideoIndexChange(index: number): Promise<void> {
    this.currentIndex = index;
    this.updateBufferWindow();
  }

  private async onMemoryPressure(level: 'warning' | 'critical'): Promise<void> {
    console.log(`🚨 iOS memory pressure: ${level}`);
    
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
}