import { useRef, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { videoInteractionService } from '../../../Utils/videoInteractions';
import axiosInstance from '../../../Utils/Api';
// import { videoInteractionService } from '../../../api/videoInteractions';


export default function useVideoTracker(videoId) {
    // Refs to hold tracking data without causing re-renders
    const videoIdRef = useRef(videoId);
    const watchDurationRef = useRef(0);
    const maxProgressRef = useRef(0);
    const clickedProductsRef = useRef(new Set());
    const videoDurationRef = useRef(0);
    
    // Refs for managing the tracking state
    const timerRef = useRef(null);
    const trackingSentRef = useRef(false);

    // Function to send data to the backend
    const sendTrackingData = useCallback(async () => {
        // Ensure data is sent only once and only if there's been some activity
        if (trackingSentRef.current || watchDurationRef.current < 1) {
            // console.log('[TRACKING] Skipping send - already sent or no watch time:', {
            //     alreadySent: trackingSentRef.current,
            //     watchDuration: watchDurationRef.current
            // });
            return;
        }
        
        // Validate video duration is set
        if (videoDurationRef.current <= 0) {
            // console.warn('[TRACKING] Skipping send - video duration not set or invalid:', {
            //     duration: videoDurationRef.current,
            //     videoId: videoIdRef.current
            // });
            return;
        }
        
        trackingSentRef.current = true;
        
        // Stop the timer if it's running
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        
        const payload = {
            watchDuration: Math.round(watchDurationRef.current),
            completionPercentage: maxProgressRef.current,
            clickedProducts: Array.from(clickedProductsRef.current)
        };
        
        // console.log("[TRACKING] Sending final data:", {
        //     ...payload,
        //     videoId: videoIdRef.current,
        //     videoDuration: videoDurationRef.current
        // });

        try {
            await axiosInstance.post(
                `shoppable-interaction/${videoIdRef.current}/view`,
                payload,{
                    headers: {
                          'x-client-platform': 'web' 
                      }
                }
            );
            console.log('[TRACKING] Data sent successfully');
        } catch (error) {
            console.log('[TRACKING] Error sending tracking data:', error.response?.data || error.message);
            // If it fails, allow it to be tried again later
            trackingSentRef.current = false; 
        }
    }, []);

    // Effect to handle cleanup: send data when the component unmounts
    useEffect(() => {
        // The returned function is the cleanup function
        return () => {
            sendTrackingData();
        };
    }, [sendTrackingData]);

    // --- Control Functions ---

    const startTracking = useCallback(() => {
        if (timerRef.current) return; // Already tracking
        
        // Start a timer that increments the watch duration every second
        timerRef.current = setInterval(() => {
            watchDurationRef.current += 1;
        }, 1000);
    }, []);

    const pauseTracking = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const setVideoDuration = useCallback((duration) => {
        if (duration > 0) {
            videoDurationRef.current = duration;
            // console.log('[TRACKING] Video duration set:', {
            //     videoId: videoIdRef.current,
            //     duration: duration.toFixed(2)
            // });
        } else {
            // console.warn('[TRACKING] Invalid duration provided:', {
            //     videoId: videoIdRef.current,
            //     duration
            // });
        }
    }, []);

    const trackProgress = useCallback((currentTime) => {
        const duration = videoDurationRef.current;
        if (!duration || duration <= 0) return;
        
        const percentage = (currentTime / duration) * 100;
        if (percentage > maxProgressRef.current) {
            maxProgressRef.current = Math.min(100, Math.round(percentage));
        }
    }, []);

    const trackProductClick = useCallback((productId) => {
    //   console.log("productId from",productId)
        clickedProductsRef.current.add(productId);
    }, []);

    // Return all functions needed by the ReelCard component
    return {
        startTracking,
        pauseTracking,
        sendTrackingData,
        trackProgress,
        trackProductClick,
        setVideoDuration
    };
}
