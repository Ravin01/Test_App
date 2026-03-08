import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { ChevronDown, ChevronUp, Truck, Calendar, CreditCard, Package, XCircle } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native-paper';
import axiosCourier from '../../Utils/axiosCourier';
import axiosInstance from '../../Utils/Api';

const ExpandableAddressSection = ({
  pincode,
  product,
  setPinCode,
  selectedAddress: propSelectedAddress, // Rename prop to avoid conflict
  navigation,
  setDeliveryDetails,
  quantity,
  setDeliveryData,
}:any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sellerPincode, setSellerPincode] = useState(null);
  const [pincodeInput, setPincodeInput] = useState(pincode || '');
  const [pincodeLocation, setPincodeLocation] = useState(null);
  
  // ✅ Local address state - fetch directly instead of relying only on context
  const [localAddress, setLocalAddress] = useState<any>(null);
  const [addressLoading, setAddressLoading] = useState(true);
  
  // Use local address if available, otherwise fallback to prop
  const selectedAddress = localAddress || propSelectedAddress;
  
  // ✅ Fetch address directly on component mount
  useEffect(() => {
    const fetchAddressLocally = async () => {
      console.log('🏠 [AddressSection] Fetching address locally on mount...');
      setAddressLoading(true);
      try {
        const response = await axiosInstance.get('/user/addresses');
        const addresses = response.data.data || [];
        
        console.log('🏠 [AddressSection] API Response - Total addresses:', addresses.length);
        
        // Find default address first, otherwise use first available address
        const defaultAddress = addresses.find((addr: any) => addr.isDefault);
        
        if (defaultAddress) {
          console.log('🏠 [AddressSection] Found default address:', defaultAddress.name, '-', defaultAddress.city);
          setLocalAddress(defaultAddress);
        } else if (addresses.length > 0) {
          console.log('🏠 [AddressSection] Using first address:', addresses[0].name, '-', addresses[0].city);
          setLocalAddress(addresses[0]);
        } else {
          console.log('🏠 [AddressSection] No addresses found');
          setLocalAddress(null);
        }
      } catch (error: any) {
        console.log('❌ [AddressSection] Error fetching address:', error?.response?.data || error?.message);
        // Fallback to prop if available
        if (propSelectedAddress) {
          setLocalAddress(propSelectedAddress);
        }
      } finally {
        setAddressLoading(false);
      }
    };
    
    // Fetch address if prop is not available or we want to ensure fresh data
    if (!propSelectedAddress) {
      fetchAddressLocally();
    } else {
      // Use prop initially, but still fetch in background to ensure it's current
      setLocalAddress(propSelectedAddress);
      setAddressLoading(false);
      // Optionally fetch in background to verify
      fetchAddressLocally();
    }
  }, []); // Run once on mount
  
  // Update local address when prop changes (from context)
  useEffect(() => {
    if (propSelectedAddress && !localAddress) {
      setLocalAddress(propSelectedAddress);
    }
  }, [propSelectedAddress, localAddress]);

  // Unified state for API status and results
  const [deliveryInfo, setDeliveryInfo] = useState({
    status: "idle", // idle | loading | success | error
    data: null,
    error: null,
  });
// console.log(product,"PRODUCT ")
  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "short", weekday: "long" };
    return new Date(dateString).toLocaleDateString("en-IN", options);
  };

  useEffect(() => {
    // console.log("trying ")
    if ((pincodeInput === null || pincodeInput === 0) && deliveryInfo.error && selectedAddress?.pincode) {
      handlePincodeCheck()
    }
  }, [pincodeInput])

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const sellerResponse = await axiosInstance.get(`/courier/seller-pincode/${product._id}`)
        if (sellerResponse.data.status) {
          setSellerPincode(sellerResponse.data.pincode);
        }
      } catch (err) {
        console.log("Failed to fetch initial data:", err.response.data);
        setDeliveryInfo({ status: "error", error: "Could not load delivery info.", data: null });
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
  }, [sellerPincode, selectedAddress]);

  useEffect(() => {
    if (sellerPincode && (selectedAddress?.pincode || pincodeInput)) {
      const targetPincode = selectedAddress?.pincode || pincodeInput;
      if (targetPincode && targetPincode.length === 6) {
        handlePincodeCheck(targetPincode);
      }
    }
  }, [quantity]);

  // Fetch location details for manual pincode input
  useEffect(() => {
    if (pincodeInput.length !== 6) {
      setPincodeLocation(null);
      // Clear delivery info if pincode is invalid length
      if (pincodeInput.length > 0) {
        setDeliveryInfo({
          status: "idle",
          data: null,
          error: null,
        });
        setDeliveryData(null);
      }
      return;
    }

    const fetchPincodeDetails = async () => {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincodeInput}`);
        const data = await response.json();
        if (data && data[0].Status === "Success") {
          const { Name, State } = data[0].PostOffice[0];
          setPincodeLocation({ city: Name, state: State });
        } else {
          setPincodeLocation(null);
          // Set error for invalid pincode
          setDeliveryInfo({
            status: "error",
            error: "Invalid pincode. Please enter a valid Indian pincode.",
            data: null,
          });
          setDeliveryData("Invalid pincode");
        }
      } catch (error) {
        console.error("Failed to fetch pincode details", error);
        setPincodeLocation(null);
        setDeliveryInfo({
          status: "error",
          error: "Unable to validate pincode. Please try again.",
          data: null,
        });
        setDeliveryData("Unable to validate pincode");
      }
    };

    const timeoutId = setTimeout(fetchPincodeDetails, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [pincodeInput]);

  // New useEffect to handle clearing of pincodeInput
  useEffect(() => {
    if (pincodeInput === '' || pincodeInput === null) {
      if (selectedAddress?.pincode) {
        handlePincodeCheck(selectedAddress.pincode);
      } else {
        setDeliveryInfo({
          status: "idle",
          data: null,
          error: null,
        });
      }
    }
  }, [pincodeInput]);

  const handlePincodeCheck = useCallback(async (targetPincode = pincodeInput) => {
    if (!targetPincode || targetPincode.length !== 6 || !sellerPincode) return;

    // First validate if it's a real Indian pincode
    try {
      const pincodeValidation = await fetch(`https://api.postalpincode.in/pincode/${targetPincode}`);
      const validationData = await pincodeValidation.json();
      
      if (!validationData || validationData[0].Status !== "Success") {
        setDeliveryInfo({
          status: "error",
          error: "Invalid pincode. Please enter a valid Indian pincode.",
          data: null,
        });
        setDeliveryData("Invalid pincode");
        return;
      }
    } catch (error) {
      console.log("Failed to validate pincode:", error);
      setDeliveryInfo({
        status: "error",
        error: "Unable to validate pincode. Please try again.",
        data: null,
      });
      setDeliveryData("Unable to validate pincode");
      return;
    }

    setDeliveryInfo({ status: "loading", data: null, error: null });
    setDeliveryData('loading');

    // ✅ BACKWARD COMPATIBILITY (SAME AS OrderandAddress.tsx): Check new field first, fallback to old field
    let productShippingMethod = product.shippingMethod;
    
    // If new field doesn't exist, map old logisticsType to new values
    if (!productShippingMethod && product.logisticsType) {
      productShippingMethod = product.logisticsType === 'selfShipment' 
        ? 'self_shipment' 
        : 'flykup_logistics';
    }
    
    // Default to flykup_logistics if neither field exists (same as web)
    productShippingMethod = productShippingMethod || 'flykup_logistics';
    
    const requiresSelfShipment = productShippingMethod === 'self_shipment';

    console.log('🚚 [AddressSection] Delivery calculation:', {
      productId: product._id,
      shippingMethod: product.shippingMethod,
      logisticsType: product.logisticsType,
      finalMethod: productShippingMethod,
      requiresSelfShipment,
    });

    // ✅ If self-shipment, use product's delivery info (no API call) - SAME AS OrderandAddress.tsx
    if (requiresSelfShipment) {
      console.log('📦 [AddressSection] Using self-shipment method');
      const fallbackDeliveryData = {
        charge: product.deliveryCharge || 40,
        date: formatDate(product.estimatedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        courier: 'Self Shipment',
        cod_available: false,
      };
      
      setDeliveryInfo({
        status: "success",
        data: fallbackDeliveryData,
        error: null,
      });
      setDeliveryDetails(fallbackDeliveryData);
      setDeliveryData(null);
      return; // ✅ EARLY EXIT - No courier API call
    }

    // ✅ Proceed with flykup logistics calculation
    console.log('🚀 [AddressSection] Using Flykup logistics - calling courier API');
    
    try {
      // Build delivery calculation payload
      const deliveryPayload: any = {
        seller_pincode: sellerPincode,
        customer_pincode: targetPincode,
        product_weight: (product.weight?.value * (quantity || 1) || 100) / 1000,
        weight_unit: "kg",
        order_value: product.productPrice * (quantity || 1),
        payment_mode: "prepaid",
        order_date: new Date().toISOString().split('T')[0],
      };

      // ✅ Add dimensions if product has them (for accurate shipping calculation)
      if (product.dimensions?.length && 
          product.dimensions?.width && 
          product.dimensions?.height) {
        deliveryPayload.length = product.dimensions.length;
        deliveryPayload.width = product.dimensions.width;
        deliveryPayload.height = product.dimensions.height;
        // console.log('📦 [AddressSection] Sending dimensions:', product.dimensions);
      }

      const response = await axiosCourier.post("/business/calculate-delivery", deliveryPayload);

      if (response.data.success && response.data.data?.recommended_courier) {
        const recommended = response.data.data.recommended_courier;
        const deliveryData = {
          charge: recommended.delivery_charges,
          date: formatDate(recommended.delivery_date),
          courier: recommended.courier_name,
          cod_available: recommended.cod_available === 1,
        };
        
        setDeliveryInfo({
          status: "success",
          data: deliveryData,
          error: null,
        });
        setDeliveryDetails(deliveryData);
        setDeliveryData(null);
        // console.log('✅ [AddressSection] Flykup logistics charges set:', deliveryData.charge);
      } else {
        // Courier unavailable -> Fallback to self-shipment
        console.log("⚠️ [AddressSection] Courier not available, falling back to self-shipment");
        const fallbackData = {
          charge: product.deliveryCharge || 40,
          date: formatDate(product.estimatedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          courier: 'Self Shipment',
          cod_available: false,
        };
        
        setDeliveryInfo({
          status: "success",
          data: fallbackData,
          error: null,
        });
        setDeliveryDetails(fallbackData);
        setDeliveryData(null);
      }
    } catch (err: any) {
      console.log("❌ [AddressSection] Failed to calculate delivery:", err?.response?.data || err?.message);
      
      // On API error, fallback to self-shipment instead of showing error
      if (product.deliveryCharge != null) {
        console.log('⚠️ [AddressSection] API error - falling back to self-shipment');
        const fallbackData = {
          charge: product.deliveryCharge,
          date: formatDate(product.estimatedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
          courier: 'Self Shipment',
          cod_available: false,
        };
        
        setDeliveryInfo({
          status: "success",
          data: fallbackData,
          error: null,
        });
        setDeliveryDetails(fallbackData);
        setDeliveryData(null);
      } else {
        // Only show error if no fallback available
        const errorMessage = "Product Delivery not available for this pincode.";
        setDeliveryData(errorMessage);
        setDeliveryInfo({
          status: "error",
          error: errorMessage,
          data: null
        });
      }
    }
  }, [sellerPincode, product, pincodeInput, quantity, setDeliveryData, setDeliveryDetails]);

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

              {/* Action Button */}
              <TouchableOpacity
                onPress={() => navigation.navigate('EditAddressScreen')}
                style={{
                  backgroundColor: '#ffcc00',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}>
                <Text style={{
                  color: 'black',
                  fontWeight: 'bold',
                  fontSize: 14,
                }}>
                  Change Address
                </Text>
              </TouchableOpacity>

              <View style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#ccc', marginBottom: 8 }}>
                  Or enter a pincode
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={pincodeInput}
                      maxLength={6}
                      keyboardType="numeric"
                      onChangeText={(value) => {
                        const numericValue = value.replace(/[^0-9]/g, "");
                        setPincodeInput(numericValue);
                        setPinCode && setPinCode(numericValue);
                      }}
                      placeholder="Enter pincode"
                      placeholderTextColor="#888"
                      style={{
                        backgroundColor: '#2a2a2a',
                        borderWidth: 1,
                        borderColor: '#444',
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        color: '#fff',
                        fontSize: 14,
                      }}
                    />
                    {pincodeLocation && (
                      <Text style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                        {pincodeLocation.city}, {pincodeLocation.state}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handlePincodeCheck()}
                    disabled={pincodeInput.length !== 6 || deliveryInfo.status === 'loading'}
                    style={{
                      backgroundColor: pincodeInput.length === 6 ? '#ffcc00' : '#555',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      height:40,
                      borderRadius: 8,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    {deliveryInfo.status === 'loading' && pincodeInput.length === 6 ? (
                      <ActivityIndicator size={20} color="#000" />
                    ) : (
                      <Text style={{
                        color: pincodeInput.length === 6 ? '#000' : '#aaa',
                        fontWeight: 'bold'
                      }}>
                        Check
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
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
          <Text className='text-white text-center py-4'>No address found! Please add a address </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditAddressScreen')}
            style={{
              backgroundColor: '#ffcc00',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}>
            <Text style={{
              color: 'black',
              fontWeight: 'bold',
              fontSize: 14,
            }}>
              Add Address
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
            Delivery Information
          </Text>
          <Text style={{
            fontSize: 12,
            color: '#888',
          }}>
            Estimated delivery details for your order
          </Text>
        </View>

        {/* Loading State */}
        {deliveryInfo.status === 'loading' && (
          <View style={{ gap: 12 }}>
            {/* Loading Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
            }}>
              <ActivityIndicator size="small" color="#ffcc00" />
              <Text style={{ color: '#ffcc00', marginLeft: 8, fontSize: 13, fontWeight: '500' }}>
                Calculating delivery details...
              </Text>
            </View>

            {/* Skeleton - Delivery Charge */}
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
                backgroundColor: '#3a3a3a',
                marginRight: 12,
              }} />
              <View style={{ flex: 1 }}>
                <View style={{
                  width: 80,
                  height: 10,
                  backgroundColor: '#3a3a3a',
                  borderRadius: 4,
                  marginBottom: 6,
                }} />
                <View style={{
                  width: 60,
                  height: 14,
                  backgroundColor: '#3a3a3a',
                  borderRadius: 4,
                }} />
              </View>
            </View>

            {/* Skeleton - Delivery Date */}
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
                backgroundColor: '#3a3a3a',
                marginRight: 12,
              }} />
              <View style={{ flex: 1 }}>
                <View style={{
                  width: 100,
                  height: 10,
                  backgroundColor: '#3a3a3a',
                  borderRadius: 4,
                  marginBottom: 6,
                }} />
                <View style={{
                  width: 120,
                  height: 14,
                  backgroundColor: '#3a3a3a',
                  borderRadius: 4,
                }} />
              </View>
            </View>

            {/* Skeleton - Courier Partner */}
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
                backgroundColor: '#3a3a3a',
                marginRight: 12,
              }} />
              <View style={{ flex: 1 }}>
                <View style={{
                  width: 90,
                  height: 10,
                  backgroundColor: '#3a3a3a',
                  borderRadius: 4,
                  marginBottom: 6,
                }} />
                <View style={{
                  width: 100,
                  height: 14,
                  backgroundColor: '#3a3a3a',
                  borderRadius: 4,
                }} />
              </View>
            </View>

            {/* Skeleton - COD Availability */}
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
                backgroundColor: '#3a3a3a',
                marginRight: 12,
              }} />
              <View style={{ flex: 1 }}>
                <View style={{
                  width: 100,
                  height: 10,
                  backgroundColor: '#3a3a3a',
                  borderRadius: 4,
                  marginBottom: 6,
                }} />
                <View style={{
                  width: 70,
                  height: 14,
                  backgroundColor: '#3a3a3a',
                  borderRadius: 4,
                }} />
              </View>
            </View>
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

export default ExpandableAddressSection;
