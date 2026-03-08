// Step1PersonalDetails.tsx - Personal Details Step (converted from SellerRegisterTab1)
import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform,
  TextInputProps,
} from 'react-native';
import { Checkbox } from 'react-native-paper';
import { Dropdown } from 'react-native-element-dropdown';
import Icons from 'react-native-vector-icons/MaterialCommunityIcons';

// Context & Utils
import { useSellerForm, ValidationUtils } from '../SellerFormContext';
import HorizontalTimeline from '../TimeLine';
import { colors } from '../../../../Utils/Colors';

// ============ TYPES ============
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
  { categoryName: 'Partnership' },
  { categoryName: 'Sole Proprietor' },
  { categoryName: 'Individual' },
  { categoryName: 'LLP' },
  { categoryName: 'Private Limited' },
];

const INITIAL_ERRORS: FormErrors = {
  name: '',
  mobileNumber: '',
  email: '',
  businessType: '',
};

// ============ FORM INPUT COMPONENT ============
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
  const isTypingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChangeText = useCallback((text: string) => {
    isTypingRef.current = true;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onChangeText(text);
    debounceRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 100);
  }, [onChangeText]);

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
}>(({ value, onChangeText, error, isFocused, onFocus }) => {
  const handleChangeText = useCallback((text: string) => {
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
}>(({ value, onChange, error }) => {
  const dropdownRef = useRef<any>(null);

  const handleChange = useCallback((item: { categoryName: string }) => {
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
}>(({ checked, onToggle }) => (
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

// ============ MAIN STEP COMPONENT ============
interface Step1Props {
  navigation?: any;
}

const Step1PersonalDetails: React.FC<Step1Props> = ({ navigation: _navigation }) => {
  const { formData, updateField, goToNextStep, brand } = useSellerForm();
  
  const [focusedField, setFocusedField] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>(INITIAL_ERRORS);

  // ============ VALIDATION ============
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

  const validateFieldDebounced = useCallback((field: keyof FormErrors, value: string) => {
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  }, [validateField]);

  // ============ HANDLERS ============
  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    updateField(field as any, value);
    if (typeof value === 'string' && field in INITIAL_ERRORS) {
      validateFieldDebounced(field as keyof FormErrors, value);
    }
  }, [updateField, validateFieldDebounced]);

  const handleFocus = useCallback((field: string) => {
    setFocusedField(field);
  }, []);

  const handleAgeToggle = useCallback(() => {
    updateField('isAgeConfirmed', !formData.isAgeConfirmed);
  }, [updateField, formData.isAgeConfirmed]);

  // ============ FORM SUBMISSION ============
  const handleNext = useCallback(() => {
    const newErrors: FormErrors = {
      name: ValidationUtils.isValidName(formData.name),
      mobileNumber: ValidationUtils.isValidMobile(formData.mobileNumber),
      email: '',
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

    goToNextStep();
  }, [formData, brand, goToNextStep]);

  return (
    <KeyboardAvoidingView
      style={styles.flex1}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={styles.scrollContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          
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
            value={formData.email}
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
            <TouchableOpacity style={styles.submitButton} onPress={handleNext}>
              <Text style={styles.submitButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

// ============ STYLES ============
const styles = StyleSheet.create({
  flex1: {
    flex: 1,
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
});

export default memo(Step1PersonalDetails);
