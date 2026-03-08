// VARIANTS
/* eslint-disable curly */
/* eslint-disable react-native/no-inline-styles */
import React, {useState, useContext, useEffect, useRef,  useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  ToastAndroid,
  Dimensions,
} from 'react-native';
import {Dropdown} from 'react-native-element-dropdown';
// import {ArrowLeftCircle, EarthIcon, Eye, , Search, User} from 'lucide-react-native';

const {width, height} = Dimensions.get('window');

import {launchImageLibrary} from 'react-native-image-picker';
import {
  Info,
  ShoppingCart,
  Gavel,
  AlertCircle,
  IndianRupee,
  Package,
  Image as ImageIcon,
  Box,
  Plus,
  X,
  Settings,
  ShieldCheck,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Checkbox,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  deleteObjectFromS3,
  uploadImageToS3,
  AWS_CDN_URL,
} from '../../../Utils/aws';
import axiosInstance from '../../../Utils/Api';
import {AuthContext} from '../../../Context/AuthContext';
import {getFieldsForCategory} from './FieldMapping';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import ToggleSwitch from 'toggle-switch-react-native';
import useConfirmModal from '../../../hooks/useAlertModal';
import GlobalConfirmModal from '../../Reuse/AlertModal';
import {useDebouncedGoBack} from '../../../Utils/useDebouncedGoBack';
import {handleGoBack, Toast} from '../../../Utils/dateUtils';
import HorizontalTimeline from '../SellerForm/TimeLine';
import FloatingHelpCenter, {
  FABHelpButtonProduct,
  FAQHelpBottomSheetProduct,
} from './ProductHelpCenter';
import { useSellerContext } from '../../../Context/SellerContext';
import ProductVariantManager from './Utils/ProductVariantManager'

const LiveStreamProductForm = ({navigation, route}) => {
  const {sellerDetail}: any = useContext(AuthContext);
  // console.log(sellerDetail)
  const { sellerCategories, categoriesLoaded, categoriesError } = useSellerContext();
  const {modalConfig, showModal, hideModal, handleConfirm} = useConfirmModal();
  const initialProductDetails = {
    title: '',
    description: '',
    quantity: '',
    images: [],
    category: '',
    subcategory: '',
    hsnNo: '',
    MRP: '',
    productPrice: '',
    startingPrice: '',
    reservedPrice: '',
    commissionRate: '',
    // --- Added/Updated Fields ---
    brand: '',
    manufacturer: '',
    manufacturerAddress: '', // ADDED
    countryOfOrigin: 'IN',
    netQuantity: '', // ADDED
    packagingType: '', // ADDED
    weight: {value: '', unit: 'grams'}, // Kept this one for product weight
    dimensions: {length: '', width: '', height: ''},
    expiryDate: new Date(), // ADDED (if applicable)
    shelfLife: '', // ADDED
    batchNumber: '', // ADDED (optional but recommended)
    gstRate: '',
    sellerName: sellerDetail?.companyName || '',
    sellerContact: sellerDetail?.mobileNumber || '', // ADDED
    sellerGSTIN: sellerDetail?.gstInfo?.gstNumber || '', // ADDED
    returnPolicy: [],
    warranty: {hasWarranty: false, duration: ''},
    fssaiLicenseNo: '', // ADDED (if food/health-related)
    bisCertification: '', // ADDED (if applicable)
    importerName: '', // ADDED (if imported)
    importerAddress: '', // ADDED (if imported)
    importerGSTIN: '', // ADDED (if imported)
    eWasteCompliance: false,
    recyclablePackaging: false,
    hazardousMaterials: '', // Keep this for shipping info
    allowDropshipping: false,
    isActive: true,
    hasReturn: false,
    returnDays: '',
    returnType: '',
    size: '',
    sku: '',
    isAuctionEnabled:false,
   // New courier fields
   logisticsType: null, //"flykupLogistics",
   estimatedDeliveryDate: null,
   deliveryCharge: null,
   
    reserveForLive: false,

  };
  const {data, mode} = route.params || {};
  const [productDetails, setProductDetails] = useState(initialProductDetails);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [returnPolicyInput, setReturnPolicyInput] = useState('');
  const [show, setShow] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [skuAvailable, setSkuAvailable] = useState(null);
  const [checkingSku, setCheckingSku] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [requiredFields, setRequiredFields] = useState(
    getFieldsForCategory(null, null).required,
  );
  const [optionalFields, setOptionalFields] = useState(
    getFieldsForCategory(null, null).optional,
  );
    const [variantData, setVariantData] = useState({
    enabled: false,
    variants: [],
    isValid: true,
    deletedVariantIds: []
  });

  // Memoize the variant change handler to prevent infinite loops
  const handleVariantsChange = useCallback((newVariantData) => {
    setVariantData(newVariantData);
    setErrors(prev => ({...prev, ['variants']: undefined}));
  }, []);

  // const options = useMemo(() => countryList().getData(), []);
  // console.log(options)
    useEffect(() => {
      const { category, subcategory } = productDetails;
      const fields = getFieldsForCategory(category, subcategory);
      setRequiredFields(fields.required);
      setOptionalFields(fields.optional);
      
      // Reset variants when category is not Fashion & Accessories or Electronics & Gadgets
      const allowedCategories = ["Fashion & Accessories", "Electronics & Gadgets"];
      if (!allowedCategories.includes(category)) {
        setVariantData({
          enabled: false,
          variants: [],
          isValid: true
        });
      }
    }, [productDetails.category, productDetails.subcategory]);
  

  // --- Helper functions for rendering ---
  const isFieldRequired = fieldName => requiredFields.includes(fieldName);
  const isFieldOptional = fieldName => optionalFields.includes(fieldName);
  const shouldRenderField = fieldName =>
    isFieldRequired(fieldName) || isFieldOptional(fieldName);

  const getLabelSuffix = fieldName => {
    if (isFieldRequired(fieldName)) return ' *';
    if (isFieldOptional(fieldName)) return ' (Optional)';
    return '';
  };

  const onChange = (event, selectedDate) => {
    setShow(Platform.OS === 'ios'); // iOS keeps the picker open
    if (selectedDate) {
      handleChange('expiryDate', selectedDate);
      setShow(false);
    }
  };
  const saveDraft = async () => {
    try {
 const parentImageKeys = new Set(
          productDetails.images
            .filter(img => img.status === 'done' && img.key)
            .map(img => img.key)
        );

      console.log("saving Draft")
        const variantsPayload = variantData.variants.map(v => {
          let variantImages = v.images.filter(img => img.status === 'done');

          // Exclude parent images for color variants
          if (v.requiresNewImage) {
            variantImages = variantImages.filter(
              img => !parentImageKeys.has(img.key)
            );
          }

          return {
            title: v.title,
            sku: v.sku,
            quantity: Number(v.quantity),
            MRP: parseFloat(v.MRP),
            productPrice: parseFloat(v.productPrice),
            variantAttributes: v.variantAttributes,
            images: variantImages.map(({key}) => ({key}))
          };
        });
      await axiosInstance.post('/product/listing/draft', {
        draftData: productDetails,
         variantData: variantsPayload
      });
      // setHasDraft(true);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };
  useEffect(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      if (mode == 'add') saveDraft();
    }, 2000);

    setAutoSaveTimer(timer);

    return () => clearTimeout(timer);
  }, [productDetails]);

  const checkForDraft = async () => {
    try {
      // setDraftLoading(true);
      const response = await axiosInstance.get('/product/listing/draft');
      if (response.data.status && response.data.data) {
        setHasDraft(true);
        // setRetrievedDraftData(response.data.data.draftData);
        // setIsDraftModalOpen(true);
        const data = response.data.data.draftData;
        // Assuming you already have productDetails state
        if (mode == 'add')
          setProductDetails(prev => ({
            ...prev,
            ...data, // keep other values
            expiryDate: new Date(data?.expiryDate), // overwrite expiryDate only
          }));
           if (data.variantData) {
          setVariantData(data.variantData);
        }
      }
    } catch (error) {
      console.log('Error checking for draft:', error.response.data);
    } finally {
      // setDraftLoading(false);
    }
  };
  useEffect(() => {
    checkForDraft();
  }, []);
  
  // Handle nested object changes
  const handleNestedChange = (parent, field) => value => {
    setProductDetails(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
    // Clear related error if nested field changes
    if (errors[parent]) setErrors(prev => ({...prev, [parent]: undefined}));
    if (errors[`${parent}${field.charAt(0).toUpperCase() + field.slice(1)}`]) {
      setErrors(prev => ({
        ...prev,
        [`${parent}${field.charAt(0).toUpperCase() + field.slice(1)}`]:
          undefined,
      }));
    }
  };

  // Handle array input changes (for return policy)

  const addReturnPolicy = () => {
    if (returnPolicyInput.trim() && productDetails.returnPolicy.length < 6) {
      setProductDetails(prev => ({
        ...prev,
        returnPolicy: [...prev.returnPolicy, returnPolicyInput.trim()],
      }));
      setReturnPolicyInput('');
    } else if (productDetails.returnPolicy.length >= 6) {
      // Alert.alert("Warning", "Maximum of 6 return policy terms allowed.");
    }
  };

  const removeReturnPolicy = index => {
    setProductDetails(prev => ({
      ...prev,
      returnPolicy: prev.returnPolicy.filter((_, i) => i !== index),
    }));
  };
  

  // Handle generic input changes
  const handleChange = (name, value) => {
    setProductDetails(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for the field being changed
    if (errors[name]) setErrors(prev => ({...prev, [name]: undefined}));
  };

  // Handle title input with alphanumeric validation
  const handleTitleChange = (value) => {
    // Allow only letters, numbers, and spaces
    const alphanumericRegex = /^[a-zA-Z0-9\s]*$/;
    
    if (alphanumericRegex.test(value) || value === '') {
      handleChange('title', value);
      // Clear any existing error
      if (errors.title) {
        setErrors(prev => ({...prev, title: undefined}));
      }
    } else {
      // Show error for invalid characters
      setErrors(prev => ({
        ...prev,
        title: 'Title can only contain letters and numbers'
      }));
    }
  };

  const handleCategoryChange = item => {
    setProductDetails(prev => ({
      ...prev,
      category: item.value,
      subcategory: '', // Reset subcategory when category changes
    }));
    setErrors(prev => ({
      ...prev,
      category: undefined,
      subcategory: undefined,
    }));
  };

  // Handle numeric input - whole numbers only
  const handleNumericInput = (name, value) => {
    // Allow empty string or whole numbers only (no decimal points)
    if (value === '' || /^\d*$/.test(value)) {
      handleChange(name, value);
    }else{
      Toast("Decimal values are not allowed for this field")
    }
  };

  // Handle price input - allows decimal numbers with max 2 decimal places
const handlePriceInput = (name, value) => {
  // Allow empty or numbers with max 2 decimals
  const priceRegex = /^\d*\.?\d{0,2}$/;

  // ❌ BLOCK invalid input immediately
  if (!priceRegex.test(value) && value !== '') {
    setErrors(prev => ({
      ...prev,
      [name]: 'Maximum 2 decimal places allowed for price fields'
    }));
    return; // ⛔ VERY IMPORTANT
  }

  // ✅ Valid input only reaches here
  handleChange(name, value);

  setErrors(prev => ({ ...prev, [name]: undefined }));

  const mrpValue = parseFloat(
    name === 'MRP' ? value : productDetails.MRP
  );
  const sellingValue = parseFloat(
    name === 'productPrice' ? value : productDetails.productPrice
  );

  if (
    !isNaN(mrpValue) &&
    !isNaN(sellingValue) &&
    sellingValue > mrpValue
  ) {
    setErrors(prev => ({
      ...prev,
      productPrice: 'Selling price must be ≤ MRP'
    }));
  }
};


  const handleImageChange = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
      selectionLimit:
        4 -
        productDetails.images.filter(
          img => img.status !== 'pending' && img.status !== 'uploading',
        ).length,
    };

    try {
      const result = await launchImageLibrary(options);
      if (result.didCancel) return;
      if (result.errorCode) {
        console.log('Error', 'Failed to select images');
        return;
      }

      const files = result.assets;
      if (files.length === 0) return;

      // Reset image error immediately
      setErrors(prev => ({...prev, images: undefined}));

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const invalidFiles = files.filter(
        file => !validTypes.includes(file.type),
      );
      if (invalidFiles.length > 0) {
        setErrors(prev => ({
          ...prev,
          images: 'Invalid file type(s). Only JPG, JPEG, PNG allowed.',
        }));
        return;
      }

      const newImages = files.map(file => ({
        preview: file.uri,
        blobName: null,
        azureUrl: null,
        status: 'pending',
        file,
      }));

      // Update productDetails state with placeholders
      setProductDetails(prev => ({
        ...prev,
        images: [...prev.images, ...newImages].slice(0, 4),
      }));

      setUploadingImages(true);

      const uploadPromises = newImages.map(async newImage => {
        try {
          setProductDetails(prev => ({
            ...prev,
            images: prev.images.map(img =>
              img.preview === newImage.preview
                ? {...img, status: 'uploading'}
                : img,
            ),
          }));

          const file = {
            uri: newImage.file.uri,
            name: newImage.file.fileName || `image_${Date.now()}.jpg`,
            type: newImage.file.type || 'image/jpeg',
            size: newImage.file.fileSize,
          };

          // console.log('file',file);

          // const sasResponse = await uploadFileToAzure(file,GENERATE_IMAGE_SAS_URL,);
          // const {blobName, azureUrl} = sasResponse;
          const url = await uploadImageToS3(newImage.file.uri, 'products');

          console.log('url', url);

          setProductDetails(prev => ({
            ...prev,
            images: prev.images.map(img =>
              img.preview === newImage.preview
                ? {
                    ...img,
                    key: url,
                    status: 'done',
                    preview: null,
                    file: null,
                    tempId: undefined,
                  }
                : img,
            ),
          }));
        } catch (error) {
          console.error('Upload failed:', error);
          setProductDetails(prev => ({
            ...prev,
            images: prev.images.map(img =>
              img.preview === newImage.preview
                ? {...img, status: 'error', file: null}
                : img,
            ),
          }));
          setErrors(prev => ({
            ...prev,
            images: 'Upload failed for one or more images.',
          }));
        }
      });

      await Promise.all(uploadPromises);

      const hasError = newImages.some(img =>
        productDetails.images.find(
          i => i.preview === img.preview && i.status === 'error',
        ),
      );
      if (!hasError) {
        setErrors(prev => ({...prev, images: undefined}));
      }

      setUploadingImages(false);
    } catch (error) {
      console.error('Image selection error:', error);
      setUploadingImages(false);
    }
  };

  const removeImage = async index => {
    const updatedImages = [...productDetails.images];
    const removed = updatedImages.splice(index, 1)[0];

    if (removed.key) {
      try {
        await deleteObjectFromS3(removed.key);
      } catch (error) {
        console.error('Failed to delete image from S3:', error);
        // Optional: handle error feedback here
      }
    }

    setProductDetails(prev => ({
      ...prev,
      images: updatedImages,
    }));

    if (errors.images) {
      setErrors(prev => ({...prev, images: undefined}));
    }
  };
  // console.log(productDetails.category,productDetails.subcategory)
  // Helper validation functions
  const isNumber = value =>
    value !== null &&
    value !== '' &&
    !isNaN(value) &&
    !isNaN(parseFloat(value));
  const isPositive = value => isNumber(value) && parseFloat(value) > 0;
  const isInteger = value => /^\d+$/.test(value);
  const isWholeNumber = value => /^\d+$/.test(value); // Only whole numbers, no decimals
  const hasMaxTwoDecimals = value => /^\d+(\.\d{1,2})?$/.test(value); // Max 2 decimal places

  // Form validation - validates all fields or specific step
  const validateAllFields = (stepToValidate = null) => {
    const newErrors = {};
    const {
      title,
      description,
      quantity,
      images,
      category,
      subcategory,
      sku,
      hsnNo,
      weight,
      dimensions,
      MRP,
      productPrice,
      gstRate,
      hazardousMaterials,
      logisticsType,
      deliveryCharge,
      estimatedDeliveryDate,
      isAuctionEnabled,
      startingPrice,
      reservedPrice,
      fssaiLicenseNo,
      bisCertification,
      warranty,
      hasReturn,
      returnDays,
    } = productDetails;
  

    const hasSellerGSTIN = productDetails.sellerGSTIN?.trim();

    // STEP 1 VALIDATION (Basic Information)
    if (stepToValidate === 1 || stepToValidate === null) {
      if (isFieldRequired("title") && !title.trim())
        newErrors.title = "Product title is required";
      else if (title.length > 150)
        newErrors.title = "Title must be less than 150 characters";

      if (isFieldRequired("description") && !description.trim())
        newErrors.description = "Product description is required";
      else if (description.length > 500)
        newErrors.description = "Description must be less than 500 characters";

      if (isFieldRequired("category") && !category)
        newErrors.category = "Category is required";
      if (isFieldRequired("subcategory") && !subcategory)
        newErrors.subcategory = "Subcategory is required";

      // Return policy validation
      // if (
      //   isFieldRequired("hasReturn") &&
      //   hasReturn &&
      //   (!isInteger(returnDays) || parseInt(returnDays) <= 0)
      // )
      //   newErrors.returnDays = "Valid return days required (>0)";
    }
    // STEP 2 VALIDATION (Images, Pricing, Stock, Variants)
    if (stepToValidate === 2 || stepToValidate === null) {
      // Image validation

      if (images.filter((img) => img.status === "done").length === 0)
        newErrors.images = "At least one image is required";
      if (images.some(img => img.status === 'uploading'))
        newErrors.images = 'Wait for image uploads to finish';
      if (images.some(img => img.status === 'error'))
        newErrors.images = 'Fix image upload errors before submitting';

      // Pricing validation
      if (isFieldRequired("MRP") && !isPositive(MRP))
        newErrors.MRP = "MRP must be greater than 0";
      if (isFieldRequired("productPrice") && !isPositive(productPrice))
        newErrors.productPrice = "Selling price must be greater than 0";
      if (
        isNumber(MRP) &&
        isNumber(productPrice) &&
        parseFloat(productPrice) > parseFloat(MRP)
      )
        newErrors.productPrice = "Selling price must be ≤ MRP";

      // GST validation (when seller has GSTIN)
      // if (hasSellerGSTIN && isFieldRequired("gstRate") && !isNumber(gstRate))
      //   newErrors.gstRate = "GST Rate is required with GSTIN";
      // console.log("THIS ONE ECV")
      // SKU validation
      if (isFieldRequired("sku") && !sku.trim())
        newErrors.sku = "SKU is required";
      
      // HSN validation - optional field, only validate format if provided
      if (hsnNo.trim() && !/^\d{4,8}$/.test(hsnNo))
        newErrors.hsnNo = "HSN No should be 4 to 8 digits";
      
      // console.log("THIS ONE ECV",newErrors)
      // Quantity validation (when variants not enabled OR editing a child variant)
      if (!variantData?.enabled || data?.isVariant === true) {
        if (isFieldRequired("quantity") && !isInteger(quantity))
          newErrors.quantity = "Valid quantity is required";
      }
    

      // Hazardous materials validation
      // Auction validation (when auction is enabled)
      if (isAuctionEnabled) {
        if (!isPositive(startingPrice))
          newErrors.startingPrice = "Starting bid is required";
        if (
          isNumber(reservedPrice) &&
          isNumber(startingPrice) &&
          parseFloat(reservedPrice) < parseFloat(startingPrice)
        )
          newErrors.reservedPrice = "Reserve price must be ≥ starting price";
        else if (!isPositive(reservedPrice))
          newErrors.reservedPrice = "Reserved price is required";
      }

      // Variant validation (skip for child variants)
      if (data?.isVariant !== true) {
        if (variantData?.enabled && !variantData?.isValid) {
          newErrors.variants = "Please complete all variant configurations";
        }
      }
    }

    // STEP 3 VALIDATION (Courier & Shipping)
    if (stepToValidate === 3 || stepToValidate === null) {
      // Weight validation - must be whole number only
      if (isFieldRequired("weight")) {
        if (!weight.value || !weight.value.trim()) {
          newErrors.weight = "Item weight is required";
        } else if (!isWholeNumber(weight.value)) {
          newErrors.weight = "Weight must be a whole number (no decimals allowed)";
        } else if (parseInt(weight.value) <= 0) {
          newErrors.weight = "Weight must be greater than 0";
        }
      } else if (weight.value && weight.value.trim()) {
        // Optional field validation
        if (!isWholeNumber(weight.value)) {
          newErrors.weight = "Weight must be a whole number (no decimals allowed)";
        } else if (parseInt(weight.value) <= 0) {
          newErrors.weight = "Weight must be greater than 0";
        }
      }

      // Dimensions validation - max 2 decimal places
      if (isFieldRequired("dimensions")) {
        if (!dimensions.length || !dimensions.width || !dimensions.height) {
          newErrors.dimensions = "All dimensions (L, W, H) are required";
        } else {
          // Validate format - max 2 decimal places
          const lengthValid = hasMaxTwoDecimals(dimensions.length) && parseFloat(dimensions.length) > 0;
          const widthValid = hasMaxTwoDecimals(dimensions.width) && parseFloat(dimensions.width) > 0;
          const heightValid = hasMaxTwoDecimals(dimensions.height) && parseFloat(dimensions.height) > 0;
          
          if (!lengthValid || !widthValid || !heightValid) {
            newErrors.dimensions = "Dimensions must be positive numbers with max 2 decimal places";
          }
        }
      } else if (dimensions.length || dimensions.width || dimensions.height) {
        // Validate format if optionally entered (any dimension)
        if (!dimensions.length || !dimensions.width || !dimensions.height) {
          newErrors.dimensions = "If any dimension is entered, all (L, W, H) are required";
        } else {
          const lengthValid = hasMaxTwoDecimals(dimensions.length) && parseFloat(dimensions.length) > 0;
          const widthValid = hasMaxTwoDecimals(dimensions.width) && parseFloat(dimensions.width) > 0;
          const heightValid = hasMaxTwoDecimals(dimensions.height) && parseFloat(dimensions.height) > 0;
          
          if (!lengthValid || !widthValid || !heightValid) {
            newErrors.dimensions = "Dimensions must be positive numbers with max 2 decimal places";
          }
        }
      }
      
      if (isFieldRequired("hazardousMaterials") && !hazardousMaterials)
        newErrors.hazardousMaterials = "Hazardous materials declaration is required";


      // Logistics validation
      if (isFieldRequired("logisticsType") && !logisticsType)
        newErrors.logisticsType = "Logistics type is required";

      // Delivery charge validation
      if (isFieldRequired("deliveryCharge") && !isNumber(deliveryCharge))
        newErrors.deliveryCharge = "Valid delivery charge is required";

      // Estimated delivery validation
      if (
        isFieldRequired("estimatedDeliveryDate") &&
        (!isInteger(estimatedDeliveryDate) || parseInt(estimatedDeliveryDate) <= 0)
      )
        newErrors.estimatedDeliveryDate = "Valid delivery days required";
    }

    // STEP 4 VALIDATION (Other Details - Compliance, Warranty, Settings)
    if (stepToValidate === 4 || stepToValidate === null) {
      // FSSAI validation
      if (isFieldRequired("fssaiLicenseNo") && !fssaiLicenseNo.trim())
        newErrors.fssaiLicenseNo = "FSSAI license is required";

      // BIS certification validation
      if (isFieldRequired("bisCertification") && !bisCertification.trim())
        newErrors.bisCertification = "BIS certification is required";

      // Warranty validation
      if (
        isFieldRequired("warranty") &&
        warranty.hasWarranty &&
        !warranty.duration.trim()
      )
        newErrors.warrantyDuration = "Warranty duration is required";

      // Return days validation for step 4
      if (
        shouldRenderField("hasReturn") &&
        hasReturn &&
        (!returnDays || !isInteger(returnDays) || parseInt(returnDays) <= 0)
      )
        newErrors.returnDays = "Valid return days required (>0)";
    }
console.log(newErrors,"NEW ERRORS")
    return newErrors;
  };
// console.log(errors)
  // Validate current step only
  const validateForm = () => {
    // console.log("CaLLCULATING")
    const newErrors = validateAllFields(currentStep);
  // console.log("ERRROS",newErrors)
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
const handleSubmit = async () => {
  // Validate form before proceeding
  if (!validateForm()) {
    ToastAndroid.show(
      'Please fill required fields in the form',
      ToastAndroid.SHORT,
    );
    return;
  }

  const successfulImages = productDetails.images.filter(
    img => img.status === 'done',
  );

  // Only validate images if we're past step 2
  if (currentStep >= 2) {
    const pendingUploads = productDetails.images.some(
      img => img.status === 'uploading',
    );
    if (pendingUploads) {
      setErrors(prev => ({
        ...prev,
        images: 'Please wait for all images to upload before submitting.',
      }));
      ToastAndroid.show(
        'Image uploads are still in progress.',
        ToastAndroid.SHORT,
      );
      return;
    }

    const errorUploads = productDetails.images.some(
      img => img.status === 'error',
    );
    if (errorUploads) {
      setErrors(prev => ({
        ...prev,
        images: 'Some images failed to upload. Please remove or retry them.',
      }));
      ToastAndroid.show(
        'Cannot submit with image upload errors.',
        ToastAndroid.SHORT,
      );
      return;
    }

    if (successfulImages.length === 0) {
      setErrors(prev => ({
        ...prev,
        images: 'At least one image must be successfully uploaded.',
      }));
      ToastAndroid.show(
        'Please upload at least one product image.',
        ToastAndroid.SHORT,
      );
      return;
    }
  }

  // If not on final step, move to next step
  if (currentStep < 4) {
    setCurrentStep(currentStep + 1);
    return;
  }

  // Validate variants if enabled
  const hasVariants = variantData.enabled && variantData.variants.length > 0;
  if (hasVariants && !variantData.isValid) {
    ToastAndroid.show(
      'Please complete all variant fields before submitting',
      ToastAndroid.SHORT,
    );
    return;
  }

  setSubmitting(true);

  try {
    console.log("product details ===",productDetails)
    // Prepare parent product payload
    const parentProductPayload = {
      title: productDetails.title,
      description: productDetails.description,
      quantity: hasVariants ? 0 : Number(productDetails.quantity),
      category: productDetails.category,
      subcategory: productDetails.subcategory,
      sku: productDetails.sku,
      hsnNo: productDetails.hsnNo || null,
      MRP: parseFloat(productDetails.MRP),
      productPrice: parseFloat(productDetails.productPrice),
      startingPrice: productDetails.isAuctionEnabled && productDetails.startingPrice
        ? parseFloat(productDetails.startingPrice)
        : 0,
      reservedPrice: productDetails.isAuctionEnabled && productDetails.reservedPrice
        ? parseFloat(productDetails.reservedPrice)
        : 0,
      commissionRate: productDetails.allowDropshipping && productDetails.commissionRate
        ? parseFloat(productDetails.commissionRate)
        : null,
      gstRate: productDetails.gstRate ? parseFloat(productDetails.gstRate) : null,
      brand: productDetails.brand || null,
      manufacturer: productDetails.manufacturer || null,
      manufacturerAddress: productDetails.manufacturerAddress || null,
      countryOfOrigin: productDetails.countryOfOrigin || null,
      netQuantity: productDetails.netQuantity || null,
      packagingType: productDetails.packagingType || null,
      weight: {
        value: parseFloat(productDetails.weight.value),
        unit: productDetails.weight.unit,
      },
      dimensions: {
        length: parseFloat(productDetails.dimensions.length),
        width: parseFloat(productDetails.dimensions.width),
        height: parseFloat(productDetails.dimensions.height),
      },
      images: successfulImages.map(({key}) => ({key})),
      expiryDate: productDetails.expiryDate || null,
      batchNumber: productDetails.batchNumber || null,
      shelfLife: productDetails.shelfLife || null,
      sellerName: productDetails.sellerName,
      sellerContact: productDetails.sellerContact,
      sellerGSTIN: productDetails.sellerGSTIN,
      returnPolicy: productDetails.returnPolicy,
      warranty: {
        hasWarranty: productDetails.warranty.hasWarranty,
        duration: productDetails.warranty.hasWarranty
          ? productDetails.warranty.duration
          : null,
      },
      fssaiLicenseNo: productDetails.fssaiLicenseNo || null,
      bisCertification: productDetails.bisCertification || null,
      importerName: productDetails.importerName || null,
      importerAddress: productDetails.importerAddress || null,
      importerGSTIN: productDetails.importerGSTIN || null,
      eWasteCompliance: productDetails.eWasteCompliance,
      recyclablePackaging: productDetails.recyclablePackaging,
      hazardousMaterials: productDetails.hazardousMaterials,
      allowDropshipping: productDetails.allowDropshipping,
      isActive: productDetails.isActive,
      hasReturn: Boolean(productDetails.hasReturn),
      returnDays: productDetails.hasReturn && productDetails.returnDays
        ? Number(productDetails.returnDays)
        : null,
      size: productDetails.size || null,
      auctionEnabled: productDetails.isAuctionEnabled || false,
      logisticsType: productDetails.logisticsType,
      deliveryCharge: parseFloat(productDetails.deliveryCharge) || 0,
      estimatedDeliveryDate: parseInt(productDetails.estimatedDeliveryDate) || 0,
      reserveForLive: productDetails.reserveForLive,
    };

    // // Clean up conditional fields
    // if (!parentProductPayload.hasReturn) {
    //   delete parentProductPayload.returnDays;
    // }
    // if (!parentProductPayload.auctionEnabled) {
    //   delete parentProductPayload.startingPrice;
    //   delete parentProductPayload.reservedPrice;
    // }
    // if (!parentProductPayload.allowDropshipping) {
    //   delete parentProductPayload.commissionRate;
    // }
    // if (!parentProductPayload.warranty.hasWarranty) {
    //   delete parentProductPayload.warranty.duration;
    // }

    let res;
    const isEditMode = data && data._id; // Check if we're in edit mode

    if (isEditMode) {
      // ============ EDIT MODE ============
      if (hasVariants) {
        // Edit with variants
        const formattedVariants = variantData.variants.map(v => ({
          id: v.id && typeof v.id === 'string' && v.id.match(/^[0-9a-fA-F]{24}$/) 
            ? v.id 
            : undefined,
          title: v.title,
          sku: v.sku,
          quantity: Number(v.quantity),
          MRP: parseFloat(v.MRP),
          productPrice: parseFloat(v.productPrice),
          variantAttributes: v.variantAttributes,
          images: v.images
            .filter(img => img.status === 'done')
            .map(img => ({key: img.key}))
        }));

        const variantPayload = {
          parentProduct: parentProductPayload,
          variants: formattedVariants,
          deletedVariantIds: variantData.deletedVariantIds || []
        };

        // console.log('Updating product with variants:', variantPayload);
        // console.log('Deleted variant IDs:', variantData.deletedVariantIds);

        res = await axiosInstance.put(
          `/product/listing/${data._id}/with-variants`,
          variantPayload
        );
        
        // console.log('Response received:', res);
        // console.log('Response status:', res?.status);
        console.log('Response data:', res?.data);
      } else {
        // Edit without variants
        console.log('Updating product:', parentProductPayload);
        
        res = await axiosInstance.put(
          `/product/listing/${data._id}`,
          parentProductPayload
        );
      }

      ToastAndroid.show(
        res.data.message || 'Product updated successfully!',
        ToastAndroid.SHORT,
      );
    } else {
      // ============ CREATE MODE ============
      if (hasVariants) {
        // Create with variants
        const parentImageKeys = new Set(
          productDetails.images
            .filter(img => img.status === 'done' && img.key)
            .map(img => img.key)
        );

        const variantsPayload = variantData.variants.map(v => {
          let variantImages = v.images.filter(img => img.status === 'done');

          // Exclude parent images for color variants
          if (v.requiresNewImage) {
            variantImages = variantImages.filter(
              img => !parentImageKeys.has(img.key)
            );
          }

          return {
            title: v.title,
            sku: v.sku,
            quantity: Number(v.quantity),
            MRP: parseFloat(v.MRP),
            productPrice: parseFloat(v.productPrice),
            variantAttributes: v.variantAttributes,
            images: variantImages.map(({key}) => ({key}))
          };
        });

        console.log('Creating product with variants:', {
          parentProduct: parentProductPayload,
          variants: variantsPayload
        });

        res = await axiosInstance.post('/product/listing/with-variants', {
          parentProduct: parentProductPayload,
          variants: variantsPayload
        });
      } else {
        // Create without variants
        console.log('Creating product:', parentProductPayload);
        
        res = await axiosInstance.post(
          '/product/listing',
          parentProductPayload
        );
      }

      ToastAndroid.show(
        res.data.message || 'Product created successfully!',
        ToastAndroid.SHORT,
      );
    }

    // Success - clean up and navigate back
    clearDraft();
    setCurrentStep(1);
    setProductDetails(initialProductDetails);
    navigation.goBack();

  } catch (error) {
    // console.log('=== ERROR CAUGHT ===');
    // console.log('Full error object:', JSON.stringify(error, null, 2));
    // console.log('Error response:', error.response);
    console.log('Error response data:', error.response?.data);
    // console.log('Error message:', error.message);
    // console.log('Error stack:', error.stack);
    // console.log('===================');
    
    const errorMessage = error.response?.data?.message ||
      error.message ||
      'An error occurred during submission. Please try again.';
    
    console.log('Showing toast with message:', errorMessage);
    
    ToastAndroid.show(errorMessage, ToastAndroid.LONG);
  } finally {
    console.log('Finally block - setting submitting to false');
    setSubmitting(false);
  }
};
  const clearDraft = async () => {
    try {
      await axiosInstance.delete('/product/listing/draft');
      setHasDraft(false);
      setProductDetails(initialProductDetails);
      setErrors({});
      setCurrentStep(1)
    } catch (error) {
      console.log('Error clearing draft:', error);
      // negative("Failed to clear draft");
    }
  };


  const getHazardousMessage = value => {
    switch (value) {
      case 'no hazardous materials':
        return 'No hazardous materials → Safe for standard shipping.';
      case 'fragrances':
        return 'Fragrances → May require special handling or ground shipping.';
      case 'lithium batteries':
        return 'Lithium batteries → Requires special handling and labeling due to regulations.';
      case 'other hazardous materials':
        return 'Other hazardous materials → Ensure compliance with shipping regulations for specified materials.';
      default:
        return '';
    }
  };

  // Prepare category data for dropdown
  const allowedCategories = sellerCategories
  const selectedCategoryObj = allowedCategories.find(
    cat => cat.categoryName === productDetails.category,
  );
  const categoryData = allowedCategories.map(cat => ({
    label: cat.categoryName,
    value: cat.categoryName,
  }));
  // console.log( user?.sellerInfo?.productCategories||user)
  // Prepare subcategory data for dropdown
  const subcategoryData =
    selectedCategoryObj?.subcategories?.map(sub => ({
      label: sub.name,
      value: sub.name,
    })) || [];
  // console.log(data.images)
    const hasVariants = data?.childVariantIds && 
                         Array.isArray(data?.childVariantIds) && 
                         data?.childVariantIds?.length > 0;
    useEffect(() => {
    const loadExistingVariants = async () => {
      if (!data?._id) return;
      
      // Check if product has variants (childVariantIds exists and is not empty)
    
      
      if (!hasVariants) return;
      
      // setLoadingVariants(true);
      try {
        const response = await axiosInstance.get(`product/listing/${data._id}/with-variants`);
        
        if (response.data.status && response.data.data) {
          const { variants: existingVariants } = response.data.data;
          
          if (existingVariants && existingVariants.length > 0) {
            // Transform backend variants to frontend format
            const formattedVariants = existingVariants.map(v => ({
              id: v._id,
              title: v.title,
              sku: v.sku,
              quantity: v.stockId?.quantity?.toString() || "0",
              MRP: v.MRP?.toString() || "",
              productPrice: v.productPrice?.toString() || "",
              variantAttributes: v.variantAttributes || {},
              images: v.images?.map(img => ({
                key: img.key,
                preview: img.jpgURL || `${AWS_CDN_URL}${img.key}`,
                status: "done",
                file: null
              })) || [],
              requiresNewImage: false // Existing variants already have images
            }));
            
            // Reconstruct variantAttributes from existing variants
            const attributesMap = new Map();
            formattedVariants.forEach(variant => {
              Object.entries(variant.variantAttributes).forEach(([key, value]) => {
                if (!attributesMap.has(key)) {
                  attributesMap.set(key, new Set());
                }
                attributesMap.get(key).add(value);
              });
            });
            
            // Convert to the format expected by ProductVariantManager
            const reconstructedAttributes = Array.from(attributesMap.entries()).map(([key, valuesSet], index) => ({
              id: Date.now() + index,
              name: key,
              label: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
              enabled: true,
              values: Array.from(valuesSet),
              valueInput: ''
            }));
            
            const variantDataToSet = {
              enabled: true,
              variants: formattedVariants,
              variantAttributes: reconstructedAttributes,
              isValid: true
            };
            
            // console.log('📊 Setting variantData in EditProductListing:', variantDataToSet);
            // console.log('📊 reconstructedAttributes:', reconstructedAttributes);
            
            setVariantData(variantDataToSet);
            
            // positive(`Loaded ${formattedVariants.length} existing variant(s) with ${reconstructedAttributes.length} attribute(s)`);
          }
        }
      } catch (error) {
        console.error("Error loading variants:", error);
        // negative("Failed to load existing variants");
      } finally {
        // setLoadingVariants(false);
      }
    };
    
    loadExistingVariants();
  }, [data?._id])
const setData = async () => {
    // console.log(data,"FROM SET DATAA")
    if (data) {
      // ✅ Determine if auction should be enabled based on existing auction prices
      const hasAuctionPrices = !!(data.startingPrice && data.reservedPrice);
      const shouldEnableAuction = data.isAuctionEnabled || hasAuctionPrices;
      
      // Only set variantData if it exists (won't exist for child variants)
      if (data.variantData) {
        setVariantData(data.variantData);
      } else if (data.isVariant) {
        // For child variants, ensure variantData is disabled
        setVariantData({
          enabled: false,
          variants: [],
          isValid: true
        });
      }
      // console.log("DATA",data.Variants)
      setProductDetails({
        title: data.title || '',
        description: data.description || '',
        quantity: data.quantity?.toString() || '',
        images: (data.images || []).map(img => ({
          preview: null,
          status: 'done',
          key: img.key,
        })),
        category: data.category || '',
        subcategory: data.subcategory || '',
        hsnNo: data.hsnNo?.toString() || '',
        MRP: data.MRP?.toString() || '',
        productPrice: data.productPrice?.toString() || '',
        startingPrice: data.startingPrice?.toString() || '',
        reservedPrice: data.reservedPrice?.toString() || '',
        commissionRate: data.commissionRate?.toString() || '',
        brand: data.brand || '',
        manufacturer: data.manufacturer || '',
        manufacturerAddress: data.manufacturerAddress || '',
        countryOfOrigin: data.countryOfOrigin || '',
        netQuantity: data.netQuantity?.toString() || '',
        packagingType: data.packagingType || '',
        reserveForLive:data.reserveForLive || false,
        weight: {
          value: data.weight?.value?.toString() || '',
          unit: data.weight?.unit || 'grams',
        },
        dimensions: {
          length: data.dimensions?.length?.toString() || '',
          width: data.dimensions?.width?.toString() || '',
          height: data.dimensions?.height?.toString() || '',
        },
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : new Date(),
        shelfLife: data.shelfLife || '',
        batchNumber: data.batchNumber || '',
        gstRate: data.gstRate?.toString() || '',
        sellerName: data.sellerName || '',
        sellerContact: data.sellerContact || '',
        sellerGSTIN: data.sellerGSTIN?.toString() || '',
        returnPolicy: data.returnPolicy || [],
        warranty: {
          hasWarranty: data.warranty?.hasWarranty || false,
          duration: data.warranty?.duration || '',
        },
        fssaiLicenseNo: data.fssaiLicenseNo || '',
        bisCertification: data.bisCertification || '',
        importerName: data.importerName || '',
        importerAddress: data.importerAddress || '',
        importerGSTIN: data.importerGSTIN?.toString() || '',
        eWasteCompliance: data.eWasteCompliance || false,
        recyclablePackaging: data.recyclablePackaging || false,
        hazardousMaterials: data.hazardousMaterials || '',
        allowDropshipping: data.allowDropshipping || false,
        isActive: data.isActive ?? true,
        // ✅ Enable auction if prices exist or it was previously enabled
        isAuctionEnabled: shouldEnableAuction,
        
        logisticsType: data.logisticsType || null, //"flykupLogistics",
   estimatedDeliveryDate: data?.estimatedDeliveryDate || null,
   deliveryCharge: data?.deliveryCharge || null,

      });
    }
  };
  // ✅ Now call setData inside useEffect
  // Add this at the top of your component
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Your existing useEffect logic here
    setData();
  }, [data]);
  const handleGoBackAdvanced = useDebouncedGoBack(() => {
    showModal({
      title: 'Unsaved Changes',
      content:
        'You have modified your product selection. Save changes before leaving?',
      mode: 'normal',
      confirmText: 'Continue',
      showIcon: false,
      onConfirm: async () => {
        // Your warning action logic here
        await performGoBack();
      },
    });
    // const hasChanges = true

    // let title, message, buttons;

    // // if (isEditMode && hasChanges) {
    //   title = "Unsaved Changes";
    //   message = "You have modified your product selection. Save changes before leaving?";
    //   buttons = [
    //     { text: "Cancel", style: "cancel" },

    //     {
    //       text: "Confim",
    //       onPress: () => {
    //         // onSelectProducts(selectedProducts);
    //         // setIsChangesMade(false);
    //         performGoBack();
    //       }
    //     }
    //   ];
    // // }

    // Alert.alert(title, message, buttons);
  });
  const performGoBack = () => {
    navigation.goBack();
  };
  const checkSkuAvailability = async sku => {
    // console.log(sku, 'checking sku');
    if (!sku.trim()) {
      setSkuAvailable(null);
      return;
    }

    setCheckingSku(true);
    try {
      const response = await axiosInstance.get(
        `product/listing/check-sku/${encodeURIComponent(sku)}`,
      );
      setSkuAvailable(response.data.available);

      if (!response.data.available) {
        setErrors(prev => ({...prev, sku: 'This SKU is already in use'}));
      } else {
        setErrors(prev => ({...prev, sku: undefined}));
      }
    } catch (error) {
      console.error('Error checking SKU:', error);
    } finally {
      setCheckingSku(false);
    }
  };
  const generateSKU = () => {
    const prefix = 'SKU';
    const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  useEffect(() => {
    if (!productDetails.sku) {
      const newSKU = generateSKU();
      setProductDetails(prev => ({
        ...prev,
        sku: newSKU,
      }));

      checkSkuAvailability(newSKU);
    }
  }, [productDetails.category, productDetails.subcategory]);
  useEffect(() => {
    if (productDetails.sku) {
      const delayDebounceFn = setTimeout(() => {
        checkSkuAvailability(productDetails.sku);
      }, 500); // Debounce time of 500ms
      return () => clearTimeout(delayDebounceFn);
    }
  }, [productDetails.sku]);
  // console.log(errors)
    // Update required fields when category changes
  
  
  const renderStep = () => {
    if (currentStep == 1)
      return (
        <View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Info size={20} color="#fff" />
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>

            {/* Category Dropdown */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Category *</Text>
              <Dropdown
                style={[styles.dropdown, errors.category && styles.inputError]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                data={categoryData}
                itemTextStyle={{color: '#fff'}}
                containerStyle={{
                  marginBottom: 10,
                  backgroundColor: '#212121',
                  borderColor: '#EFBB16',
                  borderWidth: 1,
                  borderRadius: 10,
                }}
                activeColor="#333"
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select Category"
                searchPlaceholder="Search..."
                value={productDetails.category}
                onChange={handleCategoryChange}
                renderLeftIcon={() => (
                  <Box size={20} color="#EEFB" style={styles.icon} />
                )}
              />
              {errors.category && (
                <Text style={styles.errorText}>{errors.category}</Text>
              )}
            </View>

            {/* Subcategory Dropdown */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Subcategory *</Text>
              <Dropdown
                style={[
                  styles.dropdown,
                  errors.subcategory && styles.inputError,
                  !productDetails.category && styles.disabledDropdown,
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                itemTextStyle={{color: '#fff'}}
                containerStyle={{
                  marginBottom: 10,
                  backgroundColor: '#212121',
                  borderColor: '#EFBB16',
                  borderWidth: 1,
                  borderRadius: 10,
                }}
                activeColor="#333"
                data={subcategoryData}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select Subcategory"
                searchPlaceholder="Search..."
                value={productDetails.subcategory}
                onChange={item => handleChange('subcategory', item.value)}
                disable={!productDetails.category}
                renderLeftIcon={() => (
                  <Box size={20} color="#6B7280" style={styles.icon} />
                )}
              />
              {errors.subcategory && (
                <Text style={styles.errorText}>{errors.subcategory}</Text>
              )}
            </View>
            {/* Title */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={productDetails.title}
                placeholderTextColor={'#9CA3AF'}
                onChangeText={handleTitleChange}
                placeholder="Enter product title (letters and numbers only)"
                maxLength={150}
              />
              <Text style={styles.characterCount}>
                {productDetails.title.length}/150
              </Text>
              {errors.title && (
                <Text style={styles.errorText}>{errors.title}</Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[
                  styles.textArea,
                  errors.description && styles.inputError,
                ]}
                value={productDetails.description}
                onChangeText={text => handleChange('description', text)}
                placeholder="Detailed description of the product"
                placeholderTextColor={'#9CA3AF'}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {productDetails.description.length}/500
              </Text>
              {errors.description && (
                <Text style={styles.errorText}>{errors.description}</Text>
              )}
            </View>

            {/* Quantity and HSN */}
            {/* <View style={styles.row}> */}
              
              {/* {shouldRenderField('hsnNo') || productDetails.subcategory=='Audio Devices' || productDetails.subcategory=='Smart Devices (Watches, Home Automation)' && ( */}

              {/* )} */}
            {/* </View> */}

            {/* <View style={styles.row}>
              {shouldRenderField('size') && (
                <View
                  style={[styles.inputContainer, {flex: 1, marginRight: 8}]}>
                  <Text style={styles.label}>
                    Size {getLabelSuffix('size')}
                  </Text>
                  <TextInput
                    style={[styles.input, errors.size && styles.inputError]}
                    value={productDetails.size}
                    onChangeText={text => handleChange('size', text)}
                    placeholder="Enter Size"
                    placeholderTextColor={'#9CA3AF'}
                    // keyboardType="numeric"
                  />
                  {errors.size && (
                    <Text style={styles.errorText}>{errors.size}</Text>
                  )}
                </View>
              )}
              {shouldRenderField('hasReturn') && (
                <View style={[styles.inputContainer, {flex: 1}]}>
                  <Text style={styles.label}>
                    Return Policy
                  </Text>

                  <TouchableOpacity
                    style={styles.row}
                    onPress={() =>
                      handleChange('hasReturn', !productDetails.hasReturn)
                    }>
                    <RadioButton
                      value={'second'}
                      color="#f7ce45"
                      status={
                        productDetails?.hasReturn ? 'checked' : 'unchecked'
                      }
                      onPress={() =>
                        handleChange('hasReturn', !productDetails.hasReturn)
                      }
                    />
                    <Text className="text-white">Allow returns?</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View> */}
            {/* {productDetails.hasReturn && (
             
            )} */}
          </View>

         


          {/* Product Specifications Section */}
          {/* {(shouldRenderField('brand') ||
            shouldRenderField('manufacturer') ||
            shouldRenderField('manufacturerAddress') ||
            shouldRenderField('countryOfOrigin') ||
            shouldRenderField('netQuantity') ||
            shouldRenderField('weight') ||
            shouldRenderField('dimensions') ||
            shouldRenderField('packagingType') ||
            shouldRenderField('shelfLife') ||
            shouldRenderField('expiryDate') ||
            shouldRenderField('batchNumber') ||
            showImporterFields) && ( // Show section if any spec field should render OR importer fields needed
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ClipboardList size={20} color="#7C3AED" />
                <Text style={styles.sectionTitle}>Product Specifications</Text>
              </View>

              <View style={styles.row}>
                {shouldRenderField('brand') && (
                  <View
                    style={[styles.inputContainer, {flex: 1, marginRight: 8}]}>
                    <Text style={styles.label}>Brand *</Text>
                    <TextInput
                      style={[styles.input, errors.brand && styles.inputError]}
                      value={productDetails.brand}
                      onChangeText={text => handleChange('brand', text)}
                      placeholder="e.g., Nike, Samsung"
                      autoComplete="off"
                      importantForAutofill="no"
                      textContentType="none"
                      maxLength={50}
                      placeholderTextColor={'#9CA3AF'}
                    />
                    {errors.brand && (
                      <Text style={styles.errorText}>{errors.brand}</Text>
                    )}
                  </View>
                )}

                {shouldRenderField('manufacturer') && (
                  <View style={[styles.inputContainer, {flex: 1}]}>
                    <Text style={styles.label}>Manufacturer *</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.manufacturer && styles.inputError,
                      ]}
                      value={productDetails.manufacturer}
                      onChangeText={text => handleChange('manufacturer', text)}
                      placeholder="Manufacturer name"
                      maxLength={100}
                      placeholderTextColor={'#9CA3AF'}
                    />
                    {errors.manufacturer && (
                      <Text style={styles.errorText}>
                        {errors.manufacturer}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {shouldRenderField('manufacturerAddress') && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Manufacturer Address *</Text>
                  <TextInput
                    style={[
                      styles.textArea,
                      errors.manufacturerAddress && styles.inputError,
                    ]}
                    value={productDetails.manufacturerAddress}
                    onChangeText={text =>
                      handleChange('manufacturerAddress', text)
                    }
                    placeholder="Full address of the manufacturer"
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                    placeholderTextColor={'#9CA3AF'}
                  />
                  {errors.manufacturerAddress && (
                    <Text style={styles.errorText}>
                      {errors.manufacturerAddress}
                    </Text>
                  )}
                </View>
              )}

              {(shouldRenderField('countryOfOrigin') ||
                shouldRenderField('netQuantity')) && (
                <View style={styles.row}>
                  {shouldRenderField('countryOfOrigin') && (
                    <View
                      style={[
                        styles.inputContainer,
                        {flex: 1, marginRight: 8},
                      ]}>
                      <Text style={styles.label}>Country of Origin *</Text>
                      <Dropdown
                        style={[
                          styles.dropdown,
                          errors.countryOfOrigin && styles.inputError,
                        ]}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        inputSearchStyle={styles.inputSearchStyle}
                        iconStyle={styles.iconStyle}
                        activeColor="#333"
                        // selectedTextStyle={{color: '#fff'}}
                        itemTextStyle={{color: '#fff'}}
                        containerStyle={{
                          marginBottom: 10,
                          backgroundColor: '#212121',
                          borderColor: '#EFBB16',
                          borderWidth: 1,
                          borderRadius: 10,
                        }}
                        data={options}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        search
                        searchPlaceholder="Search"
                        searchPlaceholderTextColor="#ccc"
                        // searchField={'Search'}
                        placeholder="Select country"
                        value={productDetails.countryOfOrigin}
                        onChange={item =>
                          handleChange('countryOfOrigin', item.value)
                        }
                        renderLeftIcon={() => (
                          <Search
                            size={20}
                            color="#6B7280"
                            style={styles.icon}
                          />
                        )}
                      />
                      {errors.countryOfOrigin && (
                        <Text style={styles.errorText}>
                          {errors.countryOfOrigin}
                        </Text>
                      )}
                    </View>
                  )}

                  {shouldRenderField('netQuantity') && (
                    <View style={[styles.inputContainer, {flex: 1}]}>
                      <Text style={styles.label}>Net Quantity *</Text>
                      <TextInput
                        style={[
                          styles.input,
                          errors.netQuantity && styles.inputError,
                        ]}
                        value={productDetails.netQuantity}
                        onChangeText={text => handleChange('netQuantity', text)}
                        placeholder="e.g., 500g, 1 Piece"
                        placeholderTextColor={'#9CA3AF'}
                        maxLength={20}
                      />
                      {errors.netQuantity && (
                        <Text style={styles.errorText}>
                          {errors.netQuantity}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              {(shouldRenderField('expiryDate') ||
                shouldRenderField('batchNumber')) && (
                <View style={styles.row}>
                  {shouldRenderField('expiryDate') && (
                    <View
                      style={[
                        styles.inputContainer,
                        {flex: 1, marginRight: 8},
                      ]}>
                      <Text style={styles.label}>
                        Expiry Date (if applicable)
                      </Text>
                      <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => {
                          setShow(true);
                        }}>
                        <Text
                          style={
                            productDetails.expiryDate
                              ? styles.dateText
                              : styles.placeholderText
                          }>
                          {productDetails?.expiryDate
                            ? productDetails?.expiryDate.toLocaleDateString()
                            : 'Select date'}
                        </Text>
                        <CalendarDays size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {shouldRenderField('batchNumber') && (
                    <View style={[styles.inputContainer, {flex: 1}]}>
                      <Text style={styles.label}>Batch Number (Optional)</Text>
                      <TextInput
                        style={styles.input}
                        value={productDetails.batchNumber}
                        onChangeText={text => handleChange('batchNumber', text)}
                        placeholder="Enter batch number"
                        placeholderTextColor={'#9CA3AF'}
                      />
                    </View>
                  )}
                </View>
              )}

              {(shouldRenderField('packagingType') ||
                shouldRenderField('shelfLife')) && (
                <>
                  {/* Packaging Type Dropdown 
                  {shouldRenderField('packagingType') && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Packaging Type *</Text>
                      <Dropdown
                        style={[
                          styles.dropdown,
                          errors.packagingType && styles.inputError,
                        ]}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.selectedTextStyle}
                        inputSearchStyle={styles.inputSearchStyle}
                        iconStyle={styles.iconStyle}
                        activeColor="#333"
                        // selectedTextStyle={{color: '#fff'}}
                        itemTextStyle={{color: '#fff'}}
                        containerStyle={{
                          marginBottom: 10,
                          backgroundColor: '#212121',
                          borderColor: '#EFBB16',
                          borderWidth: 1,
                          borderRadius: 10,
                        }}
                        data={[
                          {label: 'Box', value: 'Box'},
                          {label: 'Bag', value: 'Bag'},
                          {label: 'Bottle', value: 'Bottle'},
                          {label: 'Pouch', value: 'Pouch'},
                          {label: 'Wrapper', value: 'Wrapper'},
                          {label: 'Tube', value: 'Tube'},
                          {label: 'Blister Pack', value: 'Blister Pack'},
                          {label: 'Other', value: 'Other'},
                        ]}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder="Select package type"
                        value={productDetails.packagingType}
                        onChange={item =>
                          handleChange('packagingType', item.value)
                        }
                        renderLeftIcon={() => (
                          <Container
                            size={20}
                            color="#6B7280"
                            style={styles.icon}
                          />
                        )}
                      />
                      {errors.packagingType && (
                        <Text style={styles.errorText}>
                          {errors.packagingType}
                        </Text>
                      )}
                    </View>
                  )}

                  {shouldRenderField('shelfLife') && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Shelf Life *</Text>
                      <TextInput
                        style={styles.input}
                        value={productDetails.shelfLife}
                        onChangeText={text => handleChange('shelfLife', text)}
                        placeholder="e.g., 6 months, 1 year"
                        placeholderTextColor={'#9CA3AF'}
                      />
                      {errors.shelfLife && (
                        <Text style={styles.errorText}>{errors.shelfLife}</Text>
                      )}
                    </View>
                  )}
                </>
              )}

              {showImporterFields && (
                <View style={styles.subSection}>
                  <View style={styles.subSectionHeader}>
                    <Building size={20} color="#6B7280" />
                    <Text style={styles.subSectionTitle}>Importer Details</Text>
                  </View>

                  <View style={styles.row}>
                    {shouldRenderField('importerName') && (
                      <View
                        style={[
                          styles.inputContainer,
                          {flex: 1, marginRight: 8},
                        ]}>
                        <Text style={styles.label}>Importer Name *</Text>
                        <TextInput
                          style={[
                            styles.input,
                            errors.importerName && styles.inputError,
                          ]}
                          value={productDetails.importerName}
                          onChangeText={text =>
                            handleChange('importerName', text)
                          }
                          placeholder="Importer company name"
                          placeholderTextColor={'#9CA3AF'}
                        />
                        {errors.importerName && (
                          <Text style={styles.errorText}>
                            {errors.importerName}
                          </Text>
                        )}
                      </View>
                    )}
                    {shouldRenderField('importerGSTIN') && (
                      <View style={[styles.inputContainer, {flex: 1}]}>
                        <Text style={styles.label}>Importer GSTIN *</Text>
                        <TextInput
                          style={[
                            styles.input,
                            errors.importerGSTIN && styles.inputError,
                          ]}
                          value={productDetails.importerGSTIN}
                          onChangeText={text =>
                            handleChange('importerGSTIN', text.toUpperCase())
                          }
                          placeholder="Importer's GSTIN"
                          placeholderTextColor={'#9CA3AF'}
                          maxLength={15}
                        />
                        {errors.importerGSTIN && (
                          <Text style={styles.errorText}>
                            {errors.importerGSTIN}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {shouldRenderField('importerAddress') && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Importer Address *</Text>
                      <TextInput
                        style={[
                          styles.textArea,
                          errors.importerAddress && styles.inputError,
                        ]}
                        value={productDetails.importerAddress}
                        onChangeText={text =>
                          handleChange('importerAddress', text)
                        }
                        placeholder="Full address of the importer"
                        placeholderTextColor={'#9CA3AF'}
                        multiline
                        numberOfLines={3}
                      />
                      {errors.importerAddress && (
                        <Text style={styles.errorText}>
                          {errors.importerAddress}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          )} */}
        </View>
      );
    else if (currentStep == 2)
      return (
        <View>
          
          {/* Product Images Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ImageIcon size={20} color="#FFF" />
              <Text style={styles.sectionTitle}>Product Images *</Text>
            </View>

            <View style={styles.imagesContainer}>
              {productDetails.images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image
                    source={{uri: `${AWS_CDN_URL}${image.key}` || undefined}}
                    style={styles.image}
                    onError={() => console.log('Image load error')}
                  />
                  {image.status === 'uploading' && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#FFFFFF" />
                    </View>
                  )}
                  {image.status === 'error' && (
                    <View style={styles.errorOverlay}>
                      <AlertCircle size={16} color="#FFFFFF" />
                      <Text style={styles.errorOverlayText}>Upload failed</Text>
                    </View>
                  )}
                  {image.status === 'done' && index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}>
                    <X size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}

              {productDetails.images.filter(img => img.status !== 'error')
                .length < 4 && (
                <TouchableOpacity
                  style={[
                    styles.addImageButton,
                    uploadingImages && styles.uploadingButton,
                    errors.images && styles.errorButton,
                  ]}
                  onPress={handleImageChange}
                  disabled={uploadingImages}>
                  <Plus size={24} color="#EFBB16" />
                  <Text style={styles.addImageText}>
                    Add Image (
                    {
                      productDetails.images.filter(img => img.status === 'done')
                        .length
                    }
                    /4)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {errors.images && (
              <Text style={[styles.errorText, {marginTop: 8}]}>
                {errors.images}
              </Text>
            )}
            <Text style={styles.imageNote}>
              Upload up to 4 images (JPG, JPEG, PNG format). First image will be
              the main cover photo.
            </Text>
          </View>

            {/* Pricing Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IndianRupee size={20} color="#EFBB16" />
              <Text style={styles.sectionTitle}>Pricing</Text>
            </View>

            {/* Buy It Now Pricing */}
            <View style={styles.pricingSubSection}>
              <View style={styles.subSectionHeader}>
                <ShoppingCart size={20} color="#3B82F6" />
                <Text style={styles.subSectionTitle}>Buy It Now Price</Text>
              </View>

              {/* MRP */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Actual Price (MRP) *</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={[styles.priceInput, errors.MRP && styles.inputError]}
                    value={productDetails.MRP}
                    onChangeText={text => handlePriceInput('MRP', text)}
                    placeholder="0.00"
                    placeholderTextColor={'#9CA3AF'}
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.MRP && (
                  <Text style={styles.errorText}>{errors.MRP}</Text>
                )}
              </View>

              {/* Selling Price */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Selling Price *</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={[
                      styles.priceInput,
                      errors.productPrice && styles.inputError,
                    ]}
                    value={productDetails.productPrice}
                    onChangeText={text =>
                      handlePriceInput('productPrice', text)
                    }
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor={'#9CA3AF'}
                  />
                </View>
                {errors.productPrice && (
                  <Text style={styles.errorText}>{errors.productPrice}</Text>
                )}
              </View>

              {/* Commission (Conditional) */}
              {/* {productDetails.allowDropshipping && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Commission (%) *</Text>
                  <View style={styles.priceInputContainer}>
                    <TextInput
                      style={[
                        styles.priceInput,
                        errors.commissionRate && styles.inputError,
                      ]}
                      value={productDetails.commissionRate}
                      onChangeText={text =>
                        handleNumericInput('commissionRate', text)
                      }
                      placeholder="e.g., 10"
                      placeholderTextColor={'#9CA3AF'}
                      keyboardType="numeric"
                    />
                    <Text style={styles.percentageSymbol}>%</Text>
                  </View>
                  {errors.commissionRate && (
                    <Text style={styles.errorText}>
                      {errors.commissionRate}
                    </Text>
                  )}
                </View>
              )} */}
            </View>
              <View style={[styles.toggleContainer,{marginTop:10}]}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Auction Enabled?</Text>
                  <ToggleSwitch
                    isOn={productDetails.isAuctionEnabled}
                    onToggle={value => handleChange('isAuctionEnabled', value)}
                    onColor={'#F7CE45'}
                    // trackColor={{false: '#E5E7EB', true: '#EFBB16'}}
                    // thumbColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.toggleNote}>
                  Enabled for Auction that helps in livestreaming.
                </Text>
              </View>

            {/* Auction Pricing */}
          {productDetails.isAuctionEnabled&& <View style={styles.pricingSubSection}>
              <View style={styles.subSectionHeader}>
                <Gavel size={20} color="#F59E0B" />
                <Text style={styles.subSectionTitle}>
                  Auction Settings 
                </Text>
              </View>

              {/* Starting Price */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Starting Bid Price</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={[
                      styles.priceInput,
                      errors.startingPrice && styles.inputError,
                    ]}
                    value={productDetails.startingPrice}
                    onChangeText={text =>
                      handlePriceInput('startingPrice', text)
                    }
                    placeholder="0.00"
                    placeholderTextColor={'#9CA3AF'}
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.startingPrice && (
                  <Text style={styles.errorText}>{errors.startingPrice}</Text>
                )}
              </View>

              {/* Reserved Price */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Reserved Price</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={[
                      styles.priceInput,
                      errors.reservedPrice && styles.inputError,
                    ]}
                    value={productDetails.reservedPrice}
                    onChangeText={text =>
                      handlePriceInput('reservedPrice', text)
                    }
                    placeholder="Min acceptable bid"
                    placeholderTextColor={'#9CA3AF'}
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.reservedPrice && (
                  <Text style={styles.errorText}>{errors.reservedPrice}</Text>
                )}
                <Text style={styles.reservePriceNote}>
                  If the highest bid is below this, the item won't be sold via
                  auction. Leave blank for no reserve.
                </Text>
              </View>
            </View>}
          </View>
        {/* {mode!="add"&& !hasVariants&& */}
        {data?.isVariant!=true&& 
                (productDetails.category === "Fashion & Accessories" || productDetails.category === "Electronics & Gadgets") && (
                  <ProductVariantManager
                    parentProduct={productDetails}
                    onVariantsChange={handleVariantsChange}
                    initialVariantData={variantData}
                    isEditMode={mode !== 'add'}
                  />
                )}
          {/* } */}
           {errors.variants && (
                  <Text style={styles.errorText}>{errors.variants}</Text>
                )}

  <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Package size={20} color="#EFBB16" />
              <Text style={styles.sectionTitle}>{!variantData?.enabled?'Stock Quantity':"HSN No"}</Text>
            </View>

            {!variantData?.enabled?
              <View style={[styles.inputContainer, {flex: 1, marginBottom: 5}]}>
            <Text style={styles.label}>SKU *</Text>
            <TextInput
              style={[styles.input, errors.sku && styles.inputError]}
              value={productDetails.sku}
              onChangeText={text => handleChange('sku', text)}
              placeholder="Enter sku code"
              placeholderTextColor={'#9CA3AF'}
            />
            {checkingSku && (
              <View className="self-start mt-2">
                <ActivityIndicator size={10} color="#FFF" />
              </View>
            )}
            {skuAvailable && !checkingSku && !errors.sku && (
              <Text className="text-green-500 text-xs mt-2">
                SKU is available
              </Text>
            )}
            {errors.sku && <Text style={styles.errorText}>{errors.sku}</Text>}
          </View>
            :null}
             <View style={[styles.inputContainer, {flex: 1}]}>
            <Text style={styles.label}>HSN No (Optional)</Text>
            <TextInput
              style={[styles.input, errors.hsnNo && styles.inputError]}
              value={productDetails.hsnNo}
              onChangeText={text => handleChange('hsnNo', text)}
              placeholder="Enter HSN code"
              maxLength={8}
              placeholderTextColor={'#9CA3AF'}
            />
            {errors.hsnNo && (
              <Text style={styles.errorText}>{errors.hsnNo}</Text>
            )}
          </View>
          {!variantData?.enabled?  <View style={[styles.inputContainer, {flex: 1, marginRight: 8}]}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                  style={[
                    styles.input,
                    ,
                    mode != 'add' && {backgroundColor: '#333'},
                    errors.quantity && styles.inputError,
                  ]}
                  value={productDetails.quantity}
                  onChangeText={text => handleNumericInput('quantity', text)}
                  placeholder="Available stock"
                  editable={mode == 'add'}
                  placeholderTextColor={'#9CA3AF'}
                  keyboardType="numeric"
                />
                {errors.quantity && (
                  <Text style={styles.errorText}>{errors.quantity}</Text>
                )}
              </View>:null}
        
            </View>
        
        </View>
      );
    else if (currentStep == 3)
      return (
        <View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Settings size={20} color="#FFF" />
              <Text style={styles.sectionTitle}>Courier Details</Text>
            </View>
              {/* Weight */}
          {(shouldRenderField('weight') || shouldRenderField('dimensions')) && (
            <>
              {shouldRenderField('weight') && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Item Weight * (whole numbers only)</Text>
                  <View style={styles.weightContainer}>
                    <View style={styles.weightInputWrapper}>
                      <TextInput
                        style={[
                          styles.weightInput,
                          (errors.weight || errors.weightValue) && styles.inputError,
                        ]}
                        value={productDetails.weight.value}
                        onChangeText={text => {
                          // Only allow digits (whole numbers)
                          const cleanedText = text.replace(/[^0-9]/g, '');
                          handleNestedChange('weight', 'value')(cleanedText);
                          
                          // Show inline validation error
                          if (text && text !== cleanedText) {
                            setErrors(prev => ({...prev, weightValue: 'Only whole numbers allowed (no decimals)'}));
                            Toast("Weight must be a whole number");
                          } else {
                            setErrors(prev => ({...prev, weightValue: undefined}));
                          }
                        }}
                        placeholder="Value (whole number only)"
                        placeholderTextColor={'#9CA3AF'}
                        autoComplete="off"
                        importantForAutofill="no"
                        textContentType="none"
                        keyboardType="number-pad"
                      />
                      {errors.weightValue && (
                        <Text style={styles.weightError}>{errors.weightValue}</Text>
                      )}
                    </View>
                    <Dropdown
                      style={[
                        styles.weightDropdown,
                        errors.weight && styles.inputError,
                      ]}
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
                      inputSearchStyle={styles.inputSearchStyle}
                      itemTextStyle={{color: '#fff'}}
                      activeColor="#333"
                      containerStyle={{
                        marginBottom: 10,
                        backgroundColor: '#212121',
                        borderColor: '#EFBB16',
                        borderWidth: 1,
                        borderRadius: 10,
                      }}
                      iconStyle={styles.iconStyle}
                      data={[
                        {label: 'grams', value: 'grams'},
                        {label: 'kilograms', value: 'kilograms'},
                        // {label: 'ml', value: 'ml'},
                        // {label: 'litre', value: 'litre'},
                        // {label: 'pounds', value: 'pounds'},
                        // {label: 'ounces', value: 'ounces'},
                      ]}
                      maxHeight={300}
                      labelField="label"
                      valueField="value"
                      value={productDetails.weight.unit}
                      onChange={item =>
                        handleNestedChange('weight', 'unit')(item.value)
                      }
                    />
                  </View>
                  {errors.weight && (
                    <Text style={styles.errorText}>{errors.weight}</Text>
                  )}
                </View>
              )}

              {/* Dimensions */}
              {shouldRenderField('dimensions') && (
                <View style={styles.inputContainer}>
                  <View style={styles.dimensionsHeader}>
                    <Text style={styles.label}>Dimensions (cm) * (max 2 decimals)</Text>
                    <Text style={styles.dimensionsSubtitle}>L x W x H</Text>
                  </View>
                  <View style={styles.dimensionsContainer}>
                    <View style={styles.dimensionInputWrapper}>
                      <TextInput
                        style={[
                          styles.dimensionInput,
                          (errors.dimensions || errors.dimensionLength) && styles.inputError,
                        ]}
                        value={productDetails.dimensions.length}
                        onChangeText={text => {
                          // Allow only valid decimal format with max 2 decimal places
                          // if (text === '' || /^\d*\.?\d{0,2}$/.test(text)) {
                            handleNestedChange('dimensions', 'length')(text);
                            setErrors(prev => ({...prev, dimensionLength: undefined}));
                          // } else {
                          //   // Show error for invalid input
                          //   setErrors(prev => ({...prev, dimensionLength: 'Max 2 decimals'}));
                          //   Toast("Maximum 2 decimal places allowed");
                          // }
                        }}
                        placeholder="L"
                        placeholderTextColor={'#9CA3AF'}
                        keyboardType="decimal-pad"
                      />
                      {errors.dimensionLength && (
                        <Text style={styles.dimensionError}>{errors.dimensionLength}</Text>
                      )}
                    </View>
                    <Text style={styles.dimensionSeparator}>×</Text>
                    <View style={styles.dimensionInputWrapper}>
                      <TextInput
                        style={[
                          styles.dimensionInput,
                          (errors.dimensions || errors.dimensionWidth) && styles.inputError,
                        ]}
                        placeholderTextColor={'#9CA3AF'}
                        value={productDetails.dimensions.width}
                        onChangeText={text => {
                          // Allow only valid decimal format with max 2 decimal places
                          if (text === '' || /^\d*\.?\d{0,2}$/.test(text)) {
                            handleNestedChange('dimensions', 'width')(text);
                            setErrors(prev => ({...prev, dimensionWidth: undefined}));
                          } else {
                            // Show error for invalid input
                            setErrors(prev => ({...prev, dimensionWidth: 'Max 2 decimals'}));
                            Toast("Maximum 2 decimal places allowed");
                          }
                        }}
                        placeholder="W"
                        keyboardType="decimal-pad"
                      />
                      {errors.dimensionWidth && (
                        <Text style={styles.dimensionError}>{errors.dimensionWidth}</Text>
                      )}
                    </View>
                    <Text style={styles.dimensionSeparator}>×</Text>
                    <View style={styles.dimensionInputWrapper}>
                      <TextInput
                        style={[
                          styles.dimensionInput,
                          (errors.dimensions || errors.dimensionHeight) && styles.inputError,
                        ]}
                        value={productDetails.dimensions.height}
                        onChangeText={text => {
                          // Allow only valid decimal format with max 2 decimal places
                          if (text === '' || /^\d*\.?\d{0,2}$/.test(text)) {
                            handleNestedChange('dimensions', 'height')(text);
                            setErrors(prev => ({...prev, dimensionHeight: undefined}));
                          } else {
                            // Show error for invalid input
                            setErrors(prev => ({...prev, dimensionHeight: 'Max 2 decimals'}));
                            Toast("Maximum 2 decimal places allowed");
                          }
                        }}
                        placeholderTextColor={'#9CA3AF'}
                        placeholder="H"
                        keyboardType="decimal-pad"
                      />
                      {errors.dimensionHeight && (
                        <Text style={styles.dimensionError}>{errors.dimensionHeight}</Text>
                      )}
                    </View>
                  </View>
                  {errors.dimensions && (
                    <Text style={styles.errorText}>{errors.dimensions}</Text>
                  )}
                </View>
              )}
            </>
          )}
            </View>
            <View style={styles.container}>
  <Text style={styles.sectionTitle}>Shipping Information</Text>
  
  {/* Logistics Type Field */}
  <View style={styles.section}>
    <Text style={styles.label}>
      Logistics Type <Text style={styles.required}>*</Text>
    </Text>
    <Dropdown
      style={[
        styles.dropdown,
        errors.logisticsType && styles.inputError,
      ]}
      placeholderStyle={styles.placeholderStyle}
      selectedTextStyle={styles.selectedTextStyle}
      inputSearchStyle={styles.inputSearchStyle}
      iconStyle={styles.iconStyle}
      itemTextStyle={{color: '#fff'}}
      containerStyle={{
        marginBottom: 10,
        backgroundColor: '#212121',
        borderColor: '#EFBB16',
        borderWidth: 1,
        borderRadius: 10,
      }}
      activeColor="#333"
      data={[
        {label: 'Select logistics type', value: ''},
        {label: 'FlyKup Logistics', value: 'flykupLogistics'},
        {label: 'Self Shipment', value: 'selfShipment'},
      ]}
      maxHeight={300}
      labelField="label"
      valueField="value"
      placeholder="Select logistics type"
      value={productDetails.logisticsType || ''}
      onChange={item => handleChange('logisticsType', item.value)}
    />
    {errors.logisticsType && (
      <Text style={styles.errorText}>{errors.logisticsType}</Text>
    )}
  </View>

  {/* Delivery Charge Field */}
  <View style={styles.section}>
    <Text style={styles.label}>
      Delivery Charge (₹) <Text style={styles.required}>*</Text>
    </Text>
    <View style={styles.currencyInputContainer}>
      {/* <Text style={styles.currencySymbol}>₹</Text> */}
      <TextInput
        style={[
          styles.input,
          styles.inputWithCurrency,
          errors.deliveryCharge && styles.inputError,
        ]}
        value={productDetails.deliveryCharge?.toString() || ''}
        onChangeText={(value) => handleNumericInput('deliveryCharge', value)}
        placeholder="0.00"
        placeholderTextColor="#9CA3AF"
        keyboardType="numeric"
      />
    </View>
    {errors.deliveryCharge && (
      <Text style={styles.errorText}>{errors.deliveryCharge}</Text>
    )}
  </View>

{/* {console.log('productDetail===============',productDetails)} */}
  {/* Estimated Delivery Date Field */}
  <View style={styles.section}>
    <Text style={styles.label}>
      Estimated Delivery in (Days) <Text style={styles.required}>*</Text>
    </Text>
    <TextInput
      style={[
        styles.input,
        errors.estimatedDeliveryDate && styles.inputError,
      ]}
      value={productDetails.estimatedDeliveryDate?.toString() || ''}
      onChangeText={(value) => {
        // Allow only positive integers
        if (value === '' || /^[0-9]+$/.test(value)) {
          handleChange('estimatedDeliveryDate', value);
        }
      }}
      placeholder="e.g., 5"
      placeholderTextColor="#9CA3AF"
      keyboardType="numeric"
    />
    {errors.estimatedDeliveryDate && (
      <Text style={styles.errorText}>{errors.estimatedDeliveryDate}</Text>
    )}
       <Text style={styles.reservePriceNote}>
                FlyKup Logistics delivers to 17,000 pincodes. If the selected pincode is not deliverable, the system will automatically switch to Self Shipment, and the delivery charge and estimated delivery days entered below will apply accordingly.
                </Text>
  </View>
</View>
  {/* Shipping Considerations Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Package size={20} color="#FFF" />
              <Text style={styles.sectionTitle}>Shipping Considerations</Text>
            </View>

            {/* Hazardous Materials Dropdown */}
            {shouldRenderField('hazardousMaterials') && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Hazardous Materials *</Text>
                <Dropdown
                  style={[
                    styles.dropdown,
                    errors.hazardousMaterials && styles.inputError,
                  ]}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  inputSearchStyle={styles.inputSearchStyle}
                  iconStyle={styles.iconStyle}
                  itemTextStyle={{color: '#fff'}}
                  containerStyle={{
                    marginBottom: 10,
                    backgroundColor: '#212121',
                    borderColor: '#EFBB16',
                    borderWidth: 1,
                    borderRadius: 10,
                  }}
                  activeColor="#333"
                  data={[
                    {
                      label: 'No hazardous materials',
                      value: 'no hazardous materials',
                    },
                    {label: 'Fragrances', value: 'fragrances'},
                    {label: 'Lithium batteries', value: 'lithium batteries'},
                    {
                      label: 'Other hazardous materials',
                      value: 'other hazardous materials',
                    },
                  ]}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder="Select hazard type or none"
                  value={productDetails.hazardousMaterials}
                  onChange={item =>
                    handleChange('hazardousMaterials', item.value)
                  }
                  renderLeftIcon={() => (
                    <AlertCircle
                      size={20}
                      color="#EF4444"
                      style={styles.icon}
                    />
                  )}
                />
                {errors.hazardousMaterials && (
                  <Text style={styles.errorText}>
                    {errors.hazardousMaterials}
                  </Text>
                )}
                {productDetails.hazardousMaterials &&
                  productDetails.hazardousMaterials !==
                    'no hazardous materials' && (
                    <View style={styles.hazardNote}>
                      <AlertCircle size={16} color="#F59E0B" />
                      <Text style={styles.hazardNoteText}>
                        {getHazardousMessage(productDetails.hazardousMaterials)}
                      </Text>
                    </View>
                  )}
              </View>
            )}
          </View>
        
          {/* Seller Information Section */}
          {/* <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <UserCircle size={20} color="#FFF" />
              <Text style={styles.sectionTitle}>Gst Details</Text>
            </View> */}

            {/* Seller Name 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Seller Name *</Text>
                <TextInput
                  style={[styles.input, errors.sellerName && styles.inputError]}
                  value={productDetails.sellerName}
                  onChangeText={text => handleChange('sellerName', text)}
                  placeholder="Your registered seller name"
                  placeholderTextColor={'#9CA3AF'}
                />
                {errors.sellerName && (
                  <Text style={styles.errorText}>{errors.sellerName}</Text>
                )}
              </View>*/}

            {/* Seller Contact 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Seller Contact *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.sellerContact && styles.inputError,
                  ]}
                  value={productDetails.sellerContact}
                  onChangeText={text => handleTelInput('sellerContact', text)}
                  placeholder="Your contact number"
                  placeholderTextColor={'#9CA3AF'}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  // maxLength={10}
                  textContentType="telephoneNumber"
                />
                {errors.sellerContact && (
                  <Text style={styles.errorText}>{errors.sellerContact}</Text>
                )}
              </View>*/}

            {/* Seller GSTIN 
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Seller GSTIN </Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.sellerGSTIN && styles.inputError,
                  ]}
                  value={productDetails.sellerGSTIN}
                  onChangeText={text =>
                    handleChange('sellerGSTIN', text.toUpperCase())
                  }
                  placeholder="Your 15-digit GSTIN"
                  placeholderTextColor={'#9CA3AF'}
                  maxLength={15}
                />
                {errors.sellerGSTIN && (
                  <Text style={styles.errorText}>{errors.sellerGSTIN}</Text>
                )}
              </View>*/}

            {/* GST Rate */}
            {/* <View style={styles.inputContainer}>
              <Text style={styles.label}>GST Rate (%) </Text>
              <View style={styles.priceInputContainer}>
                <TextInput
                  style={[
                    styles.priceInput,
                    errors.gstRate && styles.inputError,
                  ]}
                  value={productDetails.gstRate}
                  onChangeText={text => handleNumericInput('gstRate', text)}
                  placeholder="e.g., 5, 12, 18"
                  placeholderTextColor={'#9CA3AF'}
                  keyboardType="numeric"
                />
                <Text style={styles.percentageSymbol}>%</Text>
              </View>
              {errors.gstRate && (
                <Text style={styles.errorText}>{errors.gstRate}</Text>
              )}
              <Text style={styles.imageNote}>
                Note: The total product amount is inclusive of GST. For Examble
                18%, it is split equally between IGST and SGST (9% + 9%).
              </Text>
            </View>
          </View> */}
        </View>
      );
       else if (currentStep == 4)
        return(<View>
  {/* Settings & Visibility Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Settings size={20} color="#FFF" />
              <Text style={styles.sectionTitle}>Settings & Visibility</Text>
            </View>

            <View style={styles.toggleContainer}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Reserve for LiveStreaming?</Text>
                  <ToggleSwitch
                    isOn={productDetails.reserveForLive}
                    onToggle={value => handleChange('reserveForLive', value)}
                    onColor={'#F7CE45'}
                    // trackColor={{false: '#E5E7EB', true: '#EFBB16'}}
                    // thumbColor="#FFFFFF"
                  />
                </View>
                <Text style={[styles.toggleNote,{color:'#F7CE45'}]}>
                 Note: The Product won't be available for purchase elsewhere
                </Text>
              </View>
            {shouldRenderField('allowDropshipping') && ( // Only show if relevant for category
              <View style={styles.toggleContainer}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Allow Dropshipping?</Text>
                  <ToggleSwitch
                    isOn={productDetails.allowDropshipping}
                    onToggle={value => handleChange('allowDropshipping', value)}
                    onColor={'#F7CE45'}
                    // trackColor={{false: '#E5E7EB', true: '#EFBB16'}}
                    // thumbColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.toggleNote}>
                  Enable if approved dropshippers can list this product.
                </Text>
              </View>
            )}
            {shouldRenderField('isActive') && (
              <View style={styles.toggleContainer}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Product Active? *</Text>
                  <ToggleSwitch
                    isOn={productDetails.isActive}
                    onToggle={value => handleChange('isActive', value)}
                    onColor={'#F7CE45'}
                    // trackOnStyle={{ true: '#EFBB16',}}
                    // thumbColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.toggleNote}>
                  Uncheck to hide product from store listings (Draft).
                </Text>
              </View>
            )}
          </View>
          {(shouldRenderField('fssaiLicenseNo') ||
            shouldRenderField('bisCertification') ||
            shouldRenderField('eWasteCompliance') ||
            shouldRenderField('recyclablePackaging')) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={20} color="#10B981" />
                <Text style={styles.sectionTitle}>
                  Compliance & Certifications
                </Text>
              </View>

              {/* FSSAI License */}
              {shouldRenderField('fssaiLicenseNo') && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    FSSAI License No (if applicable)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.fssaiLicenseNo && styles.inputError,
                    ]}
                    value={productDetails.fssaiLicenseNo}
                    onChangeText={text => handleChange('fssaiLicenseNo', text)}
                    placeholder="Enter FSSAI number"
                    placeholderTextColor={'#9CA3AF'}
                  />
                  {errors.fssaiLicenseNo && (
                    <Text style={styles.errorText}>
                      {errors.fssaiLicenseNo}
                    </Text>
                  )}
                </View>
              )}

              {/* BIS Certification */}

              {shouldRenderField('bisCertification') && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    BIS Certification (if applicable)
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={productDetails.bisCertification}
                    onChangeText={text =>
                      handleChange('bisCertification', text)
                    }
                    placeholder="Enter BIS number/details"
                    placeholderTextColor={'#9CA3AF'}
                  />
                  {errors.bisCertification && (
                    <Text style={styles.errorText}>
                      {errors.bisCertification}
                    </Text>
                  )}
                </View>
              )}

              {/* Compliance Checkboxes */}

              <View style={styles.checkboxContainer}>
                {shouldRenderField('eWasteCompliance') && (
                  <View style={styles.checkbox}>
                    <Text style={styles.checkboxText}>E-Waste Compliant</Text>
                    <Checkbox
                      status={
                        productDetails.eWasteCompliance
                          ? 'checked'
                          : 'unchecked'
                      }
                      onPress={() =>
                        handleChange(
                          'eWasteCompliance',
                          !productDetails.eWasteCompliance,
                        )
                      }
                      color="#EFBB16"
                    />
                  </View>
                )}
                {shouldRenderField('recyclablePackaging') && (
                  <View style={styles.checkbox}>
                    <Text style={styles.checkboxText}>
                      Uses Recyclable Packaging
                    </Text>
                    <Checkbox
                      status={
                        productDetails.recyclablePackaging
                          ? 'checked'
                          : 'unchecked'
                      }
                      onPress={() =>
                        handleChange(
                          'recyclablePackaging',
                          !productDetails.recyclablePackaging,
                        )
                      }
                      color="#EFBB16"
                    />
                  </View>
                )}
              </View>
            </View>
          )}
          {/* Warranty & Returns Section */}
          {(shouldRenderField('warranty') ||
            shouldRenderField('returnPolicy')|| shouldRenderField("hasReturn") )&&  (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Info size={20} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Warranty & Returns</Text>
              </View>

              {/* Warranty */}
              {shouldRenderField('hasReturn') && ( <View style={[styles.inputContainer]}>
                <Text style={styles.label}>Return window (days)</Text>
                <TextInput
                  style={[styles.input, errors.returnDays && styles.inputError]}
                  value={productDetails.returnDays}
                  onChangeText={text => handleNumericInput('returnDays', text)}
                  placeholder="In days"
                  placeholderTextColor={'#9CA3AF'}
                  keyboardType="numeric"
                />
                {errors.returnDays && (
                  <Text style={styles.errorText}>{errors.returnDays}</Text>
                )}
              </View>)}
              {shouldRenderField('warranty') && (
                <View style={styles.inputContainer}>
                  <View style={styles.checkbox}>
                    <Text style={styles.checkboxText}>Has Warranty?</Text>
                    <Checkbox
                      status={
                        productDetails.warranty.hasWarranty
                          ? 'checked'
                          : 'unchecked'
                      }
                      onPress={() => {
                        setProductDetails(prev => ({
                          ...prev,
                          warranty: {
                            ...prev.warranty,
                            hasWarranty: !prev.warranty.hasWarranty,
                            duration: !prev.warranty.hasWarranty
                              ? prev.warranty.duration
                              : '',
                          },
                        }));
                      }}
                      color="#EFBB16"
                    />
                  </View>

                  {productDetails.warranty.hasWarranty && (
                    <View style={styles.warrantyDurationContainer}>
                      <TextInput
                        style={[
                          styles.input,
                          errors.warrantyDuration && styles.inputError,
                        ]}
                        value={productDetails.warranty.duration}
                        onChangeText={text =>
                          handleNestedChange('warranty', 'duration')(text)
                        }
                        placeholder="Specify duration (e.g., 1 yr, 6 months)"
                        placeholderTextColor={'#9CA3AF'}
                      />
                      {errors.warrantyDuration && (
                        <Text style={styles.errorText}>
                          {errors.warrantyDuration}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Return Policy */}
              {shouldRenderField('returnPolicy') && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Return Policy Terms (Max 6)</Text>
                  <View style={styles.returnPolicyContainer}>
                    {productDetails.returnPolicy.map((policy, index) => (
                      <View key={index} style={styles.returnPolicyBadge}>
                        <Text style={styles.returnPolicyText}>{policy}</Text>
                        <TouchableOpacity
                          style={styles.removePolicyButton}
                          onPress={() => removeReturnPolicy(index)}>
                          <X size={12} color="#6B7280" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {productDetails.returnPolicy.length === 0 && (
                      <Text style={styles.noPolicyText}>
                        No return terms added yet.
                      </Text>
                    )}
                  </View>
                  {productDetails.returnPolicy.length < 6 && (
                    <View style={styles.addPolicyContainer}>
                      <TextInput
                        style={styles.addPolicyInput}
                        value={returnPolicyInput}
                        onChangeText={setReturnPolicyInput}
                        placeholderTextColor={'#9CA3AF'}
                        autoComplete="off"
                        importantForAutofill="no"
                        textContentType="none"
                        placeholder="Add term (e.g., 7-day return)"
                        maxLength={50}
                      />
                      <TouchableOpacity
                        style={styles.addPolicyButton}
                        onPress={addReturnPolicy}
                        disabled={
                          !returnPolicyInput.trim() ||
                          productDetails.returnPolicy.length >= 6
                        }>
                        <Plus size={16} color="#212121" />
                        <Text style={styles.addPolicyButtonText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {errors.returnPolicy && (
                    <Text style={styles.errorText}>{errors.returnPolicy}</Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>)
  };
  // console.log(productDetails?.countryOfOrigin)
  const getTabName = () => {
    if (currentStep === 1) return 'Product Details';
    if (currentStep === 2) return 'Variants & Pricing';
    if (currentStep === 3) return 'Courier Details';
    if (currentStep === 4) return 'Other Details';
    return '';
  };
  const rbSheetRef = useRef();

  const openHelpSheet = () => {
    // console.log("ahfiua")
    rbSheetRef.current?.open();
  };
  return (
    <SafeAreaView style={styles.container}>
      <FAQHelpBottomSheetProduct
        rbSheetRef={rbSheetRef}
        currentTabIndex={currentStep - 1}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {show && (
            <DateTimePicker
              value={productDetails.expiryDate || new Date()}
              mode="date"
              display="default"
              onChange={onChange}
            />
          )}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBackAdvanced}
              activeOpacity={0.7}>
              <Ionicons
                name="arrow-back-circle-outline"
                size={30}
                color="white"
              />
            </TouchableOpacity>
            <LinearGradient
              colors={['#B38728', '#EFBB16']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.headerGradient}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>
                  {getTabName()}
                  {/* {mode === 'add' ? 'Create New Product' : 'Edit Product'} */}
                </Text>
              </View>
            </LinearGradient>

            <View style={{width: 40}} />
          </View>

          <View style={styles.formContainer}>
            {/* Basic Information Section */}
            <HorizontalTimeline
              totalDots={4}
              activeIndex={currentStep - 1}
              // totalDots={4}
              activeDotColor="#EFBB16"
              inactiveDotColor="#9CA3AF"
              activeLineColor="#EFBB16"
              inactiveLineColor="#333"
              showStepNumbers={true}
            />
            {/* <View style={{width:'100%',height:'10%'}}> */}

            {/* </View> */}
            {/* Compliance & Certifications Section */}
            {renderStep()}
            <View>
              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (submitting || uploadingImages) && styles.disabledButton,
                ]}
                onPress={handleSubmit}
                disabled={submitting || uploadingImages}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Plus size={20} color="#121212" style={styles.submitIcon} />
                    <Text style={styles.submitButtonText}>
                      {currentStep === 4
                        ? `${data ? 'Update' : 'Add'} Product Listing`
                        : 'Next Step'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {currentStep - 1 != 0 && (
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    {backgroundColor: '#777'},
                    styles.disabledButton,
                  ]}
                  onPress={() => {
                    setCurrentStep(currentStep - 1);
                  }}>
                  <Text className="text-white font-semibold">Go Back</Text>
                </TouchableOpacity>
              )}
              {hasDraft && mode == 'add' && (
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    {backgroundColor: '#777'},
                    styles.disabledButton,
                  ]}
                  onPress={clearDraft}>
                  <Text className="text-white font-semibold">Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <GlobalConfirmModal
        visible={modalConfig.visible}
        onClose={hideModal}
        onConfirm={handleConfirm}
        title={modalConfig.title}
        content={modalConfig.content}
        mode={modalConfig.mode}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        showIcon={modalConfig.showIcon}
        isLoading={modalConfig.isLoading}
      />
      <View className="absolute right-0" style={{bottom: 5}}>
        <FABHelpButtonProduct
          onPress={() => openHelpSheet()}
          style={{bottom: 40}}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', //'#F3F4F6',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    // marginTop: Platform.select({ ios: 10, android: height * 0.01 }),
    alignItems: 'center',
    gap: width * 0.1,
    // paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
    backgroundColor: '#121212',
  },
  backButton: {
    padding: 5,
  },
  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 3,
  },
  title: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
    // textAlign: 'left',
    // marginBottom: 4,
    // marginRight: 20
  },
  formContainer: {
    padding: 16,
    // justifyContent:'flex-end',
    flex: 1,
    backgroundColor: '#121212',
  },
  section: {
    backgroundColor: '#121212', //'#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#252932', //'#333',   //'#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EFBB16', //'#111827',
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff', //'#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'transparent', //'#F9FAFB',
    borderWidth: 1,
    borderColor: '#333', //'#E5E7EB',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#fff', //'#111827',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    backgroundColor: 'transparent', // '#F9FAFB',
    borderWidth: 1,
    borderColor: '#333', //'#E5E7EB',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#fff', //'#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: 'transparent', //'#F9FAFB',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 50,
  },
  disabledDropdown: {
    opacity: 0.6,
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#fff', //'#111827',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  icon: {
    marginRight: 8,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 2,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#EFBB16', //'#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#252932', //'#F9FAFB',
  },
  uploadingButton: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  errorButton: {
    borderColor: '#EF4444',
  },
  addImageText: {
    fontSize: 12,
    color: '#EFBB16', //'#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  imageNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInput: {
    flex: 1,
    backgroundColor: 'transparent', // '#F9FAFB',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    marginRight: 8,
  },
  weightDropdown: {
    flex: 1,
    backgroundColor: 'transparent', //'#F9FAFB',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal:5,
    borderRadius: 6,
    height: 50,
  },
  dimensionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dimensionsSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  dimensionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dimensionInput: {
    flex: 1,
    backgroundColor: 'transparent', //'#F9FAFB',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    marginRight: 8,
    textAlign: 'center',
  },
  dimensionSeparator: {
    fontSize: 16,
    color: '#6B7280',
    marginHorizontal: 4,
  },
  dateInput: {
    backgroundColor: 'transparent', //'#F9FAFB',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#fff',
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  subSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ddd', //'#111827',
    marginLeft: 8,
  },
  checkboxContainer: {
    marginTop: 8,
  },
  checkbox: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 8,
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#eee',
  },
  warrantyDurationContainer: {
    marginLeft: 32,
    marginTop: 8,
  },
  returnPolicyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    minHeight: 32,
  },
  returnPolicyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  returnPolicyText: {
    fontSize: 12,
    color: '#374151',
  },
  removePolicyButton: {
    marginLeft: 6,
  },
  noPolicyText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  addPolicyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addPolicyInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    marginRight: 8,
  },
  addPolicyButton: {
    backgroundColor: '#EFBB16', //'#4F46E5',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addPolicyButtonText: {
    color: '#212121',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  toggleContainer: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  toggleNote: {
    fontSize: 12,
    color: '#6B7280',
  },
  pricingSubSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent', //'#F9FAFB',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    paddingLeft: 12,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff', //'#111827',
    paddingVertical: 12,
    backgroundColor: 'transparent', // '#F9FAFB',
  },
  percentageSymbol: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginRight: 12,
  },
  reservePriceNote: {
    fontSize: 12,
    color: '#fff', //'#6B7280',
    marginTop: 8,
    backgroundColor: 'gray', //'#F3F4F6',
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#EFBB16', //'#D1D5DB',
  },
  hazardNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  hazardNoteText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#EFBB16', //'#4F46E5',
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#4F46E5',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '600',
  },
  underline: {
    position: 'absolute',
    bottom: -2,
    width: 100,
    height: 2,
    backgroundColor: 'red',
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  required: {
    color: '#EF4444',
  },
  variantsDisabledContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
  },
  variantsDisabledContent: {
    alignItems: 'center',
  },
  variantsDisabledTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 12,
    marginBottom: 8,
  },
  variantsDisabledText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  variantsChecklistContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  variantsChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantsCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B7280',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantsCheckboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  variantsCheckmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  variantsChecklistText: {
    fontSize: 14,
    color: '#9CA3AF',
    flex: 1,
  },
  variantsChecklistTextCompleted: {
    color: '#10B981',
    textDecorationLine: 'line-through',
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWithCurrency: {
    flex: 1,
  },
  dimensionInputWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  dimensionError: {
    fontSize: 9,
    color: '#EF4444',
    marginTop: 2,
    textAlign: 'center',
  },
  weightInputWrapper: {
    flex: 1,
    marginRight: 8,
  },
  weightError: {
    fontSize: 9,
    color: '#EF4444',
    marginTop: 2,
  },
});

export default LiveStreamProductForm;
