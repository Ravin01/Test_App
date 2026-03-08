import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {AWS_CDN_URL} from '../../../../Utils/aws';
import axiosInstance from '../../../../Utils/Api';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SoldProduct {
  _id: string;
  productId: {
    _id: string;
    title: string;
    images: Array<{key: string}>;
    category?: string;
  };
  quantity: number;
  price: number;
  totalAmount: number;
  soldAt: string;
  buyerInfo?: {
    name: string;
    userId: string;
  };
  type: 'auction' | 'buyNow' | 'flashSale' | 'bundle';
}

interface SoldProductsTabProps {
  showId: string;
}

const SoldProductsTab: React.FC<SoldProductsTabProps> = ({showId}) => {
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSoldProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await axiosInstance.get(
        `/live-stream/${showId}/sold-products`,
      );

      if (response.data.success) {
        setSoldProducts(response.data.data || []);
      } else {
        setError('Failed to load sold products');
      }
    } catch (err: any) {
      console.error('Error fetching sold products:', err);
      setError(
        err.response?.data?.message || 'Failed to load sold products',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showId]);

  useEffect(() => {
    if (showId) {
      fetchSoldProducts();
    }
  }, [showId, fetchSoldProducts]);

  const onRefresh = useCallback(() => {
    fetchSoldProducts(true);
  }, [fetchSoldProducts]);

  const getProductImage = (product: SoldProduct) => {
    if (product.productId?.images?.[0]?.key) {
      return `${AWS_CDN_URL}${product.productId.images[0].key}`;
    }
    return null;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'auction':
        return '#EAB308';
      case 'buyNow':
        return '#3B82F6';
      case 'flashSale':
        return '#EF4444';
      case 'bundle':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'auction':
        return 'gavel';
      case 'buyNow':
        return 'shopping';
      case 'flashSale':
        return 'lightning-bolt';
      case 'bundle':
        return 'package-variant';
      default:
        return 'cart';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSoldProduct = ({item}: {item: SoldProduct}) => {
    const imageUrl = getProductImage(item);
    const typeColor = getTypeColor(item.type);

    return (
      <View style={styles.productCard}>
        <View style={styles.productRow}>
          {/* Product Image */}
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={{uri: imageUrl}} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.placeholderImage]}>
                <Icon name="image-off" size={30} color="#6B7280" />
              </View>
            )}
            {/* Type Badge */}
            <View style={[styles.typeBadge, {backgroundColor: typeColor}]}>
              <Icon
                name={getTypeIcon(item.type)}
                size={12}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.productId?.title || 'Unknown Product'}
            </Text>
            
            {item.productId?.category && (
              <Text style={styles.category} numberOfLines={1}>
                {item.productId.category}
              </Text>
            )}

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Icon name="cube-outline" size={14} color="#9CA3AF" />
                <Text style={styles.detailText}>Qty: {item.quantity}</Text>
              </View>
              <View style={styles.detailItem}>
                <Icon name="currency-usd" size={14} color="#10B981" />
                <Text style={styles.priceText}>₹{item.totalAmount.toFixed(2)}</Text>
              </View>
            </View>

            {item.buyerInfo && (
              <View style={styles.buyerInfo}>
                <Icon name="account" size={14} color="#9CA3AF" />
                <Text style={styles.buyerText} numberOfLines={1}>
                  {item.buyerInfo.name}
                </Text>
              </View>
            )}

            <Text style={styles.timeText}>{formatDate(item.soldAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="cart-off" size={64} color="#6B7280" />
      <Text style={styles.emptyTitle}>No Products Sold Yet</Text>
      <Text style={styles.emptySubtitle}>
        Products sold during this live stream will appear here
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="alert-circle" size={64} color="#EF4444" />
      <Text style={styles.emptyTitle}>Error Loading Products</Text>
      <Text style={styles.emptySubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchSoldProducts()}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EAB308" />
        <Text style={styles.loadingText}>Loading sold products...</Text>
      </View>
    );
  }

  if (error && !refreshing) {
    return renderErrorState();
  }

  return (
    <FlatList
      data={soldProducts}
      renderItem={renderSoldProduct}
      keyExtractor={item => item._id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#EAB308']}
          tintColor="#EAB308"
        />
      }
      ListEmptyComponent={renderEmptyState}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  productRow: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 4,
    padding: 4,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  category: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginLeft: 4,
  },
  priceText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  buyerText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },
  timeText: {
    color: '#6B7280',
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#EAB308',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SoldProductsTab;
