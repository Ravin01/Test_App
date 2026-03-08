import React, { memo, useCallback, useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native-paper';
import { AWS_CDN_URL } from '../../Utils/aws';
import { AuthContext } from '../../Context/AuthContext';
import { Toast } from '../../Utils/dateUtils';
import CheckoutSlider from '../Reuse/CheckOutGlobal';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32; // Full width with padding

interface Product {
  _id: string;
  title?: string;
  description?: string;
  productPrice?: number;
  MRP?: number;
  images?: Array<{ key: string }>;
  sellerCompanyName?: string;
  sellerId?: string | { _id: string };
  sellerUserName?: string;
  isInWishlist?: boolean;
  flashSale?: {
    isActive: boolean;
    flashPrice?: number;
    originalPrice?: number;
    endsAt?: string;
  };
}

interface TrendingListItemProps {
  product: Product;
  rank: number;
  onSave?: (id: string) => void;
}

const formatCurrency = (amount: number | undefined): string => {
  if (amount == null || isNaN(amount)) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const calculateDiscount = (mrp: number, price: number): number => {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

const TrendingListItem: React.FC<TrendingListItemProps> = memo(({ product, rank, onSave }) => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [isInWishlist, setIsInWishlist] = useState(product?.isInWishlist);
  const [loading, setLoading] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  // Check if product is in active flash sale
  const isFlashSale = product?.flashSale?.isActive;
  const flashData = product?.flashSale;
  const hasValidFlashData = isFlashSale && flashData?.flashPrice && flashData?.endsAt;

  // Get image URL
  const imageKey = product?.images?.[0]?.key;
  const imageUrl = imageKey ? `${AWS_CDN_URL}${imageKey}` : '';

  // Calculate discount
  const discountPercent = hasValidFlashData
    ? calculateDiscount(flashData.originalPrice || 0, flashData.flashPrice || 0)
    : calculateDiscount(product?.MRP || 0, product?.productPrice || 0);

  // Determine which price to display
  const displayPrice = hasValidFlashData ? flashData.flashPrice : product?.productPrice;
  const originalPrice = hasValidFlashData ? flashData.originalPrice : product?.MRP;

  const handleSave = useCallback(() => {
    if (!onSave) return;
    try {
      setLoading(true);
      onSave(product._id);
      setIsInWishlist(!isInWishlist);
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  }, [onSave, product._id, isInWishlist]);

  const handleProductPress = useCallback(() => {
    navigation.navigate('ProductDetails', {
      id: product._id,
      flashSale: hasValidFlashData ? flashData : null,
      type: 'static',
    });
  }, [navigation, product._id, hasValidFlashData, flashData]);

  const handleBuyNow = useCallback(() => {
    const sellerId = typeof product.sellerId === 'string' 
      ? product.sellerId 
      : product.sellerId?._id;

    if (user?.sellerInfo?._id === sellerId && user?.role === 'seller') {
      Toast('You cannot purchase your own product');
    } else {
      setShowCheckOut(true);
    }
  }, [product.sellerId, user]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleProductPress}
        style={styles.card}>
        {/* Rank Badge */}
        <View style={styles.rankBadge}>
          <LinearGradient
            colors={rank <= 3 ? ['#FFD700', '#FFA500'] : ['#444', '#666']}
            style={styles.rankGradient}>
            <Text style={styles.rankText}>#{rank}</Text>
          </LinearGradient>
        </View>

        {/* Product Image */}
        <View style={styles.imageContainer}>
          <FastImage
            source={{
              uri: imageUrl,
              priority: FastImage.priority.high,
            }}
            style={styles.productImage}
            resizeMode={FastImage.resizeMode.cover}
          />

          {/* Top gradient overlay for badges */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.4)', 'transparent']}
            style={styles.topGradient}
            pointerEvents="none"
          />

          {/* Flash Sale or Discount Badge */}
          <View style={styles.badgeContainer}>
            {hasValidFlashData ? (
              <LinearGradient
                colors={['#dc2626', '#ef4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.flashBadge}>
                <Ionicons name="flash" size={14} color="#fff" />
                <Text style={styles.flashText}>
                  FLASH {discountPercent > 0 && `-${discountPercent}%`}
                </Text>
              </LinearGradient>
            ) : (
              discountPercent > 0 && (
                <LinearGradient
                  colors={['#F2231F', '#F2231F']}
                  style={styles.discountBadge}>
                  <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                </LinearGradient>
              )
            )}
          </View>

          {/* Wishlist Button */}
          {onSave && (
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.wishlistButton,
                { backgroundColor: isInWishlist ? '#F2231F' : 'rgba(255, 255, 255, 0.3)' },
              ]}
              activeOpacity={0.7}>
              {loading ? (
                <ActivityIndicator color="#fff" size={16} />
              ) : (
                <AntDesign name="heart" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Product Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product?.title || 'No Title Provided'}
          </Text>

          <Text style={styles.description} numberOfLines={1}>
            {product?.description || 'No description available'}
          </Text>

          {/* Seller Info */}
          {product?.sellerCompanyName && (
            <Text style={styles.sellerName} numberOfLines={1}>
              by {product.sellerCompanyName}
            </Text>
          )}

          {/* Price Section */}
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text
                style={[
                  styles.price,
                  { color: hasValidFlashData ? '#ef4444' : '#F7CE45' },
                ]}>
                {formatCurrency(displayPrice)}
              </Text>
              {originalPrice && originalPrice > displayPrice && (
                <Text style={styles.originalPrice}>
                  {formatCurrency(originalPrice)}
                </Text>
              )}
            </View>

            {/* Buy Now Button */}
            <TouchableOpacity
              onPress={handleBuyNow}
              style={styles.buyButton}
              activeOpacity={0.8}>
              <Text style={styles.buyButtonText}>Buy Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Checkout Modal */}
      <CheckoutSlider
        isOpen={showCheckOut}
        product={product}
        onClose={() => setShowCheckOut(false)}
      />
    </View>
  );
});

TrendingListItem.displayName = 'TrendingListItem';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  rankGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rankText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.6,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  flashText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  wishlistButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailsContainer: {
    padding: 16,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#999',
    marginBottom: 6,
  },
  sellerName: {
    fontSize: 12,
    color: '#777',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 13,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  buyButton: {
    backgroundColor: '#F7CE45',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
});

export default TrendingListItem;