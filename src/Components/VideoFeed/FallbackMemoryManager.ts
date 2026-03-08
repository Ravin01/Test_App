/**
 * 🚀 FALLBACK MEMORY MANAGER
 * Simple concrete implementation for when platform-specific managers fail
 */

import { IVideoMemoryManagerInternal, MemoryState, MemoryStrategy } from './IVideoMemoryManager';

export class FallbackMemoryManager implements IVideoMemoryManagerInternal {
  private memoryState: MemoryState = {
    currentUsage: 0,
    peakUsage: 0,
    pressureLevel: 'normal',
    gcFrequency: 0,
    leakDetected: false,
  };

  private strategy: MemoryStrategy = {
    cleanupTriggerThreshold: 70,
    cleanupBatchSize: 3,
    aggressiveCleanupThreshold: 85,
    gcHintInterval: 30000,
  };

  private activeVideoIds: Set<string> = new Set();

  async initialize(): Promise<void> {
    console.log('🔧 Fallback memory manager initialized');
  }

  async getCurrentMemoryUsage(): Promise<number> {
    // Simple estimation
    return this.activeVideoIds.size * 50; // Assume 50MB per video
  }

  async forceGarbageCollection(): Promise<void> {
    if (global.gc) {
      global.gc();
    }
    console.log('♻️ Garbage collection requested (fallback)');
  }

  async handleMemoryWarning(): Promise<void> {
    console.log('⚠️ Memory warning handled (fallback)');
    this.memoryState.pressureLevel = 'warning';
  }

  async getMemoryPressureLevel(): Promise<'normal' | 'warning' | 'critical'> {
    return this.memoryState.pressureLevel;
  }

  onVideoLoaded(videoId: string, estimatedMemoryUsage: number): void {
    this.activeVideoIds.add(videoId);
    console.log(`📹 Video ${videoId} loaded (fallback), estimated: ${estimatedMemoryUsage}MB`);
  }

  onVideoReleased(videoId: string): void {
    this.activeVideoIds.delete(videoId);
    console.log(`🗑️ Video ${videoId} released (fallback)`);
  }

  getMemoryMetrics(): MemoryState & {
    activeVideos: number;
    strategyInfo: MemoryStrategy;
    memoryEfficiency: number;
  } {
    return {
      ...this.memoryState,
      activeVideos: this.activeVideoIds.size,
      strategyInfo: this.strategy,
      memoryEfficiency: 100 - (this.activeVideoIds.size * 10), // Simple calculation
    };
  }

  async shutdown(): Promise<void> {
    console.log('🔌 Shutting down fallback memory manager');
    this.activeVideoIds.clear();
  }
}