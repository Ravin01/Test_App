import React, {useState, useEffect, useContext, useMemo} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import { Bookmark} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import {AWS_CDN_URL} from '../../Utils/aws';
import {colors,overlay} from '../../Utils/Colors';
import api from '../../Utils/Api';
import { formatFollowerCount } from '../../Utils/dateUtils';
import { AuthContext } from '../../Context/AuthContext';
import { RegisterEventEmitter, ShowRegisteredPayload } from '../../Utils/RegisterEventEmitter';

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
  
    const navigation = useNavigation();
  if (!sellerUserName) return null;
  const profile = `${AWS_CDN_URL}${sellerProfileURL}`;
  return (
    
    <TouchableOpacity style={styles.sellerContainer} onPress={()=>navigation.navigate('ViewSellerProdile', {id: sellerUserName})}>
      {profile ? (
        <Image source={{uri: profile}} style={styles.sellerImage} />
      ) : (
        <View style={styles.sellerInitials}>
          <Text>{sellerUserName.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.sellerText}>{sellerUserName}</Text>
    </TouchableOpacity>
  );
});

function ShowResults({
  show,
  error,
}) {
  const navigation = useNavigation();
  const { user }: any = useContext(AuthContext);


  if (!show || error) {
    return null;
  }

//  console.log('Rendering ShowResult for show ID:', show);

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

  
  const isLive = show?.isLive || show?.showStatus === 'live';
  // console.log(show)
  const isUpcoming =
    show?.showStatus === 'upcoming' ? true : isLive ? null : false;

  const [isRegistered, setIsRegistered] = useState(show?.isRegistered)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationLoading, setRegistrationLoading] = useState(true)

  // Check if current user is the show owner
  const isOwnShow = useMemo(() => {
    if (!user || !show) return false;
    // Check multiple possible seller ID fields
    return user._id === show.sellerId || 
           user._id === show.hostId || 
           user.userName === show.sellerUserName;
  }, [user, show]);

  //console.log('show status', show?.showStatus);

  const handleRegister = async () => {
    if(show?.showStatus !== 'created'){
      ToastAndroid.show('Registration time for this show over', ToastAndroid.SHORT);
      return
    }

    if (isRegistering) return;

    // Prevent sellers from registering to their own shows
    if (isOwnShow) {
      ToastAndroid.show(
        'You cannot register for your own show',
        ToastAndroid.SHORT,
      );
      return;
    }

    setIsRegistering(true)

    try {
      const response = await api.post(`register-show/${show._id}/register`);

      if (response.data.status) {
       setIsRegistered(true)
        ToastAndroid.show('Successfully registered!', ToastAndroid.SHORT);
        
        // ✅ Emit registration event for cross-screen updates
        RegisterEventEmitter.emitShowRegistered({
          showId: show?._id,
          userId: user?._id,
          registeredAt: new Date().toISOString(),
          newCount: (show?.registrationCount || 0) + 1
        });
      } else {
        ToastAndroid.show(response.data.message || 'Registration failed', ToastAndroid.LONG);
      }
    } catch (error) {
      console.warn('Registration error:', error);
      if (error.response?.status === 400 && error.response.data?.message?.includes('already registered')) {
        setIsRegistered(true)
        ToastAndroid.show('Already registered.', ToastAndroid.SHORT);
        
        // ✅ Emit registration event even for "already registered" case
        RegisterEventEmitter.emitShowRegistered({
          showId: show?._id,
          userId: user?._id,
          registeredAt: new Date().toISOString(),
          newCount: show?.registrationCount || 0
        });
      } else {
        ToastAndroid.show('An error occurred during registration.', ToastAndroid.LONG);
      }
    } finally {
       setIsRegistering(false)
    }
  };

  // ✅ Listen for show registration events to update UI in real-time
  useEffect(() => {
    if (!show?._id) return;

    const handleShowRegistered = (payload: ShowRegisteredPayload) => {
      // Only update if this is the same show
      if (payload.showId === show._id) {
        console.log('📨 [ShowResult] Received registration event for show:', payload.showId);
        
        // Update registration state if the current user registered
        if (payload.userId === user?._id) {
          console.log('✅ [ShowResult] Current user registered, updating UI');
          setIsRegistered(true);
        }
      }
    };

    // Subscribe to registration events
    const subscription = RegisterEventEmitter.onShowRegistered(handleShowRegistered);

    // Cleanup subscription on unmount
    return () => {
      subscription.remove();
    };
  }, [show?._id, user?._id]);

   // Check registration status when component mounts - only for upcoming shows
    // useEffect(() => {
    //   const checkRegistrationStatus = async () => {
    //     // Only check registration for upcoming shows
    //     if (!show._id || isLive || show.showStatus === "live") {
    //       setRegistrationLoading(false)
    //       return
    //     }
  
    //     try {
    //       const response = await api.get(`register-show/${show._id}/check-registration`)
    //       if (response.data.status) {
    //         setIsRegistered(response.data.data.isRegistered)
    //       }
    //     } catch (error) {
    //       console.error('Error checking registration status:', error)
    //     } finally {
    //       setRegistrationLoading(false)
    //     }
    //   }
  
    //   checkRegistrationStatus()
    // }, [show._id, isLive, show.showStatus])


  // Handle button press actions (already commented)
  // const handlePress = () => {
  //   if (isUpcoming) {
  //     onSetReminderPress?.(show);
  //     navigation.navigate('LiveShowDetail', {id: show._id} as never);
  //   } else if (isLive) {
  //     onJoinPress?.(show);
  //     navigation.navigate('LiveScreen', {stream: show});
  //   } else {
  //     navigation.navigate('LiveShowDetail', {id: show._id} as never);
  //     onViewDetailsPress?.(show);
  //   }
  // };
  // console.log(`https://d2jp9e7w3mhbvf.cloudfront.net/${show?.thumbnailImage}`)
  // console.log('Show Results:', show);
  return (
    <TouchableWithoutFeedback
      onStartShouldSetResponder={() => false}
      onMoveShouldSetResponder={() => false}
      onPress={() =>{
        if(show?.isLive){
           navigation.navigate('LiveScreen', {stream: show})
        }
      else{
          // ToastAndroid.show('This show is not live yet', ToastAndroid.SHORT);
          navigation.navigate('LiveScreen', {stream: show})
      }
      }}>
      <View style={styles.gridContainer}>
        <View style={styles.card}>
          <View style={styles.imageWrapper}>
            <FastImage
              source={{
                uri: `${AWS_CDN_URL}${show?.thumbnailImage}`,
              }}
              style={styles.image}
            />
          </View>

          <View style={overlay.cardOverlay}>
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

              {isLive ? (
                <View style={{alignItems: 'center'}}>
                  <View
                    style={{
                      backgroundColor: '#D92D20',
                      padding: 5,
                      borderRadius: 20,
                    }}>
                    <FontAwesome6 name="user-group" color="#fff" size={14} />
                  </View>
                  <Text
                    style={{fontSize: 11, fontWeight: '600', color: '#fff'}}>
                   {/* {formatFollowerCount(show?.viewerCount)} */}
                   {'Join'}
                  </Text>
                </View>
              ) : isOwnShow ? (
                <TouchableOpacity 
                  style={[styles.RegisterButton, styles.ownShowButton]} 
                  disabled={true}>
                  <Text style={[styles.RegisterText, styles.ownShowText]}>
                    Your Show
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={handleRegister} 
                  style={styles.RegisterButton}
                  disabled={isRegistering || isRegistered}>
                  {isRegistering ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={[styles.RegisterText, {marginBottom:0}]}>
                      {isRegistered ? 'Registered' : 'Register'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
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
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flex: 1,
    margin: 3,
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
    alignSelf: 'center',
    left: 5,
    flexDirection: 'row',
    width: '95%',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 8,
    // paddingVertical: 4,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveBadge: {
    backgroundColor: '#FF3B30',
    height: 20,
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
    position: 'absolute',
    right: 0,
    left: 0,
    top: 160,
    // bottom:100
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
    textTransform: 'capitalize',
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
    fontSize: 12,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
    textTransform: 'capitalize',
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

  RegisterText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 0,
  },

  RegisterButton: {
    marginBottom: 0,
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  ownShowButton: {
    backgroundColor: '#444',
    borderColor: '#666',
    borderWidth: 1,
  },

  ownShowText: {
    color: '#999',
  },
  
});

// Apply memo to the main component
const MemoizedShowResults = React.memo(ShowResults);

export default MemoizedShowResults;
