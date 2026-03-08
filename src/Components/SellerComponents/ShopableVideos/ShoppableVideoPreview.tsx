import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Image,
  Alert,
  ToastAndroid,
  Platform,
  StatusBar,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import {
  ArrowLeft,
  ShoppingBag,
  Tag,
  Calendar,
  Play,
  Pause,
  Package,
  AlertCircle,
  RefreshCw,
  Share2,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';
import moment from 'moment';
import api from '../../../Utils/Api';
import { AWS_CDN_URL, generateSignedVideoUrl } from '../../../Utils/aws';
import { colors } from '../../../Utils/Colors';
import ShareModal from '../../Reuse/ShareModal';
import { useAuthContext } from '../../../Context/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import { shareUrl } from '../../../../Config';

const { width, height } = Dimensions.get('window');

interface Product {
  _id: string;
  title: string;
  productPrice: number;
  MRP?: number;
  quantity: number;
  images?: Array<{ key: string }>;
}

interface VideoData {
  _id: string;
  title: string;
  category?: string;
  subcategory?: string;
  createdAt: string;
  productsListed?: Product[];
  host?: {
    userInfo?: {
      name: string;
      userName: string;
      profileURL?: { key: string };
    };
  };
  hashTags?: string[];
  thumbnailBlobName?: string;
  masterPlaylistKey?: string;
  originalVideoBlobName?: string;
  approvalStatus?: string;
}

interface ShoppableVideoDetailProps {
  route: {
    params: {
      videoId: string;
    };
  };
  navigation: any;
}

const ShoppableVideoPreview: React.FC<ShoppableVideoDetailProps> = ({
  route,
  navigation,
}) => {
  const { videoId } = route.params;
  const { user } = useAuthContext();
  
  // State management
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<{
    [key: string]: number;
  }>({});
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs
  const videoRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const imageRotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoContainerRef = useRef<View>(null);

  // Fetch video details with AbortController
  const fetchVideoDetails = useCallback(async () => {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/shoppable-videos/${videoId}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response data');
      }

      const videoData = response.data.data;
      setVideo(videoData);

      // Initialize image indices for all products
      const initialImageIndices: { [key: string]: number } = {};
      if (videoData.productsListed) {
        videoData.productsListed.forEach((product: Product) => {
          initialImageIndices[product._id] = 0;
        });
      }
      setSelectedImageIndex(initialImageIndices);

      // Setup video URL
      await setupVideoUrl(videoData);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        console.log('Request was aborted');
        return;
      }
      console.error('Error fetching video details:', err);
      setError(err.message || 'Failed to load video details');
      showToast('Failed to load video details');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  // Setup video URL
  const setupVideoUrl = async (videoData: VideoData) => {
    try {
      let sourceToPlay = '';

      if (videoData.masterPlaylistKey) {
        // HLS video (CDN)
        sourceToPlay = `${AWS_CDN_URL}${videoData.masterPlaylistKey}`;
      } else if (videoData.originalVideoBlobName) {
        // Generate signed URL for original video
        sourceToPlay = await generateSignedVideoUrl(
          videoData.originalVideoBlobName
        );
      }

      setVideoUrl(sourceToPlay);
      setVideoError(false);
    } catch (err) {
      console.error('Error setting up video URL:', err);
      setVideoError(true);
      showToast('Failed to load video');
    }
  };

  // Image rotation for hovered product
  useEffect(() => {
    if (hoveredProduct && video?.productsListed) {
      const product = video.productsListed.find(
        (p) => p._id === hoveredProduct
      );
      if (product && product.images && product.images.length > 1) {
        imageRotationTimerRef.current = setInterval(() => {
          setSelectedImageIndex((prev) => ({
            ...prev,
            [hoveredProduct]:
              ((prev[hoveredProduct] || 0) + 1) % product.images!.length,
          }));
        }, 2000);
      }
    }

    return () => {
      if (imageRotationTimerRef.current) {
        clearInterval(imageRotationTimerRef.current);
      }
    };
  }, [hoveredProduct, video?.productsListed]);

  // Fetch video details on mount
  useEffect(() => {
    fetchVideoDetails();

    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (imageRotationTimerRef.current) {
        clearInterval(imageRotationTimerRef.current);
      }
    };
  }, [fetchVideoDetails]);

  // Handle back button
  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Toast helper
  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message);
    }
  };

  // Handle video play/pause
  const handleVideoPlayPause = () => {
    setIsVideoPlaying(!isVideoPlaying);
  };

  // Handle share
  const handleShare = () => {
    if (video?.approvalStatus !== 'approved') {
      showToast('Video must be approved before sharing');
      return;
    }
    setShowShareModal(true);
  };

  // Get share URL
  const getShoppableVideoShareUrl = () => {
    return `${shareUrl}user/reel/${videoId}`;
  };

  // Handle retry
  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(retryCount + 1);
      fetchVideoDetails();
    } else {
      showToast('Maximum retry attempts reached');
    }
  };

  // Get user initials
  const getUserInitials = (userName?: string) => {
    if (!userName) return '?';
    const alphanumericChars = userName.replace(/[^a-zA-Z0-9]/g, '');
    if (!alphanumericChars) return '?';
    return alphanumericChars.substring(0, 2).toUpperCase();
  };

  // Render product item
  const renderProduct = ({ item: product }: { item: Product }) => {
    const hasOffer =
      product.MRP &&
      product.productPrice &&
      product.MRP > product.productPrice;
    const discount = hasOffer
      ? Math.round(((product.MRP - product.productPrice) / product.MRP) * 100)
      : 0;
    const isOutOfStock = product.quantity === 0;

    const currentImageIndex = selectedImageIndex[product._id] || 0;
    const imageUrl =
      product.images && product.images[currentImageIndex]
        ? `${AWS_CDN_URL}${product.images[currentImageIndex].key}`
        : null;

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          isOutOfStock && styles.productCardOutOfStock,
        ]}
        onPress={() => {
          if (!isOutOfStock) {
            navigation.navigate('ProductDetail', { productId: product._id });
          }
        }}
        onPressIn={() => setHoveredProduct(product._id)}
        onPressOut={() => setHoveredProduct(null)}
        activeOpacity={0.7}
        disabled={isOutOfStock}>
        <View style={styles.productImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.productImagePlaceholder]}>
              <Package size={40} color="#555" />
            </View>
          )}
          {hasOffer && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Lock size={24} color="#fff" />
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.title || 'Unnamed Product'}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              ₹{product.productPrice?.toLocaleString() || 'N/A'}
            </Text>
            {hasOffer && (
              <Text style={styles.productMRP}>
                ₹{product.MRP?.toLocaleString()}
              </Text>
            )}
          </View>
          <View style={styles.stockRow}>
            {isOutOfStock ? (
              <View style={styles.stockBadgeOut}>
                <AlertCircle size={14} color="#EF4444" />
                <Text style={styles.stockTextOut}>Out of Stock</Text>
              </View>
            ) : (
              <View style={styles.stockBadge}>
                <CheckCircle2 size={14} color={colors.primaryButtonColor} />
                <Text style={styles.stockText}>
                  {product.quantity} Available
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render header - Memoized to prevent video flickering
  const renderHeader = useCallback(() => {
    const hostInfo = video?.host?.userInfo;

    return (
      <View>
        {/* Video Player */}
        <View style={styles.videoContainer}>
          {videoUrl ? (
            <View style={styles.videoWrapper}>
              <Video
                ref={videoRef}
                source={{ uri: videoUrl }}
                style={styles.video}
                resizeMode="contain"
                paused={!isVideoPlaying}
                poster={
                  video?.thumbnailBlobName
                    ? `${AWS_CDN_URL}${video.thumbnailBlobName}`
                    : undefined
                }
                onError={(error) => {
                  console.error('Video error:', error);
                  setVideoError(true);
                  showToast('Failed to play video');
                }}
                onLoad={() => setVideoError(false)}
                controls={true}
              />
              {/* {!isVideoPlaying && (
                <TouchableOpacity
                  style={styles.playOverlay}
                  onPress={handleVideoPlayPause}
                  activeOpacity={0.7}>
                  <View style={styles.playButton}>
                    <Play size={32} color="#fff" fill="#fff" />
                  </View>
                </TouchableOpacity>
              )}
              {isVideoPlaying && (
                <TouchableOpacity
                  style={styles.pauseOverlay}
                  onPress={handleVideoPlayPause}
                  activeOpacity={0.7}>
                  <View style={styles.pauseButton}>
                    <Pause size={32} color="#fff" fill="#fff" />
                  </View>
                </TouchableOpacity>
              )} */}
              {videoError && (
                <View style={styles.videoErrorContainer}>
                  <AlertCircle size={48} color="#EF4444" />
                  <Text style={styles.videoErrorText}>
                    Failed to load video
                  </Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRetry}>
                    <RefreshCw size={16} color="#fff" />
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.videoPlaceholder}>
              <ActivityIndicator size="large" color={colors.primaryButtonColor} />
              <Text style={styles.videoLoadingText}>Loading video...</Text>
            </View>
          )}
        </View>

        {/* Host Info */}
        {hostInfo && (
          <View style={styles.hostCard}>
            <View style={styles.hostAvatar}>
              {hostInfo.profileURL?.key ? (
                <Image
                  source={{
                    uri: `${AWS_CDN_URL}${hostInfo.profileURL.key}`,
                  }}
                  style={styles.hostAvatarImage}
                />
              ) : (
                <Text style={styles.hostAvatarText}>
                  {getUserInitials(hostInfo.userName)}
                </Text>
              )}
            </View>
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>{hostInfo.name}</Text>
              <Text style={styles.hostUsername}>@{hostInfo.userName}</Text>
            </View>
          </View>
        )}

        {/* Hashtags */}
        {video?.hashTags && video.hashTags.length > 0 && (
          <View style={styles.hashtagsContainer}>
            {video.hashTags.map((tag, index) => (
              <View key={index} style={styles.hashtagBadge}>
                <Text style={styles.hashtagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Products Header */}
        <View style={styles.productsHeader}>
          <LinearGradient
            colors={['#F7CE45', '#B38728']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.productsHeaderGradient}>
            <ShoppingBag size={24} color="#000" />
            <Text style={styles.productsHeaderText}>Featured Products</Text>
          </LinearGradient>
          <Text style={styles.productsCount}>
            {video?.productsListed?.length || 0} items
          </Text>
        </View>
      </View>
    );
  }, [video, videoUrl, isVideoPlaying, videoError, handleVideoPlayPause, handleRetry, getUserInitials]);

  // Render empty products
  const renderEmptyProducts = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Package size={60} color="#555" />
      </View>
      <Text style={styles.emptyTitle}>No Products Available</Text>
      <Text style={styles.emptyDescription}>
        This video doesn't have any featured products yet.
      </Text>
    </View>
  );

  // Render footer
  const renderFooter = () => {
    if (!video?.productsListed || video.productsListed.length === 0) {
      return null;
    }
    return <View style={styles.footerSpacing} />;
  };

  // Loading state
  if (loading && !video) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.primaryColor}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryButtonColor} />
          <Text style={styles.loadingText}>Loading Experience...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (!loading && error && !video) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.primaryColor}
        />
        <View style={styles.errorContainer}>
          <AlertCircle size={60} color="#EF4444" />
          <Text style={styles.errorTitle}>Could not load video</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={handleRetry}>
            <RefreshCw size={20} color="#000" />
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primaryColor}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {video?.title || 'Untitled Video'}
          </Text>
          <View style={styles.headerSubtitle}>
            <Calendar size={12} color={colors.primaryButtonColor} />
            <Text style={styles.headerSubtitleText}>
              {video?.createdAt
                ? moment(video.createdAt).format('MMM DD, YYYY')
                : 'N/A'}
            </Text>
            {video?.category && (
              <>
                <Tag size={12} color={colors.primaryButtonColor} />
                <Text style={styles.headerSubtitleText}>{video.category}</Text>
              </>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          disabled={video?.approvalStatus !== 'approved'}
          activeOpacity={0.7}>
          <Share2
            size={22}
            color={
              video?.approvalStatus === 'approved' ? '#fff' : 'rgba(255,255,255,0.3)'
            }
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={video?.productsListed || []}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyProducts}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />

      {/* Share Modal */}
      {showShareModal && video && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          source="shoppable_video"
          shareUrl={getShoppableVideoShareUrl()}
          shareContent={`Check out ${video.title || 'this shoppable video'} on Flykup!`}
          onShare={() => {
            setShowShareModal(false);
            showToast('Video shared successfully!');
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#888',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerSubtitleText: {
    fontSize: 12,
    color: '#888',
  },
  shareButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  videoContainer: {
    width: width,
    height: height * 0.5,
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLoadingText: {
    marginTop: 12,
    color: '#888',
    fontSize: 14,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pauseButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  videoErrorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  videoErrorText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  hostAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primaryButtonColor,
    overflow: 'hidden',
  },
  hostAvatarImage: {
    width: '100%',
    height: '100%',
  },
  hostAvatarText: {
    color: colors.primaryButtonColor,
    fontSize: 20,
    fontWeight: 'bold',
  },
  hostInfo: {
    marginLeft: 12,
    flex: 1,
  },
  hostName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  hostUsername: {
    fontSize: 14,
    color: '#888',
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  hashtagBadge: {
    backgroundColor: 'rgba(247, 206, 69, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.3)',
  },
  hashtagText: {
    color: colors.primaryButtonColor,
    fontSize: 12,
    fontWeight: '600',
  },
  productsHeader: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  productsHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  productsHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  productsCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  productCard: {
    backgroundColor: colors.SecondaryColor,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  productCardOutOfStock: {
    opacity: 0.6,
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  productInfo: {
    padding: 16,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
    gap: 8,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryButtonColor,
  },
  productMRP: {
    fontSize: 14,
    color: '#888',
    textDecorationLine: 'line-through',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  stockText: {
    color: colors.primaryButtonColor,
    fontSize: 12,
    fontWeight: '600',
  },
  stockBadgeOut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  stockTextOut: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footerSpacing: {
    height: 20,
  },
});

export default ShoppableVideoPreview;
