/* eslint-disable quotes */
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
  Platform, Linking
} from 'react-native';
import {ActivityIndicator, Checkbox} from 'react-native-paper';
import Feather from 'react-native-vector-icons/Feather';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../Utils/Api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { flykupLogo } from '../../assets/assets';


export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  //const [phone ,setPhone] =useState('');
  //const [phoneError ,setPhoneError] =useState('');
  const [passwordError, setPasswordError] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const validateName = (name: string) => {
    if (!name) {
        setNameError('Name is required field');
      }  else {
        setNameError('');
        return true;
      }
  }
  
  // Email validation function
  const validateEmail = email => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) {
      setEmailError('Please enter a  email address');
    } else if (!regex.test(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
      return true;
    }
  }

  // Password validation function
  const validatePassword = password => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/; // At least 8 characters, 1 lowercase, 1 uppercase, and 1 special character
    if (!password) {
      setPasswordError('Password is required field');
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
    } else if (!regex.test(password)) {
      setPasswordError('Password must contain at least one uppercase, one lowercase, and one special character');
    } else {
      setPasswordError('');
      return true;
    }
  };

  // Confirm password validation
  const validateConfirmPassword = (confirmPassword: string) => {
    if (!confirmPassword) {
      setConfirmPasswordError('Please re-enter your password');
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
      return true;
    }
  };
 
  const validateForm = async () => {
  const isNameValid = validateName(name);
  const isEmailValid = validateEmail(email);
  const isPasswordValid = validatePassword(password);
  const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

  return (isNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid);
  }

    // Handle Submit Process
    // const handleSubmit = async () => {
    //     // Navigation.navigate('VerifyOtp', { email });
    //   const isFormValid = await validateForm();
      
    //   // console.log(isFormValid);
    //   if (!isFormValid) {
    //     ToastAndroid.show("Please fill in all the fields correctly.", ToastAndroid.SHORT);
    //     return;
    //   }
    //   setLoading(true);
    //   try {
    //     // console.log({
    //     //   name: name,
    //     //   emailId: email,
    //     //   password: password,
    //     //   mobileNumber: phone,
    //     // });
    //     const response = await api.post('/auth/signup', {
    //       name: name,
    //       emailId: email,
    //       password: password,
    //       mobileNumber: phone
    //     });
    //     Navigation.navigate('VerifyOtp', { email });
        
    //           ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
    //   } catch (error) {
    //     const message = error.response?.data?.message || 'Something went wrong. Please try again.';
    //     ToastAndroid.show(message, ToastAndroid.SHORT);
    //     console.log("Error creating user", error);
    //   } finally {
    //     setLoading(false);
    //   }
    // };

const handleSubmit = async () => {
  const isFormValid = await validateForm();
  
  if (!isFormValid) {
    ToastAndroid.show("Please fill in all the fields correctly.", ToastAndroid.SHORT);
    return;
  }

  setLoading(true);
  try {
    const response = await api.post('/auth/signup', {
      name,
      emailId: email,
      password,
    });

    console.log("RESPONSE ",response.data)
    // Show success message before navigating
    ToastAndroid.show(response.data.message || "Signup successful!", ToastAndroid.SHORT);

    // Navigate correctly
    navigation.navigate('VerifyOtp', { email:email });

  } catch (error) {
    let message = "Something went wrong. Please try again.";
    if (error.response?.data?.message) {
      message = error.response.data.message;
    }
    ToastAndroid.show(message, ToastAndroid.SHORT);
    console.log("Error creating user", error.response.data);
  } finally {
    setLoading(false);
  }
};


  return (
      <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView  keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:20}}>

  <View style={{width: '100%', height: 55, backgroundColor: '#f7ce45', marginBottom: 40,
        alignItem: 'center', justifyContent: 'center'
      }}>
        <Text style= {{alignSelf: 'center', fontSize: 20,fontWeight: '500', lineHeight: 20}}>Sign Up</Text>
  </View>



   <Image
        source={{uri:flykupLogo}} 
        style={styles.headerImage}
        resizeMode='cover'
      />
    
     
    <View style={{marginHorizontal: 20}}>
      <Text style={styles.title}>SIGN UP</Text>
      {/* <Text style={styles.subtitle}>
        Register or sign in and we'll get started.
      </Text> */}

        <TextInput
          style={[styles.input, nameError ? {borderColor: 'red'} : null]}
          placeholder="Full Name"
          value={name}
          onChangeText={text => {
            setName(text);
            validateName(text);
          }}
          placeholderTextColor={"#ccc"}
        />
        {nameError && <Text style={styles.errorText}>{nameError}</Text>}

    {/* <TextInput
    style={[styles.input, phoneError ? {borderColor: 'red'} : null]}
    placeholder="Mobile Number"
    placeholderTextColor="#ccc"
    value={phone}
    onChangeText={text => {
    setPhone(text);
    validatePhoneNumber(text);
     }}
      keyboardType="phone-pad"
    />
     {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null} */}


      <TextInput
        style={[styles.input, emailError ? {borderColor: 'red'} : null]}
        placeholder="Enter email"
        placeholderTextColor={'#ccc'}
        value={email}
        onChangeText={text => {
          setEmail(text.toLowerCase());
          // validateEmail(text);
        }}
        keyboardType="email-address"
      />
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

      <View
        style={[
          styles.passwordContainer,
          passwordError ? {borderColor: 'red'} : null,
        ]}>
        <TextInput
          style={{marginLeft: 1,backgroundColor:'transparent',color:'#fff'}}
          placeholder="Enter strong password"
          placeholderTextColor={'#ccc'}
          autoComplete="off"
          autoCorrect={false}
          value={password}
          onChangeText={text => {
            setPassword(text);
            validatePassword(text);
          }}
          secureTextEntry={!isPasswordVisible}
        />
        <TouchableOpacity
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          style={styles.eyeIcon}>
          <Feather name={isPasswordVisible ? 'eye' : 'eye-off'} size={23} color={'#ddd'} />
        </TouchableOpacity>
      </View>
      {passwordError ? (
        <Text style={styles.errorText}>{passwordError}</Text>
      ) : null}


            {/* Confirm Password */}
            <View style={[styles.passwordContainer, confirmPasswordError ? { borderColor: 'red' } : null]}>
              <TextInput
                style={{ marginLeft: 1, backgroundColor: 'transparent', color: '#fff' }}
                placeholder="Re-enter password"
                placeholderTextColor={'#ccc'}
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  validateConfirmPassword(text);
                }}
                secureTextEntry={!isConfirmPasswordVisible}
              />
              <TouchableOpacity
                onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                style={styles.eyeIcon}>
                <Feather name={isConfirmPasswordVisible ? 'eye' : 'eye-off'} size={23} color={'#ddd'} />
              </TouchableOpacity>
            </View>
            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}


      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        {loading?<ActivityIndicator color='white'/>:<Text style={styles.buttonText}>SIGN UP</Text>}
      </TouchableOpacity>

      <View
        style={[
          styles.row,
          {
            marginBottom: 30,
            marginTop: 0,
            flexWrap: 'wrap',
            justifyContent: 'center',
          },
        ]}>
        <Text style={styles.termsText}>
          By Signing up, you agree to Flykup's
        </Text>
        <View style={styles.row}>
          <TouchableOpacity
            //onPress={() => navigation.navigate('termsScreen')}
           // onPress={() => Linking.openURL('https://flykup.live/terms-of-service')}
            onPress={() => navigation.navigate('WebViewScreen', {
              url: 'https://flykup.live/terms-of-service',
              title: 'Terms and Conditions'
            })}
            >
            <Text style={[styles.termsText, {color: '#F7CE45'}]}>
              Terms
            </Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>and</Text>

          <TouchableOpacity
            //onPress={() => navigation.navigate('privacyPolicy')}
            //onPress={() => Linking.openURL('https://flykup.live/privacy-policy')}
            onPress={() => navigation.navigate('WebViewScreen', {
              url: 'https://flykup.live/privacy-policy',
              title: 'Privacy Policy'
            })}
            >
            <Text style={[styles.termsText, {color: '#F7CE45'}]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* <View style={{flex:1}}/> */}
      <TouchableOpacity style={{marginTop: 14, alignSelf: 'center'}} onPress={() => navigation.navigate('Login')}>
      <Text style={styles.termsText}>
      Already have an Account ?  
        <Text style={styles.linkText}> Sign In</Text>
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
        padding: 0,
        flexGrow: 1,
  },
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     padding: 20,
//   },
  headerImage: {
    width: 277,
    height: 119,
    backgroundColor:'#121212',
    alignSelf: 'center',
    // marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fafafa',
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 25,
  },
  subtitle: {
    fontSize: 14,
    color: '#6e6e6e',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor:'transparent',color:'#fff',
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
  },
  passwordContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 3,
    // alignItems:'center',
    // position: 'relative',
    borderRadius: 10,
    marginBottom:10
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 10,

    color: '#aaa',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    // marginBottom: 20,
  },
  rememberMeText: {
    fontSize: 14,
    color: '#6e6e6e',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#F3BB00',
  },
  button: {
    width: '100%',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F7CE45',
    alignItems: 'center',
    marginBottom: '10%',  //'30%',
    marginTop: 20,
  },
  buttonText: {
    // color: '#fff',
    fontWeight:'600',
    letterSpacing:3,
    fontSize: 16,
  },
  socialMediaText: {
    fontSize: 14,
    color: '#6e6e6e',
    marginVertical: 10,
  },
  socialButtonsContainer: {
    // flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    // width: '50%',
    
    marginBottom: 20,
    marginTop: 10,
  },
  socialButton: {
    // width: 50,
    flexDirection:'row',
    justifyContent:'space-between',
    borderWidth:1,
    borderColor:'#fff',
    marginBottom:10,
    elevation:2,
    gap:10,
    paddingHorizontal:10,
    backgroundColor:'#fff',
    padding: 7,
    alignItems: 'center',
    borderRadius: 35,
  },
  termsText: {
    fontSize: 14,
    color: '#ccc',
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
  },
  row: {
    flexDirection: 'row',
    marginTop: 0,
    gap: 5,
    maxWidth: '100%',
    alignItems: 'center',
    alignSelf: 'center',
    marginHorizontal: 20,
  },
});
