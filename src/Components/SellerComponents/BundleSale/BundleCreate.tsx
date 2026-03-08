import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Alert,
  ToastAndroid,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialIcon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from 'react-native-linear-gradient';
import { Dropdown } from 'react-native-element-dropdown';
import * as ImagePicker from "react-native-image-picker";
import axiosInstance from "../../../Utils/Api";
import { deleteObjectFromS3, uploadImageToS3 } from "../../../Utils/aws";
import { AWS_CDN_URL } from "../../../../Config";
import { SafeAreaView } from "react-native-safe-area-context";
import SellerHeader from "../SellerForm/Header";
import { ChevronRight, X } from "lucide-react-native";
import useConfirmModal from "../../../hooks/useAlertModal";
import GlobalConfirmModal from "../../Reuse/AlertModal";
import { colors } from "../../../Utils/Colors";
import { Toast } from "../../../Utils/dateUtils";


const { width } = Dimensions.get("window");

// Color constants
const COLORS = {
  blackLight:colors.primaryColor|| "#1a1a1a",
  blackDark: "#0d0d0d",
  greyLight: "#404040",
  greyDark: "#2a2a2a",
  whiteLight: "#ffffff",
  whiteHalf: "#999999",
  newYellow: "#F7CE45",
};

// Toast helper function
const showToast = (message, type = "short") => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, type === "long" ? ToastAndroid.LONG : ToastAndroid.SHORT);
  } else {
    Alert.alert("", message);
  }
};

const CreateBundleSale = () => {
  const navigation = useNavigation();
  const cdnURL =AWS_CDN_URL
  const { modalConfig, showModal, hideModal, handleConfirm } = useConfirmModal();
  const step3ScrollViewRef = useRef(null);

  // Step Management
  const [currentStep, setCurrentStep] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Step 1: Product Selection State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [page, setPage] = useState(1);

  // Step 2: Calculations State
  const [calculations, setCalculations] = useState(null);
  const [calculatedProducts, setCalculatedProducts] = useState([]);
  const [calculating, setCalculating] = useState(false);

  // Step 3: Bundle Details State
  const [bundleData, setBundleData] = useState({
    title: "",
    description: "",
    bundleImage: null,
    bundleMRP: "",
    sellingPrice: "",
    deliveryCharge: "",
    estimatedDeliveryDate: "",
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = 
      selectedProductIds.length > 0 ||
      bundleData.title.trim() !== "" ||
      bundleData.description.trim() !== "" ||
      bundleData.bundleImage !== null;
    
    setHasUnsavedChanges(hasChanges);
  }, [selectedProductIds, bundleData]);

  // Handle back navigation with unsaved changes warning
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
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
    if (currentStep === 1) {
      fetchProducts();
    }
  }, [page, searchTerm, selectedCategory]);

  useEffect(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
    setCategories(uniqueCategories);
  }, [products]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const params = { page, limit: 20 };
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;

      const response = await axiosInstance.get("seller/bundle-sale/reserved-for-live", { params });
      
      if (response.data?.status) {
        setProducts(response.data.data.products || []);
      }
    } catch (error) {
      console.log("Error fetching products:", error);
      showToast(error.response?.data?.message || "Failed to load reserved products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        if (prev.length >= 10) {
          showToast("Maximum 10 products allowed in a bundle");
          return prev;
        }
        return [...prev, productId];
      }
    });
  };

  const handleCalculate = async () => {
    if (selectedProductIds.length < 2) {
      showToast("Please select at least 2 products");
      return;
    }

    setCalculating(true);
    try {
      const response = await axiosInstance.post("seller/bundle-sale/calculate", {
        productIds: selectedProductIds
      });

      if (response.data?.status) {
        setCalculations(response.data.data.calculations);
        setCalculatedProducts(response.data.data.products);
        
        setBundleData(prev => ({
          ...prev,
          bundleMRP: response.data.data.calculations.totalMRP,
          sellingPrice: response.data.data.calculations.suggestedBundlePrice || response.data.data.calculations.totalMRP,
          deliveryCharge: response.data.data.calculations.roundedDeliveryCharge,
          estimatedDeliveryDate: response.data.data.calculations.averageDeliveryDays,
        }));
        
        setCurrentStep(2);
        showToast("Bundle calculations completed!");
      }
    } catch (error) {
      console.error("Error calculating bundle:", error);
      showToast(error.response?.data?.message || "Failed to calculate bundle metrics");
    } finally {
      setCalculating(false);
    }
  };

  const handleRemoveImage = async() => {
      await deleteObjectFromS3(imagePreview)
                      setImagePreview(null);
                      setBundleData(prev => ({ ...prev, bundleImage: null }));
                    }
  const handleImagePicker = () => {
    ImagePicker.launchImageLibrary(
      {
        mediaType: "photo",
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      },
      async (response) => {
        if (response.didCancel) return;
        
        if (response.errorCode) {
          showToast("Image picker error");
          return;
        }

        const asset = response.assets[0];
        if (asset.fileSize > 5 * 1024 * 1024) {
          showToast("Image size must be less than 5MB");
          return;
        }

        setImagePreview(asset.uri);
        setUploadingImage(true);

        try {
          const key = await uploadImageToS3(asset.uri, "bundles");
          setBundleData(prev => ({
            ...prev,
            bundleImage: { key, url: `${cdnURL}${key}` }
          }));
          setErrors(prev => ({ ...prev, bundleImage: undefined }));
        } catch (error) {
          console.error("Image upload failed:", error);
          showToast("Image upload failed. Please try again.");
          setImagePreview(null);
        } finally {
          setUploadingImage(false);
        }
      }
    );
  };

  const validateForm = () => {
    const newErrors = {};

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

    if (!bundleData.bundleImage) {
      newErrors.bundleImage = "Bundle image is required";
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
      showToast("Please wait for image upload to complete");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: bundleData.title,
        description: bundleData.description,
        bundleImage: bundleData.bundleImage,
        productIds: selectedProductIds,
        calculations: {
          ...calculations,
          bundlePrice: parseFloat(bundleData.sellingPrice)
        },
        bundleMRP: parseFloat(bundleData.bundleMRP),
        sellingPrice: parseFloat(bundleData.sellingPrice),
        deliveryCharge: parseFloat(bundleData.deliveryCharge) || 0,
        estimatedDeliveryDate: parseInt(bundleData.estimatedDeliveryDate) || 0
      };

      const response = await axiosInstance.post("seller/bundle-sale/create", payload);

      if (response.data?.status) {
        showToast("Bundle sale created successfully!");
        setHasUnsavedChanges(false);
        setTimeout(() => {
          navigation.goBack();
        }, 100);
      }
    } catch (error) {
      console.error("Bundle creation error:", error);
      showToast(error.response?.data?.message || "Failed to create bundle");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateDiscount = () => {
    if (bundleData.bundleMRP && bundleData.sellingPrice) {
      const savings = parseFloat(bundleData.bundleMRP) - parseFloat(bundleData.sellingPrice);
      const percentage = (savings / parseFloat(bundleData.bundleMRP) * 100).toFixed(1);
      return { savings: savings.toFixed(2), percentage };
    }
    return null;
  };

  const renderProgressSteps = () => {
    const steps = [
      { num: 1, label: "Select Products" },
      { num: 2, label: "View Calculations" },
      { num: 3, label: "Bundle Details" }
    ];

    return (
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={step.num}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                currentStep >= step.num ? styles.stepCircleActive : styles.stepCircleInactive
              ]}>
                {currentStep > step.num ? (
                  <Icon name="check" size={14} color={COLORS.blackDark} />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    currentStep >= step.num ? styles.stepNumberActive : styles.stepNumberInactive
                  ]}>{step.num}</Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                currentStep >= step.num ? styles.stepLabelActive : styles.stepLabelInactive
              ]}>{step.label}</Text>
            </View>
            {index < 2 && (
              <View style={[
                styles.stepLine,
                currentStep > step.num ? styles.stepLineActive : styles.stepLineInactive
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderProductCard = ({ item }) => {
    const isSelected = selectedProductIds.includes(item._id);
    return (
      <TouchableOpacity
        style={[styles.productCard, isSelected && styles.productCardSelected]}
        onPress={() =>{
          if(item.quantity > 0)
          toggleProductSelection(item._id)
        else
          Toast("Out of stock products cannot be added to the bundle")
        }
        }
      >
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Icon name="check" size={10} color={COLORS.blackDark} />
          </View>
        )}
        <Image
          source={{ uri: item.images?.[0]?.key ? `${cdnURL}${item.images[0].key}` : undefined }}
          style={styles.productImage}
          // defaultSource={require("../../../../assets/images/placeholder.png")}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.productPrice}>
            ₹{item.effectivePrice} • Stock: {item.quantity}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStep1 = () => (
    <ScrollView style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Step 1: Select Products</Text>
        <Text style={styles.stepSubtitle}>
          Choose 2-10 products for your bundle. Selected: {selectedProductIds.length}/10
        </Text>
      </View>

      {/* Info Note */}
      <View style={styles.infoNote}>
        <MaterialIcon name="information-outline" size={18} color={COLORS.newYellow} />
        <Text style={styles.infoNoteText}>
          Note: Only products that are Reserved for Livestream and Active are displayed here.
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={16} color={COLORS.whiteHalf} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={COLORS.whiteHalf}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <View style={styles.categoryPicker}>
          <Text style={styles.pickerLabel}>Category: </Text>
          <Dropdown
            style={styles.dropdown}
            containerStyle={styles.dropdownContainer}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            itemTextStyle={styles.dropdownItemText}
            itemContainerStyle={styles.dropdownItemContainer}
            activeColor={`${COLORS.newYellow}20`}
            data={[
              { label: 'All Categories', value: '' },
              ...categories.map(cat => ({ label: cat, value: cat }))
            ]}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="All Categories"
            value={selectedCategory}
            onChange={item => {
              setSelectedCategory(item.value);
            }}
            renderRightIcon={() => (
              <MaterialIcon name="chevron-down" size={20} color={COLORS.whiteHalf} />
            )}
          />
        </View>
      </View>

      {loadingProducts ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.newYellow} />
        </View>
      ) : products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      )}
      
      {/* Spacer for fixed bottom buttons */}
      <View style={{ height: 80 }} />
    </ScrollView>
  );

  const renderCalculationCard = (icon, title, value, subtitle, gradient) => (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.calcCard}>
      <View style={styles.calcIconContainer}>
        <MaterialIcon name={icon} size={20} color="#fff" />
      </View>
      <Text style={styles.calcValue}>{value}</Text>
      <Text style={styles.calcTitle}>{title}</Text>
      {subtitle && <Text style={styles.calcSubtitle}>{subtitle}</Text>}
      <View style={styles.calcGlow} />
    </LinearGradient>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Step 2: Bundle Calculations</Text>
        <Text style={styles.stepSubtitle}>Review the auto-calculated metrics for your bundle</Text>
      </View>

      <View style={styles.calcGrid}>
        <View style={styles.calcRow}>
          {renderCalculationCard(
            "package-variant",
            "Total Products",
            calculations.totalProducts,
            null,
            ['#3B82F6', '#2563EB']
          )}
          {renderCalculationCard(
            "weight-kilogram",
            "Total Weight",
            `${calculations?.totalWeight?.value || 0} ${calculations?.totalWeight?.unit || 'kg'}`,
            null,
            ['#A855F7', '#9333EA']
          )}
        </View>
        <View style={styles.calcRow}>
          {renderCalculationCard(
            "truck",
            "Avg Delivery Charge",
            `₹${calculations.averageDeliveryCharge}`,
            `Rounded: ₹${calculations.roundedDeliveryCharge}`,
            ['#10B981', '#059669']
          )}
          {renderCalculationCard(
            "calendar",
            "Avg Delivery Days",
            `${calculations.averageDeliveryDays} days`,
            null,
            ['#F97316', '#EA580C']
          )}
        </View>
        <View style={styles.calcRow}>
          {renderCalculationCard(
            "currency-inr",
            "Total MRP",
            `₹${calculations.totalMRP}`,
            null,
            ['#EF4444', '#DC2626']
          )}
          {renderCalculationCard(
            "shopping",
            "Suggested Price",
            `₹${calculations.suggestedBundlePrice}`,
            "(10% discount applied)",
            ['#EAB308', '#CA8A04']
          )}
        </View>
      </View>

      <View style={styles.productListContainer}>
        <Text style={styles.productListTitle}>Selected Products ({calculatedProducts.length})</Text>
        <FlatList
          data={calculatedProducts}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.productHorizontalItem}>
              <Image
                source={{ uri: item.image ? `${cdnURL}${item.image}` : "https://via.placeholder.com/150" }}
                style={styles.productHorizontalImage}
                resizeMode="cover"
              />
              <View style={styles.productHorizontalInfo}>
                <Text style={styles.productHorizontalTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.productHorizontalPrice}>₹{item.price}</Text>
                <Text style={styles.productHorizontalWeight}>{item.weight}{item.weightUnit || 'g'}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.horizontalListContent}
        />
      </View>

      {/* Spacer for fixed bottom buttons */}
      <View style={{ height: 80 }} />
    </ScrollView>
  );

  const handleDeliveryInputFocus = () => {
    // Delay to allow keyboard to fully appear
    setTimeout(() => {
      step3ScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const renderStep3 = () => {
    const discount = calculateDiscount();

    return (
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          ref={step3ScrollViewRef}
          style={styles.stepContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
        >
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>Step 3: Bundle Details</Text>
          <Text style={styles.stepSubtitle}>Fill in the details for your bundle sale</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Bundle Title <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={bundleData.title}
              onChangeText={(text) => setBundleData(prev => ({ ...prev, title: text }))}
              placeholder="e.g., Summer Fashion Combo"
              placeholderTextColor={COLORS.whiteHalf}
              maxLength={200}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            <Text style={styles.helperText}>{bundleData.title.length}/200 characters</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textArea, { height: 80 }]}
              value={bundleData.description}
              onChangeText={(text) => setBundleData(prev => ({ ...prev, description: text }))}
              placeholder="Describe your bundle..."
              placeholderTextColor={COLORS.whiteHalf}
              multiline
              maxLength={1000}
            />
            <Text style={styles.helperText}>{bundleData.description.length}/1000 characters</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Bundle Image <Text style={styles.required}>*</Text></Text>
            {imagePreview || bundleData.bundleImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: imagePreview || bundleData.bundleImage?.url }}
                  style={styles.imagePreview}
                />
                {!uploadingImage && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={handleRemoveImage}
                  >
                    <X size={16} color={COLORS.whiteLight} />
                    {/* <Icon name="times" size={16} color={COLORS.whiteLight} /> */}
                  </TouchableOpacity>
                )}
                {uploadingImage && (
                  <View style={styles.imageLoader}>
                    <ActivityIndicator size="small" color={COLORS.newYellow} />
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePicker} onPress={handleImagePicker}>
                <MaterialIcon name="image-plus" size={32} color={COLORS.whiteHalf} />
                <Text style={styles.imagePickerText}>Upload Image</Text>
              </TouchableOpacity>
            )}
            {errors.bundleImage && <Text style={styles.errorText}>{errors.bundleImage}</Text>}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Pricing</Text>

          <View style={styles.formRow}>
            <View style={styles.formGroupHalf}>
              <Text style={styles.label}>Bundle MRP</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={bundleData.bundleMRP.toString()}
                editable={false}
              />
            </View>

            <View style={styles.formGroupHalf}>
              <Text style={styles.label}>Selling Price <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.sellingPrice && styles.inputError]}
                value={bundleData.sellingPrice.toString()}
                onChangeText={(text) => {
                  // Allow only numbers with max 2 decimal places
                  const regex = /^\d*\.?\d{0,2}$/;
                  if (text === '' || regex.test(text)) {
                    setBundleData(prev => ({ ...prev, sellingPrice: text }));
                    // Real-time validation for selling price
                    const sellingPriceValue = parseFloat(text);
                    const mrpValue = parseFloat(bundleData.bundleMRP);
                    if (text && sellingPriceValue >= mrpValue) {
                      setErrors(prev => ({ ...prev, sellingPrice: "Selling price must be less than MRP (₹" + bundleData.bundleMRP + ")" }));
                    } else if (text && sellingPriceValue <= 0) {
                      setErrors(prev => ({ ...prev, sellingPrice: "Selling price must be greater than 0" }));
                    } else {
                      setErrors(prev => ({ ...prev, sellingPrice: undefined }));
                    }
                  }
                }}
                keyboardType="decimal-pad"
              />
              {errors.sellingPrice && <Text style={styles.errorText}>{errors.sellingPrice}</Text>}
            </View>
          </View>

          {discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                Customer Savings: ₹{discount.savings} ({discount.percentage}% OFF)
              </Text>
            </View>
          )}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          <Text style={styles.sectionSubtitle}>Auto-calculated values (editable)</Text>

          <View style={styles.formRow}>
            <View style={styles.formGroupHalf}>
              <Text style={styles.label}>Delivery Charge (₹)</Text>
              <TextInput
                style={styles.input}
                value={bundleData.deliveryCharge.toString()}
                onChangeText={(text) => {
                  // Allow only numbers with max 2 decimal places
                  const regex = /^\d*\.?\d{0,2}$/;
                  if (text === '' || regex.test(text)) {
                    setBundleData(prev => ({ ...prev, deliveryCharge: text }));
                  }
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.whiteHalf}
                onFocus={handleDeliveryInputFocus}
              />
              <Text style={styles.helperText}>💡 Auto-calculated from products' average</Text>
            </View>

            <View style={styles.formGroupHalf}>
              <Text style={styles.label}>Estimated  (Days)</Text>
              <TextInput
                style={styles.input}
                value={bundleData.estimatedDeliveryDate.toString()}
                onChangeText={(text) => {
                  // Allow only whole numbers (no decimals)
                  const regex = /^\d*$/;
                  if (text === '' || regex.test(text)) {
                    setBundleData(prev => ({ ...prev, estimatedDeliveryDate: text }));
                  }
                }}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={COLORS.whiteHalf}
                onFocus={handleDeliveryInputFocus}
              />
              <Text style={styles.helperText}>💡 Auto-calculated from products' average</Text>
            </View>
          </View>
        </View>

        {/* Spacer for fixed bottom buttons */}
        <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderActionButtons = () => {
    if (currentStep === 1) {
      return (
        <View style={styles.fixedActionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, (selectedProductIds.length < 2 || calculating) && styles.buttonDisabled]}
            onPress={handleCalculate}
            disabled={selectedProductIds.length < 2 || calculating}
          >
            {calculating ? (
              <ActivityIndicator size="small" color={COLORS.blackDark} />
            ) : (
              <>
                <MaterialIcon name="calculator" size={18} color={COLORS.blackDark} />
                <Text style={styles.primaryButtonText}>
                  Bundle ({selectedProductIds.length})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (currentStep === 2) {
      return (
        <View style={styles.fixedActionButtons}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentStep(1)}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.primaryButtonText}>Proceed </Text>
            <ChevronRight size={19} color={COLORS.blackDark} />
          </TouchableOpacity>
        </View>
      );
    }

    if (currentStep === 3) {
      return (
        <View style={styles.fixedActionButtons}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentStep(2)}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, (submitting || uploadingImage) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || uploadingImage}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color={COLORS.blackDark} />
                <Text style={styles.primaryButtonText}>Creating...</Text>
              </>
            ) : (
              <Text style={styles.primaryButtonText}>Create Bundle</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader navigation={navigation} message={'Create Bundle Sale'}/>

      {renderProgressSteps()}

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {renderActionButtons()}

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
    backgroundColor: COLORS.blackLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyLight,
    backgroundColor: COLORS.blackLight,
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.newYellow,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.whiteLight,
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyLight,
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleActive: {
    backgroundColor: COLORS.newYellow,
  },
  stepCircleInactive: {
    backgroundColor: COLORS.greyDark,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: "bold",
  },
  stepNumberActive: {
    color: COLORS.blackDark,
  },
  stepNumberInactive: {
    color: COLORS.whiteHalf,
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 6,
  },
  stepLabelActive: {
    color: COLORS.newYellow,
  },
  stepLabelInactive: {
    color: COLORS.whiteHalf,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    borderRadius: 1,
  },
  stepLineActive: {
    backgroundColor: COLORS.newYellow,
  },
  stepLineInactive: {
    backgroundColor: COLORS.greyDark,
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  stepHeader: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.newYellow,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.whiteHalf,
  },
  filterContainer: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.blackDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.greyLight,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 45,
    color: COLORS.whiteLight,
    fontSize: 14,
  },
  categoryPicker: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerLabel: {
    color: COLORS.whiteLight,
    fontSize: 14,
    marginRight: 8,
  },
  dropdown: {
    flex: 1,
    height: 45,
    backgroundColor: COLORS.blackDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.greyLight,
    paddingHorizontal: 12,
  },
  dropdownContainer: {
    backgroundColor: COLORS.blackDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.greyLight,
    marginTop: 4,
  },
  dropdownPlaceholder: {
    color: COLORS.whiteHalf,
    fontSize: 14,
  },
  dropdownSelectedText: {
    color: COLORS.whiteLight,
    fontSize: 14,
  },
  dropdownItemText: {
    color: COLORS.whiteLight,
    fontSize: 14,
  },
  dropdownItemContainer: {
    backgroundColor: COLORS.blackDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyDark,
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  productRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  productCard: {
    width: (width - 48) / 2,
    backgroundColor: COLORS.blackDark,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.greyLight,
    overflow: "hidden",
  },
  productCardSelected: {
    borderColor: COLORS.newYellow,
    backgroundColor: `${COLORS.newYellow}10`,
  },
  selectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: COLORS.newYellow,
    borderRadius: 12,
    padding: 4,
  },
  productImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    color: COLORS.whiteLight,
    fontSize: 14,
    fontWeight: "600",
  },
  productPrice: {
    color: COLORS.whiteHalf,
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.whiteHalf,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  fixedActionButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.blackLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.greyLight,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.greyDark,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.whiteLight,
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.newYellow,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: COLORS.blackDark,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  calcCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  calcRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  calcIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  calcValue: {
    fontSize: 28,
    fontWeight: "800",
    color: '#fff',
    marginBottom: 4,
  },
  calcTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: '#fff',
    opacity: 0.9,
  },
  calcSubtitle: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.7,
    marginTop: 4,
  },
  calcGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -20,
    right: -20,
  },
  calcGrid: {
    marginBottom: 20,
  },
  productListContainer: {
    backgroundColor: COLORS.blackDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  productListTitle: {
    color: COLORS.whiteLight,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  horizontalListContent: {
    paddingRight: 16,
  },
  productHorizontalItem: {
    width: 160,
    backgroundColor: COLORS.blackLight,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.greyLight,
    marginRight: 12,
  },
  productHorizontalImage: {
    width: '100%',
    height: 140,
  },
  productHorizontalInfo: {
    padding: 12,
  },
  productHorizontalTitle: {
    color: COLORS.whiteLight,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  productHorizontalPrice: {
    color: COLORS.newYellow,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productHorizontalWeight: {
    color: COLORS.whiteHalf,
    fontSize: 11,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: COLORS.greyDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.greyLight,
  },
  secondaryButtonText: {
    color: COLORS.whiteLight,
    fontSize: 14,
    fontWeight: "600",
  },
  formSection: {
    backgroundColor: COLORS.blackDark,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.whiteLight,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  sectionSubtitle: {
    color: COLORS.whiteHalf,
    fontSize: 12,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formGroupHalf: {
    flex: 1,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    color: COLORS.whiteLight,
    fontSize: 14,
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    height: 48,
    backgroundColor: COLORS.blackLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.greyLight,
    paddingHorizontal: 12,
    color: COLORS.whiteLight,
    fontSize: 14,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  inputDisabled: {
    backgroundColor: `${COLORS.greyDark}50`,
    opacity: 0.6,
  },
  textArea: {
    backgroundColor: COLORS.blackLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.greyLight,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.whiteLight,
    fontSize: 14,
    textAlignVertical: "top",
  },
  helperText: {
    color: COLORS.whiteHalf,
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  imagePreviewContainer: {
//  padding:5,
    // paddingVertical:20,
    // height: 160,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    // width: 160,
    // height: 160,
  },
  imagePreview: {
    width: '100%',
    height: 100,
    //  padding:5,
    // paddingVertical:20,
    // // height: 160,
    // borderRadius: 8,
    // justifyContent: "center",
    // alignItems: "center",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 16,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  imageLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  imagePicker: {
    // width: 160,
    padding:5,
    paddingVertical:20,
    // height: 160,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.greyLight,
  },
  imagePickerText: {
    color: COLORS.whiteHalf,
    fontSize: 12,
    marginTop: 8,
  },
  discountBadge: {
    marginTop: 16,
    padding: 12,
    backgroundColor: `${COLORS.newYellow}10`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COLORS.newYellow}50`,
  },
  discountText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "600",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${COLORS.newYellow}15`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${COLORS.newYellow}30`,
    gap: 10,
  },
  infoNoteText: {
    flex: 1,
    color: COLORS.whiteHalf,
    fontSize: 13,
    lineHeight: 18,
  },
  infoNoteHighlight: {
    color: COLORS.newYellow,
    fontWeight: "600",
  },
});

export default CreateBundleSale;
