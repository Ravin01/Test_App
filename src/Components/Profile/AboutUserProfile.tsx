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
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import { useNavigation } from '@react-navigation/native';
import SellerHeader from '../SellerComponents/SellerForm/Header';
import { CheckCheck, MapPinHouse, MapPinCheck } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import {shareUrl} from '../../../Config';
import ProfileEditScreen from './ProfileImageEdit';
import MobileVerificationModal from '../AuthScreens/MobileVerificationModal';
import FollowersList from './FollowersList';
import ImageModal from './ImageModal';
import {RegisterEventEmitter} from '../../Utils/RegisterEventEmitter';
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
  console.log('user in profile:', user);
  const flatListRef = useRef<FlatList>(null);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [followersInfo, setFollowersInfo] = useState<FollowersInfo>({});
  const [registeredShows, setRegisteredShows] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState({
    shows: false,
    wishlist: false,
    profile: true,
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

  console.log('user Info:', user);

  // Handle wishlist toggle
  const handleToggleWishlist = useCallback(async (productId: string) => {
    try {
      const response = await axiosInstance.post(`/wishlist/${productId}/toggle`);
      const isSaved = response.data.data?.isInWishlist;

      ToastAndroid.show(
        isSaved ? 'Added to wishlist!' : 'Removed from wishlist',
        ToastAndroid.SHORT,
      );

      if (!isSaved) {
        // Remove from wishlist items if unsaved
        setWishlistItems(prev => prev.filter((item: any) => item._id !== productId));
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      ToastAndroid.show('Failed to update wishlist', ToastAndroid.SHORT);
    }
  }, []);

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

  // Fetch registered shows with cancellation support
  const fetchRegisteredShows = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(prev => ({ ...prev, shows: true }));
      const response = await axiosInstance.get('/register-show/my-registrations', {
        params: { page: 1, limit: 1000 },
        signal,
      });

      console.log('registered shows response:', response.data?.data?.shows);
      
      if (!signal?.aborted) {
        // Filter out shows with status "ended"
        const allShows = response.data?.data?.shows || [];
        const activeShows = allShows.filter((show: any) => show.showStatus !== 'ended' && show.showStatus !== 'cancelled');
        setRegisteredShows(activeShows);
      }

      console.log('all registered shows:', response.data?.data?.shows);
      return { success: true };
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.log('Shows fetch cancelled');
        return { success: false, cancelled: true };
      }
      console.error('Error fetching registered shows:', error);
      return { success: false, error: error.message };
    } finally {
      if (!signal?.aborted) {
        setLoading(prev => ({ ...prev, shows: false }));
      }
    }
  }, []);

  // Fetch wishlist items with cancellation support
  const fetchWishlistItems = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(prev => ({ ...prev, wishlist: true }));
      const response = await axiosInstance.get('/wishlist/productsave', {
        params: { page: 1, limit: 20 },
        signal,
      });
      
      if (!signal?.aborted) {
        const { wishlistItems = [] } = response.data?.data || {};
        setWishlistItems(wishlistItems.map((item: any) => item.productId));
      }
      return { success: true };
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.log('Wishlist fetch cancelled');
        return { success: false, cancelled: true };
      }
      console.error('Error fetching wishlist:', error);
      return { success: false, error: error.message };
    } finally {
      if (!signal?.aborted) {
        setLoading(prev => ({ ...prev, wishlist: false }));
      }
    }
  }, []);

  // Initial data load
  useEffect(() => {
    
    const abortController = new AbortController();
    
    const loadInitialData = async () => {
      await Promise.allSettled([
        fetchUserProfile(abortController.signal),
        fetchRegisteredShows(abortController.signal),
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
  }, [fetchUserProfile, fetchRegisteredShows, fetchWishlistItems]);

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

  // ✅ Listen for show registration events
  useEffect(() => {
    console.log('📡 [AboutUserProfile] Setting up RegisterEventEmitter listener');
    
    const subscription = RegisterEventEmitter.onShowRegistered((payload) => {
      console.log('🎉 [AboutUserProfile] Show registered event received:', payload.showId);
      console.log('   New registration count:', payload.newCount);
      
      // Refresh registered shows list to reflect the new registration
      fetchRegisteredShows().catch(err => console.log('Error refreshing shows:', err));
    });

    return () => {
      console.log('🧹 [AboutUserProfile] Cleaning up RegisterEventEmitter listener');
      subscription.remove();
    };
  }, [fetchRegisteredShows]);


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
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={() => setIsImageModal(true)}>
            <Image source={{ uri: profileImageUri }} style={styles.avatar} />
          </TouchableOpacity>
          {/* <View style={styles.avatarAccent} /> */}
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.name} allowFontScaling={false}>
            {followersInfo?.user?.userName || user?.userName || 'Unknown'}
          </Text>
          
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setIsFollowing(true)}
            >
              <Text style={styles.statNumber} allowFontScaling={false}>
                {formatFollowerCount(followersInfo?.follow?.followingCount || 0)}
              </Text>
              <Text style={styles.statLabel} allowFontScaling={false}>Following</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setIsFollowers(true)}
            >
              <Text style={styles.statNumber} allowFontScaling={false}>
                {formatFollowerCount(followersInfo?.follow?.followersCount || 0)}
              </Text>
              <Text style={styles.statLabel} allowFontScaling={false}>Followers</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bio with View More/Less */}
      <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
        <Text 
          style={styles.bioText} 
          allowFontScaling={false}
          numberOfLines={isBioExpanded ? undefined : 2}
          onTextLayout={(e) => {
            if (e.nativeEvent.lines.length > 2 && !bioExceedsLimit) {
              setBioExceedsLimit(true);
            }
          }}
        >
          {followersInfo?.user?.bio || 'Bio not available.'}
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
          <Feather name="edit-2" size={16} color="#000" />
          <Text style={styles.editButtonText} allowFontScaling={false}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setIsShareModalVisible(true)}
        >
          <Feather name="share-2" size={16} color="#F7CE45" />
          <Text style={styles.actionButtonText} allowFontScaling={false}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress= {()=>{navigation.navigate('Settings')}} style={styles.iconButton}>
          <FontAwesome6 name="user-gear" size={16} color="#F7CE45" />
        </TouchableOpacity>
      </View>

      {console.log('user mobile verified:', user?.isMobileVerified, ', address length:', user?.address?.length)}
      {/* Announcement Banner */}
        {!user?.isMobileVerified && <View style={styles.sectionContainer}>
        <View style={[styles.announcementBanner, {marginBottom: 0}]}>
         <MaterialIcons name="notifications" size={20} color="#F5C842" />
         <Text style={styles.announcementText} allowFontScaling={false}>
           Don't miss out again! Please <Text onPress={() => setMobileVerificationModalVisible(true)} style={styles.announcementHighlight}>Verify <MaterialIcons name="mobile-friendly" size={16} color="#F5C842" /></Text> mobile number. 🔥
         </Text>
       </View>
       </View>}

       {
       user?.isMobileVerified && user?.address?.length === 0 
       &&<View style={styles.sectionContainer}>
        <View style={[styles.announcementBanner, {marginBottom: 0}]}>
         <MaterialIcons name="notifications" size={20} color="#F5C842" />
         <Text style={styles.announcementText} allowFontScaling={false}>
           Don't miss out again! Please <Text onPress={() =>  navigation.navigate('EditAddressScreen')} style={styles.announcementHighlight}> Add 🏠
            {/* <MapPinCheck size={14} color="#F5C842" /> */}
            </Text> Address Info. 🔥
         </Text>
       </View>
       </View>}

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
        {index === 0 && <RegisteredLivesSection shows={registeredShows} loading={loading.shows} navigation={navigation} />}
        {index === 1 && <WishlistSection items={wishlistItems} loading={loading.wishlist} navigation={navigation} onToggleWishlist={handleToggleWishlist} />}
        {/* {index === 2 && <ReviewsSection />} */}
        {index === 2 && <CollectionsSection categories={user?.categories} navigation = {navigation} />}
      </View>
    );
  }, [registeredShows, wishlistItems, loading, navigation, user, handleToggleWishlist]);

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
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, styles.skeletonAvatar]} />
            </View>
            
            <View style={styles.profileInfo}>
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
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <View style={[styles.skeletonBioLine, styles.skeletonPulse]} />
            <View style={[styles.skeletonBioLine, { width: '60%', marginTop: 8 }, styles.skeletonPulse]} />
          </View>

          {/* Skeleton Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <View style={[styles.actionButton, styles.skeletonButton, styles.skeletonPulse]} />
            <View style={[styles.actionButton, styles.skeletonButton, styles.skeletonPulse]} />
            <View style={[styles.iconButton, styles.skeletonPulse, { borderColor: 'transparent'}]} />
          </View>

          {/* Skeleton Section Headers */}
          {/* <View style={[styles.sectionContainer, { marginTop: 24 }]}>
            <View style={[styles.sectionHeader, {borderLeftColor:'transparent'}]}>
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

const RegisteredLivesSection = React.memo(({ shows, loading, navigation }: any) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day} ${month}, ${time}`;
  };



  const renderLiveCard = useCallback(({ item: show }: { item: any }) => (
    <TouchableOpacity
      style={styles.liveCard}
      onPress={() => navigation.navigate('LiveScreen', { stream: show })}
    >
      <Image
        source={{ uri: `${AWS_CDN_URL}${show.thumbnailImage}` }}
        style={styles.liveCardImage}
      />
      <View style={styles.liveCardOverlay}>
        <Text style={styles.liveCardDate} allowFontScaling={false}>
          {formatDate(show.scheduledAt)}
        </Text>
      </View>
      <View style={styles.liveCardContent}>
        <View style={styles.hostInfo}>
          <Image
            source={{ uri: show.sellerProfileURL ? `${AWS_CDN_URL}${show.sellerProfileURL}` : `${intialAvatar}${show?.host?.companyName}` }}
            style={styles.hostAvatar}
          />
          <Text style={styles.hostName} allowFontScaling={false} numberOfLines={1}>
            {show?.host?.companyName || 'Host'}
          </Text>
        </View>
        
        <Text style={styles.liveCardTitle} allowFontScaling={false} numberOfLines={1}>
          {show.title}
        </Text>
        
        <TouchableOpacity style={styles.registeredButton}>
          <CheckCheck size={16} color="#FFF" />
          <Text style={styles.registeredButtonText} allowFontScaling={false}>Registered</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [navigation]);

  if (loading) {
    return (
      <View style={styles.sectionContainer}>
        <ActivityIndicator size="small" color="#F5C842" />
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
           Registered shows
          </Text>
        </View>
      </View>

      <View style={styles.emptyLiveContainer}>
        <Ionicons name="calendar-outline" size={48} color="#666666" style={{ marginBottom: 12 }} />
        <Text style={styles.emptyLiveText} allowFontScaling={false}>
          No shows registered yet.
        </Text>

        <TouchableOpacity
          style={styles.createShowButton}
                 onPress={() => navigation.navigate('bottomtabbar', {
          screen: 'HomeTabs',
          params: { screen: 'GlobalSearch' ,params:{tabName:'shows'}}
        })}
        >
          <Text style={styles.createShowButtonText} allowFontScaling={false}>
            Explore shows
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
        <Text style={styles.sectionTitle} allowFontScaling={false}>Registered Shows</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SavedScreen', { tabName: 'show' })}>
          <Text style={styles.viewAllText} allowFontScaling={false}>View all →</Text>
        </TouchableOpacity>
      </View>

      {/* Lives Horizontal List */}
      <FlatList
        data={shows}
        renderItem={renderLiveCard}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );
});

const WishlistSection = React.memo(({ items, loading, navigation, onToggleWishlist }: any) => {
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
          
          <TouchableOpacity 
            style={styles.heartButton}
            onPress={() => onToggleWishlist(item._id)}
          >
            <AntDesign name="heart" size={16} color="#fff" />
          </TouchableOpacity>
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

          <TouchableOpacity onPress={() => {
                  // setSelectedProduct(item)
                  // setShowCheckOut(true)
                     navigation.navigate('ProductDetails', { id: item._id })
                     }
                    } style={styles.BuyButtonContainer} activeOpacity={0.2} >
                    <LinearGradient
                      colors={['#FFCF00', '#FFAB00']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buyNowButton}
                    >
                      <Text style={styles.buyNowButtonText}>Buy Now</Text>
                    </LinearGradient>
                  </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.sectionContainer}>
        <ActivityIndicator size="small" color="#F5C842" />
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
            Wishlist
          </Text>
        </View>
      </View>

      <View style={styles.emptyLiveContainer}>
        <Ionicons name="heart-outline" size={48} color="#666666" style={{ marginBottom: 12 }} />
        <Text style={styles.emptyLiveText} allowFontScaling={false}>
          No products in wishlist
        </Text>

        <TouchableOpacity
          style={styles.createShowButton}
                 onPress={() => navigation.navigate('bottomtabbar', {
          screen: 'HomeTabs',
          params: { screen: 'GlobalSearch' ,params:{tabName:'products'}}
        })}
        >
          <Text style={styles.createShowButtonText} allowFontScaling={false}>
            Explore Products
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
        <Text style={styles.sectionTitle} allowFontScaling={false}>Wishlist</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SavedScreen', { tabName: 'product' })}>
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

const ReviewsSection = React.memo(() => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
       <Text style={styles.sectionTitle} allowFontScaling={false}>Reviews Given</Text>
    </View>
    <Text style={styles.emptyText} allowFontScaling={false}>No reviews yet</Text>
  </View>
));

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
    <TouchableOpacity onPress={() => navigation.navigate('GlobalSearch', {categories: item, tabName: 'products'})} style={styles.collectionCard}>
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
    backgroundColor: '#121212',//'#0B0B0B',
    //backgroundColor:'red'
  },
  profileSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1F1F1F',
  },
  avatarAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: '#FF3B30',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  profileInfo: {
    flex: 1,
    paddingTop: 0,  // 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#8C8C8C',
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B3B3B3',
  },
  viewMoreText: {
    fontSize: 13,
    color: '#F7CE45',
    fontWeight: '600',
    marginTop: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    gap: 6,
    borderColor: '#F7CE4552',
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: '#F5C842',
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F7CE45',  // '#FFFFFF',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    borderColor: '#F7CE4552',
    borderWidth: 1,
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
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: '#1E1E1E',  //'#141414',
    borderRadius: 12,
    overflow: 'hidden',
  },
  liveCardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#1F1F1F',
  },
  liveCardOverlay: {
    position: 'absolute',
    top: 10, //12,
    left: 10, //12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 18,
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


emptyLiveContainer: {
  //height: 160,  //140,
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
  backgroundColor: '#F7CE45',  //'#FF3B30',
  paddingHorizontal: 22,
  paddingVertical: 10,
  borderRadius: 20,
},

  createShowButtonText: {
    color: '#1A1A1A',   //'#FFFFFF',
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
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    width: '100%',
  },
  skeletonButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 0,
  },
  skeletonSectionTitle: {
    width: 120,
    height: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    marginLeft: 8,
  },
  skeletonPulse: {
    opacity: 0.5,
  },

});
