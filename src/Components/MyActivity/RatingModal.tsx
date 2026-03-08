import React, {useState} from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const RatingModal = ({ visible, onClose }) => {

  const [rating, setRating] = useState(0);
  //const rating = 4.0;

  const getEmojiByRating = (rating) => {
  if (!rating || rating === 0) return '😐'; // Neutral emoji
  if (rating <= 1) return '😢';
  if (rating <= 2) return '😔';
  if (rating <= 3) return '☹️';
  if (rating <= 4) return '🙂';
  return '😀';
};


const renderStars = () => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    let iconName = 'star';
    let iconColor = '#FFF';

    if (i < fullStars) {
      iconName = 'star';
      iconColor = '#FBBF24';
    } else if (i === fullStars && hasHalfStar) {
      iconName = 'star-half-o';
      iconColor = '#FBBF24';
    }

    // Tapping any star sets that value as the rating (i + 1)
    stars.push(
      <TouchableOpacity key={`star-${i}`} onPress={() => setRating(i + 1)}>
        <FontAwesome
          name={iconName}
          size={20}
          color={iconColor}
          style={styles.starIcon}
        />
      </TouchableOpacity>
    );
  }

  return stars;
};


  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={10}
            reducedTransparencyFallbackColor="white"
          />
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="close" size={20} color="#000" />
          </TouchableOpacity>
          

        <View style={styles.header}>
           <Text style={styles.heading}>How did you like this item?</Text>
        </View>

          <View style={styles.card}>
            <View style={styles.emojiWrapper}>
              <Text style={styles.emoji}>{getEmojiByRating(rating) || '😊'}</Text>
            </View>

            <Text style={styles.itemTitle} numberOfLines= {2} >
                Rachel Allan Sleeveless Quinceanera Dress
            </Text>
            <Text style={styles.ratingValue}>{rating?.toFixed(1)}</Text>

            <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>Rating</Text>

            <View style={styles.stars}>{renderStars()}</View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default RatingModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 312,
    height: 341,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  card: {
   // backgroundColor: '#fdd835',
    width: '100%',
    borderRadius: 20,
    alignItems: 'center',
    padding: 16,
    height: '66%'
  },
  header: {
    backgroundColor: '#fdd835',
    width: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    height: '34%'
  },
  emojiWrapper: {
   // backgroundColor: '#fff',
   borderWidth: 1,
   borderColor: '#fff',
    borderRadius: 36,
    padding: 1,
    paddingHorizontal:2.5,
    marginTop: -48,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 48,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#000',
    textAlign: 'center',
  },
  itemTitle: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starIcon: {
    marginHorizontal: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    gap: 10,
  },
});
