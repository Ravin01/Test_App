import { SEARCH_ENDPOINTS } from "../../../../Config";
import axiosInstance from "../../../Utils/Api";

const DEFAULT_LIMIT = 10;
  const sendSearchAnalytics = async (searchTerm, category, resultCount) => {
    try {
      // console.log( {
      //   searchTerm,
      //   category: category || "all",
      //   resultCount,
      //   // userId will be automatically handled by backend if user is authenticated
      // })
      await axiosInstance.post("/analytics/search", {
        searchTerm,
        category: category || "all",
        resultCount,
        // userId will be automatically handled by backend if user is authenticated
      });
      
    } catch (error) {
      console.log("Failed to send search analytics:", error.response.data);
      // Don't show error to user as this is just analytics
    }
  }
export const SearchAPI = {
  // Fetch data for a specific category
  fetchCategoryData: async (category, term, page = 1, limit = DEFAULT_LIMIT) => {
    try {
      const endpoint = SEARCH_ENDPOINTS[category];
      const params = {page, limit};
      
      // Only add search term if it's not empty
      if (term.trim()) {
        params.term = term.trim();
      }
      const response = await axiosInstance.get(endpoint, {
        params,
        timeout: 10000,
      });
      console.log(response.data.message)
      if (response.data && response.data.status) {
        if(term)
        sendSearchAnalytics(term,category,response.data.data.length)
        return {
          success: true,
          data: response.data.data || [],
          pagination: response.data.pagination || {}
        };
      } else {
        throw new Error(response.data?.message || `Failed to fetch ${category}`);
      }
    } catch (error) {
      console.log(`API Error for ${category}:`, error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: {}
      };
    }
  },

  // Toggle wishlist status for a product
  toggleWishlist: async (productId) => {
    try {
      const response = await axiosInstance.post(`/wishlist/${productId}/toggle`);
      
      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error("Wishlist API Error:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Preload data for all categories (to be called from dashboard)
  preloadData: async () => {
    const categories = ['shows', 'videos', 'products', 'users'];
    const preloadedData = {};
    
    try {
      for (const category of categories) {
        const result = await SearchAPI.fetchCategoryData(category, '', 1);
        preloadedData[category] = result;
      }
      
      return {success: true, data: preloadedData};
    } catch (error) {
      console.error("Preload data error:", error);
      return {success: false, error: error.message};
    }
  }
};