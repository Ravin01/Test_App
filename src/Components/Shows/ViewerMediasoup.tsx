'use client';
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  Button,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import {io} from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import {MediaStream, RTCView} from 'react-native-webrtc';
import axios from 'axios';
import { GET_SINGLE_STREAM_DATA, mediaSoupServerUrl , GET_STREAM_VIEWERS_COUNT} from '../../../Config';
import { colors } from '../../Utils/Colors';

const {width, height} = Dimensions.get('window');

const Viewer = ({navigation, sellerId,isMuted,setIsMuted,setViewerCount}) => {
  const [streamData, setStreamData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Not connected');
  const [logs, setLogs] = useState([]);
  const [videoElements, setVideoElements] = useState([]);
  const [consumers, setConsumers] = useState([]);
  const [showControls, setShowControls] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(2); // High quality by default
  // const [isMuted, setIsMuted] = useState(false);
  // const [viewerCount, setViewerCount] = useState(0);
  const [streamEnded, setStreamEnded] = useState(false);

  const socketRef = useRef(null);
  const deviceRef = useRef(null);
  const consumerTransportsRef = useRef({});
  const consumersRef = useRef(new Map());
  const roomIdRef = useRef(null);
  const consumedProducersRef = useRef(new Set());
  const producerTrackingRef = useRef(new Map());
  const heartbeatIntervalRef = useRef(null);

  // Add log message
  const addLog = message => {
    // console.log(message);
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };


// Function to manually fetch viewers count from API
  const fetchViewersCount = async (streamId) => {
    try {
      const response = await axios.get(`${GET_STREAM_VIEWERS_COUNT}/${streamId}/viewers-count`);
      if (response.data && response.data.count !== undefined) {
        setViewerCount(response.data.count);
        addLog(`Fetched viewers count: ${response.data.count}`);
        return response.data.count;
      }
    } catch (error) {
      addLog(`Error fetching viewers count: ${error.message}`);
    }
    return null;
  }

  // Function to update viewer count when viewer joins/leaves
  const updateViewerCount = async (streamId, increment = true) => {
    try {
      // First get current count
      const currentResponse = await axios.get(`${GET_STREAM_VIEWERS_COUNT}/${streamId}/viewers-count`);
      let currentCount = 0;

      if (currentResponse.data && currentResponse.data.count !== undefined) {
        currentCount = currentResponse.data.count;
      }

      // Calculate new count
      const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);

      // Update count in backend
      const updateResponse = await axios.post(`${GET_SINGLE_STREAM_DATA}/${streamId}/viewers`, {
        count: newCount
      });

      if (updateResponse.data && updateResponse.data.status) {
        addLog(`Updated viewer count: ${increment ? 'joined' : 'left'} - new count: ${newCount}`);

        // Emit socket event to notify other participants
        if (socketRef.current) {
          socketRef.current.emit('viewerCountUpdate', {
            streamId: streamId,
            count: newCount,
            action: increment ? 'join' : 'leave'
          });
        }

        return newCount;
      }
    } catch (error) {
      addLog(`Error updating viewer count: ${error.message}`);
    }
    return null;
  }

  // Initialize socket connection
  useEffect(() => {
    const serverUrl = mediaSoupServerUrl;
    addLog(`Connecting to server: ${serverUrl}`);

    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current.on('connect', () => {
      addLog(`Connected to server: ${socketRef.current.id}`);
      setIsConnected(true);
      setStatusMessage('Connected to server');
    });

    socketRef.current.on('connect_error', err => {
      addLog(`Connection error: ${err.message}`);
      setStatusMessage(`Connection error: ${err.message}`);
    });

    socketRef.current.on('disconnect', () => {
      addLog('Disconnected from server');
      setIsConnected(false);
      setStatusMessage('Disconnected from server');
      handleStopWatching();
    });

    socketRef.current.on('newProducer', async ({producerId, kind}) => {
      addLog(`New ${kind} producer available: ${producerId}`);
      
      if (consumedProducersRef.current.has(producerId)) {
        addLog(`Already consuming producer ${producerId}, ignoring duplicate`);
        return;
      }
      
      if (isWatching && roomIdRef.current) {
        await consumeProducer(roomIdRef.current, producerId, kind);
      }
    });

    socketRef.current.on('producerClosed', ({producerId}) => {
      addLog(`Producer ${producerId} closed`);
      
      consumedProducersRef.current.delete(producerId);
      producerTrackingRef.current.delete(producerId);
      
      setVideoElements(prev => prev.filter(v => v.producerId !== producerId));
      
      for (const [consumerId, data] of consumersRef.current.entries()) {
        if (data.producerId === producerId) {
          if (data.consumer) {
            data.consumer.close();
          }
          consumersRef.current.delete(consumerId);
        }
      }
      
      setConsumers(prev => prev.filter(c => c.producerId !== producerId));
    });

    socketRef.current.on('streamEnded', ({streamId, reason}) => {
      addLog(`Stream has ended: ${streamId}. Reason: ${reason || 'Unknown'}`);
      setStreamEnded(true);
      handleStopWatching();
      setStatusMessage('This stream has ended');
      
      setTimeout(() => {
        // Alert.alert(
        //   'Stream Ended',
        //   'The live stream has ended.',
        //   [
        //     {text: 'OK', onPress: () => navigation.goBack()}
        //   ]
        // );
      }, 1000);
    });

    socketRef.current.on('viewerCountUpdate', ({streamId, count}) => {
      if (roomIdRef.current === streamId) {
        addLog(`Viewer count updated: ${count} viewers`);
        setViewerCount(count);
      }
    });

    socketRef.current.on('heartbeat', (data, callback) => {
      if (typeof callback === 'function') {
        callback({received: true, timestamp: Date.now()});
      }
    });

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Update isWatching dependency for newProducer handler
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.off('newProducer');
      
      socketRef.current.on('newProducer', async ({producerId, kind}) => {
        addLog(`New ${kind} producer available: ${producerId}`);
        
        if (consumedProducersRef.current.has(producerId)) {
          addLog(`Already consuming producer ${producerId}, ignoring duplicate`);
          return;
        }
        
        if (isWatching && roomIdRef.current) {
          await consumeProducer(roomIdRef.current, producerId, kind);
        }
      });
    }
  }, [isWatching]);

  // Set up heartbeat for the viewer
  useEffect(() => {
    if (isWatching && roomIdRef.current) {
      heartbeatIntervalRef.current = setInterval(() => {
        if (roomIdRef.current) {
          axios
            .get(`${GET_SINGLE_STREAM_DATA}/${roomIdRef.current}`)
            .catch(err => {
              console.error('Error sending viewer heartbeat:', err);
            });
        }
      }, 60000);
      
      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      };
    }
  }, [isWatching, roomIdRef.current]);

  const loadDevice = async routerRtpCapabilities => {
    try {
      addLog('Loading mediasoup device');
      deviceRef.current = new mediasoupClient.Device();
      await deviceRef.current.load({routerRtpCapabilities});
      addLog('Device loaded successfully');
      return true;
    } catch (error) {
      addLog(`Failed to load device: ${error.message}`);
      setStatusMessage(`Error: ${error.message}`);
      return false;
    }
  };

  const createConsumerTransport = async roomId => {
    try {
      addLog(`Requesting consumer transport for room: ${roomId}`);
      
      const transportOptions = await new Promise((resolve, reject) => {
        socketRef.current.emit('createConsumerTransport', {roomId}, response => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      addLog('Creating consumer transport');
      const transport = deviceRef.current.createRecvTransport(transportOptions);
      const transportId = transport.id;

      transport.on('connect', async ({dtlsParameters}, callback, errback) => {
        addLog(`Consumer transport connect event for transport: ${transportId}`);
        try {
          await new Promise((resolve, reject) => {
            socketRef.current.emit(
              'connectConsumerTransport',
              {dtlsParameters, transportId, roomId},
              response => {
                if (response.error) {
                  reject(new Error(response.error));
                } else {
                  resolve(response);
                }
              },
            );
          });

          addLog(`Consumer transport connected: ${transportId}`);
          callback();
        } catch (error) {
          addLog(`Consumer transport connect error: ${error.message}`);
          errback(error);
        }
      });

      transport.on('connectionstatechange', state => {
        addLog(`Consumer transport connection state for transport ${transportId}: ${state}`);
        if (state === 'failed') {
          addLog(`Transport ${transportId} failed - closing`);
          transport.close();
          delete consumerTransportsRef.current[transportId];
        }
      });

      addLog(`Consumer transport created successfully: ${transportId}`);
      return transport;
    } catch (error) {
      addLog(`Error creating consumer transport: ${error.message}`);
      setStatusMessage(`Transport error: ${error.message}`);
      return null;
    }
  };

  const setPreferredLayers = async (consumerId, consumer) => {
    if (!consumer || consumer.kind !== 'video') return;

    try {
      const spatialLayer = Math.min(selectedLayerIndex, 2);
      
      addLog(`Setting preferred layers for consumer ${consumerId}: spatial=${spatialLayer}, temporal=2`);
      
      await consumer.setPreferredLayers({spatialLayer, temporalLayer: 2});
    } catch (error) {
      addLog(`Error setting preferred layers: ${error.message}`);
    }
  };

  const getSellerFromProducerId = producerId => {
    if (producerTrackingRef.current.has(producerId)) {
      return producerTrackingRef.current.get(producerId);
    }

    const producer = streamData?.producers?.find(
      p => p.videoProducerId === producerId || p.audioProducerId === producerId,
    );

    if (producer) {
      const sellerInfo = {
        sellerId: producer.sellerId,
        socketId: producer.socketId,
        isHost: producer === streamData?.producers[0],
      };
      producerTrackingRef.current.set(producerId, sellerInfo);
      return sellerInfo;
    }

    return null;
  };

  const hasVideoElementForSeller = (sellerId, socketId) => {
    if (!sellerId || !socketId) return false;

    return videoElements.some(v => {
      const vSellerInfo = getSellerFromProducerId(v.producerId);
      return (
        vSellerInfo &&
        vSellerInfo.sellerId === sellerId &&
        vSellerInfo.socketId === socketId
      );
    });
  };

  const consumeProducer = async (roomId, producerId, kind) => {
    try {
      if (consumedProducersRef.current.has(producerId)) {
        addLog(`Already consuming producer ${producerId}, skipping`);
        return null;
      }

      const sellerInfo = getSellerFromProducerId(producerId);

      if (kind === 'video' && sellerInfo) {
        if (hasVideoElementForSeller(sellerInfo.sellerId, sellerInfo.socketId)) {
          addLog(`Already have a video for seller ${sellerInfo.sellerId}, updating instead of creating new`);
        }
      }

      addLog(`Consuming ${kind} producer: ${producerId}`);
      consumedProducersRef.current.add(producerId);

      if (!consumerTransportsRef.current[producerId]) {
        const transport = await createConsumerTransport(roomId);
        if (!transport) {
          throw new Error(`Failed to create transport for producer: ${producerId}`);
        }
        consumerTransportsRef.current[producerId] = transport;
      }

      const transport = consumerTransportsRef.current[producerId];

      const preferredLayers = kind === 'video'
        ? {spatialLayer: selectedLayerIndex, temporalLayer: 2}
        : null;

      const {id, rtpParameters} = await new Promise((resolve, reject) => {
        socketRef.current.emit(
          'consume',
          {
            transportId: transport.id,
            producerId,
            rtpCapabilities: deviceRef.current.rtpCapabilities,
            roomId,
            preferredLayers,
          },
          response => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          },
        );
      });

      const consumer = await transport.consume({
        id,
        producerId,
        kind,
        rtpParameters,
      });

      consumersRef.current.set(consumer.id, {
        consumer,
        producerId,
        kind,
        sellerInfo,
      });

      if (kind === 'video') {
        await setPreferredLayers(consumer.id, consumer);
      }

      let resumeSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!resumeSuccess && retryCount < maxRetries) {
        try {
          await new Promise((resolve, reject) => {
            socketRef.current.emit(
              'resumeConsumer',
              {roomId, consumerId: consumer.id},
              response => {
                if (response && response.error) {
                  reject(new Error(response.error));
                } else {
                  resolve(response);
                }
              },
            );

            setTimeout(() => {
              reject(new Error('Resume consumer timeout'));
            }, 5000);
          });

          resumeSuccess = true;
          addLog(`Successfully resumed consumer ${consumer.id}`);
        } catch (error) {
          retryCount++;
          addLog(`Error resuming consumer (attempt ${retryCount}): ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!resumeSuccess) {
        addLog(`Failed to resume consumer after ${maxRetries} attempts`);
      }

      addLog(`Successfully consuming ${kind} with ID: ${consumer.id}`);

      setConsumers(prev => {
        const exists = prev.some(c => c.id === consumer.id);
        if (exists) return prev;
        return [...prev, consumer];
      });

      if (kind === 'video') {
        updateVideoElements(producerId, consumer, sellerInfo);
      } else if (kind === 'audio') {
        updateAudioForVideoElement(producerId, consumer, sellerInfo);
      }

      consumer.on('transportclose', () => {
        addLog(`Consumer transport closed for ${kind} consumer ${consumer.id}`);
        consumersRef.current.delete(consumer.id);
      });

      consumer.on('trackended', () => {
        addLog(`Track ended for ${kind} consumer ${consumer.id}`);
      });

      return consumer;
    } catch (error) {
      addLog(`Error consuming ${kind}: ${error.message}`);
      consumedProducersRef.current.delete(producerId);
      return null;
    }
  };

  const updateVideoElements = (producerId, consumer, sellerInfo) => {
    setVideoElements(prev => {
      const existingProducerIndex = prev.findIndex(v => v.producerId === producerId);
      
      const existingSellerIndex = sellerInfo
        ? prev.findIndex(v => {
            const vSellerInfo = getSellerFromProducerId(v.producerId);
            return (
              vSellerInfo &&
              vSellerInfo.sellerId === sellerInfo.sellerId &&
              vSellerInfo.socketId === sellerInfo.socketId
            );
          })
        : -1;

      if (existingProducerIndex !== -1) {
        const updated = [...prev];
        const currentStream = updated[existingProducerIndex].stream;
        const newStream = new MediaStream();

        currentStream.getTracks().forEach(track => {
          if (track.kind === 'audio') {
            newStream.addTrack(track);
          }
        });

        newStream.addTrack(consumer.track);

        updated[existingProducerIndex] = {
          ...updated[existingProducerIndex],
          stream: newStream,
          streamURL: newStream.toURL(),
          consumer,
          isHost: sellerInfo?.isHost,
        };

        addLog(`Updated video for producer: ${producerId}`);
        return updated;
      } else if (existingSellerIndex !== -1) {
        const updated = [...prev];
        const currentStream = updated[existingSellerIndex].stream;
        const newStream = new MediaStream();

        currentStream.getTracks().forEach(track => {
          if (track.kind === 'audio') {
            newStream.addTrack(track);
          }
        });

        newStream.addTrack(consumer.track);

        updated[existingSellerIndex] = {
          ...updated[existingSellerIndex],
          stream: newStream,
          streamURL: newStream.toURL(),
          videoProducerId: producerId,
          consumer,
          isHost: sellerInfo?.isHost,
        };

        addLog(`Updated video for seller ${sellerInfo.sellerId} with new producer: ${producerId}`);
        return updated;
      } else {
        const newStream = new MediaStream([consumer.track]);
        addLog(`Created new video element for producer: ${producerId}`);
        return [
          ...prev,
          {
            producerId,
            stream: newStream,
            streamURL: newStream.toURL(),
            label: getProducerLabel(producerId),
            consumer,
            sellerId: sellerInfo?.sellerId,
            isHost: sellerInfo?.isHost,
          },
        ];
      }
    });
  };

  const updateAudioForVideoElement = (producerId, consumer, sellerInfo) => {
    setVideoElements(prev => {
      const exactProducerIndex = prev.findIndex(v => v.producerId === producerId);
      
      const sellerIndex = sellerInfo
        ? prev.findIndex(v => {
            const vSellerInfo = getSellerFromProducerId(v.producerId);
            return (
              vSellerInfo &&
              vSellerInfo.sellerId === sellerInfo.sellerId &&
              vSellerInfo.socketId === sellerInfo.socketId
            );
          })
        : -1;

      if (exactProducerIndex !== -1) {
        const updated = [...prev];
        const currentStream = updated[exactProducerIndex].stream;
        const newStream = new MediaStream();

        currentStream.getTracks().forEach(track => {
          if (track.kind === 'video') {
            newStream.addTrack(track);
          }
        });

        newStream.addTrack(consumer.track);

        updated[exactProducerIndex] = {
          ...updated[exactProducerIndex],
          stream: newStream,
          streamURL: newStream.toURL(),
          audioConsumer: consumer,
        };

        addLog(`Added audio to existing video for producer: ${producerId}`);
        return updated;
      } else if (sellerIndex !== -1) {
        const updated = [...prev];
        const currentStream = updated[sellerIndex].stream;
        const newStream = new MediaStream();

        currentStream.getTracks().forEach(track => {
          if (track.kind === 'video') {
            newStream.addTrack(track);
          }
        });

        newStream.addTrack(consumer.track);

        updated[sellerIndex] = {
          ...updated[sellerIndex],
          stream: newStream,
          streamURL: newStream.toURL(),
          audioProducerId: producerId,
          audioConsumer: consumer,
        };

        addLog(`Added audio to existing video for seller: ${sellerInfo.sellerId}`);
        return updated;
      } else {
        const newStream = new MediaStream([consumer.track]);
        addLog(`Created new audio-only element for producer: ${producerId}`);
        return [
          ...prev,
          {
            producerId,
            stream: newStream,
            streamURL: newStream.toURL(),
            label: `${getProducerLabel(producerId)} (audio only)`,
            consumer,
            sellerId: sellerInfo?.sellerId,
            audioOnly: true,
            isHost: sellerInfo?.isHost,
          },
        ];
      }
    });
  };

  const getProducerLabel = producerId => {
    const producer = streamData?.producers?.find(
      p => p.videoProducerId === producerId || p.audioProducerId === producerId,
    );

    if (producer) {
      return producer.sellerId || `Producer ${producerId.substring(0, 8)}...`;
    }

    return `Producer ${producerId.substring(0, 8)}...`;
  };

  const handleGetStream = async () => {
    try {
      addLog(`Fetching stream data for ID: ${sellerId}`);
      const response = await axios.get(`${GET_SINGLE_STREAM_DATA}/${sellerId}`);
      
      if (response.data.status && response.data.data) {
        const stream = response.data.data;

        if (stream.streamStatus !== 'live') {
          setStreamEnded(true);
          setStatusMessage('This stream is no longer live');
          addLog('Stream is not live');
          return;
        }

        setStreamData(stream);
        addLog(`Stream data received: ${stream._id}`);
        roomIdRef.current = stream._id;
        await handleWatchStream(stream);
      } else {
        addLog('Invalid stream data received');
        setStatusMessage('Stream not found');
      }
    } catch (err) {
      console.log('Error fetching stream:', err.response.data);
      addLog(`Error getting stream data: ${err.message}`);
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  const handleWatchStream = async stream => {
    if (isWatching || !stream || streamEnded) return;

    setStatusMessage('Connecting to stream...');
    addLog(`Starting to watch stream: ${stream._id}`);

    try {
      setVideoElements([]);
      setConsumers([]);
      consumedProducersRef.current.clear();
      consumersRef.current.clear();
      producerTrackingRef.current.clear();

      Object.values(consumerTransportsRef.current).forEach(transport => {
        if (transport) transport.close();
      });
      consumerTransportsRef.current = {};

      addLog(`Joining room: ${stream._id}`);
      await new Promise((resolve, reject) => {
        socketRef.current.emit('joinRoom', {roomId: stream._id}, response => {
          if (response && response.joined) {
            resolve();
            addLog(`Successfully joined room: ${stream._id}`);
          } else {
            reject(new Error('Failed to join room'));
          }
        });

        setTimeout(() => {
          reject(new Error('Join room timeout'));
        }, 5000);
      });

      addLog('Getting router RTP capabilities');
      const routerRtpCapabilities = await new Promise((resolve, reject) => {
        socketRef.current.emit('getRouterRtpCapabilities', {roomId: stream._id}, data => {
          if (data && data.error) {
            reject(new Error(data.error));
          } else if (!data) {
            reject(new Error('No RTP capabilities received'));
          } else {
            resolve(data);
          }
        });

        setTimeout(() => {
          reject(new Error('Get RTP capabilities timeout'));
        }, 5000);
      });

      if (!(await loadDevice(routerRtpCapabilities))) {
        throw new Error('Failed to load device');
      }

      if (stream.producers) {
        for (const producer of stream.producers) {
          if (producer.videoProducerId) {
            producerTrackingRef.current.set(producer.videoProducerId, {
              sellerId: producer.sellerId,
              socketId: producer.socketId,
              isHost: producer === stream.producers[0],
            });
          }
          if (producer.audioProducerId) {
            producerTrackingRef.current.set(producer.audioProducerId, {
              sellerId: producer.sellerId,
              socketId: producer.socketId,
              isHost: producer === stream.producers[0],
            });
          }
        }
      }

      addLog('Getting active producers');
      const activeProducers = await new Promise((resolve, reject) => {
        socketRef.current.emit('getProducers', {roomId: stream._id}, data => {
          if (!data) {
            resolve([]);
          } else {
            resolve(data);
          }
        });

        setTimeout(() => {
          reject(new Error('Get producers timeout'));
        }, 5000);
      });

      addLog(`Found ${activeProducers.length} active producers`);
      setIsWatching(true);

      const videoProducers = activeProducers.filter(p => p.kind === 'video');
      for (const {producerId, kind} of videoProducers) {
        const sellerInfo = getSellerFromProducerId(producerId);
        if (sellerInfo && hasVideoElementForSeller(sellerInfo.sellerId, sellerInfo.socketId)) {
          addLog(`Skipping duplicate video for seller ${sellerInfo.sellerId}`);
          continue;
        }
        await consumeProducer(stream._id, producerId, kind);
      }

      const audioProducers = activeProducers.filter(p => p.kind === 'audio');
      for (const {producerId, kind} of audioProducers) {
        await consumeProducer(stream._id, producerId, kind);
      }

      setVideoElements(prev => {
        const uniqueElements = [];
        const seenSellerIds = new Set();

        for (const element of prev) {
          const sellerInfo = getSellerFromProducerId(element.producerId);

          if (!sellerInfo || !seenSellerIds.has(sellerInfo.socketId)) {
            if (sellerInfo) {
              seenSellerIds.add(sellerInfo.socketId);
            }
            uniqueElements.push(element);
          }
        }

        return uniqueElements;
      });

      setStatusMessage('Connected to stream - Watching Live');
      addLog('Started watching stream successfully');
    } catch (error) {
      addLog(`Error watching stream: ${error.message}`);
      setStatusMessage(`Stream error: ${error.message}`);
      setIsWatching(false);
    }
  };

  const handleStopWatching = () => {
    addLog('Stopping stream playback');

    consumers.forEach(consumer => {
      if (consumer) {
        consumer.close();
      }
    });

    Object.values(consumerTransportsRef.current).forEach(transport => {
      if (transport) {
        transport.close();
      }
    });

    consumersRef.current.clear();
    consumerTransportsRef.current = {};
    consumedProducersRef.current.clear();
    producerTrackingRef.current.clear();
    setVideoElements([]);
    setConsumers([]);

        // Update viewer count - viewer left (only if not due to stream ending)
    if (roomIdRef.current && !streamEnded) {
      addLog("Updating viewer count - viewer left");
      updateViewerCount(roomIdRef.current, false).catch(err => {
        addLog(`Error updating viewer count on leave: ${err.message}`);
      });
    }
    
    setIsWatching(false);

    if (!streamEnded) {
      setStatusMessage('Disconnected from stream');
    }

    addLog('Stopped watching stream');
  };

  const changeQuality = async index => {
    setSelectedLayerIndex(index);
    addLog(`Changing quality to level ${index}`);

    for (const [consumerId, data] of consumersRef.current.entries()) {
      if (data.kind === 'video') {
        await setPreferredLayers(consumerId, data.consumer);
      }
    }
  };

  const refreshStream = async () => {
    if (isWatching) {
      handleStopWatching();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    handleGetStream();
  };

  useEffect(() => {
    if (sellerId) {
      handleGetStream();
    }

    return () => {
      handleStopWatching();
    };
  }, [sellerId]);
  

const muteAllAudio = (mute = true) => {
  for (const [consumerId, data] of consumersRef.current.entries()) {
    if (data.kind === 'audio' && data.consumer?.track) {
      data.consumer.track.enabled = !mute;
      addLog(`Global mute: ${mute ? 'Muted' : 'Unmuted'} ${data.producerId}`);
    }
  }
};

useEffect(()=>{
muteAllAudio(isMuted)  
},[isMuted])

  const renderVideo = (video, spanTwo = false) => {
    // console.log(video)
      // console.log(sellerId)
// const toggleMuteForProducer = (producerId, muted) => {
//   // console.log('mute audio func called')
//   const audioConsumerEntry = Array.from(consumersRef.current.values()).find(
//     c => c.producerId === producerId && c.kind === 'audio'
//   );

//   if (audioConsumerEntry?.consumer?.track) {
//     audioConsumerEntry.consumer.track.enabled = !muted;
//     addLog(`Audio track for ${producerId} ${muted ? 'muted' : 'unmuted'}`);
//   }
// };
// // console.log(isMuted,'ismuren')
// if(isMuted)
//   toggleMuteForProducer(video.producerId,isMuted)
    return (
      <View
        key={`video-${video.producerId}`}
        style={styles.videoContainer}>
        {/* // style={[styles.videoContainer, spanTwo && styles.spanTwo]}> */}
        {video.streamURL ? (
          <RTCView
            streamURL={video.streamURL}
            style={[StyleSheet.absoluteFill,{borderRadius:10}]}
            objectFit="cover"
            mirror={false}
            // zOrder={0}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholderContainer]}>
            <Text style={styles.placeholderText}>Loading video...</Text>
          </View>
        )}
        {/* <View style={styles.label}>
          <Text style={styles.labelText}>
            {video.sellerId || 'Broadcaster'}
          </Text>
        </View> */}
        {/* {video.isHost && (
          <View style={styles.hostBadge}>
            <Text style={styles.hostBadgeText}>HOST</Text>
          </View>
        )} */}
      </View>
    );
  };

  const renderControls = () => (
    <View style={styles.controlsContainer}>
      <View style={styles.qualityControls}>
        <TouchableOpacity
          style={[
            styles.qualityButton,
            selectedLayerIndex === 0 && styles.activeQualityButton,
          ]}
          onPress={() => changeQuality(0)}>
          <Text
            style={[
              styles.qualityButtonText,
              selectedLayerIndex === 0 && styles.activeQualityButtonText,
            ]}>
            SD
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.qualityButton,
            selectedLayerIndex === 1 && styles.activeQualityButton,
          ]}
          onPress={() => changeQuality(1)}>
          <Text
            style={[
              styles.qualityButtonText,
              selectedLayerIndex === 1 && styles.activeQualityButtonText,
            ]}>
            HD
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.qualityButton,
            selectedLayerIndex === 2 && styles.activeQualityButton,
          ]}
          onPress={() => changeQuality(2)}>
          <Text
            style={[
              styles.qualityButtonText,
              selectedLayerIndex === 2 && styles.activeQualityButtonText,
            ]}>
            Full
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionControls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.muteButton]}
          onPress={() => setIsMuted(!isMuted)}>
          <Text style={styles.controlButtonText}>
            {isMuted ? '🔇' : '🔊'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            isWatching ? styles.stopButton : styles.refreshButton,
          ]}
          onPress={isWatching ? handleStopWatching : refreshStream}>
          <Text style={styles.controlButtonText}>
            {isWatching ? '⏹️' : '🔄'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.logsButton]}
          onPress={() => setShowLogs(!showLogs)}>
          <Text style={styles.controlButtonText}>
            {showLogs ? '📖' : '📋'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getGridLayout = () => {
    const numVideos = videoElements.length;
    if (numVideos === 1) return {numColumns: 1};
    if (numVideos === 2) return {numColumns: 1}; // Stack vertically on mobile
    if (numVideos === 3) return {numColumns: 2};
    if (numVideos === 4) return {numColumns: 2};
    return {numColumns: 2};
  };

 const renderVideoGrid = () => {
  if (videoElements.length === 0 && !streamEnded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primaryButtonColor} size='small' />
        {/* <Text style={styles.loadingText}>
          {isConnected
            ? isWatching
              ? 'Waiting for broadcast...'
              : 'Connecting...'
            : 'Connecting to server...'}
        </Text> */}
      </View>
    );
  }

  // Full screen for single video
  // console.log(videoElements.length)
  if (videoElements.length === 1) {
    return (
      <View style={styles.singleVideoContainer}>
        {renderVideo(videoElements[0], true)}
      </View>
    );
  }
   if (videoElements.length === 2) {
    return (
      <View style={styles.threeVideoLayout}>
        <View style={styles.mainVideoContainer}>
          {renderVideo(videoElements[0], true)}
        </View>
        <View style={styles.cohostContainer}>
          {videoElements.slice(1).map(video => renderVideo(video))}
        </View>
      </View>
    );
  }

  // Special layout for 3 videos
  if (videoElements.length === 3) {
    return (
      <View style={styles.threeVideoLayout}>
        <View style={styles.mainVideoContainer}>
          {renderVideo(videoElements[0], true)}
        </View>
        <View style={styles.cohostContainer}>
          {videoElements.slice(1).map(video => renderVideo(video))}
        </View>
      </View>
    );
  }

  // Special layout for 4 videos
// Special layout for 4 videos → 2x2 grid
if (videoElements.length === 4) {
  return (
    <View style={styles.fourGrid}>
      {videoElements.map(video => (
        <View style={styles.quarterBox} key={video.producerId}>
          {renderVideo(video)}
        </View>
      ))}
    </View>
  );
}
  // Default grid layout for other cases
  return (
    <FlatList
      data={videoElements}
      keyExtractor={item => item.producerId.toString()}
      numColumns={getGridLayout().numColumns}
      renderItem={({item}) => renderVideo(item)}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
    />
  );
};

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => ('')}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <View style={styles.streamInfo}>
          <View style={styles.streamerAvatar}>
            <Text style={styles.streamerAvatarText}>
              {streamData?.sellerId?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.streamerName}>
              {streamData?.sellerId || 'Stream'}
            </Text>
            {isWatching && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
        </View>

        {isWatching && (
          <View style={styles.viewerCount}>
            <Text style={styles.viewerCountText}>👁 {viewerCount}</Text>
          </View>
        )}
      </View> */}

      {/* Stream ended overlay */}
      {streamEnded && (
        <View style={styles.streamEndedOverlay}>
          <View style={styles.streamEndedContent}>
            <Text style={styles.streamEndedIcon}>📺</Text>
            <Text style={styles.streamEndedTitle}>Stream Ended</Text>
            <Text style={styles.streamEndedMessage}>
              This live stream has ended.
            </Text>
            <View style={styles.streamEndedButtons}>
              <TouchableOpacity
                style={styles.streamEndedButton}
                onPress={() => navigation.goBack()}>
                <Text style={styles.streamEndedButtonText}>Back to Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.streamEndedButton, styles.refreshButtonSecondary]}
                onPress={refreshStream}>
                <Text style={styles.streamEndedButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Video Grid */}
      <View style={styles.videoGridContainer}>{renderVideoGrid()}</View>

      {/* Controls */}
      {/* {showControls && !streamEnded && renderControls()} */}

      {/* Status Bar */}
      {/* <View style={styles.statusBar}>
        <Text style={styles.statusText}>Status: {statusMessage}</Text>
        <Text style={styles.deviceInfo}>f
          Mobile |{' '}
          {selectedLayerIndex === 0
            ? 'Low'
            : selectedLayerIndex === 1
            ? 'Medium'
            : 'High'}{' '}
          Quality
        </Text>
      </View> */}

      {/* Logs panel */}
      {showLogs && (
        <View style={styles.logsContainer}>
          <View style={styles.logsHeader}>
            <Text style={styles.logsTitle}>Connection Logs</Text>
            <TouchableOpacity onPress={() => setShowLogs(false)}>
              <Text style={styles.logsCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.logsContent}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingTop: 50, // Account for status bar
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  streamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  streamerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  streamerAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  streamerName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 4,
  },
  liveText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewerCount: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewerCountText: {
    color: '#fff',
    fontSize: 14,
  },
  streamEndedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  streamEndedContent: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
  },
  streamEndedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  streamEndedTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  streamEndedMessage: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  streamEndedButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  streamEndedButton: {
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonSecondary: {
    backgroundColor: '#6b7280',
  },
  streamEndedButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  videoGridContainer: {
    flex: 1,
    // backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  singleVideoContainer: {
  flex: 1,
  // width: '100%',
  // height:'100%',
  // aspectRatio: undefined, // Remove fixed aspect ratio for full screen
},
  threeVideoLayout: {
    flex: 1,
    padding:10
  },
  mainVideoContainer: {
    flex: 2,
    borderRadius:15,
    borderWidth:2,
  },
  cohostContainer: {
    flex: 2,
    borderRadius:15,
    borderWidth:2,
    flexDirection: 'row',
  },
  grid: {
    padding: 2,
  },
 videoContainer: {
  backgroundColor: '#111',
  flex:1,
  // margin: 1,
  // position: 'relative',
  // Default styles for grid view
  // width: (width - 6) / 2, // Account for margins
  // aspectRatio: 16 / 9,
},
spanTwo: {
  width: width - 4,
  aspectRatio: 16 / 9,
},
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 14,
  },
  label: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  labelText: {
    color: '#fff',
    fontSize: 12,
  },
  hostBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hostBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  qualityControls: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  activeQualityButton: {
    backgroundColor: '#3b82f6',
  },
  qualityButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  activeQualityButtonText: {
    fontWeight: 'bold',
  },
  actionControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  muteButton: {
    backgroundColor: 'rgba(107,114,128,0.8)',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  refreshButton: {
    backgroundColor: '#6b7280',
  },
  logsButton: {
    backgroundColor: 'rgba(107,114,128,0.8)',
  },
  controlButtonText: {
    fontSize: 18,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#374151',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
  },
  deviceInfo: {
    color: '#9ca3af',
    fontSize: 12,
  },
  logsContainer: {
    maxHeight: 200,
    backgroundColor: '#1f2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#374151',
  },
  logsTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  logsCloseButton: {
    color: '#9ca3af',
    fontSize: 18,
  },
  logsContent: {
    padding: 12,
    maxHeight: 150,
  },
  logText: {
    color: '#d1d5db',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },


  fourGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap', // allows multiple rows
  flex: 1,
},
quarterBox: {
width: '50%',   // Half of screen width
  height: '50%',  // Half of screen height
 // aspectRatio: 1, // make it square (adjust if you want 16:9)
  borderWidth: 2,
  borderColor: '#333',
},

});

export default Viewer;