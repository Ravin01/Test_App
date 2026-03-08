import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { AWS_CDN_URL } from '../../../../../Config';
import axiosInstance from '../../../../Utils/Api';

const { height } = Dimensions.get('window');

// Helper Hook: useDebounce
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface BundleImage {
  key: string;
}

interface Product {
  _id: string;
  name: string;
}

interface Discount {
  percentage: number;
}

interface Bundle {
  _id: string;
  title: string;
  bundleImage?: BundleImage;
  products?: Product[];
  bundleMRP: number;
  sellingPrice: number;
  discount?: Discount;
}

interface SelectedBundle extends Bundle {
  bundleSaleId: string;
}

interface BundleSaleTabContentProps {
  selected: SelectedBundle[];
  onSelect: (bundle: Bundle) => void;
  onRemove: (bundleId: string) => void;
}

const BundleSaleTabContent: React.FC<BundleSaleTabContentProps> = ({
  selected,
  onSelect,
  onRemove,
  
}) => {
  const cdnURL=AWS_CDN_URL
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);
// console.log(selected)
  const fetchBundles = useCallback(
    async (requestPage: number, search: string, isLoadMore = false) => {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const { data } = await axiosInstance.get('seller/bundle-sale/list', {
          params: {
            page: requestPage,
            limit: 20,
            search,
            status: 'active',
          },
        });

        if (data.status && data.data?.bundleSales) {
          setBundles(prev =>
            isLoadMore ? [...prev, ...data.data.bundleSales] : data.data.bundleSales
          );
          setPage(requestPage);
          setTotalPages(data.data.totalPages || 1);
        } else {
          if (!isLoadMore) setBundles([]);
          setTotalPages(0);
        }
      } catch (error) {
        console.log('❌ Error fetching bundles:', error);
        if (!isLoadMore) setBundles([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchBundles(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchBundles]);

  const getAvailableBundles = () => {
    const selectedIds = new Set(selected.map(b => b.bundleSaleId));
    return bundles.filter(bundle => !selectedIds.has(bundle._id));
  };

  const handleBundleSelect = (bundle: Bundle) => {
    onSelect(bundle);
  };

  const isBundleSelected = (bundleId: string) => {
    return selected.some(b => b.bundleSaleId === bundleId);
  };

  const handleLoadMore = () => {
    if (!loadingMore && page < totalPages) {
      fetchBundles(page + 1, debouncedSearchTerm, true);
    }
  };

  const handleClearAll = () => {
    setShowConfirmModal(true);
  };

  const confirmClearAll = () => {
    // Create a copy of the selected array before clearing
    const bundlesToRemove = [...selected];
    
    // Remove all bundles
    bundlesToRemove.forEach(bundle => {
      onRemove(bundle.bundleSaleId);
    });
    
    setShowConfirmModal(false);
  };

  const renderBundleItem = ({ item, index }: { item: Bundle; index: number }) => (
    <View style={styles.bundleRow}>
      <Text style={styles.indexText}>{index + 1}</Text>
      
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: item.bundleImage?.key
              ? `${cdnURL}${item.bundleImage.key}`
              : 'https://via.placeholder.com/150',
          }}
          style={styles.bundleImage}
          resizeMode="cover"
        />
      </View>

      <View style={styles.bundleDetails}>
        <Text style={styles.bundleTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.bundleStats}>
          <View style={styles.statItem}>
            <Icon name="package" size={14} color="#60A5FA" />
            <Text style={styles.statText}>{item.products?.length || 0}</Text>
          </View>
          <Text style={styles.mrpText}>₹{item.bundleMRP}</Text>
          <Text style={styles.priceText}>₹{item.sellingPrice}</Text>
        </View>
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            {item.discount?.percentage || 0}% OFF
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => handleBundleSelect(item)}
        disabled={isBundleSelected(item._id)}
        style={[
          styles.addButton,
          isBundleSelected(item._id) && styles.addButtonDisabled,
        ]}
      >
        <Icon
          name="plus-circle"
          size={20}
          color={isBundleSelected(item._id) ? '#9CA3AF' : '#FFFFFF'}
        />
      </TouchableOpacity>
    </View>
  );

  const renderSelectedBundleItem = ({ item }: { item: SelectedBundle }) => (
    <View style={styles.selectedBundleCard}>
      <View style={styles.selectedBundleContent}>
        <View style={styles.selectedImageContainer}>
          <Image
            source={{
              uri: item.bundleImage?.key
                ? `${cdnURL}${item.bundleImage.key}`
                : 'https://via.placeholder.com/150',
            }}
            style={styles.selectedBundleImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.selectedBundleInfo}>
          <Text style={styles.selectedBundleTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.selectedBundleStats}>
            <View style={styles.selectedStatRow}>
              <Text style={styles.selectedStatLabel}>Products:</Text>
              <Text style={styles.selectedStatValue}>
                {item.products?.length || 0}
              </Text>
            </View>
            <View style={styles.selectedStatRow}>
              <Text style={styles.selectedStatLabel}>MRP:</Text>
              <Text style={styles.selectedMrpValue}>₹{item.bundleMRP}</Text>
            </View>
            <View style={styles.selectedStatRow}>
              <Text style={styles.selectedStatLabel}>Price:</Text>
              <Text style={styles.selectedPriceValue}>₹{item.sellingPrice}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => onRemove(item.bundleSaleId)}
          style={styles.removeButton}
        >
          <Icon name="trash-2" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Available Bundles Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="plus-circle" size={24} color="#FFC107" />
          <Text style={styles.cardTitle}>Available Bundle Sales</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bundles..."
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Bundles List - Scrollable Container */}
        <ScrollView 
          style={styles.bundlesListContainer}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {getAvailableBundles().length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Icon name="package" size={48} color="#6B7280" />
              <Text style={styles.emptyStateText}>No active bundles found.</Text>
              <Text style={styles.emptyStateSubtext}>
                Create bundles first to add them to shows.
              </Text>
            </View>
          ) : (
            <>
              {getAvailableBundles().map((item, index) => (
                <View key={item._id}>
                  {renderBundleItem({ item, index })}
                </View>
              ))}
              
              {loadingMore && (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#FFC107" />
                  <Text style={styles.loadingText}>Loading more...</Text>
                </View>
              )}
              
              {!loading && page >= totalPages && bundles.length > 0 && (
                <View style={styles.endMessage}>
                  <Text style={styles.endMessageText}>You've reached the end.</Text>
                </View>
              )}
              
              {!loading && page < totalPages && (
                <TouchableOpacity
                  onPress={handleLoadMore}
                  style={styles.loadMoreButton}
                >
                  <Text style={styles.loadMoreText}>Load More</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {loading && !loadingMore && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFC107" />
              <Text style={styles.loadingText}>Loading bundles...</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Selected Bundles Summary */}
      {selected.length > 0 && (
        <View style={styles.selectedCard}>
          <View style={styles.cardHeader}>
            <Icon name="package" size={24} color="#FFC107" />
            <Text style={styles.cardTitle}>Your Selected Bundle Sales</Text>
          </View>

          {/* Modern Summary Card with Elegant Design */}
          <View style={styles.summaryContainer}>
            {/* Top Section with Count and Title */}
            <View style={styles.summaryTopSection}>
              <LinearGradient
                colors={['#F59E0B', '#F97316', '#EA580C']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.countBadgeGradient}>
                <View style={styles.countBadge}>
                  <Icon name="check-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.countNumber}>{selected.length}</Text>
                </View>
              </LinearGradient>
              
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryMainText}>
                  {selected.length} Bundle{selected.length > 1 ? 's' : ''} Selected
                </Text>
                <Text style={styles.summarySubtext}>
                  Ready to showcase in your live stream
                </Text>
              </View>
            </View>

            {/* Preview Images Section */}
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Bundle Preview</Text>
              <View style={styles.previewImagesWrapper}>
                <View style={styles.previewImages}>
                  {selected.slice(0, 5).map((bundle, index) => (
                    <View key={bundle.bundleSaleId} style={[styles.previewImageWrapper, { zIndex: 5 - index }]}>
                      <Image
                        source={{
                          uri: bundle.bundleImage?.key
                            ? `${cdnURL}${bundle.bundleImage.key}`
                            : 'https://via.placeholder.com/150',
                        }}
                        style={styles.previewImage}
                      />
                    </View>
                  ))}
                  {selected.length > 5 && (
                    <View style={styles.previewMore}>
                      <Text style={styles.previewMoreText}>+{selected.length - 5}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                onPress={() => setShowManageModal(true)}
                style={styles.manageButtonNew}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.buttonGradient}
                >
                  <Icon name="settings" size={18} color="#FFFFFF" />
                  <Text style={styles.manageButtonTextNew}>Manage</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClearAll}
                style={styles.clearButtonNew}
              >
                <Icon name="trash-2" size={18} color="#EF4444" />
                <Text style={styles.clearButtonTextNew}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>Total Bundles</Text>
              <Text style={styles.statCardValue}>{selected.length}</Text>
            </View>
          {selected.reduce((sum, b) => sum + (b.products?.length || 0), 0)>0&&  <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>Total Products</Text>
              <Text style={[styles.statCardValue, { color: '#60A5FA' }]}>
                {selected.reduce((sum, b) => sum + (b.products?.length || 0), 0)}
              </Text>
            </View>}
            <View style={styles.statCard}>
              <Text style={styles.statCardLabel}>Total Value</Text>
              <Text style={[styles.statCardValue, { color: '#34D399' }]}>
                ₹{selected.reduce((sum, b) => sum + (b.sellingPrice || 0), 0)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Icon name="alert-circle" size={32} color="#EF4444" />
            </View>
            <Text style={styles.confirmModalTitle}>Clear All Bundles?</Text>
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to remove all {selected.length} bundle(s)? This action cannot be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={styles.confirmCancelButton}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmClearAll}
                style={styles.confirmDeleteButton}
              >
                <Icon name="trash-2" size={16} color="#FFFFFF" />
                <Text style={styles.confirmDeleteText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Modal */}
      <Modal
        visible={showManageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowManageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Icon name="settings" size={24} color="#FFC107" />
                <Text style={styles.modalTitle}>
                  Manage Bundle Sales ({selected.length} items)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowManageModal(false)}
                style={styles.closeButton}
              >
                <Icon name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <FlatList
              data={selected}
              renderItem={renderSelectedBundleItem}
              keyExtractor={item => item.bundleSaleId}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            />

            {/* Bottom Action Button */}
            <View style={styles.modalBottomAction}>
              <TouchableOpacity
                onPress={() => setShowManageModal(false)}
                style={styles.doneButtonBottom}
              >
                <Icon name="check" size={20} color="#000000" />
                <Text style={styles.doneButtonBottomText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
    // maxHeight:300,
    backgroundColor: '#121212',
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#FFFFFF',
    fontSize: 14,
  },
  bundlesListContainer: {
    maxHeight: 300,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  bundleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  indexText: {
    color: '#FFFFFF',
    fontWeight: '600',
    minWidth: 24,
    fontSize: 13,
    // marginRight: 8,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#3A3A3A',
  },
  bundleImage: {
    width: '100%',
    height: '100%',
  },
  bundleDetails: {
    flex: 1,
    marginRight: 8,
  },
  bundleTitle: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  bundleStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  statText: {
    color: '#60A5FA',
    fontWeight: '600',
    fontSize: 11,
    marginLeft: 2,
  },
  mrpText: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontSize: 11,
    marginRight: 6,
  },
  priceText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 13,
    marginRight: 6,
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#4B5563',
    opacity: 0.6,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingMore: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 8,
  },
  endMessage: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  endMessageText: {
    color: '#6B7280',
    fontSize: 13,
  },
  loadMoreButton: {
    backgroundColor: '#2A2A2A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  loadMoreText: {
    color: '#FFC107',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  summaryContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  summaryTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  countBadgeGradient: {
    borderRadius: 16,
    padding: 2,
    marginRight: 14,
  },
  countBadge: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryMainText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  summarySubtext: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
  },
  previewSection: {
    marginBottom: 16,
  },
  previewLabel: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  previewImagesWrapper: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#404040',
  },
  previewImages: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewImageWrapper: {
    marginLeft: -8,
  },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#1E1E1E',
    backgroundColor: '#3A3A3A',
  },
  previewMore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F59E0B',
    borderWidth: 3,
    borderColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  previewMoreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manageButtonNew: {
    // flex: 1,
    
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 8,
  },
  manageButtonTextNew: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  clearButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    gap: 8,
  },
  clearButtonTextNew: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#404040',
    marginHorizontal: 3,
  },
  statCardLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    marginBottom: 4,
  },
  statCardValue: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  modalTitle: {
    color: '#FFC107',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBottomAction: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    backgroundColor: '#1E1E1E',
  },
  doneButtonBottom: {
    backgroundColor: '#FFC107',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneButtonBottomText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
  },
  modalList: {
    padding: 16,
  },
  selectedBundleCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#404040',
    marginBottom: 8,
  },
  selectedBundleContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
  },
  selectedImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#3A3A3A',
  },
  selectedBundleImage: {
    width: '100%',
    height: '100%',
  },
  selectedBundleInfo: {
    flex: 1,
    marginRight: 8,
  },
  selectedBundleTitle: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  selectedBundleStats: {
    gap: 3,
  },
  selectedStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedStatLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginRight: 4,
  },
  selectedStatValue: {
    color: '#60A5FA',
    fontWeight: '600',
    fontSize: 11,
  },
  selectedMrpValue: {
    color: '#FFFFFF',
    textDecorationLine: 'line-through',
    fontSize: 11,
  },
  selectedPriceValue: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 12,
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  confirmModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: '#333333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BundleSaleTabContent;
