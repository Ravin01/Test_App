/* eslint-disable react/no-unstable-nested-components */
import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Pressable,
  RefreshControl,
} from 'react-native';
import {
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Calendar,
  User,
  FileText,
  RefreshCw,
  Search,
  Filter,
  MessageCircle,
  Headphones,
} from 'lucide-react-native';
import axiosInstance from '../../Utils/Api';
import TicketReplies from './TicketReplies';
import TicketDetailModal from './TicketDetailModal';
import TicketFormModal from './TicketFormModal';
import {GET_MY_TICKETS} from '../../../Config';
import LinearGradient from 'react-native-linear-gradient';
import {AuthContext} from '../../Context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../Utils/Colors';
import {SafeAreaView} from 'react-native-safe-area-context';
import SellerHeader from '../SellerComponents/SellerForm/Header';

const {width, height} = Dimensions.get('window');

const TicketsDisplay = ({showAllTickets = false, navigation}) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [chatModalTicket, setChatModalTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTickets: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [ticketCounts, setTicketCounts] = useState({});

  const {user} = useContext(AuthContext);

  const statusConfig = {
    Open: {color: '#60a5fa', icon: Clock, gradient: ['#1e40af', '#3b82f6']},
    'In Progress': {
      color: '#f59e0b',
      icon: AlertCircle,
      gradient: ['#92400e', '#f59e0b'],
    },
    Resolved: {
      color: '#10b981',
      icon: CheckCircle,
      gradient: ['#065f46', '#10b981'],
    },
    Closed: {color: '#6b7280', icon: XCircle, gradient: ['#374151', '#6b7280']},
  };

  const fetchTickets = async (page = 1) => {
    try {
      if (!refreshing && initialLoading) setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      // Add status filter if not 'All'
      if (statusFilter && statusFilter !== 'All') {
        params.append('status', statusFilter);
      }
      
      // Add search term if present
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      const response = await axiosInstance.get(`${GET_MY_TICKETS}?${params.toString()}`);
      
      // Handle the new API response structure
      if (response.data.success) {
        setTickets(response.data.data.tickets || []);
        setPagination(response.data.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalTickets: 0,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
        });
        setTicketCounts({
          'Open': response.data.data.summary?.open || 0,
          'In Progress': response.data.data.summary?.inProgress || 0,
          'Resolved': response.data.data.summary?.resolved || 0,
          'Closed': response.data.data.summary?.closed || 0,
        });
      } else {
        // Fallback for old API response format
        const ticketsData = Array.isArray(response.data) ? response.data : [];
        setTickets(ticketsData);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Debounce search and filter changes
    const timeoutId = setTimeout(() => {
      fetchTickets(1);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [user, searchTerm, statusFilter]);

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    fetchTickets(pagination.currentPage);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.currentPage) {
      fetchTickets(newPage);
    }
  };

  const StatusBadge = ({status}) => {
    const config = statusConfig[status] || statusConfig.Open;
    const IconComponent = config.icon;
    return (
      <LinearGradient
        colors={config.gradient}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.badge}>
        <IconComponent size={14} color="#fff" strokeWidth={2.5} />
        <Text style={styles.badgeText}>{status}</Text>
      </LinearGradient>
    );
  };

  const TicketCard = ({ticket}) => {
    const config = statusConfig[ticket.status] || statusConfig.Open;
    const isClosed = ticket.status === 'Closed';

    return (
      <LinearGradient
        colors={['#1a1a1a', '#0f0f0f']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.card}>
        <Pressable style={{flex: 1}} onPress={() => setSelectedTicket(ticket)}>
          {({pressed}) => (
            <View style={[styles.cardContent, pressed && styles.cardPressed]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.ticketIconBg,
                      {backgroundColor: config.color + '20'},
                    ]}>
                    <Ticket size={20} color={config.color} strokeWidth={2} />
                  </View>
                  <View style={styles.ticketInfo}>
                    <Text style={styles.cardTitle}>{ticket.ticketId}</Text>
                    <Text style={styles.issueType}>{ticket.issueType}</Text>
                  </View>
                </View>
                <StatusBadge status={ticket.status} />
              </View>

              <Text style={styles.cardDesc} numberOfLines={2}>
                {ticket.description}
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                  <Calendar size={13} color="#6b7280" strokeWidth={2} />
                  <Text style={styles.footerText}>
                    {formatDate(ticket.createdAt)}
                  </Text>
                </View>
                {showAllTickets && ticket.raisedBy && (
                  <View style={styles.footerItem}>
                    <User size={13} color="#6b7280" strokeWidth={2} />
                    <Text style={styles.footerText}>
                      {ticket.raisedBy.username ||
                        ticket.raisedBy.email ||
                        'Unknown'}
                    </Text>
                  </View>
                )}
              </View>

              {!isClosed && (
                <LinearGradient
                  colors={['#fbbf24', '#f59e0b']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.chatBtn}>
                  <Pressable
                    style={styles.chatBtnContent}
                    onPress={() => setChatModalTicket(ticket)}>
                    <MessageCircle size={17} color="#000" strokeWidth={2} />
                    <Text style={styles.chatBtnText}>Open Chat</Text>
                  </Pressable>
                </LinearGradient>
              )}
            </View>
          )}
        </Pressable>
      </LinearGradient>
    );
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed" size={48} color="#6b7280" />
        <Text style={styles.textGray}>Please log in to view your tickets.</Text>
      </View>
    );
  }

  if (initialLoading && loading) {
    return (
      <SafeAreaView style={styles.container}>
      <SellerHeader navigation={navigation} message={'My Tickets'} />
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fbbf24" />
        <Text style={[styles.textGray, {marginTop: 16}]}>
          Loading tickets...
        </Text>
      </View>
      </SafeAreaView>
    );
  }

  const statusFilters = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <SellerHeader navigation={navigation} message={'My Tickets'} />
        {/* <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-circle-outline" size={32} color="#fbbf24" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>My Tickets</Text>
            <Text style={styles.headerSubtitle}>
              {showAllTickets ? 'Manage all support tickets' : 'Track your requests'}
            </Text>
          </View>
        </View> */}

        {/* Tickets List */}
        {loading && !initialLoading && (
          <View style={styles.filterLoadingOverlay}>
            <ActivityIndicator size="small" color="#fbbf24" />
          </View>
        )}
        {/* {filteredTickets.length === 0 ? (
          
        ) : ( */}
        <FlatList
          data={tickets}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#fbbf24']}
              tintColor="#fbbf24"
              progressBackgroundColor="#1a1a1a"
            />
          }
          ListHeaderComponent={
            <>
              {/* Header Controls */}
              <View style={styles.controlsSection}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color="#9ca3af" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search tickets..."
                    placeholderTextColor="#6b7280"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                  />
                </View>

                <View style={styles.actionBtns}>
                  {/* <Animated.View style={{transform: [{scale: scaleAnim}]}}>
                    <TouchableOpacity
                      style={styles.refreshBtn}
                      onPress={onRefresh}
                      disabled={refreshing}>
                      <RefreshCw size={16} color="#000" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </Animated.View> */}

                  <LinearGradient
                    colors={['#fbbf24', '#f59e0b']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.helpBtnGradient}>
                    <TouchableOpacity
                      style={styles.helpBtn}
                      onPress={() => setIsTicketModalOpen(true)}>
                      <Headphones size={18} color="#000" strokeWidth={2} />
                      <Text style={styles.helpBtnText}>Help</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              </View>
              {/* Status Filters */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContent}>
                {statusFilters.map(filter => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterBtn,
                      statusFilter === filter && styles.filterBtnActive,
                    ]}
                    onPress={() => setStatusFilter(filter)}>
                    <Text
                      style={[
                        styles.filterText,
                        statusFilter === filter && styles.filterTextActive,
                      ]}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          }
          keyExtractor={item => item._id}
          renderItem={({item}) => <TicketCard ticket={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={56} color="#4b5563" />
              <Text style={styles.emptyText}>No tickets found</Text>
              <Text style={styles.emptySubtext}>
                {searchTerm || statusFilter !== 'All'
                  ? 'Try adjusting your filters'
                  : 'Create a new ticket to get started'}
              </Text>
            </View>
          }
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews
          scrollIndicatorInsets={{right: 1}}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            pagination.totalPages > 1 ? (
              <View style={styles.paginationContainer}>
                <Text style={styles.paginationInfo}>
                  Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.limit, pagination.totalTickets)} of{' '}
                  {pagination.totalTickets} tickets
                </Text>
                <View style={styles.paginationButtons}>
                  <TouchableOpacity
                    style={[
                      styles.paginationBtn,
                      !pagination.hasPrevPage && styles.paginationBtnDisabled,
                    ]}
                    onPress={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage || loading}>
                    <Ionicons name="chevron-back" size={20} color={pagination.hasPrevPage ? '#fbbf24' : '#6b7280'} />
                  </TouchableOpacity>
                  
                  <Text style={styles.paginationText}>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.paginationBtn,
                      !pagination.hasNextPage && styles.paginationBtnDisabled,
                    ]}
                    onPress={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage || loading}>
                    <Ionicons name="chevron-forward" size={20} color={pagination.hasNextPage ? '#fbbf24' : '#6b7280'} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
        />
        {/* )} */}
      </SafeAreaView>

      {/* Modals */}
      <TicketFormModal
        visible={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        ticketPurposeId="ticket-display-page"
        ticketPurposePage="Support Tickets"
        userRole="Seller"
        onTicketCreated={fetchTickets}
      />

      <TicketDetailModal
        ticket={selectedTicket}
        visible={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        viewMore={false}
      />

      {chatModalTicket && (
        <TicketReplies
          isOpen={!!chatModalTicket}
          setIsOpen={() => setChatModalTicket(null)}
          ticketId={chatModalTicket._id}
          uniqueId={chatModalTicket?.ticketId}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  controlsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#121212',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  refreshBtn: {
    backgroundColor: '#fbbf24',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#fbbf24',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  helpBtnGradient: {
    flex: 1,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#fbbf24',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  helpBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    // padding:4
  },
  filterContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    // height:40,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  filterBtnActive: {
    backgroundColor: '#fbbf24',
    borderColor: '#fbbf24',
  },
  filterText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#000',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  cardContent: {
    padding: 16,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    alignItems: 'center',
  },
  ticketIconBg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketInfo: {
    flex: 1,
  },
  cardTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  issueType: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  cardDesc: {
    color: '#d1d5db',
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2d2d2d',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  chatBtn: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#fbbf24',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  chatBtnContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 8,
  },
  chatBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    gap: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  textGray: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  filterLoadingOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: 20,
    padding: 8,
    zIndex: 1000,
  },
  paginationContainer: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  paginationInfo: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  paginationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  paginationBtn: {
    backgroundColor: '#2d2d2d',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  paginationBtnDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 120,
    textAlign: 'center',
  },
});

export default TicketsDisplay;
