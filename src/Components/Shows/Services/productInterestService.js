import axiosInstance from "../../../Utils/Api";


// User-side API calls
export const productInterestService = {
  // Toggle interest on a product or bundle (user side)
  // ✅ NEW UNIFIED ROUTE - handles both products and bundles
  toggleInterest: async (itemId, showId, itemType = 'product') => {
    try {
      const response = await axiosInstance.post(
        `/shows/${showId}/items/${itemId}/interest`,
        { itemType } // 'product' or 'bundle'
      );
      return response.data;
    } catch (error) {
      console.log('Error toggling interest:', error);
      throw error;
    }
  },

  // Get batch interest status for multiple items
  // itemIds should be an array of objects: [{ itemId, itemType }, ...]
  getBatchInterests: async (itemIds, showId) => {
    try {
      // Transform itemIds array to match backend format
      const items = Array.isArray(itemIds) 
        ? itemIds.map(id => {
            if (typeof id === 'object' && id.itemId) {
              return { itemId: id.itemId, itemType: id.itemType || 'product' };
            }
            return { itemId: id, itemType: 'product' };
          })
        : [];

      const response = await axiosInstance.post(
        `/shows/${showId}/interests/batch`,
        { items }
      );
      return response.data;
    } catch (error) {
      console.log('Error getting batch interests:', error);
      throw error;
    }
  },

  // Get user's interest status for all products in a show
  getInterestStatus: async (showId) => {
    try {
      const response = await axiosInstance.get(
        `/shows/${showId}/interests/status`
      );
      return response.data;
    } catch (error) {
      console.log('Error getting interest status:', error);
      throw error;
    }
  }
};

// Seller-side API calls
export const sellerInterestService = {
  // NEW: Get products grouped with interested users
  getInterestedProductsByShow: async (showId) => {
    try {
      const response = await axiosInstance.get(
        `/shows/${showId}/interested-products`
      );
      return response.data;
    } catch (error) {
      console.log('Error getting interested products:', error);
      throw error;
    }
  },

  // DEPRECATED: Old method (kept for backward compatibility)
  getShowInterestedUsers: async (showId, page = 1, limit = 20) => {
    try {
      const response = await axiosInstance.get(
        `/shows/${showId}/interests?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.log('Error getting interested users:', error);
      throw error;
    }
  },

  // Get interested users for a specific product or bundle
  getItemInterestedUsers: async (showId, itemId, itemType = 'product') => {
    try {
      const response = await axiosInstance.get(
        `/shows/${showId}/items/${itemId}/interests?itemType=${itemType}`
      );
      return response.data;
    } catch (error) {
      console.log('Error getting item interested users:', error);
      throw error;
    }
  }
};
