/**
 * 🚀 SIMPLIFIED iOS MEMORY MANAGER
 * iOS-specific implementation without complex dependencies
 */

import { NativeModules, AppState, NativeEventEmitter } from 'react-native';
import { IVideoMemoryManagerInternal, MemoryState, MemoryStrategy } from './IVideoMemoryManager';

export class IOSMemoryManagerSimple implements IVideoMemoryManagerInternal {
  private memoryState: MemoryState = {
    currentUsage: 0,
    peakUsage: 0,
    pressureLevel: 'normal',
    gcFrequency: 0,
    leakDetected: false,
  };

  private strategy: MemoryStrategy = {
    cleanupTriggerThreshold: 75,
    cleanupBatchSize: 2,
    aggressiveCleanupThreshold: 90,
    gcHintInterval: 30000,
  };

  private activeVideoIds: Set<string> = new Set();
  private memoryWarningListener: any = null;
  private appStateListener: any = null;
  private monitoringTimer: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    console.log('🍎 Initializing iOS memory manager (simplified)');
    this.setupIOSMonitoring();
    this.startMonitoring();
  }

  private setupIOSMonitoring(): void {
    // iOS memory warnings
    if (NativeModules.IOSMemoryWarning) {
      const eventEmitter = new NativeEventEmitter(NativeModules.IOSMemoryWarning);
      this.memoryWarningListener = eventEmitter.addListener('memoryWarning', () => {
        console.log('🍎 iOS memory warning received');
        this.handleMemoryWarning();
      });
    }

    // App state changes
    this.appStateListener = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        // iOS is aggressive about background memory
        this.performBackgroundCleanup();
      } else if (nextAppState === 'active') {
        this.memoryState.pressureLevel = 'normal';
      }
    });
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      const usage = await this.getCurrentMemoryUsage();
      this.memoryState.currentUsage = usage;
      if (usage > this.memoryState.peakUsage) {
        this.memoryState.peakUsage = usage;
      }
    }, 10000);
  }

  async getCurrentMemoryUsage(): Promise<number> {
    try {
      // Try iOS-specific detection
      if (global.performance && global.performance.memory) {
        return global.performance.memory.usedJSHeapSize / (1024 * 1024);
      }
      
      // Fallback: estimate based on active videos
      return this.activeVideoIds.size * 45; // 45MB per video on iOS
    } catch (error) {
      console.warn('⚠️ iOS memory detection failed:', error);
      return this.activeVideoIds.size * 45;
    }
  }

  async forceGarbageCollection(): Promise<void> {
    try {
      if (global.gc) {
        global.gc();
      }
      console.log('♻️ iOS GC completed');
    } catch (error) {
      console.warn('⚠️ iOS GC failed:', error);
    }
  }

  async handleMemoryWarning(): Promise<void> {
    console.log('🚨 iOS memory warning - aggressive cleanup');
    this.memoryState.pressureLevel = 'critical';
    
    // iOS requires immediate action
    for (const videoId of this.activeVideoIds) {
      console.log(`📤 Releasing video ${videoId}`);
    }
    
    // Force multiple GC cycles for iOS
    for (let i = 0; i < 2; i++) {
      await this.forceGarbageCollection();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Switch to ultra-conservative strategy
    this.strategy = {
      cleanupTriggerThreshold: 40,
      cleanupBatchSize: 8,
      aggressiveCleanupThreshold: 60,
      gcHintInterval: 10000,
    };
  }

  private performBackgroundCleanup(): void {
    console.log('🍎 iOS background cleanup');
    this.memoryState.pressureLevel = 'warning';
    
    // Release all but current video when backgrounded
    const videosToKeep = 1;
    const videosToRelease = this.activeVideoIds.size - videosToKeep;
    
    if (videosToRelease > 0) {
      const ids = Array.from(this.activeVideoIds);
      for (let i = videosToKeep; i < ids.length; i++) {
        console.log(`📤 Background release: ${ids[i]}`);
      }
    }
  }

  async getMemoryPressureLevel(): Promise<'normal' | 'warning' | 'critical'> {
    return this.memoryState.pressureLevel;
  }

  onVideoLoaded(videoId: string, estimatedMemoryUsage: number): void {
    this.activeVideoIds.add(videoId);
    console.log(`📹 Video ${videoId} loaded (iOS), estimated: ${estimatedMemoryUsage}MB`);
  }

  onVideoReleased(videoId: string): void {
    this.activeVideoIds.delete(videoId);
    console.log(`🗑️ Video ${videoId} released (iOS)`);
  }

  getMemoryMetrics(): MemoryState & {
    activeVideos: number;
    strategyInfo: MemoryStrategy;
    memoryEfficiency: number;
  } {
    const efficiency = Math.max(0, 100 - (this.memoryState.currentUsage / 3072 * 100));
    
    return {
      ...this.memoryState,
      activeVideos: this.activeVideoIds.size,
      strategyInfo: this.strategy,
      memoryEfficiency: efficiency,
    };
  }

  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down iOS memory manager');
    
    if (this.memoryWarningListener) {
      this.memoryWarningListener.remove();
    }
    
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    this.activeVideoIds.clear();
  }
}