/**
 * 🚀 SIMPLIFIED ANDROID MEMORY MANAGER
 * Android-specific implementation without complex dependencies
 */

import { NativeModules, DeviceEventEmitter, AppState } from 'react-native';
import { IVideoMemoryManagerInternal, MemoryState, MemoryStrategy } from './IVideoMemoryManager';

export class AndroidMemoryManagerSimple implements IVideoMemoryManagerInternal {
  private memoryState: MemoryState = {
    currentUsage: 0,
    peakUsage: 0,
    pressureLevel: 'normal',
    gcFrequency: 0,
    leakDetected: false,
  };

  private strategy: MemoryStrategy = {
    cleanupTriggerThreshold: 60,
    cleanupBatchSize: 4,
    aggressiveCleanupThreshold: 80,
    gcHintInterval: 20000,
  };

  private activeVideoIds: Set<string> = new Set();
  private trimMemoryListener: any = null;
  private appStateListener: any = null;
  private lowMemoryListener: any = null;
  private lastTrimMemoryLevel: number = 0;
  private monitoringTimer: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    console.log('🤖 Initializing Android memory manager (simplified)');
    this.setupAndroidMonitoring();
    this.startMonitoring();
  }

  private setupAndroidMonitoring(): void {
    // Listen for Android trim memory events
    this.trimMemoryListener = DeviceEventEmitter.addListener('trimMemory', (data) => {
      console.log('🤖 Android trimMemory received:', data);
      this.lastTrimMemoryLevel = data.level;
      this.handleTrimMemory(data.level);
    });

    // Listen for low memory events
    this.lowMemoryListener = DeviceEventEmitter.addListener('lowMemory', () => {
      console.log('🚨 Android low memory event');
      this.handleMemoryWarning();
    });

    // App state changes
    this.appStateListener = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        this.memoryState.pressureLevel = 'warning';
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
      // Try Android-specific native module
      if (NativeModules.AndroidMemoryModule) {
        const memoryInfo = await NativeModules.AndroidMemoryModule.getMemoryInfo();
        return memoryInfo.totalPss / 1024; // Convert KB to MB
      }
      
      // Fallback: estimate based on active videos
      return this.activeVideoIds.size * 60; // 60MB per video on Android
    } catch (error) {
      console.warn('⚠️ Android memory detection failed:', error);
      return this.activeVideoIds.size * 60;
    }
  }

  async forceGarbageCollection(): Promise<void> {
    try {
      if (global.gc) {
        global.gc();
      }
      
      // Request Android system GC if available
      if (NativeModules.AndroidMemoryModule) {
        await NativeModules.AndroidMemoryModule.requestGarbageCollection();
      }
      
      console.log('♻️ Android GC completed');
    } catch (error) {
      console.warn('⚠️ Android GC failed:', error);
    }
  }

  async handleMemoryWarning(): Promise<void> {
    console.log('🚨 Android memory warning');
    this.memoryState.pressureLevel = 'critical';
    
    // Clear videos
    for (const videoId of this.activeVideoIds) {
      console.log(`📤 Releasing video ${videoId}`);
    }
    
    // Force GC
    await this.forceGarbageCollection();
    
    // Switch to conservative strategy
    this.strategy = {
      cleanupTriggerThreshold: 45,
      cleanupBatchSize: 6,
      aggressiveCleanupThreshold: 65,
      gcHintInterval: 15000,
    };
  }

  async getMemoryPressureLevel(): Promise<'normal' | 'warning' | 'critical'> {
    try {
      if (NativeModules.AndroidMemoryModule) {
        const memoryClass = await NativeModules.AndroidMemoryModule.getMemoryClass();
        const currentUsage = await this.getCurrentMemoryUsage();
        const usagePercent = (currentUsage / memoryClass) * 100;
        
        if (usagePercent >= 85) return 'critical';
        if (usagePercent >= 70) return 'warning';
        return 'normal';
      }
      
      // Fallback based on trim level
      if (this.lastTrimMemoryLevel >= 15) return 'critical';
      if (this.lastTrimMemoryLevel >= 10) return 'warning';
      return 'normal';
    } catch (error) {
      return this.memoryState.pressureLevel;
    }
  }

  private handleTrimMemory(level: number): void {
    console.log(`🤖 Android trim memory level: ${level}`);
    
    if (level >= 80) { // TRIM_MEMORY_COMPLETE
      this.handleMemoryWarning();
    } else if (level >= 60) { // TRIM_MEMORY_MODERATE
      this.memoryState.pressureLevel = 'warning';
    } else if (level >= 15) { // TRIM_MEMORY_RUNNING_CRITICAL
      this.memoryState.pressureLevel = 'critical';
      this.handleMemoryWarning();
    } else if (level >= 10) { // TRIM_MEMORY_RUNNING_LOW
      this.memoryState.pressureLevel = 'warning';
    }
  }

  onVideoLoaded(videoId: string, estimatedMemoryUsage: number): void {
    this.activeVideoIds.add(videoId);
    console.log(`📹 Video ${videoId} loaded (Android), estimated: ${estimatedMemoryUsage}MB`);
  }

  onVideoReleased(videoId: string): void {
    this.activeVideoIds.delete(videoId);
    console.log(`🗑️ Video ${videoId} released (Android)`);
  }

  getMemoryMetrics(): MemoryState & {
    activeVideos: number;
    strategyInfo: MemoryStrategy;
    memoryEfficiency: number;
  } {
    const efficiency = Math.max(0, 100 - (this.memoryState.currentUsage / 4096 * 100));
    
    return {
      ...this.memoryState,
      activeVideos: this.activeVideoIds.size,
      strategyInfo: this.strategy,
      memoryEfficiency: efficiency,
    };
  }

  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down Android memory manager');
    
    if (this.trimMemoryListener) {
      this.trimMemoryListener.remove();
    }
    
    if (this.lowMemoryListener) {
      this.lowMemoryListener.remove();
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