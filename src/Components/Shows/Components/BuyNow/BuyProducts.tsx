import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuthContext } from '../../../../Context/AuthContext';
import CheckoutSlider from '../../../Reuse/CheckOutGlobal';
import { AWS_CDN_URL } from '../../../../../Config';

// Icons
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BundleCheckoutSlider from '../../Payment/BundleCheckoutSlider';
import { Toast } from '../../../../Utils/dateUtils';
import { useNavigation } from '@react-navigation/native';

const getProductIdSafely = (productField: any) => {
  if (!productField) return null;
  if (
    typeof productField === 'object' &&
    productField !== null &&
    productField._id
  ) {
    return productField._id.toString();
  }
  return productField.toString();
};

const BuyProducts = memo(
  ({
    showId,
    streamId,
    product,
    signedUrls,
    socket: _socket,
    onFlashSalePurchase,
    requireAuth: _requireAuth,
    productStocks,
    activeFlashSales: _activeFlashSales,
    calculateDiscount: _calculateDiscount,
    formatTime,
    calculateTimeLeft,
    currentTime,
    isBundle = false,
    isBundleFlashSale = false,
    showStatus = null, // New prop to check if show has started
    trackProductInteraction: _trackProductInteraction = null, // Receive tracking function as prop from parent
    isInterested: _isInterested = false, // NEW: Interest status for this product
    interestCount = 0, // NEW: Number of users interested
    onToggleInterest: _onToggleInterest = null,
  }: any) => {
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [bundleCheckoutOpen, setBundleCheckoutOpen] = useState(false);
    const navigation = useNavigation();

    // ✅ Calculate isReservedForLive based on showStatus like web app
    // Check if product/bundle should hide buy button when show hasn't started
    const isReservedForLive = useMemo(() => {
      if (isBundle) {
        // For bundles: always hide button if show not started
        return showStatus === 'created';
      }
      // For products: hide only if show not started AND reserveForLive is true
      const reserveForLive = product.productId?.reserveForLive;
      return showStatus === 'created' && reserveForLive;
    }, [isBundle, showStatus, product.productId?.reserveForLive]);

    const {
      isFlashSale,
      flashSaleData: _flashSaleData,
      flashSaleId,
    } = useMemo(() => {
      if (isBundle) {
        return { isFlashSale: false, flashSaleData: null, flashSaleId: null };
      }
      return {
        isFlashSale: product._isFlashSale || product.productId?.isFlashSale,
        flashSaleData:
          product._flashSaleData || product.productId?.flashSaleData,
        flashSaleId: product.productId?.flashSaleId,
      };
    }, [product, isBundle]);

    const [timeLeft, setTimeLeft] = useState(0);
    const flashOpacity = React.useRef(new Animated.Value(1)).current;
    // console.log("RENDER BUY PRODUCTS",product)
    useEffect(() => {
      if (isBundle) {
        if (isBundleFlashSale && product.flashSaleEndTime) {
          const calculateBundleTimeLeft = () => {
            if (!calculateTimeLeft || !currentTime) {
              const endTime = new Date(product.flashSaleEndTime).getTime();
              const now = Date.now();
              return Math.max(0, Math.floor((endTime - now) / 1000));
            }
            return calculateTimeLeft(product.flashSaleEndTime, currentTime);
          };

          setTimeLeft(calculateBundleTimeLeft());

          const interval = setInterval(() => {
            const newTimeLeft = calculateBundleTimeLeft();
            setTimeLeft(newTimeLeft);
            if (newTimeLeft <= 0) {
              clearInterval(interval);
            }
          }, 1000);

          return () => clearInterval(interval);
        }
      } else {
        if (!isFlashSale || !product.productId?.flashSaleEndTime) return;

        const calculateProductTimeLeft = () => {
          if (!calculateTimeLeft || !currentTime) {
            const endTime = new Date(
              product.productId.flashSaleEndTime,
            ).getTime();
            const now = Date.now();
            return Math.max(0, Math.floor((endTime - now) / 1000));
          }
          return calculateTimeLeft(
            product.productId.flashSaleEndTime,
            currentTime,
          );
        };

        setTimeLeft(calculateProductTimeLeft());

        const interval = setInterval(() => {
          const newTimeLeft = calculateProductTimeLeft();
          setTimeLeft(newTimeLeft);
          if (newTimeLeft <= 0) {
            clearInterval(interval);
          }
        }, 1000);

        return () => clearInterval(interval);
      }
    }, [
      isBundle,
      isBundleFlashSale,
      isFlashSale,
      product,
      calculateTimeLeft,
      currentTime,
    ]);

    // Pulse animation for flash sale badge
    useEffect(() => {
      if (
        (isBundle && isBundleFlashSale && timeLeft > 0) ||
        (isFlashSale && timeLeft > 0)
      ) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(flashOpacity, {
              toValue: 0.6,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(flashOpacity, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      }
    }, [isBundle, isBundleFlashSale, isFlashSale, timeLeft, flashOpacity]);

    const productId = isBundle
      ? product.bundleSaleId
      : product.productId?._id || product._id;

    const imageUrl = useMemo(() => {
      if (isBundle) {
        return (
          product.bundleImage?.url ||
          (product.bundleImage?.key
            ? `${AWS_CDN_URL}${product.bundleImage.key}`
            : null) ||
          `${AWS_CDN_URL}${product?.images?.[0]?.key}`
        );
      }
      const productImageKey = product?.productId?.images?.[0]?.key
        ? `${AWS_CDN_URL}${product?.productId.images[0].key}`
        : `${AWS_CDN_URL}${product?.images?.[0]?.key}`;
      return signedUrls?.[productId] || productImageKey;
    }, [isBundle, product, productId, signedUrls]);

    const productPrice = useMemo(() => {
      if (isBundle) {
        return isBundleFlashSale
          ? product.bundlePrice || product._flashSaleData?.flashPrice
          : product.sellingPrice;
      }

      // ✅ FIX: For flash sales, use the flash price from the correct location
      if (isFlashSale) {
        const flashPrice =
          product.productId?.flashPrice ||
          product._flashSaleData?.flashPrice ||
          product._flashSaleData?.products?.[0]?.flashPrice ||
          0;

        console.log('💰 [BuyProducts] Flash sale price extraction:', {
          flashPrice,
          fromProductId: product.productId?.flashPrice,
          fromFlashSaleData: product._flashSaleData?.flashPrice,
          regularPrice: product.productPrice
        });

        return flashPrice;
      }

      return product.productPrice || product.productId?.productPrice;
    }, [isBundle, isBundleFlashSale, isFlashSale, product]);

    const mrp = useMemo(() => {
      if (isBundle) {
        return product.originalPrice || product.bundleMRP;
      }

      // ✅ FIX: For flash sales, use the original price from flash sale data
      if (isFlashSale) {
        const originalPrice =
          product.productId?.originalPrice ||
          product._flashSaleData?.originalPrice ||
          product.productId?.MRP ||
          product.productPrice ||
          0;

        console.log('💰 [BuyProducts] Original price extraction:', {
          originalPrice,
          fromProductId: product.productId?.originalPrice,
          fromFlashSaleData: product._flashSaleData?.originalPrice,
          MRP: product.productId?.MRP
        });

        return originalPrice;
      }

      return product.productId?.MRP || productPrice;
    }, [isBundle, isFlashSale, product, productPrice]);

    const title = isBundle
      ? product.bundleTitle
      : product.productId?.title || product.title;

    const getNormalProductStock = useCallback(() => {
      if (isFlashSale || isBundle) return 0;

      const pId = getProductIdSafely(product.productId);
      const stockData = productStocks?.[pId];

      if (stockData && stockData.availableQuantity !== undefined) {
        return stockData.availableQuantity;
      }

      return 10;
    }, [isFlashSale, isBundle, product.productId, productStocks]);

    const { currentStock, isSoldOut } = useMemo(() => {
      if (isBundle) {
        return {
          currentStock: 999,
          isSoldOut: false,
        };
      }

      let stock = 0;

      if (isFlashSale) {
        stock =
          Number(product.productId?.flashSaleStock) ||
          Number(product.productId?.flashStock) ||
          Number(product._flashSaleData?.currentStock) ||
          Number(product._flashSaleData?.currentFlashStock) ||
          Number(product._flashSaleData?.products?.[0]?.currentFlashStock) ||
          Number(product._flashSaleData?.products?.[0]?.currentStock) ||
          0;
      } else {
        stock = getNormalProductStock();
      }

      return {
        currentStock: stock,
        isSoldOut: stock <= 0,
      };
    }, [isBundle, isFlashSale, product, getNormalProductStock]);

    const discount = useMemo(() => {
      if (isBundle || !isFlashSale) return 0;

      // ✅ FIX: Use the correctly extracted values from useMemo above
      const original = mrp;
      const flash = productPrice;

      console.log('💰 [BuyProducts] Discount calculation:', {
        original,
        flash,
        discount: original > 0 && original !== flash ? Math.round(((original - flash) / original) * 100) : 0
      });

      if (!original || original === flash || original === 0) return 0;
      return Math.round(((original - flash) / original) * 100);
    }, [isBundle, isFlashSale, mrp, productPrice]);
    const { user } = useAuthContext();
    const handleBuy = useCallback(() => {
      if (!user) {
        Toast('Please login to continue buying products.');
        return;
      }
      const executeBuy = () => {
        if (isReservedForLive) {
          Toast('Once the show is Live you can buy product. ');
          return;
        }

        if (isBundle || isBundleFlashSale) {
          if (isBundleFlashSale && onFlashSalePurchase) {
            setBundleCheckoutOpen(true);
          } else {
            setBundleCheckoutOpen(true);
          }
        } else if (isFlashSale && onFlashSalePurchase) {
          // console.log(
          //   '🎯 Flash sale purchase:',
          //   flashSaleId,
          //   product.productId._id,
          // );
          onFlashSalePurchase(flashSaleId, product.productId._id, 1);
        } else {
          console.log('🛒 Normal product purchase:', product.productId._id);
          setIsCheckoutOpen(true);
        }
      };

      executeBuy();
    }, [
      isBundle,
      isBundleFlashSale,
      product,
      isFlashSale,
      onFlashSalePurchase,
      flashSaleId,
      isReservedForLive,
      user,
    ]);

    const prepareProductForCheckout = useCallback(() => {
      if (isBundle) return null;

      // Handle both cases: when productId is an object or when data is on product directly
      const productData = product.productId && typeof product.productId === 'object'
        ? product.productId
        : product;

      const productIdValue = productData._id || product._id;
      // console.log("productdata===",productData)
      if (!productIdValue) {
        console.warn('⚠️ [BuyProducts] Missing product ID for checkout');
        return null;
      }

      const baseProduct: any = {
        _id: productIdValue,
        title: productData.title || product.title || 'Product',
        description: productData.description || product.description || '',
        productPrice: productPrice || productData.productPrice || product.productPrice || 0,
        MRP: mrp || productData.MRP || product.MRP || productPrice || 0,
        gstRate: productData.gstRate || product.gstRate || 0,
        category: productData.category || product.category || '',
        brand: productData.brand || product.brand || '',
        stock: currentStock,
        specifications: productData.specifications || product.specifications || [],
        images: productData.images || product.images || [],
        dimensions: productData.dimensions || product.dimensions || null,
        logisticsType: productData.logisticsType,
        shippingMethod: productData.shippingMethod || product.shippingMethod,
        weight: productData.weight || product.weight || 0,
        deliveryCharge: productData.deliveryCharge || product.deliveryCharge || 0,
        estimatedDeliveryDate: productData.estimatedDeliveryDate || product.estimatedDeliveryDate || null,
        // Additional fields that CheckoutSlider might need
        parentProductId: productData.parentProductId || product.parentProductId || null,
        childVariantIds: productData.childVariantIds || product.childVariantIds || [],
        variantAttributes: productData.variantAttributes || product.variantAttributes || null,
      };

      if (isFlashSale) {
        baseProduct.flashSale = {
          isActive: true,
          flashPrice: productPrice || product.productPrice || productData.flashPrice || 0,
          flashSaleId: flashSaleId,
          endsAt: productData.flashSaleEndTime || product.flashSaleEndTime || null,
          flashStock: productData.flashSaleStock || product.flashSaleStock || currentStock,
        };
      }

      // console.log('🛒 [BuyProducts] Prepared product for checkout:', {
      //   _id: baseProduct._id,
      //   title: baseProduct.title,
      //   productPrice: baseProduct.productPrice,
      //   MRP: baseProduct.MRP,
      //   isFlashSale: isFlashSale,
      //   hasImages: baseProduct.images?.length > 0,
      // });

      return baseProduct;
    }, [product, isFlashSale, flashSaleId, currentStock, isBundle, productPrice, mrp]);

    const handleCloseCheckout = useCallback(() => {
      setIsCheckoutOpen(false);
    }, []);

    const formatTimeDisplay = useCallback(
      seconds => {
        if (formatTime) {
          return formatTime(seconds);
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      },
      [formatTime],
    );

    // Bundle Sale Card
    if (isBundle) {
      const isFlashSaleExpired = isBundleFlashSale && timeLeft <= 0;
      const shouldShowAsFlashSale = isBundleFlashSale && !isFlashSaleExpired;
      const displayPrice = shouldShowAsFlashSale
        ? productPrice
        : product.sellingPrice || productPrice;
      const displayMRP = shouldShowAsFlashSale ? mrp : product.bundleMRP || mrp;

      const bundleDiscount =
        displayMRP > displayPrice
          ? Math.round(((displayMRP - displayPrice) / displayMRP) * 100)
          : 0;
      // console.log(product)
      return (
        <View style={styles.container}>
          <LinearGradient
            colors={
              shouldShowAsFlashSale
                ? [
                  'rgba(127, 29, 29, 0.3)',
                  'rgba(153, 27, 27, 0.3)',
                  'rgba(185, 28, 28, 0.3)',
                ]
                : [
                  'rgba(88, 28, 135, 0.2)',
                  'rgba(107, 33, 168, 0.2)',
                  'rgba(126, 34, 206, 0.2)',
                ]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.productCard,
              shouldShowAsFlashSale
                ? styles.bundleFlashCard
                : styles.bundleNormalCard,
            ]}>
            {/* Discount Badge - Top Right */}
            {bundleDiscount > 0 && (
              <View style={styles.discountBadgeTopRight}>
                <LinearGradient
                  colors={['#10b981', '#22c55e']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.discountBadgeGradient}>
                  <Text style={styles.discountBadgeText}>
                    {bundleDiscount}%
                  </Text>
                </LinearGradient>
              </View>
            )}

            <View style={styles.productContent}>
              {/* Bundle Image */}
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                {/* Bundle Badge */}
                <Animated.View
                  style={[
                    styles.bundleBadge,
                    { opacity: shouldShowAsFlashSale ? flashOpacity : 1 },
                  ]}>
                  <LinearGradient
                    colors={['#9333ea', '#a855f7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bundleBadgeGradient}>
                    <Icon name="package-variant" size={14} color="#ffffff" />
                  </LinearGradient>
                </Animated.View>
              </View>

              {/* Bundle Details */}
              <View style={styles.productDetails}>
                {/* Bundle Label */}
                <LinearGradient
                  colors={
                    shouldShowAsFlashSale
                      ? ['#dc2626', '#ef4444', '#f87171']
                      : ['#9333ea', '#a855f7', '#c084fc']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.bundleLabelGradient}>
                  <Text style={styles.bundleLabelText}>
                    {shouldShowAsFlashSale ? '⚡ BUNDLE FLASH' : 'BUNDLE'}
                  </Text>
                </LinearGradient>

                <Text style={styles.productTitle} numberOfLines={1}>
                  {title}
                </Text>

                {/* Pricing */}
                <View style={styles.priceContainer}>
                  <View style={styles.priceRow}>
                    <Icon
                      name="currency-inr"
                      size={16}
                      color={shouldShowAsFlashSale ? '#fca5a5' : '#c084fc'}
                    />
                    <Text
                      style={[
                        styles.currentPriceText,
                        shouldShowAsFlashSale
                          ? styles.flashPriceColor
                          : styles.bundlePriceColor,
                      ]}>
                      {displayPrice?.toFixed(2)}
                    </Text>
                  </View>
                  {displayMRP > displayPrice && (
                    <View style={styles.originalPriceRow}>
                      <Text style={styles.mrpText}>₹{displayMRP}</Text>
                    </View>
                  )}
                </View>

                {/* Timer for Flash Sale Bundles */}
                {shouldShowAsFlashSale && (
                  <View style={styles.bundleTimerWrapper}>
                    <LinearGradient
                      colors={[
                        'rgba(127, 29, 29, 0.3)',
                        'rgba(185, 28, 28, 0.3)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.bundleTimer}>
                      <Icon name="clock-outline" size={14} color="#fca5a5" />
                      <Text style={styles.timerLabel}>Ends in:</Text>
                      <Text style={styles.timerValue}>
                        {formatTimeDisplay(timeLeft)}
                      </Text>
                    </LinearGradient>
                  </View>
                )}

                {/* Interest Count Badge - Show on all screens */}
                {interestCount > 0 && (
                  <View style={styles.interestCountBadge}>
                    <LinearGradient
                      colors={[
                        'rgba(239, 68, 68, 0.1)',
                        'rgba(185, 28, 28, 0.1)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.interestCountBadgeGradient}>
                      <Ionicons name="heart-sharp" size={12} color="#fca5a5" />
                      <Text style={styles.interestCountText}>
                        {interestCount} interested
                      </Text>
                    </LinearGradient>
                  </View>
                )}
                <View style={styles.actionsRow}>
                  {isReservedForLive ? (
                    <View style={styles.reservedMessage}>
                      <LinearGradient
                        colors={[
                          'rgba(59, 130, 246, 0.3)',
                          'rgba(37, 99, 235, 0.3)',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.reservedMessageGradient}>
                        <Icon name="lock" size={12} color="#93c5fd" />
                        <Text style={styles.reservedMessageText}>
                          Visible when the show is live
                        </Text>
                      </LinearGradient>
                    </View>
                  ) : (
                    <View style={styles.bundleButtonsRow}>
                      <TouchableOpacity
                        onPress={handleBuy}
                        activeOpacity={0.8}
                        style={styles.bundleBuyButtonWrapper}>
                        <LinearGradient
                          colors={
                            shouldShowAsFlashSale
                              ? ['#dc2626', '#ef4444', '#f87171']
                              : ['#9333ea', '#a855f7', '#c084fc']
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.buyButton}>
                          <Icon
                            name={
                              shouldShowAsFlashSale ? 'lightning-bolt' : 'cart'
                            }
                            size={16}
                            color="#ffffff"
                          />
                          <Text style={styles.buyButtonText}>Buy Now</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      {/* Interest Button for Bundles - Show for ALL shows */}
                      {/* {onToggleInterest && (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e?.stopPropagation();
                      onToggleInterest(product.bundleSaleId, 'bundle');
                    }}
                    activeOpacity={0.8}
                    style={styles.interestButtonWrapper}
                  >
                    <View style={[
                      styles.interestButton,
                      isInterested && styles.interestButtonActive
                    ]}>
                      {isInterested ? (
                        <Ionicons name="heart-sharp" size={20} color="#fff" />
                      ) : (
                        <Ionicons name="heart-outline" size={20} color="#9ca3af" />
                      )}
                    </View>
                  </TouchableOpacity>
                )} */}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Bundle Products - Always Visible */}
            {product.products && product.products.length > 0 ? (
              <View style={styles.bundleProductsContainer}>
                {product.products.map((bundleProduct: any, pIndex: number) => {
                  // 🔍 DEBUG: Log each bundle product
                  // console.log(`🔍 [BuyProducts] Bundle Product ${pIndex}:`, {
                  //   title: bundleProduct.title,
                  //   hasImage: !!bundleProduct.image,
                  //   image: bundleProduct.image,
                  //   hasImages: !!bundleProduct.images,
                  //   images: bundleProduct.images,
                  //   quantity: bundleProduct.quantity,
                  //   bundleQuantity: bundleProduct.bundleQuantity,
                  //   productPrice: bundleProduct.productPrice,
                  //   price: bundleProduct.price
                  // });

                  // ✅ Fix: Handle both regular bundle products and flash sale bundle products
                  const productImg = bundleProduct.image
                    ? `${AWS_CDN_URL}${bundleProduct.image}` // Flash sale products have 'image' as string
                    : bundleProduct.images?.[0]?.url ||
                    (bundleProduct.images?.[0]?.key
                      ? `${AWS_CDN_URL}${bundleProduct.images[0].key}`
                      : null);

                  return (
                    <View
                      key={bundleProduct._id || pIndex}
                      style={styles.bundleProductItem}>
                      <Image
                        source={{
                          uri: productImg || 'https://via.placeholder.com/48',
                        }}
                        style={styles.bundleProductImage}
                        resizeMode="cover"
                      />
                      <View style={styles.bundleProductDetails}>
                        <Text
                          style={styles.bundleProductTitle}
                          numberOfLines={1}>
                          {bundleProduct.title}
                        </Text>
                        <Text
                          style={styles.bundleProductCategory}
                          numberOfLines={1}>
                          {bundleProduct.category || 'Product'}
                        </Text>
                        <View style={styles.bundleProductFooter}>
                          <Text style={styles.bundleProductQuantity}>
                            Qty:{' '}
                            {bundleProduct.quantity ||
                              bundleProduct.bundleQuantity ||
                              1}
                          </Text>
                          {/* Only show price if it exists and is not 0 */}
                          {(bundleProduct.productPrice ||
                            bundleProduct.price) && (
                              <View style={styles.bundleProductPriceRow}>
                                <Icon
                                  name="currency-inr"
                                  size={8}
                                  color="#10b981"
                                />
                                <Text style={styles.bundleProductPrice}>
                                  {bundleProduct.productPrice ||
                                    bundleProduct.price}
                                </Text>
                              </View>
                            )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noProductsWarning}>
                <Text style={styles.noProductsText}>
                  ⚠️ No products found in bundle
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* BundleCheckoutSlider - For bundle purchases */}
          <BundleCheckoutSlider
            isOpen={bundleCheckoutOpen}
            onClose={() => setBundleCheckoutOpen(false)}
            bundleId={product.bundleSaleId}
            currentTime={currentTime}
            flashSaleData={
              isBundleFlashSale
                ? {
                  flashSaleId: product.flashSaleId,
                  flashPrice:
                    product.bundlePrice || product._flashSaleData?.flashPrice,
                  flashSaleEndTime: product.flashSaleEndTime,
                }
                : null
            }
            showId={showId || streamId}
          />
        </View>
      );
    }
    if (isFlashSale) {
      return (
        <View style={styles.flashSaleCard}>
          <LinearGradient
            colors={[
              'rgba(127, 29, 29, 0.1)',
              'rgba(153, 27, 27, 0.1)',
              'rgba(185, 28, 28, 0.1)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.productCard, styles.flashCardBorder]}>
            <View style={styles.productContent}>
              {/* Flash Sale Image */}
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                {/* Flash Badge */}
                <Animated.View
                  style={[styles.flashBadge, { opacity: flashOpacity }]}>
                  <LinearGradient
                    colors={['#dc2626', '#ef4444', '#f87171']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.flashBadgeGradient}>
                    <Icon name="lightning-bolt" size={12} color="#ffffff" />
                  </LinearGradient>
                </Animated.View>
              </View>

              {/* Flash Sale Details */}
              <View style={styles.productDetails}>
                <Text style={styles.productTitle} numberOfLines={1}>
                  {title}
                </Text>

                {/* Flash Sale Pricing */}
                <View style={styles.priceContainer}>
                  <View style={styles.priceRow}>
                    <Icon name="currency-inr" size={14} color="#fca5a5" />
                    <Text style={styles.flashPriceText}>{productPrice}</Text>
                  </View>
                  <View style={styles.originalPriceRow}>
                    <Text style={styles.mrpText}>
                      ₹{product.productId?.MRP || productPrice}
                    </Text>
                  </View>
                  {discount > 0 && (
                    <View style={styles.discountBadgeInline}>
                      <LinearGradient
                        colors={['#15803d', '#16a34a']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.discountBadgeInlineGradient}>
                        <Text style={styles.discountInlineText}>
                          {discount}% OFF
                        </Text>
                      </LinearGradient>
                    </View>
                  )}
                </View>

                {/* Timer & Buy Button Row */}
                <View style={styles.flashActionsRow}>
                  <View style={styles.timerWrapper}>
                    <LinearGradient
                      colors={[
                        'rgba(127, 29, 29, 0.3)',
                        'rgba(185, 28, 28, 0.3)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.flashTimer}>
                      <Icon name="clock-outline" size={12} color="#fca5a5" />
                      <Text style={styles.flashTimerLabel}>Ends in:</Text>
                      <Text style={styles.flashTimerValue}>
                        {formatTimeDisplay(timeLeft)}
                      </Text>
                    </LinearGradient>
                  </View>

                  <TouchableOpacity
                    onPress={handleBuy}
                    disabled={isSoldOut}
                    activeOpacity={0.8}
                    style={{ alignSelf: 'flex-end' }}>
                    <LinearGradient
                      colors={
                        isSoldOut
                          ? ['#4b5563', '#6b7280']
                          : ['#dc2626', '#ef4444', '#f87171']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.flashBuyButton}>
                      <Icon name="lightning-bolt" size={16} color="#ffffff" />
                      <Text style={styles.buyButtonText}>Buy Now</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      );
    }

    // Regular Product + Flash Sale Version
    return (
      <View style={styles.container}>
        {/* Regular Product Card - Always Show */}
        <View style={styles.regularCard}>
          <LinearGradient
            colors={['#18181b', '#27272a', '#3f3f46']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.productCard}>
            <View style={styles.productContent}>
              {/* Product Image */}
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                {isSoldOut && (
                  <View style={styles.soldOutOverlay}>
                    <Text style={styles.soldOutText}>SOLD OUT</Text>
                  </View>
                )}
              </View>

              {/* Product Details */}
              <View style={styles.productDetails}>
                <TouchableOpacity onPress={() => (navigation as any).navigate("ProductDetails", { id: product?.productId?._id || product?._id })} activeOpacity={0.2}>
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {title}
                  </Text>

                  {/* Pricing */}
                  <View style={styles.priceContainer}>
                    <View style={styles.priceRow}>
                      <Icon name="currency-inr" size={14} color="#ffffff" />
                      <Text style={styles.regularPriceText}>{productPrice}</Text>
                    </View>
                    {mrp > productPrice && (
                      <View style={styles.originalPriceRow}>
                        <Text style={styles.mrpText}>₹{mrp}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Interest Count Badge - Show on all screens */}
                {interestCount > 0 && (
                  <View style={styles.interestCountBadge}>
                    <LinearGradient
                      colors={[
                        'rgba(239, 68, 68, 0.2)',
                        'rgba(185, 28, 28, 0.2)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.interestCountBadgeGradient}>
                      <Ionicons name="heart-sharp" size={14} color="#fca5a5" />
                      <Text style={styles.interestCountText}>
                        {interestCount} interested
                      </Text>
                    </LinearGradient>
                  </View>
                )}

                {/* Buy Button or Reserved Message - ALWAYS show interest button */}
                <View style={styles.actionsRow}>
                  {isReservedForLive ? (
                    <View style={styles.reservedMessage}>
                      <LinearGradient
                        colors={[
                          'rgba(59, 130, 246, 0.3)',
                          'rgba(37, 99, 235, 0.3)',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.reservedMessageGradient}>
                        <Icon name="lock" size={12} color="#93c5fd" />
                        <Text style={styles.reservedMessageText}>
                          Visible when the show is live
                        </Text>
                      </LinearGradient>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleBuy}
                      activeOpacity={0.8}
                      disabled={isSoldOut}
                      style={styles.buyButtonWrapper}>
                      <LinearGradient
                        colors={
                          isSoldOut
                            ? ['#4b5563', '#6b7280']
                            : ['#fbbf24', '#f59e0b', '#eab308']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buyButton}>
                        <Icon
                          name="cart"
                          size={16}
                          color={isSoldOut ? '#9ca3af' : '#18181b'}
                        />
                        <Text
                          style={[
                            styles.buyButtonText,
                            isSoldOut
                              ? styles.soldOutButtonText
                              : styles.normalButtonText,
                          ]}>
                          {isSoldOut ? 'Sold Out' : 'Buy Now'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {/* Interest Button - Show for ALL products, ALL shows, ALL states (even reserved) */}
                  {/* {onToggleInterest && (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e?.stopPropagation();
                      onToggleInterest(product.productId._id, 'product');
                    }}
                    activeOpacity={0.8}
                    disabled={false}
                    style={styles.interestButtonWrapper}
                  >
                    <View style={[
                      styles.interestButton,
                      isInterested && styles.interestButtonActive
                    ]}>
                      {isInterested ? (
                        <Ionicons name="heart-sharp" size={20} color="#fff" />
                      ) : (
                        <Ionicons name="heart-outline" size={20} color="#9ca3af" />
                      )}
                    </View>
                  </TouchableOpacity>
                )} */}
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
        {/* CheckoutSlider - Only for normal products */}
        {!isFlashSale && (
          <CheckoutSlider
            isOpen={isCheckoutOpen}
            onClose={handleCloseCheckout}
            product={prepareProductForCheckout()}
          />
        )}
      </View>
    );
  },
);

BuyProducts.displayName = 'BuyProducts';

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  interestCountBadge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  interestCountBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
  },
  interestCountText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: 'bold',
  },
  bundleButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  bundleBuyButtonWrapper: {
    flex: 1,
  },
  buyButtonWrapper: {
    flex: 1,
  },
  interestButtonWrapper: {
    width: 36,
    height: 36,
  },
  interestButton: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(63, 63, 70, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(113, 113, 122, 0.5)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interestButtonActive: {
    backgroundColor: '#F2231F',
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  reservedMessage: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  reservedMessageGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 8,
  },
  reservedMessageText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '500',
  },
  container: {
    marginVertical: 6,
  },
  regularCard: {
    marginBottom: 12,
  },
  flashSaleCard: {
    marginTop: 0,
  },
  productCard: {
    borderRadius: 12,
    padding: 8,
    overflow: 'visible',
  },
  bundleFlashCard: {
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  bundleNormalCard: {
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.4)',
  },
  flashCardBorder: {
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  discountBadgeTopRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  discountBadgeGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productContent: {
    flexDirection: 'row',
    gap: 12,
  },
  imageWrapper: {
    width: 100,
    height: 104,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  bundleBadge: {
    position: 'absolute',
    top: 2,
    left: 3,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bundleBadgeGradient: {
    padding: 6,
  },
  flashBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  flashBadgeGradient: {
    padding: 4,
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  soldOutText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bundleLabelGradient: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 4,
  },
  bundleLabelText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  currentPriceText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  flashPriceColor: {
    color: '#fca5a5',
  },
  bundlePriceColor: {
    color: '#c084fc',
  },
  regularPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  flashPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fca5a5',
  },
  originalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  mrpText: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountBadgeInline: {
    marginLeft: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  discountBadgeInlineGradient: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountInlineText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  bundleTimerWrapper: {
    marginBottom: 8,
  },
  bundleTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timerLabel: {
    fontSize: 10,
    color: 'rgba(252, 165, 165, 0.8)',
    fontWeight: '500',
  },
  timerValue: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 'auto',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    width: '100%',
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#ffffff',
  },
  soldOutButtonText: {
    color: '#9ca3af',
  },
  normalButtonText: {
    color: '#18181b',
  },
  flashActionsRow: {
    gap: 8,
  },
  timerWrapper: {
    flex: 1,
  },
  flashTimer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  flashTimerLabel: {
    fontSize: 10,
    color: 'rgba(252, 165, 165, 0.8)',
    fontWeight: '500',
  },
  flashTimerValue: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 'auto',
  },
  flashBuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    width: '100%',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  bundleProductsContainer: {
    marginTop: 8,
    gap: 8,
  },
  bundleProductItem: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bundleProductImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    flexShrink: 0,
  },
  bundleProductDetails: {
    flex: 1,
    justifyContent: 'space-between',
    minWidth: 0,
  },
  bundleProductTitle: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  bundleProductCategory: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
    marginBottom: 4,
  },
  bundleProductFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bundleProductQuantity: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 9,
  },
  bundleProductPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bundleProductPrice: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '600',
  },
  noProductsWarning: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: 8,
  },
  noProductsText: {
    color: '#fbbf24',
    fontSize: 10,
    textAlign: 'center',
  },
});

export default BuyProducts;
