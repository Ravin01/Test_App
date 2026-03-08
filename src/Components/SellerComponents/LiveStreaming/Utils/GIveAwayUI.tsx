import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
   ActivityIndicator,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import AntDesign from 'react-native-vector-icons/AntDesign';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {socketurl} from '../../../../../Config';
import { AWS_CDN_URL } from '../../../Utils/aws';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../Utils/Api';

const socket = io(socketurl, {
  transports: ['websocket'],
});

const GiveawayModal = ({ visible, onClose, item={}, streamId, winnerDetails, fetchWinner }) => {
  const [applicants, setApplicants] = useState(item?.productId?.applicants|| []);
  const [winner, setWinner] = useState(item?.winner);
  const [secondsRemaining, setSecondsRemaining] = useState(120);
   const [loading, setloading] = useState(false);
  
  const productImageUrl = item?.images?.[0]?.key || '';
// console.log(visible)
  useEffect(() => {
    if (visible && secondsRemaining > 0) {
      const timer = setInterval(() => {
        setSecondsRemaining(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
    if (!visible) {
      setSecondsRemaining(60);
    }
  }, [visible, secondsRemaining]);

  const formatTime = () => {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

 //mock logic
 const handleGiveaway = () => {
    if (applicants.length === 0) return;
    // Simulate winner selection
    const fakeWinner = applicants[Math.floor(Math.random() * applicants.length)];
    setWinner(fakeWinner);
    fetchWinner(fakeWinner, item);
};

{/*
// Real logic
   const handleGiveaway = () => {
	   console.log('called');
    setloading(true);
    try {
      socket.emit('rollGiveaway', {
        streamId,
        productId: item.productId,
      });
    } catch (error) {
      console.log(error);
    } finally {
      setloading(false);
    }
};   */}

  // console.log(item.productId)
  useEffect(() => {
    socket.emit('joinRoom', streamId);
  //  console.log(socketurl)
    // Trigger Giveaway Start
    socket.emit('startGiveaway', {
      streamId,
      productId: item?.productId,
      productTitle: item?.title,
      followersOnly: false, // Update if needed
    });

    // Listen for applicants
    socket.on(
      'giveawayApplicantsUpdated',
      ({giveawayKey, applicants: updatedApplicants}) => {
        console.log(updatedApplicants, 'seller updated', giveawayKey);
        if (giveawayKey === `${streamId}_${item?.productId}`) {
          setApplicants(updatedApplicants);
        }
      },
    );

    // Listen for winner selection
    socket.on('giveawayWinner', ({giveawayKey, winner}) => {
      if (giveawayKey === `${streamId}_${item?.productId}`) {
        // setWinner(winner);
          // console.log(winner,'winner wors')
          setWinner(winner)
        fetchWinner(winner,item)
      }
    });
  }, [streamId, item]);
  // console.log(winner)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={12}
            reducedTransparencyFallbackColor="white"
          />

          {winnerDetails[item?.productId] && (
            <ConfettiCannon count={120} origin={{ x: -10, y: 0 }} fadeOut explosionSpeed={300} />
          )}

          <TouchableOpacity onPress={()=>{onClose();
		  setWinner(null);                    // Temperory logic
		  }} style={styles.closeIcon}>
            <AntDesign name="closecircle" size={18} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.giveawayHeader}>
            {winner ? '🎁 Giveaway Winner' : '🎁 Giveaway'}
          </Text>

          {winner && (
            <Text style={styles.winnerName}>🎉 {winner?.name||'N/A'} 🎉</Text>
          )}

          <View style={styles.productCard}>
            <Image
              source={productImageUrl ? { uri: productImageUrl } : require('../../../../assets/images/oi3.png')}
              style={styles.productImage}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.productTitle} numberOfLines={1}>
                Giveaway - {item?.productId?.title||item?.title}
              </Text>
              <Text style={styles.productSubtitle}>#{item?.productId?._id||item?.productId}</Text>
            </View>
          </View>

          {!winner && (
            <>
              <Text style={styles.timerText}>⏳ {formatTime()} left</Text>
              <View style={styles.entriesTag}>
			  {applicants.length > 0 ?
                (<Text style={styles.entriesText}>No. Entries - {applicants?.length}</Text>):
				(
                 <Text style={styles.entriesText}>No Entries yet.</Text>
			    )}
              </View>

              <TouchableOpacity
                style={styles.buttonWrapper}
                onPress={handleGiveaway}
                disabled={applicants?.length === 0}
              >
                <LinearGradient
                  colors={['#AC8201', '#FFC100']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientBtn}
                >
                  <Text style={styles.buttonText}>
				   {loading ? (
              <ActivityIndicator color={'white'} />
            ):
				   ('Roll & Select')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default GiveawayModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 320,
    padding: 16,
    paddingTop: 0,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeIcon: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginRight: 10,
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  giveawayHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFC100',
    marginTop: 40,
    marginBottom: 10,
  },
  winnerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00000055',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
	minWidth: '90%'
  },
  productImage: {
    width: 48,
    height: 48,
    marginRight: 10,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  productTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  productSubtitle: {
    fontSize: 12,
    color: '#ccc',
  },
  timerText: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 6,
  },
  entriesTag: {
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 16,
  },
  entriesText: {
    color: '#2c2c2c',
    fontWeight: '600',
    fontSize: 12,
  },
  buttonWrapper: {
    width: '60%',
  },
  gradientBtn: {
    paddingVertical: 6,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});



{/*  
 //steps to call this UI modal
 
  const handleCloseModal = () => {
  setShowGiveawayModal(false);
};
  
  const [showGiveawayModal, setShowGiveawayModal] = useState(false);
  let winnerDetails = {};

const mockfetchWinner = (winner, item) => {
  winnerDetails[item.productId] = winner;
  console.log('Updated winnerDetails:', winnerDetails);
};

 const mockItem = {
    productId: 'prod123',
    title: 'Cool Gadget',
    description: 'A very cool gadget you might win!',
    images: [
      { azureUrl: 'https://via.placeholder.com/300.png' },
    ],
    applicants: [
      { name: 'Alice' },
      { name: 'Bob' },
      { name: 'Charlie' },
    ],
    winner: null,
  };
	  <Giveaway
	   visible={showGiveawayModal}
	  onClose={handleCloseModal}
  item={mockItem}
  streamId="stream_001"
  winnerDetails={{}} // can be a dummy object
  fetchWinner={mockfetchWinner}
/>
*/}

