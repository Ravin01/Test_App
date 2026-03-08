import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AWS_CDN_URL } from '../../../Utils/aws';
import { useNavigation } from '@react-navigation/native';


const BuyNowComponent = ({item,handleToggle}) => {
  const navigation=useNavigation();
  const imageUrl = item?.productId?.images?.[0]?.key ? `${AWS_CDN_URL}${item?.productId.images[0].key}` : null;
// console.log(item)
  
  return (
    <TouchableOpacity style={styles.buyNowCard} onPress={()=>navigation.navigate('ProductDetails',{id:item?.productId._id,type:'livestream'})}>
      <View style={styles.offerTag}>
        <Text style={styles.offerText}>{'only few left'}</Text>
      </View>
      {/* <TouchableOpacity style={styles.heartIcon}>
        <Ionicons name="heart-outline" size={20} color="#9CA3AF" />
      </TouchableOpacity> */}

      {imageUrl ? (
  <Image source={{ uri: imageUrl }} style={styles.sneakerImage} />
) : (
  <View style={[styles.sneakerImage, { justifyContent: 'center', alignItems: 'center' }]}>
    <Text style={{fontSize:10}}>No Img</Text>
  </View>
)}

      <Text style={styles.sneakerName} numberOfLines={1}>
        {item?.productId?.title}
      </Text>
      <Text style={styles.sneakerSubtitle} numberOfLines={1}>
        {item?.productId?.description}
      </Text>
      {/* <View style={styles.colorRow}>
        <View style={[styles.color, {backgroundColor: '#000000'}]} />
        <View style={[styles.color, {backgroundColor: '#FFD700'}]} />
        <View style={[styles.color, {backgroundColor: '#FF260D'}]} />
        <View style={[styles.color, {backgroundColor: '#FFBE9D'}]} />
        <Text style={styles.moreColors}>+4</Text>
      </View> */}
      <View style={styles.priceRow}>
        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>₹{item.productPrice}</Text>
          <Text style={styles.originalPrice}>{item.MRP}</Text>
        </View>
        {/* <Text style={styles.discount}>{item.discount}</Text> */}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buyNowCard: {
    backgroundColor: '#FAFAFA0A',
    borderRadius: 12,
    // padding: 16,
    marginBottom: 16,
    // width: '100%',
     flex: 1,
    margin: 3,
    // marginRight: 10,
    // position: 'relative',
  },
  offerTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  offerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  heartIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  sneakerImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#374151',
    borderRadius: 12,
        aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // marginTop: 24,
    marginBottom: 16,
  },
  sneakerName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  sneakerSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf:'flex-end',
    marginBottom: 12,
  },
  color: {
    width: 6,
    height: 6,
    padding: 3,
    borderRadius: 20,
  },
  moreColors: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  originalPrice: {
    color: '#ccc',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  discount: {
    color: '#10B981',
    fontSize: 12,
  },
});

export default BuyNowComponent;