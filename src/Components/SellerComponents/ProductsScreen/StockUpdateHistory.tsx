/* eslint-disable react-native/no-inline-styles */
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import SellerHeader from '../SellerForm/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
import StockService from '../../../Services/stockService';

const StockUpdateHistoryScreen = ({ navigation, route }) => {
  const { history: initialHistory = [], product = {}, } = route.params || {};
  const stockId = product._id;
  // console.log("stocid",stockId)
  // Pagination state
  const [history, setHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  
  // Memoize flashSaleReservations to prevent dependencies from changing on every render
  const flashSaleReservations = useMemo(() => {
    return product?.flashSaleReservations || [];
  }, [product?.flashSaleReservations]);
  
  const [activeTab, setActiveTab] = useState(flashSaleReservations?.length > 0 ? 'flashSale' : 'stockUpdate');
  const [filterType, setFilterType] = useState('all'); // 'all', 'increase', 'decrease'

  // Fetch stock history with pagination
  const fetchStockHistory = useCallback(async (page = 1, append = false) => {
    // console.log("fetch stock history called")
    if (!stockId) return;
    
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await StockService.fetchStockHistory(stockId, page, 20);
      // console.log(response)
      const { data, pagination } = response;
    // console.log(data,pagination)
      if (data && Array.isArray(data.history)) {
        // Sort data to show today's history first
        const sortedData = [...data.history].sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          return dateB - dateA; // Most recent first
        });

        if (append) {
          setHistory(prev => [...prev, ...sortedData]);
        } else {
          setHistory(sortedData);
        }

        setCurrentPage(pagination?.currentPage || page);
        setTotalPages(pagination?.totalPages || 1);
        setHasMore(pagination?.hasNextPage || false);
      }
    } catch (error) {
      console.error('Error fetching stock history:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [stockId]);

  // Auto-load more data when reaching end of list
  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore && currentPage < totalPages) {
      fetchStockHistory(currentPage + 1, true);
    }
  }, [loadingMore, hasMore, currentPage, totalPages, fetchStockHistory]);

  // Fetch data on mount if stockId is provided
  useEffect(() => {
    if (stockId) {
      fetchStockHistory(1, false);
    }
  }, [stockId, initialHistory.length, fetchStockHistory]);

  // Calculate statistics for stock updates
  const stockStats = useMemo(() => {
    const totalChanges = history.length;
    const increments = history?.filter(h => h.newQuantity > h.previousQuantity).length;
    const decrements = history?.filter(h => h.newQuantity < h.previousQuantity).length;
    const totalAdded = history?.reduce((sum, h) => {
      if (h.newQuantity > h.previousQuantity) {
        return sum + (h.newQuantity - h.previousQuantity);
      }
      return sum;
    }, 0);
    const totalRemoved = history?.reduce((sum, h) => {
      if (h.newQuantity < h.previousQuantity) {
        return sum + (h.previousQuantity - h.newQuantity);
      }
      return sum;
    }, 0);

    return { totalChanges, increments, decrements, totalAdded, totalRemoved };
  }, [history]);

  // Calculate statistics for flash sale reservations
  const flashSaleStats = useMemo(() => {
    const totalReservations = flashSaleReservations?.length || 0;
    const reserved = flashSaleReservations?.filter(r => r.status === 'reserved').length || 0;
    const active = flashSaleReservations?.filter(r => r.status === 'active').length || 0;
    const released = flashSaleReservations?.filter(r => r.status === 'released').length || 0;
    const sold = flashSaleReservations?.filter(r => r.status === 'sold' || r.status === 'partially_sold').length || 0;
    const totalQuantity = flashSaleReservations?.reduce((sum, r) => sum + (r.quantity || 0), 0) || 0;

    return { totalReservations, reserved, active, released, sold, totalQuantity };
  }, [flashSaleReservations]);

  // Filter stock history based on filter type
  const filteredHistory = useMemo(() => {
    if (filterType === 'increase') {
      return history?.filter(h => h.newQuantity > h.previousQuantity);
    } else if (filterType === 'decrease') {
      return history?.filter(h => h.newQuantity < h.previousQuantity);
    }
    return history;
  }, [history, filterType]);

  // Format date and time
  const formatDateTime = dateString => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) {
      return { date: 'Today', time: timeStr };
    } else if (isYesterday) {
      return { date: 'Yesterday', time: timeStr };
    } else {
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
      return { date: dateStr, time: timeStr };
    }
  };

  // Get change indicator
  const getChangeInfo = item => {
    const change = item.newQuantity - item.previousQuantity;
    const isIncrease = change > 0;
    const icon = isIncrease ? 'arrow-up' : 'arrow-down';
    const color = isIncrease ? '#10B981' : '#EF4444';
    const bgColor = isIncrease ? '#064E3B' : '#7F1D1D';

    return { change: Math.abs(change), isIncrease, icon, color, bgColor };
  };

  // Get status badge config for flash sale
  const getStatusBadge = status => {
    const statusConfig = {
      reserved: { color: '#F59E0B', bg: '#78350F', label: 'Reserved' },
      active: { color: '#10B981', bg: '#064E3B', label: 'Active' },
      released: { color: '#3B82F6', bg: '#1E3A8A', label: 'Released' },
      sold: { color: '#8B5CF6', bg: '#4C1D95', label: 'Sold' },
      partially_sold: { color: '#6366F1', bg: '#312E81', label: 'Partially Sold' },
    };
    return statusConfig[status] || { color: '#64748B', bg: '#1E293B', label: status };
  };

  // Group history by date
  const groupedHistory = useMemo(() => {
    const groups = {};
    if (filteredHistory && Array.isArray(filteredHistory)) {
      filteredHistory.forEach(item => {
        const { date } = formatDateTime(item.updatedAt);
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(item);
      });
    }
    return groups;
  }, [filteredHistory]);

  // Group flash sale by date
  const groupedFlashSale = useMemo(() => {
    const groups = {};
    if (flashSaleReservations && Array.isArray(flashSaleReservations)) {
      flashSaleReservations.forEach(item => {
        const { date } = formatDateTime(item.reservedAt || item.createdAt);
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(item);
      });
    }
    return groups;
  }, [flashSaleReservations]);

  const renderStockStatsCard = () => (
    <View style={{ marginHorizontal: 16, marginBottom: 20, marginTop: 16 }}>
      <LinearGradient
        colors={['#121212', '#1B1B1B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16,borderWidth:1,borderColor:'#222', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}>
        <View style={{ padding: 20 }}>
          {/* Product Info */}
          <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#374151' }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Product</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#F9FAFB' }} numberOfLines={2}>
              {product.title || 'Stock History'}
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Total Changes</Text>
              <Text style={{ fontSize: 28, fontWeight: '700', color: '#F9FAFB' }}>
                {stockStats.totalChanges}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Net Change</Text>
              <Text style={{ fontSize: 28, fontWeight: '700', color: stockStats.totalAdded - stockStats.totalRemoved >= 0 ? '#10B981' : '#EF4444' }}>
                {stockStats.totalAdded - stockStats.totalRemoved >= 0 ? '+' : ''}{stockStats.totalAdded - stockStats.totalRemoved}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#374151' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Icon name="arrow-up" size={16} color="#10B981" />
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>Added</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#10B981' }}>
                +{stockStats.totalAdded}
              </Text>
              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {stockStats.increments} transactions
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Icon name="arrow-down" size={16} color="#EF4444" />
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>Removed</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#EF4444' }}>
                -{stockStats.totalRemoved}
              </Text>
              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {stockStats.decrements} transactions
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderFlashSaleStatsCard = () => (
    <View style={{ marginHorizontal: 16, marginBottom: 20, marginTop: 16 }}>
      <LinearGradient
       
        colors={['#121212', '#1B1B1B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}>
        <View style={{ padding: 20 }}>
          {/* Product Info */}
          <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#374151' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="flash" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Flash Sale Reservations</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#F9FAFB', marginTop: 4 }} numberOfLines={2}>
              {product.title || 'Product History'}
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Total Reservations</Text>
              <Text style={{ fontSize: 28, fontWeight: '700', color: '#F9FAFB' }}>
                {flashSaleStats.totalReservations}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Total Quantity</Text>
              <Text style={{ fontSize: 28, fontWeight: '700', color: '#F59E0B' }}>
                {flashSaleStats.totalQuantity}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#374151' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Reserved</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#F59E0B' }}>
                {flashSaleStats.reserved}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Active</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#10B981' }}>
                {flashSaleStats.active}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Sold</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#8B5CF6' }}>
                {flashSaleStats.sold}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Released</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#3B82F6' }}>
                {flashSaleStats.released}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderMainTabs = () => (
    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', backgroundColor: '#222', borderRadius: 12, padding: 4 }}>
        <TouchableOpacity
          onPress={() => setActiveTab('stockUpdate')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: activeTab === 'stockUpdate' ? '#333' : 'transparent',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcon name="inventory" size={16} color={activeTab === 'stockUpdate' ? '#F9FAFB' : '#9CA3AF'} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'stockUpdate' ? '#F9FAFB' : '#9CA3AF', marginLeft: 6 }}>
              Stock Updates
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('flashSale')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: activeTab === 'flashSale' ? '#333' : 'transparent',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="flash" size={16} color={activeTab === 'flashSale' ? '#F59E0B' : '#9CA3AF'} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'flashSale' ? '#F9FAFB' : '#9CA3AF', marginLeft: 6 }}>
              Flash Sales
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setFilterType('all')}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: filterType === 'all' ? '#333' : '#222',
              borderWidth: 1,
              borderColor: filterType === 'all' ? '#4B5563' : '#374151',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: filterType === 'all' ? '#F9FAFB' : '#9CA3AF' }}>
              All ({history?.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterType('increase')}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: filterType === 'increase' ? '#064E3B' : '#222',
              borderWidth: 1,
              borderColor: filterType === 'increase' ? '#059669' : '#374151',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: filterType === 'increase' ? '#10B981' : '#9CA3AF' }}>
              ↑ Stock In ({stockStats.increments})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterType('decrease')}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: filterType === 'decrease' ? '#7F1D1D' : '#222',
              borderWidth: 1,
              borderColor: filterType === 'decrease' ? '#DC2626' : '#374151',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: filterType === 'decrease' ? '#EF4444' : '#9CA3AF' }}>
              ↓ Stock Out ({stockStats.decrements})
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  const renderStockDateSection = (date, items) => (
    <View key={date} style={{ marginBottom: 24 }}>
      {/* Date Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5 }}>
          {date.toUpperCase()}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#374151', marginLeft: 12 }} />
      </View>

      {/* Items */}
      <View style={{ paddingHorizontal: 16 }}>
        {items.map((item, index) => {
          const changeInfo = getChangeInfo(item);
          const { time } = formatDateTime(item.updatedAt);

          return (
            <TouchableOpacity
              key={item._id || index}
              activeOpacity={0.7}
              style={{
                backgroundColor: '#1B1B1B',
                borderRadius: 12,
                marginBottom: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#374151',
              }}>
              {/* Icon Circle */}
              {/* <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: reasonIcon.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                {/* <Icon name={reasonIcon./icon} size={24} color={reasonIcon.color} /> 
              </View> */}

              {/* Content */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#F9FAFB', marginBottom: 4 }}>
                  {item.reason}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#9CA3AF' }}>{item.previousQuantity}</Text>
                  <Icon name="arrow-forward" size={12} color="#6B7280" style={{ marginHorizontal: 6 }} />
                  <Text style={{ fontSize: 13, color: '#F9FAFB', fontWeight: '500' }}>
                    {item.newQuantity}
                  </Text>
                  <View
                    style={{
                      marginLeft: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 12,
                      backgroundColor: changeInfo.bgColor,
                    }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: changeInfo.color }}>
                      {changeInfo.isIncrease ? '+' : '-'}{changeInfo.change}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{time}</Text>
              </View>

              {/* Amount Badge */}
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: changeInfo.color,
                  }}>
                  {changeInfo.isIncrease ? '+' : '-'}{changeInfo.change}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderFlashSaleDateSection = (date, items) => (
    <View key={date} style={{ marginBottom: 24 }}>
      {/* Date Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5 }}>
          {date.toUpperCase()}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#374151', marginLeft: 12 }} />
      </View>

      {/* Items */}
      <View style={{ paddingHorizontal: 16 }}>
        {items.map((item, index) => {
          const statusBadge = getStatusBadge(item.status);
          const { time } = formatDateTime(item.reservedAt || item.createdAt);

          return (
            <TouchableOpacity
              key={item._id || index}
              activeOpacity={0.7}
              style={{
                backgroundColor: '#222',
                borderRadius: 12,
                marginBottom: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#374151',
              }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#78350F', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Icon name="flash" size={20} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Flash Sale ID</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#F9FAFB' }} numberOfLines={1}>
                      {item.flashSaleId || 'N/A'}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: statusBadge.bg,
                  }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: statusBadge.color }}>
                    {statusBadge.label}
                  </Text>
                </View>
              </View>

              {/* Details Grid */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#374151' }}>
                <View>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Quantity</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#F9FAFB' }}>
                    {item.quantity}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Reserved At</Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#F9FAFB' }}>
                    {time}
                  </Text>
                </View>
                {item.releasedAt && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Released At</Text>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#F9FAFB' }}>
                      {formatDateTime(item.releasedAt).time}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const EmptyState = ({ message }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 64 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <MaterialIcon name="history" size={40} color="#4B5563" />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#F9FAFB', marginBottom: 8 }}>No History</Text>
      <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
        {message}
      </Text>
    </View>
  );

  // Render footer for loading more
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#F59E0B" />
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Loading more...</Text>
      </View>
    );
  };

  // Render initial loading state
  const renderLoadingState = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 }}>
      <ActivityIndicator size="large" color="#F59E0B" />
      <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 16 }}>Loading history...</Text>
    </View>
  );

  const renderContent = () => {
    if (activeTab === 'stockUpdate') {
      // Show loading state when initially loading with stockId
      if (loading && history?.length === 0) {
        return renderLoadingState();
      }

      if (history?.length === 0) {
        return <EmptyState message="Stock update history will appear here" />;
      }
      
      if (filteredHistory?.length === 0) {
        return <EmptyState message={filterType === 'increase' ? 'No stock additions yet' : 'No stock removals yet'} />;
      }

      return (
        <FlatList
          data={Object.entries(groupedHistory)}
          renderItem={({ item: [date, items] }) => renderStockDateSection(date, items)}
          keyExtractor={item => item[0]}
          ListHeaderComponent={
            <>
              {renderStockStatsCard()}
              {renderFilterTabs()}
            </>
          }
          ListFooterComponent={renderFooter()}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      );
    }else{
      if (flashSaleReservations?.length === 0) {
        return <EmptyState message="Flashsale Reservation will appear here" />;
      }
      
      if (flashSaleReservations?.length === 0) {
        return <EmptyState message={filterType === 'increase' ? 'No stock additions yet' : 'No stock removals yet'} />;
      }

      return (
        <FlatList
          data={Object.entries(groupedFlashSale)}
          renderItem={({ item: [date, items] }) => renderFlashSaleDateSection(date, items)}
          keyExtractor={item => item[0]}
          ListHeaderComponent={
            <>
              {renderFlashSaleStatsCard()}
              {/* {renderFilterTabs()} */}
            </>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      );
    }
  };
// console.log(product)
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <SellerHeader navigation={navigation} message={'Product History'} />

      {/* {(history?.length > 0 || flashSaleReservations?.length > 0) && renderMainTabs()} */}
      
      {renderContent()}
    </SafeAreaView>
  );
};

export default StockUpdateHistoryScreen;
