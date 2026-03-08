/**
 * 🎯 UNIFIED VIDEO INTERACTIONS API
 * Fixes data discrepancy issues by standardizing all video interaction endpoints
 * 
 * FIXES APPLIED:
 * 1. Single source of truth for API endpoints
 * 2. Consistent field name handling (likesCount vs likes)
 * 3. Proper error handling and fallbacks
 * 4. Optimistic update management
 */

import axiosInstance from '../Utils/Api';

export interface VideoMetrics {
  _id: string;
  likes: number;
  likesCount?: number; // Fallback for backend inconsistency
  shares: number;
  sharesCount?: number; // Fallback for backend inconsistency
  views: number;
  viewCount?: number; // Fallback for backend inconsistency
  comments: number;
  commentsCount?: number; // Fallback for backend inconsistency
  saves: number;
  isLiked: boolean;
  isSaved: boolean;
}

export interface InteractionResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LikeResponse {
  isLiked: boolean;
  likesCount: number;
  likes: number; // For backward compatibility
}

export interface ShareResponse {
  sharesCount: number;
  shares: number; // For backward compatibility
}

export interface SaveResponse {
  isSaved: boolean;
}

export interface ViewResponse {
  viewsCount: number;
  views: number; // For backward compatibility
}

/**
 * Normalizes field names to handle backend inconsistencies
 */
const normalizeMetrics = (data: any): VideoMetrics => {
  return {
    _id: data._id,
    // Handle likes field inconsistency
    likes: data.likesCount || data.likes || 0,
    likesCount: data.likesCount || data.likes || 0,
    // Handle shares field inconsistency  
    shares: data.sharesCount || data.shares || 0,
    sharesCount: data.sharesCount || data.shares || 0,
    // Handle views field inconsistency
    views: data.viewsCount || data.viewCount || data.views || 0,
    viewCount: data.viewsCount || data.viewCount || data.views || 0,
    // Handle comments field inconsistency
    comments: data.commentsCount || data.comments || 0,
    commentsCount: data.commentsCount || data.comments || 0,
    // Handle saves (usually consistent)
    saves: data.saves || 0,
    // Handle status fields
    isLiked: !!data.isLiked,
    isSaved: !!data.isSaved,
  };
};

/**
 * Unified class for all video interactions
 * Uses consistent endpoint patterns and handles field name conflicts
 */
export class VideoInteractionService {
  private static instance: VideoInteractionService;
  private pendingOperations = new Map<string, Promise<any>>();

  static getInstance(): VideoInteractionService {
    if (!VideoInteractionService.instance) {
      VideoInteractionService.instance = new VideoInteractionService();
    }
    return VideoInteractionService.instance;
  }

  /**
   * Like or unlike a video
   * FIXES: Unifies /shoppable-videos/${id}/like and /interactions/like endpoints
   */
  async toggleLike(videoId: string, isLiked: boolean): Promise<InteractionResponse<LikeResponse>> {
    const operationKey = `like-${videoId}`;
    
    // Prevent duplicate requests
    if (this.pendingOperations.has(operationKey)) {
      return this.pendingOperations.get(operationKey);
    }

    const promise = this._performLikeOperation(videoId, isLiked);
    this.pendingOperations.set(operationKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  private async _performLikeOperation(videoId: string, isLiked: boolean): Promise<InteractionResponse<LikeResponse>> {
    try {
      console.log(`💖 ${isLiked ? 'Liking' : 'Unliking'} video ${videoId}`);
      
      // Use the consistent shoppable-videos endpoint (most widely used in your codebase)
      const response = await axiosInstance.post(`/shoppable-videos/${videoId}/like`, {
        isLiked,
        timestamp: new Date().toISOString(),
      });

      if (response.data.success !== false) {
        const normalizedData = normalizeMetrics({
          ...response.data.data,
          isLiked,
          // Ensure we have both field names for compatibility
          likesCount: response.data.data?.likesCount || response.data.data?.likes,
          likes: response.data.data?.likesCount || response.data.data?.likes,
        });

        console.log(`✅ Video ${videoId} ${isLiked ? 'liked' : 'unliked'} - Count: ${normalizedData.likes}`);
        
        return {
          success: true,
          data: {
            isLiked: normalizedData.isLiked,
            likesCount: normalizedData.likes,
            likes: normalizedData.likes, // Backward compatibility
          },
          message: response.data.message,
        };
      } else {
        throw new Error(response.data.message || 'Like operation failed');
      }
    } catch (error) {
      console.error(`❌ Failed to ${isLiked ? 'like' : 'unlike'} video ${videoId}:`, error.message);
      return {
        success: false,
        data: {
          isLiked: !isLiked, // Revert optimistic state
          likesCount: 0,
          likes: 0,
        },
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Share a video
   * FIXES: Unifies different share endpoints
   */
  async shareVideo(videoId: string, platform: string = 'generic'): Promise<InteractionResponse<ShareResponse>> {
    const operationKey = `share-${videoId}`;
    
    if (this.pendingOperations.has(operationKey)) {
      return this.pendingOperations.get(operationKey);
    }

    const promise = this._performShareOperation(videoId, platform);
    this.pendingOperations.set(operationKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  private async _performShareOperation(videoId: string, platform: string): Promise<InteractionResponse<ShareResponse>> {
    try {
      console.log(`📤 Sharing video ${videoId} on ${platform}`);
      
      // Use the consistent shoppable-videos endpoint
      const response = await axiosInstance.post(`/shoppable-videos/${videoId}/share`, {
        platform,
        timestamp: new Date().toISOString(),
      });

      if (response.data.success !== false) {
        const normalizedData = normalizeMetrics({
          ...response.data.data,
          sharesCount: response.data.data?.sharesCount || response.data.data?.shares,
          shares: response.data.data?.sharesCount || response.data.data?.shares,
        });

        console.log(`✅ Video ${videoId} shared - Count: ${normalizedData.shares}`);
        
        return {
          success: true,
          data: {
            sharesCount: normalizedData.shares,
            shares: normalizedData.shares,
          },
          message: response.data.message,
        };
      } else {
        throw new Error(response.data.message || 'Share operation failed');
      }
    } catch (error) {
      console.error(`❌ Failed to share video ${videoId}:`, error.message);
      return {
        success: false,
        data: {
          sharesCount: 0,
          shares: 0,
        },
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Save or unsave a video
   * FIXES: Standardizes save endpoint usage
   */
  async toggleSave(videoId: string, isSaved: boolean): Promise<InteractionResponse<SaveResponse>> {
    const operationKey = `save-${videoId}`;
    
    if (this.pendingOperations.has(operationKey)) {
      return this.pendingOperations.get(operationKey);
    }

    const promise = this._performSaveOperation(videoId, isSaved);
    this.pendingOperations.set(operationKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  private async _performSaveOperation(videoId: string, isSaved: boolean): Promise<InteractionResponse<SaveResponse>> {
    try {
      console.log(`💾 ${isSaved ? 'Saving' : 'Unsaving'} video ${videoId}`);
      
      // Use the consistent shoppable-videos endpoint (with leading slash fix)
      const response = await axiosInstance.post(`/shoppable-videos/${videoId}/save`, {
        isSaved,
        timestamp: new Date().toISOString(),
      });

      if (response.data.success !== false) {
        console.log(`✅ Video ${videoId} ${isSaved ? 'saved' : 'unsaved'}`);
        
        return {
          success: true,
          data: {
            isSaved: response.data.data?.isSaved ?? isSaved,
          },
          message: response.data.message,
        };
      } else {
        throw new Error(response.data.message || 'Save operation failed');
      }
    } catch (error) {
      console.error(`❌ Failed to ${isSaved ? 'save' : 'unsave'} video ${videoId}:`, error.message);
      return {
        success: false,
        data: {
          isSaved: !isSaved, // Revert optimistic state
        },
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Track video view
   * FIXES: Unifies view tracking endpoints
   */
  async trackView(videoId: string, watchDuration: number, completionPercentage: number, clickedProducts: string[] = []): Promise<InteractionResponse<ViewResponse>> {
    try {
      console.log(`👁️ Tracking view for video ${videoId}: ${watchDuration}s, ${completionPercentage}%`);
      
      // Use the shoppable-interaction endpoint for analytics consistency
      const response = await axiosInstance.post(`/shoppable-interaction/${videoId}/view`, {
        watchDuration: Math.round(watchDuration),
        completionPercentage: Math.round(completionPercentage),
        clickedProducts,
        timestamp: new Date().toISOString(),
      });

      if (response.data.success !== false) {
        console.log(`✅ View tracked for video ${videoId}`);
        
        return {
          success: true,
          data: {
            viewsCount: response.data.data?.viewsCount || response.data.data?.views || 0,
            views: response.data.data?.viewsCount || response.data.data?.views || 0,
          },
          message: response.data.message,
        };
      } else {
        throw new Error(response.data.message || 'View tracking failed');
      }
    } catch (error) {
      console.log(`❌ Failed to track view for video ${videoId}:`, error.message);
      return {
        success: false,
        data: {
          viewsCount: 0,
          views: 0,
        },
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get video metrics (for analytics display)
   * FIXES: Standardizes analytics data retrieval
   */
  async getVideoMetrics(videoId: string): Promise<InteractionResponse<VideoMetrics>> {
    try {
      console.log(`📊 Fetching metrics for video ${videoId}`);
      
      // Use the analytics endpoint for comprehensive data
      const response = await axiosInstance.get(`/shoppable-interaction/${videoId}/analytics`);

      if (response.data.success !== false) {
        const rawData = response.data.data.summaryStats || response.data.data;
        const normalizedMetrics = normalizeMetrics({
          _id: videoId,
          ...rawData,
        });

        console.log(`✅ Metrics fetched for video ${videoId}:`, normalizedMetrics);
        
        return {
          success: true,
          data: normalizedMetrics,
          message: response.data.message,
        };
      } else {
        throw new Error(response.data.message || 'Failed to fetch metrics');
      }
    } catch (error) {
      console.error(`❌ Failed to fetch metrics for video ${videoId}:`, error.message);
      return {
        success: false,
        data: normalizeMetrics({ _id: videoId }), // Return default values
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Clear all pending operations (for cleanup)
   */
  cleanup(): void {
    console.log('🧹 Cleaning up video interaction service');
    this.pendingOperations.clear();
  }
}

// Export singleton instance
export const videoInteractionService = VideoInteractionService.getInstance();