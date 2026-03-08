// components/search/ProductResults.js
import React, {useContext, useState} from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import {AWS_CDN_URL} from '../../Utils/aws';
import {useSafeAreaFrame} from 'react-native-safe-area-context';
import {ActivityIndicator} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import { overlay } from '../../Utils/Colors';
import { Toast } from '../../Utils/dateUtils';
import { AuthContext } from '../../Context/AuthContext';
import CheckoutSlider from '../Reuse/CheckOutGlobal';
import FlashSaleTimer from './FlashSaleTimer';
import { Discount } from '../../assets/assets';

const formatCurrency = amount => {
  if (amount == null || isNaN(amount)) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const ProductResults = ({product,   onSave,isShowSave=true,isfromLive=false}) => {
  const navigation = useNavigation();

  const item = product;
const [showCheckOut,setShowCheckOut]=useState(false)
//  console.log('product Item', item);

  // Check if product is in wishlist and loading state
  const [isInWishlist, setIswishList] = useState((item?.isInWishlist));
 
  // Check if product is in active flash sale
  const isFlashSale = product?.flashSale?.isActive;
  const flashData = product?.flashSale;
  const hasValidFlashData = isFlashSale && flashData?.flashPrice && flashData?.endsAt;
 const{user}=useContext(AuthContext)
    const imageKey = item?.productId?.images?.[0]?.key ? `${AWS_CDN_URL}${item?.productId.images[0].key}` : `${AWS_CDN_URL}${item?.images?.[0]?.key}` ;
  // const imageKey = item?.images?.[0]?.key;
  const imageUrl = imageKey ;
  // console.log(imageKey)
  const [loading, setloading] = useState(false);
  
  // Calculate discount based on flash sale or regular pricing
  const calculateDiscount = (mrp, price) => {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  };

  const discountPercent = hasValidFlashData
    ? calculateDiscount(flashData.originalPrice, flashData.flashPrice)
    : calculateDiscount(item?.MRP, item?.productPrice);

  // Determine which price to display
  const displayPrice = hasValidFlashData ? flashData.flashPrice : item?.productPrice;
  const originalPrice = hasValidFlashData ? flashData.originalPrice : item?.MRP;

  // console.log(product)
  const handleSave = () => {
    try {
      const id=item?._id ||product?.productId?._id
      setloading(true);
      onSave(id);
      if (isInWishlist) setIswishList(null);
      else setIswishList(id);
    } catch {
    } finally {
      setloading(false);
    }
  };
  // console.log(user?.role)
  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => {
          navigation.navigate('ProductDetails', {id: item?._id || item?.productId?._id, 
            flashSale: hasValidFlashData ? flashData : null,
            type: 'static'});
        }}
        style={styles.cardContent}>
        <View style={[styles.imageContainer]}>
          <View style={overlay.cardOverlay}>
          <FastImage
            source={{uri: imageUrl, priority: FastImage.priority.normal}}
            style={styles.productImage}
            resizeMode="cover"
          />
          {/* Shadow overlay for save button visibility */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.3)', 'transparent']}
            style={styles.topShadowOverlay}
            pointerEvents="none"
          />
        </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.productTitle} numberOfLines={1}>
            {item?.title || item?.productId?.title||'No Title Provided'}
          </Text>
          <Text
            style={{color: '#777', fontSize: 13, marginBottom: 4}}
            numberOfLines={1}>
            {item?.description ||item?.productId?.description|| 'No Title Provided'}
          </Text>
          {/* <TouchableOpacity style={styles.sellerInfo} onPress={()=>navigation.navigate('ViewSellerProdile', {id: item?.sellerUserName})}>
            {item?.sellerProfileURL ? (
              <Image
                source={{uri:`${AWS_CDN_URL}${item.sellerProfileURL}`}}
                style={styles.sellerImage}
              />
            ) : (
              <TouchableOpacity style={styles.sellerImage}>
                <Text
                  style={{
                    textTransform: 'capitalize',
                    fontWeight: 'bold',
                    color: '#fff',
                    fontSize: 10,
                  }}>
                  {item?.sellerCompanyName?.charAt(0)}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.sellerName} >
              {item?.sellerCompanyName || 'Unknown Seller'}
            </Text>
          </TouchableOpacity>
          <View style={styles.colorContainer}>
          
            <View style={{flexDirection: 'row', gap: 2, alignItems: 'center'}}>
              <View style={[styles.color, {backgroundColor: '#000000'}]} />
              <View style={[styles.color, {backgroundColor: '#FFD700'}]} />
              <View style={[styles.color, {backgroundColor: '#FF260D'}]} />
              <View style={[styles.color, {backgroundColor: '#FFBE9D'}]} />
              <Text style={{color: '#777', fontSize: 10}}>4+</Text>
            </View>
          </View> */}
          <View style={styles.priceContainer}>
            <View className="flex-row flex-wrap gap-2 max-w-[90%] " style={{flexWrap:'wrap',alignItems:'baseline'}}>
              <Text 
                className='text-bold text-[14px]' 
                style={{color: hasValidFlashData ? '#ef4444' : '#F7CE45'}}>
                {formatCurrency(displayPrice)}
              </Text>
              {originalPrice && originalPrice > displayPrice && (
                <Text className='text-[10px] text-gray-50 line-through' style={{color:'#ccc'}}>
                  {formatCurrency(originalPrice)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              className="bg-brand-yellow py-2  rounded-sm mt-2 items-center rounded-[18px]"
                 onPress={() => {
                  const id=product?.sellerId||product?.sellerId?._id
                   if(user?.sellerInfo?._id==id && user?.role==='seller')
                    Toast("You cannot purchase your own product")
                  // else if(isfromLive)
                  //   navigation.navigate('ProductDetails', {id: item?._id || item?.productId?._id, type: 'static'});
                  else
          setShowCheckOut(true)
        }}>
              <Text className="text-[11px] font-bold" >
                Buy Now
              </Text>
            </TouchableOpacity>
            {/* )} */}
          </View>
        </View>
        <View style={styles.leftContainer}>
          {hasValidFlashData ? (
            <View style={styles.flashSaleContainer}>
              <LinearGradient
                colors={['#dc2626', '#ef4444']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.flashSaleBadge}>
                <Ionicons name="flash" size={12} color="#fff" />
                <Text style={styles.flashSaleText}>
                  FLASH {discountPercent > 0 && `-${discountPercent}%`}
                </Text>
              </LinearGradient>
              <View style={styles.timerContainer}>
                <FlashSaleTimer endsAt={flashData.endsAt} />
              </View>
            </View>
          ) : (
            discountPercent > 0 && (
              <LinearGradient
                colors={['rgba(255, 0, 0, 0.8)', 'rgba(255, 0, 0, 0.8)']}
                start={{x: 0.1, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.discountButton}>
                <View style={styles.discountTag}>
                  <Image
                    source={{uri:Discount}}
                    style={{height: 15, width: 15}}
                  />
                  <Text style={styles.discountText}>
                    {' '}{discountPercent}% OFFER
                  </Text>
                </View>
              </LinearGradient>
            )
          )}
          {/* <View style={styles.leftButton}>
            <Text style={{color: '#fff', fontSize: 10}}>Only few left!</Text>
          </View> */}
         {isShowSave&& <TouchableOpacity
            onPress={handleSave}
            style={{
              padding: 5,
              backgroundColor: isInWishlist ? '#F2231F' : '#FFFFFF6C',
              borderWidth: 1,
              borderColor: '#FFFFFF1C',
              borderRadius: 20,
            }}>
            {loading ? (
              <ActivityIndicator color="black" size={15} />
            ) : (
              <AntDesign name="heart" size={15} color="#fff" />
            )}
          </TouchableOpacity>}
          <CheckoutSlider
          isOpen={showCheckOut}
          product={product?.productId?product?.productId:product}
          onClose={()=>setShowCheckOut(false)}
          />
          {/* <CheckoutBottomSheet
          product={product}
          isOpen={showCheckOut}
          setIsOpen={setShowCheckOut}
          flashSale={null}
          onPlaceOrder={handleRazorpayPay}
          /> */}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 3,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#1E1E1E',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    marginBottom: 10,
    // paddingHorizontal:10,
    shadowRadius: 10,
    elevation: 3,
  },
  buyButtonText: {fontSize: 10, fontWeight: '500'},
  buyButton: {
    backgroundColor: '#F7CE45',
    padding: 5,
    paddingHorizontal:10,
    height:25,
    borderRadius: 15,
  },
  leftContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
    position: 'absolute',
    top: 10,
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
  cardContent: {
    // flex: 1,
    // backgroundColor:'#333'
  },
  imageContainer: {
    aspectRatio: 1,
    position: 'relative',
  },
  topShadowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  discountButton: {
    // flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 7,
    paddingHorizontal:5,
  },
  discountTag: {
    // position: 'absolute',
    // top: -150,
    // left: 10,
    backgroundColor: '#F2231F',
    // paddingHorizontal: 8,
    flexDirection: 'row',
    // gap: 5,

    alignItems: 'center',
    // elevation:3,
    paddingVertical: 4,
    borderRadius: 7,
  },
  discountText: {
    color: '#fff',
    // textTransform: 'uppercase',
    fontSize: 10,
    // elevation:4,
    // fontFamily:'Poppins-800',
    fontWeight: '800',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderTopRightRadius: 8,
    borderTopLeftRadius: 8,
    // borderRadius: 8,
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
    // flexDirection: 'row',
    // alignItems: 'baseline',
    // flexWrap:'wrap',
    // backgroundColor:'red',
    // width: '100%',
    // alignSelf: 'flex-start',
    // justifyContent: 'space-between',
    // gap: 5,
    // marginBottom: 5,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  flashSaleContainer: {
    flexDirection: 'column',
    gap: 4,
  },
  flashSaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  flashSaleText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
});

export default ProductResults;
