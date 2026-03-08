// @ts-nocheck

// components/search/ProductResults.js
import React, {useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { AWS_CDN_URL } from '../../../Utils/aws';

const formatCurrency = amount => {
  if (amount == null || isNaN(amount)) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const WishListTab = ({product, error, onUnsave}) => {
  const navigation = useNavigation();
  const item = product;
  // Lazy loading - Load more when user scrolls near the bottom
  

  const imageKey = item?.images?.[0]?.key;
  const imageUrl = imageKey ? `${AWS_CDN_URL}${imageKey}` : undefined;

  const price = item?.productPrice;
  const mrp = item?.MRP;
  const hasDiscount = mrp != null && price != null && mrp > price;
  const discountPercent = hasDiscount
    ? Math.round(((mrp - price) / mrp) * 100)
    : 0;

// useEffect(() => {
//   console.log('WishListTab rendered:', item?.sellerId?.userInfo?.userName);
// }, [product]);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => {
          navigation.navigate('ProductDetails', {id: item?._id,type:'static'});
        }}
        style={styles.cardContent}>
        <View style={styles.imageContainer}>
          <Image
            source={ {uri: imageUrl }}
            style={styles.productImage}
            onError={(e) =>console.log(e.nativeEvent.error)}
            resizeMode="cover"
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.productTitle} numberOfLines={1}>
            {item?.title || 'No Title Provided'}
          </Text>
          <Text
            style={{color: '#777', fontSize: 13, marginBottom: 4}}
            numberOfLines={1}>
            {item?.description || 'No description'}
          </Text>
          <TouchableOpacity style={styles.sellerInfo} onPress={()=>
                navigation.navigate('ViewSellerProdile', {
                  id: item?.sellerId?.userInfo?.userName,
                })
              }>
            {item?.sellerId?.userInfo?.profileURL?.key ? (
              <Image
                source={{uri: `${AWS_CDN_URL}${item?.sellerId?.userInfo?.profileURL?.key}`}}
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
                  {item?.sellerId?.companyName?.charAt(0)|| 'S'}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.sellerName}>
              {item?.sellerId?.companyName || 'Unknown Seller'}
            </Text>
          </TouchableOpacity>
          <View style={styles.colorContainer}>
            {item?.discountPercent > 0 ? (
              <View style={styles.discountTag}>
                <Image
                  source={require('../../../assets/images/Discount.png')}
                  style={{height: 20, width: 20}}
                />
                <Text style={styles.discountText}>
                  {item?.discountPercent}% | offer
                </Text>
              </View>
            ) : (
              <Text>{''}</Text>
            )}
            <View style={{flexDirection: 'row', gap: 2, alignItems: 'center'}}>
              <View style={[styles.color, {backgroundColor: '#000000'}]} />
              <View style={[styles.color, {backgroundColor: '#FFD700'}]} />
              <View style={[styles.color, {backgroundColor: '#FF260D'}]} />
              <View style={[styles.color, {backgroundColor: '#FFBE9D'}]} />
              <Text style={{color: '#777', fontSize: 10}}>4+</Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            {/* {price != null && ( */}
            <Text style={styles.priceText}>₹{price}</Text>
            <Text style={{color: '#777', textDecorationLine: 'line-through'}}>
              ₹{mrp}
            </Text>
            {/* )} */}
          </View>
        </View>
        <View style={styles.leftContainer}>
          <View style={styles.leftButton}>
            <Text style={{color: '#fff', fontSize: 10}}>Only few left!</Text>
          </View>
          <TouchableOpacity onPress={onUnsave}>
            <AntDesign name="heart" size={11} color="red" />
          </TouchableOpacity>
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
    backgroundColor: '#313236',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    marginBottom: 10,
    // padding:10,
    // paddingHorizontal:10,
    shadowRadius: 10,
    elevation: 3,
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
    color: '#fff',
    textTransform: 'capitalize',
    fontSize: 10,
    // elevation:4,
    fontWeight: '600',
  },
  productImage: {
    width: '100%',
    height: '100%',
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
    borderRadius: 1000,  //10,
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
});

export default React.memo(WishListTab);
