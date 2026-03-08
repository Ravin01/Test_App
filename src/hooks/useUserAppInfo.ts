import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import UserAppInfoManager from '../Utils/UserAppInfoManager';

/**
 * Hook to automatically update user app info
 * Use this in your main app component or after login
 */
export const useUserAppInfo = () => {
  useEffect(() => {
    // Update app info when app becomes active
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Update user app info when app resumes (non-blocking with delay)
        setTimeout(() => {
          UserAppInfoManager.updateUserAppInfo(false).catch(err => {
            // Silent fail - not critical for app operation
            console.log('User app info update deferred');
          });
        }, 1000); // Small delay to not interfere with navigation
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial update when hook is first used (non-blocking with delay)
    setTimeout(() => {
      UserAppInfoManager.updateUserAppInfo(false).catch(err => {
        // Silent fail - not critical for app operation
        console.log('User app info initial update deferred');
      });
    }, 2000); // Delay initial update to not block app startup or navigation

    return () => {
      subscription?.remove();
    };
  }, []);
};

/**
 * Force update user app info (useful after login)
 */
export const updateUserAppInfoNow = async (): Promise<boolean> => {
  return await UserAppInfoManager.updateUserAppInfo(true);
};

export default useUserAppInfo;