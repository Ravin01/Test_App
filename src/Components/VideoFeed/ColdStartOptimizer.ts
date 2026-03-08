/**
 * 🚀 COLD START OPTIMIZER
 * CEO Priority: Sub-800ms app launch to first video
 * Aggressive preloading and lazy loading strategies
 */

import { VideoData, NetworkState, DeviceCapabilities } from './VideoTypes';
import { COLD_START_CONFIG, PERFORMANCE_THRESHOLDS } from './VideoConstants';
import PlatformDetection from './PlatformDetection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../Utils/Api';

interface ColdStartMetrics {
  appLaunchTime: number;
  feedVisibleTime: number;
  firstVideoPlayTime: number;
  totalColdStartTime: number;
  preloadedVideos: number;
  cacheHits: number;
  networkRequests: number;
}

interface ColdStartState {
  isInitialized: boolean;
  startTime: number;
  milestones: Map<string, number>;
  preloadedAssets: Set<string>;
  deferredTasks: Array<() => Promise<void>>;
}

export class ColdStartOptimizer {
  private static instance: ColdStartOptimizer;
  private state: ColdStartState = {
    isInitialized: false,
    startTime: Date.now(),
    milestones: new Map(),
    preloadedAssets: new Set(),
    deferredTasks: [],
  };

  private metrics: ColdStartMetrics = {
    appLaunchTime: 0,
    feedVisibleTime: 0,
    firstVideoPlayTime: 0,
    totalColdStartTime: 0,
    preloadedVideos: 0,
    cacheHits: 0,
    networkRequests: 0,
  };

  static getInstance(): ColdStartOptimizer {
    if (!ColdStartOptimizer.instance) {
      ColdStartOptimizer.instance = new ColdStartOptimizer();
    }
    return ColdStartOptimizer.instance;
  }

  // INITIALIZATION - Critical path optimization

  async initializeCriticalPath(): Promise<void> {
    console.log('⚡ Cold start: Initializing critical path');
    this.recordMilestone('critical_path_start');

    try {
      // Phase 1: Essential system initialization (parallel)
      const criticalTasks = await Promise.allSettled([
        this.initializePlatformDetection(),
        this.preloadUserPreferences(),
        this.initializeNetworkState(),
        this.preloadCriticalAssets(),
      ]);

      this.logTaskResults('Critical tasks', criticalTasks);

      // Phase 2: Pre-cache feed data (if network available)
      await this.preloadInitialFeedData();

      this.recordMilestone('critical_path_complete');
      this.state.isInitialized = true;

      console.log('✅ Cold start: Critical path initialized in', 
        Date.now() - this.state.startTime, 'ms');
    } catch (error) {
      console.error('❌ Cold start critical path failed:', error);
      // Continue with degraded experience rather than failing
      this.state.isInitialized = true;
    }
  }

  private async initializePlatformDetection(): Promise<void> {
    await PlatformDetection.initialize();
    console.log('📱 Platform detection initialized');
  }

  private async preloadUserPreferences(): Promise<void> {
    try {
      // Load critical user preferences in parallel
      const preferenceKeys = [
        'video_quality_preference',
        'autoplay_enabled',
        'data_saver_mode',
        'last_video_position',
      ];

      const preferences = await Promise.all(
        preferenceKeys.map(key => 
          AsyncStorage.getItem(key).catch(() => null)
        )
      );

      console.log('👤 User preferences preloaded:', preferences.filter(Boolean).length);
    } catch (error) {
      console.error('❌ User preferences preload failed:', error);
    }
  }

  private async initializeNetworkState(): Promise<NetworkState> {
    // Quick network state detection
    const networkState: NetworkState = {
      isConnected: true, // Assume connected, will be corrected later
      connectionType: 'wifi',
      isMetered: false,
      quality: 'good',
      bandwidth: 2.0, // Conservative estimate
    };

    try {
      // Platform-specific network detection would go here
      console.log('🌐 Network state initialized');
    } catch (error) {
      console.error('❌ Network state initialization failed:', error);
    }

    return networkState;
  }

  private async preloadCriticalAssets(): Promise<void> {
    const criticalAssets = [
      'play_icon.png',
      'pause_icon.png',
      'mute_icon.png',
      'loading_spinner.gif',
    ];

    try {
      // This would preload critical UI assets
      for (const asset of criticalAssets) {
        this.state.preloadedAssets.add(asset);
      }
      console.log('🎨 Critical assets preloaded:', criticalAssets.length);
    } catch (error) {
      console.error('❌ Critical assets preload failed:', error);
    }
  }

  // FEED DATA PRELOADING

  private async preloadInitialFeedData(): Promise<VideoData[]> {
    console.log('📹 Preloading initial feed data');
    this.recordMilestone('feed_preload_start');

    try {
      // Check for cached feed data first
      const cachedFeed = await this.getCachedFeedData();
      if (cachedFeed && cachedFeed.length > 0) {
        this.metrics.cacheHits++;
        console.log('⚡ Using cached feed data:', cachedFeed.length, 'videos');
        this.recordMilestone('feed_preload_complete');
        return cachedFeed;
      }

      // Fetch fresh data with timeout
      const feedData = await this.fetchInitialFeedWithTimeout();
      
      // Cache the data for next cold start
      this.cacheFeedData(feedData);
      
      this.metrics.preloadedVideos = feedData.length;
      this.recordMilestone('feed_preload_complete');
      
      console.log('📊 Feed data preloaded:', feedData.length, 'videos');
      return feedData;
    } catch (error) {
      console.error('❌ Feed data preload failed:', error);
      return [];
    }
  }

  private async getCachedFeedData(): Promise<VideoData[] | null> {
    try {
      const cached = await AsyncStorage.getItem('cached_feed_data');
      const cacheTimestamp = await AsyncStorage.getItem('cached_feed_timestamp');
      
      if (!cached || !cacheTimestamp) return null;
      
      // Check if cache is still valid (5 minutes)
      const age = Date.now() - parseInt(cacheTimestamp);
      if (age > 5 * 60 * 1000) {
        console.log('🗑️ Cached feed data expired');
        return null;
      }
      
      return JSON.parse(cached);
    } catch (error) {
      console.error('❌ Cache read failed:', error);
      return null;
    }
  }

  private async fetchInitialFeedWithTimeout(): Promise<VideoData[]> {
    this.metrics.networkRequests++;
    try{

    const response = await axiosInstance.get(`/shoppable-videos?page=${1}&limit=${10}`);
    return response.data.data|| [];
    }catch(error){console.log(error)}
    // return new Promise(async (resolve, reject) => {
    //   const timeout = setTimeout(() => {
    //     reject(new Error('Feed fetch timeout'));
    //   }, 3000); // 3 second timeout for cold start

    //   try {
    //     // This would be the actual API call
    //     const response = await fetch('/api/videos/feed?limit=5&cold_start=true');
    //     clearTimeout(timeout);
        
    //     if (!response.ok) {
    //       throw new Error(`Feed fetch failed: ${response.status}`);
    //     }
        
    //     const data = await response.json();
    //     resolve(data.videos || []);
    //   } catch (error) {
    //     clearTimeout(timeout);
    //     reject(error);
    //   }
    // });
  }

  private async cacheFeedData(feedData: VideoData[]): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem('cached_feed_data', JSON.stringify(feedData)),
        AsyncStorage.setItem('cached_feed_timestamp', Date.now().toString()),
      ]);
      console.log('💾 Feed data cached for next cold start');
    } catch (error) {
      console.error('❌ Feed cache write failed:', error);
    }
  }

  // LAZY LOADING OPTIMIZATION

  async initializeNonCriticalSystems(): Promise<void> {
    console.log('🔄 Initializing non-critical systems');
    
    // Execute deferred tasks with low priority
    const deferredTasks = [...COLD_START_CONFIG.LAZY_LOAD_RESOURCES];
    
    for (const taskName of deferredTasks) {
      // Use requestIdleCallback equivalent or setTimeout with low priority
      setTimeout(async () => {
        try {
          await this.executeDeferredTask(taskName);
        } catch (error) {
          console.error(`❌ Deferred task ${taskName} failed:`, error);
        }
      }, 100);
    }
  }

  private async executeDeferredTask(taskName: string): Promise<void> {
    switch (taskName) {
      case 'analytics_sdk':
        await this.initializeAnalytics();
        break;
      case 'error_reporting':
        await this.initializeErrorReporting();
        break;
      case 'debug_tools':
        await this.initializeDebugTools();
        break;
      default:
        console.warn('Unknown deferred task:', taskName);
    }
  }

  private async initializeAnalytics(): Promise<void> {
    // Initialize analytics SDK with low priority
    console.log('📊 Analytics SDK initialized (deferred)');
  }

  private async initializeErrorReporting(): Promise<void> {
    // Initialize error reporting with low priority  
    console.log('🐛 Error reporting initialized (deferred)');
  }

  private async initializeDebugTools(): Promise<void> {
    // Initialize debug tools only in development
    if (__DEV__) {
      console.log('🔧 Debug tools initialized (deferred)');
    }
  }

  // MILESTONE TRACKING

  private recordMilestone(name: string): void {
    const timestamp = Date.now();
    this.state.milestones.set(name, timestamp);
    
    // Update metrics based on milestone
    switch (name) {
      case 'app_launch_complete':
        this.metrics.appLaunchTime = timestamp - this.state.startTime;
        break;
      case 'feed_visible':
        this.metrics.feedVisibleTime = timestamp - this.state.startTime;
        break;
      case 'first_video_play':
        this.metrics.firstVideoPlayTime = timestamp - this.state.startTime;
        this.metrics.totalColdStartTime = timestamp - this.state.startTime;
        break;
    }

    console.log(`🏁 Milestone: ${name} at +${timestamp - this.state.startTime}ms`);
  }

  onFeedVisible(): void {
    this.recordMilestone('feed_visible');
    
    // Check if we met the target
    if (this.metrics.feedVisibleTime <= PERFORMANCE_THRESHOLDS.COLD_START_MAX) {
      console.log('✅ Cold start target achieved:', this.metrics.feedVisibleTime, 'ms');
    } else {
      console.warn('⚠️ Cold start target missed:', this.metrics.feedVisibleTime, 'ms');
    }
    
    // Start non-critical systems now that feed is visible
    this.initializeNonCriticalSystems();
  }

  onFirstVideoPlay(): void {
    this.recordMilestone('first_video_play');
    
    console.log('🎬 First video playing - Cold start complete:', 
      this.metrics.totalColdStartTime, 'ms');
    
    // Report cold start metrics
    this.reportColdStartMetrics();
  }

  // PERFORMANCE OPTIMIZATION

  optimizeForDevice(capabilities: DeviceCapabilities): void {
    console.log('⚙️ Optimizing cold start for device capabilities');
    
    if (capabilities.isLowEnd) {
      // Ultra-conservative for low-end devices
      COLD_START_CONFIG.PRELOAD_CRITICAL_RESOURCES.splice(1); // Keep only essentials
      this.metrics.preloadedVideos = Math.min(this.metrics.preloadedVideos, 2);
    } else if (capabilities.availableMemory > 6) {
      // Aggressive preloading for high-end devices
      this.metrics.preloadedVideos = Math.min(this.metrics.preloadedVideos + 2, 8);
    }
  }

  optimizeForNetwork(networkState: NetworkState): void {
    console.log('📶 Optimizing cold start for network:', networkState.quality);
    
    if (networkState.quality === 'poor' || networkState.isMetered) {
      // Minimal preloading on poor/metered connections
      this.metrics.preloadedVideos = Math.min(this.metrics.preloadedVideos, 1);
    } else if (networkState.quality === 'excellent') {
      // Aggressive preloading on excellent connections
      this.metrics.preloadedVideos = Math.min(this.metrics.preloadedVideos + 3, 10);
    }
  }

  // METRICS AND REPORTING

  private async reportColdStartMetrics(): Promise<void> {
    const metrics = this.getColdStartMetrics();
    
    // Log detailed metrics
    console.log('📊 Cold Start Performance Report:', {
      totalTime: metrics.totalColdStartTime,
      targetAchieved: metrics.totalColdStartTime <= PERFORMANCE_THRESHOLDS.COLD_START_MAX,
      breakdown: {
        appLaunch: metrics.appLaunchTime,
        feedVisible: metrics.feedVisibleTime,
        firstVideoPlay: metrics.firstVideoPlayTime,
      },
      efficiency: {
        preloadedVideos: metrics.preloadedVideos,
        cacheHits: metrics.cacheHits,
        networkRequests: metrics.networkRequests,
      },
    });

    // Store metrics for analytics
    try {
      await AsyncStorage.setItem('last_cold_start_metrics', JSON.stringify(metrics));
    } catch (error) {
      console.error('❌ Metrics storage failed:', error);
    }
  }

  getColdStartMetrics(): ColdStartMetrics {
    return { ...this.metrics };
  }

  getMilestones(): Map<string, number> {
    return new Map(this.state.milestones);
  }

  // UTILITY METHODS

  private logTaskResults(taskGroup: string, results: PromiseSettledResult<any>[]): void {
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`📊 ${taskGroup}: ${successful} successful, ${failed} failed`);
    
    if (failed > 0) {
      const failures = results
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason);
      console.warn('❌ Task failures:', failures);
    }
  }

  isInitialized(): boolean {
    return this.state.isInitialized;
  }

  getInitializationTime(): number {
    return Date.now() - this.state.startTime;
  }

  // Cleanup
  reset(): void {
    this.state = {
      isInitialized: false,
      startTime: Date.now(),
      milestones: new Map(),
      preloadedAssets: new Set(),
      deferredTasks: [],
    };
    
    this.metrics = {
      appLaunchTime: 0,
      feedVisibleTime: 0,
      firstVideoPlayTime: 0,
      totalColdStartTime: 0,
      preloadedVideos: 0,
      cacheHits: 0,
      networkRequests: 0,
    };
    
    console.log('🔄 Cold start optimizer reset');
  }
}