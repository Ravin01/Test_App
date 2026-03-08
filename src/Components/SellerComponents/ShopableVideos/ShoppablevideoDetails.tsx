import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
  ScrollView,
  Switch,
  ToastAndroid,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Fontisto from 'react-native-vector-icons/Fontisto';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import axiosInstance from '../../../Utils/Api';
import {AWS_CDN_URL} from '../../../Utils/aws';
import LinearGradient from 'react-native-linear-gradient';
import {
  ArrowLeftCircle,
  Eye,
  Heart,
  Info,
  Play,
  Edit3,
} from 'lucide-react-native';

import {colors} from '../../../Utils/Colors';
import ToggleSwitch from 'toggle-switch-react-native';
import {shareUrl} from '../../../../Config';
import { SafeAreaView } from 'react-native-safe-area-context';

const {width, height} = Dimensions.get('window');
const COLORS = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceHighlight: '#2A2A2A',
  primary: '#BB86FC',
  accent: '#03DAC6',
  text: '#E1E1E1',
  textSecondary: '#A0A0A0',
  error: '#CF6679',
  success: '#4CAF50',
  divider: '#323232',
  yellow: '#FFD700',
  red: '#FF4444',
};

const ShoppableVideoDetail = ({route, navigation}) => {
  const {id} = route.params;
  const [video, setVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');

    const fetchVideoDetails = async () => {
      try {
        const res = await axiosInstance.get(`/shoppable-videos/${id}`);
        const videoData = res.data.data;
        setVideo(videoData);

        // console.log(`${AWS_CDN_URL}${videoData?.masterPlaylistKey || videoData?.originalVideoBlobName}`)
        setVideoUrl(
          `${AWS_CDN_URL}${
            videoData?.masterPlaylistKey || videoData?.originalVideoBlobName
          }`,
        );
        setThumbnailUrl(videoData.thumbnailURL);
        setProducts(videoData.productsListed);
      } catch (error) {
        console.error('Error fetching video details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoDetails();
  }, [id]);
  // console.log(video)
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current?.load();
    }
  }, [videoUrl]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Loading your video experience...</Text>
      </View>
    );
  }
  // console.log(video)
  const handleVisibilityToggle = async (videoId, currentVisibility) => {
    const originalProducts = [...products];
    try {
      const newVisibility =
        currentVisibility === 'public' ? 'private' : 'public';
      // setVisibilityLoading(prev => ({...prev, [videoId]: true}));

      // Optimistically update UI
      setVideo(prev =>
        prev._id === videoId ? {...prev, visibility: newVisibility} : prev,
      );
      const res = await axiosInstance.put(
        `/shoppable-videos/${videoId}/visibility`,
        {
          visibility: newVisibility,
        },
      );

      if (res?.data?.status) {
        ToastAndroid.show(
          `Visibility updated to ${newVisibility}`,
          ToastAndroid.SHORT,
        );

        // Optionally update from server response
        setProducts(prev =>
          prev.map(video =>
            video._id === videoId ? {...video, ...res.data.data} : video,
          ),
        );
      } else {
        ToastAndroid.show('Failed to update visibility', ToastAndroid.SHORT);
        setProducts(originalProducts); // rollback
      }
    } catch (err) {
      console.log('Visibility error:', err.response?.data || err.message);
      setProducts(originalProducts); // rollback
      ToastAndroid.show('Something went wrong', ToastAndroid.SHORT);
    } finally {
      // setVisibilityLoading(prev => ({...prev, [videoId]: false}));
    }
  };
  const handledelete = async id => {
    if (!id) {
      console.log('No ID provided for deletion');
      return;
    }
    console.log('Deleting product with ID:', id);
    setLoading(true);
    try {
      await axiosInstance.delete(`/shoppable-videos/${id}`);
      navigation.goBack();
      // fetchProducts();
      ToastAndroid.show('Shoppable Video Deleted. ', ToastAndroid.SHORT);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };
  const shareProfile = async () => {
    try {
      // const message = `Check out ${item?.title}'s

      const link = `${shareUrl}reels/${video?._id}`;

      const result = await Share.share({
        message: ` ${link}`,
        url: link, // iOS uses this
      });

      if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };
  const sizeInMB = video?.originalFileSize / (1024 * 1024);

  const renderHeader = () => (
    <>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        {videoUrl ? (
          <Video
            source={{uri: videoUrl}}
            style={styles.videoPlayer}
            poster={thumbnailUrl}
            posterResizeMode="cover"
            resizeMode="stretch"
            onError={e => console.log('Error loading video:', e)}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Icon name="video-off" size={40} color={COLORS.textSecondary} />
            <Text style={styles.noVideoText}>Video not available</Text>
          </View>
        )}

        {/* Play button overlay */}
        <View style={styles.videoActionsOverlay}>
          <TouchableOpacity
            style={styles.iconButtonOverlay}
            onPress={() => setIsVideoPlaying(true)}>
            <Fontisto name="play" size={20} color={colors.primaryButtonColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Video Title and Upload Time */}
      <View style={styles.videoHeader}>
        <Text style={styles.videoTitle}>
          {video?.title || 'Summer Collection Launch Video'}
        </Text>
        <Text style={styles.videoMeta}>
          Uploaded{' '}
          {new Date(video?.createdAt).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }) || '2 hours ago'}
        </Text>
      </View>

      {/* Public/Private Toggle */}
      <View style={styles.visibilityContainer}>
        <View style={styles.visibilityRow}>
          <Icon name="globe" size={20} color={COLORS.yellow} />
          <Text style={styles.visibilityText}>{video?.visibility}</Text>
        </View>
        <ToggleSwitch
          isOn={video?.visibility == 'public' ? true : false}
          onColor={COLORS.yellow}
          // trackColor={{false: '#767577', true: COLORS.yellow}}
          // thumbColor={isPublic ? '#fff' :COLORS.yellow}
          onToggle={() => handleVisibilityToggle(video?._id, video?.visibility)}
          // value={isPublic}
        />
      </View>

      {/* Performance Section */}
      <View style={styles.performanceSection}>
        <Text style={[styles.sectionTitle, {marginBottom: 10}]}>
          Performance
        </Text>
        <View style={styles.metricsContainer}>
          <View style={[styles.metricCard, {backgroundColor: '#EFF6FF'}]}>
            <View style={styles.metricIconContainer}>
              <Eye size={24} color="#4285F4" />
            </View>
            <Text style={[styles.metricNumber, {color: '#2563EB'}]}>1,247</Text>
            <Text style={[styles.metricLabel, {color: '#2563EB'}]}>Views</Text>
          </View>
          <View style={[styles.metricCard, {backgroundColor: '#FEF2F2'}]}>
            <View style={styles.metricIconContainer}>
              <Fontisto name="heart" size={24} color="#DC2626" />
            </View>
            <Text style={[styles.metricNumber, {color: '#DC2626'}]}>89</Text>
            <Text style={[styles.metricLabel, {color: '#DC2626'}]}>Likes</Text>
          </View>
        </View>
      </View>

      {/* Video Details Section */}
      <View style={styles.videoDetailsSection}>
        <View style={styles.sectionHeader}>
          <Info color={COLORS.yellow} size={20} />
          <Text style={styles.sectionTitle}>Video Details</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={[styles.detailValue, {color: COLORS.success}]}>
            {video?.processingStatus}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Visibility</Text>
          <Text style={styles.detailValue}>{video?.visibility}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{video?.durationTook}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>File Size</Text>
          <Text style={styles.detailValue}>{sizeInMB.toFixed(2) + ' MB'}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity 
        style={styles.analyticsButtonPrimary}
        onPress={() => navigation.navigate('ShopableAnalyse', { videoId: video?._id })}
      >
        <Icon name="bar-chart-2" color="#000" size={20} />
        <Text style={styles.analyticsButtonPrimaryText}>View Analytics</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity style={styles.editButton}>
        <Edit3 color="#000" size={20} />
        <Text style={styles.editButtonText}>Edit Video</Text>
      </TouchableOpacity> */}

      <TouchableOpacity style={styles.shareButton} onPress={shareProfile}>
        <Fontisto name="share-a" color="#fff" size={20} />
        <Text style={styles.shareButtonText}>Share Video</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handledelete(video?._id)}>
        <MaterialIcons name="delete" color="#fff" size={20} />
        <Text style={styles.deleteButtonText}>Delete Video</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.mainContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <ArrowLeftCircle size={30} color="white" />
        </TouchableOpacity>
        <LinearGradient
          colors={['#B38728', '#FFD700']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.headerGradient}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Video details</Text>
          </View>
        </LinearGradient>
      </View>
      <ScrollView style={styles.scrollContainer}>{renderHeader()}</ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
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
  backButton: {
    padding: 5,
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.text,
  },
  videoContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    height: 200,
  },
  videoPlayer: {
    width: '100%',
    // height: '100%',
    aspectRatio: 16 / 9,
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  videoActionsOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -25}, {translateY: -25}],
  },
  iconButtonOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 50,
    justifyContent: 'center',
    padding: 15,
    alignItems: 'center',
  },
  videoHeader: {
    marginBottom: 16,
  },
  videoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  videoMeta: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  visibilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderRadius: 10,
    backgroundColor: '#333',
    padding: 10,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visibilityText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  performanceSection: {
    marginBottom: 24,
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    // marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  metricIconContainer: {
    marginBottom: 12,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  videoDetailsSection: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent:'center',
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 8,
  },
  editButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 12,
    gap: 8,
  },
  shareButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  analyticsButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 8,
  },
  analyticsButtonPrimaryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShoppableVideoDetail;
