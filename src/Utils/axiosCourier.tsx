import axios from 'axios';
import { CourierBackend } from '../../Config';

// Create a new Axios instance
const axiosCourier = axios.create({
  baseURL: CourierBackend,
});


// Example of a simple error logger interceptor
axiosCourier.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log errors from the wallet API
    console.log('Wallet API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);


export default axiosCourier;