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
import {ActivityIndicator} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import api from '../../Utils/Api';
import { groupImg } from '../../assets/assets';


export default function Verify() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setloading] = useState(false);
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
    
    const emailError = validateEmail(email);
    if (emailError) {
     setEmailError(emailError);
     console.log(emailError);
     return;
    }
    setEmailError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        emailId: email,
      });
       console.log(response.data);
      ToastAndroid.show('OTP sent to your email!', ToastAndroid.SHORT);
      console.log(email);
      Navigation.navigate('OTPScreen', {email: email});
    } catch (error) {
      const message = error.response?.data?.message || 'Something went wrong. Please try again';
      ToastAndroid.show(message, ToastAndroid.SHORT);
      console.log('Error', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
    style={styles.flex}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
  >
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

   <Image
        source={{uri:groupImg}} 
        style={styles.headerImage}
        resizeMode='cover'
      />
    <View style={{marginHorizontal: 20, marginTop: 30}}>
     
      <Text style={styles.title}>Verification</Text>
      <Text style={styles.subtitle}>
      Please enter your email to verify 
      </Text>

      <Text style={styles.label}>
       Your Email
      </Text>

      <TextInput
        style={[styles.input, emailError ? {borderColor: 'red'} : null]}
        placeholder="Enter your e-mail"
        placeholderTextColor={'#ccc'}
        value={email}
        onChangeText={text => {
          setEmail(text);
        //  validateEmail(text);
        }}
        keyboardType="email-address"
      />
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

      
      <TouchableOpacity style={styles.button} onPress={handleSendOTP}>
        {loading?<ActivityIndicator color='white'/>:<Text style={styles.buttonText}>Reset Password</Text>}
      </TouchableOpacity>
    </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
},
  container: {
    backgroundColor: '#fff',
    padding: 0,
    flexGrow: 1,
},
  headerImage: {
 width: '100%',
    height: 300,
    backgroundColor:'#fff',
    // marginBottom: 20,
    //marginLeft: -20,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 20,
    letterSpacing: -0.5,
    color: '#1E1E1E',
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
    backgroundColor:'transparent',color:'black',
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
  },
  button: {
    width: '100%',
    // borderRadius: 25,
    padding: 15,
    backgroundColor: '#F7CE45',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    // color: '#fff',
    fontWeight:'600',
    letterSpacing:3,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
});
