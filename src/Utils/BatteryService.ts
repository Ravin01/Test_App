import DeviceInfo from 'react-native-device-info';

// Safe Battery service wrapper that handles missing modules gracefully
class BatteryService {
  private batteryModule: any = null;
  private lastBatteryLevel: number = 0.5;
  private lastChargingState: boolean = false;

  constructor() {
    this.initializeBattery();
  }

  private initializeBattery() {
    try {
      // Try to load the battery module
      this.batteryModule = require('@react-native-battery/battery-status').default;
      console.log('✅ Battery module loaded successfully');
    } catch (error) {
      console.warn('⚠️ Battery module not available, using DeviceInfo fallback');
      // Module not available, we'll use fallback methods
      this.batteryModule = null;
    }
  }

  async getBatteryLevel(): Promise<number> {
    try {
      // First try the battery module
      if (this.batteryModule && this.batteryModule.getBatteryLevel) {
        const level = await this.batteryModule.getBatteryLevel();
        this.lastBatteryLevel = level;
        return level;
      }

      // Fallback to DeviceInfo
      if (DeviceInfo.getBatteryLevel) {
        const level = await DeviceInfo.getBatteryLevel();
        this.lastBatteryLevel = level >= 0 ? level : 0.5;
        return this.lastBatteryLevel;
      }
    } catch (error) {
      console.warn('Failed to get battery level:', error);
    }

    // Return last known value or default
    return this.lastBatteryLevel;
  }

  async isBatteryCharging(): Promise<boolean> {
    try {
      // First try the battery module
      if (this.batteryModule && this.batteryModule.isBatteryCharging) {
        const isCharging = await this.batteryModule.isBatteryCharging();
        this.lastChargingState = isCharging;
        return isCharging;
      }

      // Fallback to DeviceInfo
      if (DeviceInfo.isBatteryCharging) {
        const isCharging = await DeviceInfo.isBatteryCharging();
        this.lastChargingState = isCharging;
        return isCharging;
      }
    } catch (error) {
      console.warn('Failed to get charging state:', error);
    }

    // Return last known value or default
    return this.lastChargingState;
  }

  // Safe listener that won't crash if module is missing
  addListener(callback: (state: { level: number; isCharging: boolean }) => void): (() => void) | null {
    if (this.batteryModule && this.batteryModule.addListener) {
      try {
        return this.batteryModule.addListener(callback);
      } catch (error) {
        console.warn('Failed to add battery listener:', error);
      }
    }
    
    // Return a no-op unsubscribe function
    return null;
  }

  // Get power state for compatibility
  async getPowerState(): Promise<{ batteryLevel: number; batteryState: string; lowPowerMode: boolean }> {
    const [batteryLevel, isCharging] = await Promise.all([
      this.getBatteryLevel(),
      this.isBatteryCharging(),
    ]);

    return {
      batteryLevel,
      batteryState: isCharging ? 'charging' : 'unplugged',
      lowPowerMode: batteryLevel < 0.15,
    };
  }
}

// Export singleton instance
export default new BatteryService();