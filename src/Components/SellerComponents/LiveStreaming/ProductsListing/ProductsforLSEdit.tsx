import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute } from '@react-navigation/native';
import useAlert from '../../../../hooks/useAlertModal';
import axiosInstance from '../../../../Utils/Api';
import { AWS_CDN_URL } from '../../../../../Config';
import BundleSaleTabContent from './BundleSaleTabContent';
import { useAuthContext } from '../../../../Context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import giveawayService from '../../../Shows/Services/giveawayService';
import bgaAxiosInstance, { checkBgaHealth } from '../../../../Utils/bgaAxiosInstance';

const { width } = Dimensions.get('window');

const EditTaggedProducts = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const showId = route.params?.showId || '';
  const { user } = useAuthContext();
  const { showModal } = useAlert();

  const [products, setProducts] = useState([]);
  const [show, setShow] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState({
    buyNow: [],
    auction: [],
    giveaway: [],
    bundleSale: [],
  });
  const [activeTab, setActiveTab] = useState('buyNow');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingShow, setLoadingShow] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Quantity tracking for inline controls
  const [productQuantities, setProductQuantities] = useState({});

  // Giveaway configuration modal
  const [showGiveawayModal, setShowGiveawayModal] = useState(false);
  const [selectedProductForGiveaway, setSelectedProductForGiveaway] = useState(null);
  const [giveawayConfig, setGiveawayConfig] = useState({
    quantity: 1,
    tier: 'bronze',
    autoFollow: false,
  });

  // Track initial giveaways for deletion detection
  const [initialGiveaways, setInitialGiveaways] = useState([]);
  
  // BGA health status
  const [bgaHealthStatus, setBgaHealthStatus] = useState({ healthy: false, checked: false });

  const tabInfo = {
    buyNow: { label: 'Buy Now', icon: 'shopping-cart' },
    auction: { label: 'Auction', icon: 'award' },
    giveaway: { label: 'Giveaway', icon: 'gift' },
    bundleSale: { label: 'Bundle Sale', icon: 'package' },
  };

  const tierConfig = {
    silver: { 
      label: 'Silver', 
      color: '#9CA3AF',
      description: 'User must Mandate Register',
      icon: '🥈'
    },
    gold: { 
      label: 'Gold', 
      color: '#F59E0B',
      description: 'User must Mandate Register and share the stream',
      icon: '🥇'
    },
    platinum: { 
      label: 'Platinum', 
      color: '#E5E7EB',
      description: 'User must Mandate Register and purchase 1+ product',
      icon: '⭐'
    },
    diamond: { 
      label: 'Diamond', 
      color: '#22D3EE',
      description: 'User must Mandate Register and purchase 2+ products',
      icon: '💎'
    }
  };

  const fetchProducts = useCallback(async () => {
    if (currentPage === 1) {
      setLoadingProducts(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const params: any = {
        page: currentPage,
        limit: 20,
      };

      if (searchTerm) params.search = searchTerm;

      const res = await axiosInstance.get('product/listing/seller', { params });
      
      if (res.data?.data?.products) {
        // Normalize product data to match component expectations
        const normalizedProducts = res.data.data.products.map((product: any) => ({
          ...product,
          _id: product._id || product.productId || product.stockId,
          productPrice: product.productPrice || product.MRP || product.price || 0,
          price: product.price || product.MRP || product.productPrice || 0,
          title: product.title || 'Untitled Product',
          images: product.images || [],
          quantity: product.quantity !== undefined ? product.quantity : 0,
          category: product.category || product.subcategory || '',
        }));
        
        if (currentPage === 1) {
          setProducts(normalizedProducts);
        } else {
          setProducts(prev => [...prev, ...normalizedProducts]);
        }
        
        setTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err.message);
    } finally {
      setLoadingProducts(false);
      setLoadingMore(false);
    }
  }, [currentPage, searchTerm]);

  const fetchShow = useCallback(async () => {
    setLoadingShow(true);
    try {
      const res = await axiosInstance.get(`/shows/get/${showId}`);
      setShow(res.data.data);
    } catch (err: any) {
      console.error('Error fetching show:', err.message);
    } finally {
      setLoadingShow(false);
    }
  }, [showId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (showId) fetchShow();
  }, [showId, fetchShow]);

  useEffect(() => {
    if (show) {
      const giveawayProducts = show.giveawayProducts || [];
      const bundleSales = show.bundleSales || show.bundleSaleProducts || [];
      
      // Normalize buyNow products
      const normalizedBuyNow = (show.buyNowProducts || []).map((product: any) => ({
        ...product,
        productId: product.productId || product._id,
        productPrice: String(product.productPrice || product.MRP || product.price || 0),
        title: product.title || product.name || 'Untitled Product',
        image: product.image || product.images?.[0] || null,
        images: product.images || (product.image ? [product.image] : []),
      }));
      
      // Normalize auction products
      const normalizedAuction = (show.auctionProducts || []).map((product: any) => ({
        ...product,
        productId: product.productId || product._id,
        startingPrice: String(product.startingPrice || 0),
        reservedPrice: String(product.reservedPrice || 0),
        title: product.title || product.name || 'Untitled Product',
        image: product.image || product.images?.[0] || null,
        images: product.images || (product.image ? [product.image] : []),
        auctionObjectId: product.auctionObjectId || `${product.productId}_${Date.now()}`,
      }));
      
      // Normalize giveaway products
      const normalizedGiveaway = giveawayProducts.map((product: any) => ({
        ...product,
        productId: product.productId || product._id,
        title: product.title || product.name || 'Untitled Product',
        image: product.image || product.images?.[0] || null,
        images: product.images || (product.image ? [product.image] : []),
        giveawayObjectId: product.giveawayObjectId || null,
      }));
      
      // Normalize bundle sales
      const normalizedBundles = bundleSales.map((bundle) => ({
        bundleSaleId: bundle._id || bundle.bundleSaleId,
        bundleOwnerSellerId: bundle.bundleOwnerSellerId || bundle.sellerId || bundle.createdBy,
        title: bundle.title,
        bundleImage: bundle.bundleImage,
        products: bundle.products,
        bundleMRP: bundle.bundleMRP,
        sellingPrice: bundle.sellingPrice,
        discount: bundle.discount,
        ...bundle,
      }));
      
      setSelectedProducts({
        buyNow: normalizedBuyNow,
        auction: normalizedAuction,
        giveaway: normalizedGiveaway,
        bundleSale: normalizedBundles,
      });
      
      // Store initial giveaways for deletion detection
      setInitialGiveaways(normalizedGiveaway);
    }
  }, [show]);

  // Check BGA health status on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await checkBgaHealth();
        setBgaHealthStatus({ healthy: health.healthy, checked: true });
      } catch (error) {
        console.error('Failed to check BGA health:', error);
        setBgaHealthStatus({ healthy: false, checked: true });
      }
    };
    checkHealth();
  }, []);

  const handleQuantityChange = (productId, newQuantity) => {
    const maxQty = products.find(p => p._id === productId)?.quantity || 1;
    const clampedQty = Math.min(Math.max(1, newQuantity), Math.min(maxQty, 10000));
    setProductQuantities(prev => ({
      ...prev,
      [productId]: clampedQty
    }));
  };

  const getProductQuantity = (productId) => {
    return productQuantities[productId] || 1;
  };

  const validateFields = () => {
    // Validate buy now products
    for (const product of selectedProducts.buyNow) {
      if (!product.productPrice || parseFloat(product.productPrice) <= 0) {
        return false;
      }
    }
    
    // Validate auction products
    for (const product of selectedProducts.auction) {
      const startingPrice = parseFloat(product.startingPrice);
      const reservedPrice = parseFloat(product.reservedPrice);
      if (!startingPrice || startingPrice <= 0 || !reservedPrice || reservedPrice <= 0) {
        return false;
      }
      if (startingPrice >= reservedPrice) {
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateFields()) {
      console.log("Please correct the validation errors.")
      // showModal({ 
      //   title: 'Validation Error', 
      //   content: 'Please correct the validation errors.', 
      //   mode: 'error' 
      // });
      return;
    }

    try {
      setSubmitLoading(true);

      // ✅ STEP 0: Delete removed giveaways from BGA database
      const currentGiveawayIds = selectedProducts.giveaway
        .filter(g => g.giveawayObjectId)
        .map(g => g.giveawayObjectId);
      
      const removedGiveaways = initialGiveaways.filter(
        initial => initial.giveawayObjectId && !currentGiveawayIds.includes(initial.giveawayObjectId)
      );

      if (removedGiveaways.length > 0 && bgaHealthStatus.healthy) {
        console.log(`🗑️ Deleting ${removedGiveaways.length} removed giveaways...`);
        
        // Delete each removed giveaway
        const deletePromises = removedGiveaways.map(async (giveaway) => {
          try {
            await giveawayService.deleteGiveaway(giveaway.giveawayObjectId);
            console.log(`✅ Deleted giveaway: ${giveaway.giveawayObjectId}`);
          } catch (error) {
            console.error(`Failed to delete giveaway ${giveaway.giveawayObjectId}:`, error);
            // Don't fail the whole operation if one delete fails
          }
        });

        await Promise.all(deletePromises);
        console.log(`✅ Completed deletion of ${removedGiveaways.length} giveaways`);
      }

      // ✅ STEP 1: Prepare giveaways that are pending (new ones without giveawayObjectId)
      const pendingGiveaways = selectedProducts.giveaway.filter(p => p._pendingPreparation && !p.giveawayObjectId);
      
      if (pendingGiveaways.length > 0 && bgaHealthStatus.healthy) {
        console.log(`🎁 Preparing ${pendingGiveaways.length} new giveaways...`);
        
        // Group by product to prepare in batches
        const giveawaysByProduct = {};
        pendingGiveaways.forEach(item => {
          if (!giveawaysByProduct[item.productId]) {
            giveawaysByProduct[item.productId] = [];
          }
          giveawaysByProduct[item.productId].push(item);
        });

        // Prepare each product's giveaways
        for (const productId of Object.keys(giveawaysByProduct)) {
          const items = giveawaysByProduct[productId];
          const firstItem = items[0];
          
          try {
            const bgaPayload = {
              productId: productId,
              productTitle: firstItem.title,
              productOwnerSellerId: user?.sellerInfo?._id || user?.sellerInfo || user?._id,
              scheduledAt: show?.scheduledAt,
              quantity: items.giveawayQuantity,
              giveawayTier: firstItem.giveawayTier || 'bronze',
              giveawayType: 'live'
            };

            const response = await bgaAxiosInstance.post('prepare', bgaPayload);
            
            if (response.data.success && response.data.data?.giveaways) {
              const giveawayIds = response.data.data.giveaways.map(g => g._id);
              console.log(`✅ Created ${giveawayIds.length} giveaways for product ${productId}`);
              
              // Update local state with giveaway IDs
              items.forEach((item, index) => {
                item.giveawayObjectId = giveawayIds[index];
                delete item._pendingPreparation;
              });
            }
          } catch (error) {
            console.error(`Failed to prepare giveaways for product ${productId}:`, error);
            showModal({ 
              title: 'Error', 
              content: `Failed to prepare giveaways for ${firstItem.title}. Please try again.`, 
              mode: 'error' 
            });
            setSubmitLoading(false);
            return;
          }
        }
      }

      // ✅ STEP 2: Now send all products (with giveaway IDs) to update tagged products API
      const payload = {
        buyNowProducts: selectedProducts.buyNow.map((p) => ({
          productId: p.productId,
          productPrice: parseFloat(p.productPrice),
        })),
        auctionProducts: selectedProducts.auction.map((p) => ({
          productId: p.productId,
          startingPrice: parseFloat(p.startingPrice),
          reservedPrice: parseFloat(p.reservedPrice),
          auctionObjectId: p.auctionObjectId,
        })),
        giveawayProducts: selectedProducts.giveaway.map((p) => ({
          productId: p.productId,
          giveawayObjectId: p.giveawayObjectId,
          requireAutoFollow: Boolean(p.requireAutoFollow),
          giveawayTier: p.giveawayTier || 'bronze',
        })),
        bundleSaleProducts: selectedProducts.bundleSale.map((b) => ({
          bundleSaleId: b.bundleSaleId,
          bundleOwnerSellerId: b.bundleOwnerSellerId,
        })),
      };

      const res = await axiosInstance.put(
        `/shows/tag/${showId}`,
        payload
      );
      
      if (res.data.status) {
        // ✅ STEP 3: Bulk update giveaways with stream ID
        const allGiveawayIds = selectedProducts.giveaway
          .filter(p => p.giveawayObjectId)
          .map(p => p.giveawayObjectId);
        
        if (allGiveawayIds.length > 0 && bgaHealthStatus.healthy) {
          try {
            await giveawayService.bulkUpdateGiveaways(
              allGiveawayIds,
              showId,
              { requireAutoFollow: false }
            );
            console.log(`✅ Bulk updated ${allGiveawayIds.length} giveaways with stream ID`);
          } catch (bulkError) {
            console.error('Bulk update failed:', bulkError);
            // Don't fail the whole operation if bulk update fails
          }
        }

        showModal({ 
          title: 'Success', 
          content: `Tagged products updated successfully! (${selectedProducts.giveaway.length} giveaway${selectedProducts.giveaway.length > 1 ? 's' : ''}, ${selectedProducts.auction.length} auction${selectedProducts.auction.length > 1 ? 's' : ''} added)`, 
          mode: 'success' 
        });
        setTimeout(() => navigation.goBack(), 1000);
      }
    } catch (err) {
      console.error("Error updating show:", err.message);
      showModal({ 
        title: 'Error', 
        content: 'Failed to update products. Please try again.', 
        mode: 'error' 
      });
    } finally {
      setSubmitLoading(false);
    }
  };


  const openGiveawayConfig = (product) => {
    setSelectedProductForGiveaway(product);
    setGiveawayConfig({
      quantity: 1,
      tier: 'bronze',
      autoFollow: false,
    });
    setShowGiveawayModal(true);
  };

  const confirmGiveawayConfig = () => {
    if (!selectedProductForGiveaway) return;
    
    const newGiveaways = Array.from({ length: giveawayConfig.quantity }, (_: any, index: number) => ({
      productId: selectedProductForGiveaway._id,
      giveawayObjectId: null, // Will be generated on submit
      _pendingPreparation: true, // Mark as pending for BGA preparation
      requireAutoFollow: giveawayConfig.autoFollow,
      giveawayTier: giveawayConfig.tier,
      name: selectedProductForGiveaway.title,
      image: selectedProductForGiveaway.images?.[0],
      sellingPrice: selectedProductForGiveaway.productPrice || selectedProductForGiveaway.effectivePrice || 0,
      title: selectedProductForGiveaway.title,
    }));

    setSelectedProducts((prev) => ({
      ...prev,
      giveaway: [...prev.giveaway, ...newGiveaways],
    }));

    setShowGiveawayModal(false);
    setSelectedProductForGiveaway(null);
  };

  const handleProductSelect = (tab, product, quantity = 1) => {
    if (tab === 'buyNow') {
      setSelectedProducts((prev) => ({
        ...prev,
        buyNow: [...prev.buyNow, { 
          productId: product._id, 
          productPrice: String(product.productPrice || product.effectivePrice || 0),
          name: product.title,
          image: product.images?.[0],
          sellingPrice: product.productPrice || product.effectivePrice || 0,
          title: product.title,
        }],
      }));
      
      setProductQuantities(prev => ({
        ...prev,
        [product._id]: 1
      }));
    } else if (tab === 'auction') {
      const basePrice = product.productPrice || product.effectivePrice || 0;
      const newAuctions = Array.from({ length: quantity }, (_: any, index: number) => ({
        productId: product._id,
        auctionObjectId: `${product._id}_${Date.now()}_${index}`,
        startingPrice: String(basePrice),
        reservedPrice: String(basePrice * 1.5),
        name: product.title,
        image: product.images?.[0],
        sellingPrice: basePrice,
        title: product.title,
        unitNumber: index + 1,
        totalUnits: quantity,
      }));

      setSelectedProducts((prev) => ({
        ...prev,
        auction: [...prev.auction, ...newAuctions],
      }));
      
      setProductQuantities(prev => ({
        ...prev,
        [product._id]: 1
      }));
    }
  };

  const handleProductRemove = (tab, identifier) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((item) => {
        if (tab === 'giveaway') return item.giveawayObjectId !== identifier;
        if (tab === 'auction') return item.auctionObjectId ? item.auctionObjectId !== identifier : item.productId !== identifier;
        if (tab === 'bundleSale') return item.bundleSaleId !== identifier;
        return item.productId !== identifier;
      }),
    }));
  };

  const handlePriceChange = (tab, identifier, newPrice) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [tab]: prev[tab].map((item) => {
        if (tab === 'buyNow' && item.productId === identifier) {
          return { ...item, productPrice: newPrice };
        }
        if (tab === 'auction' && item.auctionObjectId === identifier) {
          return { ...item, startingPrice: newPrice };
        }
        return item;
      }),
    }));
  };

  const handleReservedPriceChange = (identifier, newPrice) => {
    setSelectedProducts((prev) => ({
      ...prev,
      auction: prev.auction.map((item) => 
        item.auctionObjectId === identifier ? { ...item, reservedPrice: newPrice } : item
      ),
    }));
  };

  const handleAutoFollowChange = (identifier, value) => {
    setSelectedProducts((prev) => ({
      ...prev,
      giveaway: prev.giveaway.map((item) =>
        item.giveawayObjectId === identifier ? { ...item, requireAutoFollow: value } : item
      ),
    }));
  };

  const isProductSelected = (tab, productId) => {
    return selectedProducts[tab].some(p => p.productId === productId);
  };

  const getAvailableProducts = () => {
    const selectedIds = new Set(selectedProducts[activeTab].map(p => p.productId));
    return products.filter(product => !selectedIds.has(product._id));
  };

  const handleLoadMore = () => {
    if (!loadingMore && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleSearchOrFilterChange = () => {
    setCurrentPage(1);
    setProducts([]);
  };

  useEffect(() => {
    handleSearchOrFilterChange();
  }, [searchTerm]);

  const renderProductItem = ({ item, index }) => {
    const imageUri = item.images?.[0]?.key 
      ? `${AWS_CDN_URL}${item.images[0].key}` 
      : 'https://via.placeholder.com/150';

    const qty = getProductQuantity(item._id);
    const maxQty = Math.min(item.quantity, 10000);

    return (
      <View key={item._id} style={styles.productRow}>
        <Text style={styles.indexText}>{index + 1}</Text>
        
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.productImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.productDetails}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.productStats}>
            <Text style={styles.priceText}>₹{item.productPrice || item.price || 0}</Text>
            {item.quantity !== undefined && (
              <View style={styles.statItem}>
                <Icon name="box" size={12} color="#60A5FA" />
                <Text style={styles.statText}>{item.quantity}</Text>
              </View>
            )}
          </View>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>

        {activeTab === 'auction' && (
          <View style={styles.quantityControls}>
            <TouchableOpacity
              onPress={() => handleQuantityChange(item._id, qty - 1)}
              disabled={qty <= 1}
              style={[styles.qtyButton, styles.qtyButtonMinus, qty <= 1 && styles.qtyButtonDisabled]}
            >
              <Text style={styles.qtyButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{qty}</Text>
            <TouchableOpacity
              onPress={() => handleQuantityChange(item._id, qty + 1)}
              disabled={qty >= maxQty}
              style={[styles.qtyButton, styles.qtyButtonPlus, qty >= maxQty && styles.qtyButtonDisabled]}
            >
              <Text style={styles.qtyButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => {
            if (activeTab === 'giveaway') {
              openGiveawayConfig(item);
            } else if (activeTab === 'auction') {
              handleProductSelect(activeTab, item, qty);
            } else {
              handleProductSelect(activeTab, item);
            }
          }}
          disabled={isProductSelected(activeTab, item._id)}
          style={[
            styles.addButton,
            isProductSelected(activeTab, item._id) && styles.addButtonDisabled,
          ]}
        >
          <Icon
            name="plus-circle"
            size={20}
            color={isProductSelected(activeTab, item._id) ? '#9CA3AF' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSelectedProduct = (item, tab) => {
    const imageUri = item.image?.key 
      ? `${AWS_CDN_URL}${item.image.key}` 
      : `${AWS_CDN_URL}${item?.images[0]?.key}` ||'https://via.placeholder.com/150';

    const identifier = tab === 'giveaway' 
      ? item.giveawayObjectId 
      : tab === 'auction' 
        ? item.auctionObjectId 
        : item.productId;
console.log(item.reservedPrice)
    return (
      <View key={identifier || `${tab}-${item.productId}-${Math.random()}`} style={styles.selectedProductCard}>
        <View style={styles.selectedProductHeader}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.productImage}
              resizeMode="cover"
            />
          </View>

          <View style={styles.selectedProductInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.title || item.name}
            </Text>
            
            {tab === 'auction' && item.totalUnits > 1 && (
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>Unit {item.unitNumber}/{item.totalUnits}</Text>
              </View>
            )}

            {tab === 'buyNow' && (
              <View style={styles.priceInputContainer}>
                <Text style={styles.inputLabel}>Price:</Text>
                <TextInput
                  style={styles.priceInput}
                  value={item.productPrice}
                  onChangeText={(text) => handlePriceChange(tab, identifier, text)}
                  keyboardType="numeric"
                  placeholder="Enter price"
                  placeholderTextColor="#6B7280"
                />
              </View>
            )}

            {tab === 'auction' && (
              <View style={styles.auctionPricesContainer}>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.inputLabel}>Start:</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={item.startingPrice}
                    onChangeText={(text) => handlePriceChange(tab, identifier, text)}
                    keyboardType="numeric"
                    placeholder="Start price"
                    placeholderTextColor="#6B7280"
                  />
                </View>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.inputLabel}>Reserve:</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={item.reservedPrice}
                    onChangeText={(text) => handleReservedPriceChange(identifier, text)}
                    keyboardType="numeric"
                    placeholder="Reserve price"
                    placeholderTextColor="#6B7280"
                  />
                </View>
              </View>
            )}

            {tab === 'giveaway' && (
              <View style={styles.giveawayInfo}>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierText}>{tierConfig[item.giveawayTier]?.icon} {tierConfig[item.giveawayTier]?.label}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleAutoFollowChange(identifier, !item.requireAutoFollow)}
                  style={styles.autoFollowToggle}
                >
                  <View style={[styles.toggleSwitch, item.requireAutoFollow && styles.toggleSwitchActive]}>
                    <View style={[styles.toggleThumb, item.requireAutoFollow && styles.toggleThumbActive]} />
                  </View>
                  <Text style={styles.autoFollowText}>Auto-Follow</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => handleProductRemove(tab, identifier)}
            style={styles.removeButton}
          >
            <Icon name="trash-2" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const totalSelectedProducts = selectedProducts.buyNow.length + 
    selectedProducts.auction.length + 
    selectedProducts.giveaway.length + 
    selectedProducts.bundleSale.length;

  if ((loadingProducts && currentPage === 1) || loadingShow) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFC107" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowBackModal(true)} style={styles.backButton}>
              <Icon name="chevron-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Show Products</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
              {Object.entries(tabInfo).map(([key, info]) => {
                const isActive = activeTab === key;
                const count = selectedProducts[key].length;
                return (
                  <TouchableOpacity 
                    key={key} 
                    onPress={() => setActiveTab(key)} 
                    style={[styles.tab, isActive && styles.tabActive]}
                  >
                    <Icon name={info.icon} size={20} color={isActive ? '#000000' : '#FFFFFF'} />
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{info.label}</Text>
                    {count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{count}</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {activeTab !== 'bundleSale' && (
            <View style={styles.filtersContainer}>
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#9CA3AF" />
                <TextInput 
                  style={styles.searchInput} 
                  placeholder="Search products..." 
                  placeholderTextColor="#9CA3AF" 
                  value={searchTerm} 
                  onChangeText={setSearchTerm} 
                />
              </View>
              {/* <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {allCategories.map((cat) => (
                  <TouchableOpacity 
                    key={cat} 
                    onPress={() => setSelectedCategory(cat)} 
                    style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                  >
                    <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView> */}
            </View>
          )}

          {activeTab !== 'bundleSale' && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Icon name="plus-circle" size={24} color="#FFC107" />
                  <Text style={styles.cardTitle}>Available Products</Text>
                </View>

                <ScrollView style={styles.productsListContainer} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                  {getAvailableProducts().length === 0 && !loadingProducts ? (
                    <View style={styles.emptyState}>
                      <Icon name={tabInfo[activeTab].icon} size={48} color="#6B7280" />
                      <Text style={styles.emptyStateText}>No products found</Text>
                    </View>
                  ) : (
                    <>
                      {getAvailableProducts().map((item, index) => (
                        <View key={item._id}>
                          {renderProductItem({ item, index })}
                        </View>
                      ))}

                      {loadingMore && (
                        <View style={styles.loadingMore}>
                          <ActivityIndicator size="small" color="#FFC107" />
                          <Text style={styles.loadingText}>Loading more...</Text>
                        </View>
                      )}

                      {!loadingProducts && currentPage >= totalPages && products.length > 0 && (
                        <View style={styles.endMessage}>
                          <Text style={styles.endMessageText}>You've reached the end.</Text>
                        </View>
                      )}

                      {!loadingProducts && currentPage < totalPages && (
                        <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreButton}>
                          <Text style={styles.loadMoreText}>Load More</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </ScrollView>
              </View>

              {selectedProducts[activeTab].length > 0 && (
                <View style={styles.selectedCard}>
                  <View style={styles.cardHeader}>
                    <Icon name="check-circle" size={24} color="#FFC107" />
                    <Text style={styles.cardTitle}>Selected Products ({selectedProducts[activeTab].length})</Text>
                  </View>
                  <ScrollView style={styles.selectedListContainer} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                    {selectedProducts[activeTab].map((item) => renderSelectedProduct(item, activeTab))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {activeTab === 'bundleSale' && (
            <BundleSaleTabContent
              selected={selectedProducts.bundleSale}
              onSelect={(bundle) => {
                const bundleOwnerId = (bundle as any).sellerId || (bundle as any).createdBy || user?.sellerInfo?._id;
                const newBundle = { 
                  bundleSaleId: bundle._id, 
                  bundleOwnerSellerId: bundleOwnerId, 
                  title: bundle.title, 
                  bundleImage: bundle.bundleImage, 
                  products: bundle.products, 
                  bundleMRP: bundle.bundleMRP, 
                  sellingPrice: bundle.sellingPrice 
                };
                setSelectedProducts((prev) => ({ ...prev, bundleSale: [...prev.bundleSale, newBundle] }));
              }}
              onRemove={(bundleId) => handleProductRemove('bundleSale', bundleId)}
            />
          )}

          <TouchableOpacity 
            onPress={handleSubmit} 
            disabled={submitLoading} 
            style={[styles.submitButton, submitLoading && styles.submitButtonDisabled]}
          >
            {submitLoading && <ActivityIndicator size="small" color="#000000" style={{ marginRight: 8 }} />}
            <Text style={styles.submitButtonText}>Update Show Products ({totalSelectedProducts})</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={showGiveawayModal} animationType="slide" transparent={true} onRequestClose={() => setShowGiveawayModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.configModalContent}>
              <View style={styles.configModalHeader}>
                <Text style={styles.configModalTitle}>Configure Giveaway</Text>
                <TouchableOpacity onPress={() => setShowGiveawayModal(false)} style={styles.modalCloseButton}>
                  <Icon name="x" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.configScrollView} showsVerticalScrollIndicator={false}>
                {selectedProductForGiveaway && (
                  <>
                    <View style={styles.configProductInfo}>
                      <Image
                        source={{ 
                          uri: selectedProductForGiveaway.images?.[0]?.key 
                            ? `${AWS_CDN_URL}${selectedProductForGiveaway.images[0].key}` 
                            : 'https://via.placeholder.com/150'
                        }}
                        style={styles.configProductImage}
                        resizeMode="cover"
                      />
                      <View style={styles.configProductDetails}>
                        <Text style={styles.configProductName} numberOfLines={2}>
                          {selectedProductForGiveaway.title}
                        </Text>
                        <Text style={styles.configProductStock}>
                          Stock: {selectedProductForGiveaway.quantity}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.configSection}>
                      <Text style={styles.configSectionTitle}>Quantity</Text>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          onPress={() => setGiveawayConfig(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                          disabled={giveawayConfig.quantity <= 1}
                          style={[styles.qtyButton, styles.qtyButtonMinus, giveawayConfig.quantity <= 1 && styles.qtyButtonDisabled]}
                        >
                          <Text style={styles.qtyButtonText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{giveawayConfig.quantity}</Text>
                        <TouchableOpacity
                          onPress={() => setGiveawayConfig(prev => ({ ...prev, quantity: Math.min(selectedProductForGiveaway.quantity, prev.quantity + 1) }))}
                          disabled={giveawayConfig.quantity >= selectedProductForGiveaway.quantity}
                          style={[styles.qtyButton, styles.qtyButtonPlus, giveawayConfig.quantity >= selectedProductForGiveaway.quantity && styles.qtyButtonDisabled]}
                        >
                          <Text style={styles.qtyButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.configSection}>
                      <Text style={styles.configSectionTitle}>Giveaway Tier</Text>
                      <View style={styles.tierGrid}>
                        {Object.entries(tierConfig).map(([key, config]) => (
                          <TouchableOpacity
                            key={key}
                            onPress={() => setGiveawayConfig(prev => ({ ...prev, tier: key }))}
                            style={[
                              styles.tierOption,
                              giveawayConfig.tier === key && styles.tierOptionActive
                            ]}
                          >
                            <Text style={styles.tierIcon}>{config.icon}</Text>
                            <Text style={[styles.tierLabel, giveawayConfig.tier === key && styles.tierLabelActive]}>
                              {config.label}
                            </Text>
                            <Text style={styles.tierDescription}>{config.description}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.configSection}>
                      <View style={styles.autoFollowSection}>
                        <View style={styles.autoFollowInfo}>
                          <Text style={styles.configSectionTitle}>Auto-Follow</Text>
                          <Text style={styles.autoFollowDescription}>Users must follow to participate</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setGiveawayConfig(prev => ({ ...prev, autoFollow: !prev.autoFollow }))}
                          style={styles.autoFollowToggle}
                        >
                          <View style={[styles.toggleSwitch, giveawayConfig.autoFollow && styles.toggleSwitchActive]}>
                            <View style={[styles.toggleThumb, giveawayConfig.autoFollow && styles.toggleThumbActive]} />
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={styles.configModalFooter}>
                <TouchableOpacity onPress={() => setShowGiveawayModal(false)} style={styles.configCancelButton}>
                  <Text style={styles.configCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmGiveawayConfig} style={styles.configConfirmButton}>
                  <Icon name="plus-circle" size={16} color="#000000" />
                  <Text style={styles.configConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showBackModal} animationType="fade" transparent={true} onRequestClose={() => setShowBackModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Discard changes?</Text>
              <Text style={styles.modalMessage}>Are you sure you want to discard your changes and go back?</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setShowBackModal(false)} style={styles.modalButtonCancel}>
                  <Text style={styles.modalButtonCancelText}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.modalButtonConfirm}>
                  <Text style={styles.modalButtonConfirmText}>Yes, Discard</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  loadingText: { color: '#FFFFFF', marginTop: 12, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#1E1E1E' },
  backButton: { padding: 8, backgroundColor: '#2A2A2A', borderRadius: 8 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  tabsContainer: { backgroundColor: '#1E1E1E', paddingVertical: 12 },
  tabsScrollContent: { paddingHorizontal: 16 },
  tab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginRight: 8 },
  tabActive: { backgroundColor: '#FFC107' },
  tabText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  tabTextActive: { color: '#000000' },
  badge: { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  filtersContainer: { padding: 16, backgroundColor: '#1E1E1E' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14, marginLeft: 8 },
  categoryChip: { backgroundColor: '#2A2A2A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  categoryChipActive: { backgroundColor: '#FFC107' },
  categoryChipText: { color: '#FFFFFF', fontSize: 14 },
  categoryChipTextActive: { color: '#000000', fontWeight: '600' },
  tabContent: { flex: 1, padding: 16 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#333333' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginLeft: 12, flex: 1 },
  productsListContainer: { maxHeight: 400 },
  selectedListContainer: { maxHeight: 300 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyStateText: { color: '#9CA3AF', fontSize: 16, marginTop: 12, fontWeight: '500' },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#404040' },
  indexText: { color: '#FFFFFF', fontWeight: '600', minWidth: 24, fontSize: 13 },
  imageContainer: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', marginRight: 10, backgroundColor: '#3A3A3A' },
  productImage: { width: '100%', height: '100%' },
  productDetails: { flex: 1, marginRight: 8 },
  productTitle: { color: '#FFFFFF', fontWeight: '500', fontSize: 13, marginBottom: 4, lineHeight: 18 },
  productStats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  statText: { color: '#60A5FA', fontWeight: '600', fontSize: 11, marginLeft: 2 },
  priceText: { color: '#10B981', fontWeight: 'bold', fontSize: 13 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#3B82F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryText: { color: '#FFFFFF', fontSize: 9, fontWeight: '600' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 },
  qtyButton: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  qtyButtonMinus: { backgroundColor: '#EF4444' },
  qtyButtonPlus: { backgroundColor: '#10B981' },
  qtyButtonDisabled: { backgroundColor: '#4B5563', opacity: 0.5 },
  qtyButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  qtyValue: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, minWidth: 24, textAlign: 'center' },
  addButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  addButtonDisabled: { backgroundColor: '#4B5563', opacity: 0.6 },
  selectedProductCard: { backgroundColor: '#2A2A2A', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#404040' },
  selectedProductHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  selectedProductInfo: { flex: 1, marginLeft: 12 },
  unitBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  unitBadgeText: { color: '#000000', fontSize: 11, fontWeight: 'bold' },
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  inputLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginRight: 8, minWidth: 50 },
  priceInput: { flex: 1, backgroundColor: '#1E1E1E', color: '#FFFFFF', borderWidth: 1, borderColor: '#FFC107', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontWeight: 'bold' },
  auctionPricesContainer: { marginTop: 8 },
  giveawayInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  tierBadge: { backgroundColor: '#3B82F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  tierText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  autoFollowToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleSwitch: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#4B5563', justifyContent: 'center', paddingHorizontal: 2 },
  toggleSwitchActive: { backgroundColor: '#10B981' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  autoFollowText: { color: '#FFFFFF', fontSize: 12 },
  removeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  loadingMore: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  endMessage: { paddingVertical: 16, alignItems: 'center' },
  endMessageText: { color: '#6B7280', fontSize: 13 },
  loadMoreButton: { backgroundColor: '#2A2A2A', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: '#FFC107' },
  loadMoreText: { color: '#FFC107', fontSize: 14, fontWeight: '600' },
  selectedCard: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#333333' },
  submitButton: { backgroundColor: '#FFC107', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginHorizontal: 16, marginVertical: 20, borderRadius: 12 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 24, width: width * 0.85, maxWidth: 400 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalMessage: { color: '#9CA3AF', fontSize: 14, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButtonCancel: { flex: 1, backgroundColor: '#333333', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonCancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalButtonConfirm: { flex: 1, backgroundColor: '#EF4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  configModalContent: { backgroundColor: '#1E1E1E', borderRadius: 20, width: width * 0.9, maxHeight: '80%', maxWidth: 500 },
  configModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#333333' },
  configModalTitle: { color: '#FFC107', fontSize: 20, fontWeight: 'bold' },
  modalCloseButton: { padding: 4 },
  configScrollView: { maxHeight: 500, paddingHorizontal: 20, paddingVertical: 16 },
  configProductInfo: { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FFC107' },
  configProductImage: { width: 60, height: 60, borderRadius: 8 },
  configProductDetails: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  configProductName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  configProductStock: { color: '#9CA3AF', fontSize: 13 },
  configSection: { marginBottom: 20 },
  configSectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tierOption: { width: '48%', backgroundColor: '#2A2A2A', borderRadius: 12, padding: 12, borderWidth: 2, borderColor: '#404040', alignItems: 'center' },
  tierOptionActive: { borderColor: '#FFC107', backgroundColor: '#FFC107/20' },
  tierIcon: { fontSize: 32, marginBottom: 8 },
  tierLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  tierLabelActive: { color: '#FFC107' },
  tierDescription: { color: '#9CA3AF', fontSize: 10, textAlign: 'center', lineHeight: 14 },
  autoFollowSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, padding: 16 },
  autoFollowInfo: { flex: 1 },
  autoFollowDescription: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  configModalFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#333333' },
  configCancelButton: { flex: 1, backgroundColor: '#4B5563', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  configCancelText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  configConfirmButton: { flex: 1, backgroundColor: '#FFC107', paddingVertical: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  configConfirmText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
});

export default EditTaggedProducts;
