/* eslint-disable no-alert */
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ToastAndroid,BackHandler, Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import {io} from 'socket.io-client';
import {mediaDevices, RTCView} from 'react-native-webrtc';
import * as mediasoupClient from 'mediasoup-client';
import axios from 'axios';
import moment from 'moment';
import {
  GET_ALL_AVAILABLE_STREAMS,
  CREATE_NEW_STREAM,
  GET_SINGLE_STREAM_DATA,
  mediaSoupServerUrl,
  START_LIVE_STREAM,
  END_LIVE_STREAM,
  GET_STREAM_VIEWERS_COUNT,
  socketurl,
} from '../../../../../Config';
import axiosInstance from '../../../../Utils/Api';
import {checkPermission} from '../../../../Utils/Permission';
import CohostManager from '../CoHost/Cohost-manager';
import {Toast} from '../../../../Utils/dateUtils';
import { MediaStream } from 'react-native-webrtc';
import { CameraOff, Navigation } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const Vendor = ({
  showId,
  IsCameraOn,
  IsMicrophoneOn,
  isStopStreaming,
  showData,
  onViewerCountChange,
  onStreamingChange,
  setRoomIdRef
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sellerId, setSellerId] = useState('');
  const [statusMessage, setStatusMessage] = useState('Not connected');
  const [logs, setLogs] = useState([]);

  const navigation = useNavigation();

  const [viewerCount, setViewerCount] = useState(0);
  const [availableStreams, setAvailableStreams] = useState([]);

  const [mode, setMode] = useState(
    showData?.role === 'co-host' ? 'join' : 'create',
  );
  const [isHost, setIsHost] = useState(false);
  const [isCohost, setIsCohost] = useState(false);
  const [cohosts, setCohosts] = useState([]);

//  console.log('cohost', cohosts);

  // FIXED: Simplified remote streams management
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  // console.log('remoteStreams', remoteStreams);

  const cohostManagerRef = useRef(null);
  const producerTransportRef = useRef(null);
  const videoProducerRef = useRef(null);
  const audioProducerRef = useRef(null);
  const deviceRef = useRef(null);
  const socketRef = useRef(null);
  const roomIdRef = useRef(null);
  const localStreamRef = useRef(null);
  const videoRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const consumerTransportRef = useRef(null);
  const consumersRef = useRef(new Map());

  //console.log('Room id', roomIdRef);

  const addLog = message => {
    // console.log(message);
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Notify parent whenever isStreaming changes
  useEffect(() => {
    onStreamingChange(isStreaming);
  }, [isStreaming, onStreamingChange]);

  useEffect(() => {
    setRoomIdRef(roomIdRef); // Pass ref to parent after mount
  }, [setRoomIdRef]);

  // Function to manually fetch viewers count from API
  const fetchViewersCount = async (streamId) => {
    try {
      const response = await axios.get(`${GET_STREAM_VIEWERS_COUNT}/${streamId}/viewers-count`);
      if (response.data && response.data.count !== undefined) {
        onViewerCountChange(response.data.count);
        addLog(`Fetched viewers count: ${response.data.count}`);
        return response.data.count;
      }
    } catch (error) {
      addLog(`Error fetching viewers count: ${error.message}`);
    }
    return null;
  }

  // Simplified remote stream management functions
  // const addRemoteStream = (producerId, track, role = 'participant') => {
  //   setRemoteStreams(prev => {
  //     const newStreams = new Map(prev);
      
  //     if (newStreams.has(producerId)) {
  //       // Add track to existing stream
  //       const existing = newStreams.get(producerId);
  //       // Remove existing tracks of the same kind to avoid duplicates
  //       existing.stream.getTracks().forEach(t => {
  //         if (t.kind === track.kind) {
  //           existing.stream.removeTrack(t);
  //           console.log(`🗑️ Removed existing ${t.kind} track`);
  //         }
  //       });
  //       existing.stream.addTrack(track);
  //       addLog(`Added ${track.kind} track to existing stream ${producerId}`);
  //     } else {
  //       // Create new stream
  //       const stream = new MediaStream([track]);
  //       newStreams.set(producerId, { id: producerId, role, stream });
  //       addLog(`Created new remote stream ${producerId} with ${track.kind}`);
  //     }
      
  //     return newStreams;
  //   });
  // };

  // React Native optimized addRemoteStream
// const addRemoteStream = (producerId, track, role = 'participant') => {
//   if (track.kind !== 'video') {
//     console.log(`⏭️ Ignored ${track.kind} track for ${producerId}`);
//     return; // skip audio tracks
//   }

//   const createStreamEntry = (t) => ({
//     id: producerId,
//     role,
//     stream: new MediaStream([t]), // always a fresh MediaStream
//   });

//   // Ensure we refresh when track unmutes (sometimes starts black)
//   track.onunmute = () => {
//     console.log(`📹 Video track unmuted for ${producerId}`);
//     setRemoteStreams(prev => {
//       const newStreams = new Map(prev);
//       newStreams.set(producerId, createStreamEntry(track));
//       return newStreams;
//     });
//   };

//   // Initial set when track is first added
//   setRemoteStreams(prev => {
//     const newStreams = new Map(prev);
//     newStreams.set(producerId, createStreamEntry(track));
//     console.log(`✅ Added/Updated remote video stream for ${producerId}`);
//     return newStreams;
//   });
// };


  // Only manage video tracks in remoteStreams  (MAIN)
const addRemoteStream = (producerId, track, role = 'participant') => {
  if (track.kind !== "video") {
    console.log(`⏭️ Ignored ${track.kind} track for ${producerId}`);
    return; // skip audio tracks
  }

  setRemoteStreams(prev => {
    const newStreams = new Map(prev);

    if (newStreams.has(producerId)) {
      // Replace existing video track if it exists
      const existing = newStreams.get(producerId);
      existing.stream.getVideoTracks().forEach(t => {
        existing.stream.removeTrack(t);
        console.log(`🗑️ Removed existing video track from ${producerId}`);
      });
      existing.stream.addTrack(track);
      addLog(`Added video track to existing stream ${producerId}`);
    } else {
      // Create new stream with video
      const stream = new MediaStream([track]);
      newStreams.set(producerId, { id: producerId, role, stream });
      addLog(`Created new remote video stream ${producerId}`);
    }

    return newStreams;
  });
};


  const removeRemoteStream = (producerId) => {
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      if (newStreams.has(producerId)) {
        const stream = newStreams.get(producerId);
        // Stop all tracks before removing
        stream.stream.getTracks().forEach(track => track.stop());
        newStreams.delete(producerId);
        addLog(`Removed remote stream: ${producerId}`);

        //NEW
       // ToastAndroid.show(`Removed remote stream ${producerId}`, ToastAndroid.LONG)
      }
      return newStreams;
    });
  };


  useEffect(() => {
    if (showData?.role !== "co-host") return; // 👉 only add handler for co-host

    const onBackPress = () => {
      Alert.alert(
        "Leave Live?",
        "Are you sure you want to exit the live stream?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes, Exit",
            onPress: () => {
              handleLeaveAsCohost();
              navigation.goBack(); // or BackHandler.exitApp()
            }
          }
        ]
      );
      return true; // prevent default back action
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => backHandler.remove();
  }, [showData?.role, navigation]);


  // Socket connection setup
  useEffect(() => {
    const serverUrl = mediaSoupServerUrl;
    addLog(`Connecting to server: ${serverUrl}`);
    
    socketRef.current = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
      forceNew: true, // ENHANCED: Force new connection to prevent stale connections
    });

    socketRef.current.on('connect', () => {
      addLog(`Socket connected: ${socketRef.current.id}`);
      setIsConnected(true);
      setStatusMessage('Connected to server');

      // Load available streams when connected
      fetchAvailableStreams();
    });

    socketRef.current.on('connect_error', err => {
      addLog(`Connection error: ${err.message}`);
      setStatusMessage(`Connection error: ${err.message}`);
      setIsConnected(false);
    });

    socketRef.current.on('disconnect', (reason) => {
      addLog(`Socket disconnected: ${reason}`);
      setIsConnected(false);
      setStatusMessage(`Disconnected: ${reason}`);
      
      if (isStreaming) {
        addLog("Stream interrupted by disconnection");
        handleStopStream();
      }
    });

    // Co-host event listeners
    socketRef.current.on("cohost:connected", (data) => {
      if (data.streamId === roomIdRef.current) {
        addLog(`Co-host ${data.sellerId} joined the stream`);
        setCohosts(prev => [...prev, {
          socketId: data.socketId,
          sellerId: data.sellerId,
          videoProducerId: data.videoProducerId,
          audioProducerId: data.audioProducerId,
        }]);
      }
    });

    // Viewer count updates
    socketRef.current.on("viewerCountUpdate", ({ streamId, count }) => {
      if (roomIdRef.current === streamId) {
        addLog(`Viewer count updated: ${count} viewers`);
        onViewerCountChange(count);
      }
    });

    socketRef.current.on("cohost:disconnected", (data) => {
      if (data.streamId === roomIdRef.current) {
        addLog(`Co-host disconnected`);
        setCohosts(prev => prev.filter(ch => ch.socketId !== data.socketId));
      }
    });

    // FIXED: Producer closed event handling
    socketRef.current.on("producerClosed", ({ producerId }) => {
      addLog(`Producer ${producerId} closed - cleaning up`);

      // Close and remove consumers
      for (const [consumerId, consumer] of consumersRef.current.entries()) {
        if (consumer.producerId === producerId) {
          try {
            consumer.close();
          } catch (e) {
            addLog(`Error closing consumer ${consumerId}: ${e.message}`);
          }
          consumersRef.current.delete(consumerId);
          addLog(`Closed consumer ${consumerId} for producer ${producerId}`);
        }
      }

      // Remove remote stream
      removeRemoteStream(producerId);
    });

    // Server heartbeat handling
    socketRef.current.on("heartbeat", (data, callback) => {
      addLog("Received heartbeat from server");
      if (typeof callback === "function") {
        callback({ received: true, timestamp: Date.now() });
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // FIXED: Initialize co-host manager with correct sellerId
  useEffect(() => {
    if (socketRef.current && isConnected && roomIdRef.current) {
      const cohostManager = new CohostManager({
        socket: socketRef.current,
        streamId: roomIdRef.current,
        sellerId: sellerId, // FIXED: Use current user's sellerId, not showData.host
        mediasoup: mediasoupClient,
        onStatusChange: (status) => {
          console.log("Co-host status:", status);
          addLog(`Co-host status update: ${JSON.stringify(status)}`);

          if (status.role === "host") {
            setIsHost(true);
          } else if (status.role === "cohost") {
            setIsCohost(true);
          }

          if (status.type === "cohostActive") {
            setCohosts(prev => {
              const exists = prev.some(ch => ch.socketId === status.socketId);
              if (exists) {
                return prev.map(ch => 
                  ch.socketId === status.socketId 
                    ? { ...ch, ...status, status: "active" } 
                    : ch
                );
              } else {
                return [...prev, {
                  socketId: status.socketId,
                  sellerId: status.sellerId,
                  videoProducerId: status.videoProducerId,
                  audioProducerId: status.audioProducerId,
                  status: "active",
                }];
              }
            });
          } else if (status.type === "cohostDisconnected" || status.type === "cohostRemoved") {
            setCohosts(prev => prev.filter(ch => ch.socketId !== status.socketId));
          } else if (status.type === "cohostConnecting") {
            setCohosts(prev => {
              const exists = prev.some(ch => ch.socketId === status.socketId);
              if (exists) {
                return prev.map(ch => 
                  ch.socketId === status.socketId 
                    ? { ...ch, status: "connecting" } 
                    : ch
                );
              } else {
                return [...prev, {
                  socketId: status.socketId,
                  sellerId: status.sellerId,
                  status: "connecting",
                }];
              }
            });
          }
        },
        onError: (err) => {
          console.error("Co-host error:", err);
          addLog(`Co-host error: ${err.message}`);
        },
      });

      cohostManagerRef.current = cohostManager;

      if (mode === "create" && isStreaming) {
        cohostManager.initAsHost();
        setIsHost(true);
      }

      return () => {
        if (cohostManagerRef.current) {
          cohostManagerRef.current.dispose();
        }
      };
    }
  }, [socketRef.current, isStreaming, roomIdRef.current, sellerId, isConnected, mode]);

  // FIXED: Simplified newProducer handler
  useEffect(() => {
    if (socketRef.current && isConnected && (isHost || isCohost)) {
      socketRef.current.on('newProducer', async ({producerId, kind, socketId}) => {
        try {
          // Skip own producers
          if (socketId === socketRef.current.id) {
            addLog(`Skipping own producer: ${producerId}`);
            return;
          }

          // FIXED: Check for existing consumers to prevent duplicates
          const existingConsumer = Array.from(consumersRef.current.values())
            .find(consumer => consumer.producerId === producerId);
          
          if (existingConsumer) {
            addLog(`Already consuming producer ${producerId}, skipping`);
            return;
          }

          addLog(`New producer available: ${producerId} (${kind}) from socket: ${socketId}`);

          // Create consumer transport if needed
          if (!consumerTransportRef.current) {
            const transportOptions = await new Promise((resolve, reject) => {
              socketRef.current.emit('createConsumerTransport', {roomId: roomIdRef.current}, response => {
                if (response.error) {
                  reject(new Error(response.error));
                } else {
                  resolve(response);
                }
              });
            });

            consumerTransportRef.current = deviceRef.current.createRecvTransport(transportOptions);

            consumerTransportRef.current.on('connect', async ({dtlsParameters}, callback, errback) => {
              try {
                await new Promise((resolve, reject) => {
                  socketRef.current.emit('connectConsumerTransport', {
                    dtlsParameters,
                    roomId: roomIdRef.current,
                    transportId: consumerTransportRef.current.id,
                  }, response => {
                    if (response.error) {
                      reject(new Error(response.error));
                    } else {
                      resolve(response);
                    }
                  });
                });
                callback();
              } catch (error) {
                errback(error);
              }
            });
          }

          // Consume the producer
          const response = await new Promise((resolve, reject) => {
            socketRef.current.emit('consume', {
              producerId,
              transportId: consumerTransportRef.current.id,
              roomId: roomIdRef.current,
              rtpCapabilities: deviceRef.current.rtpCapabilities,
            }, response => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            });
          });

          const consumer = await consumerTransportRef.current.consume({
            id: response.id,
            producerId,
            kind,
            rtpParameters: response.rtpParameters,
          });

          // FIXED: Link consumer to producer for proper cleanup
          consumer.producerId = producerId;

          // Store the consumer
          consumersRef.current.set(consumer.id, consumer);

          // Set up cleanup handlers
          consumer.on('producerclose', () => {
            addLog(`Consumer producer closed: ${producerId}`);
            removeRemoteStream(producerId);
            consumersRef.current.delete(consumer.id);
          });

          consumer.on('transportclose', () => {
            addLog(`Consumer transport closed: ${producerId}`);
            removeRemoteStream(producerId);
            consumersRef.current.delete(consumer.id);
          });

          // Resume the consumer
          await consumer.resume();

          // Add to remote streams
          if (consumer.track) {
            const role = isHost ? 'cohost' : 'host';
            addRemoteStream(producerId, consumer.track, role);
          }

          addLog(`Successfully consuming ${kind} from ${isHost ? 'co-host' : 'host'}: ${producerId}`);
        } catch (error) {
          addLog(`Error consuming stream: ${error.message}`);
        }
      });

            // Listen for co-host disconnections (for host to clean up co-host videos)
      socketRef.current.on("cohost:disconnected", ({ socketId, sellerId }) => {
        addLog(`Co-host ${sellerId} disconnected (${socketId})`);

        // Clean up co-host video elements
        // const cohostVideo = document.getElementById(`cohost-video-${socketId}`);
        // if (cohostVideo) {
        //   cohostVideo.remove();
        //   addLog(`Removed co-host video element for ${sellerId}`);
        // }

        // const cohostWrapper = document.querySelector(`[id^="cohost-wrapper-${socketId}"]`);
        // if (cohostWrapper) {
        //   cohostWrapper.remove();
        //   addLog(`Removed co-host wrapper for ${sellerId}`);
        // }
      });

      // Listen for stream end events (for co-hosts to know when host ends stream)
      const handleStreamEnd = ({ streamId, reason, sellerId, isHostEnding }) => {
        addLog(`Stream has ended: ${streamId}. Reason: ${reason || 'Host ended the stream'}`);

        if (isCohost) {
          // Show alert to co-host that host ended the stream
          ToastAndroid.show(`The host has ended the live stream. You will be redirected`, ToastAndroid.LONG);

          // Clean up co-host resources and redirect
          cleanupCohostResources();
        } else if (isHost && !isHostEnding) {
          // Only navigate if host didn't initiate the end (to avoid double navigation)
          addLog("Stream ended by server");

          setTimeout(() => {
            navigation.goBack();
          }, 1000);
        }
      };

      // Listen for both possible event names
      socketRef.current.on("streamEnded", handleStreamEnd);
      socketRef.current.on("stream:end", handleStreamEnd);

      // Listen for viewer count updates (MISSING FROM HOST SIDE!)
      socketRef.current.on("viewerCountUpdate", ({ streamId, count }) => {
        if (roomIdRef.current === streamId) {
          addLog(`Viewer count updated: ${count} viewers`);
          setViewerCount(count);
        }
      });

      return () => {
        socketRef.current.off('newProducer');
        socketRef.current.off("cohost:disconnected");
        socketRef.current.off("streamEnded");
        socketRef.current.off("stream:end");
        socketRef.current.off("viewerCountUpdate");
      };
    }
  }, [socketRef.current, isConnected, isHost, isCohost]);

  // FIXED: Simplified existing producers consumption for co-hosts
  useEffect(() => {
    if (socketRef.current && isConnected && isCohost && deviceRef.current && roomIdRef.current) {
      const consumeExistingProducers = async () => {
        try {
          addLog('Co-host getting existing producers to consume...');

          // Create consumer transport if not exists
          if (!consumerTransportRef.current) {
            const transportOptions = await new Promise((resolve, reject) => {
              socketRef.current.emit('createConsumerTransport', { roomId: roomIdRef.current }, response => {
                if (response.error) {
                  reject(new Error(response.error));
                } else {
                  resolve(response);
                }
              });
            });

            consumerTransportRef.current = deviceRef.current.createRecvTransport(transportOptions);

            consumerTransportRef.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
              try {
                await new Promise((resolve, reject) => {
                  socketRef.current.emit('connectConsumerTransport', {
                    dtlsParameters,
                    roomId: roomIdRef.current,
                    transportId: consumerTransportRef.current.id,
                  }, response => {
                    if (response.error) {
                      reject(new Error(response.error));
                    } else {
                      resolve(response);
                    }
                  });
                });
                callback();
              } catch (error) {
                errback(error);
              }
            });
          }

          // Get existing producers
          const producers = await new Promise((resolve, reject) => {
            socketRef.current.emit('getProducers', { roomId: roomIdRef.current }, response => {
              if (response && response.error) {
                reject(new Error(response.error));
              } else {
                resolve(Array.isArray(response) ? response : []);
              }
            });
          });

          addLog(`Found ${producers.length} existing producers to consume`);

          for (const producer of producers) {
            // Skip own producers
            if (producer.socketId === socketRef.current.id) {
              continue;
            }

            // Skip if already consuming
            const existingConsumer = Array.from(consumersRef.current.values())
              .find(consumer => consumer.producerId === producer.producerId);
            
            if (existingConsumer) {
              addLog(`Already consuming producer ${producer.producerId}, skipping`);
              continue;
            }

            try {
              addLog(`Consuming existing ${producer.kind} producer: ${producer.producerId}`);

              const response = await new Promise((resolve, reject) => {
                socketRef.current.emit('consume', {
                  producerId: producer.producerId,
                  transportId: consumerTransportRef.current.id,
                  roomId: roomIdRef.current,
                  rtpCapabilities: deviceRef.current.rtpCapabilities,
                }, response => {
                  if (response.error) {
                    reject(new Error(response.error));
                  } else {
                    resolve(response);
                  }
                });
              });

              const consumer = await consumerTransportRef.current.consume({
                id: response.id,
                producerId: producer.producerId,
                kind: producer.kind,
                rtpParameters: response.rtpParameters,
              });

              // Link consumer to producer for cleanup
              consumer.producerId = producer.producerId;

              // Store the consumer
              consumersRef.current.set(consumer.id, consumer);

              // Set up cleanup handlers
              consumer.on('producerclose', () => {
                removeRemoteStream(producer.producerId);
                consumersRef.current.delete(consumer.id);
              });

              consumer.on('transportclose', () => {
                removeRemoteStream(producer.producerId);
                consumersRef.current.delete(consumer.id);
              });

              // Resume and add to streams
              await consumer.resume();

              if (consumer.track) {
                addRemoteStream(producer.producerId, consumer.track, 'host');
              }

              addLog(`Successfully consumed ${producer.kind} from host: ${producer.producerId}`);
            } catch (error) {
              addLog(`Error consuming producer ${producer.producerId}: ${error.message}`);
            }
          }
        } catch (error) {
          addLog(`Error consuming existing producers: ${error.message}`);
        }
      };

      // Delay to ensure everything is ready
      setTimeout(consumeExistingProducers, 1000);
    }
  }, [isCohost, isConnected, deviceRef.current, roomIdRef.current]);

    // Fetch available streams
  const fetchAvailableStreams = async () => {
    try {
      const response = await axios.get(GET_ALL_AVAILABLE_STREAMS);
      if (response.data.status && response.data.data) {
        // Filter to only show live streams
        const liveStreams = response.data.data.filter(
          (stream) => stream.streamStatus === "live"
        );
        setAvailableStreams(liveStreams);
        addLog(`Found ${liveStreams.length} active streams`);
      }
    } catch (error) {
      addLog(`Error fetching streams: ${error.message}`);
    }
  };

  // Load device
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

  // Get user media
  const getUserMedia = async () => {
    try {
      addLog('Requesting camera and microphone access');
      const hasPermission = await checkPermission('camera') || await checkPermission('microphone');
      
      if (!hasPermission) {
        addLog('Camera/microphone permission denied');
        return false;
      }

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: 'user',
          frameRate: 30,
          width: 1280,
          height: 720,
        },
      });

      localStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      addLog('Media access granted');
      return true;
    } catch (error) {
      addLog(`Media access error: ${error.message}`);
      setStatusMessage(`Media error: ${error.message}`);
      return false;
    }
  };

  // Create producer transport
  const createProducerTransport = async roomId => {
    try {
      addLog(`Requesting producer transport for room: ${roomId}`);
      
      const transportOptions = await new Promise((resolve, reject) => {
        socketRef.current.emit('createProducerTransport', {roomId}, response => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      addLog('Creating producer transport');
      producerTransportRef.current = deviceRef.current.createSendTransport(transportOptions);

      // Handle transport events
      producerTransportRef.current.on('connect', async ({dtlsParameters}, callback, errback) => {
        addLog('Producer transport connect event');
        try {
          await new Promise((resolve, reject) => {
            socketRef.current.emit('connectProducerTransport', {dtlsParameters, roomId}, response => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            });
          });
          addLog('Producer transport connected');
          callback();
        } catch (error) {
          addLog(`Producer transport connect error: ${error.message}`);
          errback(error);
        }
      });

      producerTransportRef.current.on('produce', async ({kind, rtpParameters}, callback, errback) => {
        addLog(`Producer transport produce event for ${kind}`);
        try {
          const {id} = await new Promise((resolve, reject) => {
            socketRef.current.emit('produce', {kind, rtpParameters, roomId}, response => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            });
          });
          addLog(`${kind} producer created with ID: ${id}`);
          callback({id});
        } catch (error) {
          addLog(`Producer transport produce error: ${error.message}`);
          errback(error);
        }
      });

      producerTransportRef.current.on('connectionstatechange', state => {
        addLog(`Producer transport connection state: ${state}`);
        
        if (state === 'connecting') {
          addLog('Establishing WebRTC connection...');
        } else if (state === 'connected') {
          addLog('WebRTC connection established successfully');
        } else if (state === 'failed') {
          addLog('WebRTC connection failed - likely a NAT traversal issue');
          setStatusMessage('Connection failed - check network settings');
        } else if (state === 'disconnected') {
          addLog('WebRTC temporarily disconnected - attempting to recover');
        } else if (state === 'closed') {
          addLog('WebRTC connection closed');
        }
      });

      addLog('Producer transport created successfully');
      return true;
    } catch (error) {
      addLog(`Error creating producer transport: ${error.message}`);
      setStatusMessage(`Transport error: ${error.message}`);
      return false;
    }
  };

  // Join existing stream as co-host
  const handleJoinStream = async () => {
    if (!showData.liveStreamId) {
      addLog('No stream selected to join');
      return;
    }

    try {
      setStatusMessage('Joining stream as co-broadcaster...');
      addLog('Joining stream as co-broadcaster...');

      const response = await axios.get(`${GET_SINGLE_STREAM_DATA}/${showData.liveStreamId}`);
      const streamData = response.data.data;

      if (!streamData) {
        throw new Error('Stream not found');
      }

      addLog(`Joining stream: ${streamData._id}`);
      roomIdRef.current = streamData._id;

      // Join the room
      await new Promise((resolve, reject) => {
        socketRef.current.emit('joinRoom', {roomId: streamData._id}, response => {
          if (response.joined) {
            resolve();
          } else {
            reject(new Error('Failed to join room'));
          }
        });
      });

      // Get router capabilities
      const routerRtpCapabilities = await new Promise((resolve, reject) => {
        socketRef.current.emit('getRouterRtpCapabilities', {roomId: streamData._id}, data => {
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        });
      });

      // Load device, get media, create transport, and produce
      if (!(await loadDevice(routerRtpCapabilities))) {
        throw new Error('Failed to load device');
      }

      if (!(await getUserMedia())) {
        throw new Error('Failed to get user media');
      }

      if (!(await createProducerTransport(streamData._id))) {
        throw new Error('Failed to create producer transport');
      }

      // Produce audio and video
      addLog('Creating audio producer');
      const audioProducer = await producerTransportRef.current.produce({
        track: localStreamRef.current.getAudioTracks()[0],
        codecOptions: {
          opusStereo: true,
          opusDtx: true,
        },
      });
      audioProducerRef.current = audioProducer;

      addLog('Creating video producer with simulcast support');
      const videoProducer = await producerTransportRef.current.produce({
        track: localStreamRef.current.getVideoTracks()[0],
        encodings: [
          {scaleResolutionDownBy: 4, maxBitrate: 500000},
          {scaleResolutionDownBy: 2, maxBitrate: 1000000},
          {scaleResolutionDownBy: 1, maxBitrate: 2500000},
        ],
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
      });
      videoProducerRef.current = videoProducer;

      // Add producer to database
      await axios.post(`${GET_SINGLE_STREAM_DATA}/${streamData._id}/producers`, {
        sellerId: sellerId || `co-host-${Math.random().toString(36).substring(2, 10)}`,
        socketId: socketRef.current.id,
        videoProducerId: videoProducer.id,
        audioProducerId: audioProducer.id,
      });

      setIsStreaming(true);
      setIsCohost(true);
      setStatusMessage('Joined stream as co-broadcaster - LIVE');
      addLog('Successfully joined stream as co-broadcaster');
    } catch (error) {
      addLog(`Error joining stream: ${error.message}`);
      setStatusMessage(`Join error: ${error.message}`);
    }
  };

  // Start new stream as host
  const handleStartStream = async () => {
    try {
      if (isStreaming) return;

      if (!socketRef.current?.connected) {
      addLog("Cannot start stream: socket not connected yet.");
      return;
      }

      setStatusMessage("Initializing stream...");

      console.log('streamSocketId: socketRef.current.id', socketRef.current.id);

      // Create new stream in database
      const streamResponse = await axios.post(CREATE_NEW_STREAM, {
        streamStartTime: moment().format("HH:mm:ss"),
        streamDate: moment().format("YYYY-MM-DD"),
        sellerId: sellerId === "" ? Math.random().toString(36).substring(2, 10) : sellerId,
        streamSocketId: socketRef.current.id,
      });

      const streamData = streamResponse.data.data;
      const roomId = streamData._id;
      roomIdRef.current = roomId;

      addLog(`Created new stream with ID: ${roomId}`);

      // Join the room
      await new Promise((resolve, reject) => {
        socketRef.current.emit("joinRoom", { roomId }, (response) => {
          if (response.joined) {
            resolve();
            addLog(`Successfully joined room: ${roomId}`);
          } else {
            reject(new Error("Failed to join room"));
          }
        });
      });

      // Emit stream start event
      socketRef.current.emit("stream:start", {
        streamId: roomId,
        sellerId: sellerId,
        isHost: true,
      });

      // Get router capabilities
      addLog("Getting router RTP capabilities");
      const routerRtpCapabilities = await new Promise((resolve, reject) => {
        socketRef.current.emit("getRouterRtpCapabilities", { roomId }, (data) => {
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        });
      });

      // Load device, get media, create transport
      if (!(await loadDevice(routerRtpCapabilities))) {
        throw new Error("Failed to load device");
      }

      if (!(await getUserMedia())) {
        throw new Error("Failed to get user media");
      }

      if (!(await createProducerTransport(roomId))) {
        throw new Error("Failed to create producer transport");
      }

      // Produce audio and video
      addLog("Creating audio producer");
      const audioProducer = await producerTransportRef.current.produce({
        track: localStreamRef.current.getAudioTracks()[0],
        codecOptions: {
          opusStereo: true,
          opusDtx: true,
        },
      });
      audioProducerRef.current = audioProducer;

      addLog("Creating video producer with simulcast support");
      const videoProducer = await producerTransportRef.current.produce({
        track: localStreamRef.current.getVideoTracks()[0],
        encodings: [
          { scaleResolutionDownBy: 4, maxBitrate: 500000 },
          { scaleResolutionDownBy: 2, maxBitrate: 1000000 },
          { scaleResolutionDownBy: 1, maxBitrate: 2500000 },
        ],
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
      });
      videoProducerRef.current = videoProducer;

      // Set up producer event listeners
      audioProducerRef.current.on("transportclose", () => {
        addLog("Audio producer transport closed");
      });

      videoProducerRef.current.on("transportclose", () => {
        addLog("Video producer transport closed");
      });

      // Add producer to database
      await axios.post(`${GET_SINGLE_STREAM_DATA}/${roomId}/producers`, {
        sellerId: sellerId || `host-${Math.random().toString(36).substring(2, 10)}`,
        socketId: socketRef.current.id,
        videoProducerId: videoProducer.id,
        audioProducerId: audioProducer.id,
      });

      setIsStreaming(true);
      setIsHost(true);
      setStatusMessage("Stream started - LIVE");
      addLog("Stream started successfully");

        // Viewer count will be updated via socket events
        addLog("Waiting for viewer count updates from server...")

        // Also fetch initial viewers count
        setTimeout(() => {
          fetchViewersCount(roomId);
        }, 2000);

      // Notify viewers that stream has started
      socketRef.current.emit("stream:status", {
        streamId: roomId,
        status: "started",
        sellerId: sellerId,
      });

      // Update show status to live and save stream id
      const startRes = await axiosInstance.patch(
        START_LIVE_STREAM.replace(":id", showId),
        { liveStreamId: roomId }
      );
      if (startRes?.data?.data?.status) {
        addLog("Show is Live & Id is stored successfully!");
      }
    } catch (error) {
      addLog(`Error starting stream: ${error.message}`);
      setStatusMessage(`Stream error: ${error.message}`);
    }
  };

  // Enhanced stream heartbeat mechanism
  useEffect(() => {
    if (isStreaming && roomIdRef.current) {
      let heartbeatFailures = 0;
      const MAX_FAILURES = 5;

      const heartbeatInterval = setInterval(() => {
        if (socketRef.current && socketRef.current.connected) {
          // Server heartbeat
          socketRef.current.emit("heartbeat", { timestamp: Date.now() }, (ack) => {
            if (ack && ack.success) {
              heartbeatFailures = 0;
              addLog("Socket heartbeat successful");
            } else {
              heartbeatFailures++;
              addLog(`Socket heartbeat failed (${heartbeatFailures}/${MAX_FAILURES})`);
            }
          });

          // Stream-specific heartbeat
          socketRef.current.emit("stream:heartbeat", {
            streamId: roomIdRef.current,
            timestamp: Date.now(),
          }, (response) => {
            if (response && response.error) {
              heartbeatFailures++;
              addLog(`Stream heartbeat failed: ${response.error}`);
            } else {
              addLog("Stream heartbeat successful");
            }

            if (heartbeatFailures >= MAX_FAILURES) {
              addLog("Too many heartbeat failures, stopping stream");
              handleStopStream();
            }
          });

          // Backend API heartbeat
          axios.get(`${GET_SINGLE_STREAM_DATA}/${roomIdRef.current}`)
            .then(() => {
              addLog("Backend heartbeat successful");
            })
            .catch((err) => {
              addLog(`Backend heartbeat failed: ${err.message}`);
            });
        } else {
          heartbeatFailures++;
          addLog(`Socket disconnected (${heartbeatFailures}/${MAX_FAILURES})`);

          if (heartbeatFailures >= MAX_FAILURES) {
            addLog("Socket connection lost, stopping stream");
            handleStopStream();
          }
        }
      }, 25000);

      const handleServerHeartbeat = (data, callback) => {
        addLog("Received server heartbeat request");
        if (typeof callback === "function") {
          callback({ received: true, timestamp: Date.now() });
        }
        heartbeatFailures = 0;
      };

      socketRef.current.on("heartbeat", handleServerHeartbeat);

      return () => {
        clearInterval(heartbeatInterval);
        if (socketRef.current) {
          socketRef.current.off("heartbeat", handleServerHeartbeat);
        }
      };
    }
  }, [isStreaming, roomIdRef.current]);

  // Stop stream function
  const handleStopStream = async () => {
    try {
      addLog("Stopping stream...");

    // Get current stream data first to get the streamSocketId
    let streamSocketId = null;
    if (roomIdRef.current) {
      try {
        const streamResponse = await axios.get(`${GET_SINGLE_STREAM_DATA}/${roomIdRef.current}`);
       // console.log('streamResponse',streamResponse.data.data?.streamSocketId);
        streamSocketId = streamResponse.data.data?.streamSocketId;   //check undefined   //streamResponse.data.data?.producers[0].socketId
        addLog(`Retrieved streamSocketId: ${streamSocketId}`);
      } catch (error) {
        addLog(`Error fetching stream data: ${error.message}`);
      }
    }
      // Different behavior for host vs co-host
      if (isHost) {
        addLog("Host ending stream - will end entire stream");

        // Update stream status in the backend using streamSocketId instead of streamId
        if(streamSocketId){
        if (roomIdRef.current) {
          try {
            await axios.post(`${GET_SINGLE_STREAM_DATA}/${streamSocketId}/end`,
            {
              streamSocketId: streamSocketId // Use socket ID for ending stream
            }
           );
            addLog(`Stream ended successfully in backend for ID: ${streamSocketId}`);

            socketRef.current.emit("stream:end", {
              streamId: roomIdRef.current,
              streamSocketId: streamSocketId,
              sellerId: sellerId,
              isHostEnding: true,
            });
          } catch (error) {
            addLog(`Error updating stream status in backend: ${error.message}`);
          }
        }
      }
      } else if (isCohost) {
         addLog("Co-host leaving stream - stream will continue");

        // socketRef.current.emit("cohost:disconnected", {
        //   socketId: socketRef.current.id,
        //   streamId: roomIdRef.current,
        //   sellerId: sellerId,
        //   isCohost: true,
        // });

      // Emit co-host disconnect event using socket IDs
      socketRef.current.emit("cohost:disconnected", {
        socketId: socketRef.current.id,
        streamSocketId: streamSocketId,
        streamId: roomIdRef.current,
        sellerId: sellerId,
        isCohost: true,
      });

         // NON-HOST: Should not be able to end the stream
        // addLog("ERROR: Only host can end the entire stream");
        //return;
      }

      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Close all consumers
      if (consumersRef.current) {
        consumersRef.current.forEach((consumer) => {
          consumer.close();
        });
        consumersRef.current.clear();
        addLog("Closed all consumers");
      }

      // Close consumer transport
      if (consumerTransportRef.current) {
        consumerTransportRef.current.close();
        consumerTransportRef.current = null;
        addLog("Closed consumer transport");
      }

      // Close producers
      if (videoProducerRef.current) {
        videoProducerRef.current.close();
        videoProducerRef.current = null;
        addLog("Closed video producer");
      }

      if (audioProducerRef.current) {
        audioProducerRef.current.close();
        audioProducerRef.current = null;
        addLog("Closed audio producer");
      }

      // Close producer transport
      if (producerTransportRef.current) {
        producerTransportRef.current.close();
        producerTransportRef.current = null;
        addLog("Closed producer transport");
      }

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        addLog("Stopped local media stream");
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        addLog("Cleared video element");
      }

      // Clear device reference
      if (deviceRef.current) {
        deviceRef.current = null;
        addLog("Cleared MediaSoup device reference");
      }

      // Clear remote streams
      remoteStreams.forEach(stream => {
        stream.stream.getTracks().forEach(track => track.stop());
      });
      setRemoteStreams(new Map());

      // Reset state variables
      setIsStreaming(false);
      setIsHost(false);
      setIsCohost(false);
      setCohosts([]);
      onViewerCountChange(0);
      roomIdRef.current = null;

      // Clear co-host manager
      if (cohostManagerRef.current) {
        cohostManagerRef.current.dispose();
        cohostManagerRef.current = null;
      }

      // Set status message
      if (isHost) {
        setStatusMessage("Stream ended");
        addLog("Host stream ended successfully");
      } else {
        setStatusMessage("Left co-host session");
        addLog("Co-host disconnected successfully");
      }

      // End show in backend
      const endRes = await axiosInstance.patch(END_LIVE_STREAM.replace(":id", showId), {});
      if (endRes?.data?.data?.status) {
        ToastAndroid.show("Show is Ended.", ToastAndroid.SHORT);
      }

      // Navigate back
      navigation.goBack();
    } catch (err) {
      addLog(`Error stopping stream: ${err.message}`);

      // Reset state even if there's an error
      setIsStreaming(false);
      setIsHost(false);
      setIsCohost(false);
      setCohosts([]);
      onViewerCountChange(0);
      roomIdRef.current = null;
      deviceRef.current = null;

    // Clear intervals even on error
    // if (heartbeatIntervalRef.current) {
    //   clearInterval(heartbeatIntervalRef.current);
    //   heartbeatIntervalRef.current = null;
    // }

      if (cohostManagerRef.current) {
        cohostManagerRef.current.dispose();
        cohostManagerRef.current = null;
      }

      navigation.goBack();
    }
  };

    // Separate cleanup for co-host that doesn't end the stream
  const cleanupCohostResources = async () => {
    try {
      addLog("Co-host leaving stream - stream will continue");

      // Clean up host video elements (for co-host view)
      // const hostContainer = document.getElementById('host-videos-container');
      // if (hostContainer) {
      //   hostContainer.remove();
      //   addLog("Removed host video container");
      // }

      // Close all consumers (what co-host was consuming from host)
      if (consumersRef.current) {
        consumersRef.current.forEach((consumer, id) => {
          consumer.close();
        });
        consumersRef.current.clear();
        addLog("Closed all consumers");
      }

      // Close consumer transport
      if (consumerTransportRef.current) {
        consumerTransportRef.current.close();
        consumerTransportRef.current = null;
        addLog("Closed consumer transport");
      }

      // Close producers (co-host's own video/audio)
      if (videoProducerRef.current) {
        videoProducerRef.current.close();
        videoProducerRef.current = null;
        addLog("Closed video producer");
      }

      if (audioProducerRef.current) {
        audioProducerRef.current.close();
        audioProducerRef.current = null;
        addLog("Closed audio producer");
      }

      // Close producer transport
      if (producerTransportRef.current) {
        producerTransportRef.current.close();
        producerTransportRef.current = null;
        addLog("Closed producer transport");
      }

      // Stop local media stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        addLog("Stopped local media stream");
      }

      // Clear video element
      // const videoElement = document.getElementById('local-video');
      // if (videoElement) {
      //   videoElement.srcObject = null;
      //   addLog("Cleared video element");
      // }

      // Clear device reference
      if (deviceRef.current) {
        deviceRef.current = null;
        addLog("Cleared MediaSoup device reference");
      }

      // Reset state
      setIsStreaming(false);
      setIsConnected(false);
      setMode("viewer");
      roomIdRef.current = null;

      addLog("Co-host disconnected successfully");

      // Navigate back to home
      navigation.goBack();
    } catch (err) {
      addLog(`Error cleaning up co-host resources: ${err.message}`);
    }
  }

  // Handle co-host removal
  const handleRemoveCohost = async (cohostSocketId) => {
    if (!cohostManagerRef.current) return;

    try {
      addLog(`Removing co-host: ${cohostSocketId}`);
      await cohostManagerRef.current.removeCohost(cohostSocketId);
    } catch (error) {
      addLog(`Error removing co-host: ${error.message}`);
    }
  };

  // Handle leaving as co-host
  const handleLeaveAsCohost = async () => {
    if (!cohostManagerRef.current) return;
    
    Toast('Leaving as co-host...');
    try {
      addLog(`Leaving as co-host`);
      // Emit co-host disconnect event first
      if (socketRef.current && roomIdRef.current) {
        socketRef.current.emit('cohost:disconnected', {
          socketId: socketRef.current.id,
          streamId: roomIdRef.current,
          sellerId: sellerId,
          isCohost: true
        });
        addLog("Notified other participants that co-host is leaving");
      }

      // Leave as co-host from the manager
      await cohostManagerRef.current.leaveAsCohost()

      // Clean up only co-host's local resources (NOT the entire stream)
      await cleanupCohostResources()
    } catch (error) {
      addLog(`Error leaving as co-host: ${error.message}`);
    }
  };

  // Camera/microphone toggle functions
  const toggleCamera = (shouldEnable) => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = shouldEnable;
      addLog(`Camera ${shouldEnable ? 'on' : 'off'}`);
    }
  };

  const toggleMicrophone = (shouldEnable) => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = shouldEnable;
      addLog(`Microphone ${shouldEnable ? 'unmuted' : 'muted'}`);
    }
  };

  // Handle camera toggle from props
  useEffect(() => {
    if (localStreamRef.current && IsCameraOn !== undefined) {
      toggleCamera(IsCameraOn);
    }
  }, [IsCameraOn, localStreamRef.current]);

  // Handle microphone toggle from props
  useEffect(() => {
    if (localStreamRef.current && IsMicrophoneOn !== undefined) {
      toggleMicrophone(IsMicrophoneOn);
    }
  }, [IsMicrophoneOn, localStreamRef.current]);


  // Auto-start stream based on role
useEffect(() => {
  if (!isConnected || !showData) return; // wait for socket connection

  if (showData.role === "host") {
    handleStartStream();
  } else if (showData.role === "co-host") {
    handleJoinStream();
  }
}, [showData, isConnected]);  // <-- depend on isConnected too

  // Auto-start stream based on role
  // useEffect(() => {
  //   if (showData?.role === 'host') {
  //     handleStartStream();
  //   } else if (showData?.role === 'co-host') {
  //     handleJoinStream();
  //   }
  // }, [showData]);

  // Handle stop streaming from props
  useEffect(() => {
    if (isStopStreaming) {
      if (showData?.role === 'host') {
        handleStopStream();
      } else {
        handleLeaveAsCohost();
      }
    }
  }, [isStopStreaming]);

  // Helper function to calculate video slot dimensions and positions
const getVideoSlotStyle = (totalParticipants, index) => {
  if (totalParticipants === 1) {
    // Single participant - full screen
    return {
      width: '100%',
      height: '100%',
    };
  } else if (totalParticipants === 2) {
    // Two participants - split vertically
    return {
      width: '100%',
      height: '50%',
    };
  } else if (totalParticipants <= 4) {
    // 3-4 participants - 2x2 grid
    return {
      width: '50%',
      height: '50%',
    };
  } else {
    // More than 4 participants - 3x3 grid (max 9)
    return {
      width: '33.33%',
      height: '33.33%',
    };
  }
};

  return (
  <View style={styles.container}>
    {/* Dynamic split screen based on participant count */}
    <View style={styles.videoGrid}>
      {/* Local video (host's own stream) */}
      {IsCameraOn && localStreamRef.current && (
        <View style={[
          styles.videoSlot,
          getVideoSlotStyle(remoteStreams?.size + 1, 0) // +1 for local stream
        ]}>
          <RTCView
            streamURL={localStreamRef.current.toURL()}
            style={styles.videoContent}
            mirror={true}
          />
          <Text style={styles.videoLabel}>You ({isHost ? 'Host' : 'Co-host'})</Text>
        </View>
      )}

      {/* Remote participants */}
{Array.from(remoteStreams.values()).map((remote, index) => (
  <View
    key={remote.id}
    style={[
      styles.videoSlot,
      getVideoSlotStyle(remoteStreams.size + 1, index + 1),
    ]}
  >
    <RTCView
      streamURL={remote.stream.toURL()}
      style={styles.videoContent}
      objectFit="cover"
      mirror={false}
    />
    <Text style={styles.videoLabel}>
      {remote.role === 'host' ? 'Host' : 'Co-host'}
    </Text>
    </View>
))}


      {/* Placeholder slots for empty spaces (optional) */}
      {remoteStreams?.size === 0 && !IsCameraOn && (
        <View style={[styles.videoSlot, styles.emptySlot]}>
        {!IsCameraOn?  <CameraOff size={50} color="#888"/>:
           <Icon name="group" size={50} color="#888" />}
             {!IsCameraOn?
          <Text style={styles.emptyText}>Camera Switched off</Text>:
          <Text style={styles.emptyText}>Waiting for participants...</Text>}
        </View>
      )}
    </View>

  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  liveIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveText: {
    color: '#ff4444',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 8,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  viewerText: {
    color: 'white',
    fontSize: 12,
  },
  remoteStreamsContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    maxHeight: 400,
    zIndex: 1000,
    elevation: 10
  },
  remoteVideoWrapper: {
    width: 120,
    height: 160,
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  remoteLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingVertical: 2,
  },


  //New

  //   container: {
  //   flex: 1,
  //   backgroundColor: '#000',
  // },

  videoGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },

  videoSlot: {
    position: 'relative',
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#555',
  },

  videoContent: {
    width: '100%',
    height: '100%',
  },

  videoLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: 'transparent', //'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontWeight: 'bold',
  },

  emptySlot: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  }
});

export default Vendor