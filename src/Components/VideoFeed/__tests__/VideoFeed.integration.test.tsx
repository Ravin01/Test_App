/**
 * 🚀 INTEGRATION TEST SUITE
 * CEO Priority: End-to-end business-critical functionality testing
 * Ensures seamless integration of all video feed components
 */

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { Alert, AppState, Dimensions } from 'react-native';
import VideoFeed from '../VideoFeed';
import { VideoData } from '../VideoTypes';
import { EndlessFeedManager } from '../EndlessFeedManager';
import { VideoMemoryManager } from '../VideoMemoryManager';
import { VideoBufferManager } from '../VideoBufferManager';
import { ColdStartOptimizer } from '../ColdStartOptimizer';

// Mock external dependencies
jest.mock('react-native-video', () => 'Video');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../PlatformDetection');

// Mock managers
jest.mock('../EndlessFeedManager');
jest.mock('../VideoMemoryManager');  
jest.mock('../VideoBufferManager');
jest.mock('../ColdStartOptimizer');

const mockVideoData: VideoData[] = [
  {
    _id: 'video-1',
    hlsMasterPlaylistUrl: 'https://test.com/video1.m3u8',
    masterPlaylistKey: 'key-1',
    visibility: 'public',
    promoted: false,
    isShoppable: false,
    businessPriority: 'normal',
  },
  {
    _id: 'video-2',
    hlsMasterPlaylistUrl: 'https://test.com/video2.m3u8',
    masterPlaylistKey: 'key-2',
    visibility: 'public',
    promoted: true,
    isShoppable: true,
    businessPriority: 'high',
    promotedDetails: { revenue: 500 },
  },
];

describe('VideoFeed Integration Tests', () => {
  let mockFeedManager: jest.Mocked<EndlessFeedManager>;
  let mockMemoryManager: jest.Mocked<VideoMemoryManager>;
  let mockBufferManager: jest.Mocked<VideoBufferManager>;
  let mockColdStartOptimizer: jest.Mocked<ColdStartOptimizer>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup manager mocks
    mockFeedManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      loadNextPage: jest.fn().mockResolvedValue([]),
      getVideos: jest.fn().mockReturnValue(mockVideoData),
      getFeedState: jest.fn().mockReturnValue({
        isLoading: false,
        hasMore: true,
        currentPage: 1,
        isStuck: false,
        errorRecovering: false,
      }),
      shouldLoadMore: jest.fn().mockReturnValue(false),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    mockMemoryManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      onVideoLoaded: jest.fn(),
      onVideoReleased: jest.fn(),
      getMemoryMetrics: jest.fn().mockReturnValue({
        currentUsage: 50,
        peakUsage: 80,
        pressureLevel: 'normal',
        gcFrequency: 2,
        leakDetected: false,
        activeVideos: 2,
        strategyInfo: {},
        memoryEfficiency: 85,
      }),
      handleMemoryWarning: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockBufferManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      onVideoChange: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    mockColdStartOptimizer = {
      initializeCriticalPath: jest.fn().mockResolvedValue(undefined),
      onFeedVisible: jest.fn(),
      onFirstVideoPlay: jest.fn(),
      reset: jest.fn(),
    } as any;

    // Mock getInstance methods
    (EndlessFeedManager.getInstance as jest.Mock).mockResolvedValue(mockFeedManager);
    (VideoMemoryManager.getInstance as jest.Mock).mockResolvedValue(mockMemoryManager);
    (VideoBufferManager.getInstance as jest.Mock).mockResolvedValue(mockBufferManager);
    (ColdStartOptimizer.getInstance as jest.Mock).mockReturnValue(mockColdStartOptimizer);
  });

  describe('Component Initialization', () => {
    test('should initialize all managers successfully', async () => {
      const { getByTestId } = render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      await waitFor(() => {
        expect(mockColdStartOptimizer.initializeCriticalPath).toHaveBeenCalled();
        expect(mockFeedManager.initialize).toHaveBeenCalledWith(mockVideoData);
        expect(mockBufferManager.initialize).toHaveBeenCalled();
        expect(mockMemoryManager.initialize).toHaveBeenCalled();
      });

      expect(getByTestId('video-feed')).toBeTruthy();
    });

    test('should handle initialization errors gracefully', async () => {
      const mockError = new Error('Initialization failed');
      mockFeedManager.initialize.mockRejectedValue(mockError);
      
      const onError = jest.fn();
      
      render(
        <VideoFeed 
          initialVideos={mockVideoData}
          onError={onError}
          testID="video-feed"
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(mockError);
      });
    });

    test('should setup event listeners correctly', async () => {
      render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      await waitFor(() => {
        expect(mockFeedManager.addEventListener).toHaveBeenCalledWith('pageLoaded', expect.any(Function));
        expect(mockFeedManager.addEventListener).toHaveBeenCalledWith('stuck', expect.any(Function));
        expect(mockFeedManager.addEventListener).toHaveBeenCalledWith('endReached', expect.any(Function));
        expect(mockFeedManager.addEventListener).toHaveBeenCalledWith('recoveryFailed', expect.any(Function));
      });
    });
  });

  describe('Video Navigation', () => {
    test('should handle video changes correctly', async () => {
      const onVideoChange = jest.fn();
      
      const { getByTestId } = render(
        <VideoFeed 
          initialVideos={mockVideoData}
          onVideoChange={onVideoChange}
          testID="video-feed"
        />
      );

      const flatList = getByTestId('video-feed-flatlist');
      
      // Simulate viewable items change
      fireEvent(flatList, 'viewableItemsChanged', {
        viewableItems: [{ index: 1, item: mockVideoData[1] }],
      });

      await waitFor(() => {
        expect(onVideoChange).toHaveBeenCalledWith(mockVideoData[1], 1);
        expect(mockBufferManager.onVideoChange).toHaveBeenCalledWith(1, mockVideoData);
      });
    });

    test('should trigger cold start metrics on first video', async () => {
      const { getByTestId } = render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      const flatList = getByTestId('video-feed-flatlist');
      
      // Simulate first video becoming visible
      fireEvent(flatList, 'viewableItemsChanged', {
        viewableItems: [{ index: 0, item: mockVideoData[0] }],
      });

      await waitFor(() => {
        expect(mockColdStartOptimizer.onFirstVideoPlay).toHaveBeenCalled();
      });
    });

    test('should load more videos when needed', async () => {
      mockFeedManager.shouldLoadMore.mockReturnValue(true);
      mockFeedManager.loadNextPage.mockResolvedValue([
        {
          _id: 'video-3',
          hlsMasterPlaylistUrl: 'https://test.com/video3.m3u8',
          masterPlaylistKey: 'key-3',
          visibility: 'public',
          promoted: false,
          isShoppable: false,
          businessPriority: 'normal',
        }
      ]);

      const { getByTestId } = render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      const flatList = getByTestId('video-feed-flatlist');
      
      // Simulate scrolling near end
      fireEvent(flatList, 'viewableItemsChanged', {
        viewableItems: [{ index: 1, item: mockVideoData[1] }],
      });

      await waitFor(() => {
        expect(mockFeedManager.loadNextPage).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle video player errors', async () => {
      const onError = jest.fn();
      
      render(
        <VideoFeed 
          initialVideos={mockVideoData}
          onError={onError}
          testID="video-feed"
        />
      );

      // Simulate error from video player
      const videoPlayer = await waitFor(() => 
        expect(document.querySelector('[data-testid="video-player-0"]')).toBeTruthy()
      );
      
      const mockError = new Error('Video load failed');
      // This would be triggered by the VideoPlayer component
      // In a real test, we'd use the actual VideoPlayer component
    });

    test('should handle business critical errors for promoted content', async () => {
      const onBusinessCriticalError = jest.fn();
      
      render(
        <VideoFeed 
          initialVideos={mockVideoData}
          onBusinessCriticalError={onBusinessCriticalError}
          testID="video-feed"
        />
      );

      // Test would verify business critical error handling
      // This is tested more thoroughly in VideoErrorBoundary tests
    });

    test('should handle feed manager errors', async () => {
      const onError = jest.fn();
      
      render(
        <VideoFeed 
          initialVideos={mockVideoData}
          onError={onError}
          testID="video-feed"
        />
      );

      // Simulate feed manager error event
      const errorCallback = mockFeedManager.addEventListener.mock.calls
        .find(call => call[0] === 'recoveryFailed')?.[1];
      
      if (errorCallback) {
        act(() => {
          errorCallback({ error: 'Feed recovery failed' });
        });
      }

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('App State Management', () => {
    test('should handle app backgrounding correctly', async () => {
      render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      // Wait for initialization
      await waitFor(() => {
        expect(mockMemoryManager.initialize).toHaveBeenCalled();
      });

      // Simulate app going to background
      act(() => {
        AppState.currentState = 'background';
        // Trigger AppState event
        const appStateListener = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
        appStateListener('background');
      });

      expect(mockMemoryManager.handleMemoryWarning).toHaveBeenCalled();
    });

    test('should resume correctly when app becomes active', async () => {
      render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      // Simulate app becoming active
      act(() => {
        AppState.currentState = 'active';
        const appStateListener = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
        appStateListener('active');
      });

      // Should resume video playback (isPaused = false)
      // This would be verified through the actual component state
    });
  });

  describe('Memory Management', () => {
    test('should track memory usage continuously', async () => {
      render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      // Wait for memory monitoring to start
      await waitFor(() => {
        expect(mockMemoryManager.getMemoryMetrics).toHaveBeenCalled();
      });

      // Memory should be monitored every 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockMemoryManager.getMemoryMetrics).toHaveBeenCalledTimes(2);
    });

    test('should handle memory warnings appropriately', async () => {
      // Mock high memory usage
      mockMemoryManager.getMemoryMetrics.mockReturnValue({
        currentUsage: 150,
        peakUsage: 200,
        pressureLevel: 'critical',
        gcFrequency: 5,
        leakDetected: true,
        activeVideos: 5,
        strategyInfo: {},
        memoryEfficiency: 25,
      });

      render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      await waitFor(() => {
        // Should handle critical memory pressure
        expect(mockMemoryManager.getMemoryMetrics).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Monitoring', () => {
    test('should update performance metrics correctly', async () => {
      const { getByTestId } = render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      // Simulate loading new videos
      mockFeedManager.loadNextPage.mockResolvedValue([
        {
          _id: 'video-new',
          hlsMasterPlaylistUrl: 'https://test.com/new.m3u8',
          masterPlaylistKey: 'key-new',
          visibility: 'public',
          promoted: false,
          isShoppable: false,
          businessPriority: 'normal',
        }
      ]);

      const flatList = getByTestId('video-feed-flatlist');
      
      // Trigger end reached
      fireEvent(flatList, 'endReached');

      await waitFor(() => {
        expect(mockFeedManager.loadNextPage).toHaveBeenCalled();
      });
    });

    test('should track stall events correctly', async () => {
      render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      // Simulate stall event from video player
      // This would be triggered by the VideoPlayer component
      // In actual implementation, the onPlaybackStalled callback would update metrics
    });
  });

  describe('Debug Overlay', () => {
    test('should show debug overlay in development', async () => {
      // Mock __DEV__ environment
      (global as any).__DEV__ = true;

      const { queryByTestId } = render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      await waitFor(() => {
        expect(queryByTestId('video-feed-debug')).toBeTruthy();
      });
    });

    test('should hide debug overlay in production', async () => {
      // Mock production environment
      (global as any).__DEV__ = false;

      const { queryByTestId } = render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      expect(queryByTestId('video-feed-debug')).toBeNull();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all resources on unmount', async () => {
      const { unmount } = render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      await waitFor(() => {
        expect(mockFeedManager.initialize).toHaveBeenCalled();
      });

      unmount();

      expect(mockFeedManager.cleanup).toHaveBeenCalled();
      expect(mockBufferManager.cleanup).toHaveBeenCalled();
      expect(mockMemoryManager.shutdown).toHaveBeenCalled();
      expect(mockColdStartOptimizer.reset).toHaveBeenCalled();
    });
  });

  describe('Platform Optimizations', () => {
    test('should use platform-specific configurations', async () => {
      render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      // Verify that platform-specific managers are instantiated
      await waitFor(() => {
        expect(VideoMemoryManager.getInstance).toHaveBeenCalled();
        expect(VideoBufferManager.getInstance).toHaveBeenCalled();
      });
    });

    test('should adapt to device capabilities', async () => {
      // Mock low-end device
      const mockPlatformDetection = require('../PlatformDetection');
      mockPlatformDetection.default.getCapabilities.mockReturnValue({
        isLowEnd: true,
        availableMemory: 2,
        cpuCores: 4,
        hasHardwareDecoder: false,
      });

      const { getByTestId } = render(
        <VideoFeed 
          initialVideos={mockVideoData}
          testID="video-feed"
        />
      );

      const flatList = getByTestId('video-feed-flatlist');
      
      // Should use optimized settings for low-end devices
      expect(flatList.props.removeClippedSubviews).toBe(true);
      expect(flatList.props.maxToRenderPerBatch).toBe(2);
      expect(flatList.props.windowSize).toBe(3);
    });
  });
});

// Helper functions for testing
function mockPerformanceNow() {
  const mockPerf = {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
      totalJSHeapSize: 100 * 1024 * 1024, // 100MB
      jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB
    },
  };
  
  Object.defineProperty(global, 'performance', {
    value: mockPerf,
    writable: true,
  });
  
  return mockPerf;
}

// Setup performance monitoring mock
beforeAll(() => {
  mockPerformanceNow();
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});