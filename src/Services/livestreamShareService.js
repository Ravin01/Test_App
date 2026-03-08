import bgaAxiosInstance from "../Utils/bgaAxiosInstance";


const livestreamShareService = {
  /**
   * Record a stream share
   * @param {string} streamId - The stream/show ID
   * @param {string} userId - The user ID
   * @param {string} shareType - Type of share (default: 'link')
   * @returns {Promise} Response with share data
   */
  recordShare: async (streamId, userId, shareType = 'link') => {
    try {
      const response = await bgaAxiosInstance.post('/api/share/record', {
        streamId,
        userId,
        shareType
      });
      return response.data;
    } catch (error) {
      console.log('Error recording share:', error.response.data);
      // throw error;
    }
  },

  /**
   * Check if user has shared a stream
   * @param {string} streamId - The stream/show ID
   * @param {string} userId - The user ID
   * @returns {Promise} Response with hasShared status and totalShares
   */
  checkShareStatus: async (streamId, userId) => {
    try {
      const response = await bgaAxiosInstance.get(`/api/share/check/${streamId}/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking share status:', error);
      throw error;
    }
  },

  /**
   * Get stream share count
   * @param {string} streamId - The stream/show ID
   * @returns {Promise} Response with share count
   */
  getShareCount: async (streamId) => {
    try {
      const response = await bgaAxiosInstance.get(`/api/share/count/${streamId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting share count:', error);
      throw error;
    }
  }
};

export default livestreamShareService;
