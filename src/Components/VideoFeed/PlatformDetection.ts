/**
 * 🚀 PLATFORM DETECTION & DEVICE CAPABILITIES
 * CEO Priority: Platform-specific optimizations for maximum performance
 */

import { Platform, Dimensions, NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { DeviceCapabilities } from './VideoTypes';

class PlatformDetectionManager {
  private static instance: PlatformDetectionManager;
  private capabilities: DeviceCapabilities | null = null;
  private isInitialized = false;

  static getInstance(): PlatformDetectionManager {
    if (!PlatformDetectionManager.instance) {
      PlatformDetectionManager.instance = new PlatformDetectionManager();
    }
    return PlatformDetectionManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const [
        totalMemory,
        batteryLevel,
        deviceType,
        systemVersion,
        model,
      ] = await Promise.all([
        DeviceInfo.getTotalMemory(),
        DeviceInfo.getBatteryLevel(),
        DeviceInfo.getDeviceType(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getModel(),
      ]);

      // Determine if device is low-end based on memory and model
      const isLowEnd = this.determineIfLowEnd(totalMemory, model, deviceType);
      
      this.capabilities = {
        isLowEnd,
        availableMemory: totalMemory / (1024 * 1024 * 1024), // Convert to GB
        batteryLevel: batteryLevel * 100,
        thermalState: 'normal', // Will be updated by monitoring
        platform: Platform.OS as 'ios' | 'android',
        osVersion: systemVersion,
      };

      this.isInitialized = true;
      console.log('📱 Platform Detection:', this.capabilities);
    } catch (error) {
      console.error('❌ Platform detection failed:', error);
      
      // Fallback capabilities
      this.capabilities = {
        isLowEnd: true, // Conservative fallback
        availableMemory: 2, // 2GB assumption
        batteryLevel: 100,
        thermalState: 'normal',
        platform: Platform.OS as 'ios' | 'android',
        osVersion: Platform.Version.toString(),
      };
      
      this.isInitialized = true;
    }
  }

  getCapabilities(): DeviceCapabilities {
    if (!this.capabilities) {
      throw new Error('Platform detection not initialized. Call initialize() first.');
    }
    return this.capabilities;
  }

  isLowEndDevice(): boolean {
    return this.getCapabilities().isLowEnd;
  }

  isIOS(): boolean {
    return Platform.OS === 'ios';
  }

  isAndroid(): boolean {
    return Platform.OS === 'android';
  }

  // PLATFORM-SPECIFIC OPTIMIZATION STRATEGIES
  getOptimizationStrategy() {
    const capabilities = this.getCapabilities();
    
    if (capabilities.platform === 'ios') {
      return {
        memoryStrategy: capabilities.isLowEnd ? 'ultra_aggressive_cleanup' : 'aggressive_cleanup',
        bufferStrategy: 'conservative_preload',
        backgroundHandling: 'strict_resource_release',
        texturePoolSize: capabilities.isLowEnd ? 3 : 5,
        preloadDistance: capabilities.isLowEnd ? 1 : 2,
      };
    } else {
      return {
        memoryStrategy: capabilities.isLowEnd ? 'aggressive_cleanup' : 'adaptive_cleanup',
        bufferStrategy: 'dynamic_preload',
        backgroundHandling: 'device_specific_optimization',
        texturePoolSize: capabilities.isLowEnd ? 4 : 7,
        preloadDistance: capabilities.isLowEnd ? 2 : 3,
      };
    }
  }

  private determineIfLowEnd(totalMemory: number, model: string, deviceType: string): boolean {
    const memoryGB = totalMemory / (1024 * 1024 * 1024);
    
    // Memory-based classification
    if (memoryGB < 3) return true;
    if (memoryGB > 6) return false;
    
    // Model-specific classification for edge cases
    const lowEndModels = [
      // iOS low-end models
      'iPhone SE', 'iPhone 6', 'iPhone 6 Plus', 'iPhone 7', 'iPhone 8',
      'iPad mini', 'iPad (5th generation)', 'iPad (6th generation)',
      
      // Android low-end indicators
      'Galaxy A', 'Galaxy J', 'Redmi', 'POCO', 'Moto G', 'Moto E',
      'Nokia', 'Huawei Y', 'Oppo A', 'Vivo Y',
    ];
    
    const modelLowerCase = model.toLowerCase();
    const isLowEndModel = lowEndModels.some(lowEndModel => 
      modelLowerCase.includes(lowEndModel.toLowerCase())
    );
    
    // Conservative classification for mid-range memory (3-6GB)
    return isLowEndModel || memoryGB < 4;
  }

  // REAL-TIME THERMAL STATE MONITORING
  updateThermalState(): void {
    if (Platform.OS === 'ios') {
      // iOS thermal state monitoring
      const ThermalStateModule = NativeModules.ThermalStateModule;
      if (ThermalStateModule) {
        ThermalStateModule.getCurrentThermalState()
          .then((state: string) => {
            if (this.capabilities) {
              this.capabilities.thermalState = state as any;
            }
          })
          .catch(() => {
            // Thermal monitoring not available
          });
      }
    } else {
      // Android thermal monitoring (API level 29+)
      // Implementation would require native module
      // For now, estimate based on battery temperature if available
    }
  }

  // MEMORY PRESSURE DETECTION
  getCurrentMemoryPressure(): 'normal' | 'warning' | 'critical' {
    if (!this.capabilities) return 'normal';
    
    // This would ideally use native memory APIs
    // For now, estimate based on device capabilities
    if (this.capabilities.isLowEnd) {
      return 'warning'; // Always cautious on low-end devices
    }
    
    return 'normal';
  }

  // NETWORK-AWARE OPTIMIZATIONS
  getNetworkOptimizationStrategy(connectionType: string, isMetered: boolean) {
    const capabilities = this.getCapabilities();
    
    if (isMetered || connectionType === 'cellular') {
      return {
        preloadAggression: 'conservative',
        qualityPreference: capabilities.isLowEnd ? 'low' : 'medium',
        bufferSize: 'minimal',
      };
    }
    
    return {
      preloadAggression: capabilities.isLowEnd ? 'moderate' : 'aggressive',
      qualityPreference: capabilities.isLowEnd ? 'medium' : 'high',
      bufferSize: capabilities.isLowEnd ? 'small' : 'large',
    };
  }
}

export default PlatformDetectionManager.getInstance();