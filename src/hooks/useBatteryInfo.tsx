import { useState, useEffect, useCallback } from 'react';
import DeviceInfo from 'react-native-device-info';
import { AppState, AppStateStatus } from 'react-native';

export interface BatteryInfo {
  level: number;
  isCharging: boolean;
  isLowPowerMode: boolean;
}

export const useBatteryInfo = (pollInterval: number = 60000) => {
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({
    level: 100,
    isCharging: false,
    isLowPowerMode: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatteryInfo = useCallback(async () => {
    try {
      const batteryLevel = await DeviceInfo.getBatteryLevel();
      const isBatteryCharging = await DeviceInfo.isBatteryCharging();
      
      // Check if isPowerSaveMode is available (not all versions support it)
      let isPowerSaveMode = false;
      try {
        if (typeof (DeviceInfo as any).isPowerSaveMode === 'function') {
          isPowerSaveMode = await (DeviceInfo as any).isPowerSaveMode();
        }
      } catch (err) {
        // Method not available, default to false
        isPowerSaveMode = false;
      }

      setBatteryInfo({
        level: Math.round(batteryLevel * 100),
        isCharging: isBatteryCharging,
        isLowPowerMode: isPowerSaveMode,
      });
      
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching battery info:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchBatteryInfo();
  }, [fetchBatteryInfo]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(fetchBatteryInfo, pollInterval);
    return () => clearInterval(interval);
  }, [fetchBatteryInfo, pollInterval]);

  // Fetch when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          fetchBatteryInfo();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [fetchBatteryInfo]);

  return {
    ...batteryInfo,
    isLoading,
    error,
    refresh: fetchBatteryInfo,
  };
};
