import { useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../../../Utils/Api';

export default function useLiveStreamTracker(showId) {
    const trackerRef = useRef({
        lastHeartbeat: 0,
        totalDuration: 0,
        heartbeatInterval: null
    });

    // Send presence update
    const updatePresence = useCallback(async (action, duration = 0) => {
        try {
            await axiosInstance.post(`live-interactions/${showId}/presence`, {
                action,
                duration
            }, {
                headers: {
                    'x-client-platform': 'web' 
                }
            });
        } catch (error) {
            console.log('Tracking error:', error);
        }
    }, [showId]);

        // Track product interaction
    const trackProductInteraction = useCallback(async (productId, interactionType) => {
        try {
            await axiosInstance.post(
                `live-interactions/${showId}/interact/${interactionType}/${productId}`
            );
        } catch (error) {
            console.error('Product interaction error:', error);
        }
    }, [showId]);
        const trackAuctionBid = useCallback(async (productId, bidAmount) => {
            try {
                await axiosInstance.post(
                    `live-interactions/${showId}/interact/auction/${productId}`,
                    { bidAmount }
                );
            } catch (error) {
                console.log('Auction bid error:', error);
            }
        }, [showId]);

const trackGiveawayEntry = useCallback(async (productId) => {
    try {
        await axiosInstance.post(
            `live-interactions/${showId}/interact/giveaway/${productId}`
        );
    } catch (error) {
        console.error('Giveaway entry error:', error);
    }
}, [showId]);
    // Start tracking session
    const startTracking = useCallback(() => {
        if (trackerRef.current.heartbeatInterval) return;
        
        updatePresence('join');
        
        trackerRef.current.lastHeartbeat = Date.now();
        trackerRef.current.heartbeatInterval = setInterval(async () => {
            const now = Date.now();
            const duration = Math.floor((now - trackerRef.current.lastHeartbeat) / 1000);
            
            if (duration > 0) {
                await updatePresence('heartbeat', duration);
                trackerRef.current.totalDuration += duration;
                trackerRef.current.lastHeartbeat = now;
            }
        }, 30000); // 30-second heartbeat
    }, [updatePresence]);

    // End tracking session
    const endTracking = useCallback(async () => {
        if (trackerRef.current.heartbeatInterval) {
            clearInterval(trackerRef.current.heartbeatInterval);
            trackerRef.current.heartbeatInterval = null;
            
            const finalDuration = Math.floor(
                (Date.now() - trackerRef.current.lastHeartbeat) / 1000
            );
            
            if (finalDuration > 0) {
                await updatePresence('leave', finalDuration);
                trackerRef.current.totalDuration += finalDuration;
            }
        }
    }, [updatePresence]);

    // Setup and cleanup
    useEffect(() => {
        startTracking();
        return () => {
            endTracking();
        };
    }, [startTracking, endTracking]);

   return {
    trackProductInteraction,
    trackLike: () => trackProductInteraction('like', 'global'),
    trackAuctionBid,
    trackGiveawayEntry,
    startTracking,
    endTracking
};
}


// import useLiveStreamTracker from './hooks/useLiveStreamTracker';

// const LiveStreamPlayer = ({ showId }) => {
//     const { 
//         startTracking, 
//         endTracking, 
//         trackProductInteraction,
//         trackAuctionBid,
//         trackGiveawayEntry
//     } = useLiveStreamTracker(showId);

//     // Example usage for product click
//     const handleProductClick = (productId, type) => {
//         trackProductInteraction(productId, type);
//     };

//     // Example usage for auction bid
//     const handleAuctionBid = (productId, bidAmount) => {
//         trackAuctionBid(productId, bidAmount);
//     };

//     // Example usage for giveaway entry
//     const handleGiveawayEntry = (productId) => {
//         trackGiveawayEntry(productId);
//     };

//     return (
//         <div>
//             {/* Live stream player */}
//             <button onClick={() => handleLike()}>Like Stream</button>
            
//             {/* Product buttons */}
//             <button onClick={() => handleProductClick('prod123', 'buy-now')}>
//                 Buy Now
//             </button>
            
//             <button onClick={() => handleAuctionBid('prod456', 250)}>
//                 Bid ₹250
//             </button>
            
//             <button onClick={() => handleGiveawayEntry('prod789')}>
//                 Enter Giveaway
//             </button>
//         </div>
//     );
// };




// import this in that component :

// import useLiveStreamTracker from "../../../../../../customHooks/useLiveStreamTracker";


//   const {trackGiveawayEntry } = useLiveStreamTracker(streamId);



// giveaway applyClick pass the active giveaway product id to this function

//     const handleGiveawayEntry = (productId) => {
//         trackGiveawayEntry(productId);
//     };