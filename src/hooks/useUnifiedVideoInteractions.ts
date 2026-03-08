/**
 * 🎯 UNIFIED VIDEO INTERACTIONS HOOK
 * Replaces duplicate state management in Reels.tsx and VideoFeed.tsx
 * 
 * FIXES APPLIED:
 * 1. Single source of truth for video interaction state
 * 2. Eliminates race conditions in optimistic updates
 * 3. Consistent field name handling across components
 * 4. Proper error handling and state recovery
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToastAndroid, Platform } from 'react-native';
// import { videoInteractionService, VideoMetrics } from '../Utlis/videoInteractions';
import { VideoInteractionService } from '../Utils/videoInteractions';
import { VideoMetrics } from '../Utils/videoInteractions';

const videoInteractionService = new VideoInteractionService();

export interface VideoInteractionState {
  // Current state
  isLiked: boolean;
  isSaved: boolean;
  likes: number;
  shares: number;
  views: number;
  comments: number;
  
  // Loading states
  isLikeLoading: boolean;
  isSaveLoading: boolean;
  isShareLoading: boolean;
  
  // UI state
  isCommentOpen: boolean;
  
  // Error state
  error: string | null;
}

export interface VideoInteractionActions {
  // Main actions
  toggleLike: () => Promise<void>;
  toggleSave: () => Promise<void>;
  shareVideo: (platform?: string) => Promise<void>;
  
  // UI actions
  openComments: () => void;
  closeComments: () => void;
  
  // State management
  resetState: () => void;
  refreshMetrics: () => Promise<void>;
}

interface UseUnifiedVideoInteractionsProps {
  videoId: string;
  initialData?: Partial<VideoMetrics>;
  onError?: (error: string) => void;
}

export const useUnifiedVideoInteractions = ({
  videoId,
  initialData = {},
  onError,
}: UseUnifiedVideoInteractionsProps): [VideoInteractionState, VideoInteractionActions] => {
  
  // Core state - Single source of truth
  const [state, setState] = useState<VideoInteractionState>(() => ({
    // Initialize with normalized data to handle field name conflicts
    isLiked: initialData.isLiked || false,
    isSaved: initialData.isSaved || false,
    likes: initialData.likesCount || initialData.likes || 0,
    shares: initialData.sharesCount || initialData.shares || 0,
    views: initialData.viewsCount || initialData.views || 0,
    comments: initialData.commentsCount || initialData.comments || 0,
    
    // Loading states
    isLikeLoading: false,
    isSaveLoading: false,
    isShareLoading: false,
    
    // UI state
    isCommentOpen: false,
    
    // Error state
    error: null,
  }));

  const mountedRef = useRef(true);
  const optimisticUpdatesRef = useRef<Map<string, any>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Update state when videoId changes - Fixed to prevent infinite loop
  useEffect(() => {
    if (mountedRef.current) {
      setState(prevState => ({
        ...prevState,
        isLiked: initialData.isLiked || false,
        isSaved: initialData.isSaved || false,
        likes: initialData.likesCount || initialData.likes || 0,
        shares: initialData.sharesCount || initialData.shares || 0,
        views: initialData.viewsCount || initialData.views || 0,
        comments: initialData.commentsCount || initialData.comments || 0,
        error: null,
      }));
    }
  }, [videoId]); // Only depend on videoId, not initialData which changes on every render

  // Safe state updater that checks if component is mounted
  const safeSetState = useCallback((updater: (prevState: VideoInteractionState) => VideoInteractionState) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  // Show toast message (cross-platform safe)
  const showToast = useCallback((message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log('📱 Toast:', message);
    }
  }, []);

  // Handle errors consistently
  const handleError = useCallback((error: string, context: string) => {
    console.error(`❌ ${context}:`, error);
    
    safeSetState(prevState => ({
      ...prevState,
      error,
    }));

    onError?.(error);
  }, [safeSetState, onError]);

  // LIKE TOGGLE with optimistic updates
  const toggleLike = useCallback(async (): Promise<void> => {
    if (!videoId || state.isLikeLoading) {
      return;
    }

    const newLikedState = !state.isLiked;
    const likeChange = newLikedState ? 1 : -1;
    const optimisticKey = `like-${Date.now()}`;

    try {
      // Store optimistic update for potential rollback
      optimisticUpdatesRef.current.set(optimisticKey, {
        isLiked: state.isLiked,
        likes: state.likes,
      });

      // Apply optimistic update
      safeSetState(prevState => ({
        ...prevState,
        isLiked: newLikedState,
        likes: Math.max(0, prevState.likes + likeChange),
        isLikeLoading: true,
        error: null,
      }));

      console.log(`💖 Toggling like for video ${videoId}: ${newLikedState}`);

      // Make API call
      const result = await videoInteractionService.toggleLike(videoId, newLikedState);

      if (result.success && mountedRef.current) {
        // Update with server response
        safeSetState(prevState => ({
          ...prevState,
          isLiked: result.data.isLiked,
          likes: result.data.likesCount,
          isLikeLoading: false,
        }));

        // showToast(result.message || `Video ${newLikedState ? 'liked' : 'unliked'} successfully!`);
        console.log(`✅ Like updated for video ${videoId}. New count: ${result.data.likesCount}`);
      } else {
        throw new Error(result.message || 'Like operation failed');
      }
    } catch (error) {
      // Rollback optimistic update
      const rollbackData = optimisticUpdatesRef.current.get(optimisticKey);
      if (rollbackData && mountedRef.current) {
        safeSetState(prevState => ({
          ...prevState,
          isLiked: rollbackData.isLiked,
          likes: rollbackData.likes,
          isLikeLoading: false,
        }));
      }

      handleError(error.message || 'Failed to toggle like', 'Like operation');
    } finally {
      optimisticUpdatesRef.current.delete(optimisticKey);
      
      if (mountedRef.current) {
        safeSetState(prevState => ({
          ...prevState,
          isLikeLoading: false,
        }));
      }
    }
  }, [videoId, state.isLiked, state.likes, state.isLikeLoading, safeSetState, showToast, handleError]);

  // SAVE TOGGLE with optimistic updates
  const toggleSave = useCallback(async (): Promise<void> => {
    if (!videoId || state.isSaveLoading) {
      return;
    }

    const newSavedState = !state.isSaved;
    const optimisticKey = `save-${Date.now()}`;

    try {
      // Store optimistic update for potential rollback
      optimisticUpdatesRef.current.set(optimisticKey, {
        isSaved: state.isSaved,
      });

      // Apply optimistic update
      safeSetState(prevState => ({
        ...prevState,
        isSaved: newSavedState,
        isSaveLoading: true,
        error: null,
      }));

      console.log(`💾 Toggling save for video ${videoId}: ${newSavedState}`);

      // Make API call
      const result = await videoInteractionService.toggleSave(videoId, newSavedState);

      if (result.success && mountedRef.current) {
        // Update with server response
        safeSetState(prevState => ({
          ...prevState,
          isSaved: result.data.isSaved,
          isSaveLoading: false,
        }));

        // showToast(result.message || `Video ${newSavedState ? 'saved' : 'unsaved'} successfully!`);
        console.log(`✅ Save updated for video ${videoId}: ${result.data.isSaved}`);
      } else {
        throw new Error(result.message || 'Save operation failed');
      }
    } catch (error) {
      // Rollback optimistic update
      const rollbackData = optimisticUpdatesRef.current.get(optimisticKey);
      if (rollbackData && mountedRef.current) {
        safeSetState(prevState => ({
          ...prevState,
          isSaved: rollbackData.isSaved,
          isSaveLoading: false,
        }));
      }

      handleError(error.message || 'Failed to toggle save', 'Save operation');
    } finally {
      optimisticUpdatesRef.current.delete(optimisticKey);
      
      if (mountedRef.current) {
        safeSetState(prevState => ({
          ...prevState,
          isSaveLoading: false,
        }));
      }
    }
  }, [videoId, state.isSaved, state.isSaveLoading, safeSetState, showToast, handleError]);

  // SHARE VIDEO with tracking
  const shareVideo = useCallback(async (platform: string = 'generic'): Promise<void> => {
    if (!videoId || state.isShareLoading) {
      return;
    }

    try {
      // Apply optimistic update
      safeSetState(prevState => ({
        ...prevState,
        shares: prevState.shares + 1,
        isShareLoading: true,
        error: null,
      }));

      console.log(`📤 Sharing video ${videoId} on ${platform}`);

      // Make API call
      const result = await videoInteractionService.shareVideo(videoId, platform);

      if (result.success && mountedRef.current) {
        // Update with server response
        safeSetState(prevState => ({
          ...prevState,
          shares: result.data.sharesCount,
          isShareLoading: false,
        }));

        console.log(`✅ Share tracked for video ${videoId}`);
      } else {
        // Revert optimistic update if tracking failed
        safeSetState(prevState => ({
          ...prevState,
          shares: Math.max(0, prevState.shares - 1),
          isShareLoading: false,
        }));
      }
    } catch (error) {
      // Revert optimistic update
      if (mountedRef.current) {
        safeSetState(prevState => ({
          ...prevState,
          shares: Math.max(0, prevState.shares - 1),
          isShareLoading: false,
        }));
      }

      handleError(error.message || 'Failed to track share', 'Share operation');
    } finally {
      if (mountedRef.current) {
        safeSetState(prevState => ({
          ...prevState,
          isShareLoading: false,
        }));
      }
    }
  }, [videoId, state.shares, state.isShareLoading, safeSetState, handleError]);

  // UI Actions
  const openComments = useCallback(() => {
    safeSetState(prevState => ({
      ...prevState,
      isCommentOpen: true,
    }));
  }, [safeSetState]);

  const closeComments = useCallback(() => {
    safeSetState(prevState => ({
      ...prevState,
      isCommentOpen: false,
    }));
  }, [safeSetState]);

  // Reset state
  const resetState = useCallback(() => {
    safeSetState(prevState => ({
      ...prevState,
      isLiked: initialData.isLiked || false,
      isSaved: initialData.isSaved || false,
      likes: initialData.likesCount || initialData.likes || 0,
      shares: initialData.sharesCount || initialData.shares || 0,
      views: initialData.viewsCount || initialData.views || 0,
      comments: initialData.commentsCount || initialData.comments || 0,
      isCommentOpen: false,
      error: null,
      isLikeLoading: false,
      isSaveLoading: false,
      isShareLoading: false,
    }));
    
    // Clear optimistic updates
    optimisticUpdatesRef.current.clear();
  }, [initialData, safeSetState]);

  // Refresh metrics from server
  const refreshMetrics = useCallback(async (): Promise<void> => {
    if (!videoId) return;

    try {
      console.log(`📊 Refreshing metrics for video ${videoId}`);
      
      const result = await videoInteractionService.getVideoMetrics(videoId);

      if (result.success && mountedRef.current) {
        safeSetState(prevState => ({
          ...prevState,
          isLiked: result.data.isLiked,
          isSaved: result.data.isSaved,
          likes: result.data.likes,
          shares: result.data.shares,
          views: result.data.views,
          comments: result.data.comments,
          error: null,
        }));

        console.log(`✅ Metrics refreshed for video ${videoId}`);
      }
    } catch (error) {
      handleError(error.message || 'Failed to refresh metrics', 'Metrics refresh');
    }
  }, [videoId, safeSetState, handleError]);

  // Return state and actions
  return [
    state,
    {
      toggleLike,
      toggleSave,
      shareVideo,
      openComments,
      closeComments,
      resetState,
      refreshMetrics,
    },
  ];
};