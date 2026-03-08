import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import {Package, ShoppingCart} from 'lucide-react-native';

import {AWS_CDN_URL} from '../../../Config';
import CheckoutSlider from '../Reuse/CheckOutGlobal';
import {useCountdown} from './hooks/useCountdown';

//import {useCountdownBG} from './hooks/useCountdownBG';

// Countdown Timer Component
const TimerSegment = ({value, label, totalSeconds}) => (
  <View style={styles.timerSegment}>
    {label === 'Mins' && totalSeconds > 0 && totalSeconds < 60 ? (
      <Text style={styles.timerValue}>{'< 1'}</Text>
    ) : (
      <Text style={styles.timerValue}>{String(value).padStart(2, '0')}</Text>
    )}
    <Text style={styles.timerLabel}>{label}</Text>
  </View>
);

const CountdownTimer = ({targetDate}) => {
   const {days, hours, minutes, seconds} = useCountdown(targetDate);

  //const {days, hours, minutes, seconds} = useCountdownBG(targetDate);

  const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;

  return (
    <View style={styles.timerContainer}>
      <TimerSegment value={days} label="Days" totalSeconds={totalSeconds} />
      <Text style={styles.timerColon}>:</Text>
      <TimerSegment value={hours} label="Hrs" totalSeconds={totalSeconds} />
      <Text style={styles.timerColon}>:</Text>
      <TimerSegment value={minutes} label="Mins" totalSeconds={totalSeconds} />
    </View>
  );
};

const FlashGrid = ({sale, isLoading, navigation}) => {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  if (isLoading) {
    return <Text style={{color: '#fff'}}>Loading...</Text>;
  }

  const handleCloseCheckout = () => {
    setCheckoutOpen(false);
    setSelectedProduct(null);
  };

  return (
    <View style={styles.flashGrid}>
      {sale?.products?.map((item, index) => {
        const original = item?.originalPrice || 0;
        const flash = item?.flashPrice || 0;

        const discount =
          original && flash && original > flash
            ? Math.round(((original - flash) / original) * 100)
            : 0;

        const stock = item?.productId?.stockId?.quantity || 0;
          const isLowStock = stock <= 10 && stock > 0;
        const isOutOfStock = stock === 0;

          //console.log("Stock:", stock);

          // console.log("Live Sales:", sale);

        return (
          <TouchableOpacity
            key={item._id || index}
            onPress={() => {
              if (sale.isLive) {
                navigation.navigate('ProductDetails', {
                  id: item?.productId?._id,
                  flashSale: item,
                  type: 'flash_sale',
                });
              } else {
                navigation.navigate('ProductDetails', {
                  id: item?.productId?._id,
                  type: 'static',
                });
              }
            }}
            style={styles.flashItem}>
            {/* Image */}
            <View style={styles.flashImage}>
              <Image
                source={{
                  uri: item?.productId?.images?.[0]?.key
                    ? `${AWS_CDN_URL}${item?.productId?.images[0].key}`
                    : undefined,
                }}
                style={{width: '100%', height: '100%'}}
              />

              {/* Countdown Timer */}
              {sale?.isLive &&
                (sale?.endTime || item?.productId?.flashSale?.endsAt) && (
                  <View style={styles.timerWrapper}>
                    <CountdownTimer
                      targetDate={sale?.endTime || item.productId.flashSale.endsAt}
                    />
                  </View>
                )}

              {!sale?.isLive &&
                (sale.startTime || item?.productId?.flashSale?.startsAt) && (
                  <View style={styles.timerWrapper}>
                    <CountdownTimer
                      targetDate={sale.startTime || item.productId.flashSale.startsAt}
                    />
                  </View>
                )}

              {/* Discount Badge */}
              {discount > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{discount}%</Text>
                </View>
              )}

              {/* Stock Badge */}
              <View style={styles.stockBadge}>
                <Package size={10} color="#fff" strokeWidth={2.5} />
                <Text style={styles.discountText}>{stock}</Text>
              </View>
            </View>
          
            <Text allowFontScaling={false} numberOfLines={1} ellipsizeMode="tail" style= {{color: '#fff', fontSize: 10, marginBottom: 5}}>{item?.productId?.title ?? 'Untitled product'}</Text>

            {/* Price */}
            <Text style={styles.flashPrice}>
              {item?.flashPrice ? `₹${item?.flashPrice.toFixed(2)}` : '₹--'}
            </Text>
            <Text style={styles.flashOriginal}>
              {item?.originalPrice ? `₹${item?.originalPrice.toFixed(2)}` : ''}
            </Text>

            {/* Buy Now Button */}
            {sale?.isLive && (
              <TouchableOpacity
                onPress={() => {
                  if (sale.isLive) {
                    navigation.navigate('ProductDetails', {
                      id: item?.productId?._id,
                      flashSale: item,
                      type: 'flash_sale',
                    });
                  } else {
                    navigation.navigate('ProductDetails', {
                      id: item?.productId?._id,
                      type: 'static',
                    });
                  }
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
                    <Text style={styles.buyNowText}>Shop now</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}

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
  flashGrid: {
    flexDirection: 'row',
    //gap: 6,
    gap: 2,
    paddingHorizontal: 0,
    marginTop: 8,
   // backgroundColor:'red'
  },
  flashItem: {
    shadowColor: 'red',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 8,
   // paddingBottom: 2,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,0,64,0.2)',
    width: 130,   //140
    marginRight: 6,
  },
  flashImage: {
    height: 100,
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#333',
    overflow: 'hidden',
    marginBottom: 6,
    alignItems: 'flex-end',
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
  discountText: {fontSize: 9, fontWeight: '700', color: '#fff'},
  flashPrice: {fontSize: 12, fontWeight: '700', color: '#FFD700'},
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
  flashOriginal: {
    fontSize: 9,
    color: '#666',
    textDecorationLine: 'line-through',
    marginBottom: 2,  //6,
  },
  buyNowButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 3,  //6,
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
    minWidth: 19,  //22,
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
});

export default React.memo(FlashGrid);
