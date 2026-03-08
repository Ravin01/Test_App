// BGA (Giveaway Backend) Axios Instance - With Refresh Token Support
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { bgaBackendUrl, backendurl } from '../../Config'; // Import main backend URL for auth operations
import { createNavigationContainerRef } from '@react-navigation/native';

const REFRESH_TOKEN_ENDPOINT = "auth/refresh";
const navigationRef = createNavigationContainerRef();

const navigate = (name) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name);
  }
};

const bgaAxiosInstance = axios.create({
  baseURL: bgaBackendUrl,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 300000 // ✅ 5 minutes timeout for bulk giveaway creation (1000+ items)
});

// Global variables to handle refresh token logic
let isRefreshing = false;
let refreshQueue = [];
let isLoggingOut = false; // Add this flag like in your regular axios instance

// Logout function similar to your regular axios instance
const logoutUser = async () => {
  if (isLoggingOut) return; // Prevent multiple logouts
  isLoggingOut = true;
  
  try {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'userName']);
    navigate('Login');
    console.log('BGA: User logged out successfully');
  } catch (error) {
    console.error('BGA: Error during logout:', error);
  } finally {
    setTimeout(() => (isLoggingOut = false), 3000); // Reset the flag after a delay
  }
};

// Request interceptor to add token
bgaAxiosInstance.interceptors.request.use(
  async (config) => {
    try {
// console.log("[BGABACKENDURL]",bgaBackendUrl)

      const accessToken = await AsyncStorage.getItem('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    } catch (error) {
      console.error('BGA: Error retrieving access token:', error);
      return config;
    }
  },
  (error) => {
    console.error('BGA: Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with refresh token logic - updated to match your style
bgaAxiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Skip refresh logic for refresh token endpoint itself
    if (originalRequest.url?.includes(REFRESH_TOKEN_ENDPOINT)) {
      console.log('BGA: Refresh token endpoint failed, logging out...');
      await logoutUser();
      return Promise.reject(error);
    }

    // Skip refresh logic for certain requests or when already logging out
    if (originalRequest.skipAuthRefresh || isLoggingOut) {
      console.log('BGA API Error:', error.response?.data || error.message);
      return Promise.reject(error);
    }

    // Handle 401 (Unauthorized) errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.log('BGA: Missing refresh token, logging out...');
        await logoutUser();
        return Promise.reject(error);
      }

      // If already refreshing, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject, originalRequest });
        });
      }

      isRefreshing = true;

      try {
        console.log("BGA: Attempting to refresh token from main backend")
        // Create a separate axios instance for refresh token request
        // This prevents circular interceptor calls
        // IMPORTANT: Use main backend URL for auth operations, not BGA backend
        const refreshAxios = axios.create({
          baseURL: backendurl,
          withCredentials: false,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        });

        const response = await refreshAxios.post(
          REFRESH_TOKEN_ENDPOINT, 
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        if (!accessToken) {
          console.log('BGA: No access token in refresh response');
          await logoutUser();
          return Promise.reject(error);
        }
        
        // Update tokens in AsyncStorage
        await AsyncStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        }

        // Process queued requests
        refreshQueue.forEach(({ resolve, reject, originalRequest }) => {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          bgaAxiosInstance(originalRequest)
            .then(resolve)
            .catch(reject);
        });
        refreshQueue = [];

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return bgaAxiosInstance(originalRequest);

      } catch (refreshError) {
        console.log("BGA: Token refresh failed:", refreshError);
        
        // Reject all queued requests
        refreshQueue.forEach(({ reject }) => reject(refreshError));
        refreshQueue = [];
        
        await logoutUser();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    console.log('BGA API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Health check function for BGA backend
export const checkBgaHealth = async () => {
  try {
    const response = await bgaAxiosInstance.get('/health', { skipAuthRefresh: true });
    return response.data;
  } catch (error) {
    console.log('BGA: Health check failed:', error);
    throw error;
  }
};

// Helper function to get BGA backend URL
export const getBgaBackendUrl = () => bgaBackendUrl;

// Helper function to check if user is authenticated
export const isBgaAuthenticated = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    return !!(accessToken && refreshToken);
  } catch (error) {
    console.error('BGA: Error checking authentication status:', error);
    return false;
  }
};

// Helper function to manually trigger logout
export const bgaLogout = async () => {
  await logoutUser();
};

export { navigationRef };
export default bgaAxiosInstance;
