/* eslint-disable react/no-unstable-nested-components */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  ToastAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import axiosInstance from '../../../Utils/Api';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {colors} from '../../../Utils/Colors';
import SearchComponent from '../../GloabalSearch/SearchComponent';
import { Info } from 'lucide-react-native';
import { useEffectiveSellerId } from '../../../Context/AccessContext';

const ProductTabShopaAble = ({
  onSelectProducts,
  initialSelectedProducts = [],
  onCategoryChange,
  isEditMode = false,
}) => {
  // Get the effective seller ID (current user's ID or accessed seller's ID)
  const effectiveSellerId = useEffectiveSellerId();
  
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(initialSelectedProducts||[]);

  //console.log('Initial selected products in productr:', initialSelectedProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isChangesMade, setIsChangesMade] = useState(false);
  const [availableProductsCount, setAvailableProductsCount] = useState(0);

  useEffect(() => {
    setAllProducts([]);
    setPage(1);
    fetchProducts(1);
  }, [
    searchQuery, 
    selectedProducts.length, 
    selectedProducts.length > 0 ? selectedProducts[0]?.category : null,
    selectedProducts.length > 0 ? selectedProducts[0]?.subcategory : null
  ]);

  const fetchProducts = async (pageNumber = 1) => {
    const isInitialLoad = pageNumber === 1;
    if (isInitialLoad) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      // Determine if we should filter by category/subcategory
      const shouldFilter = selectedProducts.length > 0;
      // console.log(shouldFilter,selectedProducts[0].categ)
      
      const params: any = {
          page: pageNumber,
          limit:15,
          search: searchQuery,
          // Only include category/subcategory if there are selected products
          ...(shouldFilter && {
            category: selectedProducts[0]?.category,
            subcategory: selectedProducts[0]?.subcategory,
          })
      };
      
      // Add seller ID when in access mode
      if (effectiveSellerId) {
        params.sellerId = effectiveSellerId;
      }
      
      const response = await axiosInstance.get(
        `/product/listing/seller-with-variant-filter`, {
        params,
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
      
      // Update pagination based on new API response structure
      setAvailableProductsCount(data?.total || 0);
      setPage(data?.page || pageNumber);
      setHasNextPage((data?.page || pageNumber) < (data?.totalPages || 1));
    } catch (error) {
      console.error('Fetch Error:', error);
      if (isInitialLoad) setAllProducts([]);
    } finally {
      if (isInitialLoad) setIsLoading(false);
      else setIsFetchingMore(false);
    }
  };

  // selectedProducts now contains full product objects, not just IDs
  console.log('selectedProducts:', selectedProducts?.length);

  const handleProductSelect = async (product) => {
    try {
      if (selectedProducts.some(p => p._id === product._id)) return;
      
      // Check stock before adding
      const stock = product.hasVariants ? product.totalStock : product.quantity;
      if (stock <= 0) {
        ToastAndroid.show('This product is out of stock and cannot be added to the shoppable video.', ToastAndroid.LONG);
        return;
      }
      
      let newproducts = [];
      setSelectedProducts(prev => {
        const updated = [...prev, product];
        newproducts = updated;
        return updated;
      });
      onSelectProducts(newproducts);
      setIsChangesMade(true);

      // If this is the first product selected, filter by its category
      if (selectedProducts.length === 0) {
        onCategoryChange(product.category, product.subcategory);
        
        setAllProducts([]);
        setPage(1);
        setIsLoading(true);
        
        const params: any = {
          page: 1,
          limit: 15,
          search: searchQuery,
          category: product.category,
          subcategory: product.subcategory,
        };
        
        // Add seller ID when in access mode
        if (effectiveSellerId) {
          params.sellerId = effectiveSellerId;
        }
        
        axiosInstance.get(`/product/listing/seller-with-variant-filter`, { params })
          .then(({ data }) => {
            if (data?.data?.products) {
              const { products: newProducts, page: newPage, totalPages } = data.data;
              setAllProducts(newProducts);
              setPage(newPage);
              setHasNextPage(newPage < totalPages);
            } else {
              setAllProducts([]);
              setHasNextPage(false);
            }
          })
          .catch(error => {
            console.error("Error fetching filtered products:", error);
            setAllProducts([]);
            setHasNextPage(false);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    } catch (err) {
      console.log("Error while selecting product:", err);
    }
  };

  const handleProductRemove = (productId) => {
    let updated1 = [];
    setSelectedProducts(prev => {
      const updated = prev.filter(p => p._id !== productId);
      updated1 = updated;
      // If no products are selected after removal, reset category filter
      if (updated.length === 0) {
        onCategoryChange(null, null); // Clear category selection
        
        // Refresh products to show all categories
        setAllProducts([]);
        setPage(1);
        setIsLoading(true);
        
        // Fetch all products without category filter
        const params: any = {
          page: 1,
          limit: 15,
          search: searchQuery,
          // No category/subcategory params - fetch all
        };
        
        // Add seller ID when in access mode
        if (effectiveSellerId) {
          params.sellerId = effectiveSellerId;
        }
        
        axiosInstance.get(`/product/listing/seller-with-variant-filter`, { params })
          .then(({ data }) => {
            if (data?.data?.products) {
              const { products: newProducts, page: newPage, totalPages } = data.data;
              setAllProducts(newProducts);
              setPage(newPage);
              setHasNextPage(newPage < totalPages);
            } else {
              setAllProducts([]);
              setHasNextPage(false);
            }
          })
          .catch(error => {
            console.error("Error fetching all products:", error);
            setAllProducts([]);
            setHasNextPage(false);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
      
      return updated;
    });
    onSelectProducts(updated1);
    setIsChangesMade(true);
  };

  const renderProductItem = ({ item }) => {
    const isSelected = selectedProducts.some(p => p._id === item._id);
    
    // If product is already selected, don't show it in the available list
    if (isSelected) {
      return null;
    }
    
    // If there are selected products, only show products from the same category
    if (selectedProducts.length > 0) {
      const categoryToMatch = selectedProducts[0]?.category;
      const subcategoryToMatch = selectedProducts[0]?.subcategory;
      
      // Only show products that match the selected category/subcategory
      if (categoryToMatch && item.category !== categoryToMatch) {
        return null;
      }
      
      // Also filter by subcategory  (uncomment this if you want subcategory filtering)
      // if (subcategoryToMatch && item.subcategory !== subcategoryToMatch) {
      //   return null;
      // }
    }

    // Calculate stock: use totalStock for parent products with variants, otherwise use quantity
    const stock = item.hasVariants ? item.totalStock : item.quantity;
    const isOutOfStock = stock <= 0;

    const imageUrl =
      `${AWS_CDN_URL}${item.images[0]?.key}` ||
      'https://via.placeholder.com/50';
    const price = item.productPrice || 0;

    return (
      <View style={[styles.productRow, isOutOfStock && { opacity: 0.6 }]}>
        <Image source={{ uri: imageUrl }} style={styles.productImage} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.productTitle} numberOfLines={3}>
            {item.title || 'Untitled Product'}
          </Text>
          <Text style={styles.productSub}>
            {item.category || 'No Category'} /{' '}
            {item.subcategory || 'No Subcategory'}
          </Text>
          <Text style={styles.productPrice}>₹{price.toLocaleString()}</Text>
          {/* Stock display */}
          <View style={{ marginTop: 4 }}>
            <Text style={[
              styles.stockText,
              isOutOfStock ? styles.outOfStock : 
              stock < 10 ? styles.lowStock : styles.inStock
            ]}>
              {isOutOfStock ? 'Out of Stock' : `Stock: ${stock}`}
              {item.hasVariants && stock > 0 ? ' (Total)' : ''}
            </Text>
            {item.hasVariants && stock > 0 && (
              <Text style={styles.variantNote}>All variants</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleProductSelect(item)}
          disabled={isOutOfStock}
          style={[
            styles.addButton,
            isOutOfStock && styles.addButtonDisabled
          ]}>
          <Icon 
            name={isOutOfStock ? "x-circle" : "plus-circle"} 
            size={18} 
            color={isOutOfStock ? "#999" : "#FDD122"} 
          />
          <Text style={[
            styles.addText,
            isOutOfStock && styles.addTextDisabled
          ]}>
            {isOutOfStock ? 'Out of Stock' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSelectedProduct = product => {
    const imageUrl =
      `${AWS_CDN_URL}${product.images[0]?.key}` ||
      'https://via.placeholder.com/50';
    
    // Calculate stock for selected products
    const stock = product.hasVariants ? product.totalStock : product.quantity;

    return (
      <View key={product._id} style={styles.productRow}>
        <Image source={{ uri: imageUrl }} style={styles.productImage} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.productTitle}>
            {product.title || 'Untitled Product'}
          </Text>
          <Text style={styles.productSub}>
            {product.category || 'No Category'} /{' '}
            {product.subcategory || 'No Subcategory'}
          </Text>
          <Text style={styles.selectedProductStock}>
            Stock: {stock}{product.hasVariants ? ' (Total)' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleProductRemove(product._id)}
          style={styles.removeButton}>
          <Icon name="trash-2" size={18} color="red" />
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View className="items-center mb-10">
          <ActivityIndicator
            size="small"
            color={colors.primaryButtonColor}
            style={{ marginTop: 40 }}
          />
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollViewContainer}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >
          <FlatList
            data={allProducts}
            keyExtractor={item => item._id}
            renderItem={renderProductItem}
            scrollEnabled={false}
            nestedScrollEnabled={true}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            onEndReached={() => {
              if (hasNextPage && !isFetchingMore) {
                fetchProducts(page + 1);
              }
            }}
            onEndReachedThreshold={0.5}
          ListHeaderComponent={() => (
            <View>
              <Text style={styles.title}>Add Products to Your Show</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Available</Text>
                  <Text style={styles.statValue}>
                    {availableProductsCount-selectedProducts.length}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Selected</Text>
                  <Text style={styles.statValue}>
                    {selectedProducts.length}
                  </Text>
                </View>
              </View>
              <SearchComponent
                searchTerm={searchQuery}
                setSearchTerm={setSearchQuery}
              />
              {selectedProducts.length === 0 && (
                 <View className="my-4 bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4">
                          <View className="flex-row items-center gap-3">
                            <Info color={'#60A5FA'}/>
                            <Text className="text-blue-300 font-medium shrink-1 max-w-full flex-1">
                              Select your first product to automatically set the category and filter related products.
                            </Text>
                          </View>
                        </View>
              )}
            </View>
          )}
          ListFooterComponent={() => (
            <>
              <View>
                {selectedProducts.length > 0 && (
                  <View style={styles.selectedSection}>
                    <Text style={styles.sectionTitle}>Selected Products</Text>
                    {selectedProducts.map(renderSelectedProduct)}
                  </View>
                )}
              </View>
              {hasNextPage ? (
                <TouchableOpacity
                  onPress={() => fetchProducts(page + 1)}
                  disabled={isFetchingMore}
                  style={[
                    styles.loadMoreButton,
                    isFetchingMore && styles.loadMoreButtonDisabled,
                  ]}>
                  {isFetchingMore ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.loadMoreText}>Load More</Text>
                  )}
                </TouchableOpacity>
              ) : (
                allProducts.length !== 0 && (
                  <View style={styles.endOfList}>
                    <Text style={styles.endOfListText}>No more products</Text>
                  </View>
                )
              )}
              {!isEditMode && (
                <TouchableOpacity
                  disabled={selectedProducts.length === 0}
                  onPress={() => {
                    setIsChangesMade(false);
                    onSelectProducts(selectedProducts);
                  }}
                  style={[
                    styles.submitButton,
                    !isChangesMade && { opacity: 0.5 },
                    selectedProducts.length === 0 && { backgroundColor: '#ccc' },
                  ]}>
                  <Text style={styles.submitText}>
                    Confirm Selection ({selectedProducts.length})
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
          refreshing={isLoading}
          onRefresh={() => {
            setPage(1);
            fetchProducts(1);
          }}
          ListEmptyComponent={() => (
            <Text style={styles.noData}>
              {searchQuery
                ? 'No products match your search'
                : 'No products available'}
            </Text>
          )}
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
          />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 10,
    marginBottom: 15,
  },
  
  scrollViewContainer: {
    height: 600,
  },
  
  flatListContainer: {
    flexGrow: 0,
  },
  
  loadMoreButton: {
    backgroundColor: colors.SecondaryColor,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 6,
    elevation: 3,
    // minWidth: 140,
  },

  loadMoreButtonDisabled: {
    backgroundColor: '#333',
  },

  loadMoreText: {
    color: '#ccc',
    fontWeight: '600',
  },

  endOfList: {
    alignItems: 'center',
    marginVertical: 16,
  },

  endOfListText: {
    color: '#999',
    fontSize: 12,
  },
  title: {
    fontSize: 20,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FDD122',
  },
  searchBox: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    padding: 10,
    paddingLeft: 36,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    color: '#000',
  },
  noData: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
    fontSize: 16,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 8,
  },
  productImage: {
    width: 60,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  productTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#fff',
  },
  productSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    color: 'green',
    fontWeight: '600',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 4,
  },
  addText: {
    color: '#FDD122',
    marginLeft: 4,
    fontWeight: '500',
  },
  selectedSection: {
    marginTop: 24,
    backgroundColor: colors.SecondaryColor,
    padding: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.whiteColor,
    marginBottom: 12,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  removeText: {
    color: 'red',
    marginLeft: 4,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 24,
    padding: 14,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Stock-related styles
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  outOfStock: {
    color: '#EF4444', // red-400
  },
  lowStock: {
    color: '#FBBF24', // yellow-400
  },
  inStock: {
    color: '#34D399', // green-400
  },
  variantNote: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addTextDisabled: {
    color: '#999',
  },
  selectedProductStock: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: '600',
    marginTop: 4,
  },
});

export default ProductTabShopaAble;
