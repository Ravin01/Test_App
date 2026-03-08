// services/flashSaleService.js - HTTP API for Flash Sales
import axiosInstance from '../Utils/Api';

/**
 * Fetch flash sales via HTTP (for initial load before socket connects)
 * @param {number} livePage - Page number for live sales
 * @param {number} upcomingPage - Page number for upcoming sales  
 * @param {number} limit - Items per page (1-50)
 * @returns {Promise<Object>} Flash sales data
 */
export const fetchFlashSales = async (livePage = 1, upcomingPage = 1, limit = 200) => {
  try {
    const response = await axiosInstance.get('user/flash-sales', {
      params: {
        livePage,
        upcomingPage,
        limit
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching flash sales via HTTP:', error);
    throw error;
  }
};

/**
 * Fetch a specific flash sale by ID
 * @param {string} flashSaleId - Flash sale ID
 * @returns {Promise<Object>} Flash sale data with success flag
 */
export const fetchFlashSaleById = async (flashSaleId) => {
  try {
    const response = await axiosInstance.get(`user/flash-sales/${flashSaleId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching flash sale by ID:', error);
    throw error;
  }
};

/**
 * Check flash sale availability for a product
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Flash sale availability data
 * Response: { hasFlashSale: boolean, flashSale?: {...} }
 */
export const checkFlashSaleAvailability = async (productId) => {
  try {
    const response = await axiosInstance.get(`user/flash-sales/product/${productId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error checking flash sale availability:', error);
    throw error;
  }
};

export default {
  fetchFlashSales,
  fetchFlashSaleById,
  checkFlashSaleAvailability
};
