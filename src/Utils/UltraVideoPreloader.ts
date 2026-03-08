import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { AWS_CDN_URL } from './aws';

interface VideoPreloadItem {
  videoId: string;
  url: string;
  quality: 'ultra' | 'high' | 'medium' | 'low';
  priority: number;
  preloadedAt: number;
  size: number;
  duration: number;
  thumbnailUrl: string;
}

interface NetworkCondition {
  type: string;
  isConnected: boolean;
  speed: 'slow' | 'medium' | 'fast' | 'ultra';
  effectiveType: string;
}

interface ScrollPrediction {
  velocity: number;
  direction: 'up' | 'down' | 'idle';
  predictedNext: number[];
  confidence: number;
}

class UltraVideoPreloader {
  private preloadCache = new Map<string, VideoPreloadItem>();
  private preloadQueue: string[] = [];
  private activeDownloads = new Set<string>();
  private networkCondition: NetworkCondition | null = null;
  private scrollPattern: ScrollPrediction | null = null;
  private maxCacheSize = Platform.select({ ios: 500, android: 300 }); // MB
  private currentCacheSize = 0;
  
  // AI-powered prediction weights
  private userBehaviorWeight = 0.4;
  private scrollVelocityWeight = 0.3;
  private timeOfDayWeight = 0.2;
  private contentSimilarityWeight = 0.1;

  constructor() {
    this.initializeNetworkMonitoring();
    this.loadCacheFromStorage();
    this.startIntelligentPreloading();
  }

  /**
   * 🧠 AI-POWERED VIDEO PREDICTION
   * Predicts which videos user will watch based on behavior patterns
   */
  async predictNextVideos(
    currentIndex: number, 
    videos: any[], 
    scrollVelocity: number,
    userHistory: any[]
  ): Promise<number[]> {
    // Add safety checks to prevent .some() errors
    if (!Array.isArray(videos) || videos.length === 0) {
      console.warn('❌ Videos array is invalid, returning empty predictions');
      return [];
    }
    
    if (typeof currentIndex !== 'number' || currentIndex < 0) {
      console.warn('❌ Current index is invalid, returning empty predictions');
      return [];
    }
    
    const predictions: Array<{ index: number; score: number }> = [];
    const safeVideos = videos.filter(v => v && typeof v === 'object');
    const safeUserHistory = Array.isArray(userHistory) ? userHistory.filter(h => h && typeof h === 'object') : [];
    
    if (safeVideos.length === 0) {
      console.warn('❌ No valid videos found, returning empty predictions');
      return [];
    }
    
    try {
      // 1. SCROLL VELOCITY PREDICTION (30% weight)
      const velocityPrediction = this.predictFromVelocity(currentIndex, scrollVelocity || 0, safeVideos.length);
      
      // 2. USER BEHAVIOR PREDICTION (40% weight)
      const behaviorPrediction = this.predictFromBehavior(currentIndex, safeUserHistory, safeVideos);
      
      // 3. TIME-BASED PREDICTION (20% weight)  
      const timePrediction = this.predictFromTimePatterns(currentIndex, safeVideos);
      
      // 4. CONTENT SIMILARITY PREDICTION (10% weight)
      const similarityPrediction = this.predictFromContentSimilarity(currentIndex, safeVideos);
      
      // Combine all predictions with weights
      for (let i = 0; i < Math.min(safeVideos.length, currentIndex + 10); i++) {
        if (i === currentIndex) continue;
        
        const score = 
          (velocityPrediction[i] || 0) * this.scrollVelocityWeight +
          (behaviorPrediction[i] || 0) * this.userBehaviorWeight +
          (timePrediction[i] || 0) * this.timeOfDayWeight +
          (similarityPrediction[i] || 0) * this.contentSimilarityWeight;
          
        predictions.push({ index: i, score });
      }
      
      // Sort by prediction score and return top 7 videos
      return predictions
        .sort((a, b) => b.score - a.score)
        .slice(0, 7)
        .map(p => p.index);
    } catch (error) {
      console.error('❌ Error in predictNextVideos:', error);
      // Return safe fallback predictions
      const fallbackPredictions = [];
      for (let i = 1; i <= Math.min(7, safeVideos.length - currentIndex); i++) {
        if (currentIndex + i < safeVideos.length) {
          fallbackPredictions.push(currentIndex + i);
        }
      }
      return fallbackPredictions;
    }
  }

  /**
   * 🚀 VELOCITY-BASED PREDICTION
   * Predicts scroll direction and speed
   */
  private predictFromVelocity(currentIndex: number, velocity: number, totalVideos: number): Record<number, number> {
    const predictions: Record<number, number> = {};
    
    if (Math.abs(velocity) < 100) {
      // Slow scroll - likely to watch nearby videos
      for (let i = 1; i <= 3; i++) {
        if (currentIndex + i < totalVideos) predictions[currentIndex + i] = 0.9 - (i * 0.2);
        if (currentIndex - i >= 0) predictions[currentIndex - i] = 0.7 - (i * 0.2);
      }
    } else if (velocity > 0) {
      // Fast downward scroll - preload further ahead
      for (let i = 1; i <= 7; i++) {
        if (currentIndex + i < totalVideos) {
          predictions[currentIndex + i] = Math.max(0.1, 0.95 - (i * 0.1));
        }
      }
    } else {
      // Fast upward scroll - preload backwards
      for (let i = 1; i <= 5; i++) {
        if (currentIndex - i >= 0) {
          predictions[currentIndex - i] = Math.max(0.1, 0.9 - (i * 0.15));
        }
      }
    }
    
    return predictions;
  }

  /**
   * 🧠 USER BEHAVIOR PREDICTION  
   * Learns from user's past viewing patterns
   */
  private predictFromBehavior(currentIndex: number, history: any[], videos: any[]): Record<number, number> {
    const predictions: Record<number, number> = {};
    
    if (!history || history.length < 5) {
      // Default behavior for new users - sequential watching
      for (let i = 1; i <= 5; i++) {
        if (currentIndex + i < videos.length) {
          predictions[currentIndex + i] = 0.8 - (i * 0.1);
        }
      }
      return predictions;
    }
    
    // Analyze user's skip patterns
    const skipPattern = this.analyzeSkipPattern(history);
    const watchTimePattern = this.analyzeWatchTimePattern(history);
    const categoryPreference = this.analyzeCategoryPreference(history, videos);
    
    // Apply learned patterns
    for (let i = 1; i <= 7; i++) {
      const targetIndex = currentIndex + i;
      if (targetIndex >= videos.length) break;
      
      let score = 0.5; // Base score
      
      // Skip pattern influence
      if (skipPattern.averageSkip > 0) {
        const expectedSkip = Math.round(skipPattern.averageSkip);
        if (i === expectedSkip) score += 0.3;
      }
      
      // Category preference influence
      const video = videos[targetIndex];
      if (video && categoryPreference[video.category]) {
        score += categoryPreference[video.category] * 0.4;
      }
      
      // Watch time pattern influence
      if (watchTimePattern.preferredDuration) {
        const videoDuration = video?.duration || 30;
        const durationMatch = 1 - Math.abs(videoDuration - watchTimePattern.preferredDuration) / 60;
        score += durationMatch * 0.3;
      }
      
      predictions[targetIndex] = Math.min(1, Math.max(0, score));
    }
    
    return predictions;
  }

  /**
   * ⏰ TIME-BASED PREDICTION
   * Different content preferences at different times
   */
  private predictFromTimePatterns(currentIndex: number, videos: any[]): Record<number, number> {
    const predictions: Record<number, number> = {};
    const currentHour = new Date().getHours();
    
    // Time-based content preferences
    const timePreferences: Record<string, number> = {
      morning: currentHour >= 6 && currentHour < 12 ? 0.8 : 0.2,    // Educational/News
      afternoon: currentHour >= 12 && currentHour < 18 ? 0.9 : 0.3, // Shopping/Lifestyle  
      evening: currentHour >= 18 && currentHour < 24 ? 0.8 : 0.2,   // Entertainment
      night: currentHour >= 0 && currentHour < 6 ? 0.6 : 0.1,       // Short content
    };
    
    for (let i = 1; i <= 5; i++) {
      const targetIndex = currentIndex + i;
      if (targetIndex >= videos.length) break;
      
      const video = videos[targetIndex];
      let score = 0.3; // Base score
      
      // Apply time-based preferences
      if (video?.category === 'educational' && timePreferences.morning > 0.5) score += 0.2;
      if (video?.category === 'shopping' && timePreferences.afternoon > 0.5) score += 0.3;
      if (video?.category === 'entertainment' && timePreferences.evening > 0.5) score += 0.2;
      if (video?.duration < 30 && timePreferences.night > 0.3) score += 0.2;
      
      predictions[targetIndex] = score;
    }
    
    return predictions;
  }

  /**
   * 🎯 CONTENT SIMILARITY PREDICTION
   * Recommends similar content
   */
  private predictFromContentSimilarity(currentIndex: number, videos: any[]): Record<number, number> {
    const predictions: Record<number, number> = {};
    const currentVideo = videos[currentIndex];
    
    if (!currentVideo) return predictions;
    
    for (let i = 1; i <= 5; i++) {
      const targetIndex = currentIndex + i;
      if (targetIndex >= videos.length) break;
      
      const targetVideo = videos[targetIndex];
      if (!targetVideo) continue;
      
      let similarity = 0;
      
      // Category similarity
      if (currentVideo.category === targetVideo.category) similarity += 0.4;
      
      // Creator similarity  
      if (currentVideo.host?._id === targetVideo.host?._id) similarity += 0.3;
      
      // Product similarity
      if (currentVideo.productsListed && targetVideo.productsListed) {
        const productSimilarity = this.calculateProductSimilarity(
          currentVideo.productsListed,
          targetVideo.productsListed
        );
        similarity += productSimilarity * 0.3;
      }
      
      predictions[targetIndex] = similarity;
    }
    
    return predictions;
  }

  /**
   * 🚀 NETWORK-AWARE QUALITY SELECTION
   * Dynamically adjusts quality based on network speed
   */
  private getOptimalQuality(networkCondition: NetworkCondition): string {
    if (!networkCondition.isConnected) return 'low';
    
    switch (networkCondition.speed) {
      case 'ultra': // 5G/Fast WiFi
        return 'ultra'; // 8Mbps, 4K ready
      case 'fast':  // 4G/WiFi
        return 'high'; // 4Mbps, 1080p
      case 'medium': // 3G/Slow 4G
        return 'medium'; // 2Mbps, 720p  
      case 'slow':   // 2G/Poor connection
        return 'low'; // 500Kbps, 480p
      default:
        return 'medium';
    }
  }

  /**
   * 🎯 INTELLIGENT PRELOAD ORCHESTRATOR
   * Manages the entire preloading pipeline
   */
  async preloadVideosIntelligently(
    currentIndex: number,
    videos: any[],
    scrollVelocity: number = 0,
    userHistory: any[] = []
  ): Promise<void> {
    if (!this.networkCondition?.isConnected) return;
    
    const startTime = Date.now();
    console.log(`🧠 Starting intelligent preload for video ${currentIndex}`);
    
    // 1. PREDICT NEXT VIDEOS TO WATCH
    const predictedIndices = await this.predictNextVideos(
      currentIndex, 
      videos, 
      scrollVelocity, 
      userHistory
    );
    
    console.log(`🎯 Predicted next videos: [${predictedIndices.join(', ')}]`);
    
    // 2. PRIORITIZE PRELOAD QUEUE
    const prioritizedQueue = this.prioritizePreloadQueue(
      predictedIndices,
      videos,
      scrollVelocity
    );
    
    // 3. START PARALLEL PRELOADING
    const preloadPromises = prioritizedQueue.slice(0, 5).map(async (item, index) => {
      try {
        await this.preloadSingleVideo(
          videos[item.index],
          item.priority,
          item.quality,
          index * 100 // Stagger downloads by 100ms
        );
      } catch (error) {
        console.warn(`Preload failed for video ${item.index}:`, error);
      }
    });
    
    // 4. EXECUTE WITH TIMEOUT
    await Promise.allSettled(preloadPromises);
    
    const loadTime = Date.now() - startTime;
    console.log(`🚀 Intelligent preload completed in ${loadTime}ms`);
    
    // 5. CLEANUP OLD CACHE
    this.cleanupOldCache();
  }

  /**
   * ⚡ PRIORITY QUEUE MANAGEMENT
   * Organizes videos by importance and network conditions
   */
  private prioritizePreloadQueue(
    predictedIndices: number[],
    videos: any[],
    scrollVelocity: number
  ): Array<{ index: number; priority: number; quality: string }> {
    const queue: Array<{ index: number; priority: number; quality: string }> = [];
    
    const optimalQuality = this.getOptimalQuality(this.networkCondition!);
    
    predictedIndices.forEach((index, position) => {
      if (index >= videos.length) return;
      
      // Calculate priority score (0-100)
      let priority = 100 - (position * 10); // Base priority by prediction order
      
      // Boost priority for immediate next video
      if (position === 0) priority = 100;
      
      // Adjust for scroll velocity
      if (Math.abs(scrollVelocity) > 500) {
        // Fast scroll - prioritize videos further ahead
        if (position >= 2) priority += 20;
      } else {
        // Slow scroll - prioritize immediate next videos
        if (position <= 1) priority += 30;
      }
      
      // Network-aware quality adjustment
      let quality = optimalQuality;
      if (position > 2 && this.networkCondition?.speed === 'slow') {
        quality = 'low'; // Lower quality for distant videos on slow network
      }
      
      queue.push({ index, priority, quality });
    });
    
    return queue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 📥 SINGLE VIDEO PRELOADER
   * Downloads and caches individual video with metadata AND actual data prefetch
   */
  private async preloadSingleVideo(
    video: any,
    priority: number,
    quality: string,
    delay: number = 0
  ): Promise<void> {
    if (!video?._id) return;
    
    const videoId = video._id;
    
    // Check if already cached
    if (this.preloadCache.has(videoId)) {
      return;
    }
    
    // Check if already downloading
    if (this.activeDownloads.has(videoId)) {
      return;
    }
    
    // Apply delay for staggered downloads
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.activeDownloads.add(videoId);
    const downloadStart = Date.now();
    
    try {
      // Get video URL
      const videoUrl = video?.hlsMasterPlaylistUrl || `${AWS_CDN_URL}${video?.masterPlaylistKey}` || `${AWS_CDN_URL}${video?.videoUrl}`;
      
      // Estimate download size based on quality
      const estimatedSize = this.estimateVideoSize(video.duration || 30, quality);
      
      // Check cache size limit
      if (this.currentCacheSize + estimatedSize > this.maxCacheSize!) {
        await this.freeUpCacheSpace(estimatedSize);
      }
      
      // 🚀 ACTUAL VIDEO DATA PREFETCH - Fetch initial bytes to warm up CDN and browser cache
      const prefetchPromises: Promise<any>[] = [];
      
      // 1. Prefetch HLS playlist (m3u8) if available
      if (videoUrl && videoUrl.includes('.m3u8')) {
        prefetchPromises.push(
          fetch(videoUrl, { 
            method: 'GET',
            headers: { 'Range': 'bytes=0-50000' }, // First 50KB of playlist
          }).catch(() => null)
        );
      }
      
      // 2. Prefetch video file (first segment)
      if (videoUrl) {
        prefetchPromises.push(
          fetch(videoUrl, {
            method: 'GET', 
            headers: { 'Range': 'bytes=0-524288' }, // First 512KB of video
          }).catch(() => null)
        );
      }
      
      // 3. Prefetch thumbnail for instant display
      const thumbnailUrl = video.thumbnailUrl || `${AWS_CDN_URL}${video.thumbnailBlobName}`;
      if (thumbnailUrl) {
        prefetchPromises.push(
          fetch(thumbnailUrl, { method: 'GET' }).catch(() => null)
        );
      }
      
      // Execute all prefetch requests in parallel with timeout
      await Promise.race([
        Promise.allSettled(prefetchPromises),
        new Promise(resolve => setTimeout(resolve, 3000)) // 3 second timeout
      ]);
      
      // Cache the preload data
      const preloadData: VideoPreloadItem = {
        videoId,
        url: videoUrl,
        quality: quality as any,
        priority,
        preloadedAt: Date.now(),
        size: estimatedSize,
        duration: video.duration || 30,
        thumbnailUrl: thumbnailUrl,
      };
      
      this.preloadCache.set(videoId, preloadData);
      this.currentCacheSize += estimatedSize;
      
      const loadTime = Date.now() - downloadStart;
      console.log(`✅ Video ${videoId} prefetched in ${loadTime}ms`);
      
    } catch (error) {
      console.warn(`⚠️ Prefetch warning for video ${videoId}:`, error);
    } finally {
      this.activeDownloads.delete(videoId);
    }
  }

  /**
   * 🧹 INTELLIGENT CACHE CLEANUP
   * Removes old videos based on usage patterns and priority
   */
  private async freeUpCacheSpace(requiredSpace: number): Promise<void> {
    const cacheEntries = Array.from(this.preloadCache.entries());
    
    // Sort by usage score (lower is more likely to be removed)
    cacheEntries.sort(([, a], [, b]) => {
      const scoreA = this.calculateCacheScore(a);
      const scoreB = this.calculateCacheScore(b);
      return scoreA - scoreB;
    });
    
    let freedSpace = 0;
    const toRemove: string[] = [];
    
    for (const [videoId, item] of cacheEntries) {
      if (freedSpace >= requiredSpace) break;
      
      toRemove.push(videoId);
      freedSpace += item.size;
    }
    
    // Remove selected items
    toRemove.forEach(videoId => {
      const item = this.preloadCache.get(videoId);
      if (item) {
        this.preloadCache.delete(videoId);
        this.currentCacheSize -= item.size;
      }
    });
    
    console.log(`🧹 Freed ${freedSpace.toFixed(1)}MB cache space (removed ${toRemove.length} videos)`);
  }

  /**
   * 📊 CACHE SCORING ALGORITHM
   * Determines which cached videos should be kept vs removed
   */
  private calculateCacheScore(item: VideoPreloadItem): number {
    const now = Date.now();
    const age = (now - item.preloadedAt) / (1000 * 60); // Age in minutes
    
    let score = item.priority; // Base score from priority
    
    // Reduce score for old items
    score -= age * 0.5;
    
    // Boost score for recently accessed items
    // (This would be enhanced with actual access tracking)
    
    // Reduce score for large files on slow networks
    if (this.networkCondition?.speed === 'slow' && item.size > 10) {
      score -= 20;
    }
    
    return Math.max(0, score);
  }

  // ... Helper methods for behavior analysis
  private analyzeSkipPattern(history: any[]): { averageSkip: number; skipRate: number } {
    // Add null/undefined checks to prevent .some() errors
    if (!Array.isArray(history) || history.length < 5) return { averageSkip: 1, skipRate: 0 };
    
    const safeHistory = history.filter(h => h && typeof h === 'object');
    if (safeHistory.length === 0) return { averageSkip: 1, skipRate: 0 };
    
    const skips = safeHistory.slice(-20).map((h, i, arr) => {
      if (i === 0) return 0;
      const current = h?.videoIndex || 0;
      const previous = arr[i-1]?.videoIndex || 0;
      return Math.abs(current - previous);
    }).filter(skip => skip > 0);
    
    if (skips.length === 0) return { averageSkip: 1, skipRate: 0 };
    
    return {
      averageSkip: skips.reduce((a, b) => a + b, 0) / skips.length || 1,
      skipRate: skips.filter(s => s > 1).length / skips.length
    };
  }

  private analyzeWatchTimePattern(history: any[]): { preferredDuration: number; completionRate: number } {
    // Add null/undefined checks to prevent .some() errors
    if (!Array.isArray(history) || history.length < 5) return { preferredDuration: 30, completionRate: 0.5 };
    
    const safeHistory = history.filter(h => h && typeof h === 'object');
    const watchData = safeHistory.slice(-20).filter(h => 
      h.watchTime && 
      h.videoDuration && 
      typeof h.watchTime === 'number' && 
      typeof h.videoDuration === 'number'
    );
    
    if (watchData.length === 0) return { preferredDuration: 30, completionRate: 0.5 };
    
    const avgDuration = watchData.reduce((sum, h) => sum + h.videoDuration, 0) / watchData.length || 30;
    const avgCompletion = watchData.reduce((sum, h) => sum + (h.watchTime / h.videoDuration), 0) / watchData.length || 0.5;
    
    return {
      preferredDuration: avgDuration,
      completionRate: avgCompletion
    };
  }

  private analyzeCategoryPreference(history: any[], videos: any[]): Record<string, number> {
    const preferences: Record<string, number> = {};
    
    // Add null/undefined checks to prevent .some() errors
    if (!Array.isArray(history) || !Array.isArray(videos) || history.length < 5) return preferences;
    
    const safeHistory = history.filter(h => h && typeof h === 'object');
    const safeVideos = videos.filter(v => v && typeof v === 'object');
    
    if (safeHistory.length === 0 || safeVideos.length === 0) return preferences;
    
    const categoryCount: Record<string, number> = {};
    const categoryWatchTime: Record<string, number> = {};
    
    safeHistory.slice(-30).forEach(h => {
      const video = safeVideos.find(v => v._id === h.videoId);
      if (video?.category && typeof video.category === 'string') {
        categoryCount[video.category] = (categoryCount[video.category] || 0) + 1;
        categoryWatchTime[video.category] = (categoryWatchTime[video.category] || 0) + (h.watchTime || 0);
      }
    });
    
    Object.keys(categoryCount).forEach(category => {
      const count = categoryCount[category];
      const totalWatchTime = categoryWatchTime[category] || 0;
      const avgWatchTime = count > 0 ? totalWatchTime / count : 0;
      preferences[category] = (count / safeHistory.length) * (avgWatchTime / 30); // Normalized score
    });
    
    return preferences;
  }

  private calculateProductSimilarity(products1: any[], products2: any[]): number {
    if (!products1?.length || !products2?.length) return 0;
    
    // Add null checks to prevent .some() errors
    const safeProducts1 = Array.isArray(products1) ? products1 : [];
    const safeProducts2 = Array.isArray(products2) ? products2 : [];
    
    if (safeProducts1.length === 0 || safeProducts2.length === 0) return 0;
    
    const categories1 = new Set(safeProducts1.map(p => p?.category).filter(Boolean));
    const categories2 = new Set(safeProducts2.map(p => p?.category).filter(Boolean));
    
    const intersection = new Set([...categories1].filter(c => categories2.has(c)));
    const union = new Set([...categories1, ...categories2]);
    
    return union.size > 0 ? intersection.size / union.size : 0; // Jaccard similarity
  }

  private estimateVideoSize(duration: number, quality: string): number {
    const bitrates = {
      ultra: 8,   // 8 Mbps
      high: 4,    // 4 Mbps  
      medium: 2,  // 2 Mbps
      low: 0.5    // 500 Kbps
    };
    
    const bitrate = bitrates[quality as keyof typeof bitrates] || 2;
    return (duration * bitrate * 1000000) / 8 / (1024 * 1024); // Convert to MB
  }

  /**
   * 🌐 NETWORK MONITORING
   * Continuously monitors network conditions for adaptive streaming
   */
  private async initializeNetworkMonitoring(): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();
      this.updateNetworkCondition(netInfo);
      
      NetInfo.addEventListener(this.updateNetworkCondition.bind(this));
    } catch (error) {
      console.warn('Network monitoring not available:', error);
      this.networkCondition = {
        type: 'wifi',
        isConnected: true,
        speed: 'medium',
        effectiveType: '4g'
      };
    }
  }

  private updateNetworkCondition(netInfo: any): void {
    let speed: 'slow' | 'medium' | 'fast' | 'ultra' = 'medium';
    
    if (netInfo.type === 'wifi') {
      speed = 'fast';
    } else if (netInfo.type === 'cellular') {
      const generation = netInfo.details?.cellularGeneration;
      switch (generation) {
        case '5g': speed = 'ultra'; break;
        case '4g': speed = 'fast'; break;
        case '3g': speed = 'medium'; break;
        case '2g': speed = 'slow'; break;
        default: speed = 'medium';
      }
    }
    
    this.networkCondition = {
      type: netInfo.type || 'unknown',
      isConnected: netInfo.isConnected || false,
      speed,
      effectiveType: netInfo.details?.effectiveConnectionType || '4g'
    };
    
    console.log(`📶 Network updated: ${netInfo.type} (${speed})`);
  }

  /**
   * 💾 PERSISTENT CACHE STORAGE
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem('ultra_video_cache');
      if (cacheData) {
        const { entries, size } = JSON.parse(cacheData);
        this.preloadCache = new Map(entries);
        this.currentCacheSize = size || 0;
        
        // Clean expired entries
        this.cleanupOldCache();
        
        console.log(`💾 Loaded cache: ${this.preloadCache.size} videos, ${this.currentCacheSize.toFixed(1)}MB`);
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private async saveCacheToStorage(): Promise<void> {
    try {
      const cacheData = {
        entries: Array.from(this.preloadCache.entries()),
        size: this.currentCacheSize,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem('ultra_video_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  private cleanupOldCache(): void {
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours
    const toRemove: string[] = [];
    
    for (const [videoId, item] of this.preloadCache.entries()) {
      if (now - item.preloadedAt > maxAge) {
        toRemove.push(videoId);
      }
    }
    
    toRemove.forEach(videoId => {
      const item = this.preloadCache.get(videoId);
      if (item) {
        this.preloadCache.delete(videoId);
        this.currentCacheSize -= item.size;
      }
    });
    
    if (toRemove.length > 0) {
      console.log(`🧹 Cleaned up ${toRemove.length} expired cache entries`);
      this.saveCacheToStorage();
    }
  }

  /**
   * 🎯 BACKGROUND INTELLIGENT PRELOADING
   * Continuously runs in background to preload videos
   */
  private startIntelligentPreloading(): void {
    // This would be triggered by scroll events and user interactions
    console.log('🧠 Ultra Video Preloader initialized and ready!');
  }

  /**
   * 📊 PUBLIC API METHODS
   */
  
  // Get cached video if available
  getCachedVideo(videoId: string): VideoPreloadItem | null {
    return this.preloadCache.get(videoId) || null;
  }
  
  // Check if video is cached
  isVideoCached(videoId: string): boolean {
    return this.preloadCache.has(videoId);
  }
  
  // Get cache statistics
  getStats() {
    return {
      cacheSize: `${this.currentCacheSize.toFixed(1)}MB`,
      videoCount: this.preloadCache.size,
      activeDownloads: this.activeDownloads.size,
      networkType: this.networkCondition?.type || 'unknown',
      networkSpeed: this.networkCondition?.speed || 'unknown',
      maxCacheSize: `${this.maxCacheSize}MB`
    };
  }
  
  // Clear all cache
  clearCache(): void {
    this.preloadCache.clear();
    this.currentCacheSize = 0;
    this.activeDownloads.clear();
    AsyncStorage.removeItem('ultra_video_cache');
    console.log('🗑️ Cache cleared completely');
  }
}

export default new UltraVideoPreloader();
