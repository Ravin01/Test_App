import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {
  Clock,
  Calendar,
  TrendingUp,
  Archive,
  Plus,
  Edit,
  Pause,
  Lock,
  AlertCircle,
} from 'lucide-react-native';
import axiosInstance from '../../../Utils/Api';
import { colors } from '../../../Utils/Colors';
import { AWS_CDN_URL } from '../../../Utils/aws';
import SellerHeader from '../SellerForm/Header';
import { Toast } from '../../../Utils/dateUtils';
import FlashSaleModal from './AletFlashSale';

import { useCanView, useCanCreate } from '../../../Context/AccessContext';
const FlashSaleManagement = ({ navigation }) => {
  // Access control hooks
  const canView = useCanView('FLASHSALE');
  const canCreate = useCanCreate('FLASHSALE');

  const [flashSales, setFlashSales] = useState([]);
  const [activeFilter, setActiveFilter] = useState('upcoming');
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  const filteredSales = useMemo(() => {
    return flashSales.filter(sale => {
      // Use the status field from the sale object
      const saleStatus = sale.status?.toLowerCase();

      switch (activeFilter) {
        case 'upcoming':
          return saleStatus === 'upcoming';
        case 'active':
          return saleStatus === 'active';
        case 'history':
          // History includes both expired and stopped sales
          return saleStatus === 'expired' || saleStatus === 'stopped';
        default:
          return true;
      }
    });
  }, [activeFilter, flashSales]);
  const [isLoading, setIsLoading] = useState({
    loading: false,
    delete: false,
    stop: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const buttonRef = useRef(null);
  const [modalState, setModalState] = useState({
    visible: false,
    type: null,
    title: '',
    message: '',
    sale: null,
    onConfirm: null,
  });
  const closeModal = () => {
    setModalState({
      visible: false,
      type: null,
      title: '',
      message: '',
      sale: null,
      onConfirm: null,
    });
  };
  useEffect(() => {
    // Animate the button when component mounts
    if (buttonRef.current) {
      buttonRef.current.bounceIn(800);
    }
  }, []);
  const filterOptions = [
    {
      key: 'upcoming',
      label: 'Upcoming',
      icon: Clock,
      color: '#60A5FA',
      bgColor: '#1E40AF20',
    },
    {
      key: 'active',
      label: 'Active',
      icon: TrendingUp,
      color: '#34D399',
      bgColor: '#059F2120',
    },
    {
      key: 'history',
      label: 'History',
      icon: Archive,
      color: '#9CA3AF',
      bgColor: '#6B728020',
    },
  ];

  //   useEffect(() => {
  //   // Only fetch if user has view permission
  //   if (canView) {
  //   fetchFlashSales(1);
  //   } else {
  //     setIsLoading(prev => ({...prev, loading: false}));
  //     setFlashSales([]);
  //   }
  // }, [canView]);

  // Use useFocusEffect to fetch data on every screen focus (like initial mount)
  useFocusEffect(
    useCallback(() => {
      // Only fetch if user has view permission
      if (canView) {
        fetchFlashSales(1);
      } else {
        setIsLoading(prev => ({ ...prev, loading: false }));
        setFlashSales([]);
      }
    }, [canView])
  );



  const fetchFlashSales = async (pageNumber = 1) => {
    const isInitialLoad = pageNumber === 1;
    if (isInitialLoad) {
      setIsLoading(prev => ({ ...prev, loading: true }));
    } else {
      setIsFetchingMore(true);
    }

    try {
      const response = await axiosInstance.get('/flash-sale', {
        params: {
          page: pageNumber,
          limit: 20,
        },
      });
      //   console.log(response.data)

      const data = response.data?.data;
      const newSales = Array.isArray(data) ? data : data?.flashSales || [];
      // console.log(newSales,"new dakse")
      if (isInitialLoad) {
        setFlashSales(newSales);
      } else {
        setFlashSales(prev => [...prev, ...newSales]);
      }

      setHasNextPage(data?.hasNextPage ?? false);
      setPage(data?.currentPage ?? pageNumber);
    } catch (error) {
      console.error('Fetch Flash Sales Error:', error);
      Toast('Failed to load flash sales');
      if (isInitialLoad) setFlashSales([]);
    } finally {
      if (isInitialLoad) {
        setIsLoading(prev => ({ ...prev, loading: false }));
      } else {
        setIsFetchingMore(false);
      }
    }
  };



  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchFlashSales(1);
    setRefreshing(false);
  }, []);

  const loadMore = () => {
    if (hasNextPage && !isFetchingMore && !isLoading.loading) {
      fetchFlashSales(page + 1);
    }
  };

  const getStatusInfo = sale => {
    const now = new Date();
    const startTime = new Date(sale.startTime);
    const endTime = new Date(sale.endTime);
    // console.log(sale.status)
    if (sale.status == 'upcoming') {
      const timeUntilStart = Math.ceil((startTime - now) / (1000 * 60 * 60));
      return {
        status: 'upcoming',
        label: 'Upcoming',
        color: '#60A5FA',
        bgColor: '#1E40AF20',
        timeInfo: `Starts in ${timeUntilStart}h`,
      };
    } else if (sale.status == 'active') {
      const timeUntilEnd = Math.ceil((endTime - now) / (1000 * 60 * 60));
      return {
        status: 'active',
        label: 'Live',
        color: '#34D399',
        bgColor: '#059F2120',
        timeInfo: `Ends in ${timeUntilEnd}h`,
      };
    } else if (sale.status == 'expired') {
      return {
        status: 'history',
        label: 'Stopped',
        color: '#FF453A',
        bgColor: '#FF453A20',
        timeInfo: 'Stopped',
      };
    } else {
      return {
        status: 'history',
        label: 'Ended',
        color: '#9CA3AF',
        bgColor: '#6B728020',
        timeInfo: 'Completed',
      };
    }
  };

  const handleEditSale = sale => {
    const statusInfo = getStatusInfo(sale);

    if (statusInfo.status === 'active') {
      setModalState({
        visible: true,
        type: 'edit_active',
        title: 'Cannot Edit Active Sale',
        message: 'Active flash sales cannot be edited. You can only view details or stop the sale.',
        sale: sale,
        onConfirm: null,
      });
      return;
    }

    if (statusInfo.status === 'history') {
      setModalState({
        visible: true,
        type: 'edit_completed',
        title: 'Cannot Edit Completed Sale',
        message: 'Completed flash sales cannot be edited. You can only view details.',
        sale: sale,
        onConfirm: null,
      });
      return;
    }

    // Navigate to edit screen for upcoming sales
    navigation.navigate('Flashsaleedit', {
      saleData: sale,
    });
  };

  const handleViewDetails = sale => {
    navigation.navigate('Flashsaledetails', { flashSale: sale });
  };
  const handleStopSale = sale => {
    setModalState({
      visible: true,
      type: 'stop',
      title: 'Stop Flash Sale',
      message: 'Are you sure you want to stop this flash sale? This action cannot be undone and the sale will end immediately.',
      sale: sale,
      onConfirm: () => confimStopSale(sale),
    });
  };


  const confimStopSale = async sale => {
    try {
      setIsLoading(prev => ({ ...prev, stop: sale._id }));

      await axiosInstance.patch(`/flash-sale/${sale._id}/stop`);
      Toast('Flash sale stopped');
      onRefresh();
    } catch (error) {
      console.error('Stop Error:', error);
      Toast('Failed to stop flash sale');
    } finally {
      setIsLoading(prev => ({ ...prev, stop: null }));
    }
  };
  const handleDeleteSale = async sale => {
    const statusInfo = getStatusInfo(sale);

    if (statusInfo.status === 'active') {
      return;
    }

    setModalState({
      visible: true,
      type: 'delete',
      title: 'Delete Flash Sale',
      message: 'Are you sure you want to delete this flash sale? This action cannot be undone and all data will be permanently removed.',
      sale: sale,
      onConfirm: () => confirmDelete(sale),
    });
  };



  const confirmDelete = async sale => {
    try {
      setIsLoading(prev => ({ ...prev, delete: sale._id }));

      await axiosInstance.delete(`/flash-sale/${sale._id}`);
      Toast('Flash sale deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Delete Error:', error);
      Toast('Failed to delete flash sale');
    } finally {
      setIsLoading(prev => ({ ...prev, delete: null }));
    }
  };

  const formatDateTime = dateString => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFilterCounts = () => {
    const counts = {
      upcoming: 0,
      active: 0,
      history: 0,
    };

    flashSales.forEach(sale => {
      const saleStatus = sale.status?.toLowerCase();

      switch (saleStatus) {
        case 'upcoming':
          counts.upcoming++;
          break;
        case 'active':
          counts.active++;
          break;
        case 'expired':
        case 'stopped':
          counts.history++;
          break;
        default:
          // Handle any other status by checking dates as fallback
          const now = new Date();
          const startTime = new Date(sale.startTime);
          const endTime = new Date(sale.endTime);

          if (startTime > now) {
            counts.upcoming++;
          } else if (startTime <= now && endTime >= now) {
            counts.active++;
          } else {
            counts.history++;
          }
          break;
      }
    });

    return counts;
  }
  const renderFilterTab = ({ item }) => {
    const counts = getFilterCounts();
    const count = counts[item.key];
    const isActive = activeFilter === item.key;
    const IconComponent = item.icon;

    return (
      <TouchableOpacity
        style={[
          styles.filterTab,
          isActive && { backgroundColor: item.bgColor, borderColor: item.color },
        ]}
        onPress={() => {
          if (activeFilter === item.key) return;
          setIsFilterLoading(true);
          // Yield to UI thread to allow loader to render before heavy filtering/rendering
          setTimeout(() => {
            setActiveFilter(item.key);
            setIsFilterLoading(false);
          }, 100);
        }}>
        <View style={styles.filterTabContent}>
          <IconComponent size={18} color={isActive ? item.color : '#666'} />
          <Text style={[styles.filterTabText, isActive && { color: item.color }]}>
            {item.label}
          </Text>
          <View
            style={[
              styles.filterBadge,
              isActive && { backgroundColor: item.color },
            ]}>
            <Text style={[styles.filterBadgeText, isActive && { color: '#000' }]}>
              {count}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFlashSaleItem = ({ item }) => {
    const product = item?.products?.[0]?.productId;
    const productDetails = item?.products?.[0];
    const statusInfo = getStatusInfo(item);
    const imageUrl = product?.images?.[0]
      ? `${AWS_CDN_URL}${product.images[0].key}`
      : 'https://via.placeholder.com/60';
    if (!product?.title)
      return;
    // console.log(item)
    return (
      <TouchableOpacity
        style={styles.saleCard}
        onPress={() => handleViewDetails(item)}>
        <View style={styles.saleHeader}>
          <View style={styles.saleTitle}>
            <Text style={styles.saleTitleText} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusInfo.bgColor },
              ]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
          {/* {!(item.status == 'stopped' || item.status == 'expired'  ||item.status == 'active') && (
            <TouchableOpacity
              onPress={() => handleEditSale(item)}
              style={styles.editButton}>
              <Edit size={18} color="#666" />
            </TouchableOpacity>
          )} */}
          {/* <Icon name="more-vertical"  /> */}
        </View>

        <View style={styles.saleContent}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} />
          <View style={styles.saleDetails}>
            <Text style={styles.productName} numberOfLines={1}>
              {product?.title || 'Product Name'}
            </Text>
            <View style={styles.priceContainer}>
              <Text style={styles.salePrice}>
                ₹{productDetails?.flashPrice?.toLocaleString()}
              </Text>
              <Text style={styles.originalPrice}>
                ₹{productDetails?.originalPrice?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.saleInfo}>
              <Text style={styles.stockInfo}>
                Stock: {productDetails?.currentFlashStock}
              </Text>
              {/* <Text style={styles.stockInfo}>Sold: {productDetails?.totalSold||productDetails?.sold||0}</Text> */}
              {!(item.status == 'stopped' || item.status == 'expired' || item.status == 'active') && <Text style={styles.timeInfo}>{statusInfo.timeInfo}</Text>}
            </View>

            {/* Revenue Details and Progress for Active/Completed Sales */}
            {(item.status === 'active' || item.status === 'expired' || item.status === 'stopped') && (
              <View style={styles.revenueContainer}>
                <View style={styles.revenueRow}>
                  <View style={styles.revenueItem}>
                    <Text style={styles.revenueLabel}>Total Sold</Text>
                    <Text style={styles.revenueValue}>{item.totalSold || 0} units</Text>
                  </View>
                  <View style={styles.revenueItem}>
                    <Text style={styles.revenueLabel}>Revenue</Text>
                    <Text style={styles.revenueValue}>₹{(item.revenue || 0).toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {/* Flash Stock Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Flash Stock Progress</Text>
                    <Text style={styles.progressText}>
                      {item.totalSold || 0}/{productDetails?.initialFlashStock || 0}
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(
                            ((item.totalSold || 0) / (productDetails?.initialFlashStock || 1)) * 100,
                            100
                          )}%`
                        }
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Completion Reason for Ended Sales */}
            {(item.status === 'expired' || item.status === 'stopped') && (
              <View style={styles.completionReasonContainer}>
                <View style={styles.completionReasonContent}>
                  {item.status === 'expired' ? (
                    <Archive size={16} color="#9CA3AF" />
                  ) : (
                    <AlertCircle size={16} color="#EF4444" />
                  )}
                  <View style={styles.completionReasonTextContainer}>
                    <Text style={styles.completionReasonTitle}>Completion Reason</Text>
                    <Text style={styles.completionReasonText}>
                      {item.status === 'expired' ? 'Reached end time' : 'Manually stopped by admin'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.saleFooter}>
          <Text style={styles.dateText}>
            {formatDateTime(item.startTime)} - {formatDateTime(item.endTime)}
          </Text>
          <View style={styles.actionButtons}>
            {/* {statusInfo.status === 'upcoming' && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteSale(item)}>
                {isLoading.delete==item?._id ? (
                  <ActivityIndicator size={'small'} color={'#FF453A'} />
                ) : (
                  <>
                    <Icon name="trash-2" size={14} color="#FF453A" />
                    <Text style={{color: '#FF453A'}}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            )} */}
            {statusInfo.status === 'active' && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleStopSale(item)}>
                {/* <Icon name="trash-2" size={14} color="#FF453A" /> */}
                {isLoading.stop == item?._id ? (
                  <ActivityIndicator size={'small'} color={'#FF453A'} />
                ) : (
                  <>
                    {/* <Pause color={'#FF453A'} size={14} /> */}
                    <Text style={{ color: '#FF453A', fontSize: 14 }}>
                      Stop Sale
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const currentFilter = filterOptions.find(f => f.key === activeFilter);
    const IconComponent = currentFilter?.icon || Clock;

    return (
      <View style={styles.emptyState}>
        <IconComponent size={48} color="#666" />
        <Text style={styles.emptyTitle}>
          No {currentFilter?.label.toLowerCase()} flash sales
        </Text>
        <Text style={styles.emptySubtitle}>
          {activeFilter === 'upcoming' && canCreate &&
            'Create your first flash sale to get started'}
          {activeFilter === 'upcoming' && !canCreate &&
            'No upcoming flash sales available'}
          {activeFilter === 'active' && 'No flash sales are currently running'}
          {activeFilter === 'history' && 'No completed flash sales yet'}
        </Text>
        {/* {activeFilter === 'upcoming' && canCreate && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() =>
              navigation.navigate('Flashsalesetup')
            }>
            <Plus size={16} color="#000" />
            <Text style={styles.createButtonText}>Create Flash Sale</Text>
          </TouchableOpacity>
        )} */}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader navigation={navigation} message="FlashSale" />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filterOptions}
          renderItem={renderFilterTab}
          keyExtractor={item => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Create Button */}
      {canCreate ? (
        <View style={styles.createButtonContainer}>
          <TouchableOpacity
            style={styles.floatingCreateButton}
            onPress={() => navigation.navigate('Flashsalesetup')}>
            <Plus size={20} color="#000" />
            <Text style={styles.floatingCreateButtonText}>Create New</Text>
          </TouchableOpacity>
        </View>
      ) : canView && (
        <View style={styles.createButtonContainer}>
          <View style={styles.floatingCreateButtonDisabled}>
            <Lock size={20} color="#666" />
            <Text style={styles.floatingCreateButtonDisabledText}>Create New</Text>
          </View>
        </View>
      )}

      {/* Flash Sales List */}
      {!canView ? (
        <View style={styles.restrictedAccessContainer}>
          <Lock size={48} color="#EF4444" />
          <Text style={styles.restrictedAccessTitle}>Access Restricted</Text>
          <Text style={styles.restrictedAccessText}>
            You don't have permission to view flash sales. Please contact the administrator for access.
          </Text>
          {canCreate && (
            <Text style={styles.restrictedAccessNote}>
              You only have permission to create flash sales.
            </Text>
          )}
        </View>
      ) : (isLoading.loading || isFilterLoading) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryButtonColor} />
          <Text style={styles.loadingText}>Loading flash sales...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSales}
          renderItem={renderFlashSaleItem}
          keyExtractor={(item) => item._id || item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primaryButtonColor}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={1.5}
          ListFooterComponent={() =>
            isFetchingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator
                  size="small"
                  color={colors.primaryButtonColor}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
        />
      )}
      <FlashSaleModal
        visible={modalState.visible}
        onClose={closeModal}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onViewDetails={() => handleViewDetails(modalState.sale)}
        confirmText={
          modalState.type === 'delete' ? 'Delete' :
            modalState.type === 'stop' ? 'Stop Sale' : 'Confirm'
        }
        isLoading={
          modalState.type === 'delete'
            ? isLoading.delete === modalState.sale?._id
            : modalState.type === 'stop'
              ? isLoading.stop === modalState.sale?._id
              : false
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  filterContainer: {
    // marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  filterList: {
    paddingHorizontal: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#404040',
    backgroundColor: '#1E1E1E',
  },
  filterTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTabText: {
    color: '#666',
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 8,
  },
  filterBadge: {
    backgroundColor: '#404040',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  createButtonContainer: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    zIndex: 1000,
  },
  floatingCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDD122',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  floatingCreateButtonText: {
    color: '#000',
    fontWeight: '600',
    marginLeft: 6,
  },
  floatingCreateButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#404040',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    opacity: 0.6,
  },
  floatingCreateButtonDisabledText: {
    color: '#666',
    fontWeight: '600',
    marginLeft: 6,
  },
  restrictedAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  restrictedAccessTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  restrictedAccessText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  restrictedAccessNote: {
    color: '#FFC107',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.whiteColor,
    marginTop: 10,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  saleCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  saleTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleTitleText: {
    color: '#fff',
    fontSize: 16,
    textTransform: 'capitalize',
    fontWeight: 'bold',
    marginRight: 12,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    padding: 4,
  },
  saleContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  saleDetails: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  salePrice: {
    color: '#34D399',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  originalPrice: {
    color: '#888',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  saleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockInfo: {
    color: '#888',
    fontSize: 12,
  },
  timeInfo: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '500',
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  dateText: {
    color: '#888',
    fontSize: 12,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  deleteButton: {
    padding: 8,
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#FF453A20',
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDD122',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#000',
    fontWeight: '600',
    marginLeft: 6,
  },
  revenueContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  revenueItem: {
    flex: 1,
  },
  revenueLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 2,
  },
  revenueValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    color: '#888',
    fontSize: 11,
  },
  progressText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#404040',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FDD122',
    borderRadius: 3,
  },
  completionReasonContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  completionReasonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#404040',
  },
  completionReasonTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  completionReasonTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  completionReasonText: {
    color: '#888',
    fontSize: 11,
  },
});

export default FlashSaleManagement;
