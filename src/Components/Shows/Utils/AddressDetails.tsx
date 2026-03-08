import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { ChevronDown, ChevronUp, MapPin, Truck, Calendar, CreditCard, Package, CheckCircle, XCircle, IndianRupee } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native-paper';
import axiosCourier from '../../../Utils/axiosCourier';
import axiosInstance from '../../../Utils/Api';
import { useNavigation } from '@react-navigation/native';

const AddressSection = ({
  aucionData,
  selectedAddress,
  quantity,
  setDelivery,
  setDeliveryData,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sellerPincode, setSellerPincode] = useState(null);
  const product = aucionData?.product
  // console.log(aucionData)
const navigation=useNavigation()
  // Unified state for API status and results
  const [deliveryInfo, setDeliveryInfo] = useState({
    status: "idle", // idle | loading | success | error
    data: null,
    error: null,
  });

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "short", weekday: "long" };
    return new Date(dateString).toLocaleDateString("en-IN", options);
  };
//  console.log(aucionData.product)
  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const sellerResponse = await axiosInstance.get(`/courier/seller-pincode/${product._id}`)
        if (sellerResponse.data.status) {
          setSellerPincode(sellerResponse.data.pincode);
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setDeliveryInfo({ status: "error", error: "Could not load delivery info.", data: null });
        setDeliveryData("Could not load delivery info.");
      }
    };
    if (product?._id) {
      fetchInitialData();
    }
  }, [product?._id]);

  // Auto-check delivery when seller pincode and selected address are available
  useEffect(() => {
    if (sellerPincode && selectedAddress?.pincode) {
      handlePincodeCheck(selectedAddress.pincode);
    }
  }, [sellerPincode, selectedAddress?.pincode]);

  // Handle quantity changes
  useEffect(() => {
    if (sellerPincode && selectedAddress?.pincode) {
      handlePincodeCheck(selectedAddress.pincode);
    }
  }, [quantity, sellerPincode, selectedAddress?.pincode]);

  const handlePincodeCheck = useCallback(async (targetPincode) => {
    // console.log({
    //     seller_pincode: sellerPincode,
    //     customer_pincode: targetPincode,
    //     product_weight: (product.weight?.value * (quantity || 1) || 100) / 1000,
    //     weight_unit: "kg",
    //     order_value: (aucionData?.winningBid||aucionData?.MRP||0) * (quantity || 1),
    //     payment_mode: "prepaid",
    //   },"tahajdf")
    if (!targetPincode || targetPincode.length !== 6 || !sellerPincode) {
      console.log("Missing required data:", { targetPincode, sellerPincode });
      return;
    }

    console.log("Starting delivery calculation for pincode:", targetPincode);
    setDeliveryInfo({ status: "loading", data: null, error: null });

    try {
      const requestData = {
        seller_pincode: sellerPincode,
        customer_pincode: targetPincode,
        product_weight: (product.weight?.value * (quantity || 1) || 100) / 1000,
        weight_unit: "kg",
        order_value: (aucionData?.winningBid||product?.MRP) * (quantity || 1),
        payment_mode: "prepaid",
      };

      // console.log("Delivery calculation request:", requestData);

      const response = await axiosCourier.post("/business/calculate-delivery", requestData);
      
      // console.log("Delivery calculation response:", response.data);

      if (response.data.success && response.data.data?.recommended_courier) {
        const recommended = response.data.data.recommended_courier;
        const deliveryData = {
          charge: recommended.delivery_charges,
          date: formatDate(recommended.delivery_date),
          courier: recommended.courier_name,
          cod_available: recommended.cod_available === 1,
        };
        
        setDelivery(deliveryData)
        setDeliveryInfo({
          status: "success",
          data: deliveryData,
          error: null,
        });
        setDeliveryData(null); // Clear any previous error
      } else {
        // const deliveryData = {
        //   charge: product.deliveryCharge ,
        //   date: formatDate(product.estimatedDeliveryDate),
        //   courier:'self_shipment',
        //   cod_available:false,
        // };
        // console.log("Delivery calculation unsuccessful:", deliveryData);
        const errorMessage = "Product Delivery not available for this pincode.";
        setDeliveryData(errorMessage);
         setDeliveryInfo({
        status: "error",
        error: errorMessage,
        data: null
      });
        // setDelivery(deliveryData)
        // setDeliveryInfo({
        //   status: "success",
        //   error: '',
        //   data: deliveryData
        // });
        console.log("Delivery not available for pincode:", targetPincode);
      }
    } catch (err) {
      console.log("Failed to calculate delivery:", err.response.data);
      // const errorMessage = "Could not estimate delivery. Please try again.";
     
        // const deliveryData = {
        //   charge: product.deliveryCharge ,
        //   date: formatDate(product.estimatedDeliveryDate),
        //   courier:'self_shipment',
        //   cod_available:false,
        // };
        // console.log("Delivery calculation from catch unsuccessful:", deliveryData);
        const errorMessage = "Delivery not available for this pincode.";
        setDeliveryData(errorMessage);
         setDeliveryInfo({
        status: "error",
        error: errorMessage,
        data: null
      });
        
        // setDelivery(deliveryData)
        // setDeliveryInfo({
        //   status: "success",
        //   error: '',
        //   data: deliveryData
        // });
      // setDeliveryData(errorMessage);
    }
  }, [sellerPincode, product, aucionData, quantity, setDeliveryData]);

  // Debug logs
  // useEffect(() => {
  //   console.log("Component state:", {
  //     sellerPincode,
  //     selectedAddressPincode: selectedAddress?.pincode,
  //     deliveryInfoStatus: deliveryInfo.status,
  //     productId: product?._id,
  //     quantity
  //   });
  // }, [sellerPincode, selectedAddress, deliveryInfo.status, product, quantity]);

  return (
    <View style={{ marginTop: 16 }}>
      {/* Address Management Section */}
      {selectedAddress && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={{
            borderWidth: 1,
            borderColor: '#444',
            marginTop: 12,
            borderRadius: 8,
            backgroundColor: '#1a1a1a',
            overflow: 'hidden',
          }}>
          {/* Header - Always visible */}
          <View style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: '#eee',
                marginBottom: 4,
              }}>
                📋 Delivery Address
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#ddd',
                fontWeight: '500',
              }}>
                {selectedAddress?.name} - {selectedAddress?.city}
              </Text>
            </View>

            <View style={{ marginLeft: 12 }}>
              {isExpanded ? (
                <ChevronUp size={20} color="#ffcc00" />
              ) : (
                <ChevronDown size={20} color="#ffcc00" />
              )}
            </View>
          </View>

          {/* Expanded Content */}
          {isExpanded && (
            <View style={{
              paddingHorizontal: 20,
              paddingBottom: 16,
              borderTopWidth: 1,
              borderTopColor: '#333',
              paddingTop: 12,
            }}>
              {/* Full Address Display */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: '#eee',
                  marginBottom: 8,
                }}>
                  Full Address
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: '#ddd',
                  lineHeight: 18,
                }}>
                  {selectedAddress?.line1}
                  {selectedAddress?.line2 && `\n${selectedAddress?.line2}`}
                  {`\n${selectedAddress?.city}, ${selectedAddress?.state} ${selectedAddress?.pincode}`}
                </Text>
              </View>

              {/* Manual refresh button for debugging */}
              <TouchableOpacity
                onPress={() =>navigation.navigate("EditAddressScreen")}
                style={{
                  backgroundColor: '#333',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 8,
                }}>
                <Text style={{
                  color: '#ffcc00',
                  fontWeight: 'bold',
                  fontSize: 12,
                }}>
                  Change Delivery Info
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      )}

      {!selectedAddress && (
        <View style={{
          borderWidth: 1,
          borderColor: '#444',
          marginTop: 12,
          borderRadius: 8,
          padding: 10,
          backgroundColor: '#1a1a1a',
          overflow: 'hidden',
        }}>
          <Text style={{ color: '#fff', textAlign: 'center', paddingVertical: 16 }}>
            No address found! Please add an address
          </Text>
           <TouchableOpacity
                onPress={() =>navigation.navigate("EditAddressScreen")}
                style={{
                  backgroundColor: '#333',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 8,
                }}>
                <Text style={{
                  color: '#ffcc00',
                  fontWeight: 'bold',
                  fontSize: 12,
                }}>
                  Add Delivery Info
                </Text>
              </TouchableOpacity>
        </View>
      )}

      {/* Delivery Information Display */}
      <View style={{
        borderWidth: 1,
        borderColor: '#444',
        marginTop: 16,
        borderRadius: 12,
        backgroundColor: '#1a1a1a',
        padding: 16,
      }}>
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 4,
          }}>
            Price & Product Information
          </Text>
          <Text style={{
            fontSize: 12,
            color: '#888',
          }}>
            Estimated delivery details for your order
          </Text>
        </View>

        {/* Idle State */}
        {deliveryInfo.status === 'idle' && (
          <View style={{
            padding: 16,
            backgroundColor: '#2a2a2a',
            borderRadius: 8,
            alignItems: 'center',
          }}>
            <Package size={24} color="#888" />
            <Text style={{ color: '#888', marginTop: 8, fontSize: 12, textAlign: 'center' }}>
              {selectedAddress ? 'Calculating delivery options...' : 'Please select an address to check delivery options'}
            </Text>
          </View>
        )}

        {/* Loading State */}
        {deliveryInfo.status === 'loading' && (
          <View style={{
            padding: 16,
            backgroundColor: '#2a2a2a',
            borderRadius: 8,
            alignItems: 'center',
          }}>
            <ActivityIndicator size="small" color="#ffcc00" />
            <Text style={{ color: '#ccc', marginTop: 8, fontSize: 12 }}>
              Calculating delivery...
            </Text>
          </View>
        )}

        {/* Success State */}
        {deliveryInfo.status === 'success' && deliveryInfo.data && (
          <View style={{ gap: 12 }}>
            {/* Delivery Charge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: '#2a2a2a',
              borderRadius: 8,
            }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#ffcc00',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Truck size={16} color="#000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                  Delivery Charge
                </Text>
                <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>
                  {deliveryInfo.data.charge === 0 ? 'FREE' : `₹${deliveryInfo.data.charge}`}
                </Text>
              </View>
            </View>

            {/* Delivery Date */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: '#2a2a2a',
              borderRadius: 8,
            }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#10b981',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Calendar size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                  Expected Delivery
                </Text>
                <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>
                  {deliveryInfo.data.date}
                </Text>
              </View>
            </View>

            {/* Courier Partner */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: '#2a2a2a',
              borderRadius: 8,
            }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#3b82f6',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Package size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                  Courier Partner
                </Text>
                <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>
                  {deliveryInfo.data.courier || 'Standard Delivery'}
                </Text>
              </View>
            </View>

            {/* COD Availability */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: '#2a2a2a',
              borderRadius: 8,
            }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: deliveryInfo.data.cod_available ? '#10b981' : '#ef4444',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <CreditCard size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                  Cash on Delivery
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: deliveryInfo.data.cod_available ? '#10b981' : '#ef4444',
                  fontWeight: '600'
                }}>
                  {deliveryInfo.data.cod_available ? 'Available' : 'Not Available'}
                </Text>
              </View>
            </View>


              <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: '#2a2a2a',
              borderRadius: 8,
            }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#ffcc00',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <IndianRupee size={16} color="#000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                  Total  Amount
                </Text>
                <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>
                 ₹ {aucionData.winningBid? `${aucionData.winningBid+deliveryInfo.data.charge}`:deliveryInfo.data.charge}
                </Text>
              </View>
            </View>

            {/* Free Delivery Badge */}
            {deliveryInfo.data.charge === 0 && (
              <View style={{
                marginTop: 8,
                padding: 12,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(16, 185, 129, 0.3)',
                borderRadius: 8,
              }}>
                <Text style={{
                  fontSize: 12,
                  color: '#10b981',
                  textAlign: 'center',
                }}>
                  🎉 Congratulations! You've qualified for free delivery
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Error State */}
        {deliveryInfo.status === 'error' && deliveryInfo.error && (
          <View style={{
            padding: 12,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <XCircle size={18} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 12, color: '#ef4444', flex: 1 }}>
              {deliveryInfo.error}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default AddressSection;