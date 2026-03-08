// LiveStreamFlashSaleSeller.js
import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Animated
} from 'react-native';
import {
  Zap,
  Clock,
  IndianRupee,
  Package,
  Play,
  StopCircle,
  AlertCircle,
  X,
  Search,
  CheckCircle,
  Users,
  ShoppingCart,
  Plus,
  Filter,
  Archive,
  RefreshCw,
  ArrowLeft
} from 'lucide-react-native';
import axiosInstance from '../../../../Utils/Api';
//import MultiFlashSaleSelector from './MultiFlashSaleSelector';
import useDebounce from '../../../../Utils/useDebounce';
//import useInfiniteScrollNew from '../../../../customHooks/useInfiniteScrollNew';
import StartFlashSaleModal from './StartFlashSaleModal';
import { AWS_CDN_URL } from '../../../../../Config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ===================================================================
//  PARENT COMPONENT: LIVE STREAM FLASH SALE SELLER
// ===================================================================
const LiveStreamFlashSaleSeller = ({
  showId,
  sellerId,
  socket,
  signedUrls,
  activeFlashSales,
  history,
  loading,
  apiError,
  currentTime,
  onStartFlashSale,
  onEndFlashSale,
  onRefreshHistory,
  clearApiError,
  onOpenFlashSaleModal,
  onCloseFlashSaleModal,
  preSelectedProduct,
  showStartModal,
  formatTime,
  calculateProgress,
  calculateTimeLeft,
  calculateDiscount
}) => {
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const durationOptions = [10, 20, 30, 40, 50, 60];
  const cdnURL = AWS_CDN_URL;

  const handleFlashSalesStarted = (result) => {
    setShowMultiModal(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await onRefreshHistory();
    setRefreshing(false);
  };

  // ✅ Memoize filtered active sales to avoid recalculation on every render
  // AppSync events don't have status field, so we filter by time left only
  const trulyActiveSales = useMemo(() => 
    activeFlashSales.filter(sale => {
      // Check if sale has valid endTime
      if (!sale.endTime && !sale.saleEndTime && !sale.endsAt) {
        return false;
      }
      
      const endTime = sale.endTime || sale.saleEndTime || sale.endsAt;
      const timeLeft = calculateTimeLeft(endTime, currentTime);
      
      // Include if time is still remaining
      return timeLeft > 0;
    }),
    [activeFlashSales, currentTime, calculateTimeLeft]
  );

  return (
    <View style={styles.container}>
      {/* Header with Start Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Zap size={20} color="#f87171" />
          <Text style={styles.headerTitle}>Flash Sales</Text>
        </View>
        <TouchableOpacity
          onPress={onOpenFlashSaleModal}
          disabled={loading || trulyActiveSales.length > 0}
          style={[styles.startButton, (loading || trulyActiveSales.length > 0) && styles.startButtonDisabled]}
        >
          <Play size={14} color="#ffffff" />
          <Text style={styles.startButtonText}>Start Sale</Text>
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {apiError && (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <AlertCircle size={16} color="#fca5a5" />
            <Text style={styles.errorText}>{apiError}</Text>
          </View>
          <TouchableOpacity onPress={clearApiError} style={styles.errorCloseButton}>
            <X size={14} color="#fca5a5" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={history}
        renderItem={({ item }) => <HistoryItem sale={item} cdnURL={cdnURL} />}
        keyExtractor={(item) => item._id || item.flashSaleId}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
        ListHeaderComponent={() => (
          <>
            {/* Active Flash Sales List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Sales</Text>
              {loading && trulyActiveSales.length === 0 && history.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#ef4444" />
                  <Text style={styles.loadingText}>Loading Sales...</Text>
                </View>
              ) : trulyActiveSales.length === 0 ? (
                <View style={styles.emptyState}>
                  <Package size={48} color="#6b7280" />
                  <Text style={styles.emptyStateText}>No active flash sales</Text>
                  <Text style={styles.emptyStateSubtext}>Click "Start Sale" to create one</Text>
                </View>
              ) : (
                <>
                  {trulyActiveSales.map((flashSale) => (
                    <React.Fragment key={flashSale.flashSaleId || flashSale._id || `flashsale-${Math.random()}`}>
                    <FlashSaleItem
                      key={flashSale.flashSaleId || flashSale._id}
                      flashSale={flashSale}
                      onEnd={() => onEndFlashSale(flashSale.flashSaleId || flashSale._id)}
                      loading={loading}
                      currentTime={currentTime}
                      calculateProgress={calculateProgress}
                      calculateTimeLeft={calculateTimeLeft}
                      formatTime={formatTime}
                      cdnURL={cdnURL}
                      calculateDiscount={calculateDiscount}
                    />
                    </React.Fragment>
                  ))}
                </>
              )}
            </View>
            
            {/* History Header */}
            <View style={styles.historyContainer}>
              <View style={styles.historyHeader}>
                <View style={styles.historyTitleContainer}>
                  <Archive size={20} color="#f3f4f6" />
                  <Text style={styles.historyTitle}>Flash Sale History</Text>
                </View>
                <TouchableOpacity
                  onPress={onRefreshHistory}
                  disabled={loading}
                  style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#f3f4f6" />
                  ) : (
                    <RefreshCw size={14} color="#f3f4f6" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          loading && history.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#ef4444" />
              <Text style={styles.loadingText}>Loading History...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Package size={32} color="#6b7280" />
              <Text style={styles.emptyStateText}>No flash sale history</Text>
            </View>
          )
        )}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
      />

      {/* Single Flash Sale Modal */}
      <StartFlashSaleModal
        visible={showStartModal}
        showId={showId}
        sellerId={sellerId}
        loading={loading}
        onClose={() => {
          onCloseFlashSaleModal();
          if (clearApiError) clearApiError();
        }}
        onStart={onStartFlashSale}
        calculateDiscount={calculateDiscount}
        durationOptions={durationOptions}
        cdnURL={cdnURL}
        preSelectedProduct={preSelectedProduct}
      />

      {/* Multiple Flash Sales Modal */}
      {/* <Modal
        visible={showMultiModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMultiModal(false)}
      >
        <View style={styles.multiModalOverlay}>
          <View style={styles.multiModalContent}>
            <View style={styles.multiModalHeader}>
              <View style={styles.multiModalTitleContainer}>
                <ShoppingCart size={24} color="#a78bfa" />
                <Text style={styles.multiModalTitle}>Start Multiple Flash Sales</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMultiModal(false)}
                style={styles.multiModalCloseButton}
              >
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <MultiFlashSaleSelector
              showId={showId}
              sellerId={sellerId}
              onFlashSalesStarted={handleFlashSalesStarted}
            />
          </View>
        </View>
      </Modal> */}
    </View>
  );
};

// ===================================================================
//  CHILD COMPONENT: FLASH SALE ITEM
// ===================================================================
const FlashSaleItem = React.memo(({
  flashSale,
  onEnd,
  loading,
  currentTime,
  calculateProgress,
  calculateTimeLeft,
  formatTime,
  cdnURL,
  calculateDiscount,
  signedUrls
}: any) => {
  if (!flashSale || typeof flashSale !== 'object') {
    console.error('GRANDCHILD received invalid flashSale prop!');
    return null;
  }

  try {
    const timeLeft = calculateTimeLeft(flashSale.endTime, currentTime);
    const progress = calculateProgress(flashSale.startTime, flashSale.endTime, currentTime);
    const isExpired = timeLeft <= 0;
    
    // ✅ Extract product info from AppSync event structure
    // AppSync sends productDetails object, not products array
    const productInfo = flashSale.productDetails || 
                       (flashSale.products && flashSale.products[0]) || 
                       {};
    
    const currentStock = 
      flashSale.currentFlashStock ||
      flashSale.currentStock ||
      flashSale.availableStock ||
      productInfo.currentFlashStock ||
      productInfo.initialFlashStock ||
      0;
    
    // ✅ Handle image from AppSync structure
    let imageUrl = null;
    if (productInfo.images && productInfo.images[0]) {
      // AppSync structure: productDetails.images[0].key
      const imageKey = productInfo.images[0].key || productInfo.images[0];
      imageUrl = imageKey ? `${cdnURL}${imageKey}` : null;
    } else if (productInfo.productImage) {
      // Legacy structure
      imageUrl = `${cdnURL}${productInfo.productImage}`;
    } else if (flashSale.productImage) {
      imageUrl = `${cdnURL}${flashSale.productImage}`;
    }
    
    // ✅ Extract pricing and title from AppSync structure
    const originalPrice = flashSale.originalPrice || productInfo.MRP || productInfo.originalPrice || 0;
    const flashPrice = flashSale.flashPrice || productInfo.flashPrice || 0;
    const title = productInfo.title || productInfo.productTitle || flashSale.productTitle || 'Flash Sale';
    const discount = calculateDiscount(originalPrice, flashPrice);

    return (
      <Animated.View style={[
        styles.flashSaleItem,
        isExpired && styles.expiredFlashSaleItem
      ]}>
        <View style={styles.flashSaleContent}>
          {/* Header: Image, Title, Prices */}
          <View style={styles.flashSaleHeader}>
            <Image
              source={imageUrl ? { uri: imageUrl } : null
              // require('../../../../assets/placeholder.png')
              }
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.flashSaleInfo}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {title}
              </Text>
              <View style={styles.priceContainer}>
                <Text style={styles.originalPrice}>₹{originalPrice}</Text>
                <Text style={styles.flashPrice}>₹{flashPrice}</Text>
                {discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discount}% OFF</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          {!isExpired && (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill,
                    { width: `${progress}%` }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={styles.statValueContainer}>
                <IndianRupee size={14} color="#f87171" />
                <Text style={styles.statValue}>{flashPrice}</Text>
              </View>
              <Text style={styles.statLabel}>Flash Price</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentStock}</Text>
              <Text style={styles.statLabel}>Stock Left</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={styles.statValueContainer}>
                <Clock size={14} color="#f3f4f6" />
                <Text style={styles.statValue}>
                  {isExpired ? '00:00' : formatTime(timeLeft)}
                </Text>
              </View>
              <Text style={styles.statLabel}>Time Left</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  } catch (err) {
    console.error("❌❌❌ ERROR rendering FlashSaleItem:", err);
    return (
      <View style={styles.errorItem}>
        <Text style={styles.errorItemText}>Error rendering this flash sale item.</Text>
      </View>
    );
  }
});

// ===================================================================
//  CHILD COMPONENT: HISTORY ITEM (Extracted for FlatList)
// ===================================================================
const HistoryItem = React.memo(({ sale, cdnURL }: any) => {
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'completed':
        return [styles.statusBadge, styles.statusCompleted];
      case 'expired':
        return [styles.statusBadge, styles.statusExpired];
      case 'stopped':
        return [styles.statusBadge, styles.statusStopped];
      case 'ended':
        return [styles.statusBadge, styles.statusEnded];
      default:
        return [styles.statusBadge, styles.statusDefault];
    }
  };

  const calculateDiscount = (mrp, flashPrice) => {
    if (!mrp || mrp === 0) return 0;
    return Math.round(((mrp - flashPrice) / mrp) * 100);
  };

  // ✅ FIXED: Match web team's exact implementation
  const isBundle = sale.type === 'bundle';
  
  // ✅ Extract data based on sale type
  let imageUrl = null;
  let productTitle = 'Product';
  let originalPrice = 0;
  let flashPrice = 0;
  
  try {
    if (isBundle) {
      // ✅ Bundle flash sale - match web exactly
      // Extract bundle image
      if (sale.bundleImage) {
        if (sale.bundleImage.url) {
          imageUrl = sale.bundleImage.url;
        } else if (sale.bundleImage.key) {
          imageUrl = `${cdnURL}${sale.bundleImage.key}`;
        }
      }
      
      // Extract bundle title
      productTitle = sale.bundleTitle || 'Bundle';
      
      // ✅ Extract bundle pricing - CRITICAL: use bundleMRP not bundlePrice!
      originalPrice = sale.bundleMRP || 0;
      flashPrice = sale.bundleFlashPrice || 0;
    } else {
      // ✅ Regular product flash sale - match web exactly
      productTitle = sale.productTitle || 'Product';
      
      // Extract regular product image
      if (sale.productImage) {
        if (typeof sale.productImage === 'string') {
          imageUrl = `${cdnURL}${sale.productImage}`;
        } else if (sale.productImage.key) {
          imageUrl = `${cdnURL}${sale.productImage.key}`;
        } else if (sale.productImage.url) {
          imageUrl = sale.productImage.url;
        }
      }
      
      // Extract regular product pricing
      originalPrice = sale.MRP || sale.productPrice || 0;
      flashPrice = sale.flashPrice || 0;
    }
  } catch (error) {
    console.warn('Error processing flash sale history item:', error);
    imageUrl = null;
  }

  const discount = calculateDiscount(originalPrice, flashPrice);

  return (
    <View style={styles.historyItem}>
      <View style={styles.historyItemContent}>
        <Image
          source={imageUrl ? { uri: imageUrl } : null}
          style={styles.historyImage}
          resizeMode="cover"
        />
        <View style={styles.historyInfo}>
          <Text style={styles.historyProductTitle} numberOfLines={1}>
            {productTitle}
            {isBundle && <Text style={styles.bundleBadgeText}> 📦</Text>}
          </Text>
          <View style={styles.historyDetails}>
            <Text style={styles.historyFlashPrice}>₹{flashPrice}</Text>
            <Text style={styles.historyOriginalPrice}>
              ₹{originalPrice}
            </Text>
            {discount > 0 && (
              <View style={styles.historyDiscountBadge}>
                <Text style={styles.historyDiscountText}>{discount}% OFF</Text>
              </View>
            )}
            <Text style={styles.historyDuration}>{sale.duration}s</Text>
            <View style={getStatusStyles(sale.status)}>
              <Text style={styles.statusText}>{sale.status}</Text>
            </View>
            <View style={styles.soldContainer}>
              <ShoppingCart size={14} color="#60a5fa" />
              <Text style={styles.soldLabel}>Sold:</Text>
              <Text style={styles.soldCount}>{sale.sold || sale.bundlesSold || 0}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Time and Stock Info */}
      <View style={styles.historyFooter}>
        <View style={styles.timeContainer}>
          <Clock size={12} color="#9ca3af" />
          <Text style={styles.timeText}>{formatTime(sale.startTime)}</Text>
          <Text style={styles.timeSeparator}>-</Text>
          <Text style={styles.timeText}>{formatTime(sale.endTime)}</Text>
        </View>
        <View style={styles.stockContainer}>
          <Package size={12} color="#9ca3af" />
          <Text style={styles.stockText}>
            Stock: {isBundle 
              ? (sale.bundleQuantity || sale.initialBundleQuantity || 0)
              : (sale.initialStock || sale.initialFlashStock || 0)
            }
          </Text>
        </View>
      </View>
    </View>
  );
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87171',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#b91c1c',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
  },
  errorCloseButton: {
    padding: 4,
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#000',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 8,
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 12,
  },
  emptyStateSubtext: {
    color: '#6b7280',
    fontSize: 10,
  },
  // FlashSaleItem Styles
  flashSaleItem: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 8,
  },
  expiredFlashSaleItem: {
    borderColor: '#4b5563',
    opacity: 0.6,
  },
  flashSaleContent: {
    flex: 1,
  },
  flashSaleHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  flashSaleInfo: {
    flex: 1,
  },
  productTitle: {
    color: '#f3f4f6',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  originalPrice: {
    color: '#9ca3af',
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  flashPrice: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: 'bold',
  },
  discountBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#4ade80',
    fontSize: 10,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    backgroundColor: '#374151',
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: '#ef4444',
    height: '100%',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 10,
    marginTop: 2,
  },
  errorItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  errorItemText: {
    color: '#fca5a5',
    fontSize: 12,
  },
  // History Styles
  historyContainer: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 4
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f3f4f6',
  },
  refreshButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  historyList: {
    maxHeight: 240,
  },
  historyItem: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#111827',
    marginBottom: 8,
  },
  historyItemContent: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  historyImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  historyInfo: {
    flex: 1,
  },
  historyProductTitle: {
    color: '#f3f4f6',
    fontSize: 12,
    marginBottom: 4,
  },
  bundleBadgeText: {
    fontSize: 10,
  },
  historyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  historyFlashPrice: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '500',
  },
  historyOriginalPrice: {
    color: '#9ca3af',
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  historyDiscountBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyDiscountText: {
    color: '#4ade80',
    fontSize: 10,
  },
  historyDuration: {
    color: '#9ca3af',
    fontSize: 10,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  statusExpired: {
    backgroundColor: 'rgba(156, 163, 175, 0.3)',
    borderColor: 'rgba(156, 163, 175, 0.5)',
  },
  statusStopped: {
    backgroundColor: 'rgba(250, 204, 21, 0.3)',
    borderColor: 'rgba(250, 204, 21, 0.5)',
  },
  statusEnded: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  statusDefault: {
    backgroundColor: 'rgba(156, 163, 175, 0.3)',
    borderColor: 'rgba(156, 163, 175, 0.5)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  soldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  soldLabel: {
    color: '#9ca3af',
    fontSize: 10,
  },
  soldCount: {
    color: '#f3f4f6',
    fontSize: 12,
    fontWeight: '500',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: '#9ca3af',
    fontSize: 10,
  },
  timeSeparator: {
    color: '#9ca3af',
    fontSize: 10,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockText: {
    color: '#9ca3af',
    fontSize: 10,
  },
  // Modal Styles
  multiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  multiModalContent: {
    backgroundColor: '#111827',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  multiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  multiModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#a78bfa',
  },
  multiModalCloseButton: {
    padding: 4,
    borderRadius: 6,
  },
});

export default LiveStreamFlashSaleSeller;
