import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  ToastAndroid,
  BackHandler,
} from 'react-native';
import { useMobileVerification } from '../../hooks/useMobileVerification';

// Icon components
const XIcon = () => <Text style={[styles.iconText, {fontSize: 10, fontWeight: 'bold'}]}>✕</Text>;
const PhoneIcon = () => <Text style={styles.iconText}>📱</Text>;
const ShieldIcon = () => <Text style={styles.iconText}>🛡️</Text>;
const SparklesIcon = () => <Text style={styles.iconText}>✨</Text>;

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isMediumScreen = width < 400;

// --- OTP Input Component ---
interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled?: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, onComplete, disabled }) => {
  const inputsRef = useRef<(TextInput | null)[]>([]);
  const scaleAnims = useRef([...Array(6)].map(() => new Animated.Value(0.8))).current;

  useEffect(() => {
    // Animate inputs on mount
    scaleAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: 1,
        delay: i * 50,
        useNativeDriver: true,
      }).start();
    });

    if (inputsRef.current[0] && !disabled) {
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    }
  }, [disabled]);

  const handleChange = (text: string, index: number) => {
    if (disabled) return;
    if (!/^\d*$/.test(text)) return;

    // Handle paste or multi-character input
    if (text.length > 1) {
      // Extract only digits from pasted text
      const digits = text.replace(/\D/g, '');
      
      // If pasting a full OTP (6 digits), replace entire OTP
      if (digits.length >= 6) {
        const newOtpString = digits.slice(0, 6);
        onChange(newOtpString);
        
        // Focus on the last input
        inputsRef.current[5]?.focus();
        
        // Trigger completion
        onComplete(newOtpString);
      } else {
        // Build new OTP by preserving existing values before paste position
        // and filling from paste position onwards
        const newOtpArray = value ? value.split('') : ['', '', '', '', '', ''];
        
        // Ensure array has 6 elements
        while (newOtpArray.length < 6) {
          newOtpArray.push('');
        }
        
        // Fill from current index with pasted digits
        for (let i = 0; i < digits.length && (index + i) < 6; i++) {
          newOtpArray[index + i] = digits[i];
        }
        
        const newOtpString = newOtpArray.join('');
        onChange(newOtpString);
        
        // Focus on the next empty field or last field if all filled
        const nextIndex = Math.min(index + digits.length, 5);
        inputsRef.current[nextIndex]?.focus();
        
        // Check if OTP is complete
        if (newOtpString.length === 6) {
          onComplete(newOtpString);
        }
      }
    } else {
      // Handle single character input (typing)
      const newOtp = value ? value.split('') : ['', '', '', '', '', ''];
      
      // Ensure array has 6 elements
      while (newOtp.length < 6) {
        newOtp.push('');
      }
      
      newOtp[index] = text.slice(-1);
      const newOtpString = newOtp.join('').slice(0, 6);
      onChange(newOtpString);

      if (text && index < 5) {
        inputsRef.current[index + 1]?.focus();
      }
      if (newOtpString.length === 6) {
        onComplete(newOtpString);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (disabled) return;
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.otpContainer}>
      {[...Array(6)].map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.otpInputWrapper,
            { transform: [{ scale: scaleAnims[i] }] },
          ]}
        >
          <TextInput
            ref={(el) => (inputsRef.current[i] = el)}
            style={[
              styles.otpInput,
              value[i] && styles.otpInputFilled,
              disabled && styles.otpInputDisabled,
            ]}
            keyboardType="number-pad"
            maxLength={6}
            value={value[i] || ''}
            onChangeText={(text) => handleChange(text, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            editable={!disabled}
            selectTextOnFocus
          />
        </Animated.View>
      ))}
    </View>
  );
};

// --- Phone Input Component ---
interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const PhoneInputComponent: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  disabled,
  placeholder = '98765 43210',
}) => {
  // Remove '+' and country code for display
  const displayValue = value.replace(/^\+91/, '');

  const handleChange = (text: string) => {
    // Only allow digits
    const cleaned = text.replace(/\D/g, '');
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);
    // Add +91 prefix
    onChange(limited ? `+91${limited}` : '');
  };

  return (
    <View style={styles.phoneInputContainer}>
      <View style={styles.countryCodeContainer}>
        <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
      </View>
      <TextInput
        style={[
          styles.phoneInput,
          disabled && styles.phoneInputDisabled,
        ]}
        keyboardType="phone-pad"
        value={displayValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        editable={!disabled}
      />
    </View>
  );
};

// --- Main Component ---
interface MobileVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MobileVerificationModal: React.FC<MobileVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'enter_mobile' | 'verify_otp'>('enter_mobile');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const {
    loading,
    error,
    success,
    countdown,
    sendOTP,
    verifyOTP,
    resendOTP,
    resetState,
  } = useMobileVerification(null, 'user_verification');

  // Animate modal on open
  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    }
  }, [isOpen]);

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMobileNumber('');
        setOtp('');
        setStep('enter_mobile');
        resetState();
      }, 300);
    }
  }, [isOpen, resetState]);

  // Show success in ToastAndroid
  useEffect(() => {
    if (success) {
      ToastAndroid.show(success, ToastAndroid.SHORT);
    }
  }, [success]);

  // Prevent hardware back press from closing the modal
  useEffect(() => {
    if (!isOpen) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Return true to prevent default back button behavior (closing the modal)
      return true;
    });

    return () => backHandler.remove();
  }, [isOpen]);

  const handleSendOTP = async () => {
    if (!mobileNumber || mobileNumber.length < 13) return; // +91 + 10 digits

    const formattedNumber = mobileNumber.startsWith('+')
      ? mobileNumber
      : `+${mobileNumber}`;

    const result = await sendOTP(formattedNumber);
    if (result) setStep('verify_otp');
  };

  const handleVerifyOTP = async (finalOtp?: string) => {
    const otpToVerify = finalOtp || otp;
    if (!otpToVerify || otpToVerify.length !== 6) return;
    const result = await verifyOTP(otpToVerify);
    if (result) {
      if (onSuccess) onSuccess();
    }
  };

  const handleResendOTP = async () => {
    const formattedNumber = mobileNumber.startsWith('+')
      ? mobileNumber
      : `+${mobileNumber}`;
    await resendOTP(formattedNumber);
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={{ height: '100%', justifyContent: 'center', position: 'relative' }}>
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          onClose(); // Disable default close on back button
        }}
        onDismiss={onClose}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.backdrop}>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <TouchableOpacity activeOpacity={1}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                {/* Decorative Background */}
                <View style={styles.decorativeBlob1} />
                <View style={styles.decorativeBlob2} />

                {/* Close Button */}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <XIcon />
                </TouchableOpacity>

                {/* Decorative Section (Desktop Only - Hidden on Mobile) */}
                {width >= 768 && (
                  <View style={styles.decorativeSection}>
                    <View style={styles.shieldIconContainer}>
                      <ShieldIcon />
                    </View>
                    <Text style={styles.decorativeTitle}>
                      Secure Verification <SparklesIcon />
                    </Text>
                    <Text style={styles.decorativeSubtitle}>
                      We protect your account with advanced OTP verification technology
                    </Text>
                  </View>
                )}

                {/* Form Section */}
                <View style={styles.formSection}>
                  {/* Header */}
                  <View style={styles.header}>
                    <View style={styles.headerIconContainer}>
                      {step === 'enter_mobile' ? <PhoneIcon /> : <ShieldIcon />}
                    </View>
                    <View style={styles.headerTextContainer}>
                      <Text style={styles.headerTitle}>
                        {step === 'enter_mobile' ? 'Verify Mobile' : 'Enter OTP'}
                      </Text>
                      <Text style={styles.headerSubtitle}>
                        {step === 'enter_mobile'
                          ? 'Enter your mobile number to receive OTP'
                          : `Code sent to ${mobileNumber}`}
                      </Text>
                    </View>
                  </View>

                  {/* Step Forms */}
                  {step === 'enter_mobile' ? (
                    <View style={styles.stepContainer}>
                      <Text style={styles.inputLabel}>Mobile Number</Text>
                      <PhoneInputComponent
                        value={mobileNumber}
                        onChange={setMobileNumber}
                        disabled={loading}
                      />
                      {error && (
                        <Text style={styles.errorText}>{error}</Text>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.primaryButton,
                          (loading || mobileNumber.length !== 13) && styles.buttonDisabled,
                        ]}
                        onPress={handleSendOTP}
                        disabled={loading || mobileNumber.length !== 13}
                      >
                        {loading ? (
                          <ActivityIndicator color="#1F2937" />
                        ) : (
                          <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.stepContainer}>
                      <Text style={styles.inputLabelCenter}>
                        Enter 6-Digit Verification Code
                      </Text>
                      <OtpInput
                        value={otp}
                        onChange={setOtp}
                        onComplete={handleVerifyOTP}
                        disabled={loading}
                      />
                      {error && (
                        <Text style={styles.errorText}>{error}</Text>
                      )}

                      <View style={styles.resendContainer}>
                        <Text style={styles.resendText}>Didn't receive the code?</Text>
                        <TouchableOpacity
                          onPress={handleResendOTP}
                          disabled={countdown > 0 || loading}
                        >
                          <Text
                            style={[
                              styles.resendButton,
                              (countdown > 0 || loading) && styles.resendButtonDisabled,
                            ]}
                          >
                            {countdown > 0
                              ? `Resend in ${formatCountdown(countdown)}`
                              : 'Resend Code'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.primaryButton,
                          (loading || otp.length !== 6) && styles.buttonDisabled,
                        ]}
                        onPress={() => handleVerifyOTP()}
                        disabled={loading || otp.length !== 6}
                      >
                        {loading ? (
                          <ActivityIndicator color="#1F2937" />
                        ) : (
                          <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setStep('enter_mobile');
                          setOtp('');
                          resetState();
                        }}
                        disabled={loading}
                        style={styles.changeNumberButton}
                      >
                        <Text style={styles.changeNumberText}>Change mobile number</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                </ScrollView>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
     </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flexGrow: 1,
   backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    maxHeight: height * 0.9,
  },
  decorativeBlob1: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 400,
    height: 400,
    backgroundColor: 'rgba(247, 206, 69, 0.05)',
    borderRadius: 200,
  },
  decorativeBlob2: {
    position: 'absolute',
    bottom: -200,
    left: -200,
    width: 400,
    height: 400,
    backgroundColor: 'rgba(247, 206, 69, 0.05)',
    borderRadius: 200,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 22,
    height: 22,
    borderRadius: 16,
    backgroundColor: '#ccc',  // 'rgba(51, 51, 51, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  decorativeSection: {
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    padding: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  shieldIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#F7CE45',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  decorativeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  decorativeSubtitle: {
    fontSize: 14,
    color: '#F7CE45',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  formSection: {
    padding: isSmallScreen ? 16 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F7CE45',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: '#F7CE45',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 8,
  },
  stepContainer: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F7CE45',
    marginBottom: 12,
  },
  inputLabelCenter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 16,
    textAlign: 'center',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  countryCodeContainer: {
    backgroundColor: '#141414',
    borderWidth: 2,
    borderColor: '#333',
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 2,
    borderColor: '#333',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  phoneInputDisabled: {
    opacity: 0.5,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: isSmallScreen ? 6 : isMediumScreen ? 8 : 10,
    marginBottom: 16,
  },
  otpInputWrapper: {
    width: isSmallScreen ? 38 : isMediumScreen ? 42 : 48,
    height: isSmallScreen ? 46 : isMediumScreen ? 50 : 56,
  },
  otpInput: {
    width: '100%',
    height: '100%',
    backgroundColor: '#141414',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: isSmallScreen ? 18 : isMediumScreen ? 20 : 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  otpInputFilled: {
    borderColor: '#F7CE45',
    color: '#F7CE45',
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  otpInputDisabled: {
    opacity: 0.5,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 6,
  },
  resendButton: {
    color: '#F7CE45',
    fontWeight: '600',
    fontSize: 14,
  },
  resendButtonDisabled: {
    color: '#888',
  },
  primaryButton: {
    backgroundColor: '#F7CE45',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  changeNumberButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  changeNumberText: {
    color: '#888',
    fontSize: 14,
  },
  iconText: {
    fontSize: 20,
  },
});

export default MobileVerificationModal;
