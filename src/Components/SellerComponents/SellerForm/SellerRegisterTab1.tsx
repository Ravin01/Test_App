import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useCallback,
  useMemo,
  memo,
} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ToastAndroid,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  TextInputProps,
} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {Checkbox} from 'react-native-paper';
import SellerHeader from './Header';
import HorizontalTimeline from './TimeLine';
import {Dropdown} from 'react-native-element-dropdown';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../../Utils/Colors';
import {AuthContext} from '../../../Context/AuthContext';
import useAutoSave from './useAutoSave';
import {FABHelpButton, FAQHelpBottomSheet} from './HelpExample';
import Icons from 'react-native-vector-icons/MaterialCommunityIcons';
import OnboardingStatusWidget, {
  CompactProgressFAB,
} from './CompletionPercent';

// ============ TYPES ============
interface FormData {
  name: string;
  mobileNumber: string;
  email: string;
  businessType: string;
  isAgeConfirmed: boolean;
  brand: string;
}

interface FormErrors {
  name: string;
  mobileNumber: string;
  email: string;
  businessType: string;
}

interface FormInputProps extends Omit<TextInputProps, 'onChangeText'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  required?: boolean;
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  infoNote?: string;
}

// ============ CONSTANTS ============
const BUSINESS_CATEGORIES = [
  {categoryName: 'Partnership'},
  {categoryName: 'Sole Proprietor'},
  {categoryName: 'Individual'},
  {categoryName: 'LLP'},
  {categoryName: 'Private Limited'},
];

const INITIAL_ERRORS: FormErrors = {
  name: '',
  mobileNumber: '',
  email: '',
  businessType: '',
};

// ============ VALIDATION UTILS ============
const ValidationUtils = {
  isValidName: (value: string): string => {
    if (!value) return 'Name is required';
    if (value.length <= 3) return 'Enter a valid Name';
    return '';
  },

  isValidMobile: (value: string): string => {
    const phoneRegex = /^[0-9]{10}$/;
    if (!value) return 'Mobile number is required';
    if (!phoneRegex.test(value)) return 'Please enter a valid mobile number (10 digits)';
    return '';
  },

  isValidEmail: (value: string): string => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!value) return 'Email is required';
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return '';
  },

  isValidBusinessType: (value: string): string => {
    if (!value) return 'Business Type is required';
    return '';
  },

  cleanMobileNumber: (mobile: string): string => {
    if (!mobile) return '';
    return mobile.replace(/^\+91\s*/, '').replace(/^\+91/, '').trim();
  },
};

// ============ CUSTOM INPUT COMPONENT ============
const FormInput = memo<FormInputProps>(({
  label,
  value,
  onChangeText,
  error,
  required = false,
  isFocused = false,
  onFocus,
  onBlur,
  disabled = false,
  infoNote,
  style,
  ...textInputProps
}) => {
  // Use ref to track if change is from user typing
  const isTypingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChangeText = useCallback((text: string) => {
    isTypingRef.current = true;
    
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Notify parent immediately for responsive typing
    onChangeText(text);
    
    // Reset typing flag after a short delay
    debounceRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 100);
  }, [onChangeText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, isFocused && styles.focusLabel]}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          isFocused && styles.focusBorder,
          error && styles.inputError,
          disabled && styles.inputDisabled,
          style,
        ]}
        value={value}
        onChangeText={handleChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        editable={!disabled}
        placeholderTextColor="#777"
        {...textInputProps}
      />
      {infoNote && (
        <View style={styles.infoNoteContainer}>
          <Icons name="information-outline" size={16} color="#FFD700" />
          <Text style={styles.infoNoteText}>{infoNote}</Text>
        </View>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

FormInput.displayName = 'FormInput';

// ============ PHONE INPUT COMPONENT ============
const PhoneInputField = memo<{
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  isFocused?: boolean;
  onFocus?: () => void;
}>(({value, onChangeText, error, isFocused, onFocus}) => {
  const handleChangeText = useCallback((text: string) => {
    // Only allow digits - notify parent immediately
    const cleanText = text.replace(/[^0-9]/g, '');
    onChangeText(cleanText);
  }, [onChangeText]);

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, isFocused && styles.focusLabel]}>
        Mobile Number <Text style={styles.required}>*</Text>
      </Text>
      <View style={styles.phoneInputRow}>
        <View style={styles.countryCodeBox}>
          <Text style={styles.countryCodeText}>+91</Text>
        </View>
        <TextInput
          style={[
            styles.input,
            styles.phoneInput,
            error && styles.inputError,
            isFocused && styles.focusBorder,
          ]}
          placeholder="Enter mobile number"
          value={value}
          onChangeText={handleChangeText}
          keyboardType="phone-pad"
          autoComplete="tel-device"
          maxLength={10}
          onFocus={onFocus}
          placeholderTextColor="#777"
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

PhoneInputField.displayName = 'PhoneInputField';

// ============ BUSINESS TYPE DROPDOWN ============
const BusinessTypeDropdown = memo<{
  value: string;
  onChange: (value: string) => void;
  error?: string;
}>(({value, onChange, error}) => {
  const dropdownRef = useRef<any>(null);

  const handleChange = useCallback((item: {categoryName: string}) => {
    onChange(item.categoryName);
  }, [onChange]);

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        Business Type <Text style={styles.required}>*</Text>
      </Text>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => dropdownRef.current?.open()}>
        <Dropdown
          ref={dropdownRef}
          data={BUSINESS_CATEGORIES}
          value={value}
          style={[styles.input, styles.dropdownInput, error && styles.inputError]}
          activeColor="transparent"
          selectedTextStyle={styles.dropdownSelectedText}
          itemTextStyle={styles.dropdownItemText}
          containerStyle={styles.dropdownContainer}
          placeholder="Select Business Type"
          placeholderStyle={styles.dropdownPlaceholder}
          onChange={handleChange}
          labelField="categoryName"
          valueField="categoryName"
        />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

BusinessTypeDropdown.displayName = 'BusinessTypeDropdown';

// ============ AGE CONFIRMATION CHECKBOX ============
const AgeConfirmation = memo<{
  checked: boolean;
  onToggle: () => void;
}>(({checked, onToggle}) => (
  <View style={styles.checkboxRow}>
    <Checkbox
      status={checked ? 'checked' : 'unchecked'}
      color={checked ? '#F7CE45' : 'red'}
      onPress={onToggle}
    />
    <Text style={styles.checkboxText}>
      I confirm I am 18 or older.
    </Text>
    <Text style={styles.required}> *</Text>
  </View>
));

AgeConfirmation.displayName = 'AgeConfirmation';

// ============ LOADING OVERLAY ============
const LoadingOverlay = memo(() => (
  <View style={styles.overlay}>
    <View style={styles.overlayContainer}>
      <ActivityIndicator color="gray" size={20} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  </View>
));

LoadingOverlay.displayName = 'LoadingOverlay';

// ============ MAIN COMPONENT ============
const SellerRegisterTab1 = ({navigation}: {navigation: any}) => {
  const {user}: any = useContext(AuthContext);
  const [showProgress, setShowProgress] = useState(false);
  const route = useRoute();
  const brand = (route.params as any)?.type;
  const rbSheetRef = useRef<any>(null);
  const [focusedField, setFocusedField] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>(INITIAL_ERRORS);
// console.log("usser====",user)
  // Initialize form data
  const {formData: rawFormData, setFormData: rawSetFormData, loading} = useAutoSave(
    {
      name: '',
      mobileNumber: ValidationUtils.cleanMobileNumber(user?.mobile || ''),
      email: user?.emailId || '',
      businessType: '',
      isAgeConfirmed: false,
      brand: brand,
    },
    true,
  );

  // Type cast formData for type safety
  const formData = rawFormData as FormData;
  const setFormData = rawSetFormData as React.Dispatch<React.SetStateAction<FormData>>;

  // Sync email from user context when it becomes available
  useEffect(() => {
    if (user?.emailId && formData.email !== user.emailId) {
      setFormData((prev: FormData) => ({...prev, email: user.emailId}));
    }
  }, [user?.emailId, formData.email, setFormData]);

  // Memoized validation function
  const validateField = useCallback((field: keyof FormErrors, value: string): string => {
    switch (field) {
      case 'name':
        return ValidationUtils.isValidName(value);
      case 'mobileNumber':
        return ValidationUtils.isValidMobile(value);
      case 'email':
        return ValidationUtils.isValidEmail(value);
      case 'businessType':
        return ValidationUtils.isValidBusinessType(value);
      default:
        return '';
    }
  }, []);

  // Debounced validation - validates after user stops typing
  const validateFieldDebounced = useCallback((field: keyof FormErrors, value: string) => {
    const error = validateField(field, value);
    setErrors(prev => ({...prev, [field]: error}));
  }, [validateField]);

  // Input change handlers
  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData((prev: FormData) => ({...prev, [field]: value}));
    
    // Only validate string fields
    if (typeof value === 'string' && field in INITIAL_ERRORS) {
      validateFieldDebounced(field as keyof FormErrors, value);
    }
  }, [setFormData, validateFieldDebounced]);

  const handleFocus = useCallback((field: string) => {
    setFocusedField(field);
  }, []);

  const handleAgeToggle = useCallback(() => {
    setFormData((prev: FormData) => ({
      ...prev,
      isAgeConfirmed: !prev.isAgeConfirmed,
    }));
  }, [setFormData]);

  const openHelpSheet = useCallback(() => {
    rbSheetRef.current?.open();
  }, []);

  const handleProgressClose = useCallback(() => {
    setShowProgress(false);
  }, []);

  const handleProgressOpen = useCallback(() => {
    setShowProgress(true);
  }, []);

  // Form submission with validation
  const handleSubmit = useCallback(() => {
    // Validate all fields before submission
    const newErrors: FormErrors = {
      name: ValidationUtils.isValidName(formData.name),
      mobileNumber: ValidationUtils.isValidMobile(formData.mobileNumber),
      email:'',
      // email: ValidationUtils.isValidEmail(formData.email),
      businessType: ValidationUtils.isValidBusinessType(formData.businessType),
    };

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(error => error !== '');
    
    if (hasErrors) {
      ToastAndroid.show(
        'Please fill all the required fields correctly',
        ToastAndroid.SHORT,
      );
      return;
    }

    if (brand === 'Social' && !formData.isAgeConfirmed) {
      ToastAndroid.show(
        'You must be 18 or older to proceed',
        ToastAndroid.SHORT,
      );
      return;
    }

    navigation.navigate('aadharverify', {formData});
  }, [formData, brand, navigation]);

  // Memoized render content
  const renderContent = useMemo(() => (
    <>
      <HorizontalTimeline
        activeIndex={0}
        text="Personal Details"
        activeDotColor="#FFD700"
        inactiveDotColor="#9CA3AF"
        activeLineColor="#FFD700"
        inactiveLineColor="#333"
        showStepNumbers={true}
      />

      <FormInput
        label="Business Name"
        value={formData.name}
        onChangeText={(text) => handleInputChange('name', text)}
        error={errors.name}
        required
        isFocused={focusedField === 'name'}
        onFocus={() => handleFocus('name')}
        placeholder="Enter company name"
      />

      <PhoneInputField
        value={formData.mobileNumber}
        onChangeText={(text) => handleInputChange('mobileNumber', text)}
        error={errors.mobileNumber}
        isFocused={focusedField === 'mobileNumber'}
        onFocus={() => handleFocus('mobileNumber')}
      />

      <FormInput
        label="Email"
        value={user?.emailId || ''}
        onChangeText={(text) => handleInputChange('email', text)}
        error={errors.email}
        required
        isFocused={focusedField === 'email'}
        onFocus={() => handleFocus('email')}
        placeholder="Enter the email"
        keyboardType="email-address"
        disabled
        infoNote="This email ID cannot be edited as it is linked to your account"
      />

      <BusinessTypeDropdown
        value={formData.businessType}
        onChange={(value) => handleInputChange('businessType', value)}
        error={errors.businessType}
      />

      {brand === 'Social' && (
        <AgeConfirmation
          checked={formData.isAgeConfirmed}
          onToggle={handleAgeToggle}
        />
      )}

      <View style={styles.submitContainer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </>
  ), [
    formData,
    errors,
    focusedField,
    brand,
    user?.emailId,
    handleInputChange,
    handleFocus,
    handleAgeToggle,
    handleSubmit,
  ]);

  return (
    <>
      {loading && <LoadingOverlay />}
      
      <FAQHelpBottomSheet rbSheetRef={rbSheetRef} currentTabIndex={0} />

      <SafeAreaView style={styles.container}>
        <SellerHeader navigation={navigation} message="Personal Details" />

        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <View style={styles.scrollContainer}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {renderContent}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        <OnboardingStatusWidget
          title="Your Onboarding Status"
          tasksConfig={brand}
          formData={formData}
          isOpen={showProgress}
          onClose={handleProgressClose}
        />

        <View style={styles.fabContainer}>
          <CompactProgressFAB
            formData={formData}
            tasksConfig={brand}
            onPress={handleProgressOpen}
          />
          <FABHelpButton onPress={openHelpSheet} style={styles.helpFab} />
        </View>
      </SafeAreaView>
    </>
  );
};

// ============ STYLES ============
const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
    color: '#fff',
  },
  focusLabel: {
    color: '#FFD700',
  },
  required: {
    color: 'red',
  },
  input: {
    height: 50,
    borderColor: '#1E1E1E',
    borderWidth: 1,
    backgroundColor: colors.primaryColor,
    elevation: 3,
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  focusBorder: {
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeBox: {
    height: 50,
    paddingHorizontal: 12,
    borderColor: colors.primaryColor,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    color: '#fff',
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
  },
  dropdownInput: {
    paddingRight: 10,
  },
  dropdownSelectedText: {
    color: '#fff',
  },
  dropdownItemText: {
    color: '#fff',
  },
  dropdownContainer: {
    backgroundColor: '#212121',
    borderColor: '#FFD700',
    borderWidth: 1,
    borderRadius: 10,
  },
  dropdownPlaceholder: {
    color: '#777',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkboxText: {
    textAlign: 'justify',
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  submitContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: '#F7CE45',
    paddingHorizontal: 10,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
  },
  infoNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
    gap: 6,
  },
  infoNoteText: {
    fontSize: 12,
    color: '#BBB',
    flex: 1,
    lineHeight: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 72,
    right: 0,
  },
  helpFab: {
    marginTop: 8,
  },
});

export default memo(SellerRegisterTab1);