import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { launchImageLibrary } from "react-native-image-picker";
import { uploadImageToS3 } from "../../../Utils/aws";
import axiosInstance from "../../../Utils/Api";
import { Toast } from "../../../Utils/dateUtils";
import { colors } from "../../../Utils/Colors";
import { AWS_CDN_URL } from "../../../../Config";
import { SafeAreaView } from "react-native-safe-area-context";
import SellerHeader from "../SellerForm/Header";
import useConfirmModal from "../../../hooks/useAlertModal";
import GlobalConfirmModal from "../../Reuse/AlertModal";

const { width } = Dimensions.get("window");
const PRODUCTS_PER_PAGE = 10;

interface Product {
  _id: string;
  title: string;
  productPrice: number;
  MRP: number;
  images?: Array<{ key: string }>;
  isActive?: boolean;
}

interface BundleData {
  title: string;
  description: string;
  bundleImage: { key: string; url: string } | null;
  bundleMRP: string;
  sellingPrice: string;
  deliveryCharge: string;
  estimatedDeliveryDate: string;
}

const EditBundleSale = ({ navigation, route }: any) => {
  const { bundleId } = route.params;
  const cdnURL = AWS_CDN_URL || "";
  const { modalConfig, showModal, hideModal, handleConfirm } = useConfirmModal();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialData, setInitialData] = useState<string>("");

  // Form data
  const [bundleData, setBundleData] = useState<BundleData>({
    title: "",
    description: "",
    bundleImage: null,
    bundleMRP: "",
    sellingPrice: "",
    deliveryCharge: "",
    estimatedDeliveryDate: "",
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<any>(null);
  const [errors, setErrors] = useState<any>({});
  const [showProductsExpanded, setShowProductsExpanded] = useState(true);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [editingProducts, setEditingProducts] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [calculatingMetrics, setCalculatingMetrics] = useState(false);
  const [recalculatedData, setRecalculatedData] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const rotateAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchBundleDetails();
    fetchAvailableProducts();
  }, [bundleId]);

  // Track unsaved changes
  useEffect(() => {
    if (initialData) {
      const currentData = JSON.stringify({
        bundleData,
        selectedProductIds,
        imagePreview,
        newImageFile
      });
      setHasUnsavedChanges(currentData !== initialData);
    }
  }, [bundleData, selectedProductIds, imagePreview, newImageFile, initialData]);

  // Handle back navigation with unsaved changes warning
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!hasUnsavedChanges || submitting) {
        return;
      }

      e.preventDefault();

      showModal({
        title: 'Discard Changes?',
        content: 'You have unsaved changes. Are you sure you want to discard them and leave?',
        mode: 'warning',
        confirmText: 'Discard',
        cancelText: 'Keep Editing',
        onConfirm: () => {
          hideModal();
          navigation.dispatch(e.data.action);
        },
      });
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges, submitting]);

  useEffect(() => {
    Animated.timing(rotateAnimation, {
      toValue: showProductsExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showProductsExpanded]);

  const fetchBundleDetails = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`seller/bundle-sale/${bundleId}`);

      if (response.data?.status) {
        const data = response.data.data;

        setBundleData({
          title: data.title || "",
          description: data.description || "",
          bundleImage: data.bundleImage || null,
          bundleMRP: data.bundleMRP?.toString() || "",
          sellingPrice: data.sellingPrice?.toString() || "",
          deliveryCharge: data.deliveryCharge?.toString() || "",
          estimatedDeliveryDate: data.estimatedDeliveryDate?.toString() || "",
        });

        setProducts(data.products || []);
        const productIds = (data.products || []).map((p: Product) => p._id);
        setSelectedProductIds(productIds);

        if (data.bundleImage?.key) {
          setImagePreview(`${cdnURL}${data.bundleImage.key}`);
        }

        // Store initial data for tracking changes
        const initial = JSON.stringify({
          bundleData: {
            title: data.title || "",
            description: data.description || "",
            bundleImage: data.bundleImage || null,
            bundleMRP: data.bundleMRP?.toString() || "",
            sellingPrice: data.sellingPrice?.toString() || "",
            deliveryCharge: data.deliveryCharge?.toString() || "",
            estimatedDeliveryDate: data.estimatedDeliveryDate?.toString() || "",
          },
          selectedProductIds: productIds,
          imagePreview: data.bundleImage?.key ? `${cdnURL}${data.bundleImage.key}` : null,
          newImageFile: null
        });
        setInitialData(initial);
      } else {
        Toast("Failed to fetch bundle details");
        navigation.goBack();
      }
    } catch (error: any) {
      console.error("Error fetching bundle:", error);
      Toast(error.response?.data?.message || "Failed to load bundle");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProducts = async (page = 1) => {
    if (page === 1) {
      setLoadingProducts(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await axiosInstance.get("seller/bundle-sale/available-products", {
        params: {
          page,
          limit: PRODUCTS_PER_PAGE,
        },
      });

      if (response.data?.status) {
        const newProducts = response.data.data.products || [];
        if (page === 1) {
          setAvailableProducts(newProducts);
        } else {
          setAvailableProducts(prev => [...prev, ...newProducts]);
        }
      }
    } catch (error) {
      console.log("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && !loadingProducts) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchAvailableProducts(nextPage);
    }
  };

  const handleToggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
    setRecalculatedData(null);
  };

  useEffect(() => {
    if (editingProducts && selectedProductIds.length >= 2) {
      const timer = setTimeout(() => {
        handleRecalculateMetrics();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [selectedProductIds, editingProducts]);

  const handleRecalculateMetrics = async () => {
    if (selectedProductIds.length < 2) {
      Toast("Bundle must contain at least 2 products");
      return;
    }

    setCalculatingMetrics(true);
    try {
      const response = await axiosInstance.post("seller/bundle-sale/calculate", {
        productIds: selectedProductIds,
      });

      if (response.data?.status) {
        setRecalculatedData(response.data.data);

        setBundleData((prev) => ({
          ...prev,
          bundleMRP: response.data.data.calculations.totalMRP.toString(),
          sellingPrice: response.data.data.calculations.bundlePrice.toString(),
          deliveryCharge: response.data.data.calculations.roundedDeliveryCharge.toString(),
          estimatedDeliveryDate: response.data.data.calculations.averageDeliveryDays.toString(),
        }));

        Toast("Metrics recalculated successfully!");
      }
    } catch (error: any) {
      console.error("Error calculating metrics:", error);
      Toast(error.response?.data?.message || "Failed to calculate metrics");
    } finally {
      setCalculatingMetrics(false);
    }
  };

  const handleCancelEditProducts = () => {
    const originalProductIds = products.map((p) => p._id);
    setSelectedProductIds(originalProductIds);
    setEditingProducts(false);
    setRecalculatedData(null);
  };

  const handleImageChange = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    });

    if (result.didCancel) return;

    if (result.errorCode) {
      Toast("Error selecting image");
      return;
    }

    const asset = result.assets?.[0];
    if (!asset) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (asset.type && !validTypes.includes(asset.type)) {
      Toast("Only JPG, JPEG, PNG formats allowed");
      return;
    }

    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Toast("Image size must be less than 5MB");
      return;
    }

    setNewImageFile(asset);
    setImagePreview(asset.uri || null);
    setErrors((prev: any) => ({ ...prev, bundleImage: undefined }));
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!bundleData.title || bundleData.title.trim().length < 10) {
      newErrors.title = "Title must be at least 10 characters";
    } else {
      // Check if title only contains alphanumeric characters and spaces
      const isValidFormat = /^[a-zA-Z0-9\s]+$/.test(bundleData.title);
      if (!isValidFormat) {
        newErrors.title = "Title can only contain letters, numbers, and spaces";
      } else {
        // Check if title contains at least some alphabetic characters
        const hasLetters = /[a-zA-Z]/.test(bundleData.title);
        if (!hasLetters) {
          newErrors.title = "Title must contain letters, not only numbers";
        }
      }
    }

    if (!bundleData.sellingPrice || parseFloat(bundleData.sellingPrice) <= 0) {
      newErrors.sellingPrice = "Selling price must be greater than 0";
    } else if (parseFloat(bundleData.sellingPrice) >= parseFloat(bundleData.bundleMRP)) {
      newErrors.sellingPrice = "Selling price must be less than MRP (₹" + bundleData.bundleMRP + ")";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (uploadingImage) {
      Toast("Please wait for image upload to complete");
      return;
    }

    setSubmitting(true);

    try {
      let updatedBundleImage = bundleData.bundleImage;

      if (newImageFile) {
        setUploadingImage(true);
        const key = await uploadImageToS3(newImageFile, "bundles");
        updatedBundleImage = { key, url: `${cdnURL}${key}` };
        setUploadingImage(false);
      }

      const payload: any = {
        title: bundleData.title.trim(),
        description: bundleData.description.trim(),
        bundleImage: updatedBundleImage,
        bundleMRP: parseFloat(bundleData.bundleMRP),
        sellingPrice: parseFloat(bundleData.sellingPrice),
        deliveryCharge: parseFloat(bundleData.deliveryCharge) || 0,
        estimatedDeliveryDate: parseInt(bundleData.estimatedDeliveryDate) || 0,
      };

      if (editingProducts && recalculatedData) {
        payload.products = selectedProductIds;
        payload.calculations = recalculatedData.calculations;
      }

      const response = await axiosInstance.put(`seller/bundle-sale/${bundleId}`, payload);

      if (response.data?.status) {
        Toast("Bundle updated successfully!");
        setHasUnsavedChanges(false);
        setTimeout(() => {
          navigation.goBack();
        }, 100);
      }
    } catch (error: any) {
      console.error("Bundle update error:", error);
      Toast(error.response?.data?.message || "Failed to update bundle");
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const calculateDiscount = () => {
    if (bundleData.bundleMRP && bundleData.sellingPrice) {
      const savings = parseFloat(bundleData.bundleMRP) - parseFloat(bundleData.sellingPrice);
      const percentage = ((savings / parseFloat(bundleData.bundleMRP)) * 100).toFixed(1);
      return { savings: savings.toFixed(2), percentage };
    }
    return null;
  };

  const discount = calculateDiscount();

  const getSelectedProducts = () => {
    return selectedProductIds
      .map((id) => {
        const originalProduct = products.find((p) => p._id === id);
        if (originalProduct) return originalProduct;
        return availableProducts.find((p) => p._id === id);
      })
      .filter(Boolean) as Product[];
  };

  const selectedProducts = getSelectedProducts();

  const spin = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const renderSelectedProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCardSelected}>
      <TouchableOpacity
        style={styles.removeProductButton}
        onPress={() => handleToggleProductSelection(item._id)}
      >
        <Icon name="minus" size={18} color="#fff" />
      </TouchableOpacity>
      <Image
        source={{
          uri: item.images?.[0]?.key ? `${cdnURL}${item.images[0].key}` : "https://via.placeholder.com/150",
        }}
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.productPriceSelected}>₹{item.productPrice}</Text>
      </View>
    </View>
  );

  const renderAvailableProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCardAvailable}
      onPress={() => handleToggleProductSelection(item._id)}
    >
      <View style={styles.addProductButton}>
        <Icon name="plus" size={18} color="#fff" />
      </View>
      <Image
        source={{
          uri: item.images?.[0]?.key ? `${cdnURL}${item.images[0].key}` : "https://via.placeholder.com/150",
        }}
        style={styles.productImage}
      />
      {!item.isActive && (
        <View style={styles.inactiveOverlay}>
          <Text style={styles.inactiveText}>Inactive</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.productPrice}>₹{item.productPrice}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderViewProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCardView}>
      <Image
        source={{
          uri: item.images?.[0]?.key ? `${cdnURL}${item.images[0].key}` : "https://via.placeholder.com/150",
        }}
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.productPriceView}>₹{item.productPrice}</Text>
      </View>
    </View>
  );

  const filteredAvailableProducts = availableProducts.filter((p) => !selectedProductIds.includes(p._id));

  const renderMainContent = () => {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {renderBasicInfo()}
          {renderProducts()}
          {renderPricing()}
          {renderDelivery()}
        </ScrollView>
        {renderActions()}
      </KeyboardAvoidingView>
    );
  };

  const renderBasicInfo = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name="package" size={20} color={colors.borderColor} />
        <Text style={styles.sectionTitle}>Basic Information</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Bundle Title <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          value={bundleData.title}
          onChangeText={(text) => setBundleData((prev) => ({ ...prev, title: text }))}
          placeholder="e.g., Summer Fashion Combo"
          placeholderTextColor={colors.textColor}
          maxLength={200}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        <Text style={styles.helperText}>{bundleData.title.length}/200 characters</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bundleData.description}
          onChangeText={(text) => setBundleData((prev) => ({ ...prev, description: text }))}
          placeholder="Describe your bundle..."
          placeholderTextColor={colors.textColor}
          maxLength={1000}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.helperText}>{bundleData.description.length}/1000 characters</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Bundle Image <Text style={styles.required}>*</Text>
        </Text>
        {imagePreview ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
            {!uploadingImage && (
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setImagePreview(null);
                  setNewImageFile(null);
                }}
              >
                <Icon name="x" size={16} color="#fff" />
              </TouchableOpacity>
            )}
            {uploadingImage && (
              <View style={styles.imageUploadingOverlay}>
                <ActivityIndicator size="small" color={colors.borderColor} />
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.imagePicker} onPress={handleImageChange}>
            <Icon name="image" size={32} color={colors.textColor} />
            <Text style={styles.imagePickerText}>Upload Image</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.helperText}>
          {newImageFile
            ? "New image selected - will replace current image on save"
            : "Current image shown - upload new to replace"}
        </Text>
      </View>
    </View>
  );

  const renderProducts = () => (
    <View style={styles.section}>
      <View style={styles.productsHeader}>
        <View style={styles.productsHeaderLeft}>
          <View style={styles.productsIconContainer}>
            <MaterialCommunityIcons name="shopping" size={24} color={colors.primaryColor} />
          </View>
          <View>
            <Text style={styles.productsTitle}>Bundle Products</Text>
            <Text style={styles.productsSubtitle}>
              {editingProducts ? `${selectedProductIds.length} products selected` : `${products.length} products in bundle`}
            </Text>
          </View>
        </View>
        <View style={styles.productsHeaderRight}>
          {!editingProducts && (
            <TouchableOpacity
              style={styles.editProductsButton}
              onPress={() => {
                setEditingProducts(true);
                setShowProductsExpanded(true);
              }}
            >
              <Icon name="package" size={16} color="#fff" />
              <Text style={styles.editProductsButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowProductsExpanded(!showProductsExpanded)}  >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Icon name="chevron-down" size={24} color={colors.borderColor} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      {showProductsExpanded && (
        <View style={styles.productsContent}>
          {editingProducts ? (
            <>
              <View style={styles.editModeStatus}>
                <View style={styles.editModeStatusContent}>
                  <View style={styles.editModeStatusHeader}>
                    <Icon name="alert-circle" size={20} color="#60A5FA" />
                    <Text style={styles.editModeStatusTitle}>Editing Mode Active</Text>
                  </View>
                  <Text style={styles.editModeStatusText}>
                    Tap products to add/remove from bundle
                  </Text>

                  {calculatingMetrics && (
                    <View style={styles.statusRow}>
                      <ActivityIndicator size="small" color={colors.borderColor} />
                      <Text style={styles.calculatingText}>Calculating...</Text>
                    </View>
                  )}

                  {recalculatedData && !calculatingMetrics && (
                    <View style={styles.statusRow}>
                      <Icon name="check-circle" size={16} color="#4CAF50" />
                      <Text style={styles.successText}>Metrics updated!</Text>
                    </View>
                  )}

                  {selectedProductIds.length < 2 && (
                    <View style={styles.statusRow}>
                      <Icon name="alert-circle" size={16} color="#F59E0B" />
                      <Text style={styles.warningText}>Select at least 2 products</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.cancelEditButton} onPress={handleCancelEditProducts} activeOpacity={0.2}>
                  <Icon name="x" size={18} color={colors.whiteColor} />
                </TouchableOpacity>
              </View>

              {selectedProducts.length > 0 && (
                <View style={styles.selectedProductsSection}>
                  <Text style={styles.selectedProductsTitle}>Selected ({selectedProducts.length})</Text>
                  <FlatList
                    data={selectedProducts}
                    renderItem={renderSelectedProduct}
                    keyExtractor={(item) => item._id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                  />
                </View>
              )}

              <View style={styles.availableProductsSection}>
                <Text style={styles.availableProductsTitle}>Available Products</Text>
                {loadingProducts ? (
                  <ActivityIndicator size="large" color={colors.borderColor} style={styles.loadingProducts} />
                ) : (
                  <ScrollView 
                    style={styles.availableProductsListContainer}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    <View style={styles.productsGridContainer}>
                      {filteredAvailableProducts.map((item, index) => (
                        <View key={item._id} style={styles.productGridItem}>
                          {renderAvailableProduct({ item })}
                        </View>
                      ))}
                    </View>
                    {filteredAvailableProducts.length >= PRODUCTS_PER_PAGE && (
                      <TouchableOpacity
                        style={styles.loadMoreButton}
                        onPress={handleLoadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <ActivityIndicator size="small" color={colors.primaryColor} />
                        ) : (
                          <>
                            <Icon name="plus-circle" size={20} color={colors.primaryColor} />
                            <Text style={styles.loadMoreText}>Load More Products</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                )}
              </View>
            </>
          ) : (
            <>
              {products.length > 0 ? (
                <FlatList
                  data={products}
                  renderItem={renderViewProduct}
                  keyExtractor={(item) => item._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />
              ) : (
                <View style={styles.emptyProducts}>
                  <Icon name="package" size={48} color={colors.textColor} />
                  <Text style={styles.emptyProductsText}>No products in bundle</Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );

  const renderPricing = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="currency-inr" size={20} color={colors.borderColor} />
        <Text style={styles.sectionTitle}>Pricing</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>
            Bundle MRP <Text style={styles.required}>*</Text>
          </Text>
          <View  style={styles.input}>
            <Text style={[styles.helperText,{fontSize:13}]}>{bundleData.bundleMRP}
              </Text>
          </View>
          {/* <TextInput
            style={styles.input}
            value={bundleData.bundleMRP}
            onChangeText={(text) => setBundleData((prev) => ({ ...prev, bundleMRP: text }))}
            keyboardType="numeric"
            placeholderTextColor={colors.textColor}
          /> */}
        </View>

        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>
            Selling Price <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.sellingPrice && styles.inputError]}
            value={bundleData.sellingPrice}
            onChangeText={(text) => {
              // Allow only numbers with max 2 decimal places
              const regex = /^\d*\.?\d{0,2}$/;
              if (text === '' || regex.test(text)) {
                setBundleData((prev) => ({ ...prev, sellingPrice: text }));
                // Real-time validation for selling price
                const sellingPriceValue = parseFloat(text);
                const mrpValue = parseFloat(bundleData.bundleMRP);
                if (text && sellingPriceValue >= mrpValue) {
                  setErrors((prev: any) => ({ ...prev, sellingPrice: "Selling price must be less than MRP (₹" + bundleData.bundleMRP + ")" }));
                } else if (text && sellingPriceValue <= 0) {
                  setErrors((prev: any) => ({ ...prev, sellingPrice: "Selling price must be greater than 0" }));
                } else {
                  setErrors((prev: any) => ({ ...prev, sellingPrice: undefined }));
                }
              }
            }}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textColor}
          />
          {errors.sellingPrice && <Text style={styles.errorText}>{errors.sellingPrice}</Text>}
        </View>
      </View>

      {discount && (
        <View style={styles.discountBox}>
          <Text style={styles.discountText}>
            Savings: ₹{discount.savings} ({discount.percentage}% OFF)
          </Text>
        </View>
      )}
    </View>
  );

  const renderDelivery = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="truck" size={20} color={colors.borderColor} />
        <Text style={styles.sectionTitle}>Delivery</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Delivery Charge (₹)</Text>
          <TextInput
            style={styles.input}
            value={bundleData.deliveryCharge}
            onChangeText={(text) => {
              // Allow only numbers with max 2 decimal places
              const regex = /^\d*\.?\d{0,2}$/;
              if (text === '' || regex.test(text)) {
                setBundleData((prev) => ({ ...prev, deliveryCharge: text }));
              }
            }}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textColor}
          />
        </View>

        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Est. Delivery (Days)</Text>
          <TextInput
            style={styles.input}
            value={bundleData.estimatedDeliveryDate}
            onChangeText={(text) => {
              // Allow only whole numbers (no decimals)
              const regex = /^\d*$/;
              if (text === '' || regex.test(text)) {
                setBundleData((prev) => ({ ...prev, estimatedDeliveryDate: text }));
              }
            }}
            keyboardType="number-pad"
            placeholderTextColor={colors.textColor}
          />
        </View>
      </View>
    </View>
  );

  const renderActions = () => (
    <View style={styles.actions}>
      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitButton, (submitting || uploadingImage) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || uploadingImage}
      >
        {submitting || uploadingImage ? (
          <ActivityIndicator size="small" color={colors.primaryColor} />
        ) : (
          <>
            <Icon name="check-circle" size={18} color={colors.primaryColor} />
            <Text style={styles.submitButtonText}>Update Bundle</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.borderColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader navigation={navigation} message={'Edit Bundle Sale'} />
      {renderMainContent()}
      
      <GlobalConfirmModal
        visible={modalConfig.visible}
        onClose={hideModal}
        onConfirm={handleConfirm}
        title={modalConfig.title}
        content={modalConfig.content}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        mode={modalConfig.mode}
        isLoading={modalConfig.isLoading}
        showIcon={modalConfig.showIcon}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primaryColor,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.SecondaryColor,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.headLineColor,
    marginLeft: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.headLineColor,
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  input: {
    backgroundColor: colors.SecondaryColor,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    borderRadius: 8,
    padding: 12,
    color: colors.whiteColor,
    fontSize: 14,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: colors.textColor,
    fontSize: 12,
    marginTop: 4,
  },
  imagePreviewContainer: {
    width: 160,
    height: 160,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.SecondaryColor,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  imageUploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePicker: {
    width: 160,
    height: 160,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#2C2C2C",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.SecondaryColor,
  },
  imagePickerText: {
    color: colors.textColor,
    fontSize: 12,
    marginTop: 8,
  },
  productsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 8,
    marginBottom: 16,
  },
  productsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  productsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.borderColor,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.headLineColor,
  },
  productsSubtitle: {
    fontSize: 12,
    color: colors.textColor,
    marginTop: 2,
  },
  productsHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editProductsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  editProductsButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  productsContent: {
    padding: 12,
  },
  editModeStatus: {
    flexDirection: "row",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  editModeStatusContent: {
    flex: 1,
  },
  editModeStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  editModeStatusTitle: {
    color: "#60A5FA",
    fontWeight: "600",
    fontSize: 14,
  },
  editModeStatusText: {
    color: colors.headLineColor,
    fontSize: 12,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  calculatingText: {
    color: colors.borderColor,
    fontSize: 12,
  },
  successText: {
    color: "#4CAF50",
    fontSize: 12,
  },
  warningText: {
    color: "#F59E0B",
    fontSize: 12,
  },
  cancelEditButton: {
    padding: 8,
    borderRadius: 6,
    height:40,
    borderWidth: 1,
    borderColor: "#2C2C2C",
  },
  selectedProductsSection: {
    marginBottom: 16,
  },
  selectedProductsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.headLineColor,
    marginBottom: 12,
  },
  horizontalList: {
    paddingRight: 12,
  },
  availableProductsSection: {
    marginTop: 16,
  },
  availableProductsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.headLineColor,
    marginBottom: 12,
  },
  availableProductsListContainer: {
    maxHeight: 450,
    borderRadius: 8,
    backgroundColor: colors.primaryColor,
  },
  productsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productGridItem: {
    width: (width - 64) / 2,
    marginBottom: 16,
  },
  loadingProducts: {
    paddingVertical: 40,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.borderColor,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  loadMoreText: {
    color: colors.primaryColor,
    fontSize: 14,
    fontWeight: "600",
  },
  productCardSelected: {
    width: 150,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#4CAF50",
    overflow: "hidden",
    position: "relative",
    marginRight: 16,
  },
  productCardAvailable: {
    width: (width - 64) / 2,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    overflow: "hidden",
    position: "relative",
  },
  productCardView: {
    width: 150,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2C2C2C",
    overflow: "hidden",
    position: "relative",
    marginRight: 16,
  },
  addProductButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  removeProductButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  productImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  inactiveOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  inactiveText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 12,
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    color: colors.headLineColor,
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
    minHeight: 32,
  },
  productPrice: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "bold",
  },
  productPriceSelected: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "bold",
  },
  productPriceView: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyProducts: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyProductsText: {
    color: colors.textColor,
    fontSize: 14,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    marginHorizontal: -8,
  },
  discountBox: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  discountText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2C2C2C",
  },
  cancelButtonText: {
    color: colors.headLineColor,
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.borderColor,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.primaryColor,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default EditBundleSale;
