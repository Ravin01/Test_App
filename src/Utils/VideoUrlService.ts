import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from './Api';
import { AWS_CDN_URL } from './aws';

interface VideoUrlCache {
  url: string;
  expiresAt: number;
}

class VideoUrlService {
  private urlCache: Map<string, VideoUrlCache> = new Map();
  private pendingRequests: Map<string, Promise<string>> = new Map();

  /**
   * Get a valid video URL, either from cache or by fetching a new signed URL
   */
  async getVideoUrl(video: any): Promise<string> {
    // If video already has a direct URL that works, use it
    if (video?.hlsMasterPlaylistUrl) {
      // Check if it's a full URL (not just a path)
      if (video.hlsMasterPlaylistUrl.startsWith('http')) {
        return video.hlsMasterPlaylistUrl;
      }
    }

    // Generate cache key
    const cacheKey = video?._id || video?.masterPlaylistKey || JSON.stringify(video);
    
    // Check cache first
    const cached = this.urlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    // Check if we're already fetching this URL
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Create new request
    const request = this.fetchSignedUrl(video, cacheKey);
    this.pendingRequests.set(cacheKey, request);

    try {
      const url = await request;
      return url;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch a signed URL from the backend - STABLE VERSION
   */
  private async fetchSignedUrl(video: any, cacheKey: string): Promise<string> {
    try {
      // Try to get a signed URL from the backend
      const response = await axiosInstance.post('/videos/get-signed-url', {
        videoId: video._id,
        masterPlaylistKey: video.masterPlaylistKey,
      });

      if (response.data?.signedUrl) {
        // Cache the signed URL (expires in 1 hour)
        this.urlCache.set(cacheKey, {
          url: response.data.signedUrl,
          expiresAt: Date.now() + (3600 * 1000), // 1 hour
        });
        return response.data.signedUrl;
      }
    } catch (error) {
      console.warn('Failed to get signed URL from backend:', error);
    }
    
    // Fallback to constructed URL
    return this.constructAuthenticatedUrl(video);
  }

  /**
   * Construct a URL with authentication parameters
   */
  private async constructAuthenticatedUrl(video: any): Promise<string> {
    const baseUrl = video?.hlsMasterPlaylistUrl || `${AWS_CDN_URL}${video?.masterPlaylistKey}`;
    
    try {
      // Get the access token
      const accessToken = await AsyncStorage.getItem('accessToken');
      
      if (accessToken) {
        // Add token as query parameter (some CDNs accept this)
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}token=${accessToken}`;
      }
    } catch (error) {
      console.warn('Failed to add authentication to URL:', error);
    }

    // Return base URL as last resort
    return baseUrl;
  }

  /**
   * Clear the URL cache
   */
  clearCache() {
    this.urlCache.clear();
  }

  /**
   * Remove a specific URL from cache
   */
  invalidateUrl(videoId: string) {
    this.urlCache.delete(videoId);
  }
}

export default new VideoUrlService();