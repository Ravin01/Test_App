/* eslint-disable react-native/no-inline-styles */
import React, {
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  BackHandler,
  ToastAndroid,
  Share,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';

import {useFocusEffect} from '@react-navigation/native';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {shareUrl} from '../../../Config';
import {colors, overlay} from '../../Utils/Colors';
import {AWS_CDN_URL} from '../../Utils/aws';
import axiosInstance from '../../Utils/Api';
import {AuthContext} from '../../Context/AuthContext';
import VerificationFlowModal from './VerificationFlowScreen';
import SellerHeader from '../SellerComponents/SellerForm/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { formatFollowerCount } from '../../Utils/dateUtils';
import CheckoutSlider from '../Reuse/CheckOutGlobal';
import { Discount, shopVideo } from '../../assets/assets';
import FlashSaleTimer from '../GloabalSearch/FlashSaleTimer';
//import { useStreamEventCallbacks } from '../../Context/StreamEventContext';
import { useStreamEventTimestamps } from '../../Context/StreamEventContext';

const {width} = Dimensions.get('window');
const ITEM_WIDTH = width / 3 - 8;

const endpointMap1 = {
  show: '/register-show/my-registrations',
  clip: '/shoppable-videos/saved/my-videos',
  product: '/wishlist/productsave',
};

const endpointMap = {
  show: (sellerId) => `/profile/${sellerId}/shows`,
  clip: (sellerId) => `/profile/${sellerId}/shoppableVideos`,
  product: (sellerId) => `/profile/${sellerId}/products`,
};

const Store = React.memo(({navigation, route}) => {
  const {user, setuser}: any = useContext(AuthContext);

  const {sellerId, tabName} = route.params || {};

  const lastBackPressed = useRef(0);

  const [savedTab, setSavedTab] = useState(tabName || 'show');

  const [savedDataMap, setSavedDataMap] = useState({
    show: {data: [], page: 1, hasMore: true},
    clip: {data: [], page: 1, hasMore: true},
    product: {data: [], page: 1, hasMore: true},
  });

  console.log('savedDataMap',savedDataMap);

  const [loadingMap, setLoadingMap] = useState({
    show: false,
    clip: false,
    product: false,
  });

  const [refreshing, setRefreshing] = useState(false);

console.log('saved screen');
  const savedShows = [];

  const [savedProducts, setSavedProducts] = useState([]);

  const [wishlistItems, setWishlistItems] = useState(new Set());
  const [wishlistLoading, setWishlistLoading] = useState(new Set());
  
  // Checkout slider state
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

const { lastStreamLiveAt, lastStreamEndedAt } = useStreamEventTimestamps();

useEffect(() => {
  if (lastStreamLiveAt || lastStreamEndedAt) {
    handleRefresh();
  }
}, [lastStreamLiveAt, lastStreamEndedAt]);

  // Subscribe to stream events to auto-refresh when streams go live or end
  // Uses the global AppSync subscription from StreamEventContext (more efficient)
  // const { registerStreamCallbacks } = useStreamEventCallbacks();
  
  // useEffect(() => {
  //   const unsubscribe = registerStreamCallbacks({
  //     onStreamLive: async () => {
  //       console.log('🎬 [Store] Stream went live, refreshing shows...');
  //       if (savedTab === 'show') {
  //         await handleRefresh();
  //       }
  //     },
  //     onStreamEnded: async () => {
  //       console.log('🛑 [Store] Stream ended, refreshing shows...');
  //       if (savedTab === 'show') {
  //         await handleRefresh();
  //       }
  //     },
  //   });
    
  //   return unsubscribe;
  // }, [savedTab]);


  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      // Clear existing data for current tab
      setSavedDataMap(prev => ({
        ...prev,
        [savedTab]: {
          data: [],
          page: 1,
          hasMore: true,
        },
      }));

      await fetchSavedItems(savedTab, 1);

      // If you're in 'product' tab, refresh wishlist status as well
      // if (savedTab === 'product') {
      //   await fetchWishlistStatuses();
      // }
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSavedItems = async (tab, page = 1) => {
    console.log('Api called');
    const isPaginating = page > 1;
    console.log(savedDataMap[tab]?.hasMore);
    if (loadingMap[tab] || (isPaginating && !savedDataMap[tab]?.hasMore))
      return;

    setLoadingMap(prev => ({...prev, [tab]: true}));

    const endpoint = endpointMap[tab](sellerId);

    try {
      const endpoint = endpointMap[tab](sellerId);
      //  console.log(endpoint);
      //  const response = await axiosInstance.get(endpoint);    //https://dev-be-flykup.onrender.com/api/

      let result = {
        data: [],
        currentPage: page,
        hasMore: false,
      };

      switch (tab) {
        case 'product':
          const productRes = await axiosInstance.get(endpoint, {
            params: {page, limit: 8},
          });

        //  console.log('productRes', productRes.data.data);

          console.log('productRes with pagination', productRes.data);

          const products = productRes.data?.data || [];
          const pagination = productRes.data?.pagination || {};
          
          result = {
            data: products.map(item => ({
              ...item,
              isSaved: item.isInWishlist !== undefined ? item.isInWishlist : true,
            })),
            currentPage: pagination.currentPage || page,
            hasMore: pagination.hasMore || false,
          };
          break;

        case 'show':
          const showResponse = await axiosInstance.get(endpoint, {
            params: {page, limit: 10},
          });

          // console.log('showResponse',showResponse.data.data);

          const shows = showResponse?.data?.data || [];
          const showPagination = showResponse?.data?.pagination || {};
        //  console.log('showResponse with pagination', showResponse.data);
          result = {
            data: shows,
            currentPage: showPagination.currentPage || page,
            hasMore: showPagination.hasMore || false,
          };
          break;
        case 'clip':
          const response = await axiosInstance.get(endpoint, {
            params: {page, limit: 8},
          });

          console.log('clip response with pagination', response.data);

          const videos = response.data?.data || [];
          const clipPagination = response.data?.pagination || {};
          
          result = {
            data: videos.map(v => ({...v, isSaved: true})),
            currentPage: clipPagination.currentPage || page,
            hasMore: clipPagination.hasMore || false,
          };
          break;

        default:
          console.warn(`Unknown tab: ${tab}`);
          break;
      }

      setSavedDataMap(prev => {
        const current = prev[tab] || {};
        return {
          ...prev,
          [tab]: {
            data:
              page === 1
                ? result.data
                : [...(current.data || []), ...result.data],
            page: result.currentPage,
            hasMore: result.hasMore,
          },
        };
      });

      {
        /*
      const response = await axiosInstance.get(endpoint, {
        params: { page, limit: 4 },
      });


      const { videos, totalPages , currentPage} = response.data?.data || {};
    console.log(response.data?.data);
      const updated = (videos || []).map((v) => ({ ...v, isSaved: true }));

      setSavedDataMap((prev) => {
        const current = prev[tab] || {};
        return {
          ...prev,
          [tab]: {
            data: page === 1 ? updated : [...(current.data || []), ...updated],
            page: currentPage,
            hasMore: totalPages ? currentPage < totalPages : false,
          },
        };
      });
  */
      }
    } catch (err) {
      console.log('Error fetching saved videos:', err.message || err);
    } finally {
      setLoadingMap(prev => ({...prev, [tab]: false}));
    }
  };

  useEffect(() => {
    if (
      savedDataMap[savedTab]?.data.length === 0 &&
      savedDataMap[savedTab].hasMore
    ) {
      fetchSavedItems(savedTab, 1);
    }
  }, [savedTab]);

  const handleUnSave = async id => {
    try {
      const response = await axiosInstance.post(`/shoppable-videos/${id}/save`);
      const isSaved = response.data.data?.isSaved;

      ToastAndroid.show(
        isSaved ? 'Video saved!' : 'Video unsaved',
        ToastAndroid.SHORT,
      );

    } catch (error) {
      ToastAndroid.show('Failed to update save status', ToastAndroid.SHORT);
    }
  };

  const handleUnSaveProduct = async id => {
    try {
      const response = await axiosInstance.post(`/wishlist/${id}/toggle`);
      const isSaved = response.data.data?.isInWishlist;

      setSavedDataMap(prevSavedDataMap => {
      return {
        ...prevSavedDataMap,
        product: {
          ...prevSavedDataMap.product,
          data: prevSavedDataMap.product.data.map(product =>
            product._id === id
              ? { ...product, isInWishlist: isSaved }
              : product,
          ),
        },
      };
    });

      ToastAndroid.show(
        isSaved ? 'Added to wishlist!' : 'Removed from wishlist',
        ToastAndroid.SHORT,
      );
    } catch (error) {
      ToastAndroid.show('Failed to update save status', ToastAndroid.SHORT);
    }
  };

  // const fetchWishlistStatuses = async () => {
  //   try {
  //     const products = savedDataMap['product']?.data || [];
  //     if (products.length === 0) return;

  //     console.log('Fetching wishlist status for products:', products.length);
  //     const wishlistPromises = savedProducts?.map(async product => {
  //       try {
  //         const response = await axiosInstance.get(
  //           `wishlist/${product?._id}/status`,
  //         );

  //         if (response.status === 200 && response.data.status) {
  //           return {
  //             productId: product._id,
  //             isInWishlist: response.data.data.isInWishlist,
  //           };
  //         }

  //         return {productId: product._id, isInWishlist: false};
  //       } catch (error) {
  //         console.error(
  //           `Error fetching wishlist status for ${product._id}:`,
  //           error,
  //         );
  //         return {productId: product._id, isInWishlist: false};
  //       }
  //     });

  //     const results = await Promise.all(wishlistPromises);

  //     const wishlistSet = new Set();
  //     results.forEach(({productId, isInWishlist}) => {
  //       if (isInWishlist) {
  //         wishlistSet.add(productId);
  //       }
  //     });

  //     setWishlistItems(wishlistSet);
  //   } catch (error) {
  //     console.error('Error fetching wishlist statuses:', error);
  //   }
  // };

  // useEffect(() => {
  //   if (savedTab === 'product' && savedDataMap['product']?.data?.length > 0) {
  //     fetchWishlistStatuses();
  //   }
  // }, [savedTab, savedDataMap['product']?.data]);

  

const getSavedData = () => savedDataMap[savedTab]?.data || [];

  const getSavedData1 = () => {
    switch (savedTab) {
      case 'product':
        return savedProducts;
      case 'clip':
        return savedVideos;
      case 'show':
        return savedShows;
      default:
        return savedShows;
    }
  };

  const renderSavedItem = ({item}) => {
    switch (savedTab) {
      case 'product':
        return renderSavedProduct({item});
      case 'clip':
        return renderSavedClip({item});
      case 'show':
        return renderSavedShow({item});
      default:
        return renderSavedShow({item});
    }
  };

  // Product item renderer
  const renderSavedProduct = useCallback(
    ({item}) => {
      const isInWishlist = item?.isInWishlist;
      const formatCurrency = amount => {
        if (amount == null || isNaN(amount)) return '';
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(amount);
      };
      
      // Check if product is in active flash sale
      const isFlashSale = item?.flashSale?.isActive;
      const flashData = item?.flashSale;
      const hasValidFlashData = isFlashSale && flashData?.flashPrice && flashData?.endsAt;
      
      // Calculate discount based on flash sale or regular pricing
      const calculateDiscount = (mrp, price) => {
        if (!mrp || mrp <= price) return 0;
        return Math.round(((mrp - price) / mrp) * 100);
      };

      const discountPercent = hasValidFlashData
        ? calculateDiscount(flashData.originalPrice, flashData.flashPrice)
        : calculateDiscount(item?.MRP, item?.productPrice);

      // Determine which price to display
      const displayPrice = hasValidFlashData ? flashData.flashPrice : item?.productPrice;
      const originalPrice = hasValidFlashData ? flashData.originalPrice : item?.MRP;
      const hasDiscount = originalPrice != null && displayPrice != null && originalPrice > displayPrice;
      
        // console.log(item)
      return (
        <TouchableOpacity
          style={[styles.galleryItem, {backgroundColor: '#313236'}]}
         //  style={[styles.galleryItem, {backgroundColor: 'red'}]}
          onPress={() => navigation.navigate('ProductDetails', {
            id: item._id,
            flashSale: hasValidFlashData ? flashData : null,
            type:'static'
          })}>
          <View
            style={[
              styles.imageContainer,
              {padding: 0, height: 110, borderRadius: 0},
            ]}>
            <Image
              source={{uri: `${AWS_CDN_URL}${item?.images[0]?.key}`}}
              style={[
                styles.galleryImage,
                {width: '100%', height: '100%',  borderTopRightRadius: 8,
    borderTopLeftRadius: 8,},
              ]}
            />
          </View>
          <View style={styles.cardBody}>
            {/* {console.log(item.title)} */}
            <Text style={styles.title} numberOfLines={1}>
              {item?.title || 'No Title Provided'}
            </Text>
            <Text
              style={{color: '#ddd', fontSize: 13, marginBottom: 4}}
              numberOfLines={1}>
              {item?.description || 'No Title Provided'}
            </Text>

            {/* <View style={styles.colorContainer}>
              {hasDiscount && discountPercent > 0 ? (
                <View style={styles.discountTag}>
                  <Image
                    source={require('../../assets/images/Discount.png')}
                    style={{height: 15, width: 15}}
                  />
                  <Text style={styles.discountText}>
                    {discountPercent}%|off
                  </Text>
                </View>
              ) : (
                <Text>{''}</Text>
              )}
              <View
                style={{flexDirection: 'row', gap: 2, alignItems: 'center'}}>
                <View style={[styles.color, {backgroundColor: '#000000'}]} />
                <View style={[styles.color, {backgroundColor: '#FFD700'}]} />
                <View style={[styles.color, {backgroundColor: '#FF260D'}]} />
                <View style={[styles.color, {backgroundColor: '#FFBE9D'}]} />
                <Text style={{color: '#777', fontSize: 10}}>4+</Text>
              </View>
            </View> */}
           <View style={[styles.priceContainer]}>
              {/* {price != null && ( */}
              <View className="flex-row flex-wrap gap-2 max-w-[84%] " style={{flexWrap:'wrap',alignItems:'baseline'}}>
              
             <Text allowFontScaling={false} className="text-[11px] font-semibold text-white">
  {formatCurrency(item.productPrice)}
</Text>
             <Text allowFontScaling={false} className="text-[9px] text-gray-400 line-through">
  {formatCurrency(item.MRP)}
</Text>
              </View> 
              {/* )} */}
            <TouchableOpacity
              className="bg-brand-yellow py-2  rounded-sm mt-2 items-center rounded-[18px]"
              onPress={() => {
                const sellerId = item?.sellerId?._id || item?.sellerId;
                if (user?.sellerInfo?._id === sellerId && user?.role === 'seller') {
                  ToastAndroid.show('You cannot purchase your own product', ToastAndroid.SHORT);
                } else {
                  setSelectedProduct(item);
                  setShowCheckOut(true);
                }
              }}>
              <Text className="text-[11px] font-bold" >
                Buy Now
              </Text>
            </TouchableOpacity>
            </View>
          </View>
          <View style={styles.leftContainer}>
            {hasValidFlashData ? (
              <LinearGradient
                colors={['#dc2626', '#ef4444']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.discountButton}>
                <View style={styles.discountTag}>
                  <Ionicons name="flash" size={12} color="#fff" />
                  <Text style={styles.discountText}>
                    {' '}FLASH {discountPercent > 0 && `-${discountPercent}%`}
                  </Text>
                </View>
              </LinearGradient>
            ) : (
              discountPercent > 0 && (
                <LinearGradient
                  colors={['rgba(255, 0, 0, 0.8)', 'rgba(255, 0, 0, 0.8)']}
                  start={{x: 0.1, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.discountButton}>
                  <View style={styles.discountTag}>
                    <Image
                      source={{uri:Discount}}
                      style={{height: 15, width: 15}}
                    />
                    <Text style={styles.discountText}>
                      {' '}{discountPercent}% OFFER
                    </Text>
                  </View>
                </LinearGradient>
              )
            )}
            <TouchableOpacity 
            onPress={() => handleUnSaveProduct(item?._id)} 
            style={{
              padding: 5,
              backgroundColor: isInWishlist ? '#F2231F' : '#FFFFFF6C',
              borderWidth: 1,
              borderColor: '#FFFFFF1C',
              borderRadius: 20,
            }}
            >
              <AntDesign name="heart" size={11} color="#fff" />
            </TouchableOpacity>
          </View>
          {/* Flash Sale Timer - Bottom Right */}
          {hasValidFlashData && (
            <View style={styles.flashSaleTimerPosition}>
              <FlashSaleTimer endsAt={flashData.endsAt} />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [handleUnSaveProduct],
  );

  // Clip item renderer
  const renderSavedClip = useCallback(
    ({item}) => (
      <TouchableOpacity
        style={styles.galleryItem}
        onPress={() => {
          //ToastAndroid.show('Video is not available right now',ToastAndroid.SHORT);
          navigation.navigate('reel', {id: item._id});
        }}>
        <View style={styles.imageContainer}>
          {/* {console.log( `${AWS_CDN_URL}${item?.thumbnailBlobName}`)} */}
          <Image
            source={
              item?.thumbnailBlobName
                ? {uri: `${AWS_CDN_URL}${item?.thumbnailBlobName}`}
                : undefined
            }
            style={styles.galleryImage}
          />
          <View style={overlay.cardOverlay}>
            <View style={styles.videoViews}>
              <Image
                source={{uri:shopVideo}}
                style={{width: 15, height: 15}}
              />
            </View>
          </View>
          <View style={styles.productDetails1}>
            {item.viewCount &&<Text style={styles.productTitle} numberOfLines={1}>
             {formatFollowerCount(item?.viewCount)}
            </Text>}
            {/* <TouchableOpacity onPress={() => handleUnSave(item?._id)}>
              <Text style={styles.productTitle1} numberOfLines={1}>
                <Ionicons name="bookmark" size={13} color="white" />
              </Text>
            </TouchableOpacity> */}
          </View>
          {/* <View style={styles.priceRow}>
          <Text style={styles.productPrice}>{item?.productPrice}</Text>
          <TouchableOpacity style={styles.shareButton}>
            <MaterialIcons name="share" size={18} color="#666" />
          </TouchableOpacity>
        </View> */}
          {/* <TouchableOpacity style={styles.watchButton}>
            <Text style={styles.watchButtonText}>Watch Now</Text>
          </TouchableOpacity> */}
        </View>
      </TouchableOpacity>
    ),
    [handleUnSave],
  );

  // Show item renderer
  const renderSavedShow = useCallback(({item}) => {
    const eventTime = new Date(item.scheduledAt);
    const now = new Date();
    const isUpcoming = item?.showStatus! =='live'    //now < eventTime;
    const statusText = isUpcoming ? 'Upcoming' : 'LIVE';
     console.log('store shows',item)
    return (
      <TouchableOpacity
        style={styles.galleryItem}
        onPress={() => {
          if (item?.showStatus === 'live') navigation.navigate('LiveScreen', {stream: item});
          else{
             ToastAndroid.show('This show is not in live', ToastAndroid.SHORT);
            // navigation.navigate('UpcomingShowDetail', {
            //     id: item._id,
            //     hostId: item.hostId,
            //   });
            navigation.navigate('LiveScreen', {stream: item})
          }
        }}>
        <View style={styles.imageContainer}>
          <Image
            source={{uri: `${AWS_CDN_URL}${item.thumbnailImage}`}}
            style={[styles.galleryImage, {height: 180}]}
          />
        </View>
        <View style={overlay.cardOverlay}>
          <View
            style={[
              styles.liveTag,
              {
                backgroundColor: item?.showStatus !== 'live' ? '#333' : '#FF3B30',
                paddingHorizontal: item?.showStatus !== 'live' ? 5 : 12,
              },
            ]}>
            {/* <View style={styles.liveIndicator}></View> */}
            <Text style={styles.liveText}>
              {item?.showStatus === 'live' ? 'LIVE':'Upcoming'}
            </Text>
          </View>
          {item.isLive ? (
            <View style={styles.groupTag}>
              <View
                style={{
                  padding: 4,

                  backgroundColor: '#FF3B30',

                  borderRadius: 18,
                }}>
                <MaterialIcons name="group" size={13} color="white" />
              </View>
              <Text style={styles.groupTagText}>{item.viewsCount}</Text>
            </View>
          ) : null
          // (
          //   <TouchableOpacity
          //     style={[
          //       styles.groupTag,
          //       {
          //         height: 16,
          //         width: 16,
          //         backgroundColor: '#333',
          //         borderRadius: 8,
          //         paddingTop: 2,
          //       },
          //     ]}
          //     onPress={() => {}}>
          //     <Feather name="bookmark" size={13} color="white" />
          //   </TouchableOpacity>
          // )
          }
          <Text style={styles.productTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      // console.log(navigation.getState())
      if (navigation.canGoBack()) {
        // navigation.goBack();
        const state = navigation.getState();
        const homeRouteExists = state.routes.some(
          route => route.name === 'Home',
        );

        if (true) {
          // console.log(homeRouteExists);
          if (homeRouteExists) {
            navigation.navigate('Home' as never);
          } else {
            navigation.goBack();
          }
        }
        return true; // prevent default behavior
      }
      // console.log('back pressed');
      const now = Date.now();
      if (now - lastBackPressed.current < 2000) {
        BackHandler.exitApp();
      } else {
        ToastAndroid.show('Press again to exit', ToastAndroid.SHORT);
        setIsEditing(false);
        lastBackPressed.current = now;
      }

      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => backHandler.remove();
  }, [navigation]);

  return (
    <>
      {/* <View style={{height:"100%"}}> */}
      {/* </View> */}
      {user?.role == 'seller' || user?.role == 'user' ? (
        <SafeAreaView style={styles.container}>
          <SellerHeader navigation={navigation} message={'Store'} />
          <FlatList
            data={getSavedData()}
            renderItem={renderSavedItem}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                {/* Content Tabs */}
                {(
                  // <View style={styles.tabContainer}>
                  //   <TouchableOpacity
                  //     style={[
                  //       styles.tab,
                  //       savedTab === 'show' && styles.activeTab,
                  //     ]}
                  //     onPress={() => setSavedTab('show')}>
                  //     <Ionicons
                  //       name="bookmark"
                  //       color={savedTab === 'show' ? '#f7ce45' : '#fff'}
                  //       size={20}
                  //     />
                  //     <Text
                  //       style={[
                  //         styles.tabIconPlaceholder,
                  //         savedTab === 'show' && {color: '#f7ce45'},
                  //       ]}>
                  //       Live
                  //     </Text>
                  //   </TouchableOpacity>

                  //   <TouchableOpacity
                  //     style={[
                  //       styles.tab,
                  //       savedTab === 'clip' && styles.activeTab,
                  //     ]}
                  //     onPress={() => setSavedTab('clip')}>
                  //     <Ionicons
                  //       name="bookmark"
                  //       color={savedTab === 'clip' ? '#f7ce45' : '#fff'}
                  //       size={20}
                  //     />
                  //     <Text
                  //       style={[
                  //         styles.tabIconPlaceholder,
                  //         savedTab === 'clip' && {color: '#f7ce45'},
                  //       ]}>
                  //       Videos
                  //     </Text>
                  //   </TouchableOpacity>

                  //   <TouchableOpacity
                  //     style={[
                  //       styles.tab,
                  //       savedTab === 'product' && styles.activeTab,
                  //     ]}
                  //     onPress={() => setSavedTab('product')}>
                  //     <Ionicons
                  //       name="bookmark"
                  //       color={savedTab === 'product' ? '#f7ce45' : '#fff'}
                  //       size={20}
                  //     />
                  //     <Text
                  //       style={[
                  //         styles.tabIconPlaceholder,
                  //         savedTab === 'product' && {color: '#f7ce45'},
                  //       ]}>
                  //       Products
                  //     </Text>
                  //   </TouchableOpacity>
                  // </View>
                  <View className="flex-row items-center justify-between">
  {/* Live Tab */}
  <TouchableOpacity
    className={`flex-1 flex-row items-center justify-center gap-2 py-2 border-b-2 ${
      savedTab === 'show'
        ? 'border-b-[#f7ce45]'
        : 'border-b-transparent'
    }`}
    onPress={() => setSavedTab('show')}
  >
    <Ionicons
      name="radio-outline"
      size={20}
      color={savedTab === 'show' ? '#f7ce45' : '#fff'}
    />
    <Text
      className={`text-sm ${
        savedTab === 'show' ? 'text-[#f7ce45]' : 'text-white'
      }`}
    >
      Live
    </Text>
  </TouchableOpacity>

  {/* Videos Tab */}
  <TouchableOpacity
    className={`flex-1 flex-row items-center justify-center gap-2 py-2 border-b-2 ${
      savedTab === 'clip'
        ? 'border-b-[#f7ce45]'
        : 'border-b-transparent'
    }`}
    onPress={() => setSavedTab('clip')}
  >
    <Ionicons
      name="logo-youtube"
      size={20}
      color={savedTab === 'clip' ? '#f7ce45' : '#fff'}
    />
    <Text
      className={`text-sm ${
        savedTab === 'clip' ? 'text-[#f7ce45]' : 'text-white'
      }`}
    >
      Videos
    </Text>
  </TouchableOpacity>

  {/* Products Tab */}
  <TouchableOpacity
    className={`flex-1 flex-row items-center justify-center gap-2 py-2 border-b-2 ${
      savedTab === 'product'
        ? 'border-b-[#f7ce45]'
        : 'border-b-transparent'
    }`}
    onPress={() => setSavedTab('product')}
  >
    <Ionicons
      name="bag-handle-sharp"
      size={20}
      color={savedTab === 'product' ? '#f7ce45' : '#fff'}
    />
    <Text
      className={`text-sm ${
        savedTab === 'product' ? 'text-[#f7ce45]' : 'text-white'
      }`}
    >
      Products
    </Text>
  </TouchableOpacity>
</View>

                )}
                <View style={styles.galleryHeader} />
              </>
            }
            numColumns={3}
            contentContainerStyle={styles.galleryContainer}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <View style={{alignItems: 'center', justifyContent: 'center'}}>
                {loadingMap[savedTab] ? (
                  <ActivityIndicator
                    color={colors.primaryButtonColor}
                    size={'small'}
                  />
                ) : (
                  <Text style={{color: '#777'}}>No {savedTab} available</Text>
                )}
              </View>
            }
            ListFooterComponent={
              <>
                {savedDataMap[savedTab]?.hasMore && !loadingMap[savedTab] && getSavedData().length > 0 ? (
                  <View style={{padding: 20, alignItems: 'center'}}>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#f7ce45',
                        paddingHorizontal: 30,
                        paddingVertical: 12,
                        borderRadius: 25,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      onPress={() => {
                        const {page} = savedDataMap[savedTab] || {};
                        fetchSavedItems(savedTab, page + 1);
                      }}>
                      <Text style={{color: '#000', fontSize: 14, fontWeight: '600'}}>
                        Load More
                      </Text>
                      {/* <MaterialIcons name="expand-more" size={20} color="#000" /> */}
                    </TouchableOpacity>
                  </View>
                ) : loadingMap[savedTab] && getSavedData().length > 0 ? (
                  <View style={{padding: 20, alignItems: 'center'}}>
                    <ActivityIndicator
                      size="small"
                      color={colors.primaryButtonColor}
                    />
                  </View>
                ) : null}
              </>
            }
          />
          
          {/* Checkout Slider */}
          <CheckoutSlider
            isOpen={showCheckOut}
            product={selectedProduct}
            onClose={() => {
              setShowCheckOut(false);
              setSelectedProduct(null);
            }}
            type="static"
          />
        </SafeAreaView>
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  verifyButton: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 15,
    alignItems: 'center',
    position: 'absolute',
    top: 10,
    alignSelf: 'flex-end',
    right: 10,
  },
  groupTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    alignItems: 'center',
  },
  groupTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  profileContainer: {
    // justifyContent:'space-evenly',
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    // alignItems: 'center',
    // backgroundColor:'red',
    // position:'absolute',
    // top:10,bottom:,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 140,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderColor,
  },
  verticalDivider: {
    width: 1,
    height: '80%', // or any height that looks nice
    backgroundColor: 'gray',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    // position:'absolute',
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  headerNameSection: {
    justifyContent: 'center',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
    color: '#fff',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    color: 'green',
    fontWeight: '600',
    fontSize: 12,
    marginRight: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#d97706',
    fontSize: 13,
    marginRight: 4,
  },
  menuButton: {
    padding: 5,
  },
  profileSection: {
    // flexDirection: 'row',
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 14,
    // position:'absolute',
    // top:100,
    // marginBottom:100,
    alignItems: 'flex-start',
    // backgroundColor: 'red',
    gap: 6,
    marginTop: -25,
  },
  profileImageSection: {
    marginRight: 24,
  },
  profileImageRing: {
    width: 88,
    height: 88,
    backgroundColor: 'red',
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 77,
    height: 77,
    marginTop: 20,
    borderRadius: 41,
    backgroundColor: '#E4405F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileInitials: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statsSection: {
    // flex: 1,
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    // borderRightWidth:1,borderRightColor:'#777',
    // paddingRight:10,
  },
  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
    marginTop: 2,
  },
  bioSection: {
    paddingLeft: 6,
    //paddingHorizontal: 16,
    // alignItems:'center',

    paddingTop: 25,
    flex: 1,
    maxWidth: '85%',
    // marginTop: 70,
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  bioText: {
    fontSize: 12,
    lineHeight: 20,

    color: '#fff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    height: 36,
    backgroundColor: '#121212CC',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    height: 36,
    width: 36,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    // marginLeft: 8,
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    // borderTopWidth: 1,
    // borderTopColor: '#eee',
    // borderBottomWidth: 1,
    // borderBottomColor: '#fff',
  },
  tabIconPlaceholder: {
    fontSize: 11,
    color: '#fff',
  },
  tab: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    color: '#fff',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#f7ce45',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  galleryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#fff',
    marginRight: 4,
  },
  galleryContainer: {
    // paddingHorizontal: 8,
    paddingBottom: 20,
    // backgroundColor:'red'
  },
  galleryItem: {
    width: ITEM_WIDTH,
    marginHorizontal: 4,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor:  '#121212',
    shadowColor: '#fff',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    borderColor: 'gray',
    borderWidth: 0.5,
  },
  imageContainer: {
    position: 'relative',
    // borderTopLeftRadius: 8,
    // borderTopRightRadius: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#ccc',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  productDetails: {
    padding: 10,
    paddingBottom: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    //  backgroundColor: 'red'
  },
  productDetails1: {
    padding: 10,
    paddingBottom: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    //  backgroundColor: 'red',
    // flexDirection:'row'
  },
  productTitle: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 6,
    color: '#fff',
    position: 'absolute',
    bottom: 10,
    left: 10,
  },
  productTitle1: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 6,
    color: '#fff',
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff', //'#111',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: '#f7ce45',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  watchButton: {
    backgroundColor: '#0095f6',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  watchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  remindButton: {
    backgroundColor: '#ff4d4f',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  remindButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  discountTag: {
    // position: 'absolute',
    // top: -150,
    // left: 10,
    // backgroundColor: '#ff4d4f',
    // paddingHorizontal: 8,
    flexDirection: 'row',
    gap: 1,   //5,
    alignItems: 'center',
    // elevation:3,
    // paddingVertical: 4,
    borderRadius: 4,
  },
//newly added styles
  discountButton: {
    // flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 7,
    paddingHorizontal:5,
  },
  discountText: {
    color: '#fff',
    textTransform: 'capitalize',
    fontSize:9, 
    // elevation:4,
    fontWeight: '600',
  },
  color: {
    width: 6,
    height: 6,
    padding: 3,
    borderRadius: 20,
  },
  colorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBody: {
    padding: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
    color: '#fff',
    marginBottom: 2,
  },
  leftContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
    position: 'absolute',
    top: 1,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  leftButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 15,
    alignItems: 'center',
    padding: 1,
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    alignItems: 'center',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoViews: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  viewsText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 3,
  },
  shareButton: {
    width: 30,
    height: 30,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifyButton: {
    width: 30,
    height: 30,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF3B30', //'rgba(0,0,0,0.7)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 1,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4d4f',
    marginRight: 6,
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  groupTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  //user fallback content style
  contentContainer: {
    flex: 1,
    backgroundColor: colors.primaryColor,
    paddingTop: 20,
    paddingBottom: '40%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#222',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    marginVertical: 20,
  },
  trendingCard: {
    width: 120,
    height: 160,
    marginRight: 12,
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  trendingText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  profileContainer1: {
    alignItems: 'center',
    marginRight: 16,
  },
  profileImage1: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#facc15',
  },
  profileName: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  videoCard: {
    width: 160,
    height: 260,
    marginRight: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  videoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: 'transparent',
    position: 'absolute',
    zindex: 1,
    bottom: 0,
    gap: 3,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
  videoViewText: {
    color: '#fff',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },

  videoHeader: {
    flexDirection: 'row',
    // justifyContent: 'space-between',
    padding: 8,
    gap: 6,
    zIndex: 1,
    position: 'absolute',
  },

  hostAvatar: {
    width: 24,
    height: 24,
    backgroundColor: '#2C2C2E80',
    borderRadius: 12,
    // marginRight: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },

  overlay1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    //padding: 7,
    justifyContent: 'space-between',
    borderRadius: 16,
    //zindex: 1
  },
  initialsFallback: {
    width: 60,
    height: 60,
    borderRadius: 30, // same as profileImage1
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#facc15', // matches image border
  },
  initialsText: {
    color: '#f7cf4b',
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },

  priceContainer:{
    flexDirection:'column'
  },
  flashSaleContainer: {
    flexDirection: 'column',
    gap: 4,
  },
  flashSaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  flashSaleText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  // Small flash sale badge for 3-column layout
  flashSaleTimerPosition: {
    position: 'absolute',
    bottom: 115,
    right: 5,
    flexDirection: 'column',
    gap: 2,
  },
  flashSaleBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 1,
  },
  flashSaleTextSmall: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timerContainerSmall: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
});

export default Store;
