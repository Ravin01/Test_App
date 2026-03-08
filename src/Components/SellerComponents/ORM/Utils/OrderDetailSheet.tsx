import React, {useRef, forwardRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
// import { MaterialIcons } from '@expo/vector-icons';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {AWS_CDN_URL} from '../../../../Utils/aws';
import {AlertOctagon} from 'lucide-react-native';
import OrderTimeline from '../../../MyActivity/Utils/OrderTimeline';

const StatusDisplay = ({status}) => {
  const statusColors = {
    ORDERED: 'orange',
    PACKED: 'blue',
    SHIPPED: 'purple',
    DELIVERED: 'green',
    CANCELLED: 'red',
  };

  return (
    <View
      style={[
        styles.statusBadge,
        {backgroundColor: statusColors[status] || 'gray'},
      ]}>
      <Text style={styles.statusText}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Text>
    </View>
  );
};

const AddressCard = ({title, address}) => {
  if (!address) return null;
  //   console.log(address)
  return (
    <View style={styles.addressCard}>
      <Text style={styles.addressTitle}>{title}</Text>
      <Text style={styles.addressText}>{address.name}</Text>
      <Text style={styles.addressText}>{address.addressLine1}</Text>
      {address.addressLine2 && (
        <Text style={styles.addressText}>{address.addressLine2}</Text>
      )}
      <Text style={styles.addressText}>
        {address.city}, {address.state} - {address.pincode}
      </Text>
      <Text style={styles.addressText}>Phone: {address.mobile}</Text>
    </View>
  );
};

const OrderDetailsBottomSheet = ({order, setIsOpen, onOpen}) => {
  const bottomSheetRef = useRef(null);
  useEffect(() => {
    if (onOpen) bottomSheetRef.current.open();
    else bottomSheetRef.current.close();
  }, [onOpen]);
  // console.log(onOpen,"orderadaa")
  const logisticsDetails = order?.logisticsDetails?.logisticsResponse?.data;
  // console.log(logisticsDetails)
  return (
    <RBSheet
      ref={bottomSheetRef}
      height={600}
      openDuration={250}
      onClose={() => setIsOpen(false)}
      //   vi/={onOpen}
      draggable
      // dragOnContent
      closeOnPressBack
      closeOnPressMask={true}
      customStyles={{
        container: styles.sheetContainer,
        draggableIcon: styles.draggableIcon,
      }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Order Details</Text>
            <Text style={styles.orderId}>{order?.orderId}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsOpen(false)}
            style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Body */}
        <ScrollView style={styles.body}>
          {/* Products List */}
          <Text style={styles.productsTitle}>Products</Text>
          <View style={styles.productsContainer}>
            {order?.products?.map(item => (
              <View key={item._id} style={styles.productItem}>
                <Image
                  source={{
                    uri: `${AWS_CDN_URL}${item.productId?.images?.[0]?.key}`,
                  }}
                  style={styles.productImage}
                  //   defaultSource={require('./placeholder.png')}
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.productId?.title}
                  </Text>
                  <Text style={styles.productQuantity}>
                    Qty: {item.quantity}
                  </Text>
                </View>
                <View style={styles.productPrice}>
                  <Text style={styles.priceText}>
                    ₹{(item.basePrice * item.quantity).toFixed(2)}
                  </Text>
                  <Text style={styles.priceDetail}>
                    {item.quantity} x ₹{item.basePrice.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {order?.orderStatus == 'CANCELLED' && (
            <View style={styles.shippingInfo}>
              <AlertOctagon size={16} color="#FF3B305C" />
              <View style={styles.shippingDetails}>
                {/* <Text style={styles.shippingStatus}>
                    {order?.shipping?.status}
                  </Text> */}
                {/* {console.log(order)} */}
                {order?.orderStatus !== 'DELIVERED' && (
                  <Text style={styles.deliveryEstimate}>
                    {`Cancelled by ${order?.cancelSource} for ${order?.cancelReason}`}
                  </Text>
                )}
              </View>
            </View>
          )}
          {/* Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryValue}>
                ₹{order?.totalAmount?.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Payment</Text>
              <Text style={styles.summaryValue}>{order?.paymentMethod}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryValue}>
                {order?.products?.length || 0}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Status</Text>
              <StatusDisplay status={order?.orderStatus} />
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>AWB</Text>
              <Text style={[styles.summaryValue, {color: '#87CEEB'}]}>
                {logisticsDetails?.awb_number || 'n/a'}
              </Text>
            </View>
            {logisticsDetails?.label_url && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Label</Text>
                <TouchableOpacity
                  className="bg-sky-500 px-3 py-3 rounded-lg shadow-md active:opacity-80"
                  onPress={() => Linking.openURL(logisticsDetails.label_url)}>
                  <Text className="text-white font-semibold text-cent/er">
                    View Label
                  </Text>
                </TouchableOpacity>

                {/* <StatusDisplay status={order?.orderStatus} /> */}
              </View>
            )}
          </View>

          {/* Addresses */}
          <View style={styles.addressesContainer}>
            <AddressCard
              title="Delivery Address"
              address={order?.deliveryAddress}
            />
            <AddressCard
              title="Pickup Address"
              address={order?.pickupAddresses?.[0]}
            />
          </View>
          <OrderTimeline
          order={order}
          onRefreshTracking={true}
          />
        </ScrollView>
      </View>
    </RBSheet>
  );
};

const styles = StyleSheet.create({
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,

    paddingVertical: 8,
    backgroundColor: '#121212',
  },
  shippingDetails: {
    marginLeft: 8,
    flexDirection: 'row',
    // justifyContent:'space-between'
    gap: 6,
    alignItems: 'center',
  },
  deliveryEstimate: {
    color: '#888',
    fontSize: 11,
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  draggableIcon: {
    backgroundColor: '#666666',
    width: 40,
  },
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  orderId: {
    fontSize: 12,
    color: '#FFD700',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addressesContainer: {
    marginVertical: 8,
  },
  addressCard: {
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 4,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 12,
  },
  productsContainer: {
    // marginBottom: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#333333',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productQuantity: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  priceDetail: {
    fontSize: 10,
    color: '#999999',
    marginTop: 4,
  },
});

export default OrderDetailsBottomSheet;
