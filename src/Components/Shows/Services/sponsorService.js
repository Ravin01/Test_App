
import bgaAxiosInstance from '../../../Utils/bgaAxiosInstance';

const sponsorService = {
  // Get sponsor invitations for logged-in seller with pagination
  getSponsorInvitations: async (sponsorSellerId, page = 1, limit = 10, status = null) => {
    try {
      const params = new URLSearchParams({
        sellerId: sponsorSellerId,
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (status) {
        params.append('status', status);
      }
      
      const response = await bgaAxiosInstance.get(`/api/sponsor/invitations?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sponsor invitations:', error);
      throw error;
    }
  },

  // Accept invitation and tag products
  acceptInvitation: async (sponsorId, productIds, productDetails, sponsorSellerId) => {
    try {
      const response = await bgaAxiosInstance.post(`/api/sponsor/accept/${sponsorId}`, {
        productIds,
        productDetails,
        sponsorSellerId
      });
      return response.data;
    } catch (error) {
      console.error('Error accepting sponsor invitation:', error);
      throw error;
    }
  },

  // Reject invitation
  rejectInvitation: async (sponsorId, sponsorSellerId) => {
    try {
      const response = await bgaAxiosInstance.post(`/api/sponsor/reject/${sponsorId}`, {
        sponsorSellerId
      });
      return response.data;
    } catch (error) {
      console.error('Error rejecting sponsor invitation:', error);
      throw error;
    }
  },

  // Get sponsor by stream
  getSponsorByStream: async (streamId) => {
    try {
      const response = await bgaAxiosInstance.get(`/api/sponsor/by-stream/${streamId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sponsor by stream:', error);
      throw error;
    }
  },

  // Get all sponsors for a seller
  getAllSponsorsForSeller: async (sellerId) => {
    try {
      const response = await bgaAxiosInstance.post('/api/sponsor/all', {
        sellerId
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching all sponsors:', error);
      throw error;
    }
  },

  // Get sent invitations (invitations sent by this seller to other sponsors) with pagination
  getSentInvitations: async (hostSellerId, page = 1, limit = 10, status = null) => {
    try {
      const params = new URLSearchParams({
        sellerId: hostSellerId,
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (status) {
        params.append('status', status);
      }
      
      const response = await bgaAxiosInstance.get(`/api/sponsor/sent-invitations?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sent invitations:', error);
      throw error;
    }
  }
};

export default sponsorService;
