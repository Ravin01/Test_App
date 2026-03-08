import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthContext } from '../../../Context/AuthContext';
import sponsorService from '../../Shows/Services/sponsorService';
import giveawayService from '../../Shows/Services/giveawayService';
import api from '../../../Utils/Api';
import bgaAxiosInstance from '../../../Utils/bgaAxiosInstance';
import { AWS_CDN_URL } from '../../../Utils/aws';
import { colors } from '../../../Utils/Colors';
import {
  Gift,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Calendar,
  Send,
  Inbox,
  ArrowUpRight,
  User,
  Pencil,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SellerHeader from '../SellerForm/Header';
import ProductSelectionModal from './ProductSelectionModal';
import bgaSocket from '../../../Utils/BgaSocket';

// Socket instance


const SponsorInvitations = ({navigation}) => {
  // const navigation = useNavigation();
  const { user } = useAuthContext();

  const [invitations, setInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectInvitationId, setRejectInvitationId] = useState(null);
  const [bgaHealthStatus, setBgaHealthStatus] = useState({ healthy: true, checked: false });
  const [activeTab, setActiveTab] = useState('received');

  // Pagination states
  const [receivedPage, setReceivedPage] = useState(1);
  const [sentPage, setSentPage] = useState(1);
  const [receivedHasMore, setReceivedHasMore] = useState(true);
  const [sentHasMore, setSentHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tierUpdateLoading, setTierUpdateLoading] = useState(null);

  // Initialize socket connection
  // useEffect(() => {
  //   if (!bgaSocket) {
  //     bgaSocket = io(`${bgaSocketUrl}/bga`, {
  //       transports: ['websocket'],
  //       autoConnect: true,
  //     });
  //   }

  //   return () => {
  //     if (bgaSocket) {
  //       bgaSocket.disconnect();
  //       bgaSocket = null;
  //     }
  //   };
  // }, []);

  // Prefetch both tabs data on mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await checkBgaConnection();
      
      await Promise.all([
        fetchInvitations(1, true),
        fetchSentInvitations(1, true)
      ]);
      
      setLoading(false);
    };
    
    initializeData();
  }, []);

  // Setup socket listeners
  useEffect(() => {
    setupSocketListeners();
    return () => {
      cleanupSocketListeners();
    };
  }, [activeTab]);

  const checkBgaConnection = async () => {
    try {
      await bgaAxiosInstance.get('/health');
      setBgaHealthStatus({ healthy: true, checked: true });
    } catch (error) {
      console.error('BGA Backend not available:', error);
      setBgaHealthStatus({ healthy: false, checked: true });
    }
  };

  const fetchInvitations = async (page = 1, reset = false) => {
    try {
      if (!reset && page > 1) {
        setLoadingMore(true);
      }
      
      const sellerId = user?.sellerInfo?._id || user?.sellerInfo;
      const response = await sponsorService.getSponsorInvitations(sellerId, page, 10);
      
      if (response.success) {
        if (reset) {
          setInvitations(response.data || []);
        } else {
          setInvitations(prev => [...prev, ...(response.data || [])]);
        }
        setReceivedPage(page);
        setReceivedHasMore(response.pagination?.hasMore || false);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const fetchSentInvitations = async (page = 1, reset = false) => {
    try {
      if (!reset && page > 1) {
        setLoadingMore(true);
      }
      
      const sellerId = user?.sellerInfo?._id || user?.sellerInfo;
      const response = await sponsorService.getSentInvitations(sellerId, page, 10);
      
      if (response.success) {
        if (reset) {
          setSentInvitations(response.data || []);
        } else {
          setSentInvitations(prev => [...prev, ...(response.data || [])]);
        }
        setSentPage(page);
        setSentHasMore(response.pagination?.hasMore || false);
      }
    } catch (error) {
      console.error('Error fetching sent invitations:', error);
    } finally {
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const setupSocketListeners = () => {
    if (!bgaSocket) return;

    const sellerId = user?.sellerInfo?._id || user?.sellerInfo;

    const handleConnect = () => {
      // console.log('🟢 [SPONSOR SOCKET] Connected:', bgaSocket.id);
      if (sellerId) {
        bgaSocket.emit('join_seller_room', { sellerId });
      }
    };

    if (bgaSocket.connected && sellerId) {
      bgaSocket.emit('join_seller_room', { sellerId });
    }

    bgaSocket.on('connect', handleConnect);

    bgaSocket.on('seller_room_joined', (data) => {
      // console.log('✅ [SPONSOR SOCKET] Room joined:', data);
    });

    bgaSocket.on('sponsor_invitation_received', (_data) => {
      // console.log('🎁 [SPONSOR SOCKET] New invitation:', _data);
      
      // if (activeTab === 'received') {
        fetchInvitations(1, true);
      // }
    });

    bgaSocket.on('sponsor_accepted', (_data) => {
      console.log('✅ [SPONSOR SOCKET] Sponsor accepted:', _data);
      
      // if (activeTab === 'sent') {
        fetchSentInvitations(1, true);
      // }
    });

    bgaSocket.on('sponsor_rejected', (_data) => {
      console.log('❌ [SPONSOR SOCKET] Sponsor rejected:', _data);
      
      // if (activeTab === 'sent') {
        fetchSentInvitations(1, true);
      // }
    });
  };

  const cleanupSocketListeners = () => {
    if (!bgaSocket) return;
    bgaSocket.off('sponsor_invitation_received');
    bgaSocket.off('sponsor_accepted');
    bgaSocket.off('sponsor_rejected');
    bgaSocket.off('seller_room_joined');
    bgaSocket.off('connect');
  };

  const handleAccept = (invitation) => {
    if (!bgaHealthStatus.healthy) {
      console.log('Giveaway service is unavailable');
      return;
    }
    setSelectedInvitation(invitation);
    setShowProductModal(true);
  };

  const handleProductsSelected = async (selectedProducts, quantities = {}) => {
    if (!selectedInvitation || selectedProducts.length === 0) {
      console.log('Please select at least one product');
      return;
    }

    if (!bgaHealthStatus.healthy) {
      console.log('Giveaway service is unavailable');
      return;
    }

    try {
      setActionLoading(selectedInvitation._id);
      
      const sellerId = user?.sellerInfo?._id || user?.sellerInfo;
      const showId = selectedInvitation.streamId || selectedInvitation.showId || selectedInvitation._id;

      const productIds = selectedProducts.map(p => p._id);
      const productDetails = selectedProducts.map(product => ({
        _id: product._id,
        title: product.title,
        price: product.price,
        images: product.images,
        quantity: quantities?.[product._id] || 1
      }));

      // Accept invitation and create giveaways
      const sponsorResponse = await sponsorService.acceptInvitation(
        selectedInvitation._id,
        productIds,
        productDetails,
        sellerId
      );

      if (!sponsorResponse.success) {
        throw new Error(sponsorResponse.error || 'Failed to accept invitation');
      }

      const taggedGiveaways = sponsorResponse.taggedGiveaways;

      // Update show with giveaway IDs
      const giveawayProducts = taggedGiveaways.map(g => ({
        productId: g.productId,
        giveawayObjectId: g.giveawayObjectId,
        requireAutoFollow: false
      }));

      const showResponse = await api.get(`/shows/get/${showId}`);
      if (!showResponse.data.status) {
        throw new Error('Failed to fetch show details');
      }
      
      const show = showResponse.data.data;

      const updatePayload = {
        buyNowProducts: show.buyNowProducts || [],
        auctionProducts: show.auctionProducts || [],
        giveawayProducts: [...(show.giveawayProducts || []), ...giveawayProducts]
      };

      const updateResponse = await api.put(`/shows/tag/${showId}`, updatePayload);

      if (!updateResponse.data.status) {
        throw new Error('Failed to update show with sponsor products');
      }

      console.log(`Successfully tagged ${taggedGiveaways.length} giveaway${taggedGiveaways.length > 1 ? 's' : ''}!`);

      setShowProductModal(false);
      setSelectedInvitation(null);
      fetchInvitations(1, true);

    } catch (error) {
      console.error('Error accepting invitation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectInvitationId) return;

    try {
      setShowRejectModal(false);
      setActionLoading(rejectInvitationId);
      const sellerId = user?.sellerInfo?._id || user?.sellerInfo;
      const response = await sponsorService.rejectInvitation(rejectInvitationId, sellerId);

      if (response.success) {
        console.log('Invitation rejected');
        fetchInvitations(1, true);
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
    } finally {
      setActionLoading(null);
      setRejectInvitationId(null);
    }
  };

  const handleReject = (invitationId) => {
    setRejectInvitationId(invitationId);
    setShowRejectModal(true);
  };

  // Tier management handlers
  const handleBulkTierUpdate = async (sponsorId, newTier) => {
    if (!newTier) return;
    
    try {
      setTierUpdateLoading(`bulk-${sponsorId}`);
      await giveawayService.bulkUpdateSponsorGiveawayTiers(sponsorId, newTier);
      console.log(`Updated all products from this sponsor to ${newTier} tier`);
      
      // Refresh sent invitations to show updated tiers
      await fetchSentInvitations(1, true);
    } catch (error) {
      console.error('Failed to bulk update tiers:', error);
      console.log('Failed to bulk update: ' + error.message);
    } finally {
      setTierUpdateLoading(null);
    }
  };

  const handleIndividualTierUpdate = async (giveawayId, newTier) => {
    try {
      setTierUpdateLoading(giveawayId);
      await giveawayService.updateGiveawayTier(giveawayId, newTier);
      console.log('Tier updated successfully');
      
      // Refresh sent invitations to show updated tier
      await fetchSentInvitations(1, true);
    } catch (error) {
      console.error('Failed to update tier:', error);
      console.log('Failed to update tier: ' + error.message);
    } finally {
      setTierUpdateLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: colors.primaryButtonColor, text: 'Pending', icon: Clock ,textColor:'#000'},
      accepted: { color: '#10B981', text: 'Accepted', icon: CheckCircle,textColor:'#fff' },
      rejected: { color: '#EF4444', text: 'Rejected', icon: XCircle,textColor:'#fff' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
        <Icon size={14} color={badge.textColor||"#000"} />
        <Text style={[styles.statusBadgeText,{color:badge.textColor}]}>{badge.text}</Text>
      </View>
    );
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'received') {
      fetchInvitations(1, true);
    } else {
      fetchSentInvitations(1, true);
    }
  }, [activeTab]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore) return;
    
    if (activeTab === 'received' && receivedHasMore) {
      fetchInvitations(receivedPage + 1, false);
    } else if (activeTab === 'sent' && sentHasMore) {
      fetchSentInvitations(sentPage + 1, false);
    }
  }, [activeTab, receivedPage, sentPage, receivedHasMore, sentHasMore, loadingMore]);

  const renderInvitationItem = useCallback(({ item }) => (
    <View style={styles.invitationCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.showThumbnail ? (
            <Image
              source={{ uri: `${AWS_CDN_URL}${item.showThumbnail}` }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Gift size={24} color="#666" />
            </View>
          )}
        </View>

        {/* Title and Status */}
        <View style={styles.headerContent}>
          <Text style={styles.showTitle} numberOfLines={2}>
            {item.showTitle || 'Untitled Show'}
          </Text>
          {getStatusBadge(item.status)}
        </View>
      </View>

      {/* Host/Sponsor Info */}
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => {
          const userName = activeTab === 'received' 
            ? item.hostDetails?.userName 
            : item.sponsorDetails?.userName;
          if (userName) {
            navigation.navigate('Profile', { userName });
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.userAvatar}>
          {(activeTab === 'received' ? item.hostDetails?.profileURL : item.sponsorDetails?.profileURL) ? (
            <Image
              source={{ 
                uri: `${AWS_CDN_URL}${activeTab === 'received' ? item.hostDetails.profileURL : item.sponsorDetails.profileURL}` 
              }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={16} color={colors.primaryButtonColor} />
            </View>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userLabel}>
            {activeTab === 'received' ? 'From:' : 'Sent to:'}
          </Text>
          <Text style={styles.userName}>
            {activeTab === 'received' ? item.hostName : (item.sponsorName || 'Sponsor')}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Invitation Message */}
      {item.invitationMessage && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>"{item.invitationMessage}"</Text>
        </View>
      )}

      {/* Date and Time */}
      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeItem}>
          <Calendar size={14} color={colors.primaryButtonColor} />
          <Text style={styles.dateTimeText}>
            {new Date(item.scheduledAt || item.invitedAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.dateTimeItem}>
          <Clock size={14} color={colors.primaryButtonColor} />
          <Text style={styles.dateTimeText}>
            {new Date(item.scheduledAt || item.invitedAt).toLocaleTimeString()}
          </Text>
        </View>
      </View>

      {/* Tagged Products */}
      {item.status === 'accepted' && item.taggedGiveaways?.length > 0 && (
        <TaggedProductsSection 
          taggedGiveaways={item.taggedGiveaways} 
          navigation={navigation}
          invitation={activeTab === 'sent' ? item : null}
          handleBulkTierUpdate={activeTab === 'sent' ? handleBulkTierUpdate : null}
          handleIndividualTierUpdate={activeTab === 'sent' ? handleIndividualTierUpdate : null}
          tierUpdateLoading={tierUpdateLoading}
        />
      )}

      {/* Actions */}
      {item.status === 'pending' && activeTab === 'received' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAccept(item)}
            disabled={actionLoading === item._id || !bgaHealthStatus.healthy}
            activeOpacity={0.7}
          >
            {actionLoading === item._id ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <CheckCircle size={18} color="#000" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item._id)}
            disabled={actionLoading === item._id}
            activeOpacity={0.7}
          >
            <XCircle size={18} color="#FFF" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rejected Status */}
      {item.status === 'rejected' && (
        <View style={styles.rejectedContainer}>
          <XCircle size={18} color="#EF4444" />
          <Text style={styles.rejectedText}>
            {activeTab === 'received' 
              ? 'You declined this invitation' 
              : 'Sponsor declined this invitation'}
          </Text>
        </View>
      )}
    </View>
  ), [activeTab, actionLoading, bgaHealthStatus.healthy]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {activeTab === 'received' ? (
        <>
          <Gift size={64} color="#666" />
          <Text style={styles.emptyTitle}>No Invitations Yet</Text>
          <Text style={styles.emptySubtitle}>
            When a host invites you to sponsor their show, it will appear here.
          </Text>
        </>
      ) : (
        <>
          <Package size={64} color="#666" />
          <Text style={styles.emptyTitle}>No Sent Invitations</Text>
          <Text style={styles.emptySubtitle}>
            Invitations you send to sponsors will appear here.
          </Text>
        </>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primaryButtonColor} />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  if (loading && invitations.length === 0 && sentInvitations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryButtonColor} />
        <Text style={styles.loadingText}>Loading Sponsor Invitations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader message="Sponsor Invitations" navigation={navigation} />
     
   

      {/* List */}
      <FlatList
        data={activeTab === 'received' ? invitations : sentInvitations}
        renderItem={renderInvitationItem}
        keyExtractor={(item) => item._id}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        updateCellsBatchingPeriod={50}
        ListHeaderComponent={<>
         {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Gift size={28} color={colors.primaryButtonColor} />
          <View>
            <Text style={styles.headerTitle}>Sponsor Invitations</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'received' 
                ? 'View and manage sponsor invitations' 
                : 'View invitations you\'ve sent'}
            </Text>
          </View>
        </View>
      </View>

      {/* Health Warning */}
      {!bgaHealthStatus.healthy && bgaHealthStatus.checked && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Giveaway service is currently unavailable
          </Text>
        </View>
      )}

           {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
          activeOpacity={0.7}
        >
          <Inbox size={20} color={activeTab === 'received' ? '#000' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Received
          </Text>
          {invitations.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{invitations.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
          activeOpacity={0.7}
        >
          <Send size={20} color={activeTab === 'sent' ? '#000' : '#999'} />
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent
          </Text>
          {sentInvitations.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{sentInvitations.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
        </>}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}colors={['#ff6b6b', '#feca57', '#1dd1a1']}

            tintColor={colors.primaryButtonColor}
          />
        }
        showsVerticalScrollIndicator={true}
      />

      {/* Product Selection Modal */}
      {showProductModal && selectedInvitation && (
        <ProductSelectionModal
          visible={showProductModal}
          onClose={() => {
            setShowProductModal(false);
            setSelectedInvitation(null);
          }}
          onProductsSelected={handleProductsSelected}
          showTitle={selectedInvitation.showTitle || 'Untitled Show'}
          hostName={selectedInvitation.hostName || 'Host'}
          hostProfileURL={selectedInvitation.hostDetails?.profileURL}
          showThumbnail={selectedInvitation.showThumbnail}
        />
      )}

      {/* Reject Confirmation Modal */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModal}>
            <View style={styles.rejectModalHeader}>
              <View style={styles.rejectIconContainer}>
                <XCircle size={24} color="#EF4444" />
              </View>
              <Text style={styles.rejectModalTitle}>Reject Invitation</Text>
            </View>
            
            <Text style={styles.rejectModalText}>
              Are you sure you want to reject this sponsor invitation? This action cannot be undone.
            </Text>
            
            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={[styles.rejectModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectInvitationId(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.rejectModalButton, styles.confirmRejectButton]}
                onPress={confirmReject}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmRejectButtonText}>OK, Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Tagged Products Component with Tier Management
const TaggedProductsSection = ({ 
  taggedGiveaways, 
  navigation, 
  invitation, 
  handleBulkTierUpdate, 
  handleIndividualTierUpdate, 
  tierUpdateLoading 
}) => {
  const tierConfig = {
    silver: { label: 'Silver', icon: '🥈', desc: 'Mandate Register' },
    gold: { label: 'Gold', icon: '🥇', desc: 'Register + Share' },
    platinum: { label: 'Platinum', icon: '⭐', desc: 'Register + 1+ purchase' },
    diamond: { label: 'Diamond', icon: '💎', desc: 'Register + 2+ purchases' }
  };

  const [bulkTierPickerVisible, setBulkTierPickerVisible] = useState(false);
  const [selectedProductForTier, setSelectedProductForTier] = useState(null);
  const [selectedBulkTier, setSelectedBulkTier] = useState(null);
  const [selectedIndividualTier, setSelectedIndividualTier] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <View style={styles.taggedSection}>
      {/* Header with Bulk Update */}
      <View style={styles.taggedHeader}>
        <View style={styles.taggedHeaderLeft}>
          <Package size={16} color="#10B981" />
          <View>
            <Text style={styles.taggedTitle}>
              {taggedGiveaways.length} Product{taggedGiveaways.length > 1 ? 's' : ''} Tagged
            </Text>
            <Text style={styles.taggedSubtitle}>Scroll to view all →</Text>
          </View>
        </View>
        
        {/* Bulk Tier Update Button */}
        {invitation && handleBulkTierUpdate && (
          <TouchableOpacity
            style={styles.bulkTierButton}
            onPress={() => setBulkTierPickerVisible(true)}
            disabled={tierUpdateLoading?.startsWith('bulk')}
            activeOpacity={0.7}
          >
            {tierUpdateLoading?.startsWith('bulk') ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.bulkTierButtonText}>Set All</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        horizontal
        data={taggedGiveaways}
        renderItem={({ item, index }) => {
          const productImage = item.productDetails?.images?.[0]?.key;
          const productId = item.productDetails?._id || item.productId;
          const giveawayId = item.giveawayObjectId || item.giveawayId || item._id;
          const currentTier = item.giveawayTier || 'silver';
          const tier = tierConfig[currentTier] || tierConfig.silver;
          
          return (
            <View style={styles.productCard}>
              <TouchableOpacity
                style={styles.productImageContainer}
                onPress={() => navigation.navigate('ProductDetails', { id: productId })}
                activeOpacity={0.7}
              >
                {productImage ? (
                  <Image
                    source={{ uri: `${AWS_CDN_URL}${productImage}` }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Package size={32} color="#666" />
                  </View>
                )}
                <View style={styles.viewOverlay}>
                  <ArrowUpRight size={12} color={colors.primaryButtonColor} />
                </View>
              </TouchableOpacity>
              
              <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={1}>
                  {item.productDetails?.title || 'Product'}
                </Text>
                {item.productDetails?.price && (
                  <Text style={styles.productPrice}>
                    ₹{item.productDetails.price.toLocaleString('en-IN')}
                  </Text>
                )}
                
                {/* Tier Selector for Sent Invitations */}
                {invitation  && (
                  <TouchableOpacity
                    style={styles.tierSelector}
                    onPress={() => setSelectedProductForTier({ giveawayId, currentTier, index })}
                    disabled={tierUpdateLoading === giveawayId}
                    activeOpacity={0.7}
                  >
                    {tierUpdateLoading === giveawayId ? (
                      <ActivityIndicator size="small" color={colors.primaryButtonColor} />
                    ) : (
                      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',width:'100%'  }}>
                      <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                        <Text style={styles.tierIcon}>{tier.icon}</Text>
                        <Text style={styles.tierLabel}>{tier.label}</Text></View>
                        <Pencil color={'#fff'} size={12}/>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        keyExtractor={(item, index) => index.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsList}
      />

      {/* Bulk Tier Picker Modal */}
      {invitation && handleBulkTierUpdate && (
        <Modal
          visible={bulkTierPickerVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setBulkTierPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.tierPickerModal}>
              <View style={styles.tierPickerHeader}>
                <Text style={styles.tierPickerTitle}>Set Tier for All Products</Text>
                <TouchableOpacity onPress={() => setBulkTierPickerVisible(false)}>
                  <XCircle size={24} color="#999" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.tierOptions}>
                {Object.entries(tierConfig).map(([key, config]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.tierOption,
                      selectedBulkTier === key && styles.tierOptionSelected
                    ]}
                    onPress={() => setSelectedBulkTier(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tierOptionIcon}>{config.icon}</Text>
                    <View style={styles.tierOptionText}>
                      <Text style={styles.tierOptionLabel}>{config.label}</Text>
                      <Text style={styles.tierOptionDesc}>{config.desc}</Text>
                    </View>
                    {selectedBulkTier === key && (
                      <CheckCircle size={20} color={colors.primaryButtonColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.tierSubmitButton,
                  (!selectedBulkTier || isSubmitting) && styles.tierSubmitButtonDisabled
                ]}
                onPress={async () => {
                  if (selectedBulkTier && !isSubmitting) {
                    setIsSubmitting(true);
                    await handleBulkTierUpdate(invitation._id, selectedBulkTier);
                    setIsSubmitting(false);
                    setSelectedBulkTier(null);
                    setBulkTierPickerVisible(false);
                  }
                }}
                disabled={!selectedBulkTier || isSubmitting}
                activeOpacity={0.7}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#000" />
                    <Text style={styles.tierSubmitButtonText}>Updating...</Text>
                  </>
                ) : (
                  <Text style={styles.tierSubmitButtonText}>Confirm & Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Individual Tier Picker Modal */}
      {selectedProductForTier && handleIndividualTierUpdate && (
        <Modal
          visible={!!selectedProductForTier}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedProductForTier(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.tierPickerModal}>
              <View style={styles.tierPickerHeader}>
                <Text style={styles.tierPickerTitle}>Select Tier</Text>
                <TouchableOpacity onPress={() => setSelectedProductForTier(null)}>
                  <XCircle size={24} color="#999" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.tierOptions}>
                {Object.entries(tierConfig).map(([key, config]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.tierOption,
                      (selectedIndividualTier || selectedProductForTier.currentTier) === key && styles.tierOptionSelected
                    ]}
                    onPress={() => setSelectedIndividualTier(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tierOptionIcon}>{config.icon}</Text>
                    <View style={styles.tierOptionText}>
                      <Text style={styles.tierOptionLabel}>{config.label}</Text>
                      <Text style={styles.tierOptionDesc}>{config.desc}</Text>
                    </View>
                    {(selectedIndividualTier || selectedProductForTier.currentTier) === key && (
                      <CheckCircle size={20} color={colors.primaryButtonColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.tierSubmitButton,
                  (!selectedIndividualTier || isSubmitting) && styles.tierSubmitButtonDisabled
                ]}
                onPress={async () => {
                  if (selectedIndividualTier && !isSubmitting) {
                    setIsSubmitting(true);
                    await handleIndividualTierUpdate(selectedProductForTier.giveawayId, selectedIndividualTier);
                    setIsSubmitting(false);
                    setSelectedIndividualTier(null);
                    setSelectedProductForTier(null);
                  }
                }}
                disabled={!selectedIndividualTier || isSubmitting}
                activeOpacity={0.7}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size="small" color="#000" />
                    <Text style={styles.tierSubmitButtonText}>Updating...</Text>
                  </>
                ) : (
                  <Text style={styles.tierSubmitButtonText}>Confirm & Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.primaryColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  warningBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  warningText: {
    color: '#EF4444',
    fontSize: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    backgroundColor: colors.SecondaryColor,
    marginVertical: 16,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primaryButtonColor,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#000',
  },
  badge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  listContent: {
    padding: 16,
  },
  invitationCard: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  showTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(247, 206, 69, 0.3)',
  },
  userDetails: {
    flex: 1,
  },
  userLabel: {
    fontSize: 10,
    color: '#999',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryButtonColor,
  },
  messageContainer: {
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.2)',
  },
  messageText: {
    fontSize: 13,
    color: '#FFF',
    fontStyle: 'italic',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 12,
    color: '#999',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  acceptButton: {
    backgroundColor: colors.primaryButtonColor,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  rejectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  rejectedText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryButtonColor,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectModal: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  rejectModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  rejectIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  rejectModalText: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 24,
    lineHeight: 20,
  },
  rejectModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#444',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  confirmRejectButton: {
    backgroundColor: '#EF4444',
  },
  confirmRejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  taggedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.2)',
  },
  taggedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  taggedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  productsList: {
    gap: 12,
  },
  productCard: {
    width: 120,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#333',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    borderRadius: 12,
  },
  productInfo: {
    padding: 8,
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  // Tier Management Styles
  taggedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  taggedSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  bulkTierButton: {
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkTierButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  tierSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // gap: 4,
    backgroundColor: colors.primaryButtonColor + '20',
    borderWidth: 1,
    borderColor: colors.primaryButtonColor + '30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  tierIcon: {
    fontSize: 14,
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  tierPickerModal: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: colors.primaryButtonColor + '40',
  },
  tierPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tierPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  tierOptions: {
    gap: 12,
  },
  tierOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  tierOptionSelected: {
    backgroundColor: colors.primaryButtonColor + '20',
    borderColor: colors.primaryButtonColor,
  },
  tierOptionIcon: {
    fontSize: 28,
  },
  tierOptionText: {
    flex: 1,
  },
  tierOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  tierOptionDesc: {
    fontSize: 12,
    color: '#999',
  },
  tierSubmitButton: {
    backgroundColor: colors.primaryButtonColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  tierSubmitButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  tierSubmitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});

export default SponsorInvitations;
