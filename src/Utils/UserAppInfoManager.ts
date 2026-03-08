import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from './Api';

class UserAppInfoManager {
  private static instance: UserAppInfoManager;
  private lastUpdateTime: number = 0;
  private readonly UPDATE_INTERVAL = 60 * 60 * 1000; // Update every hour
  
  private constructor() {}
  
  static getInstance(): UserAppInfoManager {
    if (!UserAppInfoManager.instance) {
      UserAppInfoManager.instance = new UserAppInfoManager();
    }
    return UserAppInfoManager.instance;
  }
  
  /**
   * Update user's app information in backend
   * Called after login or periodically during app usage
   */
  async updateUserAppInfo(forceUpdate: boolean = false): Promise<boolean> {
    try {
      // Check if user is logged in
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) {
        console.log('📱 User not logged in, skipping app info update');
        return false;
      }
      
      // Check if we should update (avoid too frequent calls)
      const now = Date.now();
      if (!forceUpdate && (now - this.lastUpdateTime) < this.UPDATE_INTERVAL) {
        console.log('📱 App info recently updated, skipping');
        return true;
      }
      
      // Get current app information
      const appPlatform = Platform.OS; // "android" or "ios"
      const appVersion = DeviceInfo.getVersion(); // e.g., "1.0.7"
      const appBuildNumber = DeviceInfo.getBuildNumber(); // e.g., "7"
      const deviceModel = DeviceInfo.getModel(); // e.g., "Pixel 6"
      const systemVersion = DeviceInfo.getSystemVersion(); // e.g., "13"
      
      // console.log('📱 Updating user app info:', {
      //   appPlatform,
      //   appVersion,
      //   appBuildNumber,
      //   deviceModel,
      //   systemVersion
      // });
      
      // Make API call to update user's app info
        try {
          const response = await axiosInstance.put('/user/me/app-info', {
            // deviceInfo: {
              appVersion,
              appPlatform,
              appBuildNumber: parseInt(appBuildNumber, 10),
            model: deviceModel,
            systemVersion: systemVersion,
            brand: DeviceInfo.getBrand(),
            deviceId: DeviceInfo.getDeviceId(),
          // },
          // timestamp: new Date().toISOString()
        });
        
        if (response.status === 200 || response.status === 204) {
          this.lastUpdateTime = now;
          console.log('✅ User app info updated successfully');
          return true;
        }
        
        return false;
      } catch (apiError: any) {
        // Handle specific error cases
        if (apiError?.response?.status === 404) {
          console.log('📱 User app info endpoint not found - skipping');
        } else if (apiError?.response?.status === 401) {
          console.log('📱 User not authenticated for app info update');
        } else {
          console.warn('⚠️ User app info update failed:', apiError?.message || 'Unknown error');
        }
        // Don't show error to user - this is not critical
        return false;
      }
      
    } catch (error: any) {
      console.warn('⚠️ Failed to update user app info:', error?.message || 'Unknown error');
      // Don't throw or show error - this is not critical for app operation
      return false;
    }
  }
  
  /**
   * Clear cached update time (useful on logout)
   */
  reset(): void {
    this.lastUpdateTime = 0;
  }
}

export default UserAppInfoManager.getInstance();