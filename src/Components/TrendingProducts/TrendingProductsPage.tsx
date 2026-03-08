import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../../Utils/Api';
import TrendingListItem from './TrendingListItem';
import { Toast } from '../../Utils/dateUtils';
import { SEARCH_ENDPOINTS } from '../../../Config';
import SellerHeader from '../SellerComponents/SellerForm/Header';

// Types
interface Product {
  _id: string;
  title?: string;
  description?: string;
  productPrice?: number;
  MRP?: number;
  images?: Array<{ key: string }>;
  sellerCompanyName?: string;
  sellerId?: string | { _id: string };
  sellerUserName?: string;
  isInWishlist?: boolean;
  flashSale?: {
    isActive: boolean;
    flashPrice?: number;
    originalPrice?: number;
    endsAt?: string;
  };
}

interface ApiResponse {
  data: Product[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
}

interface TrendingProductsPageProps {
  route?: any;
}

// Skeleton Loader Component
const ProductSkeleton = React.memo(() => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: '70%' }]} />
        <View style={[styles.skeletonLine, { width: '50%', marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
      </View>
    </View>
  </View>
));

ProductSkeleton.displayName = 'ProductSkeleton';

// Empty State Component
const EmptyState = React.memo(({ error }: { error: string | null }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="cube-outline" size={64} color="#666" />
    <Text style={styles.emptyTitle}>No Trending Products Found</Text>
    <Text style={styles.emptySubtitle}>
      {error || 'Check back later for trending products'}
    </Text>
  </View>
));

EmptyState.displayName = 'EmptyState';

// Footer Loader Component
const FooterLoader = React.memo(() => (
  <View style={styles.footerLoader}>
    <ActivityIndicator size="small" color="#F7CE45" />
    <Text style={styles.footerText}>Loading more...</Text>
  </View>
));

FooterLoader.displayName = 'FooterLoader';

const TrendingProductsPage: React.FC<TrendingProductsPageProps> = () => {
  const navigation = useNavigation();
  const abortControllerRef = useRef<AbortController | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  // API endpoint - Using SEARCH_ENDPOINTS from Config
  const API_ENDPOINT = SEARCH_ENDPOINTS.products;

  /**
   * Fetch products with AbortController for cancellation
   */
  const fetchProducts = useCallback(
    async (page: number = 1, category: string = '', isRefresh: boolean = false) => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController
      abortControllerRef.current = new AbortController();

      try {
        // Set appropriate loading state
        if (isRefresh) {
          setIsRefreshing(true);
        } else if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        setError(null);

        // Build query parameters
        const params: any = {
          page,
          limit: 20,
        };

        if (category) {
          params.category = category;
        }

        // Make API call with abort signal
        const response = await axiosInstance.get<ApiResponse>(API_ENDPOINT, {
          params,
          signal: abortControllerRef.current.signal,
        });

        // DEBUG: Log the actual response to understand the format
        // console.log('🔍 Trending Products API Response:', JSON.stringify(response.data, null, 2));
        // console.log('🔍 Response Type:', typeof response.data);
        // console.log('🔍 Is Array?:', Array.isArray(response.data));
        
        const { data, pagination } = response.data;

        // Update products list with duplicate filtering
        setProducts((prev) => {
          if (page === 1) {
            return data;
          }
          
          // Filter out duplicates when paginating
          const existingIds = new Set(prev.map(p => p._id));
          const newProducts = data.filter(p => !existingIds.has(p._id));
          return [...prev, ...newProducts];
        });
        setHasMore(pagination.hasMore || page < pagination.totalPages);
        setCurrentPage(page);
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          console.log('Request cancelled');
          return;
        }

        console.error('Error fetching products:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch products';
        setError(errorMessage);
        Toast(errorMessage);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  /**
   * Initial load
   */
  useEffect(() => {
    fetchProducts(1, selectedCategory);

    // Cleanup: Cancel any ongoing requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedCategory, fetchProducts]);

  /**
   * Handle category change
   */
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setProducts([]);
    setCurrentPage(1);
    setHasMore(true);
  }, []);

  /**
   * Handle pull to refresh
   */
  const handleRefresh = useCallback(() => {
    setProducts([]); // Clear products before refresh
    setCurrentPage(1);
    setHasMore(true);
    fetchProducts(1, selectedCategory, true);
  }, [selectedCategory, fetchProducts]);

  /**
   * Handle load more (pagination)
   */
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading && !isLoadingMore && !isRefreshing) {
      fetchProducts(currentPage + 1, selectedCategory);
    }
  }, [
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    currentPage,
    selectedCategory,
    fetchProducts,
  ]);

  /**
   * Handle wishlist save
   */
  const handleSave = useCallback(async (productId: string) => {
    try {
      // Correct wishlist API endpoint
      await axiosInstance.post(`/wishlist/${productId}/toggle`);
      Toast('Wishlist updated');
    } catch (err: any) {
      console.error('Error saving to wishlist:', err);
      Toast(err.response?.data?.message || 'Failed to update wishlist');
    }
  }, []);

  /**
   * Render product item
   */
  const renderItem = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <TrendingListItem
        product={item}
        rank={index + 1}
        onSave={handleSave}
      />
    ),
    [handleSave]
  );

  /**
   * Render footer (loading more indicator)
   */
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return <FooterLoader />;
  }, [isLoadingMore]);

  /**
   * Render empty component
   */
  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return <EmptyState error={error} />;
  }, [isLoading, error]);

  /**
   * Key extractor - Add index as fallback for safety
   */
  const keyExtractor = useCallback((item: Product, index: number) => {
    return item._id || `product-${index}`;
  }, []);

  /**
   * Item separator
   */
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  /**
   * Get item layout for optimization
   */
  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: 400, // Approximate item height
      offset: 400 * index,
      index,
    }),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Reusable SellerHeader Component with Trending Products title */}
      <SellerHeader navigation={navigation} message="Trending Products!" />

      {/* Initial loading state */}
      {isLoading && products.length === 0 ? (
        <FlatList
          data={Array.from({ length: 6 })}
          renderItem={() => <ProductSkeleton />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={products}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={ItemSeparator}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#F7CE45"
              colors={['#F7CE45']}
            />
          }
          // Performance optimizations
           removeClippedSubviews={true}
           maxToRenderPerBatch={20}
           updateCellsBatchingPeriod={50}
          initialNumToRender={20}
          windowSize={20}
          getItemLayout={getItemLayout}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  separator: {
    height: 0,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  footerText: {
    color: '#999',
    fontSize: 14,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Skeleton styles
  skeletonContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  skeletonCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#2A2A2A',
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
  },
});

export default TrendingProductsPage;