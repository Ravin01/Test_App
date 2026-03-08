import React, { useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Icons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {useRoute} from '@react-navigation/native';
import {Checkbox} from 'react-native-paper';
import api from '../../Utils/Api';
import {AuthContext} from '../../Context/AuthContext';
import {useNavigation} from '@react-navigation/native';

const DropShipperForm = () => {
 const navigation = useNavigation();
  const {user}: any = useContext(AuthContext);
  const [applicationStatus, setApplicationStatus] = useState("NEW") // NEW, pending, approved
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    mobileNumber: '',
    email: '',
    address: {
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        pincode: "",
    },
    bankDetails: {
        accountHolderName: user?.name || "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
    },
  });  
  const [isTermsAndCondition, setIsTermsAndCondition] = useState(false);
  //const [errors, setErrors] = useState({});

  const [errors, setErrors] = useState({
    name: '',
    mobileNumber: '',
    email: '',
    address: {
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        pincode: "",
    },
    bankDetails: {
        accountHolderName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false)

  let lastTap = 0;

  const handleGoBack = () => {
    const now = Date.now();
    if (now - lastTap < 500) return; // Ignore double tap
    lastTap = now;
    navigation.goBack();
  };

  const handleInputChange = (field, value) => {
    if (field.startsWith('address.')) {
      const key = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [key]: value,
        },
      }));
    } else if (field.startsWith('bankDetails.')) {
      const key = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [key]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  
    validate(field, value);
  };  
  

  const handleCheckBoxChange = (field, value)=>{
    setIsTermsAndCondition(value);
  }

  const validate = (field, value) => {
    let validationErrors = {...errors}; // Preserve existing errors

    // Validate each field
    if (field === 'businessName') {
      if (!value) {
        validationErrors.businessName = 'Name is required';
      } else if (value.length <= 3) {
        validationErrors.businessName = 'Enter a valid Name';
      } else {
        validationErrors.businessName = ''; // No error
      }
    }

    if (field === 'mobileNumber') {
      const phoneRegex = /^[0-9]{10}$/;
      if (!value) {
        validationErrors.mobileNumber = 'Mobile number is required';
      } else if (!phoneRegex.test(value)) {
        validationErrors.mobileNumber =
          'Please enter a valid mobile number (10 digits)';
      } else {
        validationErrors.mobileNumber = ''; // No error
      }
    }

    if (field === 'email') {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      if (!value) {
        validationErrors.email = 'Email is required';
      } else if (!emailRegex.test(value)) {
        validationErrors.email = 'Please enter a valid email address';
      } else {
        validationErrors.email = ''; // No error
      }
    }

    if (field === 'address.addressLine1') {
      if (!value) {
        validationErrors.address.addressLine1 = 'Street Address 1 is required';
      } else {
        validationErrors.address.addressLine1 = ''; // No error
      }
    }

    if (field === 'address.addressLine2') {
      if (!value) {
        validationErrors.address.addressLine2 = 'Street Address 2 is required';
      } else {
        validationErrors.address.addressLine2 = ''; // No error
      }
    }

    if (field === 'address.city') {
      if (!value) {
        validationErrors.address.city = 'City is required';
      } else {
        validationErrors.address.city = ''; // No error
      }
    }

    if (field === 'address.state') {
      if (!value) {
        validationErrors.address.state = 'State is required';
      } else {
        validationErrors.address.state = ''; // No error
      }
    }

    if (field === 'address.pincode') {
      const pinCodeRegex = /^[0-9]{6}$/;
      if (!value) {
        validationErrors.address.pincode = 'Pin code is required';
      } else if (!pinCodeRegex.test(value)) {
        validationErrors.address.pincode = 'Please enter a valid pin code (6 digits)';
      } else {
        validationErrors.address.pincode = ''; // No error
      }
    }

    if(field === 'bankDetails.accountHolderName'){
        if (!value) {
            validationErrors.bankDetails.accountHolderName = 'Account holder name is required';
          } else {
            validationErrors.bankDetails.accountHolderName = ''; // No error
        }
    }

    if(field === 'bankDetails.accountNumber'){
        if (!value) {
            validationErrors.bankDetails.accountNumber = 'Account number is required';
          } else {
            validationErrors.bankDetails.accountNumber = ''; // No error
        }
    }

    if(field === 'bankDetails.ifscCode'){
        const IFSCRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/ ;
        if (!value) {
            validationErrors.bankDetails.ifscCode = 'IFSC code is required';
          }
        else if(!IFSCRegex.test(value)){
            validationErrors.bankDetails.ifscCode = 'Enter a valid IFSC code';
        }
          else {
            validationErrors.bankDetails.ifscCode = ''; // No error
        }
    }

    if(field === 'bankDetails.bankName'){
        if (!value) {
            validationErrors.bankDetails.bankName = 'Bank name is required';
          } else {
            validationErrors.bankDetails.bankName = ''; // No error
        }
    }

    // Update the errors state
    setErrors(validationErrors);
    return validationErrors;
  };
  
  const handleSubmit = async() => {
    // navigation.navigate('aadharverify', {formData});
    const hasErrors =
      !formData.businessName ||
      !formData.mobileNumber ||
      !formData.email ||
      !formData.address.city ||
      !formData.address.pincode ||
      !formData.address.addressLine1 ||
      !formData.address.addressLine2 ||
      !formData.address.state ||
      !formData.bankDetails.accountHolderName ||
      !formData.bankDetails.accountNumber ||
      !formData.bankDetails.ifscCode ||
      !formData.bankDetails.bankName

    if (hasErrors) {
      ToastAndroid.show(
        'Please field all the required fields',
        ToastAndroid.SHORT,
      );
      return;
    } else if (!isTermsAndCondition) {
      ToastAndroid.show(
        'You must agree to terms & conditions to proceed',
        ToastAndroid.SHORT,
      );
      return;
    } else {
      
    //  navigation.navigate('aadharverify', {formData});
    //  console.log("Form data===", formData);

      setIsSubmitting(true)
      try {
          const response = await api.post('shipper/apply', formData)

          if (response.data) {
            ToastAndroid.show(
                response.data.message || "Application submitted successfully! Awaiting approval.",
                ToastAndroid.SHORT
              );
              
              setApplicationStatus("pending")
              navigation.navigate('bottomtabbar');
          } else {
            ToastAndroid.show(
                "Submission failed. Please try again.",
                ToastAndroid.SHORT
              );
          }
      } catch (err) {
          console.error("Submission error:", err.response)
          ToastAndroid.show(
            err.response?.data?.message || "Failed to submit application. Please check your details and try again.",
            ToastAndroid.SHORT
          );
      } finally {
          setIsSubmitting(false)
      }
    }
  };

  // Fetch application status when component mounts
  useEffect(() => {
    const fetchApplicationStatus = async () => {
        if (user) {
            try {
                setLoading(true)
                const response = await api.get('shipper/status')
                // console.log("Response data:", response.data);
                // console.log('Application status',response.data?.data?.status ); //undefined

                if (response.data && response.data.status) {
                    setApplicationStatus(response.data.data.status || "NEW")
                    // console.log('Application status',response.data.data.status );
                    // If application exists, could optionally populate form with existing data
                    if (response.data.data.applicationDetails) {
                        setFormData((prevData) => ({
                            ...prevData,
                            ...response.data.data.applicationDetails,
                        }))
                    }
                }
            } catch (error) {
                console.error("Error fetching application status:", error)
                // If API fails, assume NEW to allow application
                setApplicationStatus("NEW")
            } finally {
                setLoading(false)
            }
        } else {
            setLoading(false)
        }
    }
    fetchApplicationStatus()
}, [])
 

  return (
    <>
      {loading ? (
        <View style={styles.overlay}>
          <View style={styles.overlayContainer}>
            <ActivityIndicator color="gray" size={20} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}>
            <AntDesign name="left" size={20} />
            <Text style={{fontSize: 17}}>Back</Text>
          </TouchableOpacity>

          {/* Step Indicator */}

          <View style={styles.header}>
            <View style={styles.progress}>
              <View style={[styles.progressStep, {backgroundColor: '#333'}]} />
              <View style={[styles.progressStep]} />
              <View style={styles.progressStep} />
            </View>
          </View>
          
          <Text style={styles.headerText}>DropShipper Application</Text>
      
          <Text style={styles.headerSubtext}>Complete the form to join our dropshipping network</Text>

          {/* Wrap the entire content in a ScrollView */}

          {/* Business Information */}
          <Text style={[styles.label, {fontSize: 20, marginTop: 6, marginBottom: 15, alignSelf: 'center'}]}>
            Business Information{' '}
          </Text>

          <Text style={styles.label}>
            Business Name <Text style={{color: 'red'}}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.businessName && styles.inputError]}
            placeholder="Your Brand/Shop Name"
            value={formData.businessName}
            placeholderTextColor={'#777'}
            onChangeText={text => handleInputChange('businessName', text)}
          />
          {errors.businessName && <Text style={styles.errorText}>{errors.businessName}</Text>}

          {/* Mobile Number */}
          <View style={styles.row}>
            <MaterialIcons name="smartphone" size={20} />
            <Text style={styles.label}>
              Mobile Number <Text style={{color: 'red'}}>*</Text>
            </Text>
          </View>

          <TextInput
            style={[styles.input, errors.mobileNumber && styles.inputError]}
            placeholder="Enter mobile number"
            value={formData.mobileNumber}
            onChangeText={text => handleInputChange('mobileNumber', text)}
            keyboardType="phone-pad"
            autoComplete="tel-device"
            maxLength={10}
            placeholderTextColor={'#777'}
          />
          {errors.mobileNumber && (
            <Text style={styles.errorText}>{errors.mobileNumber}</Text>
          )}
          <View style={styles.row}>
            <Icons name="email-outline" size={20} />
            <Text style={styles.label}>
              Email Address<Text style={{color: 'red'}}>*</Text>
            </Text>
          </View>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="Enter the email"
            keyboardType="email-address"
            value={formData.email}
            placeholderTextColor={'#777'}
            onChangeText={text => handleInputChange('email', text)}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          {/* Business Categories */}
         
         {/* Address Details */}
          <Text style={[styles.label, {fontSize: 20, marginTop: 25, alignSelf: 'center'}]}>
            Address Details{' '}
          </Text>
          <View style={styles.row}>
            <View style={{width: '100%'}}>
              <View style={styles.row}>
                <MaterialIcons name="location-on" size={20} />
                <Text style={styles.label}>
                  Address Line 1 <Text style={{color: 'red'}}>*</Text>
                </Text>
              </View>

              <TextInput
                style={[
                  styles.input,
                  errors.address?.addressLine1 && styles.inputError,
                ]}
                placeholder="Enter Address Line 1"
                value={formData.address.addressLine1}
                placeholderTextColor={'#777'}
                onChangeText={text => handleInputChange('address.addressLine1', text)}
              />
              {errors.address?.addressLine1 && (
                <Text style={styles.errorText}>{errors.address?.addressLine1}</Text>
              )}
             
              <View style={styles.row}>
                <MaterialIcons name="location-on" size={20} />
                <Text style={styles.label}>
                  Address Line 2 <Text style={{color: 'red'}}>*</Text>
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  errors.address?.addressLine2 && styles.inputError,
                ]}
                placeholder="Enter Address Line 2 "
                value={formData.address.addressLine2}
                placeholderTextColor={'#777'}
                onChangeText={text => handleInputChange('address.addressLine2', text)}
              />
              {errors.address?.addressLine2 && (
                <Text style={styles.errorText}>{errors.address?.addressLine2}</Text>
              )}
            </View>
          </View>
          <View style={styles.row}>
            <View style={{width: '50%'}}>
              <View style={styles.row}>
                <Icons name="city" size={20} />
                <Text style={styles.label}>
                  City <Text style={{color: 'red'}}>*</Text>
                </Text>
              </View>

              <TextInput
                style={[styles.input, errors.address?.city && styles.inputError]}
                placeholder="Enter the City"
                value={formData.address.city}
                placeholderTextColor={'#777'}
                onChangeText={text => handleInputChange('address.city', text)}
              />
              {errors.address?.city && (
                <Text style={styles.errorText}>{errors.address?.city}</Text>
              )}
            </View>
            <View style={{width: '50%'}}>
              <View style={styles.row}>
                <FontAwesome name="map-pin" size={20} />
                <Text style={styles.label}>
                  Pincode <Text style={{color: 'red'}}>*</Text>
                </Text>
              </View>
              <TextInput
                style={[styles.input, errors.address?.pincode && styles.inputError]}
                placeholder="Enter Pincode"
                keyboardType="numeric"
                value={formData.address.pincode}
                maxLength={6}
                placeholderTextColor={'#777'}
                onChangeText={text => handleInputChange('address.pincode', text)}
              />
              {errors.address?.pincode && (
                <Text style={styles.errorText}>{errors.address?.pincode}</Text>
              )}
            </View>
          </View>

          <View style={styles.row}>
            <Icons name="sign-real-estate" size={20} />
            <Text style={styles.label}>
              State <Text style={{color: 'red'}}>*</Text>
            </Text>
          </View>

          <TextInput
            style={[styles.input, errors.address?.state && styles.inputError]}
            placeholder="Enter the State"
            value={formData.address.state}
            placeholderTextColor={'#777'}
            onChangeText={text => handleInputChange('address.state', text)}
          />
          {errors.address?.state && <Text style={styles.errorText}>{errors.address?.state}</Text>}

          <Text style={[styles.label, {fontSize: 20, marginTop: 25, alignSelf: 'center'}]}>
            Bank Details{' '}
          </Text>

          <View style={styles.row}>
            <View style={{width: '100%'}}>
              <View style={styles.row}>
                <AntDesign name="idcard" size={20} />
                <Text style={styles.label}>
                  Account Holder Name <Text style={{color: 'red'}}>*</Text>
                </Text>
              </View>

              <TextInput
                style={[
                  styles.input,
                  errors.bankDetails?.accountHolderName && styles.inputError,
                ]}
                placeholder="Bank Account Name"
                value={formData.bankDetails.accountHolderName}
                placeholderTextColor={'#777'}
                onChangeText={text => handleInputChange('bankDetails.accountHolderName', text)}
              />
              {errors.bankDetails?.accountHolderName && (
                <Text style={styles.errorText}>{errors.bankDetails?.accountHolderName}</Text>
              )}
             
              <View style={styles.row}>
                <AntDesign name="creditcard" size={20} />
                <Text style={styles.label}>
                  Account Number <Text style={{color: 'red'}}>*</Text>
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  errors.bankDetails?.accountNumber && styles.inputError,
                ]}
                placeholder="Bank Account Number"
                value={formData.bankDetails.accountNumber}
                placeholderTextColor={'#777'}
                onChangeText={text => handleInputChange('bankDetails.accountNumber', text)}
              />
              {errors.bankDetails?.accountNumber && (
                <Text style={styles.errorText}>{errors.bankDetails?.accountNumber}</Text>
              )}
            </View>
          </View>
          <View style={styles.row}>
            <View style={{width: '50%'}}>
              <View style={styles.row}>
                <MaterialIcons name="numbers" size={20} />
                <Text style={styles.label}>
                  IFSC Code <Text style={{color: 'red'}}>*</Text>
                </Text>
              </View>

              <TextInput
                style={[styles.input, errors.bankDetails?.ifscCode && styles.inputError]}
                placeholder="Enter IFSC Code"
                value={formData.bankDetails.ifscCode}
                placeholderTextColor={'#777'}
                onChangeText={text => handleInputChange('bankDetails.ifscCode', text)}
              />
              {errors.bankDetails?.ifscCode && (
                <Text style={styles.errorText}>{errors.bankDetails?.ifscCode}</Text>
              )}
            </View>
            <View style={{width: '50%'}}>
              <View style={styles.row}>
                <FontAwesome name="bank" size={18}  style={{marginBottom: 4}}/>
                <Text style={styles.label}>
                  Bank Name <Text style={{color: 'red'}}>*</Text>
                </Text>
              </View>
              <TextInput
                style={[styles.input, errors.bankDetails?.bankName && styles.inputError]}
                placeholder="Enter Bank Name"
                value={formData.bankDetails?.bankName}
                placeholderTextColor={'#777'}
                onChangeText={text => handleInputChange('bankDetails.bankName', text)}
              />
              {errors.bankDetails?.bankName && (
                <Text style={styles.errorText}>{errors.bankDetails?.bankName}</Text>
              )}
            </View>
          </View>
         
          {true ? (
            <View style={styles.row}>
              <Checkbox
                status={isTermsAndCondition ? 'checked' : 'unchecked'}
                color={isTermsAndCondition ? 'green' : 'red'}
                
                onPress={() =>
                  handleCheckBoxChange('isTermsAndCondition', !isTermsAndCondition)
                }
              />

           <TouchableOpacity onPress={()=>{}}>
            <Text>
              I agree to the{`\n`}
              <Text style={{color: 'blue'}}>Terms of Service </Text>
              and{' '}
              <Text style={{color: 'blue'}}>Privacy Policy </Text>
              <Text style={{color: 'red',bottom:10}}> *</Text>
            </Text>
           </TouchableOpacity>
            </View>
          ) : null}



          <TouchableOpacity
            style={[styles.submitButton,
              { opacity: applicationStatus === 'pending' ? 0.5 : 1 }]
            }
            onPress={() => handleSubmit()} disabled= {isSubmitting|| applicationStatus==='pending'}>
            {
            isSubmitting?(<ActivityIndicator color="gray" size={20} />):
            (<Text style={{fontSize: 16, color: 'white'}}>{applicationStatus==='pending'?'Application Submitted':'Submit Application'}</Text>)
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9dd7c',
    gap: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    paddingVertical: 8,
    width: 100,
  },
  row: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
    marginBottom: 5,
    maxWidth: '100%',
    alignItems: 'center',
  },
  overlayContainer: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    marginBottom: 15,
  },
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#F7CE45',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 10,
  },
  uploadButton: {
    backgroundColor: '#222',
    padding: 12,
    height: 70,
    borderRadius: 8,
    gap: 10,
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  progress: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  progressStep: {
    height: 10,
    width: 30,
    // margin: 5,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  headerText: {
    fontSize: 23,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  headerSubtext:{
   marginBottom: 10,
  },
  submitButton: {
    marginTop: 30,
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 15,

    borderRadius: 10,
    alignItems: 'center',
   // paddingBottom: 15,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    // marginTop: 10,
    marginBottom: 4,
    color: '#333',
  },
  input: {
    height: 50,
    // borderColor: '#ddd',
    // borderWidth: 1,
    elevation: 3,
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingLeft: 10,
  },
  inputError: {
    borderColor: 'red',
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 10,
    borderColor: '#ccc',
    padding: 10,
    height: 50,
  },
  dropdownError: {
    borderColor: 'red',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexGrow: 1,
    maxWidth: '100%',
    borderRadius: 8,
    gap: 10,
    // paddingHorizontal: 10,
    paddingVertical: 5,
    flexWrap: 'wrap', // This allows components to wrap onto a new line
  },

  checkboxContainer: {
    flexDirection: 'column',
    marginBottom: 10,
  },
  checkboxLabel: {
    fontSize: 12,
    color: 'black',
    backgroundColor: 'white',
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    // borderWidth: 1,
    // borderColor: '#777/',
    marginBottom: 5,
    borderRadius: 8,
    textAlign: 'center',
  },
  selectedCategory: {
    fontWeight: 'bold',
    backgroundColor: '#1E1E1E',

    color: 'white',
    borderColor: '#1e90ff',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
});

export default DropShipperForm;
