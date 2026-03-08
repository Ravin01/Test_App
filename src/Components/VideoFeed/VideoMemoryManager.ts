/**
 * 🚀 ENTERPRISE VIDEO MEMORY MANAGER
 * CEO Priority: Zero memory leaks, optimal cleanup strategies
 * Platform-agnostic base with iOS/Android specific implementations
 */

import { DeviceCapabilities, VideoData } from './VideoTypes';
import { MEMORY_CONFIG, PERFORMANCE_THRESHOLDS } from './VideoConstants';
import PlatformDetection from './PlatformDetection';

export interface MemoryState {
  currentUsage: number; // MB
  peakUsage: number; // MB  
  pressureLevel: 'normal' | 'warning' | 'critical';
  gcFrequency: number; // GCs per minute
  leakDetected: boolean;
}

export interface MemoryStrategy {
  cleanupTriggerThreshold: number; // % memory usage
  cleanupBatchSize: number;
  aggressiveCleanupThreshold: number;
  gcHintInterval: number; // ms
}

export abstract class VideoMemoryManager {
  protected static instance: VideoMemoryManager;
  protected memoryState: MemoryState = {
    currentUsage: 0,
    peakUsage: 0,
    pressureLevel: 'normal',
    gcFrequency: 0,
    leakDetected: false,
  };

  protected strategy: MemoryStrategy = {
    cleanupTriggerThreshold: 70,
    cleanupBatchSize: 3,
    aggressiveCleanupThreshold: 85,
    gcHintInterval: 30000,
  };

  protected activeVideoIds: Set<string> = new Set();
  protected memorySnapshots: number[] = [];
  protected gcTimer: NodeJS.Timeout | null = null;
  protected monitoringTimer: NodeJS.Timeout | null = null;

  // Factory method removed to avoid circular dependencies
  // Use VideoMemoryManagerFactory.getInstance() instead

  // ABSTRACT METHODS - Platform specific implementations
  abstract getCurrentMemoryUsage(): Promise<number>;
  abstract forceGarbageCollection(): Promise<void>;
  abstract handleMemoryWarning(): Promise<void>;
  abstract getMemoryPressureLevel(): Promise<'normal' | 'warning' | 'critical'>;

  async initialize(): Promise<void> {
    const capabilities = PlatformDetection.getCapabilities();
    this.optimizeStrategyForDevice(capabilities);
    await this.startMonitoring();
    console.log('🧠 Memory manager initialized with strategy:', this.strategy);
  }

  protected optimizeStrategyForDevice(capabilities: DeviceCapabilities): void {
    if (capabilities.isLowEnd || capabilities.availableMemory < 3) {
      // Ultra-aggressive for low-end devices
      this.strategy = {
        cleanupTriggerThreshold: 50,
        cleanupBatchSize: 5,
        aggressiveCleanupThreshold: 70,
        gcHintInterval: 15000,
      };
    } else if (capabilities.availableMemory > 8) {
      // More relaxed for high-end devices
      this.strategy = {
        cleanupTriggerThreshold: 85,
        cleanupBatchSize: 2,
        aggressiveCleanupThreshold: 95,
        gcHintInterval: 60000,
      };
    }
    // Default strategy used for mid-range devices
  }

  // MEMORY MONITORING

  private async startMonitoring(): Promise<void> {
    // Start periodic memory monitoring
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.updateMemoryState();
        await this.checkForLeaks();
        await this.performMaintenanceIfNeeded();
      } catch (error) {
        console.error('❌ Memory monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds

    // Start GC hinting timer
    this.gcTimer = setInterval(async () => {
      if (this.memoryState.pressureLevel !== 'normal') {
        await this.forceGarbageCollection();
      }
    }, this.strategy.gcHintInterval);
  }

  private async updateMemoryState(): Promise<void> {
    const currentUsage = await this.getCurrentMemoryUsage();
    const pressureLevel = await this.getMemoryPressureLevel();
    
    // Update memory state
    this.memoryState.currentUsage = currentUsage;
    if (currentUsage > this.memoryState.peakUsage) {
      this.memoryState.peakUsage = currentUsage;
    }
    this.memoryState.pressureLevel = pressureLevel;
    
    // Store snapshot for leak detection
    this.memorySnapshots.push(currentUsage);
    if (this.memorySnapshots.length > 60) { // Keep 5 minutes of data
      this.memorySnapshots.shift();
    }
  }

  private async checkForLeaks(): Promise<void> {
    if (this.memorySnapshots.length < 20) return; // Need enough data
    
    // Simple leak detection: consistent growth over time
    const recent = this.memorySnapshots.slice(-10);
    const older = this.memorySnapshots.slice(-20, -10);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const growthRate = (recentAvg - olderAvg) / olderAvg;
    
    if (growthRate > 0.1) { // 10% growth over 50 seconds
      this.memoryState.leakDetected = true;
      console.warn('🚨 Potential memory leak detected:', {
        growthRate: `${(growthRate * 100).toFixed(1)}%`,
        recentAvg: `${recentAvg.toFixed(1)}MB`,
        olderAvg: `${olderAvg.toFixed(1)}MB`,
      });
      
      // Trigger aggressive cleanup
      await this.performAggressiveCleanup();
    } else {
      this.memoryState.leakDetected = false;
    }
  }

  private async performMaintenanceIfNeeded(): Promise<void> {
    const usagePercent = (this.memoryState.currentUsage / (PlatformDetection.getCapabilities().availableMemory * 1024)) * 100;
    
    if (usagePercent >= this.strategy.aggressiveCleanupThreshold) {
      await this.performAggressiveCleanup();
    } else if (usagePercent >= this.strategy.cleanupTriggerThreshold) {
      await this.performRoutineCleanup();
    }
  }

  // CLEANUP OPERATIONS

  async performRoutineCleanup(): Promise<void> {
    console.log('🧹 Performing routine memory cleanup');
    
    // Get videos to cleanup (furthest from current position)
    const videosToCleanup = await this.selectVideosForCleanup(this.strategy.cleanupBatchSize);
    
    // Notify buffer manager to release these videos
    for (const videoId of videosToCleanup) {
      try {
        // Emit event for buffer manager to handle
        // This would be handled by the buffer manager listening to events
        this.notifyVideoRelease(videoId);
      } catch (error) {
        console.error(`Error cleaning up video ${videoId}:`, error);
      }
    }
    
    // Hint GC after cleanup
    setTimeout(async () => {
      await this.forceGarbageCollection();
    }, 100);
  }

  async performAggressiveCleanup(): Promise<void> {
    console.log('🚨 Performing aggressive memory cleanup');
    
    // Clear all but the most essential videos
    const videosToCleanup = await this.selectVideosForCleanup(this.strategy.cleanupBatchSize * 2);
    
    for (const videoId of videosToCleanup) {
      this.notifyVideoRelease(videoId);
    }
    
    // Clear memory snapshots to free up space
    this.memorySnapshots = this.memorySnapshots.slice(-10);
    
    // Force immediate GC
    await this.forceGarbageCollection();
    
    // Platform-specific aggressive cleanup
    await this.platformSpecificAggressiveCleanup();
  }

  protected abstract platformSpecificAggressiveCleanup(): Promise<void>;

  private async selectVideosForCleanup(count: number): Promise<string[]> {
    // This would integrate with buffer manager to get list of cached videos
    // For now, return empty array - actual implementation would coordinate
    // with buffer manager to identify least important videos to release
    return [];
  }

  private notifyVideoRelease(videoId: string): void {
    // This would emit an event or call buffer manager directly
    // Implementation depends on the event system architecture
    console.log(`📤 Requesting release of video ${videoId}`);
  }

  // VIDEO LIFECYCLE TRACKING

  onVideoLoaded(videoId: string, estimatedMemoryUsage: number): void {
    this.activeVideoIds.add(videoId);
    console.log(`📹 Video ${videoId} loaded, estimated memory: ${estimatedMemoryUsage.toFixed(1)}MB`);
  }

  onVideoReleased(videoId: string): void {
    this.activeVideoIds.delete(videoId);
    console.log(`🗑️ Video ${videoId} released from memory`);
  }

  // PERFORMANCE METRICS

  getMemoryMetrics(): MemoryState & {
    activeVideos: number;
    strategyInfo: MemoryStrategy;
    memoryEfficiency: number;
  } {
    const capabilities = PlatformDetection.getCapabilities();
    const totalAvailableMemoryMB = capabilities.availableMemory * 1024;
    const memoryEfficiency = totalAvailableMemoryMB > 0 ? 
      (1 - (this.memoryState.currentUsage / totalAvailableMemoryMB)) * 100 : 0;
    
    return {
      ...this.memoryState,
      activeVideos: this.activeVideoIds.size,
      strategyInfo: this.strategy,
      memoryEfficiency,
    };
  }

  // EMERGENCY PROTOCOLS

  async handleMemoryEmergency(): Promise<void> {
    console.log('🆘 MEMORY EMERGENCY - Executing emergency protocols');
    
    // 1. Immediately clear all non-essential videos
    for (const videoId of this.activeVideoIds) {
      this.notifyVideoRelease(videoId);
    }
    
    // 2. Clear all monitoring data
    this.memorySnapshots = [];
    
    // 3. Force multiple GC cycles
    for (let i = 0; i < 3; i++) {
      await this.forceGarbageCollection();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 4. Switch to emergency strategy
    this.strategy = {
      cleanupTriggerThreshold: 30,
      cleanupBatchSize: 10,
      aggressiveCleanupThreshold: 50,
      gcHintInterval: 5000,
    };
    
    // 5. Platform-specific emergency handling
    await this.handleMemoryWarning();
  }

  // CLEANUP

  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down memory manager');
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    
    // Final cleanup
    await this.performAggressiveCleanup();
  }
}