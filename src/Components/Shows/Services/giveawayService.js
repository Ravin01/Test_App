// Giveaway API service - simplified for straightforward operations
import bgaAxiosInstance from '../../../Utils/bgaAxiosInstance';

export const giveawayService = {
  // Get active giveaway for a stream
  getActiveGiveaway: async (streamId) => {
    try {
      const response = await bgaAxiosInstance.get(`active/${streamId}`);
      return response.data;
    } catch (error) {
      console.log('Failed to get active giveaway:', error);
      throw error;
    }
  },

  // Get specific giveaway details by ID
  getGiveawayDetails: async (giveawayId) => {
    try {
      const response = await bgaAxiosInstance.get(`details/${giveawayId}`);
      return response.data;
    } catch (error) {
      console.log('Failed to get giveaway details:', error);
      throw error;
    }
  },

  // Apply to giveaway
  applyToGiveaway: async (giveawayId, userId) => {
    try {
      const response = await bgaAxiosInstance.post('apply', {
        giveawayId,
        userId
      });
      return response.data;
    } catch (error) {
      console.log('Failed to apply to giveaway:', error);
      throw error;
    }
  },

  // Start giveaway (seller only)
startGiveaway: async (giveawayId, streamId) => {
  try {
    const response = await bgaAxiosInstance.post('start', {
      giveawayId,
      streamId  // Added streamId to the payload
    });
    return response.data;
  } catch (error) {
    console.error('Failed to start giveaway:', error);
    throw error;
  }
},

  // Roll for winner (seller only)
  rollGiveaway: async (giveawayId) => {
    try {
      const response = await bgaAxiosInstance.post('roll', {
        giveawayId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to roll giveaway:', error);
      throw error;
    }
  },

  // End giveaway (seller only)
  endGiveaway: async (giveawayId) => {
    try {
      const response = await bgaAxiosInstance.post('end', {
        giveawayId
      });
      return response.data;
    } catch (error) {
      console.log('Failed to end giveaway:', error);
      throw error;
    }
  },

  // Get user stats
  getUserStats: async (userId) => {
    try {
      const response = await bgaAxiosInstance.get(`user/${userId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Failed to get user stats:', error);
      throw error;
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await bgaAxiosInstance.get('health');
      return response.data;
    } catch (error) {
      console.error('BGA health check failed:', error);
      throw error;
    }
  },



  // NEW: Fetch all giveaways for a show by show ID (with pagination)
  getGiveawaysByShowId: async (showId, page = 1, limit = 30) => {
    try {
      const response = await bgaAxiosInstance.get(`show/${showId}`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching giveaways by show ID:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  // NEW: Bulk update multiple giveaways at once
  bulkUpdateGiveaways: async (giveawayIds, streamId, updates = {}) => {
    try {
      const response = await bgaAxiosInstance.put('bulk-update', {
        giveawayIds,
        streamId,
        updates
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk updating giveaways:', error);
      throw error;
    }
  },

  // NEW: Check user eligibility for a giveaway
  checkEligibility: async (giveawayId, userId) => {
    try {
      const response = await bgaAxiosInstance.get(`${giveawayId}/check-eligibility/${userId}`);
      return response.data;
    } catch (error) {
      console.log('Failed to check eligibility:', error);
      throw error;
    }
  },

  // NEW: Batch check eligibility for multiple giveaways at once
  checkBatchEligibility: async (giveawayIds, userId) => {
    try {
      const response = await bgaAxiosInstance.post('check-eligibility/batch', {
        giveawayIds,
        userId
      });
      return response.data;
    } catch (error) {
      console.log('Failed to check batch :', error);
      throw error;
    }
  },

  // Update single giveaway tier (host control)
  updateGiveawayTier: async (giveawayId, giveawayTier) => {
    try {
      const response = await bgaAxiosInstance.patch(`${giveawayId}/tier`, {
        giveawayTier
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update giveaway tier:', error);
      throw error;
    }
  },

  // Bulk update all giveaways for a sponsorship invitation (host control)
  bulkUpdateSponsorGiveawayTiers: async (invitationId, giveawayTier) => {
    try {
      const response = await bgaAxiosInstance.patch(`sponsorship/${invitationId}/tier`, {
        giveawayTier
      });
      return response.data;
    } catch (error) {
      console.error('Failed to bulk update sponsor giveaway tiers:', error);
      throw error;
    }
  },

  // Delete giveaway
  deleteGiveaway: async (giveawayId) => {
    try {
      const response = await bgaAxiosInstance.delete(`delete/${giveawayId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete giveaway:', error);
      throw error;
    }
  }
};

export default giveawayService;
