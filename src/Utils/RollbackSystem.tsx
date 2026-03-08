import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFeatureFlags } from './FeatureFlags';
import { analytics } from './Analytics';

interface RollbackConfig {
  enabled: boolean;
  version: string;
  timestamp: number;
  reason?: string;
  affectedFeatures: string[];
}

interface RollbackContextType {
  isRollbackMode: boolean;
  rollbackConfig?: RollbackConfig;
  activateRollback: (reason: string, affectedFeatures: string[]) => Promise<void>;
  deactivateRollback: () => Promise<void>;
  checkRollbackStatus: () => Promise<void>;
}

const RollbackContext = createContext<RollbackContextType | null>(null);

const ROLLBACK_STORAGE_KEY = 'app_rollback_config';
const ROLLBACK_VERSION = '1.0.7_stable';

export const RollbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRollbackMode, setIsRollbackMode] = useState(false);
  const [rollbackConfig, setRollbackConfig] = useState<RollbackConfig | undefined>();
  const { emergencyDisable } = useFeatureFlags();
  
  React.useEffect(() => {
    checkRollbackStatus();
  }, []);
  
  const checkRollbackStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem(ROLLBACK_STORAGE_KEY);
      if (stored) {
        const config: RollbackConfig = JSON.parse(stored);
        
        // Auto-expire rollback after 24 hours
        const now = Date.now();
        const rollbackAge = now - config.timestamp;
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        
        if (rollbackAge > TWENTY_FOUR_HOURS) {
          console.log('🔄 Rollback expired, deactivating...');
          await deactivateRollback();
          return;
        }
        
        if (config.enabled) {
          setIsRollbackMode(true);
          setRollbackConfig(config);
          
          // Apply rollback measures
          await applyRollbackMeasures(config);
          
          analytics.track('rollback_activated', {
            reason: config.reason,
            affected_features: config.affectedFeatures,
            version: config.version,
          });
        }
      }
    } catch (error) {
      console.warn('Failed to check rollback status:', error);
    }
  };
  
  const activateRollback = async (reason: string, affectedFeatures: string[]) => {
    const config: RollbackConfig = {
      enabled: true,
      version: ROLLBACK_VERSION,
      timestamp: Date.now(),
      reason,
      affectedFeatures,
    };
    
    try {
      // Save rollback config
      await AsyncStorage.setItem(ROLLBACK_STORAGE_KEY, JSON.stringify(config));
      
      // Apply rollback measures
      await applyRollbackMeasures(config);
      
      setIsRollbackMode(true);
      setRollbackConfig(config);
      
      console.log('🚨 Rollback activated:', reason);
      console.log('📋 Affected features:', affectedFeatures);
      
      analytics.track('rollback_emergency_activated', {
        reason,
        affected_features: affectedFeatures,
        timestamp: config.timestamp,
      });
      
    } catch (error) {
      console.error('Failed to activate rollback:', error);
      analytics.trackError('rollback_activation_failed', { reason, error: error.message });
    }
  };
  
  const deactivateRollback = async () => {
    try {
      await AsyncStorage.removeItem(ROLLBACK_STORAGE_KEY);
      setIsRollbackMode(false);
      setRollbackConfig(undefined);
      
      console.log('✅ Rollback deactivated');
      
      analytics.track('rollback_deactivated', {
        previous_reason: rollbackConfig?.reason,
      });
      
    } catch (error) {
      console.error('Failed to deactivate rollback:', error);
    }
  };
  
  const applyRollbackMeasures = async (config: RollbackConfig) => {
    // Disable experimental features
    await emergencyDisable();
    
    // Clear problematic cached data based on affected features
    for (const feature of config.affectedFeatures) {
      switch (feature) {
        case 'navigation':
          // Clear navigation cache
          await AsyncStorage.removeItem('navigation_cache');
          break;
        case 'chat':
          // Clear chat cache
          await AsyncStorage.removeItem('chat_cache');
          break;
        case 'media':
          // Clear media cache
          await AsyncStorage.removeItem('media_cache');
          break;
        case 'user_data':
          // Clear non-essential user data cache
          await AsyncStorage.removeItem('user_preferences_cache');
          break;
      }
    }
    
    console.log('🔧 Rollback measures applied for features:', config.affectedFeatures);
  };
  
  return (
    <RollbackContext.Provider
      value={{
        isRollbackMode,
        rollbackConfig,
        activateRollback,
        deactivateRollback,
        checkRollbackStatus,
      }}
    >
      {children}
    </RollbackContext.Provider>
  );
};

export const useRollback = (): RollbackContextType => {
  const context = useContext(RollbackContext);
  if (!context) {
    throw new Error('useRollback must be used within a RollbackProvider');
  }
  return context;
};

// Emergency rollback utilities
export const EmergencyRollback = {
  // Quick rollback for navigation issues
  navigationEmergency: async () => {
    const context = useContext(RollbackContext);
    if (context) {
      await context.activateRollback(
        'Navigation system malfunction detected',
        ['navigation', 'gestures']
      );
    }
  },
  
  // Quick rollback for chat issues
  chatEmergency: async () => {
    const context = useContext(RollbackContext);
    if (context) {
      await context.activateRollback(
        'Chat system instability detected',
        ['chat', 'notifications']
      );
    }
  },
  
  // Full system rollback
  fullSystemEmergency: async () => {
    const context = useContext(RollbackContext);
    if (context) {
      await context.activateRollback(
        'Critical system instability detected',
        ['navigation', 'chat', 'media', 'user_data']
      );
    }
  },
  
  // Rollback based on error patterns
  errorBasedRollback: async (errorType: string, errorCount: number) => {
    if (errorCount >= 5) {
      const context = useContext(RollbackContext);
      if (context) {
        let affectedFeatures = [];
        
        if (errorType.includes('navigation')) {
          affectedFeatures.push('navigation');
        }
        if (errorType.includes('chat')) {
          affectedFeatures.push('chat');
        }
        if (errorType.includes('media')) {
          affectedFeatures.push('media');
        }
        
        await context.activateRollback(
          `High error rate detected: ${errorType} (${errorCount} errors)`,
          affectedFeatures
        );
      }
    }
  },
};

// Hook for monitoring app health and auto-rollback
export const useHealthMonitor = () => {
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const { activateRollback } = useRollback();
  
  const reportError = (error: string, context?: any) => {
    setLastError(error);
    setErrorCount(prev => prev + 1);
    
    analytics.trackError(error, context);
    
    // Auto-rollback if too many errors
    if (errorCount >= 10) {
      activateRollback(
        `Auto-rollback triggered: ${errorCount} errors in session`,
        ['navigation', 'chat']
      );
    }
  };
  
  const reportSuccess = () => {
    // Reset error count on successful operations
    setErrorCount(0);
    setLastError(null);
  };
  
  return {
    errorCount,
    lastError,
    reportError,
    reportSuccess,
  };
};