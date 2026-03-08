import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBatteryInfo } from './useBatteryInfo';

export const useBatteryOptimization = () => {
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [autoEnableThreshold, setAutoEnableThreshold] = useState(20);
  
  const { level: batteryLevel, isCharging, isLowPowerMode: systemLowPowerMode } = useBatteryInfo();

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('lowPowerMode');
        const savedThreshold = await AsyncStorage.getItem('lowPowerThreshold');
        
        if (savedMode === 'true') {
          setIsLowPowerMode(true);
        }
        
        if (savedThreshold) {
          setAutoEnableThreshold(parseInt(savedThreshold, 10));
        }
      } catch (error) {
        console.error('Error loading battery preferences:', error);
      }
    };
    
    loadPreferences();
  }, []);

  // Auto-enable low power mode based on battery level
  useEffect(() => {
    // Auto-enable if battery is low and not charging
    if (batteryLevel <= autoEnableThreshold && !isCharging && !isLowPowerMode) {
      console.log(`🔋 Battery at ${batteryLevel}% - Auto-enabling low power mode`);
      enableLowPowerMode();
    }
    
    // Auto-disable if charging and battery > 80%
    if (
        //isCharging &&
         batteryLevel > 30 && isLowPowerMode) {
      console.log(`⚡ Battery reached ${batteryLevel}% - Disabling low power mode`);
      disableLowPowerMode();
    }

    // Respect system-level low power mode
    if (systemLowPowerMode && !isLowPowerMode) {
      console.log('🔋 System low power mode detected - Enabling app low power mode');
      enableLowPowerMode();
    }
  }, [batteryLevel, isCharging, autoEnableThreshold, isLowPowerMode, systemLowPowerMode]);

  const enableLowPowerMode = async () => {
    setIsLowPowerMode(true);
    await AsyncStorage.setItem('lowPowerMode', 'true');
    console.log('🔋 Low Power Mode ENABLED');
  };

  const disableLowPowerMode = async () => {
    setIsLowPowerMode(false);
    await AsyncStorage.setItem('lowPowerMode', 'false');
    console.log('⚡ Low Power Mode DISABLED');
  };

  const toggleLowPowerMode = async () => {
    if (isLowPowerMode) {
      await disableLowPowerMode();
    } else {
      await enableLowPowerMode();
    }
  };

  const setAutoEnableThresholdValue = async (threshold: number) => {
    setAutoEnableThreshold(threshold);
    await AsyncStorage.setItem('lowPowerThreshold', threshold.toString());
  };

  return {
    isLowPowerMode,
    batteryLevel,
    isCharging,
    systemLowPowerMode,
    autoEnableThreshold,
    enableLowPowerMode,
    disableLowPowerMode,
    toggleLowPowerMode,
    setAutoEnableThreshold: setAutoEnableThresholdValue,
  };
};
