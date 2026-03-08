import React, { useState, useEffect } from 'react';
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
import { ArrowLeftCircle, CarTaxiFront, ShoppingCart } from 'lucide-react-native';
import { AWS_CDN_URL } from '../../Utils/aws';
import { colors } from '../../Utils/Colors';
import AuctionModal from '../MyActivity/Auction/AuctionModal';
import { SafeAreaView } from 'react-native-safe-area-context';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const { width, height } = Dimensions.get('window');

const PreBiddingScreens = ({ navigation, route }) => {
  const { id } = route.params || "";
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [auctionModel, setAuctionModel] = useState(false);
  const [pagenation, setpageination] = useState({
    hasMore: true,
    limit: 20,
    currentPage: 0,
  });

  const fetchUpcomingShows = async () => {
    try {
      // if (!pagenation?.hasMore) return; 

      // if (pagenation.currentPage === 0) {
      //   setLoading(true);
      // }
      // console.log(id)
      setLoading(true)
      const response = await axiosInstance.get(`/shows/get/${id}`);
      const data = response.data.data;

      setShows(data?.auctionProducts);
    } catch (error) {
      console.log('Error fetching shows:', error.response.data);
      ToastAndroid.show(error.response.data.message,ToastAndroid.SHORT);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUpcomingShows();
  }, []);

  
/*
RESPONSIVE DESIGN INTEGRATION GUIDE:
1. Add this inside your component function:
   const { theme } = useTheme();
   const { styles: responsiveStyles } = useResponsiveScreen();

2. Replace hardcoded values:
   - fontSize: 16 → fontSize: theme.typography.medium
   - padding: 20 → padding: theme.spacing.lg
   - margin: 10 → margin: theme.spacing.sm
   - backgroundColor: '#FFFFFF' → backgroundColor: theme.colors.background

3. Use responsive components:
   - <Text> → <ResponsiveText variant="body">
   - <TouchableOpacity> (buttons) → <ResponsiveButton>
   - <TextInput> → <ResponsiveInput>

4. Add accessibility:
   - Add {...getAccessibilityProps('Label', 'Description', 'button')} to touchable elements

5. Use responsive styles:
   - style={responsiveStyles.container} for main containers
   - style={responsiveStyles.title} for titles
   - style={responsiveStyles.primaryButton} for primary buttons
*/

const handleRefresh = () => {
    setRefreshing(true);
    fetchUpcomingShows();
  };

  const handlePreBid = (showId) => {
    // Alert.alert('Pre-Bid', 'Navigate to pre-bidding screen');
    setAuctionModel(!auctionModel)
  };

  const renderProductItem = ({ item }) =>{
    const imageUrl = item?.images?.[0]?.key ? `${AWS_CDN_URL}${item?.images[0].key}` : undefined;
    return (
    <View style={styles.showCard}>
      <Image source={{ uri:imageUrl }} style={styles.showImage} />
      
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.showTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.startingBid}>
            Starting bid: <Text style={styles.bidAmount}>₹{item.startingBid || '200'}</Text>
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handlePreBid(item.id)}
        >
          <Text style={styles.actionText}>Pre-Bid</Text>
        </TouchableOpacity>
      </View>
    </View>
  )}
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                       <ArrowLeftCircle color={'#fff'} size={24}/>
                     </TouchableOpacity>
          <LinearGradient
               colors={['#B38728', '#FFD700']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Products</Text>
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
      <AuctionModal isVisible={auctionModel} onClose={()=>setAuctionModel(false)} onSubmit={()=>console.log('prebidding success')}/>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                       <ArrowLeftCircle color={'#fff'} size={24}/>
                     </TouchableOpacity>
        <LinearGradient
               colors={['#B38728', '#FFD700']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Products</Text>
          </View>
        </LinearGradient>
        <View style={styles.headerSpacer} />
      </View>

      {/* Products List */}
      <FlatList
        data={shows}
        renderItem={renderProductItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.showsList}
        refreshing={refreshing}
        ListEmptyComponent={<View style={styles.emptyContainer}>
          <ShoppingCart color={'#777'}/>
            <Text style={styles.emptyText}>There is no Auction products in this show</Text>
        </View>}
        onRefresh={handleRefresh}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  emptyContainer:{
    // flex:1,
    // height:'100%',
    alignItems:'center',
    gap:10,
    marginTop:200
  },
  emptyText:{
    color:'#777',
    flexShrink:2,
    
  },
  header: {
    // padding:10,
    flexDirection: 'row',
      // marginTop: Platform.select({ ios: 10, android: height * 0.01 }),
      alignItems: 'center',
      gap: width * 0.10,
      paddingVertical: height * 0.01,
      paddingHorizontal: width * 0.02,
      marginBottom: 10
  },
  backButton:{
    marginLeft:20,
  },
  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '50%',
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
    padding: 16,
  },
  showCard: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  showImage: {
    width: 60,
    height: 60,
    backgroundColor:'#777',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  textContainer: {
    flex: 1,
  },
  showTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  startingBid: {
    color: '#CCC',
    fontSize: 14,
  },
  bidAmount: {
    color: '#FFF',
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  actionText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});
export default PreBiddingScreens