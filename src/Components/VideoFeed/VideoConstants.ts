/**
 * 🚀 ENTERPRISE VIDEO FEED - CONFIGURATION CONSTANTS
 * CEO Priority Project - Precision-Tuned Performance Parameters
 */

// BUFFER MANAGEMENT - Intelligent preloading
export const BUFFER_CONFIG = {
  DEFAULT: {
    ahead: 3,
    behind: 1,
    maxConcurrentLoads: 2,
  },
  LOW_MEMORY: {
    ahead: 2,
    behind: 0,
    maxConcurrentLoads: 1,
  },
  HIGH_PERFORMANCE: {
    ahead: 5,
    behind: 2,
    maxConcurrentLoads: 3,
  },
} as const;

// FEED CONFIGURATION - Endless scroll guarantees
export const FEED_CONFIG = {
  PAGE_SIZE: 10,
  PRELOAD_THRESHOLD: 3, // videos from end to trigger load
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 3000, 5000], // exponential backoff
  STUCK_DETECTION_TIMEOUT: 5000,
} as const;

// PERFORMANCE THRESHOLDS - Executive mandate compliance
export const PERFORMANCE_THRESHOLDS = {
  FPS_MINIMUM: 58,
  FPS_TARGET: 60,
  TIME_TO_FIRST_FRAME: 250, // ms
  COLD_START_MAX: 800, // ms
  STALL_RATE_MAX: 0.5, // %
  MEMORY_GROWTH_MAX: 50, // MB
  BATTERY_DRAIN_TARGET: 15, // %/hour
} as const;

// PLATFORM-SPECIFIC OPTIMIZATIONS
export const PLATFORM_CONFIG = {
  ios: {
    memoryStrategy: 'aggressive_cleanup',
    bufferStrategy: 'conservative_preload',
    backgroundHandling: 'strict_resource_release',
    texturePoolSize: 5,
  },
  android: {
    memoryStrategy: 'adaptive_cleanup',
    bufferStrategy: 'dynamic_preload', 
    backgroundHandling: 'device_specific_optimization',
    texturePoolSize: 7, // Android handles more textures
  },
} as const;

// ERROR HANDLING - Business-critical priorities
export const ERROR_CONFIG = {
  PROMOTED_CONTENT: {
    maxRetries: 5,
    retryDelays: [100, 500, 1000, 2000, 4000],
    fallbackStrategy: 'secondary_low_res_stream',
    businessImpact: 'revenue_critical',
  },
  REGULAR_CONTENT: {
    maxRetries: 3,
    retryDelays: [1000, 3000, 5000],
    fallbackStrategy: 'thumbnail_with_retry',
    businessImpact: 'engagement_impact',
  },
  SHOPPABLE_CONTENT: {
    maxRetries: 4,
    retryDelays: [500, 1500, 3000, 6000],
    fallbackStrategy: 'product_image_with_shop_button',
    businessImpact: 'conversion_critical',
  },
} as const;

// NETWORK QUALITY DETECTION
export const NETWORK_CONFIG = {
  EXCELLENT: { minBandwidth: 5, quality: 'high' },
  GOOD: { minBandwidth: 1.5, quality: 'medium' },
  POOR: { minBandwidth: 0.5, quality: 'low' },
  OFFLINE: { minBandwidth: 0, quality: 'cached_only' },
} as const;

// DEBUG OVERLAY - Development diagnostics
export const DEBUG_CONFIG = {
  ACTIVATION_GESTURE: 'triple_tap_and_shake',
  UPDATE_INTERVAL: 100, // ms
  METRICS_HISTORY: 60, // seconds of data
  OVERLAY_POSITION: 'top_right',
} as const;

// ANALYTICS SAMPLING - Performance monitoring
export const ANALYTICS_CONFIG = {
  PERFORMANCE_SAMPLE_RATE: 0.1, // 10% of users
  ERROR_SAMPLE_RATE: 1.0, // 100% of errors
  COLD_START_SAMPLE_RATE: 1.0, // 100% of cold starts
  BATTERY_SAMPLE_RATE: 0.05, // 5% for battery monitoring
} as const;

// GESTURE CONFIGURATION - Touch responsiveness
export const GESTURE_CONFIG = {
  SWIPE_THRESHOLD: 50, // pixels
  SWIPE_VELOCITY_THRESHOLD: 1000, // pixels/second
  TAP_TIMEOUT: 300, // ms
  DOUBLE_TAP_DELAY: 200, // ms
  SCROLL_ACCELERATION: 1.2,
} as const;

// MEMORY MANAGEMENT - Aggressive cleanup
export const MEMORY_CONFIG = {
  WARNING_THRESHOLD: 80, // % of available memory
  CRITICAL_THRESHOLD: 90, // % of available memory
  CLEANUP_BATCH_SIZE: 3, // videos to cleanup at once
  GC_TRIGGER_INTERVAL: 30000, // ms between forced GC
} as const;

// VIDEO QUALITY SETTINGS - Network adaptive
export const QUALITY_CONFIG = {
  AUTO: { resolution: 'adaptive', bitrate: 'adaptive' },
  HIGH: { resolution: '1080p', bitrate: '5000k' },
  MEDIUM: { resolution: '720p', bitrate: '2500k' },
  LOW: { resolution: '480p', bitrate: '1000k' },
  ULTRA_LOW: { resolution: '360p', bitrate: '500k' },
} as const;

// COLD START OPTIMIZATION - Sub-800ms mandate
export const COLD_START_CONFIG = {
  PRELOAD_CRITICAL_RESOURCES: [
    'initial_feed_data',
    'user_preferences',
    'network_state',
  ],
  LAZY_LOAD_RESOURCES: [
    'analytics_sdk',
    'error_reporting',
    'debug_tools',
  ],
  STARTUP_TIMEOUT: 5000, // ms before showing error
} as const;

// PERFORMANCE REQUIREMENTS - Executive mandate compliance
export const PERFORMANCE_REQUIREMENTS = {
  P0_CRITICAL: {
    blackScreens: 0,
    frameRate: {
      target: 60,
      minimum: 58,
    },
    timeToFirstFrame: 250,
    coldStartToFeed: 800,
    stallRate: 0.5,
  },
  P1_HIGH: {
    memory: {
      heapGrowth: 50, // MB
      leakTolerance: 0,
    },
  },
  P2_MEDIUM: {
    battery: {
      drainTarget: 15, // %/hour
      improvement: 25, // % vs baseline
    },
  },
} as const;