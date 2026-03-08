import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Dimensions,
  StyleSheet,
  Alert,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axiosInstance from '../../../Utils/Api';
import { Toast } from '../../../Utils/dateUtils';
import { AuthContext } from '../../../Context/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const OTPVerificationModal = ({ visible, onClose, onVerify, phoneNumber,handlesendOtp,setFormdata,formdata }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(90);
  const [canResend, setCanResend] = useState(false);
  const {user}=useContext(AuthContext)
  const inputRefs = useRef([]);
  const isPasting = useRef(false);

  useEffect(() => {
    let timerRef;
    if (visible) {
      startTimer();
    } else {
      setOtp(['', '', '', '', '', '']);
      setIsLoading(false);
      clearInterval(timerRef);
    }
    return () => {
      clearInterval(timerRef);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);


const startTimer = () => {
  setTimer(90);
  setCanResend(false);

  const interval = setInterval(() => {
    setTimer((prev) => {
      if (prev <= 1) {
        setCanResend(true);
        clearInterval(interval);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return interval;
};

  const handleOtpChange = (value, index) => {
    // If we're currently processing a paste, ignore individual character changes
    if (isPasting.current) {
      return;
    }
    
    // Extract only digits from the input
    const cleanValue = value.replace(/\D/g, '');
    
    // Handle paste - if more than 1 character, it's a paste event
    if (cleanValue.length > 1) {
      handlePaste(cleanValue);
      return;
    }

    if (cleanValue.length === 0 && value.length > 0) return; // Non-digit entered
    
    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    // Auto-focus next input
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      // handleVerify(newOtp);
    }
  };

  const handlePaste = (pastedText) => {
    // Set pasting flag to prevent race conditions
    isPasting.current = true;
    
    // Extract only digits from pasted text
    const digits = pastedText.replace(/\D/g, '').slice(0, 6).split('');
    
    if (digits.length === 0) {
      isPasting.current = false;
      return;
    }

    // Create new OTP array with pasted digits
    const newOtp = ['', '', '', '', '', ''];
    
    // Fill OTP from beginning with pasted digits
    for (let i = 0; i < digits.length && i < 6; i++) {
      newOtp[i] = digits[i];
    }
    
    setOtp(newOtp);
    
    // Focus the appropriate input
    if (digits.length >= 6) {
      // Focus the last box if all digits entered
      inputRefs.current[5]?.focus();
    } else {
      // Focus the next empty box
      inputRefs.current[digits.length]?.focus();
    }
    
    // Reset pasting flag after a short delay to allow state to update
    setTimeout(() => {
      isPasting.current = false;
    }, 100);
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode) => {
    // console.log(otpCode.join(''))
    // return
    if (otpCode.length !== 6) {
      console.log(otpCode)
      Alert.alert('Error', 'Please enter complete OTP');
      return;
    }

    setIsLoading(true);
    
    try {
      // console.log({
      //   referenceId: phoneNumber,
      //   otp: otpCode.join(''),
      // });
      
      const response = await axiosInstance.post('/apply/kyc/verify-otp', {
        referenceId: phoneNumber,
        otp: otpCode.join(''),
        
            userId: user?.id || user?._id
      });
      const data=response.data

    setFormdata(prev => ({...prev, ['aadharVerified']:true}));
      if(!formdata.hasGST)
      {
        console.log("filling details")
          const address = data?.data?.address;
                
                console.log('🔄 Applying Aadhaar address updates...');
                
                const addressLine1 = address?.street || address?.line1 || address?.house || address?.building || '';
                const addressLine2 = address?.landmark || address?.line2 || address?.locality || '';
                const city = address?.city || address?.district || '';
                const state = address?.state || '';
                const pincode = address?.pincode || address?.zip || address?.postal_code || '';
                   setFormdata(prev => ({
  ...prev,

  streetAddress2: addressLine2,
    streetAddress1: addressLine1,
    city: city,
    state: state,
    pinCode: pincode,
}));

      }
      // console.log(response)
      // await new Promise(resolve => setTimeout(resolve, 2000));
      
      onVerify();
      setOtp(['', '', '', '', '', '']);
      onClose();
      // ToastAndroid.show(response?.message, ToastAndroid.SHORT);
    } catch (error) {
      // console.log(error)
      console.log(error.response.data)
      ToastAndroid.show(error?.response?.data?.message, ToastAndroid.SHORT);
      // if(error?.response?.status==502)
      // {
      console.log('clearing otp')
      setOtp(['', '', '', '', '', '']);
      console.log('closing dmodal')

      onClose();
      console.log("error onsetting form data")
      setFormdata(prev => ({...prev, ['aadhaarNumber']: ''}));
      // }
      } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    handlesendOtp()
    Toast('A new OTP has been sent to your phone number');
    setOtp(['', '', '', '', '', '']);
    startTimer();
  };

  const handleClose = () => {
    setOtp(['', '', '', '', '', '']);
    onClose();
  };

  const formatTimer = (seconds) => {
    return seconds;
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.modalContent}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              {/* Handle Bar */}
              <View style={styles.handleBar} />
              
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
                
                <View style={styles.iconContainer}>
                  <Icon name="security" size={48} color="#FFD700" />
                </View>
                
                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to your Aadhar Number
                </Text>
              </View>

              {/* OTP Input */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => inputRefs.current[index] = ref}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="numeric"
                    maxLength={6}
                    selectTextOnFocus
                    textAlign="center"
                    autoComplete="sms-otp"
                    textContentType="oneTimeCode"
                  />
                ))}
              </View>

              {/* Timer */}
              <View style={styles.timerContainer}>
                <Icon name="access-time" size={16} color="#666" />
                <Text style={styles.timerText} ellipsizeMode='tail'>
                {canResend ? 'You can resend OTP now' : `Resend OTP in ${formatTimer(timer)}s`}

                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.button, 
                    styles.verifyButton,
                    (isLoading || otp.join('').length !== 6) && styles.disabledButton
                  ]}
                  onPress={() => handleVerify(otp)}
                  disabled={isLoading || otp.join('').length !== 6}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <Icon name="hourglass-empty" size={20} color="#000" />
                      <Text style={styles.buttonText}>Verifying...</Text>
                    </View>
                  ) : (
                    <>
                      <Icon name="verified" size={20} color="#000" />
                      <Text style={styles.buttonText}>Verify OTP</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.resendButton]}
                  onPress={handleResend}
                  disabled={!canResend}
                >
                  <Icon name="refresh" size={20} color={canResend ? "#FFD700" : "#666"} />
                  <Text style={[styles.resendText, !canResend && styles.disabledText]}>
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Icon name="info-outline" size={16} color="#666" />
                <Text style={styles.footerText}>
                  Didn't receive the code? Check your spam folder or contact support
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Modal Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 34,
    maxHeight: SCREEN_HEIGHT * 0.8,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  
  // Header Styles
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },

  // OTP Input Styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  otpInputFilled: {
    borderColor: '#FFD700',
    backgroundColor: '#333',
  },

  // Timer Styles
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  timerText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 8,
  },

  // Button Styles
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    gap: 8,
  },
  verifyButton: {
    backgroundColor: '#FFD700',
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  resendButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  resendText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: '#666',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Footer Styles
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
});

export default OTPVerificationModal;
