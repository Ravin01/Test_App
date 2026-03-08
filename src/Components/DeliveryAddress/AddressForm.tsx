import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ToastAndroid,
  ScrollView,
  Dimensions,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {colors} from '../../Utils/Colors';
import axiosInstance from '../../Utils/Api';
import {SafeAreaView} from 'react-native-safe-area-context';
import {indianStates} from '../../Utils/Constants';
import {Dropdown} from 'react-native-element-dropdown';
import SellerHeader from '../SellerComponents/SellerForm/Header';
import {AuthContext} from '../../Context/AuthContext';

const {width} = Dimensions.get('window');

const AddressFormModal = ({navigation, route}) => {
  const item = route.params?.item || null;
  // ✅ NEW: Get return parameters for navigation back to checkout screens
  const returnTo = route.params?.returnTo || null;
  const auctionData = route.params?.auctionData || null;
  const showId = route.params?.showId || null;
  
  // Helper function to remove emojis and special characters
  const removeEmojis = (text: string) => {
    // Remove emojis, symbols, and other non-standard characters
    // Keep letters (any language), numbers, spaces, and common punctuation
    return text.replace(/[^\p{L}\p{N}\s.,\-\/()#&']/gu, '');
  };

  // Helper function for city names - only letters, spaces, and basic punctuation (no numbers)
  const sanitizeCityName = (text: string) => {
    // Remove numbers, emojis, and special characters
    // Keep only letters (any language), spaces, and basic punctuation like hyphens and apostrophes
    return text.replace(/[^\p{L}\s\-']/gu, '');
  };

  const [fullName, setFullName] = useState(item?.name || '');
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [alternateMobileNumber, setAlternateMobileNumber] = useState('');
  const [alternateCountryCode, setAlternateCountryCode] = useState('+91');
  const [streetAddress, setStreetAddress] = useState(item?.line1 || '');
  const [apartment, setApartment] = useState(item?.line2 || '');
  const [city, setCity] = useState(item?.city || '');
  const [state, setState] = useState(item?.state || 'Tamil Nadu');
  const [zipCode, setZipCode] = useState(item?.pincode || '');
  const [addressType, setAddressType] = useState('Home');
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [loading, setloading] = useState(false);
  const {setSelectedAddress} = useContext(AuthContext);
  const [focusedInput, setFocusedInput] = useState(null);

  // Country codes list
  const countryCodes = [
    {label: '🇮🇳 (+91)', value: '+91'},
    // {label: '🇺🇸 (+1)', value: '+1'},
    // {label: '🇬🇧 (+44)', value: '+44'},
    // {label: '🇦🇪 (+971)', value: '+971'},
    // {label: '🇸🇬 (+65)', value: '+65'},
    // {label: '🇦🇺 (+61)', value: '+61'},
    // {label: '🇨🇦 (+1)', value: '+1'},
    // {label: '🇩🇪 (+49)', value: '+49'},
    // {label: '🇫🇷 (+33)', value: '+33'},
    // {label: '🇯🇵 (+81)', value: '+81'},
  ];

  const validateForm = () => {
    if (!fullName.trim()) return 'Full name is required';
    
    // Check for emojis in name
    if (fullName !== removeEmojis(fullName)) {
      return 'Full name cannot contain emojis or special symbols';
    }
    
    if (!mobileNumber.trim()) return 'Mobile number is required';

    // Validate mobile number based on country code
    if (countryCode === '+91') {
      if (!/^[6-9]\d{9}$/.test(mobileNumber))
        return 'Enter a valid 10-digit Indian mobile number';
    } else {
      if (mobileNumber.length < 6 || mobileNumber.length > 15)
        return 'Enter a valid mobile number';
    }

    // Validate alternate mobile number if provided (optional)
    if (alternateMobileNumber.trim()) {
      if (alternateCountryCode === '+91') {
        if (!/^[6-9]\d{9}$/.test(alternateMobileNumber))
          return 'Enter a valid 10-digit alternate mobile number';
      } else {
        if (alternateMobileNumber.length < 6 || alternateMobileNumber.length > 15)
          return 'Enter a valid alternate mobile number';
      }

      // Check if mobile number and alternate mobile number are unique
      const fullMobileNumber = `${countryCode}${mobileNumber}`;
      const fullAlternateMobileNumber = `${alternateCountryCode}${alternateMobileNumber}`;
      
      if (fullMobileNumber === fullAlternateMobileNumber) {
        return 'Mobile number and alternate mobile number must be different';
      }
    }

    if (!streetAddress.trim()) return 'Street address is required';
    
    // Check for emojis in street address
    if (streetAddress !== removeEmojis(streetAddress)) {
      return 'Street address cannot contain emojis or special symbols';
    }
    
    // Check for emojis in apartment field if provided
    if (apartment.trim() && apartment !== removeEmojis(apartment)) {
      return 'Apartment field cannot contain emojis or special symbols';
    }
    
    if (!city.trim()) return 'City is required';
    
    // Check for emojis in city
    if (city !== removeEmojis(city)) {
      return 'City name cannot contain emojis or special symbols';
    }
    
    if (!state.trim()) return 'State is required';
    if (!zipCode.trim()) return 'ZIP code is required';
    if (!/^\d{6}$/.test(zipCode))
      return 'ZIP code must be a valid 6-digit number';

    return null;
  };

  const handleAddAddress = async () => {
    setloading(true);

    const error = validateForm();
    if (error) {
      ToastAndroid.show(error, ToastAndroid.SHORT);
      setloading(false);
      return;
    }

    try {
      // When editing an existing address, always set isDefault to true for better UX
      const isEditingAddress = item && !item?.header;
      
      const payload = {
        name: fullName,
        mobile: `${countryCode}${mobileNumber}`,
        alternateMobile: alternateMobileNumber.trim() 
          ? `${alternateCountryCode}${alternateMobileNumber}` 
          : null,
        line1: streetAddress,
        line2: apartment || '',
        city: city,
        state: state,
        pincode: zipCode,
        addressType: addressType.toLowerCase(),
        // isDefault: isEditingAddress ? true : isDefaultAddress,
        isDefault: isDefaultAddress,
      };
      console.log(payload)
      if (isDefaultAddress) setSelectedAddress(payload);
      if (item && !item?.header) {
        // Update existing address
        if (item.orderId) {
          // console.log(item)
          // console.log("order api called")
          await axiosInstance.put(`/order/${item.orderId}/address/`, payload);
        } else await axiosInstance.put(`/user/addresses/${item._id}`, payload);
        ToastAndroid.show('Address updated successfully', ToastAndroid.SHORT);
      } else {
        // console.log("create api called",payload)
        await axiosInstance.post(`/user/addresses`, payload);
        ToastAndroid.show('Address saved successfully', ToastAndroid.SHORT);
      }
      setTimeout(() => {
        // ✅ FIX: If returning to auction checkout, navigate back with params to reopen modal
        if (returnTo === 'auctionCheckout' && auctionData && showId) {
          navigation.navigate('LiveScreen', {
            stream: { _id: showId },
            id: showId,
            reopenAuctionCheckout: true,
            auctionData: auctionData,
          });
        } else {
          navigation.goBack();
        }
      }, 500);
      // Reset form
      setFullName('');
      setMobileNumber('');
      setAlternateMobileNumber('');
      setStreetAddress('');
      setApartment('');
      setCity('');
      setState('');
      setZipCode('');
      setAddressType('Home');
      setIsDefaultAddress(false);
    } catch (error) {
      console.log('Error from address', error?.response?.data);
      ToastAndroid.show(
        `${error?.response?.data?.message || 'Something went wrong'}. Please try again later.`,
        ToastAndroid.SHORT,
      );
    } finally {
      setloading(false);
    }
  };
  // Auto-clear alternate mobile number if it matches the primary mobile number
  useEffect(() => {
    if (
      mobileNumber &&
      alternateMobileNumber &&
      mobileNumber === alternateMobileNumber
    ) {
      setAlternateMobileNumber('');
    }
  }, [mobileNumber, alternateMobileNumber]);

  useEffect(() => {
  if (item?.mobile) {
    let raw = item.mobile.trim();

    // Remove spaces, dashes, brackets, etc.
    raw = raw.replace(/[\s\-()]/g, "");

    let country = "";
    let number = "";

    // Case 1: Starts with + (best case)
    if (raw.startsWith("+")) {
      raw = raw.substring(1); // remove +

      // Country code = first 1–3 digits (most countries)
      country = raw.substring(0, raw.length - 10);
      number = raw.slice(-10);
    }

    // Case 2: Starts with 91 (Indian format without +)
    else if (raw.length === 12 && raw.startsWith("91")) {
      country = "91";
      number = raw.substring(2); // keep last 10 digits
    }

    // Case 3: Already 10-digit number (no country code)
    else if (raw.length === 10) {
      country = "91"; // set your default country code
      number = raw;
    }
// console.log("Parsed country code:", country);
    setCountryCode(`+${country}`);
    setMobileNumber(number);
  }
// console.log(item)
  setIsDefaultAddress(item?.isDefault);
  // Parse alternate mobile if exists
  if (item?.alternateMobile) {
    let raw = item.alternateMobile.trim();
    raw = raw.replace(/[\s\-()]/g, "");

    let country = "";
    let number = "";

    if (raw.startsWith("+")) {
      raw = raw.substring(1);
      country = raw.substring(0, raw.length - 10);
      number = raw.slice(-10);
    } else if (raw.length === 12 && raw.startsWith("91")) {
      country = "91";
      number = raw.substring(2);
    } else if (raw.length === 10) {
      country = "91";
      number = raw;
    }

    setAlternateCountryCode(`+${country}`);
    setAlternateMobileNumber(number);
  }
}, [item]);

  return (
    <SafeAreaView style={styles.modalContent}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        {/* Header */}
        {item?.header ? (
          // <View style={styles.header1}>
          //   <Text style={styles.headerTitle1}>Add delivery address</Text>
          // </View>
          <SellerHeader
            navigation={navigation}
            message={'Add delivery address'}
          />
        ) : (
          // <View style={styles.header}>
          //   <TouchableOpacity
          //     onPress={handleGoBack}
          //     style={styles.backButton}>
          //     <ArrowLeftCircle size={25} color="#fff" />
          //   </TouchableOpacity>
          //   <LinearGradient
          //     colors={['#B38728', '#FFD700']}
          //     start={{x: 0, y: 0}}
          //     end={{x: 1, y: 1}}
          //     style={styles.headerGradient}>
          //     <View style={styles.titleContainer}>
          //       <Text style={styles.title}>My address</Text>
          //     </View>
          //   </LinearGradient>
          // </View>
          <SellerHeader navigation={navigation} message={'My Address'} />
        )}

        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.label,
                focusedInput == 'fullName' && {color: '#FFD700'},
              ]}>
              Full Name<Text style={{color: 'red'}}> *</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                focusedInput === 'fullName' && styles.highlightedInput,
              ]}
              value={fullName}
              onFocus={() => setFocusedInput('fullName')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(text) => setFullName(removeEmojis(text))}
              placeholderTextColor="#666"
              placeholder="Enter your full name"
              maxLength={100}
            />
          </View>

          {/* Mobile Number with Country Code */}
          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.label,
                focusedInput == 'mobileNumber' && {color: '#FFD700'},
              ]}>
              Mobile number<Text style={{color: 'red'}}> *</Text>
            </Text>
            <View style={styles.phoneContainer}>
              <Dropdown
                data={countryCodes}
                value={countryCode}
                style={styles.countryCodeDropdown}
                activeColor="transparent"
                search={true}
                searchPlaceholder="search"
                inputSearchStyle={{color: '#fff', backgroundColor: '#333'}}
                selectedTextStyle={styles.countryCodeText}
                itemTextStyle={{color: '#fff'}}
                containerStyle={{
                  backgroundColor: '#212121',
                  borderColor: '#FFD700',
                  borderWidth: 1,
                  borderRadius: 10,
                }}
                placeholderStyle={{color: '#777'}}
                onChange={item => setCountryCode(item.value)}
                labelField={'label'}
                valueField={'value'}
                renderItem={item => (
                  <View style={{padding: 10}}>
                    <Text style={{color: '#fff'}}>{item.label}</Text>
                  </View>
                )}
              />
              <TextInput
                style={[
                  styles.phoneInput,
                  focusedInput === 'mobileNumber' && styles.highlightedInput,
                ]}
                value={mobileNumber}
                onFocus={() => setFocusedInput('mobileNumber')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={setMobileNumber}
                placeholder="Enter mobile number"
                maxLength={countryCode === '+91' ? 10 : 15}
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Alternate Mobile Number with Country Code (Optional) */}
          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.label,
                focusedInput == 'alternateMobileNumber' && {color: '#FFD700'},
              ]}>
              Alternate Mobile (Optional)
            </Text>
            <View style={styles.phoneContainer}>
              <Dropdown
                data={countryCodes}
                value={alternateCountryCode}
                style={styles.countryCodeDropdown}
                activeColor="transparent"
                search={true}
                searchPlaceholder="search"
                inputSearchStyle={{color: '#fff', backgroundColor: '#333'}}
                selectedTextStyle={styles.countryCodeText}
                itemTextStyle={{color: '#fff'}}
                containerStyle={{
                  backgroundColor: '#212121',
                  borderColor: '#FFD700',
                  borderWidth: 1,
                  borderRadius: 10,
                }}
                placeholderStyle={{color: '#777'}}
                onChange={item => setAlternateCountryCode(item.value)}
                labelField={'label'}
                valueField={'value'}
                renderItem={item => (
                  <View style={{padding: 10}}>
                    <Text style={{color: '#fff'}}>{item.label}</Text>
                  </View>
                )}
              />
              <TextInput
                style={[
                  styles.phoneInput,
                  focusedInput === 'alternateMobileNumber' && styles.highlightedInput,
                ]}
                value={alternateMobileNumber}
                onFocus={() => setFocusedInput('alternateMobileNumber')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={setAlternateMobileNumber}
                placeholder="Alternate mobile no"
                maxLength={alternateCountryCode === '+91' ? 10 : 15}
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>
            {/* Info note for alternate mobile */}
            <View style={styles.infoNote}>
              <FontAwesome name="info-circle" size={14} color="#FFD700" />
              <Text style={styles.infoNoteText}>
                Must be different from your primary mobile number.
              </Text>
            </View>
          </View>

          {/* Street Address */}
          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.label,
                focusedInput == 'streetAddress' && {color: '#FFD700'},
              ]}>
              Street Address<Text style={{color: 'red'}}> *</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                focusedInput === 'streetAddress' && styles.highlightedInput,
              ]}
              onFocus={() => setFocusedInput('streetAddress')}
              onBlur={() => setFocusedInput(null)}
              value={streetAddress}
              onChangeText={(text) => setStreetAddress(removeEmojis(text))}
              placeholder="House/Flat number, Street"
              placeholderTextColor="#666"
              maxLength={200}
            />
          </View>

          {/* Apartment (Optional) */}
          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.label,
                focusedInput == 'apartment' && {color: '#FFD700'},
              ]}>
              Apartment, Suite (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                focusedInput === 'apartment' ? styles.highlightedInput : '',
              ]}
              onFocus={() => setFocusedInput('apartment')}
              onBlur={() => setFocusedInput(null)}
              value={apartment}
              onChangeText={(text) => setApartment(removeEmojis(text))}
              placeholder="Apartment, Suite, Unit"
              placeholderTextColor="#666"
              maxLength={100}
            />
          </View>

          {/* City and State */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text
                style={[
                  styles.label,
                  focusedInput == 'city' && {color: '#FFD700'},
                ]}>
                City<Text style={{color: 'red'}}> *</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'city' ? styles.highlightedInput : '',
                ]}
                value={city}
                onChangeText={(text) => setCity(sanitizeCityName(text))}
                onFocus={() => setFocusedInput('city')}
                onBlur={() => setFocusedInput(null)}
                placeholder="City"
                placeholderTextColor="#666"
                maxLength={50}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text
                style={[
                  styles.label,
                  focusedInput == 'state' && {color: '#FFD700'},
                ]}>
                State<Text style={{color: 'red'}}> *</Text>
              </Text>
              <Dropdown
                data={indianStates}
                value={state}
                style={[
                  styles.input,
                  {paddingRight: 10},
                  focusedInput === 'state' && styles.highlightedInput,
                ]}
                activeColor="transparent"
                selectedTextStyle={{color: '#fff'}}
                search
                searchPlaceholder="search"
                inputSearchStyle={{color: '#fff', backgroundColor: '#333'}}
                itemTextStyle={{color: '#fff'}}
                containerStyle={{
                  backgroundColor: '#212121',
                  borderColor: '#FFD700',
                  borderWidth: 1,
                  borderRadius: 10,
                }}
                placeholder="Select state"
                placeholderStyle={{color: '#777'}}
                onFocus={() => setFocusedInput('state')}
                onBlur={() => setFocusedInput(null)}
                onChange={item => setState(item.value)}
                labelField={'label'}
                valueField={'value'}
              />

              {/* <TextInput
                style={[
                  styles.input,
                  focusedInput === 'state' ? styles.highlightedInput : '',
                ]}
                onFocus={() => setFocusedInput('state')}
                onBlur={() => setFocusedInput(null)}
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor="#666"
              /> */}
            </View>
          </View>

          {/* ZIP Code */}
          <View style={styles.inputGroup}>
            <Text
              style={[
                styles.label,
                focusedInput == 'zipCode' && {color: '#FFD700'},
              ]}>
              ZIP Code<Text style={{color: 'red'}}> *</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                focusedInput === 'zipCode' ? styles.highlightedInput : '',
              ]}
              value={zipCode}
              onFocus={() => setFocusedInput('zipCode')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={setZipCode}
              placeholder="ZIP Code"
              placeholderTextColor="#666"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          {/* Address Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Address Type<Text style={{color: 'red'}}> *</Text>
            </Text>
            <View style={styles.addressTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.addressTypeButton,
                  addressType === 'Home' && styles.addressTypeButtonActive,
                ]}
                onPress={() => setAddressType('Home')}>
                <FontAwesome
                  name="home"
                  size={16}
                  color={addressType === 'Home' ? '#000' : '#fff'}
                />
                <Text
                  style={[
                    styles.addressTypeText,
                    addressType === 'Home' && styles.addressTypeTextActive,
                  ]}>
                  Home
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addressTypeButton,
                  addressType === 'Work' && styles.addressTypeButtonActive,
                ]}
                onPress={() => setAddressType('Work')}>
                <FontAwesome
                  name="briefcase"
                  size={16}
                  color={addressType === 'Work' ? '#000' : '#fff'}
                />
                <Text
                  style={[
                    styles.addressTypeText,
                    addressType === 'Work' && styles.addressTypeTextActive,
                  ]}>
                  Work
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addressTypeButton,
                  addressType === 'other' && styles.addressTypeButtonActive,
                ]}
                onPress={() => setAddressType('other')}>
                <FontAwesome
                  name="paperclip"
                  size={16}
                  color={addressType === 'other' ? '#000' : '#fff'}
                />
                <Text
                  style={[
                    styles.addressTypeText,
                    addressType === 'other' && styles.addressTypeTextActive,
                  ]}>
                  Others
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Default Address Checkbox - Only show when creating new address */}
          {/* {(!item || item?.header) && ( */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsDefaultAddress(!isDefaultAddress)}>
              <View
                style={[
                  styles.checkbox,
                  isDefaultAddress && styles.checkboxActive,
                ]}>
                {isDefaultAddress && (
                  <FontAwesome name="check" size={12} color="#000" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                Make this my default address
              </Text>
            </TouchableOpacity>
          {/* // )} */}
        </ScrollView>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleAddAddress}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#000" size={20} />
            ) : (
              <Text style={styles.saveButtonText}>
                {item && !item?.header ? 'Update' : 'Save'} address
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = {
  modalOverlay: {
    flex: 1,

    // backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
    // backgroundColor: colors.primaryColor,
  },
  modalContent: {
    backgroundColor: colors.primaryColor,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    // justifyContent: 'space-between',

    gap: width * 0.1,
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.primaryColor,
    marginBottom: 10,
    // paddingVertical: 12,
  },
  backButton: {
    padding: 5,
  },
  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: 30,
    // marginLeft: 45,
    // paddingHorizontal: 10,
    width: 200,
  },
  titleContainer: {
    backgroundColor: '#212121',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    overflow: 'hidden',
  },
  header1: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7CE45',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-evenly',
    elevation: 0,
  },
  headerTitle1: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#212121',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
  },
  highlightedInput: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  countryCodeDropdown: {
    backgroundColor: '#212121',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#444',
    maxHeight: 50,
    minWidth: 120,
  },
  countryCodeText: {
    color: '#fff',
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#212121', //'#333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  halfWidth: {
    flex: 1,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  addressTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  addressTypeButtonActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  addressTypeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  addressTypeTextActive: {
    color: '#000',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  checkboxLabel: {
    color: '#ccc',
    fontSize: 14,
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
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  saveButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
};

export default AddressFormModal;
