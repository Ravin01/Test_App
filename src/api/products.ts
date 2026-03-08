/**
 * 🛍️ PRODUCTS API
 * Shoppable video products fetching with caching and performance optimization
 */

import axiosInstance from '../Utils/Api';
import { ProductData } from '../Components/VideoFeed/VideoTypes';

interface ProductsResponse {
  success: boolean;
  products: ProductData[];
  count: number;
}

// Cache for product data (5-minute expiry)
const productCache = new Map<string, { data: ProductData[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch products linked to a specific video
 * Implements caching and error handling
 */
export const fetchProductsByVideoId = async (videoId: string): Promise<ProductData[]> => {
  if (!videoId) {
    console.warn('📦 fetchProductsByVideoId: Invalid videoId provided');
    return [];
  }

  // Check cache first
  const cached = productCache.get(videoId);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log(`📦 Products cache hit for video ${videoId}`);
    return cached.data;
  }

  try {
    console.log(`📦 Fetching products for video ${videoId}`);
    
    const response = await axiosInstance.get<ProductsResponse>(`/products?videoId=${videoId}`);
    
    if (response.data.success) {
      const products = response.data.products || [];
      
      // Cache the results
      productCache.set(videoId, {
        data: products,
        timestamp: now,
      });
      
      console.log(`✅ Fetched ${products.length} products for video ${videoId}`);
      return products;
    } else {
      console.warn(`⚠️ Products API returned success: false for video ${videoId}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Failed to fetch products for video ${videoId}:`, error.message);
    
    // Return cached data if available, even if expired
    if (cached) {
      console.log(`📦 Using expired cache for video ${videoId} due to API error`);
      return cached.data;
    }
    
    return [];
  }
};

/**
 * Preload products for multiple videos (for performance)
 */
export const preloadProductsForVideos = async (videoIds: string[]): Promise<void> => {
  const uncachedVideos = videoIds.filter(videoId => {
    const cached = productCache.get(videoId);
    const now = Date.now();
    return !cached || (now - cached.timestamp) >= CACHE_DURATION;
  });

  if (uncachedVideos.length === 0) {
    return;
  }

  try {
    console.log(`📦 Preloading products for ${uncachedVideos.length} videos`);
    
    const promises = uncachedVideos.map(videoId => 
      fetchProductsByVideoId(videoId).catch(error => {
        console.warn(`⚠️ Preload failed for video ${videoId}:`, error.message);
        return [];
      })
    );

    await Promise.allSettled(promises);
    console.log(`✅ Product preloading completed`);
  } catch (error) {
    console.error('❌ Product preloading error:', error);
  }
};

/**
 * Check if video has products (from cache or quick API check)
 */
export const hasProducts = (videoId: string): boolean => {
  const cached = productCache.get(videoId);
  if (cached) {
    return cached.data.length > 0;
  }
  return false; // Unknown until fetched
};

/**
 * Clear product cache (for memory management)
 */
export const clearProductCache = (): void => {
  productCache.clear();
  console.log('📦 Product cache cleared');
};

/**
 * Get cache stats (for debugging)
 */
export const getProductCacheStats = () => {
  const now = Date.now();
  const entries = Array.from(productCache.entries());
  
  return {
    totalEntries: entries.length,
    validEntries: entries.filter(([, data]) => (now - data.timestamp) < CACHE_DURATION).length,
    expiredEntries: entries.filter(([, data]) => (now - data.timestamp) >= CACHE_DURATION).length,
    memoryUsage: entries.reduce((acc, [, data]) => acc + data.data.length, 0),
  };
};