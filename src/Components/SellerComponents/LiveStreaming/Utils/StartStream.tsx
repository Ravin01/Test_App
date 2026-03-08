"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ToastAndroid,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  ScrollView,
  PermissionsAndroid,
} from "react-native"
import { RTCView, mediaDevices, type MediaStream, type MediaStreamTrack } from "react-native-webrtc"
import io from "socket.io-client"
import moment from "moment"

import * as mediasoupClient from 'mediasoup-client';
import axiosInstance from "../../../../Utils/Api"
import axios from "axios"
import { mediaSoupServerUrl } from "../../../../../Config"

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")

interface StartStreamProps {
  showId: string
  showDetails: any
  role: string
}

const StartStream: React.FC<StartStreamProps> = ({ showId, showDetails, role }) => {
  // State variables
  const [sellerId, setSellerId] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [statusMessage, setStatusMessage] = useState("Not connected")
  const [logs, setLogs] = useState<string[]>([])
  const [streamSocketId, setStreamSocketId] = useState("")
  const [availableStreams, setAvailableStreams] = useState([])
  const [selectedStreamId, setSelectedStreamId] = useState("")
  const [isHost, setIsHost] = useState(false)
  const [isCohost, setIsCohost] = useState(false)
  const [cohosts, setCohosts] = useState([])
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteTarget, setInviteTarget] = useState("")
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicrophoneMuted, setIsMicrophoneMuted] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [mode, setMode] = useState(role === "cohost" ? "join" : "create")
  const [showControls, setShowControls] = useState(true)
  const [showLogs, setShowLogs] = useState(false)

  // Refs
  const socketRef = useRef<any>(null)
  const deviceRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const producerTransportRef = useRef<any>(null)
  const videoProducerRef = useRef<any>(null)
  const audioProducerRef = useRef<any>(null)
  const roomIdRef = useRef<string | null>(null)
  const cohostManagerRef = useRef<any>(null)
  const heartbeatIntervalRef = useRef<any>(null)
  const consumerTransportRef = useRef<any>(null)
  const consumersRef = useRef(new Map())
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([])

  // Add log message
  const addLog = (message: string) => {
    // console.log(message)
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
  }

  // Request permissions
  const requestPermissions = async () => {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ])

        const cameraGranted = granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED
        const audioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED

        return cameraGranted && audioGranted
      }
      return true // iOS permissions handled differently
    } catch (error) {
      addLog(`Permission error: ${error}`)
      return false
    }
  }

  // Initialize socket connection
  useEffect(() => {
    const serverUrl = mediaSoupServerUrl // Replace with your server URL
    addLog(`Connecting to server: ${serverUrl}`)

    socketRef.current = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
      forceNew: true,
    })

    socketRef.current.on("connect", () => {
      addLog(`Socket connected: ${socketRef.current.id}`)
      setIsConnected(true)
      setStatusMessage("Connected to server")
      fetchAvailableStreams()
    })

    socketRef.current.on("connect_error", (error: any) => {
      addLog(`Connection error: ${error.message}`)
      setStatusMessage(`Connection error: ${error.message}`)
      setIsConnected(false)
    })

    socketRef.current.on("disconnect", (reason: string) => {
      // addLog(`Socket disconnected: ${reason}`)
      setIsConnected(false)
      setStatusMessage(`Disconnected: ${reason}`)
      if (isStreaming) {
        addLog("Stream interrupted by disconnection")
        handleStopStream()
      }
    })

    socketRef.current.on("viewerCountUpdate", ({ streamId, count }: any) => {
      if (roomIdRef.current === streamId) {
        addLog(`Viewer count updated: ${count} viewers`)
        setViewerCount(count)
      }
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  // Fetch available streams
  const fetchAvailableStreams = async () => {
    try {
      // Replace with your API endpoint
      const response = await axios.get("https://test-flykup-backend.onrender.com/stream/available-streams")
      if (response.data.status && response.data.data) {
        const liveStreams = response.data.data.filter((stream: any) => stream.streamStatus === "live")
        setAvailableStreams(liveStreams)
        addLog(`Found ${liveStreams.length} active streams`)
      }
    } catch (error: any) {
      addLog(`Error fetching streams: ${error.message}`)
    }
  }

  // Get user media
  const getUserMedia = async () => {
    try {
      addLog("Requesting camera and microphone access")

      const hasPermissions = await requestPermissions()
      if (!hasPermissions) {
        throw new Error("Permissions not granted")
      }

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: "user",
        },
      })

      localStreamRef.current = stream
      setVideoPlaying(true)
      addLog("Media access granted successfully")
      return true
    } catch (error: any) {
      addLog(`Media access error: ${error.message}`)
      setStatusMessage(`Media error: ${error.message}`)
      return false
    }
  }

  // Load mediasoup client device
  const loadDevice = async (routerRtpCapabilities: any) => {
    try {
      addLog("Loading mediasoup device")
      deviceRef.current = new mediasoupClient.Device()
            await deviceRef.current.load({ routerRtpCapabilities })
      // You'll need to import mediasoup-client for React Native
      // const mediasoupClient = require('mediasoup-client');
      // deviceRef.current = new mediasoupClient.Device();
      // await deviceRef.current.load({ routerRtpCapabilities });
      addLog("Device loaded successfully")
      return true
    } catch (error: any) {
      addLog(`Failed to load device: ${error.message}`)
      setStatusMessage(`Error: ${error.message}`)
      return false
    }
  }

  // Create producer transport
  const createProducerTransport = async (roomId: string) => {
    try {
      addLog(`Requesting producer transport for room: ${roomId}`)

      const transportOptions = await new Promise((resolve, reject) => {
        socketRef.current.emit("createProducerTransport", { roomId }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error))
          } else {
            resolve(response)
          }
        })
      })

      addLog("Creating producer transport")
      // MediaSoup transport creation logic here

      addLog("Producer transport created successfully")
      return true
    } catch (error: any) {
      addLog(`Error creating producer transport: ${error.message}`)
      setStatusMessage(`Transport error: ${error.message}`)
      return false
    }
  }

  // Start stream
  const handleStartStream = async () => {
    try {
      if (isStreaming) return
      setStatusMessage("Initializing stream...")

      // Create a new stream in the database
      const streamResponse = await axios.post("your-api-endpoint/create-stream", {
        streamStartTime: moment().format("HH:mm:ss"),
        streamDate: moment().format("YYYY-MM-DD"),
        sellerId: sellerId === "" ? Math.random().toString(36).substring(2, 10) : sellerId,
        streamSocketId: socketRef.current.id,
      })

      const streamData = streamResponse.data.data
      const roomId = streamData._id
      roomIdRef.current = roomId
      addLog(`Created new stream with ID: ${roomId}`)

      // Join the room
      await new Promise((resolve, reject) => {
        socketRef.current.emit("joinRoom", { roomId }, (response: any) => {
          if (response.joined) {
            resolve(response)
            addLog(`Successfully joined room: ${roomId}`)
          } else {
            reject(new Error("Failed to join room"))
          }
        })
      })

      // Get router capabilities
      const routerRtpCapabilities = await new Promise((resolve, reject) => {
        socketRef.current.emit("getRouterRtpCapabilities", { roomId }, (data: any) => {
          if (data.error) {
            reject(new Error(data.error))
          } else {
            resolve(data)
          }
        })
      })

      // Load device with router capabilities
      if (!(await loadDevice(routerRtpCapabilities))) {
        throw new Error("Failed to load device")
      }

      // Get local media
      if (!(await getUserMedia())) {
        throw new Error("Failed to get user media")
      }

      // Create producer transport
      if (!(await createProducerTransport(roomId))) {
        throw new Error("Failed to create producer transport")
      }

      setIsStreaming(true)
      setIsHost(true)
      setStatusMessage("Stream started - LIVE")
      addLog("Stream started successfully")
      setViewerCount(1)

      // Update show status
      const startRes = await axios.patch(`your-api-endpoint/shows/${showId}/start`, {
        liveStreamId: roomId,
      })

      if (startRes?.data?.data?.status) {
        if (Platform.OS === "android") {
          ToastAndroid.show("Show is Live & Id is stored successfully!", ToastAndroid.SHORT)
        } else {
          Alert.alert("Success", "Show is Live & Id is stored successfully!")
        }
      }
    } catch (error: any) {
      addLog(`Error starting stream: ${error.message}`)
      setStatusMessage(`Stream error: ${error.message}`)
    }
  }

  // Stop stream
  const handleStopStream = async () => {
    try {
      addLog("Stopping stream...")

      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }

      // Close producers
      if (videoProducerRef.current) {
        videoProducerRef.current.close()
        videoProducerRef.current = null
        addLog("Closed video producer")
      }

      if (audioProducerRef.current) {
        audioProducerRef.current.close()
        audioProducerRef.current = null
        addLog("Closed audio producer")
      }

      // Close transport
      if (producerTransportRef.current) {
        producerTransportRef.current.close()
        producerTransportRef.current = null
        addLog("Closed producer transport")
      }

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
        localStreamRef.current = null
        addLog("Stopped local media stream")
      }

      // Reset state
      setIsStreaming(false)
      setIsHost(false)
      setIsCohost(false)
      setCohosts([])
      setViewerCount(0)
      setVideoPlaying(false)
      setIsCameraOn(true)
      setIsMicrophoneMuted(false)
      roomIdRef.current = null
      deviceRef.current = null

      setStatusMessage("Stream ended")
      addLog("Stream ended successfully")

      // End show
      const endRes = await axios.patch(`your-api-endpoint/shows/${showId}/end`, {})
      if (endRes?.data?.data?.status) {
        if (Platform.OS === "android") {
          ToastAndroid.show("Show is Ended.", ToastAndroid.SHORT)
        } else {
          Alert.alert("Success", "Show is Ended.")
        }
      }
    } catch (error: any) {
      console.log("Error in handleStopStream:", error)
      addLog(`Error stopping stream: ${error.message}`)
      // Reset state even on error
      setIsStreaming(false)
      setIsHost(false)
      setIsCohost(false)
      setCohosts([])
      setViewerCount(0)
      roomIdRef.current = null
      deviceRef.current = null
    }
  }

  // Toggle camera
  const toggleCamera = async () => {
    if (!localStreamRef.current) return

    const videoTracks = localStreamRef.current.getVideoTracks()
    if (videoTracks.length > 0) {
      const isCurrentlyEnabled = videoTracks[0].enabled
      videoTracks[0].enabled = !isCurrentlyEnabled
      setIsCameraOn(!isCurrentlyEnabled)
      addLog(`Camera turned ${!isCurrentlyEnabled ? "on" : "off"}`)
    }
  }

  // Toggle microphone
  const toggleMicrophone = async () => {
    if (!localStreamRef.current) return

    const audioTracks = localStreamRef.current.getAudioTracks()
    if (audioTracks.length > 0) {
      const isCurrentlyEnabled = audioTracks[0].enabled
      audioTracks[0].enabled = !isCurrentlyEnabled
      setIsMicrophoneMuted(isCurrentlyEnabled)
      addLog(`Microphone ${isCurrentlyEnabled ? "muted" : "unmuted"}`)
    }
  }

  // Handle invite co-host
  const handleInviteCohost = () => {
    setShowInviteDialog(true)
  }

  return (
    <View style={styles.container}>
      {/* Video Container */}
      <View style={styles.videoContainer}>
        {localStreamRef.current && (
          <RTCView
            streamURL={localStreamRef.current.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
          />
        )}

        {/* Remote streams for co-hosts */}
        {remoteStreams.map((stream, index) => (
          <RTCView key={index} streamURL={stream.toURL()} style={styles.remoteVideo} objectFit="cover" />
        ))}

        {/* Stream Status Overlay */}
        {isStreaming && (
          <View style={styles.statusOverlay}>
            <View style={styles.viewerContainer}>
              <View style={styles.viewerIcon}>
                <Text style={styles.viewerIconText}>👥</Text>
              </View>
              <Text style={styles.viewerCount}>{viewerCount}</Text>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        )}

        {/* Controls */}
        {isStreaming && showControls && (
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              onPress={toggleCamera}
              style={[styles.controlButton, { backgroundColor: isCameraOn ? "rgba(255,255,255,0.3)" : "#dc3545" }]}
            >
              <Text style={styles.controlButtonText}>{isCameraOn ? "📹" : "📹"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleMicrophone}
              style={[
                styles.controlButton,
                { backgroundColor: isMicrophoneMuted ? "#dc3545" : "rgba(255,255,255,0.3)" },
              ]}
            >
              <Text style={styles.controlButtonText}>{isMicrophoneMuted ? "🔇" : "🎤"}</Text>
            </TouchableOpacity>

            {isHost && (
              <TouchableOpacity
                onPress={handleInviteCohost}
                style={[styles.controlButton, { backgroundColor: "#007bff" }]}
              >
                <Text style={styles.controlButtonText}>+ Co-host</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleStopStream} style={[styles.controlButton, { backgroundColor: "#dc3545" }]}>
              <Text style={styles.controlButtonText}>Stop Live</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isStreaming && (
          <View style={styles.readyOverlay}>
            <Text style={styles.readyText}>{isConnected ? "Ready to stream" : "Connecting..."}</Text>
            {isConnected && (
              <TouchableOpacity onPress={handleStartStream} style={styles.startButton}>
                <Text style={styles.startButtonText}>Start Stream</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{statusMessage}</Text>
        <TouchableOpacity onPress={() => setShowLogs(!showLogs)} style={styles.logsToggle}>
          <Text style={styles.logsToggleText}>{showLogs ? "Hide Logs" : "Show Logs"}</Text>
        </TouchableOpacity>
      </View>

      {/* Logs */}
      {showLogs && (
        <View style={styles.logsContainer}>
          <ScrollView style={styles.logsList}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Invite Co-host Modal */}
      <Modal
        visible={showInviteDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInviteDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Co-host</Text>
              <TouchableOpacity onPress={() => setShowInviteDialog(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.inviteInput}
              placeholder="Enter seller ID or username"
              value={inviteTarget}
              onChangeText={setInviteTarget}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowInviteDialog(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  // Handle invite logic here
                  setShowInviteDialog(false)
                  setInviteTarget("")
                }}
                style={[styles.modalButton, styles.inviteButton]}
              >
                <Text style={styles.inviteButtonText}>Send Invite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000",
  },
  localVideo: {
    width: "100%",
    height: "100%",
  },
  remoteVideo: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 120,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#28a745",
  },
  statusOverlay: {
    position: "absolute",
    top: 20,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  viewerContainer: {
    alignItems: "center",
    marginRight: 15,
  },
  viewerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#dc3545",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerIconText: {
    fontSize: 16,
  },
  viewerCount: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc3545",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
    marginRight: 4,
  },
  liveText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  controlsContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  controlButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  readyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  readyText: {
    color: "white",
    fontSize: 18,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  startButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#333",
  },
  statusText: {
    color: "white",
    fontSize: 14,
  },
  logsToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#007bff",
    borderRadius: 4,
  },
  logsToggleText: {
    color: "white",
    fontSize: 12,
  },
  logsContainer: {
    height: 150,
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#dee2e6",
  },
  logsList: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  logText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#333",
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: screenWidth * 0.9,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 18,
    color: "#666",
  },
  inviteInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  inviteButton: {
    backgroundColor: "#007bff",
  },
  inviteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
})

export default StartStream
