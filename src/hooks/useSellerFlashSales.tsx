// src/hooks/useSellerFlashSales.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSellerFlashSales, FlashSale } from '../Services/flashSaleApi';

interface UseSellerFlashSalesResult {
  liveFlashSales: FlashSale[];
  upcomingFlashSales: FlashSale[];
  livePage: number;
  upcomingPage: number;
  hasMoreLive: boolean;
  hasMoreUpcoming: boolean;
  loading: boolean;
  error: string | null;
  loadMoreLive: () => void;
  loadMoreUpcoming: () => void;
  refreshFlashSales: () => void;
}

export function useSellerFlashSales(
  sellerId: string | undefined,
  limit: number = 200
): UseSellerFlashSalesResult {
  const [liveFlashSales, setLiveFlashSales] = useState<FlashSale[]>([]);
  const [upcomingFlashSales, setUpcomingFlashSales] = useState<FlashSale[]>([]);
  const [livePage, setLivePage] = useState(1);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [hasMoreLive, setHasMoreLive] = useState(false);
  const [hasMoreUpcoming, setHasMoreUpcoming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track if background refresh is in progress
  const isBackgroundRefreshing = useRef(false);

  // Background refresh function - doesn't set loading state
  const backgroundRefresh = useCallback(async () => {
    if (!sellerId || isBackgroundRefreshing.current) {
      return;
    }

    isBackgroundRefreshing.current = true;
    
    try {
      const data = await getSellerFlashSales({ 
        sellerId, 
        livePage: 1, 
        upcomingPage: 1,
        limit 
      });
      
      // Silently update the data without showing loading indicator
      setLiveFlashSales(data.live.sales);
      setUpcomingFlashSales(data.upcoming.sales);
      setHasMoreLive(data.live.hasMore);
      setHasMoreUpcoming(data.upcoming.hasMore);
      setLivePage(1);
      setUpcomingPage(1);
      
      console.log('[Flash Sales] Background refresh completed');
    } catch (err) {
      console.error('[Flash Sales] Background refresh failed:', err);
      // Don't set error state to avoid disrupting UI
    } finally {
      isBackgroundRefreshing.current = false;
    }
  }, [sellerId, limit]);

  const loadInitialData = useCallback(async () => {
    if (!sellerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await getSellerFlashSales({ 
        sellerId, 
        livePage: 1, 
        upcomingPage: 1,
        limit 
      });
      
      setLiveFlashSales(data.live.sales);
      setUpcomingFlashSales(data.upcoming.sales);
      setHasMoreLive(data.live.hasMore);
      setHasMoreUpcoming(data.upcoming.hasMore);
      setLivePage(1);
      setUpcomingPage(1);
    } catch (err) {
      console.error('Failed to load initial flash sales:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flash sales');
    } finally {
      setLoading(false);
    }
  }, [sellerId, limit]);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Auto-refresh every 1 minute (60000ms) in background
  useEffect(() => {
    if (!sellerId) {
      return;
    }

    console.log('[Flash Sales] Setting up auto-refresh every 1 minute');
    
    // Set up interval for background refresh
    const intervalId = setInterval(() => {
      console.log('[Flash Sales] Running background refresh...');
      backgroundRefresh();
    }, 60000); // 60 seconds = 1 minute

    // Cleanup interval on unmount or when sellerId changes
    return () => {
      console.log('[Flash Sales] Cleaning up auto-refresh interval');
      clearInterval(intervalId);
    };
  }, [sellerId, backgroundRefresh]);

  const loadMoreLive = useCallback(async () => {
    if (!sellerId || !hasMoreLive || loading) return;

    try {
      const nextPage = livePage + 1;
      const data = await getSellerFlashSales({ 
        sellerId, 
        livePage: nextPage,
        upcomingPage: 1,
        limit 
      });
      
      setLiveFlashSales(prev => [...prev, ...data.live.sales]);
      setHasMoreLive(data.live.hasMore);
      setLivePage(nextPage);
    } catch (err) {
      console.error('Failed to load more live sales:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more live sales');
    }
  }, [sellerId, livePage, hasMoreLive, loading, limit]);

  const loadMoreUpcoming = useCallback(async () => {
    if (!sellerId || !hasMoreUpcoming || loading) return;

    try {
      const nextPage = upcomingPage + 1;
      const data = await getSellerFlashSales({ 
        sellerId, 
        livePage: 1,
        upcomingPage: nextPage,
        limit 
      });
      
      setUpcomingFlashSales(prev => [...prev, ...data.upcoming.sales]);
      setHasMoreUpcoming(data.upcoming.hasMore);
      setUpcomingPage(nextPage);
    } catch (err) {
      console.error('Failed to load more upcoming sales:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more upcoming sales');
    }
  }, [sellerId, upcomingPage, hasMoreUpcoming, loading, limit]);

  const refreshFlashSales = useCallback(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    liveFlashSales,
    upcomingFlashSales,
    livePage,
    upcomingPage,
    hasMoreLive,
    hasMoreUpcoming,
    loading,
    error,
    loadMoreLive,
    loadMoreUpcoming,
    refreshFlashSales,
  };
}
