import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import api from '../../../Utils/Api';
import { AWS_CDN_URL } from '../../../Utils/aws';
import { colors } from '../../../Utils/Colors';
import { X, Search, Users, Handshake } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AuthContext } from '../../../Context/AuthContext';
import { KeyboardAvoidingView, Platform } from 'react-native';

interface Seller {
  _id: string;
  sellerId: string;
  businessName?: string;
  companyName?: string;
  name?: string;
  userName: string;
  profileURL?: string;
  followerCount?: number;
  productCategories?: string[];
}

interface SponsorSelectorProps {
  onSponsorSelected: (sponsor: Seller | null) => void;
  isSubmitting?: boolean;
}

// Move SearchBar outside component to prevent recreation on each render
const SearchBar = React.memo<{ sponsorSearchTerm: string; handleSearchChange: (text: string) => void }>(
  ({ sponsorSearchTerm, handleSearchChange }) => (
    <View style={styles.searchContainer}>
      <Search size={18} color="#888" style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search sellers..."
        placeholderTextColor="#888"
        value={sponsorSearchTerm}
        onChangeText={handleSearchChange}
      />
    </View>
  )
);

const SponsorSelector: React.FC<SponsorSelectorProps> = ({
  onSponsorSelected,
  isSubmitting = false,
}) => {
  const [sponsorEnabled, setSponsorEnabled] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSponsor, setSelectedSponsor] = useState<Seller | null>(null);
  const [isLoadingSellers, setIsLoadingSellers] = useState(false);
  const [sponsorSearchTerm, setSponsorSearchTerm] = useState('');
  const [sponsorPage, setSponsorPage] = useState(1);
  const [sponsorHasMore, setSponsorHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearchTerm = useRef(sponsorSearchTerm);
  const {user}=useContext(AuthContext)

  // Debounced search effect - only triggers on search term changes
  useEffect(() => {
    if (!sponsorEnabled) return;

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search term changes
    searchTimeoutRef.current = setTimeout(() => {
      debouncedSearchTerm.current = sponsorSearchTerm;
      // Reset to page 1 when search changes
      setSponsorPage(1);
      // Trigger a new search by updating the trigger state
      setSearchTrigger(prev => prev + 1);
    }, 600);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [sponsorSearchTerm, sponsorEnabled]);

  // Fetch sellers with pagination - runs immediately
  useEffect(() => {
    const fetchSellers = async () => {
      if (!sponsorEnabled) {
        setSellers([]);
        setSponsorPage(1);
        return;
      }

      if (sponsorPage === 1) {
        setIsLoadingSellers(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          page: sponsorPage.toString(),
          limit: '20',
        });

        if (debouncedSearchTerm.current.trim()) {
          params.append('term', debouncedSearchTerm.current.trim());
        }

        const response = await api.get(`/search/sellers?${params}`);
        if (response.data.status) {
          const newSellers = response.data.data || [];
          
          if (sponsorPage === 1) {
            setSellers(newSellers);
          } else {
            setSellers(prev => [...prev, ...newSellers]);
          }
          
          setSponsorHasMore(response.data.pagination?.hasMore || false);
        }
      } catch (error) {
        console.error('Error fetching sellers:', error);
        if (sponsorPage === 1) {
          setSellers([]);
        }
      } finally {
        setIsLoadingSellers(false);
        setIsLoadingMore(false);
      }
    };

    fetchSellers();
  }, [sponsorEnabled, sponsorPage, searchTrigger]);

  // Notify parent component when sponsor changes
  useEffect(() => {
    if (onSponsorSelected) {
      onSponsorSelected(selectedSponsor);
    }
  }, [selectedSponsor, onSponsorSelected]);

  const handleToggleSponsor = () => {
    if (isSubmitting) return;
    
    const newEnabled = !sponsorEnabled;
    setSponsorEnabled(newEnabled);
    
    if (!newEnabled) {
      setSelectedSponsor(null);
      setSponsorSearchTerm('');
      setSponsorPage(1);
      setSellers([]);
    }
  };

  const handleSelectSponsor = (seller: Seller) => {
    setSelectedSponsor(seller);
  };

  const handleRemoveSponsor = () => {
    setSelectedSponsor(null);
  };

  const handleSearchChange = useCallback((text: string) => {
    setSponsorSearchTerm(text);
  }, []);

  const handleLoadMore = () => {
    if (!isLoadingMore && sponsorHasMore && sellers.length > 0) {
      setSponsorPage(prev => prev + 1);
    }
  };

  const renderSellerItem = ({ item }: { item: Seller }) =>{ 
    if(user.sellerInfo?._id==item.sellerId)return;
    return(
    <TouchableOpacity
      style={styles.sellerCard}
      onPress={() => handleSelectSponsor(item)}
      activeOpacity={0.7}
    >
      <View style={styles.sellerImageContainer}>
        {item.profileURL ? (
          <Image
            source={{ uri: `${AWS_CDN_URL}${item.profileURL}` }}
            style={styles.sellerImage}
            resizeMode="cover"
          />
        ) : (
           <LinearGradient
                     colors={['#ffd700', '#fced9c', '#FF8453']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                    style={[styles.sellerImagePlaceholder]}>
            <Users size={24} color="#000" />
          </LinearGradient>
        )}
        {item.followerCount > 0 && (
          <View style={styles.followerBadge}>
            <Text style={styles.followerBadgeText}>{item.followerCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.sellerDetails}>
        <Text style={styles.sellerName} numberOfLines={1}>
          {item.businessName || item.companyName || item.name || 'Unnamed Seller'}
        </Text>
        <Text style={styles.sellerUsername} numberOfLines={1}>
          @{item.userName}
        </Text>
      </View>

      <TouchableOpacity style={styles.selectButton}  onPress={() => handleSelectSponsor(item)}>
        <Text style={styles.selectButtonText}>Select</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )};

  const renderListFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={colors.primaryButtonColor} />
        <Text style={styles.loadingMoreText}>Loading...</Text>
      </View>
    );
  };

  const renderListEmpty = () => {
    if (isLoadingSellers) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>No sellers found</Text>
        <Text style={styles.emptySubtitle}>
          {sponsorSearchTerm ? 'Try a different search term' : 'No sellers available at the moment'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Handshake color="#FACC15"/>
          </View>
          <View>
            <Text style={styles.headerTitle}>Sponsor Partnership</Text>
            <Text style={styles.headerSubtitle}>Invite a seller to sponsor giveaways</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleToggleSponsor}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.toggleSwitch,
              sponsorEnabled && styles.toggleSwitchActive,
              isSubmitting && styles.toggleSwitchDisabled,
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                sponsorEnabled && styles.toggleThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Invite sellers to sponsor giveaway products in your show
          </Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoStatsRow}>
          <View style={styles.infoStat}>
            <Text style={styles.infoStatNumber}>1</Text>
            <Text style={styles.infoStatLabel}>Invite</Text>
          </View>
          <View style={styles.infoStatDivider} />
          <View style={styles.infoStat}>
            <Text style={styles.infoStatNumber}>2</Text>
            <Text style={styles.infoStatLabel}>Accept</Text>
          </View>
          <View style={styles.infoStatDivider} />
          <View style={styles.infoStat}>
            <Text style={styles.infoStatNumber}>3</Text>
            <Text style={styles.infoStatLabel}>Tag</Text>
          </View>
          <View style={styles.infoStatDivider} />
          <View style={styles.infoStat}>
            <Text style={styles.infoStatIcon}>✓</Text>
            <Text style={styles.infoStatLabel}>Done</Text>
          </View>
        </View>
      </View>

      {/* Sponsor Selection UI */}
      {sponsorEnabled && (
        <View style={styles.selectionContainer}>
          {!selectedSponsor ? (
            <>
              {/* Search Bar */}
              <SearchBar 
                sponsorSearchTerm={sponsorSearchTerm}
                handleSearchChange={handleSearchChange}
              />

              {/* Sellers List */}
              {isLoadingSellers && sponsorPage === 1 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primaryButtonColor} />
                  <Text style={styles.loadingText}>Loading sellers...</Text>
                </View>
              ) : (
                <>
                  {sellers.length > 0 && (
                    <View style={styles.listHeader}>
                      <Text style={styles.listHeaderText}>
                        ✨ {sponsorSearchTerm ? 'Search Results' : 'Available Sellers'}
                      </Text>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{sellers.length}</Text>
                      </View>
                    </View>
                  )}       
                     
                  <ScrollView 
                    style={styles.sellersList}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {sellers.length === 0 ? (
                      renderListEmpty()
                    ) : (
                      <>
                        {sellers.map((item) => (
                          <View key={item._id}>
                            {renderSellerItem({ item })}
                          </View>
                        ))}
                        {renderListFooter()}
                      </>
                    )}
                  </ScrollView>
                </>
              )}
            </>
          ) : (
            /* Selected Sponsor Display */
            <View style={styles.selectedSponsorContainer}>
              <LinearGradient
                colors={['rgba(252, 211, 77, 0.2)', 'rgba(30, 30, 30, 0.8)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.selectedSponsorGradient}
              >
                <View style={styles.selectedSponsorContent}>
                  <View style={styles.selectedSponsorImageContainer}>
                    {selectedSponsor.profileURL ? (
                      <Image
                        source={{ uri: `${AWS_CDN_URL}${selectedSponsor.profileURL}` }}
                        style={styles.selectedSponsorImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.selectedSponsorImagePlaceholder}>
                        <Users size={32} color="#888" />
                      </View>
                    )}
                  </View>

                  <View style={styles.selectedSponsorDetails}>
                    <View style={styles.selectedSponsorHeader}>
                      <Text style={styles.selectedSponsorName} numberOfLines={1}>
                        {selectedSponsor.businessName || selectedSponsor.companyName || selectedSponsor.name}
                      </Text>
                      <View style={styles.sponsorBadge}>
                        <Text style={styles.sponsorBadgeText}>⭐ SPONSOR</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.selectedSponsorUsername}>
                      @{selectedSponsor.userName}
                    </Text>
                    
                    {selectedSponsor.followerCount > 0 && (
                      <Text style={styles.selectedSponsorFollowers}>
                        👥 {selectedSponsor.followerCount} followers
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={handleRemoveSponsor}
                    style={styles.removeButton}
                    activeOpacity={0.7}
                  >
                    <X size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#404040',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconContainer: {
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    backgroundColor: '#6B7280',
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: colors.primaryButtonColor,
  },
  toggleSwitchDisabled: {
    opacity: 0.5,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    transform: [{ translateX: 2 }],
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  infoCard: {
    backgroundColor: 'rgba(252, 211, 77, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.2)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 16,
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(252, 211, 77, 0.1)',
    marginVertical: 10,
  },
  infoStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  infoStat: {
    alignItems: 'center',
    flex: 1,
  },
  infoStatNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryButtonColor,
    marginBottom: 2,
  },
  infoStatIcon: {
    fontSize: 18,
    color: '#10B981',
    marginBottom: 2,
  },
  infoStatLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  infoStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(252, 211, 77, 0.1)',
  },
  selectionContainer: {
    marginTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.3)',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#FFFFFF',
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.3)',
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  listHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryButtonColor,
  },
  countBadge: {
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  sellersList: {
    maxHeight: 300,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.1)',
  },
  listContent: {
    padding: 8,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sellerImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  sellerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(252, 211, 77, 0.3)',
  },
  sellerImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(252, 211, 77, 0.3)',
  },
  followerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  followerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000000',
  },
  sellerDetails: {
    flex: 1,
    marginRight: 8,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  sellerUsername: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  selectButton: {
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(252, 211, 77, 0.3)',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryButtonColor,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  selectedSponsorContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedSponsorGradient: {
    padding: 12,
    borderWidth: 2,
    borderColor: 'rgba(252, 211, 77, 0.6)',
    borderRadius: 8,
  },
  selectedSponsorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedSponsorImageContainer: {
    marginRight: 12,
  },
  selectedSponsorImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(252, 211, 77, 0.5)',
  },
  selectedSponsorImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(252, 211, 77, 0.5)',
  },
  selectedSponsorDetails: {
    flex: 1,
  },
  selectedSponsorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  selectedSponsorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  sponsorBadge: {
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sponsorBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000000',
  },
  selectedSponsorUsername: {
    fontSize: 12,
    color: 'rgba(252, 211, 77, 0.8)',
    marginBottom: 4,
  },
  selectedSponsorFollowers: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  removeButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
});

export default SponsorSelector;
