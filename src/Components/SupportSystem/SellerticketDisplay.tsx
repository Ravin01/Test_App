import React, {useState, useEffect, useContext, useRef} from 'react';
import {
  Linking,
  Dimensions,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import axiosInstance from '../../Utils/Api';
import {AuthContext} from '../../Context/AuthContext';
import {GET_SELLER_TICKETS, UPDATE_TICKET_STATUS} from '../../../Config';
import Icon from 'react-native-vector-icons/Feather';
import {Dropdown} from 'react-native-element-dropdown';
import {Toast} from '../../Utils/dateUtils';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
  TrendingUp,
} from 'lucide-react-native';
import TicketFormModal from './TicketFormModal';
import TicketReplies from './TicketReplies';
import {AWS_CDN_URL} from '../../../Config';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../Utils/Colors';
import SellerHeader from '../SellerComponents/SellerForm/Header';

const {width, height} = Dimensions.get('window');

// ---------------- Enhanced Status Configuration ----------------
const statusConfig = {
  Open: {
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    icon: 'clock',
    gradient: ['#3B82F6', '#2563EB'],
  },
  'In Progress': {
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    icon: 'alert-circle',
    gradient: ['#F59E0B', '#D97706'],
  },
  Resolved: {
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    icon: 'check-circle',
    gradient: ['#10B981', '#059669'],
  },
  Closed: {
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    icon: 'x-circle',
    gradient: ['#6B7280', '#4B5563'],
  },
};

const issueTypeDisplayNames = {
  damaged_product: 'Damaged Product',
  wrong_item: 'Wrong Item',
  missing_item: 'Missing Item',
  quality_issue: 'Quality Issue',
  delivery_delay: 'Delivery Delay',
  refund_request: 'Refund Request',
  exchange_request: 'Exchange Request',
  other: 'Other',
};

// ---------------- Modern Stats Cards with Gradient ----------------
const StatsCards = ({ticketCounts}) => {
  const statuses = Object.keys(statusConfig);

  return (
    <View style={styles.statsContainer}>
      {statuses.map(status => {
        const count = ticketCounts[status] || 0;
        const config = statusConfig[status];

        return (
          <LinearGradient
            key={status}
            colors={[config.gradient[0], config.gradient[1]]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name={config.icon} size={22} color="#fff" />
            </View>
            <Text style={styles.statCount}>{count}</Text>
            <Text style={styles.statLabel}>{status}</Text>
            <View style={styles.statGlow} />
          </LinearGradient>
        );
      })}
    </View>
  );
};

// ---------------- Main Component ----------------
const SellerticketDisplay = ({navigation}) => {
  const {user}: any = useContext(AuthContext);

  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [ticketCounts, setTicketCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Refs for cleanup and debouncing
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [editingTicketId, setEditingTicketId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [chatModalTicket, setChatModalTicket] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTickets: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const generateAttachmentUrl = filename => {
    return `${AWS_CDN_URL}${filename}`;
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleString();
  };

  // ---------------- Fetch Tickets ----------------
  const fetchTickets = async (page = 1, append = false) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Set appropriate loading state
      if (!append) {
        if (initialLoading) {
          setLoading(true);
        } else {
          // Show filtering state for filter/search changes
          setIsFiltering(true);
        }
      } else {
        setIsLoadingMore(true);
      }

      const endpoint = GET_SELLER_TICKETS.replace(':userId', user._id);
      const response = await axiosInstance.get(endpoint, {
        params: {
          page,
          limit: 10,
          ...(statusFilter !== 'All' && {status: statusFilter}),
          ...(searchTerm && searchTerm.trim() && {search: searchTerm.trim()}),
        },
        signal: abortControllerRef.current.signal,
      });

      if (response.data.success) {
        const newTickets = response.data.data.tickets;
        if (append) {
          setTickets(prev => [...prev, ...newTickets]);
          setFilteredTickets(prev => [...prev, ...newTickets]);
        } else {
          setTickets(newTickets);
          setFilteredTickets(newTickets);
        }

        const paginationData = response.data.data.pagination;
        setHasMore(paginationData.hasNextPage);
        setCurrentPage(page);
        
        // Update pagination state
        setPagination({
          currentPage: paginationData.currentPage || page,
          totalPages: paginationData.totalPages || 1,
          totalTickets: paginationData.totalCount || 0,
          hasNextPage: paginationData.hasNextPage || false,
          hasPrevPage: paginationData.hasPrevPage || false
        });

        const summary = response.data.data.summary;
        setTicketCounts({
          Open: summary.open || 0,
          'In Progress': summary.inProgress || 0,
          Resolved: summary.resolved || 0,
          Closed: summary.closed || 0,
        });
      }

      // Mark initial load as complete
      if (initialLoading) {
        setInitialLoading(false);
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        console.log('Request canceled');
        return;
      }
      console.error('Error fetching seller order tickets:', err);
      Toast('Failed to fetch order complaint tickets');
    } finally {
      if (!append) {
        if (initialLoading) {
          setLoading(false);
        } else {
          setIsFiltering(false);
        }
      } else {
        setIsLoadingMore(false);
      }
      setRefreshing(false);
    }
  };

  // ---------------- Pull to Refresh ----------------
  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets(1, false);
  };

  // ---------------- Debounced fetch on filter/search changes ----------------
  useEffect(() => {
    if (!user || !user._id) return;

    // Show filtering state for non-initial loads
    if (!initialLoading) {
      setIsFiltering(true);
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce to prevent rapid consecutive calls
    debounceTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      setHasMore(true);
      fetchTickets(1, false);
    }, 300);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Cancel any pending API request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, statusFilter, searchTerm]);

  // ---------------- Update Ticket Status ----------------
  const updateTicketStatus = async (ticketId, status) => {
    try {
      // Find the ticket to get old status before update
      const oldTicket = tickets.find(t => t._id === ticketId);
      const oldStatus = oldTicket?.status;

      const response = await axiosInstance.put(
        UPDATE_TICKET_STATUS.replace(':ticketId', ticketId),
        {status},
      );

      if (response.data) {
        setTickets(prev =>
          prev.map(t => (t._id === ticketId ? {...t, status} : t)),
        );
        setFilteredTickets(prev =>
          prev.map(t => (t._id === ticketId ? {...t, status} : t)),
        );
        
        // Update ticket counts immediately
        if (oldStatus && oldStatus !== status) {
          setTicketCounts(prev => ({
            ...prev,
            [oldStatus]: Math.max(0, (prev[oldStatus] || 0) - 1),
            [status]: (prev[status] || 0) + 1,
          }));
        }
        
        setEditingTicketId(null);
        Toast('Status updated!');
      }
    } catch (err) {
      console.error(err);
      Toast('Failed to update status');
    }
  };
  const TicketDetailModal = ({ticket, visible, onClose}) => {
    if (!ticket) return null;

    const config = statusConfig[ticket.status] || statusConfig['Open'];

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Animated Header with Gradient */}
            <LinearGradient
              colors={config.gradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalIconBadge}>
                  <Icon name={config.icon} size={24} color="#fff" />
                </View>
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={styles.modalTicketId}>{ticket.ticketId}</Text>
                  <Text style={styles.modalIssueType}>
                    {issueTypeDisplayNames[ticket.issueType] ||
                      ticket.issueType}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="x" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Content */}
            <ScrollView style={styles.modalContent}>
              {/* Status Info Cards */}
              <View style={styles.infoCardsRow}>
                <View style={[styles.infoCard, {backgroundColor: config.bgColor}]}>
                  <Text style={styles.infoCardLabel}>Status</Text>
                  <Text style={[styles.infoCardValue, {color: config.color}]}>
                    {ticket.status}
                  </Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoCardLabel}>Created</Text>
                  <Text style={styles.infoCardValue}>
                    {formatDate(ticket.createdAt)}
                  </Text>
                </View>
              </View>

              {/* Customer Info */}
              {ticket.raisedBy && (
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <User size={18} color="#FACC15" />
                    <Text style={styles.sectionTitle}>Customer Information</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Text style={styles.detailText}>
                      {ticket.raisedBy.name} ({ticket.raisedByRole})
                    </Text>
                  </View>
                </View>
              )}

              {/* Order Information */}
              {ticket.orderId && (
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ticket size={18} color="#FACC15" />
                    <Text style={styles.sectionTitle}>Order Details</Text>
                  </View>
                  <View style={styles.orderBox}>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>Order ID</Text>
                      <Text style={styles.orderValue}>
                        {ticket.orderId.orderId}
                      </Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>Amount</Text>
                      <Text style={styles.orderAmount}>
                        ₹{ticket.orderId.totalAmount}
                      </Text>
                    </View>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderLabel}>Status</Text>
                      <Text style={styles.orderStatus}>
                        {ticket.orderId.orderStatus}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Description */}
              <View style={styles.detailSection}>
                <View style={styles.sectionHeader}>
                  <FileText size={18} color="#FACC15" />
                  <Text style={styles.sectionTitle}>Description</Text>
                </View>
                <View style={styles.descriptionBox}>
                  <Text style={styles.descriptionText}>{ticket.description}</Text>
                </View>
              </View>

              {/* Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Download size={18} color="#FACC15" />
                    <Text style={styles.sectionTitle}>
                      Attachments ({ticket.attachments.length})
                    </Text>
                  </View>
                  {ticket.attachments.map((filename, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.attachmentItem}
                      onPress={() =>
                        Linking.openURL(generateAttachmentUrl(filename))
                      }>
                      <FileText size={16} color="#9CA3AF" />
                      <Text numberOfLines={1} style={styles.attachmentName}>
                        {filename}
                      </Text>
                      <Download size={16} color="#FACC15" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderTicket = ({item: ticket}) => {
    const config = statusConfig[ticket.status] || statusConfig['Open'];
    const isClosed = ticket.status === 'Closed';
    const isEditing = editingTicketId === ticket._id;

    const lastAdminReply = ticket.replies
      ?.slice()
      .reverse()
      .find(reply => reply.repliedByRole === 'Admin');

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => setSelectedTicket(ticket)}
        activeOpacity={0.7}>
        {/* Gradient Border Effect */}
        <LinearGradient
          colors={[config.gradient[0] + '40', config.gradient[1] + '20']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.ticketGradientBorder}>
          <View style={styles.ticketContent}>
            {/* Header */}
            <View style={styles.ticketHeader}>
              <View style={styles.ticketHeaderLeft}>
                <View
                  style={[
                    styles.ticketStatusDot,
                    {backgroundColor: config.color},
                  ]}
                />
                <View style={{flex: 1}}>
                  <Text style={styles.ticketId} numberOfLines={1}>
                    {ticket.ticketId}
                  </Text>
                  <Text style={styles.ticketIssueType} numberOfLines={1}>
                    {issueTypeDisplayNames[ticket.issueType] ||
                      ticket.issueType}
                  </Text>
                </View>
              </View>

              {/* Status Badge / Edit Controls */}
              {isEditing ? (
                <View style={styles.editControls}>
                  <Dropdown
                    style={styles.statusDropdown}
                    selectedTextStyle={{color: '#fff', fontSize: 12}}
                    placeholderStyle={{color: '#fff'}}
                    itemTextStyle={{color: '#fff'}}
                    activeColor="#333"
                    containerStyle={styles.dropdownContainer}
                    data={Object.keys(statusConfig).map(s => ({
                      label: s,
                      value: s,
                    }))}
                    labelField="label"
                    valueField="value"
                    value={newStatus}
                    onChange={item => setNewStatus(item.value)}
                  />
                  <TouchableOpacity
                    onPress={() => updateTicketStatus(ticket._id, newStatus)}
                    style={styles.iconButton}>
                    <CheckCircle size={18} color="#10B981" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditingTicketId(null)}
                    style={styles.iconButton}>
                    <XCircle size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.statusBadgeContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: config.bgColor,
                        borderColor: config.color,
                      },
                    ]}>
                    <Text style={[styles.statusText, {color: config.color}]}>
                      {ticket.status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingTicketId(ticket._id);
                      setNewStatus(ticket.status);
                    }}
                    style={styles.editButton}>
                    <Icon name="edit-2" size={16} color="#FACC15" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Order Info Chip */}
            {ticket.orderId && (
              <View style={styles.orderChip}>
                <Ticket size={12} color="#FACC15" />
                <Text style={styles.orderChipText}>
                  {ticket.orderId.orderId} • ₹{ticket.orderId.totalAmount}
                </Text>
                <View
                  style={[
                    styles.orderStatusChip,
                    {
                      backgroundColor:
                        ticket.orderId.orderStatus === 'Delivered'
                          ? '#10B98120'
                          : '#F59E0B20',
                    },
                  ]}>
                  <Text
                    style={{
                      color:
                        ticket.orderId.orderStatus === 'Delivered'
                          ? '#10B981'
                          : '#F59E0B',
                      fontSize: 10,
                    }}>
                    {ticket.orderId.orderStatus}
                  </Text>
                </View>
              </View>
            )}

            {/* Description */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text
                style={styles.descriptionPreview}
                numberOfLines={2}
                ellipsizeMode="tail">
                {ticket.description}
              </Text>
            </View>

            {/* Customer Info */}
            {ticket.raisedBy && (
              <View style={styles.customerInfo}>
                <User size={14} color="#9CA3AF" />
                <Text style={styles.customerName}>
                  {ticket.raisedBy.name} • {ticket.raisedByRole}
                </Text>
              </View>
            )}

            {/* Admin Reply Preview */}
            {lastAdminReply && (
              <View style={styles.replyPreview}>
                <View style={styles.replyHeader}>
                  <MessageCircle size={12} color="#10B981" />
                  <Text style={styles.replyLabel}>Admin Reply</Text>
                </View>
                <Text numberOfLines={1} style={styles.replyText}>
                  {lastAdminReply.message}
                </Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.ticketFooter}>
              <View style={styles.footerLeft}>
                <Clock size={12} color="#6B7280" />
                <Text style={styles.footerDate}>
                  {formatDate(ticket.createdAt)}
                </Text>
              </View>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <View style={styles.attachmentBadge}>
                  <FileText size={12} color="#FACC15" />
                  <Text style={styles.attachmentCount}>
                    {ticket.attachments.length}
                  </Text>
                </View>
              )}
            </View>

            {/* Chat Button */}
            {!isClosed && !isEditing && (
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => setChatModalTicket(ticket)}>
                <MessageCircle size={16} color="#000" />
                <Text style={styles.chatButtonText}>Open Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (!user)
    return (
      <Text style={{color: 'white', textAlign: 'center', marginTop: 20}}>
        Please log in
      </Text>
    );

  if (initialLoading && loading) {
    return (
      <SafeAreaView style={styles.container}>
        <SellerHeader navigation={navigation} message={'Order Tickets'}/>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FACC15" />
        <Text style={styles.loadingText}>Loading tickets...</Text>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
        <SellerHeader navigation={navigation} message={'Order Tickets'}/>
      <View style={styles.mainContent}>
        {/* Enhanced Header 
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <LinearGradient
            colors={['#B38728', '#FFD700', '#FDB931']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.headerGradient}>
            <View style={styles.headerInner}>
              <Headphones size={20} color="#FACC15" />
              <Text style={styles.headerTitle}>Order Tickets</Text>
            </View>
          </LinearGradient>
        </View>*/}

        {/* Tickets List */}
        {/* {(isFiltering || (loading && !initialLoading)) && (
          <View style={styles.filterLoadingOverlay}>
            <ActivityIndicator size="small" color="#FACC15" />
            <Text style={styles.filterLoadingText}>Updating...</Text>
          </View>
        )} */}
        <FlatList
          data={filteredTickets}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FACC15']}
              tintColor="#FACC15"
              progressBackgroundColor="#1B1B1B"
            />
          }
          renderItem={renderTicket}
          ListHeaderComponent={
            <View>
              {/* Actions Bar */}
              <View style={styles.actionsBar}>
                <View>
                  <Text style={styles.overviewTitle}>Overview</Text>
                  <Text style={styles.overviewSubtitle}>
                    {filteredTickets.length} ticket
                    {filteredTickets.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.actionButtons}>
                  {/* <TouchableOpacity
                    onPress={() => fetchTickets(1, false)}
                    style={styles.refreshButton}>
                    <RefreshCw size={16} color="#000" />
                  </TouchableOpacity> */}
                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() => setIsTicketModalOpen(true)}>
                    <Headphones size={16} color="#FACC15" />
                    <Text style={styles.helpButtonText}>Help</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stats Cards */}
              <StatsCards ticketCounts={ticketCounts} />

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Search size={18} color="#6B7280" />
                <TextInput
                  placeholder="Search tickets..."
                  placeholderTextColor="#6B7280"
                  value={searchTerm}
                  onChangeText={text => setSearchTerm(text)}
                  style={styles.searchInput}
                  returnKeyType="search"
                />
              </View>

              {/* Filter Dropdown */}
              <View style={styles.filterRow}>
                <Dropdown
                  style={styles.filterDropdown}
                  selectedTextStyle={{color: '#fff', fontSize: 14}}
                  placeholderStyle={{color: '#fff',paddingLeft:10}}
                  itemTextStyle={{color: '#fff'}}
                  activeColor="#333"
                  containerStyle={styles.dropdownContainer}
                  data={['All', ...Object.keys(statusConfig)].map(s => ({
                    label: s,
                    value: s,
                  }))}
                  labelField="label"
                  // renderLeftIcon={()=><Filter size={16} color="#9CA3AF" />}
                  // renderRightIcon={()=><Filter size={16} color="#9CA3AF" />}
                  valueField="value"
                  value={statusFilter}
                  onChange={item => setStatusFilter(item.value)}
                />
                {(statusFilter !== 'All' || searchTerm) && (
                  <TouchableOpacity
                    onPress={() => {
                      setStatusFilter('All');
                      setSearchTerm('');
                    }}
                    style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
          keyExtractor={item => item._id}
          onEndReached={() => {
            if (hasMore && !isLoadingMore && !isFiltering) {
              fetchTickets(currentPage + 1, true);
            }
          }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AlertCircle size={48} color="#6B7280" />
              <Text style={styles.emptyText}>No tickets found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your filters
              </Text>
            </View>
          }
          ListFooterComponent={
            <>
              {isLoadingMore && (
                <ActivityIndicator
                  size="small"
                  color="#FACC15"
                  style={{marginVertical: 20}}
                />
              )}
              {/* Pagination Controls - Commented out (using infinite scroll instead) */}
              {/* {pagination.totalPages > 1 && !isLoadingMore && (
                <View style={styles.paginationContainer}>
                  <View style={styles.paginationInfo}>
                    <Text style={styles.paginationText}>
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </Text>
                    <Text style={styles.paginationSubtext}>
                      ({pagination.totalTickets} total tickets)
                    </Text>
                  </View>
                  <View style={styles.paginationButtons}>
                    <TouchableOpacity
                      onPress={() => {
                        setCurrentPage(1);
                        setHasMore(true);
                        fetchTickets(pagination.currentPage - 1, false);
                      }}
                      disabled={!pagination.hasPrevPage || isFiltering}
                      style={[
                        styles.paginationButton,
                        (!pagination.hasPrevPage || isFiltering) && styles.paginationButtonDisabled
                      ]}>
                      <Text style={[
                        styles.paginationButtonText,
                        (!pagination.hasPrevPage || isFiltering) && styles.paginationButtonTextDisabled
                      ]}>
                        Previous
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={styles.currentPageBadge}>
                      <Text style={styles.currentPageText}>{pagination.currentPage}</Text>
                    </View>
                    
                    <TouchableOpacity
                      onPress={() => {
                        setCurrentPage(1);
                        setHasMore(true);
                        fetchTickets(pagination.currentPage + 1, false);
                      }}
                      disabled={!pagination.hasNextPage || isFiltering}
                      style={[
                        styles.paginationButton,
                        (!pagination.hasNextPage || isFiltering) && styles.paginationButtonDisabled
                      ]}>
                      <Text style={[
                        styles.paginationButtonText,
                        (!pagination.hasNextPage || isFiltering) && styles.paginationButtonTextDisabled
                      ]}>
                        Next
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )} */}
            </>
          }
        />

        {/* Modals */}
        <TicketFormModal
          visible={isTicketModalOpen}
          onClose={() => setIsTicketModalOpen(false)}
          ticketPurposeId="seller-order-complaints"
          ticketPurposePage="Order Complaints"
          userRole="Seller"
        />

        <TicketDetailModal
          ticket={selectedTicket}
          visible={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      </View>

      {chatModalTicket && (
        <TicketReplies
          isOpen={!!chatModalTicket}
          setIsOpen={() => setChatModalTicket(null)}
          ticketId={chatModalTicket._id}
          uniqueId={chatModalTicket?.ticketId}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },

  // Header Styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:colors.SecondaryColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGradient: {
    flex: 1,
    borderRadius: 16,
    padding: 2,
  },
  headerInner: {
    backgroundColor: '#111827',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },
  statGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -30,
    right: -30,
  },

  // Actions Bar
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  overviewSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FACC15',
    backgroundColor: '#1B1B1B',
  },
  helpButtonText: {
    color: '#FACC15',
    fontSize: 14,
    fontWeight: '600',
  },

  // Search & Filter Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 12,
    marginLeft: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  filterDropdown: {
    flex: 1,
    backgroundColor:colors.SecondaryColor,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    // paddingLeft:14,
    borderColor: '#374151',
  },
  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor:colors.SecondaryColor,
  },
  clearButtonText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownContainer: {
    backgroundColor:colors.SecondaryColor,
    borderColor: '#FACC15',
    borderWidth: 1,
    borderRadius: 12,
  },

  // Ticket Card Styles
  ticketCard: {
    marginBottom: 16,
  },
  ticketGradientBorder: {
    borderRadius: 16,
    padding: 1.5,
  },
  ticketContent: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 15,
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  ticketStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ticketId: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  ticketIssueType: {
    color: '#FACC15',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor:colors.SecondaryColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDropdown: {
    width: 120,
    height: 36,
    backgroundColor:colors.SecondaryColor,
    borderColor: '#FACC15',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor:colors.SecondaryColor,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Order Chip
  orderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:colors.SecondaryColor,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#374151',
  },
  orderChipText: {
    color: '#FACC15',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  orderStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  // Description
  descriptionContainer: {
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor:colors.SecondaryColor,
  },
  descriptionLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionPreview: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 18,
  },

  // Customer Info
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor:colors.SecondaryColor,
  },
  customerName: {
    color: '#9CA3AF',
    fontSize: 12,
  },

  // Reply Preview
  replyPreview: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  replyLabel: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  replyText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Footer
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor:colors.SecondaryColor,
    marginBottom: 12,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerDate: {
    color: '#6B7280',
    fontSize: 11,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attachmentCount: {
    color: '#FACC15',
    fontSize: 11,
    fontWeight: '600',
  },

  // Chat Button
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FACC15',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  chatButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1B1B1B',
    borderRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalHeader: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTicketId: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalIssueType: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 20,
  },

  // Info Cards
  infoCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    backgroundColor:colors.SecondaryColor,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  infoCardLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  infoCardValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Detail Sections
  detailSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  detailBox: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor:colors.SecondaryColor,
  },
  detailText: {
    color: '#E5E7EB',
    fontSize: 14,
  },

  // Order Box
  orderBox: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor:colors.SecondaryColor,
    gap: 10,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  orderValue: {
    color: '#FACC15',
    fontSize: 14,
    fontWeight: '700',
  },
  orderAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  orderStatus: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },

  // Description Box
  descriptionBox: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor:colors.SecondaryColor,
  },
  descriptionText: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20,
  },

  // Attachment Item
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor:colors.SecondaryColor,
    gap: 10,
  },
  attachmentName: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 13,
  },

  // List Content
  listContent: {
    paddingBottom: 120,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 6,
  },
  filterLoadingOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLoadingText: {
    color: '#FACC15',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Pagination Styles
  paginationContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: colors.SecondaryColor,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  paginationInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  paginationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  paginationSubtext: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
    minWidth: 90,
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    borderColor: '#374151',
  },
  paginationButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: '#6B7280',
  },
  currentPageBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FACC15',
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  currentPageText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SellerticketDisplay;
  