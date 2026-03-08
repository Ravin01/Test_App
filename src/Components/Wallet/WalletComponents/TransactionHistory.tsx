import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getWalletTransactions, Transaction, Pagination } from '../../../Services/walletService';

interface Filters {
  page: number;
  limit: number;
  type: string;
  source: string;
}

interface TypeConfig {
  icon: string;
  colors: string[];
  iconBg: string;
  iconColor: string;
  textColor: string;
  sign: string;
}

interface StatusConfig {
  text: string;
  icon: string;
  colors: string[];
  textColor: string;
  borderColor: string;
}

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    limit: 10,
    type: '',
    source: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [filters.page, filters.type, filters.source]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await getWalletTransactions(filters);
      setTransactions(response?.data || []);
      setPagination(response?.pagination || null);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setTransactions([]);
      setPagination(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [filters]);

  const formatDate = (dateString: string): string => {
    if (!dateString || dateString === 'undefined' || dateString === 'null') {
      return 'N/A';
    }
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    try {
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getTypeConfig = (type: string): TypeConfig => {
    return type === 'credit'
      ? {
          icon: 'arrow-up-right',
          colors: ['#10b98133', '#059669'],
          iconBg: '#10b98120',
          iconColor: '#34d399',
          textColor: '#34d399',
          sign: '+',
        }
      : {
          icon: 'arrow-down-left',
          colors: ['#ef444433', '#dc2626'],
          iconBg: '#ef444420',
          iconColor: '#f87171',
          textColor: '#f87171',
          sign: '-',
        };
  };

  const getSourceConfig = (source: string) => {
    const configs: Record<string, { label: string; icon: string; color: string }> = {
      topup: { label: 'Money Added', icon: 'trending-up', color: '#60a5fa' },
      order_payment: { label: 'Order Payment', icon: 'receipt', color: '#a78bfa' },
      refund: { label: 'Refund', icon: 'trending-down', color: '#34d399' },
      cashback: { label: 'Cashback', icon: 'gift', color: '#fbbf24' },
      admin_adjustment: { label: 'Admin Adjustment', icon: 'cog', color: '#22d3ee' },
    };
    return configs[source] || { label: source, icon: 'receipt', color: '#9ca3af' };
  };

  const getStatusConfig = (status: string): StatusConfig => {
    const configs: Record<string, StatusConfig> = {
      completed: {
        text: 'Completed',
        icon: 'check-circle',
        colors: ['#10b98133', '#059669'],
        textColor: '#34d399',
        borderColor: '#10b98150',
      },
      pending: {
        text: 'Pending',
        icon: 'clock-outline',
        colors: ['#f59e0b33', '#d97706'],
        textColor: '#fbbf24',
        borderColor: '#f59e0b50',
      },
      failed: {
        text: 'Failed',
        icon: 'close-circle',
        colors: ['#ef444433', '#dc2626'],
        textColor: '#f87171',
        borderColor: '#ef444450',
      },
    };
    return (
      configs[status] || {
        text: status,
        icon: 'alert-circle',
        colors: ['#6b728033', '#4b5563'],
        textColor: '#9ca3af',
        borderColor: '#6b728050',
      }
    );
  };

  const renderFilterButton = (label: string, value: string, currentValue: string, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.filterButton,
        currentValue === value && styles.filterButtonActive,
      ]}
    >
      <Text
        style={[
          styles.filterButtonText,
          currentValue === value && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = useCallback(() => (
    <View style={styles.headerSection}>
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Icon name="receipt" size={20} color="#FFD700" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Transaction History</Text>
          <Text style={styles.headerSubtitle}>Track all your wallet activities</Text>
        </View>
      </View>

      {/* Filters Toggle */}
      <TouchableOpacity
        onPress={() => setShowFilters(!showFilters)}
        activeOpacity={0.7}
        style={styles.filterToggle}
      >
        <Icon name="filter-variant" size={16} color="#FFD700" />
        <Text style={styles.filterToggleText}>Filters</Text>
        <Icon
          name={showFilters ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#999"
        />
      </TouchableOpacity>

      {/* Filters Panel */}
      {showFilters && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.filtersPanel}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Transaction Type:</Text>
            <View style={styles.filterButtons}>
              {renderFilterButton('All', '', filters.type, () =>
                setFilters({ ...filters, type: '', page: 1 })
              )}
              {renderFilterButton('Credit', 'credit', filters.type, () =>
                setFilters({ ...filters, type: 'credit', page: 1 })
              )}
              {renderFilterButton('Debit', 'debit', filters.type, () =>
                setFilters({ ...filters, type: 'debit', page: 1 })
              )}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Source:</Text>
            <View style={styles.filterButtons}>
              {renderFilterButton('All', '', filters.source, () =>
                setFilters({ ...filters, source: '', page: 1 })
              )}
              {renderFilterButton('Topup', 'topup', filters.source, () =>
                setFilters({ ...filters, source: 'topup', page: 1 })
              )}
              {renderFilterButton('Orders', 'order_payment', filters.source, () =>
                setFilters({ ...filters, source: 'order_payment', page: 1 })
              )}
              {renderFilterButton('Refund', 'refund', filters.source, () =>
                setFilters({ ...filters, source: 'refund', page: 1 })
              )}
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  ), [showFilters, filters.type, filters.source]);

  const renderTransactionItem = ({ item, index }: { item: Transaction; index: number }) => {
    const typeConfig = getTypeConfig(item.type);
    const sourceConfig = getSourceConfig(item.source || 'topup');
    const statusConfig = getStatusConfig(item.status);

    return (
      <Animated.View
        entering={FadeInLeft.delay(index * 50)}
        layout={Layout.springify()}
        style={styles.transactionCard}
      >
        <LinearGradient
          colors={['#1a1a1a', '#2a2a2a']}
          style={styles.transactionGradient}
        >
          <View style={styles.transactionContent}>
            {/* Left: Icon and Info */}
            <View style={styles.transactionLeft}>
              <View style={[styles.transactionIcon, { backgroundColor: typeConfig.iconBg }]}>
                <Icon name={typeConfig.icon} size={20} color={typeConfig.iconColor} />
              </View>

              <View style={styles.transactionInfo}>
                <View style={styles.transactionSourceRow}>
                  <Icon name={sourceConfig.icon} size={14} color={sourceConfig.color} />
                  <Text style={styles.transactionSource}>{sourceConfig.label}</Text>
                </View>

                <View style={styles.transactionDateRow}>
                  <Icon name="calendar" size={12} color="#666" />
                  <Text style={styles.transactionDate}>
                    {formatDate((item as any).createdAt)}
                  </Text>
                </View>

                {(item as any).transactionId && (
                  <View style={styles.transactionIdContainer}>
                    <Text style={styles.transactionId}>
                      ID: {(item as any).transactionId}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Right: Amount and Status */}
            <View style={styles.transactionRight}>
              <Text style={[styles.transactionAmount, { color: typeConfig.textColor }]}>
                {typeConfig.sign}₹{item.amount.toFixed(2)}
              </Text>

              <LinearGradient
                colors={statusConfig.colors}
                style={[styles.statusBadge, { borderColor: statusConfig.borderColor }]}
              >
                <Icon name={statusConfig.icon} size={12} color={statusConfig.textColor} />
                <Text style={[styles.statusText, { color: statusConfig.textColor }]}>
                  {statusConfig.text}
                </Text>
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <Animated.View entering={FadeIn} style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="receipt" size={48} color="#666" />
      </View>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptySubtitle}>Your transaction history will appear here</Text>
    </Animated.View>
  );

  const renderFooter = () => {
    if (!pagination || pagination.pages <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          onPress={() => setFilters({ ...filters, page: filters.page - 1 })}
          disabled={filters?.page === 1}
          activeOpacity={0.7}
          style={[styles.paginationButton, filters.page === 1 && styles.paginationButtonDisabled]}
        >
          <Icon name="chevron-left" size={18} color={filters.page === 1 ? '#666' : '#fff'} />
          <Text style={[styles.paginationButtonText, filters.page === 1 && styles.paginationButtonTextDisabled]}>
            Prev
          </Text>
        </TouchableOpacity>

        <View style={styles.paginationInfo}>
          <Text style={styles.paginationLabel}>Page</Text>
          <Text style={styles.paginationCurrent}>{pagination?.page}</Text>
          <Text style={styles.paginationLabel}>of</Text>
          <Text style={styles.paginationTotal}>{pagination?.pages}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setFilters({ ...filters, page: filters.page + 1 })}
          disabled={filters.page === pagination.pages}
          activeOpacity={0.7}
          style={[
            styles.paginationButton,
            filters.page === pagination.pages && styles.paginationButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.paginationButtonText,
              filters.page === pagination.pages && styles.paginationButtonTextDisabled,
            ]}
          >
            Next
          </Text>
          <Icon
            name="chevron-right"
            size={18}
            color={filters.page === pagination.pages ? '#666' : '#fff'}
          />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => (item as any)._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
            colors={['#FFD700']}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  headerSection: {
   // paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFD70020',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD70030',
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    marginRight: 8,
    flex: 1,
  },
  filtersPanel: {
    marginTop: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
  },
  filterButtonActive: {
    backgroundColor: '#FFD70020',
    borderColor: '#FFD700',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  filterButtonTextActive: {
    color: '#FFD700',
  },
  transactionCard: {
   // marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  transactionGradient: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
  },
  transactionContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    flex: 1,
    minWidth: 0,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  transactionInfo: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  transactionSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  transactionSource: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 6,
  },
  transactionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  transactionDate: {
    fontSize: 11,
    color: '#666',
    marginLeft: 6,
  },
  transactionIdContainer: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#333',
  },
  transactionId: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#999',
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12,

    marginBottom: 40
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 4,
  },
  paginationButtonTextDisabled: {
    color: '#666',
  },
  paginationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    gap: 6,
  },
  paginationLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  paginationCurrent: {
    fontSize: 15,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  paginationTotal: {
    fontSize: 15,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default TransactionHistory;
