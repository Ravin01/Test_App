import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { CommunicationBackendUrl, backendurl } from '../../Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Communication Backend Base URL
// Production: https://communicationbe.onrender.com
const BASE_URL = CommunicationBackendUrl || 'https://communication-server.flykup.live/api';
const REFRESH_TOKEN_ENDPOINT = '/auth/refresh'; // Main backend refresh endpoint

console.log('Communication Backend URL:', BASE_URL);
// Create a new Axios instance for communication backend (OTP, SMS, and Notification services)
const axiosCommunication = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token cache to avoid repeated AsyncStorage calls
let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

// Token refresh state management
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

/**
 * Get access token from AsyncStorage with caching
 */
const getAccessToken = async (): Promise<string | null> => {
  // Return cached token if available
  if (cachedToken) {
    return cachedToken;
  }

  // If a token fetch is already in progress, wait for it
  if (tokenPromise) {
    return tokenPromise;
  }

  // Fetch token from AsyncStorage
  tokenPromise = AsyncStorage.getItem('accessToken')
    .then((token) => {
      cachedToken = token;
      tokenPromise = null;
      return token;
    })
    .catch((error) => {
      console.error('Error fetching access token:', error);
      tokenPromise = null;
      return null;
    });

  return tokenPromise;
};

/**
 * Clear cached token (call on logout or token refresh)
 */
export const clearCachedToken = (): void => {
  cachedToken = null;
  tokenPromise = null;
};

/**
 * Update cached token (call after token refresh)
 */
export const updateCachedToken = (newToken: string): void => {
  cachedToken = newToken;
};

// Add request interceptor to include auth token
axiosCommunication.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = await getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response error types for better error handling
export interface CommunicationAPIError {
  success: false;
  error?: string;
  message: string;
  statusCode: number;
}

// Add response interceptor with token refresh logic
axiosCommunication.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<CommunicationAPIError>) => {
    const originalRequest: any = error.config;
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;

    // Log errors from the communication API
    if (__DEV__) {
      console.log('Communication API Error:', {
        status: statusCode,
        message: errorMessage,
        url: error.config?.url,
        method: error.config?.method,
      });
    }

    // Handle 401 with token refresh
    if (statusCode === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.log('No refresh token available for communication API');
        clearCachedToken();
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then(() => axiosCommunication(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        console.log('Communication API: Attempting token refresh');
        
        // Call main backend refresh endpoint
        const refreshResponse = await axios.post(
          `${backendurl}${REFRESH_TOKEN_ENDPOINT}`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;

        if (!accessToken) {
          throw new Error('No access token in refresh response');
        }

        // Update tokens in AsyncStorage
        await AsyncStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        }

        // Update cached token
        updateCachedToken(accessToken);

        // Update original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Retry all queued requests
        refreshQueue.forEach(({ resolve }) => resolve());
        refreshQueue = [];
        isRefreshing = false;

        console.log('Communication API: Token refresh successful, retrying request');

        // Retry the original request
        return axiosCommunication(originalRequest);
      } catch (refreshError) {
        console.log('Communication API: Token refresh failed', refreshError);
        
        // Reject all queued requests
        refreshQueue.forEach(({ reject }) => reject(refreshError));
        refreshQueue = [];
        isRefreshing = false;
        
        // Clear cached token
        clearCachedToken();
        
        return Promise.reject(error);
      }
    }

    // Handle other error codes
    switch (statusCode) {
      case 429:
        // Rate limit exceeded
        console.warn('Rate limit exceeded. Please wait before trying again.');
        break;
      case 500:
        console.error('Server error. Please try again later.');
        break;
    }

    return Promise.reject(error);
  }
);

export default axiosCommunication;
