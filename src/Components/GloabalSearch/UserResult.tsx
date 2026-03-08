// components/search/UserResults.js
import React, {useCallback, useEffect, useContext} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
// import { useInView } from 'react-intersection-observer';
import {useNavigation} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { AWS_CDN_URL } from '../../Utils/aws';
import { useFollowApi } from '../../Utils/FollowersApi';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import { storeIcon } from '../../assets/assets';
import { AuthContext } from '../../Context/AuthContext';

const getUserInitials = userName => {
  if (!userName) return null;

  const alphanumericChars = userName.replace(/[^a-zA-Z0-9]/g, '');

  if (!alphanumericChars) return null;

  return alphanumericChars.substring(0, 2).toUpperCase();
};

const UserResults = ({user, error}) => {
  const { user: loggedInUser } = useContext(AuthContext);
  const {followUser,unfollowUser, checkFollowStatus} =
    useFollowApi();
  const formatTotalCount = useCallback(count => {
    if (count >= 1000000) {
      const formatted = (count / 1000000).toFixed(1);
      return formatted.endsWith('.0')
        ? (count / 1000000).toFixed(0) + 'M'
        : formatted + 'M';
    } else if (count >= 100000) {
      const formatted = (count / 100000).toFixed(1);
      return formatted.endsWith('.0')
        ? (count / 100000).toFixed(0) + 'L'
        : formatted + 'L';
    } else if (count >= 1000) {
      const formatted = (count / 1000).toFixed(1);
      return formatted.endsWith('.0')
        ? (count / 1000).toFixed(0) + 'k'
        : formatted + 'k';
    } else {
      return count?.toString();
    }
  }, []);
// console.log(user)
  const navigation = useNavigation();
  const handleUserClick = userName => {
    if (!userName) {
      console.warn('Cannot navigate: user has no userName.');
      return;
    }
    
    // Check if the clicked user is the logged-in user (own profile)
    const isOwnProfile = loggedInUser?.userName === userName;
    
    if (isOwnProfile) {
      // Navigate to own profile screen in the bottom tab
      console.log('Navigating to own profile: AboutUserProfile');
      (navigation as any).navigate('bottomtabbar', {
        screen: 'HomeTabs',
        params: {
          screen: 'profile'
        }
      });
    } else {
      // Navigate to other user's profile
      console.log('Navigating to other user profile: ViewSellerProdile');
      // ✅ FIX: Encode userName to handle special characters like #, *, etc.
      const encodedUserName = encodeURIComponent(userName);
      (navigation as any).navigate('ViewSellerProdile', {id: userName});
    }
  };

  const avatarUrl =user?.profileURL && `${AWS_CDN_URL}${user?.profileURL}` || undefined;
  const isSeller = user?.role === 'seller';
  // Display company name for sellers, userName for regular users
  const displayName = isSeller 
    ? (user?.companyName || user?.userName || 'Unnamed Seller')
    : (user?.name || user?.userName || 'Unnamed User');
  const userInitials = getUserInitials(user?.userName);
//  console.log('user',user)
  return (
    <View >
      <TouchableOpacity
        key={user?._id}
        onPress={() => handleUserClick(user?.userName)}>
        <LinearGradient
         // colors={['#FAFAFA4D', '#1F1F1F00']}
          colors={['#1F1F1F00', '#1F1F1F00']}
          start={{ x: 0, y: 1 }}    // Top
          end={{ x: 1, y: 0 }}
          style={[styles.userCard, user?.userName ? styles.clickable : null]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {avatarUrl ? (
                <Image
                  source={{uri: avatarUrl}}
                  style={styles.avatarImage}
                  defaultSource={{uri:'https://st4.depositphotos.com/15648834/23779/v/450/depositphotos_237795804-stock-illustration-unknown-person-silhouette-profile-picture.jpg'}}
                  onError={() => {
                    // Fallback to initials if image fails to load
                  }}
                />
              ) : user?.role ==='seller'? (<Image style = {styles.avatarImage1} source={{uri:storeIcon}} />):null}

              {!avatarUrl && userInitials && user?.role !=='seller'? (
                
                  <LinearGradient
                  style={styles.initialsFallback}
                                  colors={['#ffd700', '#fced9c', '#FF8453']}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}>
                  <Text style={styles.initialsText}>{userInitials}</Text>
                  </LinearGradient>
              
              ) : null}
            </View>
          </View>
          <View className='flex-row justify-between items-center ' style={{width:'80%'}}>
             <View className='gap-1'>
                <Text className='font-bold text-lg text-white shrink-1' numberOfLines={2}>{displayName}</Text>
                <Text className='font-bold text-sm text-[#ccc] shrink-1' style={{color:'#ccc'}} numberOfLines={1}>@{user?.userName}</Text>
            <View className='flex flex-row items-center gap-2'>
              {/* <Text className='text-[12px] text-[#777]'>{formatTotalCount(user?.followerCount)} Followers</Text> */}
             {user?.role=="seller"&& <View style={{backgroundColor:'rgba(247, 206, 69, 0.2)', padding:2,borderRadius:10,paddingHorizontal:7}}>

              <Text style={[styles.countText,{color:'rgba(247, 206, 69, 1)',}]}>{user?.role}</Text>
              </View>}
            </View>          
            </View>

            {/* <View style={{alignItems: 'center'}}>
              <Text style={styles.countText}>10K</Text>
              <Text style={styles.followText}>Followers</Text>
            </View> */}
           
            <TouchableOpacity style={styles.followsButton}  onPress={() => handleUserClick(user?.userName)}>
              {/* <Text style={{fontSize: 12, color: '#000'}}>+ Follow</Text> */}
              {/* <ArrowRight/> */}
              <ChevronRight color={'#777'} size={30}/>
            </TouchableOpacity>
            {/* </View> */}
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error.message || 'Failed to load users.'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // paddingHorizontal: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    // backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,

    borderColor: '#FCED9C',
    borderWidth: 0.2,
  },
  clickable: {
    cursor: 'pointer',
  },
  avatarContainer: {
    marginRight: 6,
    borderRadius: 40,
    borderColor: '#FCED9C',
    borderWidth: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3333',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarImage1: {
    width: '80%',
    height: '90%',
    resizeMode: 'contain',
  },
  initialsFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7cf4b',  //'#333',
    overflow: 'hidden',
  },
  initialsText: {
    color:  '#000',  //'#f7cf4b',
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent:'space-between',
    // gap: 7,
    width:'80%'
  },
  followText: {
    color: '#777',
    fontSize: 10,
  },
  followButton: {
    backgroundColor: '#FDD122',
    padding: 5,
    borderRadius: 15,
    paddingHorizontal:6,
    // height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    // marginLeft: 10,
  },
  countText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  displayName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#fff',
    flexShrink: 1,
    // width: '40%',
  },
  userName: {
    fontSize: 14,
    color: '#666',
  },
  loadMoreContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    color: '#888',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  errorText: {
    color: 'red',
  },
});

export default UserResults;
