/**
 * 🎭 USE OVERLAY HOOK
 * Overlay state management with performance optimization and memory management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoData } from '../Components/VideoFeed/VideoTypes';

interface OverlayState {
  isVisible: boolean;
  showProducts: boolean;
  showActions: boolean;
  opacity: number;
  lastInteraction: number;
}

interface UseOverlayReturn {
  overlayState: OverlayState;
  showOverlay: () => void;
  hideOverlay: () => void;
  toggleProductsPanel: () => void;
  handleUserInteraction: (type: 'tap' | 'swipe' | 'product_view') => void;
  resetOverlay: () => void;
  isOverlayActive: boolean;
}

interface UseOverlayOptions {
  autoHideDelay?: number;
  fadeOnTap?: boolean;
  trackInteractions?: boolean;
}

/**
 * Custom hook for overlay state management with performance optimization
 */
export const useOverlay = (
  video: VideoData,
  isActive: boolean,
  options: UseOverlayOptions = {}
): UseOverlayReturn => {
  const {
    autoHideDelay = 0, // 0 means no auto-hide
    fadeOnTap = true,
    trackInteractions = true,
  } = options;

  // Core overlay state
  const [overlayState, setOverlayState] = useState<OverlayState>({
    isVisible: true,
    showProducts: false,
    showActions: true,
    opacity: 1,
    lastInteraction: Date.now(),
  });

  // Refs for timers and tracking
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Interaction analytics
  const interactionStatsRef = useRef({
    taps: 0,
    swipes: 0,
    productViews: 0,
    sessionStart: Date.now(),
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []);

  // Auto-show overlay when video becomes active
  useEffect(() => {
    if (isActive && !overlayState.isVisible) {
      showOverlay();
    } else if (!isActive && overlayState.isVisible) {
      // Optionally hide when inactive for performance
      hideOverlay();
    }
  }, [isActive, overlayState.isVisible]);

  // Show overlay with animation
  const showOverlay = useCallback(() => {
    if (!isMountedRef.current) return;

    setOverlayState(prev => ({
      ...prev,
      isVisible: true,
      opacity: 1,
      lastInteraction: Date.now(),
    }));

    // Clear any existing hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    console.log(`🎭 Overlay shown for video ${video._id}`);
  }, [video._id]);

  // Hide overlay with animation
  const hideOverlay = useCallback(() => {
    if (!isMountedRef.current) return;

    setOverlayState(prev => ({
      ...prev,
      isVisible: false,
      opacity: 0,
      showProducts: false, // Hide products when overlay hides
    }));

    console.log(`🎭 Overlay hidden for video ${video._id}`);
  }, [video._id]);

  // Toggle products panel
  const toggleProductsPanel = useCallback(() => {
    if (!isMountedRef.current) return;

    setOverlayState(prev => {
      const newShowProducts = !prev.showProducts;
      console.log(`🛍️ Products panel ${newShowProducts ? 'shown' : 'hidden'} for video ${video._id}`);
      
      return {
        ...prev,
        showProducts: newShowProducts,
        lastInteraction: Date.now(),
      };
    });
  }, [video._id]);

  // Handle user interactions with overlay
  const handleUserInteraction = useCallback((type: 'tap' | 'swipe' | 'product_view') => {
    if (!isMountedRef.current) return;

    const now = Date.now();
    
    // Update interaction stats
    if (trackInteractions) {
      interactionStatsRef.current[type === 'tap' ? 'taps' : type === 'swipe' ? 'swipes' : 'productViews']++;
    }

    // Update overlay state
    setOverlayState(prev => ({
      ...prev,
      lastInteraction: now,
      opacity: type === 'tap' && fadeOnTap ? 0.7 : 1,
    }));

    // Handle tap-specific behavior
    if (type === 'tap' && fadeOnTap) {
      // Restore opacity after fade effect
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      
      interactionTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setOverlayState(prev => ({
            ...prev,
            opacity: 1,
          }));
        }
      }, 300);
    }

    // Handle product view
    if (type === 'product_view' && !overlayState.showProducts) {
      toggleProductsPanel();
    }

    // Reset auto-hide timer if enabled
    if (autoHideDelay > 0) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      hideTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          hideOverlay();
        }
      }, autoHideDelay);
    }

    console.log(`🎭 User interaction: ${type} on video ${video._id}`);
  }, [
    video._id,
    trackInteractions,
    fadeOnTap,
    autoHideDelay,
    overlayState.showProducts,
    toggleProductsPanel,
    hideOverlay,
  ]);

  // Reset overlay state (for video changes)
  const resetOverlay = useCallback(() => {
    if (!isMountedRef.current) return;

    setOverlayState({
      isVisible: isActive,
      showProducts: false,
      showActions: true,
      opacity: 1,
      lastInteraction: Date.now(),
    });

    // Clear timers
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = null;
    }

    // Reset interaction stats
    interactionStatsRef.current = {
      taps: 0,
      swipes: 0,
      productViews: 0,
      sessionStart: Date.now(),
    };

    console.log(`🎭 Overlay reset for video ${video._id}`);
  }, [video._id, isActive]);

  // Auto-reset when video changes
  useEffect(() => {
    resetOverlay();
  }, [video._id, resetOverlay]);

  // Determine if overlay is currently active and interactive
  const isOverlayActive = overlayState.isVisible && overlayState.opacity > 0.5;

  return {
    overlayState,
    showOverlay,
    hideOverlay,
    toggleProductsPanel,
    handleUserInteraction,
    resetOverlay,
    isOverlayActive,
  };
};

/**
 * Get overlay interaction analytics
 */
export const getOverlayAnalytics = () => {
  // This would typically be implemented as a separate hook or utility
  // For now, it's a placeholder for potential analytics integration
  return {
    sessionDuration: 0,
    totalInteractions: 0,
    interactionBreakdown: {
      taps: 0,
      swipes: 0,
      productViews: 0,
    },
  };
};