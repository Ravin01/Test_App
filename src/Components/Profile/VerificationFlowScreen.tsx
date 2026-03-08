import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
  ToastAndroid,
  Platform,
  Image,
} from 'react-native';
import {
  Shield,
  User,
  Mail,
  MapPin,
  PlusCircle,
  Edit,
  Axis3D,
  Box,
  Plus,
  ChevronDown,
  ChevronsDown,
} from 'lucide-react-native';

import AntDesign from 'react-native-vector-icons/AntDesign';
import axiosInstance from '../../Utils/Api';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { verifiedUserSuccess } from '../../assets/assets';


const VerificationFlowModal = ({visible, onClose}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigation =useNavigation()
  const [addressData, setAddressData] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState({});
  const [formData, setFormData] = useState({
    aadharNumber: '',
    otpCode: '',
    address: '',
  });

  const steps = [
    {id: 1, title: 'Why become a verified user?', icon: Shield},
    {id: 2, title: 'Aadhar verification', icon: User},
    {id: 3, title: 'Why become a verified user?', icon: Shield},
    {id: 4, title: 'OTP verification', icon: Mail},
    {id: 5, title: 'Delivery Address', icon: MapPin},
  ];
  const otpLength = 6;
const [otp, setOtp] = useState(['', '', '','', '','']);
const inputsRef = ['', '', '','', '','']
  .fill()
  .map(() => React.createRef());
const showToast = message => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('Validation', message);
  }
};


/*
RESPONSIVE DESIGN INTEGRATION GUIDE:
1. Add this inside your component function:
   const { theme } = useTheme();
   const { styles: responsiveStyles } = useResponsiveScreen();

2. Replace hardcoded values:
   - fontSize: 16 → fontSize: theme.typography.medium
   - padding: 20 → padding: theme.spacing.lg
   - margin: 10 → margin: theme.spacing.sm
   - backgroundColor: '#FFFFFF' → backgroundColor: theme.colors.background

3. Use responsive components:
   - <Text> → <ResponsiveText variant="body">
   - <TouchableOpacity> (buttons) → <ResponsiveButton>
   - <TextInput> → <ResponsiveInput>

4. Add accessibility:
   - Add {...getAccessibilityProps('Label', 'Description', 'button')} to touchable elements

5. Use responsive styles:
   - style={responsiveStyles.container} for main containers
   - style={responsiveStyles.title} for titles
   - style={responsiveStyles.primaryButton} for primary buttons
*/

const handleNext = () => {
  if (currentStep === 2 && formData.aadharNumber.length !== 12) {
    showToast('Please enter a valid 12-digit Aadhar number');
    return;
  }

  if (currentStep === 4 && formData.otpCode.length !== otpLength) {
    showToast('Please enter the 6-digit OTP code');
    return;
  }

  if (currentStep === 5 && !selectedAddress?.id) {
    showToast('Please select a delivery address');
    return;
  }

  if (currentStep < steps.length) {
    if (currentStep + 1 === 3) setCurrentStep(currentStep + 2);
    else setCurrentStep(currentStep + 1);
  }
};


  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({...formData, [field]: value});
  };

  const handleContinue = () => {
    // Alert.alert('Success', 'Verification completed successfully!');
    // onClose(); // close modal after completion
    setCurrentStep(6);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
      case 3:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.title}>
              Why become a{' '}
              <Text style={{color: '#F7CE45'}}>verified user?</Text>{' '}
            </Text>
            <Text style={styles.description}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.
            </Text>
          </View>
        );

      case 2:
        return (
          <View style={styles.contentContainer}>
            <Text style={[styles.title, {fontSize: 20}]}>
              Aadhar verification
            </Text>
            <Text style={styles.subtitle}>
              To become verified user enter your aadhar number
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Aadhar number</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Enter aadhar number"
                placeholderTextColor="#666"
                value={formData.aadharNumber}
                onChangeText={text => handleInputChange('aadharNumber', text)}
                keyboardType="numeric"
                maxLength={12}
              />
            </View>
          </View>
        );

      case 4:
  return (
    <View style={styles.contentContainer}>
      <Text style={[styles.title, {fontSize: 20}]}>OTP verification</Text>
      <Text style={{color:'#ccc'}}>Enter the code from the sms we sent to <Text style={{color:'#fff'}}>
            +91 1234567890</Text></Text>
        
      <View style={styles.otpBoxesContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={inputsRef[index]}
            style={styles.otpBox}
            keyboardType="numeric"
            maxLength={1}
            value={digit}
            onChangeText={text => {
              const newOtp = [...otp];
              newOtp[index] = text;
              setOtp(newOtp);

              // Move to next input if available and input is not empty
              if (text && index < otpLength - 1) {
                inputsRef[index + 1].current.focus();
              }

              // Update formData (combine into string)
              setFormData({...formData, otpCode: newOtp.join('')});
            }}
            onKeyPress={({nativeEvent}) => {
              if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
                inputsRef[index - 1].current.focus();
              }
            }}
          />
        ))}
      </View><TouchableOpacity>
      <Text style={styles.footerText}>Haven’t got the code yet?
        <Text style={{color:'#F7CE45',}}>{' '}Resend code</Text></Text></TouchableOpacity>
    </View>
  );

   case 5:
  return (
    <View style={styles.contentContainer}>
      <Text style={[styles.title, {fontSize: 20}]}>Delivery Address</Text>
    {addressData.length>0? <ScrollView style={{maxHeight: 200, width: '100%'}} showsVerticalScrollIndicator={false}>
        {addressData?.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setSelectedAddress(item)}
            style={[
              styles.addressItem,
              selectedAddress?._id === item._id && styles.selectedAddressItem,
            ]}>
                <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
                <View>
                <Text style={{color:'#fff',fontWeight:'bold'}}>{item?.name}</Text>
            <Text style={styles.addressText}>{item.line1 }{item.line2} {item.city} {item.state} {item.pincode}
                {item.mobileNumber}
            </Text>
            </View>
            <TouchableOpacity  onPress={() => navigation.navigate('AddressForm',{item:item})}>
            <Edit color={'#fff'} size={20}/>
            </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>:
      <View>
        {/* <Box/> */}
        {/* <ChevronDown/> */}
        <ChevronsDown color={'#fff'}/>
        {/* <Plus/> */}
        </View>
      }
     

      <TouchableOpacity style={styles.addAddressButton} onPress={() => navigation.navigate('AddressForm')}>
        <PlusCircle color={'#fff'} size={20} />
        <Text style={styles.addAddressText}> Add new address</Text>
      </TouchableOpacity>
    </View>
  );
  case 6:
    return(
        <View style={styles.contentContainer}>
            <Image source={{uri:verifiedUserSuccess}} style={{height:100,width:100}}/>
            <Text style={[styles.title, {fontSize: 20,fontWeight:'600',marginTop:10,marginBottom:4}]}>Verification{'\n'} complete!</Text>
            <Text style={styles.description}>
               You are now a verified user
            </Text>
            </View>
    )

      default:
        return null;
    }
  };
  useEffect(()=>{
    const fetcAddressData = async () => {
        try{
            const response = await axiosInstance.get('user/addresses');
            // console.log('Address data fetched:', response.data)
            setAddressData(response.data.data);
        }catch(error){
          console.log('Error fetching address data:', error);
        }
    }
    fetcAddressData();
  },[])


  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalBackground}>
        <SafeAreaView style={styles.modalContainer}>
           <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType="light"
                  blurAmount={10}
                  
                  reducedTransparencyFallbackColor="white"
                />
          <ScrollView showsVerticalScrollIndicator={false}>
           
            <TouchableOpacity
              onPress={onClose}
              style={{
                marginTop: 20,
                alignItems: 'center',
                alignSelf: 'flex-end',
                marginRight: 10,
              }}>
              <AntDesign name="closecircle" color="#ccc" size={15} />
            </TouchableOpacity>
            {renderStepContent()}
            <View style={styles.bottomContainer}>
            {currentStep!=6 && currentStep !=3&&(  <TouchableOpacity
                style={styles.nextButton}
                onPress={
                  currentStep === steps.length ? handleContinue : handleNext
                }>
                <Text style={styles.nextButtonText}>
                  {currentStep === steps.length ? 'Deliver Here' : 'Next'}
                </Text>
              </TouchableOpacity>)}

              {currentStep === 2 && (
                <Text style={styles.footerText}>
                  To know more about verified user
                  <TouchableOpacity onPress={() => setCurrentStep(3)}>
                    <Text style={{color: '#F7CE45'}}> click here</Text>
                  </TouchableOpacity>
                </Text>
              )}

              {currentStep === 3 && (
                <TouchableOpacity
                  style={styles.backButtonBottom}
                  onPress={handleBack}>
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    // position: 'absolute',
    // height: '50%',
    // width: '90%',
    alignSelf: 'center',
    // backgroundColor:'#fff',
    // backgroundColor: 'rgba(0, 0, 0, 0)', // semi-transparent background
    justifyContent: 'center',
  },
  modalContainer: {
    // flex: 1,
    padding: 10,
    borderRadius: 25,
    width: '90%',
    maxHeight: 450,
    // backgroundColor: '#fff', // '#121212',
    // backgroundColor: 'rgba(18, 18, 18, 0.8)', // Equivalent to #121212CC
    // borderTopLeftRadius: 20,
    // borderTopRightRadius: 20,
    // borderRadius:10,
    overflow: 'hidden',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },addressItem: {
  backgroundColor: '#2a2a2a',
  padding: 12,
  marginBottom: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#ccc',
},

selectedAddressItem: {
  borderColor: '#F7CE45',
  borderWidth: 2,
},

  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',

    marginBottom: 30,
  },
  description: {
    fontSize: 14,
    color: '#ccc',

    textAlign: 'justify',
    lineHeight: 22,
    // marginBottom: 15,
  },
  otpBoxesContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginVertical: 20,gap:4
},

otpBox: {
  width: 35,
  height: 45,
  backgroundColor: '#2a2a2a',
  color: '#fff',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#666',
  textAlign: 'center',
  fontSize: 18,
},

  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  input: {
    // backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#fff',
  },
  otpInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 20,
    fontSize: 24,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    textAlign: 'center',
    letterSpacing: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  addressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  addressLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
    marginTop: 15,
  },
  addressText: {
    fontSize: 11,
    color: '#fff',
    marginTop:5,
    flexWrap: 'wrap',
    maxWidth: '90%',
    // padding: 12,
    borderRadius: 8,
  },
  addAddressButton: {
    // borderWidth: 1,
    // borderColor: '#FFD700',
    borderRadius: 8,
    alignSelf:'flex-start',
    flexDirection:'row',
    paddingVertical: 12,
    // paddingHorizontal: 20,
    // marginTop: 10,
  },
  addAddressText: {
    color: '#fff',
    fontWeight:'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  nextButton: {
    backgroundColor: '#F7CE45',
    borderRadius: 25,
    paddingVertical: 10,
    elevation: 3,
    alignItems: 'center',
    marginBottom: 10,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  backButtonBottom: {
    backgroundColor: '#F7CE45',
    borderWidth: 1,
    borderColor: '#F7CE45',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00000',
  },
});

export default VerificationFlowModal;
