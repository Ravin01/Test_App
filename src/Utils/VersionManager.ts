import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';
import { versionCheckUrl } from '../../Config';

const { VersionModule } = NativeModules;

interface VersionInfo {
  versionCode: number;
  versionName: string;
  lastVersionCode: number;
  wasJustUpdated: boolean;
  updateTimestamp: number;
  buildVersionCode: number;
}

interface BackendVersionInfo {
  minVersionCode: number;
  minVersionName: string;
  latestVersionCode: number;
  latestVersionName: string;
  forceUpdate: boolean;
  updateMessage?: string;
}

class VersionManager {
  private static instance: VersionManager;
  private versionInfo: VersionInfo | null = null;
  private lastCheckTime: number = 0;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'app_version_info';
  private readonly BACKEND_VERSION_KEY = 'backend_version_cache';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private isChecking: boolean = false;
  
  private constructor() {}
  
  static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager();
    }
    return VersionManager.instance;
  }
  
  /**
   * Get version info from native module with validation
   */
  async getNativeVersionInfo(): Promise<VersionInfo> {
    try {
      // Check if native module exists and has required method
      if (VersionModule && VersionModule.getVersionInfo) {
        const info = await VersionModule.getVersionInfo();
        
        // Validate the response
        if (info && typeof info.versionCode === 'number') {
          this.versionInfo = info;
          await this.saveVersionToStorage(info);
          return info;
        }
      }
    } catch (error) {
      console.error('Failed to get native version info:', error);
    }
    
    // Fallback to DeviceInfo with proper parsing
    const versionCode = this.parseVersionCode(DeviceInfo.getBuildNumber());
    const versionName = DeviceInfo.getVersion();
    
    const fallbackInfo: VersionInfo = {
      versionCode,
      versionName,
      lastVersionCode: versionCode,
      wasJustUpdated: false,
      updateTimestamp: Date.now(),
      buildVersionCode: versionCode,
    };
    
    this.versionInfo = fallbackInfo;
    return fallbackInfo;
  }
  
  /**
   * Parse version code safely
   */
  private parseVersionCode(buildNumber: string): number {
    const parsed = parseInt(buildNumber, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  /**
   * Parse version name to code (fallback method) - DEPRECATED
   * This should only be used as last resort when backend doesn't provide version codes
   */
  private versionNameToCode(versionName: string): number {
    console.warn('Using deprecated versionNameToCode - backend should provide actual version codes');
    try {
      // For legacy support only - extract patch number from "1.0.7" → 7
      const parts = versionName.split('.');
      if (parts.length === 3) {
        const patch = parseInt(parts[2], 10) || 0;
        return patch; // Return just the patch number (7 from "1.0.7")
      }
    } catch (error) {
      console.error('Failed to parse version name:', error);
    }
    return 0;
  }
  
  /**
   * Fetch version requirements from backend with retry and cache busting
   */
  async fetchBackendVersionInfo(forceRefresh: boolean = false): Promise<BackendVersionInfo | null> {
    // Prevent concurrent checks
    if (this.isChecking && !forceRefresh) {
      return await this.getCachedBackendVersion();
    }
    
    try {
      this.isChecking = true;
      const now = Date.now();
      
      // Check if we should use cached data
      if (!forceRefresh && (now - this.lastCheckTime) < this.CHECK_INTERVAL) {
        const cached = await this.getCachedBackendVersion();
        if (cached) return cached;
      }
      
      // Attempt with retry logic
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          const response = await this.makeVersionRequest();
          
          if (response?.data?.data?.appSettings) {
            const backendInfo = this.parseBackendResponse(response.data.data.appSettings);
            await this.cacheBackendVersion(backendInfo);
            this.lastCheckTime = now;
            return backendInfo;
          }
        } catch (error) {
          lastError = error as Error;
          console.warn(`Version check attempt ${attempt} failed:`, error);
          
          if (attempt < this.MAX_RETRY_ATTEMPTS) {
            await this.delay(this.RETRY_DELAY * attempt); // Exponential backoff
          }
        }
      }
      
      console.error('All version check attempts failed:', lastError);
      // Try to return cached version on error
      return await this.getCachedBackendVersion();
      
    } finally {
      this.isChecking = false;
    }
  }
  
  /**
   * Make the actual API request
   */
  private async makeVersionRequest() {
    // Use the new version check endpoint
    return await axios.get(`${versionCheckUrl}/versions/check`, {
      params: {
        platform: 'android',
        appVersion: this.versionInfo?.versionName || DeviceInfo.getVersion(), // e.g., "1.0.7"
        versionCode: this.versionInfo?.versionCode || DeviceInfo.getBuildNumber(), // e.g., 7
      },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-App-Version': this.versionInfo?.versionName || DeviceInfo.getVersion(),
        'X-App-Version-Code': String(this.versionInfo?.versionCode || DeviceInfo.getBuildNumber()),
      },
      timeout: 10000,
      validateStatus: (status) => status === 200, // Only accept 200 as success
    });
  }
  
  /**
   * Parse backend response safely
   */
  private parseBackendResponse(settings: any): BackendVersionInfo {
    // Handle various backend response formats
    let minVersionCode = 0;
    let latestVersionCode = 0;
    
    // PRIORITY 1: Use actual version codes from backend (RECOMMENDED)
    if (typeof settings.minVersionCode === 'number' && settings.minVersionCode > 0) {
      minVersionCode = settings.minVersionCode;
    } else if (settings.minVersion) {
      // FALLBACK: Parse from version name (will be deprecated)
      minVersionCode = this.versionNameToCode(settings.minVersion);
      console.warn('Backend should provide minVersionCode as number, not minVersion string');
    }
    
    if (typeof settings.latestVersionCode === 'number' && settings.latestVersionCode > 0) {
      latestVersionCode = settings.latestVersionCode;
    } else if (settings.userAppVersion) {
      // FALLBACK: Parse from version name (will be deprecated)
      if (typeof settings.userAppVersion === 'string') {
        latestVersionCode = this.versionNameToCode(settings.userAppVersion);
        console.warn('Backend should provide latestVersionCode as number, not userAppVersion string');
      } else {
        latestVersionCode = this.versionNameToCode(settings.latestVersion || '1.0.0');
      }
    } else if (settings.latestVersion) {
      latestVersionCode = this.versionNameToCode(settings.latestVersion);
      console.warn('Backend should provide latestVersionCode as number, not latestVersion string');
    }
    
    // Validation: Ensure we have valid version codes
    if (minVersionCode <= 0) {
      console.error('Invalid minVersionCode received from backend:', minVersionCode);
      minVersionCode = 1; // Safe fallback
    }
    
    if (latestVersionCode <= 0) {
      console.error('Invalid latestVersionCode received from backend:', latestVersionCode);
      latestVersionCode = 1; // Safe fallback
    }
    
    // Enhanced debugging for new API
    console.log('🔍 NEW API BACKEND RESPONSE:', settings);
    console.log('🔍 PARSED VERSION INFO:', {
      minVersionCode,
      latestVersionCode,
      minVersionName: settings.minVersion || '1.0.0',
      latestVersionName: settings.userAppVersion || settings.latestVersion || '1.0.0',
      forceUpdate: settings.forceUpdate
    });
    
    return {
      minVersionCode,
      minVersionName: settings.minVersion || '1.0.0',
      latestVersionCode,
      latestVersionName: settings.userAppVersion || settings.latestVersion || '1.0.0',
      forceUpdate: settings.forceUpdate !== false, // Default to true for safety
      updateMessage: settings.updateMessage,
    };
  }
  
  /**
   * Normalize backend version codes to match app's versioning scheme
   * This handles all possible backend format issues
   */
  private normalizeBackendVersionCodes(backendInfo: BackendVersionInfo, currentVersionName: string): BackendVersionInfo {
    let normalizedMin = backendInfo.minVersionCode;
    let normalizedLatest = backendInfo.latestVersionCode;
    
    // Extract current version number from version name (e.g., "1.0.7" → 7)
    const currentVersionPatch = this.extractPatchVersion(currentVersionName);
    
    // SCENARIO 1: Backend uses old conversion logic (10007 instead of 7)
    if (backendInfo.latestVersionCode > 1000) {
      console.log('🔧 Detected old conversion logic in backend, normalizing...');
      normalizedMin = this.extractPatchVersion(backendInfo.minVersionName);
      normalizedLatest = this.extractPatchVersion(backendInfo.latestVersionName);
    }
    
    // SCENARIO 2: Backend version codes are way higher than they should be
    else if (backendInfo.latestVersionCode > currentVersionPatch + 10) {
      console.log('🔧 Backend version codes seem too high, normalizing based on version names...');
      normalizedMin = this.extractPatchVersion(backendInfo.minVersionName);
      normalizedLatest = this.extractPatchVersion(backendInfo.latestVersionName);
    }
    
    // SCENARIO 3: Backend minVersionCode is 0 or invalid
    if (normalizedMin <= 0) {
      console.log('🔧 Invalid minVersionCode, setting safe default...');
      normalizedMin = Math.max(1, currentVersionPatch - 2); // Allow 2 versions back
    }
    
    // SCENARIO 4: Backend latestVersionCode is invalid
    if (normalizedLatest <= 0) {
      console.log('🔧 Invalid latestVersionCode, using current version...');
      normalizedLatest = currentVersionPatch;
    }
    
    // SAFETY CHECK: Ensure normalized values make sense
    if (normalizedLatest < normalizedMin) {
      console.log('🔧 Latest version lower than min, fixing...');
      normalizedLatest = normalizedMin;
    }
    
    return {
      ...backendInfo,
      minVersionCode: normalizedMin,
      latestVersionCode: normalizedLatest,
    };
  }
  
  /**
   * Extract patch version number from version string
   * Examples: "1.0.7" → 7, "2.1.15" → 15
   */
  private extractPatchVersion(versionString: string): number {
    try {
      const parts = versionString.split('.');
      if (parts.length >= 3) {
        const patch = parseInt(parts[2], 10);
        return isNaN(patch) ? 0 : patch;
      }
      // If not in x.y.z format, try to extract last number
      const match = versionString.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    } catch (error) {
      console.error('Failed to extract patch version from:', versionString);
      return 0;
    }
  }
  
  /**
   * Check if force update is required with comprehensive logic
   */
  async checkForceUpdate(): Promise<{
    requiresUpdate: boolean;
    forceUpdate: boolean;
    updateUrl: string;
    message?: string;
  }> {
    try {
      const nativeInfo = await this.getNativeVersionInfo();
      const backendInfo = await this.fetchBackendVersionInfo();
      
      // Clear the "just updated" flag if more than 10 minutes have passed
      if (nativeInfo.wasJustUpdated && (Date.now() - nativeInfo.updateTimestamp) > 10 * 60 * 1000) {
        if (VersionModule?.clearUpdateFlag) {
          try {
            await VersionModule.clearUpdateFlag();
          } catch (error) {
            console.warn('Failed to clear update flag:', error);
          }
        }
      }
      
      // If app was just updated, skip force update check for 10 minutes
      if (nativeInfo.wasJustUpdated && (Date.now() - nativeInfo.updateTimestamp) < 10 * 60 * 1000) {
        console.log('App was just updated, skipping force update check');
        return {
          requiresUpdate: false,
          forceUpdate: false,
          updateUrl: this.getStoreUrl(),
        };
      }
      
      if (!backendInfo) {
        console.warn('No backend version info available, allowing access');
        return {
          requiresUpdate: false,
          forceUpdate: false,
          updateUrl: this.getStoreUrl(),
        };
      }
      
      const currentVersionCode = nativeInfo.versionCode;
      
      // Enhanced debugging for force update decision
      console.log('🚀 FORCE UPDATE DECISION:', {
        currentVersionCode,
        minVersionCode: backendInfo.minVersionCode,
        latestVersionCode: backendInfo.latestVersionCode,
        wasJustUpdated: nativeInfo.wasJustUpdated,
        updateTimestamp: nativeInfo.updateTimestamp,
        timeSinceUpdate: Date.now() - nativeInfo.updateTimestamp
      });
      
      // Validate version codes
      if (currentVersionCode <= 0 || backendInfo.minVersionCode <= 0) {
        console.error('❌ Invalid version codes detected', { currentVersionCode, backendInfo });
        return {
          requiresUpdate: false,
          forceUpdate: false,
          updateUrl: this.getStoreUrl(),
        };
      }
      
      // PERMANENT FIX: Normalize backend version codes to match app's versioning scheme
      const normalizedBackendInfo = this.normalizeBackendVersionCodes(backendInfo, nativeInfo.versionName);
      
      console.log('🔧 NORMALIZED VERSION INFO:', {
        original: backendInfo,
        normalized: normalizedBackendInfo
      });
      
      // Check if current version is below minimum required (using normalized values)
      const needsForceUpdate = currentVersionCode < normalizedBackendInfo.minVersionCode;
      
      // Check if optional update is available (using normalized values)
      const hasOptionalUpdate = currentVersionCode < normalizedBackendInfo.latestVersionCode;
      
      console.log('🎯 UPDATE LOGIC RESULT:', {
        needsForceUpdate: `${currentVersionCode} < ${normalizedBackendInfo.minVersionCode} = ${needsForceUpdate}`,
        hasOptionalUpdate: `${currentVersionCode} < ${normalizedBackendInfo.latestVersionCode} = ${hasOptionalUpdate}`,
        finalDecision: needsForceUpdate ? 'FORCE UPDATE' : hasOptionalUpdate ? 'OPTIONAL UPDATE' : 'NO UPDATE'
      });
      
      return {
        requiresUpdate: needsForceUpdate || hasOptionalUpdate,
        forceUpdate: needsForceUpdate,
        updateUrl: this.getStoreUrl(),
        message: normalizedBackendInfo.updateMessage,
      };
      
    } catch (error) {
      console.error('Error in checkForceUpdate:', error);
      // On error, fail gracefully - don't block the user
      return {
        requiresUpdate: false,
        forceUpdate: false,
        updateUrl: this.getStoreUrl(),
      };
    }
  }
  
  /**
   * Get the Play Store URL for Android
   */
  private getStoreUrl(): string {
    return 'https://play.google.com/store/apps/details?id=com.flykup.app';
  }
  
  /**
   * Save version info to AsyncStorage with error handling
   */
  private async saveVersionToStorage(info: VersionInfo): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        ...info,
        savedAt: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to save version info:', error);
      // Clear old data if storage is full
      if ((error as any).code === 'QuotaExceededError') {
        try {
          await AsyncStorage.clear();
          await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify({
            ...info,
            savedAt: Date.now(),
          }));
        } catch (clearError) {
          console.error('Failed to clear storage:', clearError);
        }
      }
    }
  }
  
  /**
   * Cache backend version info
   */
  private async cacheBackendVersion(info: BackendVersionInfo): Promise<void> {
    try {
      await AsyncStorage.setItem(this.BACKEND_VERSION_KEY, JSON.stringify({
        ...info,
        cachedAt: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to cache backend version:', error);
    }
  }
  
  /**
   * Get cached backend version
   */
  private async getCachedBackendVersion(): Promise<BackendVersionInfo | null> {
    try {
      const cached = await AsyncStorage.getItem(this.BACKEND_VERSION_KEY);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      // Cache is valid for 1 hour
      if (Date.now() - data.cachedAt > 60 * 60 * 1000) {
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get cached backend version:', error);
      return null;
    }
  }
  
  /**
   * Clear all version caches (useful for testing)
   */
  async clearAllCaches(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.STORAGE_KEY, this.BACKEND_VERSION_KEY]);
      if (VersionModule?.clearVersionCache) {
        await VersionModule.clearVersionCache();
      }
      this.lastCheckTime = 0;
      this.versionInfo = null;
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }
  
  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default VersionManager.getInstance();