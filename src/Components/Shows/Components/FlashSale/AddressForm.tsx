import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Dropdown } from 'react-native-element-dropdown';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useAuthContext } from '../../../../Context/AuthContext';
import {indianStates} from '../../../../Utils/Constants';
import { SafeAreaView } from 'react-native-safe-area-context';
// const indianStates = [
//   { label: 'Tamil Nadu', value: 'Tamil Nadu' },
//   { label: 'Karnataka', value: 'Karnataka' },
//   { label: 'Kerala', value: 'Kerala' },
//   { label: 'Andhra Pradesh', value: 'Andhra Pradesh' },
//   { label: 'Telangana', value: 'Telangana' },
//   { label: 'Maharashtra', value: 'Maharashtra' },
//   { label: 'Gujarat', value: 'Gujarat' },
//   { label: 'Rajasthan', value: 'Rajasthan' },
//   { label: 'Uttar Pradesh', value: 'Uttar Pradesh' },
//   { label: 'Bihar', value: 'Bihar' },
//   { label: 'West Bengal', value: 'West Bengal' },
//   { label: 'Odisha', value: 'Odisha' },
//   { label: 'Madhya Pradesh', value: 'Madhya Pradesh' },
//   { label: 'Chhattisgarh', value: 'Chhattisgarh' },
//   { label: 'Jharkhand', value: 'Jharkhand' },
//   { label: 'Assam', value: 'Assam' },
//   { label: 'Punjab', value: 'Punjab' },
//   { label: 'Haryana', value: 'Haryana' },
//   { label: 'Himachal Pradesh', value: 'Himachal Pradesh' },
//   { label: 'Uttarakhand', value: 'Uttarakhand' },
//   { label: 'Goa', value: 'Goa' },
//   { label: 'Manipur', value: 'Manipur' },
//   { label: 'Meghalaya', value: 'Meghalaya' },
//   { label: 'Tripura', value: 'Tripura' },
//   { label: 'Mizoram', value: 'Mizoram' },
//   { label: 'Nagaland', value: 'Nagaland' },
//   { label: 'Arunachal Pradesh', value: 'Arunachal Pradesh' },
//   { label: 'Sikkim', value: 'Sikkim' },
//   { label: 'Delhi', value: 'Delhi' },
//   { label: 'Jammu and Kashmir', value: 'Jammu and Kashmir' },
//   { label: 'Ladakh', value: 'Ladakh' },
// ].


indianStates.sort((a, b) => a.label.localeCompare(b.label));

interface AddressFormProps {
  address?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  customColor?: string;
}

const AddressForm: React.FC<AddressFormProps> = ({ address, onSave, onCancel,customColor="#1e1e1e" }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm();
  
  const { user } = useAuthContext();
  const isEditing = !!address;
  
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [alternateCountryCode, setAlternateCountryCode] = useState('+91');
  const scrollViewRef = useRef<ScrollView>(null);
  const addressType = watch('addressType', 'home');
  const isDefault = watch('isDefault', false);
  const mobileNumber = watch('mobile');

  // Country codes list
  const countryCodes = [
    { label: '🇮🇳 (+91)', value: '+91' },
    // { label: '🇺🇸 (+1)', value: '+1' },
    // { label: '🇬🇧 (+44)', value: '+44' },
    // { label: '🇦🇪 (+971)', value: '+971' },
    // { label: '🇸🇬 (+65)', value: '+65' },
    // { label: '🇦🇺 (+61)', value: '+61' },
    // { label: '🇨🇦 (+1)', value: '+1' },
    // { label: '🇩🇪 (+49)', value: '+49' },
    // { label: '🇫🇷 (+33)', value: '+33' },
    // { label: '🇯🇵 (+81)', value: '+81' },
  ];

  useEffect(() => {
    if (isEditing) {
      // Populate all fields from existing address
      Object.keys(address).forEach((key) => {
        // Handle mobile number formatting - extract country code and number
        if (key === 'mobile') {
          const mobileValue = address[key];
          if (mobileValue) {
            let raw = mobileValue.trim().replace(/[\s\-()]/g, '');
            let country = '+91';
            let number = '';

            if (raw.startsWith('+')) {
              raw = raw.substring(1);
              country = raw.substring(0, raw.length - 10);
              number = raw.slice(-10);
            } else if (raw.length === 12 && raw.startsWith('91')) {
              country = '91';
              number = raw.substring(2);
            } else if (raw.length === 10) {
              country = '91';
              number = raw;
            }

            setCountryCode(`+${country}`);
            setValue(key, number);
          } else {
            setValue(key, mobileValue);
          }
        } else if (key === 'alternateMobile') {
          const mobileValue = address[key];
          if (mobileValue) {
            let raw = mobileValue.trim().replace(/[\s\-()]/g, '');
            let country = '+91';
            let number = '';

            if (raw.startsWith('+')) {
              raw = raw.substring(1);
              country = raw.substring(0, raw.length - 10);
              number = raw.slice(-10);
            } else if (raw.length === 12 && raw.startsWith('91')) {
              country = '91';
              number = raw.substring(2);
            } else if (raw.length === 10) {
              country = '91';
              number = raw;
            }

            setAlternateCountryCode(`+${country}`);
            setValue(key, number);
          } else {
            setValue(key, mobileValue);
          }
        } else {
          setValue(key, address[key]);
        }
      });
    } else {
      // Set default values for new address
      setValue('state', 'Tamil Nadu');
      if (user?.mobile) {
        let raw = user.mobile.trim().replace(/[\s\-()]/g, '');
        let country = '+91';
        let number = '';

        if (raw.startsWith('+')) {
          raw = raw.substring(1);
          country = raw.substring(0, raw.length - 10);
          number = raw.slice(-10);
        } else if (raw.length === 12 && raw.startsWith('91')) {
          country = '91';
          number = raw.substring(2);
        } else if (raw.length === 10) {
          country = '91';
          number = raw;
        }

        setCountryCode(`+${country}`);
        setValue('mobile', number);
      }
      setValue('addressType', 'home');
      setValue('isDefault', false);
    }
  }, [isEditing, address, setValue, user]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Add country code prefix to mobile numbers for backend storage
      if (data.mobile) {
        data.mobile = data.mobile.startsWith('+') ? data.mobile : `${countryCode}${data.mobile}`;
      }
      
      if (data.alternateMobile) {
        data.alternateMobile = data.alternateMobile.startsWith('+') ? data.alternateMobile : `${alternateCountryCode}${data.alternateMobile}`;
      } else {
        data.alternateMobile = null;
      }
      
      if (!data.line2) {
        data.line2 = null;
      }
      
      await onSave(data);
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: customColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollViewContent}
          bounces={true}
          nestedScrollEnabled={true}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
          <View style={styles.formContainer}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, focusedInput === 'name' && styles.labelFocused]}>
              Full Name
            </Text>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Name is required' }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === 'name' && styles.inputFocused,
                    errors.name && styles.inputError,
                  ]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter your full name"
                  placeholderTextColor="rgba(250,250,250,0.42)"
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                />
              )}
            />
            {errors.name && (
              <Text style={styles.errorText}>{String(errors.name.message)}</Text>
            )}
          </View>

          {/* Mobile Number with Country Code */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, focusedInput === 'mobile' && styles.labelFocused]}>
              Mobile Number
            </Text>
            <View style={styles.phoneContainer}>
              <Dropdown
                data={countryCodes}
                value={countryCode}
                onChange={(item) => setCountryCode(item.value)}
                labelField="label"
                valueField="value"
                placeholder="Code"
                placeholderStyle={styles.dropdownPlaceholder}
                selectedTextStyle={styles.countryCodeText}
                style={styles.countryCodeDropdown}
                containerStyle={styles.dropdownContainer}
                itemTextStyle={styles.dropdownItemText}
                activeColor="rgba(247,206,69,0.1)"
                search
                searchPlaceholder="Search"
                inputSearchStyle={styles.dropdownSearchInput}
              />
              <Controller
                name="mobile"
                control={control}
                rules={{
                  required: 'Mobile number is required',
                  validate: (value) => {
                    if (countryCode === '+91') {
                      return /^[6-9]\d{9}$/.test(value) || 'Enter a valid 10-digit mobile number';
                    }
                    return (value && value.length >= 6 && value.length <= 15) || 'Enter a valid mobile number';
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[
                      styles.phoneInput,
                      focusedInput === 'mobile' && styles.inputFocused,
                      errors.mobile && styles.inputError,
                    ]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Mobile number"
                    placeholderTextColor="rgba(250,250,250,0.42)"
                    keyboardType="phone-pad"
                    maxLength={countryCode === '+91' ? 10 : 15}
                    onFocus={() => setFocusedInput('mobile')}
                    onBlur={() => setFocusedInput(null)}
                  />
                )}
              />
            </View>
            {errors.mobile && (
              <Text style={styles.errorText}>{String(errors.mobile.message)}</Text>
            )}
          </View>

          {/* Alternate Mobile with Country Code (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, focusedInput === 'alternateMobile' && styles.labelFocused]}>
              Alternate Mobile (Optional)
            </Text>
            <View style={styles.phoneContainer}>
              <Dropdown
                data={countryCodes}
                value={alternateCountryCode}
                onChange={(item) => setAlternateCountryCode(item.value)}
                labelField="label"
                valueField="value"
                placeholder="Code"
                placeholderStyle={styles.dropdownPlaceholder}
                selectedTextStyle={styles.countryCodeText}
                style={styles.countryCodeDropdown}
                containerStyle={styles.dropdownContainer}
                itemTextStyle={styles.dropdownItemText}
                activeColor="rgba(247,206,69,0.1)"
                search
                searchPlaceholder="Search"
                inputSearchStyle={styles.dropdownSearchInput}
              />
              <Controller
                name="alternateMobile"
                control={control}
                rules={{
                  validate: (value) => {
                    if (!value) return true;
                    
                    // Check if alternate mobile is same as primary mobile
                    if (value === mobileNumber && countryCode === alternateCountryCode) {
                      return 'Alternate mobile number cannot be the same as primary mobile number';
                    }
                    
                    if (alternateCountryCode === '+91') {
                      return /^[6-9]\d{9}$/.test(value) || 'Enter a valid 10-digit mobile number';
                    }
                    return (value.length >= 6 && value.length <= 15) || 'Enter a valid mobile number';
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[
                      styles.phoneInput,
                      focusedInput === 'alternateMobile' && styles.inputFocused,
                      errors.alternateMobile && styles.inputError,
                    ]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Alternate mobile"
                    placeholderTextColor="rgba(250,250,250,0.42)"
                    keyboardType="phone-pad"
                    maxLength={alternateCountryCode === '+91' ? 10 : 15}
                    onFocus={() => setFocusedInput('alternateMobile')}
                    onBlur={() => setFocusedInput(null)}
                  />
                )}
              />
            </View>
             <View style={styles.infoNote}>
                          <FontAwesome name="info-circle" size={14} color="#FFD700" />
                          <Text style={styles.infoNoteText}>
                            Must be different from your primary mobile number.
                          </Text>
                        </View>
            {errors.alternateMobile && (
              <Text style={styles.errorText}>{String(errors.alternateMobile.message)}</Text>
            )}
          </View>

          {/* Address Line 1 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, focusedInput === 'line1' && styles.labelFocused]}>
              Address
            </Text>
            <Controller
              name="line1"
              control={control}
              rules={{ required: 'Address is required' }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === 'line1' && styles.inputFocused,
                    errors.line1 && styles.inputError,
                  ]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="House No., Building Name, Street"
                  placeholderTextColor="rgba(250,250,250,0.42)"
                  onFocus={() => setFocusedInput('line1')}
                  onBlur={() => setFocusedInput(null)}
                />
              )}
            />
            {errors.line1 && (
              <Text style={styles.errorText}>{String(errors.line1.message)}</Text>
            )}
          </View>

          {/* Address Line 2 (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, focusedInput === 'line2' && styles.labelFocused]}>
              Landmark (Optional)
            </Text>
            <Controller
              name="line2"
              control={control}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === 'line2' && styles.inputFocused,
                  ]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Nearby landmark"
                  placeholderTextColor="rgba(250,250,250,0.42)"
                  onFocus={() => setFocusedInput('line2')}
                  onBlur={() => setFocusedInput(null)}
                />
              )}
            />
          </View>

          {/* City */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, focusedInput === 'city' && styles.labelFocused]}>
              City
            </Text>
            <Controller
              name="city"
              control={control}
              rules={{ required: 'City is required' }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    focusedInput === 'city' && styles.inputFocused,
                    errors.city && styles.inputError,
                  ]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Your city"
                  placeholderTextColor="rgba(250,250,250,0.42)"
                  onFocus={() => setFocusedInput('city')}
                  onBlur={() => setFocusedInput(null)}
                />
              )}
            />
            {errors.city && (
              <Text style={styles.errorText}>{String(errors.city.message)}</Text>
            )}
          </View>

          {/* Pincode, State */}
          <View style={styles.rowContainer}>
            <View style={styles.thirdWidth}>
              <Text style={[styles.label, focusedInput === 'pincode' && styles.labelFocused]}>
                Pincode
              </Text>
              <Controller
                name="pincode"
                control={control}
                rules={{
                  required: 'Pincode is required',
                  validate: (value) =>
                    /^\d{6}$/.test(value) || 'Enter a valid 6-digit pincode',
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      focusedInput === 'pincode' && styles.inputFocused,
                      errors.pincode && styles.inputError,
                    ]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="6-digit"
                    placeholderTextColor="rgba(250,250,250,0.42)"
                    keyboardType="numeric"
                    maxLength={6}
                    onFocus={() => setFocusedInput('pincode')}
                    onBlur={() => setFocusedInput(null)}
                  />
                )}
              />
              {errors.pincode && (
                <Text style={styles.errorText}>{String(errors.pincode.message)}</Text>
              )}
            </View>

            <View style={styles.thirdWidth}>
              <Text style={[styles.label, focusedInput === 'state' && styles.labelFocused]}>
                State
              </Text>
              <Controller
                name="state"
                control={control}
                rules={{ required: 'State is required' }}
                render={({ field: { onChange, value } }) => (
                  <Dropdown
                    data={indianStates}
                    value={value}
                    onChange={(item) => onChange(item.value)}
                    labelField="label"
                    valueField="value"
                    placeholder="Select state"
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownSelectedText}
                    style={[
                      styles.dropdown,
                      focusedInput === 'state' && styles.inputFocused,
                      errors.state && styles.inputError,
                    ]}
                    containerStyle={styles.dropdownContainer}
                    itemTextStyle={styles.dropdownItemText}
                    activeColor="rgba(247,206,69,0.1)"
                    search
                    searchPlaceholder="Search state"
                    inputSearchStyle={styles.dropdownSearchInput}
                    onFocus={() => setFocusedInput('state')}
                    onBlur={() => setFocusedInput(null)}
                  />
                )}
              />
              {errors.state && (
                <Text style={styles.errorText}>{String(errors.state.message)}</Text>
              )}
            </View>
          </View>

          {/* Address Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Type</Text>
            <Controller
              name="addressType"
              control={control}
              rules={{ required: 'Please select an address type' }}
              render={({ field: { onChange } }) => (
                <View style={styles.addressTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.addressTypeButton,
                      addressType === 'home' && styles.addressTypeButtonActive,
                    ]}
                    onPress={() => onChange('home')}>
                    <FontAwesome
                      name="home"
                      size={16}
                      color={addressType === 'home' ? '#000' : 'rgba(250,250,250,1)'}
                    />
                    <Text
                      style={[
                        styles.addressTypeText,
                        addressType === 'home' && styles.addressTypeTextActive,
                      ]}>
                      Home
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.addressTypeButton,
                      addressType === 'work' && styles.addressTypeButtonActive,
                    ]}
                    onPress={() => onChange('work')}>
                    <FontAwesome
                      name="briefcase"
                      size={16}
                      color={addressType === 'work' ? '#000' : 'rgba(250,250,250,1)'}
                    />
                    <Text
                      style={[
                        styles.addressTypeText,
                        addressType === 'work' && styles.addressTypeTextActive,
                      ]}>
                      Work
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.addressTypeButton,
                      addressType === 'other' && styles.addressTypeButtonActive,
                    ]}
                    onPress={() => onChange('other')}>
                    <FontAwesome
                      name="map-marker"
                      size={16}
                      color={addressType === 'other' ? '#000' : 'rgba(250,250,250,1)'}
                    />
                    <Text
                      style={[
                        styles.addressTypeText,
                        addressType === 'other' && styles.addressTypeTextActive,
                      ]}>
                      Other
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.addressType && (
              <Text style={styles.errorText}>{String(errors.addressType.message)}</Text>
            )}
          </View>

          {/* Default Address Checkbox */}
          <Controller
            name="isDefault"
            control={control}
            render={({ field: { onChange } }) => (
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => onChange(!isDefault)}>
                <View style={[styles.checkbox, isDefault && styles.checkboxActive]}>
                  {isDefault && <FontAwesome name="check" size={12} color="#000" />}
                </View>
                <Text style={styles.checkboxLabel}>Set as default address</Text>
              </TouchableOpacity>
            )}
          />

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loading}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#000" size={20} />
              ) : (
                <Text style={styles.saveButtonText}>Save Address</Text>
              )}
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,1)',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 180,
  },
  formContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: 'rgba(250,250,250,0.62)',
    marginBottom: 8,
    fontWeight: '500',
  },
  labelFocused: {
    color: 'rgba(247,206,69,1)',
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(250,250,250,0.084)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: 'rgba(250,250,250,1)',
  },
  inputFocused: {
    borderColor: 'rgba(247,206,69,1)',
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  thirdWidth: {
    flex: 1,
  },
  dropdown: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(250,250,250,0.084)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 50,
  },
  dropdownContainer: {
    backgroundColor: '#1e1e1e',
    borderColor: 'rgba(247,206,69,1)',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
  },
  dropdownPlaceholder: {
    color: 'rgba(250,250,250,0.42)',
    fontSize: 15,
  },
  dropdownSelectedText: {
    color: 'rgba(250,250,250,1)',
    fontSize: 15,
  },
  dropdownItemText: {
    color: 'rgba(250,250,250,1)',
    fontSize: 15,
  },
  dropdownSearchInput: {
    color: 'rgba(250,250,250,1)',
    fontSize: 15,
    borderColor: 'rgba(250,250,250,0.2)',
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  countryCodeDropdown: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(250,250,250,0.084)',
    minWidth: 120,
    maxHeight: 50,
  },
  countryCodeText: {
    color: 'rgba(250,250,250,1)',
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: 'rgba(250,250,250,1)',
    borderWidth: 1,
    borderColor: 'rgba(250,250,250,0.084)',
  },
  addressTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  addressTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(250,250,250,0.084)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  addressTypeButtonActive: {
    backgroundColor: 'rgba(247,206,69,1)',
    borderColor: 'rgba(247,206,69,1)',
  },
  addressTypeText: {
    color: 'rgba(250,250,250,1)',
    fontSize: 14,
    fontWeight: '500',
  },
  addressTypeTextActive: {
    color: '#000',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(250,250,250,0.42)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: 'rgba(247,206,69,1)',
    borderColor: 'rgba(247,206,69,1)',
  },
  checkboxLabel: {
    color: 'rgba(250,250,250,1)',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'rgba(250,250,250,0.21)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: 'rgba(250,250,250,1)',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: 'rgba(247,206,69,1)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },

    infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  infoNoteText: {
    color: '#ccc',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default AddressForm;
