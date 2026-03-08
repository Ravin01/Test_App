/* eslint-disable react/no-unstable-nested-components */
import React, {useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {AWS_CDN_URL} from '../../../../Utils/aws';
import styles from './StylesForProductLS';

// ============= TYPE DEFINITIONS =============
interface Product {
  _id: string;
  title: string;
  images: Array<{key: string}>;
  quantity: number;
  productPrice?: number;
  imageUrl?: string;
  isParentProduct?: boolean;
  variantCount?: number;
  totalVariantStock?: number;
}

interface SelectedProduct {
  productId: string;
  title: string;
  imageUrl: string;
  quantity: number;
  productPrice?: string;
}

interface BuyNowTabContentProps {
  fetchProducts: (page: number) => Promise<void>;
  products: Product[];
  page: number;
  setPage: (page: number) => void;
  hasNextPage: boolean;
  setHasNextPage: (hasNext: boolean) => void;
  isFetchingMore: boolean;
  setIsFetchingMore: (fetching: boolean) => void;
  selected: SelectedProduct[];
  onSelect: (product: Product) => void;
  onRemove: (productId: string) => void;
  onChange: (productId: string, field: string, value: string) => void;
  type: string;
  validationErrors: Record<string, string>;
  getValidationError: (tab: string, index: number, field: string) => string | undefined;
}

// ============= MEMOIZED PRODUCT CARD COMPONENTS =============
const AvailableProductCard = React.memo(({
  item,
  onSelect,
}: {
  item: Product;
  onSelect: (item: Product) => void;
}) => {
  const imageUrl = `${AWS_CDN_URL}${item.images?.[0]?.key}` || 'https://via.placeholder.com/50';
  const availableQuantity = item.isParentProduct && item.variantCount! > 0 
    ? item.totalVariantStock 
    : item.quantity;
  const isParentProduct = item.isParentProduct && item.variantCount! > 0;

  const handleSelect = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      onSelect(item);
    });
  }, [item, onSelect]);

  return (
    <View style={[
      styles.productCard,
      isParentProduct && styles.parentProductCardBuyNow
    ]}>
      <Image 
        source={{uri: imageUrl}} 
        style={[
          styles.productImage,
          isParentProduct && styles.parentProductImage
        ]} 
      />
      <View style={styles.productInfo}>
        <Text 
          numberOfLines={isParentProduct ? 2 : 1} 
          style={[
            styles.productTitle,
            isParentProduct && styles.parentProductTitle
          ]}
        >
          {item.title || 'Untitled Product'}
        </Text>

        <View style={styles.productMeta}>
          <View style={styles.stockContainer}>
            <Icon name="package-variant" size={16} color="#666" />
            <Text style={styles.stockText}>Qty: {availableQuantity || 0}</Text>
          </View>

          {item.productPrice && (
            <Text style={styles.priceText}>₹ {item.productPrice}</Text>
          )}
        </View>
        
        {isParentProduct && (
          <View style={styles.variantInfoContainerBuyNow}>
            <Icon name="shape-outline" size={14} color="#FDD122" />
            <Text style={styles.variantCountText}>
              {item.variantCount} variants
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        disabled={availableQuantity! <= 0}
        style={[styles.addButton, availableQuantity! <= 0 && styles.addButtonDisabled]}
        onPress={handleSelect}
        activeOpacity={0.7}>
        <Icon name="plus-circle" size={24} color="#FDD122" />
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </View>
  );
});

const SelectedProductCard = React.memo(({
  item,
  index,
  onRemove,
  type,
}: {
  item: SelectedProduct;
  index: number;
  onRemove: (productId: string) => void;
  type: string;
}) => {
  const handleRemove = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      onRemove(item.productId);
    });
  }, [item.productId, onRemove]);

  return (
    <View style={styles.selectedProductCard}>
      <View style={styles.productNumberBadge}>
        <Text style={styles.productNumberText}>{index + 1}</Text>
      </View>

      <Image source={{uri: item?.imageUrl}} style={styles.productImage} />

      <View style={styles.productInfo}>
        <Text numberOfLines={1} style={styles.productTitle}>
          {item.title || (item as any)?.productId?.title}
        </Text>

        {type === 'buyNow' && item.productPrice && (
          <Text style={styles.priceText}>₹ {item.productPrice}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={handleRemove}
        activeOpacity={0.7}>
        <Icon name="trash-can" size={20} color="#F44336" />
      </TouchableOpacity>
    </View>
  );
});

// ============= MAIN COMPONENT =============
const BuyNowTabContent: React.FC<BuyNowTabContentProps> = ({
  fetchProducts,
  products,
  page,
  hasNextPage,
  isFetchingMore,
  selected,
  onSelect,
  onRemove,
  type,
}) => {
  // ============= MEMOIZED DATA =============
  const sections = useMemo(() => {
    const result = [
      {
        title: 'Available Products',
        data: products.length > 0 ? products : [],
        type: 'available',
      },
    ];
    
    if (selected.length > 0) {
      result.push({
        title: 'Selected Products',
        data: selected,
        type: 'selected',
      });
    }
    
    return result;
  }, [products, selected]);

  const flattenedData = useMemo(() => {
    return sections.flatMap(section =>
      section.data.map(item => ({
        ...item,
        sectionType: section.type,
        sectionTitle: section.title,
      })),
    );
  }, [sections]);

  // ============= CALLBACKS =============
  const handleLoadMore = useCallback(() => {
    if (!isFetchingMore && hasNextPage) {
      fetchProducts(page + 1);
    }
  }, [fetchProducts, page, isFetchingMore, hasNextPage]);

  const keyExtractor = useCallback(
    (item: any, index: number) => `${item._id || item.productId}-${index}`,
    [],
  );

  // ============= RENDER FUNCTIONS =============
  const renderListEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <Icon name="information-outline" size={24} color="#666" />
      <Text style={styles.emptyStateText}>No available products</Text>
    </View>
  ), []);

  const renderLoadMoreOrEnd = useCallback(() => {
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

  const renderItem = useCallback(({item, index}: {item: any; index: number}) => {
    const isFirstInSection =
      index === 0 ||
      (index > 0 && flattenedData[index - 1].sectionType !== item.sectionType);

    const isLastAvailableProduct = 
      item.sectionType === 'available' && 
      (index === products.length - 1 || 
       (index < flattenedData.length - 1 && flattenedData[index + 1].sectionType === 'selected'));

    const selectedIndex =
      item.sectionType === 'selected' ? index - products.length : index;

    return (
      <>
        {isFirstInSection && (
          <Text style={styles.sectionTitle}>{item.sectionTitle}</Text>
        )}
        {item.sectionType === 'available' ? (
          <AvailableProductCard item={item} onSelect={onSelect} />
        ) : (
          <SelectedProductCard
            item={item}
            index={selectedIndex}
            onRemove={onRemove}
            type={type}
          />
        )}
        {isLastAvailableProduct && renderLoadMoreOrEnd()}
      </>
    );
  }, [flattenedData, products.length, onSelect, onRemove, type, renderLoadMoreOrEnd]);

  // ============= FLATLIST OPTIMIZATION PROPS =============
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: 80, // Approximate item height
      offset: 80 * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.tabSection}>
      <FlatList
        data={flattenedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.productList}
        ListEmptyComponent={renderListEmpty}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
        getItemLayout={getItemLayout}
      />
    </View>
  );
};

export default React.memo(BuyNowTabContent);
