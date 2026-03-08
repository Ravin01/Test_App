import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import SegmentedLoader from './SegmentedLoader';
import { close } from '../../assets/assets';

const SuccessModal = ({ visible, onClose, onPaymentSuccess }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bioMetricSuccess, setBioMetricSuccess] = useState(false);
  const [bioMetricFailed, setBioMetricFailed] = useState(false);

const handleBiometricSuccess = () => {
  setBioMetricSuccess(true);
 // setBioMetricFailed(true);
  // Delay showing confirmation by 1 second
  setTimeout(() => {
    setShowConfirmation(true);
    onPaymentSuccess?.(); // Notify parent
  }, 1000);

};


  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={10}
            reducedTransparencyFallbackColor="white"
          />
          <TouchableOpacity style= {{position:'absolute', top: 10, right: 10}} onPress={() => {
            setBioMetricSuccess(false);
            setBioMetricFailed(false);
            setShowConfirmation(false);
            onClose();
          }}>
            <Image
              source={{uri:close}}
              style={{
                marginLeft: '94%',
                marginBottom: '5%',
                width: 20,
                height: 20,
              }}
            />
          </TouchableOpacity>
          <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 14 }}>
            {showConfirmation ? (
              <>
                <Image
                  // source={require('../../assets/images/payment_Success.png')}
                  // https://d2jp9e7w3mhbvf.cloudfront.net/assets/images/ba7c4fee-7c24-431f-b54d-ec9ef07f0fff_payment_Success.png
                  style={styles.Image}
                />
                <Text style={styles.price}>Payment Successful!</Text>
                <Text style={styles.subText}>Your order has been placed.</Text>
                <Text style={styles.subText}>You can now track your order in the Order section!</Text>
                <TouchableOpacity style={{marginTop: 20, backgroundColor: '#F7CE45',  paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 42, alignSelf: 'center'}}>
                  <Text style={{color:'#000'}}>Track Order</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Pressable onPress={handleBiometricSuccess} onLongPress={handleBiometricSuccess} delayLongPress={500} style={{ alignItems: 'center' }}>
                <MaterialIcons name="fingerprint" size={100} color={bioMetricSuccess?'green':bioMetricFailed?'red':'orange'}/>
                <Text style={styles.price}>Fingerprint {bioMetricSuccess?'Verified':bioMetricFailed?'not verified':'verification'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SuccessModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: 307,
    height:  350,   //285,
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  Image: {
    width: 121,
    height: 121,
    alignSelf: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff', //'#222',
    textAlign: 'center',
    marginTop: 20,
	textShadowColor: 'rgba(0, 0, 0, 0.8)',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 4,
  },
  subText:{
    color:'#ffffff',
    fontSize: 14,
    textAlign: 'center'
  },
});
