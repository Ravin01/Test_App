//variants
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useState, useMemo, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ToastAndroid,
  Dimensions,
  ScrollView,
} from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import api from '../../../Utils/Api';
import {useFocusEffect} from '@react-navigation/native';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import Feather from 'react-native-vector-icons/Feather';
import Fontisto from 'react-native-vector-icons/Fontisto';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import * as Animatable from 'react-native-animatable';
import {TextInput} from 'react-native-paper';
import moment from 'moment';
import {FAB} from 'react-native-paper';
import Header from '../../Reuse/Header';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {colors} from '../../../Utils/Colors';
import {
  Eye,
  PieChart,
  Plus,
  Lock,
  Layers,
  TrendingUp,
  Package,
} from 'lucide-react-native';
import UpdateStockModal from './UpdateStockModal';
import {SafeAreaView} from 'react-native-safe-area-context';
import {formatFollowerCount} from '../../../Utils/dateUtils';
import SearchComponent from '../../GloabalSearch/SearchComponent';
import {
  usePagePermissions,
  useEffectiveSellerId,
  useAccessModeInfo,
} from '../../../Context/AccessContext';
import SellerHeader from '../SellerForm/Header';

const ProductScreen = ({navigation, route}) => {
  const {selectedTab} = route.params || 'Product';
  const PAGELIMIT = 10;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalProduct, setTotalProduct] = useState(0);
  const [isEditing, setIsEditing] = useState({});
  const [quantity, setQuantity] = useState({});
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [searchQuerry, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [_expandedParents, _setExpandedParents] = useState(new Set());

  // Access Permission Hooks
  const {canView, canCreate, canEdit, canDelete} =
    usePagePermissions('PRODUCT');
  const effectiveSellerId = useEffectiveSellerId();
  const {isAccessMode, isOwnData, sellerInfo} = useAccessModeInfo();

  const UpdateStockModalMemo = useMemo(
    () => (
      <UpdateStockModal
        visible={updateModalVisible}
        onClose={() => setUpdateModalVisible(false)}
        product={selectedItem}
        onSubmit={newStockValue => {
          handleSave(selectedItem?._id, newStockValue);
        }}
      />
    ),
    [updateModalVisible, selectedItem],
  );

  const onEndReachedCalledDuringMomentum = useRef(false);

  // Helper function to organize products with parent-variant hierarchy
  // Backend now returns variants nested inside parent products (matching web version)
  const organizeProductsWithVariants = (productList: any[]) => {
    const organized: any[] = [];

    productList.forEach(product => {
      // Check if this product has nested variants from backend
      if (product.variants && product.variants.length > 0) {
        // Add parent with variant metadata
        organized.push({
          ...product,
          variantCount: product.variants.length,
          totalVariantStock: product.totalVariantStock || 
            product.variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0),
          _variants: product.variants.map((variant: any) => ({
            ...variant,
            isVariant: true,
            parentProductId: product._id
          })),
        });
        
        // Add each variant with proper parent reference
        product.variants.forEach((variant: any) => {
          organized.push({
            ...variant,
            isVariant: true,
            parentProductId: product._id
          });
        });
      } else {
        // Standalone product (no variants)
        organized.push(product);
      }
    });

    return organized;
  };

  const getDisplayProducts = (productList: any[]) => {
    const organized = organizeProductsWithVariants(productList);
    // Filter out variants from the main list - they will be shown inside parent cards
    return organized.filter(product => !product.isVariant);
  };

  const fetchProducts = async (page = 1, refreshing = false) => {
    if (isFetchingMore && !refreshing) return;
    if (!refreshing && page === 1) setLoading(true);

    try {
      const params: {
        page: number;
        limit: number;
        search: string;
        sellerId?: string;
      } = {
        page: page,
        limit: PAGELIMIT,
        search: searchQuerry,
      };

      if (effectiveSellerId) {
        params.sellerId = effectiveSellerId;
      }

      let response;
      if (selectedTab === 'Product')
        response = await api.get(`/product/listing/sellerhub`, {params});
      else response = await api.get(`/stock/seller`, {params});
      const data = response.data.data;

      const fetchedProducts = data.products || data;
      // Organize products with variants (matching web version logic)
      const organizedProducts = organizeProductsWithVariants(fetchedProducts);

      if (page === 1 || refreshing) {
        setProducts(organizedProducts);
      } else {
        // When appending, we need to reorganize the combined list
        // First get raw products from current state (filter out variant duplicates)
        const existingRawProducts = products.filter((p: any) => !p.isVariant);
        const combined = [...existingRawProducts, ...fetchedProducts];
        setProducts(organizeProductsWithVariants(combined));
      }

      setCurrentPage(data.page || response.data.page || page);
      setTotalPages(data.totalPages || response.data.totalPages || 1);
      setTotalProduct(data.total || response.data.total || 0);
      
      // Calculate total quantity from current page products
      let pageTotal = 0;
      const quantityMap: {[key: string]: number} = {};

      if (Array.isArray(fetchedProducts)) {
        fetchedProducts.forEach((product: any) => {
          // For parent products with variants, sum up variant quantities
          if (product.variants && product.variants.length > 0) {
            const variantTotal = product.variants.reduce(
              (sum: number, v: any) => sum + (v.quantity || 0), 0
            );
            quantityMap[product?._id] = variantTotal;
            pageTotal += variantTotal;
          } else {
            const qty = product?.quantity || 0;
            quantityMap[product?._id] = qty;
            pageTotal += qty;
          }
        });
      }

      if (page === 1 || refreshing) {
        setQuantity(quantityMap);
        setTotalQuantity(pageTotal);
      } else {
        setQuantity(prev => ({...prev, ...quantityMap}));
        setTotalQuantity(prev => prev + pageTotal);
      }
    } catch (err) {
      console.log('Error fetching products:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setIsFetchingMore(false);
      onEndReachedCalledDuringMomentum.current = false;
    }
  };

  const handleSave = async (productId, newStockValue) => {
    try {
      setLoading(true);
      const response = await api.put(`/stock/${productId}`, {
        quantity: newStockValue,
        reason: 'Manual stock update via dashboard',
      });
      setIsEditing(prev => ({...prev, [productId]: false}));
      fetchProducts(1, true);
      setQuantity(prev => ({...prev, [productId]: ''}));
      ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
    } catch (error) {
      console.log('Error saving product quantity:', error.response.data);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (canView) {
        setCurrentPage(1);
        setProducts([]);
        fetchProducts(1, false);
      }
      return () => {};
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuerry, canView]),
  );

  const getStockColor = stock => {
    if (stock === 0) return '#EF4444';
    if (stock < 5) return '#F59E0B';
    return '#10B981';
  };

  const getStockLabel = stock => {
    if (stock === 0) return 'Out of Stock';
    if (stock < 5) return 'Low Stock';
    if (stock < 20) return 'Limited';
    return 'In Stock';
  };

  const renderVariantCard = (variant: any, _parentProduct: any, variantIndex: number) => {
    const imageKeys = variant.images || [];
    const variantAttributes = variant.variantAttributes
      ? Object.entries(variant.variantAttributes)
      : [];
    const stockQty = variant.quantity || 0;
    const stockColor = getStockColor(stockQty);
    const stockLabel = getStockLabel(stockQty);

    const discountPercentage =
      variant?.MRP && variant.productPrice
        ? Math.round(((variant.MRP - variant.productPrice) / variant.MRP) * 100)
        : 0;

    const handleVariantPress = () => {
      navigation.navigate('ProductDetailScreen', {product: variant});
    };

    const handleEditVariant = () => {
      if (!canEdit) {
        ToastAndroid.show(
          "You don't have permission to edit products",
          ToastAndroid.SHORT,
        );
        return;
      }
      navigation.navigate('ProductUploadForm', {
        data: variant,
        mode: 'edit',
      });
    };

    return (
      <TouchableOpacity
        key={`variant-card-${variant._id}-${variantIndex}`}
        style={styles.variantScrollCard}
        onPress={handleVariantPress}
        activeOpacity={0.9}>
        {/* Variant Image with Overlay Info */}
        <View style={styles.variantImageContainer}>
          <Image
            source={{uri: `${AWS_CDN_URL}${imageKeys[0]?.key}`}}
            style={styles.variantScrollImage}
            resizeMode="cover"
          />

          {/* Stock Badge - Top Right */}
          <View
            style={[styles.variantStockBadge, {backgroundColor: stockColor}]}>
            <Package color={"#fff"} size={14} />
            <Text style={styles.variantStockBadgeText}>{stockQty}</Text>
          </View>

          {/* Discount Badge - Top Left */}
          {discountPercentage > 0 && (
            <View style={styles.variantDiscountBadge}>
              <Text style={styles.variantDiscountText}>
                {discountPercentage}% OFF
              </Text>
            </View>
          )}

          {/* Variant Badge - Bottom Left */}
          <View style={styles.variantTypeBadge}>
            <Text style={styles.variantTypeBadgeText}>Variant</Text>
          </View>
        </View>

        <View style={styles.variantScrollContent}>
          {/* Title and Edit Button Row */}
          <View style={styles.variantTitleRow}>
            <Text style={styles.variantTitle} numberOfLines={2}>
              {variant?.title}
            </Text>
            {canEdit ? (
              <TouchableOpacity
                style={styles.variantEditButton}
                onPress={handleEditVariant}>
                <FontAwesome5 name="pen" size={12} color="#FFD700" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Variant Attributes */}
          {variantAttributes.length > 0 && (
            <View style={styles.variantAttributesRow}>
              {variantAttributes.map(([key, value]) => (
                <View key={key} style={styles.variantAttributeChip}>
                  <Text style={styles.variantAttributeText}>
                    {key}:{' '}
                    <Text style={styles.variantAttributeValue}>
                      {String(value)}
                    </Text>
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Category */}
          <Text style={styles.variantCategoryText} numberOfLines={1}>
            {variant.category} • {variant.subcategory}
          </Text>

          {/* Price and Stock Info */}
          <View style={styles.variantInfoRow}>
            {/* Price Section */}
            <View style={styles.variantPriceSection}>
              <Text style={styles.variantPriceLabel}>Price</Text>
              <View style={styles.variantPriceRow}>
                <Text style={styles.variantPrice}>
                  ₹{variant?.productPrice}
                </Text>
                {variant?.MRP > variant?.productPrice && (
                  <Text style={styles.variantMrp}>₹{variant?.MRP}</Text>
                )}
              </View>
            </View>

            {/* Stock Status Section */}
            <View style={styles.variantStockSection}>
              <Text style={styles.variantStockLabel}>{stockLabel}</Text>
              <View style={styles.variantStockRow}>
                <Package size={12} color={stockColor} />
                <Text style={[styles.variantStockValue, {color: stockColor}]}>
                  {stockQty} Units
                </Text>
              </View>
            </View>
          </View>

          {/* Auction Info (if applicable) */}
          {(variant?.startingPrice || variant?.reservedPrice) ? (
            <View style={styles.variantAuctionInfo}>
              <Text style={styles.variantAuctionLabel}>Auction</Text>
              <View style={styles.variantAuctionPrices}>
                {variant?.startingPrice ? (
                  <Text style={styles.variantAuctionPrice}>
                    Start: ₹{variant?.startingPrice}
                  </Text>
                ) : null}
                {variant?.reservedPrice ? (
                  <Text style={styles.variantAuctionPrice}>
                    Reserve: ₹{variant?.reservedPrice}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Action Button */}
          <TouchableOpacity
            style={styles.variantAnalyzeButton}
            onPress={() =>
              navigation.navigate('ProductAnalyse', {
                productId: variant._id,
              })
            }>
            <PieChart size={14} color="#000" />
            <Text style={styles.variantAnalyzeText}>Analyze</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProduct = ({item: selectedProduct, index: _index}) => {
    const imageKeys = selectedProduct.images || [];
    const isParentWithVariants = selectedProduct.variantCount > 0;
    const variants = selectedProduct._variants || [];

    const discountPercentage =
      selectedProduct?.MRP && selectedProduct.productPrice
        ? Math.round(
            ((selectedProduct.MRP - selectedProduct.productPrice) /
              selectedProduct.MRP) *
              100,
          )
        : 0;

    const stockQty = isParentWithVariants
      ? selectedProduct.totalVariantStock
      : selectedProduct.quantity || 0;
    const stockColor = getStockColor(stockQty);
    const stockLabel = getStockLabel(stockQty);

    const handleCardPress = () => {
      navigation.navigate('ProductDetailScreen', {product: selectedProduct});
    };

    const handleEditProduct = () => {
      if (!canEdit) {
        ToastAndroid.show(
          "You don't have permission to edit products",
          ToastAndroid.SHORT,
        );
        return;
      }
      navigation.navigate('ProductUploadForm', {
        data: selectedProduct,
        mode: 'edit',
      });
    };

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={handleCardPress} activeOpacity={0.9}>
          {/* Product Image with Overlay Info */}
          <View style={styles.imageContainer}>
            <Image
              source={{uri: `${AWS_CDN_URL}${imageKeys[0]?.key}`}}
              style={styles.productImage}
              resizeMode="cover"
            />

            {/* Stock Badge - Top Right */}
            <View style={[styles.stockBadge, {backgroundColor: stockColor}]}>
              <Package color={"#fff"} size={14} />
              <Text style={styles.stockBadgeText}>{stockQty}</Text>
            </View>

            {/* Discount Badge - Top Left */}
            {discountPercentage > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {discountPercentage}% OFF
                </Text>
              </View>
            )}

            {/* Parent with Variants Badge - Bottom Left */}
            {isParentWithVariants && (
              <View style={styles.imageBadge}>
                <Layers size={12} color="#000" />
                <Text style={styles.imageBadgeText}>
                  {selectedProduct.variantCount} Variants
                </Text>
              </View>
            )}
          </View>

          {/* Product Details */}
          <View style={styles.cardContent}>
            {/* Title and Edit Button Row */}
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>
                {selectedProduct?.title}
              </Text>
              {canEdit ? (
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={handleEditProduct}>
                  <FontAwesome5 name="pen" size={14} color="#FFD700" />
                </TouchableOpacity>
              ) : (
                <View style={styles.lockIconButton}>
                  <Lock size={14} color="#666" />
                </View>
              )}
            </View>

            {/* Category and Date */}
            <Text style={styles.categoryText} numberOfLines={1}>
              {selectedProduct.category} • {selectedProduct.subcategory}
            </Text>

            {/* Price and Stock Info */}
            <View style={styles.infoRow}>
              {/* Price Section */}
              <View style={styles.priceSection}>
                <Text style={styles.priceLabel}>Price</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>
                    ₹{selectedProduct?.productPrice}
                  </Text>
                  {selectedProduct?.MRP > selectedProduct?.productPrice && (
                    <Text style={styles.mrp}>₹{selectedProduct?.MRP}</Text>
                  )}
                </View>
              </View>

              {/* Stock Status Section */}
              <View style={styles.stockSection}>
                <Text style={styles.stockLabel}>{stockLabel}</Text>
                <View style={styles.stockRow}>
                  <Package size={14} color={stockColor} />
                  <Text style={[styles.stockValue, {color: stockColor}]}>
                    {isParentWithVariants
                      ? `${stockQty} Total`
                      : `${stockQty} Units`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Auction Info (if applicable) */}
            {(selectedProduct?.startingPrice ||
              selectedProduct?.reservedPrice) ? (
              <View style={styles.auctionInfo}>
                <Text style={styles.auctionLabel}>Auction</Text>
                <View style={styles.auctionPrices}>
                  {selectedProduct?.startingPrice ? (
                    <Text style={styles.auctionPrice}>
                      Start: ₹{selectedProduct?.startingPrice}
                    </Text>
                  ) : null}
                  {selectedProduct?.reservedPrice ? (
                    <Text style={styles.auctionPrice}>
                      Reserve: ₹{selectedProduct?.reservedPrice}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={() =>
                  navigation.navigate('ProductAnalyse', {
                    productId: selectedProduct._id,
                  })
                }>
                <PieChart size={16} color="#000" />
                <Text style={styles.analyzeText}>Analyze</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Horizontal Variants Section */}
        {isParentWithVariants && variants.length > 0 ? (
          <View style={styles.variantsSection}>
            <View style={styles.variantsSectionHeader}>
              <Layers size={16} color="#FFD700" />
              <Text style={styles.variantsSectionTitle}>
                Product Variants ({variants.length})
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.variantsScrollContainer}>
              {variants.map((variant: any, idx: number) =>
                renderVariantCard(variant, selectedProduct, idx)
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  };

  // Render variant stock card for horizontal scroll
  const renderVariantStockCard = (variant: any, _parentProduct: any, variantIndex: number) => {
    const imageKeys = variant.images || [];
    const variantAttributes = variant.variantAttributes
      ? Object.entries(variant.variantAttributes)
      : [];
    const stockQty = variant.quantity || 0;
    const stockColor = getStockColor(stockQty);
    const stockLabel = getStockLabel(stockQty);

    const handleAddVariantStock = () => {
      if (!canEdit) {
        ToastAndroid.show(
          "You don't have permission to update stock",
          ToastAndroid.SHORT,
        );
        return;
      }
      setUpdateModalVisible(true);
      setSelectedItem(variant);
      setIsEditing(prev => ({
        ...prev,
        [variant.stockId || variant._id]: true,
      }));
    };

    return (
      <View key={`stock-variant-${variant._id}-${variantIndex}`} style={styles.variantStockCard}>
        {/* Variant Image with Overlay Info */}
        <View style={styles.variantStockImageContainer}>
          <Image
            source={{uri: `${AWS_CDN_URL}${imageKeys[0]?.key}`}}
            style={styles.variantStockScrollImage}
            resizeMode="cover"
          />

          {/* Stock Badge - Top Right */}
          <View
            style={[styles.variantStockBadge, {backgroundColor: stockColor}]}>
            <Package color="#fff" size={12} />
            <Text style={styles.variantStockBadgeText}>{stockQty}</Text>
          </View>

          {/* Variant Badge - Bottom Left */}
          <View style={styles.variantTypeBadge}>
            <Text style={styles.variantTypeBadgeText}>Variant</Text>
          </View>
        </View>

        <View style={styles.variantStockScrollContent}>
          {/* Title */}
          <Text style={styles.variantStockTitle} numberOfLines={2}>
            {variant?.title}
          </Text>

          {/* Variant Attributes */}
          {variantAttributes.length > 0 && (
            <View style={styles.variantAttributesRow}>
              {variantAttributes.map(([key, value]) => (
                <View key={key} style={styles.variantAttributeChip}>
                  <Text style={styles.variantAttributeText}>
                    {key}:{' '}
                    <Text style={styles.variantAttributeValue}>
                      {String(value)}
                    </Text>
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Stock Status */}
          <View style={styles.variantStockStatusSection}>
            <Text style={styles.variantStockStatusLabel}>{stockLabel}</Text>
            <View style={styles.variantStockRow}>
              <Package size={12} color={stockColor} />
              <Text style={[styles.variantStockValue, {color: stockColor}]}>
                {stockQty} Units
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.variantStockActions}>
            {canEdit ? (
              <TouchableOpacity
                style={styles.variantAddStockButton}
                onPress={handleAddVariantStock}>
                <Plus size={14} color="#000" />
                <Text style={styles.variantAddStockText}>Add Stock</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.variantLockedStockButton}>
                <Lock size={12} color="#666" />
                <Text style={styles.variantLockedStockText}>Locked</Text>
              </View>
            )}

            {variant.stockUpdateHistory?.length > 0 ? (
              <TouchableOpacity
                style={styles.variantHistoryButton}
                onPress={() => {
                  navigation.navigate('stockHistory', {
                    history: variant.stockUpdateHistory,
                    product: variant,
                  });
                }}>
                <Text style={styles.variantHistoryText}>History</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const renderStock = ({item: selectedProduct}) => {
    const imageKeys = selectedProduct.images || [];
    const isParentWithVariants = selectedProduct.variantCount > 0;
    const variants = selectedProduct._variants || [];
    
    // For parent products, show total variant stock; for standalone, show product stock
    const stockQty = isParentWithVariants
      ? selectedProduct.totalVariantStock
      : selectedProduct.quantity || 0;
    const stockColor = getStockColor(stockQty);
    const stockLabel = getStockLabel(stockQty);

    const handleAddStock = () => {
      if (!canEdit) {
        ToastAndroid.show(
          "You don't have permission to update stock",
          ToastAndroid.SHORT,
        );
        return;
      }
      setUpdateModalVisible(true);
      setSelectedItem(selectedProduct);
      setIsEditing(prev => ({
        ...prev,
        [selectedProduct.stockId || selectedProduct._id]: true,
      }));
    };

    return (
      <View style={styles.stockCard}>
        {/* Main Product Image Section */}
        <View style={styles.stockImageContainer}>
          <Image
            source={{uri: `${AWS_CDN_URL}${imageKeys[0]?.key}`}}
            style={styles.stockImage}
            resizeMode="cover"
          />

          {/* Stock Badge - Top Right */}
          <View style={[styles.stockBadge, {backgroundColor: stockColor}]}>
            <Package color="#fff" size={14} />
            <Text style={styles.stockBadgeText}>{stockQty}</Text>
          </View>

          {/* Parent with Variants Badge - Bottom Left */}
          {isParentWithVariants ? (
            <View style={styles.imageBadge}>
              <Layers size={12} color="#000" />
              <Text style={styles.imageBadgeText}>
                {selectedProduct.variantCount} Variants
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.stockCardContent}>
          <View style={styles.stockHeader}>
            <Text style={styles.stockTitle} numberOfLines={2}>
              {selectedProduct?.title}
            </Text>
            <View
              style={[styles.stockStatusBadge, {backgroundColor: stockColor}]}>
              <Text style={styles.stockStatusText}>{stockQty}</Text>
            </View>
          </View>

          {/* Stock Status Info */}
          <View style={styles.stockInfoSection}>
            <View style={styles.stockInfoItem}>
              <Text style={styles.stockInfoLabel}>
                {isParentWithVariants ? 'Total Stock' : 'Stock'}
              </Text>
              <View style={styles.stockInfoRow}>
                <Package size={14} color={stockColor} />
                <Text style={[styles.stockInfoValue, {color: stockColor}]}>
                  {isParentWithVariants
                    ? `${stockQty} Total`
                    : `${stockQty} Units`}
                </Text>
              </View>
              <Text style={styles.stockStatusLabel}>{stockLabel}</Text>
            </View>
            {isParentWithVariants ? (
              <View style={styles.stockInfoItem}>
                <Text style={styles.stockInfoLabel}>Variants</Text>
                <View style={styles.stockInfoRow}>
                  <Layers size={14} color="#FFD700" />
                  <Text style={[styles.stockInfoValue, {color: '#FFD700'}]}>
                    {selectedProduct.variantCount} Items
                  </Text>
                </View>
                <Text style={styles.stockStatusLabel}>Manage below</Text>
              </View>
            ) : null}
          </View>

          {/* Actions for Non-Parent Products */}
          {!isParentWithVariants ? (
            <View style={styles.stockActions}>
              {canEdit ? (
                <TouchableOpacity
                  style={styles.addStockButton}
                  onPress={handleAddStock}>
                  <Plus size={16} color="#000" />
                  <Text style={styles.addStockText}>Add Stock</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.lockedStockButton}>
                  <Lock size={16} color="#666" />
                  <Text style={styles.lockedStockText}>Locked</Text>
                </View>
              )}

              {selectedProduct.stockUpdateHistory?.length > 0 ? (
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={() => {
                    navigation.navigate('stockHistory', {
                      history: selectedProduct.stockUpdateHistory,
                      product: selectedProduct,
                    });
                  }}>
                  <Text style={styles.historyText}>History</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.dateText}>
            {moment(selectedProduct.createdAt).format('MMM DD, YYYY')}
          </Text>
        </View>

        {/* Horizontal Variants Section for Stock Management */}
        {isParentWithVariants && variants.length > 0 ? (
          <View style={styles.variantsSection}>
            <View style={styles.variantsSectionHeader}>
              <Layers size={16} color="#FFD700" />
              <Text style={styles.variantsSectionTitle}>
                Manage Variant Stock ({variants.length})
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.variantsScrollContainer}>
              {variants.map((variant: any, idx: number) =>
                renderVariantStockCard(variant, selectedProduct, idx)
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  };

  const handleLoadMore = () => {
    const hasMoreToLoad = currentPage < totalPages;

    // This ensures pagination continues even when many products are variants
    const shouldLoadMore = hasMoreToLoad && !isFetchingMore && !loading;

    if (shouldLoadMore) {
      const nextPage = currentPage + 1;
      setIsFetchingMore(true);
      fetchProducts(nextPage);
    }
  };

  const onEndReachedHandler = () => {
    if (!onEndReachedCalledDuringMomentum.current) {
      handleLoadMore();
      onEndReachedCalledDuringMomentum.current = true;
    }
  };

  // No need for auto-load effect since backend now returns variants nested in parent products
  // The display count should match the actual API pagination

  const handleRefresh = () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    setProducts([]);
    fetchProducts(1, true);
  };

  const handleCreateProduct = () => {
    if (!canCreate) {
      ToastAndroid.show(
        "You don't have permission to create products",
        ToastAndroid.SHORT,
      );
      return;
    }
    navigation.navigate('ProductUploadForm', {mode: 'add'});
  };

  const ListHeaderComponent = () => (
    <View style={styles.headerContent}>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Package size={24} color="#FFD700" />
          <Text style={styles.statValue}>
            {formatFollowerCount(totalProduct)}
          </Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={24} color="#10B981" />
          <Text style={styles.statValue}>
            {formatFollowerCount(totalQuantity)}
          </Text>
          <Text style={styles.statLabel}>In Stock</Text>
        </View>
      </View>

      {/* Search */}
      <SearchComponent
        searchTerm={searchQuerry}
        setSearchTerm={setSearchQuery}
      />
    </View>
  );

  return (
    <>
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primaryButtonColor} size={30} />
        </View>
      )}

      {canCreate ? (
        <FAB
          icon="plus"
          color="#121212"
          style={styles.fab}
          onPress={handleCreateProduct}
        />
      ) : (
        <FAB
          icon="lock"
          color="#121212"
          style={styles.fab}
          onPress={() => {
            ToastAndroid.show(
              'You do not have create access to add a new product.',
              ToastAndroid.SHORT,
            );
          }}
        />
      )}

      <SafeAreaView style={styles.container}>
        {/* Header */}
        <SellerHeader
          navigation={navigation}
          message={
            selectedTab === 'Product' ? 'My Products' : 'Stock Management'
          }
        />
        {/* <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <ArrowLeftCircle color={'#fff'} size={28} />
          </TouchableOpacity>
          <LinearGradient
            colors={['#B38728', '#FFD700']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.headerGradient}>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>
                {selectedTab === 'Product' ? 'My Products' : 'Stock Management'}
              </Text>
            </View>
          </LinearGradient>
        </View> */}

        {/* Access Mode Banner */}
        {isAccessMode ? (
          <View style={styles.accessModeBanner}>
            <View style={styles.accessModeHeader}>
              <Eye color="#FFD700" size={20} />
              <View style={styles.accessModeHeaderText}>
                <Text style={styles.accessModeTitle}>
                  Access Mode
                  {/* <Text style={styles.accessModeBadge}> Read-Only</Text> */}
                </Text>
                <Text style={styles.accessModeSubtitle}>
                  Viewing:{' '}
                  <Text style={styles.accessModeSellerName}>
                    {sellerInfo?.userName || 'Seller'}
                  </Text>
                </Text>
              </View>
            </View>
                <View style={styles.permissionTags}>
                          <View
                            style={[
                              styles.permissionTag,
                              canView ? styles.permissionAllowed : styles.permissionDenied,
                            ]}>
                            <Text style={styles.permissionTagText}>
                              {canView ? '✓ View' : '✗ View'}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.permissionTag,
                              canCreate ? styles.permissionAllowed : styles.permissionDenied,
                            ]}>
                            <Text style={styles.permissionTagText}>
                              {canCreate ? '✓ Create' : '✗ Create'}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.permissionTag,
                              canEdit ? styles.permissionAllowed : styles.permissionDenied,
                            ]}>
                            <Text style={styles.permissionTagText}>
                              {canEdit ? '✓ Edit' : '✗ Edit'}
                            </Text>
                          </View>
                          {/* <View
                            style={[
                              styles.permissionTag,
                              canDelete ? styles.permissionAllowed : styles.permissionDenied,
                            ]}>
                            <Text style={styles.permissionTagText}>
                              {canDelete ? '✓ Delete' : '✗ Delete'}
                            </Text>
                          </View> */}
              </View>
          </View>
        ) : null}

        {/* Product List */}
        <FlatList
          data={getDisplayProducts(products)}
          keyExtractor={(item, index) => `${item._id}-${index}`}
          renderItem={selectedTab === 'Product' ? renderProduct : renderStock}
          ListHeaderComponent={ListHeaderComponent}
          onEndReached={onEndReachedHandler}
          onEndReachedThreshold={0.3}
          onMomentumScrollBegin={() => {
            onEndReachedCalledDuringMomentum.current = false;
          }}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {isFetchingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#FFD700" />
                  <Text style={styles.loadingText}>Loading more...</Text>
                </View>
              ) : null}
              <View style={{height: 100}} />
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Animatable.View animation="fadeIn">
                  <Package size={60} color="#555" />
                </Animatable.View>
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>
                  Start adding products to your inventory
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
      {UpdateStockModalMemo}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerGradient: {
    flex: 1,
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 2,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  headerContent: {
    // paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsContainer: {
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    elevation: 4,
  },
  variantCard: {
    marginLeft: 42,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  variantsSection: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  variantsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  variantsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  variantsScrollContainer: {
    paddingHorizontal: 10,
    gap: 8,
  },
  variantScrollCard: {
    width: 200,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    marginHorizontal: 4,
    elevation: 3,
  },
  variantImageContainer: {
    position: 'relative',
    width: '100%',
    height: 110,
  },
  variantScrollImage: {
    width: '100%',
    height: '100%',
  },
  variantStockBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 32,
    alignItems: 'center',
  },
  variantStockBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  variantDiscountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  variantDiscountText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  variantTypeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  variantTypeBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
  },
  variantScrollContent: {
    padding: 10,
  },
  variantTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 6,
  },
  variantTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 16,
  },
  variantAttributesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  variantAttributeChip: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  variantAttributeText: {
    color: '#60A5FA',
    fontSize: 9,
    fontWeight: '500',
  },
  variantAttributeValue: {
    fontWeight: '700',
  },
  variantCategoryText: {
    fontSize: 9,
    color: '#999',
    marginBottom: 6,
  },
  variantInfoRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  variantPriceSection: {
    flex: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  variantPriceLabel: {
    fontSize: 8,
    color: '#999',
    marginBottom: 2,
  },
  variantPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  variantPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  variantMrp: {
    fontSize: 10,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  variantStockSection: {
    flex: 1,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)',
  },
  variantStockLabel: {
    fontSize: 8,
    color: '#999',
    marginBottom: 2,
  },
  variantStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  variantStockValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  variantAuctionInfo: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  variantAuctionLabel: {
    fontSize: 8,
    color: '#A78BFA',
    marginBottom: 2,
    fontWeight: '600',
  },
  variantAuctionPrices: {
    flexDirection: 'row',
    gap: 6,
  },
  variantAuctionPrice: {
    fontSize: 9,
    color: '#C4B5FD',
  },
  variantEditButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 6,
  },
  variantAnalyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  variantAnalyzeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  stockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 50,
    flexDirection:'row',
    gap:2,
    alignItems: 'center',
  },
  stockBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  imageBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  imageBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 22,
  },
  editIconButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 8,
  },
  lockIconButton: {
    padding: 8,
    backgroundColor: 'rgba(102, 102, 102, 0.15)',
    borderRadius: 8,
  },
  attributesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  attributeChip: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  attributeText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '500',
  },
  attributeValue: {
    fontWeight: '700',
  },
  categoryText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  priceSection: {
    flex: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  priceLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  mrp: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  stockSection: {
    flex: 1,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)',
  },
  stockLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  auctionInfo: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  auctionLabel: {
    fontSize: 11,
    color: '#A78BFA',
    marginBottom: 6,
    fontWeight: '600',
  },
  auctionPrices: {
    flexDirection: 'row',
    gap: 12,
  },
  auctionPrice: {
    fontSize: 12,
    color: '#C4B5FD',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  expandButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  expandText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  analyzeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  analyzeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  stockCard: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    elevation: 4,
  },
  stockImage: {
    width: '100%',
    height: 180,
  },
  stockCardContent: {
    padding: 16,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  stockTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 22,
  },
  stockStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 50,
    alignItems: 'center',
  },
  stockStatusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stockMetrics: {
    flexDirection: 'row',
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#444',
    marginHorizontal: 16,
  },
  metricLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  stockActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addStockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  addStockText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  lockedStockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102, 102, 102, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 102, 102, 0.3)',
  },
  lockedStockText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  historyButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  historyText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#999',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    borderRadius: 40,
    right: 20,
    bottom: 50,
    zIndex: 1000,
    backgroundColor: '#FFD700',
    elevation: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  accessModeBanner: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  accessModeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  accessModeHeaderText: {
    flex: 1,
  },
  accessModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  accessModeBadge: {
    fontSize: 11,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    color: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  accessModeSubtitle: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 4,
  },
  accessModeSellerName: {
    fontWeight: '600',
    color: '#FFD700',
  },
  // ===== Variant Stock Card Styles =====
  variantStockCard: {
    width: 200,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    marginHorizontal: 4,
    elevation: 3,
  },
  variantStockImageContainer: {
    position: 'relative',
    width: '100%',
    height: 100,
  },
  variantStockScrollImage: {
    width: '100%',
    height: '100%',
  },
  variantStockScrollContent: {
    padding: 10,
  },
  variantStockTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 16,
    marginBottom: 6,
  },
  variantStockStatusSection: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)',
  },
  variantStockStatusLabel: {
    fontSize: 9,
    color: '#999',
    marginBottom: 4,
  },
  variantStockActions: {
    flexDirection: 'row',
    gap: 4,
  },
  variantAddStockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  variantAddStockText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '600',
  },
  variantLockedStockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102, 102, 102, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(102, 102, 102, 0.3)',
  },
  variantLockedStockText: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
  },
  variantHistoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  variantHistoryText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
  },
  // ===== Stock Info Section Styles =====
  stockImageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  stockInfoSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  stockInfoItem: {
    flex: 1,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.2)',
  },
  stockInfoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  stockInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  stockInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stockStatusLabel: {
    fontSize: 10,
    color: '#777',
  },
  permissionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  permissionTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionAllowed: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  permissionDenied: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
  },
  permissionTagText: {
    fontSize: 12,
    color: '#fff',
  },
});
export default ProductScreen;
