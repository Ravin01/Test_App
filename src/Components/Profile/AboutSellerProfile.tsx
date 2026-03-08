import React, { useRef, useState, useTransition, useContext, useEffect, useCallback, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  ToastAndroid, Share,  Pressable,
} from 'react-native';
import { AuthContext } from '../../Context/AuthContext';
import axiosInstance from '../../Utils/Api';
import { AWS_CDN_URL } from '../../Utils/aws';
import { intialAvatar } from '../../Utils/Constants';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import SellerHeader from '../SellerComponents/SellerForm/Header';
import { CheckCheck } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import {shareUrl} from '../../../Config';
import ProfileEditScreen from './ProfileImageEdit';
import MobileVerificationModal from '../AuthScreens/MobileVerificationModal';
import FollowersList from './FollowersList';
import ImageModal from './ImageModal';
import { storeIcon } from '../../assets/assets';
import ShareModal from '../Reuse/ShareModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['Register Live', 'Wishlist', 
  //'Reviews',
   'Collections'];

interface UserData {
  _id: string;
  userName: string;
  profileURL?: { key: string };
  bio?: string;
}

interface FollowersInfo {
  follow?: {
    followersCount: number;
    followingCount: number;
  };
  user?: UserData;
}

export default function AboutUserProfile() {
  const navigation = useNavigation();
  const { user, setuser }: any = useContext(AuthContext);
  const flatListRef = useRef<FlatList>(null);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [followersInfo, setFollowersInfo] = useState<FollowersInfo>({});
  const [liveShows, setLiveShows] = useState([]);
  const [registeredShows, setRegisteredShows] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [shoppableVideos, setShoppableVideos] = useState([]);
  const [featuredLiveShow, setFeaturedLiveShow] = useState(null);
  const [loading, setLoading] = useState({
    shows: false,
    wishlist: false,
    videos: false,
    profile: true,
    featured: false,
  });
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const refreshAbortControllerRef = useRef<AbortController | null>(null);
  const isRefreshingRef = useRef(false);

  const optionsMenuRef = useRef(null);

  const [mobileVerificationModalVisible, setMobileVerificationModalVisible] = useState(false);

  const [isFollowers, setIsFollowers] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isImageModal, setIsImageModal] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [bioExceedsLimit, setBioExceedsLimit] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);

  // const [selectedProduct, setSelectedProduct] = useState({});
  // const [showCheckOut, setShowCheckOut] = useState(false);

 // console.log('user Info:', user);

  // ============================================
  // COMMENTED OUT: Old share logic using React Native's Share API
  // Now using ShareModal component instead
  // ============================================
  // const shareProfile = async () => {
  //   try {
  //     const message = `Check out ${user?.userName}'s profile!`;
  //
  //     const link = `${shareUrl}profile/${user?.userName}`;
  //
  //     const result = await Share.share({
  //       message: `${message} ${link}`,
  //       url: link, // iOS uses this
  //       title: `${user.name}'s Profile`, // Android uses this
  //     });
  //
  //     if (result.action === Share.dismissedAction) {
  //       console.log('Share dismissed');
  //     }
  //   } catch (error) {
  //     console.error('Error sharing profile:', error);
  //   }
  // };
  // ============================================

  // Fetch user profile data with cancellation support
  const fetchUserProfile = useCallback(async (signal?: AbortSignal, usernameOverride?: string) => {
    try {
      setLoading(prev => ({ ...prev, profile: true }));
      const username = usernameOverride || encodeURIComponent(user?.userName);
      const response = await axiosInstance.get(`/profile/${username}`, {
        signal,
      });
      
      if (!signal?.aborted) {
        setFollowersInfo(response.data.data);
      }
      return { success: true };
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.log('Profile fetch cancelled');
        return { success: false, cancelled: true };
      }
      console.error('Error fetching profile:', error);
      return { success: false, error: error.message };
    } finally {
      if (!signal?.aborted) {
        setLoading(prev => ({ ...prev, profile: false }));
      }
    }
  }, [user?.userName]);

  // Fetch seller's shows with cancellation support
  const fetchRegisteredShows = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(prev => ({ ...prev, shows: true }));
      const sellerId = user?.sellerInfo?._id || user?.user?.sellerInfo;
      
      if (!sellerId) {
        console.log('No seller ID found for user');
        return { success: false, error: 'No seller ID' };
      }
      
      const response = await axiosInstance.get(`/profile/${sellerId}/shows`, {
        params: { page: 1, limit: 20 },
        signal,
      });
      
      if (!signal?.aborted) {
        const allShows = response.data?.data || [];
        
        // Filter live shows (has liveStreamId or status is 'live')
        const liveShowsFiltered = allShows.filter((show: any) => 
          show.liveStreamId !== null || show.showStatus === 'live'
        );
        
        // Filter upcoming shows (created status and no liveStreamId)
        const upcomingShows = allShows.filter((show: any) => 
          show.showStatus === 'created' && show.liveStreamId === null
        );
        
        setLiveShows(liveShowsFiltered);
        setRegisteredShows(upcomingShows);
      }
      return { success: true };
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.log('Shows fetch cancelled');
        return { success: false, cancelled: true };
      }
      console.error('Error fetching seller shows:', error);
      return { success: false, error: error.message };
    } finally {
      if (!signal?.aborted) {
        setLoading(prev => ({ ...prev, shows: false }));
      }
    }
  }, [user]);

  // Fetch seller's products with cancellation support
  const fetchWishlistItems = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(prev => ({ ...prev, wishlist: true }));
      const sellerId = user?.sellerInfo?._id || user?.user?.sellerInfo;
      
      if (!sellerId) {
        console.log('No seller ID found for user');
        return { success: false, error: 'No seller ID' };
      }
      
      const response = await axiosInstance.get(`/profile/${sellerId}/products`, {
        params: { page: 1, limit: 20 },
        signal,
      });
      
      if (!signal?.aborted) {
        setWishlistItems(response.data?.data || []);
      }
      return { success: true };
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.log('Products fetch cancelled');
        return { success: false, cancelled: true };
      }
      console.error('Error fetching seller products:', error);
      return { success: false, error: error.message };
    } finally {
      if (!signal?.aborted) {
        setLoading(prev => ({ ...prev, wishlist: false }));
      }
    }
  }, [user]);

  const fetchFeaturedShowDetails = useCallback(async (signal?: AbortSignal) => {
  if (!liveShows || liveShows.length === 0 || !liveShows[0]?._id) {
    return { success: false };
  }

  try {
    setLoading(prev => ({ ...prev, featured: true }));
    const streamId = liveShows[0]._id;   // have to chnge later to 0
    
    const response = await axiosInstance.get(`/shows/get/live/${streamId}`, { signal });
    
    if (!signal?.aborted && response.data) {
      setFeaturedLiveShow(response.data);
    }
    return { success: true };
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'CanceledError') {
      return { success: false, cancelled: true };
    }
    console.error('Error fetching featured show:', error);
    return { success: false, error: error.message };
  } finally {
    if (!signal?.aborted) {
      setLoading(prev => ({ ...prev, featured: false }));
    }
  }
}, [liveShows]);


  // Fetch seller's shoppable videos with cancellation support
  const fetchShoppableVideos = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(prev => ({ ...prev, videos: true }));
      const sellerId = user?.sellerInfo?._id || user?.user?.sellerInfo;
      
      if (!sellerId) {
        console.log('No seller ID found for user');
        return { success: false, error: 'No seller ID' };
      }
      
      const response = await axiosInstance.get(`/profile/${sellerId}/shoppableVideos`, {
        params: { page: 1, limit: 20 },
        signal,
      });
      
      if (!signal?.aborted) {
        setShoppableVideos(response.data?.data || []);
      }
      return { success: true };
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.log('Videos fetch cancelled');
        return { success: false, cancelled: true };
      }
      console.error('Error fetching shoppable videos:', error);
      return { success: false, error: error.message };
    } finally {
      if (!signal?.aborted) {
        setLoading(prev => ({ ...prev, videos: false }));
      }
    }
  }, [user]);

  // Initial data load
  useEffect(() => {
    
    const abortController = new AbortController();
    
    const loadInitialData = async () => {
      await Promise.allSettled([
        fetchUserProfile(abortController.signal),
        fetchRegisteredShows(abortController.signal),
        fetchShoppableVideos(abortController.signal),
        fetchWishlistItems(abortController.signal),
      ]);
    };

    loadInitialData();

    return () => {
      abortController.abort();
    };
  }, []);

  // Refresh all data with proper error handling and cancellation
  const refreshData = useCallback(async (signal?: AbortSignal, usernameOverride?: string) => {
    try {
      // Execute all fetches with timeout
      const results = await Promise.race([
        Promise.allSettled([
          fetchUserProfile(signal, usernameOverride),
          fetchRegisteredShows(signal),
          fetchShoppableVideos(signal),
          fetchWishlistItems(signal),
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Refresh timeout')), 15000)
        ),
      ]) as PromiseSettledResult<any>[];

      // Check if any request was cancelled
      const wasCancelled = results.some(
        result => result.status === 'fulfilled' && result.value?.cancelled
      );

      if (wasCancelled || signal?.aborted) {
        return { success: false, cancelled: true };
      }

      // Check for errors
      const errors = results
        .filter(result => result.status === 'fulfilled' && result.value?.error)
        .map(result => (result as PromiseFulfilledResult<any>).value.error);

      if (errors.length > 0) {
        return { success: false, errors };
      }

      return { success: true };
    } catch (error: any) {
      if (error.message === 'Refresh timeout') {
        console.error('Refresh timeout after 15 seconds');
        return { success: false, timeout: true };
      }
      console.error('Error refreshing data:', error);
      return { success: false, error: error.message };
    }
  }, [fetchUserProfile, fetchRegisteredShows, fetchWishlistItems, fetchShoppableVideos]);

  // Pull-to-refresh handler with all edge cases covered
  const onRefresh = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingRef.current) {
      console.log('Refresh already in progress, ignoring...');
      return;
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      ToastAndroid.show('No internet connection', ToastAndroid.SHORT);
      return;
    }

    // Cancel any ongoing refresh
    if (refreshAbortControllerRef.current) {
      refreshAbortControllerRef.current.abort();
    }

    // Create new abort controller
    refreshAbortControllerRef.current = new AbortController();
    const signal = refreshAbortControllerRef.current.signal;

    try {
      isRefreshingRef.current = true;
      setRefreshing(true);

      const result = await refreshData(signal);

      if (!signal.aborted) {
        if (result.cancelled) {
          // Silent cancellation, don't show error
          console.log('Refresh was cancelled');
        } else if (result.timeout) {
          ToastAndroid.show('Request timeout. Please try again.', ToastAndroid.SHORT);
        } else if (result.errors && result.errors.length > 0) {
          ToastAndroid.show('Failed to refresh some data', ToastAndroid.SHORT);
        } else if (result.success) {
          // Optional: Show success feedback
          // ToastAndroid.show('Profile updated', ToastAndroid.SHORT);
        } else if (result.error) {
          ToastAndroid.show('Failed to refresh data', ToastAndroid.SHORT);
        }
      }
    } catch (error) {
      if (!signal.aborted) {
        console.error('Unexpected error during refresh:', error);
        ToastAndroid.show('An error occurred', ToastAndroid.SHORT);
      }
    } finally {
      if (!signal.aborted) {
        setRefreshing(false);
        isRefreshingRef.current = false;
      }
      refreshAbortControllerRef.current = null;
    }
  }, [refreshData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing refresh when component unmounts
      if (refreshAbortControllerRef.current) {
        refreshAbortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
  if (liveShows.length > 0) {
    fetchFeaturedShowDetails();
  }
}, [liveShows, fetchFeaturedShowDetails]);


  const formatFollowerCount = useCallback((count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace('.0', '') + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return count?.toString() || '0';
  }, []);

  const onTabPress = useCallback((index: number) => {
    startTransition(() => {
      setActiveTab(index);
      
      // Animate indicator
      Animated.spring(indicatorX, {
        toValue: index * (SCREEN_WIDTH / TABS.length),
        useNativeDriver: true,
        tension: 68,
        friction: 12,
      }).start();

      // Scroll to section using scrollToIndex
      if (flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({
            index: index,
            animated: true,
            viewPosition: 0,
          });
        } catch (error) {
          console.error('Scroll error:', error);
        }
      }
    });
  }, [indicatorX]);

  const profileImageUri = useMemo(() => {
    const profileKey = followersInfo?.user?.profileURL?.key;
    if (profileKey) {
      return `${AWS_CDN_URL}${profileKey}`;
    }
    return `${intialAvatar}${followersInfo?.user?.userName || user?.userName}`;
  }, [followersInfo, user]);

  const renderHeader = useMemo(() => (
    <View style={styles.headerContainer}>
      {/* Header Section */}
      <SellerHeader navigation={navigation} message={'Profile'} onOptionsPress={() => setShowOptionsMenu(!showOptionsMenu)} />
      
      {/* Profile Section - Two Column Layout */}
      <View style={styles.profileSection}>
        {/* Left: Avatar with Gold Border */}
        <View style = {{flexDirection: 'row',  gap: 16}}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarBorder}>
            <TouchableOpacity onPress={() => setIsImageModal(true)}>
              <Image source={{ uri: profileImageUri }} style={styles.avatar} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Right: All Profile Info */}
        <View style={styles.profileInfoContainer}>
          {/* Username with Verified Badge */}
          <View style={styles.nameContainer}>
            <Text style={styles.name} allowFontScaling={false}>
              {followersInfo?.user?.userName || user?.userName || 'Unknown'}
            </Text>
            {/* <MaterialIcons name="verified" size={20} color="#00BFFF" style={styles.verifiedBadge} /> */}
          </View>

          {/* Bio */}
          {/* <Text style={styles.bioText} allowFontScaling={false}>
            {followersInfo?.user?.bio || 'Bio not available'}
          </Text> */}

          {/* Stats Row - Horizontal Layout */}
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setIsFollowers(true)}
            >
              <Text style={styles.statNumber} allowFontScaling={false}>
                {formatFollowerCount(followersInfo?.follow?.followersCount || 0)}
              </Text>
              <Text style={styles.statLabel} allowFontScaling={false}>Followers</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setIsFollowing(true)}
            >
              <Text style={styles.statNumber} allowFontScaling={false}>
                {formatFollowerCount(followersInfo?.follow?.followingCount || 0)}
              </Text>
              <Text style={styles.statLabel} allowFontScaling={false}>Following</Text>
            </TouchableOpacity>

            {/* <View style={styles.statItem}>
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={16} color="#FFD700" />
                <Text style={styles.statNumber} allowFontScaling={false}>5.0</Text>
              </View>
              <Text style={styles.statLabel} allowFontScaling={false}>Rating</Text>
            </View> */}
          </View>
            
             {/* <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setIsEditModalVisible(true)}
            >
              <Text style={styles.editButtonText} allowFontScaling={false}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.inboxButton]}
              onPress={() => navigation.navigate('Comment')}
            >
              <Text style={styles.inboxButtonText} allowFontScaling={false}>Inbox</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsShareModalVisible(true)} style={styles.shareIconButton}>
              <Feather name="share-2" size={16} color="#F7CE45" />
            </TouchableOpacity>
          </View> */}
        </View>
        </View>

        {/* Bio with View More/Less */}
        <View>
          <Text 
            style={styles.bioText} 
            allowFontScaling={false}
            numberOfLines={isBioExpanded ? undefined : 3}
            onTextLayout={(e) => {
              if (e.nativeEvent.lines.length > 3 && !bioExceedsLimit) {
                setBioExceedsLimit(true);
              }
            }}
          >
            {followersInfo?.user?.bio || 'Fashion designer and material selling products'}
          </Text>
          {bioExceedsLimit && (
            <TouchableOpacity onPress={() => setIsBioExpanded(!isBioExpanded)}>
              <Text style={styles.viewMoreText} allowFontScaling={false}>
                {isBioExpanded ? 'View less' : 'View more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

           {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setIsEditModalVisible(true)}
            >
              <Text style={styles.editButtonText} allowFontScaling={false}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.inboxButton]}
              onPress={() => navigation.navigate('Comment')}
            >
              <Text style={styles.inboxButtonText} allowFontScaling={false}>Inbox</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsShareModalVisible(true)} style={styles.shareIconButton}>
              <Feather name="share-2" size={16} color="#F7CE45" />
            </TouchableOpacity>
          </View>
      </View>

      {/* Bottom Action Buttons - Full Width */}
      <View style={styles.bottomActionsRow}>
        <TouchableOpacity 
          style={[styles.bottomActionButton, styles.goLiveButton]}
          onPress={() => navigation.navigate('LiveStream')}
        >
          <Text style={styles.goLiveButtonText} allowFontScaling={false}>Go live</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.bottomActionButton, styles.addButton]}
          onPress={() => navigation.navigate('ViewShopable')}
        >
          <Text style={styles.addButtonText} allowFontScaling={false}>+ Add video</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.bottomActionButton, styles.addButton]}
          onPress={() => navigation.navigate('Products', { selectedTab: 'Product' })}
        >
          <Text style={styles.addButtonText} allowFontScaling={false}>+Add product</Text>
        </TouchableOpacity>
      </View>

      {/* Announcement Banner */}
        {/* { !user?.MobileVerified &&<View style={styles.sectionContainer}>
        <View style={[styles.announcementBanner, {marginBottom: 0}]}>
         <MaterialIcons name="notifications" size={20} color="#F5C842" />
         <Text style={styles.announcementText} allowFontScaling={false}>
           Don't miss out again! Please <Text onPress={() => setMobileVerificationModalVisible(true)} style={styles.announcementHighlight}>Verify <MaterialIcons name="mobile-friendly" size={16} color="#F5C842" /></Text> mobile number. 🔥
         </Text>
       </View>
       </View>} */}

      {/* Tabs */}
      {/* <View style={styles.tabBar}>
        {TABS.map((tab, index) => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => onTabPress(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, activeTab === index && styles.tabTextActive]}
              allowFontScaling={false}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
        
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />
      </View> */}
    </View>
  ), [followersInfo, user, activeTab, indicatorX, onTabPress, profileImageUri, formatFollowerCount, navigation, isBioExpanded, bioExceedsLimit]);

  const renderSection = useCallback(({ item, index }: { item: string; index: number }) => {
    return (
      <View>
        {/* {index === 0 && featuredLiveShow && liveShows.length === 1 && <FeaturedLiveShowSection show={featuredLiveShow} loading={loading.featured} navigation={navigation} />} */}
        {index === 0 && <LiveShowsSection shows={liveShows} loading={loading.shows} navigation={navigation} user={user} />}
        {index === 0 && <RegisteredLivesSection shows={registeredShows} loading={loading.shows} navigation={navigation} user={user} />}
        {index === 0 && <ShoppableVideosSection videos={shoppableVideos} loading={loading.videos} navigation={navigation} user={user} />}
        {index === 1 && <WishlistSection items={wishlistItems} loading={loading.wishlist} navigation={navigation} user={user} />}
        {index === 2 && <ReviewsSection />}
        {/* {index === 2 && <CollectionsSection categories={user?.categories} navigation = {navigation} />} */}
      </View>
    );
  }, [liveShows, registeredShows, shoppableVideos, wishlistItems, loading, navigation, user, featuredLiveShow]);

  const getItemLayout = useCallback((_: any, index: number) => {
    // Approximate heights for each section
    const SECTION_HEIGHT = 400; // Adjust based on your content
    return {
      length: SECTION_HEIGHT,
      offset: SECTION_HEIGHT * index,
      index,
    };
  }, []);

  if (loading.profile) {
    return (
      <View style={styles.container}>
        {/* Skeleton Header */}
        <View style={styles.headerContainer}>
          <SellerHeader navigation={navigation} message={'Profile'} onOptionsPress={() => {}} />
          
          {/* Skeleton Profile Section */}
          <View style={styles.profileSection}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {/* Skeleton Avatar with Border */}
              <View style={styles.avatarContainer}>
                {/* <View style={styles.avatarBorder}> */}
                  <View style={[styles.avatar, styles.skeletonAvatar]} />
                {/* </View> */}
              </View>

              {/* Skeleton Profile Info */}
              <View style={styles.profileInfoContainer}>
                <View style={[styles.skeletonName, styles.skeletonPulse]} />
                
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <View style={[styles.skeletonStatNumber, styles.skeletonPulse]} />
                    <View style={[styles.skeletonStatLabel, styles.skeletonPulse]} />
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.skeletonStatNumber, styles.skeletonPulse]} />
                    <View style={[styles.skeletonStatLabel, styles.skeletonPulse]} />
                  </View>
                </View>
              </View>
            </View>

            {/* Skeleton Bio */}
            {/* <View style={{ marginTop: 16, paddingHorizontal: 4 }}>
              <View style={[styles.skeletonBioLine, styles.skeletonPulse]} />
              <View style={[styles.skeletonBioLine, { width: '70%', marginTop: 8 }, styles.skeletonPulse]} />
            </View> */}

            {/* Skeleton Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <View style={[styles.actionButton, styles.skeletonButton, styles.skeletonPulse]} />
              <View style={[styles.actionButton, styles.skeletonButton, styles.skeletonPulse]} />
              <View style={[styles.shareIconButton, styles.skeletonPulse]} />
            </View>
          </View>

          {/* Skeleton Bottom Actions */}
          <View style={styles.bottomActionsRow}>
            <View style={[styles.bottomActionButton, styles.skeletonButton, styles.skeletonPulse]} />
            <View style={[styles.bottomActionButton, styles.skeletonButton, styles.skeletonPulse]} />
            <View style={[styles.bottomActionButton, styles.skeletonButton, styles.skeletonPulse]} />
          </View>

          {/* Skeleton Section */}
          {/* <View style={[styles.sectionContainer, { marginTop: 0 }]}>
            <View style={[styles.sectionHeader, { borderLeftColor: 'transparent' }]}>
              <View style={[styles.skeletonSectionTitle, styles.skeletonPulse]} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.liveCard, styles.skeletonPulse]} />
              <View style={[styles.liveCard, styles.skeletonPulse]} />
            </View>
          </View> */}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Image Modal */}
      <ImageModal
        visible={isImageModal}
        onClose={() => setIsImageModal(false)}
        imageUri={profileImageUri}
      />

      {/* Followers/Following List Modal */}
      {(isFollowers || isFollowing) && (
        <View style={{ height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: '#121212' }}>
          <FollowersList
            userName={user?.userName || user?.name}
            userId={user._id}
            setisFollowers={setIsFollowers}
            setisFollowing={setIsFollowing}
            isActionVisible={true}
            active={isFollowing ? 'following' : 'followers'}
          />
        </View>
      )}

      {isEditModalVisible && (
        <View style={{ height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: '#0B0B0B' }}>
          <ProfileEditScreen 
            setIsEditModalVisible={setIsEditModalVisible}
            user={user}
            setUser={setuser}
            onSaveSuccess={(newUsername) => {
              // Call refreshData with updated username
              refreshData(undefined, newUsername);
            }}
          />
        </View>
      )}

       {/* Options Menu */}
            {showOptionsMenu && (
              <Pressable
                style={styles.optionsMenuOverlay}
                onPress={() => setShowOptionsMenu(false)}>
                <View ref={optionsMenuRef} style={styles.optionsMenu}>
                  <TouchableOpacity style={styles.menuItem} onPress={()=>{
                    setShowOptionsMenu(false);
                    setIsEditModalVisible(true);
                  }}>
                    <FontAwesome5 name="user-edit" size={14} color="#fff" />
                    <Text style={[styles.menuItemText]}>
                      Edit Profile
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                    setShowOptionsMenu(false);
                    navigation.navigate('SavedScreen')
                    }}>
                    <Feather name="bookmark" size={18} color="#F7CE45" />
                    <Text style={[styles.menuItemText, {color: '#F7CE45'}]}>
                      Saved
                    </Text>
                  </TouchableOpacity>

                      <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                    setShowOptionsMenu(false);
                    navigation.navigate('ProfileAnalytics')
                    }}>
                    <MaterialIcons name="person-outline" size={18} color="#fff" />
                    <Text style={[styles.menuItemText]}>
                      Profile Analytics
                    </Text>
                  </TouchableOpacity>

                  {/* <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                    setShowOptionsMenu(false);
                    navigation.navigate('WalletPage')
                    }}>
                    <MaterialIcons name="account-balance-wallet" size={18} color="#fff" />
                    <Text style={[styles.menuItemText]}>
                      Wallet
                    </Text>
                  </TouchableOpacity> */}
                  
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                    setShowOptionsMenu(false);
                    navigation.navigate('Settings')
                    }}>
                    <Feather name="settings" size={18} color="#fff" />
                    <Text style={[styles.menuItemText]}>
                      Settings
                    </Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            )}

      <FlatList
        ref={flatListRef}
        data={TABS}
        keyExtractor={(item) => item}
        renderItem={renderSection}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        removeClippedSubviews={false}
        maxToRenderPerBatch={4}
        windowSize={5}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
      />

      {/* Mobile Verification Modal */}
      {mobileVerificationModalVisible && (
        <MobileVerificationModal
          isOpen={mobileVerificationModalVisible}
          onClose={() => setMobileVerificationModalVisible(false)}
          onSuccess={() => {
            console.log('Mobile verification successful!');
            setMobileVerificationModalVisible(false);
            ToastAndroid.show('Mobile verified successfully!', ToastAndroid.SHORT);
            // Refresh user data
            refreshData();
          }}
        />
      )}

      {/* Floating Quick Actions - Store Button */}
      <View style={styles.quickFloat}>
        <TouchableOpacity
          style={[styles.floatBtn, styles.floatPrimary]}
          onPress={() => {
            navigation.navigate('Store', {
              sellerId: user?.sellerInfo?._id,
              tabName: 'product'
            });
          }}
        >
          <Image
            source={{uri:storeIcon}}
            style={styles.storeImage}
          />
        </TouchableOpacity>
      </View>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalVisible}
        onClose={() => setIsShareModalVisible(false)}
        shareContent={`Check out ${user?.userName}'s profile!`}
        shareUrl={`${shareUrl}profile/${user?.userName}`}
        onShare={(platform, selectedChats) => {
          console.log('Profile shared via:', platform, selectedChats);
        }}
      />
    </View>
  );
}

/* ============= SECTIONS ============= */

const FeaturedLiveShowSection = React.memo(({ show, loading, navigation }: any) => {
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  if (loading) {
    return (
      <View style={styles.featuredContainer}>
        <View style={styles.featuredCard}>
          {/* Skeleton Image Section */}
          <View style={[styles.featuredImageSection, styles.skeletonPulse, { backgroundColor: '#2A2A2A' }]} />
          
          {/* Skeleton Bottom Section */}
          <View style={styles.featuredBottomSection}>
            <View style={[styles.featuredProductImage, styles.skeletonPulse]} />
            <View style={styles.featuredInfo}>
              <View style={[{ width: '80%', height: 16, backgroundColor: '#2A2A2A', borderRadius: 4, marginBottom: 8 }, styles.skeletonPulse]} />
              <View style={[{ width: '60%', height: 14, backgroundColor: '#2A2A2A', borderRadius: 4, marginBottom: 8 }, styles.skeletonPulse]} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[{ width: 60, height: 24, backgroundColor: '#2A2A2A', borderRadius: 12 }, styles.skeletonPulse]} />
                <View style={[{ width: 60, height: 24, backgroundColor: '#2A2A2A', borderRadius: 12 }, styles.skeletonPulse]} />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (!show) {
    return null;
  }

  const buyNowProducts = show?.buyNowProducts || [];
  const selectedProduct = buyNowProducts[selectedProductIndex]?.productId;
  
  // If no products, don't show the info section
  if (buyNowProducts.length === 0) {
    return (
      <View style={styles.featuredContainer}>
        <TouchableOpacity
          style={styles.featuredCard}
          activeOpacity={0.95}
          onPress={() => navigation.navigate('LiveScreen', { stream: show })}
        >
          <View style={styles.featuredImageSection}>
            <Image
              source={{ uri: `${AWS_CDN_URL}${show?.thumbnailImage}` }}
              style={styles.featuredImage}
            />
            <View style={styles.featuredTopBar}>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
              {/* <View style={styles.featuredStats}>
                <View style={styles.featuredStatItem}>
                  <Ionicons name="eye" size={16} color="#fff" />
                  <Text style={styles.featuredStatText}>1.2K watching</Text>
                </View>
              </View> */}
            </View>

            {/* Show Title Overlay at Bottom */}
            <View style={styles.featuredTitleOverlay}>
              <Text style={styles.featuredImageTitle} numberOfLines={2}>
                {show?.title || 'Live Shopping Event'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.featuredContainer}>
      <TouchableOpacity
        style={styles.featuredCard}
        activeOpacity={0.95}
        onPress={() => navigation.navigate('LiveScreen', { stream: show })}
      >
        {/* Image Section */}
        <View style={styles.featuredImageSection}>
          <Image
            source={{ uri: `${AWS_CDN_URL}${show?.thumbnailImage}` }}
            style={styles.featuredImage}
          />

          {/* LIVE Badge & Stats Overlay on Image */}
          <View style={styles.featuredTopBar}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>

            {/* <View style={styles.featuredStats}>
              <View style={styles.featuredStatItem}>
                <Ionicons name="eye" size={16} color="#fff" />
                <Text style={styles.featuredStatText}>1.2K watching</Text>
              </View>
            </View> */}
          </View>

          {/* Show Title Overlay at Bottom */}
          <View style={styles.featuredTitleOverlay}>
            <Text style={styles.featuredImageTitle} numberOfLines={2}>
              {show?.title || 'Live Shopping Event'}
            </Text>
          </View>
        </View>

        {/* Product Info Section - Below Image */}
        <View style={styles.featuredBottomSection}>
          {/* Product Image */}
          {selectedProduct?.images?.[0]?.key && (
            <Image
              source={{ uri: `${AWS_CDN_URL}${selectedProduct.images[0].key}` }}
              style={styles.featuredProductImage}
            />
          )}

          {/* Info Container */}
          <View style={styles.featuredInfo}>
            <Text style={styles.featuredTitle} numberOfLines={1}>
              {selectedProduct?.title || show?.title}
            </Text>

            {/* Bidding Info Row */}
            <View style={styles.biddingRow}>
              <View style={styles.biddingItem}>
                <Text style={styles.biddingLabel}>Price: </Text>
                <Text style={styles.biddingPrice}>₹{selectedProduct?.productPrice || selectedProduct?.MRP || 0}</Text>
              </View>

              {selectedProduct?.MRP && selectedProduct?.productPrice && selectedProduct.MRP > selectedProduct.productPrice && (
                <View style={styles.percentageTag}>
                  <AntDesign name="arrowdown" size={12} color="#4CAF50" />
                  <Text style={styles.percentageText}>
                    {Math.round(((selectedProduct.MRP - selectedProduct.productPrice) / selectedProduct.MRP) * 100)}% OFF
                  </Text>
                </View>
              )}
            </View>

            {/* Stats Row */}
            <View style={styles.featuredStatsRow}>
              {/* <View style={styles.featuredStatBadge}>
                <MaterialIcons name="shopping-cart" size={14} color="#fff" />
                <Text style={styles.featuredStatBadgeText}>
                  Stock: {selectedProduct?.stocks || 0}
                </Text>
              </View> */}

              {selectedProduct?.MRP && (
                <View style={styles.featuredStatBadge}>
                  <Text style={styles.featuredStatBadgeText}>
                    MRP: ₹{selectedProduct.MRP}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Product Carousel */}
        {buyNowProducts?.length > 0 && (
          <View style={styles.productCarousel}>
            <FlatList
              data={buyNowProducts?.slice(0, 5)}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const isLastItem = index === 4;
                const remainingCount = buyNowProducts.length - 5;
                const showCountOverlay = isLastItem && remainingCount > 0;

                return (
                  <TouchableOpacity
                    onPress={() => setSelectedProductIndex(index)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.carouselItem,
                      selectedProductIndex === index && styles.carouselItemSelected
                    ]}>
                      <Image
                        source={{ uri: `${AWS_CDN_URL}${item?.productId?.images?.[0]?.key}` }}
                        style={styles.carouselImage}
                      />
                      {showCountOverlay && (
                        <View style={styles.carouselCountOverlay}>
                          <Text style={styles.carouselCountText}>+{remainingCount}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item, index) => index.toString()}
              ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
              contentContainerStyle={styles.carouselContent}
            />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

const LiveShowsSection = React.memo(({ shows, loading, navigation, user }: any) => {
  const [liveScrollX] = useState(new Animated.Value(0));

  console.log('live shows', shows[0]);
  
  const renderLiveCard = useCallback(({ item: show, index }: { item: any; index: number }) => {
    const CARD_WIDTH = (SCREEN_WIDTH - 30) / 2.2;
    
    // Only apply animations when there are 3 or more items
    const shouldAnimate = shows.length >= 3;
    
    let scale = 1;
    let opacity = 1;
    
    if (shouldAnimate) {
      const CENTER_OFFSET = SCREEN_WIDTH / 2 - CARD_WIDTH / 2;
      
      const inputRange = [
        index * CARD_WIDTH - CENTER_OFFSET - CARD_WIDTH,
        index * CARD_WIDTH - CENTER_OFFSET,
        index * CARD_WIDTH - CENTER_OFFSET + CARD_WIDTH,
      ];

      scale = liveScrollX.interpolate({
        inputRange,
        outputRange: [0.8, 1, 0.8],
        extrapolate: 'clamp',
      });

      opacity = liveScrollX.interpolate({
        inputRange,
        outputRange: [0.6, 1, 0.6],
        extrapolate: 'clamp',
      });
    }

    const cardContent = (
      <>
        <Image
          source={{ uri: `${AWS_CDN_URL}${show.thumbnailImage}` }}
          style={styles.liveCardImage}
        />

        <View style={[styles.liveTag, { backgroundColor: '#FF3B30' }]}>
          <Text allowFontScaling={false} style={styles.liveText}>LIVE</Text>
        </View>

        <View style={styles.liveCardOverlay}>
          <Text style={styles.liveCardTitle} allowFontScaling={false}>
            {show.title}
          </Text>
        </View>
      </>
    );

    return (
      <TouchableOpacity onPress={() => navigation.navigate('LiveScreen', { stream: show })}>
        {shouldAnimate ? (
          <Animated.View
            style={[styles.liveCard, { transform: [{ scale }], opacity }]}
          >
            {cardContent}
          </Animated.View>
        ) : (
          <View style={styles.liveCard}>
            {cardContent}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [liveScrollX, navigation, shows.length]);

  if (loading) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={[{ width: 80, height: 16, backgroundColor: '#2A2A2A', borderRadius: 4, marginLeft: 8 }, styles.skeletonPulse]} />
          <View style={[{ width: 70, height: 14, backgroundColor: '#2A2A2A', borderRadius: 4 }, styles.skeletonPulse]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[1, 2].map((_, index) => (
            <View key={index} style={[styles.liveCard, styles.skeletonPulse]} />
          ))}
        </View>
      </View>
    );
  }

  if (shows.length === 0) {
    return null;
  }

//   if (shows.length === 0) {
//   return (
//     <View style={styles.sectionContainer}>
//       <View style={styles.sectionHeader}>
//         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//           <Text style={styles.sectionTitle} allowFontScaling={false}>
//             Live Now
//           </Text>
//         </View>
//       </View>

//       <View style={styles.emptyLiveContainer}>
//         <Ionicons name="tv-outline" size={48} color="#666666" style={{ marginBottom: 12 }} />
//         <Text style={styles.emptyLiveText} allowFontScaling={false}>
//           No live shows right now
//         </Text>

//         <TouchableOpacity
//           style={styles.createShowButton}
//            onPress={() => navigation.navigate('LiveStream')}
//         >
//           <Text style={styles.createShowButtonText} allowFontScaling={false}>
//             Create Show
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }


  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>Live Now</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Store', { sellerId: user?.sellerInfo?._id, tabName: 'show' })}>
          <Text style={styles.viewAllText} allowFontScaling={false}>View all →</Text>
        </TouchableOpacity>
      </View>

      <Animated.FlatList
        data={shows}
        renderItem={renderLiveCard}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        ItemSeparatorComponent={() => <View style={{ width: shows.length >= 3 ? 0 : 12 }} />}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: liveScrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
});

const RegisteredLivesSection = React.memo(({ shows, loading, navigation, user }: any) => {
  const [liveScrollX] = useState(new Animated.Value(0));

  //console.log('live shows', shows[0]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day} ${month}, ${time}`;
  };

  const renderLiveCard = useCallback(({ item: show, index }: { item: any; index: number }) => {
    const CARD_WIDTH = (SCREEN_WIDTH - 30) / 2.2; // card width  / 2.2 + 6; 
    
    // Only apply animations when there are 3 or more items
    const shouldAnimate = shows.length >= 3;
    
    let scale = 1;
    let opacity = 1;
    
    if (shouldAnimate) {
      const CENTER_OFFSET = SCREEN_WIDTH / 2 - CARD_WIDTH / 2;
      
      const inputRange = [
        index * CARD_WIDTH - CENTER_OFFSET - CARD_WIDTH,
        index * CARD_WIDTH - CENTER_OFFSET,
        index * CARD_WIDTH - CENTER_OFFSET + CARD_WIDTH,
      ];

      scale = liveScrollX.interpolate({
        inputRange,
        outputRange: [0.8, 1, 0.8],
        extrapolate: 'clamp',
      });

      opacity = liveScrollX.interpolate({
        inputRange,
        outputRange: [0.6, 1, 0.6],
        extrapolate: 'clamp',
      });
    }

    const cardContent = (
      <>
        <Image
          source={{ uri: `${AWS_CDN_URL}${show.thumbnailImage}` }}
          style={styles.liveCardImage}
        />

        <View style={styles.liveTag}>
          <Text style={styles.liveText}>
            {formatDate(show.scheduledAt)}
          </Text>
        </View>

        {/* Overlay Container */}
        <View style={styles.liveCardOverlay}>
          <Text style={styles.liveCardTitle} allowFontScaling={false}>
            {show.title}
          </Text>
        </View>
      </>
    );

    return (
      <TouchableOpacity
        onPress={() => {
           navigation.navigate('LiveScreen', { stream: show });
        }}
      >
        {shouldAnimate ? (
          <Animated.View
            style={[styles.liveCard, { transform: [{ scale }], opacity }]}
          >
            {cardContent}
          </Animated.View>
        ) : (
          <View style={styles.liveCard}>
            {cardContent}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [liveScrollX, navigation, shows.length]);

  if (loading) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={[{ width: 120, height: 16, backgroundColor: '#2A2A2A', borderRadius: 4, marginLeft: 8 }, styles.skeletonPulse]} />
          <View style={[{ width: 70, height: 14, backgroundColor: '#2A2A2A', borderRadius: 4 }, styles.skeletonPulse]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[1, 2].map((_, index) => (
            <View key={index} style={[styles.liveCard, styles.skeletonPulse]} />
          ))}
        </View>
      </View>
    );
  }

  // if (shows.length === 0){
  //   return null;
  // }

  if (shows.length === 0) {
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>
            Upcoming Shows
          </Text>
        </View>
      </View>

      <View style={styles.emptyLiveContainer}>
        <Ionicons name="tv-outline" size={48} color="#666666" style={{ marginBottom: 12 }} />
        <Text style={styles.emptyLiveText} allowFontScaling={false}>
          No Upcomingshows right now
        </Text>

        <TouchableOpacity
          style={styles.createShowButton}
           onPress={() => navigation.navigate('LiveStream')}
        >
          <Text style={styles.createShowButtonText} allowFontScaling={false}>
            Create Show
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

  // if (shows.length === 0) {
  //   return (
  //     <View style={styles.sectionContainer}>
  //       <View style={styles.announcementBanner}>
  //       <MaterialIcons name="notifications" size={20} color="#F5C842" />
  //       <Text style={styles.announcementText} allowFontScaling={false}>
  //         Don't miss out again! The <Text style={styles.announcementHighlight}>Rolex 345</Text> is officially back in stock. 🔥
  //       </Text>
  //     </View>
  //       <Text style={styles.emptyText} allowFontScaling={false}>No registered lives</Text>
  //     </View>
  //   );
  // }

  return (
    <View style={styles.sectionContainer}>
      {/* Announcement Banner */}
      {/* <View style={styles.announcementBanner}>
        <MaterialIcons name="notifications" size={20} color="#F5C842" />
        <Text style={styles.announcementText} allowFontScaling={false}>
          Don't miss out again! The <Text style={styles.announcementHighlight}>Rolex 345</Text> is officially back in stock. 🔥
        </Text>
      </View> */}

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>Upcoming shows</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Store', { sellerId: user?.sellerInfo?._id, tabName: 'show' })}>
          <Text style={styles.viewAllText} allowFontScaling={false}>View all →</Text>
        </TouchableOpacity>
      </View>

      {/* Lives Horizontal List */}
      <Animated.FlatList
        data={shows}
        renderItem={renderLiveCard}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        ItemSeparatorComponent={() => <View style={{ width: shows.length >= 3 ? 0 : 12 }} />}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: liveScrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
});

const ShoppableVideosSection = React.memo(({ videos, loading, navigation, user }: any) => {
  
  const renderVideoCard = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.videoCard}
      //onPress={() => navigation.navigate('ViewShopable', { videoId: item._id })}
      onPress ={() => navigation.navigate('reel', {id: item._id})}
    >
      <View style={styles.videoStats}>
          <View style={styles.videoStatItem}>
            <Ionicons name="eye-outline" size={14} color="#8C8C8C" />
            <Text style={styles.videoStatText} allowFontScaling={false}>
              {item.views || 0}
            </Text>
          </View>
          <View style={styles.videoStatItem}>
            <Ionicons name="heart-outline" size={14} color="#8C8C8C" />
            <Text style={styles.videoStatText} allowFontScaling={false}>
              {item.likes || 0}
            </Text>
          </View>
        </View>
      {console.log('Video item:', item)}
      <View style={styles.videoImageContainer}>
        <Image
          source={{ uri: `${AWS_CDN_URL}${item.thumbnailBlobName}` }}
          style={styles.videoImage}
        />
        <View style={styles.playIconOverlay}>
          <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
        </View>
        {/* Edit Icon Button */}
        <TouchableOpacity
          style={styles.videoEditButton}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('EditShopableForm', { videoId: item._id });
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="edit" size={18} color="#F7CE45" />
        </TouchableOpacity>
        {/* <View style={styles.videoDuration}>
          <Text style={styles.videoDurationText} allowFontScaling={false}>
            {item.duration || '0:00'}
          </Text>
        </View> */}
      </View>

      <View style={styles.videoCardContent}>
        <Text style={styles.videoTitle} allowFontScaling={false} numberOfLines={2}>
          {item.title || 'Shoppable Video'}
        </Text>
        
        {/* <View style={styles.videoStats}>
          <View style={styles.videoStatItem}>
            <Ionicons name="eye-outline" size={14} color="#8C8C8C" />
            <Text style={styles.videoStatText} allowFontScaling={false}>
              {item.views || 0}
            </Text>
          </View>
          <View style={styles.videoStatItem}>
            <Ionicons name="heart-outline" size={14} color="#8C8C8C" />
            <Text style={styles.videoStatText} allowFontScaling={false}>
              {item.likes || 0}
            </Text>
          </View>
        </View> */}
      </View>
    </TouchableOpacity>
  ), [navigation]);

  if (loading) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={[{ width: 140, height: 16, backgroundColor: '#2A2A2A', borderRadius: 4, marginLeft: 8 }, styles.skeletonPulse]} />
          <View style={[{ width: 70, height: 14, backgroundColor: '#2A2A2A', borderRadius: 4 }, styles.skeletonPulse]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[1, 2].map((_, index) => (
            <View key={index} style={[styles.videoCard, styles.skeletonPulse]} />
          ))}
        </View>
      </View>
    );
  }

  // if (videos.length === 0) {
  //   return null;
  // }

  if (videos.length === 0) {
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>
            Shoppable Videos
          </Text>
        </View>
      </View>

      <View style={styles.emptyLiveContainer}>
        <Ionicons name="videocam-outline" size={48} color="#666666" style={{ marginBottom: 12 }} />
        <Text style={styles.emptyLiveText} allowFontScaling={false}>
          Create your first shoppable videos
        </Text>

        <TouchableOpacity
          style={styles.createShowButton}
          onPress={() => navigation.navigate('ViewShopable')}
        >
          <Text style={styles.createShowButtonText} allowFontScaling={false}>
            Create Video
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>Shoppable Videos</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Store', { sellerId: user?.sellerInfo?._id, tabName: 'clip' })}>
          <Text style={styles.viewAllText} allowFontScaling={false}>View all →</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={videos}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );
});

const WishlistSection = React.memo(({ items, loading, navigation, user }: any) => {
  
  const formatCurrency = (amount: number) => {
    if (amount == null || isNaN(amount)) return '';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateDiscount = (mrp: number, price: number) => {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  };

  const renderWishlistCard = useCallback(({ item }: { item: any }) => {
    const discount = calculateDiscount(item.MRP, item.productPrice);
    
    return (
      <TouchableOpacity
        style={styles.wishlistCard}
        onPress={() => navigation.navigate('ProductDetails', { id: item._id, type: 'static' })}
      >
        <View style={styles.wishlistImageContainer}>
          <Image
            source={{ uri: `${AWS_CDN_URL}${item?.images[0]?.key}` }}
            style={styles.wishlistImage}
          />
          
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText} allowFontScaling={false}>-{discount}%</Text>
            </View>
          )}
          
          <View style={styles.topDealTag}>
            <Text style={styles.topDealText} allowFontScaling={false}>Top deal</Text>
          </View>
        </View>

        <View style={styles.wishlistCardContent}>
          <Text style={styles.wishlistProductName} allowFontScaling={false} numberOfLines={1}>
            {item.title}
          </Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice} allowFontScaling={false}>
              {formatCurrency(item.productPrice)}
            </Text>
            {item.MRP > item.productPrice && (
              <Text style={styles.originalPrice} allowFontScaling={false}>
                {formatCurrency(item.MRP)}
              </Text>
            )}
          </View>

          {/* <TouchableOpacity style={styles.buyNowButton}>
            <Text style={styles.buyNowButtonText} allowFontScaling={false}>Buy now</Text>
          </TouchableOpacity> */}

          <TouchableOpacity  onPress={() => navigation.navigate('Products', { selectedTab: 'Product' })} style={styles.BuyButtonContainer} activeOpacity={0.2} >
                    <LinearGradient
                      colors={['#FFCF00', '#FFAB00']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buyNowButton}
                    >
                      <Text style={styles.buyNowButtonText}>Manage</Text>
                    </LinearGradient>
                  </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={[{ width: 80, height: 16, backgroundColor: '#2A2A2A', borderRadius: 4, marginLeft: 8 }, styles.skeletonPulse]} />
          <View style={[{ width: 70, height: 14, backgroundColor: '#2A2A2A', borderRadius: 4 }, styles.skeletonPulse]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[1, 2].map((_, index) => (
            <View key={index} style={[styles.wishlistCard, styles.skeletonPulse]}>
              <View style={[styles.wishlistImageContainer, { backgroundColor: '#2A2A2A' }]} />
              <View style={styles.wishlistCardContent}>
                <View style={[{ width: '80%', height: 14, backgroundColor: '#2A2A2A', borderRadius: 4, marginBottom: 6 }, styles.skeletonPulse]} />
                <View style={[{ width: '60%', height: 16, backgroundColor: '#2A2A2A', borderRadius: 4, marginBottom: 10 }, styles.skeletonPulse]} />
                <View style={[{ width: '100%', height: 32, backgroundColor: '#2A2A2A', borderRadius: 10 }, styles.skeletonPulse]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // if (items.length === 0){
  //   return null;
  // }

  if (items.length === 0) {
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sectionTitle} allowFontScaling={false}>
            Products
          </Text>
        </View>
      </View>

      <View style={styles.emptyLiveContainer}>
        <Ionicons name="cube-outline" size={48} color="#666666" style={{ marginBottom: 12 }} />
        <Text style={styles.emptyLiveText} allowFontScaling={false}>
          Create your first products
        </Text>

        <TouchableOpacity
          style={styles.createShowButton}
           onPress={() => navigation.navigate('Products', { selectedTab: 'Product' })}
        >
          <Text style={styles.createShowButtonText} allowFontScaling={false}>
            Create Product
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


  // if (items.length === 0) {
  //   return (
  //     <View style={styles.sectionContainer}>
  //       <Text style={styles.emptyText} allowFontScaling={false}>No items in wishlist</Text>
  //     </View>
  //   );
  // }

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>Products</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Store', { sellerId: user?.sellerInfo?._id, tabName: 'product' })}>
          <Text style={styles.viewAllText} allowFontScaling={false}>View all →</Text>
        </TouchableOpacity>
      </View>

      {/* Wishlist Horizontal List */}
      <FlatList
        data={items}
        renderItem={renderWishlistCard}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );
});

const ReviewsSection = React.memo(() => {
  // Static reviews data
  const staticReviews = [
    {
      id: '1',
      name: 'Anonymous',
      rating: 5,
      comment: 'Your buyer/consumer shopping experience goes here!',
    },
    // {
    //   id: '2',
    //   name: 'Anonymous',
    //   rating: 5,
    //   comment: 'Amazing quality! Delivered in 2 hours. The live shopping experience was so fun!',
    // },
  ];

  const overallRating = '0.0';   //4.9;
  const totalReviews = 0; //2147;

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialIcons
            key={star}
            name="star"
            size={16}
            color={star <= rating ? '#FFD700' : '#3A3A3A'}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.sectionContainer}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>Reviews</Text>
      </View>

      <View style={styles.lockedReviewsWrapper}>
        <View style={[styles.reviewsContainer, styles.blurredContent]}>
          {/* Overall Rating Header */}
        <View style={styles.overallRatingSection}>
          <Text style={styles.overallRatingNumber} allowFontScaling={false}>
            {overallRating}
          </Text>
          <View style={styles.overallRatingRight}>
            <View style={styles.overallStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialIcons
                  key={star}
                  name="star"
                  size={24}
                  color="#FFD700"
                />
              ))}
            </View>
            <Text style={styles.totalReviewsText} allowFontScaling={false}>
              {totalReviews.toLocaleString()} reviews
            </Text>
          </View>
        </View>

        {/* Individual Reviews */}
        {staticReviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerAvatar}>
                <Text style={styles.reviewerInitial} allowFontScaling={false}>
                  A
                </Text>
              </View>
              <View style={styles.reviewerInfo}>
                <Text style={styles.reviewerName} allowFontScaling={false}>
                  {review.name}
                </Text>
              </View>
              <View style={styles.reviewRatingContainer}>
                {renderStars(review.rating)}
              </View>
            </View>
            <Text style={styles.reviewComment} allowFontScaling={false}>
              {review.comment}
            </Text>
          </View>
        ))}
        </View>

        {/* Lock Overlay */}
        <View style={styles.lockOverlay}>
          <View style={styles.lockIconContainer}>
            <MaterialIcons name="lock" size={48} color="#F7CE45" />
          </View>
          <Text style={styles.upcomingFeatureText} allowFontScaling={false}>
            Upcoming Feature
          </Text>
          <Text style={styles.upcomingFeatureSubtext} allowFontScaling={false}>
            Reviews will be available soon
          </Text>
        </View>
      </View>
    </View>
  );
});

const CollectionsSection = React.memo(({ categories, navigation }: { categories?: string[], navigation: any }) => {
  // Category emoji mapping (from Categories.tsx)
  const categoryIcons: { [key: string]: string } = {
    "Fashion & Accessories": '👗',
    "Beauty & Personal Care": '💄',
    "Sports & Fitness": '⚽',
    "Gifts & Festive Needs": '🎁',
    "Baby & Kids": '👶',
    "Electronics & Gadgets": '📱',
    "Home & Living": '🏠',
    "Food & Beverages": '🍔',
    "Health & Wellness": '🩺',
    "Books, Hobbies & Stationery": '📚',
    "Automobiles & Accessories": '🚗',
    "Industrial & Scientific": '🔬',
    "Pets": '🐾',
    "Gaming": '🎮',
    "Tools & Hardware": '🛠️',
    "Construction & Building Materials": '🏗️',
    "Miscellaneous": '📦',
    "Luxury & Collectibles": '💎',
  };

  const renderCategoryCard = useCallback(({ item }: { item: string }) => (
    <TouchableOpacity onPress={() => navigation.navigate('GlobalSearch', {tabName: 'products'})} style={styles.collectionCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,245,0.1)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.collectionCardGradient}>
        <View style={styles.collectionIconWrapper}>
          <Text style={styles.collectionIcon} allowFontScaling={false}>
            {categoryIcons[item] || '📦'}
          </Text>
        </View>
        <Text style={styles.collectionLabel} allowFontScaling={false} numberOfLines={2}>
          {item}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  ), []);

  if (!categories || categories.length === 0){
    return null;
  }

  // if (!categories || categories.length === 0) {
  //   return (
  //     <View style={styles.sectionContainer}>
  //       <View style={styles.sectionHeader}>
  //         <Text style={styles.sectionTitle} allowFontScaling={false}>Your Favourite Collections</Text>
  //       </View>
  //       <Text style={styles.emptyText} allowFontScaling={false}>No collections yet</Text>
  //     </View>
  //   );
  // }

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} allowFontScaling={false}>Your Favourite Collections</Text>
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategoryCard}
        keyExtractor={(item, index) => `${item}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );
});

/* ============= STYLES ============= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    //backgroundColor: '#0B0B0B',
    backgroundColor: '#121212',
    // backgroundColor:'red',
    paddingBottom: 60
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingBottom: 32,
  },

  // Header Styles
  headerContainer: {
    backgroundColor: '#121212',
  },
  profileSection: {
    //flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: '#141414',
    //marginHorizontal: 16,
    borderRadius:12,
    paddingBottom: 20
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarBorder: {
    padding: 4,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: '#F5C842',
  },
  avatar: {
    width: 90,  //100,  //140,
    height: 90,  //100,  //140,
    borderRadius: 70,
    backgroundColor: '#1F1F1F',
  },
  profileInfoContainer: {
    flex: 1,
    justifyContent: 'flex-start',
   //backgroundColor:"red",
   paddingTop: 10,  //16,  //4
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    marginTop: 2,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,  //18,
    color: '#B3B3B3',
    marginBottom: 4,  //16,
    marginInlineStart: 4
  },
  viewMoreText: {
    fontSize: 13,
    color: '#F7CE45',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 24,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8C8C8C',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginLeft: -10,
    gap: 8,
    paddingInlineStart: 10
  },
  actionButton: {
    flex: 1,
   // height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#F7CE45',   // '#FFD700',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  inboxButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  inboxButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  shareIconButton: {
    width: 30,  //40,
    height: 30,  //40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  bottomActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
   // marginBottom: 20,
    marginTop: 10,  //24,
  },
  bottomActionButton: {
    flex: 1,
   // height: 56,
   paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  goLiveButton: {
    backgroundColor: '#FF3B30',
  },
  goLiveButtonText: {
    //fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#F7CE45',   // '#FFD700',
    
  },
  addButtonText: {
    //fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },

  // Tabs Styles
  tabBar: {
    flexDirection: 'row',
    marginTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
    position: 'relative',
  },
  tab: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: SCREEN_WIDTH / TABS.length,
    height: 3,
    backgroundColor: '#F5C842',
    borderRadius: 2,
  },

  // Section Styles
  sectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    // backgroundColor:'red',
    borderLeftWidth: 2,
    borderLeftColor: '#F5C842',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8
   // marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5C842',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingVertical: 32,
  },

  // Announcement Banner
  announcementBanner: {
    flexDirection: 'row',
    backgroundColor: '#00000087',    //'#1F1F1F',
    padding: 12,
   // borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#F5C842',
  },
  announcementText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#CCCCCC',
  },
  announcementHighlight: {
    fontWeight: '700',
    color: '#F7CE45'
  },

  // Horizontal List
  horizontalListContent: {
    paddingRight: 20,
  },
  
  // Lives Card
  liveCard: {
    // width: (SCREEN_WIDTH - 60) / 2.6,
    width: (SCREEN_WIDTH - 30) / 2.2,
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
  },
  liveCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  liveCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 8,
    justifyContent: 'flex-end',
    padding: 8,
  },
  liveTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  liveText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '600',
  },
  liveCardDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  liveCardContent: {
    padding: 12,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1F1F1F',
  },
  hostName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#CCCCCC',
  },
  liveCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  registeredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28A745',
    paddingVertical: 4, //8,
    borderRadius: 8,
    gap: 4,
  },
  registeredButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Wishlist Card
  wishlistCard: {
    width: (SCREEN_WIDTH - 80) / 2,
    backgroundColor: '#1E1E1E',  //'#141414',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8
  },
  wishlistImageContainer: {
    position: 'relative',
    width: '100%',
   // height: 160,
    backgroundColor: '#1F1F1F',
  },
  wishlistImage: {
    width: '100%',
    height: 126,  // '100%',
    borderRadius: 12
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 16,
  },
  wishlistCardContent: {
    //padding: 12,
    paddingTop: 10
  },
  wishlistProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFd700',
  },
  originalPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
    textDecorationLine: 'line-through',
  },
  BuyButtonContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  buyNowButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  buyNowButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },

  optionsMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  optionsMenu: {
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    position: 'absolute',
    right: 20,
    top: 70,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    justifyContent: 'space-around',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },

  // Collection Card Styles
  collectionCard: {
    width: (SCREEN_WIDTH - 80) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  collectionCardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  collectionIconWrapper: {
    width: 50,
    height: 50,
   // backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  collectionIcon: {
    fontSize: 35,  //24,
  },
  collectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Shoppable Video Card Styles
  videoCard: {
    width: (SCREEN_WIDTH - 60) / 2 - 10,
    height: 270,
    marginHorizontal: 5,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  videoImageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#1F1F1F',
  },
  videoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  videoCardContent: {
    position: 'absolute',
    padding: 12,
    bottom: 0
  },
  videoTitle: {
    // position: 'absolute',
    // bottom: 14,
    // left: 10,
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
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
  videoStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoStatText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
  videoEditButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Floating Button Styles
  quickFloat: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    bottom: 80,
    zIndex: 999,
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
    borderRadius: 29,
    backgroundColor: '#FFD700',
  },
  storeImage: {
    width: '70%',
    height: '70%',
    resizeMode: 'cover',
  },
  topDealTag: {
    position: 'absolute',
    top: -2, //8,
    right: -2,  // 8,
    backgroundColor: '#F7CE45',
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

  // Featured Live Show Section Styles
  featuredContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,  //24,
  },
  featuredCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#141414',  //'#1A1A1A',
    borderWidth: 1,
    borderColor: '#F7CE4521',
  },
  featuredImageSection: {
    position: 'relative',
    height: 220,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  featuredTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  liveBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featuredStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredStatText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredBottomSection: {
    flexDirection: 'row',
    padding: 10,   //16,
    gap: 12,
    backgroundColor: '#090909',  //'#141414',
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 12,
  },
  featuredProductImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
  },
  featuredInfo: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  biddingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  biddingItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  biddingLabel: {
    fontSize: 12,
    color: '#CCC',
  },
  biddingPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  percentageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  featuredStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featuredStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredStatBadgeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '500',
  },
  productCarousel: {
    paddingVertical: 12,
    paddingRight: 10,
    //paddingHorizontal: 16,
    backgroundColor: '#141414',
  },
  carouselContent: {
    paddingHorizontal: 16,
  },
  carouselItem: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  carouselItemSelected: {
    borderColor: '#4CAF50',
    borderWidth: 3,
    opacity: 1,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselCountOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselCountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  featuredTitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
   // backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  featuredImageTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Reviews Section Styles
  reviewsContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  overallRatingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  overallRatingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#F7CE45',
  },
  overallRatingRight: {
    flex: 1,
  },
  overallStarsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  totalReviewsText: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  reviewCard: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F7CE45',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewRatingContainer: {
    marginLeft: 'auto',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    color: '#CCCCCC',
  },

  // Lock Overlay Styles
  lockedReviewsWrapper: {
    position: 'relative',
  },
  blurredContent: {
    opacity: 0.3,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.80)',   // 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    gap: 12,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(247, 206, 69, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  upcomingFeatureText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  upcomingFeatureSubtext: {
    fontSize: 14,
    color: '#B3B3B3',
    textAlign: 'center',
  },




emptyLiveContainer: {
  //height: 140,
  paddingVertical: 16,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#0E0E0E',
  borderRadius: 12,
 // marginHorizontal: 15,
  marginTop: 10,
  borderWidth: 1,
  borderColor: '#1F1F1F',
},

emptyLiveText: {
  color: '#9A9A9A',
  fontSize: 14,
  marginBottom: 14,
},

createShowButton: {
  backgroundColor: '#FF3B30',
  paddingHorizontal: 12, // 22,
  paddingVertical: 4,  //10,
  borderRadius: 20,
},

createShowButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '600',
},

  // Skeleton Styles
  skeletonAvatar: {
    backgroundColor: '#2A2A2A',
  },
  skeletonName: {
    width: 150,
    height: 22,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonStatNumber: {
    width: 40,
    height: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonStatLabel: {
    width: 60,
    height: 13,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
  },
  skeletonBioLine: {
    height: 14,
    backgroundColor: '#4A4A4A',
    borderRadius: 4,
    width: '100%',
  },
  skeletonButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 0,
    paddingVertical: 12,
  },
  skeletonSectionTitle: {
    width: 120,
    height: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    marginLeft: 8,
  },
  skeletonPulse: {
    backgroundColor: '#2A2A2A',
  },

});
