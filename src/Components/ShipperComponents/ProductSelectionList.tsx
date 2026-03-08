import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { PlusCircle, Info, ChevronDown, ChevronUp } from 'lucide-react-native'; // Or use react-native-vector-icons
import { AWS_CDN_URL } from '../../Utils/aws';

const ProductSelectionList = ({
  availableGroupedProducts = [],
  onSelect,
  openSellerId,
  setOpenSellerId,
  isLoading,
  searchQuery,
  type,
}) => {

  const toggleSellerAccordion = (sellerId) => {
    setOpenSellerId(prevId => prevId === sellerId ? null : sellerId);
  };

  const totalAvailableCount = availableGroupedProducts.reduce((sum, group) => sum + group.products.length, 0);

  const renderProduct = ({ item }) => (
    <View style={styles.productRow}>
      
      <Image
        style={styles.productImage}
        source={{uri: `${AWS_CDN_URL}${item?.images[0]?.key}` }}
        // image source code here
      />
      <View style={styles.productInfo}>
        <Text numberOfLines={1} style={styles.productTitle}>{item.title}</Text>
        <Text style={styles.productSub}>{item.category} / {item.subcategory}</Text>
      </View>
      <View style={[styles.quantityBadge,{ backgroundColor:
     item.quantity > 10 ? '#d1fae5' :
      item.quantity > 0 ? '#fef3c7' : '#fee2e2',}]}>
        <Text style={styles.quantityText}>{item.quantity} units</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => onSelect(type, item)}
      >
        <PlusCircle size={14} color="#2563eb" />
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSellerGroup = ({ item }) => {
    const isOpen = openSellerId === item.sellerInfo._id;
    const sellerName = item.sellerInfo.companyName || item.sellerInfo.userInfo?.name || 'Unknown Seller';

    return (
      <View style={styles.groupContainer}>
        <TouchableOpacity
          onPress={() => toggleSellerAccordion(item.sellerInfo._id)}
          style={styles.accordionHeader}
        >
          <Text numberOfLines={1} style={styles.sellerName}>{sellerName}</Text>
          <Text style={styles.itemCount}>{item.products.length} items</Text>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </TouchableOpacity>

        {isOpen && (
          <FlatList
            data={item.products}
            keyExtractor={product => product._id}
            renderItem={renderProduct}
            nestedScrollEnabled={true}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={10}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Available Products</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{totalAvailableCount}</Text>
        </View>
      </View>

      <FlatList
        data={availableGroupedProducts}
        keyExtractor={group => group.sellerInfo._id}
        renderItem={renderSellerGroup}
        style={styles.listContainer}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 60,
          offset: 60 * index,
          index,
        })}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#2563eb" />
          ) : (
            <View style={styles.emptyState}>
              <Info size={32} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? 'Try adjusting your search criteria.' : 'No more products available or all are selected.'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    flex: 1,
  },
  listContainer: {
    height: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop:8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  countBadge: {
    backgroundColor: '#dbeafe',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  countText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  listContainer: {
    maxHeight: 400,
  },
  scrollContainer: {
    maxHeight: 500,
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 8,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'center',
  },
  groupContainer: {
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#e5e7eb',
  },
  sellerName: {
    flex: 1,
    fontWeight: '600',
    color: '#111827',
  },
  itemCount: {
    fontSize: 12,
    color: '#6b7280',
    marginHorizontal: 8,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontWeight: '500',
    color: '#1f2937',
  },
  productSub: {
    fontSize: 12,
    color: '#6b7280',
  },
  quantityBadge: {
   
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 12,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#2563eb',
    fontSize: 12,
    marginLeft: 4,
  },
});

export default ProductSelectionList;
