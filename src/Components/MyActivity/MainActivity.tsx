import React, {useState, useMemo, useEffect, useCallback, useRef} from 'react';
import {
  Dimensions,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SectionList,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {AlertOctagon, ChevronDown} from 'lucide-react-native';

import {colors} from '../../Utils/Colors';
import axiosInstance from '../../Utils/Api';
import {AWS_CDN_URL} from '../../Utils/aws';

import RatingModal from './RatingModal';
import Participated from './Auction/Participated';
import Prebid from './Auction/Prebid';
import WonProducts from './Auction/WonProducts';
import AuctionModal from './Auction/AuctionModal';
import ReviewSection from '../SellerProfile/ReviewSection';
import ViewReview from './Utils/ViewReviews';
import { chatting, notificaiton } from '../../assets/assets';

const screenWidth = Dimensions.get('window').width;
const PAGE_LIMIT = 10;

const ENDPOINT_MAP = {
  ShoppableVideo: '/shoppable-videos/saved/my-videos',
  Wishlist: 'wishlist/productsave',
};

const STATUS_FILTERS = [
  {status: 'ALL', name: 'All'},
  {status: 'ORDERED', name: 'Ordered'},
  {status: 'PENDING_PAYMENT', name: 'Pending Payment'},
  {status: 'PACKED', name: 'Packed'},
  {status: 'SHIPPED', name: 'Shipped'},
  {status: 'DELIVERED', name: 'Delivered'},
  {status: 'CANCELLED', name: 'Cancelled'},
];

const OrdersScreen = ({navigation}) => {
  // Main tab state
  const [activeTab, _setActiveTab] = useState('Orders');
  const [activeFilter, setActiveFilter] = useState({name: 'All', status: 'ALL'});
  const [nestedActiveTab, setNestedActiveTab] = useState('Participated');

  // Orders state
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Saved items state
  const [savedDataMap, setSavedDataMap] = useState({
    ShoppableVideo: {data: [], page: 1, hasMore: true},
    Wishlist: {data: [], page: 1, hasMore: true},
  });
  const [loadingMap, setLoadingMap] = useState({
    ShoppableVideo: false,
    Wishlist: false,
  });
  const [_refreshing, setRefreshing] = useState(false);

  // Modal state
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [auctionModalVisible, setAuctionModalVisible] = useState(false);

  // UI state
  const [isOpen, setIsOpen] = useState(null);
  const [isExpand, setIsExpand] = useState(null);

  // Refs for pagination state (to avoid stale closures)
  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);
  const isFetchingMoreRef = useRef(isFetchingMore);
  const loadingRef = useRef(loading);

  // Keep refs in sync with state
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  useEffect(() => {
    isFetchingMoreRef.current = isFetchingMore;
  }, [isFetchingMore]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Fetch orders from API
  const fetchOrders = useCallback(async (page = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (page === 1) {
        setLoading(true);
      } else {
        setIsFetchingMore(true);
      }

      const response = await axiosInstance.get(
        `/order/userorders?page=${page}&limit=${PAGE_LIMIT}&status=${activeFilter.status}`,
      );
      const responseData = response.data?.data;
      const fetchedOrders = responseData?.orders || [];
      const fetchedTotalPages = responseData?.totalPages || 1;

      if (page === 1) {
        setOrders([...fetchedOrders]);
      } else {
        setOrders(prevOrders => [...prevOrders, ...fetchedOrders]);
      }

      setCurrentPage(responseData?.currentPage || page);
      setTotalPages(fetchedTotalPages);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
      setIsRefreshing(false);
    }
  }, [activeFilter.status]);

  // Fetch saved items (videos/wishlist)
  const fetchSavedItems = useCallback(async (tab, page = 1) => {
    const isPaginating = page > 1;
    if (loadingMap[tab] || (isPaginating && !savedDataMap[tab]?.hasMore)) return;

    setLoadingMap(prev => ({...prev, [tab]: true}));

    try {
      const endpoint = ENDPOINT_MAP[tab];
      let result = {data: [], currentPage: page, hasMore: false};

      if (tab === 'Wishlist') {
        const response = await axiosInstance.get(endpoint, {params: {page, limit: 10}});
        const {wishlistItems = [], pagination = {}} = response.data?.data || {};
        result = {
          data: wishlistItems.map(item => ({...item.productId, isSaved: true})),
          currentPage: pagination.currentPage || page,
          hasMore: pagination.hasNextPage || false,
        };
      } else if (tab === 'ShoppableVideo') {
        const response = await axiosInstance.get(endpoint, {params: {page, limit: 10}});
        const {videos = [], totalPages: tp, currentPage: cp} = response.data?.data || {};
        result = {
          data: videos.map(v => ({...v, isSaved: true})),
          currentPage: cp || page,
          hasMore: tp ? cp < tp : false,
        };
      }

      setSavedDataMap(prev => ({
        ...prev,
        [tab]: {
          data: page === 1 ? result.data : [...(prev[tab]?.data || []), ...result.data],
          page: result.currentPage,
          hasMore: result.hasMore,
        },
      }));
    } catch (err) {
      console.error('Error fetching saved items:', err.message || err);
    } finally {
      setLoadingMap(prev => ({...prev, [tab]: false}));
    }
  }, [loadingMap, savedDataMap]);

  // Handle unsave video (used in Saved tab)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleUnSave = useCallback(async id => {
    try {
      const response = await axiosInstance.post(`shoppable-videos/${id}/save`);
      const isSaved = response.data.data?.isSaved;
      ToastAndroid.show(isSaved ? 'Video saved!' : 'Video unsaved', ToastAndroid.SHORT);

      if (!isSaved) {
        setSavedDataMap(prev => ({
          ...prev,
          [nestedActiveTab]: {
            ...prev[nestedActiveTab],
            data: prev[nestedActiveTab].data.filter(v => v._id !== id),
          },
        }));
      }
    } catch (error) {
      ToastAndroid.show('Failed to update save status', ToastAndroid.SHORT);
    }
  }, [nestedActiveTab]);

  // Handle unsave product from wishlist (used in Saved tab)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleUnSaveProduct = useCallback(async id => {
    try {
      const response = await axiosInstance.post(`/wishlist/${id}/toggle`);
      const isSaved = response?.data?.data?.isInWishlist;

      if (typeof isSaved === 'undefined') {
        throw new Error('Invalid response format');
      }

      ToastAndroid.show(isSaved ? 'Added to wishlist!' : 'Removed from wishlist', ToastAndroid.SHORT);

      if (!isSaved) {
        setSavedDataMap(prev => ({
          ...prev,
          [nestedActiveTab]: {
            ...prev[nestedActiveTab],
            data: prev[nestedActiveTab].data.filter(v => v._id !== id),
          },
        }));
      }
    } catch (error) {
      console.error('Failed to update wishlist:', error?.message || error);
      ToastAndroid.show('Failed to update wishlist', ToastAndroid.SHORT);
    }
  }, [nestedActiveTab]);

  // Handle refresh for saved items (used in Saved tab)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setSavedDataMap(prev => ({
        ...prev,
        [nestedActiveTab]: {data: [], page: 1, hasMore: true},
      }));
      await fetchSavedItems(nestedActiveTab, 1);
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [nestedActiveTab, fetchSavedItems]);

  // Handle scroll for pagination
  const handleScroll = useCallback(event => {
    const {layoutMeasurement, contentOffset, contentSize} = event.nativeEvent;
    const paddingToBottom = 300;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    const cp = currentPageRef.current;
    const tp = totalPagesRef.current;
    const ifm = isFetchingMoreRef.current;
    const ld = loadingRef.current;

    if (isCloseToBottom && cp < tp && !ifm && !ld) {
      fetchOrders(cp + 1);
    }
  }, [fetchOrders]);

  // Effects - Reset orders and fetch when filter changes
  useEffect(() => {
    // Clear existing orders when filter changes to show loading state properly
    setOrders([]);
    setCurrentPage(1);
    setTotalPages(1);
    fetchOrders(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter.status]); // Only depend on status to avoid infinite loops with fetchOrders

  useEffect(() => {
    if (activeTab === 'Auction' || activeTab === 'Saved') {
      setNestedActiveTab(activeTab === 'Saved' ? 'ShoppableVideo' : 'Participated');
    }
  }, [activeTab]);

  useEffect(() => {
    if (
      activeTab === 'Saved' &&
      savedDataMap[nestedActiveTab]?.data.length === 0 &&
      savedDataMap[nestedActiveTab].hasMore
    ) {
      fetchSavedItems(nestedActiveTab, 1);
    }
  }, [activeTab, nestedActiveTab, savedDataMap, fetchSavedItems]);

  // Helper functions
  const formatEstimateDate = dateString => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
  };

  const renderStars = rating => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FontAwesome key={i} name="star" size={13} color="#FBBF24" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FontAwesome key={i} name="star-half-o" size={13} color="#FBBF24" />);
      } else {
        stars.push(<FontAwesome key={i} name="star" size={13} color="#fff" />);
      }
    }
    return stars;
  };

  // Render Header Icons
  const renderHeaderIcons = () => (
    <View style={styles.headerIcons}>
      <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('GlobalSearch')}>
        <Feather name="search" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('NotificationScreen')}>
        <FastImage source={{uri:notificaiton}} style={styles.iconImage} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Comment')}>
        <FastImage source={{uri:chatting}} style={styles.iconImage} />
      </TouchableOpacity>
    </View>
  );

  // Render Auction Component
  const renderAuctionComponent = useCallback(({item}) => {
    switch (nestedActiveTab) {
      case 'Participated':
        return <Participated show={item} error={null} />;
      case 'Won Products':
        return <WonProducts product={item} error={null} />;
      case 'Pre-bid':
        return <Prebid productforbid={item} onOpen={() => setAuctionModalVisible(true)} />;
      default:
        return null;
    }
  }, [nestedActiveTab]);

  // Render Order Item
  const renderOrderItem = (item, index) => {
    const imageUrl = item?.productId?.images?.[0]?.key
      ? `${AWS_CDN_URL}${item.productId.images[0].key}`
      : null;

    return (
      <View style={styles.orderItemContainer} key={`${item.name}-${index}`}>
        <Image source={{uri: imageUrl}} style={styles.itemImage} />
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>{item?.productId?.title}</Text>
          <View style={styles.itemMeta}>
            <Text style={styles.itemMetaText}>Quantity - {item?.quantity}</Text>
          </View>
          <Text style={styles.itemPrice}>₹{item?.basePrice}</Text>
        </View>
      </View>
    );
  };

  // Render Order Card
  const renderOrderCard = order => {
    const review = order?.products[0]?.userReview;

    const handleOpenReview = () => setIsOpen(isOpen === order?._id ? null : order?._id);
    const handleExpand = () => setIsExpand(isExpand === order?._id ? null : order?._id);

    const getStatusColor = () => {
      if (order.orderStatus === 'CANCELLED') return '#D92D2042';
      if (order.orderStatus === 'Delivered') return '#E5E7EB36';
      return null;
    };

    const getStatusTextColor = () => {
      if (order.orderStatus === 'CANCELLED' && activeFilter.status !== 'Review') return 'red';
      if (order.orderStatus === 'Delivered' && activeFilter.status !== 'Review') return '#80ef80';
      return '#f4ba00';
    };

    return (
      <View style={styles.orderCard} key={order._id}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.vendorContainer}>
            <MaterialIcons name="store" size={16} color="#888" />
            <Text style={styles.vendorName}>{order?.pickupAddresses[0]?.name || 'Unknown Vendor'}</Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: activeFilter.status !== 'Review' ? getStatusColor() : null}]}>
            <Text style={[styles.statusText, {color: getStatusTextColor()}]}>
              {activeFilter.status === 'Review' ? 'Review' : order.orderStatus}
            </Text>
          </View>
        </View>

        {/* Content */}
        <TouchableOpacity
          disabled={activeFilter.status === 'Review'}
          style={styles.cardContent}
          onPress={() => navigation.navigate('OrderDetails', {order})}>
          {order?.products?.map((item, index) => renderOrderItem(item, index))}

          {/* Shipping Info */}
          {activeFilter.status !== 'Review' && order.orderStatus !== 'CANCELLED' &&
            order.status !== 'Returned' && order.status !== 'Exchange' && (
            <View style={styles.shippingInfo}>
              <MaterialIcons name="local-shipping" size={16} color="#888" />
              <View style={styles.shippingDetails}>
                <Text style={styles.shippingStatus}>{order?.shipping?.status}</Text>
                {order?.orderStatus !== 'DELIVERED' ? (
                  <Text style={styles.deliveryEstimate}>
                    {['ORDERED', 'PACKED', 'PENDING_PAYMENT'].includes(order?.orderStatus)
                      ? `Delivery Charge ₹${order?.deliveryCharge}`
                      : `Estimated by ${formatEstimateDate(order?.courierDetails?.estimatedDelivery)}`}
                  </Text>
                ) : (
                  <Text style={styles.deliveryEstimate}>DELIVERED</Text>
                )}
              </View>
            </View>
          )}

          {/* Cancelled Info */}
          {activeFilter.status === 'Cancelled' && order.orderStatus === 'CANCELLED' && (
            <View style={styles.shippingInfo}>
              <AlertOctagon size={16} color="#FF3B305C" />
              <View style={styles.shippingDetails}>
                <Text style={styles.deliveryEstimate}>
                  {`Cancelled by ${order?.cancelSource} for ${order?.cancelReason}`}
                </Text>
              </View>
            </View>
          )}

          {/* Refund Info */}
          {activeFilter.status !== 'Review' &&
            ['Returned', 'Cancelled', 'Exchange'].includes(order.status) && (
            <View style={[styles.shippingInfo, {backgroundColor: '#121212'}]}>
              <FontAwesome6 name="sack-dollar" size={16} color="#888" />
              <View style={styles.shippingDetails}>
                <Text style={styles.shippingStatus}>Refund {order.refund?.status}</Text>
                <Text style={styles.deliveryEstimate}>{order.refund?.message}</Text>
              </View>
            </View>
          )}

          {/* Review Section */}
          {activeFilter.status === 'Review' && review && (
            <View style={[styles.shippingInfo, styles.reviewContainer]}>
              <TouchableOpacity style={styles.reviewHeader} onPress={handleExpand}>
                <View style={[styles.shippingDetails, {marginLeft: 0}]}>
                  <Text style={[styles.shippingStatus, {fontSize: 13}]}>Rating</Text>
                  <View style={styles.starsContainer}>{renderStars(review?.rating)}</View>
                </View>
                <ChevronDown color="#ccc" />
              </TouchableOpacity>
              {isExpand === order?._id && <ViewReview reviews={[review]} />}
            </View>
          )}
        </TouchableOpacity>

        {/* Total */}
        <View style={[styles.totalContainer, {
          justifyContent: activeFilter.status === 'Review' || ['Returned', 'Exchange'].includes(order?.orderStatus) ? 'space-between' : 'flex-end',
          flexDirection: ['Returned', 'Exchange'].includes(order?.orderStatus) ? 'column' : 'row',
        }]}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>₹{order?.totalAmount?.toLocaleString()}</Text>
          </View>

          {activeFilter.status === 'Review' && (
            <TouchableOpacity onPress={handleOpenReview} style={styles.reviewButton}>
              <Text>{isOpen === order?._id ? 'Close' : `${review ? 'Edit ' : ''}Review`}</Text>
            </TouchableOpacity>
          )}

          {activeFilter.status === 'Return' && (
            <TouchableOpacity style={styles.contactButton}>
              <Text>Contact</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Expanded Review */}
        {isOpen === order?._id && order?.products?.length > 0 && (
          <ReviewSection
            productId={order?.products[0]?.productId?._id}
            fetchReview={() => { setIsOpen(null); fetchOrders(1); }}
            reviews={order?.products[0]?.userReview}
          />
        )}
      </View>
    );
  };

  // Render Empty State
  const renderEmptyState = () => {
    // Get the filter name for display
    const filterName = activeFilter.status === 'ALL' ? '' : `"${activeFilter.name}" `;
    
    return (
      <View style={styles.emptyContainer}>
        {isRefreshing || loading ? (
          <ActivityIndicator size="small" color={colors.primaryButtonColor} />
        ) : (
          <View style={styles.emptyStateWrapper}>
            <View style={styles.backgroundCircle}>
              <View style={styles.innerCircle} />
            </View>
            <View style={styles.iconContainer}>
              <Icon name="shopping-bag" size={60} color="#F7CE45" />
            </View>
            <Text style={styles.emptyTitle}>No {filterName}Orders Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter.status === 'ALL' 
                ? "You haven't placed any orders yet."
                : `No orders with ${filterName.toLowerCase()}status available.`}
            </Text>
            <Text style={styles.emptyHint}>
              {activeFilter.status === 'ALL' 
                ? 'Start shopping to see your orders here!'
                : 'Try selecting a different filter or check back later!'}
            </Text>
            <View style={styles.dotsContainer}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render List Footer
  const renderListFooter = () => {
    if (isFetchingMore || (currentPage < totalPages && orders.length > 0)) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator color={colors.primaryButtonColor} size="small" />
          <Text style={styles.footerText}>Loading more orders...</Text>
        </View>
      );
    }
    if (!isFetchingMore && currentPage >= totalPages && orders.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>No more orders</Text>
        </View>
      );
    }
    return <View style={styles.footerSpacer} />;
  };

  // Memoized Modals
  const RatingModalMemo = useMemo(() => (
    <RatingModal visible={isRatingModalVisible} onClose={() => setIsRatingModalVisible(false)} />
  ), [isRatingModalVisible]);

  const AuctionModalMemo = useMemo(() => (
    <AuctionModal
      isVisible={auctionModalVisible}
      onClose={() => setAuctionModalVisible(false)}
      onSubmit={() => setAuctionModalVisible(false)}
    />
  ), [auctionModalVisible]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Activity</Text>
        {renderHeaderIcons()}
      </View>

      <View style={styles.contentContainer}>
        {/* Nested Tabs for Saved */}
        {activeTab === 'Saved' && (
          <View style={styles.nestedTabContainer}>
            {['ShoppableVideo', 'Wishlist'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.nestedTab, nestedActiveTab === tab && styles.nestedActiveTab]}
                onPress={() => setNestedActiveTab(tab)}>
                <Text style={{color: nestedActiveTab === tab ? '#f7ce45' : '#fff'}}>
                  {tab === 'ShoppableVideo' ? 'Shoppable Video' : 'Wishlist'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Nested Tabs for Auction */}
        {activeTab === 'Auction' && (
          <View style={[styles.nestedTabContainer, {width: screenWidth / 1.2}]}>
            {['Participated', 'Won Products', 'Pre-bid'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.nestedTab, nestedActiveTab === tab && styles.nestedActiveTab]}
                onPress={() => setNestedActiveTab(tab)}>
                <Text style={{fontSize: 14, color: nestedActiveTab === tab ? '#f7ce45' : '#fff'}}>
                  {tab === 'Won Products' ? 'Won\u00A0Products' : tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Auction Content */}
        {activeTab === 'Auction' && (
          <FlatList
            data={[]}
            keyExtractor={(item, index) => item?._id || index.toString()}
            renderItem={renderAuctionComponent}
            numColumns={['Won Products', 'Pre-bid'].includes(nestedActiveTab) ? 1 : 2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.ordersContainer}
            ListEmptyComponent={<Text style={styles.emptyText}>No Data found for this filter</Text>}
            ListFooterComponent={<View style={styles.footerSpacer} />}
          />
        )}

        {/* All Activity Tab */}
        {activeTab === 'All Activity' && (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No data found for this tab</Text>
          </View>
        )}
        

        {/* Orders Tab */}
        {activeTab === 'Orders' && loading && orders.length === 0 ? (
          <View style={styles.fullScreenLoaderContainer}>
            <ActivityIndicator size="large" color={colors.primaryButtonColor} />
            <Text style={styles.loadingText}>Loading {activeFilter.status !== 'ALL' ? activeFilter.name.toLowerCase() + ' ' : ''}orders...</Text>
          </View>
        ) : activeTab === 'Orders' && (
         
          <SectionList
            style={styles.sectionList}
            sections={[{title: 'Orders', data: orders}]}
            keyExtractor={(item, index) => `order-${item?._id || index}-${index}`}
            ListHeaderComponent={
              <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersScrollContainer}
                keyboardShouldPersistTaps="handled">
                {STATUS_FILTERS.map((filter, index) => (
                  <TouchableOpacity
                    key={filter.name}
                    onPress={() => setActiveFilter(filter)}
                    style={[
                      styles.filterButton,
                      activeFilter.status === filter.status && styles.activeFilter,
                      index === STATUS_FILTERS.length - 1 && {marginRight: 16},
                    ]}>
                    <Text style={[
                      styles.filterText,
                      activeFilter.status === filter.status && styles.activeFilterText,
                    ]}>
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
               {orders.length === 0 && !loading &&
          renderEmptyState()}
              </>
            }
            renderSectionHeader={() => null}
            contentContainerStyle={styles.ordersContainer}
            renderItem={({item}) => renderOrderCard(item)}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            refreshing={isRefreshing}
            onRefresh={() => fetchOrders(1, true)}
            onScroll={handleScroll}
            scrollEventThrottle={400}
            onEndReached={() => {
              const cp = currentPageRef.current;
              const tp = totalPagesRef.current;
              const ifm = isFetchingMoreRef.current;
              const ld = loadingRef.current;
              if (cp < tp && !ifm && !ld) fetchOrders(cp + 1);
            }}
            onEndReachedThreshold={0.5}
            // ListEmptyComponent={renderEmptyState()}
            ListFooterComponent={renderListFooter()}
          />
        )}
        
      </View>

      {/* Modals */}
      {RatingModalMemo}
      {auctionModalVisible && AuctionModalMemo}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  contentContainer: {
    flex: 1,
  },
  centerContainer: {
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
    backgroundColor: '#29282B',
    marginBottom: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    padding: 3,
  },
  iconImage: {
    width: 24,
    height: 24,
  },

  // Filters
  filtersScrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 4,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 8,
  },
  activeFilter: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primaryButtonColor,
  },
  filterText: {
    color: '#fff',
    fontSize: 14,
  },
  activeFilterText: {
    color: colors.primaryButtonColor,
    fontWeight: '500',
  },

  // Nested Tabs
  nestedTabContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
    width: screenWidth / 1.5,
  },
  nestedTab: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    marginRight: 5,
    alignItems: 'center',
  },
  nestedActiveTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#f7ce45',
  },

  // Orders
  ordersContainer: {
    flexGrow: 1,
    alignItems: 'stretch',
    paddingBottom: 50,
  },
  orderCard: {
    backgroundColor: '#000000',
    borderRadius: 8,
    marginBottom: 16,
    marginHorizontal: 10,
    width: screenWidth - 20,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  vendorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorName: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  statusBadge: {
    padding: 2,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusText: {
    color: '#f4ba00',
    textTransform: 'capitalize',
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // Order Items
  orderItemContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#777',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  itemMetaText: {
    color: '#888',
    fontSize: 12,
  },
  itemPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },

  // Shipping
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#121212',
  },
  shippingDetails: {
    marginLeft: 8,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  shippingStatus: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  deliveryEstimate: {
    color: '#888',
    fontSize: 11,
    flex: 1,
  },

  // Total
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  totalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  totalLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalAmount: {
    color: colors.primaryButtonColor,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Review
  reviewContainer: {
    backgroundColor: '#121212',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  reviewButton: {
    backgroundColor: colors.primaryButtonColor,
    padding: 4,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  contactButton: {
    backgroundColor: colors.primaryButtonColor,
    padding: 4,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    minHeight: 400,
  },
  emptyStateWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 30,
  },
  backgroundCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(247, 206, 69, 0.08)',
    top: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(247, 206, 69, 0.05)',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(247, 206, 69, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(247, 206, 69, 0.3)',
    zIndex: 2,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  emptyHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    width: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dot1: {
    backgroundColor: '#F7CE45',
    opacity: 1,
  },
  dot2: {
    backgroundColor: '#F7CE45',
    opacity: 0.5,
  },
  dot3: {
    backgroundColor: '#F7CE45',
    opacity: 0.25,
  },

  // Footer
  footerLoading: {
    paddingVertical: 20,
    paddingBottom: 100,
    alignItems: 'center',
  },
  footerText: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
  footerEnd: {
    paddingVertical: 20,
    paddingBottom: 100,
    alignItems: 'center',
  },
  footerEndText: {
    color: '#666',
    fontSize: 12,
  },
  footerSpacer: {
    paddingBottom: 100,
  },

  // Section List
  sectionList: {
    flex: 1,
  },

  // Full Screen Loader
  fullScreenLoaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
  },
});

export default OrdersScreen;
