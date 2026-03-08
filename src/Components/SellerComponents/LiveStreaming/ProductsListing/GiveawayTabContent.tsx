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
  Modal,
  ScrollView,
  InteractionManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {AWS_CDN_URL} from '../../../../Utils/aws';
import ToggleSwitch from 'toggle-switch-react-native';
import styles from './StylesForProductLS';
import { Plus } from 'lucide-react-native';

// ============= TYPE DEFINITIONS =============
interface Product {
  _id: string;
  title: string;
  images: Array<{key: string}>;
  quantity: number;
  productPrice?: number;
  imageUrl?: string;
  isVariant?: boolean;
  isParentProduct?: boolean;
  isVariantProduct?: boolean;
  parentProductId?: string;
  parentId?: string;
  variantCount?: number;
  totalVariantStock?: number;
}

interface TierConfig {
  label: string;
  color: string;
  description: string;
  icon: string;
}

interface GiveawayTabContentProps {
  products: Product[];
  selected: any[];
  onSelect: (product: any) => void;
  onRemove: (productId: string) => void;
  onChange: (productId: string, field: string, value: any) => void;
  fetchProducts: (page: number) => Promise<void>;
  page: number;
  editMode?: boolean;
  setPage: (page: number) => void;
  hasNextPage: boolean;
  setHasNextPage: (hasNext: boolean) => void;
  isFetchingMore: boolean;
  setIsFetchingMore: (fetching: boolean) => void;
  validationErrors: Record<string, string>;
  getValidationError: (tab: string, index: number, field: string) => string | undefined;
  expandedParents: Set<string>;
  onToggleExpand: (parentId: string) => void;
}

// ============= TIER CONFIGURATION =============
const TIER_CONFIG: Record<string, TierConfig> = {
  silver: {
    label: 'Silver',
    color: '#9CA3AF',
    description: 'Open to all users',
    icon: '🥈',
  },
  gold: {
    label: 'Gold',
    color: '#FDD122',
    description: 'User must share the stream',
    icon: '🥇',
  },
  platinum: {
    label: 'Platinum',
    color: '#D1D5DB',
    description: 'User Must Comment in Stream',
    icon: '⭐',
  },
  diamond: {
    label: 'Diamond',
    color: '#22D3EE',
    description: 'User must watch for set duration',
    icon: '💎',
  },
};

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
        <Text numberOfLines={1} style={styles.productTitle}>
          {item.title || 'Untitled Product'}
        </Text>
        <View style={styles.productMeta}>
          <View style={styles.variantInfoContainer}>
            <Icon name="gift-outline" size={14} color="#FDD122" />
            <Text style={styles.variantCountText}>
              {item.variantCount} variants
            </Text>
          </View>
          <View style={[
            styles.stockContainer, 
            {backgroundColor: item.totalVariantStock! > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
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
          <Text numberOfLines={1} style={[styles.productTitle, styles.variantTitle]}>
            {item.title || 'Untitled Product'}
          </Text>
          <View style={styles.variantBadge}>
            <Text style={styles.variantBadgeText}>Variant</Text>
          </View>
        </View>
        <View style={styles.productMeta}>
          <View style={styles.stockContainer}>
            <Icon name="package-variant" size={16} color="#666" />
            <Text style={styles.stockText}>Qty {item.quantity || 0}</Text>
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
        <Plus   size={24} 
          color={item.quantity <= 0 ? '#666' : '#FDD122'} />
        {/* <Icon 
          name="plus-circle" 
       
        /> */}
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
    <View style={styles.giveawayAvailableCard}>
      <View style={styles.giveawayAvailableTop}>
        <Image source={{uri: imageUrl}} style={styles.productImage} />
        <View style={styles.giveawayAvailableInfo}>
          <Text numberOfLines={2} style={styles.productTitle}>
            {item.title || 'Untitled Product'}
          </Text>
          <View style={styles.stockContainer}>
            <Icon name="package-variant" size={14} color="#666" />
            <Text style={styles.stockText}>
              Stock: {item.quantity || 0}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.giveawayConfigButton,
          item.quantity <= 0 && styles.addButtonDisabled,
        ]}
        onPress={handleConfigure}
        disabled={item.quantity <= 0}
        activeOpacity={0.7}>
        <Plus
          // name="cog"
          size={18}
          color={item.quantity <= 0 ? '#666' : '#FDD122'}
        />
        <Text
          style={[
            styles.giveawayConfigButtonText,
            item.quantity <= 0 && styles.addButtonTextDisabled,
          ]}>
          Add
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const SelectedGiveawayCard = React.memo(({
  item,
  index,
  editMode,
  onChange,
  onRemove,
}: {
  item: any;
  index: number;
  editMode?: boolean;
  onChange: (productId: string, field: string, value: any) => void;
  onRemove: (productId: string) => void;
}) => {
  const tier = TIER_CONFIG[item.giveawayTier || 'silver'];

  const handleRemove = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      onRemove(item.productId);
    });
  }, [item.productId, onRemove]);

  const handleAutoFollowToggle = useCallback((value: boolean) => {
    onChange(item.productId, 'requireAutoFollow', value);
  }, [item.productId, onChange]);

  const handleQuantityChange = useCallback((text: string) => {
    const val = parseInt(text) || 1;
    const maxQty = item.quantity || 999;
    const newQty = Math.max(1, Math.min(val, maxQty));
    onChange(item.productId, 'giveawayQuantity', newQty.toString());
  }, [item.productId, item.quantity, onChange]);

  const handleQuantityIncrement = useCallback(() => {
    const currentQty = parseInt(item.giveawayQuantity) || 1;
    const maxQty = item.quantity || 999;
    if (currentQty < maxQty) {
      onChange(item.productId, 'giveawayQuantity', (currentQty + 1).toString());
    }
  }, [item.productId, item.giveawayQuantity, item.quantity, onChange]);

  const handleQuantityDecrement = useCallback(() => {
    const currentQty = parseInt(item.giveawayQuantity) || 1;
    if (currentQty > 1) {
      onChange(item.productId, 'giveawayQuantity', (currentQty - 1).toString());
    }
  }, [item.productId, item.giveawayQuantity, onChange]);

  const handleTierChange = useCallback((tierKey: string) => {
    onChange(item.productId, 'giveawayTier', tierKey);
    if (tierKey === 'diamond' && !item.minWatchDuration) {
      onChange(item.productId, 'minWatchDuration', 120);
    }
  }, [item.productId, item.minWatchDuration, onChange]);

  const handleWatchDurationIncrement = useCallback(() => {
    const currentMins = item.minWatchDuration ? Math.round(item.minWatchDuration / 60) : 2;
    if (currentMins < 60) {
      onChange(item.productId, 'minWatchDuration', (currentMins + 1) * 60);
    }
  }, [item.productId, item.minWatchDuration, onChange]);

  const handleWatchDurationDecrement = useCallback(() => {
    const currentMins = item.minWatchDuration ? Math.round(item.minWatchDuration / 60) : 2;
    if (currentMins > 1) {
      onChange(item.productId, 'minWatchDuration', (currentMins - 1) * 60);
    }
  }, [item.productId, item.minWatchDuration, onChange]);

  const handleWatchDurationChange = useCallback((text: string) => {
    const val = parseInt(text) || 2;
    const newMins = Math.max(1, Math.min(val, 60));
    onChange(item.productId, 'minWatchDuration', newMins * 60);
  }, [item.productId, onChange]);

  const currentQuantity = parseInt(item.giveawayQuantity) || 1;
  const maxQuantity = item.quantity || 999;

  return (
    <View style={styles.giveawaySelectedCard}>
      <View style={styles.productNumberBadge}>
        <Text style={styles.productNumberText}>{index + 1}</Text>
      </View>

      <View style={styles.giveawayCardContent}>
        <View style={styles.giveawayHeader}>
          <Icon name="gift" size={20} color="#FDD122" />
          <Text style={styles.giveawayHeaderText}>
            Giveaway Configuration
          </Text>
        </View>

        <View style={styles.giveawayProductInfo}>
          <Image
            source={{uri: item?.imageUrl}}
            style={styles.giveawayProductImage}
          />
          <View style={styles.giveawayProductDetails}>
            <Text style={styles.giveawayProductLabel}>Product:</Text>
            <Text numberOfLines={2} style={styles.giveawayProductTitle}>
              {item.title}
            </Text>
          </View>
        </View>

        {!editMode && (
          <>
            <View style={styles.giveawayInfoRow}>
              <Icon name="package-variant" size={16} color="#FDD122" />
              <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <Text style={styles.giveawayInfoText}>Quantity:</Text>
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
                    value={item.giveawayQuantity || '1'}
                    onChangeText={handleQuantityChange}
                    style={[styles.giveawayQuantityInput]}
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
              </View>
            </View>
            <View
              style={[
                styles.giveawayInfoRow,
                {backgroundColor: tier.color + '20'},
              ]}>
              <Text style={styles.tierIcon}>{tier.icon}</Text>
              <View style={{flex: 1}}>
                <Text
                  style={[styles.giveawayInfoText, {color: tier.color}]}>
                  Tier: {tier.label}
                </Text>
                <Text style={styles.tierDescription}>
                  {tier.description}
                </Text>
              </View>
            </View>
            <View style={styles.tierSelectionRow}>
              {Object.entries(TIER_CONFIG).map(([key, config]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.tierSelectButton,
                    item.giveawayTier === key && styles.tierSelectButtonActive,
                    {borderColor: item.giveawayTier === key ? config.color : '#444'},
                  ]}
                  onPress={() => handleTierChange(key)}
                  activeOpacity={0.7}>
                  <Text style={styles.tierSelectIcon}>{config.icon}</Text>
                  <Text style={[
                    styles.tierSelectLabel,
                    {color: item.giveawayTier === key ? config.color : '#888'},
                  ]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {item.giveawayTier === 'diamond' && (
              <View style={{marginTop: 12, backgroundColor: 'rgba(34, 211, 238, 0.05)', borderRadius: 12, padding: 12, borderColor: 'rgba(34, 211, 238, 0.2)', borderWidth: 1}}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                  <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <Text style={{fontSize: 14}} >💎</Text>
                    <Text style={{color: '#22D3EE', fontSize: 14, fontWeight: '600'}}>Watch Time (Mins):</Text>
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <TouchableOpacity
                      style={[
                        styles.quantityButton,
                        {borderColor: '#22D3EE', borderWidth: 1, backgroundColor: 'transparent'},
                        (!item.minWatchDuration || Math.round(item.minWatchDuration / 60) <= 1) && {opacity: 0.5},
                      ]}
                      onPress={handleWatchDurationDecrement}
                      disabled={!item.minWatchDuration || Math.round(item.minWatchDuration / 60) <= 1}
                      activeOpacity={0.7}>
                      <Icon name="minus" size={16} color="#22D3EE" />
                    </TouchableOpacity>

                    <TextInput
                      value={item.minWatchDuration ? Math.round(item.minWatchDuration / 60).toString() : '2'}
                      onChangeText={handleWatchDurationChange}
                      style={[styles.giveawayQuantityInput, {color: '#22D3EE'}]}
                      keyboardType="numeric"
                    />

                    <TouchableOpacity
                      style={[
                        styles.quantityButton,
                        {borderColor: '#22D3EE', borderWidth: 1, backgroundColor: 'transparent'},
                        (item.minWatchDuration && Math.round(item.minWatchDuration / 60) >= 60) && {opacity: 0.5},
                      ]}
                      onPress={handleWatchDurationIncrement}
                      disabled={item.minWatchDuration && Math.round(item.minWatchDuration / 60) >= 60}
                      activeOpacity={0.7}>
                      <Icon name="plus" size={16} color="#22D3EE" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        <View style={styles.giveawayFollowSection}>
          <View style={{flex: 1}}>
            <Text style={styles.giveawayFollowLabel}>Auto Follow</Text>
            <Text style={styles.followDescription}>
              Users must follow to participate
            </Text>
          </View>
          <ToggleSwitch
            isOn={item.requireAutoFollow}
            onToggle={handleAutoFollowToggle}
            onColor="#FDD122"
          />
        </View>

        <TouchableOpacity
          style={styles.giveawayRemoveButton}
          onPress={handleRemove}
          activeOpacity={0.7}>
          <Icon name="trash-can" size={18} color="#F44336" />
          <Text style={styles.giveawayRemoveText}>Remove Giveaway</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ============= TIER CARD COMPONENT =============
const TierCard = React.memo(({
  tierKey,
  config,
  isSelected,
  onSelect,
}: {
  tierKey: string;
  config: TierConfig;
  isSelected: boolean;
  onSelect: (key: string) => void;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(tierKey);
  }, [tierKey, onSelect]);

  return (
    <TouchableOpacity
      style={[
        styles.tierCard,
        isSelected && styles.tierCardSelected,
        {borderColor: isSelected ? config.color : '#333'},
      ]}
      onPress={handleSelect}
      activeOpacity={0.7}>
      <Text style={styles.tierIcon}>{config.icon}</Text>
      <Text
        style={[
          styles.tierLabel,
          {color: !isSelected ? config.color : '#000'},
        ]}>
        {config.label}
      </Text>
      <Text style={styles.tierDesc} numberOfLines={2}>
        {config.description}
      </Text>
    </TouchableOpacity>
  );
});

// ============= MAIN COMPONENT =============
const GiveawayTabContent: React.FC<GiveawayTabContentProps> = ({
  products,
  selected,
  onSelect,
  onRemove,
  onChange,
  fetchProducts,
  page,
  editMode,
  hasNextPage,
  isFetchingMore,
  expandedParents,
  onToggleExpand,
}) => {
  // ============= STATE =============
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedProductForConfig, setSelectedProductForConfig] = useState<Product | null>(null);
  const [configQuantity, setConfigQuantity] = useState(1);
  const [configAutoFollow, setConfigAutoFollow] = useState(false);
  const [configTier, setConfigTier] = useState('silver');
  const [configWatchMinutes, setConfigWatchMinutes] = useState(2);

  // ============= CALLBACKS =============
  const handleConfigureClick = useCallback((product: Product) => {
    setSelectedProductForConfig(product);
    setConfigQuantity(1);
    setConfigAutoFollow(false);
    setConfigTier('silver');
    setConfigWatchMinutes(2);
    setShowConfigModal(true);
  }, []);

  const handleConfirmConfig = useCallback(() => {
    if (!selectedProductForConfig) return;

    const itemWithConfig = {
      ...selectedProductForConfig,
      giveawayQuantity: configQuantity.toString(),
      requireAutoFollow: configAutoFollow,
      giveawayTier: configTier,
      ...(configTier === 'diamond' && { minWatchDuration: configWatchMinutes * 60 }),
    };

    InteractionManager.runAfterInteractions(() => {
      onSelect(itemWithConfig);
    });

    setShowConfigModal(false);
    setSelectedProductForConfig(null);
    setConfigQuantity(1);
    setConfigAutoFollow(false);
    setConfigTier('silver');
    setConfigWatchMinutes(2);
  }, [selectedProductForConfig, configQuantity, configAutoFollow, configTier, configWatchMinutes, onSelect]);

  const handleCloseModal = useCallback(() => {
    setShowConfigModal(false);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!isFetchingMore && hasNextPage) {
      fetchProducts(page + 1);
    }
  }, [fetchProducts, page, isFetchingMore, hasNextPage]);

  // ============= RENDER FUNCTIONS =============
  const renderProductItem = useCallback(({item}: {item: Product}) => {
    const isParent = item.isParentProduct && item.variantCount! > 0;
    const isVariant = item.isVariantProduct;
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
    <SelectedGiveawayCard
      item={item}
      index={index}
      editMode={editMode}
      onChange={onChange}
      onRemove={onRemove}
    />
  ), [editMode, onChange, onRemove]);

  const keyExtractor = useCallback(
    (item: any) => item._id || Math.random().toString(),
    [],
  );

  const selectedKeyExtractor = useCallback(
    (item: any, index: number) => `giveaway-${item.productId}-${index}`,
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

  // ============= MODAL RENDER =============
  const renderConfigModal = useMemo(() => {
    if (!selectedProductForConfig) return null;

    return (
      <Modal
        visible={showConfigModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Icon name="cog" size={24} color="#FDD122" />
                <Text style={styles.modalTitle}>Configure Giveaway</Text>
                <TouchableOpacity
                  onPress={handleCloseModal}
                  style={styles.modalCloseButton}>
                  <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalProductInfo}>
                <Image
                  source={{
                    uri: `${AWS_CDN_URL}${selectedProductForConfig.images?.[0]?.key}` ||
                      'https://via.placeholder.com/50',
                  }}
                  style={styles.modalProductImage}
                />
                <View style={{flex: 1}}>
                  <Text style={styles.modalProductTitle} numberOfLines={2}>
                    {selectedProductForConfig.title}
                  </Text>
                  <Text style={styles.modalProductStock}>
                    Stock: {selectedProductForConfig.quantity}
                  </Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Quantity</Text>
                <View style={styles.modalQuantityRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalQuantityButton,
                      configQuantity <= 1 && styles.quantityButtonDisabled,
                    ]}
                    onPress={() => setConfigQuantity(Math.max(1, configQuantity - 1))}
                    disabled={configQuantity <= 1}>
                    <Icon name="minus" size={20} color="#000" />
                  </TouchableOpacity>

                  <TextInput
                    value={configQuantity.toString()}
                    onChangeText={text => {
                      const val = parseInt(text) || 1;
                      setConfigQuantity(Math.max(1, Math.min(val, selectedProductForConfig.quantity)));
                    }}
                    style={styles.modalQuantityInput}
                    keyboardType="numeric"
                  />

                  <TouchableOpacity
                    style={[
                      styles.modalQuantityButton,
                      configQuantity >= selectedProductForConfig.quantity &&
                        styles.quantityButtonDisabled,
                    ]}
                    onPress={() => setConfigQuantity(Math.min(selectedProductForConfig.quantity, configQuantity + 1))}
                    disabled={configQuantity >= selectedProductForConfig.quantity}>
                    <Icon name="plus" size={20} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Giveaway Tier</Text>
                <View style={styles.tierGrid}>
                  {Object.entries(TIER_CONFIG).map(([key, config]) => (
                    <TierCard
                      key={key}
                      tierKey={key}
                      config={config}
                      isSelected={configTier === key}
                      onSelect={setConfigTier}
                    />
                  ))}
                </View>
              </View>

              {configTier === 'diamond' && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Watch Duration (Minutes)</Text>
                  <View style={styles.modalQuantityRow}>
                    <TouchableOpacity
                      style={[
                        styles.modalQuantityButton,
                        configWatchMinutes <= 1 && styles.quantityButtonDisabled,
                      ]}
                      onPress={() => setConfigWatchMinutes(Math.max(1, configWatchMinutes - 1))}
                      disabled={configWatchMinutes <= 1}>
                      <Icon name="minus" size={20} color="#000" />
                    </TouchableOpacity>

                    <TextInput
                      value={configWatchMinutes.toString()}
                      onChangeText={text => {
                        const val = parseInt(text) || 2;
                        setConfigWatchMinutes(Math.max(1, Math.min(val, 60)));
                      }}
                      style={styles.modalQuantityInput}
                      keyboardType="numeric"
                    />

                    <TouchableOpacity
                      style={[
                        styles.modalQuantityButton,
                        configWatchMinutes >= 60 &&
                          styles.quantityButtonDisabled,
                      ]}
                      onPress={() => setConfigWatchMinutes(Math.min(60, configWatchMinutes + 1))}
                      disabled={configWatchMinutes >= 60}>
                      <Icon name="plus" size={20} color="#000" />
                    </TouchableOpacity>
                  </View>
                  <View style={{marginTop: 8, padding: 8, backgroundColor: 'rgba(34, 211, 238, 0.1)', borderRadius: 8, borderColor: 'rgba(34, 211, 238, 0.3)', borderWidth: 1}}>
                    <Text style={{color: '#22D3EE', fontSize: 13, textAlign: 'center', fontWeight: '500'}}>
                      💎 Watch <Text style={{fontWeight: 'bold', color: '#22D3EE'}}>{configWatchMinutes}</Text> min{configWatchMinutes !== 1 ? 's' : ''} to qualify
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.modalSection}>
                <View style={styles.modalToggleRow}>
                  <View style={{flex: 1}}>
                    <Text style={styles.modalSectionLabel}>Auto-Follow</Text>
                    <Text style={styles.modalToggleDesc}>
                      Users must follow to participate
                    </Text>
                  </View>
                  <ToggleSwitch
                    isOn={configAutoFollow}
                    onToggle={setConfigAutoFollow}
                    onColor="#FDD122"
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={handleCloseModal}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleConfirmConfig}>
                  <Icon name="check" size={20} color="#000" />
                  <Text style={styles.modalConfirmText}>Add Giveaway</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }, [showConfigModal, selectedProductForConfig, configQuantity, configTier, configAutoFollow, configWatchMinutes, handleCloseModal, handleConfirmConfig]);

  return (
    <View style={styles.tabSection}>
      {renderConfigModal}

      <Text style={styles.sectionTitle}>Available Giveaway Products</Text>
      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.productList}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          ListFooterComponent={ListFooterComponent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
        />
      ) : (
        EmptyComponent
      )}

      {selected.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Selected Giveaway Products</Text>
          <FlatList
            data={selected}
            renderItem={renderSelectedProductItem}
            keyExtractor={selectedKeyExtractor}
            contentContainerStyle={styles.productList}
            scrollEnabled={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
            extraData={selected}
            windowSize={10}
          />
        </>
      )}
    </View>
  );
};

export default React.memo(GiveawayTabContent);
