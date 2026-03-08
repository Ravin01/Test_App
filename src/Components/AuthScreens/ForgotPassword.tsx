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
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {ActivityIndicator, Checkbox} from 'react-native-paper';
import AntDesign from 'react-native-vector-icons/AntDesign';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../Utils/Api';
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgotIndexImg } from '../../assets/assets';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
 // const [otpIndex, setOtpIndex] = useState(0);
 // const [timeLeft, setTimeLeft] = useState(0);

  const Navigation = useNavigation();

  const validateEmail = email => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) {
      return 'Please enter an email address';
    } else if (!regex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };  

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
      await api.post('/auth/forgot-password', {
        emailId: email,
      });
      // console.log(response);
      ToastAndroid.show('OTP sent to your email!', ToastAndroid.SHORT);
      // console.log(email);
      Navigation.navigate('OTPScreen', {email: email});
    } catch (error) {
      const message = error.response?.data?.message || 'Something went wrong. Please try again';
      if(message.includes('User not found')){
        setEmailError('Email Id not associated with any account. Please check your email address.');
      }
      ToastAndroid.show(message, ToastAndroid.SHORT);
      // console.log('Error', error.response);
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
      <ScrollView showsVerticalScrollIndicator={false}  keyboardShouldPersistTaps="handled">

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


   <Image
        source={{uri:forgotIndexImg}} 
        style={styles.headerImage}
        resizeMode='cover'
      />
    <View style={{marginHorizontal: 20, marginTop: 30}}>
     
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>
        Please enter your email to reset password
      </Text>

      {/* <Text style={styles.label}>
       Your Email
      </Text> */}

      <TextInput
        style={[styles.input, emailError ? {borderColor: 'red'} : null]}
        placeholder="Enter your e-mail"
        placeholderTextColor={'#ccc'}
        value={email}
        onChangeText={text => {
          setEmail(text.toLowerCase());
          // validateEmail(text.toLowerCase());
        }}
        keyboardType="email-address"
      />
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

      
      <TouchableOpacity style={styles.button} onPress={handleSendOTP}>
        {loading?<ActivityIndicator color='white'/>:<Text style={styles.buttonText}>Next</Text>}
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
  // container: {
  //   flex: 1,
  //   backgroundColor: '#fff',
  //   alignItems: 'center',
  //   padding: 20,
  // }
  headerImage: {
    width: '190',
   // width: 414,
    height: 212,
    backgroundColor:'#121212',
    // marginBottom: 20,
    //marginLeft: -20,
    alignSelf: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 20,
    letterSpacing: -0.5,
    color: '#fff',
    alignSelf:'flex-start',
  },
  subtitle: {
    fontSize: 16,
    color: '#989898'   ,//'#6e6e6e',
    marginBottom: 30,
    marginTop:8,
    fontWeight: 600,
    lineHeight: 20,
    letterSpacing: -0.5,
    alignSelf:'flex-start',
  },
  label:{
    fontSize: 16,
    color: '#2A2A2A',
    marginBottom: 10,
    fontWeight: 600,
    lineHeight: 20,
    letterSpacing: -0.5,
    alignSelf:'flex-start',
  },
  input: {
    width: '100%',
    backgroundColor:'transparent',color:'#ccc',
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },
  button: {
    width: '100%',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F7CE45',
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonText: {
    // color: '#fff',
    fontWeight:'600',
    // letterSpacing:3,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  backButton: {
    padding: 5,
    marginTop: 8
  },
});
