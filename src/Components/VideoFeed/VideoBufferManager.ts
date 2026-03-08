/**
 * 🚀 ADVANCED VIDEO BUFFER MANAGER
 * CEO Priority: Intelligent preloading with zero black screens
 * Platform-agnostic base class with platform-specific implementations
 */

import { VideoData, BufferState, NetworkState, DeviceCapabilities } from './VideoTypes';
import { BUFFER_CONFIG, PERFORMANCE_THRESHOLDS } from './VideoConstants';
import PlatformDetection from './PlatformDetection';

export interface BufferStrategy {
  ahead: number;
  behind: number;
  maxConcurrentLoads: number;
  preloadTriggers: string[];
}

export abstract class VideoBufferManager {
  protected static instance: VideoBufferManager;
  protected bufferState: BufferState = {
    ahead: 0,
    behind: 0,
    loading: [],
    ready: [],
    failed: [],
  };
  
  protected currentStrategy: BufferStrategy = BUFFER_CONFIG.DEFAULT;
  protected videos: VideoData[] = [];
  protected currentIndex: number = 0;
  protected networkState: NetworkState | null = null;
  protected deviceCapabilities: DeviceCapabilities | null = null;

  // Factory method for platform-specific instances
  // Factory method moved to VideoBufferManagerFactory to avoid circular dependencies
  static async getInstance(): Promise<VideoBufferManager> {
    const { default: VideoBufferManagerFactory } = await import('./VideoBufferManagerFactory');
    return VideoBufferManagerFactory.getInstance();
  }

  async initialize(videos: VideoData[]): Promise<void> {
    this.videos = videos;
    this.deviceCapabilities = PlatformDetection.getCapabilities();
    await this.updateStrategy();
  }

  // CORE BUFFER MANAGEMENT METHODS
  
  abstract preloadVideo(video: VideoData, priority: number): Promise<boolean>;
  abstract releaseVideo(videoId: string): Promise<void>;
  abstract isVideoReady(videoId: string): boolean;
  
  // INTELLIGENT STRATEGY SELECTION
  
  async updateStrategy(): Promise<void> {
    const capabilities = this.deviceCapabilities || PlatformDetection.getCapabilities();
    const optimization = PlatformDetection.getOptimizationStrategy();
    
    if (capabilities.isLowEnd || capabilities.availableMemory < 3) {
      this.currentStrategy = {
        ...BUFFER_CONFIG.LOW_MEMORY,
        preloadTriggers: ['scrollBeginDrag', 'currentVideo > 80%'],
      };
    } else if (capabilities.availableMemory > 6) {
      this.currentStrategy = {
        ...BUFFER_CONFIG.HIGH_PERFORMANCE,
        preloadTriggers: ['scrollBeginDrag', 'currentVideo > 50%', 'networkImproved'],
      };
    } else {
      this.currentStrategy = {
        ...BUFFER_CONFIG.DEFAULT,
        preloadTriggers: ['scrollBeginDrag', 'currentVideo > 70%'],
      };
    }
    
    console.log('🎯 Buffer strategy updated:', this.currentStrategy);
  }

  // PRELOAD ORCHESTRATION
  
  async onVideoIndexChange(newIndex: number): Promise<void> {
    const oldIndex = this.currentIndex;
    this.currentIndex = newIndex;
    
    console.log(`📊 Buffer: Index ${oldIndex} → ${newIndex}`);
    
    // Calculate what needs to be preloaded/released
    const preloadPromises: Promise<void>[] = [];
    
    // Preload ahead
    for (let i = 1; i <= this.currentStrategy.ahead; i++) {
      const targetIndex = newIndex + i;
      if (targetIndex < this.videos.length) {
        preloadPromises.push(this.ensureVideoPreloaded(targetIndex, 100 - (i * 20)));
      }
    }
    
    // Preload behind (for reverse scrolling)
    for (let i = 1; i <= this.currentStrategy.behind; i++) {
      const targetIndex = newIndex - i;
      if (targetIndex >= 0) {
        preloadPromises.push(this.ensureVideoPreloaded(targetIndex, 50 - (i * 10)));
      }
    }
    
    // Release videos outside buffer range
    await this.releaseDistantVideos(newIndex);
    
    // Execute preloading with concurrency control
    await this.executeConcurrentPreloads(preloadPromises);
  }

  private async ensureVideoPreloaded(index: number, priority: number): Promise<void> {
    const video = this.videos[index];
    if (!video) return;
    
    const videoId = video._id;
    
    // Skip if already ready or loading
    if (this.bufferState.ready.includes(videoId) || 
        this.bufferState.loading.includes(videoId)) {
      return;
    }
    
    // Skip if previously failed (unless high priority)
    if (this.bufferState.failed.includes(videoId) && priority < 80) {
      return;
    }
    
    try {
      // Mark as loading
      this.bufferState.loading.push(videoId);
      
      // Platform-specific preloading
      const success = await this.preloadVideo(video, priority);
      
      // Update state
      this.bufferState.loading = this.bufferState.loading.filter(id => id !== videoId);
      
      if (success) {
        if (!this.bufferState.ready.includes(videoId)) {
          this.bufferState.ready.push(videoId);
        }
        this.bufferState.failed = this.bufferState.failed.filter(id => id !== videoId);
        console.log(`✅ Video ${index} preloaded successfully`);
      } else {
        if (!this.bufferState.failed.includes(videoId)) {
          this.bufferState.failed.push(videoId);
        }
        console.log(`❌ Video ${index} preload failed`);
      }
    } catch (error) {
      console.error(`💥 Video ${index} preload error:`, error);
      this.bufferState.loading = this.bufferState.loading.filter(id => id !== videoId);
      if (!this.bufferState.failed.includes(videoId)) {
        this.bufferState.failed.push(videoId);
      }
    }
  }

  private async releaseDistantVideos(currentIndex: number): Promise<void> {
    const releasePromises: Promise<void>[] = [];
    const maxDistance = Math.max(this.currentStrategy.ahead, this.currentStrategy.behind) + 2;
    
    // Find videos to release
    for (const videoId of this.bufferState.ready) {
      const videoIndex = this.videos.findIndex(v => v._id === videoId);
      if (videoIndex >= 0 && Math.abs(videoIndex - currentIndex) > maxDistance) {
        releasePromises.push(this.releaseVideo(videoId));
        console.log(`🗑️ Releasing video ${videoIndex} (distance: ${Math.abs(videoIndex - currentIndex)})`);
      }
    }
    
    await Promise.all(releasePromises);
    
    // Update buffer state
    this.bufferState.ready = this.bufferState.ready.filter(videoId => {
      const videoIndex = this.videos.findIndex(v => v._id === videoId);
      return videoIndex < 0 || Math.abs(videoIndex - currentIndex) <= maxDistance;
    });
  }

  private async executeConcurrentPreloads(promises: Promise<void>[]): Promise<void> {
    // Execute with concurrency limit
    const concurrencyLimit = this.currentStrategy.maxConcurrentLoads;
    
    for (let i = 0; i < promises.length; i += concurrencyLimit) {
      const batch = promises.slice(i, i + concurrencyLimit);
      await Promise.allSettled(batch);
      
      // Brief pause between batches to prevent overwhelming the system
      if (i + concurrencyLimit < promises.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // PERFORMANCE MONITORING
  
  getBufferHealth(): {
    readyCount: number;
    loadingCount: number;
    failedCount: number;
    efficiency: number;
  } {
    const readyCount = this.bufferState.ready.length;
    const loadingCount = this.bufferState.loading.length;
    const failedCount = this.bufferState.failed.length;
    const totalProcessed = readyCount + failedCount;
    
    return {
      readyCount,
      loadingCount,
      failedCount,
      efficiency: totalProcessed > 0 ? (readyCount / totalProcessed) * 100 : 0,
    };
  }

  // NETWORK-AWARE ADJUSTMENTS
  
  onNetworkStateChange(networkState: NetworkState): void {
    this.networkState = networkState;
    
    // Adjust strategy based on network conditions
    if (networkState.quality === 'poor' || networkState.isMetered) {
      this.currentStrategy = {
        ...this.currentStrategy,
        ahead: Math.max(1, this.currentStrategy.ahead - 1),
        maxConcurrentLoads: 1,
      };
    } else if (networkState.quality === 'excellent') {
      this.currentStrategy = {
        ...this.currentStrategy,
        ahead: Math.min(5, this.currentStrategy.ahead + 1),
        maxConcurrentLoads: Math.min(3, this.currentStrategy.maxConcurrentLoads + 1),
      };
    }
  }

  // MEMORY PRESSURE HANDLING
  
  async onMemoryPressure(level: 'warning' | 'critical'): Promise<void> {
    console.log(`🚨 Memory pressure: ${level}`);
    
    if (level === 'critical') {
      // Aggressive cleanup - keep only current and next video
      const currentVideoId = this.videos[this.currentIndex]?._id;
      const nextVideoId = this.videos[this.currentIndex + 1]?._id;
      
      const toKeep = [currentVideoId, nextVideoId].filter(Boolean);
      const toRelease = this.bufferState.ready.filter(id => !toKeep.includes(id));
      
      await Promise.all(toRelease.map(id => this.releaseVideo(id)));
      
      this.bufferState.ready = this.bufferState.ready.filter(id => toKeep.includes(id));
      
      // Temporarily reduce strategy
      this.currentStrategy = {
        ...BUFFER_CONFIG.LOW_MEMORY,
        ahead: 1,
        behind: 0,
        maxConcurrentLoads: 1,
        preloadTriggers: ['currentVideo > 90%'],
      };
    } else {
      // Moderate cleanup - reduce buffer size
      this.currentStrategy = {
        ...this.currentStrategy,
        ahead: Math.max(1, this.currentStrategy.ahead - 1),
        maxConcurrentLoads: 1,
      };
    }
  }

  // PUBLIC API
  
  getVideoState(videoId: string): 'unknown' | 'loading' | 'ready' | 'failed' {
    if (this.bufferState.loading.includes(videoId)) return 'loading';
    if (this.bufferState.ready.includes(videoId)) return 'ready';
    if (this.bufferState.failed.includes(videoId)) return 'failed';
    return 'unknown';
  }

  async retryFailedVideo(videoId: string): Promise<boolean> {
    const videoIndex = this.videos.findIndex(v => v._id === videoId);
    if (videoIndex < 0) return false;
    
    // Remove from failed list
    this.bufferState.failed = this.bufferState.failed.filter(id => id !== videoId);
    
    // Retry preload with high priority
    await this.ensureVideoPreloaded(videoIndex, 95);
    
    return this.bufferState.ready.includes(videoId);
  }
}