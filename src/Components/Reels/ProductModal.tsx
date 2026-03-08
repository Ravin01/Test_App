import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
import {AWS_CDN_URL} from '../../Utils/aws';
import axiosInstance from '../../Utils/Api';
import {Toast} from '../../Utils/dateUtils';
import { close } from '../../assets/assets';

const ProductModal = ({
  visible,
  onClose,
  product,
  onPay,
  quantity = 1,
  sourceType = 'static',
  sourceId = '',
  addressId = '',
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const [loading, setloading] = useState(false);
  useEffect(() => {
    if (!visible) {
      setSecondsRemaining(120);
      return;
    }

    if (secondsRemaining === 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev === 1) clearInterval(timer);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, secondsRemaining]);

  // Convert seconds to MM:SS format
  const formatTime = () => {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };
  // console.log(addressId)
  const handlePayNow = async () => {
    try {
      // console.log({
      //   sourceType: sourceType, // enum: ['static', 'shoppable_video', 'livestream', 'auction']
      //   sourceRefId:sourceId, // (Optional) ID of the source video, show, etc.
      //   products: [
      //     {
      //       productId: product,
      //       quantity: quantity,
      //     },
      //   ],
      //   paymentMethod: 'UPI', // enum: ['CARD', 'UPI', 'NETBANKING', 'WALLET', 'COD']
      //   addressId: addressId,
      // })
      setloading(true);
      const response = await axiosInstance.post(`/order/place-order`, {
        sourceType: sourceType, // enum: ['static', 'shoppable_video', 'livestream', 'auction']
        sourceRefId: sourceId, // (Optional) ID of the source video, show, etc.
        products: [
          {
            productId: product?._id,
            quantity: quantity,
          },
        ],
        paymentMethod: 'UPI', // enum: ['CARD', 'UPI', 'NETBANKING', 'WALLET', 'COD']
        addressId: addressId,
      });
      onPay();
      // console.log(response)
      // Toast(response?.data?.message);
    } catch (error) {
      console.log('while make order', error?.response?.data?.error);
      Toast(error?.response?.data?.error);
    } finally {
      setloading(false);
    }
  };
  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
   
        <LinearGradient
          colors={['#FAFAFA4D', '#1F1F1F00']}
          start={{x: 0.25, y: 0.0}}
          end={{x: 1, y: 1}}
          style={{borderRadius:20}}>
          <View style={styles.modal}>
            {/* Blur Background */}
            {/* <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={10}
            reducedTransparencyFallbackColor="white"
          /> */}
          <BlurView
  style={styles.blurContainer}
  blurType="dark" // or 'dark', 'xlight', etc.
  blurAmount={30}
  reducedTransparencyFallbackColor="white"
/>
            <TouchableOpacity onPress={onClose}>
              <Image
                source={{uri:close}}
                style={{
                  marginLeft: '94%',
                  marginBottom: 12,
                  width: 20,
                  height: 20,
                }}
              />
            </TouchableOpacity>
            <View style={styles.header}>
                <Image
                  source={{
                    uri: product?.images?.[0]?.key
                      ? `${AWS_CDN_URL}${product.images[0].key}`
                      : '',
                  }}
                  style={styles.thumbnail}
                />
             
              <View style={styles.titleWrapper}>
                <Text style={styles.title} numberOfLines={2}>
                  {product?.title}
                </Text>
                {/* <Text style={styles.title}>Lino Perros Women's Floral Embossed Print Handbag</Text> */}
              </View>
            </View>

            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>⏳ {formatTime()} left</Text>
            </View>

            <Text style={styles.price}>
              ₹ {Number(product?.productPrice) * quantity}
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.payNowBtn}
                onPress={handlePayNow}
                disabled={true} >
                <LinearGradient
                  colors={['#AC8201', '#FFC100']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.gradientBtn}>
                  <Text style={styles.payNowText}>Pay now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

export default ProductModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
   blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: 320,

    height: 285,
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
    borderColor:'#333'
    // borderColor: 'rgba(255, 255, 255, 0.3)',
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
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.26, // equivalent to #FAFAFA42-ish
    shadowRadius: 8,

    // Android shadow
    elevation: 5,

    backgroundColor: '#fff', // required on iOS for shadows to show
  },

  titleWrapper: {
    // mimic: box-shadow: 0px 1px 2px 0px #00000040;
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.25, // ~ #00000040
    shadowRadius: 2,
    elevation: 2, // Android shadow
    // backgroundColor: 'transparent', // needed for iOS shadows to render properly
  },

  title: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 14,
    color: '#fafafa', //'#222',
    // backgroundColor: '#00000040'

    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
  timerContainer: {
    backgroundColor: '#2c2c2c',
    alignSelf: 'center', //'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 10,
  },
  timerText: {
    color: '#ff4e4e',
    fontWeight: '600',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff', //'#222',
    textAlign: 'center',
    marginBottom: 20,

    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
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
  payNowBtn: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 16,
    opacity:0.4,
    overflow: 'hidden',
    elevation: 4, // Android shadow
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
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

    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
  payNowText: {
    color: '#fff',
    fontWeight: '600',

    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
});
