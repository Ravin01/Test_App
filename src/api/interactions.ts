/**
 * 💝 INTERACTIONS API
 * User interactions (like, save, share, pause) with optimistic updates
 */

import axiosInstance from '../Utils/Api';

interface InteractionResponse {
  success: boolean;
  data?: any;
  message?: string;
}

interface LikeResponse extends InteractionResponse {
  data: {
    isLiked: boolean;
    newLikeCount: number;
  };
}

interface SaveResponse extends InteractionResponse {
  data: {
    isSaved: boolean;
  };
}

// Debounce helper for preventing spam clicks
const debounceMap = new Map<string, NodeJS.Timeout>();

const debounce = (key: string, func: Function, delay: number) => {
  const existing = debounceMap.get(key);
  if (existing) {
    clearTimeout(existing);
  }
  
  const timeout = setTimeout(() => {
    func();
    debounceMap.delete(key);
  }, delay);
  
  debounceMap.set(key, timeout);
};

/**
 * Like or unlike a video
 * Supports optimistic updates
 */
export const likeVideo = async (
  videoId: string, 
  isLiked: boolean,
  optimisticCallback?: (isLiked: boolean, newCount: number) => void
): Promise<LikeResponse> => {
  if (!videoId) {
    throw new Error('Video ID is required for like action');
  }

  // Optimistic update
  if (optimisticCallback) {
    const estimatedCount = isLiked ? 1 : -1; // Rough estimation
    optimisticCallback(isLiked, estimatedCount);
  }

  try {
    console.log(`💖 ${isLiked ? 'Liking' : 'Unliking'} video ${videoId}`);
    
    const response = await axiosInstance.post<LikeResponse>('/interactions/like', {
      videoId,
      isLiked,
      timestamp: new Date().toISOString(),
    });

    if (response.data.success) {
      console.log(`✅ Video ${videoId} ${isLiked ? 'liked' : 'unliked'} successfully`);
      return response.data;
    } else {
      throw new Error(response.data.message || 'Like action failed');
    }
  } catch (error) {
    console.error(`❌ Failed to ${isLiked ? 'like' : 'unlike'} video ${videoId}:`, error.message);
    
    // Revert optimistic update on error
    if (optimisticCallback) {
      optimisticCallback(!isLiked, isLiked ? -1 : 1);
    }
    
    throw error;
  }
};

/**
 * Save or unsave a video
 */
export const saveVideo = async (
  videoId: string,
  isSaved: boolean,
  optimisticCallback?: (isSaved: boolean) => void
): Promise<SaveResponse> => {
  if (!videoId) {
    throw new Error('Video ID is required for save action');
  }

  // Optimistic update
  if (optimisticCallback) {
    optimisticCallback(isSaved);
  }

  return new Promise((resolve, reject) => {
    debounce(`save-${videoId}`, async () => {
      try {
        console.log(`💾 ${isSaved ? 'Saving' : 'Unsaving'} video ${videoId}`);
        
        const response = await axiosInstance.post<SaveResponse>('/interactions/save', {
          videoId,
          isSaved,
          timestamp: new Date().toISOString(),
        });

        if (response.data.success) {
          console.log(`✅ Video ${videoId} ${isSaved ? 'saved' : 'unsaved'} successfully`);
          resolve(response.data);
        } else {
          throw new Error(response.data.message || 'Save action failed');
        }
      } catch (error) {
        console.error(`❌ Failed to ${isSaved ? 'save' : 'unsave'} video ${videoId}:`, error.message);
        
        // Revert optimistic update on error
        if (optimisticCallback) {
          optimisticCallback(!isSaved);
        }
        
        reject(error);
      }
    }, 500); // 500ms debounce
  });
};

/**
 * Share a video (tracking purposes)
 */
export const shareVideo = async (
  videoId: string,
  platform: string = 'generic',
  customData?: any
): Promise<InteractionResponse> => {
  if (!videoId) {
    throw new Error('Video ID is required for share tracking');
  }

  try {
    console.log(`📤 Tracking share for video ${videoId} on ${platform}`);
    
    const response = await axiosInstance.post<InteractionResponse>('/interactions/share', {
      videoId,
      platform,
      timestamp: new Date().toISOString(),
      customData,
    });

    if (response.data.success) {
      console.log(`✅ Share tracked for video ${videoId}`);
      return response.data;
    } else {
      throw new Error(response.data.message || 'Share tracking failed');
    }
  } catch (error) {
    console.error(`❌ Failed to track share for video ${videoId}:`, error.message);
    // Don't throw error for share tracking - it's not critical
    return { success: false, message: error.message };
  }
};

/**
 * Track pause duration (optional diagnostics)
 */
export const trackPause = async (
  videoId: string,
  pauseDuration: number,
  pauseReason?: string
): Promise<InteractionResponse> => {
  if (!videoId || pauseDuration < 0) {
    return { success: false, message: 'Invalid pause tracking data' };
  }

  try {
    // Only track pauses longer than 1 second to avoid spam
    if (pauseDuration < 1000) {
      return { success: true, message: 'Pause too short to track' };
    }

    console.log(`⏸️ Tracking pause for video ${videoId}: ${pauseDuration}ms`);
    
    const response = await axiosInstance.post<InteractionResponse>('/interactions/pause', {
      videoId,
      pauseDuration,
      pauseReason,
      timestamp: new Date().toISOString(),
    });

    if (response.data.success) {
      console.log(`✅ Pause tracked for video ${videoId}`);
      return response.data;
    } else {
      throw new Error(response.data.message || 'Pause tracking failed');
    }
  } catch (error) {
    console.error(`❌ Failed to track pause for video ${videoId}:`, error.message);
    // Don't throw error for pause tracking - it's diagnostic only
    return { success: false, message: error.message };
  }
};

/**
 * Batch interaction tracking (for performance)
 */
export const batchTrackInteractions = async (interactions: Array<{
  type: 'like' | 'save' | 'share' | 'pause';
  videoId: string;
  data: any;
}>): Promise<InteractionResponse> => {
  if (!interactions || interactions.length === 0) {
    return { success: true, message: 'No interactions to track' };
  }

  try {
    console.log(`📊 Batch tracking ${interactions.length} interactions`);
    
    const response = await axiosInstance.post<InteractionResponse>('/interactions/batch', {
      interactions,
      timestamp: new Date().toISOString(),
    });

    if (response.data.success) {
      console.log(`✅ Batch interactions tracked successfully`);
      return response.data;
    } else {
      throw new Error(response.data.message || 'Batch tracking failed');
    }
  } catch (error) {
    console.error(`❌ Batch interaction tracking failed:`, error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Clear debounce timers (for cleanup)
 */
export const clearInteractionDebounce = (): void => {
  debounceMap.forEach((timeout) => clearTimeout(timeout));
  debounceMap.clear();
  console.log('🧹 Interaction debounce timers cleared');
};