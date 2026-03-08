/**
 * 🚀 ENTERPRISE VIDEO FEED - TYPE DEFINITIONS
 * CEO Priority Project - Technical Superiority Over TikTok/Instagram
 * Zero Tolerance: Black Screens | Stuttering | Memory Leaks
 */

export interface VideoData {
  _id: string;
  title: string;
  description?: string;
  masterPlaylistKey: string;
  hlsMasterPlaylistUrl?: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  duration?: number;
  visibility: 'public' | 'private';
  
  // Performance-critical fields
  isBuffered?: boolean;
  bufferProgress?: number;
  preloadPriority?: number; // 0 = highest priority, higher numbers = lower priority
  
  // Business-critical fields
  productsListed?: ProductData[];
  isPromoted?: boolean;
  isShoppable?: boolean;
  
  // User engagement
  likes: number;
  shares: number;
  commentsCount: number;
  
  // Host information
  host?: {
    userInfo: {
      _id: string;
      userName: string;
      profileURL?: { key: string };
    };
    companyName?: string;
  };
}

export interface ProductData {
  _id: string;
  name: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
}

export interface VideoPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  isBuffering: boolean;
  hasError: boolean;
  currentTime: number;
  duration: number;
  bufferProgress: number;
}

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  batteryDrainRate: number; // %/hour
  coldStartTime: number; // milliseconds
  timeToFirstFrame: number; // milliseconds
  stallEvents: number;
  blackScreenEvents: number;
}

export interface BufferState {
  ahead: number; // videos buffered ahead
  behind: number; // videos buffered behind  
  loading: string[]; // video IDs currently loading
  ready: string[]; // video IDs ready to play
  failed: string[]; // video IDs that failed to load
}

export interface EndlessFeedState {
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
  isStuck: boolean;
  errorRecovering: boolean;
}

export interface NetworkState {
  isConnected: boolean;
  connectionType: 'wifi' | 'cellular' | 'unknown';
  isMetered: boolean;
  quality: 'excellent' | 'good' | 'poor' | 'offline';
  bandwidth: number; // Mbps
}

export interface DeviceCapabilities {
  isLowEnd: boolean;
  availableMemory: number;
  batteryLevel: number;
  thermalState: 'normal' | 'warning' | 'critical';
  platform: 'ios' | 'android';
  osVersion: string;
}

export interface BlackScreenEvent {
  videoId: string;
  timestamp: number;
  preloadState: 'buffered' | 'loading' | 'failed' | 'not_started';
  componentLifecycle: 'mounting' | 'mounted' | 'unmounting';
  networkQuality: NetworkState['quality'];
  memoryPressure: 'normal' | 'warning' | 'critical';
  feedPosition: number;
  deviceModel: string;
}

export interface VideoFeedProps {
  initialVideos?: VideoData[];
  onVideoChange?: (index: number, video: VideoData) => void;
  onEndReached?: () => void;
  onRefresh?: () => void;
  performanceMode?: 'ultra' | 'balanced' | 'power_saver';
  enableAnalytics?: boolean;
}

export interface VideoPlayerProps {
  video: VideoData;
  index: number;
  isActive: boolean;
  isVisible: boolean;
  shouldPreload: boolean;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
}

// Performance requirements moved to VideoConstants.ts

export type PerformanceLevel = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ContentType = 'regular' | 'promoted' | 'shoppable';

// Video quality levels
export type VideoQuality = 'auto' | 'high' | 'medium' | 'low' | 'ultra_low';

// Player metrics for video performance tracking
export interface PlayerMetrics {
  loadTime: number;
  timeToFirstFrame: number;
  stallEvents: number;
  totalStallTime: number;
  bufferedDuration: number;
  averageFrameRate: number;
  droppedFrames: number;
  currentTime?: number;
  duration?: number;
  playableDuration?: number;
  naturalSize?: {
    width: number;
    height: number;
  };
  lastError?: any;
  errorCount?: number;
}