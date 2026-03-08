import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Zap, Clock, Package } from 'lucide-react-native';
import { AWS_CDN_URL } from '../../../../../Config';
import { AuthContext } from '../../../../Context/AuthContext';
import { Toast } from '../../../../Utils/dateUtils';
import { flashbuynow } from '../../../../assets/assets';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FlashSaleProps {
  activeFlashSales: any[];
  currentTime: number;
  onPurchase: (flashSaleId: string, productId: string, quantity: number) => Promise<void>;
  requireAuth?: (callback: () => void) => void;
  navigation: any;
  formatTime: (seconds: number) => string;
  calculateTimeLeft: (endTime: string, currentTime: number) => number;
  calculateProgress: (startTime: string, endTime: string, currentTime: number) => number;
  calculateDiscount: (originalPrice: number, flashPrice: number) => number;
  productInterests?: { [key: string]: { isInterested: boolean; count: number } };
}

interface FlashSaleItemProps {
  flashSale: any;
  currentTime: number;
  onPurchase: (flashSaleId: string, productId: string, quantity: number) => Promise<void>;
  requireAuth: (callback: () => void) => void;
  formatTime: (seconds: number) => string;
  calculateTimeLeft: (endTime: string, currentTime: number) => number;
  calculateProgress: (startTime: string, endTime: string, currentTime: number) => number;
  calculateDiscount: (originalPrice: number, flashPrice: number) => number;
  cardWidth: number;
  isInterested?: boolean;
  user: any;
  navigation: any;
}

const LiveFlashSaleOverlay: React.FC<FlashSaleProps> = ({
  activeFlashSales,
  currentTime: propCurrentTime,
  onPurchase,
  requireAuth,
  navigation,
  formatTime,
  calculateTimeLeft,
  calculateProgress,
  calculateDiscount,
  productInterests = {}
}) => {
  const { user } = useContext(AuthContext);
  const [internalCurrentTime, setInternalCurrentTime] = useState(propCurrentTime || Date.now());

  // ✅ INTERNAL TIMER: Manage our own 1-second update to save parent re-renders
  useEffect(() => {
    if (activeFlashSales.length === 0) return;

    const interval = setInterval(() => {
      setInternalCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeFlashSales.length]);

  // Sync with prop if it changes (e.g. initial load)
  useEffect(() => {
    if (propCurrentTime) {
      setInternalCurrentTime(propCurrentTime);
    }
  }, [propCurrentTime]);

  // Filter truly active sales (with time left)
  const trulyActiveSales = activeFlashSales.filter(sale => {
    const timeLeft = calculateTimeLeft(sale.endTime, internalCurrentTime);
    return timeLeft > 0;
  });

  if (trulyActiveSales.length === 0) return null;

  // Calculate card width based on number of sales
  const isSingleCard = trulyActiveSales.length === 1;
  const cardWidth = isSingleCard ? SCREEN_WIDTH * 0.92 : SCREEN_WIDTH * 0.85;
  const CARD_WIDTH = Math.min(cardWidth, 400);
  const CARD_GAP = 12;

  // Calculate snap points for each card
  const snapOffsets = trulyActiveSales.map((_, index) => index * (CARD_WIDTH + CARD_GAP));

  return (
    <View style={styles.overlayContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isSingleCard && styles.scrollContentSingle
        ]}
        style={styles.scrollView}
        decelerationRate={0.985}
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        pagingEnabled={false}
        disableIntervalMomentum={true}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        directionalLockEnabled={true}
        bounces={!isSingleCard}
      >
        {trulyActiveSales?.map((flashSale) => {
          // Determine interest ID based on flash sale type
          const isBundle = flashSale.isBundle || false;
          let itemId;

          if (isBundle) {
            itemId = flashSale.bundleId || flashSale._id;
          } else {
            if (flashSale.productId && typeof flashSale.productId === 'object') {
              itemId = flashSale.productId._id;
            } else if (flashSale.products && flashSale.products[0]) {
              itemId = flashSale.products[0].productId?._id || flashSale.products[0].productId;
            } else {
              itemId = flashSale.productId;
            }
          }

          const isInterested = productInterests[itemId]?.isInterested || false;

          return (
            <FlashSaleOverlayItem
              key={flashSale.flashSaleId || flashSale._id}
              flashSale={flashSale}
              currentTime={internalCurrentTime}
              onPurchase={onPurchase}
              requireAuth={requireAuth}
              formatTime={formatTime}
              calculateTimeLeft={calculateTimeLeft}
              calculateProgress={calculateProgress}
              calculateDiscount={calculateDiscount}
              cardWidth={CARD_WIDTH}
              isInterested={isInterested}
              user={user}
              navigation={navigation}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const FlashSaleOverlayItem = React.memo<FlashSaleItemProps>(({
  flashSale,
  currentTime,
  onPurchase,
  formatTime,
  calculateTimeLeft,
  calculateProgress,
  calculateDiscount,
  cardWidth,
  isInterested = false,
  user,
  navigation
}) => {
  // console.log("FlashSaleOverlayItem - received flashSale data:", JSON.stringify(flashSale, null, 2)); // Log the flashSale);

  const [_isSwiped, setIsSwiped] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const timeLeft = calculateTimeLeft(flashSale.endTime, currentTime);
  const progress = calculateProgress(flashSale.startTime, flashSale.endTime, currentTime);

  // ✅ UPDATED: Support both regular products AND bundles
  const isBundle = flashSale.isBundle || false;

  // Get data based on type
  let imageUrl, title, originalPrice, currentStock, productId;

  if (isBundle) {
    // Bundle flash sale - prefer url, fallback to key
    imageUrl = flashSale.bundleImage?.url ||
      (flashSale.bundleImage?.key ? `${AWS_CDN_URL}${flashSale.bundleImage.key}` : 'https://via.placeholder.com/64');
    title = flashSale.bundleTitle || 'Bundle Flash Sale';
    originalPrice = flashSale.originalPrice || flashSale.bundlePrice || 0;
    currentStock = flashSale.bundleQuantity || 0;
    productId = flashSale.bundleId;
  } else {
    // Regular product flash sale - handle multiple data structures
    const getProductData = () => {
      // Structure B: Direct populated productId object
      if (flashSale.productId && typeof flashSale.productId === 'object') {
        return flashSale.productId;
      }

      // Structure A: Products array with nested product data
      const firstProduct = flashSale.products?.[0];
      if (firstProduct) {
        return {
          _id: firstProduct.productId,
          title: firstProduct.productTitle || flashSale.title || 'Flash Sale Product',
          MRP: firstProduct.originalPrice || 0,
          productPrice: firstProduct.originalPrice || 0,
          images: firstProduct.productImage ? [
            { key: firstProduct.productImage }
          ] : []
        };
      }

      // Fallback
      return {
        _id: flashSale.flashSaleId || flashSale._id,
        title: flashSale.title || 'Flash Sale Product',
        MRP: 0,
        productPrice: 0,
        images: []
      };
    };

    const product = getProductData();
    imageUrl = product.images?.[0]?.key
      ? `${AWS_CDN_URL}${product.images[0].key}`
      : 'https://via.placeholder.com/64';
    title = product.title || 'Flash Sale Product';
    originalPrice = product.MRP || product.productPrice || 0;
    currentStock = flashSale.currentStock ??
      flashSale.products?.[0]?.currentFlashStock ??
      0;
    productId = product._id;
  }

  const flashPrice = flashSale.flashPrice ||
    flashSale.products?.[0]?.flashPrice ||
    0;
  const discount = calculateDiscount(originalPrice, flashPrice);
  const isDisabled = currentStock <= 0;

  // Handle purchase
  const handleBuyNow = async () => {
    // Check if user is logged in
    console.log('handleBuyNow - user:', user);
    if (!user) {
      Toast("Please log in to make a purchase.");
      console.log('User not logged in, navigating to Login screen.')
      navigation?.navigate('Login');
      return;
    }

    setIsSwiped(true);
    try {
      await onPurchase(flashSale.flashSaleId || flashSale._id, productId, 1);
    } catch (error) {
      console.error('Error in handleBuyNow:', error);
    }
  };

  // ✅ Auto-open checkout if user is interested
  useEffect(() => {
    if (isInterested && !hasAutoOpened && !isDisabled && currentStock > 0) {
      const flashSaleId = flashSale.flashSaleId || flashSale._id;
      console.log('🎯 Auto-opening checkout for interested flash sale:', flashSaleId);
      setHasAutoOpened(true);
      handleBuyNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInterested, hasAutoOpened, isDisabled, currentStock]);

  return (
    <Animated.View style={[styles.flashSaleCard, { width: cardWidth }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.flashSaleBadge}>
          <Zap size={20} color="#fbbf24" />
          <Text style={styles.flashSaleText}>
            {isBundle ? '🎁 BUNDLE FLASH SALE' : 'FLASH SALE'}
          </Text>
        </View>
        <View style={styles.timerContainer}>
          <Clock size={16} color="#fbbf24" />
          <Text style={styles.timerText}>
            {formatTime(timeLeft)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.productImage}
        />

        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={1}>
            {title}
          </Text>

          {/* Pricing */}
          <View style={styles.pricingContainer}>
            <Text style={styles.originalPrice}>
              ₹{originalPrice}
            </Text>
            <Text style={styles.flashPrice}>
              ₹{flashPrice}
            </Text>
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {discount}% OFF
                </Text>
              </View>
            )}
          </View>

          {/* Stock and Buy Button */}
          <View style={styles.footer}>
            <View style={styles.stockContainer}>
              <Package size={14} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.stockText}>
                {currentStock} left
              </Text>
            </View>

            {/* Swipe to Buy Button */}
            <TouchableOpacity
              disabled={isDisabled}
              onPress={handleBuyNow}
              activeOpacity={0.1}
              style={[styles.swipeContainer, isDisabled && styles.swipeContainerDisabled]}>
              {!isDisabled && <Image
                source={require('../../../../assets/images/flashbuynow.png')}
                style={styles.swipeButton}
                resizeMode='contain'
              />}
              {/* <Animated.View
                {...panResponder.panHandlers}
                style={[styles.swipeButton, swipeButtonTransform, isDisabled && styles.swipeButtonDisabled]}
              >
                <ShoppingCart size={14} color="#fff" />
                <ChevronRight size={14} color="#fff" />
                <ChevronRight size={14} color="#fff" style={styles.secondChevron} />
              </Animated.View>*/}
              <View style={styles.buttonText}>
                <Text style={styles.buyNowText} allowFontScaling={false}>
                  Buy Now
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: `${progress}%` }
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Return true if props are equal (should NOT re-render)
  // Return false if props are different (should re-render)

  const prevSale = prevProps.flashSale;
  const nextSale = nextProps.flashSale;

  // Always re-render if _lastUpdate changed (force update mechanism)
  if (prevSale._lastUpdate !== nextSale._lastUpdate) {
    return false;
  }

  // Re-render if bundle quantity changed
  if (prevSale.bundleQuantity !== nextSale.bundleQuantity) {
    return false;
  }

  // Re-render if stock changed
  if (prevSale.currentStock !== nextSale.currentStock) {
    return false;
  }

  // Re-render if currentTime changed (for timer)
  if (prevProps.currentTime !== nextProps.currentTime) {
    return false;
  }

  // Otherwise, don't re-render
  return true;
});

// const FlashSaleOverlayItem = React.memo(({
//   flashSale,
//   currentTime,
//   onPurchase,
//   requireAuth,
//   formatTime,
//   calculateTimeLeft,
//   calculateProgress,
//   calculateDiscount
// }) => {
//   console.log("FlashSaleOverlayItem - received flashSale data:", flashSale);

//   const [isSwiped, setIsSwiped] = useState(false);
//   const swipeAnim = useState(new Animated.Value(0))[0];

//   const timeLeft = calculateTimeLeft(flashSale.endTime, currentTime);
//   const progress = calculateProgress(flashSale.startTime, flashSale.endTime, currentTime);

//   const product = flashSale.productId || {}; 
//   //const cdnURL = process.env.VITE_AWS_CDN_URL;

//   const imageUrl = product.images?.[0]?.key
//     ? `${AWS_CDN_URL}${product.images[0].key}` 
//     : 'https://via.placeholder.com/64'; 

//     console.log('imageUrl:', imageUrl);

//   const currentStock = flashSale.currentStock ?? 0;
//   const originalPrice = product.MRP || product.productPrice || 0;
//   const flashPrice = flashSale.flashPrice || 0;
//   const title = product.title || 'Flash Sale';
//   const discount = calculateDiscount(originalPrice, flashPrice);
//   const isDisabled = currentStock <= 0;

//   // Reset swipe state if flash sale ID changes
//   useEffect(() => {
//     setIsSwiped(false);
//     swipeAnim.setValue(0);
//   }, [flashSale.flashSaleId]);

//  // ✅ FIXED: Remove requireAuth callback since onPurchase now handles auth internally
//   const handleBuyNow = async () => {
//     try {
//       await onPurchase(flashSale.flashSaleId || flashSale._id, product._id, 1);
//     } catch (error) {
//       console.error('Error in handleBuyNow:', error);
//     }
//   };

//   // PanResponder for swipe gesture
// const panResponder = PanResponder.create({
//     onStartShouldSetPanResponder: () => !isDisabled && !isSwiped,
//     onMoveShouldSetPanResponder: () => !isDisabled && !isSwiped,
//     onPanResponderMove: (_, gestureState) => {
//       if (gestureState.dx > 0 && gestureState.dx <= 80) {
//         swipeAnim.setValue(gestureState.dx);
//       }
//     },
//     onPanResponderRelease: async (_, gestureState) => {
//       if (gestureState.dx > 50 && !isDisabled && !isSwiped) {
//         setIsSwiped(true);
//         await handleBuyNow(); // ✅ Now properly awaited
//       }
//       Animated.spring(swipeAnim, {
//         toValue: 0,
//         useNativeDriver: true,
//       }).start();
//     },
//   });

//   const swipeButtonTransform = {
//     transform: [{ translateX: swipeAnim }],
//   };

//   return (
//     <Animated.View
//       style={styles.flashSaleCard}
//     >
//       {/* Header */}
//       <View style={styles.header}>
//         <View style={styles.flashSaleBadge}>
//           <Zap size={20} color="#fbbf24" />
//           <Text style={styles.flashSaleText}>FLASH SALE</Text>
//         </View>
//         <View style={styles.timerContainer}>
//           <Clock size={16} color="#fbbf24" />
//           <Text style={styles.timerText}>
//             {formatTime(timeLeft)}
//           </Text>
//         </View>
//       </View>

//       {/* Content */}
//       <View style={styles.content}>
//         <Image
//           source={{ uri: imageUrl }}
//           style={styles.productImage}
//          // defaultSource={require('./placeholder.png')}
//         />

//         <View style={styles.productInfo}>
//           <Text style={styles.productTitle} numberOfLines={1}>
//             {title}
//           </Text>

//           {/* Pricing */}
//           <View style={styles.pricingContainer}>
//             <Text style={styles.originalPrice}>
//               ₹{originalPrice}
//             </Text>
//             <Text style={styles.flashPrice}>
//               ₹{flashPrice}
//             </Text>
//             {discount > 0 && (
//               <View style={styles.discountBadge}>
//                 <Text style={styles.discountText}>
//                   {discount}% OFF
//                 </Text>
//               </View>
//             )}
//           </View>

//           {/* Stock and Buy Button */}
//           <View style={styles.footer}>
//             <View style={styles.stockContainer}>
//               <Package size={14} color="rgba(255, 255, 255, 0.8)" />
//               <Text style={styles.stockText}>
//                 {currentStock} left
//               </Text>
//             </View>

//             {/* Swipe to Buy Button */}
//             <View style={[styles.swipeContainer, isDisabled && styles.swipeContainerDisabled]}>
//               <Animated.View
//                 {...panResponder.panHandlers}
//                 style={[styles.swipeButton, swipeButtonTransform, isDisabled && styles.swipeButtonDisabled]}
//               >
//                 <ShoppingCart size={14} color="#fff" />
//                 <ChevronRight size={14} color="#fff" />
//                 <ChevronRight size={14} color="#fff" style={styles.secondChevron} />
//               </Animated.View>
//               <Text style={styles.buyNowText}>
//                 Buy Now
//               </Text>
//             </View>
//           </View>
//         </View>
//       </View>

//       {/* Progress Bar */}
//       <View style={styles.progressBarContainer}>
//         <View style={styles.progressBarBackground}>
//           <Animated.View
//             style={[
//               styles.progressBarFill,
//               { width: `${progress}%` }
//             ]}
//           />
//         </View>
//       </View>
//     </Animated.View>
//   );
// });

const styles = StyleSheet.create({
  overlayContainer: {
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    // backgroundColor:'#fff',
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  scrollContentSingle: {
    paddingHorizontal: 16,
  },
  authRequiredCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 420,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  authRequiredGradient: {
    padding: 20,
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  authTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  authContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  authMessage: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  authSubMessage: {
    color: '#fbbf24',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  authButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  authButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  flashSaleCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  flashSaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flashSaleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  timerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  originalPrice: {
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'line-through',
    fontSize: 12,
  },
  flashPrice: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 18,
  },
  discountBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  swipeContainer: {
    width: 120,
    height: 32,
    // backgroundColor: '#ff0040',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
  },
  swipeContainerDisabled: {
    backgroundColor: '#6b7280',
  },
  swipeButton: {
    // backgroundColor: '#1c1917',
    // height: 50,
    // width:100,
    flex: 1,
    // paddingHorizontal: 10,
    // borderRadius: 13,
    // flexDirection: 'row',
    // alignItems: 'center',
    // justifyContent: 'center',
  },
  swipeButtonDisabled: {
    backgroundColor: '#4b5563',
  },
  secondChevron: {
    marginLeft: -4,
  },
  buttonText: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  buyNowText: {

    // left:0,
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
    // marginRight: 12,
  },
  progressBarContainer: {
    width: '100%',
    marginTop: 8,
  },
  progressBarBackground: {
    backgroundColor: '#991b1b',
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: '#fbbf24',
    height: '100%',
    borderRadius: 4,
  },
});

export default LiveFlashSaleOverlay;
