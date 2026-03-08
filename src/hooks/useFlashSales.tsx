
// src/hooks/useFlashSales.js

import { useState, useEffect, useCallback } from 'react';
// import socketurl from '../../Config';
import {io} from 'socket.io-client';
import { socketurl } from '../../Config';

const socket = io(socketurl, {
  transports: ['websocket'],
});


// const useFlashSales = (limit = 4) => {
//   const [liveSales, setLiveSales] = useState({ data: [], page: 1, hasMore: true });
//   const [upcomingSales, setUpcomingSales] = useState({ data: [], page: 1, hasMore: true });
//   const [isLoading, setIsLoading] = useState(true);
//   const [isFetchingMore, setIsFetchingMore] = useState(false);
//   const [error, setError] = useState(null);
//   console.log("live sales", liveSales);
//   console.log("upcoming sales", upcomingSales);

//   const fetchSales = useCallback((type, page) => {
//     if (page === 1) setIsLoading(true);
//     else setIsFetchingMore(true);
    
//     const payload = {
//       livePage: type === 'live' ? page : liveSales.page,
//       upcomingPage: type === 'upcoming' ? page : upcomingSales.page,
//       limit,
//     };
//     socket.emit('GET_INITIAL_FLASH_SALES', payload);
//   }, [limit, liveSales.page, upcomingSales.page]);

//   useEffect(() => {
//     const handleInitialData = (data) => {
//       // Handle live sales data
//       if (data.live) {
//         setLiveSales(prev => ({
//           data: data.live.page === 1 ? data.live.sales : [...prev.data, ...data.live.sales],
//           page: data.live.page,
//           hasMore: data.live.hasMore,
//         }));
//       }
      
//       // Handle upcoming sales data
//       if (data.upcoming) {
//         setUpcomingSales(prev => ({
//           data: data.upcoming.page === 1 ? data.upcoming.sales : [...prev.data, ...data.upcoming.sales],
//           page: data.upcoming.page,
//           hasMore: data.upcoming.hasMore,
//         }));
//       }

//       setIsLoading(false);
//       setIsFetchingMore(false);
//     };

//     socket.on('INITIAL_FLASH_SALES_DATA', handleInitialData);
    
//     // Initial fetch
//     if (socket.connected) {
//       fetchSales('live', 1);
//       fetchSales('upcoming', 1);
//     } else {
//       socket.once('connect', () => {
//         fetchSales('live', 1);
//         fetchSales('upcoming', 1);
//       });
//     }

//     // NOTE: Real-time updates ('FLASH_SALE_UPDATE') will require a strategy.
//     // A simple approach is to refetch the first page on update.
//     const handleRealtimeUpdate = () => fetchSales('live', 1);
//     socket.on('FLASH_SALE_UPDATE', handleRealtimeUpdate);

//     return () => {
//       socket.off('INITIAL_FLASH_SALES_DATA', handleInitialData);
//       socket.off('FLASH_SALE_UPDATE', handleRealtimeUpdate);
//     };
//   }, [fetchSales]);

//   const loadMoreLive = () => {
//     if (liveSales.hasMore && !isFetchingMore) {
//       fetchSales('live', liveSales.page + 1);
//     }
//   };

//   const loadMoreUpcoming = () => {
//     if (upcomingSales.hasMore && !isFetchingMore) {
//       fetchSales('upcoming', upcomingSales.page + 1);
//     }
//   };

//   return {
//     liveSales: liveSales.data,
//     hasMoreLive: liveSales.hasMore,
//     loadMoreLive,
//     upcomingSales: upcomingSales.data,
//     hasMoreUpcoming: upcomingSales.hasMore,
//     loadMoreUpcoming,
//     isLoading,
//     isFetchingMore,
//     error
//   };
// };

// export default useFlashSales;

const useFlashSales = (limit = 4) => {
  const [liveSales, setLiveSales] = useState({ data: [], page: 1, hasMore: true });
  const [upcomingSales, setUpcomingSales] = useState({ data: [], page: 1, hasMore: true });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState(null);

  // console.log("[HOOK INIT] liveSales:", liveSales);
  // console.log("[HOOK INIT] upcomingSales:", upcomingSales);

  const fetchSales = useCallback((type, page) => {
    console.log(`[FETCH] Requesting ${type} sales | page: ${page}, limit: ${limit}`);

    if (page === 1) {
      console.log(`[FETCH] Setting isLoading=true for ${type}`);
      setIsLoading(true);
    } else {
      console.log(`[FETCH] Setting isFetchingMore=true for ${type}`);
      setIsFetchingMore(true);
    }

    const payload = {
      livePage: type === "live" ? page : liveSales.page,
      upcomingPage: type === "upcoming" ? page : upcomingSales.page,
      limit,
    };

    console.log("[FETCH] Emitting GET_INITIAL_FLASH_SALES with payload:", payload);
    socket.emit("GET_INITIAL_FLASH_SALES", payload);
  }, [limit, liveSales.page, upcomingSales.page]);

  useEffect(() => {
    const handleInitialData = (data) => {
      console.log("[SOCKET] INITIAL_FLASH_SALES_DATA received:", data);

      // Handle live sales data
      if (data.live) {
        console.log("[SOCKET] Updating live sales | page:", data.live.page);
        setLiveSales((prev) => ({
          data: data.live.page === 1 ? data.live.sales : [...prev.data, ...data.live.sales],
          page: data.live.page,
          hasMore: data.live.hasMore,
        }));
      }

      // Handle upcoming sales data
      if (data.upcoming) {
        console.log("[SOCKET] Updating upcoming sales | page:", data.upcoming.page);
        setUpcomingSales((prev) => ({
          data: data.upcoming.page === 1 ? data.upcoming.sales : [...prev.data, ...data.upcoming.sales],
          page: data.upcoming.page,
          hasMore: data.upcoming.hasMore,
        }));
      }

      console.log("[SOCKET] Data handling complete, turning off loading states.");
      setIsLoading(false);
      setIsFetchingMore(false);
    };

    socket.on("INITIAL_FLASH_SALES_DATA", handleInitialData);

    // Initial fetch
    if (socket.connected) {
      console.log("[SOCKET] Already connected, fetching first pages...");
      fetchSales("live", 1);
      fetchSales("upcoming", 1);
    } else {
      console.log("[SOCKET] Not connected yet, waiting for connect event...");
      socket.once("connect", () => {
        console.log("[SOCKET] Connected, fetching first pages...");
        fetchSales("live", 1);
        fetchSales("upcoming", 1);
      });
    }

    // Real-time updates
    const handleRealtimeUpdate = () => {
      console.log("[SOCKET] FLASH_SALE_UPDATE received → refetching live sales first page");
      fetchSales("live", 1);
    };
    socket.on("FLASH_SALE_UPDATE", handleRealtimeUpdate);

    return () => {
      console.log("[CLEANUP] Removing socket listeners.");
      socket.off("INITIAL_FLASH_SALES_DATA", handleInitialData);
      socket.off("FLASH_SALE_UPDATE", handleRealtimeUpdate);
    };
  }, [fetchSales]);

  const loadMoreLive = () => {
    if (liveSales.hasMore && !isFetchingMore) {
      console.log("[LOAD MORE] Loading more live sales...");
      fetchSales("live", liveSales.page + 1);
    } else {
      console.log("[LOAD MORE] Skipped loading live (no more data or already fetching).");
    }
  };

  const loadMoreUpcoming = () => {
    if (upcomingSales.hasMore && !isFetchingMore) {
      console.log("[LOAD MORE] Loading more upcoming sales...");
      fetchSales("upcoming", upcomingSales.page + 1);
    } else {
      console.log("[LOAD MORE] Skipped loading upcoming (no more data or already fetching).");
    }
  };

  return {
    liveSales: liveSales.data,
    hasMoreLive: liveSales.hasMore,
    loadMoreLive,
    upcomingSales: upcomingSales.data,
    hasMoreUpcoming: upcomingSales.hasMore,
    loadMoreUpcoming,
    isLoading,
    isFetchingMore,
    error,
  };
};

export default useFlashSales;
