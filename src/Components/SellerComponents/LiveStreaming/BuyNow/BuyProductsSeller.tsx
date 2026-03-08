// BuyProductsSellers.tsx - ENHANCED REACT NATIVE VERSION WITH WEB PARITY
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useFlashSaleProduct } from '../../../../hooks/useFlashSaleProduct';
import { AWS_CDN_URL } from '../../../../../Config';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BuyProductsSellers = ({
  showId: _showId,
  streamId: _streamId,
  product,
  activeFlashSales = [],
  onStartFlashSale,
  calculateTimeLeft,
  currentTime,
  calculateDiscount,
  formatTime,
  isBundle = false,
  interestCount = 0 // NEW: Number of users interested in this product/bundle
}) => {
  const [currentFlashSale, setCurrentFlashSale] = useState(useFlashSaleProduct(product, activeFlashSales) || null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));
  const [showBundleProducts, setShowBundleProducts] = useState(false); // NEW: Toggle for bundle products
  const flashSaleHeightAnim = useRef(new Animated.Value(0)).current;
  const flashSaleOpacityAnim = useRef(new Animated.Value(0)).current;

  const isFlashSaleActive = !!currentFlashSale && timeLeft > 0;
  
  // ✅ NEW: Check if ANY flash sale is active (filter out expired ones)
  const hasAnyActiveFlashSale = activeFlashSales && activeFlashSales.some(sale => {
    if (!sale.endTime) return false;
    const now = currentTime || Date.now();
    const end = new Date(sale.endTime).getTime();
    const remaining = Math.max(0, Math.ceil((end - now) / 1000));
    return remaining > 0; // Only count as active if time remaining
  });
  const isAnotherFlashSaleActive = hasAnyActiveFlashSale && !isFlashSaleActive;

  // console.log('hasAnyActiveFlashSale', hasAnyActiveFlashSale);
  // console.log('isAnotherFlashSaleActive', isAnotherFlashSaleActive);
  // console.log('isFlashSaleActive', isFlashSaleActive);

  // Handle different data structures for regular products vs bundles
  const productId = isBundle ? product?.bundleSaleId : product?.productId?._id;
  
  // ✅ Safe image URL extraction
  const getImageUrl = () => {
    if (isBundle) {
      return product?.bundleImage?.url || "https://media.istockphoto.com/id/1495664030/photo/sneakers-on-dark-gray-concrete-background-texture-of-the-old-dark-stone-or-broken-brick-the.jpg?s=612x612&w=0&k=20&c=o2yWDPIHm6pTUw5MKhGQ0X83cfGM2RUuO7RGCCrrsU8=";
    }
    
    // For regular products, safely access images array
    const images = product?.productId?.images;
    if (images && images.length > 0 && images[0]?.key) {
      return `${AWS_CDN_URL}${images[0].key}`;
    }
    
    // Fallback to placeholder
    return "https://media.istockphoto.com/id/1495664030/photo/sneakers-on-dark-gray-concrete-background-texture-of-the-old-dark-stone-or-broken-brick-the.jpg?s=612x612&w=0&k=20&c=o2yWDPIHm6pTUw5MKhGQ0X83cfGM2RUuO7RGCCrrsU8=";
  };
  
  const imageUrl = getImageUrl();
  const productPrice = isBundle ? product?.sellingPrice : (product?.productPrice || product?.productId?.productPrice);
  const mrp = isBundle ? product?.bundleMRP : (product?.productId?.MRP || productPrice);
  const title = isBundle ? product?.bundleTitle : (product?.productId?.title || product?.title);
  
  // ✅ NEW: Get stock quantity from API response (matching web version)
  // Note: Your API doesn't provide stock quantity fields for React Native
  // So these will be undefined, and products won't show as out of stock
  const availableQuantity = isBundle 
    ? product?.bundleQuantity  // For bundles
    : product?.stockQuantity;  // For products
  
  // Debug logging
  // console.log('🔍 Stock Debug:', {
  //   title,
  //   isBundle,
  //   bundleQuantity: product?.bundleQuantity,
  //   stockQuantity: product?.stockQuantity,
  //   availableQuantity,
  //   productKeys: Object.keys(product || {})
  // });
  
  // ✅ NEW: Check if stock is 0 (matching web version - uses API data directly)
  // Only mark as out of stock if we have quantity data AND it's 0
  // If availableQuantity is undefined (not provided by API), won't show as out of stock
  const hasZeroQuantity = availableQuantity !== undefined && availableQuantity === 0;
  const showStockWarning = availableQuantity > 0 && availableQuantity <= 5;
  const isOutOfStock = hasZeroQuantity;

  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Find active flash sale for this product with animation
  useEffect(() => {
    const flashSale = activeFlashSales?.find(sale => {
      // For bundle flash sales
      if (isBundle && sale.isBundle) {
        return sale.bundleId === productId || sale.flashSaleId === productId;
      }
      // For regular product flash sales
      if (!isBundle && !sale.isBundle) {
        return sale.products?.some(p => p.productId === productId) ||
               sale.productId === productId;
      }
      return false;
    });
    
    const wasActive = currentFlashSale !== null;
    const isNowActive = flashSale !== null;
    
    // Debug logging
    if (flashSale) {
      console.log('🔥 Flash sale found for product:', {
        productId,
        flashSaleId: flashSale._id || flashSale.flashSaleId,
        startTime: flashSale.startTime,
        endTime: flashSale.endTime,
        saleStartTime: flashSale.saleStartTime,
        saleEndTime: flashSale.saleEndTime,
        allFields: Object.keys(flashSale)
      });
    }
    
    setCurrentFlashSale(flashSale);
    
    if (!wasActive && isNowActive) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Animated.parallel([
        Animated.timing(flashSaleHeightAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(flashSaleOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else if (wasActive && !isNowActive) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Animated.parallel([
        Animated.timing(flashSaleHeightAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(flashSaleOpacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
    
    if (flashSale && flashSale.endTime) {
      const updateTimeLeft = () => {
        const now = currentTime || Date.now();
        const end = new Date(flashSale.endTime).getTime();
        const remaining = Math.max(0, Math.ceil((end - now) / 1000));
        
        if (remaining <= 0) {
          console.log('⏰ Timer expired:', {
            flashSaleId: flashSale._id || flashSale.flashSaleId,
            endTime: flashSale.endTime,
          });
        }
        
        setTimeLeft(remaining);
      };
      
      updateTimeLeft();
      const interval = setInterval(updateTimeLeft, 1000);
      return () => clearInterval(interval);
    } else if (flashSale && !flashSale.endTime) {
      console.warn('⚠️ Flash sale missing endTime field:', {
        flashSaleId: flashSale._id || flashSale.flashSaleId,
      });
    }
  }, [activeFlashSales, productId, currentTime, isBundle, currentFlashSale, flashSaleHeightAnim, flashSaleOpacityAnim]);

  const handleFlashSaleClick = () => {
    // ✅ NEW: Prevent if another flash sale is active
    if (isAnotherFlashSaleActive) {
      console.warn('⚠️ Cannot start flash sale: Another flash sale is currently active');
      return;
    }
    
    // ✅ Prevent flash sale if quantity is 0
    if (hasZeroQuantity) {
      console.warn('⚠️ Cannot start flash sale: Product has 0 quantity', {
        title,
        availableQuantity,
        isBundle
      });
      return;
    }
    
    if (onStartFlashSale) {
      onStartFlashSale(product);
    } else {
      console.warn('onStartFlashSale function not provided');
    }
  };

  const handleNumericAmnt = (amount) => {
    const numericAmount = parseInt(amount, 10);
    return numericAmount.toLocaleString('en-IN');
  };

  const getFlashSaleProduct = () => {
    if (!currentFlashSale) return null;
    
    if (isBundle && currentFlashSale.isBundle) {
      return {
        productId: currentFlashSale.bundleId || currentFlashSale.flashSaleId,
        originalPrice: currentFlashSale.originalPrice || currentFlashSale.bundlePrice || productPrice,
        flashPrice: currentFlashSale.flashPrice,
        currentFlashStock: currentFlashSale.bundleQuantity || currentFlashSale.currentStock,
        initialFlashStock: currentFlashSale.initialStock || currentFlashSale.bundleQuantity
      };
    }
    
    if (currentFlashSale.products && currentFlashSale.products.length > 0) {
      return currentFlashSale.products.find(p => p.productId === productId);
    }
    
    return {
      productId: currentFlashSale.productId,
      originalPrice: currentFlashSale.originalPrice,
      flashPrice: currentFlashSale.flashPrice,
      currentFlashStock: currentFlashSale.currentStock,
      initialFlashStock: currentFlashSale.initialStock
    };
  };

  const flashSaleProduct = getFlashSaleProduct();
  const flashStock = flashSaleProduct?.currentFlashStock ?? currentFlashSale?.currentStock ?? currentFlashSale?.bundleQuantity ?? 0;
  const initialStock = flashSaleProduct?.initialFlashStock ?? currentFlashSale?.initialStock ?? currentFlashSale?.bundleQuantity ?? 1;

  const getTotalDuration = () => {
    if (!currentFlashSale?.endTime || !currentFlashSale?.startTime) return 0;
    const start = new Date(currentFlashSale.startTime).getTime();
    const end = new Date(currentFlashSale.endTime).getTime();
    return (end - start) / 1000;
  };
  const totalDuration = getTotalDuration();
  const timeElapsed = totalDuration - timeLeft;
  const timePercentage = totalDuration > 0 ? Math.max(0, Math.min(100, (timeElapsed / totalDuration) * 100)) : 0;

  const discountPercent = mrp > productPrice ? Math.round(((mrp - productPrice) / mrp) * 100) : 0;

  // ✅ NEW: Render bundle products list (matching web version)
  const renderBundleProducts = () => {
    if (!product?.products || product.products.length === 0) return null;

    return (
      <>
        <TouchableOpacity
          onPress={() => setShowBundleProducts(!showBundleProducts)}
          style={styles.bundleToggleButton}
          activeOpacity={0.7}
        >
          <Text style={styles.bundleToggleText}>
            {showBundleProducts ? 'Hide' : 'View'} Products in Bundle
          </Text>
          <Ionicons 
            name={showBundleProducts ? 'chevron-up' : 'chevron-down'} 
            size={14} 
            color="rgba(255, 255, 255, 0.6)" 
          />
        </TouchableOpacity>

        {showBundleProducts && (
          <View style={styles.bundleProductsList}>
            <ScrollView 
              style={styles.bundleProductsScroll}
              nestedScrollEnabled={true}
            >
              {product.products.map((bundleProduct, pIndex) => {
                const productImg = bundleProduct.image 
                  ? `${AWS_CDN_URL}${bundleProduct.image}`
                  : bundleProduct.images?.[0]?.url || 
                    (bundleProduct.images?.[0]?.key ? `${AWS_CDN_URL}${bundleProduct.images[0].key}` : null);
                
                return (
                  <View key={bundleProduct._id || pIndex} style={styles.bundleProductItem}>
                    <Image
                      source={{ uri: productImg || imageUrl }}
                      style={styles.bundleProductItemImage}
                      resizeMode="cover"
                    />
                    <View style={styles.bundleProductItemInfo}>
                      <Text style={styles.bundleProductItemTitle} numberOfLines={1}>
                        {bundleProduct.title}
                      </Text>
                      <Text style={styles.bundleProductItemCategory} numberOfLines={1}>
                        {bundleProduct.category || 'Product'}
                      </Text>
                      <View style={styles.bundleProductItemFooter}>
                        <Text style={styles.bundleProductItemQty}>
                          Qty: {bundleProduct.quantity || bundleProduct.bundleQuantity || 1}
                        </Text>
                        <View style={styles.bundleProductItemPrice}>
                          <MaterialIcons name="currency-rupee" size={10} color="#4ade80" />
                          <Text style={styles.bundleProductItemPriceText}>
                            {bundleProduct.productPrice || bundleProduct.price || 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </>
    );
  };

  // Active Bundle Sale Rendering
  if (isBundle) {
    if (isFlashSaleActive) {
      return (
        <View style={styles.flashSaleWrapper}>
          <LinearGradient
            colors={['rgba(239, 68, 68, 0.1)', 'rgba(234, 88, 12, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.card, styles.bundleFlashSaleCard]}
          >
            <View style={styles.content}>
              <View style={styles.bundleImageContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.bundleProductImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['#dc2626', '#ea580c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.flashBadge}
                >
                  <Ionicons name="flash" size={14} color="#fff" />
                </LinearGradient>
                {/* <View style={styles.stockBadge}>
                  <Ionicons name="cube-outline" size={12} color="#fff" />
                  <Text style={styles.stockBadgeText}>{flashStock}</Text>
                </View> */}
              </View>

              <View style={styles.productInfo}>
                <LinearGradient
                  colors={['#dc2626', '#ea580c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.bundleFlashLabel}
                >
                  <Text style={styles.bundleFlashLabelText}>🔥 BUNDLE FLASH SALE</Text>
                </LinearGradient>
                
                <Text style={styles.productTitle} numberOfLines={2}>
                  {title}
                </Text>

                <View style={styles.priceContainer}>
                  <View style={styles.flashPriceContainer}>
                    <View style={styles.originalPriceRow}>
                      <Text style={styles.flashPriceText}>
                        ₹{handleNumericAmnt(flashSaleProduct?.flashPrice || currentFlashSale?.flashPrice)}
                      </Text>
                      <Text style={styles.originalPriceText}>
                        ₹{handleNumericAmnt(productPrice)}  
                      </Text>
                      <View style={styles.flashDiscountBadge}>
                        <Text style={styles.discountText}>
                          {calculateDiscount(productPrice, flashSaleProduct?.flashPrice)}% OFF
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.timerWithProgressContainer}>
                  <View style={styles.timerRow}>
                    <MaterialIcons name="access-time" size={12} color="#f87171" />
                    <Text style={styles.timerLabel}>Ends in:</Text>
                    <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                  </View>
                  
                  <View style={styles.timeProgressContainer}>
                    <View style={styles.progressBarBackground}>
                      <LinearGradient
                        colors={['#dc2626', '#ea580c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressBarFill, { width: `${timePercentage}%` }]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
            {renderBundleProducts()}
          </LinearGradient>
        </View>
      );
    }
    
    return (
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        {/* Regular Bundle Card with Gradient */}
        <LinearGradient
          colors={['rgba(88, 28, 135, 0.2)', 'rgba(219, 39, 119, 0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.card,
            styles.bundleCard,
            isOutOfStock && styles.outOfStockCard
          ]}
        >
          <View style={styles.content}>
            <View style={styles.bundleImageContainer}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.bundleProductImage}
                resizeMode="cover"
              />
              
              <LinearGradient
                colors={['#9333ea', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bundleBadge}
              >
                <Ionicons name="cube" size={14} color="#fff" />
              </LinearGradient>

              {isOutOfStock && (
                <View style={styles.outOfStockOverlay}>
                  <Text style={styles.outOfStockText}>Out of Stock</Text>
                </View>
              )}
            </View>
            
            <View style={styles.productInfo}>
              <LinearGradient
                colors={['#9333ea', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bundleLabel}
              >
                <Text style={styles.bundleLabelText}>BUNDLE SALE</Text>
              </LinearGradient>
              
              <Text style={styles.productTitle} numberOfLines={2}>
                {title}
              </Text>
              
              {/* ✅ NEW: Interest Count Badge */}
              {interestCount > 0 && (
                <View style={styles.interestBadge}>
                  <Ionicons name="heart" size={12} color="#f87171" />
                  <Text style={styles.interestBadgeText}>
                    {interestCount} {interestCount === 1 ? 'user' : 'users'} interested
                  </Text>
                </View>
              )}
              
              {(
                //showStockWarning || 
              isOutOfStock) && (
                <View style={styles.stockContainer}>
                  {/* {showStockWarning && (
                    <Text style={styles.lowStockText}>
                      Only {availableQuantity} left
                    </Text>
                  )} */}
                  {isOutOfStock && (
                    <Text style={styles.outOfStockText}>
                      Out of stock
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.priceContainer}>
                <View style={styles.normalPrice}>
                  <MaterialIcons name="currency-rupee" size={16} color="#c084fc" />
                  <Text style={styles.bundlePriceText}>
                    {handleNumericAmnt(productPrice)}
                  </Text>
                  {mrp > productPrice && (
                    <>
                      <Text style={styles.mrpText}>
                        ₹{handleNumericAmnt(mrp)}
                      </Text>
                      {discountPercent > 0 && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>{discountPercent}%</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>

              {!isFlashSaleActive && (
                <TouchableOpacity
                  onPress={handleFlashSaleClick}
                  disabled={hasZeroQuantity || isAnotherFlashSaleActive}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#dc2626', '#ea580c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.bundleFlashButton,
                      (hasZeroQuantity || isAnotherFlashSaleActive) && styles.disabledButton
                    ]}
                  >
                    <Ionicons name="flash" size={16} color="#fff" />
                    <Text style={styles.flashButtonText}>
                      {hasZeroQuantity ? 'Out of Stock' : isAnotherFlashSaleActive ? 'Flash Sale Active' : 'Start Bundle Flash'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {renderBundleProducts()}
        </LinearGradient>
      </Animated.View>
    );
  }

  // Regular Product Rendering
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      {/* Regular Product Card - Always Show */}
      <View style={[
        styles.card,
        styles.normalCard,
        isOutOfStock && styles.outOfStockCard
      ]}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />

            {isOutOfStock && (
              <View style={styles.outOfStockOverlay}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {title}
            </Text>
            
            {/* ✅ NEW: Interest Count Badge */}
            {interestCount > 0 && (
              <View style={styles.interestBadge}>
                <Ionicons name="heart" size={12} color="#f87171" />
                <Text style={styles.interestBadgeText}>
                  {interestCount} {interestCount === 1 ? 'user' : 'users'} interested
                </Text>
              </View>
            )}
            
            {(
              //showStockWarning ||
             isOutOfStock) && (
              <View style={styles.stockContainer}>
                {/* {showStockWarning && (
                  <Text style={styles.lowStockText}>
                    Only {availableQuantity} left
                  </Text>
                )} */}
                {isOutOfStock && (
                  <Text style={styles.outOfStockText}>Out of stock</Text>
                )}
              </View>
            )}

            <View style={styles.priceContainer}>
              <View style={styles.normalPrice}>
                <MaterialIcons name="currency-rupee" size={14} color="#4ade80" />
                <Text style={styles.normalPriceText}>
                  {handleNumericAmnt(productPrice)}
                </Text>
                {mrp > productPrice && (
                  <>
                    <Text style={styles.mrpText}>₹{handleNumericAmnt(mrp)}</Text>
                    {discountPercent > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{discountPercent}%</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
            {!isFlashSaleActive && (
              <View style={styles.actionArea}>
                <TouchableOpacity
                  onPress={handleFlashSaleClick}
                  disabled={hasZeroQuantity || isAnotherFlashSaleActive}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#dc2626', '#ea580c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.flashButton,
                      (hasZeroQuantity || isAnotherFlashSaleActive) && styles.disabledButton
                    ]}
                  >
                    <Ionicons name="flash" size={14} color="#fff" />
                    <Text style={styles.flashButtonText}>
                      {hasZeroQuantity ? 'Out of Stock' : isAnotherFlashSaleActive ? 'Flash Sale Active' : 'Start Flash'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Flash Sale Version - Show only when active */}
      {isFlashSaleActive && (
        <View style={styles.flashSaleWrapper}>
          <LinearGradient
            colors={['rgba(239, 68, 68, 0.1)', 'rgba(234, 88, 12, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.card, styles.flashSaleCard]}
          >
            <View style={styles.content}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['#dc2626', '#ea580c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.flashBadge}
                >
                  <Ionicons name="flash" size={14} color="#fff" />
                </LinearGradient>
                <View style={styles.stockBadge}>
                  <Ionicons name="cube-outline" size={12} color="#fff" />
                  <Text style={styles.stockBadgeText}>{flashStock}</Text>
                </View>
              </View>

              <View style={styles.productInfo}>
                <LinearGradient
                  colors={['#dc2626', '#ea580c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.bundleFlashLabel}
                >
                  <Text style={styles.bundleFlashLabelText}>🔥 FLASH SALE</Text>
                </LinearGradient>
                
                <Text style={styles.productTitle} numberOfLines={2}>
                  {title}
                </Text>

                <View style={styles.priceContainer}>
                  <View style={styles.flashPriceContainer}>
                    <View style={styles.originalPriceRow}>
                      <Text style={styles.flashPriceText}>
                        ₹{handleNumericAmnt(flashSaleProduct?.flashPrice || currentFlashSale?.flashPrice)}
                      </Text>
                      <Text style={styles.originalPriceText}>
                        ₹{handleNumericAmnt(flashSaleProduct?.originalPrice || productPrice)}
                      </Text>
                      <View style={styles.flashDiscountBadge}>
                        <Text style={styles.discountText}>
                          {calculateDiscount(flashSaleProduct?.originalPrice || productPrice, flashSaleProduct?.flashPrice)}% OFF
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.timerWithProgressContainer}>
                  <View style={styles.timerRow}>
                    <MaterialIcons name="access-time" size={12} color="#f87171" />
                    <Text style={styles.timerLabel}>Ends in:</Text>
                    <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                  </View>
                  
                  <View style={styles.timeProgressContainer}>
                    <View style={styles.progressBarBackground}>
                      <LinearGradient
                        colors={['#dc2626', '#ea580c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressBarFill, { width: `${timePercentage}%` }]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: 12,
  },
  card: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: 12,
  },
  normalCard: {
    backgroundColor: '#18181b',
    borderColor: '#3f3f46',
  },
  bundleCard: {
    borderColor: 'rgba(147, 51, 234, 0.4)',
  },
  bundleFlashSaleCard: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    shadowColor: '#ef4444',
    shadowOpacity: 0.4,
  },
  flashSaleCard: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  flashSaleWrapper: {
    overflow: 'hidden',
  },
  outOfStockCard: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  bundleImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  bundleProductImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    // borderWidth: 2,
    // borderColor: 'rgba(147, 51, 234, 0.5)',
  },
  flashBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 16,
    padding: 6,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  bundleBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 16,
    padding: 7,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '600',
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  bundleLabel: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 6,
  },
  bundleLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bundleFlashLabel: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 6,
  },
  bundleFlashLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 18,
    marginBottom: 8,
  },
  interestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  interestBadgeText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
  stockContainer: {
    marginTop: 4,
  },
  lowStockText: {
    fontSize: 11,
    color: '#fb923c',
  },
  priceContainer: {
    marginTop: 4,
  },
  normalPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    flexWrap: 'wrap',
  },
  normalPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  bundlePriceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c084fc',
  },
  mrpText: {
    fontSize: 11,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  flashPriceContainer: {
    gap: 4,
  },
  originalPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  originalPriceText: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  flashDiscountBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  discountText: {
    fontSize: 10,
    color: '#4ade80',
    fontWeight: '600',
  },
  flashPriceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f87171',
  },
  bundleFlashButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  actionArea: {
    width: 96,
    height: 48,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  flashButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    right: 0,
    gap: 4,
    backgroundColor: '#d61818',
    borderWidth: 1,
    borderColor: 'rgba(6, 78, 59, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  timerWithProgressContainer: {
    marginTop: 8,
  },
  timeProgressContainer: {
    width: '100%',
    marginTop: 6,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timerLabel: {
    fontSize: 12,
    color: 'rgba(248, 113, 113, 0.8)',
    fontWeight: '500',
  },
  timerText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 'auto',
  },
  progressBarBackground: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(55, 65, 81, 0.7)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  bundleToggleButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 2,
    marginBottom: 2,
  },
  bundleToggleText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  bundleProductsList: {
    marginTop: 8,
    marginHorizontal: 4,
  },
  bundleProductsScroll: {
    maxHeight: 150,
  },
  bundleProductItem: {
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  bundleProductItemImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    flexShrink: 0,
  },
  bundleProductItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  bundleProductItemTitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  bundleProductItemCategory: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  bundleProductItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bundleProductItemQty: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bundleProductItemPrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bundleProductItemPriceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4ade80',
  },
});

export default BuyProductsSellers;
