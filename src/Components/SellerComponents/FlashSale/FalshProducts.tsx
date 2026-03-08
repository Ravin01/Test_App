/* eslint-disable react/no-unstable-nested-components */
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Info } from 'lucide-react-native';
import axiosInstance from '../../../Utils/Api';
import { colors } from '../../../Utils/Colors';
import { AWS_CDN_URL } from '../../../Utils/aws';
import SearchComponent from '../../GloabalSearch/SearchComponent';

const ProductTabFlashSale = ({
  onSelectProducts,
  selectedCategory = '', // Category passed from FlashSaleForm
}) => {
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null); // Single product selection
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const fetchProducts = useCallback(async (pageNumber = 1) => {
    if (!selectedCategory) return;
    
    const isInitialLoad = pageNumber === 1;
    if (isInitialLoad) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const response = await axiosInstance.get(`/product/listing/seller`, {
        params: {
          page: pageNumber,
          limit: 15,
          search: debouncedSearchQuery,
          category: selectedCategory,
        },
      });

      const data = response.data?.data;
      const newProducts = Array.isArray(data)
        ? data
        : data?.products || data?.data || [];

      if (isInitialLoad) {
        setAllProducts(data?.products || newProducts);
      } else {
        setAllProducts(prev => [...prev, ...newProducts]);
      }

      setHasNextPage(data?.hasNextPage ?? false);
      setPage(data?.currentPage ?? pageNumber);
    } catch (error) {
      console.log('Fetch Error:', error);
      if (isInitialLoad) setAllProducts([]);
    } finally {
      if (isInitialLoad) setIsLoading(false);
      else setIsFetchingMore(false);
    }
  }, [selectedCategory, debouncedSearchQuery]);

  useEffect(() => {
    if (selectedCategory) {
      setAllProducts([]);
      setPage(1);
      fetchProducts(1);
    }
  }, [selectedCategory, debouncedSearchQuery, fetchProducts]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    onSelectProducts(product); // Pass single product to parent
  };

  const handleProductRemove = () => {
    setSelectedProduct(null);
    onSelectProducts(null); // Clear selection in parent
  };

  const renderProductItem = ({ item }) => {
    const isSelected = selectedProduct?._id === item._id;
    
    // Don't show selected product in the list
    if (isSelected) {
      return null;
    }

    const imageUrl =
      `${AWS_CDN_URL}${item.images[0]?.key}` ||
      'https://via.placeholder.com/50';
    const price = item.productPrice || 0;

    return (
      <View style={styles.productRow}>
        <Image source={{ uri: imageUrl }} style={styles.productImage} />
        <View style={styles.productDetails}>
          <Text style={styles.productTitle}>
            {item.title || 'Untitled Product'}
          </Text>
          <Text style={styles.productSub}>
            {item.category || 'No Category'} /{' '}
            {item.subcategory || 'No Subcategory'}
          </Text>
          <Text style={styles.productPrice}>₹{price.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleProductSelect(item)}
          style={styles.addButton}>
          <Icon name="check-circle" size={18} color="#FDD122" />
          <Text style={styles.addText}>Select</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSelectedProduct = () => {
    if (!selectedProduct) return null;

    const imageUrl =
      `${AWS_CDN_URL}${selectedProduct.images[0]?.key}` ||
      'https://via.placeholder.com/50';

    return (
      <View style={styles.selectedSection}>
        <Text style={styles.sectionTitle}>Selected Product</Text>
        <View style={styles.productRow}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={styles.productTitle}>
              {selectedProduct.title || 'Untitled Product'}
            </Text>
            <Text style={styles.productSub}>
              {selectedProduct.category || 'No Category'} /{' '}
              {selectedProduct.subcategory || 'No Subcategory'}
            </Text>
            <Text style={styles.productPrice}>
              ₹{(selectedProduct.productPrice || 0).toLocaleString()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleProductRemove}
            style={styles.removeButton}>
            <Icon name="x-circle" size={18} color="red" />
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!selectedCategory) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Info color={'#60A5FA'} size={48} />
          <Text style={styles.emptyStateText}>
            Please select a category first to view products
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primaryButtonColor}
          />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <>
          {/* Header Section - Fixed */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Select Product for Flash Sale</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Available</Text>
                <Text style={styles.statValue}>
                  {allProducts.length}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Selected</Text>
                <Text style={styles.statValue}>
                  {selectedProduct ? 1 : 0}
                </Text>
              </View>
            </View>
            <SearchComponent
              searchTerm={searchQuery}
              setSearchTerm={setSearchQuery}
            />
          </View>

          {/* Selected Product Section - Fixed */}
          {selectedProduct && (
            <View style={styles.selectedContainer}>
              {renderSelectedProduct()}
            </View>
          )}

          {/* Products List - Scrollable */}
          <View style={styles.listContainer}>
            <FlatList
              data={allProducts}
              keyExtractor={item => item._id}
              renderItem={renderProductItem}
              ListFooterComponent={() => (
                hasNextPage ? (
                  <TouchableOpacity
                    onPress={() => fetchProducts(page + 1)}
                    disabled={isFetchingMore}
                    style={[
                      styles.loadMoreButton,
                      isFetchingMore && styles.loadMoreButtonDisabled,
                    ]}>
                    {isFetchingMore ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) :hasNextPage (
                      <Text style={styles.loadMoreText}>Load More</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  allProducts.length > 0  (
                    <View style={styles.endOfList}>
                      <Text style={styles.endOfListText}>No more products</Text>
                    </View>
                  )
                )
              )}
              refreshing={isLoading}
              onRefresh={() => {
                setPage(1);
                fetchProducts(1);
              }}
              ListEmptyComponent={() => (
                <View style={styles.emptyList}>
                  <Text style={styles.noData}>
                    {searchQuery
                      ? 'No products match your search'
                      : 'No products available in this category'}
                  </Text>
                </View>
              )}
              contentContainerStyle={styles.flatListContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 10,
  },

  headerSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },

  selectedContainer: {
    maxHeight: 100,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },

  listContainer: {
    flex: 1,
  },

  flatListContent: {
    padding: 16,
    paddingBottom: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: colors.whiteColor,
    marginTop: 10,
    fontSize: 16,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  emptyStateText: {
    color: '#60A5FA',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.whiteColor,
  },

  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  statBox: {
    flex: 1,
    backgroundColor: '#FDD1221A',
    padding: 12,
    margin: 4,
    borderRadius: 8,
    alignItems: 'center',
  },

  statLabel: {
    fontSize: 12,
    color: '#FDD122',
    fontWeight: '600',
  },

  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FDD122',
  },

  emptyList: {
    padding: 40,
    alignItems: 'center',
  },

  noData: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical:4,
    marginHorizontal:10,
    marginBottom: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },

  productImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#eee',
  },

  productDetails: {
    flex: 1,
    marginLeft: 12,
  },

  productTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
  },

  productSub: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },

  productPrice: {
    fontSize: 14,
    color: '#4ADE80',
    fontWeight: '600',
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#FDD12220',
  },

  addText: {
    color: '#FDD122',
    marginLeft: 4,
    fontWeight: '500',
  },

  selectedSection: {
    padding: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.whiteColor,
    marginBottom: 7,
  },

  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#FF453A20',
  },

  removeText: {
    color: '#FF453A',
    marginLeft: 4,
    fontWeight: '500',
  },

  loadMoreButton: {
    backgroundColor: colors.SecondaryColor,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    // marginTop: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },

  loadMoreButtonDisabled: {
    backgroundColor: '#333',
    borderColor: '#222',
  },

  loadMoreText: {
    color: '#FDD122',
    fontWeight: '600',
  },

  endOfList: {
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
  },

  endOfListText: {
    color: '#666',
    fontSize: 12,
  },
});

export default ProductTabFlashSale;
