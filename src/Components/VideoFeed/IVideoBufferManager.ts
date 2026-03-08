/**
 * 🚀 VIDEO BUFFER MANAGER INTERFACE
 * Defines the contract for platform-specific buffer managers
 */

import { VideoData, BufferState, DeviceCapabilities } from './VideoTypes';

export interface BufferStrategy {
  ahead: number;
  behind: number;
  maxConcurrentLoads: number;
  preloadTriggers: string[];
}

export interface IVideoBufferManager {
  // Core buffer management
  initialize(): Promise<void>;
  preloadVideo(video: VideoData, priority: number): Promise<boolean>;
  onVideoChange(newIndex: number, videos: VideoData[]): void;
  cleanup(): void;
  
  // State management
  getBufferState(): BufferState;
  updateStrategy(): Promise<void>;
  
  // Event handling
  addEventListener(event: string, callback: Function): void;
  removeEventListener(event: string, callback: Function): void;
}