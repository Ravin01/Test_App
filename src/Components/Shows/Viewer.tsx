//AI viewer

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {WebView} from 'react-native-webview';
import axios from 'axios';
import streamingAxiosInstance from '../../Utils/streamingAxiosInstance';
import Video, {VideoRef} from 'react-native-video';
import {io} from 'socket.io-client';
import KeepAwake from 'react-native-keep-awake';
//import IVSStageViewer from '../RNIVSStageViewer';
import IVSStageViewerView from './Wrapper/IVSStageViewerView';
import { streamingBackendUrl, mediaSoupServerUrl, GET_STREAM_VIEWERS_COUNT } from '../../../Config';
import { colors } from '../../Utils/Colors';
import { StreamEventEmitter } from '../../Utils/StreamEventEmitter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  configureAppSync,
  connectToChannel,
  getIVSChannelPath,
  subscribeToChannel,
  closeChannel,
  Channel,
} from '../../Utils/appSyncConfig';

// Backend configuration - UPDATE WITH YOUR COMPUTER'S IP ADDRESS
// To find your IP: Open CMD and type 'ipconfig', look for IPv4 Address
// Example: http://192.168.1.100:9001
const BACKEND_URL = streamingBackendUrl; // ⚠️ CHANGE THIS TO YOUR COMPUTER'S IP!
// const BACKEND_URL = 'http://192.168.1.100:9001'; // ⚠️ CHANGE THIS TO YOUR COMPUTER'S IP!
const API_ENDPOINTS = {
  GET_STREAM: `${BACKEND_URL}/stream`,
  JOIN_STREAM: `${BACKEND_URL}/stream/join-ivs`,
  LEAVE_STREAM: `${BACKEND_URL}/stream/leave-ivs`,
};

//console.log('🌐 Viewer Backend URL configured:', BACKEND_URL);

interface StreamData {
  streamId: string;
  sellerId: string;
  streamType: string;
  streamStatus: string;
  playbackUrl: string;
  channelArn: string;
  viewerMode: 'webrtc' | 'hls';
  viewerCount: number;
  threshold: number;
  token?: string;
}

type ViewerProps = {
  streamId: string;
  setViewerCount: (count: number) => void;
  navigation?: any;
  isMuted?: boolean;
  setIsMuted?: (muted: boolean) => void;
  user?: any; // ✅ Added user prop to access user ID and other user data
};

const Viewer = ({ streamId, setViewerCount , navigation, isMuted, setIsMuted, user}: ViewerProps) => {
  //const [streamId, setStreamId] = useState(route?.params?.streamId || '');
  // console.log('🌐 Viewer Stream ID from props:', streamId);
  const [isWatching, setIsWatching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
   // route?.params?.
    streamId ? 'Connecting...' : 'Ready to watch');
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  //const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  //const [viewerCount, setViewerCount] = useState(0);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
 // console.log('🌐 Viewer Stream Data:', streamData);
  const [viewerMode, setViewerMode] = useState<'webrtc' | 'hls' | null>(null);
  const [streamEnded, setStreamEnded] = useState(false);

  const videoRef = useRef<any>(null);
  const logContainerRef = useRef<ScrollView>(null);
  const socketRef = useRef<any>(null);
 // console.log('socketRef', socketRef);
  const viewerIdRef = useRef<string>(`viewer-${Math.random().toString(36).substring(2, 10)}`);
  const joinedSocketIdRef = useRef<string | null>(null); // Store the socketId used when joining
  const isWatchingRef = useRef<boolean>(false); // Track watching state for cleanup
  const streamDataRef = useRef<StreamData | null>(null); // Store stream data for cleanup

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Add log message
  const addLog = (message: string) => {
     console.log(message);
    // const timestamp = new Date().toLocaleTimeString();
    // setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    // setTimeout(() => {
    //   logContainerRef.current?.scrollToEnd({animated: true});
    // }, 100);
  };

  // Function to update viewer count when viewer joins/leaves
  const updateViewerCount = async (streamId: string, increment = true) => {
    try {
      // First get current count
      const currentResponse = await axios.get(`${GET_STREAM_VIEWERS_COUNT}/${streamId}/viewers-count`);
      let currentCount = 0;

      // console.log('currentResponse', currentResponse);

      if (currentResponse.data && currentResponse.data.count !== undefined) {
        currentCount = currentResponse.data.count;
      }

      // Calculate new count
      const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);

      // Update count in backend
      const updateResponse = await axios.post(`${streamingBackendUrl}/stream/${streamId}/viewers`, {
        count: newCount
      });

      if (updateResponse.data && updateResponse.data.status) {
        addLog(`Updated viewer count: ${increment ? 'joined' : 'left'} - new count: ${newCount}`);
        setViewerCount(newCount);
        // console.log( '🌐 Updated viewer count:', newCount);

        // Emit socket event to notify other participants
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('viewerCountUpdate', {
            streamId: streamId,
            count: newCount,
            action: increment ? 'join' : 'leave'
          });
        }

        return newCount;
      }
    } catch (error: any) {
      addLog(`Error updating viewer count: ${error.message}`);
    }
    return null;
  };

  // Keep screen awake during stream watching
  useEffect(() => {
    if (isWatching) {
      KeepAwake.activate();
      addLog('🔆 Screen wake lock activated - screen will stay awake');
    } else {
      KeepAwake.deactivate();
      addLog('🌙 Screen wake lock deactivated');
    }

    // Cleanup on unmount
    return () => {
      KeepAwake.deactivate();
      addLog('🌙 Screen wake lock deactivated (component unmount)');
    };
  }, [isWatching]);

  // Initialize socket connection for real-time updates
  // useEffect(() => {
  //   const serverUrl = streamingBackendUrl;
  //   addLog(`🔌 Connecting to socket server: ${serverUrl}`);

  //   socketRef.current = io(serverUrl, {
  //     transports: ['websocket', 'polling'],
  //     reconnectionAttempts: 5,
  //     reconnectionDelay: 1000,
  //     reconnectionDelayMax: 5000,
  //   });

  //   socketRef.current.on('connect', () => {
  //     addLog(`✅ Socket connected: ${socketRef.current.id}`);
  //     setIsConnected(true);

  //     // Join the stream room to receive real-time updates
  //     if (streamId) {
  //      socketRef.current.emit('join-stream-room', streamId);
  //      addLog(`📍 Joined stream room======: ${streamId}`);
  //     }
  //   });

  //   socketRef.current.on('connect_error', (err: any) => {
  //     addLog(`❌ Socket connection error: ${err.message}`);
  //   });

  //   socketRef.current.on('reconnect', (attemptNumber) => {
  //     // console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
  //     setIsConnected(true);
  //   });

  //   socketRef.current.on('reconnect_error', (err) => {
  //     console.warn('❌ Reconnection error:', err.message);
  //   });

  //   socketRef.current.on('reconnect_failed', () => {
  //     console.warn('❌ Reconnection failed after max attempts');
  //   });

  //   socketRef.current.on('disconnect', () => {
  //     addLog('🔌 Socket disconnected');
  //     setIsConnected(false);
  //   });

  //   // Listen for viewer joined event (when any viewer joins including self)
  //   socketRef.current.on('stream:viewer:joined', (data: any) => {
  //     //  console.log('check=======',data.streamId, streamId);
  //     if (data.streamId === streamId) {
  //       addLog(`👤 Viewer joined. Total: ${data.viewerCount} (WebRTC: ${data.webrtcViewers || 0}, HLS: ${data.hlsViewers || 0})`);
  //       setViewerCount(data.viewerCount);
  //     }
  //   });

  //   // Listen for viewer left event (when any viewer leaves)
  //   socketRef.current.on('stream:viewer:left', (data: any) => {
  //     //  console.log('check==========',data.streamId, streamId);
  //     if (data.streamId === streamId) {
  //       addLog(`👋 Viewer left. Total: ${data.viewerCount} (WebRTC: ${data.webrtcViewers || 0}, HLS: ${data.hlsViewers || 0})`);
  //       setViewerCount(data.viewerCount);
  //     }
  //   });

  //   // Listen for stream ended event
  //   socketRef.current.on('stream:ended', (data: any) => {
  //     // console.log('stream ended',data.streamId, streamId);
  //     if (data.streamId === streamId) {
  //       addLog(`📺 Stream ended: ${data.reason || 'Unknown reason'}`);
  //       setStreamEnded(true);
  //       handleStopWatching();
  //       setStatusMessage('This stream has ended');
        
  //       // ✅ Emit stream ended event to notify Dashboard
  //       // console.log('📡 [Viewer] Emitting stream ended event:', streamId);
  //       // StreamEventEmitter.emitStreamEnded({
  //       //   streamId: streamId,
  //       //   liveStreamId: data?.streamId || streamId,
  //       //   endedAt: new Date().toISOString(),
  //       // });
  //     }
  //   });

  //   return () => {
  //     if (socketRef.current) {
  //       // Remove all event listeners to prevent memory leaks
  //       socketRef.current.off('connect');
  //       socketRef.current.off('connect_error');
  //       socketRef.current.off('reconnect');
  //       socketRef.current.off('reconnect_error');
  //       socketRef.current.off('reconnect_failed');
  //       socketRef.current.off('disconnect');
  //       socketRef.current.off('stream:viewer:joined');
  //       socketRef.current.off('stream:viewer:left');
  //       socketRef.current.off('stream:ended');
        
  //       // Leave the stream room
  //       if (streamId) {
  //         socketRef.current.emit('leave-stream-room', streamId);
  //         addLog(`📍 Left stream room: ${streamId}`);
  //       }
        
  //       // Disconnect socket
  //       socketRef.current.disconnect();
  //       addLog('🔌 Socket connection closed and listeners cleaned up');
  //     }
  //   };
  // }, [streamId]);

  // ✅ AppSync: Setup IVS stream event subscriptions
  useEffect(() => {
    console.log('before Setting up AppSync subscription for stream:', streamId); 
    //if (!streamId || !isConnected) return;
    if (!streamId) return; // ✅ Removed isConnected dependency - AppSync works independently

    console.log('after Setting up AppSync subscription for stream:', streamId);

    let channel: Channel | null = null;

    const setupAppSyncSubscription = async () => {
      try {
        console.log('🔌 [IVS AppSync] Step 1: Starting setup');
        addLog('🔌 [IVS AppSync] Setting up subscription for stream: ' + streamId);

        // Configure AppSync
        console.log('🔌 [IVS AppSync] Step 2: Configuring AppSync');
        await configureAppSync();
        console.log('🔌 [IVS AppSync] Step 3: AppSync configured');

        // Get IVS channel path
        const channelPath = getIVSChannelPath(streamId);
        console.log('🔌 [IVS AppSync] Step 4: Channel path:', channelPath);
        addLog('📡 [IVS AppSync] Connecting to channel: ' + channelPath);

        // Connect to channel
        console.log('🔌 [IVS AppSync] Step 5: Connecting to channel');
        channel = await connectToChannel(channelPath);
        console.log('🔌 [IVS AppSync] Step 6: Connected to channel');

        // Subscribe to channel events
        console.log('🔌 [IVS AppSync] Step 7: Creating subscription');
        const subscription = subscribeToChannel(
          channel,
          (data: any) => {
           // console.log('📨 [IVS AppSync] Received raw data:', JSON.stringify(data));
            try {
              // Extract event data from nested structure - AppSync sends data.event.event
              const eventData = data?.event?.event || data?.event || data;

              if (!eventData || !eventData.eventType) {
                console.log('⚠️ [IVS AppSync] Invalid event structure');
                return;
              }

              console.log(`📨 [IVS AppSync] Processing event: ${eventData.eventType}`);
              // Handle different IVS event types
              switch (eventData.eventType) {
                case 'stream:viewer:joined':
                  if (eventData.viewerCount !== undefined) {
                    setViewerCount(eventData.viewerCount);
                    console.log(`👤 Viewer joined via AppSync. Total: ${eventData.viewerCount} (WebRTC: ${eventData.webrtcViewers || 0}, HLS: ${eventData.hlsViewers || 0})`);
                  }
                  break;

                case 'stream:viewer:left':
                  if (eventData.viewerCount !== undefined) {
                    setViewerCount(eventData.viewerCount);
                    console.log(`👋 Viewer left via AppSync. Total: ${eventData.viewerCount} (WebRTC: ${eventData.webrtcViewers || 0}, HLS: ${eventData.hlsViewers || 0})`);
                  }
                  break;

                case 'stream:ended':
                  if (eventData.streamId === streamId) {
                    console.log(`📺 Stream ended via AppSync: ${eventData.reason || 'Host ended the stream'}`);
                    setStreamEnded(true);
                    handleStopWatching();
                    setStatusMessage('Stream has ended');
                  }
                  break;

                case 'stream:layout:changed':
                  if (eventData.streamId === streamId) {
                    console.log(`🎨 Layout changed from ${eventData.oldLayout} to ${eventData.layout}`);
                  }
                  break;

                case 'stream:live':
                  console.log('🎬 [IVS AppSync] Stream went live');
                  break;

                default:
                  addLog(`⚠️ [IVS AppSync] Unknown event type: ${eventData.eventType}`);
              }
            } catch (error: any) {
              console.log(`❌ [IVS AppSync] Error processing event: ${error.message}`);
            }
          },
          (error: any) => {
            console.log(`❌ [IVS AppSync] Subscription error: ${error.message}`);
          }
        );

        console.log('🔌 [IVS AppSync] Step 8: Subscription object created:', !!subscription);
        console.log('✅ [IVS AppSync] Subscription active - waiting for events');
      } catch (error: any) {
        console.log('❌ [IVS AppSync] Setup failed:', error);
        console.log(`❌ [IVS AppSync] Failed to setup subscription: ${error.message}`);
      }
    };

    setupAppSyncSubscription();

    return () => {
      if (channel) {
        addLog('🧹 [IVS AppSync] Cleaning up subscription');
        closeChannel(channel);
      }
    };
  }, [streamId]); // isConnected ✅ Removed isConnected dependency - AppSync works independently of socket

  useEffect(() => {
    // Auto-join if streamId is passed from navigation
    // Wait for socket connection before auto-joining
    console.log('handle join prefix', streamId, isWatchingRef.current, isLoading, socketRef.current?.connected);
    // if (streamId && !isWatching && !isLoading && socketRef.current?.connected) {
    //   // console.log('🎬 Auto-joining stream from navigation:', streamId);
    //   handleJoinStream();
    // }

    if (streamId && !isLoading) {
      // console.log('🎬 Auto-joining stream from navigation:', streamId);
      handleJoinStream();
    }

    return () => {
      // Cleanup on unmount
       console.log('watching status on unmount', isWatchingRef.current);
      // if (isWatchingRef.current) {
      //   handleStopWatching();
      // }
      handleStopWatching();
    };
  }, [streamId, socketRef.current?.connected]);

  const handleJoinStream = async () => {
    if (!streamId) {
      //Alert.alert('Stream ID Required', 'Please enter a Stream ID to join');
      return;
    }

    setIsLoading(true);
    setLogs([]);
    setStreamEnded(false);

    addLog('='.repeat(40));
    addLog('👀 JOINING STREAM AS VIEWER');
    addLog('='.repeat(40));

    try {
      // Step 1: Get stream data
      addLog(`📍 STEP 1: Fetching stream data for ID: ${streamId}`);
      
      const streamResponse = await streamingAxiosInstance.get(`/stream/${streamId}`);

      if (!streamResponse.data.status || !streamResponse.data.data) {
        throw new Error('Stream not found');
      }

      const stream = streamResponse.data.data;

      console.log('stream id from api',stream._id)

      const sellerId = stream.sellerId;

      addLog('✅ Stream found:');
      addLog(`   Stream ID: ${stream._id}`);
      addLog(`   Seller ID: ${sellerId}`);
      addLog(`   Stream Type: ${stream.streamType}`);
      addLog(`   Stream Status: ${stream.streamStatus}`);

      if (stream.streamStatus !== 'live') {
        setStreamEnded(true);
        setStatusMessage('This stream is not currently live');
        addLog('❌ Stream is not live');
        return;
      }

      // Step 2: Request viewer access
      if (stream.streamType === 'aws-ivs-realtime') {
        addLog(`\n📍 STEP 2: Requesting viewer access for seller: ${sellerId}`);

         // Ensure we have a valid socketId - wait for connection if needed
        // let socketId = socketRef.current?.id;
        // if (!socketId) {
        //   addLog('⚠️ Socket not connected, waiting...');
        //   // Wait up to 3 seconds for socket connection
        //   for (let i = 0; i < 30; i++) {
        //     await new Promise(resolve => setTimeout(resolve, 100));
        //     if (socketRef.current?.connected && socketRef.current?.id) {
        //       socketId = socketRef.current.id;
        //       addLog(`✅ Socket connected: ${socketId}`);
        //       break;
        //     }
        //   }
        //   // If still no socket, generate fallback
        //   if (!socketId) {
        //     socketId = `mobile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        //     addLog(`⚠️ Using fallback socketId: ${socketId}`);
        //   }
        // }

        // Generate unique socketId
        const socketId = user?._id || `viewer-${Date.now()}`;
        addLog(`📝 Generated socketId: ${socketId}`);

        // Store the socketId for later use when leaving
        joinedSocketIdRef.current = socketId;
        addLog(`📝 Stored socketId for leaving: ${socketId}`);

        console.log('payload to Start ivs', {
          sellerId,
          viewerId: viewerIdRef.current,
          socketId,
          quality: 'auto'
        })

        const joinResponse = await streamingAxiosInstance.post('/stream/join-ivs', {
          sellerId: sellerId,
          viewerId:  user?._id, //viewerIdRef.current,
          socketId: socketId,
          quality: 'auto'
        });

        //console.log('join ivs', joinResponse)
        console.log('join ivs Response',joinResponse.data.status, joinResponse.data.data)

        if (joinResponse.data.status && joinResponse.data.data) {
          const accessData: StreamData = joinResponse.data.data;

          setViewerCount(accessData.viewerCount);   // get initial viewer count

           console.log('🌐 Viewer Access Data viewer count:', accessData.viewerCount);

          addLog('✅ Viewer access granted:');
          addLog(`   Viewer Mode: ${accessData.viewerMode.toUpperCase()}`);
          addLog(`   Viewer Count: ${accessData.viewerCount}`);
          addLog(`   Threshold: ${accessData.threshold}`);

          if (accessData.viewerMode === 'webrtc' && accessData.token) {
            // WebRTC Stage mode
            addLog('🚀 Using WebRTC Stage (Ultra-low latency <300ms)');
            addLog('📱 Loading web-based WebRTC viewer...');
            
            const webrtcData = {...stream, ...accessData};
            setViewerMode('webrtc');
            setStreamData(webrtcData);
            streamDataRef.current = webrtcData; // Store in ref for cleanup
            setStatusMessage('Connecting to WebRTC...');
          } else {
            // HLS mode
            addLog('📺 Using HLS Channel (Unlimited viewers, 3-5s latency)');
            addLog(`   Playback URL: ${accessData.playbackUrl}`);

            const hlsData = {...stream, ...accessData};
            setViewerMode('hls');
            setStreamData(hlsData);
            streamDataRef.current = hlsData; // Store in ref for cleanup
            setStatusMessage('Loading HLS stream...');
          }

          setIsWatching(true);
          isWatchingRef.current = true;
          
          //Update viewer count - viewer joined
          // if (stream._id) {
          //   addLog('📊 Updating viewer count - viewer joined');
          //   updateViewerCount(stream._id, true).catch(err => {
          //     addLog(`Error updating viewer count on join: ${err.message}`);
          //   });
          // }
          
          //addLog('='.repeat(40));
        } else {
          throw new Error('Invalid stream data received');
        }
      } else {
        throw new Error('Unsupported stream type');
      }
    } catch (error: any) {
      console.log('Error joining stream:', error);
      addLog(`❌ Error: ${error.message}`);
      setStatusMessage(`Error: ${error.message}`);
      // Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopWatching = async () => {
    addLog('🛑 Stopping stream playback');
    
    // Use ref instead of state for cleanup reliability
    const dataToUse = streamDataRef.current || streamData;
    
    // Debug: Check state before condition
    addLog(`🔍 Debug - streamData exists: ${!!dataToUse}`);
    addLog(`🔍 Debug - joinedSocketIdRef.current: ${joinedSocketIdRef.current}`);
    addLog(`🔍 Debug - streamData?.sellerId: ${dataToUse?.sellerId}`);

    try {
      // Notify backend
      if (dataToUse && joinedSocketIdRef.current) {
        addLog(`📤 Leaving with socketId: ${joinedSocketIdRef.current}`);
        
        console.log('payload to leave ivs', {
          sellerId: dataToUse.sellerId,
          socketId: joinedSocketIdRef.current
        });
        const response = await streamingAxiosInstance.post('/stream/leave-ivs', {
          sellerId: dataToUse.sellerId,
          socketId: joinedSocketIdRef.current, // Use the SAME socketId from join
        });
        // console.log('🌐 Leave stream response:===', response.data);
        addLog(`✅ Backend notified==: ${response.data.message}`);
        
        // Update viewer count - viewer left (only if not due to stream ending)
        // if (streamData.streamId && !streamEnded) {
        //   addLog('📊 Updating viewer count - viewer left');
        //   updateViewerCount(streamData.streamId, false).catch(err => {
        //     addLog(`Error updating viewer count on leave: ${err.message}`);
        //   });
        // }
        
        // Clear the stored socketId
        joinedSocketIdRef.current = null;
      } else if (dataToUse && !joinedSocketIdRef.current) {
        addLog('⚠️ No stored socketId found - viewer may not have been properly registered');
      }
    } catch (error: any) {
      // console.log('Error leaving stream:', error);
      addLog(`❌ Error leaving stream: ${error.message}`);
    }

    setIsWatching(false);
    isWatchingRef.current = false;
    streamDataRef.current = null; // Clear the ref
    setViewerMode(null);
    setIsPaused(false);
    setStatusMessage('Disconnected from stream');
    addLog('Stopped watching stream');
  };

// Set up IVS heartbeat API
useEffect(() => {
  if (isWatching && streamId && user?._id) {
    // Send heartbeat to IVS API every 100 seconds
    const ivsHeartbeatInterval = setInterval(() => {
      streamingAxiosInstance.post('/ivs/heartbeat', {
        streamId: streamId,
        socketId: user._id
      })
      .catch(err => {
        console.error("Error sending IVS heartbeat:", err);
      });
    }, 100000); // Every 100 seconds

    return () => {
      clearInterval(ivsHeartbeatInterval);
    };
  }
}, [isWatching, streamId, user?._id]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    addLog(isMuted ? 'Unmuted audio' : 'Muted audio');
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    addLog(isPaused ? 'Resumed playback' : 'Paused playback');
  };

  const refreshStream = async () => {
    if (isWatchingRef.current) {
      await handleStopWatching();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    handleJoinStream();
  };

  return (
    <View style={styles.container}>
      {/* Video Container */}
      {isWatching && streamData && viewerMode === 'webrtc' ? (
        <View style={styles.videoContainer}>
          {/* Native IVS Stage Viewer - Better Performance */}
          <IVSStageViewerView
            style={styles.nativeViewer}
            stageToken={streamData.token}
            muted={isMuted}
            onConnectionStateChanged={(event) => {
              const state = event.nativeEvent.state;
              addLog(`🔄 Connection State: ${state}`);
              
              if (state === 'CONNECTED') {
                addLog('✅ CONNECTED! Waiting for streams...');
                setStatusMessage('Connected');
              } else if (state === 'CONNECTING') {
                addLog('🔄 CONNECTING to stage...');
                setStatusMessage('Connecting...');
              } else if (state === 'DISCONNECTED') {
                addLog('❌ DISCONNECTED from stage');
                setStatusMessage('Disconnected');
              } else if (state === 'ERROR') {
                addLog('❌ ERROR: Connection failed');
                setStatusMessage('Connection Error');
              }
            }}
            onParticipantJoined={(event) => {
              const participantId = event.nativeEvent.participantId;
              addLog(`👤 Participant Joined: ${participantId}`);
            }}
            onParticipantLeft={(event) => {
              const participantId = event.nativeEvent.participantId;
              addLog(`👋 Participant Left: ${participantId}`);
            }}
            onStreamsAdded={(event) => {
              const participantId = event.nativeEvent.participantId;
              const streamCount = event.nativeEvent.streamCount || 0;
              addLog('═══════════════════════════════════');
              addLog('📹 STREAMS ADDED EVENT!');
              addLog(`Participant: ${participantId}`);
              addLog(`Stream count: ${streamCount}`);
              addLog('═══════════════════════════════════');
              setStatusMessage('Watching Live Stream');
            }}
            onStreamsRemoved={(event) => {
              const participantId = event.nativeEvent.participantId;
              addLog(`📹 Streams removed from: ${participantId}`);
            }}
          />

          {/* LEGACY WebView Implementation (Commented Out) */}
          {/* <WebView
            source={{
              html: `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <script src="https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; }
    #video-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
    }
    #status {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 14px;
      text-align: center;
      background: rgba(0,0,0,0.7);
      padding: 20px;
      border-radius: 8px;
      z-index: 100;
    }
  </style>
</head>
<body>
  <div id="video-container"></div>
  <div id="status">Initializing...</div>
  
  <script>
    const log = (msg, isError = false) => {
      const prefix = isError ? '❌ [ERROR]' : '📡 [INFO]';
      console.log(prefix + ' ' + msg);
      document.getElementById('status').textContent = msg;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: isError ? 'error' : 'log',
          message: msg
        }));
      }
    };

    async function initViewer() {
      try {
        log('🔧 Step 1: Checking AWS IVS SDK...');
        
        if (typeof IVSBroadcastClient === 'undefined') {
          throw new Error('IVS SDK not loaded');
        }
        
        const { Stage, SubscribeType, StageEvents, ConnectionState } = IVSBroadcastClient;
        log('✅ AWS IVS SDK loaded successfully');
        
        log('🔧 Step 2: Preparing token...');
        const token = '${streamData.token}';
        log('✅ Token length: ' + token.length);
        
        log('🔧 Step 3: Creating strategy...');
        const strategy = {
          stageStreamsToPublish() {
            log('Strategy: stageStreamsToPublish - returning []');
            return [];
          },
          shouldPublishParticipant() {
            log('Strategy: shouldPublishParticipant - returning false');
            return false;
          },
          shouldSubscribeToParticipant() {
            log('Strategy: shouldSubscribeToParticipant - returning AUDIO_VIDEO');
            return SubscribeType.AUDIO_VIDEO;
          }
        };
        log('✅ Strategy created');
        
        log('🔧 Step 4: Creating Stage instance...');
        const stage = new Stage(token, strategy);
        log('✅ Stage instance created');
        
        log('🔧 Step 5: Setting up event listeners...');
        
        // Connection state listener
        stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state) => {
          log('🔄 Connection State: ' + state);
          if (state === ConnectionState.CONNECTED) {
            log('✅ CONNECTED! Waiting for streams...');
            document.getElementById('status').style.display = 'none';
          } else if (state === ConnectionState.CONNECTING) {
            log('🔄 CONNECTING to stage...');
          } else if (state === ConnectionState.DISCONNECTED) {
            log('❌ DISCONNECTED from stage', true);
          }
        });
        log('✅ Connection state listener added');
        
        // Participant joined listener
        stage.on(StageEvents.STAGE_PARTICIPANT_JOINED, (participant) => {
          log('👤 Participant Joined: ' + (participant.userId || participant.id));
        });
        log('✅ Participant joined listener added');
        
        // Streams added listener - THE CRITICAL ONE!
        stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, streams) => {
          log('═══════════════════════════════════');
          log('📹 STREAMS ADDED EVENT!');
          log('Participant: ' + (participant.userId || participant.id));
          log('Stream count: ' + streams.length);
          
          streams.forEach((stream, idx) => {
            log('Stream ' + idx + ':');
            log('  Type: ' + stream.streamType);
            log('  Has track: ' + !!stream.mediaStreamTrack);
            
            if (stream.mediaStreamTrack) {
              log('  Track kind: ' + stream.mediaStreamTrack.kind);
              log('  Track state: ' + stream.mediaStreamTrack.readyState);
              log('  Track enabled: ' + stream.mediaStreamTrack.enabled);
            }
          });
          log('═══════════════════════════════════');
          
          // Create video element
          let videoEl = document.querySelector('video[data-participant="' + participant.userId + '"]');
          
          if (!videoEl) {
            log('🎬 Creating video element...');
            videoEl = document.createElement('video');
            videoEl.setAttribute('data-participant', participant.userId);
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.muted = false;
            videoEl.style.width = '100%';
            videoEl.style.height = '100%';
            videoEl.style.objectFit = 'contain';
            
            videoEl.onloadedmetadata = () => log('✅ Video metadata loaded');
            videoEl.onplay = () => log('▶️ Video playing!');
            videoEl.onerror = (e) => log('Video error: ' + e, true);
            
            document.getElementById('video-container').innerHTML = '';
            document.getElementById('video-container').appendChild(videoEl);
            log('✅ Video element added to DOM');
          }
          
          // Create MediaStream and add tracks
          let mediaStream = videoEl.srcObject;
          if (!mediaStream) {
            log('🎥 Creating MediaStream...');
            mediaStream = new MediaStream();
            videoEl.srcObject = mediaStream;
          }
          
          streams.forEach((stream) => {
            if (stream.mediaStreamTrack) {
              log('➕ Adding ' + stream.mediaStreamTrack.kind + ' track...');
              mediaStream.addTrack(stream.mediaStreamTrack);
              log('✅ Track added successfully');
            }
          });
          
          videoEl.play()
            .then(() => log('✅ Play() succeeded'))
            .catch(e => log('Play error: ' + e.message, true));
        });
        log('✅ Streams added listener configured');
        
        // Participant left listener
        stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, (participant) => {
          log('👋 Participant left: ' + participant.userId);
          const videoEl = document.querySelector('video[data-participant="' + participant.userId + '"]');
          if (videoEl) videoEl.remove();
        });
        log('✅ Participant left listener added');
        
        // Error listener
        stage.on(StageEvents.STAGE_PARTICIPANT_PUBLISH_STATE_CHANGED, (participant, state) => {
          log('📡 Publish state: ' + state);
        });
        log('✅ All listeners configured');
        
        log('🔧 Step 6: Joining stage...');
        await stage.join();
        log('✅ Stage.join() completed!');
        log('🎉 Waiting for broadcaster streams...');
        
      } catch (error) {
        log('FATAL ERROR: ' + error.message, true);
        log('Stack: ' + error.stack, true);
      }
    }
    
    log('🚀 Starting viewer initialization...');
    initViewer();
  </script>
</body>
</html>
              `,
            }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                const prefix = data.type === 'error' ? '❌' : '📡';
                addLog(`${prefix} ${data.message}`);
              } catch (e) {
                addLog(`[WebView] ${event.nativeEvent.data}`);
              }
            }}
            onError={(syntheticEvent) => {
              const {nativeEvent} = syntheticEvent;
              addLog(`❌ WebView error: ${nativeEvent.description}`);
            }}
          /> */}

          {/* Stream overlay */}
          <View style={styles.overlay}>
            {/* <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View> */}

            {/* <View style={styles.modeBadge}>
              <Text style={styles.modeText}>WebRTC Native (&lt;300ms)</Text>
            </View> */}
          </View>

          {/* Viewer count */}
          {/* <View style={styles.viewerBadge}>
            <Text style={styles.viewerText}>👁️ {viewerCount}</Text>
          </View> */}

          {/* Bottom controls */}
          <View style={styles.controls}>
            {/* <TouchableOpacity 
              style={styles.controlButton} 
              onPress={toggleMute}>
              <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity> */}

            {/* <TouchableOpacity style={styles.leaveButton} onPress={handleStopWatching}>
              <Text style={styles.leaveButtonText}>Leave</Text>
            </TouchableOpacity> */}

            {/* <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setShowLogs(!showLogs)}>
              <Text style={styles.controlIcon}>{showLogs ? '↑' : '↓'}</Text>
            </TouchableOpacity> */}
          </View>
        </View>
      ) : isWatching && streamData?.playbackUrl && viewerMode === 'hls' ? (
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{uri: streamData.playbackUrl}}
            style={styles.video}
            resizeMode={'contain' as any}
            paused={isPaused}
            muted={isMuted}
            repeat={false}
            onLoad={() => {
              addLog('✅ Video loaded successfully');
              setStatusMessage('Watching Live Stream (HLS)');
            }}
            onBuffer={({isBuffering}) => {
              if (isBuffering) {
                addLog('Buffering...');
                setStatusMessage('Buffering...');
              }
            }}
            onError={(error) => {
              addLog(`❌ Video error: ${JSON.stringify(error)}`);
              setStatusMessage('Video playback error');
              Alert.alert('Playback Error', 'Failed to play video stream');
            }}
          />

          {/* Stream overlay */}
          <View style={styles.overlay}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>

            <View style={styles.modeBadge}>
              <Text style={styles.modeText}>HLS (3-5s)</Text>
            </View>
          </View>

          {/* Viewer count */}
          {/* <View style={styles.viewerBadge}>
            <Text style={styles.viewerText}>👁️ {viewerCount}</Text>
          </View> */}

          {/* Bottom controls */}
          {/* <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
              <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={togglePause}>
              <Text style={styles.controlIcon}>{isPaused ? '▶️' : '⏸️'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.leaveButton} onPress={handleStopWatching}>
              <Text style={styles.leaveButtonText}>Leave</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setShowLogs(!showLogs)}>
              <Text style={styles.controlIcon}>{showLogs ? '↑' : '↓'}</Text>
            </TouchableOpacity>
          </View> */}
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          {streamEnded ? (
            // <View style={styles.endedContainer}>
            //   <Text style={styles.endedIcon}>📺</Text>
            //   <Text style={styles.endedTitle}>Stream Ended</Text>
            //   <Text style={styles.endedText}>This live stream has ended.</Text>
            //   <View style={{flexDirection: 'row',  gap: 16,}}>
            //   <TouchableOpacity
            //       style={[styles.refreshButton, {marginTop: 20, backgroundColor: '#444'}]}
            //       onPress={() => navigation.goBack()}>
            //       <Text style={styles.streamEndedButtonText}>Back to Home</Text>
            //   </TouchableOpacity>
            //   <TouchableOpacity style={styles.refreshButton} onPress={refreshStream}>
            //     <Text style={styles.refreshButtonText}>Refresh</Text>
            //   </TouchableOpacity>
            //   </View>
            // </View>
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
                            onPress={async() => {
                              // ✅ Emit stream ended event to notify Dashboard when user navigates back
                              console.log('📡 [Viewer] User clicked Back to Home - Emitting stream ended event:', streamId);
                              
                              //Legacy code
                              // streamId prop IS the liveStreamId, so use it directly
                              // if (streamId) {
                              //   StreamEventEmitter.emitStreamEnded({
                              //     streamId: streamId,
                              //     liveStreamId: streamId,
                              //     endedAt: new Date().toISOString(),
                              //   });
                              // }
                            const routes = navigation?.getState()?.routes;
                              const index = navigation?.getState()?.index;
                            
                              const previousRoute = routes[index - 1]?.name;
                                // Small delay to ensure flag is propagated before navigation
                                const token = await AsyncStorage.getItem('accessToken');
                                if (navigation?.canGoBack()) {
                                  if (previousRoute === 'Login') {
                                  navigation.navigate('bottomtabbar');
                                } else {
                                  navigation.goBack();
                                }
                                } else {
                                  if (token) navigation.navigate('bottomtabbar');
                                  else navigation.navigate('Login');
                                }
                            }}>
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
          ) : (
            // <View style={styles.joinContainer}>
            //   <Text style={styles.joinTitle}>📡 Join Live Stream</Text>
            //   <Text style={styles.joinSubtitle}>Enter Stream ID to watch</Text>
            // </View>
            null
          )}
        </View>
      )}

      {/* Bottom Section */}
      {false &&<ScrollView style={styles.bottomSection}>
        {/* Stream ID Input */}
        {!isWatching && !streamEnded && (
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Stream ID</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.input}>{streamId || 'Enter Stream ID'}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  // Alert.prompt(
                  //   'Stream ID',
                  //   'Enter the Stream ID to join',
                  //   (text: string) => setStreamId(text),
                  //   'plain-text',
                  //   streamId,
                  // );
                }}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Join/Stop Button */}
        <View style={styles.actionContainer}>
          {!isWatching && !streamEnded ? (
            <TouchableOpacity
              style={[styles.button, styles.joinButton]}
              onPress={handleJoinStream}
              disabled={isLoading || !streamId}>
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>🎬 Join Stream</Text>
              )}
            </TouchableOpacity>
          ) : isWatching ? (
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStopWatching}>
              <Text style={styles.buttonText}>⏹️ Stop Watching</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.button, styles.logButton]}
            onPress={() => setShowLogs(!showLogs)}>
            <Text style={styles.buttonText}>
              {showLogs ? '📋 Hide Logs' : '📋 Show Logs'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>Status: {statusMessage}</Text>
        </View>

        {/* Logs Panel */}
        {showLogs && (
          <View style={styles.logsContainer}>
            <Text style={styles.logsTitle}>📋 Connection Logs</Text>
            <ScrollView
              ref={logContainerRef}
              style={styles.logsScroll}
              contentContainerStyle={styles.logsContent}>
              {logs.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📝 Viewer Guide</Text>
          <Text style={styles.instructionsText}>
            1. Get a Stream ID from a broadcaster{'\n'}
            2. Enter the Stream ID above{'\n'}
            3. Press "Join Stream" to start watching{'\n'}
            4. Use controls to mute/pause{'\n'}
            5. View logs for connection details{'\n'}
            {'\n'}
            📊 Streaming Modes:{'\n'}
            • WebRTC Stage: Ultra-low latency (&lt;300ms){'\n'}
            • HLS Channel: Unlimited viewers (3-5s latency)
          </Text>
        </View>
      </ScrollView>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    minHeight: 300,
  },
  video: {
    flex: 1,
    backgroundColor: '#000000',
  },
  nativeViewer: {
    flex: 1,
    backgroundColor: '#222', //'red', // '#000000', // Black background for production  // red
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  joinContainer: {
    alignItems: 'center',
    padding: 20,
  },
  joinTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  joinSubtitle: {
    color: '#a0a0a0',
    fontSize: 16,
  },
  endedContainer: {
    alignItems: 'center',
    padding: 20,
  },
  endedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  endedTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  endedText: {
    color: '#a0a0a0',
    fontSize: 16,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#007aff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginRight: 6,
  },
  liveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modeBadge: {
    backgroundColor: 'rgba(50, 215, 75, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  modeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewerBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controls: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
   // backgroundColor:'red'
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(17, 17, 17, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 24,
  },
  leaveButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  leaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 16,
  },
  inputCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  inputLabel: {
    color: '#a0a0a0',
    fontSize: 14,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  editButton: {
    backgroundColor: '#007aff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionContainer: {
    marginBottom: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  joinButton: {
    backgroundColor: '#32d74b',
  },
  stopButton: {
    backgroundColor: '#ff3b30',
  },
  logButton: {
    backgroundColor: '#ff9500',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBar: {
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    color: '#a0a0a0',
    fontSize: 14,
  },
  logsContainer: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    maxHeight: 200,
  },
  logsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  logsScroll: {
    maxHeight: 150,
  },
  logsContent: {
    paddingBottom: 8,
  },
  logText: {
    color: '#a0a0a0',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  instructionsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  instructionsTitle: {
    color: '#32d74b',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionsText: {
    color: '#a0a0a0',
    fontSize: 14,
    lineHeight: 22,
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
});

export default React.memo(Viewer);
