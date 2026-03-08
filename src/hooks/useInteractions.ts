/**
 * 💝 USE INTERACTIONS HOOK
 * User interactions (like, save, share) with optimistic updates and state management
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { VideoData } from '../Components/VideoFeed/VideoTypes';
import { likeVideo, saveVideo, shareVideo } from '../api/interactions';

interface UseInteractionsReturn {
  isLiked: boolean;
  isSaved: boolean;
  likeCount: number;
  shareCount: number;
  isProcessing: boolean;
  toggleLike: () => Promise<void>;
  toggleSave: () => Promise<void>;
  shareVideo: (platform?: string) => Promise<void>;
  resetState: () => void;
}

/**
 * Custom hook for managing video interactions with optimistic updates
 */
export const useInteractions = (video: VideoData): UseInteractionsReturn => {
  // Core state
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes || 0);
  const [shareCount, setShareCount] = useState(video.shares || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Optimistic update tracking
  const optimisticUpdatesRef = useRef({
    likeCount: 0,
    liked: false,
    saved: false,
  });
  
  // Pending operations tracking
  const pendingOperationsRef = useRef(new Set<string>());
  const isMountedRef = useRef(true);

  // Initialize state from video data
  useEffect(() => {
    setLikeCount(video.likes || 0);
    setShareCount(video.shares || 0);
    // Reset optimistic updates when video changes
    optimisticUpdatesRef.current = {
      likeCount: 0,
      liked: false,
      saved: false,
    };
  }, [video._id, video.likes, video.shares]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Optimistic like update callback
  const handleOptimisticLike = useCallback((liked: boolean, countChange: number) => {
    if (!isMountedRef.current) return;
    
    setIsLiked(liked);
    setLikeCount(prev => Math.max(0, prev + countChange));
    
    optimisticUpdatesRef.current.liked = liked;
    optimisticUpdatesRef.current.likeCount += countChange;
  }, []);

  // Optimistic save update callback
  const handleOptimisticSave = useCallback((saved: boolean) => {
    if (!isMountedRef.current) return;
    
    setIsSaved(saved);
    optimisticUpdatesRef.current.saved = saved;
  }, []);

  // Toggle like with optimistic update
  const toggleLike = useCallback(async (): Promise<void> => {
    if (!video._id || pendingOperationsRef.current.has('like')) {
      return;
    }

    const newLikedState = !isLiked;
    const countChange = newLikedState ? 1 : -1;
    
    try {
      // Mark operation as pending
      pendingOperationsRef.current.add('like');
      setIsProcessing(true);
      
      console.log(`💖 Toggling like for video ${video._id}: ${newLikedState}`);
      
      const result = await likeVideo(
        video._id,
        newLikedState,
        handleOptimisticLike
      );
      
      if (result.success && isMountedRef.current) {
        // Update with server response
        const serverLikeCount = result.data.newLikeCount;
        setLikeCount(serverLikeCount);
        setIsLiked(result.data.isLiked);
        
        console.log(`✅ Like updated for video ${video._id}. New count: ${serverLikeCount}`);
      }
    } catch (error) {
      console.error(`❌ Failed to toggle like for video ${video._id}:`, error.message);
      
      // Optimistic update was already reverted by the API call
      // No additional action needed here
    } finally {
      if (isMountedRef.current) {
        pendingOperationsRef.current.delete('like');
        setIsProcessing(false);
      }
    }
  }, [video._id, isLiked, handleOptimisticLike]);

  // Toggle save with optimistic update
  const toggleSave = useCallback(async (): Promise<void> => {
    if (!video._id || pendingOperationsRef.current.has('save')) {
      return;
    }

    const newSavedState = !isSaved;
    
    try {
      // Mark operation as pending
      pendingOperationsRef.current.add('save');
      setIsProcessing(true);
      
      console.log(`💾 Toggling save for video ${video._id}: ${newSavedState}`);
      
      const result = await saveVideo(
        video._id,
        newSavedState,
        handleOptimisticSave
      );
      
      if (result.success && isMountedRef.current) {
        // Confirm optimistic update
        setIsSaved(result.data.isSaved);
        console.log(`✅ Save updated for video ${video._id}: ${result.data.isSaved}`);
      }
    } catch (error) {
      console.error(`❌ Failed to toggle save for video ${video._id}:`, error.message);
      
      // Optimistic update was already reverted by the API call
    } finally {
      if (isMountedRef.current) {
        pendingOperationsRef.current.delete('save');
        setIsProcessing(false);
      }
    }
  }, [video._id, isSaved, handleOptimisticSave]);

  // Share video with tracking
  const handleShareVideo = useCallback(async (platform: string = 'generic'): Promise<void> => {
    if (!video._id || pendingOperationsRef.current.has('share')) {
      return;
    }

    try {
      // Mark operation as pending
      pendingOperationsRef.current.add('share');
      setIsProcessing(true);
      
      console.log(`📤 Sharing video ${video._id} on ${platform}`);
      
      // Optimistically update share count
      setShareCount(prev => prev + 1);
      
      const result = await shareVideo(video._id, platform, {
        timestamp: Date.now(),
        videoTitle: video.title,
      });
      
      if (result.success && isMountedRef.current) {
        console.log(`✅ Share tracked for video ${video._id}`);
      } else if (!result.success && isMountedRef.current) {
        // Revert optimistic update if tracking failed
        setShareCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error(`❌ Failed to track share for video ${video._id}:`, error.message);
      
      // Revert optimistic update
      if (isMountedRef.current) {
        setShareCount(prev => Math.max(0, prev - 1));
      }
    } finally {
      if (isMountedRef.current) {
        pendingOperationsRef.current.delete('share');
        setIsProcessing(false);
      }
    }
  }, [video._id, video.title]);

  // Reset all state (for cleanup or video change)
  const resetState = useCallback(() => {
    setIsLiked(false);
    setIsSaved(false);
    setLikeCount(video.likes || 0);
    setShareCount(video.shares || 0);
    setIsProcessing(false);
    
    // Clear pending operations
    pendingOperationsRef.current.clear();
    
    // Reset optimistic updates
    optimisticUpdatesRef.current = {
      likeCount: 0,
      liked: false,
      saved: false,
    };
  }, [video.likes, video.shares]);

  // Auto-reset when video changes
  useEffect(() => {
    resetState();
  }, [video._id, resetState]);

  return {
    isLiked,
    isSaved,
    likeCount,
    shareCount,
    isProcessing,
    toggleLike,
    toggleSave,
    shareVideo: handleShareVideo,
    resetState,
  };
};