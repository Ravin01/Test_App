/**
 * 🚀 ENDLESS FEED MANAGER
 * CEO Priority: Guaranteed endless scrolling until content exhausted
 * Zero tolerance for stuck states or premature feed termination
 */

import { VideoData, EndlessFeedState, NetworkState } from './VideoTypes';
import { FEED_CONFIG, ERROR_CONFIG } from './VideoConstants';
import PlatformDetection from './PlatformDetection';
import axiosInstance from '../../Utils/Api';

interface PaginationState {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  hasNextPage: boolean;
  isLoading: boolean;
  lastFetchTime: number;
}

interface RetryState {
  attempts: number;
  lastAttemptTime: number;
  backoffMultiplier: number;
  maxAttempts: number;
  delayMs: number;
}

interface FeedHealthMetrics {
  consecutiveFailures: number;
  successRate: number;
  avgLoadTime: number;
  stuckEvents: number;
  recoveryAttempts: number;
}

export class EndlessFeedManager {
  private static instance: EndlessFeedManager;
  
  private videos: VideoData[] = [];

  static getInstance(): EndlessFeedManager {

    if (!EndlessFeedManager.instance) {
      EndlessFeedManager.instance = new EndlessFeedManager();
    }
    return EndlessFeedManager.instance;
  }

  async initialize(initialVideos: VideoData[] = []): Promise<void> {
    console.log('🚀 Initializing EndlessFeedManager');
    
    // Set initial videos
    this.videos = [...initialVideos];
    
    // Reset states
    this.feedState = {
      isLoading: false,
      hasMore: true,
      currentPage: 0,
      error: null,
    };
    
    this.paginationState.currentPage = initialVideos.length > 0 ? 1 : 0;
    this.resetHealthMetrics();
    this.resetRetryState();
    
    console.log(`✅ EndlessFeedManager initialized with ${initialVideos.length} videos`);
  }

  private paginationState: PaginationState = {
    currentPage: 0,
    totalPages: 0,
    itemsPerPage: FEED_CONFIG.PAGE_SIZE,
    totalItems: 0,
    hasNextPage: true,
    isLoading: false,
    lastFetchTime: 0,
  };

  private retryState: RetryState = {
    attempts: 0,
    lastAttemptTime: 0,
    backoffMultiplier: 1.5,
    maxAttempts: FEED_CONFIG.MAX_RETRIES,
    delayMs: FEED_CONFIG.RETRY_DELAYS[0],
  };

  private healthMetrics: FeedHealthMetrics = {
    consecutiveFailures: 0,
    successRate: 100,
    avgLoadTime: 0,
    stuckEvents: 0,
    recoveryAttempts: 0,
  };

  private feedState: EndlessFeedState = {
    isLoading: false,
    hasMore: true,
    currentPage: 0,
    isStuck: false,
    errorRecovering: false,
  };

  private stuckDetectionTimer: NodeJS.Timeout | null = null;
  private networkState: NetworkState | null = null;
  private listeners: Map<string, Function> = new Map();

  static getInstance1(): EndlessFeedManager {
    if (!EndlessFeedManager.instance) {
      EndlessFeedManager.instance = new EndlessFeedManager();
    }
    return EndlessFeedManager.instance;
  }

  // INITIALIZATION

  async initialize1(initialVideos: VideoData[] = []): Promise<void> {
    console.log('♾️ Initializing endless feed manager');
    
    this.videos = [...initialVideos];
    this.paginationState.currentPage = initialVideos.length > 0 ? 1 : 0;
    this.feedState.currentPage = this.paginationState.currentPage;
    
    // Set up stuck detection
    this.setupStuckDetection();
    
    console.log('✅ Endless feed manager initialized with', initialVideos.length, 'videos');
  }

  // CORE FEED LOADING

  async loadNextPage(): Promise<VideoData[]> {
    if (this.feedState.isLoading) {
      console.log('⏳ Feed already loading, skipping request');
      return [];
    }

    if (!this.feedState.hasMore) {
      console.log('🏁 No more videos available');
      return [];
    }

    this.feedState.isLoading = true;
    this.paginationState.isLoading = true;
    this.resetStuckDetection();

    try {
      console.log(`📥 Loading page ${this.paginationState.currentPage + 1}`);
      const startTime = Date.now();

      const newVideos = await this.fetchVideosWithRetry();
      const loadTime = Date.now() - startTime;

      if (newVideos.length === 0) {
        console.log('📄 Empty page received - end of content reached');
        this.feedState.hasMore = false;
        this.paginationState.hasNextPage = false;
        this.emitFeedEvent('endReached', { totalVideos: this.videos.length });
        return [];
      }

      // Update state
      this.videos.push(...newVideos);
      this.paginationState.currentPage++;
      this.paginationState.lastFetchTime = Date.now();
      this.feedState.currentPage = this.paginationState.currentPage;

      // Update metrics
      this.updateHealthMetrics(true, loadTime);
      this.resetRetryState();

      console.log(`✅ Loaded ${newVideos.length} videos in ${loadTime}ms`);
      console.log(`📊 Total videos: ${this.videos.length}`);

      // Emit success event
      this.emitFeedEvent('pageLoaded', {
        page: this.paginationState.currentPage,
        videosLoaded: newVideos.length,
        totalVideos: this.videos.length,
        loadTime,
      });

      return newVideos;
    } catch (error) {
      console.error('❌ Failed to load next page:', error);
      this.updateHealthMetrics(false, 0);
      await this.handleLoadError(error);
      return [];
    } finally {
      this.feedState.isLoading = false;
      this.paginationState.isLoading = false;
    }
  }

  private async fetchVideosWithRetry(): Promise<VideoData[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryState.maxAttempts; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`🔄 Retry attempt ${attempt + 1}/${this.retryState.maxAttempts} after ${delay}ms`);
          await this.delay(delay);
        }

        const videos = await this.fetchVideosFromAPI();
        
        // Reset retry state on success
        this.resetRetryState();
        
        return videos;
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Fetch attempt ${attempt + 1} failed:`, error);
        
        // Don't retry certain types of errors
        if (this.shouldNotRetry(error)) {
          break;
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  private async fetchVideosFromAPI(): Promise<VideoData[]> {
    // This would be replaced with actual API implementation
    const nextPage = this.paginationState.currentPage + 1;
    const limit = this.paginationState.itemsPerPage;
if( this.paginationState.hasNextPage === false ) {
  return [];
}
    try {
      // Simulate network conditions for demo
      if (this.networkState?.quality === 'offline') {
        throw new Error('Network offline');
      }

        const response = await axiosInstance.get(`/shoppable-videos?page=${nextPage}&limit=${limit}`);
    // return response.data.data || [];

      // if (!response.ok) {
      //   throw new Error(`API error: ${response.status} ${response.statusText}`);
      // }

      const data =response.data || [];
      
      // Validate response structure
      // if (!data.videos || !Array.isArray(data.videos)) {
      //   throw new Error('Invalid API response structure');
      // }

      // Filter valid videos
      const validVideos = data.data.filter((video: any) => 
        video._id && 
        (video.masterPlaylistKey || video.hlsMasterPlaylistUrl) &&
        video.visibility === 'public'
      );

      // Update pagination info from API response
      if (data.pagination) {
        this.paginationState.totalPages = data.pagination.totalPages || 0;
        this.paginationState.totalItems = data.pagination.totalItems || 0;
        this.paginationState.hasNextPage = data.pagination.hasNextPage ?? true;
        this.feedState.hasMore = this.paginationState.hasNextPage;
      }

      return validVideos;
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }

  // ERROR HANDLING & RECOVERY

  private async handleLoadError(error: any): Promise<void> {
    this.feedState.errorRecovering = true;
    this.healthMetrics.recoveryAttempts++;

    console.log('🚨 Handling load error:', error.message);

    // Determine error recovery strategy based on error type
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'network':
        await this.handleNetworkError(error);
        break;
      case 'server':
        await this.handleServerError(error);
        break;
      case 'timeout':
        await this.handleTimeoutError(error);
        break;
      case 'parse':
        await this.handleParseError(error);
        break;
      default:
        await this.handleUnknownError(error);
    }

    this.feedState.errorRecovering = false;
  }

  private classifyError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('offline')) {
      return 'network';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return 'server';
    }
    if (message.includes('parse') || message.includes('json')) {
      return 'parse';
    }
    return 'unknown';
  }

  private async handleNetworkError(error: any): Promise<void> {
    console.log('🌐 Network error - implementing recovery strategy');
    
    // Wait for network to recover
    await this.waitForNetworkRecovery();
    
    // Try loading cached content
    const cachedVideos = await this.loadCachedVideos();
    if (cachedVideos.length > 0) {
      this.videos.push(...cachedVideos);
      console.log(`📋 Loaded ${cachedVideos.length} cached videos during network recovery`);
    }
  }

  private async handleServerError(error: any): Promise<void> {
    console.log('🖥️ Server error - exponential backoff');
    
    // Exponential backoff for server errors
    const delay = Math.min(30000, 1000 * Math.pow(2, this.retryState.attempts));
    await this.delay(delay);
  }

  private async handleTimeoutError(error: any): Promise<void> {
    console.log('⏰ Timeout error - reducing request size');
    
    // Reduce page size temporarily for timeout recovery
    this.paginationState.itemsPerPage = Math.max(3, this.paginationState.itemsPerPage - 2);
    console.log(`📉 Reduced page size to ${this.paginationState.itemsPerPage} for recovery`);
  }

  private async handleParseError(error: any): Promise<void> {
    console.log('📝 Parse error - data validation issue');
    
    // Skip this page and try the next one
    this.paginationState.currentPage++;
    console.log(`⏭️ Skipping corrupted page, moving to page ${this.paginationState.currentPage + 1}`);
  }

  private async handleUnknownError(error: any): Promise<void> {
    console.log('❓ Unknown error - generic recovery');
    
    // Generic recovery - wait and retry
    await this.delay(5000);
  }

  // STUCK STATE DETECTION & RECOVERY

  private setupStuckDetection(): void {
    this.resetStuckDetection();
  }

  private resetStuckDetection(): void {
    if (this.stuckDetectionTimer) {
      clearTimeout(this.stuckDetectionTimer);
    }

    this.stuckDetectionTimer = setTimeout(() => {
      if (this.feedState.isLoading) {
        this.handleStuckState();
      }
    }, FEED_CONFIG.STUCK_DETECTION_TIMEOUT);
  }

  private async handleStuckState(): Promise<void> {
    console.log('🔄 Stuck state detected - initiating recovery');
    
    this.feedState.isStuck = true;
    this.healthMetrics.stuckEvents++;
    
    // Emit stuck event
    this.emitFeedEvent('stuck', {
      page: this.paginationState.currentPage,
      attempts: this.retryState.attempts,
    });

    try {
      // Force cancel current loading
      this.feedState.isLoading = false;
      this.paginationState.isLoading = false;

      // Wait a moment
      await this.delay(1000);

      // Try to recover by loading next page
      console.log('🚀 Attempting stuck state recovery');
      await this.loadNextPage();
      
      this.feedState.isStuck = false;
      console.log('✅ Recovered from stuck state');
    } catch (error) {
      console.error('❌ Stuck state recovery failed:', error);
      this.feedState.isStuck = true;
      
      // Emit recovery failure
      this.emitFeedEvent('recoveryFailed', { error: error.message });
    }
  }

  // NETWORK AWARENESS

  onNetworkStateChange(networkState: NetworkState): void {
    this.networkState = networkState;
    
    console.log('📶 Network state changed:', networkState.quality);

    // Adjust strategy based on network conditions
    if (networkState.quality === 'poor' || networkState.isMetered) {
      this.paginationState.itemsPerPage = Math.max(3, FEED_CONFIG.PAGE_SIZE - 3);
    } else if (networkState.quality === 'excellent') {
      this.paginationState.itemsPerPage = FEED_CONFIG.PAGE_SIZE + 2;
    } else {
      this.paginationState.itemsPerPage = FEED_CONFIG.PAGE_SIZE;
    }

    // If we're stuck and network improves, try to recover
    if (this.feedState.isStuck && networkState.quality !== 'offline') {
      setTimeout(() => {
        if (this.feedState.isStuck) {
          this.handleStuckState();
        }
      }, 1000);
    }
  }

  private async waitForNetworkRecovery(): Promise<void> {
    return new Promise((resolve) => {
      const checkNetwork = () => {
        if (this.networkState?.quality !== 'offline') {
          resolve();
        } else {
          setTimeout(checkNetwork, 1000);
        }
      };
      checkNetwork();
    });
  }

  // CACHING & OFFLINE SUPPORT

  private async loadCachedVideos(): Promise<VideoData[]> {
    try {
      // This would load from device storage
      console.log('📋 Loading cached videos for offline experience');
      return []; // Placeholder
    } catch (error) {
      console.error('❌ Failed to load cached videos:', error);
      return [];
    }
  }

  // UTILITY METHODS

  private shouldNotRetry(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    
    // Don't retry for authentication errors, malformed requests, etc.
    return (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('400') ||
      message.includes('404')
    );
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = FEED_CONFIG.RETRY_DELAYS[Math.min(attempt, FEED_CONFIG.RETRY_DELAYS.length - 1)];
    const jitter = Math.random() * 0.3; // Add 0-30% jitter
    return Math.floor(baseDelay * (1 + jitter));
  }

  private resetRetryState(): void {
    this.retryState.attempts = 0;
    this.retryState.lastAttemptTime = 0;
    this.retryState.delayMs = FEED_CONFIG.RETRY_DELAYS[0];
  }

  private updateHealthMetrics(success: boolean, loadTime: number): void {
    if (success) {
      this.healthMetrics.consecutiveFailures = 0;
      this.healthMetrics.avgLoadTime = 
        (this.healthMetrics.avgLoadTime + loadTime) / 2;
    } else {
      this.healthMetrics.consecutiveFailures++;
    }

    // Calculate success rate (simple moving average)
    const totalAttempts = this.paginationState.currentPage + this.healthMetrics.consecutiveFailures;
    this.healthMetrics.successRate = 
      ((this.paginationState.currentPage / totalAttempts) * 100) || 100;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // EVENT SYSTEM

  addEventListener(event: string, callback: Function): void {
    this.listeners.set(event, callback);
  }

  removeEventListener(event: string): void {
    this.listeners.delete(event);
  }

  private emitFeedEvent(event: string, data: any): void {
    const listener = this.listeners.get(event);
    if (listener) {
      try {
        listener(data);
      } catch (error) {
        console.error(`❌ Event listener error for ${event}:`, error);
      }
    }
  }

  // PUBLIC API

  shouldLoadMore(currentIndex: number): boolean {
    const videosRemaining = this.videos.length - currentIndex;
    return videosRemaining <= FEED_CONFIG.PRELOAD_THRESHOLD && this.feedState.hasMore;
  }

  getVideos(): VideoData[] {
    return [...this.videos];
  }

  getFeedState(): EndlessFeedState {
    return { ...this.feedState };
  }

  getHealthMetrics(): FeedHealthMetrics {
    return { ...this.healthMetrics };
  }

  getPaginationState(): PaginationState {
    return { ...this.paginationState };
  }

  async refresh(): Promise<VideoData[]> {
    console.log('🔄 Refreshing feed from beginning');
    
    // Reset all state
    this.videos = [];
    this.paginationState.currentPage = 0;
    this.feedState.currentPage = 0;
    this.feedState.hasMore = true;
    this.feedState.isStuck = false;
    this.resetRetryState();
    
    // Load first page
    return this.loadNextPage();
  }

  // CLEANUP

  cleanup(): void {
    if (this.stuckDetectionTimer) {
      clearTimeout(this.stuckDetectionTimer);
      this.stuckDetectionTimer = null;
    }
    
    this.listeners.clear();
    
    console.log('🧹 Endless feed manager cleaned up');
  }

  // UTILITY METHODS
  
  private resetHealthMetrics(): void {
    this.healthMetrics = {
      consecutiveFailures: 0,
      successRate: 100,
      avgLoadTime: 0,
      stuckEvents: 0,
      recoveryAttempts: 0,
    };
  }

  private resetRetryStat1e(): void {
    this.retryState = {
      attempts: 0,
      lastAttemptTime: 0,
      backoffMultiplier: 1,
      maxAttempts: FEED_CONFIG.MAX_RETRIES,
      delayMs: FEED_CONFIG.RETRY_DELAYS[0],
    };
  }

  private updateHealthMetrics1(success: boolean, loadTime: number): void {
    if (success) {
      this.healthMetrics.consecutiveFailures = 0;
      this.healthMetrics.avgLoadTime = (this.healthMetrics.avgLoadTime + loadTime) / 2;
    } else {
      this.healthMetrics.consecutiveFailures++;
    }

    // Calculate success rate (simplified)
    this.healthMetrics.successRate = success ? 
      Math.min(100, this.healthMetrics.successRate + 1) : 
      Math.max(0, this.healthMetrics.successRate - 5);
  }

  private resetStuckDetection1(): void {
    if (this.stuckDetectionTimer) {
      clearTimeout(this.stuckDetectionTimer);
    }
    
    this.stuckDetectionTimer = setTimeout(() => {
      if (this.feedState.isLoading) {
        console.warn('⚠️ Feed appears stuck, attempting recovery');
        this.handleStuckState();
      }
    }, FEED_CONFIG.STUCK_DETECTION_TIMEOUT);
  }

  private emitFeedEvent1(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Feed event error (${event}):`, error);
        }
      });
    }
  }

  private delay1(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateRetryDela1y(attempt: number): number {
    const baseDelay = FEED_CONFIG.RETRY_DELAYS[Math.min(attempt, FEED_CONFIG.RETRY_DELAYS.length - 1)];
    return baseDelay * this.retryState.backoffMultiplier;
  }

  private shouldNotRetry1(error: any): boolean {
    // Don't retry for certain error types
    const errorCode = error?.status || error?.code;
    return errorCode === 401 || errorCode === 403 || errorCode === 404;
  }

  private async handleLoadError1(error: any): Promise<void> {
    this.feedState.error = error;
    this.healthMetrics.consecutiveFailures++;
    
    this.emitFeedEvent('loadError', { error: error.message, attempt: this.retryState.attempts });
  }

  private async fetchVideosFromAPI1(): Promise<VideoData[]> {
    // Mock implementation - replace with actual API call
    console.log('🔄 Fetching videos from API (mock)');
    
    // Simulate network delay
    await this.delay(500 + Math.random() * 1000);
    
    // Mock data - replace with actual API
    const mockVideos: VideoData[] = [];
    for (let i = 0; i < FEED_CONFIG.PAGE_SIZE; i++) {
      mockVideos.push({
        _id: `video_${Date.now()}_${i}`,
        title: `Mock Video ${i + 1}`,
        masterPlaylistKey: `mock_playlist_${i}.m3u8`,
        visibility: 'public',
        likes: Math.floor(Math.random() * 1000),
        shares: Math.floor(Math.random() * 100),
        views: Math.floor(Math.random() * 10000),
        creator: {
          _id: 'mock_creator',
          name: 'Mock Creator',
          avatar: '',
        },
      });
    }
    
    return mockVideos;
  }
}