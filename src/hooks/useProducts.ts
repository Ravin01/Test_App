/**
 * 🛍️ USE PRODUCTS HOOK
 * Product fetching with caching, lazy loading, and performance optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProductData } from '../Components/VideoFeed/VideoTypes';
import { fetchProductsByVideoId, hasProducts, clearProductCache } from '../api/products';

interface UseProductsReturn {
  products: ProductData[];
  isLoading: boolean;
  error: string | null;
  hasProducts: boolean;
  fetchProducts: () => Promise<void>;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

/**
 * Custom hook for managing product data with performance optimization
 */
export const useProducts = (videoId: string): UseProductsReturn => {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  
  // Refs for cleanup and debouncing
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Check if we have cached products
  const hasProductsData = hasProducts(videoId) || products.length > 0;

  // Fetch products with error handling and cancellation
  const fetchProducts = useCallback(async (): Promise<void> => {
    if (!videoId || isLoading) {
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🛍️ useProducts: Fetching products for video ${videoId}`);
      
      const fetchedProducts = await fetchProductsByVideoId(videoId);
      
      // Check if component is still mounted and request wasn't aborted
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setProducts(fetchedProducts);
        setHasFetched(true);
        console.log(`✅ useProducts: Loaded ${fetchedProducts.length} products for video ${videoId}`);
      }
    } catch (fetchError) {
      // Only update error if component is still mounted and request wasn't aborted
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        const errorMessage = fetchError.message || 'Failed to fetch products';
        setError(errorMessage);
        console.error(`❌ useProducts: Error fetching products for video ${videoId}:`, errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [videoId, isLoading]);

  // Lazy fetch with debounce (for performance)
  const lazyFetchProducts = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      fetchProducts();
    }, 300); // 300ms debounce
  }, [fetchProducts]);

  // Refetch products (force refresh)
  const refetch = useCallback(async (): Promise<void> => {
    setHasFetched(false);
    await fetchProducts();
  }, [fetchProducts]);

  // Clear cache for this video
  const clearCache = useCallback(() => {
    clearProductCache();
    setProducts([]);
    setHasFetched(false);
    setError(null);
  }, []);

  // Auto-fetch on videoId change (with debouncing)
  useEffect(() => {
    if (videoId && !hasFetched) {
      lazyFetchProducts();
    }

    return () => {
      // Cleanup timeout on unmount or videoId change
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [videoId, hasFetched, lazyFetchProducts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Reset state when videoId changes
  useEffect(() => {
    if (videoId) {
      // Don't clear products immediately - let cache handle it
      setError(null);
      setHasFetched(false);
    } else {
      // Clear everything if no videoId
      setProducts([]);
      setError(null);
      setHasFetched(false);
      setIsLoading(false);
    }
  }, [videoId]);

  return {
    products,
    isLoading,
    error,
    hasProducts: hasProductsData,
    fetchProducts,
    refetch,
    clearCache,
  };
};