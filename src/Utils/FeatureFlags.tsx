import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface FeatureFlags {
  // Navigation Features
  useResponsiveLayouts: boolean;
  enableTabletTwoPane: boolean;
  useAdvancedGestures: boolean;
  
  // UI Features
  enableDarkMode: boolean;
  useAnimatedTransitions: boolean;
  showAnalytics: boolean;
  
  // Performance Features
  enableLazyLoading: boolean;
  useOptimizedImages: boolean;
  enableMetrics: boolean;
  
  // Experimental Features
  betaFeatures: boolean;
  experimentalChat: boolean;
  newVideoPlayer: boolean;
}

interface FeatureFlagContextType {
  flags: FeatureFlags;
  updateFlag: (key: keyof FeatureFlags, value: boolean) => Promise<void>;
  isLoading: boolean;
  resetToDefaults: () => Promise<void>;
  emergencyDisable: () => Promise<void>;
}

const defaultFlags: FeatureFlags = {
  // Navigation Features
  useResponsiveLayouts: true,
  enableTabletTwoPane: true,
  useAdvancedGestures: Platform.OS === 'android',
  
  // UI Features
  enableDarkMode: true,
  useAnimatedTransitions: true,
  showAnalytics: true,
  
  // Performance Features
  enableLazyLoading: true,
  useOptimizedImages: true,
  enableMetrics: true,
  
  // Experimental Features
  betaFeatures: false,
  experimentalChat: false,
  newVideoPlayer: false,
};

const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

const STORAGE_KEY = 'feature_flags_v2';

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load flags from storage on app start
  useEffect(() => {
    loadFlags();
  }, []);
  
  const loadFlags = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const storedFlags = JSON.parse(stored);
        // Merge with defaults to handle new flags
        setFlags({ ...defaultFlags, ...storedFlags });
      }
    } catch (error) {
      console.warn('Failed to load feature flags:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveFlags = async (newFlags: FeatureFlags) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newFlags));
    } catch (error) {
      console.warn('Failed to save feature flags:', error);
    }
  };
  
  const updateFlag = async (key: keyof FeatureFlags, value: boolean) => {
    const newFlags = { ...flags, [key]: value };
    setFlags(newFlags);
    await saveFlags(newFlags);
    
    console.log(`Feature flag ${key} updated to: ${value}`);
  };
  
  const resetToDefaults = async () => {
    setFlags(defaultFlags);
    await saveFlags(defaultFlags);
    console.log('Feature flags reset to defaults');
  };
  
  const emergencyDisable = async () => {
    const emergencyFlags: FeatureFlags = {
      ...defaultFlags,
      // Disable experimental features
      betaFeatures: false,
      experimentalChat: false,
      newVideoPlayer: false,
      // Keep essential features
      useResponsiveLayouts: true,
      enableTabletTwoPane: false, // Disable to reduce complexity
      useAdvancedGestures: false,
    };
    
    setFlags(emergencyFlags);
    await saveFlags(emergencyFlags);
    console.log('Emergency rollback activated - experimental features disabled');
  };
  
  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        updateFlag,
        isLoading,
        resetToDefaults,
        emergencyDisable,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = (): FeatureFlagContextType => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};

// Individual hooks for specific features
export const useFeatureFlag = (key: keyof FeatureFlags): boolean => {
  const { flags } = useFeatureFlags();
  return flags[key];
};

// Debug utilities
export const FeatureFlagDebugger = {
  logAllFlags: () => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored) {
        console.log('Current Feature Flags:', JSON.parse(stored));
      }
    });
  },
  
  enableBetaFeatures: async () => {
    const context = useContext(FeatureFlagContext);
    if (context) {
      await context.updateFlag('betaFeatures', true);
      await context.updateFlag('experimentalChat', true);
      await context.updateFlag('newVideoPlayer', true);
    }
  },
  
  disableBetaFeatures: async () => {
    const context = useContext(FeatureFlagContext);
    if (context) {
      await context.updateFlag('betaFeatures', false);
      await context.updateFlag('experimentalChat', false);
      await context.updateFlag('newVideoPlayer', false);
    }
  },
};