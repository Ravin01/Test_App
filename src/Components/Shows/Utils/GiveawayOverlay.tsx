import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ToastAndroid,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {io} from 'socket.io-client';
import {socketurl} from '../../../../Config';
import {AuthContext} from '../../../Context/AuthContext';
import {colors} from '../../../Utils/Colors';
import {Trophy} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfettiCannon from 'react-native-confetti-cannon';
import LinearGradient from 'react-native-linear-gradient';
import RestrictModule from './RestrictModule';
 import bgaSocket, { addBgaSocketListener, connectBgaSocket, removeBgaSocketListener } from '../../../Utils/bgaSocket';

const socket = io(socketurl, {
  transports: ['websocket'],
});

const GiveawayOverlay = ({item, streamId,host={}}) => {
  const imageUrl = item?.images?.[0]?.key
    ? `${AWS_CDN_URL}${item.images[0].key}`
    : null;
const id=streamId;
  const [restrictModalvisible, setRestrictVisible] = useState(false);
  const product = item;
  const [hasApplied, setHasApplied] = useState(false);
  const [isFireWorkVisible, setfireworkVisible] = useState(false);
  const [applicants, setApplicants] = useState([]); // Store actual applicant list for rolling
  const [applicantsCount, setApplicantsCount] = useState(0);
  const [isGiveawayEnded, setIsGiveawayEnded] = useState(false);
  const [isRolling, setIsRolling] = useState(false); // New: Track rolling state
  const [productTitle, setProductTitle] = useState('');
  const {user} = useContext(AuthContext);

  const [winner, setWinner] = useState(null); // For confetti display

  // New states for rolling effect
  const [displayApplicant, setDisplayApplicant] = useState(null);
  const rollingIntervalRef = useRef(null);

  const getRandomTamilName = () => {
    const firstNames = [
      'Kumar',
      'Raja',
      'Murugan',
      'Chandran',
      'Arun',
      'Vijay',
      'Karthik',
      'Mani',
      'Balaji',
      'Dinesh',
      'Priya',
      'Malathi',
      'Sarita',
      'Lakshmi',
      'Gayathri',
      'Vani',
      'Swetha',
      'Puja',
      'Anitha',
      'Janaki',
    ];

    const lastNames = [
      'Subramaniam',
      'Velu',
      'Ganesan',
      'Sekar',
      'Ramnathan',
      'Kannan',
      'Pande',
      'Singh',
      'Ayyar',
      'Nayudu',
      'Iyer',
      'Menon',
      'Nair',
      'Reddy',
      'Sharma',
    ];

    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${
      lastNames[Math.floor(Math.random() * lastNames.length)]
    }`;
  };

  // Function to start the rolling effect animation
  const startRollingEffect = useCallback(allApplicants => {
    if (!allApplicants || allApplicants.length === 0) return;

    stopRollingEffect(); // Clear any existing interval

    rollingIntervalRef.current = setInterval(() => {
      // Generate a random Tamil name for display
      const randomName = getRandomTamilName();
      setDisplayApplicant({
        _id: Date.now().toString(), // Unique ID for animation
        userName: randomName,
        name: randomName,
      });
    }, 100); // Update every 100ms for a fast roll
  }, []);

  // Function to stop the rolling effect animation
  const stopRollingEffect = useCallback(() => {
    if (rollingIntervalRef.current) {
      clearInterval(rollingIntervalRef.current);
      rollingIntervalRef.current = null;
    }
  }, []);

  // --- HELPER FUNCTION: SAFELY GET PRODUCT ID ---
  const getProductIdSafely = productField => {
    if (!productField) return null;
    if (
      typeof productField === 'object' &&
      productField !== null &&
      productField._id
    ) {
      return productField._id.toString();
    }
    return productField.toString();
  };
  // console.log(product)
  // Initialize state based on the `product` prop
  useEffect(() => {
    if (product) {
      setApplicants(product.applicants || []);
      setApplicantsCount(product.applicants?.length || 0);
      setIsGiveawayEnded(product.isGiveawayEnded);
      setIsRolling(product.isRolling || false); // Update rolling state from product prop
      setProductTitle(
        product.productId.title ||
          product.productId?.title ||
          'Unknown Product',
      );
      if (product?.isGiveawayEnded) {
        // console.log(product.winner)
        setWinner(product?.winenr);
      }

      if (
        user &&
        product.applicants &&
        product.applicants.some(
          applicantId => applicantId.toString() === user._id,
        )
      ) {
        setHasApplied(true);
      } else {
        setHasApplied(false);
      }

      // Start or stop rolling effect based on product's isRolling state
      if (
        product.isRolling &&
        product.applicants &&
        product.applicants.length > 0
      ) {
        startRollingEffect(product.applicants);
      } else {
        stopRollingEffect();
        if (!product.isGiveawayEnded) {
          // Only clear if not ended, winner might still be displayed
          setDisplayApplicant(null);
        }
      }
    } else {
      // If product becomes null (e.g., giveaway ends), reset states
      setApplicants([]);
      setApplicantsCount(0);
      setWinner(null);
      setIsGiveawayEnded(true); // Treat as ended if no product is active
      setIsRolling(false); // Stop rolling
      setHasApplied(false);
      setProductTitle('');
      stopRollingEffect(); // Ensure interval is cleared
      setDisplayApplicant(null);
    }
  }, [product, user, startRollingEffect, stopRollingEffect]); // Depend on product and user, and effect functions

    // NEW LISTENER: Handle Giveaway Rolling
    const handleGiveawayRolling = data => {
      const incomingProductId = getProductIdSafely(data.productId);
      if (
        data.streamId === streamId &&
        incomingProductId === currentProductId
      ) {
        setIsRolling(true);
        setWinner(null); // Clear previous winner display
        startRollingEffect(data.applicants); // Start the visual roll with current applicants
      }
    };

    const handleGiveawayWinner = async data => {
      const userId = await AsyncStorage.getItem('userId');
      const incomingProductId = getProductIdSafely(data.productId);
      if (
        data.streamId === streamId &&
        incomingProductId === currentProductId
      ) {
        if (userId == data.winner._id) {
          setfireworkVisible(true);
          setTimeout(() => {
            setfireworkVisible(false); // reset after 5 seconds (or any duration)
          }, 5000);
        }
        setWinner(data.winner);
        setIsGiveawayEnded(true); // This also implies isActive = false
        setIsRolling(false); // Stop rolling state
        stopRollingEffect(); // Stop the visual roll
        setDisplayApplicant(null); // Clear temporary display
      }
    };
  // Socket.IO listeners for real-time updates for the active giveaway
  useEffect(() => {
    const currentProductId = getProductIdSafely(product?.productId);
    if (!socket || !streamId || !currentProductId) return;


    // socket.on('giveawayApplicantsUpdated', handleGiveawayApplicantsUpdated);
    socket.on('giveawayRolling', handleGiveawayRolling); // New listener
    socket.on('giveawayWinner', handleGiveawayWinner);
    // socket.on('giveawayEndedManually', handleGiveawayEndedManually);

    return () => {
      // socket.off('giveawayApplicantsUpdated', handleGiveawayApplicantsUpdated);
      socket.off('giveawayRolling', handleGiveawayRolling); // Clean up new listener
      socket.off('giveawayWinner', handleGiveawayWinner);
      // socket.off('giveawayEndedManually', handleGiveawayEndedManually);
      stopRollingEffect(); // Ensure cleanup on unmount
    };
  }, [socket, streamId, product, user, startRollingEffect, stopRollingEffect]); // Re-run if dependencies change

  useEffect(() => {
    if (isRolling && applicants.length > 0) {
      startRollingEffect(applicants);
    }
  }, [isRolling]);

  const toast = message => {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  };

  const handleApplyGiveaway = useCallback(() => {
    if (!user) {
      toast('Please log in to apply for the giveaway.');
      return;
    }
    if (
      !product ||
      !product?.isActive ||
      product?.isGiveawayEnded ||
      isRolling
    ) {
      // Prevent applying if rolling
      toast(
        'This giveaway is not active, has already ended, or is currently rolling.',
      );
      return;
    }
    if (hasApplied) {
      toast('You have already applied for this giveaway.');
      return;
    }

    const productIdToSend = getProductIdSafely(product.productId);

    if (!productIdToSend) {
      console.error(
        'Critical: Product ID could not be safely extracted in GiveAwayUsers for application.',
        product,
      );
      toast('Error preparing giveaway application: Product ID missing.');
      return;
    }

    console.log('Applying for giveaway user clicked socket emitted :', {
      streamId,
      productId: productIdToSend,
      user: {
        _id: user._id,
        name: user.name,
        userName: user.userName,
        profileURL: user.profileURL,
      },
    });

    socket.emit('applyGiveaway', {
      streamId,
      productId: productIdToSend,
      user: {
        _id: user._id,
        name: user.name,
        userName: user.userName,
        profileURL: user.profileURL,
      },
    });

    setHasApplied(true); // Optimistic update
    setApplicantsCount(prevCount => prevCount + 1); // Optimistic update for count
    toast('Application submitted!');
  }, [streamId, product, user, hasApplied, isRolling, socket]); // Depend on relevant states/props and socket
//   console.log(product.winner )

  useEffect(() => {
    const initBgaSocket = async () => {
      const id = streamId;
      if (!streamId || !user) return;

      try {
        await connectBgaSocket();
        
        // Join BGA stream room for real-time giveaway updates  
        // const bgaSocket = (await import('../../../utils/bgaSocket')).default;
        bgaSocket.emit('join_stream', { streamId:streamId });
        bgaSocket.emit('user_joins_live', { userId: user._id, streamId: id });
        console.log(`🎯 User joined BGA stream room: ${id}`);
        
      
     ;

        const handleBgaGiveawayRolling = (data) => {
          console.log('🎲 User received BGA giveaway_rolling:', data);
          // setIsRollingGiveaway(true);ha
          handleGiveawayRolling(data)
        };

        const handleBgaWinnerSelected = (data) => {
          console.log('🏆 User received BGA winner_selected:', data);
          // setIsRollingGiveaway(false);
          // setWinner(data.winner);
          handleGiveawayWinner(data)
          
      //    setStreamData(prevData => {
      // const prevShow = prevData.show;
      // if (!prevShow) return prevData;
      
      //       const incomingProductId = getProductIdSafely(data.productId);

      //       // Update giveawayProducts array to reflect the ended giveaway with winner
      //       const updatedGiveawayProducts = prevShow.giveawayProducts?.map(product => {
      //         if (product.giveawayObjectId === data.giveawayId || 
      //             product.giveawayObjectId === data.giveaway?.giveawayObjectId ||
      //             getProductIdSafely(product.productId) === incomingProductId) {
      //           return {
      //             ...product,
      //             isActive: false,
      //             isGiveawayEnded: true,
      //             winner: data.winner,
      //             giveawayStatus: 'ended'
      //           };
      //         }
      //         return product;
      //       }) || [];
            
      //       return {
      //         ...prevShow,
      //         currentGiveaway: prevShow.currentGiveaway ? {
      //           ...prevShow.currentGiveaway,
      //           winner: data.winner,
      //           isActive: false,
      //           isGiveawayEnded: true
      //         } : null,
      //         giveawayProducts: updatedGiveawayProducts
      //       };
      //     });
          
          // // Show winner modal
          // setIsGiveawayModalOpen(true);
        };

        const handleBgaGiveawayEnded = (data) => {
          console.log('🔚 User received BGA giveaway_ended:', data);
          // setIsRollingGiveaway(false);
          
          setTimeout(() => {
            // handleBgaGiveawayEnded
      //      setStreamData(prevData => {
      // const prevShow = prevData.show;
      // if (!prevShow) return prevData;
      //         if (!prevShow?.currentGiveaway) return prevShow;
              
      //         return {
      //           ...prevShow,
      //           currentGiveaway: null
      //         };
      //       });
          }, 5000);
        };
        
        // Listen for BGA giveaway events
        // addBgaSocketListener('giveaway_started', handleBgaGiveawayStarted);
        // addBgaSocketListener('giveaway_application', handleBgaApplicationUpdate);
        // addBgaSocketListener('giveaway_rolling', handleBgaGiveawayRolling);
        // addBgaSocketListener('giveaway_winner_selected', handleBgaWinnerSelected);
        // addBgaSocketListener('giveaway_ended', handleBgaGiveawayEnded);
        
        console.log('✅ BGA socket listeners registered for user');
        
        return () => {
          removeBgaSocketListener('giveaway_started', handleBgaGiveawayStarted);
          removeBgaSocketListener('giveaway_application', handleBgaApplicationUpdate);
          removeBgaSocketListener('giveaway_rolling', handleBgaGiveawayRolling);
          removeBgaSocketListener('giveaway_winner_selected', handleBgaWinnerSelected);
          removeBgaSocketListener('giveaway_ended', handleBgaGiveawayEnded);
        };
        
      } catch (error) {
        console.error('Failed to setup BGA socket for user:', error);
      }
    };

    initBgaSocket();
  }, [id, user]);


  let buttonText = 'Entry';
  let buttonDisabled =
    hasApplied || isGiveawayEnded || !product?.isActive || isRolling; // Disable if rolling

  if (isGiveawayEnded) {
    buttonText = 'Giveaway Ended';
  } else if (isRolling) {
    buttonText = 'Rolling...';
  } else if (!product?.isActive) {
    buttonText = 'Not Yet Active';
  } else if (hasApplied) {
    buttonText = 'Applied';
  }
//   console.log(item)
  return (
    <View style={styles.giveawayCard}>
      <RestrictModule visible={restrictModalvisible} onClose={()=>setRestrictVisible(false)} mode1={'giveaway'}
      sellerName={host?.userInfo?.name ||''} profileURL='' />
      
        {/* {imageUrl ? (
          <Image source={{uri: imageUrl}} style={styles.productImage} />
        ) : (
          <View
            style={[
              styles.productImage,
              {justifyContent: 'center', alignItems: 'center'},
            ]}>
            <Text style={{fontSize: 10}}>No Img</Text>
          </View>
        )} */}
  {
  !isRolling ? (
    winner ? (
      <View style={styles.winnerBox}>
        <Text style={{fontWeight:'600',color:'#fff'}}>🎉 Congratulations 🎉</Text>
        <Text style={styles.winnerText}>
          {winner?.name || 'n/aDS'}! You’re the winner of the giveaway!
        </Text>
        <Text style={styles.giveawayEntries} numberOfLines={2}>Giveaway - {item?.productTitle}</Text>
      </View>
    ) : (
      <View style={styles.giveawayInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          Giveaway - {item?.productTitle} #{item?.giveawayNumber}
        </Text>

        {item?.timeLeft && (
          <View style={styles.timeLeftContainer}>
            <Text style={styles.timeLeftText}>⏳ {item?.timeLeft}</Text>
          </View>
        )}

        <Text style={styles.giveawayEntries}>
          Entries - {applicantsCount || 0}
        </Text>

        <TouchableOpacity
          onPress={handleApplyGiveaway}
          disabled={buttonDisabled}
        >
          <LinearGradient
            colors={['#AC8201', '#FFC100']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.entryButton,
              !buttonDisabled && styles.disableButton,
            ]}
          >
            <Text style={styles.entryButtonText}>{buttonText}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    )
  ) : (
    <View style={styles.winnerBox}>
      <Text style={styles.rollingText}>
        {displayApplicant?.name || 'n/a'}
      </Text>
    </View>
  )
}

      

      {/* {product?.winner && (
       
      )} */}
      
      {/* <View style={styles.winnerBox}>
        <Text style={styles.winner
        Text}>{displayApplicant?.name || 'n/a'}</Text>
      </View> */}
      {isFireWorkVisible && (
        <ConfettiCannon
          count={200}
          origin={{x: -10, y: 0}}
          fadeOut={true}
          fallSpeed={3000}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  giveawayCard: {
    // backgroundColor: colors.SecondaryColor,]
    backgroundColor:'#00000040',
    justifyContent:'center',
    borderRadius: 20,
    padding: 16,
    // maxHeight:400,
    borderWidth:1,
    alignItems:'center',
    flex:1,
    gap:5,
    borderColor:'#777',
    elevation:40,
    marginBottom: 16,
  },
  winnerBox: {
    // borderTopColor: '#777',
    // borderTopWidth: 1,
    alignItems: 'center',
    marginTop: 10,
    // flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    // alignSelf:'center',
    paddingTop: 5,
  },
  winnerText: {
    fontWeight: 'bold',
    fontSize: 12,
    textAlign:'center',
    color: '#fff',
  },
  rollingText: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#FFC100',
  },
 
  productImage: {
    width: 64,
    height: 64,
    backgroundColor: '#FED7AA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  giveawayInfo: {
    flex: 1,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom:15,
  },
  giveawayPrice: {
    color: '#EAB308',
    fontSize: 12,
    marginBottom: 4,
  },
  giveawayEntries: {
    color: '#fff',
    backgroundColor:'#0000007A',
    borderRadius:10,
    textAlign:'center',
    fontSize: 12,
    marginBottom: 10,
    fontWeight:'bold'
  },
  timeLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    borderRadius:15,
    elevation:40,
    borderColor:'#FF52527A',
    borderWidth:1
  },
  timeLeftText: {
    color: '#EF4444',
    fontSize: 12,
    marginLeft: 4,
  },
  giveawayActions: {
    alignItems: 'flex-end',
  },
  entryButton: {
     backgroundColor: '#ffbe00',
    paddingHorizontal: 10,
    alignItems:'center',
    paddingVertical: 6,
    borderRadius: 15,
  },
  disableButton: {backgroundColor: '#ccc'},
  entryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default GiveawayOverlay;
