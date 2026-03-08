/* Key fixes applied for horizontal product scrolling:
 * 1. Changed removeClippedSubviews from true to false
 * 2. Added snapToInterval for smooth scrolling
 * 3. Removed width constraint from bottomContent style
 * 4. Added proper scroll props: decelerationRate, snapToAlignment, disableIntervalMomentum
 * 5. Fixed padding in productsListContainer
 */

/* eslint-disable react/no-unstable-nested-components */
'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useReducer,
  useContext,
} from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Platform,
  StatusBar,
  AppState,
  type AppStateStatus,
  TouchableOpacity,
  Text,
  Image,
  Share,
  ToastAndroid,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  BackHandler,
  ScrollView,
  Pressable,
  DeviceEventEmitter,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Icon from 'react-native-vector-icons/Feather';
import Fontisto from 'react-native-vector-icons/Fontisto';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AWS_CDN_URL} from '../../Utils/aws';
import {useFollowApi} from '../../Utils/FollowersApi';
import {shareUrl} from '../../../Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../Utils/Api';
import {formatFollowerCount} from '../../Utils/dateUtils';
import {__DEV__} from 'react-native';
import useVideoTracker from '../Reels/hooks/useVideoTracker';
import CommentBottomSheet from '../Reels/CommentBottomSheet';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useUnifiedVideoInteractions} from '../../hooks/useUnifiedVideoInteractions';
import {
  ArrowLeft,
  ArrowLeftCircle,
  ChevronLeft,
  MoreVertical,
  Volume,
  Volume1,
  Volume2,
  Volume2Icon,
  VolumeOff,
} from 'lucide-react-native';
import {TextInput as RNTextInput} from 'react-native';
import {useKeyboard} from './hooks/useKeyboard';
import LikeButton from '../Reuse/LikeButton';
import ShareModal from '../Reuse/ShareModal';
import { AuthContext } from '../../Context/AuthContext';
import CheckoutBottomSheet from '../Reuse/CheckoutBottomSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

// Add safety check for screen dimensions
const SCREEN_WIDTH = screenWidth || 375;
const SCREEN_HEIGHT = screenHeight || 812;

// Global follow status cache to sync across reels from same seller
const followStatusCache: Map<string, boolean> = new Map();

// Event name for follow status changes
const FOLLOW_STATUS_CHANGED_EVENT = 'FOLLOW_STATUS_CHANGED';

// UI-only state for overlay components (non-interaction related)
const initialUIState = {
  mute: false,
  paused: false,
  currentProductIndex: 0,
  activeProduct: null,
};

const uiReducer = (state, action) => {
  switch (action.type) {
    case 'TOGGLE_MUTE':
      return {...state, mute: !state.mute};
    case 'SET_PAUSED':
      return {...state, paused: action.payload};
    case 'SET_CURRENT_PRODUCT_INDEX':
      return {...state, currentProductIndex: action.payload};
    case 'SET_ACTIVE_PRODUCT':
      return {...state, activeProduct: action.payload};
    default:
      return state;
  }
};

export const ReelOverlay = React.memo(
  ({
    video,
    index,
    isActive,
    navigation,
    isMuted,
    setIsMuted,
    setSelectedItem,
    handleLike,
    handleOrderNow,
    onVideoPauseToggle,
    isFromStackNavigation = false,
  }: any) => {
    // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
    const {isKeyboardVisible, keyboardHeightAnimated} = useKeyboard();
    const {user} = useContext(AuthContext);
    const [uiState, uiDispatch] = useReducer(uiReducer, initialUIState);
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [shareModal, setShareModal] = useState(false);
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const mountedRef = useRef(true);
    
    // Use unified video interactions hook for state management
    const [videoState, videoActions] = useUnifiedVideoInteractions({
      videoId: video?._id || '',
      initialData: {
        isLiked: video?.isLiked,
        isSaved: video?.isSaved,
        likes: video?.likesCount || video?.likes,
        shares: video?.sharesCount || video?.shares,
        views: video?.viewsCount || video?.views,
        comments: video?.commentsCount || video?.comments,
      },
      onError: error => {
        console.error('Video interaction error:', error);
        ToastAndroid.show(error, ToastAndroid.SHORT);
      },
    });

    // Video tracker hook
    const {
      trackProductClick,
    } = useVideoTracker(video?._id || '');
    
    // Check if this is the user's own reel
    const isOwnReel = useMemo(() => {
      if (!video) return false;
      const hostId = video?.host?._id || video?.host?.userInfo?._id;
      const currentUserId = user?.sellerInfo?._id;
      return hostId && currentUserId && hostId === currentUserId;
    }, [video?.host?._id, video?.host?.userInfo?._id, user?.sellerInfo?._id, video]);
    
    // Memoize product list with safety checks
    const productsList = useMemo(() => {
      if (!video?.productsListed || !Array.isArray(video.productsListed))
        return [];
      return video.productsListed.filter((product: any) => product && product._id);
    }, [video?.productsListed]);

    // Back handler effect
    useEffect(() => {
      const onBackPress = async() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        } else {
          const token = await AsyncStorage.getItem('accessToken');
          if (token)
            navigation.navigate('bottomtabbar');
          else
            navigation.navigate('Login');
        }
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => backHandler.remove();
    }, [navigation]);

    // Effect to pause video when checkout modal opens
    useEffect(() => {
      if (onVideoPauseToggle) {
        onVideoPauseToggle(showCheckout);
      }
      uiDispatch({type: 'SET_PAUSED', payload: showCheckout});
    }, [showCheckout, onVideoPauseToggle]);

    // Initialize data
    useEffect(() => {
      if (productsList.length > 0 && !uiState.activeProduct) {
        uiDispatch({type: 'SET_ACTIVE_PRODUCT', payload: productsList[0]});
        setSelectedItem(productsList[0]);
      }
    }, [productsList.length, uiState.activeProduct, setSelectedItem, productsList]);

    // Cleanup effect
    useEffect(() => {
      return () => {
        mountedRef.current = false;
      };
    }, []);

    // Handlers using unified actions
    const handleLikePress = useCallback(async () => {
      if (!mountedRef.current || !video?._id) return;
      try {
        await videoActions.toggleLike();
        const likeChange = videoState.isLiked ? -1 : 1;
        handleLike(index, likeChange);
      } catch (error) {
        console.error('Error in like handler:', error);
      }
    }, [video?._id, videoActions, videoState.isLiked, handleLike, index]);

    const shareProfile = useCallback(async () => {
      if (!mountedRef.current || !video?._id) return;
      try {
        const link = `${shareUrl}user/reel/${video._id}`;
        const result = await Share.share({
          message: ` ${link}`,
          url: link,
        });
        if (result.action !== Share.dismissedAction && mountedRef.current) {
          await videoActions.shareVideo('native');
        }
      } catch (error) {
        console.error('Error sharing profile:', error);
      }
    }, [video?._id, videoActions.shareVideo]);

    const handleSave = useCallback(async () => {
      if (!mountedRef.current || videoState.isSaveLoading || !video?._id)
        return;
      try {
        await videoActions.toggleSave();
      } catch (error) {
        console.error('Error in save handler:', error);
      }
    }, [videoActions.toggleSave, videoState.isSaveLoading]);

    const handleBuyNow = useCallback(() => {
      if (!mountedRef.current) return;
      const currentActiveProduct =
        uiState.activeProduct ||
        productsList[uiState.currentProductIndex] ||
        productsList[0];
      if (!currentActiveProduct) {
        ToastAndroid.show('No product available', ToastAndroid.SHORT);
        return;
      }
      if (Number(currentActiveProduct?.quantity) <= 0) {
        ToastAndroid.show('This product is Out of Stock ', ToastAndroid.SHORT);
        return;
      }
      setSelectedItem(currentActiveProduct);
      handleOrderNow();
    }, [
      uiState.activeProduct,
      productsList,
      uiState.currentProductIndex,
      setSelectedItem,
      handleOrderNow,
    ]);

    // Cleanup effect
    useEffect(() => {
      return () => {
        mountedRef.current = false;
      };
    }, []);

    return (
      <>
        <CommentBottomSheet
          isOpen={videoState.isCommentOpen}
          item={video}
          onClose={videoActions.closeComments}
          videoId={video._id}
        />

        <Animated.View
          style={[
            styles.keyboardAvoidingWrapper,
            {
              transform: [{
                translateY: Animated.multiply(keyboardHeightAnimated, -1)
              }],
            },
          ]}>
          <View style={styles.overlayContent}>
            {!isOwnReel && <AskMeAnything navigation={navigation} video={video} isKeyboardVisible={isKeyboardVisible} />}
            {!isKeyboardVisible && (
              <View style={styles.bottomContent}>
                <ProductsList
                  products={productsList}
                  videoId={video?._id}
                  hostId={video?.host?._id}
                  selectedItem={uiState.activeProduct}
                  currentProductIndex={uiState.currentProductIndex}
                  navigation={navigation}
                  trackProductClick={trackProductClick}
                  dispatch={uiDispatch}
                  setIsMuted={setIsMuted}
                  setSelectedItem={setSelectedItem}
                  setShowCheckout={setShowCheckout}
                  setSelectedProduct={setSelectedProduct}
                />
              </View>
            )}
          </View>
        </Animated.View>

        <TopActionButtons
          video={video}
          navigation={navigation}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          isFromStackNavigation={isFromStackNavigation}
        />
        <ShareModal
          isOpen={shareModal}
          onClose={()=>setShareModal(false)}
          onShare={(d,s) => setShareModal(false)}
          source={`shoppable`}
          shareContent={`Checkout these reel ${video.title}`}
          shareUrl={`${shareUrl}user/reel/${video._id}`}
        />
        <ActionButtons
          liked={videoState.isLiked}
          video={video}
          handleSave={handleSave}
          videoState={videoState}
          shareCount={videoState.shares}
          likes={videoState.likes}
          commentCount={videoState.comments}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          setComment={videoActions.openComments}
          shareProfile={()=>setShareModal(!shareModal)}
          handleLikePress={handleLikePress}
        />
        
        {selectedProduct && (
          <CheckoutBottomSheet
            isOpen={showCheckout}
            onClose={() => {
              setShowCheckout(false);
              setSelectedProduct(null);
              setIsMuted(false)
              uiDispatch({type: 'SET_PAUSED', payload: false});
            }}
            videoId={video._id}
            product={selectedProduct}
          />
        )}
        {/* </KeyboardAvoidingView> */}
      </>
    );
  },
);

const ProductsList = React.memo(
  ({
    products,
    trackProductClick,
    selectedItem: _selectedItem,
    hostId,
    videoId,
    currentProductIndex,
    navigation,
    dispatch,
    setIsMuted,
    setSelectedItem,
    setShowCheckout,
    setSelectedProduct,
  }: any) => {
    const [sellerId, setSellerId] = useState<string | null>(null);

    useEffect(() => {
      const fetchSellerId = async () => {
        const id = await AsyncStorage.getItem('sellerId');
        setSellerId(id);
      };
      fetchSellerId();
    }, []);

    // Early return after hooks
    if (!products || !Array.isArray(products) || products.length === 0)
      return null;

    const renderStars = (rating: number) => {
      const stars = [];
      const safeRating = Math.max(0, Math.min(5, rating || 0));
      const fullStars = Math.floor(safeRating);
      const hasHalfStar = safeRating - fullStars >= 0.5;

      for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
          stars.push(
            <FontAwesome
              key={`star-${i}`}
              name="star"
              size={15}
              color="#fff"
            />,
          );
        } else if (i === fullStars && hasHalfStar) {
          stars.push(
            <FontAwesome
              key={`star-${i}`}
              name="star-half-o"
              size={15}
              color="#fff"
            />,
          );
        } else {
          stars.push(
            <FontAwesome
              key={`star-${i}`}
              name="star"
              size={15}
              color="#ccc"
            />,
          );
        }
      }
      return stars;
    };

    const renderProduct = (
      {item, index: _index}: {item: any; index: number}
    ) => {
        if (!item || !item._id) {
          return <View style={styles.productItem} />;
        }
        // console.log('Rendering product:', item.title, 'at index:', item);

        const imageUrl = item?.images?.[0]?.key
          ? `${AWS_CDN_URL}${item.images[0].key}`
          : null;
        const handleProductClick = () => {
          trackProductClick(item._id);
          if (navigation && item._id) {
            navigation.navigate('ProductDetails', {id: item._id,type:"shoppable_video",refId:videoId});
          }
        };
        
        const isOwn = sellerId && hostId && sellerId === hostId;

        return (
          <TouchableOpacity
            style={styles.productItem}
            onPress={handleProductClick}>
            <View style={styles.productContainer}>
              <View style={styles.productHeader}>
                {imageUrl ? (
                  <Image
                    source={{uri: imageUrl}}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>No Image</Text>
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle} allowFontScaling={false} numberOfLines={1}>
                    {item?.title || 'Untitled Product'}
                  </Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.productPrice}>
                      ₹{item.productPrice || '0'}
                    </Text>
                    {item.MRP && (
                      <Text style={styles.mrpPrice}>₹{item.MRP}</Text>
                    )}
                  </View>
                  <View style={styles.ratingContainer}>
                    {/* <Text style={styles.reviewText}>
                      {formatFollowerCount(item?.ratings?.reviewCount || 0)}{' '}
                      reviews
                    </Text> */}
                    {!isOwn && <TouchableOpacity
                      style={[styles.buyNowButton]}
                      onPress={() => {
                        console.log('Buy Now clicked for product:', item?.title);
                        setIsMuted(true);
                        setShowCheckout(true);
                        setSelectedProduct(item);
                      }}
                    >
                      <Text allowFontScaling={false} style={styles.buyNowText}>Buy now</Text>
                    </TouchableOpacity>}
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
    };

    const handleScroll = (event: any) => {
        if (!event?.nativeEvent?.contentOffset) return;

        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const productWidth = SCREEN_WIDTH * 0.8 + 22;
        const newIndex = Math.round(contentOffsetX / productWidth);

        if (
          newIndex !== currentProductIndex &&
          newIndex >= 0 &&
          newIndex < products.length
        ) {
          const newActiveProduct = products[newIndex];
          if (newActiveProduct && dispatch) {
            dispatch({type: 'SET_CURRENT_PRODUCT_INDEX', payload: newIndex});
            dispatch({type: 'SET_ACTIVE_PRODUCT', payload: newActiveProduct});
            if (setSelectedItem) {
              setSelectedItem(newActiveProduct);
            }
          }
        }
    };

    const keyExtractor = (item: any, index: number) => {
      if (!item) return `product-${index}`;
      return item._id || `product-${index}`;
    };

    return (
      <FlatList
        data={products}
        keyExtractor={keyExtractor}
        horizontal
        scrollEnabled={true}
        onScroll={handleScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsListContainer}
        renderItem={renderProduct}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        nestedScrollEnabled={true}
        snapToInterval={SCREEN_WIDTH * 0.8 + 22}
        decelerationRate="fast"
        snapToAlignment="start"
        disableIntervalMomentum={true}
        bounces={false}
      />
    );
  },
);

const ActionButtons = React.memo(
  ({
    shareProfile,
    video,
    isMuted, 
    setIsMuted,
  }: any) => {
    if (!video) return null;

    return (
      <View style={styles.actionButtons}>
        <View style={{alignItems: 'center'}}>
          <TouchableOpacity style={styles.actionButton} onPress={()=>setIsMuted(!isMuted)}>
            {isMuted ? (
              // <VolumeOff color="#fff" size={28} />
              <Ionicons name="volume-mute" color="white" size={28} />
            ) : (
              // <FontAwesome name="volume-up" color="white" size={28} />
              <Volume2 color="#fff" size={28} />
            )}
          </TouchableOpacity>
        </View>
        <View style={{alignItems: 'center'}}>
          <TouchableOpacity style={styles.actionButton} onPress={shareProfile}>
            <Fontisto name="share-a" color="white" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

const TopActionButtons = React.memo(
  ({video, navigation, isMuted: _isMuted, setIsMuted: _setIsMuted, isFromStackNavigation = false}: any) => {
    const insets = useSafeAreaInsets();
    const {followUser, unfollowUser, checkFollowStatus} = useFollowApi();
    const [status, setStatus] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [logId, setLogId] = useState('');
    const sellerId = video?.host?.userInfo?._id;
    
    // Listen for follow status changes from other reels
    useEffect(() => {
      if (!sellerId) return;
      
      const subscription = DeviceEventEmitter.addListener(
        FOLLOW_STATUS_CHANGED_EVENT,
        (data: {sellerId: string; isFollowing: boolean}) => {
          if (data.sellerId === sellerId) {
            setStatus(data.isFollowing);
          }
        }
      );
      
      return () => {
        subscription.remove();
      };
    }, [sellerId]);

    const handleFollow = useCallback(async () => {
      try {
        if (!sellerId) {
          ToastAndroid.show('User not found', ToastAndroid.SHORT);
          return;
        }
        setIsFollowLoading(true);
        await followUser(sellerId);
        setStatus(true);
        followStatusCache.set(sellerId, true);
        DeviceEventEmitter.emit(FOLLOW_STATUS_CHANGED_EVENT, {
          sellerId,
          isFollowing: true,
        });
        ToastAndroid.show('Successfully followed', ToastAndroid.SHORT);
      } catch (error: any) {
        ToastAndroid.show(
          error?.response?.data?.message || 'Failed to follow',
          ToastAndroid.SHORT,
        );
      } finally {
        setIsFollowLoading(false);
      }
    }, [followUser, sellerId]);

    const handleUnfollow = useCallback(async () => {
      try {
        if (!sellerId) {
          ToastAndroid.show('User not found', ToastAndroid.SHORT);
          return;
        }
        setIsFollowLoading(true);
        setStatus(false);
        followStatusCache.set(sellerId, false);
        DeviceEventEmitter.emit(FOLLOW_STATUS_CHANGED_EVENT, {
          sellerId,
          isFollowing: false,
        });
        await unfollowUser(sellerId);
        ToastAndroid.show('Successfully unfollowed', ToastAndroid.SHORT);
      } catch (error: any) {
        setStatus(true);
        followStatusCache.set(sellerId, true);
        DeviceEventEmitter.emit(FOLLOW_STATUS_CHANGED_EVENT, {
          sellerId,
          isFollowing: true,
        });
        ToastAndroid.show(
          error?.response?.data?.message || 'Failed to unfollow',
          ToastAndroid.SHORT,
        );
      } finally {
        setIsFollowLoading(false);
      }
    }, [unfollowUser, sellerId]);

    useEffect(() => {
      const getStatus = async () => {
        try {
          if (!sellerId) return;
          if (followStatusCache.has(sellerId)) {
            setStatus(followStatusCache.get(sellerId) || false);
          }
          const res = await checkFollowStatus(sellerId);
          const isFollowing = !!res?.isFollowing;
          setStatus(isFollowing);
          followStatusCache.set(sellerId, isFollowing);
          const id = (await AsyncStorage.getItem('sellerId')) || '';
          setLogId(id);
        } catch (error) {
          console.error('Error checking follow status:', error);
        }
      };
      if (sellerId) {
        getStatus();
      }
    }, [sellerId, checkFollowStatus]);
    
    // Early return after all hooks - only check for video, not host (host may be loading)
    if (!video) return null;

    const handleNavigation = async() => {
      const token = await AsyncStorage.getItem('accessToken');
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        if (token)
          navigation.navigate('bottomtabbar');
        else
          navigation.navigate('Login');
      }
    };

    const navigateToSellerInfo = () => {
      if (video?.host?.userInfo?.userName) {
        navigation.navigate('ViewSellerProdile', {
          id: video.host.userInfo.userName,
        });
      }
    };

    // Calculate dynamic top position based on navigation source
    // When from bottom tab bar (no id), use minimal top padding since tab navigator handles safe area
    // When from stack navigation (with id), use full safe area insets
    const topPosition = (Platform.OS === 'ios' ? 50 : 15); // Default values when from tab bar

    return (
      <View style={[styles.topActionButtons, { top: topPosition }]}>
        <View style={{flexDirection:'row',alignItems:'center',width:'85%'}}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleNavigation}>
            <ArrowLeft color={'#fff'} size={24} />
          </TouchableOpacity>

          <View style={styles.sellerInfoWrapper}>
            <TouchableOpacity
              style={styles.sellerInfoContainer}
              onPress={navigateToSellerInfo}>
              {video?.host?.userInfo?.profileURL?.key ? (
                <Image
                  source={{
                    uri: `${AWS_CDN_URL}${video.host.userInfo.profileURL.key}`,
                  }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.defaultProfileImage}>
                  <Text style={styles.profileInitial}>
                    {(video?.host?.companyName || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              
              <View style={styles.sellerTextContainer}>
                <Text style={styles.companyName} numberOfLines={1} ellipsizeMode="tail">
                  {video?.host?.companyName || 'Unknown'}
                </Text>
                
                {logId !== video?.host?._id && (
                  <TouchableOpacity
                    style={[styles.followButton, status && styles.followed]}
                    disabled={isFollowLoading}
                    onPress={() => (status ? handleUnfollow() : handleFollow())}>
                    {isFollowLoading ? (
                      <ActivityIndicator size="small" color={status ? '#fff' : '#000'} />
                    ) : (
                      <Text style={[styles.followText, status && {color: '#fff'}]}>
                        {status ? 'Following' : 'Follow'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  },
);

const AskMeAnything = React.memo(({navigation: _navigation, video}: any) => {
  const [chatMessage, setChatMessage] = useState('');
  const [loadingSend, setLoadingSend] = useState(false);
  const inputRef = useRef(null);

  const handleMessage = useCallback(async () => {
    if (!chatMessage.trim() || loadingSend) return;

    try {
      setLoadingSend(true);

      const response = await axiosInstance.post(`/chat/direct-message`, {
        userId: video?.host?.userInfo?._id,
        userType: 'user',
      });

      const chatRoom = response?.data?.data;
      if (!chatRoom?._id) throw new Error('Failed to create chat room');

      const combinedMessage = `/user/reel/${video?._id}\n${chatMessage.trim()}`;

      const userMessageRes = await axiosInstance.post(
        `chat/rooms/${chatRoom._id}/messages`,
        {
          messageType: 'text',
          content: {text: combinedMessage},
          metadata: {
            fromVideo: video?._id,
            videoTitle: video?.title,
            messageType: 'video_question',
            context: 'shoppable_video_ask_me',
          },
          source: 'shoppable'
        },
      );

      if (!userMessageRes.data.status)
        throw new Error('Failed to send message');

      setChatMessage('');
      Keyboard.dismiss();
      ToastAndroid.show('Message sent successfully!', ToastAndroid.SHORT);
    } catch (err) {
      console.log('Error sending message:', err);
      ToastAndroid.show(err?.response?.data?.message || 'Failed to send message', ToastAndroid.SHORT);
    } finally {
      setLoadingSend(false);
    }
  }, [chatMessage, loadingSend, video]);

const handleSendPress = useCallback(() => {
    if (!chatMessage.trim() || loadingSend) return;
    handleMessage();
  }, [handleMessage, chatMessage, loadingSend]);

  return (
    <View style={styles.inputContainer}>
      <RNTextInput
        ref={inputRef}
        style={styles.askMeInput}
        placeholder={`Ask ${video?.host?.companyName || 'Creator'} ...`}
        value={chatMessage}
        onChangeText={setChatMessage}
        placeholderTextColor="#fff"
        multiline={false}
        allowFontScaling={false}
        blurOnSubmit={false}
        returnKeyType="send"
        onSubmitEditing={handleSendPress}
      />
      <TouchableOpacity
        onPress={handleSendPress}
        disabled={loadingSend || !chatMessage.trim()}
        activeOpacity={0.7}
        style={styles.sendButton}
      >
        {loadingSend ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.sendButtonText}>➤</Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // borderWidth:3,
    // borderColor:'green',
    backgroundColor: '#000000',
  },
  keyboardAvoidingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  keyboardAvoidingWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  askMeContainer: {
    backgroundColor: 'red',
    padding: 10,
    paddingVertical: 2,
    borderRadius: 20,
    width: '86%',
    marginBottom: 10,
  },
  askMeText: {
    color: '#000',
  },

  askMeInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#fff',
    height: 40, // ✅ fixes vertical growth
    textAlignVertical: 'center', // ✅ centers text on Android
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // backgroundColor: "#000", // iOS blue or your theme color

    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  sendButtonText: {
    color: '#F7CE45',
    fontSize: 20,
    fontWeight: 'bold',
  },

  inputContainer: {
    // backgroundColor:"#F7CE45",
    //  padding: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 20,
    width: '86%',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    //  borderColor: "rgba(255, 255, 255, 0.15)",
    // backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: 'rgba(0, 0, 0, 0.3)', // darker border
    backgroundColor: 'rgba(0, 0, 0, 0.25)', // darker background
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'black',
  },
  overlayContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  bottomContent: {
    alignItems: 'flex-start',
    marginBottom: 40,
    width: SCREEN_WIDTH - 30,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
  },
  buyNowButton: {
    backgroundColor: '#F7CE45',
    borderRadius: 25,
    // height: SCREEN_HEIGHT * 0.055,
    justifyContent: 'center',
    // width: SCREEN_WIDTH * 0.75,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buyNowText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 12,
    // fontSize: SCREEN_WIDTH * 0.042,
    // letterSpacing: 0.5,
  },
  saveButton: {
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 12,
    // marginTop: 2,
  },
  productsListContainer: {
    gap: 12,
    paddingRight: 15,
    paddingLeft: 5,
    flexGrow: 0,
  },
  productItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: SCREEN_WIDTH * 0.8,
    minHeight: 95,
    overflow: 'hidden',
  },
  productContainer: {
    padding: 10,
    borderRadius: 10,
    minHeight: 90,
  },
  productHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    minHeight: 75,
  },
  productImage: {
    width: 75,
    height: 75,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#ccc',
    fontSize: 10,
    textAlign: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    color: '#fff',
    fontWeight: 'bold',
    // fontSize: 16,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  productPrice: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  mrpPrice: {
    textDecorationLine: 'line-through',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  ratingContainer: {
    justifyContent: 'flex-end',
    flexDirection: 'row',
    gap: 5,
  },
  reviewText: {
    color: '#fff',
    fontSize: 8,
    marginTop: 5,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    position: 'absolute',
    right: 10,
    gap: 15,
    bottom: 200,
    // bottom: SCREEN_HEIGHT * 0.45,
    padding: 5,
    zIndex: 20,
  },
  actionButton: {
    alignItems: 'center',
    // backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 30,
    // padding: 10,
    width: 48,
    height: 48,
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
    fontWeight: 'bold',
    marginTop: -5,
  },
  topActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Changed to space-between
    position: 'absolute',
    left: 15,
    right: 15,
    top: Platform.OS === 'ios' ? 50 : 15,
    zIndex: 20,
  },
  
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  sellerInfoWrapper: {
    flex: 1,
    // marginHorizontal: 10,
    // backgroundColor:'red',
    maxWidth: '90%', // Limit maximum width
  },
  
  sellerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    paddingVertical: 5,
    // paddingHorizontal: 10,
    paddingRight: 5, // Reduced right padding
  },
  
  sellerTextContainer: {
    flex: 1,
    // flexDirection: 'row',
    alignItems: 'flex-start',
    gap:3,
    // justifyContent: 'space-between',
    marginLeft: 8,
    minWidth: 0, // Important for text truncation
  },
  
  profileImage: {
    height: 40,
    width: 40,
    borderRadius: 27.5,
    borderWidth: 2,
    borderColor: '#F7CE45',
  },
  
  defaultProfileImage: {
    height: 35,
    width: 35,
    backgroundColor: 'orange',
    borderRadius: 17.5,
    borderWidth: 2,
    borderColor: '#F7CE45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  profileInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  
  companyName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform:'capitalize',
    flex: 1, // Take available space
    // marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
  
  followButton: {
    backgroundColor: '#F7CE45',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 60, // Minimum width for consistency
    alignItems: 'center',
  },
  
  followed: {
    backgroundColor: 'rgba(119, 119, 119, 0.8)', 
  },
  
  followText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '600',
  },
  
  muteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bottomGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
    zIndex: 5,
  },
  topGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.25,
    zIndex: 5,
  },
});

export default ReelOverlay;
