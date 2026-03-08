/**
 * StreamEventContext - Global context for stream event subscriptions
 * 
 * This context provides a single AppSync subscription for the entire app
 * that notifies all registered components when streams go live or end.
 * 
 * Usage:
 * 1. Wrap your app with StreamEventProvider in App.tsx
 * 2. Use useStreamEventCallbacks hook in any component to register callbacks
 *    (no need to subscribe/unsubscribe - it's handled globally)
 * 3. OR use useStreamEventTimestamps hook for simple state-based re-renders
 * 4. Call activateSubscription() from a child when you want to start listening
 *    (e.g., when user navigates to a screen that needs stream events)
 * 5. Call deactivateSubscription() to stop listening (e.g., when leaving that screen)
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
} from 'react';
import {
  configureAppSync,
  connectToChannel,
  getGlobalChannelPath,
  subscribeToChannel,
  closeChannel,
} from '../Utils/appSyncConfig';

// Client ID for AppSync configuration
const CLIENT_ID = '6997e0c5ca9c15eff99a6894';

interface StreamEventCallbacks {
  onStreamLive?: () => Promise<void> | void;
  onStreamEnded?: () => Promise<void> | void;
}

interface StreamEventContextValue {
  // Register callbacks to be notified of stream events
  registerStreamCallbacks: (callbacks: StreamEventCallbacks) => () => void;
  // State-based timestamps for triggering re-renders in child components
  lastStreamLiveAt: number | null;
  lastStreamEndedAt: number | null;
  // Activate/deactivate the subscription - call this from children to control when subscription starts
  activateSubscription: () => void;
  deactivateSubscription: () => void;
  // Check if subscription is currently active
  isSubscriptionActive: boolean;
}

const StreamEventContext = createContext<StreamEventContextValue | null>(null);

// Store registered callbacks
const registeredCallbacks = new Set<StreamEventCallbacks>();

export const useStreamEventCallbacks = () => {
  const context = useContext(StreamEventContext);
  if (!context) {
    throw new Error('useStreamEventCallbacks must be used within StreamEventProvider');
  }
  return context;
};

// Simple hook for components that just want to re-render on stream events
// This triggers a re-render automatically when stream events occur
export const useStreamEventTimestamps = () => {
  const context = useContext(StreamEventContext);
  if (!context) {
    throw new Error('useStreamEventTimestamps must be used within StreamEventProvider');
  }
  return {
    lastStreamLiveAt: context.lastStreamLiveAt,
    lastStreamEndedAt: context.lastStreamEndedAt,
  };
};

// Hook to control subscription from child components
// Returns activate/deactivate functions and current status
export const useStreamSubscriptionControl = () => {
  const context = useContext(StreamEventContext);
  if (!context) {
    throw new Error('useStreamSubscriptionControl must be used within StreamEventProvider');
  }
  return {
    activateSubscription: context.activateSubscription,
    deactivateSubscription: context.deactivateSubscription,
    isSubscriptionActive: context.isSubscriptionActive,
  };
};

export const StreamEventProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const isSubscribed = useRef(false);
  const subscriptionRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  
  // Track if subscription should be active (controlled by children)
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);

  // State for triggering re-renders in child components
  const [lastStreamLiveAt, setLastStreamLiveAt] = useState<number | null>(null);
  const [lastStreamEndedAt, setLastStreamEndedAt] = useState<number | null>(null);

  // Notify all registered callbacks AND update state for re-renders
  const notifyCallbacks = useCallback((eventType: 'stream:live' | 'stream:ended') => {
    console.log(`📨 [StreamEventContext] Notifying callbacks for ${eventType}`);
    
    registeredCallbacks.forEach(callbacks => {
      try {
        if (eventType === 'stream:live' && callbacks.onStreamLive) {
          console.log('🎬 [StreamEventContext] Calling onStreamLive callback');
          const result = callbacks.onStreamLive();
          if (result && typeof result.then === 'function') {
            result.catch(err => console.log('Error in onStreamLive:', err));
          }
        } else if (eventType === 'stream:ended' && callbacks.onStreamEnded) {
          console.log('🛑 [StreamEventContext] Calling onStreamEnded callback');
          // Add delay for stream:ended to ensure backend has updated
          setTimeout(() => {
            const result = callbacks.onStreamEnded();
            if (result && typeof result.then === 'function') {
              result.catch(err => console.log('Error in onStreamEnded:', err));
            }
          }, 2000);
        }
      } catch (error) {
        console.error('❌ [StreamEventContext] Error calling callback:', error);
      }
    });
  }, []);

  // Set up the global AppSync subscription - only runs when activated
  const setupSubscription = useCallback(async () => {
    // Prevent multiple subscriptions
    if (isSubscribed.current) {
      console.log('⚠️ [StreamEventContext] Already subscribed, skipping');
      return;
    }

    try {
      console.log('🔌 [StreamEventContext] Setting up global AppSync subscription');

      // Configure AppSync
      await configureAppSync();

      // Connect to global channel for stream events
      const globalChannelPath = getGlobalChannelPath(CLIENT_ID, false);
      console.log(`📡 [StreamEventContext] Connecting to: ${globalChannelPath}`);

      channelRef.current = await connectToChannel(globalChannelPath);

      // Subscribe to global channel
      subscriptionRef.current = subscribeToChannel(
        channelRef.current,
        (data) => {
          console.log('📨 [StreamEventContext] Event received:', data);
          try {
            // Extract event data from various possible structures
            const eventData = data?.event?.event || data?.event || data;

            if (!eventData || !eventData.eventType) {
              console.warn('⚠️ [StreamEventContext] Invalid event structure:', data);
              return;
            }

            console.log(`📨 [StreamEventContext] Processing ${eventData.eventType}`);

            // Handle stream:live event
            if (eventData.eventType === 'stream:live') {
              console.log('🎬 [StreamEventContext] Stream started:', eventData.streamId);
              // Update state to trigger re-renders in child components
              setLastStreamLiveAt(Date.now());
              // Also call registered callbacks
              notifyCallbacks('stream:live');
            }
            // Handle stream:ended event
            else if (eventData.eventType === 'stream:ended') {
              console.log('🛑 [StreamEventContext] Stream ended:', eventData.streamId);
              // Update state with delay to trigger re-renders
              setTimeout(() => {
                setLastStreamEndedAt(Date.now());
              }, 2000);
              // Also call registered callbacks
              notifyCallbacks('stream:ended');
            }
          } catch (error) {
            console.error('❌ [StreamEventContext] Error processing event:', error);
          }
        },
        (error) => {
          console.error('❌ [StreamEventContext] Subscription error:', error);
        }
      );

      isSubscribed.current = true;
      console.log('✅ [StreamEventContext] Global subscription active');
    } catch (error) {
      console.error('❌ [StreamEventContext] Failed to setup subscription:', error);
    }
  }, [notifyCallbacks]);

  // Clean up the subscription
  const cleanupSubscription = useCallback(() => {
    console.log('🧹 [StreamEventContext] Cleaning up subscription...');
    
    try {
      if (subscriptionRef.current && typeof subscriptionRef.current.unsubscribe === 'function') {
        subscriptionRef.current.unsubscribe();
      }
      if (channelRef.current) {
        closeChannel(channelRef.current);
      }
    } catch (error) {
      console.error('Error cleaning up stream events:', error);
    }

    isSubscribed.current = false;
    subscriptionRef.current = null;
    channelRef.current = null;
    
    console.log('✅ [StreamEventContext] Cleanup complete');
  }, []);

  // Activate subscription - call this from child components
  const activateSubscription = useCallback(() => {
    console.log('▶️ [StreamEventContext] Activating subscription...');
    setIsSubscriptionActive(true);
  }, []);

  // Deactivate subscription - call this from child components
  const deactivateSubscription = useCallback(() => {
    console.log('⏹️ [StreamEventContext] Deactivating subscription...');
    setIsSubscriptionActive(false);
  }, []);

  // Handle subscription activation/deactivation based on isSubscriptionActive state
  useEffect(() => {
    if (isSubscriptionActive && !isSubscribed.current) {
      // Activate subscription
      setupSubscription();
    } else if (!isSubscriptionActive && isSubscribed.current) {
      // Deactivate subscription
      cleanupSubscription();
    }

    // Cleanup on unmount
    return () => {
      cleanupSubscription();
    };
  }, [isSubscriptionActive, setupSubscription, cleanupSubscription]);

  // Register callbacks - returns unsubscribe function
  const registerStreamCallbacks = useCallback((callbacks: StreamEventCallbacks) => {
    console.log('📝 [StreamEventContext] Registering callbacks:', Object.keys(callbacks));
    registeredCallbacks.add(callbacks);

    // Return cleanup function
    return () => {
      console.log('🧹 [StreamEventContext] Unregistering callbacks');
      registeredCallbacks.delete(callbacks);
    };
  }, []);

  const value = {
    registerStreamCallbacks,
    lastStreamLiveAt,
    lastStreamEndedAt,
    activateSubscription,
    deactivateSubscription,
    isSubscriptionActive,
  };

  return (
    <StreamEventContext.Provider value={value}>
      {children}
    </StreamEventContext.Provider>
  );
};

export default StreamEventContext;
