// components/StartFlashSaleModal.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import {
  ArrowLeft,
  X,
  Zap,
  Search,
  Filter,
  Package,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  IndianRupee
} from 'lucide-react-native';
import axiosInstance from '../../../../Utils/Api';
import useDebounce from '../../../../Utils/useDebounce';
import { colors } from '../../../../Utils/Colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const StartFlashSaleModal = ({
  visible = true,
  showId,
  sellerId,
  loading: parentLoading,
  onClose,
  onStart,
  calculateDiscount = (mrp, flashPrice) => Math.round(((mrp - flashPrice) / mrp) * 100),
  durationOptions = [10, 20, 30, 40, 50, 60, 240],
  cdnURL = '',
  preSelectedProduct,
}) => {
  // Validation - don't render modal content if required props are missing
  const shouldRender = visible && showId && sellerId;
  // Internal state for the modal form and product list
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    flashPrice: '',
    duration: 30,
  });
  const [formErrors, setFormErrors] = useState<{
    flashPrice?: string;
  }>({});
  
  const [showProductList, setShowProductList] = useState(!preSelectedProduct);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const scrollContainerRef = useRef(null);

  // Memoize handler to prevent useEffect issues
  const handleProductSelect = useCallback((product) => {
    setSelectedProduct(product);
    setFormData({
      flashPrice: '',
      duration: 30,
    });
    setFormErrors({});
    setError(null);
    setShowProductList(false);
  }, []);

  // Data fetching for the modal's product list
  const fetchProducts = useCallback(async (pageNum, isReset = false) => {
    if (!showId || !sellerId) return;
    setLoadingProducts(true);
    setError(null);
    try {
      const response = await axiosInstance.get(
        `/flash-live/${showId}/available-products`,
        {
          params: {
            search: debouncedSearch,
            category: categoryFilter,
            page: pageNum,
            limit: 20,
            includeShowProducts: true,
          },
        }
      );

      if (response.data.success) {
        const {
          products: newProducts,
          categories: allCategories,
          pagination,
        } = response.data.data;

        setProducts((prev) => (isReset ? newProducts : [...prev, ...newProducts]));

        if (pageNum === 1) {
          setCategories(allCategories || []);
        }

        setPage(pagination.currentPage);
        setHasMore(pagination.hasMore);
      }
    } catch (err) {
      console.error('❌ Error fetching modal products:', err);
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  }, [showId, sellerId, debouncedSearch, categoryFilter]);

  // Effect to handle pre-selected product (supports both regular products AND bundles)
  useEffect(() => {
    if (preSelectedProduct) {
      console.log('🎯 Pre-selected product for flash sale:', preSelectedProduct);

      // Check if it's a bundle
      const isBundle = preSelectedProduct.bundleSaleId || preSelectedProduct.bundleTitle;
      
      const productForModal = isBundle ? {
        // Bundle data mapping
        _id: preSelectedProduct.bundleSaleId || preSelectedProduct._id,
        title: preSelectedProduct.bundleTitle,
        productPrice: preSelectedProduct.sellingPrice,
        MRP: preSelectedProduct.bundleMRP || preSelectedProduct.sellingPrice,
        images: preSelectedProduct.bundleImage ? [{ key: preSelectedProduct.bundleImage.key }] : [],
        isBundle: true,
        bundleSaleId: preSelectedProduct.bundleSaleId || preSelectedProduct._id,
      } : {
        // Regular product data mapping
        _id: preSelectedProduct.productId?._id || preSelectedProduct._id,
        title: preSelectedProduct.productId?.title || preSelectedProduct.title,
        productPrice:
          preSelectedProduct.productPrice ||
          preSelectedProduct.productId?.productPrice,
        MRP: preSelectedProduct.productId?.MRP || preSelectedProduct.MRP,
        images: preSelectedProduct.productId?.images || preSelectedProduct.images,
        sku: preSelectedProduct.productId?.sku,
        isBundle: false,
      };

      handleProductSelect(productForModal);
      setShowProductList(false);
    }
  }, [preSelectedProduct, handleProductSelect]);

  // Infinite scroll is handled by FlatList onEndReached

  // Effect for initial load and filter changes
  useEffect(() => {
    if (!preSelectedProduct) {
      setProducts([]);
      setPage(1);
      setHasMore(true);
      fetchProducts(1, true);
    }
  }, [debouncedSearch, categoryFilter, showId, sellerId, fetchProducts, preSelectedProduct]);

  const resetFormAndClose = () => {
    setSelectedProduct(null);
    setFormData({ flashPrice: '', duration: 30 });
    setError(null);
    setShowProductList(!preSelectedProduct);
    onClose();
  };

  const handleBackToProducts = () => {
    if (preSelectedProduct) return; 
    setShowProductList(true);
  };

  // Validate form fields  
  const validateForm = useCallback(() => {
    const errors: { flashPrice?: string } = {};
    const flashPriceNum = parseFloat(formData.flashPrice);
    
    // Flash price validation
    if (!formData.flashPrice) {
      errors.flashPrice = 'Flash price is required';
    } else if (isNaN(flashPriceNum) || flashPriceNum <= 0) {
      errors.flashPrice = 'Please enter a valid price';
    } else if (flashPriceNum >= selectedProduct?.productPrice) {
      errors.flashPrice = 'Flash price must be less than selling price';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, selectedProduct]);

  // Form submission with validation
  const handleStartClick = () => {
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }
    
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    // Convert duration to number
    const processedData = {
      ...formData,
      duration: parseInt(formData.duration.toString(), 10),
      flashPrice: parseFloat(formData.flashPrice)
    };

    onStart(selectedProduct, processedData, () => {
      resetFormAndClose();
    });
  };

  const renderProductItem = ({ item: product }) => {
    const isSelected = selectedProduct?._id === product._id;
    const imageUrl = product.images?.[0]?.key
      ? `${cdnURL}${product.images[0].key}`
      : null;

    return (
      <TouchableOpacity
        style={[
          styles.productItem,
          isSelected && styles.selectedProductItem,
        ]}
        onPress={() => handleProductSelect(product)}
      >
        <View style={styles.productItemContent}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Package size={20} color="#6b7280" />
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {product.title}
            </Text>
            <View style={styles.productDetails}>
              <View>
                <Text style={styles.productPrice}>
                  ₹{product.productPrice}
                </Text>
                <Text style={styles.stockText}>
                  Stock: {product.availableQuantity}
                </Text>
              </View>
              {isSelected && (
                <CheckCircle size={24} color="#ef4444" />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loadingProducts) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color="#ef4444" />
          <Text style={styles.emptyStateText}>Loading products...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Package size={48} color="#6b7280" />
        <Text style={styles.emptyStateText}>
          {searchQuery || categoryFilter
            ? 'No products found'
            : 'No products available for flash sale'
          }
        </Text>
        <Text style={styles.emptyStateSubtext}>
          {searchQuery || categoryFilter
            ? 'Try adjusting your filters'
            : 'Make sure products have stock'
          }
        </Text>
      </View>
    );
  };

  const renderConfigurationForm = () => (
    <ScrollView style={styles.configurationForm}>
      {selectedProduct ? (
        <>
          {/* Product Preview */}
          <View style={styles.productPreview}>
            {selectedProduct.images?.[0]?.key ? (
              <Image
                source={{ uri: `${cdnURL}${selectedProduct.images[0].key}` }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.previewImage, styles.placeholderImage]}>
                <Package size={24} color="#6b7280" />
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle} numberOfLines={2}>
                {selectedProduct.title}
              </Text>
              <Text style={styles.previewText}>
                MRP: ₹{selectedProduct.MRP || selectedProduct.productPrice}
              </Text>
              <Text style={styles.previewText}>
                Selling: ₹{selectedProduct.productPrice}
              </Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Flash Price (₹)</Text>
              <TextInput
                style={[styles.input, formErrors.flashPrice && styles.inputError]}
                value={formData.flashPrice}
                onChangeText={(text) => {
                  setFormData({
                    ...formData,
                    flashPrice: text,
                  });
                  // Clear error on change
                  if (formErrors.flashPrice) {
                    setFormErrors({ ...formErrors, flashPrice: undefined });
                  }
                }}
                placeholder="Enter flash price"
                placeholderTextColor="#6b7280"
                keyboardType="numeric"
                maxLength={10}
              />
              {/* Show validation error */}
              {formErrors.flashPrice && (
                <Text style={styles.errorFieldText}>{formErrors.flashPrice}</Text>
              )}
              {/* Discount preview with savings */}
              {(() => {
                const flashPriceNum = parseFloat(formData.flashPrice);
                const mrp = selectedProduct.MRP || selectedProduct.productPrice;
                return !isNaN(flashPriceNum) && flashPriceNum > 0 &&
                  flashPriceNum < mrp && !formErrors.flashPrice && (
                    <View style={styles.discountPreview}>
                      <Text style={styles.discountText}>
                        Discount: {calculateDiscount(mrp, flashPriceNum)}% OFF
                      </Text>
                      <Text style={styles.savingsText}>
                        You save ₹{mrp - flashPriceNum}
                      </Text>
                    </View>
                  );
              })()}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration (seconds)</Text>
               <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.durationOptions}
              >
                {durationOptions.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationOption,
                      formData.duration === duration && styles.selectedDurationOption,
                    ]}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        duration: duration,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.durationOptionText,
                        formData.duration === duration && styles.selectedDurationOptionText,
                      ]}
                    >
                      {duration}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.selectContainer}>
                <Text style={styles.selectText}>
                  {formData.duration} seconds
                </Text>
                {/* <ChevronDown size={16} color="#9ca3af" /> */}
              </View>
             
            </View>
          </View>
        </>
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>
            Select a product to configure
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderProductList = () => (
    <View style={styles.productListContainer}>
      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={16} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowCategoryModal(true)}
        >
          <Filter size={16} color="#9ca3af" />
          <Text style={styles.filterButtonText}>
            {(categoryFilter ? categoryFilter.slice(0, 4) : 'All')}
          </Text>
          <ChevronDown size={16} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <FlatList
        ref={scrollContainerRef}
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={products.length === 0 && styles.emptyListContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasMore && !loadingProducts) {
            fetchProducts(page + 1, false);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingProducts && products.length > 0 ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#ef4444" />
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : !hasMore && products.length > 0 ? (
            <Text style={styles.endOfList}>You've reached the end of the list.</Text>
          ) : null
        }
      />
    </View>
  );

  // Always return the same component structure to avoid React internal errors
  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      visible={true}
      animationType={'slide'}
      presentationStyle={'pageSheet'}
      onRequestClose={resetFormAndClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {!showProductList && !preSelectedProduct && (
              <TouchableOpacity
                onPress={handleBackToProducts}
                style={styles.backButton}
              >
                <ArrowLeft size={20} color="#fecaca" />
              </TouchableOpacity>
            )}
            <View style={styles.titleContainer}>
              <Zap size={20} color="#fecaca" />
              <Text style={styles.title}>
                {preSelectedProduct
                  ? 'Configure Flash Sale'
                  : showProductList
                  ? 'Select Product'
                  : 'Configure Flash Sale'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={resetFormAndClose}
            style={styles.closeButton}
          >
            <X size={20} color="#fecaca" />
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#fca5a5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {showProductList ? renderProductList() : renderConfigurationForm()}
        </View>

        {/* Loading Overlay - Shows when starting flash sale */}
        {parentLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingModal}>
              <ActivityIndicator size="large" color="#ef4444" />
              <Text style={styles.loadingModalText}>Starting Flash Sale...</Text>
              <Text style={styles.loadingModalSubtext}>Please wait while we configure your sale</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              onPress={resetFormAndClose}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleStartClick}
              disabled={
                !selectedProduct ||
                !formData.flashPrice ||
                parentLoading ||
                !!formErrors.flashPrice
              }
              style={[
                styles.startButton,
                (!selectedProduct || 
                 !formData.flashPrice || 
                 parentLoading ||
                 !!formErrors.flashPrice) && 
                styles.startButtonDisabled
              ]}
            >
              {parentLoading ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.startButtonText}>Loading...</Text>
                </>
              ) : (
                <Text style={styles.startButtonText}>Start Flash Sale</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Selection Modal */}
        <Modal
          visible={showCategoryModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.categoryModalOverlay}>
            <View style={styles.categoryModalContent}>
              <View style={styles.categoryModalHeader}>
                <Text style={styles.categoryModalTitle}>Select Category</Text>
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
                  {!categoryFilter && <CheckCircle size={20} color="#ef4444" />}
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
                    {categoryFilter === category && <CheckCircle size={20} color="#ef4444" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fecaca',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#b91c1c',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  productListContainer: {
    flex: 1,
    padding: 16,
  },
  searchSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#f3f4f6',
    fontSize: 14,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 100,
  },
  filterButtonText: {
    color: '#f3f4f6',
    fontSize: 14,
  },
  productItem: {
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: '#4b5563',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  selectedProductItem: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  productItemContent: {
    flexDirection: 'row',
    gap: 12,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
  },
  productPrice: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stockText: {
    color: '#4ade80',
    fontSize: 12,
  },
  emptyListContainer: {
    flexGrow: 1,
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
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  loadingMoreText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  endOfList: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
    padding: 16,
  },
  configurationForm: {
    flex: 1,
    padding: 16,
  },
  productPreview: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  previewImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewText: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 2,
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.SecondaryColor,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    color: '#f3f4f6',
    fontSize: 16,
  },
  discountText: {
    color: '#4ade80',
    fontSize: 14,
    marginTop: 4,
  },
  helperText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
 backgroundColor: colors.SecondaryColor,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
  },
  selectText: {
    color: '#f3f4f6',
    fontSize: 16,
  },
  durationOptions: {
    marginTop: 8,
  },
  durationOption: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedDurationOption: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  durationOptionText: {
    color: '#f3f4f6',
    fontSize: 14,
  },
  selectedDurationOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 16,
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  errorFieldText: {
    color: '#f87171',
    fontSize: 12,
    marginTop: 4,
  },
  discountPreview: {
    marginTop: 4,
    gap: 2,
  },
  savingsText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    backgroundColor:colors.SecondaryColor,
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 16,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '500',
  },
  startButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  categoryModalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  categoryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  categoryModalTitle: {
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingModal: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingModalText: {
    color: '#f3f4f6',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingModalSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default StartFlashSaleModal;
