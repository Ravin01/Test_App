// @ts-nocheck

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import {Radio, Calendar, Clock, Bookmark} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import { AWS_CDN_URL } from '../../../Utils/aws';

// Function to format date nicely
const formatShowDate = (dateString, timeString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const formattedDate = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return timeString ? `${formattedDate} - ${timeString}` : formattedDate;
};

// Separate component for seller info
const SellerInfo = React.memo(function SellerInfo({
  sellerUserName,
  sellerProfileURL,
  sellerCompanyName,
}) {
//   if (!sellerUserName) return null;
  const profile =sellerProfileURL? `${AWS_CDN_URL}${sellerProfileURL}`:'https://st4.depositphotos.com/15648834/23779/v/450/depositphotos_237795804-stock-illustration-unknown-person-silhouette-profile-picture.jpg';
  return (
    <View style={styles.sellerContainer}>
      {profile ? (
        <Image source={{uri: profile}} style={styles.sellerImage} />
      ) : (
        <View style={styles.sellerInitials}>
          <Text>{sellerUserName?.charAt(0).toUpperCase()|| 'S'}</Text>
        </View>
      )}
      <Text style={styles.sellerText}>
        {sellerUserName||'Seller'}
      </Text>
    </View>
  );
});


function Participated({show, error}) {
  const navigation = useNavigation();
  if (!show || error) {
    return null;
  }

  //console.log('shows', show);

  const getTimeLabel = dateTime => {
    const inputDate = new Date(dateTime);
    const now = new Date();

    const isSameDay = inputDate.toDateString() === now.toDateString();

    // Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = inputDate.toDateString() === tomorrow.toDateString();

    if (isSameDay) {
      const hours = inputDate.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHour = hours % 12 === 0 ? 12 : hours % 12;
      return `${formattedHour}${ampm}`;
    } else if (isTomorrow) {
      return 'Tomorrow';
    } else {
      return 'Upcoming';
    }
  };

  // console.log(show)
  const isLive = show?.isLive || show?.showStatus === 'live';
  const isUpcoming =
    show?.showStatus === 'upcoming' ? true : isLive ? null : false;

  // Handle button press actions
  const handlePress = () => {
    if (isUpcoming) {
      onSetReminderPress?.(show);
      navigation.navigate('LiveShowDetail', {id: show._id} as never);
    } else if (isLive) {
      onJoinPress?.(show);
      navigation.navigate('LiveScreen', {stream: show});
    } else {
      navigation.navigate('LiveShowDetail', {id: show._id} as never);
      onViewDetailsPress?.(show);
    }
  };

  return (
    <TouchableWithoutFeedback
      onStartShouldSetResponder={() => false}
      onMoveShouldSetResponder={() => false}
      onPress={() => navigation.navigate('LiveShowDetail', {id: show._id})}>
      <View style={styles.gridContainer}>
        <View style={styles.card}>
          <View style={styles.imageWrapper}>
            <FastImage
              source={{uri: `${AWS_CDN_URL}${show?.thumbnailImageURL}`}}
              defaultSource={{uri:'https://st4.depositphotos.com/15648834/23779/v/450/depositphotos_237795804-stock-illustration-unknown-person-silhouette-profile-picture.jpg'}}
              style={styles.image}
            />

            <View style={styles.topInfo}>
              <View
                style={[
                  styles.badge,
                  isLive ? styles.liveBadge : styles.upcomingBadge,
                ]}>
                {isLive ? (
                  <>
                    <Text style={styles.badgeText}>LIVE</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.badgeText}>
                      {getTimeLabel(show?.scheduledAt)}
                    </Text>
                  </>
                )}
              </View>

              {/* {isLive ? (
                <View style={{alignItems: 'center'}}>
                  <View
                    style={{
                      backgroundColor: '#FF3B30',
                      padding: 5,
                      borderRadius: 20,
                    }}>
                    <FontAwesome6 name="user-group" color="#fff" size={14} />
                  </View>
                  <Text
                    style={{fontSize: 13, fontWeight: '600', color: '#fff'}}>
                    10K
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    padding: 5,
                    borderRadius: 20,
                    backgroundColor: '#777',
                  }}>
                  <Bookmark color={'#fff'} size={20} />
                </View>
              )} */}
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {show?.title || 'No Title'}
            </Text>
            <SellerInfo
              sellerUserName={show?.sellerUserName}
              sellerProfileURL={show?.sellerProfileURL}
              sellerCompanyName={show?.sellerCompanyName}
            />
            {/* 
          <View style={styles.buttonContainer}>
            <ActionButton isUpcoming={isUpcoming} onPress={handlePress} />
          </View> */}
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flex: 1,
    margin: 12,
    borderRadius: 10,
    overflow: 'hidden',
    // borderWidth: 1,
    // borderColor: '#e1e1e1',
    // backgroundColor: 'white',
    marginBottom: 10,
    // Optimize shadow for performance
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: {width: 0, height: 1},
    shadowRadius: 3,
    elevation: 2,
  },
  card: {
    width: '100%',
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'relative',
    height: 230,
    backgroundColor: '#333',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  topInfo: {
    position: 'absolute',
    top: 10,
    right: 5,
    alignSelf:'center',
    left:5,
    flexDirection: 'row',
    width: '94%',
    justifyContent: 'flex-end',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadge: {
    backgroundColor: 'red',
    //height: 30,
  },
  upcomingBadge: {
    backgroundColor: '#777',
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cardBody: {
    padding: 5,
    position:'absolute',
    right:0,
    left:0,
    top:160,
    // bottom:100
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color:'#fff'
    // marginBottom: 5,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 5,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  sellerImage: {
    width: 20,
    height: 20,
    borderRadius: 15,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  sellerInitials: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d3d3d3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sellerText: {
    fontSize: 14,
    color:'#fff',
    textTransform:'capitalize',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 10,
  },
  button: {
    backgroundColor: 'red',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reminderButton: {
    backgroundColor: 'blue',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  detailsButton: {
    backgroundColor: 'gray',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
});

// Apply memo to the main component
const MemoizedParticipated = React.memo(Participated);

export default MemoizedParticipated;
