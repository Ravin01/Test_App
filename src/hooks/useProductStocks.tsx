// For flashsale stock updates in live

// src/customHooks/useProductStocks.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import StockService from '../Services/stockService';

export const useProductStocks = (productIds = []) => {
  const [stocks, setStocks] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ MEMOIZE productIds to prevent unnecessary re-fetches
  const stableProductIds = useMemo(() => 
    productIds.filter(Boolean).sort(), 
    [productIds.join(',')] // Only update if the actual IDs change
  );

  const fetchStocks = useCallback(async (ids = stableProductIds) => {
    if (!ids || ids.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const stockData = await StockService.fetchProductStocks(ids);
      setStocks(prev => {
        // ✅ Only update state if data actually changed
        if (JSON.stringify(prev) === JSON.stringify(stockData)) {
          return prev;
        }
        return { ...prev, ...stockData };
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch product stocks');
      console.error('Error fetching product stocks:', err);
    } finally {
      setLoading(false);
    }
  }, [stableProductIds]);

  // ✅ ADD THE MISSING FUNCTION DEFINITIONS
  const getStockForProduct = useCallback((productId) => {
    return stocks[productId] || null;
  }, [stocks]);

  const getAvailableQuantity = useCallback((productId) => {
    const stock = stocks[productId];
    return stock?.availableQuantity || stock?.quantity || 0;
  }, [stocks]);

  const refetchStock = useCallback(async (productId) => {
    StockService.clearCache(productId);
    await fetchStocks([productId]);
  }, [fetchStocks]);

  // ✅ Only fetch when stableProductIds change
  useEffect(() => {
    if (stableProductIds.length > 0) {
      fetchStocks();
    }
  }, [fetchStocks, stableProductIds]);

  return {
    stocks,
    loading,
    error,
    fetchStocks,
    getStockForProduct,
    getAvailableQuantity,
    refetchStock
  };
};

export const useSingleProductStock = (productId) => {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStock = useCallback(async () => {
    if (!productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const stockData = await StockService.fetchSingleProductStock(productId);
      setStock(stockData);
    } catch (err) {
      setError(err.message || 'Failed to fetch product stock');
      console.error('Error fetching product stock:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const refetch = useCallback(async () => {
    StockService.clearCache(productId);
    await fetchStock();
  }, [productId, fetchStock]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  return {
    stock,
    loading,
    error,
    refetch,
    availableQuantity: stock?.availableQuantity || stock?.quantity || 0
  };
};

// Default export for backward compatibility
export default {
  useProductStocks,
  useSingleProductStock
};