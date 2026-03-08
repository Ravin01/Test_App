import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ToastAndroid,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ArrowLeftCircle, Heart, HeartOff} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebouncedGoBack } from '../Utils/useDebouncedGoBack';
import { colors } from '../Utils/Colors';
import { AWS_CDN_URL } from '../Utils/aws';
import axiosInstance from '../Utils/Api';
import useConfirmModal from '../hooks/useAlertModal';
import GlobalConfirmModal from './Reuse/AlertModal';


const {width, height} = Dimensions.get('window');

const WishList = ({navigation}) => {
  const handleGoBack = useDebouncedGoBack(() => navigation.goBack(), 500);
  
         const { modalConfig, showModal, hideModal, handleConfirm } = useConfirmModal();
  const [wishLists, setWishLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [removingItems, setRemovingItems] = useState(new Set());
  
  const [pagination, setPagination] = useState({
    hasMore: true,
    limit: 10,
    currentPage: 1,
    totalPages: 1,
  });

  // Fetch wishlist with pagination
  const fetchWishlist = async (page = 1, isRefresh = false) => {
    try {
      if (!pagination.hasMore && !isRefresh && page > 1) return;

      if (page === 1 && !isRefresh) {
        setLoading(true);
      } else if (page > 1) {
        setLoadingMore(true);
      }

      const response = await axiosInstance.get('/wishlist/productsave', {
        params: {
          page,
          limit: pagination.limit,
        }
      });

      const data = response.data.data;
      const newItems = data.wishlistItems || [];
      const totalPages = data?.pagination?.totalPages || 1;
      const hasMore =data.pagination?.hasNextPage;
      // console.log( data?.pagination)
      if (page === 1 || isRefresh) {
        setWishLists(newItems);
      } else {
        setWishLists(prev => [...prev, ...newItems]);
      }

      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalPages,
        hasMore,
      }));

    } catch (error) {
      console.error('Error fetching wishlist:', error);
      const message = error.response?.data?.message || 'Failed to load wishlist items';
      
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchWishlist(1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPagination(prev => ({
      ...prev,
      currentPage: 1,
      hasMore: true,
    }));
    fetchWishlist(1, true);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && pagination.hasMore && pagination.currentPage < pagination.totalPages) {
      fetchWishlist(pagination.currentPage + 1);
    }
  }, [loadingMore, pagination.hasMore, pagination.currentPage, pagination.totalPages]);

  const handleUnsaveProduct = async (item) => {
    try {
      // Add item ID to removing set to show loading state
      setRemovingItems(prev => new Set([...prev, item.productId._id]));

      const response = await axiosInstance.post(`/wishlist/${item.productId._id}/toggle`);
      const isSaved = response.data.data?.isInWishlist;

      const message = isSaved ? 'Added to wishlist!' : 'Removed from wishlist';
      
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', message);
      }

      // Remove item from list if unsaved
      if (!isSaved) {
        setWishLists(prev => prev.filter(wishItem => wishItem._id !== item._id));
      }

    } catch (error) {
      console.error('Error updating wishlist:', error);
      const message = error.response?.data?.message || 'Failed to update wishlist';
      
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      // Remove item ID from removing set
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item._id);
        return newSet;
      });
    }
  };

  const confirmUnsave = (item) => {
      showModal({
      title: 'Hold on !',
      content: 'Are you sure want to unsave these product?',
      mode: 'error',
      confirmText: 'Remove',
      showIcon:false,
      onConfirm: async () => {
        // Your warning action logic here
        await handleUnsaveProduct(item);
      },
    });
    // Alert.alert(
    //   'Remove from Wishlist',
    //   `Are you sure you want to remove "${item.productId.title}" from your wishlist?`,
    //   [
    //     {
    //       text: 'Cancel',
    //       style: 'cancel',
    //     },
    //     {
    //       text: 'Remove',
    //       style: 'destructive',
    //       onPress: () => handleUnsaveProduct(item),
    //     },
    //   ]
    // );
  };

  const handleProductPress = (item) => {
    // Navigate to product details or perform other action
    navigation.navigate('ProductDetails', {id: item.productId._id,type:'static'});
  };

  const renderWishlistItem = ({item, index}) => {
    const product=item?.productId
    const isRemoving = removingItems.has(item._id);
    const imageUri = `${AWS_CDN_URL}${product?.images[0]?.key}`;
// console.log(product.images[0])
    return (
      <TouchableOpacity
        style={[styles.wishlistCard, isRemoving && styles.removingCard]}
        onPress={() => handleProductPress(item)}
        disabled={isRemoving}
        activeOpacity={0.8}>
        
        {/* Product Image */}
        <Image 
          source={{uri: imageUri}}
          onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
          style={styles.productImage}
        //   defaultSource={require('../assets/placeholder-image.png')} // Add a placeholder image
        />
        
        {/* Content Section */}
        <View style={styles.contentSection}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.title}
          </Text>
          
          <Text style={styles.productDescription} numberOfLines={2}>
            {product.description}
          </Text>
          
          {/* Price Section */}
          <View style={styles.priceSection}>
            <Text style={styles.currentPrice}>
              ₹{product.productPrice}
            </Text>
            {/* {item.MRP && item.MRP !== item.productPrice && ( */}
              <Text style={styles.originalPrice}>
                ₹{product.MRP}
              </Text>
            {/* )} */}
          </View>
          
          {/* Category/Brand */}
          {item.category && (
            <Text style={styles.categoryText}>
              {item.category}
            </Text>
          )}
        </View>
        
        {/* Action Section */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.unsaveButton, isRemoving && styles.unsaveButtonDisabled]}
            onPress={() => confirmUnsave(item)}
            disabled={isRemoving}>
            {isRemoving ? (
              <ActivityIndicator size="small" color="#FF6B6B" />
            ) : (
              <Ionicons name='heart-sharp' color="#fff" size={20} />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Removing Overlay */}
        {isRemoving && (
          <View style={styles.removingOverlay}>
            <ActivityIndicator size="small" color="#FFD700" />
          </View>
        )}
      </TouchableOpacity>
    );
  };
  // console.log(pagination)

  const renderFooter = () => {
    if (!loadingMore && pagination.hasMore) return    <TouchableOpacity
                        onPress={handleLoadMore}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-center bg-brand-yellow px-4 py-2 mx-32 rounded-full shadow-md">
                        <Text className="text-black font-semibold text-base">
                          Load More
                        </Text>
                      </TouchableOpacity>;
                      if(!loadingMore)return
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#FFD700" />
        <Text style={styles.footerLoaderText}>Loading more items...</Text>
      </View>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Heart color="#666" size={60} />
      <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
      <Text style={styles.emptyDescription}>
        Start adding products you love to your wishlist
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => navigation.navigate('bottomtabbar', {
          screen: 'HomeTabs',
          params: { screen: 'GlobalSearch' ,params:{tabName:'products'}}
        })}>
        <Text style={styles.browseButtonText}>Browse Products</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}>
            <ArrowLeftCircle color={'#fff'} size={24} />
          </TouchableOpacity>
          <LinearGradient  
            colors={['#B38728', '#FFD700']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.headerGradient}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Wishlist</Text>
            </View>
          </LinearGradient>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading your wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}>
          <ArrowLeftCircle color={'#fff'} size={24} />
        </TouchableOpacity>
        <LinearGradient
          colors={['#B38728', '#FFD700']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.headerGradient}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Wishlist</Text>
            {/* {wishLists.length > 0 && (
              <Text style={styles.itemCount}>({wishLists.length} items)</Text>
            )} */}
          </View>
        </LinearGradient>
        <View style={styles.headerSpacer} />
      </View>

      {/* Wishlist Items */}
      <FlatList
        data={wishLists}
        renderItem={renderWishlistItem}
        keyExtractor={(item, index) => `${item._id}-${index}`}
        contentContainerStyle={[
          styles.wishlistContainer,
          wishLists.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FFD700']}
            tintColor="#FFD700"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyComponent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />
        <GlobalConfirmModal
                    visible={modalConfig.visible}
                    onClose={hideModal}
                    onConfirm={handleConfirm}
                    title={modalConfig.title}
                    content={modalConfig.content}
                    mode={modalConfig.mode}
                    confirmText={modalConfig.confirmText}
                    cancelText={modalConfig.cancelText}
                    showIcon={modalConfig.showIcon}
                    isLoading={modalConfig.isLoading}
                  />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.1,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
    marginBottom: 10,
  },
  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  title: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
  },
  itemCount: {
    color: '#FFD700',
    fontSize: Math.min(12, width * 0.03),
    fontWeight: '500',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 16,
  },
  wishlistContainer: {
    padding: 12,
  },
  emptyListContainer: {
    flex: 1,
  },
  wishlistCard: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    position: 'relative',
  },
  removingCard: {
    opacity: 0.7,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#444',
  },
  contentSection: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productDescription: {
    color: '#CCC',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  currentPrice: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  originalPrice: {
    color: '#999',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  categoryText: {
    color: '#B38728',
    fontSize: 12,
    fontWeight: '500',
  },
  actionSection: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 40,
  },
  unsaveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2231F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  unsaveButtonDisabled: {
    opacity: 0.5,
  },
  removingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoaderText: {
    color: '#CCC',
    marginTop: 8,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    color: '#CCC',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default WishList;