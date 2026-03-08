// src/Components/SellerProfile/FlashSaleCard.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { Package, ShoppingCart } from 'lucide-react-native';
import { FlashSale } from '../../Services/flashSaleApi';
import { AWS_CDN_URL } from '../../Utils/aws';
import CheckoutSlider from '../Reuse/CheckOutGlobal';

interface FlashSaleCardProps {
  sale: FlashSale;
  navigation?: any;
}

// Countdown Timer Components
const TimerSegment = ({ value, label, totalSeconds }: { value: number; label: string; totalSeconds: number }) => (
  <View style={styles.timerSegment}>
    {label === 'Mins' && totalSeconds > 0 && totalSeconds < 60 ? (
      <Text style={styles.timerValue}>{'< 1'}</Text>
    ) : (
      <Text style={styles.timerValue}>{String(value).padStart(2, '0')}</Text>
    )}
    <Text style={styles.timerLabel}>{label}</Text>
  </View>
);

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(targetDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const totalSeconds =
    timeLeft.days * 86400 +
    timeLeft.hours * 3600 +
    timeLeft.minutes * 60 +
    timeLeft.seconds;

  return (
    <View style={styles.timerContainer}>
      <TimerSegment value={timeLeft.days} label="Days" totalSeconds={totalSeconds} />
      <Text style={styles.timerColon}>:</Text>
      <TimerSegment value={timeLeft.hours} label="Hrs" totalSeconds={totalSeconds} />
      <Text style={styles.timerColon}>:</Text>
      <TimerSegment value={timeLeft.minutes} label="Mins" totalSeconds={totalSeconds} />
    </View>
  );
};

export const FlashSaleCard: React.FC<FlashSaleCardProps> = ({
  sale,
  navigation
}) => {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handleBuyNow = (item: any) => {
    setSelectedProduct(item.productId);
    setCheckoutOpen(true);
  };

  const handleCloseCheckout = () => {
    setCheckoutOpen(false);
    setSelectedProduct(null);
  };

  const calculateDiscount = (original: number, flash: number) => {
    if (!original || !flash || original <= flash) return 0;
    return Math.round(((original - flash) / original) * 100);
  };

  return (
    <View style={styles.flashGrid}>
      {sale?.products?.map((item, index) => {
        const discount = calculateDiscount(item.originalPrice, item.flashPrice);
        const stock = item.currentFlashStock || 0;
        const isOutOfStock = stock === 0;

        return (
          <TouchableOpacity
            key={item.productId._id || index}
            onPress={() => {
              if(sale?.isLive){
                navigation.navigate('ProductDetails', {
                  id: item?.productId?._id,
                  flashSale: item,
                  type:'flash_sale'
                });
              }
              else{
                console.log("THIS ONE WORKS")
                navigation.navigate('ProductDetails', {
                  id: item?.productId?._id,
                  type:'static'
                });
              }
            }}
            style={styles.productCard}>
              {/* Product Image with Overlays */}
              <View style={styles.productImage}>
                <Image
                  source={{ uri: `${AWS_CDN_URL}${item.productId.images[0]?.key}` }}
                  style={styles.image}
                />

                {/* Countdown Timer - Top Left */}
                {sale?.isLive && sale.endTime && (
                  <View style={styles.timerWrapper}>
                    <CountdownTimer targetDate={sale.endTime} />
                  </View>
                )}

                {!sale?.isLive && sale.startTime && (
                  <View style={styles.timerWrapper}>
                    <CountdownTimer targetDate={sale.startTime} />
                  </View>
                )}

                {/* Discount Badge - Top Right */}
                {discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discount}%</Text>
                  </View>
                )}

                {/* Stock Badge - Bottom Right */}
                <View style={styles.stockBadge}>
                  <Package size={10} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.stockText}>{stock}</Text>
                </View>
              </View>
              
              <Text allowFontScaling={false} numberOfLines={1} ellipsizeMode="tail" style= {{color: '#fff', fontSize: 10, marginBottom: 5}}>{item?.productId?.title ?? 'Untitled product'}</Text>
              
              {/* Prices */}
              <Text style={styles.flashPrice}>
                ₹{item.flashPrice?.toFixed(2)}
              </Text>
              <Text style={styles.originalPrice}>
                ₹{item.originalPrice?.toFixed(2)}
              </Text>

              {/* Buy Now Button - Only show if live */}
              {sale?.isLive && (
                <TouchableOpacity
                  // onPress={(e: any) => {
                  //   e.stopPropagation();
                  //   handleBuyNow(item);
                  // }}
                  onPress={() => {
                if(sale?.isLive){
                navigation.navigate('ProductDetails', {
                  id: item?.productId?._id,
                  flashSale: item,
                  type:'flash_sale'
                });
              }
                else{
                  console.log("THIS ONE WORKS")
                  navigation.navigate('ProductDetails', {
                  id: item?.productId?._id,
                  type:'static'
                });}
              }}
                  disabled={isOutOfStock}
                  style={[
                    styles.buyNowButton,
                    isOutOfStock && styles.buyNowButtonDisabled,
                  ]}>
                  {isOutOfStock ? (
                    <Text style={styles.buyNowTextDisabled}>Out of Stock</Text>
                  ) : (
                    <>
                      <ShoppingCart size={14} color="#000" strokeWidth={2.5} />
                      <Text style={styles.buyNowText}>shop Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
          </TouchableOpacity>
        );
      })}

      {/* Sale Stats for Live Sales */}
      {/* {sale?.isLive && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Sold:</Text>
            <Text style={styles.statValue}>{sale.totalSold}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Revenue:</Text>
            <Text style={styles.statValue}>₹{sale.revenue.toLocaleString()}</Text>
          </View>
        </View>
      )} */}

      {/* Checkout Modal */}
      {checkoutOpen && selectedProduct && (
        <CheckoutSlider
          isOpen={checkoutOpen}
          onClose={handleCloseCheckout}
          product={selectedProduct}
          type="flash_sale"
          flashSaleId={sale._id}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flashGrid: {flexDirection: 'row', gap: 6, paddingHorizontal: 0, marginTop: 8},
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  liveBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  upcomingBadge: {
    backgroundColor: '#333',
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  upcomingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  saleTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  productList: {
    paddingVertical: 4,
  },
  productCard: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 8,
   // paddingBottom: 2,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,0,64,0.2)',
    width: 130,  //140,
    shadowColor: 'red',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  productImage: {
    height: 105,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#333',
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  timerWrapper: {
    position: 'absolute',
    top: 1,
    left: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 3,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  timerSegment: {
    alignItems: 'center',
    minWidth: 22,
  },
  timerValue: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  timerLabel: {
    fontSize: 6,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
  },
  timerColon: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    paddingBottom: 6,
  },
  discountBadge: {
    position: 'absolute',
    top: -1,
    right: -4,
    backgroundColor: '#ff0040',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  stockBadge: {
    position: 'absolute',
    bottom: -1,
    right: -4,
    backgroundColor: 'green',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stockText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  flashPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 2,
  },
  originalPrice: {
    fontSize: 9,
    color: '#666',
    textDecorationLine: 'line-through',
    marginBottom: 2,  //6,
  },
  buyNowButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
    width: '100%',
  },
  buyNowButtonDisabled: {
    backgroundColor: '#4a4a4a',
    opacity: 0.6,
  },
  buyNowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  buyNowTextDisabled: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
  },
  statValue: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
});