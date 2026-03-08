import React, {useState, useEffect, useRef, useContext} from 'react';
import {
  Image,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import {AWS_CDN_URL} from '../../Utils/aws';
import {useNavigation} from '@react-navigation/native';
import {AuthContext} from '../../Context/AuthContext';
import {colors} from '../../Utils/Colors';
import {ActivityIndicator} from 'react-native-paper';

const Checkout = ({
  isOpen,
  setIsOpen,
  product = {}, // Default to empty object
  isProcessing = false,
  deliveryDetails = null,
  deliveryLoading = null,
  counter = 1,
  setCounter,
  availableStock = 0,
  onPlaceOrder,
}) => {
  const refRBSheet = useRef();
  const {selectedAddress} = useContext(AuthContext);
  const navigation = useNavigation();

  const handleQuantityChange = delta => {
    if (delta == -1) {
      if (counter == 1) return;
      setCounter(prev => Math.max(1, prev + delta));
    } else {
      if (counter + 1 <= availableStock)
        setCounter(prev => Math.max(1, prev + delta));
    }
  };

  const handleConfirm = () => {
    onPlaceOrder();
    // setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      refRBSheet.current.open();
    } else {
      refRBSheet.current.close();
    }
  }, [isOpen]);

  // Calculate order details
  const gstRate = product?.gstRate || 0;
  const mrpPrice = product?.MRP || product?.productPrice || 0;
  const productPrice = product?.productPrice || 0;

  const subtotal = productPrice * counter;
  const gstAmount = (subtotal * gstRate) / 100;
  const shippingFee = deliveryDetails?.charge || 0;
  const totalAmount = subtotal + shippingFee;
  // console.log(flashSale,"flafpsap")
  const mrpTotal = mrpPrice * counter;
  const savings = mrpTotal - subtotal;

  // Ensure disabled is always a boolean
  const isButtonDisabled =
    deliveryLoading === 'loading' || Boolean(isProcessing);

  return (
    <RBSheet
      ref={refRBSheet}
      height={580}
      closeOnDragDown
      draggable={true}
      // dragOnContent
      onClose={() => setIsOpen(false)}
      closeOnPressMask
      customStyles={{
        container: {
          backgroundColor: '#222',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 16,
        },
        draggableIcon: {
          backgroundColor: colors.primaryButtonColor,
          width: 60,
          height: 3,
        },
      }}>
      <ScrollView
        style={{flex: 1}}
        scrollEnabled
        showsVerticalScrollIndicator={false}>
        {/* --- Step 1: Order Review --- */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle]}>Review Your Order</Text>
        
          <View style={styles.productRow}>
            <Image
              source={{
                uri: product?.images?.[0]?.key
                  ? `${AWS_CDN_URL}${product?.images[0]?.key}`
                  : 'https://via.placeholder.com/80x80/444/444',
              }}
              style={styles.productImage}
            />
            <View style={{flex: 1, flexDirection: 'column'}}>
              <Text style={styles.productName} numberOfLines={2}>
                {product?.title}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPriceText}>₹{productPrice}</Text>
                {mrpPrice > productPrice && (
                  <Text style={styles.mrpText}>₹{mrpPrice}</Text>
                )}
              </View>
            </View>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                onPress={() => handleQuantityChange(-1)}
                style={styles.qtyButton}>
                <Text style={styles.qtyButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantity}>{counter}</Text>
              <TouchableOpacity
                onPress={() => handleQuantityChange(1)}
                style={styles.qtyButton}>
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* --- Step 2: Address Selection --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text
            style={{
              fontSize: 13,
              color: '#ddd',
              lineHeight: 18,
            }}>
            {selectedAddress?.line1}
            {selectedAddress?.line2 && `\n${selectedAddress?.line2}`}
            {`\n${selectedAddress?.city}, ${selectedAddress?.state} ${selectedAddress?.pincode}`}
          </Text>
          <TouchableOpacity
            style={styles.addEditButton}
            onPress={() => {
              setIsOpen(false);
              navigation.navigate('EditAddressScreen');
            }}>
            <Text style={styles.addEditButtonText}>Edit Address</Text>
          </TouchableOpacity>
        </View>

        {/* --- Step 3: Order Summary with Enhanced Details --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          <View style={styles.summaryContainer}>
            {/* Price Breakdown */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Price ({counter} {counter > 1 ? 'items' : 'item'})
              </Text>
              <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Charge</Text>
              <Text
                style={[
                  styles.summaryValue,
                  shippingFee === 0 && styles.freeText,
                ]}>
                {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toFixed(2)}`}
              </Text>
            </View>

            {gstRate > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  GST ({gstRate}%) included
                </Text>
                <Text style={styles.summaryValue}>₹{gstAmount.toFixed(2)}</Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Total Amount */}
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>

            {/* Savings Badge */}
            {savings > 0 && (
              <View style={styles.savingsContainer}>
                <Text style={styles.savingsText}>
                  🎉 You save ₹{savings.toFixed(2)} on this order!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* --- Confirm Button --- */}
        <TouchableOpacity
          style={[styles.confirmButton, isButtonDisabled && {opacity: 0.4}]}
          onPress={handleConfirm}
          disabled={isButtonDisabled}>
          {deliveryLoading == 'loading' || isProcessing ? (
            <ActivityIndicator
              color={colors.primaryButtonColor}
              size={'small'}
            />
          ) : (
            <Text style={styles.confirmButtonText}>Proceed to Payment</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </RBSheet>
  );
};

const styles = StyleSheet.create({
  section: {marginBottom: 16},
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 12,
    color: '#fff',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productPriceText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryButtonColor,
  },
  mrpText: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: colors.primaryButtonColor,
    borderRadius: 5,
  },
  qtyButtonText: {
    color: colors.primaryButtonColor,
    fontWeight: 'bold',
    fontSize: 16,
  },
  quantity: {
    marginHorizontal: 10,
    fontSize: 16,
    color: colors.primaryButtonColor,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  addressItem: {
    padding: 10,
    borderWidth: 1,
    borderColor: colors.primaryButtonColor,
    borderRadius: 5,
    marginBottom: 10,
  },
  selectedAddress: {
    borderColor: colors.primaryButtonColor,
    backgroundColor: '#333333',
  },
  text: {
    color: colors.primaryButtonColor,
  },
  addEditButton: {
    padding: 12,
    backgroundColor: '#333333',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  addEditButtonText: {
    color: colors.primaryButtonColor,
    fontWeight: 'bold',
  },
  confirmButton: {
    padding: 14,
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    resizeMode: 'cover',
  },

  // Order Summary Styles
  summaryContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#bbb',
    fontWeight: '400',
  },
  summaryValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  freeText: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#444',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    color: colors.primaryButtonColor,
    fontWeight: '700',
  },
  savingsContainer: {
    backgroundColor: '#1a4d2e',
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  savingsText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Checkout;
