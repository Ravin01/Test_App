import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  PixelRatio,
} from 'react-native';
import { AWS_CDN_URL } from '../../../Config';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FlashSaleTimer from '../GloabalSearch/FlashSaleTimer';

const responsiveFontSize = (size: number) => {
  const scale = PixelRatio.getFontScale();
  return size * scale;
};

interface Product {
  _id: string;
  title: string;
  productPrice: number;
  MRP?: number;
  images?: Array<{ key: string }>;
  isInWishlist?: boolean;
  flashSale?: {
    isActive: boolean;
    flashPrice?: number;
    originalPrice?: number;
    endsAt?: string;
  };
}

interface TrendingNowProps {
  products: Product[];
  loadingProducts: boolean;
  isTopSellersFullScreen: boolean;
  onProductPress: (productId: string, flashSale?: any) => void;
  onViewAllPress: () => void;
  formatCurrency: (amount: number) => string;
}

const TrendingNow: React.FC<TrendingNowProps> = ({
  products,
  loadingProducts,
  isTopSellersFullScreen,
  onProductPress,
  onViewAllPress,
  formatCurrency,
}) => {
  const renderRecommendedItem = ({ item, index }: { item: Product; index: number }) => {
    if (!item) return null;
    
    // Check if product is in active flash sale
    const isFlashSale = item?.flashSale?.isActive;
    const flashData = item?.flashSale;
    const hasValidFlashData = isFlashSale && flashData?.flashPrice && flashData?.endsAt;
    
    const price = hasValidFlashData ? flashData.flashPrice : item?.productPrice;
    const mrp = hasValidFlashData ? flashData.originalPrice : item?.MRP;
    const hasDiscount = mrp != null && price != null && mrp > price;
    const discountPercent = hasDiscount
      ? Math.round(((mrp - price) / mrp) * 100)
      : 0;

    return (
      <TouchableOpacity
        key={item._id}
        style={styles.trendingItem}
        onPress={() => onProductPress(item._id, hasValidFlashData ? flashData : null)}>
        <Text style={styles.trendingRank}>#{index + 1 || 'N/A'}</Text>

        <View style={{ position: 'relative' }}>
          <Image
            source={{
              uri: item?.images?.[0]?.key
                ? `${AWS_CDN_URL}${item?.images[0].key}`
                : undefined,
            }}
            style={styles.trendingImage}
            resizeMode="cover"
          />
          
          {/* FLASH badge at top left */}
          {hasValidFlashData && (
            <View style={{ position: 'absolute', top: 2, left: 2, zIndex: 10 }}>
              <LinearGradient
                colors={['#dc2626', '#ef4444']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={{ borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  <Ionicons name="flash" size={8} color="#fff" />
                </View>
              </LinearGradient>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.trendingTitle} numberOfLines={3} ellipsizeMode="tail">
            {item?.title || 'No Title Provided'}
          </Text>
          {hasValidFlashData && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
              <Text style={{ fontSize: 9, color: '#ff6b6b', fontWeight: '600' }}>Ends in:</Text>
              <FlashSaleTimer endsAt={flashData.endsAt} />
            </View>
          )}
        </View>
        <View>
          <Text style={styles.trendingPrice}>{formatCurrency(price)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!loadingProducts && (!products || products.length === 0)) {
    return null;
  }

  return (
    <View style={styles.recommendationsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{'📈 Trending Now'}</Text>

        <TouchableOpacity onPress={onViewAllPress}>
          <Text style={styles.seeAll}>
            {isTopSellersFullScreen ? 'Shrink' : 'View all →'}
          </Text>
        </TouchableOpacity>
      </View>

      {loadingProducts ? (
        <ActivityIndicator size="small" color="#F7CE45" />
      ) : (
        <FlatList
          data={products}
          renderItem={renderRecommendedItem}
          keyExtractor={(item, index) => item?._id?.toString() ?? index.toString()}
          showsHorizontalScrollIndicator={false}
          style={styles.recommendationsScroll}
          scrollEnabled={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  recommendationsContainer: {
    paddingHorizontal: 0,
    marginTop: 0,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    marginHorizontal: 2,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  seeAll: {
    fontSize: 14,
    color: '#F7CE45',
    fontWeight: '500',
    marginRight: 4,
  },
  recommendationsScroll: {
    // marginTop: 8,
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 10,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  trendingRank: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFD700',
    minWidth: 25,
  },
  trendingImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  trendingTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  trendingPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD700',
  },
});

export default TrendingNow;
