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

const WonProducts = ({product, error}) => {
  const navigation = useNavigation();
  const item = product;
  // Lazy loading - Load more when user scrolls near the bottom
  // console.log(item)

  const imageUrl = `${AWS_CDN_URL}${item?.images?.[0]?.key}` || undefined;

  const price = item?.productPrice;
  const mrp = item?.MRP;
  const hasDiscount = mrp != null && price != null && mrp > price;
  const discountPercent = hasDiscount
    ? Math.round(((mrp - price) / mrp) * 100)
    : 0;
  // console.log(item.quantity)

  useEffect(() => {
    console.log('WonTab rendered:', product?._id);
  }, [product]);

  return (
      <TouchableOpacity
        onPress={() => {
          navigation.navigate('ProductDetails', {id: item?._id});
        }}
        >
       <View style={styles.card}>
      <Image
        source={{  
            uri:  'https://placehold.co/60x60/png'
        }}
       style={styles.productImage} />
      <View style={styles.cardContent}>
        <View style={styles.header}>
             {item?.sellerProfileURL ? (
                <Image
                  source={{uri:`${AWS_CDN_URL}${video?.sellerProfileURL}`}}
                  style={{height: 20, width: 20}}
                />
              ) : (
                <TouchableOpacity style={styles.sellerProfile}>
                  <Text
                    style={{
                      textTransform: 'capitalize',
                      color: '#fff',
                      fontSize: 10,
                    }}>
                    {item?.sellerCompanyName?.charAt(0)||'S'}
                  </Text>
                </TouchableOpacity>
              )}
          <Text style={styles.sellerName}>{item?.seller?.name || 'Seller'}</Text>
          <Text style={styles.status}>{item?.status || 'In Transit'}</Text>
        </View>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.price}>Final Bid – ₹{item.price}</Text>
        <TouchableOpacity style={styles.trackButton}>
          <Text style={styles.trackText}>Track order</Text>
        </TouchableOpacity>
      </View>
    </View>
      </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#00000',
    borderRadius: 12,
    marginVertical: 10,
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginBottom:10,
  },
  productImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  sellerName: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
    marginLeft: 3
  },
  status: {
    color: '#FFB703',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  price: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  trackButton: {
    backgroundColor: '#FFD700',
    alignSelf: 'flex-end',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  trackText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 13,
  },
    sellerProfile: {
    borderRadius: 20,
    height: 20,
    backgroundColor: '#435862',
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(WonProducts);
