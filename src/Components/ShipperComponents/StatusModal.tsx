import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';

const StatusModal = ({ visible, onClose, navigation }) => {


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
     
      <View style={styles.overlay}>
       
    
        <View style={styles.modal}>
           {/* Blur Background */}
        <BlurView
      style={StyleSheet.absoluteFill}
      blurType="dark"
      blurAmount={10}
      reducedTransparencyFallbackColor="white"
    />
        <TouchableOpacity onPress={onClose}>
        <Image source={require('../../assets/images/close.png')} style={{marginLeft:'96%',marginTop:6 ,marginBottom: 12,width: 20, height: 20}} />
        </TouchableOpacity>
          <View style={styles.header}>
            <View style={styles.titleWrapper}>
            <Text style={styles.title}>Application Under Review</Text>
            </View>
          </View>
          
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>⏳ Pending</Text>
          </View>

          <Text style={styles.message}>Your dropshipper application is being processed. We'll notify you once it's approved.</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.viewNowBtn} onPress={navigation}>
            <LinearGradient
             colors={['#AC8201', '#FFC100']}
             start={{ x: 0, y: 0 }}
             end={{ x: 1, y: 0 }}
             style={styles.gradientBtn}
            >
              <Text style={styles.payNowText}>View now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default StatusModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    //backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',    
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: 320,
    height: 280,
 //  backgroundColor:  'rgba(0,0,0,0.4)',    //'#fff',
    borderRadius: 20,
    padding: 16,
    paddingTop: 0,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.3,
    // shadowRadius: 10,
    // elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#00000054', // semi-transparent border
  
    // iOS shadow
    shadowColor: '#FAFAFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.26, // equivalent to #FAFAFA42-ish
    shadowRadius: 8,
  
    // Android shadow
    elevation: 5,
  
    backgroundColor: '#fff', // required on iOS for shadows to show
  },

  titleWrapper: {
    // mimic: box-shadow: 0px 1px 2px 0px #00000040;
    flex:1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25, // ~ #00000040
    shadowRadius: 2,
    elevation: 2, // Android shadow
   // backgroundColor: 'transparent', // needed for iOS shadows to render properly
  },
  
  message: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 14,
    color: '#fafafa',  //'#222',
   // backgroundColor: '#00000040'
  },
  timerContainer: {
    backgroundColor: '#2c2c2c',
    alignSelf: 'center',   //'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  timerText: {
    color: '#ff4e4e',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',   //'#222',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#75757587',

    //backgroundColor: '#d1d1d1',
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 8,
    alignItems: 'center',
  },
  viewNowBtn: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4, // Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  gradientBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },  
  cancelText: {
    color: '#FAFAFA',
    fontWeight: '600',
  },
  payNowText: {
    color: '#fff',
    fontWeight: '600',
  },
});
