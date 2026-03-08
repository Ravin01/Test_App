import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  useContext,
} from 'react';
import {
  ToastAndroid,
  FlatList,
  Dimensions,
  Animated,
  ActivityIndicator,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Share,
  BackHandler,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import Entypo from 'react-native-vector-icons/Entypo';
import axiosInstance from '../../Utils/Api';
import {AWS_CDN_URL} from '../../Utils/aws';
import {colors} from '../../Utils/Colors';
import {shareUrl} from '../../../Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SwipeableBuyButton from '../AnimatedButtons';
import SuccessModal from '../Reels/SuccessModal';
import ProductModal from '../Reels/ProductModal';
import {useTrackProductView} from './useTrackProductView';
import ViewReview from './ViewReview';
import {formatFollowerCount, Toast} from '../../Utils/dateUtils';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {AuthContext} from '../../Context/AuthContext';
import ImageView from 'react-native-image-zoom-viewer';
import ShareModal from '../Reuse/ShareModal';
import ExpandableAddressSection from './AddressSection';
import AskSellerCard from './AskSellerCard';
import useFlashSaleTimer from './useFlashSaleTimer';
import GlobalConfirmModal from '../Reuse/AlertModal';
import useConfirmModal from '../../hooks/useAlertModal';
import CheckoutSlider from '../Reuse/CheckOutGlobal';

const ProductDetails = ({route, navigation}) => {
  const {user}: any = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const {id, flashSale, type, refId, variantId} = route?.params || {};

  if (id) {
    useTrackProductView(id);
  }

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Payment state
  const [paymentData, setPaymentData] = useState({
    orderId: null,
    keyId: null,
    amount: null,
    currency: null,
    gateway: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // ============ VARIANT STATE (OPTIMIZED & DYNAMIC) ============
  const [parentProduct, setParentProduct] = useState(null);
  const [variantMetadata, setVariantMetadata] = useState([]); // Lightweight metadata
  const [variantCache, setVariantCache] = useState({}); // Cache for loaded full variants
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [variantAttributes, setVariantAttributes] = useState({}); // Dynamic: all available attributes
  const [selectedAttributes, setSelectedAttributes] = useState({}); // Dynamic: selected values
  const [hasVariants, setHasVariants] = useState(false);
  const [variantLoading, setVariantLoading] = useState(false);

  const handleShare = async (platform, chatIds) => {
    //ToastAndroid.show('Shared successfully!', ToastAndroid.SHORT);
  };

  const {selectedAddress}: any = useContext(AuthContext);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [paymentSuccessModalVisible, setPaymentSuccessModalVisible] =
    useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [deliveryDetails, setDeliveryDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [stockData, setStockData] = useState({});
  const [product, setProduct] = useState(null);

  const timeLeft = useFlashSaleTimer(product);

  const {modalConfig, showModal, hideModal, handleConfirm} = useConfirmModal();

  const [WishlistLoading, setWishlistLoading] = useState(false);
  const [showAlertModal, setAlertModal] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [reviews, setReviews] = useState({});
  const [reviewsData, setReviewsData] = useState([]);
  const [pincode, setPinCode] = useState('');
  const [sellerPerformance, setSellerPerformance] = useState({
    totalProductsSold: 0,
    averageShippingDays: 0,
  });

  const handleBuyNow = () => {
    if (stockStatus === 'out-of-stock' || !deliveryDetails || deliveryData !== null || product?.reserveForLive) {
      return;
    }
    setIsOpenPreview(true);
  };

  useEffect(() => {
    if (
      timeLeft?.days == 0 &&
      timeLeft?.hours == 0 &&
      timeLeft?.minutes == 0 &&
      timeLeft?.seconds == 0 &&
      flashSale
    ) {
      setAlertModal(true);
      showModal({
        title: 'FlashSale Going to End  ',
        content:
          'FLash Sale product has been ended you will be automatically redirected to home Screen.',
        mode: 'normal',
        confirmText: 'Continue',
        showIcon: false,
        onConfirm: async () => {
          navigation.goBack();
        },
      });
    }
  }, [timeLeft]);

  const [similarProducts, setSimilarProducts] = useState(null);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [erros, setErrrors] = useState('');
  const [counter, setCounter] = useState(1);
  const [deliveryData, setDeliveryData] = useState(null);
  const flatListRef = useRef();
  const [openPreview, setIsOpenPreview] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  const handleScroll = event => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setActiveImageIndex(index);
  };

  // Auto-scroll images every 10 seconds
  useEffect(() => {
    if (!images || images.length <= 1) return; // Don't auto-scroll if only 1 image

    const interval = setInterval(() => {
      setActiveImageIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % images.length; // Loop back to 0 after last image

        // Scroll to next image
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 3500); // 10 seconds (10000 milliseconds)

    return () => clearInterval(interval); // Cleanup on unmount
  }, [images]);

  // ============ OPTIMIZED LAZY LOADING FUNCTIONS ============

  /**
   * Load full variant details on-demand
   * Checks cache first, then fetches from API if needed
   */
  const loadVariantDetails = async (variantId, parentId) => {
    // Check cache first
    if (variantCache[variantId]) {
      console.log('✅ Variant loaded from cache:', variantId);
      return variantCache[variantId];
    }

    // Fetch from API
    setVariantLoading(true);
    try {
      const response = await axiosInstance.get(
        `/product-details/${parentId}/variant/${variantId}`
      );

      if (response.status === 200 && response.data.status) {
        const variantData = response.data.data;

        // Process images
        if (Array.isArray(variantData.images)) {
          variantData.signedImages = variantData.images.map(
            image => `${AWS_CDN_URL}${image.key}`
          );
        }

        // Cache the variant
        setVariantCache(prev => ({
          ...prev,
          [variantId]: variantData,
        }));

        console.log('✅ Variant loaded from API:', variantId);
        return variantData;
      }
    } catch (error) {
      console.error('Error loading variant details:', error);
      ToastAndroid.show('Failed to load variant details', ToastAndroid.SHORT);
    } finally {
      setVariantLoading(false);
    }

    return null;
  };

  /**
   * Find variant metadata by attributes (DYNAMIC - works with any attributes)
   */
  const findVariantMetadata = attributes => {
    return variantMetadata.find(v => {
      if (!v.variantAttributes) return false;

      // Check if all selected attributes match
      return Object.keys(attributes).every(
        key => v.variantAttributes[key] === attributes[key]
      );
    });
  };

  /**
   * Get all unique values for a specific attribute
   */
  const getAvailableValuesForAttribute = attributeKey => {
    return [
      ...new Set(
        variantMetadata
          .map(v => v.variantAttributes?.[attributeKey])
          .filter(Boolean)
      ),
    ];
  };

  /**
   * Extract all variant attribute types from metadata
   */
  const extractVariantAttributeTypes = metadata => {
    const attributeTypes = {};

    metadata.forEach(variant => {
      if (variant.variantAttributes) {
        Object.keys(variant.variantAttributes).forEach(key => {
          if (!attributeTypes[key]) {
            attributeTypes[key] = [];
          }
          const value = variant.variantAttributes[key];
          if (value && !attributeTypes[key].includes(value)) {
            attributeTypes[key].push(value);
          }
        });
      }
    });

    return attributeTypes;
  };

  /**
   * Check if a specific attribute combination is available
   */
  const isAttributeCombinationAvailable = (attributeKey, value) => {
    const testAttributes = {
      ...selectedAttributes,
      [attributeKey]: value,
    };
    const metadata = findVariantMetadata(testAttributes);
    return metadata && metadata.stockCount > 0;
  };

  // ============ DYNAMIC VARIANT HANDLERS ============

  /**
   * Handle attribute change - works with any attribute type
   */
  const handleAttributeChange = async (attributeKey, value) => {
    // Update selected attributes
    const newSelectedAttributes = {
      ...selectedAttributes,
      [attributeKey]: value,
    };
    setSelectedAttributes(newSelectedAttributes);

    // Find matching variant with new attributes
    const matchingMetadata = findVariantMetadata(newSelectedAttributes);

    if (matchingMetadata) {
      // Exact match found - load this variant
      const variantData = await loadVariantDetails(
        matchingMetadata._id,
        parentProduct._id
      );
      if (variantData) {
        setSelectedVariant(variantData);
        setProduct(variantData);
        setShowDetails(variantData);
        setActiveImageIndex(0);
        
        // Reset counter when variant changes (different stock levels)
        setCounter(1);
        
        // Fetch stock for new variant
        await fetchStock(variantData._id);
      }
    } else {
      // No exact match - find closest match with just this attribute
      const partialMatch = variantMetadata.find(
        v => v.variantAttributes?.[attributeKey] === value
      );

      if (partialMatch) {
        const variantData = await loadVariantDetails(
          partialMatch._id,
          parentProduct._id
        );
        if (variantData) {
          setSelectedVariant(variantData);
          // Update all selected attributes to match this variant
          setSelectedAttributes(variantData.variantAttributes || {});
          setProduct(variantData);
          setShowDetails(variantData);
          setActiveImageIndex(0);
          
          // Reset counter when variant changes (different stock levels)
          setCounter(1);
          
          // Fetch stock for new variant
          await fetchStock(variantData._id);
        }
      }
    }
  };

  const handleToggleWishlist = async () => {
    setWishlistLoading(true);

    try {
      const response = await axiosInstance.post(`wishlist/${id}/toggle`);

      if (response.status === 200 && response.data.status) {
        setIsInWishlist(response.data.data.isInWishlist);
        ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      ToastAndroid.show('Failed to update wishlist', ToastAndroid.SHORT);
    } finally {
      setWishlistLoading(false);
    }
  };

  const fetchWishlistStatus = async () => {
    try {
      const response = await axiosInstance.get(`wishlist/${id}/status`);

      if (response.status === 200 && response.data.status) {
        setIsInWishlist(response.data.data.isInWishlist);
      }
    } catch (error) {
      console.log('Error fetching wishlist status:', error.response?.data);
    }
  };

  const fetchStock = async (prodId = id) => {
    try {
      const response = await axiosInstance.get(`/stock/by-product/${prodId}`);
      if (response.status === 200 && response.data.status) {
        setStockData(response.data.data);
      }
    } catch (error) {
      console.log('Error fetching stock:', error.response?.data);
    }
  };

  const handlePaymentSuccess = useCallback(async () => {
    //setPaymentSuccess(true);
    const item = showDetails;
    if (!item) return;

    // console.log(order);

    try {
      // const existingOrders = await AsyncStorage.getItem('orders');
      // const orders = existingOrders ? JSON.parse(existingOrders) : [];

      // const newOrders = [...orders, order];
      // await AsyncStorage.setItem('orders', JSON.stringify(newOrders));

      ToastAndroid.show('Order Placed successfully!', ToastAndroid.SHORT);
      //const storedorders = await AsyncStorage.getItem('orders');
      //console.log('Created Order:', storedorders);
    } catch (error) {
      console.error('Failed to store order:', error);
    }
  }, [showDetails, id, counter]);

  // ============ OPTIMIZED DATA FETCHING WITH LAZY LOADING ============
  useEffect(() => {
    const fetchProductAndVariants = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // Use OPTIMIZED endpoint with variant metadata only
        const response = await axiosInstance.get(
          `/product-details/${id}/with-variant-metadata`
        );

        if (response.status === 200 && response.data.status) {
          const {
            parent,
            variantMetadata: metadata,
            hasVariants: hasVars,
            requestedVariantId,
          } = response.data.data;

          if (hasVars && metadata && metadata.length > 0) {
            // ========== PRODUCT HAS VARIANTS ==========
            setHasVariants(true);
            setParentProduct(parent);
            setVariantMetadata(metadata); // Store lightweight metadata

            // Extract ALL variant attributes dynamically
            const allAttributes = extractVariantAttributeTypes(metadata);
            setVariantAttributes(allAttributes);

            // Determine which variant to load
            let variantToLoad = null;

            // Check route params for specific variant
            const variantIdFromRoute = variantId || requestedVariantId;

            if (variantIdFromRoute) {
              // Load specific variant from route
              variantToLoad = metadata.find(v => v._id === variantIdFromRoute);
              console.log('📍 Loading variant from route:', variantIdFromRoute);
            }

            if (!variantToLoad) {
              // Load first available variant
              variantToLoad = metadata.find(v => v.stockCount > 0) || metadata[0];
            }

            // Fetch full variant details
            if (variantToLoad) {
              const fullVariant = await loadVariantDetails(
                variantToLoad._id,
                parent._id
              );

              if (fullVariant) {
                setSelectedVariant(fullVariant);
                setSelectedAttributes(fullVariant.variantAttributes || {});
                setProduct(fullVariant);
                setShowDetails(fullVariant);
                setSeller(parent.sellerId);

                // Fetch stock for selected variant
                await fetchStock(fullVariant._id);

                // console.log('✅ Product with variants loaded (OPTIMIZED):', {
                //   parent: parent.title,
                //   totalVariants: metadata.length,
                //   loadedVariant: fullVariant.sku,
                //   attributes: allAttributes,
                // });
              }
            }
          } else {
            // ========== SINGLE PRODUCT WITHOUT VARIANTS (BACKWARD COMPATIBLE) ==========
            setHasVariants(false);
            const productData = parent;

            if (Array.isArray(productData.images)) {
              const updatedImages = productData.images.map(
                image => `${AWS_CDN_URL}${image.key}`
              );
              productData.signedImages = updatedImages;
            }

            await fetchStock(id);
            setProduct(productData);
            setShowDetails(productData);
            setSeller(productData.sellerId);

            console.log('✅ Single product loaded (no variants)');
          }

          // Fetch similar products
          try {
            const similarResponse = await axiosInstance.get(
              `product-details/similar-products/${id}`
            );
            if (similarResponse.status === 200 && similarResponse.data.status) {
              const similarData = similarResponse.data.data;
              const processedSimilarProducts = similarData.map(product => ({
                ...product,
                signedImages: Array.isArray(product.images)
                  ? product.images.map(image => `${AWS_CDN_URL}${image.key}`)
                  : [],
              }));
              setSimilarProducts(processedSimilarProducts);
            }
          } catch (similarErr) {
            console.error('Failed to fetch similar products:', similarErr);
          } finally {
            setSimilarLoading(false);
          }
        } else {
          setErrrors('Failed to fetch product details.');
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setErrrors(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndVariants();
    fetcReviewData();
    if (user) {
      fetchWishlistStatus();
    }
  }, [id, user, variantId]);

  const [seller, setSeller] = useState(null);

  const handlePress = () => {
    setProductModalVisible(true);
  };

  const handleGoBack = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const name = (await AsyncStorage.getItem('accessToken')) || '';
      if (!name) {
        navigation.navigate('Login');
      } else {
        navigation.reset({
          index: 0,
          routes: [{name: 'bottomtabbar'}],
        });
      }
    }
  };

  const onBackPress = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }
    const name = (await AsyncStorage.getItem('accessToken')) || '';
    if (!name) {
      navigation.navigate('Login');
    } else {
      navigation.reset({
        index: 0,
        routes: [{name: 'bottomtabbar'}],
      });
    }
    return true;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => backHandler.remove();
  }, [navigation]);


  const fetcReviewData = async () => {
    if (!id) return;
    try {
      const response = await axiosInstance.get(`/review/product/${id}`);
      setReviews(response.data.data);
      setReviewsData(response?.data?.data?.reviews);
    } catch (error) {
      console.log('Error fetching reviews data:', error);
    }
  };

  const fetchSellerPerformance = async sellerId => {
    if (!sellerId) return;
    try {
      const response = await axiosInstance.get(`/order/performance/${sellerId}`);
      if (response.data.status && response.data.data) {
        setSellerPerformance({
          totalProductsSold: response.data.data.totalProductsSold || 0,
          averageShippingDays: response.data.data.averageShippingDays || 0,
        });
      }
    } catch (error) {
      console.log('Error fetching seller performance:', error);
    }
  };

  useEffect(() => {
    if (product?.sellerId?.userInfo?._id) {
      fetchSellerPerformance(product?.sellerId?.userInfo?._id);
    }
  }, [product?.sellerId?.userInfo?._id]);

  const {
    title,
    description,
    images = [],
    weight,
    sellerId,
    Material,
  } = product || {};

  const productPrice = flashSale?.flashPrice || product?.productPrice;
  const MRP = product?.MRP;
  //const quantity = flashSale?.currentFlashStock || stockData?.quantity;

  // For variant products, use selected variant's stock; for single products, use stockData
  const availableStock = hasVariants && selectedVariant
    ? (selectedVariant.stockId?.quantity ?? 0)
    : (stockData?.quantity ?? 0);


  const SuccessModalMemo = useMemo(
    () => (
      <SuccessModal
        visible={paymentSuccessModalVisible}
        onClose={() => setPaymentSuccessModalVisible(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    ),
    [paymentSuccessModalVisible]
  );

  const ProductModalMemo = useMemo(
    () => (
      <ProductModal
        quantity={counter}
        product={showDetails}
        sourceType="static"
        addressId={selectedAddress?._id}
        visible={productModalVisible}
        onClose={() => setProductModalVisible(false)}
        onPay={() => {
          setProductModalVisible(false);
          setPaymentSuccessModalVisible(true);
        }}
      />
    ),
    [productModalVisible, showDetails]
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primaryButtonColor} />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  if (!showDetails && erros && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={50} color="#CF6679" />
        <Text style={styles.errorText}>Failed to load product details.</Text>
        <Text style={styles.errorSubText}>{erros}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => handleGoBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const warranty = showDetails?.warranty;

  const profileURL = sellerId?.userInfo?.profileURL?.key
    ? `${AWS_CDN_URL}${sellerId?.userInfo?.profileURL?.key}`
    : null;

  const discountPercentage = MRP ? Math.round(((MRP - productPrice) / MRP) * 100) : 0;

  const getStockStatus = () => {
    if (availableStock === 0 || availableStock == null) {
      return 'out-of-stock';
    } else if (availableStock < 10) {
      return 'low-stock';
    }
    return 'in-stock';
  };

  const stockStatus = getStockStatus();
  const renderItem = ({item, index}) => (
    <TouchableOpacity
      style={{width: screenWidth, height: 300}}
      onPress={() => {
        setActiveImageIndex(index);
        setIsImageViewVisible(true);
      }}
      activeOpacity={0.9}>
      <Image
        source={{
          uri:
            `${AWS_CDN_URL}${item?.key}` ||
            'https://via.placeholder.com/400x200/121212/FFFFFF?text=No+Image',
        }}
        style={{width: '100%', height: 300, resizeMode: 'cover'}}
        onLoadStart={() => setImageLoading(true)}
        onLoadEnd={() => setImageLoading(false)}
      />
      {imageLoading && (
        <View style={styles.imageLoader}>
          <ActivityIndicator size="small" color={colors.primaryButtonColor} />
        </View>
      )}
     <LinearGradient
        colors={['rgba(18, 18, 18, 0)', 'rgba(18, 18, 18, 0.8)', '#121212']}
        style={styles.gradient}
      />
    </TouchableOpacity>
  );
  const getRatingPercentage = rating => {
    const totalRatings = reviews?.total || 0;
    const count = reviews?.ratingStats?.[rating] || 0;
    if (totalRatings === 0) return 0;
    return ((count / totalRatings) * 100).toFixed(0); // rounded to integer
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: colors.primaryColor}}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        <FlatList
          data={[1]}
          keyExtractor={(item, index) => index.toString()}
          renderItem={item => {
            return (
              <>
                <View style={{position: 'relative'}}>
                  {SuccessModalMemo}
                  {ProductModalMemo}
                  <FlatList
                    ref={flatListRef}
                    data={images}
                    renderItem={renderItem}
                    horizontal
                    pagingEnabled
                    keyExtractor={(item, index) => index.toString()}
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                  />

                  {/* Pagination Dots */}
                  {images.length > 1 && (
                    <View style={styles.pagination}>
                      {images.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.dot,
                            {
                              backgroundColor:
                                index === activeImageIndex ? '#ffcc00' : '#888', //#BB86FC
                            },
                          ]}
                        />
                      ))}
                    </View>
                  )}

                  {/*Back Button*/}
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                      if (navigation.canGoBack()) navigation.goBack();
                      else onBackPress();
                    }}>
                    <Icon name="arrow-left" size={24} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/*Like Button*/}
                  <TouchableOpacity
                    style={styles.likeButton}
                    onPress={handleToggleWishlist}
                    disabled={WishlistLoading}>
                    {WishlistLoading ? (
                      <Entypo
                        name="dots-three-horizontal"
                        size={20}
                        color="#ffffff"
                      />
                    ) : isInWishlist ? (
                      <FontAwesome name="heart" size={20} color="#ffffff" />
                    ) : (
                      <Icon name="heart" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={{padding: 16}}>
                  <View
                    style={{
                      backgroundColor: '#222',
                      borderRadius: 16,
                      padding: 16,
                      paddingBottom: 6,
                    }}>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 20,
                        fontWeight: 'bold',
                        width: '92%',
                        flex: 1,
                      }}>
                      {title}
                      {/* Black Boots #001 */}
                    </Text>
                    {/* <Text
                      style={{color: '#aaa', marginVertical: 10, marginTop: 15}}
                      numberOfLines={3}>
                      {description}
                    </Text> */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}>
                      {reviews?.averageRating > 0 && (
                        <View
                          style={{
                            alignItems: 'center',
                            flexDirection: 'row',
                            backgroundColor: '#111',
                            alignSelf: 'center',
                            paddingHorizontal: 6,
                            paddingVertical: 0,
                            borderRadius: 8,
                          }}>
                          <FontAwesome name="star" size={14} color="#ffc107" />
                          <Text style={{color: 'white', marginLeft: 4}}>
                            {reviews?.averageRating}
                          </Text>
                        </View>
                      )}
                      {reviews?.total > 0 && (
                        <Text style={{color: 'white', marginLeft: 4}}>
                          {formatFollowerCount(reviews?.total)} reviews
                        </Text>
                      )}
                     
                    </View>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 'bold',
                      }}>
                      ₹{productPrice}{' '}
                      <Text
                        style={{
                          color: '#888',
                          textDecorationLine: 'line-through',
                          fontSize: 20,
                        }}>
                        ₹{MRP}
                      </Text>{' '}
                      {discountPercentage > 0 && (
                        <Text style={{color: '#4caf50', fontSize: 16}}>
                          {discountPercentage}% off
                        </Text>
                      )}
                    </Text>

                    {/* ============ DYNAMIC VARIANT SELECTION UI ============ */}
                    {hasVariants && variantMetadata.length > 0 && Object.keys(variantAttributes).length > 0 && (
                      <View style={{marginTop: 16}}>
                        {/* Render each variant attribute dynamically */}
                        {Object.entries(variantAttributes).map(([attributeKey, availableValues]) => {
                          const selectedValue = selectedAttributes[attributeKey];
                          const attributeLabel = attributeKey.charAt(0).toUpperCase() + attributeKey.slice(1);
                          
                          // Special rendering for color attribute (with visual swatches)
                          if (attributeKey === 'color') {
                            return (
                              <View key={attributeKey} style={{marginBottom: 16}}>
                                <Text style={{color: 'white', fontSize: 14, fontWeight: '600', marginBottom: 8}}>
                                  Select {attributeLabel}: <Text style={{color: '#ffcc00', fontWeight: 'bold'}}>{selectedValue}</Text>
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                  <View style={{flexDirection: 'row', gap: 8}}>
                                    {availableValues.map((value) => {
                                      const colorMetadata = variantMetadata.find(v =>
                                        v.variantAttributes?.color === value
                                      );
                                      const isSelected = selectedValue === value;
                                      const thumbnailUrl = colorMetadata?.thumbnailImage 
                                        ? `${AWS_CDN_URL}${colorMetadata.thumbnailImage}` 
                                        : null;
                                      
                                      return (
                                        <TouchableOpacity
                                          key={value}
                                          onPress={() => handleAttributeChange(attributeKey, value)}
                                          disabled={variantLoading}
                                          style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            borderWidth: 2,
                                            borderColor: isSelected ? '#ffcc00' : '#666',
                                            opacity: variantLoading ? 0.5 : 1,
                                          }}>
                                          {thumbnailUrl ? (
                                            <Image
                                              source={{uri: thumbnailUrl}}
                                              style={{width: '100%', height: '100%'}}
                                              resizeMode="cover"
                                            />
                                          ) : (
                                            <View style={{
                                              width: '100%', 
                                              height: '100%', 
                                              backgroundColor: value.toLowerCase() === 'red' ? '#ef4444' :
                                                value.toLowerCase() === 'blue' ? '#3b82f6' :
                                                value.toLowerCase() === 'green' ? '#10b981' :
                                                value.toLowerCase() === 'yellow' ? '#eab308' :
                                                value.toLowerCase() === 'black' ? '#000000' :
                                                value.toLowerCase() === 'white' ? '#ffffff' : '#6b7280',
                                              justifyContent: 'center', 
                                              alignItems: 'center'
                                            }}>
                                              <Text style={{
                                                color: value.toLowerCase() === 'black' || value.toLowerCase() === 'blue' ? '#fff' : '#000',
                                                fontSize: 10, 
                                                fontWeight: 'bold'
                                              }}>
                                                {value}
                                              </Text>
                                            </View>
                                          )}
                                          {isSelected && (
                                            <View style={{
                                              position: 'absolute', 
                                              top: 2, 
                                              right: 2, 
                                              backgroundColor: '#ffcc00', 
                                              borderRadius: 10, 
                                              width: 16, 
                                              height: 16, 
                                              justifyContent: 'center', 
                                              alignItems: 'center'
                                            }}>
                                              <Icon name="check" size={10} color="#000" />
                                            </View>
                                          )}
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </View>
                                </ScrollView>
                              </View>
                            );
                          }
                          
                          // Default rendering for all other attributes (size, material, storage, etc.)
                          return (
                            <View key={attributeKey} style={{marginBottom: 16}}>
                              <Text style={{color: 'white', fontSize: 14, fontWeight: '600', marginBottom: 8}}>
                                Select {attributeLabel}: <Text style={{color: '#ffcc00', fontWeight: 'bold'}}>{selectedValue}</Text>
                              </Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{flexDirection: 'row', gap: 8}}>
                                  {availableValues.map((value) => {
                                    const isAvailable = isAttributeCombinationAvailable(attributeKey, value);
                                    const isSelected = selectedValue === value;
                                    
                                    return (
                                      <TouchableOpacity
                                        key={value}
                                        onPress={() => isAvailable && handleAttributeChange(attributeKey, value)}
                                        disabled={!isAvailable || variantLoading}
                                        style={{
                                          minWidth: 60,
                                          paddingHorizontal: 16,
                                          paddingVertical: 10,
                                          borderRadius: 8,
                                          backgroundColor: isSelected ? '#ffcc00' : '#333',
                                          borderWidth: 1,
                                          borderColor: isSelected ? '#ffcc00' : '#666',
                                          opacity: !isAvailable || variantLoading ? 0.4 : 1,
                                        }}>
                                        <Text style={{
                                          color: isSelected ? '#000' : '#fff', 
                                          fontSize: 13, 
                                          fontWeight: '600', 
                                          textAlign: 'center',
                                          textDecorationLine: !isAvailable ? 'line-through' : 'none'
                                        }}>
                                          {value}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </ScrollView>
                            </View>
                          );
                        })}

                       
                      </View>
                    )}

                    {/* Stock Status Indicator for Variants */}
                    {availableStock !== undefined && availableStock <= 10 && (
                      <View style={{
                        flexDirection: 'row', 
                        alignItems: 'center', 
                       // backgroundColor: availableStock === 0 ? '#ff4444' : '#ff9900', 
                        borderRadius: 8, 
                        paddingHorizontal: 10, 
                        paddingVertical: 6, 
                       // marginTop: 12,
                        width: '60%'
                      }}>
                        <Icon name="alert-circle" size={14} color={availableStock <= 0 ? '#ff4444' : '#ff9900'} />
                        <Text style={{color: availableStock === 0 ? '#ff4444' : '#ff9900',  fontSize: 12, fontWeight: '600', marginLeft: 6}}>
                          {availableStock <= 0 ? 'Out of stock' : `Only ${availableStock} items left in stock!`}
                        </Text>
                      </View>
                    )}

                    {/* Quantity Selector */}
                    <View>
                     
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                        {stockStatus !== 'out-of-stock' && (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginVertical: 16,
                              opacity: stockStatus === 'out-of-stock' ? 0.5 : 1,
                              // backgroundColor:'red'
                            }}>
                            <TouchableOpacity
                              onPress={() => {
                                if (counter > 1) {
                                  setCounter(prev => prev - 1);
                                }
                              }}
                              disabled={
                                stockStatus === 'out-of-stock' || counter <= 1
                              }
                              style={{
                                borderWidth: 0.5,
                                borderColor:
                                  stockStatus === 'out-of-stock'
                                    ? '#666'
                                    : '#333',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 40,
                                width: 40,
                                backgroundColor:
                                  stockStatus === 'out-of-stock'
                                    ? '#666'
                                    : '#333',
                                borderRadius: 20,
                              }}>
                              <Text
                                style={{
                                  color: 'white',
                                  fontSize: 18,
                                  opacity:
                                    counter <= 1 ||
                                    stockStatus === 'out-of-stock'
                                      ? 0.5
                                      : 1,
                                }}>
                                -
                              </Text>
                            </TouchableOpacity>

                            <Text
                              style={{
                                color: 'white',
                                marginHorizontal: 16,
                                fontSize: 18,
                              }}>
                              {counter}
                            </Text>

                            <TouchableOpacity
                              onPress={() => {
                                if (counter < availableStock) {
                                  setCounter(counter + 1);
                                }
                              }}
                              disabled={
                                stockStatus === 'out-of-stock' ||
                                counter >= availableStock
                              }
                              style={{
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 40,
                                width: 40,
                                backgroundColor:
                                  stockStatus === 'out-of-stock'
                                    ? '#666'
                                    : counter >= availableStock
                                    ? '#999'
                                    : '#ffcc00',
                                borderRadius: 20,
                              }}>
                              <Text
                                style={{
                                  color:
                                    stockStatus === 'out-of-stock'
                                      ? '#ccc'
                                      : '#000',
                                  fontSize: 18,
                                  opacity:
                                    counter >= availableStock ||
                                    stockStatus === 'out-of-stock'
                                      ? 0.5
                                      : 1,
                                }}>
                                +
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {product?.flashSale?.isActive && (
                          <View>
                            <Text style={{color: '#fff'}}>
                              Flash Sale ends in
                            </Text>
                            <Text
                              style={{
                                textAlign: 'right',
                                color: 'red',
                                fontSize: 12,
                              }}>
                              {timeLeft.days || '0'}d {timeLeft.hours || '0'}h{' '}
                              {timeLeft.minutes || '0'}m{' '}
                              {timeLeft.seconds || '0'}s
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Additional Stock Warning */}
                      {stockStatus === 'low-stock' &&
                        counter > availableStock - 3 && (
                          <Text
                            style={{
                              color: '#ff9900',
                              fontSize: 12,
                              fontStyle: 'italic',
                              marginTop: 8,
                            }}>
                            Low Stock Order now
                          </Text>
                        )}
                      {counter > 1 && (
                        <Text
                          style={{
                            color: '#ff9900',
                            fontSize: 12,
                            fontStyle: 'italic',
                            marginTop: 8,
                          }}>
                          Total Amount (₹){productPrice * counter}
                        </Text>
                      )}
                      {stockStatus === 'out-of-stock' && (
                        <Text
                          style={{
                            color: '#ff4444',
                            fontSize: 12,
                            fontStyle: 'italic',
                            marginTop: 8,
                          }}>
                          Out of Stock!
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.shareButtonCard}
                      // onPress={shareProfile}
                      onPress={() => setIsShareOpen(true)}>
                      <Entypo name="share" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  {/* Product Details */}
                  <View
                    style={{
                      backgroundColor: '#222',
                      marginTop: 12,
                      borderRadius: 8,
                      paddingLeft: 20,
                      paddingVertical: 18,
                    }}>
                    <View>
                      <Text
                        style={{
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: 16,
                          marginBottom: 6,
                        }}>
                        Product Details
                      </Text>

                      {Material && (
                        <Text style={{color: '#aaa', marginVertical: 4}}>
                          Material: Synthetic/Natural
                        </Text>
                      )}

                      {warranty?.hasWarranty && (
                        <Text style={{color: '#aaa', marginVertical: 4}}>
                          Warranty: {warranty?.duration}
                        </Text>
                      )}
                      {weight && (
                        <Text style={{color: '#aaa'}}>
                          Weight: {weight?.value} {weight?.unit}
                        </Text>
                      )}

                      <Text
                        style={{color: '#aaa', marginVertical: 4}}
                        numberOfLines={expanded ? 0 : 3}>
                        {description}
                      </Text>
                      {description?.length > 0 && (
                        <TouchableOpacity
                          onPress={() => setExpanded(!expanded)}>
                          <Text style={{color: '#007bff', marginTop: 4}}>
                            {expanded ? 'View Less' : 'View More'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {/* Seller Info */}
                  <View
                    style={{
                      backgroundColor: '#222',
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderRadius: 16,
                    }}>
                    {profileURL ? (
                      <Image
                        source={{uri: profileURL}}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: '#ffcc00',
                          alignSelf: 'flex-start',
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: '#ffcc00',
                          backgroundColor: '#333',
                          alignSelf: 'flex-start',
                        }}>
                        <Text
                          style={{
                            color: '#fff',
                            alignSelf: 'center',
                            marginTop: 8,
                          }}>
                          {sellerId?.companyName?.charAt(0).toUpperCase() ||
                            'A'}
                        </Text>
                      </View>
                    )}
                    <View style={{marginLeft: 12, flex: 1}}>
                      <Text style={{color: 'white', marginTop: 8}}>
                        {/* @ */}
                        {product?.sellerId?.companyName ||
                          product?.sellerId?.userInfo?.userName ||
                          'Anonymous seller'}
                      </Text>
                      <View style={{flexDirection: 'row', width: 130}}>
                       
                        <View style={{paddingTop: 10, alignItems: 'center'}}>
                          <Text style={{color: '#ddd', fontSize: 12}}>
                            {formatFollowerCount(
                              product?.sellerId?.userInfo?.followersCount,
                            )}
                          </Text>
                          <Text style={{color: '#ddd', fontSize: 8}}>
                            Followers
                          </Text>
                        </View>

                        <View
                          style={{
                            flex: 1,
                            paddingTop: 10,
                            alignItems: 'center',
                          }}>
                          <Text style={{color: '#ddd', fontSize: 12}}>
                            {formatFollowerCount(sellerPerformance.totalProductsSold)}
                          </Text>
                          <Text style={{color: '#ddd', fontSize: 8}}>
                            Products Sold
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        navigation.navigate('ViewSellerProdile', {
                          id: product?.sellerId?.userInfo?.userName,
                        });
                      }}
                      style={{
                        borderWidth: 0.5,
                        backgroundColor: '#ffcc00',
                        marginLeft: 'auto',
                        paddingVertical: 3,
                        padding: 9,
                        borderRadius: 8,
                      }}>
                      <Text style={{color: '#000'}}>View Profile</Text>
                    </TouchableOpacity>
                  </View>
                  <AskSellerCard
                    seller={product?.sellerId}
                    user={user}
                    product={product}
                    productId={product?._id}
                  />

                  <ExpandableAddressSection
                    selectedAddress={selectedAddress}
                    pincode={pincode}
                    setPinCode={setPinCode}
                    product={product}
                    navigation={navigation}
                    quantity={counter}
                    setDeliveryDetails={setDeliveryDetails}
                    setDeliveryData={setDeliveryData}
                  />

              
                  {/* User Ratings & Reviews*/}
                  <View style={styles.ratingsContainer}>
                    <View style={styles.headerContainer}>
                      <FontAwesome name="star" size={16} color="#ffcc00" />
                      <Text style={styles.headerTitle}>Ratings & Reviews</Text>
                      <View style={styles.headerBadge}>
                        <Text style={styles.badgeText}>
                          {formatFollowerCount(reviews?.total) || 0}
                        </Text>
                      </View>
                    </View>

                    {/* Overall Rating Section*/}
                    <View style={styles.overallRatingContainer}>
                      {/* Left Side - Rating Score*/}
                      <View style={styles.ratingScoreContainer}>
                        <Text style={styles.ratingScore}>
                          {reviews?.averageRating}
                        </Text>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map(star => {
                            const fullStars = Math.floor(
                              reviews?.averageRating || 0,
                            );
                            const halfStar =
                              (reviews?.averageRating || 0) - fullStars >= 0.5;
                            return (
                              <FontAwesome
                                key={star}
                                name={
                                  star <= fullStars
                                    ? 'star'
                                    : star === fullStars + 1 && halfStar
                                    ? 'star-half-o'
                                    : 'star-o'
                                }
                                size={14}
                                color="#ffcc00"
                                style={styles.starIcon}
                              />
                            );
                          })}
                        </View>

                        <Text style={styles.ratingCount}>
                          {formatFollowerCount(reviews?.total) || 0} ratings
                        </Text>
                      </View>

                      {/* Right Side - Rating Distribution*/}
                      <View style={styles.ratingDistribution}>
                        {[5, 4, 3, 2, 1].map(rating => {
                          const percentage = getRatingPercentage(rating);
                          return (
                            <View key={rating} style={styles.ratingRow}>
                              <Text style={styles.ratingLabel}>{rating}</Text>
                              <FontAwesome
                                name="star"
                                size={10}
                                color="#ffcc00"
                              />
                              <View style={styles.progressBarContainer}>
                                <View
                                  style={[
                                    styles.progressBar,
                                    {width: `${percentage}%`},
                                  ]}
                                />
                              </View>
                              <Text style={styles.ratingPercentage}>
                                {percentage}%
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                    {/* Reviews List */}
                  </View>

                  <View>
                    <ViewReview
                      reviews={reviewsData}
                      setReviews={setReviewsData}
                      fetchReviews={fetcReviewData}
                    />
                  </View>

                  {/* Similar Products */}
                  {similarProducts && similarProducts.length > 0 && (
                    <>
                      <Text
                        style={{
                          color: 'white',
                          fontWeight: 'bold',
                          marginTop: 16,
                        }}>
                        Similar Products
                      </Text>
                      <FlatList
                        data={similarProducts}
                        horizontal
                        ListEmptyComponent={
                          similarLoading ? (
                            <ActivityIndicator
                              size={'small'}
                              color={colors.primaryButtonColor}
                            />
                          ) : null
                        }
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{marginBottom: 70}}
                        keyExtractor={(item, index) =>
                          item?._id || index.toString()
                        }
                        renderItem={({item, index}) => (
                          <TouchableOpacity
                            key={item?._id || index}
                            onPress={() =>
                              navigation.push('ProductDetails', {id: item._id})
                            }
                            style={{marginRight: 10}}>
                            <View
                              style={{
                                backgroundColor: '#222',
                                padding: 6,
                                borderRadius: 10,
                                width: 130,
                                alignItems: 'center',
                              }}>
                              <Image
                                source={{
                                  uri: item?.images?.[0]?.key
                                    ? `${AWS_CDN_URL}${item.images[0].key}`
                                    : 'https://via.placeholder.com/80x80/444/444', // fallback
                                }}
                                style={{
                                  width: 100,
                                  height: 100,
                                  backgroundColor: '#444',
                                  marginBottom: 8,
                                  borderRadius: 4,
                                }}
                                resizeMode="cover"
                              />
                              <Text
                                style={{
                                  color: 'white',
                                  textAlign: 'center',
                                  fontSize: 12,
                                }}
                                numberOfLines={1}
                                ellipsizeMode="tail">
                                {item?.title || 'Untitled'}
                              </Text>
                              <View style={{flexDirection: 'row', gap: 4}}>
                                <Text
                                  style={{
                                    color: '#ffcc00',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    fontSize: 12,
                                  }}>
                                  ₹{item?.productPrice ?? 'N/A'}
                                </Text>
                                <Text
                                  className="line-through"
                                  style={{
                                    color: '#777',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    fontSize: 12,
                                  }}>
                                  ₹{item?.MRP ?? 'N/A'}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        )}
                      />
                    </>
                  )}

          
                </View>
              </>
            );
          }}
        />

        {openPreview && (
          <CheckoutSlider
            // ref={bottomSheetRef}
            isOpen={openPreview}
            onClose={() =>{
              setCounter(1)
              setIsOpenPreview(!openPreview)}}
            product={product}
            type={flashSale ? 'flash_sale' : 'static'}
            flashSaleId={product.flashSale.flashSaleId}
            inintalQuantity={counter}
            // isProcessing={isProcessing}
            // flashSale={flashSale}
            // deliveryDetails={deliveryDetails}
            // deliveryLoading={deliveryData}
            // counter={counter}
            // setCounter={setCounter}
            // availableStock={availableStock}
            // onPlaceOrder={() => handleRazorpayPay()}
          />
        )}

        <Modal visible={isImageViewVisible} transparent={true}>
          <ImageView
            imageUrls={images.map(img => ({url: `${AWS_CDN_URL}${img?.key}`}))}
            index={activeImageIndex}
            enableSwipeDown
            onSwipeDown={() => setIsImageViewVisible(false)}
            onClick={() => setIsImageViewVisible(false)}
            enablePreload
            renderHeader={() => (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsImageViewVisible(false)}>
                <Icon name="x" size={30} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          />
        </Modal>
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
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          shareContent={`Check out this ${showDetails?.title} product!`}
          shareUrl={`${shareUrl}user/product/${showDetails?._id}`}
          onShare={handleShare}
          source={'product'}
        />
      </KeyboardAvoidingView>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          left: 0,
          backgroundColor: '#222',
          paddingVertical: 4,
          paddingBottom: Math.max(insets.bottom-15, 4),
        }}>
        {product?.reserveForLive ? (
          <View
            style={{
              backgroundColor: '#333',
              paddingVertical: 16,
              paddingHorizontal: 20,
              marginHorizontal: 16,
              marginBottom: 20,
              borderRadius: 50,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
            <Ionicons name="videocam" size={20} color="#ffcc00" />
            <Text style={{color: '#ffcc00', fontSize: 16, fontWeight: '600'}}>
              Only available on livestream
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleBuyNow}
            disabled={
              stockStatus === 'out-of-stock' ||
              !deliveryDetails ||
              deliveryData !== null
            }
            style={{
              opacity: stockStatus === 'out-of-stock' || !deliveryDetails || deliveryData !== null ? 0.4 : 1,
              position: 'relative',
              flexDirection: 'row',
              borderRadius: 50,
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              backgroundColor: 'transparent',
            }}>
            <SwipeableBuyButton
              onComplete={handleBuyNow}
            />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  ratingsContainer: {
    padding: 12,
    backgroundColor: '#222',
    borderRadius: 8,
    // maxHeight:400,
    marginTop: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  headerBadge: {
    backgroundColor: '#ffcc00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallRatingContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  ratingScoreContainer: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  ratingScore: {
    color: '#ffcc00',
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  starIcon: {
    marginHorizontal: 1,
  },
  ratingCount: {
    fontSize: 11,
    color: '#999',
  },
  ratingDistribution: {
    flex: 1,
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  ratingLabel: {
    color: '#ddd',
    fontSize: 12,
    width: 8,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#444',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffcc00',
    borderRadius: 4,
  },
  ratingPercentage: {
    color: '#999',
    fontSize: 11,
    width: 28,
    textAlign: 'right',
  },
  photoReviewsSection: {
    marginBottom: 16,
  },
  photoReviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  photoReviewsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoReviewsCount: {
    color: '#999',
    fontSize: 12,
  },
  photoReviewsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  photoReviewItem: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoReviewImage: {
    width: '100%',
    height: '100%',
  },
  photoReviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
  },
  photoReviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  photoReviewRatingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  morePhotosButton: {
    width: 60,
    height: 60,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#555',
    borderStyle: 'dashed',
  },
  morePhotosText: {
    color: '#ffcc00',
    fontSize: 14,
    fontWeight: 'bold',
  },
  morePhotosSubtext: {
    color: '#999',
    fontSize: 10,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 16,
    marginRight: 8,
    gap: 4,
  },
  activeFilter: {
    backgroundColor: '#ffcc00',
  },
  filterText: {
    color: '#999',
    fontSize: 12,
  },
  activeFilterText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonCard: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#E1E1E1',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  errorText: {
    color: '#E1E1E1',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubText: {
    color: '#ccc',
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pagination: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});
export default ProductDetails;
