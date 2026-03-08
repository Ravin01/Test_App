/**
 * 🚀 ANDROID-SPECIFIC MEMORY MANAGER
 * Optimized for Android device fragmentation and memory management
 */

import { BaseVideoMemoryManager } from './BaseVideoMemoryManager';
import { NativeModules, DeviceEventEmitter, AppState } from 'react-native';

export class AndroidMemoryManager extends BaseVideoMemoryManager {
  private trimMemoryListener: any = null;
  private appStateListener: any = null;
  private lowMemoryListener: any = null;
  private lastTrimMemoryLevel: number = 0;

  async initialize(): Promise<void> {
    await super.initialize();
    await this.setupAndroidSpecificMonitoring();
  }

  private async setupAndroidSpecificMonitoring(): Promise<void> {
    // Listen for Android ComponentCallbacks2.onTrimMemory
    this.trimMemoryListener = DeviceEventEmitter.addListener('trimMemory', async (data) => {
      console.log('🤖 Android trimMemory received:', data);
      this.lastTrimMemoryLevel = data.level;
      await this.handleTrimMemory(data.level);
    });

    // Listen for low memory events
    this.lowMemoryListener = DeviceEventEmitter.addListener('lowMemory', async () => {
      console.log('🚨 Android low memory event received');
      await this.handleAndroidLowMemory();
    });

    // Listen for app state changes
    this.appStateListener = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'background') {
        await this.handleAppBackground();
      } else if (nextAppState === 'active') {
        await this.handleAppForeground();
      }
    });
  }

  async getCurrentMemoryUsage(): Promise<number> {
    try {
      // Use Android-specific native module for accurate memory info
      if (NativeModules.AndroidMemoryModule) {
        const memoryInfo = await NativeModules.AndroidMemoryModule.getMemoryInfo();
        return memoryInfo.totalPss / 1024; // Convert KB to MB
      }
      
      // Fallback: estimate based on JS heap
      if (global.performance && global.performance.memory) {
        return global.performance.memory.usedJSHeapSize / (1024 * 1024);
      }
      
      // Last resort: rough estimation
      return this.memoryState.currentUsage || 60; // Android typically uses more RAM
    } catch (error) {
      console.error('❌ Android memory usage detection failed:', error);
      return this.memoryState.currentUsage || 60;
    }
  }

  async forceGarbageCollection(): Promise<void> {
    try {
      // Android-specific GC strategies
      if (global.gc) {
        global.gc();
      }
      
      // Request Android system GC
      if (NativeModules.AndroidMemoryModule) {
        await NativeModules.AndroidMemoryModule.requestGarbageCollection();
      }
      
      // Clear Android-specific caches
      await this.clearAndroidCaches();
      
      console.log('♻️ Android garbage collection completed');
    } catch (error) {
      console.error('❌ Android GC error:', error);
    }
  }

  async getMemoryPressureLevel(): Promise<'normal' | 'warning' | 'critical'> {
    try {
      // Use Android ActivityManager to get memory class info
      if (NativeModules.AndroidMemoryModule) {
        const memoryClass = await NativeModules.AndroidMemoryModule.getMemoryClass();
        const currentUsage = await this.getCurrentMemoryUsage();
        const usagePercent = (currentUsage / memoryClass) * 100;
        
        if (usagePercent >= 85) return 'critical';
        if (usagePercent >= 70) return 'warning';
        return 'normal';
      }
      
      // Fallback: use last trim memory level
      if (this.lastTrimMemoryLevel >= 15) return 'critical'; // TRIM_MEMORY_RUNNING_CRITICAL
      if (this.lastTrimMemoryLevel >= 10) return 'warning';  // TRIM_MEMORY_RUNNING_LOW
      return 'normal';
    } catch (error) {
      console.error('❌ Android memory pressure detection failed:', error);
      return 'warning'; // Conservative fallback
    }
  }

  async handleMemoryWarning(): Promise<void> {
    console.log('🚨 Android Memory Warning - Executing response protocol');
    
    this.memoryState.pressureLevel = 'critical';
    
    // Android-specific memory warning response
    await this.performAggressiveCleanup();
    await this.androidSpecificMemoryWarningCleanup();
    
    // Multiple GC cycles with Android-specific timing
    for (let i = 0; i < 2; i++) {
      await this.forceGarbageCollection();
      await new Promise(resolve => setTimeout(resolve, 200)); // Android needs more time
    }
    
    // Switch to conservative strategy
    this.strategy = {
      cleanupTriggerThreshold: 45,
      cleanupBatchSize: 6,
      aggressiveCleanupThreshold: 65,
      gcHintInterval: 15000,
    };
  }

  async handleTrimMemory(level: number): Promise<void> {
    console.log(`🤖 Android trimMemory level: ${level}`);
    
    // Android ComponentCallbacks2 constants:
    // TRIM_MEMORY_RUNNING_MODERATE = 5
    // TRIM_MEMORY_RUNNING_LOW = 10  
    // TRIM_MEMORY_RUNNING_CRITICAL = 15
    // TRIM_MEMORY_UI_HIDDEN = 20
    // TRIM_MEMORY_BACKGROUND = 40
    // TRIM_MEMORY_MODERATE = 60
    // TRIM_MEMORY_COMPLETE = 80
    
    if (level >= 80) { // TRIM_MEMORY_COMPLETE
      await this.handleMemoryEmergency();
    } else if (level >= 60) { // TRIM_MEMORY_MODERATE
      await this.performAggressiveCleanup();
    } else if (level >= 40) { // TRIM_MEMORY_BACKGROUND
      await this.handleAppBackground();
    } else if (level >= 20) { // TRIM_MEMORY_UI_HIDDEN
      await this.performRoutineCleanup();
    } else if (level >= 15) { // TRIM_MEMORY_RUNNING_CRITICAL
      await this.handleMemoryWarning();
    } else if (level >= 10) { // TRIM_MEMORY_RUNNING_LOW
      this.memoryState.pressureLevel = 'warning';
      await this.performRoutineCleanup();
    } else if (level >= 5) { // TRIM_MEMORY_RUNNING_MODERATE
      this.memoryState.pressureLevel = 'warning';
      // Light cleanup
      const videosToCleanup = await this.selectVideosForCleanup(2);
      for (const videoId of videosToCleanup) {
        this.notifyVideoRelease(videoId);
      }
    }
  }

  private async handleAndroidLowMemory(): Promise<void> {
    console.log('🆘 Android low memory - Emergency protocols');
    
    // This is the most severe Android memory event
    await this.handleMemoryEmergency();
    
    // Android-specific emergency measures
    if (NativeModules.AndroidMemoryModule) {
      await NativeModules.AndroidMemoryModule.emergencyCleanup();
    }
  }

  private async androidSpecificMemoryWarningCleanup(): Promise<void> {
    try {
      // Clear Android-specific caches
      if (NativeModules.AndroidCacheModule) {
        await NativeModules.AndroidCacheModule.clearMemoryCache();
      }
      
      // Clear Bitmap caches
      if (NativeModules.BitmapCacheModule) {
        await NativeModules.BitmapCacheModule.clearMemoryCache();
      }
      
      // Clear ExoPlayer caches
      if (NativeModules.ExoPlayerCacheModule) {
        await NativeModules.ExoPlayerCacheModule.clearMemoryCache();
      }
      
      console.log('🧹 Android-specific caches cleared');
    } catch (error) {
      console.error('❌ Android-specific cleanup error:', error);
    }
  }

  private async clearAndroidCaches(): void {
    // Clear transient Android caches
    this.memorySnapshots = this.memorySnapshots.slice(-8); // Keep more history than iOS
    
    // Android-specific cache clearing
    try {
      if (NativeModules.AndroidMemoryModule) {
        await NativeModules.AndroidMemoryModule.clearTransientCaches();
      }
    } catch (error) {
      console.error('❌ Android cache clearing error:', error);
    }
  }

  protected async platformSpecificAggressiveCleanup(): Promise<void> {
    // Android-specific aggressive cleanup
    
    // 1. Clear all Android caches
    await this.androidSpecificMemoryWarningCleanup();
    
    // 2. Request system to reclaim memory
    if (NativeModules.AndroidMemoryModule) {
      await NativeModules.AndroidMemoryModule.reclaimMemory();
    }
    
    // 3. Adjust monitoring frequency based on device performance
    const capabilities = require('./PlatformDetection').default.getCapabilities();
    const monitoringInterval = capabilities.isLowEnd ? 15000 : 8000;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = setInterval(async () => {
        try {
          await this.updateMemoryState();
          await this.checkForLeaks();
        } catch (error) {
          console.error('❌ Android monitoring error:', error);
        }
      }, monitoringInterval);
    }
  }

  private async handleAppBackground(): Promise<void> {
    console.log('🤖 Android app backgrounded - Background optimization');
    
    // Android allows more background activity than iOS
    // But still need to be conservative to avoid being killed
    
    // Moderate cleanup - keep more videos than iOS
    await this.performRoutineCleanup();
    
    // Reduce monitoring frequency but don't stop completely
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = setInterval(async () => {
        try {
          await this.updateMemoryState();
        } catch (error) {
          console.error('❌ Background monitoring error:', error);
        }
      }, 30000); // Check every 30 seconds in background
    }
    
    // Hint GC for background
    setTimeout(async () => {
      await this.forceGarbageCollection();
    }, 2000);
  }

  private async handleAppForeground(): Promise<void> {
    console.log('🤖 Android app foregrounded - Resuming operations');
    
    // Resume normal monitoring
    await this.startMonitoring();
    
    // Check current memory state
    await this.updateMemoryState();
    
    // Restore strategy based on current conditions
    if (this.memoryState.pressureLevel === 'normal') {
      const capabilities = require('./PlatformDetection').default.getCapabilities();
      this.optimizeStrategyForDevice(capabilities);
    }
  }

  // Android device-specific optimizations

  async optimizeForManufacturer(manufacturer: string, model: string): Promise<void> {
    console.log(`🤖 Optimizing for ${manufacturer} ${model}`);
    
    switch (manufacturer.toLowerCase()) {
      case 'samsung':
        await this.optimizeForSamsung(model);
        break;
      case 'xiaomi':
        await this.optimizeForXiaomi(model);
        break;
      case 'huawei':
        await this.optimizeForHuawei(model);
        break;
      case 'oneplus':
        await this.optimizeForOnePlus(model);
        break;
      default:
        await this.optimizeForGenericAndroid();
    }
  }

  private async optimizeForSamsung(model: string): Promise<void> {
    // Samsung devices have aggressive memory management
    if (model.toLowerCase().includes('galaxy a')) {
      // Mid-range Samsung - conservative
      this.strategy = {
        cleanupTriggerThreshold: 55,
        cleanupBatchSize: 4,
        aggressiveCleanupThreshold: 75,
        gcHintInterval: 20000,
      };
    } else {
      // Flagship Samsung - can be more aggressive
      this.strategy = {
        cleanupTriggerThreshold: 70,
        cleanupBatchSize: 3,
        aggressiveCleanupThreshold: 85,
        gcHintInterval: 25000,
      };
    }
  }

  private async optimizeForXiaomi(model: string): Promise<void> {
    // MIUI has very aggressive memory management
    this.strategy = {
      cleanupTriggerThreshold: 50,
      cleanupBatchSize: 5,
      aggressiveCleanupThreshold: 70,
      gcHintInterval: 15000, // More frequent cleanup needed
    };
  }

  private async optimizeForHuawei(model: string): Promise<void> {
    // EMUI memory management varies by version
    this.strategy = {
      cleanupTriggerThreshold: 60,
      cleanupBatchSize: 4,
      aggressiveCleanupThreshold: 80,
      gcHintInterval: 20000,
    };
  }

  private async optimizeForOnePlus(model: string): Promise<void> {
    // OxygenOS is generally memory-friendly
    this.strategy = {
      cleanupTriggerThreshold: 75,
      cleanupBatchSize: 2,
      aggressiveCleanupThreshold: 90,
      gcHintInterval: 30000,
    };
  }

  private async optimizeForGenericAndroid(): Promise<void> {
    // Conservative defaults for unknown manufacturers
    this.strategy = {
      cleanupTriggerThreshold: 60,
      cleanupBatchSize: 4,
      aggressiveCleanupThreshold: 80,
      gcHintInterval: 20000,
    };
  }

  // Android-specific metrics

  async getAndroidSpecificMetrics(): Promise<any> {
    try {
      const baseMetrics = this.getMemoryMetrics();
      
      const androidMetrics = {
        lastTrimMemoryLevel: this.lastTrimMemoryLevel,
        heapSize: 0,
        heapFree: 0,
        nativeHeapSize: 0,
        nativeHeapFree: 0,
      };
      
      if (NativeModules.AndroidMemoryModule) {
        const memoryInfo = await NativeModules.AndroidMemoryModule.getDetailedMemoryInfo();
        androidMetrics.heapSize = memoryInfo.heapSize;
        androidMetrics.heapFree = memoryInfo.heapFree;
        androidMetrics.nativeHeapSize = memoryInfo.nativeHeapSize;
        androidMetrics.nativeHeapFree = memoryInfo.nativeHeapFree;
      }
      
      return {
        ...baseMetrics,
        android: androidMetrics,
      };
    } catch (error) {
      console.error('❌ Android metrics collection failed:', error);
      return this.getMemoryMetrics();
    }
  }

  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down Android memory manager');
    
    // Remove Android-specific listeners
    if (this.trimMemoryListener) {
      this.trimMemoryListener.remove();
      this.trimMemoryListener = null;
    }
    
    if (this.lowMemoryListener) {
      this.lowMemoryListener.remove();
      this.lowMemoryListener = null;
    }
    
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
    
    await super.shutdown();
  }
}