/**
 * 🚀 BASE VIDEO BUFFER MANAGER
 * Abstract base class for platform-specific buffer managers
 */

import { VideoData, BufferState, DeviceCapabilities } from './VideoTypes';
import { BUFFER_CONFIG } from './VideoConstants';
import { IVideoBufferManager, BufferStrategy } from './IVideoBufferManager';
import PlatformDetection from './PlatformDetection';

export abstract class BaseVideoBufferManager implements IVideoBufferManager {
  protected bufferState: BufferState = {
    ahead: 0,
    behind: 0,
    loading: [],
    ready: [],
    failed: [],
  };
  
  protected currentStrategy: BufferStrategy = BUFFER_CONFIG.DEFAULT;
  protected videos: VideoData[] = [];
  protected currentIndex: number = 0;
  protected deviceCapabilities: DeviceCapabilities | null = null;
  protected listeners: Map<string, Function[]> = new Map();

  async initialize(): Promise<void> {
    try {
      await PlatformDetection.initialize();
      this.deviceCapabilities = PlatformDetection.getCapabilities();
      await this.updateStrategy();
      console.log(`✅ ${this.constructor.name} initialized`);
    } catch (error) {
      console.error(`❌ ${this.constructor.name} initialization failed:`, error);
      // Use default capabilities
      this.deviceCapabilities = {
        isLowEnd: false,
        availableMemory: 4,
        batteryLevel: 100,
        thermalState: 'normal',
        platform: 'android',
        osVersion: '10',
      };
    }
  }

  abstract preloadVideo(video: VideoData, priority: number): Promise<boolean>;
  
  onVideoChange(newIndex: number, videos: VideoData[]): void {
    this.currentIndex = newIndex;
    this.videos = videos;
    this.updateBufferWindow();
  }

  getBufferState(): BufferState {
    return { ...this.bufferState };
  }

  async updateStrategy(): Promise<void> {
    if (!this.deviceCapabilities) return;

    if (this.deviceCapabilities.isLowEnd || this.deviceCapabilities.availableMemory < 3) {
      this.currentStrategy = BUFFER_CONFIG.LOW_MEMORY;
    } else {
      this.currentStrategy = BUFFER_CONFIG.HIGH_PERFORMANCE;
    }

    console.log(`🎛️ Buffer strategy updated:`, this.currentStrategy);
  }

  addEventListener(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  protected emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Buffer manager event error (${event}):`, error);
        }
      });
    }
  }

  protected updateBufferWindow(): void {
    // Logic to determine which videos should be preloaded
    const { ahead, behind } = this.currentStrategy;
    
    const startIndex = Math.max(0, this.currentIndex - behind);
    const endIndex = Math.min(this.videos.length - 1, this.currentIndex + ahead);

    // Preload videos in the buffer window
    for (let i = startIndex; i <= endIndex; i++) {
      if (i !== this.currentIndex && this.videos[i]) {
        const priority = Math.abs(i - this.currentIndex);
        this.preloadVideo(this.videos[i], priority).catch(error => {
          console.warn(`⚠️ Failed to preload video ${this.videos[i]._id}:`, error);
        });
      }
    }
  }

  cleanup(): void {
    this.listeners.clear();
    this.bufferState = {
      ahead: 0,
      behind: 0,
      loading: [],
      ready: [],
      failed: [],
    };
    console.log(`🧹 ${this.constructor.name} cleaned up`);
  }
}