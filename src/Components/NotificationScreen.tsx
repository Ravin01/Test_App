/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable curly */
/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  SectionList,
  TouchableOpacity,
  Animated,
  BackHandler,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {useFocusEffect} from '@react-navigation/native';
import {Swipeable} from 'react-native-gesture-handler';
import {notificationColors} from '../Utils/Colors';
import {AWS_CDN_URL} from '../Utils/aws';
import {ActivityIndicator} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDebouncedGoBack} from '../Utils/useDebouncedGoBack';
import {Toast} from '../Utils/dateUtils';
import {profileImg} from '../Utils/Constants';
import {AuthContext} from '../Context/AuthContext';
import SellerHeader from './SellerComponents/SellerForm/Header';
import GlobalConfirmModal from './Reuse/AlertModal';
import useConfirmModal from '../hooks/useAlertModal';
import {formatTimeAgo, getSectionCategory} from '../Utils/timeAgoUtils';
import { flykupLogo } from '../assets/assets';
import axiosCommunication from '../Utils/axiosCommunication';


const PAGE_LIMIT = 10;

const notificationIcons = {
  order_placed: '📦',
  order_status: '🔔',
  order_cancelled: '❌',
  return_requested: '🛍️',
  return_status: '✔️',
  approval: '✅',
  seller_status: '✅',
  new_product: '🆕',
  new_video: '🎥',
  default: '🔔',
  admin_broadcast: '📢',
  seller_broadcast: '📢',
  live_stream_start: '🔴',
  seller_order_update: '🔔',
  new_show_scheduled: '🗓️',
  // Add cohost notification types
  cohost_invite: '🎤',
  cohost_accepted: '🎤',
  cohost_rejected: '❌',
  cohost_join_live: '🔴',
  // Flash sale notification type
  flash_sale_started: '⚡',
};

// Helper function to get image URL - moved outside component
const getImageUrl = (item) => {
  if (!item.image) return null;
  if (item.image.startsWith('https')){
    return item.image;
  }
  return `${AWS_CDN_URL}${item.image}`;
};

// Notification Item Component with expandable text
const NotificationItem = ({item, onNavigate, onRemove, isSystemNotification, navigation}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowViewMore, setShouldShowViewMore] = useState(false);
  
  const relativeTime = formatTimeAgo(item.createdAt);
  const displayMessage = item.type === 'follow' ? 'started following you.' : item.message;
  const imageUrl = getImageUrl(item);

  const onTextLayout = useCallback((e) => {
    if (e.nativeEvent.lines.length > 2) {
      setShouldShowViewMore(true);
    }
  }, []);

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        onPress={() => onRemove(item._id)}
        className="justify-center items-center w-20 bg-[#CF6679] my-1.5 mr-3 rounded-xl">
        <Animated.View style={{transform: [{scale}], alignItems: 'center'}}>
          <Icon name="trash" size={24} color="white" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderSenderName = () => {
    if (item.type === 'admin_broadcast') {
      return <Text className="font-bold text-[#F7CE45]">Flykup Admin</Text>;
    }

    if (['cohost_invite', 'cohost_join_live'].includes(item.type)) {
      return (
        <Text className="font-bold text-white">
          {item.metadata?.hostName || item.title || 'Host'}
        </Text>
      );
    }

    if (['cohost_accepted', 'cohost_rejected'].includes(item.type)) {
      return (
        <Text className="font-bold text-white">
          {item.metadata?.cohostName || 'Co-host'}
        </Text>
      );
    }

    if (isSystemNotification(item)) {
      return <Text className="font-bold text-[#F7CE45]">Flykup Team</Text>;
    }

    if (item?.senderProfile?.userName) {
      return (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('ViewSellerProdile', {
              id: item?.senderProfile?.userName,
            });
          }}>
          <Text className="font-bold text-white">
            {item.title || item?.senderProfile?.userName}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <Text className="font-bold text-white">
        {item.title || 'Someone'}
      </Text>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View
        className={`p-4 mx-3 my-1.5 rounded-xl ${
          !item.isRead ? 'bg-gray-800/60' : 'bg-[#23232A]'
        }`}>
        <TouchableOpacity
          onPress={() => onNavigate(item)}
          className="flex-row"
          style={{
            borderLeftColor: item.title === 'Live Auction' ? '#FACC15' : 'transparent',
          }}>
          {/* Avatar/Icon Section */}
          <View className="w-12 h-12 flex-shrink-0 mr-3">
            <View
              className="w-full h-full rounded-full flex items-center justify-center"
              style={{
                backgroundColor: '#1F1F1F',
                borderWidth: 1,
                borderColor: '#FACC15',
              }}>
              {(() => {
                if (isSystemNotification(item) || item.type === 'admin_broadcast') {
                  return (
                    <Image
                      source={{uri: flykupLogo}}
                      style={{width: 45, height: 45, borderRadius: 24}}
                      resizeMode='contain'
                    />
                  );
                }

                if (['cohost_invite', 'cohost_accepted', 'cohost_rejected', 'cohost_join_live'].includes(item.type)) {
                  return <Text className="text-xl">{notificationIcons[item.type]}</Text>;
                }

                if (item.icon && item.icon.startsWith('http')) {
                  return (
                    <Image
                      source={{uri: item.icon}}
                      style={{width: 45, height: 45, borderRadius: 24}}
                      defaultSource={{uri: flykupLogo}}
                    />
                  );
                }

                if (item?.senderProfile?.profileURL) {
                  return (
                    <Image
                      source={{uri: `${AWS_CDN_URL}${item?.senderProfile?.profileURL}`}}
                      style={{width: 45, height: 45, borderRadius: 24}}
                      defaultSource={{uri: profileImg}}
                    />
                  );
                }

                if (notificationIcons[item.type]) {
                  return <Text className="text-xl">{notificationIcons[item.type]}</Text>;
                }

                return (
                  <View className="w-full h-full rounded-full bg-gray-900 items-center justify-center">
                    <Text className="text-white text-xl font-bold">
                      {item?.senderProfile?.userName?.substring(0, 2).toUpperCase() || 'U'}
                    </Text>
                  </View>
                );
              })()}
            </View>
          </View>

          {/* Notification Content */}
          <View className="flex-1">
            {item.type === 'admin_broadcast' ? (
              <View>
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center gap-2 flex-1">
                    {renderSenderName()}
                    {notificationIcons[item.type] && (
                      <Text className="text-base">{notificationIcons[item.type]}</Text>
                    )}
                  </View>
                  <Text className="text-xs text-[#999999] ml-2">{relativeTime}</Text>
                </View>
                {item.title && (
                  <Text 
                    className="font-semibold text-white text-base mb-1"
                    numberOfLines={isExpanded ? undefined : 3     }
                    onTextLayout={onTextLayout}
                  >
                    {item.title}
                  </Text>
                )}
                {shouldShowViewMore && (
                  <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                    <Text className="text-[#F7CE45] text-xs font-medium">
                      {isExpanded ? 'View less' : 'View more'}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text className="text-sm text-gray-300">{displayMessage}</Text>
              </View>
            ) : (
              <View>
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-start gap-1 flex-wrap flex-1">
                    {renderSenderName()}
                    {notificationIcons[item.type] && (
                      <Text className="text-base">{notificationIcons[item.type]}</Text>
                    )}
                    <Text 
                      className="text-sm text-white"
                      numberOfLines={isExpanded ? undefined : 2}
                      onTextLayout={onTextLayout}
                    > {displayMessage}</Text>
                  </View>
                  <Text className="text-xs text-[#999999] ml-2">{relativeTime}</Text>
                </View>
                {shouldShowViewMore && (
                  <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                    <Text className="text-[#F7CE45] text-xs font-medium">
                      {isExpanded ? 'View less' : 'View more'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {imageUrl && (
              <View className="mt-3">
                <Image
                  source={{uri: imageUrl}}
                  style={{
                    maxWidth: '100%',
                    height: 128,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#4B5563',
                  }}
                  resizeMode="cover"
                />
              </View>
            )}

            {item.amount && (
              <Text className="text-sm font-bold mt-2 text-[#FACC15]">
                Amount {item.amount}
              </Text>
            )}

            {item.secondaryAction && (
              <View className="flex-row gap-2 mt-2">
                <TouchableOpacity
                  className="py-2 px-4 rounded-md border"
                  style={{borderColor: item.accentColor}}>
                  <Text className="text-xs font-bold" style={{color: item.accentColor}}>
                    {item.secondaryAction}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Unread Indicator */}
          <View className="items-center self-center ml-2">
            {!item.isRead && <View className="w-2.5 h-2.5 rounded-full bg-[#FACC15]" />}
          </View>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
};

// Function to group notifications by sections
const groupNotificationsBySection = (notifications) => {
  const sections = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'This Month': [],
    'Older': []
  };
  
  // Guard against undefined or non-array notifications
  if (!notifications || !Array.isArray(notifications)) {
    return [];
  }
  
  notifications.forEach(notification => {
    const category = getSectionCategory(notification.createdAt);
    sections[category].push(notification);
  });
  
  // Convert to SectionList format, filtering out empty sections
  return Object.keys(sections)
    .filter(key => sections[key].length > 0)
    .map(key => ({
      title: key,
      data: sections[key]
    }));
};

const NotificationScreen = ({navigation}) => {
  const {fetchCount, user} = useContext(AuthContext);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with true to show loader immediately
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showLoadMore, setShowLoadMore] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const colors = notificationColors;
  const isMountedRef = useRef(true);
  const loadingRef = useRef(false);
  const isInitialLoadRef = useRef(true);

     const { modalConfig, showModal, hideModal, handleConfirm } = useConfirmModal();
  const removeNotification = async id => {
    try {
      const res = await axiosCommunication.delete(`/notifications/${id}`);
      Toast(res.data?.message);
      fetchNotifications(1);
    } catch (err) {
      console.log(err.response?.data || err);
      Toast('Failed to delete notification');
    }
  };

  const clearAllNotifications = () => {
     showModal({
      title: 'Clear All Notifications',
      content: 'Are you sure you want to delete all notifications? It cannot be undo.',
      mode: 'error',
      confirmText: 'Clear All',
      showIcon:false,
      onConfirm:  async () => {
            try {
              if (!user?._id) {
                Toast('User ID not found');
                return;
              }
              await axiosCommunication.delete(`/notifications/delete/${user._id}`);
              setNotifications([]);
              setCurrentPage(1);
              setHasMoreData(true);
              Toast('All notifications cleared');
              await fetchCount();
            } catch (err) {
              console.log(err.response?.data || err);
              Toast('Failed to clear notifications');
            }},
    });
    // Alert.alert(
    //   '',
    //   '',
    //   [
    //     {text: 'Cancel', onPress: () => {}, style: 'cancel'},
    //     {
    //       text: 'Delete',
    //       onPress:
    //       },
    //       style: 'destructive',
    //     },
    //   ],
    // );
  };

  const getProductIdFromUrl = url => {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1] || null;
  };

  const handleNavigate = async item => {
    
    console.log(item.type,"this is the type")
    try {
         if (item?.type === "order_placed") {
          
        navigation.navigate('SellerOrders');
            return ;
          }
         if (item?.type === "flash_sale_started") {
            if (item?.metadata?.productId) {
              
        navigation.navigate('ProductDetails', {id: item?.metadata?.productId, type: 'static'});
              return;
            }
            return ;
          }
          
      // Use the link from notification if available
      if (item?.link && item.type !== 'cohost_invite' && item.type !== 'cohost_join_live') {
        const itemId = getProductIdFromUrl(item.link);
        
        if (item.type === 'new_video' && itemId) {
          navigation.navigate('reel', {id: itemId});
          return;
        }
        if (item.type === 'live_stream_start' && itemId) {
          navigation.navigate('LiveScreen', {stream: {_id: itemId}});
          return;
        }
        if (item.type === 'new_show_scheduled' && itemId) {
          navigation.navigate('LiveScreen', {stream: {_id: itemId}});
          return;
        }
      }
      
      // Cohost notifications
      if (item.type === 'cohost_invite'|| item.type==='cohost_accepted' || item.type==='cohost_rejected') {
        navigation.navigate('cohostInvitations');
        return;
      }
      
      if (item.type === 'cohost_join_live') {
        if (item.metadata?.showId && item.metadata?.liveStreamId) {
          navigation.navigate('LiveScreen', {stream: {_id: item.metadata.showId}});
        } else {
          navigation.navigate('cohostInvitations');
        }
        return;
      }
      
      if (item.type === 'cohost_accepted' || item.type === 'cohost_rejected') {
        navigation.navigate('bottomtabbar', {
          screen: 'HomeTabs',
          params: { screen: 'myactivity' }
        });
        return;
      }
      
      // Order-related notifications - navigate to myactivity screen
      if (item.type === 'order_placed' || item.type === 'order_status' || 
          item.type === 'order_cancelled' || item.type === 'seller_order_update' ||
          item.type.includes('order')) {
        navigation.navigate('bottomtabbar', {
          screen: 'HomeTabs',
          params: { screen: 'myactivity' }
        });
        return;
      }
      
      // Return-related notifications
      if (item.type === 'return_requested' || item.type === 'return_status' ||
          item.type.includes('return')) {
        navigation.navigate('bottomtabbar', {
          screen: 'HomeTabs',
          params: { screen: 'myactivity' }
        });
        return;
      }
      
      // Other notification types
      if (item.type === 'chat_message') {
        navigation.navigate('ChatScreen', {roomId: item?.chatRoomID});
      } else if (item.type === 'follow') {
        navigation.navigate('ViewSellerProdile', {
          id: item?.senderProfile?.userName,
        });
      } else if (item.type === 'new_product') {
        const productId = getProductIdFromUrl(item.url || item.link);
        navigation.navigate('ProductDetails', {id: productId, type: 'static'});
      } else if (item.type === 'seller_broadcast' && item?.senderProfile?.userName) {
        navigation.navigate('ViewSellerProdile', {
          id: item?.senderProfile?.userName,
        });
      } else if (isSystemNotification(item)) {
        navigation.navigate('bottomtabbar', {
          screen: 'HomeTabs',
          params: { screen: 'myactivity' }
        });
      }
    } catch (err) {
      console.log(err.response?.data || err.message);
    }
  };

  const isSystemNotification = item =>
    [
      'seller_status',
      'approval',
      'order_status',
      'admin_broadcast',
      'order_cancelled',
      'return_status',
      'seller_order_update',
    ].includes(item.type);

  const renderNotification = ({item}) => {
    return (
      <NotificationItem
        item={item}
        onNavigate={handleNavigate}
        onRemove={removeNotification}
        isSystemNotification={isSystemNotification}
        navigation={navigation}
      />
    );
  };

  const markAllAsRead = async () => {
    try {
      await axiosCommunication.put('/notifications/mark-as-seen');
      await fetchCount();
    } catch (err) {
      console.log(err.response?.data || err);
    }
  };

  const fetchNotifications = async (PAGE = 1, forceShowLoader = false) => {
    if (!isMountedRef.current) return;

    if (PAGE === 1) {
      // Only show full-screen loader on initial load or when forced (like manual refresh)
      if (isInitialLoadRef.current || forceShowLoader || notifications?.length === 0) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      loadingRef.current = true;
    } else {
      if (loadingRef.current || !hasMoreData) return;
      setIsLoadingMore(true);
      loadingRef.current = true;
    }

    try {
      const response = await axiosCommunication.get(
        `/notifications/get?page=${PAGE}&limit=${PAGE_LIMIT}`,
      );
      const data=response.data.data||response.data
  // console.log(response.data)
      if (!isMountedRef.current) return;

      if (PAGE === 1) {
        setNotifications(data);
        setCurrentPage(1);
      } else {
        setNotifications(prev => [...prev, ...data]);
        setCurrentPage(PAGE);
      }

      // Check if we have more data
      if (data.length < PAGE_LIMIT) {
        setHasMoreData(false);
        setShowLoadMore(false);
      } else {
        setHasMoreData(true);
        setShowLoadMore(true);
      }
    } catch (err) {
      console.log(err, 'while fetching Notifications');
      if (PAGE === 1) {
        setNotifications([]);
      }
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    }
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    markAllAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    return () => backHandler.remove();
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      setCurrentPage(1);
      setHasMoreData(true);
      
      // Show loader on initial load (when notifications is empty) or reset initial load flag
      if (notifications?.length === 0) {
        isInitialLoadRef.current = true;
        setIsLoading(true);
      }
      
      fetchNotifications(1, false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const handleLoadMore = () => {
    if (!loadingRef.current && hasMoreData) {
      fetchNotifications(currentPage + 1);
    }
  };

  const NoNotifications = () => (
    <View className="flex-1 justify-center items-center p-5">
      <MaterialIcon
        name="notifications-off"
        size={80}
        color={colors.subtleText}
      />
      <Text className="text-lg font-bold text-white mt-4">
        No notifications yet
      </Text>
      <Text className="text-sm text-[#B0B0B0] mt-2 text-center">
        Your notifications will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#121212]">
      {/* Header */}
      <SellerHeader navigation={navigation} message={'Notification'} />
      {/* <View
        className="flex-row items-center justify-between"
        style={{
          marginTop: Platform.select({ios: 10, android: height * 0.01}),
          paddingVertical: height * 0.01,
          paddingHorizontal: width * 0.04,
        }}>
        <TouchableOpacity onPress={handleGoBack} className="p-1.5 w-10">
          <ArrowLeftCircle size={27} color="#fff" />
        </TouchableOpacity>

        <LinearGradient
          colors={['#B38728', '#FFD700']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={{
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            marginHorizontal: width * 0.02,
            height: height * 0.045,
          }}>
          <View className="bg-[#1A1A1A] justify-center items-center w-[98%] h-[90%] rounded-2xl px-2.5">
            <Text className="text-white font-bold text-[18px]">
              Notification
            </Text>
          </View>
        </LinearGradient>

       
      </View> */}

      {/* Initial Loading Indicator */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="small" color="#F7CE45" />
          <Text className="text-gray-400 mt-4 text-base">Loading notifications...</Text>
        </View>
      ) : (
        /* Notifications List with Sections */
        <SectionList
          sections={groupNotificationsBySection(notifications)}
          renderItem={renderNotification}
          keyExtractor={(item, index) => `${item._id}-${index}`}
          className="flex-1"
          contentContainerStyle={[
            {paddingBottom: 20},
            notifications?.length === 0 && {flex: 1},
          ]}
          refreshing={isRefreshing}
          onRefresh={() => {
            setCurrentPage(1);
            setHasMoreData(true);
            // Force show loader on manual refresh
            fetchNotifications(1, true);
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          renderSectionHeader={({section: {title}}) => (
            <View className="px-4 py-3 bg-[#1A1A1A]">
              <Text className="text-[#F7CE45] font-bold text-base">
                {title}
              </Text>
            </View>
          )}
          ListHeaderComponent={
            notifications?.length > 0 && (
              <View className="flex-row justify-end px-4 py-2">
                <TouchableOpacity
                  onPress={clearAllNotifications}
                  className="flex-row items-center gap-2 px-4 py-2.5 rounded-lg"
                  style={{
                    backgroundColor: '#FF3B30',
                    shadowColor: '#FF3B30',
                    shadowOffset: {width: 0, height: 2},
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}>
                  <MaterialIcon name="delete-sweep" size={20} color="#fff" />
                  <Text className="text-white font-semibold text-sm">Clear All</Text>
                </TouchableOpacity>
              </View>
            )
          }
          stickySectionHeadersEnabled={true}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => !isLoading && <NoNotifications />}
          ListFooterComponent={() =>
            isLoadingMore ? (
              <View className="flex-row items-center justify-center py-4">
                <ActivityIndicator size="small" color="#F7CE45" />
              </View>
            ) : showLoadMore && hasMoreData && notifications?.length > 0 ? (
              <TouchableOpacity
                onPress={handleLoadMore}
                activeOpacity={0.2}
                className="flex-row items-center justify-center bg-brand-yellow px-4 py-2 mx-32 rounded-full shadow-md mt-2">
                <Text className="text-black font-semibold text-base">
                  Load More
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
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

export default NotificationScreen;
