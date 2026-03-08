import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Vibration,
  DeviceEventEmitter,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LottieView from 'lottie-react-native';
import { colors } from '../../Utils/Colors';
import { AWS_CDN_URL } from '../../Utils/aws';
import EnhancedUltraChatEngine from './ChatEngineBridge';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 🛒 COMMERCE-INTEGRATED CHAT FEATURES
 * Revolutionary shopping experience within chat
 * Seamless product discovery, ordering, and customer support
 */

// Product interfaces
interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  imageUrl: string;
  images?: string[];
  category: string;
  brand: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  fastDelivery: boolean;
  description: string;
  variants?: ProductVariant[];
  seller: ProductSeller;
  chatAvailable: boolean;
  liveShopping?: boolean;
}

interface ProductVariant {
  id: string;
  name: string;
  value: string;
  price?: number;
  inStock: boolean;
  imageUrl?: string;
}

interface ProductSeller {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  responseTime: string;
  isOnline: boolean;
  verified: boolean;
}

interface OrderTracking {
  orderId: string;
  status: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  estimatedDelivery: string;
  trackingNumber?: string;
  currentLocation?: string;
  updates: OrderUpdate[];
}

interface OrderUpdate {
  status: string;
  message: string;
  timestamp: number;
  location?: string;
}

// FEATURE 1: Interactive Product Cards
interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
  onQuickBuy: (product: Product, variant?: ProductVariant) => void;
  onChatWithSeller: (sellerId: string) => void;
  onViewDetails: (productId: string) => void;
  chatContext?: boolean;
}

export const InteractiveProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onQuickBuy,
  onChatWithSeller,
  onViewDetails,
  chatContext = false,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.[0] || null
  );
  const [showVariants, setShowVariants] = useState(false);
  const [quantity, setQuantity] = useState(1);
  
  const cardScale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const cartAnimation = useSharedValue(0);
  
  const handleAddToCart = useCallback(() => {
    cardScale.value = withSpring(0.95, {}, () => {
      cardScale.value = withSpring(1);
    });
    
    cartAnimation.value = withSpring(1, {}, () => {
      cartAnimation.value = withSpring(0);
    });
    
    onAddToCart(product, selectedVariant || undefined);
    Vibration.vibrate(50);
  }, [product, selectedVariant, onAddToCart]);
  
  const handleQuickBuy = useCallback(() => {
    onQuickBuy(product, selectedVariant || undefined);
  }, [product, selectedVariant, onQuickBuy]);
  
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
  
  const animatedCartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(cartAnimation.value, [0, 1], [1, 1.5]) }],
    opacity: interpolate(cartAnimation.value, [0, 0.5, 1], [1, 0.5, 1]),
  }));
  
  const currentPrice = selectedVariant?.price || product.price;
  const savings = product.originalPrice ? product.originalPrice - currentPrice : 0;
  const discountPercent = product.originalPrice ? 
    Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100) : 0;
  
  return (
    <Reanimated.View style={[styles.productCard, animatedCardStyle]}>
      {/* Product Image */}
      <TouchableOpacity onPress={() => onViewDetails(product.id)}>
        <FastImage
          source={{ uri: selectedVariant?.imageUrl || product.imageUrl }}
          style={styles.productImage}
          resizeMode={FastImage.resizeMode.cover}
        />
        
        {/* Badges */}
        <View style={styles.badgeContainer}>
          {discountPercent > 0 && (
            <View style={[styles.badge, styles.discountBadge]}>
              <Text style={styles.badgeText}>{discountPercent}% OFF</Text>
            </View>
          )}
          {product.fastDelivery && (
            <View style={[styles.badge, styles.fastDeliveryBadge]}>
              <Icon name="zap" size={10} color="#fff" />
              <Text style={styles.badgeText}>Fast</Text>
            </View>
          )}
          {product.liveShopping && (
            <View style={[styles.badge, styles.liveBadge]}>
              <View style={styles.liveIndicator} />
              <Text style={styles.badgeText}>LIVE</Text>
            </View>
          )}
        </View>
        
        {/* Wishlist Button */}
        <TouchableOpacity 
          style={styles.wishlistButton}
          onPress={() => {
            heartScale.value = withSpring(1.3, {}, () => {
              heartScale.value = withSpring(1);
            });
          }}
        >
          <Reanimated.View style={[{ transform: [{ scale: heartScale.value }] }]}>
            <Icon name="heart" size={16} color="#ff4757" />
          </Reanimated.View>
        </TouchableOpacity>
      </TouchableOpacity>
      
      {/* Product Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productBrand}>{product.brand}</Text>
        <Text style={styles.productTitle} numberOfLines={2}>
          {product.title}
        </Text>
        
        {/* Rating */}
        <View style={styles.ratingContainer}>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Icon
                key={star}
                name="star"
                size={12}
                color={star <= product.rating ? "#FFD700" : "#E0E0E0"}
                style={{ marginRight: 2 }}
              />
            ))}
          </View>
          <Text style={styles.reviewCount}>({product.reviewCount})</Text>
        </View>
        
        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>₹{currentPrice.toLocaleString()}</Text>
          {product.originalPrice && (
            <Text style={styles.originalPrice}>₹{product.originalPrice.toLocaleString()}</Text>
          )}
          {savings > 0 && (
            <Text style={styles.savings}>Save ₹{savings.toLocaleString()}</Text>
          )}
        </View>
        
        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <View style={styles.variantsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {product.variants.map((variant) => (
                <TouchableOpacity
                  key={variant.id}
                  style={[
                    styles.variantChip,
                    selectedVariant?.id === variant.id && styles.selectedVariant,
                  ]}
                  onPress={() => setSelectedVariant(variant)}
                >
                  <Text style={[
                    styles.variantText,
                    selectedVariant?.id === variant.id && styles.selectedVariantText,
                  ]}>
                    {variant.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Seller Info */}
        <TouchableOpacity 
          style={styles.sellerInfo}
          onPress={() => onChatWithSeller(product.seller.id)}
        >
          <FastImage
            source={{ uri: product.seller.avatar }}
            style={styles.sellerAvatar}
          />
          <View style={styles.sellerDetails}>
            <Text style={styles.sellerName}>{product.seller.name}</Text>
            <View style={styles.sellerStats}>
              <Icon name="star" size={10} color="#FFD700" />
              <Text style={styles.sellerRating}>{product.seller.rating}</Text>
              <Text style={styles.responseTime}>• Responds in {product.seller.responseTime}</Text>
            </View>
          </View>
          {product.seller.isOnline && <View style={styles.onlineIndicator} />}
          {product.seller.verified && <Icon name="check-circle" size={14} color="#4CAF50" />}
        </TouchableOpacity>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.addToCartButton}
            onPress={handleAddToCart}
          >
            <Reanimated.View style={animatedCartStyle}>
              <Icon name="shopping-cart" size={16} color="#fff" />
            </Reanimated.View>
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickBuyButton}
            onPress={handleQuickBuy}
          >
            <Icon name="zap" size={16} color="#000" />
            <Text style={styles.quickBuyText}>Quick Buy</Text>
          </TouchableOpacity>
        </View>
        
        {/* Chat with Seller Button */}
        {product.chatAvailable && (
          <TouchableOpacity 
            style={styles.chatSellerButton}
            onPress={() => onChatWithSeller(product.seller.id)}
          >
            <Icon name="message-circle" size={16} color={colors.primaryButtonColor} />
            <Text style={styles.chatSellerText}>Chat with Seller</Text>
          </TouchableOpacity>
        )}
      </View>
    </Reanimated.View>
  );
};

// FEATURE 2: Order Tracking in Chat
interface OrderTrackingProps {
  tracking: OrderTracking;
  onTrackOrder: (orderId: string) => void;
  onContactSupport: () => void;
}

export const InChatOrderTracking: React.FC<OrderTrackingProps> = ({
  tracking,
  onTrackOrder,
  onContactSupport,
}) => {
  const [expanded, setExpanded] = useState(false);
  const expandAnimation = useSharedValue(0);
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
    expandAnimation.value = withTiming(expanded ? 0 : 1);
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    height: interpolate(expandAnimation.value, [0, 1], [80, 300]),
  }));
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return '#2196F3';
      case 'confirmed': return '#FF9800';
      case 'shipped': return '#9C27B0';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'placed': return 'check-circle';
      case 'confirmed': return 'clock';
      case 'shipped': return 'truck';
      case 'delivered': return 'package';
      case 'cancelled': return 'x-circle';
      default: return 'circle';
    }
  };
  
  return (
    <Reanimated.View style={[styles.orderTrackingCard, animatedStyle]}>
      <TouchableOpacity onPress={toggleExpanded} style={styles.orderHeader}>
        <View style={styles.orderStatusIcon}>
          <Icon 
            name={getStatusIcon(tracking.status)} 
            size={20} 
            color={getStatusColor(tracking.status)} 
          />
        </View>
        <View style={styles.orderHeaderInfo}>
          <Text style={styles.orderNumber}>Order #{tracking.orderId}</Text>
          <Text style={styles.orderStatus}>
            {tracking.status.charAt(0).toUpperCase() + tracking.status.slice(1)}
          </Text>
          <Text style={styles.estimatedDelivery}>
            Est. Delivery: {tracking.estimatedDelivery}
          </Text>
        </View>
        <Icon 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.orderDetails}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            {['placed', 'confirmed', 'shipped', 'delivered'].map((status, index) => (
              <View key={status} style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  { backgroundColor: getStatusColor(tracking.status) }
                ]} />
                {index < 3 && (
                  <View style={[
                    styles.progressLine,
                    { backgroundColor: index < ['placed', 'confirmed', 'shipped', 'delivered'].indexOf(tracking.status) ? getStatusColor(tracking.status) : '#E0E0E0' }
                  ]} />
                )}
              </View>
            ))}
          </View>
          
          {/* Recent Updates */}
          <View style={styles.updatesContainer}>
            <Text style={styles.updatesTitle}>Recent Updates</Text>
            {tracking.updates.slice(0, 3).map((update, index) => (
              <View key={index} style={styles.updateItem}>
                <View style={styles.updateDot} />
                <View style={styles.updateContent}>
                  <Text style={styles.updateMessage}>{update.message}</Text>
                  <Text style={styles.updateTime}>
                    {new Date(update.timestamp).toLocaleString()}
                  </Text>
                  {update.location && (
                    <Text style={styles.updateLocation}>{update.location}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
          
          {/* Action Buttons */}
          <View style={styles.trackingActions}>
            <TouchableOpacity 
              style={styles.trackButton}
              onPress={() => onTrackOrder(tracking.orderId)}
            >
              <Icon name="map-pin" size={16} color="#fff" />
              <Text style={styles.trackButtonText}>Track Live</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.supportButton}
              onPress={onContactSupport}
            >
              <Icon name="headphones" size={16} color={colors.primaryButtonColor} />
              <Text style={styles.supportButtonText}>Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Reanimated.View>
  );
};

// REMOVED: AI Shopping Assistant - No AI features per requirements

// FEATURE 4: Quick Payment in Chat
interface QuickPaymentProps {
  amount: number;
  productName: string;
  sellerId: string;
  onPaymentComplete: (paymentId: string) => void;
  onPaymentCancel: () => void;
}

export const QuickPaymentWidget: React.FC<QuickPaymentProps> = ({
  amount,
  productName,
  sellerId,
  onPaymentComplete,
  onPaymentCancel,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'wallet'>('upi');
  const [processing, setProcessing] = useState(false);
  const paymentScale = useSharedValue(1);
  
  const handlePayment = async () => {
    setProcessing(true);
    paymentScale.value = withSpring(0.95);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      paymentScale.value = withSpring(1);
      onPaymentComplete('payment_' + Date.now());
    }, 2000);
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: paymentScale.value }],
  }));
  
  return (
    <Reanimated.View style={[styles.paymentWidget, animatedStyle]}>
      <View style={styles.paymentHeader}>
        <Text style={styles.paymentTitle}>Quick Payment</Text>
        <TouchableOpacity onPress={onPaymentCancel}>
          <Icon name="x" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.paymentProduct}>{productName}</Text>
      <Text style={styles.paymentAmount}>₹{amount.toLocaleString()}</Text>
      
      {/* Payment Methods */}
      <View style={styles.paymentMethods}>
        {[
          { id: 'upi', name: 'UPI', icon: '📱' },
          { id: 'card', name: 'Card', icon: '💳' },
          { id: 'wallet', name: 'Wallet', icon: '👛' },
        ].map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethod,
              paymentMethod === method.id && styles.selectedPaymentMethod,
            ]}
            onPress={() => setPaymentMethod(method.id as any)}
          >
            <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
            <Text style={[
              styles.paymentMethodText,
              paymentMethod === method.id && styles.selectedPaymentMethodText,
            ]}>
              {method.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Payment Button */}
      <TouchableOpacity 
        style={[styles.payButton, processing && styles.payButtonProcessing]}
        onPress={handlePayment}
        disabled={processing}
      >
        {processing ? (
          <LottieView
            source={require('../../assets/animations/Like.json')}
            autoPlay
            loop
            style={styles.paymentLoader}
          />
        ) : (
          <>
            <Icon name="credit-card" size={18} color="#000" />
            <Text style={styles.payButtonText}>Pay ₹{amount.toLocaleString()}</Text>
          </>
        )}
      </TouchableOpacity>
      
      <Text style={styles.paymentSecure}>🔒 Secure payment powered by Flykup Pay</Text>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  // Product Card Styles
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountBadge: {
    backgroundColor: '#FF4757',
  },
  fastDeliveryBadge: {
    backgroundColor: '#2ED573',
  },
  liveBadge: {
    backgroundColor: '#FF3838',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 2,
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 15,
    padding: 6,
  },
  productInfo: {
    padding: 12,
  },
  productBrand: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 4,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 11,
    color: '#666',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  savings: {
    fontSize: 11,
    color: '#4CAF50',
    marginLeft: 6,
    fontWeight: '500',
  },
  variantsContainer: {
    marginTop: 8,
  },
  variantChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedVariant: {
    backgroundColor: colors.primaryButtonColor + '20',
    borderColor: colors.primaryButtonColor,
  },
  variantText: {
    fontSize: 11,
    color: '#666',
  },
  selectedVariantText: {
    color: colors.primaryButtonColor,
    fontWeight: '600',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  sellerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sellerDetails: {
    flex: 1,
    marginLeft: 8,
  },
  sellerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sellerRating: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
  },
  responseTime: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 10,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  quickBuyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 8,
    paddingVertical: 10,
  },
  quickBuyText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  chatSellerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryButtonColor,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
  },
  chatSellerText: {
    color: colors.primaryButtonColor,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Order Tracking Styles
  orderTrackingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  orderStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  estimatedDelivery: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 2,
  },
  orderDetails: {
    marginTop: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressLine: {
    height: 2,
    width: 40,
    marginTop: 6,
  },
  updatesContainer: {
    marginBottom: 12,
  },
  updatesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  updateItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  updateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
    marginTop: 6,
    marginRight: 8,
  },
  updateContent: {
    flex: 1,
  },
  updateMessage: {
    fontSize: 12,
    color: '#000',
  },
  updateTime: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  updateLocation: {
    fontSize: 10,
    color: '#2196F3',
    marginTop: 2,
  },
  trackingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  trackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 8,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryButtonColor,
    borderRadius: 8,
    paddingVertical: 8,
  },
  supportButtonText: {
    color: colors.primaryButtonColor,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // AI Assistant Styles
  assistantTrigger: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 25,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  assistantAnimation: {
    width: 30,
    height: 30,
  },
  assistantTriggerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
    marginTop: 4,
  },
  assistantModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  assistantContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  assistantIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  assistantTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    marginLeft: 10,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  voiceButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Payment Widget Styles
  paymentWidget: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  paymentProduct: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentMethod: {
    backgroundColor: colors.primaryButtonColor + '20',
    borderColor: colors.primaryButtonColor,
  },
  paymentMethodIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#666',
  },
  selectedPaymentMethodText: {
    color: colors.primaryButtonColor,
    fontWeight: '600',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  payButtonProcessing: {
    backgroundColor: '#f5f5f5',
  },
  payButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentLoader: {
    width: 24,
    height: 24,
  },
  paymentSecure: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
});

export {
  InteractiveProductCard,
  InChatOrderTracking,
  // AIShoppingAssistant removed - No AI features
  QuickPaymentWidget,
};