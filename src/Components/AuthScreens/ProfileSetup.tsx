import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ToastAndroid,
  Dimensions,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import auth from '@react-native-firebase/auth';
import {
  User,
  Camera,
  Check,
  CheckCircle,
  MapPin,
  Home,
  Briefcase,
  Phone,
  Hash,
  Upload,
  Building2,
  Map,
  Globe,
  AlertTriangle,
  UserCheck,
  XCircle,
  Loader2,
  Shield,
  X,
  InfoIcon,
  Info,
  ArrowLeftCircle,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { AWS_CDN_URL } from '../../../Config';

import axiosInstance from '../../Utils/Api';
import { uploadImageToS3 } from '../../Utils/aws';
import { useAuthContext } from '../../Context/AuthContext';
import { useMobileVerification } from '../../hooks/useMobileVerification';
import { useProfileSetupAutosave } from '../../hooks/useProfileSetupAutosave';
import useConfirmModal from '../../hooks/useAlertModal';
import GlobalConfirmModal from '../Reuse/AlertModal';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isMediumScreen = width < 400;

// Indian States Data
const indianStates = [
  'Tamil Nadu',
  'Karnataka',
  'Kerala',
  'Andhra Pradesh',
  'Telangana',
  'Maharashtra',
  'Gujarat',
  'Rajasthan',
  'Uttar Pradesh',
  'Bihar',
  'West Bengal',
  'Odisha',
  'Madhya Pradesh',
  'Chhattisgarh',
  'Jharkhand',
  'Assam',
  'Punjab',
  'Haryana',
  'Himachal Pradesh',
  'Uttarakhand',
  'Goa',
  'Manipur',
  'Meghalaya',
  'Tripura',
  'Mizoram',
  'Nagaland',
  'Arunachal Pradesh',
  'Sikkim',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
].sort().map((state) => ({ label: state, value: state }));

// InputField Component
const InputField = ({
  label,
  icon: Icon,
  name,
  control,
  rules,
  placeholder,
  error,
  keyboardType = 'default',
  maxLength,
}: {
  label: string;
  icon: any;
  name: string;
  control: any;
  rules?: any;
  placeholder: string;
  error?: any;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'number-pad';
  maxLength?: number;
}) => (
  <View style={styles.inputContainer}>
    <View style={styles.labelContainer}>
      <Icon color="#F7CE45" size={16} />
      <Text style={styles.label}>{label}</Text>
    </View>
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, onBlur, value } }) => (
        <TextInput
          style={[styles.input, error && styles.inputError]}
          placeholder={placeholder}
          placeholderTextColor="#808080"
          onBlur={onBlur}
          onChangeText={onChange}
          value={value}
          keyboardType={keyboardType}
          maxLength={maxLength}
        />
      )}
    />
    {error && (
      <View style={styles.errorContainer}>
        <AlertTriangle color="#EF4444" size={12} />
        <Text style={styles.errorText}>{error.message}</Text>
      </View>
    )}
  </View>
);

// Phone Input Component
const PhoneInputField = ({
  label,
  name,
  control,
  rules,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  control: any;
  rules?: any;
  placeholder: string;
  error?: any;
}) => (
  <View style={styles.inputContainer}>
    <View style={styles.labelContainer}>
      <Phone color="#F7CE45" size={16} />
      <Text style={styles.label}>{label}</Text>
    </View>
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.phoneInputWrapper}>
          <View style={styles.phonePrefix}>
            <Text style={styles.phonePrefixText}>+91</Text>
          </View>
          <TextInput
            style={[styles.phoneInput, error && styles.inputError]}
            placeholder={placeholder}
            placeholderTextColor="#808080"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
      )}
    />
    {error && (
      <View style={styles.errorContainer}>
        <AlertTriangle color="#EF4444" size={12} />
        <Text style={styles.errorText}>{error.message}</Text>
      </View>
    )}
  </View>
);

// Main Component
const ProfileSetup = ({ navigation, onClose }: { navigation: any; onClose?: () => void }) => {
  const { user, fetchuser: fetchUser, logout } = useAuthContext();

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpIndex, setOtpIndex] = useState(0);
  const otpInputs = useRef([]);

  // Use mobile verification hook
  const {
    loading: otpLoading,
    error: otpError,
    success: otpSuccess,
    countdown,
    sendOTP,
    verifyOTP,
    resendOTP,
  } = useMobileVerification(fetchUser, 'user_verification');

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<{
    userName: string;
    profilePictureKey: string | null;
    name: string;
    gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | '';
    mobile: string;
    // alternateMobile: string; // COMMENTED: No longer needed as per backend team
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    addressType: string;
    isDefault: boolean;
  }>({
    mode: 'onChange',
    defaultValues: {
      userName: user?.userName || '',
      profilePictureKey: user?.profileURL?.key || null,
      name: user?.name || '',
      gender: '',
      mobile: user?.mobile || '',   // "mobile": "+918637469494",
      // alternateMobile: '', // COMMENTED: No longer needed as per backend team
      line1: '',
      line2: '',
      city: '',
      state: 'Tamil Nadu',
      pincode: '',
      addressType: 'home',
      isDefault: true,
    },
  });

  //console.log('user: ', user);

  // Initialize autosave hook
  const { loadDraft, clearDraft, isEnabled: autosaveEnabled } = useProfileSetupAutosave(
    watch,
    reset,
    setValue,
    user,
    selectedImageUri,
    setSelectedImageUri,
    true           // Flag To enable/Disable Autosave
  );

  // Initialize confirm modal hook for logout
  const { modalConfig, showModal, hideModal, handleConfirm } = useConfirmModal();

  const profilePictureKey = watch('profilePictureKey');
  const currentUsername = watch('userName');
  const gender = watch('gender');
  const addressType = watch('addressType');
  const isDefault = watch('isDefault');
  
  // Track if initial form setup is complete
  const isInitializedRef = useRef(false);

  const getImageUrl = () => {
    // Show selected local image first, then uploaded image
    if (selectedImageUri) return selectedImageUri;
    if (!profilePictureKey) return null;
    return `${AWS_CDN_URL}${profilePictureKey}`;
  };

  // Only reset form on initial mount, not on subsequent user updates
  useEffect(() => {
    if (user && !isInitializedRef.current) {
      const defaultUserName =
        user.userName || (user.name ? user.name.split(' ')[0]?.toLowerCase() : '');
      
      // Strip +91 prefix from mobile number if present
      const mobileNumber = user.mobile || '';
      const cleanedMobile = mobileNumber.startsWith('+91') 
        ? mobileNumber.substring(3) 
        : mobileNumber;
      
      reset({
        userName: defaultUserName,
        profilePictureKey: user.profileURL?.key || null,
        name: user.name || '',
        gender: '',
        mobile: cleanedMobile,
        // alternateMobile: '', // COMMENTED: No longer needed as per backend
        line1: '',
        line2: '',
        city: '',
        state: 'Tamil Nadu',
        pincode: '',
        addressType: 'home',
        isDefault: true,
      });
      generateSuggestions(user.name);
      
      // Load draft after setting default values
      loadDraft();
      
      // Mark as initialized
      isInitializedRef.current = true;
    }
  }, [user, reset, loadDraft]);

  const generateSuggestions = async (baseName) => {
    if (!baseName) return;
    try {
      const response = await axiosInstance.post('/onboarding/generate-usernames', {
        baseName,
      });
      setSuggestions(response.data.data || []);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username === user?.userName) {
      return true;
    }
    try {
      const response = await axiosInstance.get(
        `/profile/username-availability?userName=${username}`
      );
      return response.data.status || 'Username is already taken';
    } catch (error) {
      return 'Error checking username';
    }
  };

  // Separate effect to update username status for UI feedback
  useEffect(() => {
    const checkStatus = async () => {
      if (!currentUsername || currentUsername.length < 3) {
        setUsernameStatus('short');
        return;
      }
      if (currentUsername === user?.userName) {
        setUsernameStatus('available');
        return;
      }
      
      setUsernameStatus(null); // Show loading state
      
      try {
        const response = await axiosInstance.get(
          `/profile/username-availability?userName=${currentUsername}`
        );
        setUsernameStatus(response.data.status ? 'available' : 'taken');
      } catch (error) {
        setUsernameStatus('error');
      }
    };
    
    const timeoutId = setTimeout(checkStatus, 500); // Debounce 500ms
    return () => clearTimeout(timeoutId);
  }, [currentUsername, user?.userName]);

  const handleSendOtp = async () => {
    const mobileNumber = watch('mobile');
    
    if (!mobileNumber || mobileNumber.length !== 10) {
      trigger('mobile'); // Show RHF validation
      return;
    }

    const formattedMobile = mobileNumber.startsWith('+91') 
      ? mobileNumber 
      : `+91${mobileNumber}`;
    
    // Open modal first, then send OTP
    setOtpModalVisible(true);
    await sendOTP(formattedMobile);
  };

  const handleOtpChange = (text, index) => {
    if (!/^\d*$/.test(text)) return;

    // Handle paste or multi-character input
    if (text.length > 1) {
      // Extract only digits from pasted text
      const digits = text.replace(/\D/g, '');
      
      // Build new OTP by preserving existing values before paste position
      // and filling from paste position onwards
      const newOtpArray = [...otp];
      
      // Fill from current index with pasted digits
      for (let i = 0; i < digits.length && (index + i) < 6; i++) {
        newOtpArray[index + i] = digits[i];
      }
      
      setOtp(newOtpArray);
      
      // Focus on the next empty field or last field if all filled
      const nextIndex = Math.min(index + digits.length, 5);
      otpInputs.current[nextIndex]?.focus();
      
      // Check if OTP is complete
      // if (newOtpArray.join('').length === 6) {
      //   handleVerifyOtp();
      // }
    } else {
      // Handle single character input (typing)
      const newOtp = [...otp];
      newOtp[index] = text.slice(-1);
      setOtp(newOtp);

      if (text && index < 5) {
        otpInputs.current[index + 1]?.focus();
      }
      
      // Check if OTP is complete
      // if (newOtp.join('').length === 6) {
      //   handleVerifyOtp();
      // }
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleOtpFocus = (index) => {
    // Only redirect if the CURRENT box is EMPTY
    if (otp[index] === '') {
      // Find the first empty field
      const firstEmptyIndex = otp.findIndex(digit => digit === '');
      
      // If there's an empty field before the current index, focus on it instead
      if (firstEmptyIndex !== -1 && firstEmptyIndex < index) {
        setTimeout(() => {
          otpInputs.current[firstEmptyIndex]?.focus();
        }, 0);
      }
    }
    // If the current box is FILLED, allow user to click it (no redirection)
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    const result = await verifyOTP(otpString);
    
    if (result) {
      ToastAndroid.show('Mobile number verified successfully!', ToastAndroid.SHORT);
      setOtpModalVisible(false);
      setOtp(['', '', '', '', '', '']);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    const mobileNumber = watch('mobile');
    const formattedMobile = mobileNumber.startsWith('+91') 
      ? mobileNumber 
      : `+91${mobileNumber}`;
    console.log('mobile number to resend otp',formattedMobile);
    const result = await resendOTP(formattedMobile);
    if (result) {
      ToastAndroid.show('OTP resent successfully!', ToastAndroid.SHORT);
    }
  };

  const handleProfilePictureSelect = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    });

    if (result.didCancel || !result.assets || result.assets.length === 0) return;

    const file = result.assets[0];
    // Store the local URI for preview
    setSelectedImageUri(file.uri);
  };

  const onSubmit = async (data) => {
    console.log('Profile submit data: ', data);
    
    // Check if mobile is verified
    if (!user?.isMobileVerified) {
      ToastAndroid.show('Please verify your mobile number with OTP before continue', ToastAndroid.LONG);
      return;
    }
    
    setLoading(true);
    try {
      // Upload profile picture to S3 if a new image was selected
      if (selectedImageUri) {
        try {
          const s3Key = await uploadImageToS3(selectedImageUri, 'profile-images');
          
          if (!s3Key) {
            throw new Error('Failed to upload image to S3');
          }
          
          // Update backend with the new profile picture key
          await axiosInstance.put('/onboarding/profile-picture', {
            profileImageKey: s3Key,
          });
          
          // Update form state
          setValue('profilePictureKey', s3Key);
        } catch (error) {
          console.error('Error uploading profile picture:', error);
          ToastAndroid.show('Failed to upload profile picture. Please try again.', ToastAndroid.LONG);
          setLoading(false);
          return; // Stop submission if upload fails
        }
      }

      // Update username if changed
      if (data.userName !== user.userName) {
        await axiosInstance.put('/onboarding/username', { userName: data.userName });
      }

      // Update gender - separate API call
      if (data.gender) {
        await axiosInstance.put('/onboarding/gender', { gender: data.gender });
      }

      const {
        name,
        mobile,
        // alternateMobile, // COMMENTED: No longer needed as per backend team
        line1,
        line2,
        city,
        state,
        pincode,
        addressType,
        isDefault,
      } = data;

      // Save address if filled
      const isAddressFilled = line1 && city && pincode;
      if (isAddressFilled) {
        // Format mobile numbers with +91 prefix for backend
        const formattedMobile = mobile.startsWith('+91') ? mobile : `+91${mobile}`;
        // COMMENTED: No longer needed as per backend team
        // const formattedAlternateMobile = alternateMobile 
        //   ? (alternateMobile.startsWith('+91') ? alternateMobile : `+91${alternateMobile}`)
        //   : null;
          
        const addressData = {
          name,
          mobile: formattedMobile,
          // alternateMobile: formattedAlternateMobile, // COMMENTED: No longer needed as per backend team
          line1,
          line2: line2 || null,
          city,
          state,
          pincode,
          addressType,
          isDefault,
        };
        await axiosInstance.post('/user/addresses', addressData);
      }

      await axiosInstance.put('/onboarding/complete');

      await fetchUser();
      
      // Clear draft after successful submission
      await clearDraft();

      // Close modal if onClose prop is provided
      if (onClose) {
        onClose();
      }

      // Navigate based on category status - check user from context
      // if (user?.categories && user.categories.length > 0) {
      //   navigation.replace('Dashboard');
      // } else {
      //   navigation.replace('SelectCategories');
      // }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      ToastAndroid.show('Failed to complete profile setup. Please try again.', ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    // Show confirmation modal
    showModal({
      title: 'Unsaved Changes',
      content: 'Are you sure you want to leave. Your changes will not be saved?', 
      //Your progress will be saved and you can continue later.
      mode: 'normal',  //'warning',
      confirmText: 'Leave',
      cancelText: 'Continue',
      showIcon: true,
      onConfirm: async () => {
        try {
          // 1. FIRST: Navigate to login screen to prevent 401 errors
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'WelcomeScreen' }],
            }),
          );

          // 2. THEN: Clean up user session in background
          // Use setTimeout to ensure navigation completes first
          setTimeout(async () => {
            try {
              // Clear profile setup draft
              await clearDraft();
              
              const deviceId = await AsyncStorage.getItem('deviceId');
              if (deviceId) {
                await axiosInstance.post(
                  'auth/logout',
                  { deviceId },
                  { skipAuthRefresh: true } as any,
                );
              }

              await AsyncStorage.multiRemove(['userName', 'userId', 'deviceId', 'accessToken', 'refreshToken']);

              const currentUser = await GoogleSignin.getCurrentUser();
              if (currentUser) {
                await GoogleSignin.revokeAccess();
                await GoogleSignin.signOut();
              }

              const fbAccessToken = await AccessToken.getCurrentAccessToken();
              if (fbAccessToken) {
                await LoginManager.logOut();
              }

              if (auth().currentUser) {
                await auth().signOut();
              }

              await logout();
            } catch (error) {
              console.log('Background logout cleanup error:', error);
            }
          }, 100);
        } catch (error) {
          console.log('Logout Error:', error);
          ToastAndroid.show('Logout failed. Please try again.', ToastAndroid.SHORT);
        }
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <ArrowLeftCircle color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Welcome to Flykup!</Text>
          <Text style={styles.subtitle}>
            Set up your profile to personalize your Flykup experience.
          </Text>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>
            {/* Show Off Your Best Self — */}
             Your Profile Picture
          </Text>
          <View style={styles.profilePictureWrapper}>
            <TouchableOpacity
              style={styles.profilePictureContainer}
              onPress={handleProfilePictureSelect}
            >
              {getImageUrl() ? (
                <Image source={{ uri: getImageUrl() }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Upload color="#FFC107" size={32} />
                  <Text style={styles.profilePlaceholderText}>Add a photo</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleProfilePictureSelect} style={styles.cameraIconBadge}>
              <Camera color="#1E1E1E" size={20} />
            </TouchableOpacity>
          </View>

          {/* Username Input */}
          <View style={styles.usernameSection}>
            <Text style={styles.usernameLabel}>Username</Text>
            <View style={styles.usernameInputWrapper}>
              <Text style={styles.usernamePrefix}>@</Text>
              <Controller
                control={control}
                name="userName"
                rules={{
                  required: 'Username is required',
                  minLength: { value: 3, message: 'Minimum 3 characters' },
                  validate: (value) => checkUsernameAvailability(value),
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[
                      styles.usernameInput,
                      errors.userName && styles.inputError,
                    ]}
                    placeholder="your_unique_name"
                    placeholderTextColor="#808080"
                    value={value}
                    onChangeText={(text) => {
                      const cleaned = text
                        .replace(/[^a-zA-Z0-9_]/g, '')
                        .toLowerCase();
                      onChange(cleaned);
                      setUsernameStatus(null);
                    }}
                    autoCapitalize="none"
                  />
                )}
              />
              <View style={styles.usernameStatusIcon}>
                {usernameStatus === 'available' && (
                  <UserCheck color="#10B981" size={20} />
                )}
                {usernameStatus === 'taken' && <XCircle color="#EF4444" size={20} />}
                {usernameStatus === null && currentUsername?.length >= 3 && (
                  <ActivityIndicator color="#808080" size="small" />
                )}
              </View>
            </View>
            {errors.userName && (
              <View style={styles.errorContainer}>
                <AlertTriangle color="#EF4444" size={12} />
                <Text style={styles.errorText}>{errors.userName.message}</Text>
              </View>
            )}
            {!errors.userName && usernameStatus === 'taken' && (
              <View style={styles.errorContainer}>
                <AlertTriangle color="#EF4444" size={12} />
                <Text style={styles.errorText}>Username is already taken</Text>
              </View>
            )}
          </View>

          {/* Username Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggestions:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScroll}
              >
                {suggestions.map((suggestion: string) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={[
                      styles.suggestionButton,
                      currentUsername === suggestion && styles.suggestionButtonActive,
                    ]}
                    onPress={() => {
                      setValue('userName', suggestion as string, { shouldValidate: true });
                      trigger('userName');
                    }}
                  >
                    <Text
                    
                      style={[
                        styles.suggestionText,
                        currentUsername === suggestion && styles.suggestionTextActive,
                      ]}
                    >
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Gender Selection */}
          <View style={styles.genderContainer}>
            <View style={styles.labelContainer}>
              <User color="#F7CE45" size={16} />
              <Text style={styles.label}>Gender *</Text>
            </View>
            <Controller
              control={control}
              name="gender"
              rules={{ required: 'Please select your gender' }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.genderOptions}>
                  {[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.genderOption,
                        value === option.value && styles.genderOptionSelected,
                      ]}
                      onPress={() => onChange(option.value)}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          value === option.value && styles.radioCircleSelected,
                        ]}
                      >
                        {value === option.value && (
                          <View style={styles.radioCircleInner} />
                        )}
                      </View>
                      <Text style={styles.genderLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
            {errors.gender && (
              <View style={styles.errorContainer}>
                <AlertTriangle color="#EF4444" size={12} />
                <Text style={styles.errorText}>{errors.gender.message}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Address Form Section */}
        <View style={styles.addressSection}>
          <View style={styles.addressHeader}>
            {/* <MapPin color="#F7CE45" size={24} /> */}
            <Text style={styles.addressTitle}>Quick Checkout Address</Text>
          </View>
          <Text style={styles.addressSubtitle}>
            Want faster delivery? Fill this out now — it's optional!
          </Text>

          <View style={styles.formFields}>
            <InputField
              label="Full Name"
              icon={User}
              name="name"
              control={control}
              rules={{ required: 'Full name is required' }}
              placeholder="Enter your full name"
              error={errors.name}
            />

            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Phone color="#F7CE45" size={16} />
                <Text style={styles.label}>Mobile Number</Text>
              </View>
              <Controller
                control={control}
                name="mobile"
                rules={{
                  required: 'Mobile number is required',
                  validate: (value) => {
  if (!value) return true;
  if (value.length < 10) return true;
  return /^\d{10}$/.test(value) || 'Enter a valid 10-digit mobile number';
}
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.phoneInputWrapper}>
                    <View style={styles.phonePrefix}>
                      <Text style={styles.phonePrefixText}>+91</Text>
                    </View>
                    <TextInput
                      style={[
                        styles.phoneInput, 
                        errors.mobile && styles.inputError,
                        user?.isMobileVerified && styles.phoneInputDisabled
                      ]}
                      placeholder="Enter phone number"
                      placeholderTextColor="#808080"
                      onBlur={onBlur}
                      onChangeText={(text) => {
                        // Only allow digits and limit to 10
                        const cleaned = text.replace(/\D/g, '').slice(0, 10);
                        onChange(cleaned);
                      }}
                      value={value}
                      keyboardType="phone-pad"
                      editable={!user?.isMobileVerified}
                    />
                    {user?.isMobileVerified && value && value.length === 10 && (
                      <View style={styles.verifiedIconContainer}>
                        <CheckCircle color="#10B981" size={20} />
                      </View>
                    )}
                  </View>
                )}
              />
              {errors.mobile && (
                <View style={styles.errorContainer}>
                  <AlertTriangle color="#EF4444" size={12} />
                  <Text style={styles.errorText}>{errors.mobile.message}</Text>
                </View>
              )}
              {/* {!errors.mobile && watch('mobile')?.length === 10 && !user?.isMobileVerified && !otpError &&(
                <View style={styles.errorContainer}>
                  <Info color="gray" size={12} />
                  <Text style={[styles.errorText, {color:"gray"}]}>verified</Text>
                </View>
              )} */}
              {!otpModalVisible && otpError && (
                <View style={styles.errorContainer}>
                  <AlertTriangle color="#EF4444" size={12} />
                  <Text style={styles.errorText}>
                   {/* {otpError} */}
                   Mobile number not verified ({otpError})
                    </Text>
                </View>
              )}
              
              {/* Only show Send OTP button if mobile is not verified */}
              {!user?.isMobileVerified && (
                <TouchableOpacity
                  style={[
                    styles.otpButton,
                    (!watch('mobile') || watch('mobile').length !== 10 || errors?.mobile?.message?.includes('Enter a valid 10-digit mobile number')) && styles.otpButtonDisabled,
                  ]}
                  onPress={handleSendOtp}
                  disabled={!watch('mobile') || watch('mobile').length !== 10 || errors?.mobile?.message?.includes('Enter a valid 10-digit mobile number')}
                >
                  <Text style={styles.otpButtonText}>Send OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* COMMENTED: Alternate Mobile field - No longer needed as per backend team
            <PhoneInputField
              label="Alternate Mobile (Optional)"
              name="alternateMobile"
              control={control}
              rules={{
                validate: (value) =>
                  !value ||
                  value.length === 0 ||
                  value.length === 10 ||
                  'Enter a valid 10-digit mobile number',
              }}
              placeholder="Alternate mobile number"
              error={errors.alternateMobile}
            />
            */}

            <InputField
              label="Address Line 1"
              icon={Building2}
              name="line1"
              control={control}
              rules={{ required: 'Address Line 1 is required' }}
              placeholder="House No., Building, Street"
              error={errors.line1}
            />

            <InputField
              label="Landmark (Optional)"
              icon={Map}
              name="line2"
              control={control}
              placeholder="E.g., Near Apollo Hospital"
              error={errors.line2}
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <InputField
                  label="Pincode"
                  icon={Hash}
                  name="pincode"
                  control={control}
                  rules={{
                    required: 'Pincode is required',
                    validate: (value) =>
                      /^\d{6}$/.test(value) || 'Enter a valid 6-digit pincode',
                  }}
                  placeholder="000000"
                  error={errors.pincode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <View style={styles.rowItem}>
                <InputField
                  label="City"
                  icon={Building2}
                  name="city"
                  control={control}
                  rules={{ required: 'City is required', pattern: {
      value: /^[a-zA-Z\s]+$/,
      message: 'City cannot contain numbers',
    }}}
                  placeholder="Enter city"
                  error={errors.city}
                />
              </View>
            </View>

            {/* State Dropdown */}
            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Globe color="#F7CE45" size={16} />
                <Text style={styles.label}>State</Text>
              </View>
              <Controller
                control={control}
                name="state"
                rules={{ required: 'State is required' }}
                render={({ field: { onChange, value } }) => (
                  <Dropdown
                    data={indianStates}
                    labelField="label"
                    valueField="value"
                    placeholder="Select state"
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    value={value}
                    onChange={(item) => onChange(item.value)}
                    style={styles.dropdown}
                    containerStyle={styles.dropdownContainer}
                    itemTextStyle={styles.dropdownItemText}
                    activeColor="#404040"
                    iconColor="#F7CE45"
                  />
                )}
              />
              {errors.state && (
                <View style={styles.errorContainer}>
                  <AlertTriangle color="#EF4444" size={12} />
                  <Text style={styles.errorText}>{errors.state.message}</Text>
                </View>
              )}
            </View>

            {/* Address Type */}
            <View style={styles.addressTypeContainer}>
              <Text style={styles.addressTypeLabel}>Address Type:</Text>
              <View style={styles.radioGroup}>
                {['home', 'work', 'other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.radioOption}
                    onPress={() => setValue('addressType', type)}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        addressType === type && styles.radioCircleSelected,
                      ]}
                    >
                      {addressType === type && (
                        <View style={styles.radioCircleInner} />
                      )}
                    </View>
                    <Text style={styles.radioLabel}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Default Address Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setValue('isDefault', !isDefault as boolean)}
            >
              <View
                style={[styles.checkbox, isDefault && styles.checkboxChecked]}
              >
                {isDefault && <Check color="#1E1E1E" size={16} />}
              </View>
              <Text style={styles.checkboxLabel}>Set as default address</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* OTP Modal */}
        <Modal
          visible={otpModalVisible}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => {
            setOtpModalVisible(false);
            setOtp(['', '', '', '', '', '']);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.otpModalContainer}>
                {/* Decorative Background */}
                <View style={styles.decorativeBlob1} />
                <View style={styles.decorativeBlob2} />

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setOtpModalVisible(false);
                    setOtp(['', '', '', '', '', '']);
                  }}
                >
                  <X color="#1E1E1E" size={12} />
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.otpHeader}>
                  <View style={styles.shieldIconContainer}>
                    <Shield color="#1E1E1E" size={24} />
                  </View>
                  <View style={styles.otpHeaderTextContainer}>
                    <Text style={styles.otpModalTitle}>Enter OTP</Text>
                    <Text style={styles.otpModalSubtitle}>
                      Code sent to +91 {watch('mobile')}
                    </Text>
                  </View>
                </View>

                {/* OTP Inputs */}
                <View style={styles.otpInputsContainer}>
                  {otp.map((digit, index) => (
                    <View key={index} style={styles.otpInputWrapper}>
                      <TextInput
                        ref={(ref) => (otpInputs.current[index] = ref)}
                        value={digit}
                        onChangeText={(text) => handleOtpChange(text, index)}
                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                        onFocus={() => handleOtpFocus(index)}
                        keyboardType="number-pad"
                        maxLength={6}
                        style={[
                          styles.otpInputBox,
                          digit && styles.otpInputBoxFilled,
                          otpError && styles.otpInputBoxError,
                        ]}
                        autoFocus={index === 0}
                        selectTextOnFocus
                        autoComplete="sms-otp"
                        textContentType="oneTimeCode"
                      />
                    </View>
                  ))}
                </View>

                {/* Error Message */}
                {otpError && (
                  <Text style={styles.otpErrorText}>{otpError}</Text>
                )}

                {/* Resend OTP */}
                <View style={styles.resendContainer}>
                  <Text style={styles.didntReceiveText}>Didn't receive the code?</Text>
                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={countdown > 0}
                  >
                    <Text style={[
                      styles.resendText,
                      countdown > 0 && styles.resendTextDisabled
                    ]}>
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[
                    styles.verifyOtpButton,
                    (otpLoading || otp.join('').length !== 6) && styles.verifyOtpButtonDisabled,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={otpLoading || otp.join('').length !== 6}
                >
                  {otpLoading ? (
                    <ActivityIndicator color="#1E1E1E" />
                  ) : (
                    <Text style={styles.verifyOtpButtonText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || loading) && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#1E1E1E" />
              <Text style={styles.submitButtonText}>Saving...</Text>
            </>
          ) : (
            <>
              <Check color="#1E1E1E" size={24} />
              <Text style={styles.submitButtonText}>Complete Setup</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Confirmation Modal */}
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fafafa'  ,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color:  '#F7CE45',
    textAlign: 'center',
  },
  profileSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F7CE45',
    textAlign: 'center',
    marginBottom: 20,
  },
  profilePictureWrapper: {
    width: 144,
    height: 144,
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  profilePictureContainer: {
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#F7CE45',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    alignItems: 'center',
  },
  profilePlaceholderText: {
    color: '#808080',
    fontSize: 14,
    marginTop: 8,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 8,
    right: 4,
    backgroundColor: '#F7CE45',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1E1E1E',
  },
  usernameSection: {
    marginTop: 8,
  },
  usernameLabel: {
    fontSize: 16,
    color: '#FAFAFA',
    marginBottom: 8,
  },
  usernameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#404040',
    paddingHorizontal: 12,
  },
  usernamePrefix: {
    color: '#808080',
    fontSize: 16,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    color: '#FAFAFA',
    fontSize: 16,
    paddingVertical: 12,
  },
  usernameStatusIcon: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 16,
    color: '#F7CE45',
    marginBottom: 12,
  },
  suggestionsScroll: {
    gap: 8,
    paddingRight: 16,
  },
  suggestionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    backgroundColor: '#2A2A2A',
  },
  suggestionButtonActive: {
    backgroundColor: '#F7CE45',
    borderColor: '#F7CE45',
  },
  suggestionText: {
    color: '#808080',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  suggestionTextActive: {
    color: '#1E1E1E',
  },
  genderContainer: {
    marginTop: 16,
  },
  genderOptions: {
    gap: 12,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#404040',
  },
  genderOptionSelected: {
    borderColor: '#F7CE45',
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
  },
  genderLabel: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '500',
  },
  addressSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F7CE45',
  },
  addressSubtitle: {
    fontSize: 14,
    color: '#FAFAFA',
    marginBottom: 24,
  },
  formFields: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#404040',
    padding: 12,
    color: '#FAFAFA',
    fontSize: 14,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phonePrefix: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#404040',
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  phonePrefixText: {
    color: '#FAFAFA',
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#404040',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    padding: 12,
    paddingRight: 40,
    color: '#FAFAFA',
    fontSize: 14,
  },
  phoneInputDisabled: {
    backgroundColor: '#1A1A1A',
    color: '#808080',
    opacity: 0.7,
  },
  verifiedIconContainer: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  dropdown: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#404040',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownContainer: {
    backgroundColor: '#2A2A2A',
    borderColor: '#404040',
    borderWidth: 1,
    borderRadius: 8,
  },
  dropdownPlaceholder: {
    color: '#808080',
    fontSize: 14,
  },
  dropdownSelectedText: {
    color: '#FAFAFA',
    fontSize: 14,
  },
  dropdownItemText: {
    color: '#FAFAFA',
    fontSize: 14,
  },
  addressTypeContainer: {
    marginTop: 8,
  },
  addressTypeLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '500',
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#F7CE45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#F7CE45',
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F7CE45',
  },
  radioLabel: {
    color: '#FAFAFA',
    fontSize: 14,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#F7CE45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#F7CE45',
  },
  checkboxLabel: {
    color: '#FAFAFA',
    fontSize: 14,
  },
  otpButton: {
    backgroundColor: '#F7CE45',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  otpButtonDisabled: {
    opacity: 0.5,
  },
  otpButtonText: {
    color: '#1E1E1E',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#F7CE45',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#1E1E1E',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    width: '100%',
  },
  otpModalContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: isSmallScreen ? 20 : 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeBlob1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 200,
    height: 200,
    backgroundColor: 'rgba(247, 206, 69, 0.05)',
    borderRadius: 100,
  },
  decorativeBlob2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 200,
    height: 200,
    backgroundColor: 'rgba(247, 206, 69, 0.05)',
    borderRadius: 100,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    gap: 12,
  },
  shieldIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F7CE45',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  otpHeaderTextContainer: {
    flex: 1,
  },
  otpModalTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#F7CE45',
    marginBottom: 4,
  },
  otpModalSubtitle: {
    fontSize: 13,
    color: '#FAFAFA',
  },
  otpInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: isSmallScreen ? 6 : isMediumScreen ? 8 : 10,
    marginBottom: 16,
  },
  otpInputWrapper: {
    width: isSmallScreen ? 38 : isMediumScreen ? 42 : 48,
    height: isSmallScreen ? 46 : isMediumScreen ? 50 : 56,
  },
  otpInputBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#141414',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: isSmallScreen ? 18 : isMediumScreen ? 20 : 22,
    fontWeight: 'bold',
    color: '#FAFAFA',
  },
  otpInputBoxFilled: {
    borderColor: '#F7CE45',
    color: '#F7CE45',
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  otpInputBoxError: {
    borderColor: '#EF4444',
  },
  otpErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  didntReceiveText: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 6,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F7CE45',
  },
  resendTextDisabled: {
    color: '#888',
  },
  verifyOtpButton: {
    backgroundColor: '#F7CE45',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  verifyOtpButtonDisabled: {
    opacity: 0.5,
  },
  verifyOtpButtonText: {
    color: '#1E1E1E',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileSetup;
