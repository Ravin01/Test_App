/**
 * 🚀 iOS-SPECIFIC MEMORY MANAGER
 * Optimized for iOS memory constraints and lifecycle
 */

import { BaseVideoMemoryManager } from './BaseVideoMemoryManager';
import { NativeModules, AppState, NativeEventEmitter } from 'react-native';

export class IOSMemoryManager extends BaseVideoMemoryManager {
  private memoryWarningListener: any = null;
  private appStateListener: any = null;
  private backgroundTaskId: any = null;

  async initialize(): Promise<void> {
    await super.initialize();
    await this.setupIOSSpecificMonitoring();
  }

  private async setupIOSSpecificMonitoring(): Promise<void> {
    // Listen for iOS memory warnings
    const eventEmitter = new NativeEventEmitter(NativeModules.MemoryWarningModule);
    
    this.memoryWarningListener = eventEmitter?.addListener('MemoryWarning', async (data) => {
      console.log('🚨 iOS Memory Warning received:', data);
      await this.handleMemoryWarning();
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
      // Use native module to get accurate memory usage
      if (NativeModules.MemoryMonitorModule) {
        const memoryInfo = await NativeModules.MemoryMonitorModule.getMemoryInfo();
        return memoryInfo.used / (1024 * 1024); // Convert to MB
      }
      
      // Fallback: estimate based on JS heap
      if (global.performance && global.performance.memory) {
        return global.performance.memory.usedJSHeapSize / (1024 * 1024);
      }
      
      // Last resort: rough estimation
      return this.memoryState.currentUsage || 50; // Conservative estimate
    } catch (error) {
      console.error('❌ iOS memory usage detection failed:', error);
      return this.memoryState.currentUsage || 50;
    }
  }

  async forceGarbageCollection(): Promise<void> {
    try {
      // iOS-specific GC hinting
      if (global.gc) {
        global.gc();
      }
      
      // Native module GC hint if available
      if (NativeModules.MemoryManagerModule) {
        await NativeModules.MemoryManagerModule.hintGarbageCollection();
      }
      
      // Clear any cached data structures
      this.clearTransientCaches();
      
      console.log('♻️ iOS garbage collection completed');
    } catch (error) {
      console.error('❌ iOS GC error:', error);
    }
  }

  async getMemoryPressureLevel(): Promise<'normal' | 'warning' | 'critical'> {
    try {
      if (NativeModules.MemoryPressureModule) {
        const pressureLevel = await NativeModules.MemoryPressureModule.getCurrentLevel();
        return pressureLevel as 'normal' | 'warning' | 'critical';
      }
      
      // Fallback: estimate based on memory usage
      const currentUsage = await this.getCurrentMemoryUsage();
      const capabilities = require('./PlatformDetection').default.getCapabilities();
      const totalMemoryMB = capabilities.availableMemory * 1024;
      const usagePercent = (currentUsage / totalMemoryMB) * 100;
      
      if (usagePercent >= 90) return 'critical';
      if (usagePercent >= 70) return 'warning';
      return 'normal';
    } catch (error) {
      console.error('❌ iOS memory pressure detection failed:', error);
      return 'warning'; // Conservative fallback
    }
  }

  async handleMemoryWarning(): Promise<void> {
    console.log('🚨 iOS Memory Warning - Immediate response required');
    
    // iOS memory warnings are serious - immediate action required
    this.memoryState.pressureLevel = 'critical';
    
    // 1. Immediate aggressive cleanup
    await this.performAggressiveCleanup();
    
    // 2. iOS-specific cleanup
    await this.iosSpecificMemoryWarningCleanup();
    
    // 3. Force multiple GC cycles
    for (let i = 0; i < 3; i++) {
      await this.forceGarbageCollection();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 4. Switch to ultra-conservative strategy
    this.strategy = {
      cleanupTriggerThreshold: 40,
      cleanupBatchSize: 8,
      aggressiveCleanupThreshold: 60,
      gcHintInterval: 10000, // More frequent GC
    };
    
    console.log('⚡ iOS memory warning response completed');
  }

  private async iosSpecificMemoryWarningCleanup(): Promise<void> {
    // Clear iOS-specific caches
    try {
      // Clear URL cache
      if (NativeModules.URLCacheModule) {
        await NativeModules.URLCacheModule.clearCache();
      }
      
      // Clear image caches
      if (NativeModules.ImageCacheModule) {
        await NativeModules.ImageCacheModule.clearMemoryCache();
      }
      
      // Clear any native video caches
      if (NativeModules.VideoCacheModule) {
        await NativeModules.VideoCacheModule.clearMemoryCache();
      }
      
      console.log('🧹 iOS-specific caches cleared');
    } catch (error) {
      console.error('❌ iOS-specific cleanup error:', error);
    }
  }

  protected async platformSpecificAggressiveCleanup(): Promise<void> {
    // iOS-specific aggressive cleanup strategies
    
    // 1. Clear all possible caches
    await this.iosSpecificMemoryWarningCleanup();
    
    // 2. Release any background tasks
    if (this.backgroundTaskId) {
      if (NativeModules.BackgroundTaskModule) {
        NativeModules.BackgroundTaskModule.endBackgroundTask(this.backgroundTaskId);
        this.backgroundTaskId = null;
      }
    }
    
    // 3. Minimize timer frequencies
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      // Restart with less frequent monitoring
      this.monitoringTimer = setInterval(async () => {
        try {
          await this.updateMemoryState();
          await this.checkForLeaks();
        } catch (error) {
          console.error('❌ Reduced frequency monitoring error:', error);
        }
      }, 10000); // Check every 10 seconds instead of 5
    }
  }

  private async handleAppBackground(): Promise<void> {
    console.log('🍎 iOS app backgrounded - Memory conservation mode');
    
    // Start background task to complete cleanup
    try {
      if (NativeModules.BackgroundTaskModule) {
        this.backgroundTaskId = await NativeModules.BackgroundTaskModule.beginBackgroundTask();
      }
    } catch (error) {
      console.error('❌ Background task creation failed:', error);
    }
    
    // Aggressive cleanup for background mode
    await this.performAggressiveCleanup();
    
    // iOS kills apps quickly in background - clear everything except essentials
    for (const videoId of this.activeVideoIds) {
      this.notifyVideoRelease(videoId);
    }
    
    // Reduce monitoring frequency
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    // Final GC before background
    await this.forceGarbageCollection();
    
    // End background task
    if (this.backgroundTaskId && NativeModules.BackgroundTaskModule) {
      setTimeout(() => {
        NativeModules.BackgroundTaskModule.endBackgroundTask(this.backgroundTaskId);
        this.backgroundTaskId = null;
      }, 1000);
    }
  }

  private async handleAppForeground(): Promise<void> {
    console.log('🍎 iOS app foregrounded - Resuming normal operations');
    
    // Resume normal monitoring
    await this.startMonitoring();
    
    // Check memory state after returning from background
    await this.updateMemoryState();
    
    // If memory is still high, continue conservative strategy
    if (this.memoryState.pressureLevel !== 'normal') {
      console.log('⚠️ Memory pressure still high after foreground - maintaining conservation mode');
    } else {
      // Restore normal strategy
      const capabilities = require('./PlatformDetection').default.getCapabilities();
      this.optimizeStrategyForDevice(capabilities);
    }
  }

  private clearTransientCaches(): void {
    // Clear any iOS-specific transient data structures
    this.memorySnapshots = this.memorySnapshots.slice(-5); // Keep minimal history
    
    // Clear any cached computations
    // This would clear any memoized values or cached calculations
    
    console.log('🧹 iOS transient caches cleared');
  }

  // iOS-specific performance monitoring

  async getIOSSpecificMetrics(): Promise<any> {
    try {
      const baseMetrics = this.getMemoryMetrics();
      
      // Add iOS-specific metrics
      const iosMetrics = {
        thermalState: 'unknown',
        lowPowerModeEnabled: false,
        memoryFootprint: 0,
      };
      
      if (NativeModules.DeviceInfoModule) {
        const deviceInfo = await NativeModules.DeviceInfoModule.getIOSSpecificInfo();
        iosMetrics.thermalState = deviceInfo.thermalState;
        iosMetrics.lowPowerModeEnabled = deviceInfo.lowPowerMode;
        iosMetrics.memoryFootprint = deviceInfo.memoryFootprint;
      }
      
      return {
        ...baseMetrics,
        ios: iosMetrics,
      };
    } catch (error) {
      console.error('❌ iOS metrics collection failed:', error);
      return this.getMemoryMetrics();
    }
  }

  // iOS Low Power Mode handling

  async handleLowPowerMode(enabled: boolean): Promise<void> {
    if (enabled) {
      console.log('🔋 iOS Low Power Mode enabled - Ultra conservative strategy');
      
      this.strategy = {
        cleanupTriggerThreshold: 30,
        cleanupBatchSize: 10,
        aggressiveCleanupThreshold: 50,
        gcHintInterval: 60000, // Less frequent GC to save battery
      };
      
      // Immediate cleanup
      await this.performAggressiveCleanup();
    } else {
      console.log('🔋 iOS Low Power Mode disabled - Resuming normal strategy');
      
      const capabilities = require('./PlatformDetection').default.getCapabilities();
      this.optimizeStrategyForDevice(capabilities);
    }
  }

  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down iOS memory manager');
    
    // Remove iOS-specific listeners
    if (this.memoryWarningListener) {
      this.memoryWarningListener.remove();
      this.memoryWarningListener = null;
    }
    
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
    
    // End any background tasks
    if (this.backgroundTaskId && NativeModules.BackgroundTaskModule) {
      NativeModules.BackgroundTaskModule.endBackgroundTask(this.backgroundTaskId);
      this.backgroundTaskId = null;
    }
    
    await super.shutdown();
  }
}