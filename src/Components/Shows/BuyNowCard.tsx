import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated as RNAnimated,
  Dimensions,
  TouchableOpacity,
  Image
} from 'react-native';
import {  GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { CountdownCircleTimer } from 'react-native-countdown-circle-timer';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolateColor,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';
import {AWS_CDN_URL} from '../../Utils/aws';

//import BidButton from '../BidButton';
import ShippingSheet from './Utils/ShippingSheet';

const { width: screenWidth } = Dimensions.get('window');

const BuyNowCard = ({
  type = 'buy',
  price = '₹600',
  originalPrice = '₹999',
  discount = '35%',
  quantity = 18,
  itemNumber = 23,
  title = '#2 Aqua Natural Facewash',
  userName = 'JeffW_17',
  bidPrice = '₹700',
  otherBidders = 10,
  onSwipeComplete,
  onPress,
  onAuctionComplete,
  product
}) => {
  
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(screenWidth - 32); // fallback to screen width
  const [swipeButtonWidth, setSwipeButtonWidth] = useState(200); // fallback width
  const thumbSize = 90;   //110;
  
  // Calculate maxTranslateX based on actual swipe button width
//  const maxTranslateX = swipeButtonWidth - thumbSize - 8; // 8 for padding
  const maxTranslateX = Math.max(0, swipeButtonWidth - thumbSize - 8);

  const lastOffset = useRef(0);
  
  console.log('Images====',product?.productId?.images[0]?.key);
  
  console.log('Container width:', containerWidth);
  console.log('Swipe button width:', swipeButtonWidth);
  console.log('Thumb size:', thumbSize);
  console.log('Max translate X:', maxTranslateX);

  const [shippingVisible, setShippingVisible] = useState(false);
  
  const [isEightyPercentReached, setIsEightyPercentReached] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const [currentBid, setCurrentBid] = useState(parseInt(bidPrice.replace('₹', '')));
  const [biddersCount, setBiddersCount] = useState(otherBidders);
  
  const [currentBidderName, setCurrentBidderName] = useState(userName);
  
  const mockNames = [
  'Luna_93', 'RaviX', 'Raja', 'NeoBidder', 'BidKing',
  'Chloe_77', 'AlphaWolf', 'QuickSniper', 'Zenaholic', 'JeffW_17'
];
  
   // Move hooks outside of useMemo - they must be called in the same order every time
  const progress = useSharedValue(0);
  const AnimatedText = Animated.createAnimatedComponent(Text);
  
  const animatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(progress.value, [0, 0.6, 1], ['#f7b801', '#f7b801', '#ff0000']);
    return { color };
  });
  
  
  // Simulate mock bidding
  useEffect(() => {
    if (isCompleted) return;

    const interval = setInterval(() => {
	   const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
      setCurrentBid((prev) => prev + Math.floor(Math.random() * 20 + 10));
      setBiddersCount((prev) => prev + 1);
	  setCurrentBidderName(randomName);
    }, 4000);

    return () => clearInterval(interval);
  }, [isCompleted]);

  // Handle container layout to get actual width
  const handleContainerLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
    console.log('Container layout width:', width);
  };

  // Handle swipe button layout specifically
  const handleSwipeButtonLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    setSwipeButtonWidth(width);
    console.log('Swipe button width measured:', width);
    console.log('New calculated max translate X:', width - thumbSize - 8);
  };


// Now useMemo only contains the JSX, not the hooks
  const TimerWithAnimatedText = useMemo(() => {
    return (
      <CountdownCircleTimer
        key="auction-timer"
        isPlaying = {true}   //{!isCompleted}
        duration={15}
        colors={['#f7b801', '#f7b801', '#ff0000']}
        colorsTime={[15, 9, 3]}
        trailColor="#d9d9d9"
        strokeWidth={2}
        size={40}
        onUpdate={(remainingTime) => {
          const normalized = (15 - remainingTime) / 15;
          progress.value = withTiming(normalized, { duration: 100 });
        }}
        onComplete={() => {
         // setIsCompleted(true);
          setTimeout(() => {
      onAuctionComplete && onAuctionComplete();
    }, 250); // short delay to let 0 show
          return { shouldRepeat: false, delay: 1 };
        }}
      >
        {({ remainingTime }) => (
          <View style={styles.timerContainer}>
            <AnimatedText style={[styles.time, animatedStyle]}>
              {remainingTime}
            </AnimatedText>
          </View>
        )}
      </CountdownCircleTimer>
    );
  }, [isCompleted, onAuctionComplete, progress, animatedStyle]);


  useEffect(() => {
    const listenerId = translateX.addListener(({ value }) => {
      const percentage = value / maxTranslateX;
      if (percentage >= 0.8 && !isEightyPercentReached && !isCompleted) {
        console.log('🎯 80% reached!');
        setIsEightyPercentReached(true);
      } else if (percentage < 0.8 && isEightyPercentReached) {
        setIsEightyPercentReached(false);
      }
    });

    return () => translateX.removeListener(listenerId);
  }, [isEightyPercentReached, isCompleted, maxTranslateX, swipeButtonWidth]);

  const handleGestureEvent = RNAnimated.event(
    [{ nativeEvent: { translationX: translateX } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const { translationX } = event.nativeEvent;
        const newValue = Math.max(0, Math.min(maxTranslateX, lastOffset.current + translationX));
        translateX.setValue(newValue);
      },
    }
  );

  const handleStateChange = (event) => {
    const { state } = event.nativeEvent;
    translateX.extractOffset();

    if (state === State.END) {
      console.log('Gesture ended');
      translateX.flattenOffset();
      translateX.stopAnimation((value) => {
        console.log('Final swipe value:', value);

        const shouldComplete = value > maxTranslateX * 0.7;
        console.log('Should complete?', shouldComplete);
        
        if (shouldComplete) {
          console.log('Swipe successful! Completing...');
          setIsCompleted(true);
          
          setIsEightyPercentReached(false); // reset pink bg
          RNAnimated.timing(translateX, {
            toValue: maxTranslateX,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            console.log('Swipe animation to end completed');
            onSwipeComplete && onSwipeComplete();
			console.log('onSwipeComplete',onSwipeComplete)
			setTimeout(() => {
            lastOffset.current = 0;
           setIsCompleted(false);
            RNAnimated.timing(translateX, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }).start();
          }, 1000);
          });
        } else {
          console.log('Swipe not far enough. Resetting...');
          RNAnimated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 100,
            friction: 8,
          }).start();
          lastOffset.current = 0;
        }
      });
    }
  };

  const thumbTranslate = translateX.interpolate({
    inputRange: [0, maxTranslateX],
    outputRange: [0, maxTranslateX],
    extrapolate: 'clamp',
  });

  const backgroundOpacity = translateX.interpolate({
    inputRange: [0, maxTranslateX],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  return (
    <>
      <View style={styles.container} onLayout={handleContainerLayout}>
	 {/* Blur background with border radius fix */}
		 {/*    <View style={styles.blurWrapper}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={1}
            reducedTransparencyFallbackColor="white"
          />
		 </View>  */}
        <View style={[styles.header]}>
          <View style={styles.headerLeft}>
		   <Image 
  source={{ uri: `${AWS_CDN_URL}${product?.productId?.images[0]?.key}` }}  // Replace with your image URL or local asset
    style={styles.itemImage}
  />
   <View style={styles.textContainer}>
            <Text style={styles.itemTitle} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >{product?.productId?.title || 'Random Product'}</Text>
            <Text style={styles.quantity}>Quantity {product?.productId?.quantity || 1}</Text>
			</View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.discountBadge}>
               <Text>
           {currentBidderName}
            </Text>
            </View>
          <Text style={styles.biddersInfo}>
          ₹{currentBid}
        </Text>
          </View>
        </View>

        <View style={styles.swipeContainer}>
          <View style={styles.leftInfo}>
            {TimerWithAnimatedText}
          </View>
		  
		  <TouchableOpacity onPress= {()=>{}} style={{backgroundColor: 'rgba(0, 0, 0, 0.3)',borderRadius: 16, padding: 8, paddingHorizontal: 12}}>
		  <Text style={{color:'#fff'}}>Other</Text>
		  </TouchableOpacity>

          <View 
            style={[
              styles.swipeButton, 
              isEightyPercentReached && !isCompleted && { backgroundColor: 'pink' },
              isCompleted && { backgroundColor: '#333' }
            ]}
            onLayout={handleSwipeButtonLayout}
          >
            <RNAnimated.View
              style={[styles.swipeBackground, { opacity: backgroundOpacity }]}
            >
			<Text style={styles.swipeText}>₹{currentBid + 2}</Text>
            </RNAnimated.View>

            <PanGestureHandler
              onGestureEvent={handleGestureEvent}
              onHandlerStateChange={handleStateChange}
            >
              <RNAnimated.View style={[styles.swipeThumb, { transform: [{ translateX: thumbTranslate }] }]}>
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {isCompleted ? (
      <Text style={styles.swipeArrow}>✅</Text>
    ) : (
      <>
        <Text style={styles.swipeArrow}>BID</Text>
        <ChevronRight color="#000" size={20} />
		<ChevronRight color="#000" size={20} />
      </>
    )}
  </View>
              </RNAnimated.View>
            </PanGestureHandler>
          </View>
        </View>
		
		{/*  <Text style={styles.biddersInfo}>
          {biddersCount} Bidders
        </Text>  */}
        
        <TouchableOpacity onPress={() => setShippingVisible(true)}>
          <Text style={styles.shipping}>+ Shipping fees</Text>
        </TouchableOpacity>
      </View>
      
      <ShippingSheet 
        isOpen={shippingVisible}
        isClose={() => setShippingVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#bbb',
    width: '86%',   //'90%'
//	elevation: 4,
  },
     blurWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
	gap: 10
  },
  headerLeft: {
    flex: 1,
	
	  flexDirection: 'row',
  alignItems: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
   // flexDirection: 'row',
   // gap: 8,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  quantity: {
    color: '#ccc',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  discountBadge: {
    backgroundColor: '#ffd700',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 0,//4,
  },
  discountText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  originalPrice: {
    color: '#ccc',
    fontSize: 16,
    textDecorationLine: 'line-through',
    textAlign: 'center',
    alignSelf: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  swipeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftInfo: {
    alignItems: 'center',
    marginRight: 16,
  },
  swipeButton: {
    flex: 1,
    height: 46,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 22,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#555',
    marginHorizontal: 8,
   // marginLeft: 48,
    overflow: 'hidden',
  },
  swipeBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  swipeText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: '60%',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  swipeThumb: {
    position: 'absolute',
    left: 0,
    width: 90 ,  //110,
    height: 43,
    backgroundColor: '#ffd700',   //'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#888',
  },
  swipeArrow: {
    color: '#000',   //'#fff',
    fontSize: 16,
    fontWeight: 'bold',
   // textShadowColor: 'rgba(0, 0, 0, 0.8)',
   // textShadowOffset: { width: 1, height: 1 },
   // textShadowRadius: 4,
  },
  shipping: {
    color: '#eee',
    fontSize: 14,
    textAlign: 'right',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  time: {
    fontSize: 15,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  biddersInfo: {
    color: '#eee',
    fontSize: 16,
	fontWeight:'bold',
    textAlign: 'center',
    marginTop: 4,
	 textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  
  itemImage: {
  width: 40,
  height: 40,
  borderRadius: 8,
  marginRight: 12,
},
textContainer: {
  flex: 1,
},
});

export default BuyNowCard;