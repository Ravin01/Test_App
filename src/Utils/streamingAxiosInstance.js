// Streaming Backend Axios Instance - With Client Headers
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { streamingBackendUrl, backendurl } from '../../Config';
import { createNavigationContainerRef } from '@react-navigation/native';

const REFRESH_TOKEN_ENDPOINT = "auth/refresh";
const navigationRef = createNavigationContainerRef();

// Client ID as specified in requirements
const CLIENT_ID = '6997e0c5ca9c15eff99a6894';

const navigate = (name) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name);
  }
};

const streamingAxiosInstance = axios.create({
  baseURL: streamingBackendUrl,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // ✅ Required headers for streaming backend
    'X-User-Role': 'client',
    'X-Client-Id': CLIENT_ID,
    'X-Is-Admin': 'false'
  },
  timeout: 30000
});

// Global variables to handle refresh token logic
let isRefreshing = false;
let refreshQueue = [];
let isLoggingOut = false;

// Logout function
const logoutUser = async () => {
  if (isLoggingOut) return;
  isLoggingOut = true;
  
  try {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'userName']);
    navigate('Login');
    console.log('Streaming: User logged out successfully');
  } catch (error) {
    console.error('Streaming: Error during logout:', error);
  } finally {
    setTimeout(() => (isLoggingOut = false), 3000);
  }
};

// Request interceptor to add token and ensure headers are present
streamingAxiosInstance.interceptors.request.use(
  async (config) => {
    try {
      console.log("[STREAMING_BACKEND_URL]", streamingBackendUrl);

      // Add access token
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      // ✅ Ensure required headers are always present
      config.headers['X-User-Role'] = 'client';
      config.headers['X-Client-Id'] = CLIENT_ID;
      config.headers['X-Is-Admin'] = 'false';

      return config;
    } catch (error) {
      console.error('Streaming: Error retrieving access token:', error);
      return config;
    }
  },
  (error) => {
    console.error('Streaming: Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with refresh token logic
streamingAxiosInstance.interceptors.response.use(
  (response) => {
    // ✅ Debug log for successful responses
    console.log('🟢 [Streaming API] Success:', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      headers: response.config.headers,
      responseData: response.data,
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Skip refresh logic for refresh token endpoint itself
    if (originalRequest.url?.includes(REFRESH_TOKEN_ENDPOINT)) {
      console.log('Streaming: Refresh token endpoint failed, logging out...');
     // await logoutUser();
      return Promise.reject(error);
    }

    // Skip refresh logic for certain requests or when already logging out
    if (originalRequest.skipAuthRefresh || isLoggingOut) {
      console.log('Streaming API Error:', error.response?.data || error.message);
      return Promise.reject(error);
    }

    // Handle 401 (Unauthorized) errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.log('Streaming: Missing refresh token, logging out...');
       // await logoutUser();
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
        console.log("Streaming: Attempting to refresh token from main backend");
        
        // Create a separate axios instance for refresh token request
        // Use main backend URL for auth operations
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
          console.log('Streaming: No access token in refresh response');
        //  await logoutUser();
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
          // ✅ Ensure required headers are maintained
          originalRequest.headers['X-User-Role'] = 'client';
          originalRequest.headers['X-Client-Id'] = CLIENT_ID;
          originalRequest.headers['X-Is-Admin'] = 'false';
          
          streamingAxiosInstance(originalRequest)
            .then(resolve)
            .catch(reject);
        });
        refreshQueue = [];

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        // ✅ Ensure required headers are maintained
        originalRequest.headers['X-User-Role'] = 'client';
        originalRequest.headers['X-Client-Id'] = CLIENT_ID;
        originalRequest.headers['X-Is-Admin'] = 'false';
        
        return streamingAxiosInstance(originalRequest);

      } catch (refreshError) {
        console.log("Streaming: Token refresh failed:", refreshError);
        
        // Reject all queued requests
        refreshQueue.forEach(({ reject }) => reject(refreshError));
        refreshQueue = [];
        
        //await logoutUser();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    console.log('Streaming API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Health check function for streaming backend
export const checkStreamingHealth = async () => {
  try {
    const response = await streamingAxiosInstance.get('/health', { skipAuthRefresh: true });
    return response.data;
  } catch (error) {
    console.log('Streaming: Health check failed:', error);
    throw error;
  }
};

// Helper function to get streaming backend URL
export const getStreamingBackendUrl = () => streamingBackendUrl;

// Helper function to check if user is authenticated
export const isStreamingAuthenticated = async () => {
  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    return !!(accessToken && refreshToken);
  } catch (error) {
    console.error('Streaming: Error checking authentication status:', error);
    return false;
  }
};

// Helper function to manually trigger logout
export const streamingLogout = async () => {
  await logoutUser();
};

// Helper function to get client ID
export const getClientId = () => CLIENT_ID;

export { navigationRef, CLIENT_ID };
export default streamingAxiosInstance;
