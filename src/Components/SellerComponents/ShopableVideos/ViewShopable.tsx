/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SectionList,
  ToastAndroid,
  Modal,
  Switch,
  Platform,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Fontisto from 'react-native-vector-icons/Fontisto';
import Icon from 'react-native-vector-icons/Feather';
import {ActivityIndicator, FAB} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import api from '../../../Utils/Api';
import moment from 'moment';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {io} from 'socket.io-client';
import {socketurl} from '../../../../Config';
import {colors} from '../../../Utils/Colors';
import LinearGradient from 'react-native-linear-gradient';
import {ArrowLeftCircle, EarthIcon, Edit, Eye} from 'lucide-react-native';
import SearchComponent from '../../GloabalSearch/SearchComponent';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDebouncedGoBack} from '../../../Utils/useDebouncedGoBack';
import ToggleSwitch from 'toggle-switch-react-native';
import {
  AlertTriangle,
  X,
  XCircle,
  Calendar,
  Info,
  Clock,
  CheckCircle2,
  Lock,
  AlertCircle,
} from 'lucide-react-native'; // or your icon library
import {
  usePagePermissions,
  useEffectiveSellerId,
  useAccessModeInfo,
} from '../../../Context/AccessContext';
import ShareModal from '../../Reuse/ShareModal';
import {shareUrl} from '../../../../Config';

const {width, height} = Dimensions.get('window');

const ViewShopable = ({navigation}) => {
  // --- ACCESS PERMISSION HOOKS ---
  const {canView, canCreate, canEdit, canDelete} = usePagePermissions('SHOPPABLE_VIDEO');
  const effectiveSellerId = useEffectiveSellerId();
  const {isAccessMode, isOwnData, sellerInfo} = useAccessModeInfo();

  const SOCKET_SERVER_URL = socketurl;
  const pageLimit = 5;
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setsearch] = useState('');
  const socketRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const searchTimeoutRef = useRef(null); // For debouncing
  const handleGoBack = useDebouncedGoBack(() => navigation.goBack());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);

  const [rejectionModal, setRejectionModal] = useState(false);
  const [videoForRejectionModal, setVideoForRejectionModal] = useState(null);

  // Visibility loading state for individual videos
  const [visibilityLoading, setVisibilityLoading] = useState({});

  // Share modal state
  const [shareModal, setShareModal] = useState(false);
  const [videoToShare, setVideoToShare] = useState(null);

  // For animations, you can use React Native's Animated API
  const rejectionFadeAnim = React.useRef(new Animated.Value(0)).current;
  const rejectionSlideAnim = React.useRef(new Animated.Value(-50)).current;
  const rejectionScaleAnim = React.useRef(new Animated.Value(0.9)).current;
  React.useEffect(() => {
    if (rejectionModal) {
      Animated.parallel([
        Animated.timing(rejectionFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rejectionSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rejectionScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(rejectionFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rejectionSlideAnim, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rejectionScaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [rejectionModal]);

  const showToast = message => {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  };
  // Fetch products from API
  const fetchProducts = async (
    page = 1,
    isRefresh = false,
    searchQuery = '',
  ) => {
    // Don't fetch if user doesn't have view permission
    if (!canView) {
      return;
    }

    if (!isRefresh && !hasNextPage && page !== 1) return;

    if (page === 1) {
      setLoading(true);
    } else {
      setIsFetchingMore(true);
    }

    try {
      // Build URL with effective seller ID if in access mode
      let url = `/shoppable-videos/my-videos?page=${page}&limit=${pageLimit}&search=${searchQuery}`;
      
      // If in access mode, add sellerId to fetch that seller's videos
      if (effectiveSellerId) {
        url += `&sellerId=${effectiveSellerId}`;
      }

      const res = await api.get(url);
      const {
        videos,
        hasNextPage: next,
        currentPage: curr,
      } = res.data?.data || {};
      console.log(res.data.data.hasNextPage, res.data.data.videos.length);
      if (!videos) throw new Error('Videos not found in response');

      const updatedVideos = isRefresh ? videos : [...products, ...videos];

      setProducts(updatedVideos);
      setFilteredProducts(updatedVideos);
      setCurrentPage(curr);
      setHasNextPage(next);

      // socket handling
      if (socketRef.current?.connected) {
        videos.forEach(product => {
          const status = product?.processingStatus;
          if (['uploaded', 'processing', 'failed'].includes(status)) {
            socketRef.current.emit('subscribeToShoppableVideo', {
              videoId: product._id,
            });
          } else if (status === 'published') {
            socketRef.current.emit('unsubscribeFromShoppableVideo', {
              videoId: product._id,
            });
          }
        });
      }
    } catch (err) {
      console.error('Error fetching products:', err.message);
      showToast('Failed to load products');
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
      setIsRefreshing(false);
    }
  };

  // Handle search with debouncing
  const handleSearch = text => {
    setsearch(text);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set a new timeout to debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      fetchProducts(1, true, text);
    }, 50); // 500ms delay
  };

  useFocusEffect(
    React.useCallback(() => {
      // Initial fetch
      fetchProducts();

      // Cleanup function to clear timeout on unmount
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }, []),
  );

  // );

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
    });

    const currentSocket = socketRef.current;

    const handleConnect = () => {
      products?.forEach(product => {
        if (
          ['uploaded', 'processing', 'failed'].includes(
            product?.processingStatus,
          )
        ) {
          currentSocket.emit('subscribeToShoppableVideo', {
            videoId: product._id,
          });
        }
      });
    };

    const handleStatusUpdate = update => {
      // console.log('[Socket.IO] Received update:', update);
      if (update?.videoId && update?.statusDetails) {
        setProducts(prev =>
          prev.map(p =>
            p._id === update.videoId ? {...p, ...update.statusDetails} : p,
          ),
        );

        // 2. Show user feedback
        // showToast('Product status updated!');

        const newStatus = update.statusDetails.processingStatus;
        if (newStatus === 'published') {
          currentSocket.emit('unsubscribeFromShoppableVideo', {
            videoId: update.videoId,
          });
        } else if (['uploaded', 'processing', 'failed'].includes(newStatus)) {
          currentSocket.emit('subscribeToShoppableVideo', {
            videoId: update.videoId,
          });
        }
      }
    };

    currentSocket.on('connect', handleConnect);
    currentSocket.on('shoppableVideoStatusUpdate', handleStatusUpdate);
    currentSocket.on(
      'disconnect',
      reason => null,
      // console.log('Socket disconnected:', reason),
    );
    currentSocket.on('connect_error', err => console.log('Socket error:', err));

    return () => {
      // console.log('[Socket.IO] Cleaning up...');
      currentSocket.off('connect', handleConnect);
      currentSocket.off('shoppableVideoStatusUpdate', handleStatusUpdate);
      products.forEach(product => {
        currentSocket.emit('unsubscribeFromShoppableVideo', {
          videoId: product._id,
        });
      });
      currentSocket.disconnect();
      socketRef.current = null;
    };
  }, [products]);

  const handledelete = async id => {
    //console.log(id);

    if (!id) {
      console.log('No ID provided for deletion');
      return;
    }
    console.log('Deleting product with ID:', id);
    setLoading(true);
    try {
      await api.delete(`/shoppable-videos/${id}`);
      fetchProducts();
      ToastAndroid.show('Shoppable Video Deleted. ', ToastAndroid.SHORT);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle visibility change (activate/deactivate)
  const handleVisibilityChange = async (videoId, currentVisibility) => {
    const newVisibility = currentVisibility === 'public' ? 'private' : 'public';
    setVisibilityLoading(prev => ({ ...prev, [videoId]: true }));

    // Optimistic UI update
    const originalProducts = JSON.parse(JSON.stringify(products));
    setProducts(prevProducts =>
      prevProducts.map(product =>
        product._id === videoId ? { ...product, visibility: newVisibility } : product,
      ),
    );
    setFilteredProducts(prevProducts =>
      prevProducts.map(product =>
        product._id === videoId ? { ...product, visibility: newVisibility } : product,
      ),
    );

    try {
      const response = await api.put(
        `/shoppable-videos/${videoId}/visibility`,
        { visibility: newVisibility },
      );
      if (response.data.status) {
        showToast(`Video visibility updated to ${newVisibility}.`);
        // Sync with server response
        setProducts(prevProducts =>
          prevProducts.map(product =>
            product._id === videoId ? { ...product, ...response.data.data } : product,
          ),
        );
        setFilteredProducts(prevProducts =>
          prevProducts.map(product =>
            product._id === videoId ? { ...product, ...response.data.data } : product,
          ),
        );
      } else {
        showToast(response.data.message || 'Failed to update visibility.');
        setProducts(originalProducts);
        setFilteredProducts(originalProducts);
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      showToast(error.response?.data?.message || 'Failed to update visibility.');
      setProducts(originalProducts);
      setFilteredProducts(originalProducts);
    } finally {
      setVisibilityLoading(prev => ({ ...prev, [videoId]: false }));
    }
  };

  // Handle product rendering
  const renderEmptyState = () => {
    return (
      <ScrollView contentContainerStyle={styles.emptyStateContainer} showsVerticalScrollIndicator={false}>
        {/* Icon Container with Gradient */}
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={['#FFD700', '#B38728']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.emptyIconGradient}>
            <Fontisto name="shopping-basket-add" size={50} color="#000" />
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.emptyStateTitle}>Start Creating Shoppable Videos</Text>

        {/* Description */}
        <Text style={styles.emptyStateDescription}>
          No videos yet. Create your first shoppable video and start showcasing your products with interactive shopping experiences!
        </Text>

        {/* Tips Section */}
        <View style={styles.tipsContainer}>
          <View style={styles.tipsHeader}>
            <Icon name="info" size={18} color="#FFD700" />
            <Text style={styles.tipsHeaderText}>Why Shoppable Videos?</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipBullet}>
              <View style={styles.tipBulletDot} />
            </View>
            <Text style={styles.tipText}>Showcase products in action</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipBullet}>
              <View style={styles.tipBulletDot} />
            </View>
            <Text style={styles.tipText}>Direct product links in videos</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipBullet}>
              <View style={styles.tipBulletDot} />
            </View>
            <Text style={styles.tipText}>Increase engagement and sales</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipBullet}>
              <View style={styles.tipBulletDot} />
            </View>
            <Text style={styles.tipText}>Track video performance analytics</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.emptyStatePrimaryButton}
          onPress={() => {
            if (!canCreate) {
              ToastAndroid.show("You don't have permission to create videos", ToastAndroid.SHORT);
              return;
            }
            navigation.navigate('ShopableForm');
          }}
          activeOpacity={0.7}>
          <LinearGradient
            colors={canCreate ? ['#FFD700', '#B38728'] : ['#666', '#444']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.emptyStatePrimaryButtonGradient}>
            <Icon 
              name={canCreate ? "plus-circle" : "lock"} 
              size={20} 
              color={canCreate ? "#000" : "#999"} 
            />
            <Text style={[
              styles.emptyStatePrimaryButtonText,
              !canCreate && {color: '#999'}
            ]}>
              {canCreate ? 'Create Your First Video' : 'No Permission'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Info Cards */}
        <View style={styles.infoCardsContainer}>
          <View style={styles.infoCard}>
            <Icon name="video" size={24} color="#FFD700" />
            <Text style={styles.infoCardTitle}>Easy to Create</Text>
            <Text style={styles.infoCardText}>Simple video upload process</Text>
          </View>
          <View style={styles.infoCard}>
            <Icon name="trending-up" size={24} color="#FFD700" />
            <Text style={styles.infoCardTitle}>Drive Sales</Text>
            <Text style={styles.infoCardText}>Convert viewers to customers</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderProduct = ({item: selectedProduct}) => {
    const imageUrls = selectedProduct?.thumbnailBlobName
      ? `${AWS_CDN_URL}${selectedProduct.thumbnailBlobName}`
      : undefined;

    // console.log(selectedProduct.isblocked,selectedProduct.blockReason);
    const handledelete = async id => {
      if (!id) {
        console.log('No ID provided for deletion');
        return;
      }
      console.log('Deleting product with ID:', id);
      setLoading(true);
      try {
        await api.delete(`/shoppable-videos/${id}`);
        fetchProducts();
        ToastAndroid.show('Shoppable Video Deleted. ', ToastAndroid.SHORT);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    const status =
      selectedProduct?.approvalStatus || selectedProduct?.processingStatu;

    let bgColor = '#5C2B1C';
    let label = status;
    let icon = null;

    // Change color and text based on status
    switch (status) {
      case 'pending':
        bgColor = '#EAB308'; // yellow
        label = 'Pending Review';
        icon = <Clock size={14} color="#fff" />;
        break;
      case 'rejected':
        bgColor = '#DC2626'; // red
        label = 'Rejected';
        icon = <XCircle size={14} color="#fff" />;
        break;
      case 'published':
      case 'approved':
        bgColor = '#16A34A'; // green
        label = 'Published';
        icon = <CheckCircle2 size={14} color="#fff" />;
        break;
      default:
        bgColor = '#16A34A';
        label = status || 'published';
    }
    return (
      <View
        //key={selectedProduct._id}   // Moved to FlatList keyExtractor. Adding here causes warning.

        style={styles.productCard}>
        <View style={{flexDirection: 'column'}}>
          {/* Top Right Action Icons */}
          <View style={{flexDirection: 'row', alignSelf: 'flex-end', gap: 10, padding: 5}}>
            {/* Eye Icon - Only visible when published and public */}
            {(selectedProduct?.processingStatus === 'published' && 
              selectedProduct?.visibility === 'public') && (
              <TouchableOpacity
                onPress={() => {
                  //showToast('View video feature coming soon!');
                  //navigation.navigate('reel', { videoId: selectedProduct._id });
                  navigation.navigate('ShoppableVideoPreview', { videoId: selectedProduct._id });
                }}>
                <Eye size={18} color="#34D399" />
              </TouchableOpacity>
            )}
            
            {/* Share Icon - Only visible when published and public */}
            {(selectedProduct?.processingStatus === 'published' && 
              selectedProduct?.visibility === 'public') && (
              <TouchableOpacity
                onPress={() => {
                  setVideoToShare(selectedProduct);
                  setShareModal(true);
                }}>
                <Icon name="share-2" size={18} color="#60A5FA" />
              </TouchableOpacity>
            )}
            
            {/* Chart Icon - Analytics */}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ShopableAnalyse', {
                  videoId: selectedProduct._id,
                })
              }>
              <Icon name="bar-chart" size={18} color={colors.primaryButtonColor} />
            </TouchableOpacity>
            
            {/* Edit Icon */}
            {canEdit ? (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('EditShopableForm', {
                    videoId: selectedProduct._id,
                  })
                }>
                <Edit size={18} color="#ddd" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  ToastAndroid.show('You do not have edit access to edit this video.', ToastAndroid.SHORT);
                }}>
                <Lock size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* <VideoStatus status= {selectedProduct?.processingStatus}/> */}
          <View style={{flexDirection: 'row', marginTop: 4}}>
            <Image
              source={{uri: imageUrls}}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={{width: '68%'}}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text style={styles.productTitle} numberOfLines={3}>
                  {selectedProduct?.title}
                </Text>
              </View>
              <Text style={styles.productExpiryDate}>
                {selectedProduct.category} {selectedProduct.subcategory}
              </Text>
            </View>
          </View>
          
          {/* Footer Row - Toggle, Visibility, Status */}
          <View
            style={{
              flexDirection: 'row',
              gap: 5,
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: '#333',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View
              style={{flexDirection: 'row', alignItems: 'center', gap: 3}}>
              {/* Activate/Deactivate Toggle */}
              {(selectedProduct?.processingStatus === 'published' || 
                selectedProduct?.processingStatus === 'uploaded') ? (
                visibilityLoading[selectedProduct._id] ? (
                  <ActivityIndicator size="small" color={colors.primaryButtonColor} />
                ) : (
                  <TouchableOpacity
                    onPress={() => handleVisibilityChange(selectedProduct._id, selectedProduct.visibility)}
                    disabled={selectedProduct.isBlocked || status === 'rejected'}
                    style={{padding: 2}}>
                    <Icon
                      name={selectedProduct.visibility === 'public' ? 'toggle-right' : 'toggle-left'}
                      size={28}
                      color={
                        selectedProduct.isBlocked || status === 'rejected'
                          ? '#888'
                          : selectedProduct.visibility === 'public'
                          ? '#16A34A'
                          : '#777'
                      }
                    />
                  </TouchableOpacity>
                )
              ) : (
                selectedProduct.visibility == 'public' ? (
                  <Eye color={colors.primaryButtonColor} size={15} />
                ) : (
                  <AntDesign
                    name="earth"
                    color={colors.primaryButtonColor}
                    size={15}
                  />
                )
              )}
              <Text
                style={{
                  color: colors.primaryButtonColor,
                  textTransform: 'capitalize',
                  fontSize: 11,
                }}>
                {selectedProduct?.visibility}
              </Text>
            </View>

            <TouchableOpacity
              disabled={status !== 'rejected'}
              onPress={() => {
                if (status === 'rejected') {
                  setVideoForRejectionModal(selectedProduct);
                  setRejectionModal(true);
                }
              }}
              style={{
                backgroundColor: bgColor,
                borderRadius: 10,
                paddingVertical: 3,
                paddingHorizontal: 8,
                alignItems: 'center',
              }}>
              <Text style={{color: '#fff', fontSize: 12}}>
                {label}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedProduct.isBlocked && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-4 m-3">
              <Text className="text-red-800 text-base font-medium mb-1">
                🚨 This video is Blocked By Admin Reason:
              </Text>
              <Text className="text-red-600 text-sm">
                {selectedProduct.blockReason}
              </Text>
            </View>
          )}
          <Text
            style={{
              color: '#777',
              paddingRight: 4,
              fontSize: 11,
              marginTop: 5,
              textAlign: 'right',
            }}>
            {moment(selectedProduct.createdAt).fromNow()}
          </Text>
        </View>
      </View>
    );
  };
  // console.log(filteredProducts.length);
  
  // Check view permission before rendering
  if (!canView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.noAccessContainer]}>
          <AlertCircle size={64} color="#EF4444" />
          <Text style={styles.noAccessTitle}>Access Denied</Text>
          <Text style={styles.noAccessDescription}>
            You don't have permission to view shoppable videos.
          </Text>
          <TouchableOpacity
            style={styles.noAccessButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Text style={styles.noAccessButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} >
      {loading && (
        <View style={styles.overlay}>
          <View style={styles.overlayContainer}>
            <ActivityIndicator color={colors.primaryButtonColor} size={20} />
            {/* <Text style={styles.loadingText}>Loading...</Text> */}
          </View>
        </View>
      )}

      {/* FAB Button - Only show if user can create */}
      {canCreate? (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('ShopableForm')}
        />
      ): <FAB
          icon="lock"
          style={styles.fab}
          onPress={() => {ToastAndroid.show('You do not have create access to add a new video.', ToastAndroid.SHORT);}}
        />}

      <View>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            activeOpacity={0.7}>
            <ArrowLeftCircle color={'#fff'} size={30} />
          </TouchableOpacity>
          <LinearGradient
            colors={['#B38728', '#FFD700']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.headerGradient}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Shoppable Videos</Text>
            </View>
          </LinearGradient>
        </View>
        {/* Access Mode Banner */}
        {isAccessMode && (
          <View style={styles.accessBanner}>
            <View style={styles.accessBannerContent}>
              <Eye size={20} color={colors.primaryButtonColor} />
              <View style={styles.accessBannerTextContainer}>
                <Text style={styles.accessBannerTitle}>Access Mode Active</Text>
                <Text style={styles.accessBannerSubtitle}>
                  Viewing videos for: <Text style={styles.accessBannerSellerName}>{sellerInfo?.userName || 'Seller'}</Text>
                </Text>
                <View style={styles.accessBannerPermissions}>
                  <View style={[styles.permissionBadge, canView && styles.permissionBadgeActive]}>
                    <Text style={[styles.permissionBadgeText, canView && styles.permissionBadgeTextActive]}>
                      {canView ? '✓' : '✗'} View
                    </Text>
                  </View>
                  <View style={[styles.permissionBadge, canCreate && styles.permissionBadgeActive]}>
                    <Text style={[styles.permissionBadgeText, canCreate && styles.permissionBadgeTextActive]}>
                      {canCreate ? '✓' : '✗'} Create
                    </Text>
                  </View>
                  <View style={[styles.permissionBadge, canEdit && styles.permissionBadgeActive]}>
                    <Text style={[styles.permissionBadgeText, canEdit && styles.permissionBadgeTextActive]}>
                      {canEdit ? '✓' : '✗'} Edit
                    </Text>
                  </View>
                  {/* <View style={[styles.permissionBadge, canDelete && styles.permissionBadgeActive]}>
                    <Text style={[styles.permissionBadgeText, canDelete && styles.permissionBadgeTextActive]}>
                      {canDelete ? '✓' : '✗'} Delete
                    </Text>
                  </View> */}
                </View>
              </View>
            </View>
          </View>
        )}

       
               {filteredProducts.length == 0 && !loading && renderEmptyState()}
        <SectionList
          sections={[{title: 'Videos', data: filteredProducts}]}
          extraData={filteredProducts.length}
          keyExtractor={item => item._id}
          renderItem={renderProduct}
          renderSectionHeader={() => null}
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            fetchProducts(1, true);
          }}
          onEndReachedThreshold={0.3}
          initialNumToRender={10}
          onEndReached={() => {
            if (hasNextPage && !loading && !isFetchingMore) {
              fetchProducts(currentPage + 1);
            }
          }}
          showsVerticalScrollIndicator={false}
          // contentContainerStyle={styles.container}
          ListHeaderComponent={
            filteredProducts.length > 0 && (
              <View className="mt-2">
                {/* <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}>
                <AntDesign name="left" size={20} color="#ccc" />
                <Text style={{fontSize: 17, color: '#ccc'}}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.headerText}>Shoppable Videos</Text> */}

                {/* <View style={styles.inputContainer}> */}
                <SearchComponent
                  searchTerm={search}
                  setSearchTerm={handleSearch}
                />
                {/* <AntDesign name="search1" size={20} color="#ccc" />
                <TextInput
                  placeholder="search"
                  placeholderTextColor={'#ccc'}
                  value={search}
                  onChangeText={setsearch}
                /> */}
                {/* </View> */}
                {/* </View> */}
              </View>
            )
          }
          scrollEnabled
          ListFooterComponent={
            <View style={{alignItems: 'center', justifyContent: 'center'}}>
              {isFetchingMore && (
                <ActivityIndicator
                  color={colors.primaryButtonColor}
                  size={'small'}
                />
              )}
              {hasNextPage &&
                !loading &&
                !isFetchingMore &&
                filteredProducts.length > 0 && (
                  <TouchableOpacity
                    onPress={() => fetchProducts(currentPage + 1)}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-center bg-brand-yellow px-4 mx-28 mb-2 py-2 rounded-full shadow-md">
                    <Text className="text-black font-semibold text-base">
                      Load More
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          }
          ListEmptyComponent={
            //  && (
            <View style={styles.noProductsContainer}>
              <Animatable.View animation={'shake'} iterationCount={1}>
                <Fontisto name="shopping-basket-add" size={35} color="#777" />
              </Animatable.View>
              <Text style={{textAlign: 'center', color: '#777', fontSize: 16}}>
                No data is available
              </Text>
              <Text
                style={{
                  textAlign: 'center',
                  color: '#555',
                  fontSize: 14,
                  marginTop: 10,
                }}>
                Create your first shoppable video to get started.
              </Text>
            </View>
            // )
          }
        />
      </View>

      {/* Rejection Reason modal */}

      {rejectionModal && videoForRejectionModal && (
        <Modal
          visible={rejectionModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => setRejectionModal(false)}>
          <View style={styles.rejectionOverlay}>
            <Animated.View
              style={[
                styles.rejectionModalContainer,
                {
                  opacity: rejectionFadeAnim,
                  transform: [
                    {translateY: rejectionSlideAnim},
                    {scale: rejectionScaleAnim},
                  ],
                },
              ]}>
              {/* Decorative elements */}
              <View style={styles.rejectionGradientTop} />
              <View style={styles.rejectionGradientBottom} />

              {/* Header */}
              <View style={styles.rejectionHeader}>
                <View style={styles.rejectionHeaderLeft}>
                  <View style={styles.rejectionIconContainer}>
                    <XCircle size={24} color="#EF4444" />
                  </View>
                  <Text style={styles.rejectionHeaderTitle}>
                    Video Rejected
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setRejectionModal(false)}
                  style={styles.rejectionCloseButton}>
                  <X size={24} color="#E5E7EB" />
                </TouchableOpacity>
              </View>

              {/* Video Title */}
              <View style={styles.rejectionSection}>
                <Text style={styles.rejectionSectionTitle}>VIDEO TITLE</Text>
                <View style={styles.rejectionContentBox}>
                  <Text style={styles.rejectionContentText}>
                    {videoForRejectionModal.title}
                  </Text>
                </View>
              </View>

              {/* Rejection Date */}
              <View style={styles.rejectionSection}>
                <View style={styles.rejectionSectionHeader}>
                  <Calendar size={16} color="#FFF" />
                  <Text style={styles.rejectionSectionTitle}>
                    REJECTION DATE
                  </Text>
                </View>
                <View style={styles.rejectionContentBox}>
                  <Text style={styles.rejectionContentText}>
                    {videoForRejectionModal.rejectedAt
                      ? new Date(
                          videoForRejectionModal.rejectedAt,
                        ).toLocaleString()
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Rejection Reason */}
              <View style={styles.rejectionSection}>
                <View style={styles.rejectionSectionHeader}>
                  <Info size={16} color="#FFF" />
                  <Text style={styles.rejectionSectionTitle}>
                    REJECTION REASON
                  </Text>
                </View>
                <ScrollView
                  style={styles.rejectionReasonBox}
                  showsVerticalScrollIndicator={true}>
                  <Text style={styles.rejectionReasonText}>
                    {videoForRejectionModal.rejectionReason ||
                      'No specific reason provided.'}
                  </Text>
                </ScrollView>
              </View>

              {/* Next Steps Info Box */}
              <View style={styles.rejectionInfoBox}>
                <Text style={styles.rejectionInfoText}>
                  <Text style={styles.rejectionInfoBold}>Next Steps:</Text>{' '}
                  Please review the rejection reason and make necessary changes
                  to your video. You can edit the video and resubmit it for
                  approval.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.rejectionActions}>
                <TouchableOpacity
                  onPress={() => setRejectionModal(false)}
                  style={styles.rejectionSecondaryButton}>
                  <Text style={styles.rejectionSecondaryButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRejectionModal(false);
                    navigation.navigate('ShopableForm');
                  }}
                  style={styles.rejectionPrimaryButton}>
                  <Text style={styles.rejectionPrimaryButtonText}>
                    Create Video
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && videoToDelete && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Deletion</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete "{videoToDelete?.title}"? This
              action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setDeleteModal(false);
                  setVideoToDelete(null);
                }}
                style={[styles.modalButton, {backgroundColor: '#888'}]}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setDeleteModal(false);
                  await handledelete(videoToDelete?._id);
                  setVideoToDelete(null);
                }}
                style={[styles.modalButton, {backgroundColor: '#dc2626'}]}>
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Share Modal */}
      {shareModal && videoToShare && (
        <ShareModal
          isOpen={shareModal}
          onClose={() => {
            setShareModal(false);
            setVideoToShare(null);
          }}
          source={`shoppable`}
          shareUrl={`${shareUrl}user/reel/${videoToShare._id}`}
          shareContent={`Checkout these reel ${videoToShare.title}`}
          onShare={() => {
            // Share functionality handled by ShareModal
            setShareModal(false);
            setVideoToShare(null);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  stockImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    //backgroundColor:'red'
  },
  header: {
    flexDirection: 'row',
    // marginTop: Platform.select({ ios: 10, android: height * 0.01 }),
    alignItems: 'center',
    gap: width * 0.1,
    // paddingVertical: height * 0.01,
    // paddingHorizontal: width * 0.02,
  },
  backButton: {
    padding: 5,
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
  },
  title: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
  },
  backButtonText: {
    color: 'black',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.SecondaryColor,
    // borderRadius: 25,
    height: 50,
    // borderWidth: 1,
    // borderColor: '#B38728',
    // justifyContent: 'space-between',

    // marginBottom: 20,
    // paddingHorizontal: 10,
  },

  fab: {
    position: 'absolute',
    // margin: 16,
    borderRadius: 40,
    marginBottom: 10,
    alignItems: 'center',
    // height:50,
    right: 20,
    alignSelf: 'center',
    zIndex: 1,
    bottom: 50,
    backgroundColor: colors.primaryButtonColor,
  },

  editButton: {
    // backgroundColor: '#f9dd7c',
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    // padding: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
    borderRadius: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 5,
    alignSelf: 'center',
    marginBottom: 10,
  },
  addButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderRadius: 20,
    flexDirection: 'row',
    paddingVertical: 3,
    elevation: 5,
    gap: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fbdd74',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContainer: {
    // backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  container: {
    backgroundColor: colors.primaryColor,
    padding: 10,
    flex: 1,
    paddingBottom: 50,
    // marginBottom:100
    // padding:10
    // flex:1
  },
  headerText: {
    color: '#ccc',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'left',
    textTransform: 'capitalize',
  },
  productCard: {
    backgroundColor: colors.SecondaryColor,
    marginHorizontal: 5,
    // borderWidth: 1,
    // borderColor: '#777',
    flexDirection: 'row',
    marginBottom: 10,
    marginTop: 10,
    borderRadius: 10,
    padding: 15,
    elevation: 5,
  },
  productImage: {
    height: 80,
    borderRadius: 20,
    marginBottom: 10,
    width: 80,
    backgroundColor: '#333',
    marginRight: 10, // space between images if multiple
  },
  productTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 3,
  },
  productDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
    // lineHeight: 10,
  },
  productQuantity: {
    fontSize: 14,
    color: '#333',
    // marginBottom: 15,
  },
  productExpiryDate: {
    fontSize: 12,
    // textAlign:'center',
    width: '90%',
    color: '#777',
    marginBottom: 12,
  },
  noProductsContainer: {
    marginTop: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  failedText: {
    fontSize: 13,
    fontStyle: 'bold',
    // textAlign:'center',
    color: '#dc2626',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // paddingRight:10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignSelf: 'flex-end',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  failedStatusContainer: {
    backgroundColor: '#ffeaea',
    padding: 3,
    paddingLeft: 10,
    gap: 5,
    borderRadius: 4,
    // alignItems: 'center',
    // position: 'absolute',
    // right: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#111', // dark background
    padding: 20,
    borderRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f87171', // soft red for danger/warning
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: '#ccc', // lighter gray for readability
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#2563eb', // blue button for contrast
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  // For rejection modal
  rejectionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectionModalContainer: {
    backgroundColor: '#1B1B1B', //'#1F2937',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    borderWidth: 2,
    borderColor: '#333', //'rgba(245, 158, 11, 0.3)',
    overflow: 'hidden',
  },
  rejectionGradientTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 256,
    height: 256,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderRadius: 128,
    opacity: 0.5,
  },
  rejectionGradientBottom: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 192,
    height: 192,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 96,
    opacity: 0.5,
  },
  rejectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.2)',
  },
  rejectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rejectionIconContainer: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 20,
  },
  rejectionHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  rejectionCloseButton: {
    padding: 8,
    borderRadius: 20,
  },
  rejectionSection: {
    marginBottom: 16,
  },
  rejectionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rejectionSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffd700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rejectionContentBox: {
    backgroundColor: '#121212', //'rgba(17, 24, 39, 0.5)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.1)',
  },
  rejectionContentText: {
    color: '#F9FAFB',
    fontWeight: '500',
  },
  rejectionReasonBox: {
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    maxHeight: 160,
  },
  rejectionReasonText: {
    color: '#F9FAFB',
    fontSize: 14,
    lineHeight: 20,
  },
  rejectionInfoBox: {
    backgroundColor: '#121212', //'rgba(255, 180, 0, 0.25)',
    borderLeftWidth: 4,
    borderLeftColor: '#Ffd700',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  rejectionInfoText: {
    fontSize: 14,
    color: '#F9FAFB',
    lineHeight: 20,
  },
  rejectionInfoBold: {
    fontWeight: 'bold',
    color: '#FFd700',
  },
  rejectionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  rejectionSecondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(249, 250, 251, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.2)',
  },
  rejectionSecondaryButtonText: {
    color: '#F9FAFB',
    fontWeight: '500',
  },
  rejectionPrimaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#Ffd700',
    borderRadius: 8,
    shadowColor: '#F59E0B',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectionPrimaryButtonText: {
    color: '#1F2937',
    fontWeight: 'bold',
  },
  // Enhanced Empty State Styles
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
    minHeight: height * 0.7,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyStateDescription: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tipsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  tipBullet: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginLeft: 8,
  },
  emptyStatePrimaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    width: '100%',
    marginBottom: 24,
  },
  emptyStatePrimaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyStatePrimaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  infoCardsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  infoCardText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Access Mode Styles
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noAccessTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  noAccessDescription: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  noAccessButton: {
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  noAccessButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  accessBanner: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryButtonColor,
    padding: 12,
   // marginBottom: 12,
    borderRadius: 8,
    marginVertical: 12,
    marginHorizontal: 10,
  },
  accessBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  accessBannerTextContainer: {
    flex: 1,
  },
  accessBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  accessBannerSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  accessBannerSellerName: {
    fontWeight: 'bold',
    color: colors.primaryButtonColor,
  },
  accessBannerPermissions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  permissionBadgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  permissionBadgeText: {
    fontSize: 10,
    color: '#888',
  },
  permissionBadgeTextActive: {
    color: '#22C55E',
  },
});

export default ViewShopable;
