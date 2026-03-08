/**
 * 🛒 ORDER API
 * Purchase functionality with analytics tracking and error handling
 */

import axiosInstance from '../Utils/Api';
import { ProductData } from '../Components/VideoFeed/VideoTypes';

interface OrderResponse {
  success: boolean;
  data?: {
    orderId: string;
    redirectUrl?: string;
    estimatedDelivery?: string;
    totalAmount?: number;
    paymentMethod?: string;
  };
  message?: string;
  error?: string;
}

interface OrderRequest {
  productId: string;
  videoId: string;
  quantity?: number;
  userId?: string;
  analytics?: {
    source: 'video_overlay';
    videoTimestamp?: number;
    sessionId?: string;
  };
}

// Order analytics tracking
const orderAnalytics = {
  sessionId: Date.now().toString(),
  orderAttempts: new Map<string, number>(),
  conversionFunnel: new Map<string, { views: number; clicks: number; purchases: number }>(),
};

/**
 * Trigger "Buy Now" order for a product
 * Includes comprehensive analytics and error handling
 */
export const buyNow = async (
  productId: string,
  videoId: string,
  options?: {
    quantity?: number;
    videoTimestamp?: number;
    urgentPurchase?: boolean;
  }
): Promise<OrderResponse> => {
  if (!productId || !videoId) {
    throw new Error('Product ID and Video ID are required for purchase');
  }

  const { quantity = 1, videoTimestamp = 0, urgentPurchase = false } = options || {};

  // Track order attempt
  const attemptKey = `${productId}-${videoId}`;
  const currentAttempts = orderAnalytics.orderAttempts.get(attemptKey) || 0;
  orderAnalytics.orderAttempts.set(attemptKey, currentAttempts + 1);

  // Update conversion funnel
  const funnelKey = videoId;
  const funnel = orderAnalytics.conversionFunnel.get(funnelKey) || { views: 0, clicks: 0, purchases: 0 };
  funnel.clicks += 1;
  orderAnalytics.conversionFunnel.set(funnelKey, funnel);

  try {
    console.log(`🛒 Initiating purchase for product ${productId} from video ${videoId}`);
    
    const orderRequest: OrderRequest = {
      productId,
      videoId,
      quantity,
      analytics: {
        source: 'video_overlay',
        videoTimestamp,
        sessionId: orderAnalytics.sessionId,
      },
    };

    // Add urgency flag if specified
    if (urgentPurchase) {
      orderRequest.analytics.urgentPurchase = true;
    }

    const response = await axiosInstance.post<OrderResponse>('/order/now', orderRequest);

    if (response.data.success) {
      console.log(`✅ Order successful for product ${productId}:`, response.data.data?.orderId);
      
      // Update successful purchase in funnel
      funnel.purchases += 1;
      orderAnalytics.conversionFunnel.set(funnelKey, funnel);
      
      // Track successful conversion
      trackPurchaseSuccess(productId, videoId, response.data.data);
      
      return response.data;
    } else {
      throw new Error(response.data.message || response.data.error || 'Purchase failed');
    }
  } catch (error) {
    console.error(`❌ Purchase failed for product ${productId}:`, error.message);
    
    // Track failed purchase
    trackPurchaseFailure(productId, videoId, error.message);
    
    // Provide user-friendly error messages
    if (error.response?.status === 402) {
      throw new Error('Payment method required or insufficient funds');
    } else if (error.response?.status === 404) {
      throw new Error('Product no longer available');
    } else if (error.response?.status === 429) {
      throw new Error('Too many purchase attempts. Please try again later');
    } else if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again in a moment');
    } else {
      throw new Error(error.message || 'Purchase failed. Please try again');
    }
  }
};

/**
 * Check product availability before purchase
 */
export const checkProductAvailability = async (
  productId: string
): Promise<{ available: boolean; stock?: number; price?: number }> => {
  if (!productId) {
    return { available: false };
  }

  try {
    const response = await axiosInstance.get(`/products/${productId}/availability`);
    
    if (response.data.success) {
      return {
        available: response.data.available,
        stock: response.data.stock,
        price: response.data.price,
      };
    } else {
      return { available: false };
    }
  } catch (error) {
    console.warn(`⚠️ Failed to check availability for product ${productId}:`, error.message);
    return { available: false };
  }
};

/**
 * Get order status
 */
export const getOrderStatus = async (orderId: string): Promise<{
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  trackingUrl?: string;
  estimatedDelivery?: string;
}> => {
  if (!orderId) {
    throw new Error('Order ID is required');
  }

  try {
    const response = await axiosInstance.get(`/orders/${orderId}/status`);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to get order status');
    }
  } catch (error) {
    console.error(`❌ Failed to get status for order ${orderId}:`, error.message);
    throw error;
  }
};

/**
 * Track successful purchase (internal analytics)
 */
const trackPurchaseSuccess = (productId: string, videoId: string, orderData?: any): void => {
  try {
    const analytics = {
      event: 'purchase_success',
      productId,
      videoId,
      orderId: orderData?.orderId,
      amount: orderData?.totalAmount,
      timestamp: new Date().toISOString(),
      sessionId: orderAnalytics.sessionId,
    };

    // Send analytics (fire and forget)
    axiosInstance.post('/analytics/purchase', analytics).catch(error => {
      console.warn('⚠️ Analytics tracking failed:', error.message);
    });

    console.log('📈 Purchase success tracked:', analytics);
  } catch (error) {
    console.warn('⚠️ Purchase analytics failed:', error.message);
  }
};

/**
 * Track failed purchase (internal analytics)
 */
const trackPurchaseFailure = (productId: string, videoId: string, errorMessage: string): void => {
  try {
    const analytics = {
      event: 'purchase_failure',
      productId,
      videoId,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      sessionId: orderAnalytics.sessionId,
    };

    // Send analytics (fire and forget)
    axiosInstance.post('/analytics/purchase', analytics).catch(error => {
      console.warn('⚠️ Analytics tracking failed:', error.message);
    });

    console.log('📊 Purchase failure tracked:', analytics);
  } catch (error) {
    console.warn('⚠️ Purchase analytics failed:', error.message);
  }
};

/**
 * Get conversion analytics (for debugging/optimization)
 */
export const getConversionAnalytics = () => {
  const totalViews = Array.from(orderAnalytics.conversionFunnel.values())
    .reduce((sum, funnel) => sum + funnel.views, 0);
  
  const totalClicks = Array.from(orderAnalytics.conversionFunnel.values())
    .reduce((sum, funnel) => sum + funnel.clicks, 0);
  
  const totalPurchases = Array.from(orderAnalytics.conversionFunnel.values())
    .reduce((sum, funnel) => sum + funnel.purchases, 0);

  return {
    sessionId: orderAnalytics.sessionId,
    totalViews,
    totalClicks,
    totalPurchases,
    clickThroughRate: totalViews > 0 ? (totalClicks / totalViews * 100).toFixed(2) : '0.00',
    conversionRate: totalClicks > 0 ? (totalPurchases / totalClicks * 100).toFixed(2) : '0.00',
    orderAttempts: Object.fromEntries(orderAnalytics.orderAttempts),
    funnelData: Object.fromEntries(orderAnalytics.conversionFunnel),
  };
};

/**
 * Clear analytics data (for memory management)
 */
export const clearOrderAnalytics = (): void => {
  orderAnalytics.orderAttempts.clear();
  orderAnalytics.conversionFunnel.clear();
  orderAnalytics.sessionId = Date.now().toString();
  console.log('📊 Order analytics cleared');
};