import bgaAxiosInstance from "../../../Utils/bgaAxiosInstance";


const auctionService = {
  /**
   * Prepare multiple auctions (like giveaway preparation)
   */
  prepareAuctions: async (data) => {
    try {
      const response = await bgaAxiosInstance.post('/api/auctions/prepare', data);
      return response.data;
    } catch (error) {
      console.error('Error preparing auctions:', error);
      throw error;
    }
  },

  /**
   * Get auctions by show ID with pagination
   */
  getAuctionsByShowId: async (showId, page = 1, limit = 10) => {
    try {
      const response = await bgaAxiosInstance.get(`/api/auctions/by-show/${showId}`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching auctions:', error);
      throw error;
    }
  },

  /**
   * Bulk update auctions
   */
  bulkUpdateAuctions: async (auctionIds, showId, updates) => {
    try {
      const response = await bgaAxiosInstance.put('/api/auctions/bulk-update', {
        auctionIds,
        showId,
        updates
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk updating auctions:', error);
      throw error;
    }
  },

  /**
   * Update auction stream ID
   */
  updateAuctionStream: async (auctionId, streamId) => {
    try {
      const response = await bgaAxiosInstance.put(`/api/auctions/${auctionId}/stream`, {
        streamId
      });
      return response.data;
    } catch (error) {
      console.error('Error updating auction stream:', error);
      throw error;
    }
  },

  /**
   * Get auction winner
   */
  getAuctionWinner: async (streamId, productId) => {
    try {
      const response = await bgaAxiosInstance.get(`/api/auctions/winner/${streamId}/${productId}`);
      return response.data;
    } catch (error) {
      console.log('Error fetching auction winner:', error.response);
      throw error;
    }
  },

  /**
   * Get auction history
   */
  getAuctionHistory: async (streamId) => {
    try {
      const response = await bgaAxiosInstance.get(`/api/auctions/history/${streamId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching auction history:', error);
      throw error;
    }
  },
  
  /**
   * Delete a single auction
   */
  deleteAuction: async (auctionId) => {
    try {
      const response = await bgaAxiosInstance.delete(`/api/auctions/${auctionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting auction:', error);
      throw error;
    }
  }
};

export default auctionService;
