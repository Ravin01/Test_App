import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { AWS_CDN_URL } from '../../../../../Config';
import axiosInstance from '../../../../Utils/Api';

interface SoldProductsTabProps {
  showId: number;
}

const SoldProductsTab: React.FC<SoldProductsTabProps> = ({ showId }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const [soldProducts, setSoldProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false
  });

  const navigation = useNavigation<NavigationProp<any>>();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSoldProducts = useCallback(async (
    page = 1,
    limit = 20,
    append = false,
    isRefresh = false
  ) => {
    if (!showId) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isRefresh) {
      setRefreshing(true);
    } else if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setError(null);

    try {
      // Build URL with query parameters
      let url = `/shows/${showId}/sold-products?page=${page}&limit=${limit}`;

      // Add sourceType filter if not 'all'
      if (activeFilter !== 'all') {
        url += `&sourceType=${activeFilter}`;
      }

      const response = await axiosInstance.get(url, {
        signal: abortControllerRef.current?.signal
      });

      console.log('✅ API Response received:', response.data.data.soldProducts);

      // if (response.data.status) {
      const newProducts = response.data.data.soldProducts;
      console.log('✅ Setting soldProducts state with:', newProducts);

      if (append) {
        setSoldProducts(prev => {
          console.log('✅ Appending to previous:', prev);
          return [...prev, ...newProducts];
        });
      } else {
        setSoldProducts(newProducts);
      }
      setPagination(response.data.data.pagination);
      // }
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      const errorMessage = err.response?.data?.message || 'Failed to fetch sold products';
      setError(errorMessage);
      console.log('❌ Error fetching sold products:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [showId, activeFilter]);

  useEffect(() => {
    // console.log('🔄 Effect triggered - fetching products');
    setSoldProducts([]);
    fetchSoldProducts(1);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [showId, activeFilter, fetchSoldProducts]);

  // console.log("🚀 Render - soldProducts:", soldProducts);
  // console.log("🚀 Render - soldProducts.length:", soldProducts.length);
  // console.log("🚀 Render - loading:", loading);
  // console.log("🚀 Render - error:", error);
  const filters = [
    { key: 'all', label: 'All Sales', icon: 'package-variant' },
    { key: 'flash_sale', label: 'Flash', icon: 'flash' },
    { key: 'bundle_flash_sale', label: 'Bundle Flash', icon: 'layers' },
    { key: 'bundle_sale', label: 'Bundle', icon: 'package-variant-closed' },
    { key: 'auction', label: 'Auction', icon: 'gavel' },
    { key: 'giveaway', label: 'Giveaway', icon: 'gift' }
  ];

  const getSaleTypeConfig = (type: string) => {
    switch (type) {
      case 'flash_sale':
        return {
          icon: 'flash',
          color: '#FF6B6B',
          bg: '#2A1215',
          borderColor: '#FF6B6B',
          cardBg: '#1A0D0F'
        };
      case 'bundle_flash_sale':
        return {
          icon: 'layers',
          color: '#A78BFA',
          bg: '#1E1B3B',
          borderColor: '#A78BFA',
          cardBg: '#14112B'
        };
      case 'bundle_sale':
        return {
          icon: 'package-variant-closed',
          color: '#FB923C',
          bg: '#2D1B0F',
          borderColor: '#FB923C',
          cardBg: '#1D120A'
        };
      case 'auction':
        return {
          icon: 'gavel',
          color: '#60A5FA',
          bg: '#0F1F35',
          borderColor: '#60A5FA',
          cardBg: '#0A1424'
        };
      case 'giveaway':
        return {
          icon: 'gift',
          color: '#34D399',
          bg: '#0F2922',
          borderColor: '#34D399',
          cardBg: '#0A1C17'
        };
      default:
        return {
          icon: 'package-variant',
          color: '#94A3B8',
          bg: '#1E293B',
          borderColor: '#475569',
          cardBg: '#0F172A'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleUserProfileClick = (userName: string) => {
    // Navigate to user profile
    navigation.navigate('ViewSellerProdile', { id: userName });
  };

  const handleFilterChange = useCallback((filterKey: string) => {
    setActiveFilter(filterKey);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (pagination.hasNextPage && !loading && !loadingMore && !refreshing) {
      fetchSoldProducts(pagination.currentPage + 1, 20, true);
    }
  }, [pagination, loading, loadingMore, refreshing, fetchSoldProducts]);

  const handleRefresh = useCallback(async () => {
    await fetchSoldProducts(1, 20, false, true);
  }, [fetchSoldProducts]);

  const refetch = useCallback(() => {
    fetchSoldProducts(1);
  }, [fetchSoldProducts]);

  const toggleBundleExpand = (orderId: string) => {
    setExpandedBundles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading sold products: {error}</Text>
        <TouchableOpacity
          onPress={refetch}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderFilterButton = ({ item }: { item: typeof filters[0] }) => (
    <TouchableOpacity
      onPress={() => handleFilterChange(item.key)}
      style={[
        styles.filterButton,
        activeFilter === item.key ? styles.filterButtonActive : styles.filterButtonInactive
      ]}
    >
      <MaterialCommunityIcons
        name={item.icon as any}
        size={12}
        color={activeFilter === item.key ? '#18181B' : '#A1A1AA'}
      />
      <Text style={[
        styles.filterButtonText,
        activeFilter === item.key ? styles.filterButtonTextActive : styles.filterButtonTextInactive
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderSoldProduct = ({ item: sale }: { item: any }) => {
    // Add null safety checks
    if (!sale) {
      console.log("Sale is null or undefined");
      return null;
    }
    // console.log(sale.saleType);
    // Handle both single product and bundle products
    // Both bundle and non-bundle sales have products array
    const isBundle = sale.isBundle === true;
    const products = sale.products || [];
    const product = products[0];

    // Check if we have at least one product
    if (!product && products.length === 0) {
      console.log("Sale without product data:", sale);
      return null;
    }

    const { color, bg, borderColor, cardBg } = getSaleTypeConfig(sale.saleType);
    const productImage = product?.images?.[0]?.key
      ? `${AWS_CDN_URL}${product.images[0].key}`
      : product?.images?.[0]
        ? `${AWS_CDN_URL}${product.images[0]}`
        : null;

    // Calculate quantity - handle both bundle and single product
    const quantity = isBundle
      ? sale.products?.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || sale.quantity || 0
      : sale.quantity || 0;

    // Get product title - make sure we show something even if product data is minimal
    const productTitle = isBundle
      ? `Bundle (${sale.products?.length || 0} items)`
      : product?.title || product?.name || 'Product';

    const isExpanded = expandedBundles.has(sale.orderId);

    return (
      <View style={[styles.saleCard, { borderColor, backgroundColor: cardBg }]}>
        <View style={styles.saleCardContent}>
          {/* Product Image */}
          <View style={styles.imageContainer}>
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={styles.productImage}
              />
            ) : (
              <View style={[styles.productImage, { backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="image-off" size={20} color="#6B7280" />
              </View>
            )}
            {/* <View style={[styles.saleTypeBadge, { backgroundColor: bg }]}>
              <MaterialCommunityIcons name={icon as any} size={8} color={color} />
            </View> */}
          </View>

          {/* Sale Info */}
          <View style={styles.saleInfo}>
            {/* Title & Sale Type */}
            <View style={styles.titleRow}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {productTitle}
              </Text>
              <View style={[styles.saleTypeLabel, { backgroundColor: bg, borderColor }]}>
                <Text style={[styles.saleTypeLabelText, { color }]}>
                  {sale.saleType?.replace('_', ' ') || 'Sale'}
                </Text>
              </View>
            </View>

            {/* Buyer Info - Clickable */}
            {sale.buyer && (
              <TouchableOpacity
                onPress={() => handleUserProfileClick(sale.buyer.userName)}
                style={styles.buyerInfo}
              >
                <MaterialCommunityIcons name="account" size={12} color="#FFC107" />
                <Text style={styles.buyerName} numberOfLines={1}>
                  @{sale.buyer.userName || sale.buyer.name || 'User'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Price & Quantity */}
            <View style={styles.priceRow}>
              <View style={styles.priceContainer}>
                <MaterialCommunityIcons name="currency-inr" size={10} color="#4ADE80" />
                <Text style={styles.price}>{(sale.totalAmount || 0) === 0 ? "Free" : formatPrice(sale.totalAmount || 0)}</Text>
              </View>
              <Text style={styles.quantity}>Qty: {quantity || 1}</Text>
            </View>

            {/* Date */}
            {sale.orderedAt && (
              <View style={styles.dateRow}>
                <MaterialCommunityIcons name="calendar" size={8} color="#A1A1AA" />
                <Text style={styles.dateText}>{formatDate(sale.orderedAt)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bundle Expand Button & Products List */}
        {isBundle && sale.products && sale.products.length > 0 && (
          <>
            <TouchableOpacity
              onPress={() => toggleBundleExpand(sale.orderId)}
              style={styles.expandButton}
            >
              <MaterialCommunityIcons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color="#A1A1AA"
              />
              <Text style={styles.expandButtonText}>
                {isExpanded ? 'Hide' : 'View'} Products ({sale.products.length})
              </Text>
            </TouchableOpacity>

            {/* Expanded Products List */}
            {isExpanded && (
              <View style={styles.expandedProductsContainer}>
                {sale.products.map((bundleProduct: any, idx: number) => {
                  const bundleProductImage = bundleProduct?.images?.[0]?.key
                    ? `${AWS_CDN_URL}${bundleProduct.images[0].key}`
                    : null;

                  return (
                    <View
                      key={`${sale.orderId}-product-${idx}`}
                      style={[styles.bundleProductItem, { backgroundColor: '#1A1A1A' }]}
                    >
                      <View style={styles.bundleProductImageContainer}>
                        {bundleProductImage ? (
                          <Image
                            source={{ uri: bundleProductImage }}
                            style={styles.bundleProductImage}
                          />
                        ) : (
                          <View style={[styles.bundleProductImage, { backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' }]}>
                            <MaterialCommunityIcons name="image-off" size={16} color="#6B7280" />
                          </View>
                        )}
                      </View>

                      <View style={styles.bundleProductInfo}>
                        <Text style={styles.bundleProductTitle} numberOfLines={2}>
                          {bundleProduct?.title || 'Product'}
                        </Text>
                        <View style={styles.bundleProductDetails}>
                          <Text style={styles.bundleProductPrice}>
                            ₹{formatPrice(bundleProduct?.price || bundleProduct?.unitPrice || 0)}
                          </Text>
                          <Text style={styles.bundleProductQuantity}>
                            Qty: {bundleProduct?.quantity || 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color="#A1A1AA" />
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        </View>
      );
    }

    if (!pagination.hasNextPage && soldProducts.length > 0) {
      return (
        <View style={styles.endMessage}>
          <Text style={styles.endMessageText}>You've reached the end</Text>
        </View>
      );
    }

    return null;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="package-variant" size={48} color="#52525B" />
      <Text style={styles.emptyTitle}>No Sales Yet</Text>
      <Text style={styles.emptyDescription}>
        Products sold in flash sales, bundle sales, auctions, and giveaways will appear here.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Filters */}
      <FlatList
        horizontal
        data={filters}
        renderItem={renderFilterButton}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersList}
      />

      {/* Loading State - Initial Load */}
      {loading && soldProducts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFC107" />
          <Text style={styles.loadingText}>Loading sold products...</Text>
        </View>
      ) : (
        /* Sold Products List */
        <FlatList
          data={soldProducts}
          renderItem={renderSoldProduct}
          keyExtractor={(item, index) => `${item?.orderId || index}-${index}`}
          contentContainerStyle={soldProducts.length > 0 ? styles.listContainer : styles.listContainerEmpty}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.8}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FFC107']}
              tintColor="#FFC107"
              title="Pull to refresh"
              titleColor="#A1A1AA"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 12,
  },
  filtersList: {
    flexGrow: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#F7CE45',
    borderColor: '#FFC107',
  },
  filterButtonInactive: {
    backgroundColor: '#18181B',
    borderColor: '#3F3F46',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#18181B',
  },
  filterButtonTextInactive: {
    color: '#A1A1AA',
  },
  listContainer: {
    padding: 16,
  },
  listContainerEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  saleCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saleCardContent: {
    flexDirection: 'row',
    gap: 16,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 80,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  saleTypeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  saleInfo: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'column',
    gap: 8,
  },
  productTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
  saleTypeLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  saleTypeLabelText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buyerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFC107',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  price: {
    color: '#4ADE80',
    fontWeight: '800',
    fontSize: 18,
  },
  quantity: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(161, 161, 170, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  dateText: {
    fontSize: 12,
    color: '#D4D4D8',
    fontWeight: '500',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(161, 161, 170, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },
  expandButtonText: {
    fontSize: 13,
    color: '#E4E4E7',
    fontWeight: '600',
  },
  expandedProductsContainer: {
    marginTop: 8,
    gap: 8,
  },
  bundleProductItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(161, 161, 170, 0.3)',
  },
  bundleProductImageContainer: {
    position: 'relative',
  },
  bundleProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bundleProductInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bundleProductTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 18,
  },
  bundleProductDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bundleProductPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ADE80',
  },
  bundleProductQuantity: {
    fontSize: 12,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    color: '#A1A1AA',
    fontSize: 14,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  loadingMoreText: {
    fontSize: 12,
    color: '#A1A1AA',
  },
  endMessage: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endMessageText: {
    fontSize: 12,
    color: '#71717A',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#A1A1AA',
    textAlign: 'center',
    maxWidth: 300,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#F87171',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SoldProductsTab;
