/* eslint-disable react/no-unstable-nested-components */
import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  InteractionManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {AWS_CDN_URL} from '../../../../Utils/aws';
import ToggleSwitch from 'toggle-switch-react-native';
import {Toast} from '../../../../Utils/dateUtils';
import styles from './StylesForProductLS';

// ============= TYPE DEFINITIONS =============
interface Product {
  _id: string;
  title: string;
  images: Array<{key: string}>;
  quantity: number;
  productPrice?: number;
  imageUrl?: string;
  startingPrice?: number;
  reservedPrice?: number;
  isVariant?: boolean;
  isParentProduct?: boolean;
  isVariantProduct?: boolean;
  parentProductId?: string;
  parentId?: string;
  variantCount?: number;
  totalVariantStock?: number;
}

interface ConfigData {
  quantity: number;
  startingPrice: string;
  reservedPrice: string;
  preBidsEnabled: boolean;
  preBidIncrement: number;
}

interface AuctionTabContentProps {
  products: Product[];
  selected: any[];
  onSelect: (product: any) => void;
  onRemove: (productId: string) => void;
  onChange: (productId: string, field: string, value: string) => void;
  validationErrors: Record<string, string>;
  getValidationError: (tab: string, index: number, field: string) => string | undefined;
  fetchProducts: (page: number) => Promise<void>;
  page: number;
  editMode?: boolean;
  setPage: (page: number) => void;
  hasNextPage: boolean;
  setHasNextPage: (hasNext: boolean) => void;
  isFetchingMore: boolean;
  setIsFetchingMore: (fetching: boolean) => void;
  expandedParents: Set<string>;
  onToggleExpand: (parentId: string) => void;
}

// ============= MEMOIZED PRODUCT CARD COMPONENTS =============
const ParentProductCard = React.memo(({
  item,
  isExpanded,
  onToggleExpand,
}: {
  item: Product;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}) => {
  const imageUrl = `${AWS_CDN_URL}${item.images?.[0]?.key}` || 'https://via.placeholder.com/50';

  const handleToggle = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      onToggleExpand(item._id);
    });
  }, [item._id, onToggleExpand]);

  return (
    <TouchableOpacity 
      style={[styles.productCard, styles.parentProductCard]}
      onPress={handleToggle}
      activeOpacity={0.7}>
      <View style={styles.expandIconContainer}>
        <Icon 
          name={isExpanded ? 'chevron-down' : 'chevron-right'} 
          size={20} 
          color="#FDD122" 
        />
      </View>
      <Image source={{uri: imageUrl}} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text numberOfLines={2} style={styles.productTitle}>
          {item.title || 'Untitled Product'}
        </Text>
        <View style={styles.productMeta}>
          <View style={styles.variantInfoContainer}>
            <Icon name="package-variant" size={14} color="#FDD122" />
            <Text style={styles.variantCountText}>
              {item.variantCount} variants
            </Text>
          </View>
          <View style={[
            styles.stockContainer, 
            {
              backgroundColor: item.totalVariantStock! > 0 
                ? 'rgba(34, 197, 94, 0.2)' 
                : 'rgba(239, 68, 68, 0.2)',
              padding: 2
            }
          ]}>
            <Icon 
              name="cube-outline" 
              size={14} 
              color={item.totalVariantStock! > 0 ? '#22C55E' : '#EF4444'} 
            />
            <Text style={[
              styles.stockText, 
              {color: item.totalVariantStock! > 0 ? '#22C55E' : '#EF4444'}
            ]}>
              Total: {item.totalVariantStock || 0}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const VariantProductCard = React.memo(({
  item,
  onConfigureClick,
}: {
  item: Product;
  onConfigureClick: (product: Product) => void;
}) => {
  const imageUrl = `${AWS_CDN_URL}${item.images?.[0]?.key}` || 'https://via.placeholder.com/50';

  const handleConfigure = useCallback(() => {
    if(item.quantity <= 0)return;
    InteractionManager.runAfterInteractions(() => {
      onConfigureClick(item);
    });
  }, [item, onConfigureClick]);

  return (
    <View style={[styles.productCard, styles.variantProductCard]}>
      <View style={styles.variantIndentLine}>
        <View style={styles.variantConnector} />
      </View>
      <Image source={{uri: imageUrl}} style={[styles.productImage, styles.variantImage]} />
      <View style={styles.productInfo}>
        <View style={styles.variantTitleRow}>
          <Text numberOfLines={2} style={[styles.productTitle, styles.variantTitle]}>
            {item.title || 'Untitled Product'}
          </Text>
        </View>
        <View style={styles.productMeta}>
          <View style={styles.stockContainer}>
            <Icon name="package-variant" size={16} color="#666" />
            <Text style={styles.stockText}>Qty {item.quantity || 0}</Text>
          </View>
          <View style={styles.auctionPrices}>
            <Text style={styles.smallPriceText}>
              Price: ₹{item.productPrice || 0}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.addButton,
          item.quantity <= 0 && styles.addButtonDisabled,
        ]}
        onPress={handleConfigure}
        // disabled={item.quantity <= 0}
        activeOpacity={0.7}>
        <Icon 
          name="plus-circle" 
          size={24} 
          color={item.quantity <= 0 ? '#666' : '#FDD122'} 
        />
        <Text 
          style={[
            styles.addButtonText,
            item.quantity <= 0 && styles.addButtonTextDisabled,
          ]}>
          Add
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const StandaloneProductCard = React.memo(({
  item,
  onConfigureClick,
}: {
  item: Product;
  onConfigureClick: (product: Product) => void;
}) => {
  const imageUrl = `${AWS_CDN_URL}${item.images?.[0]?.key}` || 'https://via.placeholder.com/50';

  const handleConfigure = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      onConfigureClick(item);
    });
  }, [item, onConfigureClick]);

  return (
    <View style={styles.productCard}>
      <Image source={{uri: imageUrl}} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text numberOfLines={2} style={styles.productTitle}>
          {item.title || 'Untitled Product'}
        </Text>

        <View style={styles.productMeta}>
          <View style={styles.stockContainer}>
            <Icon name="package-variant" size={16} color="#666" />
            <Text style={styles.stockText}>Qty {item.quantity || 0}</Text>
          </View>

          <View style={styles.auctionPrices}>
            <Text style={styles.smallPriceText}>
              Start: ₹{item.startingPrice || 0}
            </Text>
            <Text style={styles.smallPriceText}>
              Reserve: ₹{item.reservedPrice || 0}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.addButton,
          item.quantity <= 0 && styles.addButtonDisabled,
        ]}
        onPress={handleConfigure}
        disabled={item.quantity <= 0}
        activeOpacity={0.7}>
        <Icon 
          name="plus-circle" 
          size={24} 
          color={item.quantity <= 0 ? '#666' : '#FDD122'} 
        />
        <Text 
          style={[
            styles.addButtonText,
            item.quantity <= 0 && styles.addButtonTextDisabled,
          ]}>
          Add
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const SelectedAuctionCard = React.memo(({
  item,
  index,
  onChange,
  onRemove,
  getValidationError,
}: {
  item: any;
  index: number;
  onChange: (productId: string, field: string, value: string) => void;
  onRemove: (productId: string) => void;
  getValidationError: (tab: string, index: number, field: string) => string | undefined;
}) => {
  const handleRemove = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      onRemove(item.productId);
    });
  }, [item.productId, onRemove]);

  const handleStartingPriceChange = useCallback((text: string) => {
    onChange(item.productId, 'startingPrice', text);
  }, [item.productId, onChange]);

  const handleReservedPriceChange = useCallback((text: string) => {
    onChange(item.productId, 'reservedPrice', text);
  }, [item.productId, onChange]);

  const handleQuantityChange = useCallback((text: string) => {
    const val = parseInt(text) || 1;
    const maxQty = item.quantity || 999;
    const newQty = Math.max(1, Math.min(val, maxQty));
    onChange(item.productId, 'auctionQuantity', newQty.toString());
  }, [item.productId, item.quantity, onChange]);

  const handleQuantityIncrement = useCallback(() => {
    const currentQty = parseInt(item.auctionQuantity) || 1;
    const maxQty = item.quantity || 999;
    if (currentQty < maxQty) {
      onChange(item.productId, 'auctionQuantity', (currentQty + 1).toString());
    }
  }, [item.productId, item.auctionQuantity, item.quantity, onChange]);

  const handleQuantityDecrement = useCallback(() => {
    const currentQty = parseInt(item.auctionQuantity) || 1;
    if (currentQty > 1) {
      onChange(item.productId, 'auctionQuantity', (currentQty - 1).toString());
    }
  }, [item.productId, item.auctionQuantity, onChange]);

  const currentQuantity = parseInt(item.auctionQuantity) || 1;
  const maxQuantity = item.quantity || 999;

  return (
    <View style={styles.selectedProductCard}>
      <View style={styles.productNumberBadge}>
        <Text style={styles.productNumberText}>{index + 1}</Text>
      </View>

      <Image source={{uri: item?.imageUrl}} style={styles.productImage} />

      <View style={styles.productInfo}>
        <Text numberOfLines={1} style={styles.productTitle}>
          {item.title}
          {item.auctionIndex && item.totalAuctionItems && (
            <Text style={{color: '#FDD122', fontSize: 11}}>
              {' '}(#{item.auctionIndex}/{item.totalAuctionItems})
            </Text>
          )}
        </Text>

        <View style={styles.auctionInputsContainer}>
          <View style={styles.auctionInputWrapper}>
            <Text style={styles.inputLabel}>Starting Price:</Text>
            <TextInput
              value={item.startingPrice}
              onChangeText={handleStartingPriceChange}
              style={[
                styles.priceInput,
                getValidationError('auction', index, 'starting') &&
                  styles.errorInput,
              ]}
              placeholder="Start Price"
              keyboardType="numeric"
            />
            {getValidationError('auction', index, 'starting') && (
              <Text style={styles.errorText}>
                {getValidationError('auction', index, 'starting')}
              </Text>
            )}
          </View>

          <View style={styles.auctionInputWrapper}>
            <Text style={styles.inputLabel}>Reserve Price:</Text>
            <TextInput
              value={item.reservedPrice}
              onChangeText={handleReservedPriceChange}
              style={[
                styles.priceInput,
                getValidationError('auction', index, 'reserved') &&
                  styles.errorInput,
              ]}
              placeholder="Reserve Price"
              keyboardType="numeric"
            />
            {getValidationError('auction', index, 'reserved') && (
              <Text style={styles.errorText}>
                {getValidationError('auction', index, 'reserved')}
              </Text>
            )}
          </View>

          <View style={styles.auctionInputWrapper}>
            <Text style={styles.inputLabel}>Quantity:</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  currentQuantity <= 1 && styles.quantityButtonDisabled,
                ]}
                onPress={handleQuantityDecrement}
                disabled={currentQuantity <= 1}
                activeOpacity={0.7}>
                <Icon name="minus" size={16} color={currentQuantity <= 1 ? '#666' : '#000'} />
              </TouchableOpacity>

              <TextInput
                value={item.auctionQuantity || '1'}
                onChangeText={handleQuantityChange}
                style={[styles.priceInput, {width: 60, textAlign: 'center'}]}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  currentQuantity >= maxQuantity && styles.quantityButtonDisabled,
                ]}
                onPress={handleQuantityIncrement}
                disabled={currentQuantity >= maxQuantity}
                activeOpacity={0.7}>
                <Icon name="plus" size={16} color={currentQuantity >= maxQuantity ? '#666' : '#000'} />
              </TouchableOpacity>
            </View>
            {getValidationError('auction', index, 'quantity') && (
              <Text style={styles.errorText}>
                {getValidationError('auction', index, 'quantity')}
              </Text>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={handleRemove}
        activeOpacity={0.7}>
        <Icon name="trash-can" size={20} color="#F44336" />
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
});

// ============= CONFIGURATION MODAL =============
const ConfigurationModal = React.memo(({
  visible,
  selectedProduct,
  configData,
  configErrors,
  onConfigDataChange,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  selectedProduct: Product | null;
  configData: ConfigData;
  configErrors: Record<string, string>;
  onConfigDataChange: (field: keyof ConfigData, value: any) => void;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  if (!selectedProduct) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.modalOverlay}
          onPress={onClose}>
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Icon name="hammer" size={24} color="#FDD122" />
                <Text style={styles.modalTitle}>Configure Auction</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.modalCloseButton}>
                  <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Product Info */}
              <View style={styles.modalProductInfo}>
                <Image
                  source={{
                    uri:
                      `${AWS_CDN_URL}${selectedProduct.images?.[0]?.key}` ||
                      'https://via.placeholder.com/50',
                  }}
                  style={styles.modalProductImage}
                />
                <View style={{flex: 1}}>
                  <Text style={styles.modalProductTitle} numberOfLines={2}>
                    {selectedProduct.title}
                  </Text>
                  <Text style={styles.modalProductStock}>
                    Available Stock: {selectedProduct.quantity}
                  </Text>
                </View>
              </View>

              {/* Quantity Selection */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Quantity</Text>
                <View style={styles.modalQuantityRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalQuantityButton,
                      configData.quantity <= 1 && styles.quantityButtonDisabled,
                    ]}
                    onPress={() => onConfigDataChange('quantity', Math.max(1, configData.quantity - 1))}
                    disabled={configData.quantity <= 1}>
                    <Icon name="minus" size={20} color="#000" />
                  </TouchableOpacity>

                  <TextInput
                    value={configData.quantity.toString()}
                    onChangeText={text => {
                      const val = parseInt(text) || 1;
                      onConfigDataChange('quantity', Math.max(1, Math.min(val, selectedProduct.quantity)));
                    }}
                    style={[
                      styles.modalQuantityInput,
                      configErrors.quantity && styles.errorInput
                    ]}
                    keyboardType="numeric"
                  />

                  <TouchableOpacity
                    style={[
                      styles.modalQuantityButton,
                      configData.quantity >= selectedProduct.quantity &&
                        styles.quantityButtonDisabled,
                    ]}
                    onPress={() => onConfigDataChange('quantity', Math.min(selectedProduct.quantity, configData.quantity + 1))}
                    disabled={configData.quantity >= selectedProduct.quantity}>
                    <Icon name="plus" size={20} color="#000" />
                  </TouchableOpacity>
                </View>
                {configErrors.quantity && (
                  <Text style={styles.errorText}>{configErrors.quantity}</Text>
                )}
              </View>

              {/* Starting and Reserve Price */}
              <View style={styles.modalSection}>
                <View style={{flexDirection: 'row', gap: 12}}>
                  <View style={{flex: 1}}>
                    <Text style={styles.modalSectionLabel}>Starting Price (Optional)</Text>
                    <TextInput
                      value={configData.startingPrice}
                      onChangeText={text => onConfigDataChange('startingPrice', text)}
                      style={[
                        styles.priceInput,
                        configErrors.startingPrice && styles.errorInput
                      ]}
                      placeholder="₹ 0"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                    {configErrors.startingPrice && (
                      <Text style={styles.errorText}>{configErrors.startingPrice}</Text>
                    )}
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.modalSectionLabel}>Reserve Price (Optional)</Text>
                    <TextInput
                      value={configData.reservedPrice}
                      onChangeText={text => onConfigDataChange('reservedPrice', text)}
                      style={[
                        styles.priceInput,
                        configErrors.reservedPrice && styles.errorInput
                      ]}
                      placeholder="₹ 0"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                    {configErrors.reservedPrice && (
                      <Text style={styles.errorText}>{configErrors.reservedPrice}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Pre-Bid Toggle */}
              <View style={styles.modalSection}>
                <View style={[styles.modalToggleRow, {backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)'}]}>
                  <View style={{flex: 1}}>
                    <Text style={styles.modalSectionLabel}>Pre-Bidding</Text>
                    <Text style={styles.modalToggleDesc}>
                      Users can bid before auction starts (min increment ₹10)
                    </Text>
                  </View>
                  <ToggleSwitch
                    isOn={configData.preBidsEnabled}
                    onToggle={(value) => onConfigDataChange('preBidsEnabled', value)}
                    onColor="#3B82F6"
                    offColor="#555"
                    size="medium"
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={onClose}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={onConfirm}>
                  <Icon name="check" size={20} color="#000" />
                  <Text style={styles.modalConfirmText}>
                    Add {configData.quantity} Item{configData.quantity > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ============= MAIN COMPONENT =============
const AuctionTabContent: React.FC<AuctionTabContentProps> = ({
  products,
  selected,
  onSelect,
  onRemove,
  onChange,
  getValidationError,
  fetchProducts,
  page,
  hasNextPage,
  isFetchingMore,
  expandedParents,
  onToggleExpand,
}) => {
  // ============= STATE =============
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [configData, setConfigData] = useState<ConfigData>({
    quantity: 1,
    startingPrice: '',
    reservedPrice: '',
    preBidsEnabled: false,
    preBidIncrement: 50,
  });
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});

  // ============= CALLBACKS =============
  const handleConfigureClick = useCallback((product: Product) => {
    setSelectedProductForModal(product);
    setConfigData({
      quantity: 1,
      startingPrice: product.startingPrice! > 0 ? product.startingPrice!.toString() : '',
      reservedPrice: product.reservedPrice! > 0 ? product.reservedPrice!.toString() : '',
      preBidsEnabled: false,
      preBidIncrement: 50,
    });
    setConfigErrors({});
    setShowQuantityModal(true);
  }, []);

  const handleConfigDataChange = useCallback((field: keyof ConfigData, value: any) => {
    setConfigData(prev => ({...prev, [field]: value}));
  }, []);

  const validateConfig = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!configData.quantity || configData.quantity < 1) {
      errors.quantity = 'Quantity is required';
    }
    
    if (configData.startingPrice && configData.startingPrice !== '') {
      const price = parseFloat(configData.startingPrice);
      if (isNaN(price) || price <= 0) {
        errors.startingPrice = 'Starting price must be greater than 0';
      }
    }
    
    if (configData.reservedPrice && configData.reservedPrice !== '') {
      const price = parseFloat(configData.reservedPrice);
      if (isNaN(price) || price <= 0) {
        errors.reservedPrice = 'Reserve price must be greater than 0';
      }
    }
    
    if (configData.preBidsEnabled) {
      if (!configData.preBidIncrement || configData.preBidIncrement < 10) {
        errors.preBidIncrement = 'Pre-bid increment must be at least ₹10';
      }
      
      if (!configData.startingPrice || configData.startingPrice === '') {
        errors.startingPrice = 'Starting price recommended for pre-bidding';
      }
    }
    
    setConfigErrors(errors);
    return Object.keys(errors).length === 0;
  }, [configData]);

  const handleConfirmConfig = useCallback(() => {
    if (!validateConfig()) {
      Toast('Please fix validation errors');
      return;
    }
    
    if (!selectedProductForModal) return;
    
    const timestamp = Date.now();
    const quantity = configData.quantity;
    
    const itemWithConfig = {
      ...selectedProductForModal,
      _tempId: `${selectedProductForModal._id}-${timestamp}-${Math.random()}`,
      startingPrice: configData.startingPrice,
      reservedPrice: configData.reservedPrice,
      preBidsEnabled: configData.preBidsEnabled,
      preBidIncrement: configData.preBidIncrement,
      auctionQuantity: quantity.toString(),
    };

    InteractionManager.runAfterInteractions(() => {
      onSelect(itemWithConfig);
    });

    Toast(`Added ${quantity} auction item(s) successfully!`);
    
    setShowQuantityModal(false);
    setSelectedProductForModal(null);
    setConfigData({
      quantity: 1,
      startingPrice: '',
      reservedPrice: '',
      preBidsEnabled: false,
      preBidIncrement: 50,
    });
    setConfigErrors({});
  }, [validateConfig, selectedProductForModal, configData, onSelect]);

  const handleCloseModal = useCallback(() => {
    setShowQuantityModal(false);
    setConfigErrors({});
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!isFetchingMore && hasNextPage) {
      fetchProducts(page + 1);
    }
  }, [fetchProducts, page, isFetchingMore, hasNextPage]);

  // ============= RENDER FUNCTIONS =============
  const renderProductItem = useCallback(({item}: {item: Product}) => {
    const isParent = item.isParentProduct && item.variantCount! > 0;
    const isVariant = item.isVariant;
    const isExpanded = expandedParents?.has(item._id);

    if (isParent) {
      return (
        <ParentProductCard 
          item={item} 
          isExpanded={isExpanded!} 
          onToggleExpand={onToggleExpand} 
        />
      );
    }

    if (isVariant) {
      return (
        <VariantProductCard 
          item={item} 
          onConfigureClick={handleConfigureClick} 
        />
      );
    }

    return (
      <StandaloneProductCard 
        item={item} 
        onConfigureClick={handleConfigureClick} 
      />
    );
  }, [expandedParents, onToggleExpand, handleConfigureClick]);

  const renderSelectedProductItem = useCallback(({item, index}: {item: any; index: number}) => (
    <SelectedAuctionCard
      item={item}
      index={index}
      onChange={onChange}
      onRemove={onRemove}
      getValidationError={getValidationError}
    />
  ), [onChange, onRemove, getValidationError]);

  const keyExtractor = useCallback(
    (item: any) => item.productId?._id?.toString() || item._id?.toString() || Math.random().toString(),
    [],
  );

  const selectedKeyExtractor = useCallback(
    (item: any, index: number) => item.productId?._id?.toString() || index.toString(),
    [],
  );

  const ListFooterComponent = useMemo(() => {
    if (products.length === 0) return null;

    return hasNextPage ? (
      <TouchableOpacity
        onPress={handleLoadMore}
        disabled={isFetchingMore}
        style={[
          styles.loadMoreButton,
          isFetchingMore && styles.loadMoreButtonDisabled,
        ]}
        activeOpacity={0.7}>
        {isFetchingMore ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.loadMoreText}>Load More</Text>
        )}
      </TouchableOpacity>
    ) : (
      <View style={styles.endOfList}>
        <Text style={styles.endOfListText}>No more products</Text>
      </View>
    );
  }, [products.length, hasNextPage, isFetchingMore, handleLoadMore]);

  const EmptyComponent = useMemo(() => (
    <View style={styles.emptyState}>
      <Icon name="information-outline" size={24} color="#666" />
      <Text style={styles.emptyStateText}>No available products</Text>
    </View>
  ), []);

  return (
    <View style={styles.tabSection}>
      {/* Configuration Modal */}
      <ConfigurationModal
        visible={showQuantityModal}
        selectedProduct={selectedProductForModal}
        configData={configData}
        configErrors={configErrors}
        onConfigDataChange={handleConfigDataChange}
        onConfirm={handleConfirmConfig}
        onClose={handleCloseModal}
      />

      {/* Available Products */}
      <Text style={styles.sectionTitle}>Available Auction Products</Text>
      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          ListFooterComponent={ListFooterComponent}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.productList}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
        />
      ) : (
        EmptyComponent
      )}

      {/* Selected Products */}
      {selected.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Selected Auction Products</Text>
          <FlatList
            data={selected}
            renderItem={renderSelectedProductItem}
            keyExtractor={selectedKeyExtractor}
            contentContainerStyle={styles.productList}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            nestedScrollEnabled={true}
            removeClippedSubviews={false}
          />
        </>
      )}
    </View>
  );
};

export default React.memo(AuctionTabContent);
