import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Feather from 'react-native-vector-icons/Feather';
import AuctionModal from './AuctionModal';
import { AWS_CDN_URL } from '../../../Utils/aws';

// const AWS_CDN_URL = 'https://yourcdnurl.com'; // Replace with actual base CDN path

const Prebid = ({productforbid,onOpen}) => {
	
	const item= productforbid;
  
    const preBidded = item?.isPreBidded

    return (
      <View style={styles.cardContainer}>
        <FastImage
          source={{
            uri: `${AWS_CDN_URL}${item?.thumbnailImageURL}`,
            priority: FastImage.priority.normal,
          }}
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
         // defaultSource={require('../../assets/placeholder.png')} // Add a placeholder image to prevent blank rendering
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <Text numberOfLines={2} style={styles.title}>
              👟 {item?.title}
            </Text>
          </View>

          <Text style={styles.subtitle}>Nike shoe</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              Reserve Price - ₹{item.reservePrice}
            </Text>
            {preBidded && (
              <Text style={styles.priceText}>
                Pre-bidded Price - ₹{item.preBidPrice}
              </Text>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.bidText}>{item.bids} Bids</Text>

            <TouchableOpacity onPress={onOpen} disabled={preBidded}>
            <View
              style={[styles.badge, preBidded ? styles.bidded : styles.prebid]}>
              <Text
                style={[
                  styles.badgeText,
                  preBidded && styles.badgeTextDark,
                ]}>
                {preBidded ? 'Pre-Bidded' : 'Pre-Bid'}
              </Text>
            </View>
			</TouchableOpacity>
          </View>
        </View>
      </View>
    );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 15,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#444',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
   // position: 'relative',
  },
  title: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
    paddingRight: 24,
  },
  subtitle: {
    color: '#FFF',
    fontSize: 13,
    marginTop: 2,
  },
  priceContainer: {
    marginTop: 6,
  },
  priceText: {
    color: '#FFD700',
    fontSize: 12,
  },
  footer: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidText: {
    color: '#CCC',
    fontSize: 12,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  prebid: {
    backgroundColor: '#999',
  },
  bidded: {
    backgroundColor: '#FFD700',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextDark: {
    color: '#000',
  },
});

export default React.memo(Prebid);
