'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  Linking,
  ActivityIndicator,
  ToastAndroid,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AWS_CDN_URL} from '../../Utils/aws';
import axiosInstance from '../../Utils/Api';
import ProductResults from '../GloabalSearch/ProductsResult';
import VideoResults from '../GloabalSearch/VideoResult';
import {colors} from '../../Utils/Colors';
import {NavigationIcon} from 'lucide-react-native';
import ImageModal from '../Profile/ImageModal';
import CheckoutSlider from '../Reuse/CheckOutGlobal';

const {width} = Dimensions.get('window');

const MessageItem = ({
  message,
  index,
  messages,
  currentUserId,
  otherParticipant,
  navigation,
  onReaction,
  onRemoveReaction,
  onEditMessage,
}) => {
  const formatTime = timestamp => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };
  // Product-related state

  const [productData, setProductData] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState(null);
  const [wishlistLoading, setWishlistLoading] = useState(new Set());
  const [localWishlistState, setLocalWishlistState] = useState({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

   const [isImageModal,setisIamgeModal]=useState(false)

  // Shoppable video-related state
  const [shoppableVideoData, setShoppableVideoData] = useState(null);
  const [shoppableVideoLoading, setShoppableVideoLoading] = useState(false);
  const [shoppableVideoError, setShoppableVideoError] = useState(null);

  // Edit message state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const formatDate = timestamp => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const isOwnMessage = message?.senderId?._id === currentUserId;

  const showDate =
    index === 0 ||
    formatDate(message.createdAt) !==
      formatDate(messages[index - 1]?.createdAt);

  // ✅ FIXED: Improved read status detection logic from web version
  const getMessageStatus = message => {
    // Show clock for sending/temp messages
    if (message.status === 'sending' || message._id?.startsWith('temp_')) {
      return 'sending';
    }

    // Check if message has been read
    const hasBeenRead = () => {
      // Priority 1: Check explicit read status
      if (message.status === 'read') {
        console.log('✅ Message marked as read (status):', message._id);
        return true;
      }
      
      // Priority 2: Check deliveryStatus array for readAt from other users
      if (message.deliveryStatus && Array.isArray(message.deliveryStatus)) {
        const otherUsersReadStatus = message.deliveryStatus.filter(status => {
          const statusUserId = typeof status.userId === 'object' ? status.userId._id : status.userId;
          return statusUserId && statusUserId.toString() !== currentUserId.toString();
        });
        
        // Message is read if ANY other participant has readAt set
        const anyOtherHasRead = otherUsersReadStatus.some(status => {
          const hasRead = status.readAt !== null && status.readAt !== undefined;
          if (hasRead) {
            console.log('✅ Message read by user:', status.userId, 'at', status.readAt);
          }
          return hasRead;
        });
        
        if (anyOtherHasRead) return true;
      }
      
      // Priority 3: Check readAt field directly on message
      if (message.readAt) {
        console.log('✅ Message has readAt field:', message.readAt);
        return true;
      }
      
      return false;
    };

    const hasBeenDelivered = () => {
      // Priority 1: Check explicit delivered/read status
      if (message.status === 'delivered' || message.status === 'read') {
        return true;
      }
      
      // Priority 2: Check deliveryStatus array
      if (message.deliveryStatus && Array.isArray(message.deliveryStatus)) {
        const otherUsersDeliveryStatus = message.deliveryStatus.filter(status => {
          const statusUserId = typeof status.userId === 'object' ? status.userId._id : status.userId;
          return statusUserId && statusUserId.toString() !== currentUserId.toString();
        });
        
        const anyOtherHasDelivered = otherUsersDeliveryStatus.some(status => 
          status.deliveredAt !== null && status.deliveredAt !== undefined
        );
        
        if (anyOtherHasDelivered) return true;
      }
      
      // Priority 3: Check if status is 'sent' (means delivered to server)
      if (message.status === 'sent') return true;
      
      return false;
    };

    const isRead = hasBeenRead();
    const isDelivered = hasBeenDelivered();

    if (isRead) return 'read';
    if (isDelivered) return 'delivered';
    return 'sent';
  };

  const renderMessageStatus = () => {
    if (!isOwnMessage) return null;
    const status = getMessageStatus(message);

    switch (status) {
      case 'sending':
        return <Ionicons name="time-outline" size={14} color="#999" />;
      case 'sent':
        return <Ionicons name="checkmark-outline" size={14} color="#999" />;
      case 'delivered':
        return (
          <Ionicons name="checkmark-done-outline" size={14} color="#999" />
        );
      case 'read':
        return (
          <Ionicons name="checkmark-done-outline" size={14} color="#1ecbe1" />
        );
      default:
        return null;
    }
  };
  // import { Text, Linking } from "react-native"

const renderTextWithLinks = (text: string, hideLinks = false) => {
  if (!text) return null;

  // Match product/reel URLs or general links
  const urlRegex = /((?:https?:\/\/[^\s]*)?\/user\/(product|reel)\/[a-zA-Z0-9]+|https?:\/\/[^\s]+)/g;

  if (hideLinks) {
    // Remove URLs entirely when hiding links
    const cleanText = text.replace(urlRegex, '').trim();
    return cleanText ? <Text className="text-white">{cleanText}</Text> : null;
  }

  const parts = text.split(urlRegex);

  const onLinkPress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.warn('Cannot open URL:', url);
      }
    } catch (err) {
      console.warn('Error opening URL:', url, err);
    }
  };

  return (
    <Text className="text-white">
      {parts
        .filter(Boolean)
        .map((part, index) => {
          if (part === 'product' || part === 'reel') {
            return null;
          }

          // Match product/reel URLs
          const productReelRegex = /(?:https?:\/\/[^\s]*)?\/user\/(product|reel)\/[a-zA-Z0-9]+/;
          if (productReelRegex.test(part)) {
            const productId = extractProductId(part);
            const videoId = extractShoppableVideoId(part);

            return (
              <Text
                key={index}
                className="text-blue-400 underline"
                onPress={() => {
                  if (productId) {
                    navigation.navigate('ProductDetails', { id: productId,type:'static' });
                  } else if (videoId) {
                    navigation.navigate('ReelDetails', { id: videoId });
                  }
                }}>
                {part}
              </Text>
            );
          }

          // Match general URLs
          const generalUrlRegex = /^https?:\/\/[^\s]+$/;
          if (generalUrlRegex.test(part)) {
            return (
              <Text
                key={index}
                className="text-blue-400 underline"
                onPress={() => onLinkPress(part)}>
                {part}
              </Text>
            );
          }

          return (
            <Text key={index} className="text-white">
              {part}
            </Text>
          );
        })}
    </Text>
  );
};

  const handleToggleWishlist = async productId => {
    // Add product to loading set
    // setWishlistLoading(prev => new Set(prev).add(productId));
    //
    try {
      const response = await axiosInstance.post(
        `/wishlist/${productId}/toggle`,
      );

      if (response.status === 200 && response.data.status) {
        const isAddedToWishlist = response.data.data.isInWishlist;

        // setWishlistItems(prev => {
        //   const newSet = new Set(prev);
        //   if (isAddedToWishlist) {
        //     newSet.add(productId);
        //   } else {
        //     newSet.delete(productId);
        //   }
        //   return newSet;
        // });

        // ✅ Toggle `isInwishlist` in results.products
        // setResults(prevResults => ({
        //   ...prevResults,
        //   products: prevResults.products.map(product =>
        //     product._id === productId
        //       ? { ...product, isInWishlist: isAddedToWishlist }
        //       : product
        //   )
        // }));

        ToastAndroid.show(
          response.data.message ||
            (isAddedToWishlist ? 'Added to wishlist' : 'Removed from wishlist'),
          ToastAndroid.SHORT,
        );
      } else {
        ToastAndroid.show('Failed to update wishlist', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      ToastAndroid.show('Failed to update wishlist', ToastAndroid.SHORT);
    } finally {
      // Remove product from loading set
      setWishlistLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Extract shoppable video ID from URL
  const extractShoppableVideoId = text => {
    if (!text) return null;

    // Regex to match both full URLs and relative paths for /user/reel/{videoId} pattern
    const reelUrlRegex = /(?:https?:\/\/[^\s]*)?\/user\/reel\/([a-zA-Z0-9]+)/;
    const match = text.match(reelUrlRegex);

    return match ? match[1] : null;
  };
const isFromShoppableVideo = (message) => {
  return message.metadata?.fromVideo || 
         message.metadata?.messageType === 'video_question' || 
         message.metadata?.context === 'shoppable_video_ask_me' ||
         message.fromVideo || // Add fallback
         (message.content?.text && (message.content.text.includes('/user/reel/') ||message.content.text.includes('/user/shoppable-video/'))&& 
          (message.metadata?.fromVideo || message.metadata?.messageType === 'video_question'));
};

  const renderMessageContent = () => {
    const liveData=message?.content?.liveStreamShare
    
    switch (message.messageType) {
      case 'text':
        // If in edit mode, show edit UI
        if (isEditing) {
          return (
            <View style={styles.editContainer}>
              <TextInput
                value={editText}
                onChangeText={setEditText}
                style={styles.editInput}
                multiline
                maxLength={1000}
                autoFocus
                editable={!isSavingEdit}
                placeholder="Edit message..."
                placeholderTextColor="#999"
              />
              <View style={styles.editButtonsContainer}>
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  disabled={isSavingEdit}
                  style={[styles.editButton, styles.cancelButton]}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  disabled={isSavingEdit || !editText.trim()}
                  style={[
                    styles.editButton,
                    styles.saveButton,
                    (isSavingEdit || !editText.trim()) && styles.disabledButton,
                  ]}>
                  <Text style={styles.saveButtonText}>
                    {isSavingEdit ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

      const messageText = message?.content?.text || 'Message content not available';
        // console.log(message.messageType,messageText)
      const productId = extractProductId(messageText);
      const videoId = extractShoppableVideoId(messageText);

      const isProductOnlyMessage =
        productId &&
        messageText.trim().match(/^(?:https?:\/\/[^\s]*)?\/user\/product\/[a-zA-Z0-9]+$/);
      const isVideoOnlyMessage =
        videoId &&
        messageText.trim().match(/^(?:https?:\/\/[^\s]*)?\/user\/reel\/[a-zA-Z0-9]+$/);

      const isFromShoppable = videoId ? true : isFromShoppableVideo(message);
      const shouldHideLinks = message.source !== 'chat';

      return (
        <View className="space-y-3">
          {/* Product preview */}
          {productId && !isFromShoppable && (
            <View className="max-w-[280px]">
              {productLoading && (
                <View className="flex flex-row items-center justify-center p-4 bg-black/40 border border-gray-700/50 rounded-xl">
                  <ActivityIndicator size="small" color={colors.primaryButtonColor} />
                  <Text className="ml-2 text-sm text-gray-400">Loading product...</Text>
                </View>
              )}

              {productError && (
                <View className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
                  <Text className="text-red-400 text-sm">Failed to load product preview</Text>
                </View>
              )}

              {productData && !productLoading && (
                <View style={{width:200}}>
                  {/* <Text className="text-xs text-gray-400 mb-2">
                    📹 From{' '}
                    {message.source === 'shoppable'
                      ? 'Shoppable Video'
                      : message.source === 'product'
                      ? 'Product'
                      : message.source === 'liveVideo'
                      ? 'Live Video'
                      : message.source === 'chat'
                      ? 'Chat'
                      : 'Video'}
                  </Text> */}
                  <ProductResults
                    product={productData}
                    onSave={() => navigation.navigate('ProductDetails', { id: productId,type:'static'})}
                    isShowSave={false}
                  />
                </View>
              )}
            </View>
          )}

          {/* Shoppable Video preview */}
          {videoId && isFromShoppable && (
            <View className="mt-3 border-t border-gray-600/30 pt-3">
              {shoppableVideoLoading && (
                <View className="flex flex-row items-center justify-center p-3 bg-black/40 border border-gray-700/50 rounded-lg">
                  <ActivityIndicator size="small" color={colors.primaryButtonColor} />
                  <Text className="ml-2 text-xs text-gray-400">Loading video...</Text>
                </View>
              )}

              {shoppableVideoError && (
                <View className="p-2 bg-red-900/20 border border-red-800/30 rounded-md">
                  <Text className="text-red-400 text-xs">Failed to load video preview</Text>
                </View>
              )}

              {shoppableVideoData && !shoppableVideoLoading && (
                
                  <TouchableOpacity onPress={()=>navigation.navigate("reel",{id:shoppableVideoData?._id})} style={{width:200}}>
                {/* <View> */}
                  {/* <Text className="text-xs text-gray-400 mb-2">
                    📹 From{' '}
                    {message.source === 'shoppable'
                      ? 'Shoppable Video'
                      : message.source === 'product'
                      ? 'Product'
                      : message.source === 'liveVideo'
                      ? 'Live Video'
                      : message.source === 'chat'
                      ? 'Chat'
                      : 'Video'}
                  </Text> */}
                  <VideoResults video={shoppableVideoData} error={shoppableVideoError} />
                {/* </View> */}
                  </TouchableOpacity>
              )}
            </View>
          )}
{/* {message.source=="liveVideo" && <View
              className="leading-relaxed"
              style={{ maxWidth: productId || videoId ? 280 : 'auto' }}>
              {renderTextWithLinks(messageText, shouldHideLinks)}
            </View>} */}
          {/* Text content (only if not pure product/reel) */}
          {!isProductOnlyMessage && !isVideoOnlyMessage && renderTextWithLinks(messageText, shouldHideLinks) && (
            <View
              className="leading-relaxed"
              style={{ maxWidth: productId || videoId ? 280 : 'auto' }}>
                {/* {console.log("trying to s",messageText)} */}
              {renderTextWithLinks(messageText, shouldHideLinks)}
              {/* Show "edited" indicator if message was edited */}
              {message.metadata?.isEdited && (
                <Text style={styles.editedIndicator}> (edited)</Text>
              )}
            </View>
          )}
        </View>
        );

      case 'image':

      {
      // Construct image URL
      let imageUrl = null;
      if (message.content?.media?.url) {
        imageUrl = message.content.media.url.startsWith('http')
          ? message.content.media.url
          : `${AWS_CDN_URL}${message.content.media.url}`;
      } else if (message.content?.media?.key) {
        imageUrl = `${AWS_CDN_URL}${message.content.media.key}`;
      }

      return (
        <>
        <ImageModal visible={isImageModal} onClose={()=>setisIamgeModal(false)} imageUri={imageUrl}/>
        <View style={{ marginVertical: 8 ,alignItems:'center'}}>
          {imageUrl ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                // Optional: open full-screen image viewer
              //  setFullScreenImage({ uri: imageUrl });
              setisIamgeModal(true)
              }}
            >
              <Image
                source={{ uri: imageUrl }}
                style={{ width: 240, height: 200, borderRadius: 12 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <View
              style={{
                width: 240,
                height: 200,
                borderRadius: 12,
                backgroundColor: 'rgba(100,100,100,0.3)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#ccc', fontSize: 12 }}>Image not available</Text>
            </View>
          )}

          {/* Caption text */}
          {message.content?.text && (
            <View style={{ marginTop: 4, maxWidth: 240 }}>{renderTextWithLinks(message.content.text)}</View>
          )}
        </View>
        </>
      );
    }
      case 'media':
        return (
          <View className="space-y-2">
            {message.content?.media?.url && (
              <Image
                source={{uri: message.content.media.url}}
                className="max-w-[240px] rounded-xl shadow-lg"
                style={{width: 240, height: 200}}
                resizeMode="cover"
              />
            )}
            {message.content?.text && (
              <View className="break-words leading-relaxed">
                {renderTextWithLinks(message.content.text)}
              </View>
            )}
          </View>
        );

      case 'file':
        return (
          <View
            className={`flex flex-row items-center gap-3 p-3 rounded-xl shadow-sm ${
               isOwnMessage ? 'bg-black/10' : 'bg-white/5'
            }`}>
            <View
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isOwnMessage ? 'bg-black/20' : 'bg-white/10'
              }`}>
              <Text className="text-lg">📁</Text>
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-medium" numberOfLines={1}>
                {message.content?.media?.fileName || 'File attachment'}
              </Text>
              {message.content?.media?.fileSize && (
                <Text
                  className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-black/60' : 'text-white/60'
                  }`}>
                  {(message.content.media.fileSize / 1024 / 1024).toFixed(2)} MB
                </Text>
              )}
            </View>
          </View>
        );

      case 'location':
        return (
          <View
            className={`flex flex-row items-center gap-2 p-3 rounded-xl ${
              isOwnMessage ? 'bg-black/10' : 'bg-white/5'
            }`}>
            <Text className="text-yellow-400">📍</Text>
            <Text className="text-sm">
              {message.content?.location?.address || 'Location shared'}
            </Text>
          </View>
        );

      case 'product_share':
      case 'productShare': {
        const productShare = message.content?.productShare;

        if (!productShare) {
          return (
            <View className="p-3 rounded-xl bg-black/20 border border-white/10">
              <Text className="text-gray-400 italic text-sm">
                Product information not available
              </Text>
            </View>
          );
        }

        // Helper function to calculate discount percentage
        const calculateDiscount = (mrp, price) => {
          if (!mrp || mrp <= price) return 0;
          return Math.round(((mrp - price) / mrp) * 100);
        };

        // Get product data from productShare - could be full object or just productId
        const productShareData = productShare.productId;
        const hasActiveFlashSale = productShareData?.flashSale?.isActive && productShareData?.flashSale?.endsAt;
        const flashSalePrice = hasActiveFlashSale ? productShareData.flashSale.flashPrice : null;
        const flashSaleOriginalPrice = hasActiveFlashSale ? productShareData.flashSale.originalPrice : null;

        // Calculate discount based on flash sale or regular pricing
        const discountPercentage = hasActiveFlashSale && flashSalePrice && flashSaleOriginalPrice
          ? calculateDiscount(flashSaleOriginalPrice, flashSalePrice)
          : calculateDiscount(productShare.productMRP, productShare.productPrice);

        // Format price in Indian Rupees
        const formatPrice = (price) => {
          if (!price) return null;
          return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
          }).format(price);
        };

        // Handle product click navigation
        const handleProductPress = () => {
          const productId = productShare.productId?._id || productShare.productId;
          if (productId) {
            navigation.navigate('ProductDetails', {id: productId, type: 'static'});
          }
        };

        // Handle Buy Now - prepare product data for checkout and open modal
        const handleBuyNow = () => {
          const productId = productShare.productId?._id || productShare.productId;
          const fullProductData = productShare.productId || {};

          // Extract parent product ID correctly
          let parentProductId = null;
          if (fullProductData.parentProductId) {
            parentProductId = typeof fullProductData.parentProductId === 'object'
              ? fullProductData.parentProductId._id
              : fullProductData.parentProductId;
          }

          // Extract childVariantIds from parent if available
          let childVariantIds = fullProductData.childVariantIds;
          if (!childVariantIds && fullProductData.parentProductId && typeof fullProductData.parentProductId === 'object') {
            childVariantIds = fullProductData.parentProductId.childVariantIds;
          }

          const productForCheckout = {
            _id: productId,
            title: productShare.productName || fullProductData.title,
            productPrice: productShare.productPrice || fullProductData.productPrice,
            productMRP: productShare.productMRP || fullProductData.MRP,
            MRP: productShare.productMRP || fullProductData.MRP,
            signedImages: [productShare.productImage],
            images: productShare.productImage ? [{
              key: productShare.productImage.replace(AWS_CDN_URL, ''),
              azureUrl: productShare.productImage
            }] : [],
            gstRate: fullProductData.gstRate || 0,
            deliveryCharge: fullProductData.deliveryCharge || 0,
            estimatedDeliveryDate: fullProductData.estimatedDeliveryDate,
            logisticsType: fullProductData.logisticsType,
            stock: fullProductData.stock,
            size: fullProductData.size,
            weight: fullProductData.weight,
            dimensions: fullProductData.dimensions,
            sellerId: fullProductData.sellerId,
            flashSale: fullProductData.flashSale,
            hasReturn: fullProductData.hasReturn,
            returnDays: fullProductData.returnDays,
            returnPolicy: fullProductData.returnPolicy,
            parentProductId: parentProductId,
            childVariantIds: childVariantIds,
            variantAttributes: fullProductData.variantAttributes,
            isVariant: fullProductData.isVariant
          };

          // Open checkout modal using local state
          setSelectedProduct(productForCheckout);
          setIsCheckoutOpen(true);
        };

        // Handle Buy Now - navigate to product details where checkout can be triggered
        // const handleBuyNow = () => {
        //   const productId = productShare.productId?._id || productShare.productId;
        //   if (productId) {
        //     // Navigate to ProductDetails where user can add to cart or buy now
        //     navigation.navigate('ProductDetails', {id: productId, type: 'static'});
        //   }
        // };

        return (
          <View className="space-y-2">
            {/* Product Share Label */}
            <View className="flex-row items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 w-fit mb-2">
              <Text className="text-xs text-blue-400">🛍️</Text>
              <Text className="text-xs text-blue-400">Shared a product</Text>
            </View>

            {/* Product Card */}
            <TouchableOpacity
              onPress={handleProductPress}
              activeOpacity={0.8}
              className={`rounded-2xl overflow-hidden shadow-md border ${
                isOwnMessage
                  ? 'bg-black/10 border-black/20'
                  : 'bg-white/5 border-white/10'
              }`}
              style={{width: 180}}>

              {/* Image Section */}
              <View className="relative">
                {productShare.productImage ? (
                  <Image
                    source={{uri: productShare.productImage}}
                    className="w-full aspect-square"
                    style={{width: 180, height: 180}}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    className="w-full aspect-square bg-gray-800 items-center justify-center"
                    style={{width: 180, height: 180}}>
                    <Text className="text-4xl">📦</Text>
                  </View>
                )}

                {/* Flash Sale Badge with Timer - Top Left */}
                {hasActiveFlashSale ? (
                  <View className="absolute top-2 left-2 flex-col gap-1 z-10">
                    <View className="flex-row items-center gap-1 bg-gradient-to-r from-red-600 to-red-500 px-2 py-0.5 rounded text-xs font-bold">
                      <Text className="text-white text-xs font-bold">⚡ FLASH {discountPercentage > 0 && `-${discountPercentage}%`}</Text>
                    </View>
                  </View>
                ) : (
                  /* Regular Discount Badge (when not flash sale) */
                  discountPercentage > 0 && (
                    <View className="absolute top-3 left-3 flex-row items-center gap-1 bg-red-600/90 px-2 py-1 rounded-full">
                      <Text className="text-white text-xs font-semibold">-{discountPercentage}%</Text>
                    </View>
                  )
                )}
              </View>

              {/* Product Info */}
              <View className="p-3 flex-col">
                <Text
                  className="font-medium text-sm text-white"
                  numberOfLines={2}
                  style={{lineHeight: 18}}>
                  {productShare.productName || 'Product'}
                </Text>

                {/* Price Section - Flash Sale or Regular */}
                <View className="mt-1 flex-row items-center gap-2">
                  {hasActiveFlashSale && flashSalePrice ? (
                    <>
                      <Text className="text-red-500 font-bold text-base">
                        {formatPrice(flashSalePrice)}
                      </Text>
                      {flashSaleOriginalPrice && flashSaleOriginalPrice > flashSalePrice && (
                        <Text className="text-white/40 line-through text-xs">
                          {formatPrice(flashSaleOriginalPrice)}
                        </Text>
                      )}
                    </>
                  ) : (
                    <>
                      <Text className="text-yellow-500 font-bold text-base">
                        {formatPrice(productShare.productPrice)}
                      </Text>
                      {productShare.productMRP && productShare.productMRP > productShare.productPrice && (
                        <Text className="text-white/40 line-through text-xs">
                          {formatPrice(productShare.productMRP)}
                        </Text>
                      )}
                    </>
                  )}
                </View>

                {/* Buy Button */}
                <TouchableOpacity
                  onPress={handleBuyNow}
                  className="mt-3 bg-yellow-500 py-2 rounded-full flex-row items-center justify-center"
                  activeOpacity={0.8}>
                  <Text className="text-black font-semibold text-xs">Buy Now</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        );
      }

      case 'system_message':
        return (
          <View className="items-center py-2">
            <View className="bg-gray-800/50 px-3 py-1.5 rounded-full">
              <Text className="text-xs text-gray-400">
                {message.content?.systemMessage?.data || 'System message'}
              </Text>
            </View>
          </View>
        );
        case 'live_stream_share':
          return (
          <View
  className={`rounded-xl overflow-hidden border shadow-lg ${
    isOwnMessage
      ? 'bg-black/10 border-black/20'
      : 'bg-white/5 border-white/10'
  }`}
  style={{ width: '100%' }}>
  <TouchableOpacity 
    onPress={() => navigation.navigate("LiveScreen", { stream: { _id: liveData?.liveStreamId } })}
    activeOpacity={0.9}>
    
    {/* Thumbnail Section */}
    <View className="relative" style={{ height: 150 ,width:150}}>
      {liveData?.streamThumbnail ? (
        <Image
          source={{ uri: `${AWS_CDN_URL}${liveData?.streamThumbnail}` }}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        // Fallback gradient background
        <View className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center">
          <Text className="text-white text-4xl">📺</Text>
        </View>
      )}
      
      {/* Live Badge Overlay */}
      {liveData?.isLive && (
        <View className="absolute top-2 left-2 bg-red-600 px-2 py-1 rounded-md flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-white mr-1.5" 
                style={{ 
                  shadowColor: '#fff',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  elevation: 3
                }} />
          <Text className="text-white text-xs font-bold uppercase">Live</Text>
        </View>
      )}
      
      {/* Dark Gradient Overlay for better text readability */}
      <View 
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: 60,
          backgroundColor: 'transparent',  // 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        }} />
      
      {/* Title Overlay */}
      <View className="absolute bottom-0 left-0 right-0 p-3">
        <Text 
          className="text-white font-semibold text-sm" 
          numberOfLines={2}
          style={{ 
            textShadowColor: 'rgba(0, 0, 0, 0.75)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3
          }}>
          {liveData?.streamTitle || 'Live Stream'}
        </Text>
      </View>
    </View>
    
  </TouchableOpacity>
</View>)
      default:
        return (
          <Text className="text-gray-400 italic text-sm">
            Unsupported message type: {message.messageType}
          </Text>
        );
    }
  };
  // Extract product ID from URL
  const extractProductId = text => {
    if (!text) return null;

    // Regex to match /user/product/{productId} pattern
    // console.log(text)
    const productUrlRegex = /\/user\/product\/([a-zA-Z0-9]+)/;
    const match = text.match(productUrlRegex);

    return match ? match[1] : null;
  };

  // Fetch product data
  const fetchProductData = async productId => {
    try {
      setProductLoading(true);
      setProductError(null);

      // console.log("pa")

      const response = await axiosInstance.get(`/product-details/${productId}`);

      if (response.status === 200 && response.data.status) {
        const productData = response.data.data;
        // console.log(productData)

        // Process images
        if (
          Array.isArray(productData.images) &&
          productData.images.length > 0
        ) {
          productData.signedImages = productData.images.map(image => {
            if (typeof image === 'object') {
              // console.log(image?.azureUrl || `${AWS_CDN_URL}${image?.key}`)
              return image?.azureUrl || `${AWS_CDN_URL}${image?.key}`;
            }
            return `${AWS_CDN_URL}${image}`;
          });
        } else {
          productData.signedImages = [];
        }

        // console.log(productData)
        setProductData(productData);

        // Initialize local wishlist state
        //   setLocalWishlistState(prev => ({
        //     ...prev,
        //     [productId]: productData.isInWishlist || false
        //   }));
        // } else {
        // throw new Error('Failed to fetch product data');
      }
    } catch (error) {
      console.log('Error fetching product:', error);
      setProductError(error.message || 'Failed to load product');
    } finally {
      setProductLoading(false);
    }
  };

  // Fetch shoppable video data
  const fetchShoppableVideoData = async videoId => {
    try {
      setShoppableVideoLoading(true);
      setShoppableVideoError(null);

      const response = await axiosInstance.get(`/shoppable-videos/${videoId}`);

      if (response.status === 200 && response.data.status) {
        const videoData = response.data.data;
        setShoppableVideoData(videoData);
      } else {
        throw new Error('Failed to fetch shoppable video data');
      }
    } catch (error) {
      console.log('Error fetching shoppable video:', error);
      setShoppableVideoError(error.message || 'Failed to load video');
    } finally {
      setShoppableVideoLoading(false);
    }
  };
  useEffect(() => {
    if (message.messageType === 'text' && message.content?.text) {
      const productId = extractProductId(message.content.text);
      const videoId = extractShoppableVideoId(message.content.text);

      if (productId) {
        // console.log(productId)
        fetchProductData(productId);
        // console.log(productData)
      }

      if (videoId) {
        fetchShoppableVideoData(videoId);
      }
    }
  }, [message.content?.text]);

  // Check if message can be edited (within 15 minutes and is own message)
  const canEditMessage = useCallback(() => {
    if (!isOwnMessage || message.messageType !== 'text') return false;
    
    const messageTime = new Date(message.createdAt).getTime();
    const currentTime = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    return (currentTime - messageTime) < fifteenMinutes;
  }, [isOwnMessage, message.messageType, message.createdAt]);

  // Handle edit button click
  const handleEditClick = useCallback(() => {
    setEditText(message.content?.text || '');
    setIsEditing(true);
  }, [message.content?.text]);

  // Handle save edit
  const handleSaveEdit = useCallback(async () => {
    if (!editText.trim() || editText === message.content?.text) {
      setIsEditing(false);
      return;
    }

    setIsSavingEdit(true);
    try {
      if (onEditMessage) {
        await onEditMessage(message._id, editText.trim());
        setIsEditing(false);
        ToastAndroid.show('Message edited successfully', ToastAndroid.SHORT);
      }
    } catch (error) {
      ToastAndroid.show('Failed to edit message', ToastAndroid.SHORT);
      console.error('Edit error:', error);
    } finally {
      setIsSavingEdit(false);
    }
  }, [editText, message.content?.text, message._id, onEditMessage]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText('');
  }, []);

  const handleLongPress = useCallback(() => {
    if (canEditMessage()) {
      // If message can be edited, show edit option
      // For now, directly open edit mode on long press
      handleEditClick();
    } else {
      // Otherwise show reaction picker
      onReaction(message._id);
    }
  }, [message._id, onReaction, canEditMessage, handleEditClick]);

  // Close checkout handler
  const handleCloseCheckout = useCallback(() => {
    setIsCheckoutOpen(false);
    setSelectedProduct(null);
  }, []);

  return (
    <>
      {/* Checkout Slider Modal */}
      <CheckoutSlider
        isOpen={isCheckoutOpen}
        onClose={handleCloseCheckout}
        product={selectedProduct}
      />
      
      <TouchableOpacity onLongPress={handleLongPress} delayLongPress={500}>
      {/* {showDate && (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateText}>{formatDate(message.createdAt)}</Text>
        </View>
      )} */}

      <View
        style={[
          styles.messageContainer,
          isOwnMessage
            ? styles.ownMessageContainer
            : styles.otherMessageContainer,
        ]}>
        {!isOwnMessage &&
          (message.senderId?.profileURL?.key ? (
            <Image
              source={{
                uri: `${AWS_CDN_URL}${message.senderId?.profileURL?.key}`,
              }}
              style={styles.messageAvatar}
            />
          ) : (
            <View
              className="rounded-xl w-[32px] h-[32px] bg-secondary-color border-2 border-brand-yellow"
              style={styles.messageAvatar}>
              <Text
                style={{fontSize: 16, color: '#fff', fontWeight: '500'}}
                className="font-bold capitalize text-text-primary text-2xl">
                {message?.senderId?.userName?.charAt(0)}
              </Text>
            </View>
          ))}

        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}>
          {!isOwnMessage && (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ViewSellerProdile', {
                  id: message?.senderId?.userName,
                })
              }>
              <Text style={styles.senderName}>
                {message?.senderId?.name || message?.senderId?.userName}
              </Text>
            </TouchableOpacity>
          )}

          {renderMessageContent()}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              {message.reactions.map((reaction, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    if (reaction.userId === currentUserId) {
                      onRemoveReaction(message._id, reaction.emoji);
                    }
                  }}>
                  <Text style={styles.reaction}>{reaction.emoji}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.messageFooter}>
            <Text
              style={[styles.messageTime, !isOwnMessage && {color: '#999'}]}>
              {formatTime(message.createdAt)}
            </Text>
            {renderMessageStatus()}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  </>
  );
};

const styles = StyleSheet.create({
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    color: '#999',
    fontSize: 12,
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#F7CE45',
  },
  messageBubble: {
    maxWidth: width * 0.7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownMessageBubble: {
    backgroundColor: '#2A2A2A',
    // backgroundColor: "#F7CE45",
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#2A2A2A',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    color: '#F7CE45',
    fontSize: 12,
    textDecorationLine: 'underline',
    textTransform: 'capitalize',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#000',
  },
  otherMessageText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    color: '#999',
    fontSize: 11,
    marginRight: 4,
  },
  mediaImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productContainer: {
    alignItems: 'center',
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  productName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    color: '#22C55E',
    fontWeight: '700',
    fontSize: 16,
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    position: 'absolute',
    bottom: -15,
    right: 10,
    borderRadius: 30,
    padding: 2,
    backgroundColor: '#333',
  },
  reaction: {
    fontSize: 16,
  },
  editContainer: {
    width: '100%',
  },
  editInput: {
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#F7CE45',
    textAlignVertical: 'top',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelButton: {
    backgroundColor: '#444',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#F7CE45',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  editedIndicator: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 4,
  },
});

export default React.memo(MessageItem);
