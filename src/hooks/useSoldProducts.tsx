import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../Utils/Api';

interface Statistics {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalProductsSold: number;
    averageOrderValue: number;
    salesByType: {
      [key: string]: {
        count: number;
        revenue: number;
      };
    };
  };
}

// Exponential backoff retry logic
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (
  fetchFn: () => Promise<any>,
  retries = 3,
  delay = 1000
): Promise<any> => {
  try {
    return await fetchFn();
  } catch (error) {
    if (retries === 0) throw error;
    await sleep(delay);
    return fetchWithRetry(fetchFn, retries - 1, delay * 2);
  }
};

export const useSoldProducts = (showId: string | number, sourceType: string | null = null) => {
  const [soldProducts, setSoldProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSoldProducts = useCallback(async (
    page = 1,
    limit = 20,
    append = false,
    isRefresh = false
  ) => {
    if (!showId) return;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    if (isRefresh) {
      setRefreshing(true);
    } else if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);
    
    try {
      const params: any = { page, limit };
      if (sourceType) params.sourceType = sourceType;
      //sellers/
      const response = await axiosInstance.get(
        `/shows/${showId}/sold-products`,
        { 
          params,
          signal: abortControllerRef.current?.signal
        }
      );
      
      console.log('API Response:', response.data.data.soldProducts);
      
      if (response.data.status) {
        const newProducts = response.data.data.soldProducts;
        
        if (append) {
          setSoldProducts(prev => [...prev, ...newProducts]);
        } else {
          setSoldProducts(newProducts);
        }
        setPagination(response.data.data.pagination);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      const errorMessage = err.response?.data?.message || 'Failed to fetch sold products';
      setError(errorMessage);
      console.log('Error fetching sold products:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [showId, sourceType]);

  const loadMore = useCallback(() => {
    if (pagination.hasNextPage && !loading && !loadingMore && !refreshing) {
      fetchSoldProducts(pagination.currentPage + 1, 20, true);
    }
  }, [pagination, loading, loadingMore, refreshing, fetchSoldProducts]);

  const refresh = useCallback(async () => {
    await fetchSoldProducts(1, 20, false, true);
  }, [fetchSoldProducts]);

  // Reset when sourceType or showId changes
  useEffect(() => {
    setSoldProducts([]);
    fetchSoldProducts(1);

    return () => {
      // Cleanup abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [showId, sourceType, fetchSoldProducts]);

  return {
    soldProducts,
    loading,
    loadingMore,
    refreshing,
    error,
    pagination,
    fetchSoldProducts,
    loadMore,
    refresh,
    refetch: () => fetchSoldProducts(1)
  };
};

// Statistics hook
export const useSoldProductsStatistics = (showId: string | number) => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    if (!showId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchWithRetry(() =>
        axiosInstance.get(`/seller/shows/${showId}/sold-products/statistics`)
      );
      
      if (response.data.status) {
        const stats = response.data.data;
        setStatistics(stats);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch statistics';
      setError(errorMessage);
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    loading,
    error,
    refetch: fetchStatistics
  };
};

export const useUserPurchases = (type = null) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const fetchPurchases = useCallback(async (page = 1, limit = 10) => {
    setLoading(true);
    setError(null);
    
    try {
      const params: { page: number; limit: number; type?: string } = { page, limit };
      if (type) params.type = type;
      
      const response = await axiosInstance.get('user/purchases', { params });
      
      if (response.data.success) {
        setPurchases(response.data.data.purchases);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch purchases');
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const loadMore = useCallback(() => {
    if (pagination.hasNextPage && !loading) {
      fetchPurchases(pagination.currentPage + 1);
    }
  }, [pagination, loading, fetchPurchases]);

  useEffect(() => {
    fetchPurchases(1);
  }, [fetchPurchases]);

  return {
    purchases,
    loading,
    error,
    pagination,
    fetchPurchases,
    loadMore,
    refetch: () => fetchPurchases(1)
  };
};
