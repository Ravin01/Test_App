import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from 'react-native-gesture-handler';
import {Image} from 'react-native-animatable';
import AntDesign from 'react-native-vector-icons/AntDesign';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../Utils/Api';
import {socketurl} from '../../../../Config';
import ConfettiCannon from 'react-native-confetti-cannon'; // For confetti explosion


const socket = io(socketurl, {
  transports: ['websocket'],
});

const Giveaway = ({item, streamId, winnerDetails, fetchWinner}) => {
  const [applicants, setApplicants] = useState(item.applicants || []);
  const [winner, setWinner] = useState(item.winner);
  //   const [user, setUser] = useState(nul
  const imageUrls =item.images[0]?.azureUrl; // Use a function to generate the signed URLs
  const [loading, setloading] = useState(false);

  const handleGiveaway = () => {
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
  };

  // console.log(item.productId)
  useEffect(() => {
    socket.emit('joinRoom', streamId);
  //  console.log(socketurl)
    // Trigger Giveaway Start
    socket.emit('startGiveaway', {
      streamId,
      productId: item.productId,
      productTitle: item.title,
      followersOnly: false, // Update if needed
    });

    // Listen for applicants
    socket.on(
      'giveawayApplicantsUpdated',
      ({giveawayKey, applicants: updatedApplicants}) => {
        console.log(updatedApplicants, 'seller updated', giveawayKey);
        if (giveawayKey === `${streamId}_${item.productId}`) {
          setApplicants(updatedApplicants);
        }
      },
    );

    // Listen for winner selection
    socket.on('giveawayWinner', ({giveawayKey, winner}) => {
      if (giveawayKey === `${streamId}_${item.productId}`) {
        // setWinner(winner);
          // console.log(winner,'winner wors')
          setWinner(winner)
        fetchWinner(winner,item)
      }
    });
  }, [streamId, item]);
  // console.log(winner)
  return (
    <>
      {winnerDetails[item.productId] && (
        <>
          <ConfettiCannon
            count={200}
            origin={{x: -10, y: 0}}
            fallSpeed={2500}
            explosionSpeed={500}
            fadeOut={true}
          />
        </>
      )}

      <View style={styles.productBox}>
        <Image
          source={{uri: imageUrls[0]}}
          style={styles.productImage}
          resizeMode="contain"
        />
        <View style={{width: '50%'}}>
          <Text style={styles.header}>
            {item?.title}
            {`\n`}
          </Text>
          <Text style={{color: 'white', width: '100%'}}>
            {item?.description}
          </Text>
          {applicants.length > 0 ? (
            <Text style={{color: '#ccc'}}>
              {applicants.length} applicants applied
            </Text>
          ) : (
            <Text style={{color: '#ccc'}}>No applicants yet.</Text>
          )}
        </View>
      </View>

      {winner? (
        <Text style={styles.winnerText}>
          🏆 Winner: {winner?.name||'N/A'}
        </Text>
      ) : (
        <TouchableOpacity
          style={[
            styles.buyButton,
            {backgroundColor: applicants.length > 0 ? 'green' : 'gray'},
          ]}
          onPress={handleGiveaway}>
          <AntDesign name="gift" size={25} color="#fff" />
          <Text style={{fontSize: 16, fontWeight: '600', color: 'white'}}>
            {loading ? (
              <ActivityIndicator color={'white'} />
            ) : (
              ` (${applicants.length}) Roll & Select`
            )}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{marginTop: 10, backgroundColor: '#ccc', height: 1}} />
    </>
  );
};

export default Giveaway;

const styles = StyleSheet.create({
  winnerText: {
    fontSize: 20,
    color: 'yellow',
    fontWeight: 'bold',
    padding: 10,

    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  actionIcons: {
    backgroundColor: '#fbbf24',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
  },
  buyButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    backgroundColor: '#ffbe00',
    alignItems: 'center',
    marginTop: 20,
  },
  header: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  productImage: {
    width: 130,
  },
  productBox: {
    gap: 10,
    flexDirection: 'row',
  },
  drawer: {
    position: 'absolute',
    right: 0,
    height: '110%',
    width: 300,
    backgroundColor: '#16161a',
    borderLeftWidth: 1,
    zIndex: 1000,
  },
  drawerContent: {
    justifyContent: 'center',
    padding: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    width: '100%',
    marginTop: 20,
    borderRadius: 20,
  },
  tab: {
    paddingVertical: 8,
    flexDirection: 'row',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedTab: {
    backgroundColor: '#ffbe00',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  selectedTabText: {
    color: 'black',
  },
  auctionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    width: '100%',
    height: '50%',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  auctionBox: {
    position: 'absolute',
    top: '10%',
    left: 300,
    zIndex: 1,
    gap: 30,
  },
  streamerInfo: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  streamerImage: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    marginRight: 10,
  },
  streamerDetails: {
    flex: 1,
  },
  streamerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewersCount: {
    color: '#aaa',
    fontSize: 14,
  },
  threeDotIcon: {
    position: 'absolute',
    right: 10,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  chatContainer: {
    position: 'absolute',
    bottom: 170,
    left: 0,
    right: 0,
    zIndex: 2,
    padding: 10,
    maxHeight: '30%',
  },
  chatList: {
    flex: 1,
    maxHeight: '70%',
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    alignItems: 'center',
  },
  chatUserName: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 5,
  },
  chatMessageText: {
    color: '#fff',
    flex: 1,
    textAlign: 'left',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#fff',
    borderRadius: 25,
    padding: 10,
  },
  sendButton: {
    marginLeft: 10,
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 25,
  },
  sendButtonText: {
    color: '#fff',
  },
  avatar: {
    backgroundColor: '#ccc',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
});
