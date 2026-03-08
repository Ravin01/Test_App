/**
 * 🚀 ENTERPRISE VIDEO FEED WRAPPER
 * CEO Priority: Gradual rollout with feature flag support
 * Seamless integration with existing navigation structure
 */

import React, {useState, useEffect, useCallback} from 'react';
import {View, Alert, StyleSheet, Text, ActivityIndicator} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VideoFeed from './VideoFeed';
import {VideoData, BusinessCriticalError} from './VideoTypes';
// Direct imports to avoid circular dependency issues
import PlatformDetection from './PlatformDetection';
import axiosInstance from '../../Utils/Api';

// No legacy fallback needed - enterprise video feed handles all cases

interface EnterpriseVideoFeedWrapperProps {
  navigation?: any;
  route?: any;
}

const FEATURE_FLAG_KEY = 'enterprise_video_feed_enabled';
const ROLLOUT_PERCENTAGE_KEY = 'enterprise_video_feed_percentage';

export const EnterpriseVideoFeedWrapper: React.FC<
  EnterpriseVideoFeedWrapperProps
> = ({navigation, route}) => {
  const [useEnterpriseVideoFeed, setUseEnterpriseVideoFeed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialVideos, setInitialVideos] = useState<VideoData[]>([]);
  const [deviceCompatible, setDeviceCompatible] = useState(true);
  const id = route?.params?.id;
  // console.log('GETTING ID',id)
  // Check feature flag and device compatibility
  useEffect(() => {
    checkFeatureFlagAndCompatibility();
  }, []);

  const checkFeatureFlagAndCompatibility = async () => {
    try {
      console.log('🔍 Checking enterprise video feed eligibility...');

      // Check device compatibility first
      let isCompatible = true;
      try {
        await PlatformDetection.initialize();
        const capabilities = PlatformDetection.getCapabilities();
        isCompatible = capabilities.availableMemory >= 1; // Basic memory requirement
        console.log('✅ Device compatibility check passed:', isCompatible);
      } catch (compatError) {
        console.warn(
          '⚠️ Device compatibility check failed, assuming compatible:',
          compatError,
        );
        isCompatible = true; // Assume compatible if check fails
      }

      setDeviceCompatible(isCompatible);

      if (!isCompatible) {
        console.warn(
          '⚠️ Device not compatible with enterprise video feed, using legacy',
        );
        setUseEnterpriseVideoFeed(false);
        setIsLoading(false);
        return;
      }

      // Check feature flag
      const featureFlagEnabled = await AsyncStorage.getItem(FEATURE_FLAG_KEY);
      const rolloutPercentage = await AsyncStorage.getItem(
        ROLLOUT_PERCENTAGE_KEY,
      );

      let shouldUseEnterpriseVideoFeed = false;

      if (featureFlagEnabled === 'true') {
        // Explicitly enabled
        shouldUseEnterpriseVideoFeed = true;
      } else if (featureFlagEnabled === 'false') {
        // Explicitly disabled
        shouldUseEnterpriseVideoFeed = false;
      } else {
        // Check rollout percentage (default to gradual rollout)
        const percentage = rolloutPercentage
          ? parseInt(rolloutPercentage, 10)
          : 10; // Default 10%
        const userHash =
          Math.abs(hashCode((await getUserId()) || 'anonymous')) % 100;
        shouldUseEnterpriseVideoFeed = userHash < percentage;
      }

      // For development, always enable if __DEV__
      // if (__DEV__) {
      shouldUseEnterpriseVideoFeed = true;
      // }

      console.log(
        `🎯 Enterprise Video Feed enabled: ${shouldUseEnterpriseVideoFeed}`,
      );
      setUseEnterpriseVideoFeed(shouldUseEnterpriseVideoFeed);

      // Initialize videos if using enterprise feed
      if (shouldUseEnterpriseVideoFeed) {
        await initializeEnterpriseVideoFeed();
      }
    } catch (error) {
      console.error('❌ Feature flag check failed:', error);
      // Fallback to legacy on error
      setUseEnterpriseVideoFeed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeEnterpriseVideoFeed = async () => {
    try {
      console.log('⚡ Initializing Enterprise Video Feed...');

      // Basic initialization without complex manager setup for now
      // This avoids the ColdStartOptimizer import issues

      // Get initial videos (this would typically come from your existing API)
      // if(id)
      // const response = await axiosInstance.get(`/shoppable-videos/${id}`);
      const videos = await fetchInitialVideos();
      setInitialVideos(videos);

      console.log('✅ Enterprise Video Feed initialized successfully');
    } catch (error) {
      console.error('❌ Enterprise Video Feed initialization failed:', error);
      // Fallback to legacy on initialization failure
      setUseEnterpriseVideoFeed(false);

      Alert.alert(
        'Video Feed Update',
        'Loading enhanced video experience failed. Using standard version.',
        [{text: 'OK'}],
      );
    }
  };
  const fetchVideoById = async () => {
    if (id) {
      console.log(`🎯 Fetching specific video with ID: ${id}`);
      try {
        // First, fetch the specific video
        const specificVideoResponse = await axiosInstance.get(
          `/shoppable-videos/${id}`,
        );
        const specificVideo = specificVideoResponse.data.data;

        if (specificVideo) {
          console.log('✅ Specific video fetched successfully');
          videos.push(specificVideo);
        }
      } catch (videoError) {
        console.error('❌ Failed to fetch specific video:', videoError);
        // Continue with general feed even if specific video fails
      }
    }
  };
  // Video event handlers
  const handleVideoChange = useCallback(
    (video: VideoData, index: number) => {
      console.log(`📹 Video changed: ${video._id} (index: ${index})`);

      // Integrate with existing analytics
      // Analytics.track('video_view', { videoId: video._id, index });

      // Handle navigation if needed (e.g., for deep linking)
      if (navigation && route?.params?.videoId === video._id) {
        // Video reached via deep link
        console.log('🔗 Deep link video reached');
      }
    },
    [navigation, route],
  );

  const handleVideoError = useCallback((error: any) => {
    console.error('❌ Video error:', error);

    // Integrate with existing error reporting
    // ErrorReporting.reportError(error, 'VideoFeed');
  }, []);

  const handleBusinessCriticalError = useCallback(
    (error: BusinessCriticalError) => {
      console.error('🚨 Business critical error:', error);

      // CEO alert for high-revenue content failures
      if (error.revenue > 1000) {
        console.error('💰 HIGH REVENUE CONTENT ERROR - CEO ALERT', error);
        // CEOAlertSystem.sendAlert(error);
      }

      // Integrate with existing error handling
      // BusinessErrorHandler.handle(error);
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (useEnterpriseVideoFeed) {
        console.log('🧹 Enterprise video feed cleanup');
        // Basic cleanup without manager dependencies for now
      }
    };
  }, [useEnterpriseVideoFeed]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* You can add a loading spinner here */}
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  // Device compatibility - show error instead of fallback
  if (!deviceCompatible) {
    console.log('📱 Device not compatible with video feed');
    return (
      <View style={styles.loadingContainer}>
        <Text style={{color: '#ffffff', textAlign: 'center'}}>
          Device not compatible with video feed
        </Text>
      </View>
    );
  }

  // Feature flag decision
  if (useEnterpriseVideoFeed) {
    console.log('🚀 Using Enterprise Video Feed');
    return (
      <VideoFeed
        initialVideos={initialVideos}
        onVideoChange={handleVideoChange}
        onError={handleVideoError}
        onBusinessCriticalError={handleBusinessCriticalError}
        testID="enterprise-video-feed"
      />
    );
  } else {
    console.log('🚀 Using Enterprise Video Feed (fallback mode)');
    return (
      <VideoFeed
        initialVideos={initialVideos}
        onVideoChange={handleVideoChange}
        onError={handleVideoError}
        onBusinessCriticalError={handleBusinessCriticalError}
        testID="enterprise-video-feed-fallback"
      />
    );
  }
};

// Utility functions
const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
};

const getUserId = async (): Promise<string | null> => {
  try {
    // Get user ID from your existing auth system
    const userId = await AsyncStorage.getItem('user_id');
    return userId;
  } catch (error) {
    return null;
  }
};

const fetchInitialVideos = async (): Promise<VideoData[]> => {
  try {
    // This should integrate with your existing video API
    // For now, return empty array - the feed manager will load videos
    console.log('📥 Fetching initial videos...');

    const response = await axiosInstance.get(
      `/shoppable-videos?page=${1}&limit=${10}`,
    );
    // Example API call (replace with your actual API)
    // const response = await Api.get('/videos/feed?limit=5&cold_start=true');
    // return response.data.videos || [];

    return response.data.data || [];
  } catch (error) {
    console.error('❌ Failed to fetch initial videos:', error);
    return [];
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Feature flag control functions (for admin/debugging)
export const EnterpriseVideoFeedControls = {
  enable: async () => {
    await AsyncStorage.setItem(FEATURE_FLAG_KEY, 'true');
    console.log('✅ Enterprise Video Feed enabled');
  },

  disable: async () => {
    await AsyncStorage.setItem(FEATURE_FLAG_KEY, 'false');
    console.log('❌ Enterprise Video Feed disabled');
  },

  setRolloutPercentage: async (percentage: number) => {
    await AsyncStorage.setItem(ROLLOUT_PERCENTAGE_KEY, percentage.toString());
    console.log(`🎯 Enterprise Video Feed rollout set to ${percentage}%`);
  },

  getRolloutStatus: async () => {
    const enabled = await AsyncStorage.getItem(FEATURE_FLAG_KEY);
    const percentage = await AsyncStorage.getItem(ROLLOUT_PERCENTAGE_KEY);

    return {
      explicitlyEnabled: enabled === 'true',
      explicitlyDisabled: enabled === 'false',
      rolloutPercentage: percentage ? parseInt(percentage, 10) : 10,
    };
  },
};

export default EnterpriseVideoFeedWrapper;
