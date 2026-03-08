// src/Components/DashboardComponents/hooks/useFlashSales.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { socketurl } from '../../../../Config';
import { io } from 'socket.io-client';
import { fetchFlashSales } from '../../../Services/flashSaleService';

const socket = io(socketurl, {
  transports: ['websocket'],
});

const useFlashSales = (limit = 200) => {
  const [liveSales, setLiveSales] = useState({ data: [], page: 1, hasMore: true });
  const [upcomingSales, setUpcomingSales] = useState({ data: [], page: 1, hasMore: true });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Refs to prevent stale closures
  const liveSalesRef = useRef(liveSales);
  const upcomingSalesRef = useRef(upcomingSales);

  // Keep refs updated
  useEffect(() => {
    liveSalesRef.current = liveSales;
  }, [liveSales]);

  useEffect(() => {
    upcomingSalesRef.current = upcomingSales;
  }, [upcomingSales]);

  // Enhanced fetch function - First try HTTP, then use socket for updates
  const fetchSales = useCallback(async (type, page, isRefresh = false) => {
    if (page === 1 && !isRefresh) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsFetchingMore(true);
    }

    const livePage = type === 'live' ? page : liveSalesRef.current.page;
    const upcomingPage = type === 'upcoming' ? page : upcomingSalesRef.current.page;

    try {
      // ✅ SOLUTION: Fetch via HTTP immediately (no waiting for socket)
      console.log('🔄 Fetching flash sales via HTTP...', { livePage, upcomingPage, limit });
      const data = await fetchFlashSales(livePage, upcomingPage, limit);
      
      // Process the HTTP response
      handleInitialData(data);
      
    } catch (httpError) {
      console.log('❌ HTTP fetch failed, falling back to socket:', httpError);
      
      // Fallback to socket if HTTP fails
      const payload = {
        livePage,
        upcomingPage,
        limit,
      };

      // Add timeout handling
      const timeout = setTimeout(() => {
        if (page === 1) setIsLoading(false);
        setIsFetchingMore(false);
        setError('Request timeout - please try again');
      }, 10000);

      socket.emit('GET_INITIAL_FLASH_SALES', payload);

      // Clear timeout when we get a response
      const handleResponse = () => {
        clearTimeout(timeout);
      };

      socket.once('INITIAL_FLASH_SALES_DATA', handleResponse);
      socket.once('FLASH_SALES_ERROR', handleResponse);

      return () => clearTimeout(timeout);
    }
  }, [limit]);

  // Handle initial data with proper state merging
  const handleInitialData = useCallback((data) => {
    const now = new Date();

    // Process live sales with validation
    if (data.live) {
      const validLiveSales = data.live.sales.filter(sale => {
        const startTime = new Date(sale.startTime);
        const endTime = new Date(sale.endTime);
        return sale.status === 'active' && startTime <= now && endTime > now;
      });

      setLiveSales(prev => {
        const newData = data.live.page === 1 
          ? validLiveSales 
          : [...prev.data, ...validLiveSales];

        // Prevent unnecessary re-render
        const isSame =
          prev.page === data.live.page &&
          prev.hasMore === data.live.hasMore &&
          JSON.stringify(prev.data) === JSON.stringify(newData);

  if (isSame) return prev; // no change → no re-render

        return {
          data: newData,
          page: data.live.page,
          hasMore: data.live.hasMore,
        };
      });
    }

    // Process upcoming sales with validation
    if (data.upcoming) {
      const validUpcomingSales = data.upcoming.sales.filter(sale => {
        const startTime = new Date(sale.startTime);
        return sale.status === 'upcoming' && startTime > now;
      });

      setUpcomingSales(prev => ({
        data: data.upcoming.page === 1 ? validUpcomingSales : [...prev.data, ...validUpcomingSales],
        page: data.upcoming.page,
        hasMore: data.upcoming.hasMore,
      }));
    }

    setIsLoading(false);
    setIsFetchingMore(false);
    setLastUpdate(new Date());
  }, []);

  // Handle real-time updates - MERGE instead of replace
  const handleRealtimeUpdate = useCallback((updatedLiveSales) => {
    const now = new Date();
    
    // Filter valid sales
    const validLiveSales = updatedLiveSales.filter(sale => {
      const startTime = new Date(sale.startTime);
      const endTime = new Date(sale.endTime);
      return sale.status === 'active' && startTime <= now && endTime > now;
    });

    // Smart merge: update existing sales, add new ones, remove expired ones
    setLiveSales(prev => {
      const currentSalesMap = new Map(prev.data.map(sale => [sale._id, sale]));
      const updatedSalesMap = new Map(validLiveSales.map(sale => [sale._id, sale]));
      
      // Merge: updated sales replace existing ones, new ones are added
      const mergedSales = [];
      
      // Keep all updated and new sales
      updatedSalesMap.forEach((sale) => {
        mergedSales.push(sale);
      });
      
      // Add existing sales that aren't in the update (maintains pagination for non-updated sales)
      currentSalesMap.forEach((sale, id) => {
        if (!updatedSalesMap.has(id)) {
          // Check if sale is still valid
          const endTime = new Date(sale.endTime);
          if (endTime > now) {
            mergedSales.push(sale);
          }
        }
      });

      // Sort by end time (soonest ending first)
      mergedSales.sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());

      return {
        ...prev,
        data: mergedSales
      };
    });

    // Remove any sales that went live from upcoming section
    setUpcomingSales(prev => {
      const liveSaleIds = new Set(validLiveSales.map(sale => sale._id));
      const filteredUpcoming = prev.data.filter(sale => !liveSaleIds.has(sale._id));
      
      return {
        ...prev,
        data: filteredUpcoming
      };
    });

    setLastUpdate(new Date());
  }, []);

  // Handle upcoming sales real-time updates
  const handleUpcomingUpdate = useCallback((updatedUpcomingSales) => {
    const now = new Date();
    
    // Filter valid upcoming sales (must be in future)
    const validUpcomingSales = updatedUpcomingSales.filter(sale => {
      const startTime = new Date(sale.startTime);
      return sale.status === 'upcoming' && startTime > now;
    });

    setUpcomingSales(prev => ({
      ...prev,
      data: validUpcomingSales
    }));

    // Also remove any sales from live section that are no longer live
    setLiveSales(prev => {
      const filteredLive = prev.data.filter(sale => {
        const endTime = new Date(sale.endTime);
        return endTime > now;
      });
      
      return {
        ...prev,
        data: filteredLive
      };
    });

    setLastUpdate(new Date());
  }, []);

  // Handle errors
  const handleError = useCallback((errorData) => {
    console.error('❌ Flash sales error:', errorData);
    setError(errorData.message || 'Failed to load flash sales');
    setIsLoading(false);
    setIsFetchingMore(false);
  }, []);

  // Handle refresh complete
  const handleRefreshComplete = useCallback(() => {
    setLastUpdate(new Date());
  }, []);

  // Periodic validation to ensure sales are in correct state
  useEffect(() => {
    const validateSalesStates = () => {
      const now = new Date();
      
      // Check live sales - remove expired ones and ones that haven't started yet
      setLiveSales(prev => {
        const validLive = prev.data.filter(sale => {
          const startTime = new Date(sale.startTime);
          const endTime = new Date(sale.endTime);
          return sale.status === 'active' && startTime <= now && endTime > now;
        });
        
        if (validLive.length !== prev.data.length) {
          return { ...prev, data: validLive };
        }
        return prev;
      });

      // Check upcoming sales - remove ones that have started or expired
      setUpcomingSales(prev => {
        const validUpcoming = prev.data.filter(sale => {
          const startTime = new Date(sale.startTime);
          const endTime = new Date(sale.endTime);
          return sale.status === 'upcoming' && startTime > now && endTime > now;
        });
        
        if (validUpcoming.length !== prev.data.length) {
          return { ...prev, data: validUpcoming };
        }
        return prev;
      });
    };

    // Run validation every 30 seconds
    const validationInterval = setInterval(validateSalesStates, 30000);

    return () => clearInterval(validationInterval);
  }, []);

  // Setup socket listeners and initial fetch
  useEffect(() => {
    // ✅ SOLUTION: Fetch data immediately via HTTP (don't wait for socket)
    fetchSales('live', 1);
    fetchSales('upcoming', 1);

    // Core data listeners for real-time updates
    socket.on('INITIAL_FLASH_SALES_DATA', handleInitialData);
    socket.on('FLASH_SALE_UPDATE', handleRealtimeUpdate);
    socket.on('UPCOMING_SALE_UPDATE', handleUpcomingUpdate);
    socket.on('FLASH_SALES_ERROR', handleError);
    socket.on('REFRESH_COMPLETE', handleRefreshComplete);

    // Cleanup
    return () => {
      socket.off('INITIAL_FLASH_SALES_DATA', handleInitialData);
      socket.off('FLASH_SALE_UPDATE', handleRealtimeUpdate);
      socket.off('UPCOMING_SALE_UPDATE', handleUpcomingUpdate);
      socket.off('FLASH_SALES_ERROR', handleError);
      socket.off('REFRESH_COMPLETE', handleRefreshComplete);
    };
  }, [fetchSales, handleInitialData, handleRealtimeUpdate, handleUpcomingUpdate, handleError, handleRefreshComplete]);

  // Enhanced load more functions
  const loadMoreLive = useCallback(() => {
    if (liveSales.hasMore && !isFetchingMore && !isLoading) {
      fetchSales('live', liveSales.page + 1);
    }
  }, [liveSales.hasMore, liveSales.page, isFetchingMore, isLoading, fetchSales]);

  const loadMoreUpcoming = useCallback(() => {
    if (upcomingSales.hasMore && !isFetchingMore && !isLoading) {
      fetchSales('upcoming', upcomingSales.page + 1);
    }
  }, [upcomingSales.hasMore, upcomingSales.page, isFetchingMore, isLoading, fetchSales]);

  // Manual refresh function
  const refreshAll = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    // Reset to first page and fetch via HTTP
    setLiveSales({ data: [], page: 1, hasMore: true });
    setUpcomingSales({ data: [], page: 1, hasMore: true });
    
    // Fetch fresh data via HTTP
    fetchSales('live', 1, true);
    fetchSales('upcoming', 1, true);
  }, [fetchSales]);

  // Health check
  const checkHealth = useCallback(() => {
    socket.emit('PING_FLASH_SALES');
  }, []);

  return {
    // Live sales
    liveSales: liveSales.data,
    hasMoreLive: liveSales.hasMore,
    loadMoreLive,
    
    // Upcoming sales
    upcomingSales: upcomingSales.data,
    hasMoreUpcoming: upcomingSales.hasMore,
    loadMoreUpcoming,
    
    // Loading states
    isLoading,
    isFetchingMore,
    
    // Error handling
    error,
    setError,
    
    // Additional utilities
    lastUpdate,
    refreshAll,
    checkHealth,
    
    // Metadata
    totalLive: liveSales.data.length,
    totalUpcoming: upcomingSales.data.length
  };
};

export default useFlashSales;
