/* eslint-disable quotes */
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ToastAndroid,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  AppState,
} from 'react-native';
import {ActivityIndicator} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import api from '../../Utils/Api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { flykupLogo, verifyIndexImg } from '../../assets/assets';

export default function OTPScreen({route}) {
  const {email} =route.params;
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [otpIndex, setOtpIndex] = useState(0);
  const [error, setError] = useState('');
  const Navigation = useNavigation();

  const [otp, setOtp] = useState(['', '', '', '', '','']);
  const inputs = useRef([]);
  const countdownIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Calculate remaining time based on timestamp
  const calculateTimeLeft = () => {
    if (!startTimeRef.current) return 0;
    
    const now = Date.now();
    const elapsed = Math.floor((now - startTimeRef.current) / 1000);
    const remaining = 60 - elapsed;
    
    return remaining > 0 ? remaining : 0;
  };

  // Start countdown timer
  const startCountdown = () => {
    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Store the start timestamp
    startTimeRef.current = Date.now();
    setTimeLeft(60);
    
    countdownIntervalRef.current = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, 1000);
  };

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground - recalculate time
        if (startTimeRef.current) {
          const remaining = calculateTimeLeft();
          setTimeLeft(remaining);
          
          if (remaining <= 0) {
            // Timer expired while in background
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            startTimeRef.current = null;
          }
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Start countdown timer when component mounts
  useEffect(() => {
    startCountdown();
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const validateOTP = (otpArray) => {
    const otpString = otpArray.join('');
    const isValid = /^\d{6}$/.test(otpString);
    return !isValid ? 'OTP should be exactly 6 digits' : '';
  };
  
  const handleResendOtp = async () => {
    if (timeLeft > 0) return;  // Don't resend if time left > 0

    setLoading(true);
    try {
      await api.post('/auth/resend-otp', {
        emailId: email
      });

      ToastAndroid.show("OTP has been resent!", ToastAndroid.SHORT);
      startCountdown();  // Restart countdown after resend
      
      setOtp(Array(6).fill('')); 
      setOtpIndex(0);
      inputs.current[0]?.focus();
    } catch (error) {
      console.log("Error Resend otp", error);
      ToastAndroid.show("Failed to resend OTP. Please try again.", ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    
      // Navigation.navigate('ConfirmPassword', {email: email});
    const otpError = validateOTP(otp);
    if (otpError) {
      setError(otpError);
      return;
    }
    setError('');
    setLoading(true);
    try {
       await api.post('/auth/forgot-password/verify', {
        emailId: email, otp: otp.join('')
      });
      ToastAndroid.show('OTP Verified Successfully!', ToastAndroid.SHORT);
      Navigation.navigate('ConfirmPassword', {email: email});
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(message);
      ToastAndroid.show(message, ToastAndroid.SHORT);
      console.log('Error not valid otp', error);
    } finally {
      setLoading(false);
    }
  };

  // Find the first empty box index
  const getFirstEmptyIndex = () => {
    const emptyIndex = otp.findIndex(digit => digit === '');
    return emptyIndex === -1 ? 5 : emptyIndex; // If all filled, return last index
  };

  // Handle focus - always redirect to first empty box (shadcn-style)
  const handleFocus = (index) => {
    const firstEmptyIndex = getFirstEmptyIndex();
    if (index !== firstEmptyIndex) {
      // Redirect focus to first empty box
      inputs.current[firstEmptyIndex]?.focus();
    }
  };

  const handleChange = (text, index) => {
    // Extract only digits from input
    const digits = text.replace(/\D/g, '');
    
    // Detect paste: if we get 4+ digits at once, it's likely a paste operation
    if (digits.length >= 4) {
      // Take only first 6 digits
      const otpDigits = digits.slice(0, 6);
      const newOtp = [...otp];
      
      // Fill the OTP boxes with pasted digits
      for (let i = 0; i < 6; i++) {
        newOtp[i] = otpDigits[i] || '';
      }
      
      setOtp(newOtp);
      
      // Focus on the last filled input or the last input if all are filled
      const focusIndex = Math.min(otpDigits.length, 5);
      inputs.current[focusIndex]?.focus();
      
      if (Platform.OS === 'android' && otpDigits.length >= 6) {
        ToastAndroid.show('OTP pasted!', ToastAndroid.SHORT);
      }
    } else if (digits.length === 1) {
      // Single digit input - always place in first empty box (shadcn-style)
      const targetIndex = getFirstEmptyIndex();
      const newOtp = [...otp];
      newOtp[targetIndex] = digits;
      setOtp(newOtp);

      // Auto-focus next empty box
      if (targetIndex < 5) {
        inputs.current[targetIndex + 1]?.focus();
      }
    } else if (text === '') {
      // Handle deletion - delete from current index
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index] === '') {
        // If current box is empty, go to previous box and clear it
        if (index > 0) {
          const newOtp = [...otp];
          newOtp[index - 1] = '';
          setOtp(newOtp);
          inputs.current[index - 1]?.focus();
        }
      } else {
        // If current box has value, just clear it
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
    <ScrollView 
      showsVerticalScrollIndicator={false}  
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
   
   <Image
        source={{uri:flykupLogo}} 
        style={styles.logo}
        resizeMode='cover'
      />
   
   <Image
        source={{uri:verifyIndexImg}} 
        style={styles.headerImage}
        resizeMode='cover'
      />
    <View style={{marginHorizontal: 20, marginTop: 20}}>
     
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>
      We sent a reset code to <Text style={{color: '#fff'}}>{email || 'xyz@gmail.com'}</Text>{'\n'}
      enter 6 digit code that mentioned in the email
      </Text>

      <View style={styles.otpContainer}>
      {otp.map((digit, index) => (
        <TextInput
          key={index}
          ref={ref => (inputs.current[index] = ref)}
          value={digit}
          onChangeText={text => handleChange(text, index)}
          onKeyPress={e => handleKeyPress(e, index)}
          onFocus={() => handleFocus(index)}
          keyboardType="number-pad"
          maxLength={6}
          style={[styles.otpInput, error && styles.inputError]}
          autoFocus={index === otpIndex}
        />
      ))}
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}>
        {loading?<ActivityIndicator color='white'/>:<Text style={styles.buttonText}>Verify Code</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={{alignSelf:'center'}} onPress={handleResendOtp} disabled={timeLeft > 0}>
      <Text style={styles.termsText}>
        Haven't get a email yet ?  
        <Text style={styles.linkText}> {timeLeft > 0 ? `Resend OTP in ${timeLeft}s` : 'Resend OTP'}</Text>
      </Text>
      </TouchableOpacity>
    </View>
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    backgroundColor: '#121212',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerImage: {
    width: 289,
    height: 306,
    alignSelf: 'center',
    backgroundColor:'#121212',
    // marginBottom: 20,
    // marginLeft: -20,
  },
  logo: {
  width:58,
  height: 25,
  marginTop:10,
  marginLeft:25,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: -0.5,
    color: '#fff',
    alignSelf:'flex-start',
  },
  subtitle: {
   fontSize: 16,
    color: '#989898'   ,//'#6e6e6e',
    marginBottom: 40,
    marginTop:8,
    //fontWeight: 600,
    lineHeight: 25,
    letterSpacing: -0.5,
    alignSelf:'flex-start',
  },
  label:{
    fontSize: 16,
    color: '#2A2A2A',
    marginBottom: 10,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: -0.5,
    alignSelf:'flex-start',
  },
  input: {
    width: '100%',
    backgroundColor:'transparent',
    color:'#ccc',
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
  },
  button: {
    width: '50%',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F7CE45',
    alignItems: 'center',
    marginBottom: 25,
    alignSelf: 'center',
  },
  buttonText: {
    // color: '#fff',
    fontWeight:'600',
    // letterSpacing:3,
    fontSize: 16,
  },
  termsText: {
    fontSize: 14,
     color: '#ddd',  //'#333',
    fontWeight:'500'
  },
  linkText: {
    color: '#F3BB00',
    borderBottomWidth: 1,
    borderBottomColor: 'black',
    fontWeight:'500'
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
    alignSelf: 'flex-end',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    textAlign: 'center',
    width: 40,
    height: 40,
    marginHorizontal:8,
    color: '#fff'
  },
  inputError: {
    borderColor: 'red',
  },
});
