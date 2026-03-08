//originial seller profile


import React, { useRef, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated, Share, BackHandler, ActivityIndicator, ToastAndroid,
  RefreshControlBase,
  Alert,
  Platform,
  Modal
} from 'react-native';
import FastImage from 'react-native-fast-image';
import FIcon from 'react-native-vector-icons/Feather';
import Entypo from 'react-native-vector-icons/Entypo';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { useTrackProfileView } from './useTrackProfileView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AWS_CDN_URL } from '../../Utils/aws';
import { shareUrl } from '../../../Config';
import FollowersList from '../Profile/FollowersList';
import FollowingList from '../Profile/FollowingList';
import { useFollowApi } from '../../Utils/FollowersApi';
import axiosInstance from '../../Utils/Api';
import { formatFollowerCount } from '../../Utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from '../../Context/AuthContext';
import { Toast, formatCurrency } from '../../Utils/dateUtils';
import ImageModal from '../Profile/ImageModal';
import LinearGradient from 'react-native-linear-gradient';
import ShareModal from '../Reuse/ShareModal';
import Feather from 'react-native-vector-icons/Feather';
import { colors, overlay } from '../../Utils/Colors';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { MessageSquareMore, UserRoundPlus } from 'lucide-react-native';
import SellerMuteModal from "./SellerMuteModal";
import { no } from 'rn-emoji-keyboard';
import CheckoutSlider from '../Reuse/CheckOutGlobal';
import ProfileEditScreen from '../Profile/ProfileImageEdit';
import useFlashSales from './../DashboardComponents/hooks/useFlashSales';
import { useSellerFlashSales } from '../../hooks/useSellerFlashSales';
import { FlashSaleCard } from './FlashSaleCard';
import { useCountdown } from '../../hooks/useCountdown';
import { Discount, SaleGif, shopVideo, storeIcon, Upcoming } from '../../assets/assets';
import SellerHeader from '../SellerComponents/SellerForm/Header';
import FlashSaleTimer from '../GloabalSearch/FlashSaleTimer';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / 2 - 12;
const THREE_ITEM_WIDTH = width / 2.6 - 12;

const ViewSellerProfile = ({ route, navigation }) => {
  const [user, setuser] = useState({});
  const { id } = route.params || '';
  const { followUser, unfollowUser } = useFollowApi();
  const { user: currentUser } = useAuthContext();
  // console.log(Object.keys(user));
  //console.log('SellerInfo', user);
  const [modalVisible, setModalVisible] = useState(false);
  // console.log('user===============', user?.user?.sellerData?._id);  // has value

  // Helper to determine user type - handles null role by checking isSeller
  const getUserType = () => {
    if (user?.user?.role === 'seller' || user?.isSeller === true) {
      return 'seller';
    }
    if (user?.user?.role === 'user' || user?.isSeller === false) {
      return 'user';
    }
    return null;
  };

  const isSeller = getUserType() === 'seller';
  const isUser = getUserType() === 'user';

  //const {liveSales, upcomingSales, isLoading} = useFlashSales();

  // Seller-specific flash sales
  const {
    liveFlashSales,
    upcomingFlashSales,
    hasMoreLive,
    hasMoreUpcoming,
    loading: flashSalesLoading,
    loadMoreLive,
    loadMoreUpcoming,
  } = useSellerFlashSales(user?.user?.sellerData?._id, 200);

    const maxEndTime = useMemo(() => {
      if (!liveFlashSales?.length) return null;
  
      // find the max endTime
      const latest = liveFlashSales.reduce((max, sale) => {
        const end = new Date(sale.endTime).getTime();
        return end > max ? end : max;
      }, 0);
  
      return new Date(latest);
    }, [liveFlashSales]);
  
  const { days, hours, minutes, seconds } = useCountdown(maxEndTime);

   const {
      days: startDay,
      hours: startHour,
      minutes: startMinute,
      seconds: startSecond,
    } = useCountdown(upcomingFlashSales[0]?.startTime);


  const [performance, setPerformance] = useState(null);

  const [isImageModal, setisIamgeModal] = useState(false)
  const [products, setProducts] = useState([]);

  const [shows, setShows] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState({});

  const [liveShows, setLiveShows] = useState([]);
  const [upcomingShows, setUpcomingShows] = useState([]);

  // console.log('liveshows', liveShows);
  // console.log('upcoming shows', upcomingShows);

  const [numLines, setNumLines] = useState(0);

  // console.log('shows=========', shows[1]);

  const [shoppableVideos, setShoppableVideos] = useState([]);

  // console.log('shoppableVideos', shoppableVideos)

  const [expanded, setExpanded] = useState(false);
  const [checkOut, setShowCheckOut] = useState(false);

  const [loadingSend, setloadingSend] = useState(false);
  const [isFollowing, setisFollowing] = useState(false);
  const [isFollowers, setisFollowers] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);

  const [activeTab, setActiveTab] = useState('live');

  const [loading, setLoading] = useState({
    show: false,
    clip: false,
    product: false,
  });

  const [productPagination, setProductPagination] = useState({
    currentPage: 1,
    hasMore: true,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });

  const [showPagination, setShowPagination] = useState({
    currentPage: 1,
    hasMore: true,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });

  const [clipPagination, setClipPagination] = useState({
    currentPage: 1,
    hasMore: true,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });

  // Track profile view - hooks must be called at top level
  useTrackProfileView(user?.user);

  const scrollViewRef = useRef(null);
  const [liveScrollX] = useState(new Animated.Value(0));

 

  const scrollToSection = (sectionName) => {
    let yOffset = 0;
    switch (sectionName) {
      case 'live':
        yOffset = 300;
        break;
      case 'videos':
        yOffset = 800;
        break;
      case 'offers':
        yOffset = 500;
        break;
    }
    scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
  };

  function getAccountAge(createdAt) {
    if (!createdAt) return "Unknown"; // handle null/undefined

    const createdDate = new Date(createdAt);
    if (isNaN(createdDate.getTime())) {
      return "Invalid date"; // handle invalid date strings
    }

    const now = new Date();
    const diffMs = now - createdDate;

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) {
      return `${diffYears} year${diffYears > 1 ? 's' : ''}`;
    } else if (diffMonths > 0) {
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  }


  const fetchuser = async (usernameOverride) => {
    try {
      //console.log('id', id);
      const username = usernameOverride || encodeURIComponent(id);
      const response = await axiosInstance.get(`/profile/${username}`);
      console.log('view seller profile====', response.data.data?.sellerInfo?.scoring?.totalScore);
      setuser(response.data.data);
      const data = response.data;
      setProducts(data.data.seller.products || []);
      setShows(data.data.seller.shows || []);
      setShoppableVideos(data.data.seller.shoppableVideos || []);
    } catch (err) {
      Toast(err.response.data.message);
      console.log('error fetching', err.response.data.message);
    }
  };

  useEffect(() => {
    fetchuser();
  }, [isFollowers, isFollowing, id]);


  useEffect(() => {
    const sellerId = user?.sellerInfo?.userInfo;              //sellerData?._id;
    console.log('Deubug user==================',user);
    console.log('Debug sellerId==================', sellerId);
    if (!sellerId) return; // avoid running with undefined

    const getSellerPerformance = async () => {
      try {
        const response = await axiosInstance.get(`/order/performance/${sellerId}`);
        console.log('performance res', response.data);
        setPerformance(response?.data?.data);
      } catch (error) {
        console.error('Error fetching seller performance:', error);
      }
    };

    getSellerPerformance();
  }, [user]);


  // Fetch Shows
  useEffect(() => {
    if (!user?.user?._id) return;

    const fetchShows = async () => {
      try {
        //  setloading(true);
        // ✅ Conditional endpoint
        const sellerId = user?.sellerInfo?._id || user?.user?.sellerInfo;
        console.log(user?.user?.role);
        let endpoint = "";
        if (user?.user?.role === "seller") {
          endpoint = `/profile/${sellerId}/shows`;
        } else {
          endpoint = `/search/shows`; // fallback or default
        }

        const response = await axiosInstance.get(endpoint, {
          params: { page: 1, limit: 50 },
        });
        const { data, pagination: newPagination } = response.data;
        setShows(data);
        
        // Filter based on which endpoint was used
        if (user?.user?.role === "seller") {
          // For /profile/${sellerId}/shows endpoint - filter by showStatus
          setLiveShows(data.filter(show => show?.showStatus === 'live'));
          setUpcomingShows(data.filter(show => show?.showStatus != 'live'));
        } else {
          // For /search/shows endpoint - filter by isLive
          setLiveShows(data.filter(show => show?.isLive));
          setUpcomingShows(data.filter(show => !show?.isLive));
        }

        setShowPagination(prev => ({
          ...prev,
          ...newPagination,
        }));
      } catch (err) {
        console.log('error fetching shows', err.response?.data);
      } finally {
        setLoading(prev => ({ ...prev, show: false }));
      }
    };

    fetchShows();
  }, [user?.user?._id]);

  // Fetch Shoppable Videos
  useEffect(() => {
    if (!user?.user?._id) return;

    const fetchShoppableVideos = async () => {
      try {
        setLoading(prev => ({ ...prev, clip: true }));
        const sellerId = user?.sellerInfo?._id || user?.user?.sellerInfo;
        let endpoint = "";
        if (user?.user?.role === "seller") {
          endpoint = `/profile/${sellerId}/shoppableVideos`;
        } else {
          endpoint = `/search/videos`; // fallback or default
        }
        const response = await axiosInstance.get(endpoint, {
          params: { page: 1, limit: 50 },
        });
        const { data, pagination: newPagination } = response.data;
        setShoppableVideos(data);
        setClipPagination(prev => ({
          ...prev,
          ...newPagination,
        }));

      } catch (err) {
        console.log('error fetching shoppable videos', err.response?.data);
      } finally {
        setLoading(prev => ({ ...prev, clip: false }));
      }
    };

    fetchShoppableVideos();
  }, [user?.user?._id]);

  // Fetch Products
  useEffect(() => {
    if (!user?.user?._id) return;

    const fetchProducts = async () => {
      try {
        // setloading(true);
        const sellerId = user?.sellerInfo?._id || user?.user?.sellerInfo;
        let endpoint = "";
        if (user?.user?.role === "seller") {
          endpoint = `/profile/${sellerId}/products`;
        } else {
          endpoint = `/search/products`; // fallback or default
        }
        const response = await axiosInstance.get(endpoint, {
          params: { page: 1, limit: 20 },
        });
        const { data, pagination: newPagination } = response.data;
        setProducts(data);
        setProductPagination(prev => ({
          ...prev,
          ...newPagination,
        }));
      } catch (err) {
        console.log('error fetching products', err.response?.data);
      } finally {
        setLoading(prev => ({ ...prev, product: false }));
      }
    };

    fetchProducts();
  }, [user?.user?._id]);

  // ============================================
  // COMMENTED OUT: Old share logic using React Native's Share API
  // Now using ShareModal component instead
  // ============================================
  // const shareProfile = async () => {
  //   try {
  //     const message = `Check out ${user?.user?.userName}'s profile!`;
  //     const link = `${shareUrl}profile/${user?.user?.userName}`;
  //
  //     const result = await Share.share({
  //       message: `${message} ${link}`,
  //       url: link, // iOS uses this
  //       title: `${user?.user?.name}'s Profile`, // Android uses this
  //     });
  //
  //     if (result.action === Share.sharedAction) {
  //       if (result.activityType) {
  //         console.log('Shared with activity type:', result.activityType);
  //       } else {
  //         console.log('Shared successfully');
  //       }
  //     } else if (result.action === Share.dismissedAction) {
  //       console.log('Share dismissed');
  //     }
  //   } catch (error) {
  //     console.error('Error sharing profile:', error);
  //   }
  // };
  // ============================================
  // console.log(user?.user?.role)
  const handleMessage = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId == user?.user?._id) {
        navigation.navigate('Comment');
        return;
      }
      setloadingSend(true);
      const response = await axiosInstance.post(`/chat/direct-message`, {
        userId: user?.user?._id,
        userType: user?.user?.role,
      });
      console.log(response.data.data);
      navigation.navigate('ChatScreen', {roomId: response?.data?.data?._id });

      Toast(response.data.message);
    } catch (err) {
      console.log('error', err);
    } finally {
      setloadingSend(false);
    }
  };


  const handleFollowUnfollow = async () => {
    // console.log(user?.user?._id)
    try {
      if (user?.follow?.followStatus == 'Following') {
        await unfollowUser(user?.user?._id);
        Toast('UnFollowed user successfully');

        fetchuser();
      } else {
        await followUser(user?.user?._id);
        Toast('Followed successfully');
        fetchuser();
      }
    }
    catch (error) {
      console.log(error.response.data, "while following")
    } finally {
      setLoadingFollow(false)
    }
  };

  const handleGoBack = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const name = (await AsyncStorage.getItem('userName')) || '';
      // setIsLoading(false);
      if (!name) {
        navigation.navigate('Login');
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'bottomtabbar' }], // or whatever your main screen is
        });
      } // or any other screen you want to navigate to
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      // console.log('back pressed')
      // console.log(navigation.canGoBack())
      if (navigation.canGoBack()) {
        navigation.goBack();

        return true; // prevent default behavior
      }

      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {
    setisFollowers(false);
    setisFollowing(false);
  }, [id]);

    const [topStores, setTopStores] = useState([]);
    const [loadingStores, setLoadingStores] = useState(false);
  
    const [page, setPage] = useState(1);
    const [limit] = useState(10); // you can adjust page size
    const isMounted = useRef(true);
    
    const [hasMore, setHasMore] = useState(true);

    const fetchSuggestedSellers = useCallback(
      async (pageNum = 1) => {
        if (!user?.user?._id) return;
  
        setLoadingStores(true);
        try {
          const {data: resData} = await axiosInstance.get(
            '/profile/suggested/sellers-by-category',
            {
              params: {
                userId: user.user._id,
                page: pageNum,
                limit,
              },
            }
          );
  
          const sellers = Array.isArray(resData?.data)
            ? resData.data.filter(u => u?._id !== user?._id)
            : [];
  
          if (isMounted.current) {
            if (pageNum === 1) {
              setTopStores(sellers); // reset for first page
            } else {
              setTopStores(prev => [...prev, ...sellers]); // append for next page
            }
  
            // if less sellers returned than limit → no more data
            setHasMore(sellers.length === limit);
          }
        } catch (error) {
          console.log(
            'Fetch suggested sellers error:',
            error?.response?.data || error?.message,
          );
          if (isMounted.current) {
            // ToastAndroid.show('Failed to load content', ToastAndroid.SHORT);
          }
        } finally {
          if (isMounted.current) {
            setLoadingStores(false);
          }
        }
      },
      [user?.user?._id, user?._id, limit],
    );
  
    useEffect(() => {
      if (user?.user?._id) {
        fetchSuggestedSellers();
      }
    }, [fetchSuggestedSellers, user?.user?._id]);

  const [likedStores, setLikedStores] = useState([]);
  const [storeFollowStatus, setStoreFollowStatus] = useState({});
  const [storeFollowLoading, setStoreFollowLoading] = useState({});


    const fetchStoresByViewHistory = useCallback(
      async (pageNum = 1) => {
        if (!user?.user?._id) return;
  
        setLoadingStores(true);
        try {
          const {data: resData} = await axiosInstance.get(
            '/productInteraction/viewed-sellers',
            {
              params: {
                userId: user.user._id,
                page: pageNum,
                limit,
              },
            }
          );
  
          const sellers = Array.isArray(resData?.data)
            ? resData.data.filter(u => u?._id !== user?._id && u?.userInfo !== null)
            : [];
  
          if (isMounted.current) {
            if (pageNum === 1) {
              setLikedStores(sellers); // reset for first page
            } else {
              setLikedStores(prev => [...prev, ...sellers]); // append for next page
            }
  
            // if less sellers returned than limit → no more data
            setHasMore(sellers.length === limit);
            
            // Fetch follow status for all stores
            if (sellers.length > 0) {
              fetchFollowStatusForStores(sellers);
            }
          }
        } catch (error) {
          console.log(
            'Fetch viewed sellers error:',
            error?.response?.data || error?.message,
          );
          if (isMounted.current) {
            // ToastAndroid.show('Failed to load content', ToastAndroid.SHORT);
          }
        } finally {
          if (isMounted.current) {
            setLoadingStores(false);
          }
        }
      },
      [user?.user?._id, user?._id, limit],
    );
  
    useEffect(() => {
      if (user?.user?._id) {
        fetchStoresByViewHistory();
      }
    }, [fetchStoresByViewHistory, user?.user?._id]);

    const fetchFollowStatusForStores = async (stores) => {
      if (!stores || stores.length === 0) return;
      
      // Batch fetch follow status for all stores
      const followStatusPromises = stores.map(async (store) => {
        if (!store?.userInfo?._id) return null;
        
        try {
          const response = await axiosInstance.get(`/profile/${store.userInfo.userName}`);
          return {
            userId: store.userInfo._id,
            followStatus: response.data?.data?.follow?.followStatus || 'Follow'
          };
        } catch (error) {
          console.log('Error fetching follow status for store:', error);
          return {
            userId: store.userInfo._id,
            followStatus: 'Follow'
          };
        }
      });
      
      // Wait for all promises to resolve
      const results = await Promise.all(followStatusPromises);
      
      // Update state with all follow statuses at once
      const statusMap = {};
      results.forEach(result => {
        if (result && result.userId) {
          statusMap[result.userId] = result.followStatus;
        }
      });
      
      setStoreFollowStatus(prev => ({ ...prev, ...statusMap }));
    };

    const handleStoreFollowUnfollow = async (storeUserId, currentFollowStatus) => {
      if (storeFollowLoading[storeUserId]) return;
      
      if (!storeUserId) {
        console.log('Error: storeUserId is undefined');
        Toast('User Not found');
        return;
      }
      
      try {
        console.log('Following/Unfollowing user with ID:', storeUserId, 'Current status:', currentFollowStatus);
        setStoreFollowLoading(prev => ({ ...prev, [storeUserId]: true }));
        
        if (currentFollowStatus === 'Following') {
          await unfollowUser(storeUserId);
          Toast('Unfollowed successfully');
          setStoreFollowStatus(prev => ({ ...prev, [storeUserId]: 'Follow' }));
        } else {
          await followUser(storeUserId);
          Toast('Followed successfully');
          setStoreFollowStatus(prev => ({ ...prev, [storeUserId]: 'Following' }));
        }
      } catch (error) {
        console.log('Error while following/unfollowing store:', error);
        console.log('Error details:', error?.response?.data || error?.message);
        console.log('Store User ID that caused error:', storeUserId);
        Toast(error?.response?.data?.message || 'Failed to update follow status');
      } finally {
        setStoreFollowLoading(prev => ({ ...prev, [storeUserId]: false }));
      }
    };



    const MostLikedStoreCard = ({userInfo, icon, brand, name, cat, rating, online}) => {
      const followStatus = storeFollowStatus[userInfo?._id] || userInfo?.followStatus || 'Follow';
      const isFollowLoading = storeFollowLoading[userInfo?._id] || false;
      
      return (
      <TouchableOpacity
        // onPressIn={()=>{ setActiveStore(name)}}
        onPress={() => {
          // setActiveStore(name);
          setTimeout(() => {
            navigation.navigate('ViewSellerProdile', {
              id: userInfo?.userName,
            });
          }, 100);
        }}
        style={[
          styles.favStoreCard,
        //  activeStore === name && styles.activeStoreCard,
        ]}>
          {/* <View style= {{position: 'absolute', right: 10, top: 10, backgroundColor:'#ffd700', borderRadius: 6, paddingHorizontal:2}}><Text style = {{fontSize:10,color:'#000'}} ><Entypo name="star" size={12} color="#000" /> {rating}</Text></View> */}
        <View style={styles.favStoreAvatar}>
          {/* <Text style={styles.storeAvatarEmoji}>{'📱'}</Text> */}
          {/* {console.log(icon)} */}
          {icon ? (
            <Image
              source={{uri: `${AWS_CDN_URL}${icon}`}}
              style={styles.favStoreAvatarImage}
            />
          ) : (
            //<LinearGradient>
            <View
              style={[
                styles.favStoreAvatar,
                {
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 0,
                  position: 'relative',
                },
              ]}>
            
                 <Image
              source={{uri:storeIcon}}
              style={styles.favStoreAvatarImage}
            />
            
            </View>
            // </LinearGradient>
          )}
          {
          //online 
          false && <View style={styles.favStoreStatus} />}
        </View>
        <Text style={styles.favStoreName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.favStoreCategory} numberOfLines={1} ellipsizeMode="tail">
          {brand} Seller
        </Text>
        <Text style={styles.favStoreRating}><EvilIcons name="location" size={14} color="#ABABAB" /> {'Chennai, TN'}</Text>
        <View style = {{flexDirection:'row', gap:10, marginTop:5}}>
        <TouchableOpacity 
          disabled={isFollowLoading}
          onPress={() => handleStoreFollowUnfollow(userInfo?._id, followStatus)}
          style = {{
            flex: 1, 
            backgroundColor: followStatus === 'Following' ? '#141414' : '#FFD700', 
            borderRadius:8, 
            paddingVertical: 4,
            borderWidth: followStatus === 'Following' ? 0.5 : 0,
            borderColor: followStatus === 'Following' ? '#FFD700' : 'transparent'
          }}>
          {isFollowLoading ? (
            <ActivityIndicator size="small" color={followStatus === 'Following' ? '#FFD700' : '#000'} />
          ) : (
            <Text 
            allowFontScaling={false}
            style={{
              fontSize:12, 
              textAlign:'center',
              color: followStatus === 'Following' ? '#FFD700' : '#000',
              fontWeight: followStatus === 'Following' ? 'bold' : 'normal'
            }}>
              {followStatus === 'Following' ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>{navigation.navigate('ViewSellerProdile', {id:userInfo?.userName})}} style = {{flex: 1,flexDirection:'row', backgroundColor:'#141414', borderRadius:8, borderWidth: 0.2,paddingVertical: 4, borderColor: '#ffd700', justifyContent:'center'}}><Text allowFontScaling={false} style= {{fontSize:11,color: '#FFD700', textAlign:'center'}}>Explore</Text><Icon name="keyboard-double-arrow-right" size={16} color="#FFD700" /></TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
    };

    const StoreCard = ({userInfo, icon, name, cat, rating, online}) => (
      <TouchableOpacity
        // onPressIn={()=>{ setActiveStore(name)}}
        onPress={() => {
          // setActiveStore(name);
          setTimeout(() => {
            navigation.navigate('ViewSellerProdile', {
              id: userInfo?.userName,
            });
          }, 100);
        }}
        style={[
          styles.storeCard,
        //  activeStore === name && styles.activeStoreCard,
        ]}>
        <View style={styles.storeAvatar}>
          {/* <Text style={styles.storeAvatarEmoji}>{'📱'}</Text> */}
          {/* {console.log(icon)} */}
          {icon ? (
            <Image
              source={{uri: `${AWS_CDN_URL}${icon}`}}
              style={styles.storeAvatarImage}
            />
          ) : (
            //<LinearGradient>
            <View
              style={[
                styles.storeAvatar,
                {
                  width: 38,
                  height: 38,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 0,
                  position: 'relative',
                },
              ]}>
           
                 <Image
            source={{uri:storeIcon}}
              style={styles.storeAvatarImage}
            />
            
            </View>
            // </LinearGradient>
          )}
          {
          //online 
          false && <View style={styles.storeStatus} />}
        </View>
        <Text style={styles.storeName} numberOfLines={1}>
          {name}
        </Text>
        {/* <Text style={styles.storeCategory} numberOfLines={1} ellipsizeMode="tail">
          {cat}
        </Text> */}
        {/* <Text style={styles.storeRating}>⭐ {rating}</Text> */}
      </TouchableOpacity>
    );
  


  const renderLiveCard = ({ item, index }) => {
    // console.log('Live Item', item);
    if (item.isLoadMore) {
      return (
        <TouchableOpacity style={styles.loadMoreCard}>
          <Icon name="add" size={24} color="#FFD700" />
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      );
    }

    const inputRange = [
      (index - 1) * 140,
      index * 140,
      (index + 1) * 140,
    ];

    const scale = liveScrollX.interpolate({
      inputRange,
      outputRange: [1, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = liveScrollX.interpolate({
      inputRange,
      outputRange: [1, 1, 1],    //0.6, 1, 0.6
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        onPress={() => {
          // console.log('live item',item);
           if (item.showStatus == 'live') {
                  navigation.navigate('LiveScreen', {stream: item});
                }
          else  {
              navigation.navigate('LiveScreen', {stream: item});
          }
            // navigation.navigate('UpcomingShowDetail', {
            //     id: item._id,
            //     hostId: item.hostId,
            //   });
        }}
      >
        <Animated.View
          style={[styles.liveCard, { transform: [{ scale }], opacity }]}
        >
          <Image
            source={{ uri: `${AWS_CDN_URL}${item.thumbnailImage}` }}
            style={styles.liveCardImage}
          />

          <View
            style={[
              styles.liveTag,
              {
                backgroundColor: !(item.showStatus == 'live')
                  ? '#333'
                  : '#FF3B30',
                paddingHorizontal: !(item.showStatus == 'live') ? 5 : 12,
              },
            ]}>
            {/* <View style={styles.liveIndicator}></View> */}
            {console.log('show status', item.showStatus)}
            <Text style={styles.liveText}>
              {!(item.showStatus == 'live') ? 'UpComing' : 'LIVE'}
            </Text>
          </View>

          {/* Overlay Container */}
          <View style={styles.overlay}>
            {/* <View style={styles.liveIndicator}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>
          {item.isLive ? 'LIVE' : 'Upcoming'}
        </Text>
      </View> */}
            <Text style={styles.liveCardTitle}>{item.title}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderVideoCard = ({ item }) => {
    if (item.isLoadMore) {
      return (
        <TouchableOpacity style={styles.loadMoreCard}>
          <Icon name="add" size={24} color="#FFD700" />
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity onPress={() => navigation.navigate('reel', { id: item._id })} style={styles.videoCard}>
        <Image source={
          item?.thumbnailBlobName
            ? { uri: `${AWS_CDN_URL}${item?.thumbnailBlobName}` }
            : undefined
        } style={styles.videoCardImage} />
        {/* <View style={styles.videoOverlay}>
          <Icon name="play-arrow" size={30} color="white" />
        </View> */}
        {/* <View style={styles.videoInfo}>
          <Text style={styles.videoViews}>{item.viewCount}</Text>
        </View> */}
        <View style={styles.videoStats}>
          <View style={{ backgroundColor: '#7B8FA1', paddingHorizontal: 1, borderRadius: 2 }}>
            <Ionicons name="play" size={10} color="#fff" />
          </View>
          <Text style={[styles.viewsText, { marginLeft: 4 }]} numberOfLines={1}>
            {formatFollowerCount(item.viewCount) || 0}  views
          </Text>

        </View>
        <View style={[styles.bottomInfo, { gap: 10 }]}>

          <Text style={styles.viewsText} numberOfLines={1}
            ellipsizeMode="tail" >
            {item?.title}
          </Text>

          {/* <View style={{flexDirection:'row', justifyContent:'space-between'}}>
 <Text style={styles.viewsText} numberOfLines={1}       
  ellipsizeMode="tail" >
                   🛍️ 12 item
                  </Text>
                  <Text style={styles.viewsText} numberOfLines={1}       
  ellipsizeMode="tail" >
                   ⏱️ 3:45
                  </Text>
                  </View> */}

        </View>
      </TouchableOpacity>
    );
  };

  const renderOfferCard = ({ item }) => {
    if (item.isLoadMore) {
      return (
        <TouchableOpacity style={[styles.loadMoreCard, { height: 180 }]}>
          <Icon name="add" size={24} color="#FFD700" />
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.offerCard}>
        <Image source={{ uri: item.image }} style={styles.offerImage} />
        <Text style={styles.offerTitle}>{item.title}</Text>
        <Text style={styles.offerPrice}>{item.price}</Text>
        <Text style={styles.offerOriginalPrice}>{item.originalPrice}</Text>
        <TouchableOpacity style={styles.buyNowButton}>
          <Text style={styles.buyNowText}>Buy now</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTopSellingCard = ({ item }) => {
    if (item.isLoadMore) {
      return (
        <TouchableOpacity style={[styles.loadMoreCard, { width: 100, height: 140 }]}>
          <Icon name="add" size={20} color="#FFD700" />
          <Text style={[styles.loadMoreText, { fontSize: 10 }]}>Load More</Text>
        </TouchableOpacity>
      );
    }

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

    return (
      <TouchableOpacity 
        onPress={() => navigation.navigate('ProductDetails', { 
          id: item._id,
          flashSale: hasValidFlashData ? flashData : null,
          type: 'static'
        })} 
        style={styles.topSellingCard}>
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: `${AWS_CDN_URL}${item?.images[0]?.key}` }} style={styles.topSellingImage} />
          
          {/* FLASH badge at top left */}
          {hasValidFlashData ? (
            <View style={{ position: 'absolute', top: 4, left: 4, zIndex: 10 }}>
              <LinearGradient
                colors={['#dc2626', '#ef4444']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={{ borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Ionicons name="flash" size={10} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>
                    FLASH {discountPercent > 0 && `-${discountPercent}%`}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          ) : (
            discountPercent > 0 && (
              <View style={{ position: 'absolute', top: 4, left: 4, zIndex: 10 }}>
                <View style={{ backgroundColor: 'rgba(255, 0, 0, 0.85)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>
                      -{discountPercent}%
                    </Text>
                  </View>
                </View>
              </View>
            )
          )}
          
          {/* Flash Sale Timer - Bottom Right */}
          {hasValidFlashData && (
            <View style={{ position: 'absolute', bottom: 4, right: 4, zIndex: 10 }}>
              <FlashSaleTimer endsAt={flashData.endsAt} />
            </View>
          )}
        </View>
        
        <Text style={styles.topSellingTitle} numberOfLines={1}
          ellipsizeMode="tail">{item.title}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.topSellingPrice]}>{formatCurrency(displayPrice)}</Text>

           <TouchableOpacity onPress={() => {
        if(user?.isOwnProfile)
          Toast("You cannot buy your products.")
          else{
            setSelectedProduct(item)
        setShowCheckOut(true)}}
          } style={[styles.topSellingBuyButton, {borderRadius:20,paddingHorizontal: 14, paddingVertical: 6}]} activeOpacity={0.2} >
          <Text style={styles.topSellingBuyText}>Buy Now</Text>
        </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };


    const renderFlashProductCard = ({ item }) => {
    if (item.isLoadMore) {
      return (
        <TouchableOpacity style={[styles.loadMoreCard, { width: 100, height: 140 }]}>
          <Icon name="add" size={20} color="#FFD700" />
          <Text style={[styles.loadMoreText, { fontSize: 10 }]}>Load More</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity onPress={() => navigation.navigate('ProductDetails', { id: item._id })} style={styles.topSellingCard}>
        {/* Top Deal tag */}
        <View style={styles.topDealTag}>
          <Text style={styles.topDealText}>Top deal</Text>
        </View>
        <Image source={{ uri: `${AWS_CDN_URL}${item?.images[0]?.key}` }} style={styles.topSellingImage} />
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            - {Math.round(((item.MRP - item.productPrice) / item.MRP) * 100)}%
          </Text>
        </View>
        <Text style={styles.topSellingTitle} numberOfLines={1}
          ellipsizeMode="tail">{item.title}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Text style={styles.topSellingPrice}>{formatCurrency(item.productPrice)}</Text>
          <Text style={{
            fontSize: 11,
            color: '#ddd', // Tailwind gray-400
            textDecorationLine: 'line-through'
          }}>
            {formatCurrency(item.MRP)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => {
        if(user?.isOwnProfile)
          Toast("You cannot buy your products.")
          else{
            setSelectedProduct(item)
        setShowCheckOut(true)}}
          // navigation.navigate('ProductDetails', { id: item._id })
          } style={styles.topSellingBuyButtonContainer} activeOpacity={0.2} >
          <LinearGradient
            colors={['#FFCF00', '#FFAB00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topSellingBuyButton}
          >
            <Text style={styles.topSellingBuyText}>Buy Now</Text>
          </LinearGradient>
        </TouchableOpacity>
       
      </TouchableOpacity>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
       <CheckoutSlider
        isOpen={checkOut}
        onClose={()=>setShowCheckOut(false)}
        product={selectedProduct}
        />
      <ImageModal visible={isImageModal} onClose={() => setisIamgeModal(false)} imageUri={`${AWS_CDN_URL}${user?.user?.profileURL?.key}`} />
      {isFollowers || isFollowing ? (
        <View style={{ height: '100%' }}>
          <FollowersList
            active={isFollowing ? 'following' : 'followers'}
            userName={user?.user?.name}
            setisFollowing={setisFollowing}
            userId={user?.user?._id}
            setisFollowers={setisFollowers}
            isActionVisible={false}
          />
        </View>
      ) : null}
      <ScrollView ref={scrollViewRef} style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}

        {console.log(user?.user?.role,"role")}

        { isUser && <SellerHeader navigation={navigation} message={'profile'} />}

        { isSeller && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {/* <Image
            source={
              user?.user?.backgroundCoverURL?.key
                ? {
                  uri: `${AWS_CDN_URL}${user?.user?.backgroundCoverURL?.key}`,
                }
                : undefined
            }
            style={{
              height: 120,
              width: '100%',
              backgroundColor: '#333',
              marginTop: -10,
              //   marginHorizontal: -20
            }}
          /> */}

           <View
    style={{
      height: 120,
      width: '100%',
      backgroundColor: '#121212', // solid black background
      marginTop: -10,
    }}
  />
          <TouchableOpacity
            style={{
              //  marginLeft: 16,
              width: 30,
              height: 30,
              borderRadius: 15,
              borderWidth: 1,
               borderColor: '#ddd',
              alignItems: 'center',
              justifyContent: 'center',
             backgroundColor: 'rgba(26, 26, 26, 0.8)',// optional for better visibility
              // zIndex: 1,
              position: 'absolute',
              top: 10,
              left: 10
            }}
            onPress={() => handleGoBack()}>
            {/* <Entypo name="chevron-thin-left" size={15} color="#ccc" /> */}
             <FIcon name="arrow-left" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              marginLeft: 16,
              paddingHorizontal: 12,
              //  width: 30,
              //  height: 30,
              borderRadius: 15,
              //   borderWidth: 1,
              //   borderColor: '#ddd',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffd700', // optional for better visibility
              // zIndex: 1,
              position: 'absolute',
              top: 10,
              right: 10
            }}
          //    onPress={() => handleGoBack()}
          >

            <Text allowFontScaling={false} >
              {user?.sellerInfo?.sellerType
                ? user.sellerInfo.sellerType.charAt(0).toUpperCase() + user.sellerInfo.sellerType.slice(1)
                : ''}
              {' '}{user?.user?.role}
            </Text>
          </TouchableOpacity>

           {/* <TouchableOpacity style={styles.shareButton1} onPress={() => shareProfile()
              }>
                <FIcon name="share" size={20} color="#fff" />
            
            </TouchableOpacity> */}
        </View>}



        <View style={{ marginTop:  isSeller ? -70 : 0
          //-40
           }}>

          {/* {console.log('user role', user?.user)} */}
          <View style={[styles.profileHeader, isUser && {backgroundColor:'#1a1a1a'}]}>
            <View style= {{flexDirection:'row'}}>
            <TouchableOpacity disabled={!user?.user?.profileURL?.key} onPress={() => setisIamgeModal(true)} style={styles.profileImageContainer}>
              <LinearGradient
                colors={['#ffd700', '#fced9c', '#FF8453']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.profileImageRing, isUser && styles.userProfileImageRing ]}>
                {user?.user?.profileURL?.key ? <Image
                  source={{ uri: `${AWS_CDN_URL}${user?.user?.profileURL?.key}` }}
                  style={[styles.profileImage, isUser && {width: 90, height:90, borderRadius: 45}]}
                /> : isSeller ? (
                  <Image source={{uri:storeIcon}} style={styles.profileImage} />
                ) : (
                  <Text style={styles.profileInitials}>
                    {user?.user?.name
                      ? `${user?.user?.name.charAt(
                        0,
                      )}${user?.user?.name.charAt(1)}`
                      : null}
                  </Text>)
                }

                {/* {user?.user?.role === 'seller'&&(<View style={styles.crownIcon}>
            <Image style={{ width: 20, 
    height: 20}}
           source={require('../../assets/images/star.png')} />
          </View>)} */}
              </LinearGradient>
            </TouchableOpacity>

            <View style={[styles.profileInfo, isUser && {marginTop:10}]}>
              <View style={styles.profileTitleRow}>
                <Text allowFontScaling={false} style={styles.profileName}>{user?.user?.sellerData?.companyName||user?.user?.userName}</Text>
                {/* <Text style={styles.profileBadge}>0.0</Text> */}
                {/* <Icon name="verified" size={16} color="dodgerblue" /> */}
              </View>
              {/* <Text style={styles.profileDescription}>
            {user?.user?.bio || 'No Bio Available..'}
          </Text> */}


              {isSeller && <Text allowFontScaling={false}
                style={styles.profileDescription}
                numberOfLines={expanded ? 0 : 3} // 0 = show all
                onTextLayout={(e) => {
          setNumLines(e.nativeEvent.lines.length);
        }}
              >
                 {(user?.user?.bio?.trim().replace(/\s+/g, " ")) || "No Bio Available.."}
              </Text>}

              {isSeller && user?.user?.bio && user?.user?.bio.length > 0 && numLines > 3 && (
                <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                  <Text allowFontScaling={false} style={styles.viewMoreLess}>
                    {expanded ? "View Less" : "View More"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* <Text allowFontScaling = {false}
        style={styles.profileDescription}
      >
        Since {getAccountAge(user?.sellerInfo?.createdAt)}
      </Text> */}

              {isUser && <View style={styles.statsRow}>
                <TouchableOpacity onPress={() => setisFollowers(true)} style={styles.stat}>
                  <Text style={[styles.statNumber, { color: '#FFF', fontWeight: '800', }]}>{formatFollowerCount(user?.follow?.followersCount)}</Text>
                  <Text allowFontScaling={false} style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setisFollowing(true)} style={styles.stat}>
                  <Text style={styles.statNumber}>{formatFollowerCount(user?.follow?.followingCount)}</Text>
                  <Text allowFontScaling={false} style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
              </View>}

              {/* {Array.isArray(products) && products.length > 2 && (<View>
            <View style={{marginBottom:4,backgroundColor:'red',paddingHorizontal: 4,paddingVertical: 1, borderRadius: 24, alignSelf: 'flex-start'}}>
            <Text style={{color:'#fff', fontSize: 10}}>Top Selling Products</Text>
            </View>
         
             <View style={styles.followersAvatars}>
        {Array.isArray(products) && products.slice(0, 2).map((product, index) => (
          <Image
            key={index}
            source={{ uri: `${AWS_CDN_URL}${product?.images[0]?.key}` }}
            style={styles.followerAvatar}
          />
        ))}
        {Array.isArray(products) && products.length > 2 && (
          <Text style={{ color: '#fff', fontSize: 10, marginLeft: 8, alignSelf: 'flex-end' }}>
            +{products.length - 2} more
          </Text>
        )}
      </View>
          </View>)} */}
            </View>
            </View>
            {/* user Bio */}
            {isUser && <Text allowFontScaling={false}
                style={[styles.profileDescription, {marginLeft: 10, marginTop: 16}]}
                numberOfLines={expanded ? 0 : 3} // 0 = show all
                onTextLayout={(e) => {
          setNumLines(e.nativeEvent.lines.length);
        }}
              >
                 {(user?.user?.bio?.trim().replace(/\s+/g, " ")) || "No Bio Available.."}
              </Text>}

              {isUser && user?.user?.bio && user?.user?.bio.length > 0 && numLines > 3 && (
                <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                  <Text allowFontScaling={false} style={[styles.viewMoreLess, {marginLeft: 10}]}>
                    {expanded ? "View Less" : "View More"}
                  </Text>
                </TouchableOpacity>
              )}
          {/* bio  */}
          </View>

          
          {/* Action Buttons */}
          <View style={[styles.actionButtons]}>
            {user?.isOwnProfile ? (
              <TouchableOpacity 
                onPress={() => setIsEditModalVisible(true)} 
                style={styles.followButton}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {/* <Feather name="edit-2" size={16} color="#000" /> */}
                  <Text allowFontScaling={false} style={styles.followButtonText}>Edit Profile</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity disabled={loadingFollow} onPress={() => { setLoadingFollow(true); handleFollowUnfollow(); }} style={styles.followButton}>
                {loadingFollow ? (
                  <ActivityIndicator
                    size={10}
                    color={'#000'}
                  />
                ) : (
                  <Text allowFontScaling={false} style={styles.followButtonText}>{user?.follow?.followStatus === 'Follow' && (user?.user?.role=="user" ?<UserRoundPlus size={16} color="#000" strokeWidth={2.5} />: '+')} {user?.follow?.followStatus || 'Follow'}</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.messageButton, user?.user?.role=="user" &&{borderColor:'#F7CE4552', flexDirection:'row', justifyContent:'center'}]} onPress={() => handleMessage()}>
              {user?.user?.role=="user" && <MessageSquareMore size={18} color={user?.user?.role=="user"?'#F7CE45':'#000'}/>}
              <Text allowFontScaling={false} style={[styles.messageButtonText, user?.user?.role=="user" && {fontWeight:'bold', color:'#F7CE45', marginLeft:8}]}>{user?.user?.role=="seller"?'Message': 'Chat'}</Text>
            </TouchableOpacity>
            {/* {user?.isOwnProfile && 
             <TouchableOpacity style={[styles.shareButton, {marginRight: 10}]} onPress={() => shareProfile()
              }>
              <Text allowFontScaling={false} style={styles.messageButtonText}>
                 Share
              </Text>
            </TouchableOpacity>
            } */}
            {/* {console.log(user)} */}
            {!user?.isOwnProfile && user?.user?.role=="seller" && <TouchableOpacity style={[styles.shareButton, {marginRight: 10}]} onPress={() => setModalVisible(true)
              //shareProfile()
              }>
              <Text allowFontScaling={false} style={styles.messageButtonText}>
                🔔
              </Text>
            </TouchableOpacity>}
             <TouchableOpacity style={[styles.shareButton, user?.user?.role=="user" && {borderColor: '#F7CE4552'}]} onPress={() => setIsShareModalVisible(true)}>

                <AntDesign name="sharealt" size={20} color={user?.user?.role=="user" ? '#F7CE45':'#fff'}/>
              {/* <Text allowFontScaling={false} style={styles.messageButtonText}>
                🔔
              </Text> */}
            </TouchableOpacity>
          </View>


          {/* Stats Icons */}
          {user?.user?.role === 'seller' && (
            <LinearGradient
      colors={user?.user?.role === 'seller'? ['#1a1a1a', '#1a1a1a'] : ['#231B0A', '#230B12']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.statsIcons}
    >
            <TouchableOpacity onPress={() => setisFollowers(true)}>
              <Text style={{ textAlign: 'center', fontSize: 24, fontWeight: '900', color: '#FFC400' }}>{formatFollowerCount(user?.follow?.followersCount)}</Text>
              <Text allowFontScaling={false} style={{ textAlign: 'center', color: '#eee', fontSize: 12, marginTop: 4 }}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setisFollowing(true)}>
              <Text style={{ textAlign: 'center', fontSize: 24, fontWeight: '900', color: '#FFC400' }}>{formatFollowerCount(user?.follow?.followingCount)}</Text>
              <Text allowFontScaling={false} style={{ textAlign: 'center', color: '#eee', fontSize: 12, marginTop: 4 }}>Following</Text>
            </TouchableOpacity>
            { user?.user?.role=="seller" && <>
              <View>
                <Text style={{ textAlign: 'center', fontSize: 24, fontWeight: '900', color: '#FFC400' }}>
                  {performance?.averageShippingDays || 0}
                </Text>
              <Text allowFontScaling={false} style={{ textAlign: 'center', color: '#eee', fontSize: 12, marginTop: 4 }}>Avg Shipping</Text>
            </View>
            <View>
              
                <Text style={{ textAlign: 'center', fontSize: 24, fontWeight: '900', color: '#FFC400' }}>
                  {performance?.totalProductsSold || 0}
                </Text>
              
              <Text allowFontScaling={false} style={{ textAlign: 'center', color: '#eee', fontSize: 12, marginTop: 4 }}>
                Product Sold
              </Text>
            </View>
            </>
            }

             {/* {user?.user?.role=="user" &&<View>
                <Text style={{ textAlign: 'center', fontSize: 24, fontWeight: '900', color: '#FFC400' }}>
                  {savedCount || 0}
                </Text>
              <Text allowFontScaling={false} style={{ textAlign: 'center', color: '#eee', fontSize: 12, marginTop: 4 }}>Saved</Text>
            </View>} */}
          </LinearGradient>)}


          {/* {user?.user?.role === 'seller' && <View style={styles.navigationTabs}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContainer}
            >
              <TouchableOpacity
                style={[styles.navTab, activeTab === 'live' && styles.activeNavTab]}    // styles.activeNavTab
                onPress={() => {
                  setActiveTab('live');
                  scrollToSection('live')
                }}
              >
                
                <Text>🔥</Text>
                <Text allowFontScaling={false} style={[styles.navTabText, activeTab === 'live' && styles.activeNavTabText]}>Live Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navTab, activeTab === 'product' && styles.activeNavTab]}
                onPress={() => {
                  setActiveTab('product');
                  scrollToSection('offers')
                }}
              >
               
                <Text allowFontScaling={false} style={[styles.navTabText, activeTab === 'product' && styles.activeNavTabText]}>⚡ Products</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navTab, activeTab === 'clip' && styles.activeNavTab]}
                onPress={() => {
                  setActiveTab('clip');
                  scrollToSection('videos')
                }}
              >
                <Text allowFontScaling={false} style={[styles.navTabText, activeTab === 'clip' && styles.activeNavTabText]}>📹 Videos</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>} */}


{Array.isArray(likedStores) && likedStores.length > 0 && isUser && (
  <View style={[styles.section, { paddingTop: 4}]}>
    {/* <SectionHeader title="🏪 Top Stores" right="" onPressRight={() => {}} /> */}
     <View style = {[{backgroundColor:'transparent'}, isUser&&{marginLeft: 20, borderStartWidth: 3 , borderStartColor: '#F7CE45', marginBottom: 14}]}>
    <Text style={[styles.sectionTitle, { marginLeft: 10, marginBottom: 0 }]}>{isUser ? 'Most Liked Stores' : 'Most Liked Stores'}</Text>
    </View>
    <FlatList
      data={Array.isArray(likedStores) ? likedStores : []}
      keyExtractor={(item, index) => item?._id?.toString() ?? index.toString()}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={true}
  nestedScrollEnabled={true} // if inside ScrollView
      renderItem={({ item }) => {
        if (!item) return null;
        console.log('Liked Store item:', item);
        return (
          <MostLikedStoreCard
            icon={item?.userInfo?.profileURL?.key || undefined}
            name={item.companyName || 'Unnamed'}
            brand = {item?.sellerType || ''}
            cat={
              Array.isArray(item?.productCategories) && item.productCategories.length > 0
                ? item.productCategories[0]
                : 'Rating'
            }
            rating={'0.0'}
            userInfo={item?.userInfo}
            online={item?.sellerType==='social' || false}
          />
        );
      }}
      contentContainerStyle={styles.storesGrid}
      // ListFooterComponent={() => (
      //   <View style={{ paddingVertical: 6, alignItems: 'center', backgroundColor:'red' }}>
      //     {loadingStores ? (
      //       <ActivityIndicator size="small" color="#F7CE45" />
      //     ) : hasMore ? (
      //       <TouchableOpacity
      //         style={{
      //           paddingHorizontal: 20,
      //           borderRadius: 8,
      //           flexDirection: 'row',
      //         }}
      //         onPress={() => {
      //           const nextPage = page + 1;
      //           setPage(nextPage);
      //           fetchSellersByCity('chennai', nextPage);
      //         }}
      //       >
      //         <Icon name="chevron-double-down" size={22} color="#F7CE45" />
      //         <Text style={{ fontWeight: '600', color: '#F7CE45' }}>Load More</Text>
      //       </TouchableOpacity>
      //     ) : (
      //       <Text style={{ color: '#888' }}>No more Stores</Text>
      //     )}
      //   </View>
      // )}
    />
  </View>
)}

{Array.isArray(topStores) && topStores.length > 0 && isUser && (
  <View style={[styles.section, { paddingTop: 4, }]}>
    {/* <SectionHeader title="🏪 Top Stores" right="" onPressRight={() => {}} */ }
    <View style = {[{backgroundColor:'transparent'}, isUser&&{marginLeft: 20, borderStartWidth: 3 , borderStartColor: '#F7CE45', marginBottom: 14}]}>
    <Text style={[styles.sectionTitle, { marginLeft: 10, marginBottom: 0 }]}>{isUser ? 'Suggested Profiles' : 'Suggested Profiles'}</Text>
    </View>
    <FlatList
      data={Array.isArray(topStores) ? topStores : []}
      keyExtractor={(item, index) => item?._id?.toString() ?? index.toString()}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={true}
  nestedScrollEnabled={true} // if inside ScrollView
      renderItem={({ item }) => {
        if (!item) return null;
        // console.log('Store item:', item);
        return (
          <StoreCard
            icon={item?.userInfo?.profileURL?.key || undefined}
            name={item.companyName || 'Unnamed'}
            cat={
              Array.isArray(item?.productCategories) && item.productCategories.length > 0
                ? item.productCategories[0]
                : 'Rating'
            }
            rating={'0.0'}
            userInfo={item?.userInfo}
            online={item?.sellerType==='social' || false}
          />
        );
      }}
      contentContainerStyle={styles.storesGrid}
      // ListFooterComponent={() => (
      //   <View style={{ paddingVertical: 6, alignItems: 'center', backgroundColor:'red' }}>
      //     {loadingStores ? (
      //       <ActivityIndicator size="small" color="#F7CE45" />
      //     ) : hasMore ? (
      //       <TouchableOpacity
      //         style={{
      //           paddingHorizontal: 20,
      //           borderRadius: 8,
      //           flexDirection: 'row',
      //         }}
      //         onPress={() => {
      //           const nextPage = page + 1;
      //           setPage(nextPage);
      //           fetchSellersByCity('chennai', nextPage);
      //         }}
      //       >
      //         <Icon name="chevron-double-down" size={22} color="#F7CE45" />
      //         <Text style={{ fontWeight: '600', color: '#F7CE45' }}>Load More</Text>
      //       </TouchableOpacity>
      //     ) : (
      //       <Text style={{ color: '#888' }}>No more Stores</Text>
      //     )}
      //   </View>
      // )}
    />
  </View>
)}

    {user?.user?.role === 'seller' && liveShows?.length >0 &&
    <Text style= {{color: '#fff', fontSize: 14, marginLeft: 20, marginBottom:10, fontWeight:'bold'}}>{user?.user?.role !== 'seller' ?'Trending Now' : '🔥 Live now'}</Text>}

    {/* Collection Banner */}
     {user?.user?.role === 'seller' && liveShows?.length >0 && 
     <LinearGradient
       colors={['#E94A3F', '#D73C31', '#C62F26']}
       start={{x: 0, y: 0}}
       end={{x: 1, y: 0}}
       style={styles.collectionBanner}>
        <View style={styles.bannerImageContainer}>
        <Image
          source={{ uri: `${AWS_CDN_URL}${liveShows[0]?.thumbnailImage}` }}
          style={styles.bannerImage} 
        />

        {/* LIVE Badge */}
        {/* {console.log('Show Banner', shows[0])} */}
         {liveShows[0]?.showStatus === 'live' ? (<View style={styles.liveBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>):
         (<View style={[styles.liveBadge, {backgroundColor: '#333'}]}>
            {/* <View style={styles.liveIndicator} /> */}
            <Text style={styles.liveText}>Upcoming</Text>
          </View>)}
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>
          {liveShows[0]?.title}
            </Text>
          {liveShows[0]?.language && <Text style={styles.bannerSubtitle}>{liveShows[0]?.language || 'unknown'}</Text>}
          <Text style={styles.bannerDescription}>{liveShows[0]?.category} {liveShows[0]?.subCategory && '•'}  {liveShows[0]?.subCategory}</Text>
          <View style={{flexDirection:'row', alignItems:'center', 
          justifyContent:
      Array.isArray(products) && products.length > 2
        ? 'space-between'
        : 'flex-end'
            }}>
          {Array.isArray(products) && products.length > 2 && (
            <View>
           
         
             <View style={styles.followersAvatars}>
        {Array.isArray(products) && products.slice(0, 2).map((product, index) => (
          <Image
            key={index}
            source={{ uri: `${AWS_CDN_URL}${product?.images[0]?.key}` }}
            style={styles.followerAvatar}
          />
        ))}
        {Array.isArray(products) && products.length > 2 && (
          <Text style={{ color: '#fff', fontSize: 10, marginLeft: 8, alignSelf: 'flex-end' }}>
            +{products.length - 2} more
          </Text>
        )}
      </View>
          </View>)}
          <View style={styles.bannerButtonContainer}>
          <TouchableOpacity style={styles.bannerButton}
          onPress={() => {
            if (liveShows[0].showStatus == 'live') {
                  navigation.navigate('LiveScreen', {stream: liveShows[0]});
                } else {
                  ToastAndroid.show('This show is not in live...', ToastAndroid.SHORT);
              //     navigation.navigate('UpcomingShowDetail', {
              //   id: liveShows[0]?._id,
              //   hostId: liveShows[0]?.hostId,
              // });
              navigation.navigate('LiveScreen', {stream: liveShows[0]});
                }
          }}
          >
            <Text allowFontScaling={false} style={styles.bannerButtonText}>Join Live</Text>
          </TouchableOpacity>
          </View>
          </View>
        </View>
      </LinearGradient>}


       {/* Upcoming Lives */}

       {user?.user?.role === 'seller' && upcomingShows?.length >0 &&
    <Text style= {{color: '#fff', fontSize: 14, marginLeft: 20, marginBottom:10, fontWeight:'bold'}}>{user?.user?.role !== 'seller' ?'Trending Now' : 'Upcoming Live'}</Text>}


       {user?.user?.role === 'seller' && upcomingShows?.length > 0 && <View style={styles.upcomingLiveCollectionBanner}>
  <FastImage
    source={{
    uri: `${AWS_CDN_URL}${upcomingShows[0]?.thumbnailImage}`,
    priority: FastImage.priority.high,
    cache: FastImage.cacheControl.immutable, // ensures caching for performance
  }}
    style={styles.upcomingLiveBannerBackgroundImage}
  />

  {/* Overlay content on top of image */}
  <View style={styles.upcomingLiveOverlayContent}>
    {/* LIVE / Upcoming Badge */}
    {upcomingShows[0]?.showStatus === 'live' ? (
      <View style={styles.upcomingLiveLiveBadge}>
        <View style={styles.upcomingLiveLiveIndicator} />
        <Text style={styles.upcomingLiveLiveText}>LIVE</Text>
      </View>
    ) : (
      <View style={[styles.upcomingLiveLiveBadge, { backgroundColor: '#333' }]}>
        <Text style={styles.upcomingLiveLiveText}>Upcoming</Text>
      </View>
    )}

    {/* Banner Text Content */}
    <View style={styles.upcomingLiveBannerContent}>
      <Text style={styles.upcomingLiveBannerTitle}>{upcomingShows[0]?.title}</Text>
      <Text style={styles.upcomingLiveBannerDescription}>
        {upcomingShows[0]?.category} 
        {/* {upcomingShows[0]?.subCategory && '•'} {upcomingShows[0]?.subCategory} */}
      </Text>

      {/* Product Avatars + Button */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent:
            Array.isArray(products) && products.length > 2
              ? 'space-between'
              : 'flex-end',
        }}
      >
        {Array.isArray(products) && products.length > 2 && (
          <View>
            <View style={styles.upcomingLiveFollowersAvatars}>
              {products.slice(0, 2).map((product, index) => (
                <Image
                  key={index}
                  source={{ uri: `${AWS_CDN_URL}${product?.images[0]?.key}` }}
                  style={styles.upcomingLiveFollowerAvatar}
                />
              ))}
              <Text
                style={{
                  color: '#fff',
                  fontSize: 10,
                  marginLeft: 8,
                  alignSelf: 'flex-end',
                }}
              >
                +{products.length - 2} more
              </Text>
            </View>
          </View>
        )}
        <View style={styles.upcomingLiveBannerButtonContainer}>
          <TouchableOpacity
            style={styles.upcomingLiveBannerButton}
            onPress={() => {
              if (upcomingShows[0].showStatus == 'live') {
                navigation.navigate('LiveScreen', { stream: upcomingShows[0] });
              } else {
                ToastAndroid.show('This show is not in live...', ToastAndroid.SHORT);
                // navigation.navigate('UpcomingShowDetail', {
                //   id: upcomingShows[0]?._id,
                //   hostId: upcomingShows[0]?.hostId,
                // });
                 navigation.navigate('LiveScreen', { stream: upcomingShows[0] });
              }
            }}
          >
            <Text allowFontScaling={false} style={styles.upcomingLiveBannerButtonText}>
              View
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
</View>}
     
      

          {/* Upcoming Lives */}
          {/* {Array.isArray(shows) && shows?.length > 1 && (<View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, user.user?.role != 'seller' && { fontSize: 13, color: '#eee' }]}>{user.user?.role === 'seller' ? '🔴 Upcoming & Live' : '🔴 Recommended Live'}</Text>
              {user?.user?.role != 'seller' && <TouchableOpacity onPress={() => navigation.navigate('GlobalSearch')}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>}
            </View>
             <View style={{ marginHorizontal: 10, backgroundColor: 'rgba(255,0,64,0.03)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)' }}>
            <Animated.FlatList
              data={shows}
              renderItem={renderLiveCard}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.horizontalList, { paddingHorizontal: 0 }]}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: liveScrollX } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
            />
            </View>
          </View>)} */}

          {/* Top Selling Products */}
          {/* {Array.isArray(products) && products?.length > 0 && (<View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Selling Products</Text>
              {<TouchableOpacity 
              
              onPress= {()=>{
                if(user?.user?.role != 'seller'){
                 navigation.navigate('GlobalSearch', { tabName: 'products' })
                }
                else{
                  navigation.navigate('Store', {sellerId: user?.user?.sellerData?._id,tabName:'product'});
                }
              }}
>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>}
            </View>
            <FlatList
              data={products}
              renderItem={renderFlashProductCard}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            // numColumns={2}
            />
          </View>)} */}

          {/* Flash Sales Section - LIVE */}
          {user?.user?.role === 'seller' && liveFlashSales && liveFlashSales.length > 0 && (
            <View style={styles.section}>

               {/* Flash Banner */}
                      {liveFlashSales?.length > 0 && (
                        <LinearGradient
                          colors={['#DC2626', '#EF4444']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.flashBanner}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.flashTitle}>⚡ Flash Sale LIVE</Text>
                            {/* <Text style={styles.flashTimer}>Ends in 23:45:12</Text> */}
                            {liveFlashSales[0]?.endTime ? (
                              <Text style={styles.flashTimer}>
                                Ends in {days > 0 ? `${days}d ` : ''}
                                {String(hours).padStart(2, '0')}h{` `}:
                                {String(minutes).padStart(2, '0')}m
                                {/* {String(seconds).padStart(2, "0")} s */}
                              </Text>
                            ) : (
                              <Text style={styles.flashTimer}>Ends soon</Text>
                            )}
                          </View>
                          {/* <TouchableOpacity style={styles.flashCta}>
                            <Text style={styles.flashCtaText}>Shop Now</Text>
                          </TouchableOpacity> */}
                          <FastImage source={{ uri: SaleGif }} style={{ width: 80, height: 40 }} />
                        </LinearGradient>
                      )}
                      
              {/* <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔥 Live Flash Sales</Text>
                {liveFlashSales.length > 0 && (
                  <Text style={styles.viewAllText}>
                    {liveFlashSales.length} {liveFlashSales.length === 1 ? 'sale' : 'sales'}
                  </Text>
                )}
              </View> */}
              {flashSalesLoading ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#FFD700" />
                </View>
              ) : (
                <>
                  <FlatList
                    data={liveFlashSales}
                    renderItem={({ item }) => (
                      <FlashSaleCard
                        sale={item}
                        navigation = {navigation}
                      />
                    )}
                    keyExtractor={(item) => item._id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}
                  />
                  {hasMoreLive && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={loadMoreLive}
                      disabled={flashSalesLoading}
                    >
                      {flashSalesLoading ? (
                        <ActivityIndicator size="small" color="#FFD700" />
                      ) : (
                        <>
                          <Icon name="add-circle-outline" size={20} color="#FFD700" />
                          <Text style={styles.loadMoreButtonText}>Load More Live Sales</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          {/* Flash Sales Section - UPCOMING */}
          {user?.user?.role === 'seller' && upcomingFlashSales && upcomingFlashSales.length > 0 && (
            <View style={styles.section}>
              {/* <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>⏰ Upcoming Flash Sales</Text>
                {upcomingFlashSales.length > 0 && (
                  <Text style={styles.viewAllText}>
                    {upcomingFlashSales.length} {upcomingFlashSales.length === 1 ? 'sale' : 'sales'}
                  </Text>
                )}
              </View> */}

               {/* Upcoming Flash Sales Header */}
                      {upcomingFlashSales?.length > 0 && (
                        <LinearGradient
                          colors={['#DC2626', '#EF4444']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.flashBanner, {marginTop: 0}]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.flashTitle}>⚡ Flash Sale UPCOMING</Text>
                            {/* <Text style={styles.flashTimer}>starts in 23:45:12</Text> */}
                            {upcomingFlashSales[0]?.startTime ? (
                              <Text style={styles.flashTimer}>
                                Starts in {startDay > 0 ? `${startDay}d ` : ''}
                                {String(startHour).padStart(2, '0')}h{` `}:
                                {String(startMinute).padStart(2, '0')}m
                                {/* {String(startSecond).padStart(2, "0")} */}
                              </Text>
                            ) : (
                              <Text style={styles.flashTimer}>starts soon</Text>
                            )}
                          </View>
                          {/* <TouchableOpacity style={styles.flashCta}>
                            <Text style={styles.flashCtaText}>Coming soon</Text>
                          </TouchableOpacity> */}
                          <FastImage source={{ uri: Upcoming }} style={{ width: 80, height: 40 }} />
                        </LinearGradient>
                      )}
              

              {flashSalesLoading ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#FFD700" />
                </View>
              ) : (
                <>
                  <FlatList
                    data={upcomingFlashSales}
                    renderItem={({ item }) => (
                      <FlashSaleCard
                        sale={item}
                        navigation = {navigation}         
                      />
                    )}
                    keyExtractor={(item) => item._id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}
                  />
                  {hasMoreUpcoming && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={loadMoreUpcoming}
                      disabled={flashSalesLoading}
                    >
                      {flashSalesLoading ? (
                        <ActivityIndicator size="small" color="#FFD700" />
                      ) : (
                        <>
                          <Icon name="add-circle-outline" size={20} color="#FFD700" />
                          <Text style={styles.loadMoreButtonText}>Load More Upcoming Sales</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          {/* Shop from Videos */}
          {user?.user?.role=="seller" && Array.isArray(shoppableVideos) && shoppableVideos?.length > 0 && (<View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{user?.user?.role === 'seller' ? '📹 Shop from Videos' : '📹 Trending Videos'}</Text>
              {<TouchableOpacity 
              onPress = {()=>{
                if(user?.user?.role != 'seller'){
                  navigation.navigate('GlobalSearch', { tabName: 'videos' })
                }
                else{
                  navigation.navigate('Store', {sellerId: user?.user?.sellerData?._id,tabName:'clip'});
                }
              }}
              >
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>}
            </View>
            <FlatList
              data={shoppableVideos}
              renderItem={renderVideoCard}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>)}

                   {user?.user?.role=="seller" && Array.isArray(products) && products?.length > 0 && (<View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{user?.user?.role != 'seller'?'Trending Products':'Top Selling Products'}</Text>
              {<TouchableOpacity 
              
              onPress= {()=>{
                if(user?.user?.role != 'seller'){
                 navigation.navigate('GlobalSearch', { tabName: 'products' })
                }
                else{
                  navigation.navigate('Store', {sellerId: user?.user?.sellerData?._id,tabName:'product'});
                }
              }}
>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>}
            </View>
            <FlatList
              data={products.slice(0,4)}
              renderItem={renderTopSellingCard}
              keyExtractor={(item) => item._id}
             // horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingHorizontal: 16,  // space from screen edges
    paddingVertical: 8,
    rowGap: 16,    }}
             numColumns={2}
             columnWrapperStyle={{justifyContent: 'flex-start', // spreads two items evenly
    columnGap: 16,   }} 
              scrollEnabled={false}
            />
          </View>)}

          {/* {user?.user?.role === 'seller' && Array.isArray(shows) && shows?.length === 0 && Array.isArray(shoppableVideos) && shoppableVideos?.length === 0 && Array.isArray(products) && products?.length === 0 && (<View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={{ color: '#999' }}>No {activeTab} Available</Text>
          </View>)} */}
        </View>
      </ScrollView>
      <SellerMuteModal
        sellerId={user?.user?.sellerData?._id}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
      
      {/* Profile Edit Modal */}
      {user?.user?._id && user?.isOwnProfile && isEditModalVisible && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <ProfileEditScreen
            setIsEditModalVisible={setIsEditModalVisible}
            setUser={setuser}
            user={user?.user}
            onSaveSuccess={(newUsername) => {
              // Refresh user data after profile update with new username
              fetchuser(newUsername);
            }}
          />
        </Modal>
      )}
      
        {/* Floating Quick Actions */}
        {user?.user?.role === 'seller' && <View style={styles.quickFloat}>
          {/* <TouchableOpacity style={styles.floatBtn}><Text style={styles.floatEmoji}>🎯</Text></TouchableOpacity> */}
          <TouchableOpacity
            style={[styles.floatBtn, styles.floatPrimary]}
            onPress={() => {
               navigation.navigate('Store', {sellerId: user?.user?.sellerData?._id,tabName:'product'});
            }}
          >
            <Image
            source={{uri:storeIcon}}
              style={styles.storeImage}
            />
          </TouchableOpacity>
        </View>}
      
      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalVisible}
        onClose={() => setIsShareModalVisible(false)}
        shareContent={`Check out ${user?.user?.userName}'s profile!`}
        shareUrl={`${shareUrl}profile/${user?.user?.userName}`}
        onShare={(platform, selectedChats) => {
          console.log('Profile shared via:', platform, selectedChats);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  profileHeader: {
   // flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,  //20,
    // paddingTop: 40,
    backgroundColor: '#1a1a1a',
    margin: 20,
    marginBottom: 20,
    borderRadius: 24,
    marginTop: 10
    // position: 'absolute',
    // top: 80
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profileImage: {
    width: 120, //80,
    height: 120,  //80,
    borderRadius: 65,  //40,
  },
    profileImage1: {
    width: 120, //80,
    height: 120,  //80,
    borderRadius: 65,  //40,
  },
  profileImageRing: {
    width: 126, //86,
    height: 126, //86,
    borderRadius: 999, //43,
    //borderWidth: 2,
    // borderColor: '#E4405F', // Instagram gradient color simplified
    justifyContent: 'center',
    alignItems: 'center',
  },
    userProfileImageRing: {
    width: 96, //86,
    height: 96, //86,
    borderRadius: 999, //43,
    //borderWidth: 2,
    // borderColor: '#E4405F', // Instagram gradient color simplified
    justifyContent: 'center',
    alignItems: 'center',
  },
  crownIcon: {
    position: 'absolute',
    left: 50,
    bottom: -12,
    //backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 4,
  },
  profileInfo: {
    marginTop: 18,
    flex: 1,
    //  backgroundColor:'blue'
  },
  profileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 10,
  },
  profileBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 10,
    marginRight: 5,
  },
  profileDescription: {
    color: '#ddd',
    fontSize: 14,
    // marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  stat: {
    marginRight: 20,
  },
  statNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20, //16,
  },
  statLabel: {
    color: '#ddd',
    fontSize: 12,
  },
  followersAvatars: {
    flexDirection: 'row',
  },
  followerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: -8,
    // borderWidth: 2,
    // borderColor: '#1a1a1a',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,  //20
    marginBottom: 20,
  },
  followButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 0,  //30
    paddingVertical: 10,
    borderRadius: 8, //20,
    marginRight: 10,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  followButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  messageButton: {
    backgroundColor: '#1C1C1C',
    borderWidth: 0.5,
    borderColor: '#666',
    paddingHorizontal: 0,
    paddingVertical: 10,
    borderRadius: 8,//20,
    marginRight: 10,
    flex: 1,
    alignItems: 'center',
  },
  messageButtonText: {
    color: 'white',
    textAlign: 'center'
  },
  shareButton: {
    backgroundColor: '#1C1C1C',
    borderWidth: 0.5,
    borderColor: '#666',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
    shareButton1: {
   backgroundColor: 'rgba(28, 28, 28, 0.7)',
  //  borderWidth: 1,
    borderColor: '#666',
    paddingHorizontal: 11, //15,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 60,
    right: 10
  },
  statsIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor:'#1A1A1A',
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#F7CE452B",
    paddingVertical: 14,
    //  marginTop: 100
  },
  // statIcon: {
  //   alignItems: 'center',
  // },
  statIconNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 5,
  },
  statIconLabel: {
    color: '#eee',
    fontSize: 8,
    textAlign: 'center'
  },
  statIcon: {
    backgroundColor: '#333',
    alignItems: "center",
    justifyContent: 'center',
    //  marginHorizontal: 10, // spacing between icons
    width: 60,
    height: 60,
    borderRadius: 35, // fully rounded
    borderWidth: 1,
    borderColor: "#FFD700", // gold border
  },
  statIconImage: {
    width: 25,
    height: 25,
    borderRadius: 12
  },
  flashSale: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  flashSaleHeader: {
    flex: 1,
  },
  flashSaleText: {
    color: '#FF4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  flashSaleTimer: {
    color: '#999',
    fontSize: 12,
    marginTop: 5,
  },
  joinButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 15,
  },
  joinButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  navigationTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#161616',
    borderColor: '#222',
    borderWidth: 1
  },
  activeNavTab: {
    //backgroundColor: '#FFD700',
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderColor: '#FFD700',
    borderWidth: 0.2,
  },
  navTabText: {
    color: '#fff',
    marginLeft: 5,
    textAlign: 'center',
    fontSize: 13
  },
  activeNavTabText: {
    color: '#FFD700',          //'#000',
    fontWeight: 'bold',
  },
  collectionBanner: {
   // backgroundColor: '#FF4444',
    marginHorizontal:20,
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  bannerImageContainer: {
    width: 100,
    height: 100,
    overflow: 'hidden',
    borderRadius: 10,
    margin : 10,
    marginRight: 0,
  },
  bannerImage: {
       width: '100%',
    height: '100%',
  },
  bannerContent: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  bannerTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bannerSubtitle: {
    color: 'white',
    fontSize: 14,
    marginVertical: 5,
  },
  bannerDescription: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
  bannerButtonContainer: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  bannerButton: {
    backgroundColor: '#fff',   //'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
   // alignSelf: 'flex-end',
   // marginTop: 10,
  },
  bannerButtonText: {
    color: '#E94A3F',   //'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  //  backgroundColor:'red'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
    //backgroundColor:'red'
  },
  sectionTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    // paddingHorizontal: 20,
    //  marginBottom: 15,
  },
  viewAllText: {
    color: '#FFD700',
    fontSize: 12,
  },
  horizontalList: {
    paddingHorizontal: 15,
  },
  liveCard: {
    width: 120,
   // marginHorizontal: 5,
   marginRight: 5,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 10,
  },
  liveCardImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    marginRight: 5,
  },
  liveText: {
    color: '#FF4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  liveCardTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  liveCardPrice: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  videoCard: {
    // width: 150,
    width: ITEM_WIDTH - 10,
    height: 270,
    marginHorizontal: 5,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  videoCardImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
    alignItems: 'flex-end',
  },
  videoViews: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  videoDuration: {
    color: 'white',
    fontSize: 10,
  },
  offerCard: {
    width: 160,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 5,
  },
  offerImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  offerTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  offerPrice: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  offerOriginalPrice: {
    color: '#999',
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginBottom: 10,
  },
  buyNowButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 6,
    borderRadius: 15,
    alignItems: 'center',
  },
  buyNowText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  topSellingCard: {
    width: ITEM_WIDTH - 25,        //100,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 8,
    marginHorizontal: 5,
  },
  topSellingImage: {
    width: '100%',
    height: 126,
    borderRadius: 8,
    marginBottom: 8,
  },
  topSellingTitle: {
    color: 'white',
    fontSize: 10,
    marginBottom: 5,
  },
  topSellingPrice: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  topSellingBuyButtonContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  topSellingBuyButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  topSellingBuyText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadMoreCard: {
    width: 120,
    height: 140,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderStyle: 'dashed',
  },
  loadMoreText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  reviewsSection: {
    backgroundColor: '#2a2a2a',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    marginBottom: 40,
  },
  reviewsSubtitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 20,
  },
  rateTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  writeReviewTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  reviewInput: {
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
    padding: 15,
    height: 80,
    marginBottom: 20,
  },
  reviewPlaceholder: {
    color: '#999',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overallRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingNumber: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
  },
  ratingStars: {
    flexDirection: 'row',
    marginRight: 10,
  },
  ratingText: {
    color: '#999',
    fontSize: 14,
  },
  individualReview: {
    backgroundColor: '#3a3a3a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  reviewerName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reviewStars: {
    flexDirection: 'row',
    marginBottom: 10,
  },

  galleryItem: {
    width: ITEM_WIDTH,
    // height:ITEM_WIDTH*2,
    marginHorizontal: 4,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#121212',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // alignItems:'center',4
    alignSelf: 'center',
    elevation: 10,
    borderColor: 'gray',
    borderWidth: 0.5,
  },
  imageContainer: {
    position: 'relative',
    //borderTopLeftRadius: 8,
    //borderTopRightRadius: 8,
    overflow: 'hidden',

    // padding:10,
    borderRadius: 8,
  },
  galleryImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#333',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  productDetails: {
    padding: 10,
  },
  productTitle: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 6,
    color: '#fff',
    position: 'absolute',
    bottom: 10,
    left: 10,
    // backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
  },


  liveCard: {
    width: THREE_ITEM_WIDTH,  //width -20
    height: 200, // 190, // fixed height so image can fill card
    //marginHorizontal: 5,
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden', // ensures image + overlays respect rounded corners
    backgroundColor: '#2a2a2a',
  },

  liveCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 8,
    justifyContent: 'flex-end', // title at bottom
    padding: 8,
  },

  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    marginRight: 5,
  },

  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  liveCardTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  videoStats: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  viewsText: {
    //  position: 'absolute',
    //  bottom: 10,
    //  left: 10,
    color: '#fff',
    fontWeight: '500',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    // textAlign: 'center',
  },
  bottomInfo: {
    width: '90%',
    position: 'absolute',
    bottom: 14,
    left: 10,
    // flexDirection: 'row',
    // alignItems: 'center',
    // justifyContent: 'center',
    // backgroundColor:'green'
  },

  profileInitials: {
    color: '#121212',
    fontSize: 28,
    fontWeight: 'bold',
    textTransform: 'uppercase',
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
    paddingVertical: 0,
  },


  viewMoreLess: {
    color: "#60A5FA", // nice blue
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 10,
  },
  topDealTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F7CE45', // orange

    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    zIndex: 1,
  },
  topDealText: {
    color: '#333',
    fontSize: 10,
    fontWeight: '600',
  },

  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF0040',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10 // 6,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  discountButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 7,
    paddingHorizontal: 5,
  },
  discountTag: {
    flexDirection: 'row',
    gap: 1,
    alignItems: 'center',
    borderRadius: 4,
  },
  flashSaleTimerPosition: {
    position: 'absolute',
    bottom: 10,
    right: 5,
    flexDirection: 'column',
    gap: 2,
  },

  productScrollContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },

  productScroll: {
    alignItems: 'center',
  },

  productCard: {
    width: 80,
    height: 100,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
  },

  productImage: {
    width: '100%',
    height: '75%',
  },

  priceContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 4,
    alignItems: 'center',
  },

  priceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  moreButton: {
    width: 80,
    height: 100,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  moreButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },

  quickFloat: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    bottom: 60,
    gap: 8,
   // backgroundColor:'red'
  },
  floatBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(20,20,20,0.9)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  floatPrimary: {
    width: 58,
    height: 58,
    borderRadius: 34,
   // backgroundColor: '#FFA500',
    backgroundColor: '#ffd400',
    padding: 10
  },
  storeImage: {
    width: '100%',
    height: '100%',
 //   borderRadius: 24,
    resizeMode: 'cover',
  },

  gradient: {
    borderRadius: 24,
    padding: 20,
    minHeight: 220,
  },
  content: {
    flexDirection: 'row',
    gap: 20,
  },

  // Left Section - Image
  leftSection: {
    width: 180,
  },
  imageContainer: {
    width: 180,
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#E94A3F',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  liveIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  liveCollectionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Right Section - Details
  rightSection: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  viewingContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  viewingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    marginTop: 40,
    marginBottom: 8,
  },
  price: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 64,
    marginBottom: 8,
  },
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  bidText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },
  dot: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  endsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Product Images
  productsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  productImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  productImageOverlap: {
    marginLeft: -20,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  moreProductsBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -20,
  },
  moreProductsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Join Button
  joinButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  joinButtonText: {
    color: '#E94A3F',
    fontSize: 18,
    fontWeight: '700',
  },

  
  upcomingLiveCollectionBanner: {
    position: 'relative',
   // width: '80%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    margin: 20,
    marginTop: 4
  },
  upcomingLiveBannerBackgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  upcomingLiveOverlayContent: {
   position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  upcomingLiveLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E94A3F',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  upcomingLiveLiveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  upcomingLiveLiveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  upcomingLiveBannerContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  upcomingLiveBannerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  upcomingLiveBannerSubtitle: {
    color: '#ddd',
    fontSize: 14,
    marginVertical: 4,
  },
  upcomingLiveBannerDescription: {
    color: '#ccc',
    fontSize: 12,
  },
  upcomingLiveFollowersAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  upcomingLiveFollowerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: -8,
    borderWidth: 1,
    borderColor: '#fff',
  },
  upcomingLiveBannerButtonContainer: {
    alignSelf: 'flex-end',
  },
  upcomingLiveBannerButton: {
    backgroundColor: '#ffd700',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  upcomingLiveBannerButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },

  storesGrid: {
   // flexDirection: 'row',
    // flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
   // flexWrap: 'wrap',
   // backgroundColor:'green',
   // width: width,
    paddingHorizontal: 20
  },
  storeCard: {
    // width: (375 - 20 - 16) / 3,

    flexShrink: 1,
    //flexBasis: (width - 24 - 10) / 3,
    width:  (width - 24 - 10) / 3,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor:  '#F7CE4521',  //'rgba(255,255,255,0.1)',
  //  marginBottom: 8,
  },
  activeStoreCard: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderColor: '#FFD700',
    borderWidth: 0.2,
  },
  storeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  storeAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    resizeMode: 'cover',
  },
  storeAvatarEmoji: {fontSize: 20},
  storeStatus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00ff88',
    borderWidth: 2,
    borderColor: '#141414',
  },
  storeName: {fontSize: 10, fontWeight: '700', color: '#fff', 
    marginBottom: 10,  //2
  },
  storeCategory: {fontSize: 9, color: '#888', marginBottom: 4},
  storeRating: {fontSize: 9, color: '#FFD700'},
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  loadMoreButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },


  flashBanner: {
    marginHorizontal: 18,
    marginTop: 4, // 12,
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4d6d',
  },
  flashTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  flashTimer: { fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  flashCta: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  flashCtaText: { fontSize: 11, fontWeight: '700', color: '#fff' },

    favStoreCard: {
    // width: (375 - 20 - 16) / 3,

    flexShrink: 1,
    //flexBasis: (width - 24 - 10) / 3,
    width:  (width - 24 - 10) / 2,
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F7CE4578', // '#F7CE4521',  //'rgba(255,255,255,0.1)',
  //  marginBottom: 8,
  paddingTop: 20
  },
  favActiveStoreCard: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderColor: '#FFD700',
    borderWidth: 0.2,
  },
  favStoreAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
    borderWidth:2,
    borderColor:'#ffd700'
  },
  favStoreAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    resizeMode: 'cover',
  },
  favStoreAvatarEmoji: {fontSize: 20},
  favStoreStatus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00ff88',
    borderWidth: 2,
    borderColor: '#141414',
  },
  favStoreName: {
    marginLeft: 10,
    alignSelf:'left' ,
    fontSize: 11, fontWeight: '700', color: '#ffd700', marginBottom: 2},
  favStoreCategory: {
    marginLeft: 10,
    alignSelf:'left' ,
    fontSize: 10, color: '#ABABAB', marginBottom: 4},
  favStoreRating: {
    marginLeft: 7,
    alignSelf:'left',
    marginBottom: 6,
    fontSize: 10, color: '#ABABAB'},
});

export default ViewSellerProfile;
