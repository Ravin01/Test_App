/* eslint-disable react/react-in-jsx-scope */
import {
  FlatList,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import {useContext, useState} from 'react';

import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { X } from 'lucide-react-native';
import { AWS_CDN_URL } from '../../../Utils/aws';
import axiosInstance from '../../../Utils/Api';
import { Toast } from '../../../Utils/dateUtils';
import { AuthContext } from '../../../Context/AuthContext';

const {width: screenWidth} = Dimensions.get('window');

const ViewReview = ({reviews}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
const {user}=useContext(AuthContext)
  const renderStars = rating => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <FontAwesome
            key={`star-${i}`}
            name="star"
            size={12}
            color="#FBBF24"
            style={styles.starIcon}
          />,
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <FontAwesome
            key={`star-${i}`}
            name="star-half-o"
            size={12}
            color="#FBBF24"
            style={styles.starIcon}
          />,
        );
      } else {
        stars.push(
          <FontAwesome
            key={`star-${i}`}
            name="star-o"
            size={12}
            color="#FBBF24"
            style={styles.starIcon}
          />,
        );
      }
    }

    return stars;
  };

  const openImageModal = (images, index) => {
    setSelectedImages(images);
    setSelectedImageIndex(index);
    setIsImageModalVisible(true);
  };

  const closeImageModal = () => {
    setIsImageModalVisible(false);
    setSelectedImages([]);
    setSelectedImageIndex(0);
  };

  const renderReviewImages = (images) => {
    if (!images || images.length === 0) return null;

    const displayImages = images.slice(0, 4);
    const remainingCount = images.length - 4;

    return (
      <View style={styles.imagesContainer}>
        {displayImages.map((imageKey, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.imageWrapper,
              index === 3 && remainingCount > 0 && styles.lastImageWrapper,
            ]}
            onPress={() => openImageModal(images, index)}
          >
            <Image
              source={{uri: `${AWS_CDN_URL}${imageKey}`}}
              style={styles.reviewImage}
              resizeMode="cover"
            />
            {index === 3 && remainingCount > 0 && (
              <View style={styles.imageOverlay}>
                <Text style={styles.overlayText}>+{remainingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderImageModal = () => {
    return (
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedImageIndex + 1} of {selectedImages.length}
            </Text>
            <TouchableOpacity onPress={closeImageModal} style={styles.closeButton}>
                <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{x: selectedImageIndex * screenWidth, y: 0}}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setSelectedImageIndex(index);
            }}
          >
            {selectedImages.map((imageKey, index) => (
              <View key={index} style={styles.modalImageContainer}>
                <Image
                  source={{uri: `${AWS_CDN_URL}${imageKey}`}}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <View style={styles.imageIndicator}>
              {selectedImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicatorDot,
                    index === selectedImageIndex && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day; // Approximation
    const year = 365 * day; // Approximation

    if (diffInMs < minute) {
      return "Just now";
    } else if (diffInMs < hour) {
      const minutes = Math.floor(diffInMs / minute);
      return `${minutes}m ago`;
    } else if (diffInMs < day) {
      const hours = Math.floor(diffInMs / hour);
      return `${hours}h ago`;
    } else if (diffInMs < week) {
      const days = Math.floor(diffInMs / day);
      return `${days}d ago`;
    } else if (diffInMs < month) {
      const weeks = Math.floor(diffInMs / week);
      return `${weeks}w ago`;
    } else if (diffInMs < year) {
      const months = Math.floor(diffInMs / month);
      return `${months}mo ago`;
    } else {
      const years = Math.floor(diffInMs / year);
      return `${years}y ago`;
    }
  };

  const renderReview = ({item}) => {
    // console.log(user)
    return (
      <View style={styles.reviewCard}>
        {/* User Info Header */}
        <View style={styles.reviewHeader}>
          <View style={styles.userInfo}>
            <Image
              source={{
                uri: user?.profileURL?.key
                  ? `${AWS_CDN_URL}${user.profileURL.key}`
                  : 'https://i.pravatar.cc/100',
              }}
              style={styles.userAvatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {user?.name || 'Anonymous User'}
              </Text>
              <View style={styles.ratingTimeContainer}>
                <View style={styles.starsContainer}>
                  {renderStars(item.rating)}
                </View>
                <Text style={styles.timeText}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Review Content */}
        <Text style={styles.reviewContent}>{item.content}</Text>

        {/* Review Images */}
        {renderReviewImages(item.images)}

        {/* Helpful Actions */}
        {/* <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={()=> handleFeedback(item._id, 'helpful')}>
            <FontAwesome name="thumbs-up" size={12} color="#666" />
            <Text style={styles.actionText}>Helpful ({formatFollowerCount(item?.helpfulCount)})</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionButton} onPress={()=> handleFeedback(item._id, 'not_helpful')}>
            <FontAwesome name="flag" size={12} color="#666" />
            <Text style={styles.actionText}>Report ({formatFollowerCount(item?.notHelpfulCount)})</Text>
          </TouchableOpacity>
        </View> */}
      </View>
    );
  };

  const renderSeeMoreButton = () => {
    if (reviews.length <= 1) return null;
    
    return (
      <TouchableOpacity 
        style={styles.seeMoreButton}
        onPress={() => setShowAllReviews(true)}
      >
        <Text style={styles.seeMoreText}>
          See more reviews ({reviews.length - 1} more)
        </Text>
        <FontAwesome name="chevron-down" size={12} color="#FFC107" />
      </TouchableOpacity>
    );
  };

  const renderShowLessButton = () => {
    return (
      <TouchableOpacity 
        style={styles.seeMoreButton}
        onPress={() => setShowAllReviews(false)}
      >
        <Text style={styles.seeMoreText}>Show less</Text>
        <FontAwesome name="chevron-up" size={12} color="#FFC107" />
      </TouchableOpacity>
    );
  };

  // Determine which reviews to show
  const displayReviews = showAllReviews ? reviews : reviews.slice(0, 1);

  return (
    <View style={styles.container}>
      <FlatList
        scrollEnabled
        data={displayReviews}
        keyExtractor={(item,index) => index.toString()}
        renderItem={renderReview}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={() => (
          <View>
            {!showAllReviews && renderSeeMoreButton()}
            {showAllReviews && renderShowLessButton()}
          </View>
        )}
      />
      {renderImageModal()}
    </View>
  );
};

export default ViewReview;

const styles = StyleSheet.create({
  container: {
    // flex: 1,
  },
  listContainer: {
    // paddingHorizontal: 8,
    // gap:5,
  },
  reviewCard: {
    // width: 280,
    backgroundColor: '#1B1B1B',
    borderRadius: 12,
    padding: 10,
    // marginRight: 12,
    marginBottom:10,
    borderWidth: 1,
    borderColor: '#1B1B1B',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reviewHeader: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  timeText: {
    color: '#999',
    fontSize: 12,
  },
  reviewContent: {
    color: '#ddd',
    fontSize: 14,
    flexShrink:2,
    width:'80%',
    lineHeight: 20,
    marginBottom: 12,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  imageWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  lastImageWrapper: {
    position: 'relative',
  },
  reviewImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 6,
  },
  actionDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#333',
    marginHorizontal: 8,
  },
  
  // See More Button Styles
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  seeMoreText: {
    color: '#FFC107',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor:'rgba(0, 0, 0, 0.7)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
  },
  modalImageContainer: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: screenWidth - 10,
    height: '90%',
  },
  modalFooter: {
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  imageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FFC107',
  },
});