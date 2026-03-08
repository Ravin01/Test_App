// components/FlashSaleProductSelector.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
  StyleSheet
} from 'react-native';
import { 
  Search, 
  Package, 
  Check, 
  X, 
  AlertCircle, 
  Filter,
  ChevronDown 
} from 'lucide-react-native';
import axiosInstance from '../../../../Utils/Api';
import useDebounce from '../../../../Utils/useDebounce';

const FlashSaleProductSelector = ({ 
  onProductSelect, 
  selectedProduct,
  showId,
  sellerId 
}) => {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 500);

  const fetchProducts = useCallback(async () => {
    if (!showId || !sellerId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`flash-live/${showId}/available-products`, {
        params: {
          search: debouncedSearch,
          category: categoryFilter || undefined
        }
      });
      
      if (response.data.success) {
        setProducts(response.data.data || []);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(response.data.data
          .map(p => p.category)
          .filter(Boolean)
        )];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error("❌ Error fetching available products:", error);
      setError(error.response?.data?.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [showId, sellerId, debouncedSearch, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
  };

  const renderProductItem = ({ item: product }) => {
    const isSelected = selectedProduct?._id === product._id;
    const availableStock = product.stockId?.availableQuantity || 0;
    const imageUrl = product.images?.[0]?.key 
      ? `${process.env.VITE_AWS_CDN_URL}${product.images[0].key}`
      : null;

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          isSelected && styles.selectedProductCard,
          availableStock === 0 && styles.disabledProductCard
        ]}
        onPress={() => availableStock > 0 && onProductSelect(product)}
        disabled={availableStock === 0}
      >
        <View style={styles.productContent}>
          <Image
            source={imageUrl ? { uri: imageUrl } : require('../../../../assets/placeholder.png')}
            style={styles.productImage}
            resizeMode="cover"
          />
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {product.title}
            </Text>
            <View style={styles.productDetails}>
              <View style={styles.priceSection}>
                <Text style={styles.productPrice}>
                  ₹{product.productPrice}
                </Text>
                <View style={styles.stockInfo}>
                  <Text style={[
                    styles.stockText,
                    availableStock > 0 ? styles.inStock : styles.outOfStock
                  ]}>
                    Stock: {availableStock}
                  </Text>
                  {product.category && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>
                        {product.category}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.selectionIndicator}>
                {isSelected ? (
                  <Check size={24} color="#ef4444" />
                ) : availableStock === 0 ? (
                  <View style={styles.outOfStockBadge}>
                    <Text style={styles.outOfStockText}>
                      Out of Stock
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Package size={48} color="#6b7280" />
      <Text style={styles.emptyStateText}>
        {searchQuery || categoryFilter 
          ? 'No products found matching your filters' 
          : 'No products available for flash sale'
        }
      </Text>
      <Text style={styles.emptyStateSubtext}>
        Make sure your products have available stock and are not in active flash sales
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search and Filter Header */}
      <View style={styles.header}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products for flash sale..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
            >
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Filter */}
        <View style={styles.filterRow}>
          <Filter size={16} color="#9ca3af" />
          <TouchableOpacity 
            style={styles.categorySelector}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.categorySelectorText}>
              {categoryFilter || 'All Categories'}
            </Text>
            <ChevronDown size={16} color="#9ca3af" />
          </TouchableOpacity>
          {(searchQuery || categoryFilter) && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color="#fca5a5" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Products List */}
      <View style={styles.productsContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ef4444" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            renderItem={renderProductItem}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={products.length === 0 && styles.emptyListContainer}
          />
        )}
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Showing {products.length} products • 
          {searchQuery && ` Search: "${searchQuery}"`}
          {categoryFilter && ` Category: ${categoryFilter}`}
          {!searchQuery && !categoryFilter && ' All available products'}
        </Text>
      </View>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoriesList}>
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  !categoryFilter && styles.selectedCategoryItem
                ]}
                onPress={() => {
                  setCategoryFilter('');
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[
                  styles.categoryItemText,
                  !categoryFilter && styles.selectedCategoryItemText
                ]}>
                  All Categories
                </Text>
                {!categoryFilter && <Check size={20} color="#ef4444" />}
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryItem,
                    categoryFilter === category && styles.selectedCategoryItem
                  ]}
                  onPress={() => {
                    setCategoryFilter(category);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={[
                    styles.categoryItemText,
                    categoryFilter === category && styles.selectedCategoryItemText
                  ]}>
                    {category}
                  </Text>
                  {categoryFilter === category && <Check size={20} color="#ef4444" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    color: '#f3f4f6',
    fontSize: 16,
  },
  clearSearchButton: {
    padding: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categorySelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    padding: 12,
  },
  categorySelectorText: {
    color: '#f3f4f6',
    fontSize: 14,
  },
  clearFiltersText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#b91c1c',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    flex: 1,
  },
  productsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  productCard: {
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#4b5563',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  selectedProductCard: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  disabledProductCard: {
    opacity: 0.5,
  },
  productContent: {
    flexDirection: 'row',
    gap: 16,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priceSection: {
    flex: 1,
  },
  productPrice: {
    color: '#f87171',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockText: {
    fontSize: 12,
  },
  inStock: {
    color: '#4ade80',
  },
  outOfStock: {
    color: '#f87171',
  },
  categoryBadge: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  selectionIndicator: {
    marginLeft: 8,
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  outOfStockText: {
    color: '#f87171',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
    marginTop: 12,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    color: '#f3f4f6',
    fontSize: 18,
    fontWeight: '600',
  },
  categoriesList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  selectedCategoryItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  categoryItemText: {
    color: '#f3f4f6',
    fontSize: 16,
  },
  selectedCategoryItemText: {
    color: '#ef4444',
    fontWeight: '600',
  },
});

export default FlashSaleProductSelector;