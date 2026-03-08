import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ToastAndroid,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import {ActivityIndicator} from 'react-native-paper';
import AntDesign from 'react-native-vector-icons/AntDesign';
import {useNavigation} from '@react-navigation/native';
import api from '../../Utils/Api';
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from 'react-native-safe-area-context';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';


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

export default function ConfirmPassword({route}) {
  const {email} = route.params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const Navigation = useNavigation();

  const handleResetPassword = async() => {
    
      // Navigation.navigate('ResetSuccess');
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword);

    if (passwordError) {
      setErrors(prevErrors => ({...prevErrors, newPassword: passwordError}));
      return;
    }
    if (confirmPasswordError) {
      setErrors(prevErrors => ({
        ...prevErrors,
        confirmPassword: confirmPasswordError,
      }));
      return;
    }
    setLoading(true);
    try {
       await api.post(`/auth/reset-password`, {
        emailId: email,
        confirmPassword:confirmPassword,
        newPassword: password
      });
      ToastAndroid.show('Password changed Successfully. ', ToastAndroid.SHORT);
      Navigation.navigate('ResetSuccess');
    } catch (error) {
      const message = error.response?.data?.message || 'Password Reset failed. Please try again later.';
      ToastAndroid.show(message, ToastAndroid.SHORT);
      console.log('Error while resetting new password', error);
    } finally {
      setLoading(false);
    } 
  };

  const validatePassword = password => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{6,}$/; // At least 1 lowercase, 1 uppercase, and 1 special character
    if (!password) {
      return 'Password is required field';
    }
    else if (!regex.test(password)) {
      return 'Password must contain at least one uppercase, one lowercase, and one special character.';
    }
    return '';
  };

  const validateConfirmPassword = confirmPassword => {
    if (confirmPassword !== password) {
      return 'Password mismatch';
    }
    return '';
  };

  const handleNewPasswordChange = newPassword => {
    setPassword(newPassword);
    setErrors(prevErrors => ({
      ...prevErrors,
      newPassword: validatePassword(newPassword),
    }));
  };

  const handleConfirmPasswordChange = confirmPassword => {
    setConfirmPassword(confirmPassword);
    setErrors(prevErrors => ({
      ...prevErrors,
      confirmPassword: validateConfirmPassword(confirmPassword),
    }));
  };


  // const handleConfirmPassword =  () => {
  //   if (!password || !confirmPassword) {
  //     ToastAndroid.show('Please set and confirm password', ToastAndroid.SHORT);
  //     return;
  //   }
  //   if (password !== confirmPassword) {
  //     setConfirmPasswordError('Password mismatch');
  //     ToastAndroid.show('Password mismatch', ToastAndroid.SHORT);
  //     return;
  //   }
  //   Navigation.navigate('ConfirmReset');
  // };

  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView  keyboardShouldPersistTaps="handled">
       
       <View style={{flexDirection: 'row', width: '100%', height: 55, backgroundColor: '#f7ce45', marginBottom: 40,
        alignItem: 'center', justifyContent: 'space-between'
      }}>
        <TouchableOpacity
          onPress={()=>Navigation.goBack()}
          style={styles.backButton}>
          <MaterialIcon name="arrow-back-ios-new" size={23} color={'black'} />
        </TouchableOpacity>
        <Text style= {{alignSelf: 'center', fontSize: 20,fontWeight: '500', lineHeight: 20}}>Forgot Password</Text>
       <TouchableOpacity style={styles.headerButton}>
          <MaterialIcon name="more-vert" size={24} color={'#f7ce45'} />
        </TouchableOpacity>
       </View>

        <View style={{marginHorizontal: 20}}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>
          Create a new password. Ensure it differs from previous ones for security
        </Text>

        {/* Password Field */}
       
        <View style={[styles.passwordContainer, errors?.newPassword ? {borderColor: 'red'} : null]}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your new password"
            placeholderTextColor={'#ccc'}
            secureTextEntry={!isPasswordVisible}
            value={password}
            onChangeText={handleNewPasswordChange}
          />
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <AntDesign name={isPasswordVisible ? 'eye' : 'eyeo'} size={25} color={'#ddd'}/>
          </TouchableOpacity>
        </View>
        {errors?.newPassword ? <Text style={styles.errorText}>{errors?.newPassword}</Text> : null}

        {/* Confirm Password */}
        
        <View style={[styles.passwordContainer, errors?.confirmPassword ? {borderColor: 'red'} : null]}>
          <TextInput
            style={styles.textInput}
            placeholder="Re-enter password"
            placeholderTextColor={'#ccc'}
            secureTextEntry={!isConfirmPasswordVisible}
            value={confirmPassword}
            onChangeText={handleConfirmPasswordChange}
          />
          <TouchableOpacity
            onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
            style={styles.eyeIcon}
          >
            <AntDesign name={isConfirmPasswordVisible ? 'eye' : 'eyeo'} size={25} color={'#ddd'}/>
          </TouchableOpacity>
        </View>
        {errors?.confirmPassword ? (
          <Text style={styles.errorText}>{errors?.confirmPassword}</Text>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
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
    flex:1,
    // padding: 0,
    // flexGrow: 1,
},
  headerImage: {
    width: '100%',
    height: 300,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: -0.5,
    color: '#fafafa',
    alignSelf: 'flex-start',
    marginTop: 40,
    paddingTop: 25
  },
  subtitle: {
    fontSize: 16,
    color: '#989898',
    marginBottom: 30,
    marginTop: 12,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: -0.5,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 16,
    color: '#2A2A2A',
    marginBottom: 10,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: -0.5,
    alignSelf: 'flex-start',
  },
  textInput: {
    marginLeft: 1,
    backgroundColor: 'transparent',
    color: 'black',
    padding: 12,
    width: '90%',
    color: '#fff'
  },
  passwordContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 3,
    borderRadius: 10,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 10,
    color: '#aaa',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#F7CE45',
    alignItems: 'center',
    marginVertical: 20,
    borderRadius: 5,
    marginBottom: 0,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
   backButton: {
    padding: 5,
    marginTop: 8
  },
});
