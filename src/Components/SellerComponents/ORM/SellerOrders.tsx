import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Modal,
  Pressable,
  FlatList,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {LucideIcon} from 'lucide-react-native';
// Replace the Lucide icon imports with:
import {
  Search as FiSearch,
  Package as FiPackage,
  Truck as FiTruck,
  CheckCircle as FiCheckCircle,
  RefreshCw as FiRefreshCw,
  XCircle as FiXCircle,
  Shield as FiShield,
} from 'lucide-react-native';
import axios from 'axios';
import axiosInstance from '../../../Utils/Api';
import {Toast} from '../../../Utils/dateUtils';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {Dropdown} from 'react-native-element-dropdown';
import {SafeAreaView} from 'react-native-safe-area-context';
import OrderDetailScreen from '../../MyActivity/OrderDetailedScreen';
import OrderDetailsBottomSheet from './Utils/OrderDetailSheet';
import CancelOrder from './Utils/CancelOrder';
import ShippinSheet from './Utils/ShippinSheet';
import ReturnSheet from './Utils/ReturnSheet';
import SellerHeader from '../SellerForm/Header';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
// Access Control
import { useAccess } from '../../../Context/AccessContext';

const SellerOrders = ({navigation}) => {
  // Access Context
  const { isAccessMode, sellerInfo, getPagePermissions } = useAccess();
  const permissions = getPagePermissions('ORDERS');
  
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderCounts, setOrderCounts] = useState({
    total: 0,
    today: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [currentReturnRequest, setCurrentReturnRequest] = useState(null);
  const [currentReturnOrder, setCurrentReturnOrder] = useState(null);
  const [filterShipping,setFilterShipping]=useState(true)
  const [statusUpdatingOrderId, setStatusUpdatingOrderId] = useState(null);
  const [isShippingSubmitting, setIsShippingSubmitting] = useState(false);
  //   const navigation = useNavigation();
  // const scrollRef = useRef(null);

  const DATE_FILTERS = [
    {value: null, label: 'All Time'},
    {value: 'TODAY', label: 'TODAY'},
    {value: 'YESTERDAY', label: 'YESTERDAY'},
    {value: 'THIS_MONTH', label: 'THIS_MONTH'},
    {value: 'LAST_MONTH', label: 'LAST_MONTH'},
  ];

  const STATUS_FILTERS = ['ALL', 'ORDERED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  const fetchOrders = useCallback(
    async (isNewFilter = false) => {
      if (loading) return;
      setLoading(true);
      try {
        const pageToFetch = isNewFilter ? 1 : page;
        const response = await axiosInstance.get('/order/seller-orders', {
          params: {
            page: pageToFetch,
            limit: 10,
            status: filter === 'ALL' ? undefined : filter,
            dateFilter,
            shipmentMethod: filterShipping?'flykup_logistics':'self_shipment',
            search: searchTerm || undefined,
          },
        });
        const {
          orders: newOrders,
          hasNextPage,
          orderCounts: counts,
        } = response.data;
        // console.log(response.data)

        setOrders(prev => (isNewFilter ? newOrders : [...prev, ...newOrders]));
        setPage(pageToFetch + 1);
        setHasMore(hasNextPage);
        if (isNewFilter) {
          setOrderCounts(counts);
        }
      } catch (error) {
        console.log('Error fetching orders:', error.response.data);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [page, filter, dateFilter, searchTerm, filterShipping, loading],
  );

  useEffect(() => {
    setOrders([]);
    setPage(1);
    setHasMore(true);
    fetchOrders(true);
  }, [filter, dateFilter, searchTerm,filterShipping]);

  const handleStatusUpdate = async (orderId, status, data = null) => {
    setStatusUpdatingOrderId(orderId);
    try {
      const payload = {status};
      if (status === 'SHIPPED' && data) {
        payload.courierDetails = data;
      } else if (status === 'CANCELLED' && typeof data === 'string') {
        payload.cancelReason = data;
      }

      const response = await axiosInstance.put(
        `/order/seller/${orderId}/status`,
        payload,
      );
      setOrders(prev =>
        prev.map(o => (o._id === orderId ? {...o, ...response.data} : o)),
      );
      if(status=="CANCELLED")
      {
        setIsCancelModalOpen(false)
      }
      Toast(response.data.message)
      
    fetchOrders(true);
    } catch (error) {
      console.error('Error updating order status:', error);
      Toast(
        `Failed to update status: ${
          error.response?.data?.error || 'Server error'
        }`,
      );
    } finally {
      setStatusUpdatingOrderId(null);
    }
  };

  const openShippingModal = order => {
    // console.log("triying")
    setCurrentOrder(order);
    setIsModalOpen(true);
  };

  const handleShippingSubmit = async courierData => {
    if (currentOrder) {
      setIsShippingSubmitting(true);
      try {
        await handleStatusUpdate(currentOrder._id, 'SHIPPED', courierData);
      } finally {
        setIsShippingSubmitting(false);
        setIsModalOpen(false);
        setCurrentOrder(null);
      }
    } else {
      setIsModalOpen(false);
      setCurrentOrder(null);
    }
  };

  const openDetailsModal = order => {
    // console.log("trying too openm")
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleMarkReceived = useCallback(
    async (orderId, requestId) => {
      try {
        await axiosInstance.put(
          `/order/seller/orders/${orderId}/return/${requestId}/receive`,
        );
        setOrders([]);
        setPage(1);
        fetchOrders(true);
      } catch (error) {
        console.error('Failed to mark return as received:', error);
        Toast(
          `Failed to mark received: ${
            error.response?.data?.error || 'Server error'
          }`,
        );
      }
    },
    [fetchOrders],
  );

  const handleProcessRefund = useCallback(
    async (orderId, requestId) => {
      try {
        await axiosInstance.put(
          `/order/seller/orders/${orderId}/return/${requestId}/refund`,
        );
        setOrders([]);
        setPage(1);
        fetchOrders(true);
      } catch (error) {
        console.error('Failed to process refund:', error);
        Toast(
          `Failed to process refund: ${
            error.response?.data?.error || 'Server error'
          }`,
        );
      }
    },
    [fetchOrders],
  );

  const StatusDisplay = ({status}) => {
    const statusColors = {
      ORDERED: 'orange',
      PACKED: 'blue',
      SHIPPED: 'purple',
      DELIVERED: 'green',
      CANCELLED: 'red',
    };

    return (
      <View
        style={[
          styles.statusBadge,
          {backgroundColor: statusColors[status] || 'gray'},
        ]}>
        <Text style={styles.statusText}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </Text>
      </View>
    );
  };

  const renderOrderItem = ({item: order}) => {
    const activeReturnRequest = order?.returnRequests?.find(req =>
      ['PENDING', 'RETURN_SHIPPED', 'RETURN_RECEIVED'].includes(req.status),
    );
    
    // Determine if status changes are allowed based on the selected tab
    const allowStatusChange = !filterShipping;
    
    // Skip rendering orders that don't match the current filter
    // When filterShipping is true (Flykup Logistics tab), show only flykup_logistics orders
    // When filterShipping is false (Self Shipment tab), show only self_shipment orders
    const orderShipmentMethod = order?.logisticsDetails?.shipmentMethod;
    const expectedMethod = filterShipping ? 'flykup_logistics' : 'self_shipment';
    
    if (orderShipmentMethod !== expectedMethod) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.orderItem}
        onPress={() => openDetailsModal(order)}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>#{order.orderId}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.customerRow}>
          <TouchableOpacity
            style={styles.customerInfo}
            onPress={() =>
              navigation.navigate('ViewSellerProdile', {id: order.userId?.userName})
            }>
            {order.userId?.profileURL?.key ? (
              <Image
                source={{uri: `${AWS_CDN_URL}${order?.userId?.profileURL?.key}`}}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {order?.userId?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.customerName}>
                {order.userId?.name || 'User Not Found'}
              </Text>
              <Text style={styles.customerUsername}>
                @{order.userId?.userName || '-'}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.orderTotal}>
            ₹{order?.totalAmount?.toFixed(2)}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <StatusDisplay status={order.orderStatus} />

          <View style={styles.actionsContainer}>
            {order.orderStatus === 'ORDERED'&& allowStatusChange && (
              <TouchableOpacity
                style={[styles.actionButton, {backgroundColor: 'blue'}, statusUpdatingOrderId === order._id && styles.disabledButton]}
                onPress={() => handleStatusUpdate(order._id, 'PACKED')}
                disabled={statusUpdatingOrderId === order._id}>
                {statusUpdatingOrderId === order._id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <FiPackage size={14} color="white" />
                    <Text style={styles.actionText}>Mark as Packed</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {order.orderStatus === 'PACKED'&& allowStatusChange && (
              <TouchableOpacity
                style={[styles.actionButton, {backgroundColor: 'orange'}, statusUpdatingOrderId === order._id && styles.disabledButton]}
                onPress={() => openShippingModal(order)}
                disabled={statusUpdatingOrderId === order._id}>
                {statusUpdatingOrderId === order._id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <FiTruck size={14} color="white" />
                    <Text style={styles.actionText}>Mark as Shipped</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {order.orderStatus === 'SHIPPED' && allowStatusChange&& (
              <TouchableOpacity
                style={[styles.actionButton, {backgroundColor: 'green'}, statusUpdatingOrderId === order._id && styles.disabledButton]}
                onPress={() => handleStatusUpdate(order._id, 'DELIVERED')}
                disabled={statusUpdatingOrderId === order._id}>
                {statusUpdatingOrderId === order._id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <FiCheckCircle size={14} color="white" />
                    <Text style={styles.actionText}>Mark as Delivered</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {activeReturnRequest?.status === 'PENDING' && allowStatusChange&& (
              <TouchableOpacity
                style={[styles.actionButton, {backgroundColor: 'purple'}, statusUpdatingOrderId === order._id && styles.disabledButton]}
                onPress={() => {
                  setCurrentReturnOrder(order);
                  setCurrentReturnRequest(activeReturnRequest);
                  setIsReturnModalOpen(true);
                }}
                disabled={statusUpdatingOrderId === order._id}>
                {statusUpdatingOrderId === order._id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <FiRefreshCw size={14} color="white" />
                    <Text style={styles.actionText}>Handle Return</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {activeReturnRequest?.status === 'RETURN_SHIPPED' && (
              <View style={styles.returnShippedContainer}>
                <View style={styles.returnInfoBox}>
                  <Text style={styles.returnStatusText}>Return In Transit</Text>
                  <Text style={styles.returnCarrierText}>
                    {activeReturnRequest.shipmentDetails?.carrier}
                  </Text>
                </View>

                <View style={styles.returnActions}>
                  <TouchableOpacity
                    style={[
                      styles.smallActionButton,
                      {backgroundColor: 'blue'},
                    ]}
                    onPress={() => {
                      const carrier =
                        activeReturnRequest.shipmentDetails?.carrier || '';
                      const trackingNumber =
                        activeReturnRequest.shipmentDetails?.trackingNumber ||
                        '';
                      const trackingUrl = `https://www.google.com/search?q=${encodeURIComponent(
                        carrier + ' ' + trackingNumber,
                      )}`;
                      Linking.openURL(trackingUrl);
                    }}>
                    <FiTruck size={14} color="white" />
                    <Text style={styles.smallActionText}>Track</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.smallActionButton,
                      {backgroundColor: 'green'},
                    ]}
                    onPress={() =>
                      handleMarkReceived(order._id, activeReturnRequest._id)
                    }>
                    <FiCheckCircle size={14} color="white" />
                    <Text style={styles.smallActionText}>Received</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeReturnRequest?.status === 'RETURN_RECEIVED' && allowStatusChange&& (
              <TouchableOpacity
                style={[styles.actionButton, {backgroundColor: 'purple'}, statusUpdatingOrderId === order._id && styles.disabledButton]}
                onPress={() =>
                  handleProcessRefund(order._id, activeReturnRequest._id)
                }
                disabled={statusUpdatingOrderId === order._id}>
                {statusUpdatingOrderId === order._id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.actionText}>Process Refund</Text>
                )}
              </TouchableOpacity>
            )}

            {order.orderStatus !== 'DELIVERED' &&
              order.orderStatus !== 'CANCELLED' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setCancelOrderId(order._id);
                    setIsCancelModalOpen(true);
                  }}>
                  <FiXCircle size={14} color="red" />
                  <Text style={styles.cancelText}>Cancel Order</Text>
                </TouchableOpacity>
              )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
       <SellerHeader navigation={navigation} message={'Your Orders'}/>
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        ListHeaderComponent={
          <>
            {/* Access Mode Indicator */}
            {isAccessMode && sellerInfo && (
              <View style={styles.accessModeIndicator}>
                <View style={styles.accessModeHeader}>
                  <View style={styles.accessModeIconContainer}>
                    <FiShield color="#60A5FA" size={24} />
                  </View>
                  <View style={styles.accessModeContent}>
                    <Text style={styles.accessModeTitle}>Access Mode Active</Text>
                    <Text style={styles.accessModeSubtitle}>
                      Managing orders for{' '}
                      <Text style={styles.accessModeSellerName}>
                        {sellerInfo.businessName || sellerInfo.userName}
                      </Text>
                    </Text>
                  </View>
                </View>
                <View style={styles.accessModeBadges}>
                  {permissions.canView && (
                    <View style={styles.permissionBadge}>
                      <Text style={styles.permissionBadgeText}>View</Text>
                    </View>
                  )}

                  {permissions.canEdit && (
                    <View style={styles.permissionBadge}>
                      <Text style={styles.permissionBadgeText}>Edit</Text>
                    </View>
                  )}

                  {permissions.canDelete && (
                    <View style={styles.permissionBadge}>
                      <Text style={styles.permissionBadgeText}>Delete</Text>
                    </View>
                  )}

                  {permissions.canCreate && (
                    <View style={styles.permissionBadge}>
                      <Text style={styles.permissionBadgeText}>Create</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
         
            {/* <Text style={styles.title}>Your Orders</Text> */}

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Orders</Text>
                <Text style={styles.statValue}>{orderCounts.total}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Today Orders</Text>
                <Text style={styles.statValue}>{orderCounts.today}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>This Month</Text>
                <Text style={styles.statValue}>{orderCounts.thisMonth}</Text>
              </View>
            </View>
           <View className='flex-row gap-2 mb-4'>
  <TouchableOpacity 
    onPress={() => setFilterShipping(true)}
    className={`flex-1 py-3 rounded-xl border-2 ${
      filterShipping 
        ? 'bg-brand-yellow border-brand-yellow' 
        : 'bg-transparent border-gray-700'
    }`}
  >
    <Text className={`text-center font-semibold ${
      filterShipping ? 'text-black' : 'text-gray-400'
    }`}>
      Flykup Logistics
    </Text>
  </TouchableOpacity>
  
  <TouchableOpacity 
    onPress={() => setFilterShipping(false)}
    className={`flex-1 py-3 rounded-xl border-2 ${
      !filterShipping 
        ? 'bg-brand-yellow border-brand-yellow' 
        : 'bg-transparent border-gray-700'
    }`}
  >
    <Text className={`text-center font-semibold ${
      !filterShipping ? 'text-black' : 'text-gray-400'
    }`}>
      Self Shipment
    </Text>
  </TouchableOpacity>
</View>

            <View style={styles.filterContainer}>
              <View style={styles.searchContainer}>
                <FiSearch size={15} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by order ID or customer name..."
                  placeholderTextColor="#999"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </View>

              <View style={styles.filterRow}>
                <View style={styles.selectContainer}>
                  <Text style={styles.selectLabel}>Date Filter:</Text>
                  <View style={styles.selectWrapper}>
                    <Dropdown
                      data={DATE_FILTERS}
                      labelField={'label'}
                      valueField={'value'}
                      value={dateFilter}
                      //   defaultValue={dateFilter}
                      placeholder="Select a date filter"
                      onChange={item => setDateFilter(item.value)}
                      activeColor="transparent"
                      selectedTextStyle={{color: '#fff'}}
                      itemTextStyle={{color: '#fff'}}
                      containerStyle={{
                        marginBottom: 10,
                        backgroundColor: '#212121',
                        borderColor: '#FFD700',
                        borderWidth: 1,
                        borderRadius: 10,
                      }}
                      // placeholder="Select Business Type"
                      placeholderStyle={{color: '#777'}}
                      style={styles.selectInput} // You can keep your custom styles here
                    />
                  </View>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.statusFilterContainer}>
                {STATUS_FILTERS.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.statusFilterButton,
                      filter === f && styles.statusFilterButtonActive,
                    ]}
                    onPress={() => setFilter(f)}>
                    <Text
                      style={[
                        styles.statusFilterText,
                        filter === f && styles.statusFilterTextActive,
                      ]}>
                      {f.charAt(0) + f.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        }
        refreshing={isRefreshing}
        onRefresh={()=>{
          setRefreshing(true)
          fetchOrders(true)
          setRefreshing(false)}
        }
        keyExtractor={item => item._id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm
                ? 'No orders match your search.'
                : 'No orders found for this filter.'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator size="large" color="#FFD700" />
          ) : !hasMore && orders.length > 0 ? (
            <Text style={styles.endText}>
              You've reached the end of the list.
            </Text>
          ) : null
        }
        onEndReached={() => {
          if (!loading && hasMore) {
            fetchOrders();
          }
        }}
        onEndReachedThreshold={0.5}
      />
      {/* </ScrollView> */}

 <OrderDetailsBottomSheet 
        onOpen={isDetailsModalOpen} 
        setIsOpen={setIsDetailsModalOpen} 
        order={selectedOrder} 
      />
       <CancelOrder
        isOPen={isCancelModalOpen}
        setIsOpen={setIsCancelModalOpen}
        onSubmit={(reason) => handleStatusUpdate(cancelOrderId, 'CANCELLED', reason)}
      />
       <ShippinSheet
        isOPen={isModalOpen} 
        setIsOpen={() => {
          if (!isShippingSubmitting) {
            setIsModalOpen(false);
          }
        }} 
        onSubmit={handleShippingSubmit}
        isSubmitting={isShippingSubmitting}
      />
      <ReturnSheet
        isOPen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setCurrentReturnOrder(null);
          setCurrentReturnRequest(null);
        }}
        request={currentReturnRequest}
        order={currentReturnOrder}
        setOrders={setOrders}
        setPage={setPage}
        fetchOrders={fetchOrders}
      />
      {/* Modals */}
      {/*
      
     
      
     
      
       */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    
  },
  scrollContainer: {
    padding: 16,
    // flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    alignItems:'center',
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
  },
  statValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  filterContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 16,
    alignItems:'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    height: 40,
    minWidth: 0,
 alignItems:'center',
 justifyContent:'center',   
      // backgroundColor: 'red',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  selectContainer: {
    flex: 1,
  },
  selectLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  selectWrapper: {
    backgroundColor: '#121212',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectInput: {
    color: 'white',
    height: 40,
    paddingLeft:10,paddingRight:10
  },
  statusFilterContainer: {
    marginBottom: 8,
  },
  statusFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#121212',
    marginRight: 8,
  },
  statusFilterButtonActive: {
    backgroundColor: '#FFD700',
  },
  statusFilterText: {
    color: 'white',
    fontWeight: '600',
  },
  statusFilterTextActive: {
    color: 'black',
  },
  orderItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderId: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  orderDate: {
    color: '#999',
    fontSize: 12,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 18,
  },
  customerName: {
    color: 'white',
    fontWeight: 'bold',
  },
  customerUsername: {
    color: '#999',
    fontSize: 12,
  },
  orderTotal: {
    color: 'white',
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsContainer: {
    alignItems: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  smallActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  smallActionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    padding:4
  },
  cancelText: {
    color: 'red',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  returnShippedContainer: {
    marginTop: 8,
  },
  returnInfoBox: {
    backgroundColor: '#121212',
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  returnStatusText: {
    color: '#4FC3F7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  returnCarrierText: {
    color: '#999',
    fontSize: 10,
  },
  returnActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
  },
  endText: {
    color: '#999',
    textAlign: 'center',
    padding: 16,
  },
  // Access Mode Indicator Styles
  accessModeIndicator: {
    marginTop: -10,
    marginHorizontal: 0,
    marginBottom: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.5)',
  },
  accessModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  accessModeIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accessModeContent: {
    flex: 1,
  },
  accessModeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60A5FA',
    marginBottom: 4,
  },
  accessModeSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  accessModeSellerName: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accessModeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  permissionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#60A5FA',
  },
});

export default SellerOrders;
