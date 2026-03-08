import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ToastAndroid,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosInstance from '../../Utils/Api';
import LinearGradient from 'react-native-linear-gradient';
import {ArrowLeftCircle} from 'lucide-react-native';
import {AWS_CDN_URL} from '../../Utils/aws';
import {colors} from '../../Utils/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
//import { handleGoBack } from '../../Utils/dateUtils';
import { useDebouncedGoBack } from '../../Utils/useDebouncedGoBack';

const {width, height} = Dimensions.get('window');

const UpcomingLiveShows = ({navigation}) => {
  const handleGoBack = useDebouncedGoBack(() => navigation.goBack(), 500);
  
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
   const [refreshing, setRefreshing] = useState(false);
  // const [pagenation, setpageination] = useState({
  //   hasMore: true,
  //   limit: 20,
  //   currentPage: 0,
  // });

  // Mock API call - replace with your actual API endpoint
  const fetchUpcomingShows = async () => {
    try {
      // if (!pagenation?.hasMore) return;

      // if (pagenation.currentPage === 0) {
      //   setLoading(true);
      // }

      // Simulated API call - replace this with your actual API
      const response = await axiosInstance.get('/register-show/my-registrations');
      const data = response.data.data.shows;
       console.log(data)
      // setpageination(response.data.pagination);
      // Transform the mock data to match our show structure
      const transformedShows = data?.map((item, index) => ({
        _id: item._id,
        title: item.title,
        description: item.description,
        image: `${AWS_CDN_URL}${item?.thumbnailImage}`,
        host: {
          name: item.host.companyName,
          avatar: item?.sellerProfileURL?`${AWS_CDN_URL}${item?.sellerProfileURL}`: '',
        },
        isUpcoming: !item.isLive,
        status:
          index % 3 === 0 ? 'Notify' : index % 3 === 1 ? 'Pre-Bid' : 'Upcoming',
        viewers: Math.floor(Math.random() * 1000) + 100,
      }));

      //console.log(transformedShows[0]?.host.avatar)

       setShows(transformedShows);
    } catch (error) {
      console.error('Error fetching shows:', error);
      ToastAndroid.show('Failed to load upcoming shows', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUpcomingShows();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUpcomingShows();
  };

  const handleNotify = showId => {
    Alert.alert(
      'Notification Set',
      'You will be notified when this show goes live!',
    );
  };

  const handlePreBid = showId => {
    navigation.navigate('preBidding', {id: showId});
    // Alert.alert('Pre-Bid', 'Navigate to pre-bidding screen');
  };

  const renderShowItem = ({item, index}) => (
    <View
      style={[
        styles.showCard,
        index % 2 === 0 ? styles.leftCard : styles.rightCard,
      ]}>
      <Image source={{uri: item.image}}
      onError={(e)=>console.log(e.nativeEvent.error)}
      style={styles.showImage} />
      {/* {console.log(item)} */}
      {/* Overlay Content */}
      <View style={styles.overlay}>
        <View style={styles.topSection}>
          <View style={styles.hostInfo}>
           { item.host.avatar ? <Image source={{uri: item.host.avatar}} style={styles.hostAvatar} />:
              <View style={styles.sellerInitial}>
                <Text style={styles.sellerInitialText}>
                  {item?.host?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
           }
            <Text style={styles.hostName} numberOfLines={2}>
              {item.host.name}
            </Text>
          </View>

          <TouchableOpacity style={[styles.statusButton]}>
            <Text style={styles.statusText}>{'Upcoming'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.showDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.showTitle}>{item.title}</Text>
        <View style={styles.bottomSection}>
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: '#F7CE45'}]}
              onPress={() => handleNotify(item.id)}>
              {/* <Ionicons name="notifications-outline" size={16} color="#FFF" /> */}
              <Text style={[styles.actionText, {color: '#000'}]}>Notify</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePreBid(item._id)}>
              {/* <Ionicons name="hammer-outline" size={16} color="#FFF" /> */}
              <Text style={styles.actionText}>Pre-Bid</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Live indicator for upcoming shows */}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <ArrowLeftCircle color={'#fff'} size={24} />
          </TouchableOpacity>
          <LinearGradient  colors={['#B38728', '#FFD700']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.headerGradient}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Upcoming live shows</Text>
            </View>
          </LinearGradient>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFD700" />
          <Text style={styles.loadingText}>Loading shows...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}>
          <ArrowLeftCircle color={'#fff'} size={24} />
        </TouchableOpacity>
        <LinearGradient
               colors={['#B38728', '#FFD700']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.headerGradient}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Upcoming live shows</Text>
          </View>
        </LinearGradient>
        <View style={styles.headerSpacer} />
      </View>

      {/* Shows Grid */}
      <FlatList
        data={shows}
        renderItem={renderShowItem}
        keyExtractor={(item, index) => index.toString()}
        numColumns={2}
        contentContainerStyle={styles.showsList}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50 }}>
    <Text style={{ fontSize: 16, color: '#888' }}>
      No upcoming shows
    </Text>
  </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  header: {
    flexDirection: 'row',
    // marginTop: Platform.select({ios: 10, android: height * 0.01}),
    alignItems: 'center',
    gap: width * 0.1,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
    marginBottom: 10,
  },

  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 16,
  },
  showsList: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
  showCard: {
    width: (width - 36) / 2,
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 5,
    position: 'relative',
    backgroundColor: '#333',
    // backgroundColor:colors.SecondaryColor
  },
  leftCard: {
    marginRight: 6,
  },
  rightCard: {
    marginLeft: 6,
  },
  showImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    // backgroundColor:'red',
    padding: 7,
    justifyContent: 'space-between',
  },
  topSection: {
    // backgroundColor:'red',
    flexDirection: 'row',
    justifyContent: 'space-between',
    // alignItems: 'flex-start',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    // flex: 1,
    gap: 3,
    // justifyContent:'space-between'
  },
  hostAvatar: {
    width: 24,
    height: 24,
    backgroundColor: '#2C2C2E80',
    borderRadius: 12,
    // marginRight: 6,
  },
  hostName: {
    color: '#FFF',
    flexShrink: 2,
    width: 50,
    fontSize: 12,
    fontWeight: '500',
  },
  statusButton: {
    paddingHorizontal: 6,
    // paddingVertical: 4,
    height: 23,
    padding: 4,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#2C2C2E80',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomSection: {
    flex: 1,
    // backgroundColor:'red',
    justifyContent: 'flex-end',
  },
  showTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    position: 'absolute',
    top: 40,
    left: 5,
    right: 5,
    bottom: 0,
  },
  showDescription: {
    color: '#CCC',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    flex: 0.48,
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  upcomingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  upcomingText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },

  sellerInitial: {
    height: 20,
    width: 20,
    borderRadius: 10,
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInitialText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default UpcomingLiveShows;
