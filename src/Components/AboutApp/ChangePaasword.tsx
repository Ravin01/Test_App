import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Platform,
  Dimensions,
  ToastAndroid,
} from 'react-native';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { AuthContext } from '../../Context/AuthContext';
import { AWS_CDN_URL } from '../../Utils/aws';
import axiosInstance from '../../Utils/Api';

const {height, width} = Dimensions.get('window');

// Move PasswordInput component outside the main component
const PasswordInput = ({ 
  placeholder, 
  value, 
  onChangeText, 
  showPassword, 
  toggleShowPassword 
}) => (
  <View style={styles.inputContainer}>
    <TextInput
      style={styles.textInput}
      placeholder={placeholder}
      placeholderTextColor="#888888"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!showPassword}
      autoCapitalize="none"
      autoCorrect={false}
    />
    <TouchableOpacity 
      style={styles.eyeIcon} 
      onPress={toggleShowPassword}
    >
      {showPassword ? (
        <EyeOff size={20} color="#FFC107" />
      ) : (
        <Eye size={20} color="#FFC107" />
      )}
    </TouchableOpacity>
  </View>
);

const ChangePasswordScreen = ({navigation}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const {user}:any = useContext(AuthContext);
  
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const handleSendOTP = async () => {
    
      // Navigation.navigate('OTPScreen', {email: email});
    const emailError = validateEmail(email);
    if (emailError) {
     setEmailError(emailError);
    //  console.log(emailError);
     return;
    }
    setEmailError('');
    setLoading(true);
          // Navigation.navigate('OTPScreen', {email: email});
          // return
    try {
      // https://flykup-cookie-be.vercel.app/api/
      await axiosInstance.post('/auth/forgot-password', {
        emailId: email,
      });
      // console.log(response);
      ToastAndroid.show('OTP sent to your email!', ToastAndroid.SHORT);
      // console.log(email);
      navigation.navigate('OTPScreen', {email: email});
    } catch (error) {
      const message = error.response?.data?.message || 'Something went wrong. Please try again';
      if(message.includes('User not found')){
        ToastAndroid.show('Email Id not associated with any account. Please check your email address.',ToastAndroid.SHORT);
      }
      ToastAndroid.show(message, ToastAndroid.SHORT);
      // console.log('Error', error.response);
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#F7CE45" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImage}>
              {user?.profileURL?.key ? (
                <Image 
                  style={styles.profileIcon}
                  source={{ uri: `${AWS_CDN_URL}${user.profileURL.key}` }}
                />
              ) : (
                <View style={styles.profileIcon}>
                  <Text style={styles.profileIconText}>👤</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.profileName}>{user?.name || 'n/f'}</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Current Password */}
          {/* <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Current Password</Text>
            <PasswordInput
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              showPassword={showCurrentPassword}
              toggleShowPassword={() => setShowCurrentPassword(!showCurrentPassword)}
            />
          </View> */}

          {/* New Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <PasswordInput
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              showPassword={showNewPassword}
              toggleShowPassword={() => setShowNewPassword(!showNewPassword)}
            />
          </View>

          {/* Confirm New Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Confirm New Password</Text>
            <PasswordInput
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              showPassword={showConfirmPassword}
              toggleShowPassword={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <View style={styles.requirementItem}>
              <View style={styles.checkIcon}>
                <Text style={styles.checkText}>✓</Text>
              </View>
              <Text style={styles.requirementText}>At least 8 characters</Text>
            </View>
            
            <View style={styles.requirementItem}>
              <View style={styles.checkIcon}>
                <Text style={styles.checkText}>✓</Text>
              </View>
              <Text style={styles.requirementText}>Contains a letter & one number</Text>
            </View>
            
            <View style={styles.requirementItem}>
              <View style={styles.checkIcon}>
                <Text style={styles.checkText}>✓</Text>
              </View>
              <Text style={styles.requirementText}>Special character</Text>
            </View>
          </View>

          {/* Change Password Button */}
          <TouchableOpacity style={styles.changePasswordButton}>
            <Text style={styles.changePasswordButtonText}>Change Password</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 SecureApp</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    marginTop: Platform.select({ ios: 10, android: height * 0.02 }),
    alignItems: 'center',
    gap: width * 0.10,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  profileImageContainer: {
    marginBottom: 12,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD54F',
  },
  profileIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF8F00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    fontSize: 24,
    color: '#ffffff',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  formSection: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  eyeIcon: {
    padding: 4,
  },
  requirementsContainer: {
    marginTop: 16,
    marginBottom: 30,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  requirementText: {
    fontSize: 14,
    color: '#ffffff',
  },
  changePasswordButton: {
    backgroundColor: '#FFC107',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 30,
  },
  changePasswordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#888888',
  },
});

export default ChangePasswordScreen;