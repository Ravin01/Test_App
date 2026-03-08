import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backendurl } from '../../Config';
import { createNavigationContainerRef } from '@react-navigation/native';

const REFRESH_TOKEN_ENDPOINT = '/auth/refresh'; // Adjust to your actual refresh endpoint
const navigationRef = createNavigationContainerRef();
const navigate = (name) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name);
  }
};

const axiosInstance = axios.create({
  baseURL: backendurl,
  withCredentials: false // Not needed in React Native
});

let isRefreshing = false;
let refreshQueue = [];
let isLoggingOut = false; // Add this flag

const logoutUser = async () => {
  if (isLoggingOut) return; // Prevent multiple logouts
  isLoggingOut = true;
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'userName']);
  navigate('Login');
  setTimeout(() => (isLoggingOut = false), 3000); // Reset the flag after a delay
};

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add seller ID if in access mode
    const accessMode = await AsyncStorage.getItem('accessMode');
    const accessSellerId = await AsyncStorage.getItem('accessSellerId');
    if (accessMode === 'true' && accessSellerId) {
      config.headers['X-Access-Seller-Id'] = accessSellerId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle token expiration & refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip auth refresh on refresh endpoint itself or if already logging out
    if (originalRequest.url?.includes(REFRESH_TOKEN_ENDPOINT) || originalRequest.skipAuthRefresh || isLoggingOut) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('🔐 [API INTERCEPTOR] 401 error detected for URL:', originalRequest.url);
      console.log('🔐 [API INTERCEPTOR] Request method:', originalRequest.method);
      
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const accessToken = await AsyncStorage.getItem('accessToken');
      
      console.log('🔐 [API INTERCEPTOR] Current tokens - Access:', !!accessToken, 'Refresh:', !!refreshToken);

      if (!refreshToken) {
        console.log('⚠️ [API INTERCEPTOR] Missing refresh token, logging out...');
        console.log('⚠️ [API INTERCEPTOR] URL that caused logout:', originalRequest.url);
        await logoutUser();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        console.log("TYING TO REFRESH FROM AXIOS")
        const response = await axiosInstance.post(
          REFRESH_TOKEN_ENDPOINT,
          { refreshToken },
          { skipAuthRefresh: true } // Custom flag to prevent re-trigger
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        if (!accessToken) {
          console.log('No access token in refresh response');
          await logoutUser();
          return Promise.reject(error);
        }

        // Store updated tokens
        await AsyncStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        }

        // Update the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Retry pending requests
        refreshQueue.forEach(({ resolve }) => resolve());
        refreshQueue = [];
        isRefreshing = false;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.log('Token refresh failed:', refreshError);
        refreshQueue.forEach(({ reject }) => reject(refreshError));
        refreshQueue = [];
        isRefreshing = false;
        await logoutUser();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { navigationRef };
export default axiosInstance;
