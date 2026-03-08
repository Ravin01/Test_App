import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  ToastAndroid,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { AWS_CDN_URL } from '../../../Utils/aws';
import { close } from '../../../assets/assets';

const UpdateStockModal = ({ visible, onClose, product, onSubmit }) => {
  const [stockInput, setStockInput] = useState('');
  
  // console.log('modal product', product);

  useEffect(() => {
    if (product?.stock) {
      setStockInput(product.stock.toString());
    } else {
      setStockInput('');
    }
  }, [product]);

  const handleSave = () => {
    if(!stockInput){
      ToastAndroid.show("Please enter the valid Stock. ",ToastAndroid.SHORT)
      return}
    onSubmit(stockInput);
    setStockInput('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={20}
            reducedTransparencyFallbackColor="white"
          />

          {/* Close Icon */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Image
              source={{uri:close}}
              style={styles.closeIcon}
            />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.headerText}>Update Stock</Text>

          {/* Product Info */}
          <View style={styles.productRow}>
            <Image
              source={
                product?.images?.length
                  ? { uri: `${AWS_CDN_URL}${product.images[0].key}` }
                  :null
              }
              style={styles.productImage}
            />
            <View>
              <Text style={styles.productTitle} numberOfLines={1}>
                {product?.title || 'No product Name'}
              </Text>
              <Text style={styles.productCategory}>{product?.category} • {product?.subcategory}</Text>
              <Text style={styles.productStock}>Stock : {product?.quantity ?? 0}</Text>
            </View>
          </View>

          <Text style={styles.label}>Enter number of stock</Text>
          {/* Input */}
          <TextInput
            placeholder="Enter the number"
            placeholderTextColor="#ccc"
            keyboardType="number-pad"
            value={stockInput}
            onChangeText={(text) => {
              // Only allow whole numbers (integers) - remove any non-digit characters
              const sanitized = text.replace(/[^0-9]/g, '');
              setStockInput(sanitized);
            }}
            style={styles.input}
          />

          {/* Submit Button */}
          <TouchableOpacity onPress={handleSave} style={styles.button}>
            <LinearGradient
              colors={['#AC8201', '#FFC100']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Text style={styles.buttonText}>Enter</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default UpdateStockModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 320,
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
  },
  closeIcon: {
    width: 20,
    height: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFC100',
    marginBottom: 20,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#fff',
  },
  productTitle: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productCategory: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 2,
  },
  productStock: {
    color: '#fff',
    fontSize: 13,
    marginTop: 4,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    backgroundColor: 'rgba(43, 43, 43, 0.7)',
    marginBottom: 40,
  },
  button: {
    width: '60%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  gradient: {
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  label: {
	color: '#fafafa',
    fontSize: 16,
    fontWeight: '500',
	alignSelf: 'flex-start',
	marginBottom: 4
  }
});
