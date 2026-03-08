import { useCallback, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../Context/AuthContext';

/**
 * Custom navigation hook for Dashboard component
 * Provides memoized navigation functions to avoid inline arrow function re-creation
 * Performance optimization: Prevents unnecessary re-renders and memory allocations
 */
export const useDashboardNav = () => {
  const navigation = useNavigation<any>(); // Use any for flexibility
  const { user }: any = useContext(AuthContext);

  // Product Details Navigation
  const navigateToProductDetails = useCallback((productId: string, flashSale?: any) => {
    const params: any = { id: productId, type: 'static' };
    if (flashSale) {
      params.flashSale = flashSale;
    }
    navigation.navigate('ProductDetails' as never, params as never);
  }, [navigation]);

  // Global Search Navigations
  const navigateToGlobalSearch = useCallback((params?: {
    tabName?: 'shows' | 'products' | 'videos' | 'users';
    categories?: string;
  }) => {
    navigation.navigate('GlobalSearch' as never, params as never);
  }, [navigation]);

  const navigateToShowsTab = useCallback(() => {
    navigation.navigate('GlobalSearch' as never, { tabName: 'shows' } as never);
  }, [navigation]);

  const navigateToProductsTab = useCallback(() => {
   // navigation.navigate('GlobalSearch' as never, { tabName: 'products' } as never);
   navigation.navigate('TrendingProducts' as never);
  }, [navigation]);

  const navigateToVideosTab = useCallback(() => {
    navigation.navigate('GlobalSearch' as never, { tabName: 'videos' } as never);
  }, [navigation]);

  const navigateToUsersTab = useCallback(() => {
    navigation.navigate('GlobalSearch' as never, { tabName: 'users' } as never);
  }, [navigation]);

  const navigateToCategory = useCallback((category: string, tabName: 'products' | 'shows' = 'products') => {
    navigation.navigate('GlobalSearch' as never, {
      categories: category,
      tabName,
    } as never);
  }, [navigation]);

  // Seller Profile Navigation
  const navigateToSellerProfile = useCallback((userName: string) => {
    navigation.navigate('ViewSellerProdile' as never, { id: userName } as never);
  }, [navigation]);

  // Live Screen Navigation
  const navigateToLiveScreen = useCallback((stream: any) => {
    navigation.navigate('LiveScreen' as never, { stream } as never);
  }, [navigation]);

  // Reel Navigation
  const navigateToReel = useCallback((reelId: string) => {
    navigation.navigate('reel' as never, { id: reelId } as never);
  }, [navigation]);

  // Comment Navigation
  const navigateToComment = useCallback((additionalData?: any) => {
    navigation.navigate('Comment' as never, additionalData as never);
  }, [navigation]);

  // Seller Portal Navigation
  const navigateToSellerPortal = useCallback(() => {
    navigation.navigate('sellerPortal' as never);
  }, [navigation]);

  // Profile Setup Navigation
  const navigateToProfileSetup = useCallback(() => {
    navigation.navigate('ProfileSetupScreen' as never);
  }, [navigation]);

  // Wishlist Navigation
  const navigateToWishlist = useCallback(() => {
    navigation.navigate('whistlist' as never);
  }, [navigation]);

  // Dropshipper Form Navigation
  const navigateToDropshipperForm = useCallback(() => {
    navigation.navigate('DropshipperForm' as never);
  }, [navigation]);

  // Notification Screen Navigation (for future use)
  const navigateToNotifications = useCallback(() => {
    navigation.navigate('NotificationScreen' as never);
  }, [navigation]);

  /**
   * Smart Profile Navigation with Ownership Check
   * Navigates to own profile (bottom tab) if userName matches current user
   * Otherwise navigates to ViewSellerProfile screen
   * @param userName - The username to navigate to
   * @param context - Optional context string for debugging (e.g., 'ShoppableVideo', 'PremiumBanner')
   */
  const navigateToProfileWithOwnershipCheck = useCallback((userName: string, context?: string) => {
    // Check if the clicked profile belongs to the logged-in user
    const isOwnProfile = user?.userName === userName;
    
    if (isOwnProfile) {
      // Navigate to own profile screen in the bottom tab
      console.log(`Navigating to own profile${context ? ` from ${context}` : ''}`);
      navigation.navigate('bottomtabbar' as never, {
        screen: 'HomeTabs',
        params: {
          screen: 'profile'
        }
      } as never);
    } else {
      // Navigate to other user's profile
      console.log(`Navigating to ${userName}'s profile${context ? ` from ${context}` : ''}`);
      navigation.navigate('ViewSellerProdile' as never, { id: userName } as never);
    }
  }, [navigation, user?.userName]);

  return {
    // Direct navigation object (use sparingly)
    navigation,
    
    // Optimized navigation functions
    navigateToProductDetails,
    navigateToGlobalSearch,
    navigateToShowsTab,
    navigateToProductsTab,
    navigateToVideosTab,
    navigateToUsersTab,
    navigateToCategory,
    navigateToSellerProfile,
    navigateToProfileWithOwnershipCheck,
    navigateToLiveScreen,
    navigateToReel,
    navigateToComment,
    navigateToSellerPortal,
    navigateToProfileSetup,
    navigateToWishlist,
    navigateToDropshipperForm,
    navigateToNotifications,
  };
};
