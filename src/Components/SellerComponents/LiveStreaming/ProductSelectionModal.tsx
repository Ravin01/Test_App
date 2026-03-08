import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useAuthContext } from '../../../Context/AuthContext';
import api from '../../../Utils/Api';
import { AWS_CDN_URL } from '../../../Utils/aws';
import { colors } from '../../../Utils/Colors';
import {
  X,
  Search,
  Package,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import Snackbar from 'react-native-snackbar';

interface Product {
  _id: string;
  title: string;
  price: number;
  images: Array<{ key: string }>;
  stock?: number;
}

interface ProductSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onProductsSelected: (products: Product[], quantities: { [key: string]: number }) => void;
  showTitle: string;
  hostName: string;
  hostProfileURL?: string;
  showThumbnail?: string;
}

const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  visible,
  onClose,
  onProductsSelected,
  showTitle,
  hostName,
  hostProfileURL,
  showThumbnail,
}) => {
  const { user } = useAuthContext();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<{ [key: string]: boolean }>({});
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchProducts(1, true);
    } else {
      // Reset state when modal closes
      setSearchTerm('');
      setSelectedProducts({});
      setQuantities({});
      setPage(1);
      setProducts([]);
    }
  }, [visible]);

  useEffect(() => {
    if (searchTerm) {
      const timer = setTimeout(() => {
        fetchProducts(1, true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  const fetchProducts = async (pageNum: number, reset: boolean = false) => {
    try {
      if (pageNum === 1 && reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const sellerId = user?.sellerInfo?._id || user?.sellerInfo;
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        sellerId,
      });

    //   if (searchTerm) {
    //     params.append('search', searchTerm);
    //   }

      const response = await api.get(`/product/listing/sellerhub?page=${page}&limit=20&search=${searchTerm}`);
    //   console.log(response.data)
      if (response.data.status) {
        const newProducts = response.data.data.products || [];
        
        if (reset) {
          setProducts(newProducts);
        } else {
          setProducts(prev => [...prev, ...newProducts]);
        }
        
        setPage(pageNum);
        setHasMore(response.data.data.page<response.data.data.totalPages || false);
      }
    } catch (error) {
      console.log('Error fetching products:', error);
      Snackbar.show({
        text: 'Failed to load products',
        backgroundColor: '#EF4444',
        duration: Snackbar.LENGTH_SHORT,
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchProducts(page + 1, false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newSelected = { ...prev };
      if (newSelected[productId]) {
        delete newSelected[productId];
        // Also remove quantity
        setQuantities(prevQty => {
          const newQty = { ...prevQty };
          delete newQty[productId];
          return newQty;
        });
      } else {
        newSelected[productId] = true;
        // Set default quantity to 1
        setQuantities(prevQty => ({
          ...prevQty,
          [productId]: 1,
        }));
      }
      return newSelected;
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities(prev => {
      const currentQty = prev[productId] || 1;
      const newQty = Math.max(1, currentQty + delta);
      return {
        ...prev,
        [productId]: newQty,
      };
    });
  };

  const handleConfirm = () => {
    const selected = products.filter(p => selectedProducts[p._id]);
    
    if (selected.length === 0) {
      Snackbar.show({
        text: 'Please select at least one product',
        backgroundColor: '#EF4444',
        duration: Snackbar.LENGTH_SHORT,
      });
      return;
    }

    onProductsSelected(selected, quantities);
  };

  const selectedCount = Object.keys(selectedProducts).length;

  const renderProduct = ({ item }: { item: Product }) => {
    const isSelected = selectedProducts[item._id];
    const quantity = quantities[item._id] || 1;
    const productImage = item.images?.[0]?.key;

    return (
      <TouchableOpacity
        style={[styles.productCard, isSelected && styles.productCardSelected]}
        onPress={() => toggleProduct(item._id)}
        activeOpacity={0.7}
      >
        {/* Selection Indicator */}
        <View style={[styles.selectionIndicator, isSelected && styles.selectionIndicatorActive]}>
          {isSelected && <CheckCircle size={20} color="#000" />}
        </View>

        {/* Product Image */}
        <View style={styles.productImageContainer}>
          {productImage ? (
            <Image
              source={{ uri: `${AWS_CDN_URL}${productImage}` }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Package size={40} color="#666" />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.productPrice}>
            ₹{item?.productPrice?.toLocaleString('en-IN')}
          </Text>
          {item.quantity !== undefined && (
            <Text style={styles.productStock}>
              Stock: {item?.quantity}
            </Text>
          )}
        </View>

        {/* Quantity Controls */}
        {isSelected && (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={(e) => {
                e.stopPropagation();
                updateQuantity(item._id, -1);
              }}
              activeOpacity={0.7}
            >
              <Minus size={16} color="#000" />
            </TouchableOpacity>
            
            <Text style={styles.quantityText}>{quantity}</Text>
            
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={(e) => {
                e.stopPropagation();
                updateQuantity(item._id, 1);
              }}
              activeOpacity={0.7}
            >
              <Plus size={16} color="#000" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Package size={64} color="#666" />
        <Text style={styles.emptyTitle}>No Products Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchTerm 
            ? 'Try a different search term' 
            : 'You don\'t have any products yet'}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primaryButtonColor} />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      style={{backgroundColor: colors.primaryColor}} >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={24} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Select Products</Text>
              <Text style={styles.headerSubtitle}>
                for {showTitle}
              </Text>
            </View>
            
            <View style={styles.headerRight}>
              {selectedCount > 0 && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>{selectedCount}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Show Info */}
          <View style={styles.showInfo}>
            <View style={styles.showThumbnail}>
              {showThumbnail ? (
                <Image
                  source={{ uri: `${AWS_CDN_URL}${showThumbnail}` }}
                  style={styles.showThumbnailImage}
                  resizeMode="cover"
                />
              ) : (
                <Package size={20} color="#666" />
              )}
            </View>
            
            <View style={styles.showDetails}>
              <Text style={styles.showTitle} numberOfLines={1}>
                {showTitle}
              </Text>
              <View style={styles.hostInfo}>
                {hostProfileURL ? (
                  <Image
                    source={{ uri: `${AWS_CDN_URL}${hostProfileURL}` }}
                    style={styles.hostAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.hostAvatarPlaceholder}>
                    <Text style={styles.hostAvatarText}>
                      {hostName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.hostName}>Host: {hostName}</Text>
              </View>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your products..."
              placeholderTextColor="#999"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchTerm('')}
                activeOpacity={0.7}
              >
                <X size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <AlertCircle size={16} color={colors.primaryButtonColor} />
          <Text style={styles.infoBannerText}>
            Select products to sponsor as giveaways. You can adjust quantities after selection.
          </Text>
        </View>

        {/* Products List */}
        {loading && page === 1 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryButtonColor} />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={true}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
          />
        )}

        {/* Confirm Button */}
        {selectedCount > 0 && (
          <View style={styles.confirmContainer}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <CheckCircle size={20} color="#000" />
              <Text style={styles.confirmButtonText}>
                Confirm {selectedCount} Product{selectedCount > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical:15,
    backgroundColor: colors.primaryColor,
  },
  header: {
    backgroundColor: colors.SecondaryColor,
    paddingBottom: 16,
    marginTop:10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  selectedBadge: {
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 32,
    alignItems: 'center',
  },
  selectedBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  showInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(247, 206, 69, 0.05)',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.2)',
    gap: 12,
  },
  showThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  showThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  showDetails: {
    flex: 1,
  },
  showTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hostAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  hostAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryButtonColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  hostName: {
    fontSize: 11,
    color: colors.primaryButtonColor,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryColor,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFF',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 206, 69, 0.2)',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#CCC',
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#999',
  },
  listContent: {
    padding: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 12,
  },
  productCard: {
    flex: 1,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#333',
    maxWidth: '48%',
  },
  productCardSelected: {
    borderColor: colors.primaryButtonColor,
    backgroundColor: 'rgba(247, 206, 69, 0.05)',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  selectionIndicatorActive: {
    backgroundColor: colors.primaryButtonColor,
    borderColor: colors.primaryButtonColor,
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#333',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryButtonColor,
    marginBottom: 2,
  },
  productStock: {
    fontSize: 11,
    color: '#999',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 206, 69, 0.2)',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryButtonColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    minWidth: 30,
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryButtonColor,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  confirmContainer: {
    padding: 16,
    backgroundColor: colors.SecondaryColor,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primaryButtonColor,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});

export default ProductSelectionModal;
