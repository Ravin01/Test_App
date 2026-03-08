/* eslint-disable react-native/no-inline-styles */
import React, {useContext, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Linking,
  BackHandler,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Entypo from 'react-native-vector-icons/Entypo';
import FastImage from 'react-native-fast-image';
import RatingModal from './RatingModal';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import {colors} from '../../Utils/Colors';
import {AWS_CDN_URL} from '../../Utils/aws';
import {SafeAreaView} from 'react-native-safe-area-context';
import axiosInstance from '../../Utils/Api';
import OrderTimeline from './Utils/OrderTimeline';
import {Edit} from 'lucide-react-native';
import {AuthContext} from '../../Context/AuthContext';
import ProductResults from '../GloabalSearch/ProductsResult';
import ReviewSection from '../SellerProfile/ReviewSection';
import downloadPDFToDownloads from '../SellerComponents/SellerForm/download';
import { chatting, notificaiton } from '../../assets/assets';
// Responsive Design Imports
const OrderDetailScreen = ({navigation, route}) => {
  const data = route.params || {};
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const {selectedAddress} = useContext(AuthContext);
  const [similarProducts, setSimilarProducts] = useState(null);
  const [order, setOrder] = useState(data.order || null);
  const[isRefresh,setIsRefreshing]=useState(false)
  // console.log(order)
  const orderStatus = useMemo(() => {
    if (!order?.statusTimeline) return [];

    return [
      {
        title: 'Ordered',
        date: new Date(order.statusTimeline.ordered).toLocaleString(),
        completed: true,
      },
      {
        title: 'Processed',
        date: order.statusTimeline.processed
          ? new Date(order.statusTimeline.processed).toLocaleString()
          : 'Pending',
        completed: !!order.statusTimeline.processed,
      },
      {
        title: 'Shipped',
        date: order.statusTimeline.shipped
          ? new Date(order.statusTimeline.shipped).toLocaleString()
          : 'Pending',
        completed: !!order.statusTimeline.shipped,
      },
      {
        title: 'Delivered',
        date: order.statusTimeline.delivered
          ? new Date(order.statusTimeline.delivered).toLocaleString()
          : 'Pending',
        completed: !!order.statusTimeline.delivered,
      },
    ];
  }, [order.statusTimeline]);
  const [showReview, setShowReview] = useState(false);

  const products = useMemo(() => {
    if (!order.products) return [];

    return order.products.map(item => ({
      id: item._id,
      name: item.productId?.title || 'Unknown Product',
      image: item?.productId?.images?.[0]?.key
        ? `${AWS_CDN_URL}${item.productId?.images[0].key}`
        : null,
      size: 'Standard', // You might need to add size to your product data
      qty: item.quantity,
      price: item.basePrice,
      vendor: order.pickupAddresses?.[0]?.name || 'Unknown Vendor',
    }));
  }, [order.products, order.pickupAddresses]);

  const RatingModalMemo = useMemo(
    () => (
      <RatingModal
        // product={selectedItem}
        visible={isRatingModalVisible}
        transparent
        animationType="fade"
        onClose={() => setIsRatingModalVisible(false)}
      />
    ),
    [isRatingModalVisible],
  );
  const refreshOrder = async () => {
    try {
      setIsRefreshing(true)
      const response = await axiosInstance.get(`/order/${order._id}`);
      console.log(response.data)
      setOrder(response.data.data)
    } catch (error) {
      console.log('errorr while refreshing', error.response.data);
    }finally{
      setIsRefreshing(false)
    }
  };

  // Rendering product items
  const renderProductItem = ({item,index}) => (
    <TouchableOpacity style={styles.productItem} onPress={()=>{
    navigation.navigate("ProductDetails", {id: order?.products[index]?.productId?._id|| item?.productId?._id,type:'static'})}
    }>
      <Image source={{uri: item.image}} style={styles.productImage} />
      <View style={styles.productDetails}>
        {/* {console.log(item)} */}
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.itemMeta}>
          <Text style={styles.itemMetaText}>Size - {item.size}</Text>
          <Text style={styles.itemMetaText}>Qty - {item.qty}</Text>
        </View>
        <Text style={styles.productPrice}>₹{item.price}</Text>
      </View>
    </TouchableOpacity>
  );
  // Rendering recommended product items
  const renderRecommendedItem = ({item}) => {
    return (
      <View style={styles.recommendedItem}>
        <ProductResults product={item} onSave={() => null} isShowSave={false} />
      </View>
    );
  
  };

  // Main sections for FlatList
  const sections = [
    {
      id: 'address',
      type: 'address',
    },
    {
      id: 'products',
      type: 'products',
      data: products,
    },
    {
      id: 'shipping',
      type: 'shipping',
    },
    {
      id: 'orderStatus',
      type: 'orderStatus',
      data: orderStatus,
    },
    {
      id: 'orderDetails',
      type: 'orderDetails',
    },
    {
      id: 'return&exchange',
      type: 'return&exchange',
    },
    {
      id: 'recommendations',
      type: 'recommendations',
      data: similarProducts,
    },
  ];
  const review = order?.products[0]?.userReview;
  // console.log(review)
  // Render different sections based on type
  const renderItem = ({item}) => {
    const startingStatus = orderStatus[0];
    const latestStatus = order.orderStatus;
    let content = null;

    switch (item.type) {
      case 'address':
        return (
          <View style={styles.addressContainer}>
            <Feather name="map-pin" size={16} color="#9CA3AF" />
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressText}>
                {order.deliveryAddress?.line1}, {order.deliveryAddress?.line2},
                {order.deliveryAddress?.city}, {order.deliveryAddress?.state} -
                {order.deliveryAddress?.pincode}
              </Text>
              <Text style={styles.branchText}>
                Mobile: {order.deliveryAddress?.mobile}
              </Text>
            </View>
            {/* <TouchableOpacity style={{marginLeft:3}} onPress={()=> navigation.navigate('AddressForm', {item: {...order?.deliveryAddress,orderId:order._id}})}> */}
            {/* <Edit color={'#fff'}/> */}
            {/* <Text style={styles.addressText}>Edit</Text> */}
            {/* </TouchableOpacity> */}
          </View>
        );

      case 'products':
        return (
          <View style={[styles.productsContainer]}>
            <View style={styles.cardHeader}>
              <View style={styles.vendorContainer}>
                <MaterialIcons name="store" size={16} color="#888" />
                <Text style={styles.vendorName}>
                  {products[0]?.vendor || 'Unknown Vendor'}
                </Text>
              </View>
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      order.orderStatus === 'CANCELLED' ? 'red' : '#f4ba00',
                  },
                ]}>
                {order.orderStatus}
              </Text>
            </View>
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              ListFooterComponent={
                <>
                  {order.orderStatus !== 'Returned' &&
                    order.orderStatus !== 'CANCELLED' && (
                      <View style={styles.shippingInfo}>
                        <MaterialIcons
                          name="local-shipping"
                          size={16}
                          color="#888"
                        />
                        <View style={styles.shippingDetails}>
                          <Text style={styles.shippingStatus}>
                            {order.orderStatus}
                          </Text>
                        </View>
                      </View>
                    )}
                  <View style={styles.totalContainer}>
                    <View style={{flexDirection: 'row', gap: 10}}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalAmount}>
                        ₹{order.totalAmount?.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </>
              }
            />
          </View>
        );

      case 'orderStatus':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={styles.timeline}>
              {/* <FlatList
                data={[]}
                renderItem={renderTimelineItem}
                keyExtractor={(_, index) => index.toString()}
                scrollEnabled={false}
              /> */}
              <OrderTimeline order={order} />
            </View>
          </View>
        );

      case 'orderDetails':
        const renderOrderActionSection = () => {
          if (latestStatus === 'DELIVERED' && latestStatus) {
            return (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-evenly',
                    // padding: 8,
                    marginTop: 10,
                  }}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowReview(!showReview);
                    }}>
                    <View
                      style={{
                        backgroundColor: '#2C2C2C',
                        paddingVertical: 10,
                        paddingHorizontal: 30,
                        
                        borderRadius: 6,
                      }}>
                      <Text style={{color: 'white'}}>
                        {review && 'Edit '}Review
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {order.invoiceKey != null && (
                    <TouchableOpacity
                      onPress={() => {
                        // navigation.navigate('ExchangeReasonScreen', {order});
                        Linking.openURL(`${AWS_CDN_URL}${order.invoiceKey}`);
                        downloadPDFToDownloads(`${AWS_CDN_URL}${order.invoiceKey}`,"OrderInvoice")
                      }}>
                      <View
                        style={{
                          backgroundColor: '#2C2C2C',
                          paddingVertical: 10,
                          paddingHorizontal: 30,
                          borderRadius: 6,
                        }}>
                        <Text style={{color: 'white'}}>Download Invoice</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
                {showReview == true && (
                  <ReviewSection
                    productId={order?.products[0]?.productId?._id}
                    reviews={review}
                    fetchReview={refreshOrder}
                  />
                )}
                {/* <Text style={styles.policyText}>
                  Product can be returned or exchanged within 2-4 days of
                  delivery.
                </Text> */}
              </>
            );
          } else if (latestStatus === 'Refunded' && latestStatus) {
            return (
              <View style={styles.RefundContainer}>
                <View
                  style={{
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 12,
                  }}>
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 12,
                      textAlign: 'center',
                      lineHeight: 20,
                    }}>
                    Refund Processed {`\n`}
                    $1500 has been refunded to: {`\n`}
                    VISA ....4242 {`\n`}
                    Expected in your account within 3-5 business days.
                  </Text>
                </View>
              </View>
            );
          } else if (
            order?.orderStatus == 'PACKED' ||
            order?.orderStatus == 'ORDERED'
          ) {
            return (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  padding: 8,
                  marginVertical: 10,
                }}>
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('CancelOrderScreen', {order});
                  }}>
                  <View
                    style={{
                      backgroundColor: '#FF3B30',
                      paddingVertical: 5,
                      paddingHorizontal: 50,
                      borderRadius: 6,
                    }}>
                    <Text style={{color: 'white'}}>Cancel</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );}
          // } else if (order?.orderStatus == 'DELIVERED') {
          //   return (
          //     <View
          //       style={{
          //         flexDirection: 'row',
          //         justifyContent: 'flex-end',
          //         padding: 8,
          //         marginVertical: 10,
          //       }}>
          //       <TouchableOpacity
          //         onPress={() => {
          //           navigation.navigate('CancelOrderScreen', {order});
          //         }}>
          //         <View
          //           style={{
          //             backgroundColor: '#FF3B30',
          //             paddingVertical: 5,
          //             paddingHorizontal: 50,
          //             borderRadius: 6,
          //           }}>
          //           <Text style={{color: 'white'}}>Download Invoice</Text>
          //         </View>
          //       </TouchableOpacity>
          //     </View>
          //   );
          // }
        };
        const {product, quantity, gstAmount, gstRate} = order;
        const itemTotal = product?.productPrice * quantity;
        const totalAmount = order?.totalAmount;
        // console.log(order)
        const showSavings =
          product?.MRP && product?.productPrice < product?.MRP;

        // ✨ UPDATED: Savings calculation now based on quantity
        const totalSavedAmount = showSavings
          ? (product?.MRP - product?.productPrice) * quantity
          : 0;
        return (
          <>
            <View style={styles.detailsContainer}>
              <Text style={styles.sectionTitle}>Order Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID</Text>
                <View style={styles.orderIdContainer}>
                  <Text style={styles.detailValue}>{order?.orderId}</Text>
                  {/* <TouchableOpacity style={styles.copyButton}>
                    <Feather name="copy" size={14} color="#9CA3AF" />
                  </TouchableOpacity> */}
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Product Price</Text>
                <Text style={styles.highlightText}>
                  ₹{order?.totalBaseAmount?.toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>
                  {order?.products[0]?.quantity}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Delivery Charge</Text>
                <View style={styles.orderIdContainer}>
                  <Text style={styles.detailValue}>
                    ₹{order?.deliveryCharge}
                  </Text>
                </View>
              </View>

              {order.totalGstAmount!=0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    GST ({order?.products[0]?.gstRate}%) included
                  </Text>
                  <Text style={styles.detailValue}>
                    ₹{order?.totalGstAmount.toFixed(0)}
                  </Text>
                </View>
              )}
              {/* {console.log(order?.products)} */}
              {/* <View style={styles.detailRow}>
                <Text style={[styles.detailLabel,{color:'#1BCD30'}]}>Total Savings</Text>
                <Text style={[styles.highlightText,{color:'#1BCD30'}]}>
                  ₹{totalSavedAmount}
                </Text>
              </View> */}

              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>Total </Text>
                <Text style={styles.totalAmount}>
                  ₹{totalAmount?.toLocaleString()}
                </Text>
              </View>
            </View>

            {renderOrderActionSection()}
          </>
        );

      case 'return&exchange':
        return (
          <>
            <View style={styles.ReturnContainer}>
              {/* <Text style={styles.sectionTitle}>Return & Exchange</Text> */}

              {/* <Text style={styles.policyText}>
              Product can be returned or exchanged within 2-4 days of delivery.
            </Text> */}
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 12,
                  }}>
                  <FontAwesome5 name="headset" size={16} color="#F7CE45" />
                  <Text
                    style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>
                    Need Help?
                  </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("reportOrder",{orderDetails:order})}>
                  <View style={styles.supportButton}>
                    <Entypo
                      name="message"
                      size={20}
                      color="black"
                      style={{transform: [{scaleX: -1}]}}
                    />
                    <Text style={{color: 'black', fontWeight: '600'}}>
                      Contact Support
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </>
        );

      case 'recommendations':
        return (
          <View style={styles.recommendationsContainer}>
          {item?.data?.length>0&&<Text style={styles.sectionTitle}>You may also like</Text>}
            <FlatList
              horizontal
              data={item.data}
              renderItem={renderRecommendedItem}
              keyExtractor={(item, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              style={styles.recommendationsScroll}
            />
          </View>
        );

      default:
        return null;
    }
  };
  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigation.goBack();
        return true; // Prevent default behavior
      }
    );

    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {
    // console.log('Id===', order?.products[0]?.productId?._id);
    const fetchSimilarProduct = async () => {
      try {
        const response = await axiosInstance.get(
          `product-details/similar-products/${order?.products[0]?.productId?._id}`,
        ); //68569d100591cd39e05fe7ac
        setSimilarProducts(response.data.data);
        // setShowDetails(response.data.data);
        // console.log('Similar Product data fetched:', response.data.data)
      } catch (error) {
        console.log('Error fetching Product data:', error);
      } finally {
        // setSimilarLoading(false);
      }
    };
    fetchSimilarProduct();
  }, []);
  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity>
              <Feather name="search" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('NotificationScreen')}>
              <FastImage
                source={{uri:notificaiton}}
                style={{width: 24, height: 24}}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Comment')}>
              <FastImage
                source={{uri:chatting}}
                style={{width: 24, height: 24}}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content using FlatList */}
        <FlatList
          data={sections}
          renderItem={renderItem}
          refreshing={isRefresh}
          onRefresh={refreshOrder}
          keyExtractor={(item, index) => index.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContainer}
        />
      </View>
      {RatingModalMemo}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111', //'#111827', // dark background matching the image
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2C2C2C', //'#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    marginBottom: 20,
    marginHorizontal: -16,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 4,
  },
  flatListContainer: {
    paddingBottom: 20,
  },
  addressContainer: {
    backgroundColor: '#000000', //'#1F2937',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  addressTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  addressText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  branchText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  productsContainer: {
    paddingHorizontal: 16,
    backgroundColor: '#000000', //'#1F2937',
    paddingTop: 16,
    marginTop: 20,
    borderRadius: 12,
  },
  productItem: {
    flexDirection: 'row',
    paddingVertical: 12,

    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#777',
  },
  productDetails: {
    marginLeft: 12,
    flex: 1,
  },
  productBrand: {
    color: '#FFFFFF',
    fontWeight: '500',
    alignItems: 'center',
  },
  productName: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  productPrice: {
    color: '#fff', //'#FBBF24',
    marginTop: 4,
  },
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 20,
    paddingVertical: 8,
    // backgroundColor: 'rgba(247, 206, 69, 0.17)',
    backgroundColor: '#121212',
    borderRadius: 4,
  },
  shippingDetails: {
    marginLeft: 8,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  shippingStatus: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  deliveryEstimate: {
    color: '#888',
    fontSize: 11,
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#000000', //'#1F2937',
    marginTop: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 16,
  },
  timelineDotWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
  },
  dotIcon: {
    position: 'absolute',
    top: 5,
  },
  timeline: {
    marginLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    // backgroundColor:'#000000'
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  completedDot: {
    backgroundColor: '#FBBF24',
  },
  pendingDot: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  redDot: {
    backgroundColor: 'red',
  },
  timelineLine: {
    width: 2,
    height: 64,
  },
  completedLine: {
    backgroundColor: '#FBBF24',
  },
  pendingLine: {
    backgroundColor: '#374151',
  },
  timelineContent: {
    marginBottom: 32,
  },
  timelineTitle: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  timelineDate: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: '#000000', //'#1F2937',
    marginTop: 20,
    borderRadius: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    color: '#9CA3AF',
  },
  detailValue: {
    color: '#D1D5DB',
  },
  highlightText: {
    color: '#FBBF24',
    fontWeight: '600',
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyButton: {
    marginLeft: 8,
  },
  totalContainer: {
    marginTop: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  totalText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  totalAmount: {
    color: '#FBBF24',
    fontWeight: 'bold',
    fontSize: 18,
  },
  recommendationsContainer: {
    paddingHorizontal: 8,
    // paddingTop: 24,
    paddingBottom: 32,
    // backgroundColor: '#2C2C2C',   //'#1F2937',
    marginTop: 20,
    borderRadius: 12,
  },
  recommendationsScroll: {
    // marginTop: 8,
  },
  recommendedItem: {
    // backgroundColor: '#222', //'#2D3748',
    marginRight: 12,
    // borderRadius: 8,
    // padding: 0,
    width: 164,
    // borderWidth: 1,
    // borderColor: '#333',
  },
  recommendedImage: {
    width: '100%',
    height: 128,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendedName: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  recommendedPrice: {
    color: '#FBBF24',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginRight: 1,
  },
  reviewsText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 4,
  },
  ReturnContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#000000', //    '#1F2937',
    marginTop: 20,
    borderRadius: 12,
  },
  policyText: {
    color: '#FBBF24',
    marginVertical: 13,
    marginLeft: 10,
  },
  supportButton: {
    backgroundColor: '#F7CE45',
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  RefundContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#000000', //    '#1F2937',
    marginVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  itemMetaText: {
    color: '#888',
    fontSize: 12,
  },
  itemMetaDot: {
    color: '#888',
    marginHorizontal: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  vendorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorName: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  statusText: {
    color: '#f4ba00',
    fontSize: 12,
    fontWeight: '500',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  totalLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalAmount: {
    color: colors.primaryButtonColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    aspectRatio: 1,
    // backgroundColor: '#1A1A1A',
    padding: 10,
  },
  discountTag: {
    // position: 'absolute',
    // top: -150,
    // left: 10,
    // backgroundColor: '#ff4d4f',
    // paddingHorizontal: 8,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    // elevation:3,
    // paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: '#ddd',
    textTransform: 'capitalize',
    fontSize: 10,
    // elevation:4,
    fontWeight: '600',
  },
  productImage1: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    borderRadius: 8,
  },
  cardBody: {
    padding: 10,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
    color: '#fff',
    marginBottom: 2,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    // width: '50%',
    marginBottom: 5,
  },
  sellerImage: {
    width: 20,
    height: 20,
    backgroundColor: '#435862',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginRight: 5,
  },
  sellerName: {
    fontSize: 12,
    color: '#fff',
    // textTransform: 'capitalize',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    alignSelf: 'flex-start',
    // justifyContent:'space-around',
    gap: 5,
    marginBottom: 5,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  leftContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '80%',
    alignSelf: 'center',
    position: 'absolute',
    top: 12,
  },
  leftButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 15,
    alignItems: 'center',
    padding: 3,
  },
  color: {
    width: 6,
    height: 6,
    padding: 3,
    borderRadius: 20,
  },
  colorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default OrderDetailScreen;
