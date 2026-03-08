import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Image } from 'react-native';
import  Ionicons from 'react-native-vector-icons/Ionicons';
import  FontAwesome from 'react-native-vector-icons/FontAwesome';
import  MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { socketurl } from '../../../../Config';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../Utils/Api';

const Auctions = ({  streamId, product, currentAuction }) => {
    const socket = io(socketurl, {
        transports: ['websocket'],
      });
      socket.emit('joinRoom', streamId);
    const [isActive, setIsActive] = useState(false);
    const [user, setUser] = useState(null);
    const [isAuctionStarted, setIsAuctionStarted] = useState(false);
    const [highestBid, setHighestBid] = useState(100);
    const [highestBidder, setHighestBidder] = useState(null);
    const [nextBids, setNextBids] = useState([]);
    const [bidderWon, setBidderWon] = useState(null);
    const [timer, setTimer] = useState(0);
    const [customTime, setCustomTime] = useState(30);
    const [startingBid, setStartingBid] = useState(0);
    const [auctionType, setAuctionType] = useState('default');
    const [increment, setIncrement] = useState(2);
    const [showModal, setShowModal] = useState(false);
    const countdownRef = useRef(null);
    useEffect(() => {
        setHighestBid(currentAuction?.currentHighestBid || 0);
        setHighestBidder(currentAuction?.highestBidder || null);
        
        setIsActive(currentAuction?.isActive || false);
        setBidderWon(currentAuction?.bidderWon || null);
    }, [currentAuction]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
              const id = (await AsyncStorage.getItem('userId')) || '';
              const response = await api.get(`/user/id/${id}`);
              setUser(response.data.data);
            } catch (err) {
              console.log('Error fetching user:', err);
            }
          };
          fetchUser()
    }, []);

    useEffect(() => {
        socket.emit('joinRoom', streamId);

        socket.on("auctionStarted", (data) => {
            if (data.product !== product._id) return;
            setHighestBid(data.startingBid);
            setIsActive(true);

            const remainingTime = Math.max(0, data.endsAt - Date.now());
            setTimer(remainingTime);

            // const increment = data.increment ?? Math.max(500, Math.floor(data.startingBid * 0.1));
           
        });

        socket.on("timerUpdate", (data) => {
            if (data.product !== product._id) return;
            if (data.remainingTime !== undefined) {
                setTimer(data.remainingTime);
                setIsActive(data.remainingTime > 0);
            }
        });

        socket.on("auctionEnded", (data) => {
            if (data.product !== product._id) return;
            setIsActive(false);
            setBidderWon(data?.highestBidder);
        });

        socket.on("clrScr", () => {
            setHighestBid(startingBid);
            setHighestBidder(null);
            setBidderWon(null);
            setTimer(30);
        });

        socket.on('bidUpdated', (data) => {
            if (data.product !== product._id) return;
            setHighestBid(data?.highestBid);
            setHighestBidder(data?.highestBidder);
        });

        return () => {
            socket.off('bidUpdated');
            socket.off("timerUpdate");
            socket.off("auctionStarted");
            socket.off("auctionEnded");
            socket.off("clrScr");
        };
    }, [streamId]);

    const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

  
    const handleClearAuction = () => {
        socket.emit('clearAuction', streamId, product._id);
    };

    const handleStartAuction = () => {
        setShowModal(true);
    };

    const confirmStartAuction = () => {
        setShowModal(false);
        if (auctionType === 'suddenDeath') {
            socket.emit("startAuction", {
                streamId,
                product: product._id,
                timer: customTime,
                auctionType,
                increment: null,
                startingBid: Number(startingBid),
            });
        } else {
            socket.emit("startAuction", {
                streamId,
                product: product._id,
                timer: customTime,
                auctionType,
                increment,
                startingBid: Number(startingBid),
            });
        }
        setIsActive(true)
    };


    return (
        <View style={{ flex: 1, backgroundColor: '#111', padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 }}>
                {isActive ? (
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: timer / 1000 <= 11 ? 'red' : 'white' }}>
                        {formatTime(timer)}
                    </Text>
                ) : null}
                {!isActive && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={handleStartAuction}>
                            <Ionicons name="play-circle" size={24} color="white" />
                        </TouchableOpacity>
                        {bidderWon && (
                            <TouchableOpacity onPress={handleClearAuction}>
                                <MaterialCommunityIcons name="clock" size={24} color="red" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', padding: 16, borderRadius: 8 }}>
                {/* <Image source={{ uri: signedUrls[product.productId._id] }} style={{ width: 80, height: 80, objectFit: 'contain' }} /> 
                <View style={{ marginLeft: 16 }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>{product?.title}</Text>
                    <Text style={{ color: '#ccc', fontSize: 12, numberOfLines: 2 }}>{product?.description}</Text>
                </View>
            </View> */}

            <View style={{ textAlign: 'center', marginTop: 16 }}>
                {/* {isActive && ( */}
                    <>
                        <Text style={{ fontSize: 14, color: '#ccc' }}>Current Bid</Text>
                        <Text style={{ fontSize: 32, fontWeight: 'bold', color: 'yellow', flexDirection: 'row', justifyContent: 'center' }}>
                            <FontAwesome name="rupee" size={18} /> {highestBid?.toLocaleString()}
                        </Text>
                    </>
                {bidderWon && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                        <Ionicons name="trophy" size={16} color="yellow" />
                        <Text style={{ fontSize: 14, color: 'yellow' }}>Winner: {bidderWon.name}</Text>
                    </View>
                )}
                {highestBidder && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                        <Ionicons name="trophy" size={16} color="yellow" />
                        <Text style={{ fontSize: 14, color: 'yellow' }}>Highest Bidder: {highestBidder.name}</Text>
                    </View>
                )}
            </View>

            {/* <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                <TouchableOpacity onPress={() => handleBid(nextBid1)} disabled={!isActive || !user || user?._id === highestBidder?._id}>
                    <View style={{ backgroundColor: 'yellow', padding: 12, borderRadius: 25 }}>
                        <Text>Bid <FontAwesome name="rupee" size={12} /> {nextBid1.toLocaleString()}</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleBid(nextBid2)} disabled={!isActive || !user || user?._id === highestBidder?._id}>
                    <View style={{ backgroundColor: 'yellow', padding: 12, borderRadius: 25 }}>
                        <Text>Bid <FontAwesome name="rupee" size={12} /> {nextBid2.toLocaleString()}</Text>
                    </View>
                </TouchableOpacity>
            </View> */}

            <Modal
                animationType="slide"
                transparent={true}
                visible={showModal}
                onRequestClose={() => setShowModal(false)}
            >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <View style={{ backgroundColor: '#333', padding: 16, borderRadius: 8, width: '80%' }}>
                        <Text style={{ fontSize: 20, color: 'white', marginBottom: 16 }}>Auction Settings</Text>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'white' }}>Increment:</Text>
                            <TextInput
                                value={increment.toString()}
                                onChangeText={(text) => setIncrement(parseInt(text))}
                                style={{ backgroundColor: '#444', padding: 8, borderRadius: 4, color: 'white' }}
                            />
                        </View>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'white' }}>Starting Bid:</Text>
                            <TextInput
                                value={startingBid.toString()}
                                onChangeText={(text) => setStartingBid(parseInt(text))}
                                keyboardType="numeric"
                                style={{ backgroundColor: '#444', padding: 8, borderRadius: 4, color: 'white' }}
                            />
                        </View>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ color: 'white' }}>Auction Time (Seconds):</Text>
                            <TextInput
                                value={customTime.toString()}
                                onChangeText={(text) => setCustomTime(parseInt(text))}
                                keyboardType="numeric"
                                style={{ backgroundColor: '#444', padding: 8, borderRadius: 4, color: 'white' }}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <TouchableOpacity onPress={confirmStartAuction} style={{ backgroundColor: 'green', padding: 12, borderRadius: 25 }}>
                                <Text style={{ color: 'white' }}>Start</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowModal(false)} style={{ backgroundColor: 'red', padding: 12, borderRadius: 25 }}>
                                <Text style={{ color: 'white' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default Auctions;
