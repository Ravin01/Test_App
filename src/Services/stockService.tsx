// src/services/stockService.js
import axiosInstance from '../Utils/Api';

class StockService {
  // Cache to avoid duplicate requests
  static cache = new Map();
  static cacheTimeout = 30000; // 30 seconds

  static async fetchProductStocks(productIds) {
    if (!productIds || !productIds.length) return {};
    
    // Filter out cached results that are still valid
    const now = Date.now();
    const uncachedIds = productIds.filter(id => {
      const cached = this.cache.get(id);
      return !cached || (now - cached.timestamp) > this.cacheTimeout;
    });

    let freshData = {};

    // Only make API call if we have uncached IDs
    if (uncachedIds.length > 0) {
      try {
        const response = await axiosInstance.post('/shows/stocks/batch', {
          productIds: uncachedIds
        });
        
        freshData = response.data.data || {};

        // Update cache with fresh data
        Object.entries(freshData).forEach(([productId, stockData]) => {
          this.cache.set(productId, {
            data: stockData,
            timestamp: now
          });
        });
      } catch (error) {
        console.error('Failed to fetch product stocks:', error);
        // Don't throw, return empty object to fail gracefully
      }
    }

    // Combine cached and fresh data
    const result = {};
    productIds.forEach(id => {
      const cached = this.cache.get(id);
      if (cached && (now - cached.timestamp) <= this.cacheTimeout) {
        result[id] = cached.data;
      } else if (freshData[id]) {
        result[id] = freshData[id];
      }
    });

    return result;
  }

  static async fetchSingleProductStock(productId) {
    if (!productId) return null;
    
    const stocks = await this.fetchProductStocks([productId]);
    return stocks[productId] || null;
  }

  // Clear cache for specific product (useful after stock updates)
  static clearCache(productId) {
    this.cache.delete(productId);
  }

  // Clear entire cache
  static clearAllCache() {
    this.cache.clear();
  }

  // Fetch stock history with pagination
  static async fetchStockHistory(stockId, page = 1, limit = 20) {
    try {
      const response = await axiosInstance.get(`stock/${stockId}/history`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch stock history:', error);
      throw error;
    }
  }

  // Fetch stock details without history
  static async fetchStockDetails(stockId) {
    try {
      const response = await axiosInstance.get(`stock/${stockId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch stock details:', error);
      throw error;
    }
  }
}

export default StockService;
