import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';


const VerifiedSellerModal = ({visible, onClose}) => {
  const navigation =useNavigation()
 

  const handleContinue = () => {
    // Alert.alert('Success', 'Verification completed successfully!');
    onClose(); // close modal after completion
    navigation.navigate('subscription')
  };
// console.log(visible)



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
         <View style={styles.contentContainer}>
            <Text style={styles.title}>
              Why become a{' '}
              <Text style={{color: '#F7CE45'}}>verified seller?</Text>{' '}
            </Text>
            <Text style={styles.description}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.
            </Text>
          </View>
            <View style={styles.bottomContainer}>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleContinue}>
                <Text style={styles.nextButtonText}>
                  {'Next'}
                </Text>
              </TouchableOpacity>

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

export default VerifiedSellerModal;
