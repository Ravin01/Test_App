import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import axiosInstance from '../Utils/Api';
import Snackbar from 'react-native-snackbar';
import {useAuthContext} from './AuthContext';

export const SellerContext = createContext<any>(null);

export const useSellerContext = () => useContext(SellerContext);

export const SellerProvider = ({children}) => {
  const {user}:any = useAuthContext();
  const [sellerCategories, setSellerCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoriesError, setCategoriesError] = useState(false);

  // Snackbar helper functions
  const negative = useCallback((message: string) => {
    Snackbar.show({
      text: message,
      duration: Snackbar.LENGTH_SHORT,
      backgroundColor: '#DC2626',
    });
  }, []);

  const positive = useCallback((message: string) => {
    Snackbar.show({
      text: message,
      duration: Snackbar.LENGTH_SHORT,
      backgroundColor: '#16A34A',
    });
  }, []);

  const fetchSellerCategories = useCallback(async () => {
    setCategoriesLoaded(false);
    setCategoriesError(false);
    try {
      const response = await axiosInstance.get('seller/category');
      if (response.data.status && response.data.data?.categories) {
        setSellerCategories(response.data.data.categories);
        setCategoriesLoaded(true);
        console.log(
          '✅ Seller categories fetched from API:',
          response.data.data.categories.length,
        );
      } else if (response.data.data?.categories?.length === 0) {
        // Empty categories response
        setSellerCategories([]);
        setCategoriesLoaded(true);
        console.log('⚠️ No categories assigned to seller');
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.log('❌ Failed to fetch seller categories from API:', error);
      setCategoriesError(true);
      // negative('Failed to load categories. Please try again.'); // Removed snackbar notification
    }
  }, []);

  // ✅ OPTIMIZATION: Lazy fetch seller categories with delay (non-blocking)
  useEffect(() => {
    if (user && user.role === 'seller') {
      // Defer category fetching to not block UI rendering
      const timer = setTimeout(() => {
        fetchSellerCategories();
      }, 500); // 500ms delay to ensure smooth app startup

      return () => clearTimeout(timer);
    } else {
      // Reset state when user is not a seller
      setSellerCategories([]);
      setCategoriesLoaded(false);
      setCategoriesError(false);
    }
  }, [user, fetchSellerCategories]);

  return (
    <SellerContext.Provider
      value={{
        sellerCategories,
        categoriesLoaded,
        categoriesError,
        fetchSellerCategories,
        positive,
        negative,
      }}>
      {children}
    </SellerContext.Provider>
  );
};
