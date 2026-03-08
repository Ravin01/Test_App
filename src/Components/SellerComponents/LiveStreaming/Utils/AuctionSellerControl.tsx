/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useEffect, useContext, memo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Modal,
  StatusBar,
  SafeAreaView,
  FlatList,
} from 'react-native';
import {
  Trophy,
  IndianRupee,
  Gavel,
  Clock,
  AlertCircle,
  Timer,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ExternalLink,
  History,
  Crown,
} from 'lucide-react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {AuthContext} from '../../../../Context/AuthContext';
import {AWS_CDN_URL} from '../../../../Utils/aws';
import ToggleSwitch from 'toggle-switch-react-native';
import {colors} from '../../../../Utils/Colors';
import {useNavigation} from '@react-navigation/native';
import auctionService from '../../../Shows/Services/auctionService';
import {WinnerModal} from '../../../Shows/Utils/WInnerModal';

// ✅ AppSync imports
import {
  configureAppSync,
  connectToChannel,
  getAuctionsChannelPath,
  subscribeToChannel,
  closeChannel,
  Channel,
} from '../../../../Utils/appSyncConfig';

const AuctionsSellerControl = (props: any) => {
  const {streamId, currentAuction} = props.item || props;
  const product = currentAuction;
  
  const currentProductId = product?.productId?._id || product?.productId || product?._id;
  const myAuctionId = product?.auctionObjectId || product?.auctionId;
  
  const [isActive, setIsActive] = useState(false);
  const {user} = useContext(AuthContext);
  const [highestBid, setHighestBid] = useState(100);
  const [highestBidder, setHighestBidder] = useState<any>(null);
  const [nextBids, setNextBids] = useState<number[]>([]);
  const [bidderWon, setBidderWon] = useState<any>(null);
  const [timer, setTimer] = useState(0);
  const [auctionEndTime, setAuctionEndTime] = useState<number | null>(null);

  const [isWinnerFetched, setIsWinnerFetched] = useState(false);
  const [auctionWinnerData, setAuctionWinnerData] = useState<any>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  
  const [customTime, setCustomTime] = useState('30');
  const [startingBid, setStartingBid] = useState(
    product?.startingBid?.toString() || product?.startingPrice?.toString() || '0',
  );
  const [reservedPrice, setReservedPrice] = useState(product?.reservedPrice?.toString() || '0');
  const [auctionType, setAuctionType] = useState('default');
  const [increment, setIncrement] = useState(2);
  const [showSettings, setShowSettings] = useState(false);
  const [bidHistory, setBidHistory] = useState<any[]>([]);
  const [bidDirection, setBidDirection] = useState('incremental');
  const [bidReserveError, setBidReserveError] = useState<string | null>(null);
  const [bidIncrement, setBidIncrement] = useState('50');
  const [showBidHistory, setShowBidHistory] = useState(false);
  const [uniqueStreamId, setUniqueStreamId] = useState('');
  const [isAuctionStarted, setIsAuctionStarted] = useState(false);

  const [preBids, setPreBids] = useState<any[]>([]);
  const [highestPreBid, setHighestPreBid] = useState(0);
  const [preBidCount, setPreBidCount] = useState(0);
  
  const [auctionChannel, setAuctionChannel] = useState<Channel | null>(null);

  const navigation = useNavigation();

  useEffect(() => {
    const winnerData = product?.winner || product?.bidderWon || null;
    setBidderWon(winnerData);
    
    if (product?.winningBid !== undefined) {
      setHighestBid(product.winningBid);
    }
    
    if (product?.highestBidder) {
      setHighestBidder(product.highestBidder);
    } else if (product?.currentHighestBidder) {
      setHighestBidder(product.currentHighestBidder);
    }
    
    if (winnerData) {
      setAuctionWinnerData({
        winner: winnerData,
        winningBid: product?.winningBid || product?.currentHighestBid || highestBid,
        reserveMet: product?.reserveMet !== false 
      });
      setIsWinnerFetched(true);
    }

    if (currentAuction?.productId === currentProductId) {
      const isAuctionActive = currentAuction?.isActive || false;
      setIsActive(isAuctionActive);
      
      if (isAuctionActive && currentAuction?.endsAt) {
        const rawEndTime = currentAuction.endsAt;
        const endTime = typeof rawEndTime === 'string' ? Number(rawEndTime) : rawEndTime;
        
        if (!isNaN(endTime) && endTime > 0) {
          setAuctionEndTime(endTime);
          setTimer(Math.max(0, endTime - Date.now()));
        }
      }
      
      if (currentAuction?.currentHighestBid !== undefined) {
        setHighestBid(currentAuction.currentHighestBid);
      }
      
      if (currentAuction?.highestBidder) {
        setHighestBidder(currentAuction.highestBidder);
      }
    } else {
      setIsActive(false);
    }
    
    if (product?.preBidData) {
      setPreBids(product.preBidData.preBids || []);
      setHighestPreBid(product.preBidData.highestPreBid || 0);
      setPreBidCount(product.preBidData.preBidCount || 0);
    }
  }, [currentAuction, product, currentProductId]);

  // ✅ AppSync: Setup auction subscriptions
  useEffect(() => {
    if (!streamId || !user) return;

    let channel: Channel | null = null;

    const setupAppSync = async () => {
      try {
        console.log('🔌 [Auctions Seller] Setting up AppSync for stream:', streamId);
        
        await configureAppSync();
        const channelPath = getAuctionsChannelPath(streamId);
        channel = await connectToChannel(channelPath);
        setAuctionChannel(channel);
        
        subscribeToChannel(
          channel, 
          (data: any) => {
            try {
              let eventData;
              
              if (data?.eventType) {
                eventData = data;
              } else if (data?.event?.eventType) {
                eventData = data.event;
              } else if (data?.event?.event?.eventType) {
                eventData = data.event.event;
              } else {
                return;
              }
              
              const frontendCommands = ['start_auction', 'place_bid', 'clear_auction'];
              if (frontendCommands.includes(eventData.eventType)) {
                const hasBackendFields = eventData.endsAt || eventData.uniqueStreamId || eventData.remainingTime !== undefined;
                if (!hasBackendFields) return;
                if (eventData.eventType === 'start_auction') {
                  eventData.eventType = 'auction_started';
                }
              }
              
              switch (eventData.eventType) {
                case 'auction_started':
                  handleAuctionStarted(eventData);
                  break;
                case 'timer_update':
                  handleTimerUpdate(eventData);
                  break;
                case 'auction_ended':
                  handleAuctionEnded(eventData);
                  break;
                case 'bid_updated':
                  handleBidUpdated(eventData);
                  break;
                case 'pre_bid_updated':
                  handlePreBidUpdated(eventData);
                  break;
                case 'clrScr':
                  handleClearScreen(eventData);
                  break;
              }
            } catch (error) {
              console.error('❌ [Auctions Seller] Error processing event:', error);
            }
          },
          (error: any) => {
            console.error('❌ [Auctions Seller] Subscription error:', error);
          }
        );
        
        console.log('✅ [Auctions Seller] AppSync subscriptions active');
      } catch (error) {
        console.error('❌ [Auctions Seller] Failed to setup AppSync:', error);
      }
    };

    const handleAuctionStarted = (data: any) => {
      if (data.streamId !== streamId) return;
      if (data.auctionId && myAuctionId && data.auctionId !== myAuctionId) return;
      if (!data.auctionId && data.product !== currentProductId) return;
      
      setHighestBid(data.startingBid);
      setIsAuctionStarted(true);
      setIsActive(true);
      setUniqueStreamId(data.uniqueStreamId);

      let endsAtTimestamp;
      if (typeof data.endsAt === 'number') {
        endsAtTimestamp = data.endsAt;
      } else if (typeof data.endsAt === 'string' || data.endsAt instanceof Date) {
        endsAtTimestamp = new Date(data.endsAt).getTime();
      } else {
        endsAtTimestamp = Date.now() + 60000;
      }

      setAuctionEndTime(endsAtTimestamp);
      setTimer(Math.max(0, endsAtTimestamp - Date.now()));

      if (data.nextBids?.length > 0) {
        setNextBids(data.nextBids);
      } else {
        const serverIncrement = data.bidIncrement || Number(bidIncrement) || 50;
        setBidIncrement(serverIncrement.toString());
        setNextBids(calculateNextBids(data.startingBid, serverIncrement));
      }
      
      if (data.bidIncrement) setBidIncrement(data.bidIncrement.toString());
    };

    const handleTimerUpdate = (data: any) => {
      if (data.auctionId && myAuctionId && data.auctionId !== myAuctionId) return;
      if (!data.auctionId && data.product !== currentProductId) return;
      
      if (data.remainingTime !== undefined) {
        if (data.endsAt) {
          const endTime = typeof data.endsAt === 'string' ? Number(data.endsAt) : data.endsAt;
          setAuctionEndTime(endTime);
        }
        
        const newTime = Math.max(0, data.remainingTime);
        setTimer(newTime);
        
        if (newTime > 0 && !isActive) setIsActive(true);
        if (newTime <= 0 && isActive) setIsActive(false);
      }
    };
    
    const handleAuctionEnded = (data: any) => {
      if (data.streamId !== streamId) return;
      if (data.auctionId && myAuctionId && data.auctionId !== myAuctionId) return;
      if (!data.auctionId && data.product !== currentProductId) return;
      
      setIsActive(false);
      setAuctionEndTime(null);
      setTimer(0);
      setBidderWon(data?.highestBidder || data?.bidderWon);
      
      if (data?.highestBidder || data?.bidderWon) {
        const winnerData = {
          winner: data?.highestBidder || data?.bidderWon,
          winningBid: data?.highestBid || highestBid,
          reserveMet: data?.reserveMet !== false,
          totalBidders: data?.totalBidders || 0
        };
        setAuctionWinnerData(winnerData);
        setIsWinnerFetched(true);
         setShowWinnerModal(true)
        // if (winnerData.reserveMet) {
          // setTimeout(() =>, 1000);
        // }
      }
    };

    const handleClearScreen = (data: any) => {
      if (data.streamId !== streamId) return;
      if (data?.product && data.product !== currentProductId) return;

      setHighestBid(parseFloat(startingBid));
      setHighestBidder(null);
      setBidderWon(null);
      setAuctionWinnerData(null);
      setTimer(0);
      setAuctionEndTime(null);
      setBidHistory([]);
      setIsActive(false);
      setIsWinnerFetched(false);
      setIsAuctionStarted(false);
    };

    const handleBidUpdated = (data: any) => {
      if (data.streamId !== streamId) return;
      if (data.auctionId && myAuctionId && data.auctionId !== myAuctionId) return;
      if (!data.auctionId && data.product !== currentProductId) return;
      
      setHighestBid(data?.highestBid);
      setHighestBidder(data?.highestBidder);
      
      if (data.nextBids?.length > 0) {
        setNextBids(data.nextBids);
      } else {
        setNextBids(calculateNextBids(data.highestBid, Number(bidIncrement)));
      }
      
      setBidHistory(prev => [{
        amount: data?.highestBid,
        bidder: data?.highestBidder,
        time: new Date().toLocaleTimeString(),
      }, ...prev]);
    };
    
    const handlePreBidUpdated = (data: any) => {
      if (data.auctionId !== myAuctionId) return;
      setHighestPreBid(data.highestPreBid || 0);
      setPreBidCount(data.preBidCount || 0);
      setPreBids(data.preBids || []);
    };
    
    setupAppSync();

    return () => {
      console.log('🧹 [Auctions Seller] Cleaning up AppSync');
      if (channel) closeChannel(channel);
    };
  }, [streamId, user, myAuctionId, currentProductId]);

  const fetchAuctionWinner = async () => {
    try {
      const response = await auctionService.getAuctionWinner(streamId, currentProductId);
      const data = response.data;
      if (data.success) {
        setBidderWon(data);
        setHighestBid(data.winningBid);
        setAuctionWinnerData({
          winner: data.winner,
          winningBid: data.winningBid,
          reserveMet: data.reserveMet !== false,
        });
        setIsWinnerFetched(true);
      }
    } catch (error) {
      console.log('❌ Error fetching winner:', error);
    }
  };

  useEffect(() => {
    if (streamId && currentProductId && !isWinnerFetched) {
      fetchAuctionWinner();
    }
  }, [streamId, currentProductId]);

  useEffect(() => {
    if (!isActive || !auctionEndTime) return;

    const updateTimer = () => {
      const remainingTime = Math.max(0, auctionEndTime - Date.now());
      setTimer(remainingTime);
      if (remainingTime <= 0) setIsActive(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isActive, auctionEndTime]);

  useEffect(() => {
    const startNum = parseFloat(startingBid);
    const reserveNum = parseFloat(reservedPrice);
    setBidReserveError(null);

    if (reservedPrice && !isNaN(reserveNum) && reserveNum > 0) {
      if (!isNaN(startNum) && startNum > 0) {
        if (bidDirection === 'incremental' && startNum >= reserveNum) {
          setBidReserveError('Starting bid must be less than the reserved price.');
        } else if (bidDirection === 'decremental' && startNum <= reserveNum) {
          setBidReserveError('Starting price must be greater than the reserved price.');
        }
      }
    } else if (reservedPrice && (isNaN(reserveNum) || reserveNum <= 0)) {
      setBidReserveError('Reserved price must be a valid number greater than 0.');
    }
  }, [startingBid, reservedPrice, bidDirection]);

  const calculateNextBids = (currentBid = highestBid, inc = Number(bidIncrement) || 50) => {
    if (bidDirection === 'incremental') {
      return [Math.round(currentBid + inc), Math.round(currentBid + inc * 2)];
    } else if (bidDirection === 'decremental') {
      return [Math.max(0, Math.round(currentBid - inc)), Math.max(0, Math.round(currentBid - inc * 2))];
    }
    return [currentBid + inc, currentBid + inc * 2];
  };

  const formatTime = (ms: number) => {
    if (!ms || isNaN(ms) || ms < 0) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const imageUrl = `${AWS_CDN_URL}${product?.images?.[0]?.key || product?.productId?.images?.[0]?.key}`;

  const handleStartAuction = () => setShowSettings(true);

  const confirmStartAuction = async () => {
    setShowSettings(false);
    if (!auctionChannel) {
      console.error('❌ No auction channel');
      return;
    }
    
    try {
      await auctionChannel.publish({
        event: {
          eventType: 'start_auction',
          streamId,
          product: currentProductId,
          timer: parseInt(customTime),
          bidDirection,
          auctionType,
          increment: auctionType === 'suddenDeath' ? null : increment,
          startingBid: Number(startingBid),
          reservedPrice: Number(reservedPrice),
          bidIncrement: Number(bidIncrement),
          auctionId: myAuctionId,
          auctionNumber: product?.auctionNumber || 1
        }
      });
    } catch (error) {
      console.error('❌ Failed to start auction:', error);
    }
  };

  const handleWinnerPress = () => {
    const winner = bidderWon || auctionWinnerData?.winner;
    if (!winner) return;
    const userName = winner.userName || winner.userInfo?.userName || winner.name;
    if (userName) navigation.navigate('ViewSellerProdile' as never, {id: userName} as never);
  };

  const bidderKey = bidderWon?.profileURL?.key || bidderWon?.product?.images?.[0]?.key || auctionWinnerData?.winner?.profileURL?.key;
  const getUniqueBidders = () => new Set(bidHistory.map(b => b.bidder?.name || 'Unknown')).size;

  const renderBidHistoryItem = ({item, index}: {item: any, index: number}) => (
    <View className={`flex-row justify-between items-center p-3 ${index % 2 === 0 ? 'bg-[#222]' : 'bg-[#1a1a1a]'} border-b border-gray-700`}>
      <View className="flex-1">
        <Text className="text-white font-semibold">{item.bidder?.name || 'Unknown'}</Text>
        <Text className="text-gray-400 text-xs">{item.time}</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <IndianRupee size={14} color="#facc15" />
        <Text className="text-yellow-400 font-bold text-base">{item.amount?.toLocaleString()}</Text>
      </View>
    </View>
  );

  if (!product || !streamId) return null;

  return (
    <>
      {/* Winner Modal */}
      <WinnerModal
        isVisible={showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
        auctionData={{
          winner: bidderWon || auctionWinnerData?.winner,
          winningBid: auctionWinnerData?.winningBid || highestBid,
          reserveMet: auctionWinnerData?.reserveMet !== false,
          productName: product?.title || product?.productId?.title || 'Product',
          productImage: product?.images?.[0]?.key || product?.productId?.images?.[0]?.key,
          auctionId: myAuctionId,
          bidderWon: bidderWon || auctionWinnerData?.winner,
          totalBidders: getUniqueBidders(),
        }}
        onCheckout={undefined}
      />

      {/* Bid History Modal */}
      <Modal visible={showBidHistory} animationType="slide" transparent onRequestClose={() => setShowBidHistory(false)}>
        <View className="flex-1 justify-end">
          <View className="bg-[#1a1a1a] rounded-t-3xl max-h-[70%] border-t-2 border-yellow-400">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-700">
              <View className="flex-row items-center gap-2">
                <History size={20} color="#facc15" />
                <Text className="text-xl font-bold text-white">Bid History</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBidHistory(false)} className="bg-gray-700 rounded-full p-2">
                <Icon name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {bidHistory.length > 0 ? (
              <FlatList data={bidHistory} renderItem={renderBidHistoryItem} keyExtractor={(_, index) => index.toString()} contentContainerStyle={{paddingBottom: 20}} />
            ) : (
              <View className="items-center justify-center p-8">
                <History size={48} color="#666" />
                <Text className="text-gray-400 mt-4">No bids yet</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <SafeAreaView className="flex-1 bg-[#121212]">
          <StatusBar backgroundColor="#facc15" barStyle="dark-content" />
          <View className="bg-yellow-400 px-6 py-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <ChevronLeft size={24} color="black" />
              </TouchableOpacity>
              <Gavel size={20} color="black" />
              <Text className="text-xl font-bold text-black">Auction Settings</Text>
            </View>
          </View>

          <ScrollView className="px-6 py-6" showsVerticalScrollIndicator={false}>
            {/* Auction Type */}
            <View className="space-y-3 mb-4">
              <Text className="text-lg mb-2 font-bold text-white">Auction Type</Text>
              <View className="bg-[#1a1a1a] border border-gray-600 rounded-2xl p-4">
                <View className="flex-row items-center justify-between">
                  <Text className={`font-medium ${auctionType !== 'suddenDeath' ? 'text-yellow-400' : 'text-gray-400'}`}>Default</Text>
                  <ToggleSwitch isOn={auctionType === 'suddenDeath'} onColor={colors.primaryButtonColor} offColor="gray" size="medium" onToggle={() => setAuctionType(auctionType === 'suddenDeath' ? 'default' : 'suddenDeath')} />
                  <Text className={`font-medium ${auctionType === 'suddenDeath' ? 'text-yellow-400' : 'text-gray-400'}`}>Sudden Death</Text>
                </View>
              </View>
            </View>

            {/* Bid Direction */}
            <View className="space-y-3 mb-4">
              <Text className="text-lg mb-2 font-bold text-white">Bidding Direction</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setBidDirection('incremental')} className={`flex-1 p-4 rounded-2xl border-2 ${bidDirection === 'incremental' ? 'bg-yellow-400 border-yellow-400' : 'bg-[#1a1a1a] border-gray-600'}`}>
                  <View className="flex-row items-center gap-2">
                    <ArrowUp color={bidDirection === 'incremental' ? 'black' : '#facc15'} size={18} />
                    <Text className={`font-medium ${bidDirection === 'incremental' ? 'text-black' : 'text-white'}`}>Increment</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setBidDirection('decremental')} className={`flex-1 p-4 rounded-2xl border-2 ${bidDirection === 'decremental' ? 'bg-yellow-400 border-yellow-400' : 'bg-[#1a1a1a] border-gray-600'}`}>
                  <View className="flex-row items-center gap-2">
                    <ArrowDown color={bidDirection === 'decremental' ? 'black' : '#facc15'} size={18} />
                    <Text className={`font-medium ${bidDirection === 'decremental' ? 'text-black' : 'text-white'}`}>Decrement</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Time Extension */}
            {auctionType === 'default' && (
              <View className="space-y-3 mb-4">
                <Text className="text-lg mb-2 font-bold text-white">Time Extension</Text>
                <View className="bg-[#1a1a1a] border border-gray-600 rounded-2xl p-4">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-3">
                      {[2, 5, 10, 15, 30].map(value => (
                        <TouchableOpacity key={value} onPress={() => setIncrement(value)} className={`px-5 py-3 rounded-xl ${increment === value ? 'bg-yellow-400' : 'bg-[#111] border border-gray-600'}`}>
                          <Text className={`font-bold ${increment === value ? 'text-black' : 'text-white'}`}>{value}s</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}

            {/* Price Settings */}
            <View className="space-y-3 mb-4">
              <Text className="text-lg mb-2 font-bold text-white">Price Settings</Text>
              <View className="bg-[#1a1a1a] border border-gray-600 rounded-2xl p-4 space-y-4">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-white mb-2">Starting Bid (₹)</Text>
                    <View className="flex-row items-center bg-[#222] border border-gray-600 rounded-xl pl-2">
                      <IndianRupee size={18} color="#facc15" />
                      <TextInput value={startingBid} onChangeText={setStartingBid} keyboardType="numeric" className="flex-1 text-white ml-2 text-base py-2" placeholder="1000" placeholderTextColor="#9ca3af" />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-white mb-2">Reserve Price (₹)</Text>
                    <View className="flex-row items-center bg-[#222] border border-gray-600 rounded-xl pl-2">
                      <IndianRupee size={18} color="#facc15" />
                      <TextInput value={reservedPrice} onChangeText={setReservedPrice} keyboardType="numeric" className="flex-1 text-white ml-2 text-base py-2" placeholder="Optional" placeholderTextColor="#9ca3af" />
                    </View>
                  </View>
                </View>
                {bidReserveError && (
                  <View className="flex-row items-center gap-2 bg-red-500/20 border border-red-500/50 rounded-xl mt-2 p-3">
                    <AlertCircle size={16} color="#ef4444" />
                    <Text className="text-red-400 text-sm flex-1">{bidReserveError}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Auction Duration */}
            <View className="space-y-3 mb-4">
              <Text className="text-lg mb-2 font-bold text-white">Auction Duration</Text>
              <View className="flex-row items-center bg-[#1a1a1a] border border-gray-600 rounded-xl px-3">
                <Timer size={18} color="#facc15" />
                <TextInput value={customTime} onChangeText={setCustomTime} keyboardType="numeric" className="flex-1 text-white ml-3 text-base py-3" placeholder="300" placeholderTextColor="#9ca3af" />
                <Text className="text-gray-400 text-sm">seconds</Text>
              </View>
            </View>

            {/* Bid Increment */}
            <View className="space-y-3 mb-6">
              <Text className="text-lg mb-2 font-bold text-white">Bid Increment (₹)</Text>
              <View className="flex-row items-center bg-[#1a1a1a] border border-gray-600 rounded-xl px-3">
                <IndianRupee size={18} color="#facc15" />
                <TextInput value={bidIncrement} onChangeText={setBidIncrement} keyboardType="numeric" className="flex-1 text-white ml-3 text-base py-3" placeholder="50" placeholderTextColor="#9ca3af" />
              </View>
              <Text className="text-xs text-gray-400 mt-1">Amount added to each bid suggestion</Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-4 mb-10">
              <TouchableOpacity onPress={() => setShowSettings(false)} className="flex-1 py-4 bg-[#1a1a1a] border border-gray-600 rounded-2xl items-center">
                <Text className="text-white font-bold text-base">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmStartAuction}
                disabled={!startingBid || Number(startingBid) <= 0 || !customTime || Number(customTime) < 10 || (reservedPrice !== '' && Number(reservedPrice) <= 0) || !!bidReserveError}
                className={`flex-1 py-4 flex-row items-center justify-center rounded-2xl gap-2 ${!startingBid || Number(startingBid) <= 0 || !customTime || Number(customTime) < 10 || (reservedPrice !== '' && Number(reservedPrice) <= 0) || !!bidReserveError ? 'bg-[#1a1a1a] border border-gray-600' : 'bg-yellow-400'}`}
              >
                <FontAwesome name="gavel" size={16} color={bidReserveError ? '#fff' : '#000'} />
                <Text className={`font-bold text-base ${!startingBid || Number(startingBid) <= 0 || !customTime || Number(customTime) < 10 || (reservedPrice !== '' && Number(reservedPrice) <= 0) || !!bidReserveError ? 'text-white' : 'text-black'}`}>Start Auction</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Main auction view */}
      <View className="w-full bg-secondary-color border border-gray-700 my-2 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header with timer and controls */}
        <View className="flex-row justify-between items-center p-4 bg-secondary-color border-b border-gray-700">
          <View className="flex-row items-center gap-3">
            <View className="w-8 h-8 bg-yellow-400 rounded-full items-center justify-center">
              <Gavel size={18} color="black" />
            </View>
            <Text className="font-bold text-white text-lg">Live Auction</Text>
          </View>

          {isActive && !bidderWon && !auctionWinnerData ? (
            <View className="flex-row items-center gap-2">
              <View className={`flex-row justify-center items-center gap-2 px-4 py-2 rounded-full border-2 ${timer / 1000 <= 10 ? 'bg-red-500/20 border-red-500' : 'bg-yellow-400/20 border-yellow-400'}`}>
                <Clock size={18} color={timer / 1000 <= 10 ? '#ef4444' : '#facc15'} />
                <Text className={`font-mono font-bold text-lg ${timer / 1000 <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>{formatTime(timer)}</Text>
              </View>
            </View>
          ) : (
            !bidderWon && !auctionWinnerData && (
              <View className="flex-row space-x-3">
                <TouchableOpacity onPress={handleStartAuction} className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-yellow-400 shadow-lg">
                  <Icon name="play-arrow" size={16} color="#000" />
                  <Text className="text-black text-sm font-bold">Start Auction</Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </View>

        {/* Product details */}
        <View className="p-4">
          <View className="flex-row items-center bg-[#333] p-4 rounded-2xl border border-gray-700 shadow-lg">
            <View className="w-16 h-16 bg-gray-700 rounded-2xl overflow-hidden shadow-md">
              <Image source={{uri: imageUrl || '/placeholder.svg'}} className="w-full h-full" resizeMode="cover" />
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-lg font-bold text-white" numberOfLines={1}>{product?.title || product?.productId?.title || 'Product Title'}</Text>
              {!isActive && !bidderWon && !auctionWinnerData && (
                <View className="flex-row items-center gap-1 mt-1">
                  <AlertCircle size={14} color="#facc15" />
                  <Text className="text-xs text-gray-400">Start auction to begin bidding</Text>
                </View>
              )}
            </View>
          </View>

          {/* Pre-bid Info */}
          {!isActive && !bidderWon && !auctionWinnerData && preBidCount > 0 && (
            <View className="bg-stone-900 border border-yellow-500/30 rounded-lg p-2 mt-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center gap-1.5">
                  <View className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                  <Text className="text-xs text-yellow-400 font-bold uppercase">Pre-Bidding</Text>
                </View>
                <Text className="text-xs text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-full font-semibold border border-yellow-500/20">
                  {preBidCount} {preBidCount === 1 ? 'bid' : 'bids'}
                </Text>
              </View>
              {highestPreBid > 0 && (
                <View className="bg-stone-800/50 rounded py-1.5 px-2 border border-yellow-500/20">
                  <View className="flex-row items-center justify-center gap-1 mb-0.5">
                    <Text className="text-xs text-gray-400">Highest:</Text>
                    <IndianRupee size={12} color="#facc15" />
                    <Text className="text-sm font-bold text-yellow-400">{highestPreBid.toLocaleString()}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Bid information */}
          <View className="mt-4">
            {isActive && !bidderWon && !auctionWinnerData && (
              <View className="rounded-2xl p-6 border-2 border-[#333] shadow-lg">
                <Text className="text-sm text-gray-300 text-center font-medium">Current Highest Bid</Text>
                <View className="flex-row items-center justify-center gap-2 mt-2">
                  <IndianRupee size={32} color="#facc15" />
                  <Text className="text-4xl font-bold text-yellow-400">{highestBid?.toLocaleString() || '0'}</Text>
                </View>
                {highestBidder && (
                  <View className="flex-row items-center justify-center gap-2 mt-4 bg-yellow-400/20 py-3 px-4 rounded-2xl border border-yellow-400/30">
                    <Trophy size={18} color="#facc15" />
                    <Text className="text-sm text-yellow-400 font-bold">Leading: {highestBidder.name || 'Unknown Bidder'}</Text>
                  </View>
                )}
              </View>
            )}

            {(bidderWon || auctionWinnerData) && (
              <View className="rounded-2xl overflow-hidden border border-yellow-500/40 bg-gradient-to-b from-amber-900/40 via-yellow-900/30 to-stone-900/60">
                {auctionWinnerData?.reserveMet === false ? (
                  /* Reserve Not Met - Compact Design */
                  <View className="p-4">
                    <View className="flex-row items-center gap-3 mb-3">
                      <View className="bg-red-500/20 rounded-full p-2 border border-red-500/40">
                        <AlertCircle size={20} color="#ef4444" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-red-400 font-bold text-sm">Reserve Not Met</Text>
                        <Text className="text-gray-400 text-xs">Auction ended without sale</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center bg-stone-800/60 rounded-xl p-3 border border-stone-700/50">
                      {bidderKey ? (
                        <Image source={{uri: `${AWS_CDN_URL}${bidderKey}`}} className="w-10 h-10 rounded-full border-2 border-gray-600" resizeMode="cover" />
                      ) : (
                        <View className="w-10 h-10 rounded-full bg-gray-700 items-center justify-center">
                          <Text className="text-gray-400 font-bold">?</Text>
                        </View>
                      )}
                      <View className="flex-1 ml-3">
                        <Text className="text-gray-400 text-xs">Last Bidder</Text>
                        <Text className="text-white font-medium text-sm">{(bidderWon || auctionWinnerData?.winner || highestBidder)?.name || 'Unknown'}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-gray-400 text-xs">Last Bid</Text>
                        <View className="flex-row items-center">
                          <IndianRupee size={14} color="#ef4444" />
                          <Text className="text-red-400 font-bold">{(auctionWinnerData?.winningBid || bidderWon?.winningBid || highestBid)?.toLocaleString() || '0'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  /* Winner - Compact Gradient Design */
                  <View className="p-4">
                    {/* Header Row */}
                    <View className="flex-row items-center justify-center gap-2 mb-3">
                      <Crown size={16} color="#facc15" fill="#facc15" />
                      <Text className="text-yellow-400 font-bold text-sm tracking-wider">WINNER</Text>
                      <Crown size={16} color="#facc15" fill="#facc15" />
                    </View>

                    {/* Winner Info Row */}
                    <TouchableOpacity onPress={handleWinnerPress} activeOpacity={0.8}>
                      <View className="flex-row items-center bg-stone-800/50 rounded-xl p-3 border border-yellow-500/30">
                        {/* Profile */}
                        <View className="relative">
                          {bidderKey ? (
                            <Image source={{uri: `${AWS_CDN_URL}${bidderKey}`}} className="w-12 h-12 rounded-full border-2 border-yellow-400" resizeMode="cover" />
                          ) : (
                            <View className="w-12 h-12 rounded-full bg-yellow-500/20 items-center justify-center border-2 border-yellow-400">
                              <Trophy size={20} color="#facc15" />
                            </View>
                          )}
                          <View className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1">
                            <Trophy size={10} color="#000" />
                          </View>
                        </View>

                        {/* Name & Details */}
                        <View className="flex-1 ml-3">
                          <View className="flex-row items-center gap-1">
                            <Text className="text-yellow-400 font-bold text-base">{(bidderWon || auctionWinnerData?.winner)?.name || 'Unknown'}</Text>
                            <ExternalLink size={12} color="#9ca3af" />
                          </View>
                          <Text className="text-gray-400 text-xs">🎉 Auction Winner</Text>
                        </View>

                        {/* Winning Bid */}
                        <View className="items-end bg-yellow-500/10 rounded-lg px-3 py-2 border border-yellow-500/30">
                          <Text className="text-gray-400 text-xs">Won at</Text>
                          <View className="flex-row items-center">
                            <IndianRupee size={16} color="#facc15" />
                            <Text className="text-yellow-400 font-bold text-lg">{(auctionWinnerData?.winningBid || bidderWon?.winningBid || highestBid)?.toLocaleString() || '0'}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Reserve Met Badge */}
                    {(auctionWinnerData?.reserveMet === true || auctionWinnerData?.reserveMet === undefined) && (
                      <View className="flex-row items-center justify-center mt-3">
                        <View className="bg-green-500/20 rounded-full px-3 py-1 border border-green-500/30">
                          <View className="flex-row items-center gap-1">
                            <View className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                            <Text className="text-green-400 text-xs font-medium">Reserve Met</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </>
  );
};

// ✅ Custom comparison function for memo
const arePropsEqual = (prevProps: any, nextProps: any) => {
  const prevAuction = prevProps.item?.currentAuction || prevProps.currentAuction;
  const nextAuction = nextProps.item?.currentAuction || nextProps.currentAuction;
  
  const prevProductId = prevAuction?.productId?._id || prevAuction?.productId || prevAuction?._id;
  const nextProductId = nextAuction?.productId?._id || nextAuction?.productId || nextAuction?._id;
  
  const prevAuctionId = prevAuction?.auctionObjectId || prevAuction?.auctionId;
  const nextAuctionId = nextAuction?.auctionObjectId || nextAuction?.auctionId;
  
  return (
    prevProps.item?.streamId === nextProps.item?.streamId &&
    prevProductId === nextProductId &&
    prevAuctionId === nextAuctionId &&
    prevAuction?.isActive === nextAuction?.isActive &&
    prevAuction?.currentHighestBid === nextAuction?.currentHighestBid &&
    prevAuction?.winner === nextAuction?.winner &&
    prevAuction?.bidderWon === nextAuction?.bidderWon
  );
};

export default memo(AuctionsSellerControl, arePropsEqual);
