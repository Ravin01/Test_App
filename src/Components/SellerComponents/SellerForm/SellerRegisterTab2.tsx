import React, {useEffect, useRef, useState, useCallback, memo} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TextInputProps,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  deleteObjectFromS3,
  uploadImageToS3,
  uploadPdfToS3,
  generatePrivateSignedUrl,
} from '../../../Utils/aws';
import {ActivityIndicator, RadioButton} from 'react-native-paper';
import DocumentPicker from 'react-native-document-picker';
import downloadPDFToDownloads from './download';
import {checkPermission} from '../../../Utils/Permission';
import SellerHeader from './Header';
import HorizontalTimeline from './TimeLine';
import {AlertTriangle, Upload, UploadIcon} from 'lucide-react-native';
import axiosInstance from '../../../Utils/Api';
import OTPVerificationModal from './OtpVerificaitonModal';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../../Utils/Colors';
import useAutoSave from './useAutoSave';
import {FABHelpButton, FAQHelpBottomSheet} from './HelpExample';
import OnboardingStatusWidget, {CompactProgressFAB} from './CompletionPercent';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============ TYPES ============
interface FormErrors {
  aadhaarNumber: string;
  panNumber: string;
  panFront: string;
  aadhaarBack: string;
  aadhaarFront: string;
  gstNumber: string;
  hasgst: string;
  streetAddress1: string;
  city: string;
  state: string;
  streetAddress2: string;
  pinCode: string;
}

interface UploadingFiles {
  aadhaarFront: boolean;
  aadhaarBack: boolean;
  gstDocument: boolean;
  panFront: boolean;
  gstDeclaration: boolean;
}

interface IsPdfState {
  aadhaarFront: boolean;
  aadhaarBack: boolean;
  gstDocument: boolean;
  panFront: boolean;
  gstDeclaration: boolean;
}

interface GstVerificationData {
  name: string;
  address: string;
  building?: string;
  street?: string;
  location?: string;
}

interface PanVerificationData {
  registeredName: string;
  name: string;
}

// ============ CONSTANTS ============
const INITIAL_ERRORS: FormErrors = {
  aadhaarNumber: '',
  panNumber: '',
  panFront: '',
  aadhaarBack: '',
  aadhaarFront: '',
  gstNumber: '',
  hasgst: '',
  streetAddress1: '',
  city: '',
  state: '',
  streetAddress2: '',
  pinCode: '',
};

const INITIAL_UPLOADING: UploadingFiles = {
  aadhaarFront: false,
  aadhaarBack: false,
  gstDocument: false,
  panFront: false,
  gstDeclaration: false,
};

const INITIAL_IS_PDF: IsPdfState = {
  aadhaarFront: false,
  aadhaarBack: false,
  gstDocument: false,
  panFront: false,
  gstDeclaration: false,
};

// ============ VALIDATION UTILS ============
const ValidationUtils = {
  isValidAadhaar: (value: string): string => {
    const aadhaarRegex = /^[0-9]{12}$/;
    if (!value) return 'Aadhaar number is required';
    if (!aadhaarRegex.test(value)) return 'Aadhaar number must be 12 digits';
    return '';
  },
  isValidPAN: (value: string): string => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!value) return 'PAN number is required';
    if (!panRegex.test(value)) return 'Invalid PAN number format';
    return '';
  },
  isValidGST: (value: string): string => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!value) return 'GST number is required';
    if (!gstRegex.test(value)) return 'Invalid GST number format';
    return '';
  },
};

// ============ SMOOTH TEXT INPUT ============
// Completely uncontrolled during typing - debounces parent updates for smooth typing
// Exposes flush() via ref to force sync before validation
interface DebouncedTextInputRef {
  flush: () => void;
}

const DebouncedTextInput = React.forwardRef<DebouncedTextInputRef, {
  value: string;
  onChangeText: (text: string) => void;
  isVerified?: boolean;
  hasError?: boolean;
  inputStyle?: any;
} & TextInputProps>(({
  value,
  onChangeText,
  isVerified = false,
  hasError = false,
  inputStyle,
  ...textInputProps
}, ref) => {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const lastSentValueRef = useRef(value);
  const onChangeTextRef = useRef(onChangeText);
  
  // Keep callback ref updated
  useEffect(() => {
    onChangeTextRef.current = onChangeText;
  }, [onChangeText]);

  // Sync from parent only when value changed externally (not from our own typing)
  useEffect(() => {
    if (!isTypingRef.current && value !== lastSentValueRef.current) {
      setLocalValue(value);
      lastSentValueRef.current = value;
    }
  }, [value]);

  // Flush function to immediately send pending value to parent
  const flush = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (localValue !== lastSentValueRef.current) {
      lastSentValueRef.current = localValue;
      onChangeTextRef.current(localValue);
    }
    isTypingRef.current = false;
  }, [localValue]);

  // Expose flush via ref
  React.useImperativeHandle(ref, () => ({
    flush,
  }), [flush]);

  const handleChangeText = useCallback((text: string) => {
    // Update local state immediately - this is what makes typing smooth
    setLocalValue(text);
    isTypingRef.current = true;

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the parent update to reduce re-renders
    debounceTimerRef.current = setTimeout(() => {
      lastSentValueRef.current = text;
      onChangeTextRef.current(text);
      // Keep typing flag true for a bit longer to prevent parent value from overwriting
      setTimeout(() => {
        isTypingRef.current = false;
      }, 200);
    }, 150); // 150ms debounce - fast enough to feel responsive
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Send final value when input loses focus
  const handleBlur = useCallback(() => {
    flush();
  }, [flush]);

  return (
    <TextInput
      style={[
        styles.input,
        isVerified && styles.verifiedColor,
        hasError && styles.inputError,
        inputStyle,
      ]}
      value={localValue}
      onChangeText={handleChangeText}
      onBlur={handleBlur}
      placeholderTextColor="#777"
      {...textInputProps}
    />
  );
});

DebouncedTextInput.displayName = 'DebouncedTextInput';

// ============ PREVIEW UPLOADS COMPONENT ============
const PreviewUploads = memo(({
  previewUrl,
  onRemove,
  name,
  isUploaded,
  isPDF,
  isLocalPreview = false,
}: {
  previewUrl?: string;
  onRemove: () => void;
  name: string;
  isUploaded?: boolean;
  isPDF?: boolean;
  isLocalPreview?: boolean;
}) => {
  // Check if we have a valid local preview (file://, content://) or just a CDN URL
  const hasLocalPreview = previewUrl && (
    previewUrl.startsWith('file://') || 
    previewUrl.startsWith('content://') ||
    previewUrl.startsWith('/') ||
    isLocalPreview
  );
  
  return (
    <View className="items-center">
      <View className="w-24 h-24 bg-black rounded-md items-center justify-center overflow-hidden mb-2 border border-gray-600">
        {isPDF ? (
          <View className="w-full h-full items-center justify-center bg-gray-800">
            <Text className="text-white font-semibold">PDF</Text>
          </View>
        ) : hasLocalPreview && previewUrl ? (
          <Image source={{uri: previewUrl}} className="w-full h-full" resizeMode="cover" />
        ) : isUploaded ? (
          <View className="w-full h-full items-center justify-center bg-green-900/50">
            <Feather name="check-circle" size={24} color="#22c55e" />
            <Text className="text-green-400 text-xs mt-1 text-center px-1">Uploaded</Text>
          </View>
        ) : (
          <Feather name="file" size={24} color="#fff" />
        )}
      </View>
      <Text className="text-white text-xs mb-2">{name}{isUploaded ? ' (Uploaded)' : ''}</Text>
      <TouchableOpacity onPress={onRemove} className="px-3 py-1 bg-red-500 rounded-md">
        <Text className="text-white text-xs">Remove</Text>
      </TouchableOpacity>
    </View>
  );
});

PreviewUploads.displayName = 'PreviewUploads';

// ============ MAIN COMPONENT ============
const SellerRegisterTab2 = ({navigation, route}: {navigation: any; route: any}) => {
  const [loading, setLoading] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(INITIAL_ERRORS);
  const [gstVerificationData, setGstVerificationData] = useState<GstVerificationData | null>(null);
  const [panVerificationData, setPanVerificationData] = useState<PanVerificationData | null>(null);
  const [otpReferenceId, setOtpReferenceId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [brand, setBrand] = useState('');

  const [aadhaarAttempts, setAadhaarAttempts] = useState(0);
  const [gstAttempts, setGstAttempts] = useState(0);
  const [panAttempts, setPanAttempts] = useState(0);

  const [aadharVerified, setAadharVerified] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);

  const [verifiedAadhaarNumber, setVerifiedAadhaarNumber] = useState('');
  const userChangedAadhaarRef = useRef(false);

  // Refs for debounced inputs to flush pending values before validation
  const gstInputRef = useRef<DebouncedTextInputRef>(null);
  const aadhaarInputRef = useRef<DebouncedTextInputRef>(null);
  const panInputRef = useRef<DebouncedTextInputRef>(null);

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFiles>(INITIAL_UPLOADING);
  const [isPdf, setIsPdf] = useState<IsPdfState>(INITIAL_IS_PDF);
  const [isPickingFile, setIsPickingFile] = useState(false);
  
  // Local preview URIs - these are NOT saved, only used for display
  const [localPreviews, setLocalPreviews] = useState<{
    aadhaarFront: string | null;
    aadhaarBack: string | null;
    gstDocument: string | null;
    panFront: string | null;
    gstDeclaration: string | null;
  }>({
    aadhaarFront: null,
    aadhaarBack: null,
    gstDocument: null,
    panFront: null,
    gstDeclaration: null,
  });

  // Signed URLs for S3 private bucket files (when local preview is not available)
  const [signedUrls, setSignedUrls] = useState<{
    aadhaarFront: string | null;
    aadhaarBack: string | null;
    gstDocument: string | null;
    panFront: string | null;
    gstDeclaration: string | null;
  }>({
    aadhaarFront: null,
    aadhaarBack: null,
    gstDocument: null,
    panFront: null,
    gstDeclaration: null,
  });

  // Loading state for fetching signed URLs
  const [fetchingSignedUrls, setFetchingSignedUrls] = useState<{
    aadhaarFront: boolean;
    aadhaarBack: boolean;
    gstDocument: boolean;
    panFront: boolean;
    gstDeclaration: boolean;
  }>({
    aadhaarFront: false,
    aadhaarBack: false,
    gstDocument: false,
    panFront: false,
    gstDeclaration: false,
  });

  const rbSheetRef = useRef<any>(null);

  const data = route.params;
  // Defaults first, then saved data on top - so saved values take precedence
  const {formData: rawFormData, setFormData: rawSetFormData, verificationData} = useAutoSave({
    // Defaults first
    streetAddress1: '', city: '', state: '', streetAddress2: '', pinCode: '',
    hasGST: false, gstNumber: '', gstVerified: false, panVerified: false, aadharVerified: false,
    gstDocument: null, gstDeclaration: null, panNumber: '', panFront: null,
    aadhaarNumber: '', aadhaarFront: null, aadhaarBack: null,
    // Then spread saved data to override defaults
    ...data?.formData,
  });

  const formData = rawFormData as any;
  const setFormData = rawSetFormData as any;

  useEffect(() => {
    const loadBrand = async () => {
      const storedBrand = await AsyncStorage.getItem('type');
      setBrand(storedBrand || '');
    };
    loadBrand();
  }, []);

  // Fetch signed URLs for files that are uploaded but don't have local previews
  useEffect(() => {
    const fetchSignedUrlsForFiles = async () => {
      const fileFields: (keyof UploadingFiles)[] = ['aadhaarFront', 'aadhaarBack', 'gstDocument', 'panFront', 'gstDeclaration'];
      
      for (const field of fileFields) {
        const s3Key = formData[field];
        const hasLocalPreview = localPreviews[field];
        const hasSignedUrl = signedUrls[field];
        
        // Only fetch signed URL if we have an S3 key but no local preview and no existing signed URL
        if (s3Key && !hasLocalPreview && !hasSignedUrl) {
          try {
            // Set loading state for this field
            setFetchingSignedUrls(prev => ({...prev, [field]: true}));
            const signedUrl = await generatePrivateSignedUrl(s3Key);
            if (signedUrl) {
              setSignedUrls(prev => ({...prev, [field]: signedUrl}));
            }
          } catch (error) {
            console.log(`Error fetching signed URL for ${field}:`, error);
          } finally {
            setFetchingSignedUrls(prev => ({...prev, [field]: false}));
          }
        }
      }
    };

    fetchSignedUrlsForFiles();
  }, [formData.aadhaarFront, formData.aadhaarBack, formData.gstDocument, formData.panFront, formData.gstDeclaration, localPreviews, signedUrls]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const restoreVerificationData = async () => {
      const verData = verificationData as any;
      // console.log(verData)
      if (verData?.status !== 'success') return;
      if (verData.data?.gst?.verificationStatus === 'verified') {
        setFormData((prev: any) => ({...prev, gstVerified: true}));
        const address = verData.data.gst.address || {};
        setGstVerificationData({
          name: verData.data.gst.businessName || verData.data.gst.tradeName,
          address: `${address.building || ''}, ${address.street || ''}, ${address.location || ''}`,
          building: address.building || '', street: address.street || '', location: address.location || '',
        });
        // Use gstNumber from verification response if formData doesn't have it
        // Check for gstin (API response) or gstNumber (verification status response)
        const gstNumberFromVerification = verData.data.gst.gstin || verData.data.gst.gstNumber;
        
        // Build address fields from GST verification data (like web app)
        const addressLine1Parts: string[] = [];
        if (address.building) addressLine1Parts.push(address.building);
        if (address.street) addressLine1Parts.push(address.street);
        const addressLine1 = addressLine1Parts.join(', ');
        const addressLine2 = address.location || '';
        
        setFormData((prev: any) => ({
          ...prev, 
          hasGST: true, 
          gstNumber: prev.gstNumber || gstNumberFromVerification || '',
          // Auto-fill address from GST verification (if not already filled)
          streetAddress1: prev.streetAddress1 || addressLine1 || '',
          streetAddress2: prev.streetAddress2 || addressLine2 || '',
          city: prev.city || address.city || address.district || '',
          state: prev.state || address.state || '',
          pinCode: prev.pinCode || address.pincode || '',
        }));
        setGstVerified(true);
      }
      // Restore local panVerified state from formData if it was previously saved
      if (formData.panVerified === true) {
        setPanVerified(true);
      }
      if (verData.data?.aadhaar?.verificationStatus === 'verified' && verData.data.aadhaar.aadhaarNumber) {
        const draftAadhaarNumber = verData.data.aadhaar.aadhaarNumber;
        if (userChangedAadhaarRef.current) return;
        // Always fill the aadhaar number from verification data if not already filled
        setAadharVerified(true);
        setVerifiedAadhaarNumber(draftAadhaarNumber);
        setFormData((prev: any) => ({
          ...prev, 
          aadharVerified: true,
          // Fill aadhaar number from verification if form doesn't have it
          aadhaarNumber: prev.aadhaarNumber || draftAadhaarNumber,
        }));
      }
      if (verData.data?.pan?.verificationStatus === 'verified') {
        setPanVerified(true);
        // Get PAN number from verification data - check multiple possible keys
        const panNumberFromVerification = verData.data.pan.panNumber || verData.data.pan.number || '';
        setPanVerificationData({
          registeredName: verData.data.pan.registeredName || verData.data.pan.name || '', 
          name: verData.data.pan.registeredName || verData.data.pan.name || '',
        });
        setFormData((prev: any) => ({
          ...prev, 
          panVerified: true,
          // Use panNumber from formData if available, otherwise from verification data
          panNumber: prev.panNumber || panNumberFromVerification,
          name: verData.data.pan.registeredName || verData.data.pan.name || prev.name,
        }));
      }
    };
    restoreVerificationData();
  }, [verificationData]);

  const validateField = useCallback((field: string, value: string) => {
    let error = '';
    switch (field) {
      case 'aadhaarNumber': error = ValidationUtils.isValidAadhaar(value); break;
      case 'panNumber': error = ValidationUtils.isValidPAN(value); break;
      case 'gstNumber': if (formData.hasGST) error = ValidationUtils.isValidGST(value); break;
    }
    setErrors(prev => ({...prev, [field]: error}));
    return error;
  }, [formData.hasGST]);

  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    if (field === 'aadhaarNumber' && typeof value === 'string') {
      userChangedAadhaarRef.current = true;
      // Only mark as verified if:
      // 1. Value matches the verified number AND
      // 2. Verified number is not empty AND
      // 3. Value is exactly 12 digits
      const isVerified = value === verifiedAadhaarNumber && 
                         verifiedAadhaarNumber.length === 12 && 
                         value.length === 12;
      setAadharVerified(isVerified);
      setFormData((prev: any) => ({...prev, [field]: value, aadharVerified: isVerified}));
      validateField(field, value);
    } else if (field === 'panNumber' && typeof value === 'string') {
      setPanVerified(false);
      setFormData((prev: any) => ({...prev, [field]: value, panVerified: false}));
      setPanVerificationData(null);
      validateField(field, value);
    } else if (field === 'gstNumber' && typeof value === 'string') {
      setGstVerified(false);
      setFormData((prev: any) => ({...prev, [field]: value, gstVerified: false}));
      setGstVerificationData(null);
      validateField(field, value);
    } else {
      setFormData((prev: any) => ({...prev, [field]: value}));
      if (typeof value === 'string') validateField(field, value);
    }
  }, [setFormData, validateField, verifiedAadhaarNumber]);

  const pickFile = useCallback(async (field: string) => {
    if (isPickingFile) { ToastAndroid.show('File picking in progress', ToastAndroid.SHORT); return; }
    try {
      setIsPickingFile(true);
      const hasPermission = await checkPermission('gallery');
      if (!hasPermission) { ToastAndroid.show('Gallery permission denied', ToastAndroid.SHORT); return; }
      setUploadingFiles(prev => ({...prev, [field]: true}));
      const result = await DocumentPicker.pick({
        type: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
        copyTo: 'cachesDirectory', allowMultiSelection: false,
      });
      if (!result?.[0]) { ToastAndroid.show('No file selected', ToastAndroid.SHORT); return; }
      const file = result[0];
      const fileType = file.type?.toLowerCase() || '';
      const fileUri = file.fileCopyUri || file.uri;
      if (file.size && file.size > 10 * 1024 * 1024) { ToastAndroid.show('File too large. Max 10MB.', ToastAndroid.LONG); return; }
      let uploadUrl = '';
      if (fileType === 'application/pdf') {
        uploadUrl = await uploadPdfToS3(fileUri, 'KYC', true);
        if (uploadUrl) setIsPdf(prev => ({...prev, [field]: true}));
      } else if (fileType.startsWith('image/')) {
        uploadUrl = await uploadImageToS3(fileUri, 'KYC', true) || '';
      } else { ToastAndroid.show('Unsupported file type', ToastAndroid.LONG); return; }
      if (!uploadUrl) { ToastAndroid.show('Upload failed', ToastAndroid.SHORT); return; }
      if (field === 'gstDeclaration') setFormData((prev: any) => ({...prev, gstVerified: true}));
      // Store local preview URI
      setLocalPreviews(prev => ({...prev, [field]: fileUri}));
      handleInputChange(field, uploadUrl);
    } catch (err: any) {
      if (DocumentPicker.isCancel(err)) ToastAndroid.show('Cancelled', ToastAndroid.SHORT);
      else ToastAndroid.show(err.message || 'Error', ToastAndroid.LONG);
    } finally {
      setIsPickingFile(false);
      setUploadingFiles(prev => ({...prev, [field]: false}));
    }
  }, [isPickingFile, handleInputChange, setFormData]);

  const removeFile = useCallback(async (key: keyof UploadingFiles) => {
    try {
      const fileUrl = formData[key];
      setUploadingFiles(prev => ({...prev, [key]: true}));
      setFormData((prev: any) => ({...prev, [key]: ''}));
      setIsPdf(prev => ({...prev, [key]: false}));
      // Clear local preview and signed URL
      setLocalPreviews(prev => ({...prev, [key]: null}));
      setSignedUrls(prev => ({...prev, [key]: null}));
      if (fileUrl) await deleteObjectFromS3(fileUrl);
    } catch (error) { console.log('Delete failed', error); }
    finally { setUploadingFiles(prev => ({...prev, [key]: false})); }
  }, [formData, setFormData]);

  const handleVerifyGST = useCallback(async () => {
    if (gstAttempts >= 3) { ToastAndroid.show('Max attempts exceeded', ToastAndroid.SHORT); return; }
    setLoading(true);
    try {
      const response = await axiosInstance.post('/apply/verify-gst', {gstNumber: formData.gstNumber});
      const respData = response.data;
      setFormData((prev: any) => ({...prev, gstVerified: true}));
      const address = respData?.data?.address;
      setGstVerificationData({
        name: respData.data.businessName,
        address: `${address?.building || ''}, ${address?.street || ''}, ${address?.location || ''}`,
        building: address?.building, street: address?.street, location: address?.location,
      });
      setGstAttempts(prev => prev + 1);
      setGstVerified(true);
      if (address) {
        setFormData((prev: any) => ({
          ...prev, streetAddress2: address.location || '',
          streetAddress1: [address.building, address.street].filter(Boolean).join(', '),
          city: address.district, state: address.state, pinCode: address.pincode,
        }));
      }
    } catch (error: any) {
      let errorMsg = error?.response?.data?.message || error?.response?.data?.error || 'Network error';
      setErrors(prev => ({...prev, gstNumber: errorMsg}));
    } finally { setLoading(false); }
  }, [formData.gstNumber, gstAttempts, setFormData]);

  const handleVerifyPAN = useCallback(async () => {
    if (panAttempts >= 3) { ToastAndroid.show('Max attempts exceeded', ToastAndroid.SHORT); return; }
    setLoading(true);
    try {
      const response = await axiosInstance.post('/apply/verify-pan', {panNumber: formData.panNumber});
      const respData = response.data;
      setPanAttempts(prev => prev + 1);
      setPanVerified(true);
      setFormData((prev: any) => ({...prev, panVerified: true}));
      setPanVerificationData({registeredName: respData.data.registeredName || respData.data.name, name: respData.data.name});
    } catch (error: any) {
      setErrors(prev => ({...prev, panNumber: error?.response?.data?.error || 'Network error'}));
    } finally { setLoading(false); }
  }, [formData.panNumber, panAttempts, setFormData]);

  const handleSendOTP = useCallback(async () => {
    if (aadhaarAttempts >= 3) { ToastAndroid.show('Max attempts exceeded', ToastAndroid.SHORT); return; }
    setLoading(true);
    try {
      const response = await axiosInstance.post('/apply/kyc/send-otp', {aadhaarNumber: formData.aadhaarNumber});
      setAadhaarAttempts(prev => prev + 1);
      setOtpReferenceId(response.data?.refId);
      setOtpModalVisible(true);
    } catch (error: any) {
      let otpError = error?.response?.data?.message || 'Error sending OTP';
      setErrors(prev => ({...prev, aadhaarNumber: otpError}));
      setFormData((prev: any) => ({...prev, aadhaarNumber: ''}));
      ToastAndroid.show(otpError, ToastAndroid.SHORT);
    } finally { setLoading(false); }
  }, [aadhaarAttempts, formData.aadhaarNumber, setFormData]);

  const handleDownload = useCallback(() => { setLoading(true); downloadPDFToDownloads(); setLoading(false); }, []);
  const openHelpSheet = useCallback(() => { rbSheetRef.current?.open(); }, []);

  const performValidation = useCallback(() => {
    if (formData.hasGST) {
      if (!formData.gstNumber) { ToastAndroid.show('Fill GST fields', ToastAndroid.SHORT); return; }
      if (!gstVerified && gstAttempts <= 3) { ToastAndroid.show('Verify GST first', ToastAndroid.SHORT); return; }
      if (!gstVerified && gstAttempts > 3 && !formData.gstDeclaration) { ToastAndroid.show('Upload GST declaration', ToastAndroid.SHORT); return; }
    } else if (!formData.gstDeclaration) { ToastAndroid.show('Upload GST document', ToastAndroid.SHORT); return; }
    if (!formData.aadhaarNumber || !formData.panNumber || formData.aadhaarNumber.length !== 12) { ToastAndroid.show('Fill Aadhaar and PAN correctly', ToastAndroid.SHORT); return; }
    if (!aadharVerified) {
      if (aadhaarAttempts >= 3) {
        if (!formData.aadhaarFront || !formData.aadhaarBack) { ToastAndroid.show('Upload Aadhaar images', ToastAndroid.SHORT); return; }
      } else { ToastAndroid.show('Verify Aadhaar first', ToastAndroid.SHORT); return; }
    }
    if (!panVerified) {
      if (panAttempts >= 3) {
        if (!formData.panFront) { ToastAndroid.show('Upload PAN image', ToastAndroid.SHORT); return; }
      } else { ToastAndroid.show('Verify PAN first', ToastAndroid.SHORT); return; }
    }
    navigation.navigate('AddressDetails', {data: formData});
  }, [formData, gstVerified, gstAttempts, aadharVerified, aadhaarAttempts, panVerified, panAttempts, navigation]);

  const handleContinue = useCallback(() => {
    // Flush all pending input values before validation
    gstInputRef.current?.flush();
    aadhaarInputRef.current?.flush();
    panInputRef.current?.flush();
    
    // Small delay to allow state to update after flush
    setTimeout(() => {
      performValidation();
    }, 50);
  }, [performValidation]);

  return (
    <>
      {loading && <View style={styles.overlay}><ActivityIndicator size="small" color="gray" /></View>}
      <OTPVerificationModal
        onVerify={() => { setAadharVerified(true); setVerifiedAadhaarNumber(formData.aadhaarNumber); }}
        phoneNumber={otpReferenceId} visible={otpModalVisible} formdata={formData}
        handlesendOtp={handleSendOTP} setFormdata={setFormData} onClose={() => setOtpModalVisible(false)}
      />
      <FAQHelpBottomSheet rbSheetRef={rbSheetRef} currentTabIndex={1} />
      <OnboardingStatusWidget title="Your Onboarding Status" tasksConfig={brand} formData={formData} isOpen={showProgress} onClose={() => setShowProgress(false)} />
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <SellerHeader navigation={navigation} message="Business & KYC" />
        <KeyboardAvoidingView 
          style={styles.mainContent} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <ScrollView 
            style={styles.scrollContainer} 
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
            bounces={false}
            automaticallyAdjustKeyboardInsets={true}
          >
            <View style={styles.formWrapper}>
              <HorizontalTimeline activeIndex={1} activeDotColor="#FFD700" inactiveDotColor="#9CA3AF" text="Business & KYC Verification" activeLineColor="#FFD700" inactiveLineColor="#333" showStepNumbers={true} />
              <View style={styles.form}>
                <Text style={styles.label}>Do you Have GST? <Text style={styles.required}>*</Text></Text>
                <View style={[styles.row, {marginTop: 10, marginBottom: 20}]}>
                  <TouchableOpacity style={styles.radioButton} onPress={() => handleInputChange('hasGST', true)}>
                    <RadioButton value="yes" status={formData.hasGST ? 'checked' : 'unchecked'} color="#F7CE45" onPress={() => handleInputChange('hasGST', true)} />
                    <Text style={{color: 'white'}}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.radioButton} onPress={() => handleInputChange('hasGST', false)}>
                    <RadioButton value="no" status={!formData.hasGST ? 'checked' : 'unchecked'} color="#F7CE45" onPress={() => handleInputChange('hasGST', false)} />
                    <Text style={{color: 'white'}}>No</Text>
                  </TouchableOpacity>
                </View>

                {formData.hasGST ? (
                  <>
                    <Text style={styles.label}>GST Number <Text style={styles.required}>*</Text></Text>
                    <DebouncedTextInput ref={gstInputRef} placeholder="Enter GST number" autoCapitalize="characters" value={formData.gstNumber || ''} onChangeText={text => handleInputChange('gstNumber', text)} isVerified={gstVerified} hasError={!!errors.gstNumber} />
                    {errors.gstNumber ? <Text style={styles.errorText}>{errors.gstNumber}</Text> : null}
                    {formData.gstNumber?.length === 15 && !gstVerified && !errors.gstNumber && (
                      <TouchableOpacity onPress={handleVerifyGST} disabled={loading} style={[styles.verifyButton, loading && {opacity: 0.6}]}>
                        <MaterialIcons name="verified" size={20} color="#000" />
                        <Text style={styles.verifyButtonText}>{loading ? 'Verifying...' : 'Verify GST'}</Text>
                      </TouchableOpacity>
                    )}
                    {gstVerificationData && (
                      <View style={styles.verifiedBox}>
                        <Text style={styles.verifiedText}>✓ GST verified successfully</Text>
                        <Text style={styles.verifiedDetailText}>Business Name: {gstVerificationData.name}</Text>
                        {formData.gstNumber && <Text style={styles.verifiedDetailText}>GST Number: {formData.gstNumber}</Text>}
                        {gstVerificationData.address && <Text style={styles.verifiedDetailText}>Address: {gstVerificationData.address}</Text>}
                      </View>
                    )}
                    {gstAttempts >= 3 && !gstVerified && (
                      <View style={styles.warningBox}>
                        <Feather name="alert-triangle" size={16} color="#fb923c" />
                        <Text style={styles.warningText}>Max GST verification attempts reached. Upload GST document.</Text>
                      </View>
                    )}
                    {gstAttempts >= 3 && !gstVerified && (
                      <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile('gstDocument')}>
                        {uploadingFiles.gstDocument || fetchingSignedUrls.gstDocument ? <><ActivityIndicator color="#fff" size="large" /><Text style={{color: '#777', marginTop: 10}}>{fetchingSignedUrls.gstDocument ? 'Loading preview...' : 'Uploading...'}</Text></> :
                      formData.gstDocument ? <PreviewUploads previewUrl={localPreviews.gstDocument || signedUrls.gstDocument || undefined} onRemove={() => removeFile('gstDocument')} name="GST Document" isUploaded isLocalPreview={!!(localPreviews.gstDocument || signedUrls.gstDocument)} isPDF={isPdf.gstDocument} /> :
                          <><View style={styles.uploadIcon}><UploadIcon size={25} color="#000" /></View><Text style={styles.label}>Upload GST Document</Text><Text style={{color: '#777'}}>Supports PDF, JPG, JPEG, PNG</Text></>
                        }
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
                      <MaterialIcons name="download" size={30} color="#FFC100" />
                      <View style={{width: '80%'}}>
                        <Text style={{fontWeight: 'bold', color: '#fff'}}>Download GST Declaration Form</Text>
                        <Text style={{color: '#777', fontSize: 12}}>Download this form, fill in the details, then upload it</Text>
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.label}>Upload the filled GST form <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile('gstDeclaration')}>
                      {uploadingFiles.gstDeclaration || fetchingSignedUrls.gstDeclaration ? <><ActivityIndicator color="#fff" size="large" /><Text style={{color: '#777', marginTop: 10}}>{fetchingSignedUrls.gstDeclaration ? 'Loading preview...' : 'Uploading...'}</Text></> :
                        formData.gstDeclaration ? <PreviewUploads previewUrl={localPreviews.gstDeclaration || signedUrls.gstDeclaration || undefined} onRemove={() => removeFile('gstDeclaration')} name="GST Declaration" isUploaded isLocalPreview={!!(localPreviews.gstDeclaration || signedUrls.gstDeclaration)} isPDF={isPdf.gstDeclaration} /> :
                        <><View style={styles.uploadIcon}><UploadIcon size={25} color="#000" /></View><Text style={styles.label}>Filled Declaration form</Text><Text style={{color: '#777'}}>Supports PDF, JPG, JPEG, PNG</Text></>
                      }
                    </TouchableOpacity>
                  </>
                )}

                <Text style={styles.label}>Aadhaar Number <Text style={styles.required}>*</Text></Text>
                <DebouncedTextInput ref={aadhaarInputRef} placeholder="Enter your Aadhaar number" maxLength={12} keyboardType="numeric" value={formData.aadhaarNumber || ''} onChangeText={text => handleInputChange('aadhaarNumber', text)} isVerified={aadharVerified} hasError={!!errors.aadhaarNumber} />
                {aadharVerified && <View style={styles.verifiedRow}><MaterialIcons name="verified" color="green" size={16} /><Text style={{color: 'green', fontSize: 12}}>Aadhaar Verified</Text></View>}
                {errors.aadhaarNumber && !aadharVerified ? <Text style={styles.errorText}>{errors.aadhaarNumber}</Text> : null}
                {formData.aadhaarNumber?.length === 12 && aadhaarAttempts <= 3 && !errors.aadhaarNumber && !aadharVerified && (
                  <TouchableOpacity onPress={handleSendOTP} disabled={loading} style={[styles.verifyButton, loading && {opacity: 0.6}]}>
                    <MaterialIcons name="verified-user" size={20} color="#000" />
                    <Text style={styles.verifyButtonText}>{loading ? 'Sending OTP...' : 'Verify OTP'}</Text>
                  </TouchableOpacity>
                )}
                {aadhaarAttempts >= 3 && !aadharVerified && (
                  <>
                    <View style={styles.warningBox}><Feather name="alert-triangle" size={16} color="#fb923c" /><Text style={styles.warningText}>Max Aadhaar verification attempts reached. Upload Aadhaar documents.</Text></View>
                    <Text style={styles.label}>Aadhaar Front <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile('aadhaarFront')}>
                      {uploadingFiles.aadhaarFront || fetchingSignedUrls.aadhaarFront ? <><ActivityIndicator color="#fff" size="large" /><Text style={{color: '#777', marginTop: 10}}>{fetchingSignedUrls.aadhaarFront ? 'Loading preview...' : 'Uploading...'}</Text></> :
                        formData.aadhaarFront ? <PreviewUploads previewUrl={localPreviews.aadhaarFront || signedUrls.aadhaarFront || undefined} onRemove={() => removeFile('aadhaarFront')} name="Aadhaar Front" isUploaded isLocalPreview={!!(localPreviews.aadhaarFront || signedUrls.aadhaarFront)} isPDF={isPdf.aadhaarFront} /> :
                        <><View style={styles.uploadIcon}><Feather name="upload" size={24} color="#000" /></View><Text style={styles.uploadText}>Upload Aadhaar Front</Text></>
                      }
                    </TouchableOpacity>
                    <Text style={styles.label}>Aadhaar Back <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile('aadhaarBack')}>
                      {uploadingFiles.aadhaarBack || fetchingSignedUrls.aadhaarBack ? <><ActivityIndicator color="#fff" size="large" /><Text style={{color: '#777', marginTop: 10}}>{fetchingSignedUrls.aadhaarBack ? 'Loading preview...' : 'Uploading...'}</Text></> :
                        formData.aadhaarBack ? <PreviewUploads previewUrl={localPreviews.aadhaarBack || signedUrls.aadhaarBack || undefined} onRemove={() => removeFile('aadhaarBack')} name="Aadhaar Back" isUploaded isLocalPreview={!!(localPreviews.aadhaarBack || signedUrls.aadhaarBack)} isPDF={isPdf.aadhaarBack} /> :
                        <><View style={styles.uploadIcon}><Feather name="upload" size={24} color="#000" /></View><Text style={styles.uploadText}>Upload Aadhaar Back</Text></>
                      }
                    </TouchableOpacity>
                  </>
                )}

                <Text style={styles.label}>PAN Number <Text style={styles.required}>*</Text></Text>
                <DebouncedTextInput ref={panInputRef} placeholder="Enter Pan Number" autoCapitalize="characters" value={formData.panNumber || ''} onChangeText={text => handleInputChange('panNumber', text)} isVerified={panVerified} hasError={!!errors.panNumber} />
                {panVerificationData?.registeredName && <View style={styles.verifiedRow}><Text style={{color: 'green', fontSize: 10}}>{panVerificationData.registeredName}</Text><MaterialIcons name="verified" color="green" size={12} /></View>}
                {errors.panNumber ? <Text style={styles.errorText}>{errors.panNumber}</Text> : null}
                {formData.panNumber?.length === 10 && !panVerified && !errors.panNumber && (
                  <TouchableOpacity onPress={handleVerifyPAN} disabled={loading} style={[styles.verifyButton, loading && {opacity: 0.6}]}>
                    <MaterialIcons name="verified" size={20} color="#000" />
                    <Text style={styles.verifyButtonText}>{loading ? 'Verifying...' : 'Verify PAN'}</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.infoRow}><MaterialIcons name="info-outline" color="gray" size={20} /><Text style={{color: 'gray'}}>Please enter your PAN number in uppercase (CAPS) only.</Text></View>
                {panAttempts >= 3 && !panVerified && (
                  <>
                    <View style={styles.warningBox}><AlertTriangle size={16} color="#fb923c" /><Text style={styles.warningText}>Max PAN verification attempts reached. Upload PAN document.</Text></View>
                    <Text style={styles.label}>PAN Document <Text style={styles.required}>*</Text></Text>
                    <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile('panFront')}>
                      {uploadingFiles.panFront || fetchingSignedUrls.panFront ? <><ActivityIndicator color="#fff" size="large" /><Text style={{color: '#777', marginTop: 10}}>{fetchingSignedUrls.panFront ? 'Loading preview...' : 'Uploading...'}</Text></> :
                        formData.panFront ? <PreviewUploads previewUrl={localPreviews.panFront || signedUrls.panFront || undefined} onRemove={() => removeFile('panFront')} name="PAN Document" isUploaded isLocalPreview={!!(localPreviews.panFront || signedUrls.panFront)} isPDF={isPdf.panFront} /> :
                        <><View style={styles.uploadIcon}><Upload size={24} color="#000" /></View><Text style={styles.uploadText}>Upload PAN Document</Text></>
                      }
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
          
          {/* Fixed buttons at the bottom */}
          <View style={styles.fixedButtonContainer}>
            <View style={styles.buttons}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, {backgroundColor: 'transparent'}]}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleContinue} style={[styles.backButton, {backgroundColor: '#F7CE45'}]}>
                <Text style={[styles.backButtonText, {color: '#000'}]}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
        
        <View style={styles.fabContainer}>
          <CompactProgressFAB formData={formData} tasksConfig={brand} onPress={() => setShowProgress(true)} />
          <FABHelpButton onPress={openHelpSheet} style={styles.helpFab} />
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000},
  container: {flex: 1, backgroundColor: '#121212'},
  mainContent: {flex: 1},
  scrollContainer: {flex: 1},
  scrollContentContainer: {flexGrow: 1, padding: 20, paddingBottom: 20},
  formWrapper: {flex: 1},
  form: {marginBottom: 30},
  label: {fontSize: 15, marginBottom: 10, fontWeight: 'bold', color: '#fff'},
  required: {color: 'red'},
  input: {height: 50, borderColor: '#1E1E1E', borderWidth: 1, backgroundColor: colors.primaryColor, elevation: 3, marginBottom: 10, color: '#fff', borderRadius: 10, paddingLeft: 10},
  inputError: {borderColor: 'red'},
  verifiedColor: {borderColor: '#74FF8DBF'},
  errorText: {color: 'red', fontSize: 12, marginBottom: 10},
  row: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  radioButton: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  verifyButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7CE45', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginBottom: 15, gap: 8},
  verifyButtonText: {color: '#000', fontWeight: 'bold', fontSize: 15},
  verifiedBox: {backgroundColor: 'rgba(0, 200, 83, 0.1)', borderWidth: 1, borderColor: 'rgba(0, 200, 83, 0.3)', borderRadius: 10, padding: 12, marginBottom: 15},
  verifiedText: {color: '#00c853', fontSize: 14, fontWeight: 'bold', marginBottom: 4},
  verifiedDetailText: {color: '#00c853', fontSize: 12, marginTop: 2},
  verifiedRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -5, marginBottom: 10},
  warningBox: {flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(251, 146, 60, 0.1)', borderWidth: 1, borderColor: 'rgba(251, 146, 60, 0.3)', borderRadius: 10, padding: 12, marginBottom: 15},
  warningText: {color: '#fb923c', fontSize: 12, flex: 1},
  uploadButton: {height: 200, backgroundColor: '#1B1B1B', alignItems: 'center', padding: 10, justifyContent: 'center', marginBottom: 15, borderRadius: 10, elevation: 3},
  uploadIcon: {backgroundColor: '#FFC100', borderRadius: 50, padding: 5, marginBottom: 10},
  uploadText: {color: '#fff', fontWeight: '500', marginBottom: 5},
  downloadButton: {flexDirection: 'row', padding: 10, backgroundColor: '#FDD1221A', borderWidth: 1, borderColor: '#FDD122', borderStyle: 'dashed', marginBottom: 10, borderRadius: 10, gap: 10, alignItems: 'center'},
  fixedButtonContainer: {backgroundColor: '#121212', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 16},
  buttons: {flexDirection: 'row', justifyContent: 'space-evenly', gap: 20},
  backButton: {flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F7CE45', paddingHorizontal: 50, borderRadius: 30, paddingVertical: 8},
  backButtonText: {color: '#F7CE45', fontWeight: 'bold', fontSize: 16},
  infoRow: {flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10},
  fabContainer: {position: 'absolute', bottom: 90, right: 0},
  helpFab: {position: 'absolute', bottom: 40, right: 20},
});

export default memo(SellerRegisterTab2);
