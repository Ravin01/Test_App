/**
 * 🚀 VIDEO MEMORY MANAGER INTERFACE
 * Clean interface to avoid circular dependencies
 */

import { DeviceCapabilities } from './VideoTypes';

export interface MemoryState {
  currentUsage: number; // MB
  peakUsage: number; // MB  
  pressureLevel: 'normal' | 'warning' | 'critical';
  gcFrequency: number; // GCs per minute
  leakDetected: boolean;
}

export interface MemoryStrategy {
  cleanupTriggerThreshold: number; // % memory usage
  cleanupBatchSize: number;
  aggressiveCleanupThreshold: number;
  gcHintInterval: number; // ms
}

export interface IVideoMemoryManagerInternal {
  // Core functionality
  initialize(): Promise<void>;
  getCurrentMemoryUsage(): Promise<number>;
  forceGarbageCollection(): Promise<void>;
  handleMemoryWarning(): Promise<void>;
  getMemoryPressureLevel(): Promise<'normal' | 'warning' | 'critical'>;
  
  // Video lifecycle
  onVideoLoaded(videoId: string, estimatedMemoryUsage: number): void;
  onVideoReleased(videoId: string): void;
  
  // Metrics and monitoring
  getMemoryMetrics(): MemoryState & {
    activeVideos: number;
    strategyInfo: MemoryStrategy;
    memoryEfficiency: number;
  };
  
  // Cleanup
  shutdown(): Promise<void>;
}