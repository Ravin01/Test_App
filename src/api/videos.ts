/**
 * 📹 VIDEOS API
 * Video feed API with integration to existing system
 */

import axiosInstance from '../Utils/Api';
import { VideoData } from '../Components/VideoFeed/VideoTypes';

interface VideoFeedResponse {
  success: boolean;
  videos: VideoData[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Fetch video feed (integrates with existing EndlessFeedManager)
 * This is mainly for completeness - the existing system already handles this well
 */
export const fetchVideoFeed = async (
  page: number = 1,
  limit: number = 10,
  filters?: {
    category?: string;
    shoppableOnly?: boolean;
    userId?: string;
  }
): Promise<VideoFeedResponse> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.category) {
      params.append('category', filters.category);
    }

    if (filters?.shoppableOnly) {
      params.append('shoppable', 'true');
    }

    if (filters?.userId) {
      params.append('userId', filters.userId);
    }

    console.log(`📹 Fetching video feed page ${page}`);
    
    const response = await axiosInstance.get<VideoFeedResponse>(`/videos/feed?${params.toString()}`);

    if (response.data.success) {
      console.log(`✅ Fetched ${response.data.videos.length} videos for page ${page}`);
      return response.data;
    } else {
      throw new Error('Video feed fetch failed');
    }
  } catch (error) {
    console.error(`❌ Failed to fetch video feed page ${page}:`, error.message);
    throw error;
  }
};

/**
 * Fetch single video details
 */
export const fetchVideoDetails = async (videoId: string): Promise<VideoData | null> => {
  if (!videoId) {
    return null;
  }

  try {
    console.log(`📹 Fetching details for video ${videoId}`);
    
    const response = await axiosInstance.get<{ success: boolean; video: VideoData }>(`/videos/${videoId}`);

    if (response.data.success && response.data.video) {
      console.log(`✅ Video details fetched for ${videoId}`);
      return response.data.video;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to fetch video details for ${videoId}:`, error.message);
    return null;
  }
};

/**
 * Update video interaction counts (for optimistic updates)
 */
export const updateVideoInteractionCounts = async (
  videoId: string,
  updates: {
    likes?: number;
    shares?: number;
    commentsCount?: number;
  }
): Promise<{ success: boolean; newCounts: any }> => {
  if (!videoId) {
    throw new Error('Video ID is required for updating interaction counts');
  }

  try {
    const response = await axiosInstance.patch(`/videos/${videoId}/interactions`, updates);
    
    if (response.data.success) {
      return {
        success: true,
        newCounts: response.data.counts,
      };
    } else {
      throw new Error(response.data.message || 'Failed to update interaction counts');
    }
  } catch (error) {
    console.error(`❌ Failed to update interaction counts for video ${videoId}:`, error.message);
    throw error;
  }
};

// Export for compatibility with existing system
export { VideoData } from '../Components/VideoFeed/VideoTypes';