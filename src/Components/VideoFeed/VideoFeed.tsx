/* eslint-disable react/no-unstable-nested-components */
"use client"

/**
 * 🚀 ENTERPRISE VIDEO FEED - MAIN ORCHESTRATOR (FIXED VERSION)
 * CEO Priority: Zero black screens, 60 FPS, TikTok-beating performance
 * Integrates all managers for bulletproof video feed experience
 * 
 * FIXES APPLIED:
 * 1. Fixed keyExtractor to ensure unique keys
 * 2. Added proper error boundaries for compare functions  
 * 3. Fixed FlatList data handling
 * 4. Improved memory management
 * 5. Added fallbacks for undefined data
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, useReducer } from "react"
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Platform,
  StatusBar,
  AppState,
  type AppStateStatus,
  TouchableOpacity,
  Text,
  Image,
  Share,
  ToastAndroid,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
} from "react-native"
import type { VideoData, EndlessFeedState, NetworkState, MemoryState } from "./VideoTypes"

import type { IVideoMemoryManagerInternal } from "./IVideoMemoryManager"
import { VideoPlayer, type VideoPlayerHandle } from "./VideoPlayer"
import VideoErrorBoundary from "./VideoErrorBoundary"
import VideoDebugOverlay from "./VideoDebugOverlay"
// Enterprise managers - now fixed and re-enabled
import { EndlessFeedManager } from "./EndlessFeedManager"
import { ColdStartOptimizer } from "./ColdStartOptimizer"
import VideoMemoryManagerFactory from "./VideoMemoryManagerFactory"
import type { IVideoBufferManager } from "./IVideoBufferManager"
import VideoBufferManagerFactory from "./VideoBufferManagerFactory"
import PlatformDetection from "./PlatformDetection"

import Icon from "react-native-vector-icons/Feather"
import Icons from "react-native-vector-icons/MaterialCommunityIcons"
import Ionicons from "react-native-vector-icons/Ionicons"
import FontAwesome from "react-native-vector-icons/FontAwesome"
import LinearGradient from "react-native-linear-gradient"
import LikeButton from "../Reuse/LikeButton"
import { AWS_CDN_URL } from "../../Utils/aws"
import { useFollowApi } from "../../Utils/FollowersApi"
import { shareUrl } from "../../../Config"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axiosInstance from "../../Utils/Api"
import { formatFollowerCount } from "../../Utils/dateUtils"
import { __DEV__ } from "react-native"
import useVideoTracker from "../Reels/hooks/useVideoTracker"
import CommentBottomSheet from "../Reels/CommentBottomSheet"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { useUnifiedVideoInteractions } from "../../hooks/useUnifiedVideoInteractions"
import { ArrowLeft, ArrowLeftCircle, ChevronLeft } from "lucide-react-native"
import VideoPlay from "./VideoPlay"
import { TextInput } from "react-native-gesture-handler"

import { useKeyboard } from './useKeyboard'; 
const { width: screenWidth, height: screenHeight } = Dimensions.get("window")

// Add safety check for screen dimensions
const SCREEN_WIDTH = screenWidth || 375
const SCREEN_HEIGHT = screenHeight || 812

// UI-only state for overlay components (non-interaction related)
const initialUIState = {
  mute: false,
  paused: false,
  currentProductIndex: 0,
  activeProduct: null,
}

const uiReducer = (state, action) => {
  switch (action.type) {
    case "TOGGLE_MUTE":
      return { ...state, mute: !state.mute }
    case "SET_PAUSED":
      return { ...state, paused: action.payload }
    case "SET_CURRENT_PRODUCT_INDEX":
      return { ...state, currentProductIndex: action.payload }
    case "SET_ACTIVE_PRODUCT":
      return { ...state, activeProduct: action.payload }
    default:
      return state
  }
}

interface VideoFeedProps {
  initialVideos?: VideoData[]
  onVideoChange?: (video: VideoData, index: number) => void
  onError?: (error: any) => void
  onBusinessCriticalError?: (error: any) => void
  testID?: string
  navigation?: any
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  initialVideos = [],
  onVideoChange,
  onError,
  onBusinessCriticalError,
  testID,
}) => {
  const navigation = useNavigation()
  // STATE - Add safety checks for initial data
  const [videos, setVideos] = useState<VideoData[]>(() => {
    // Ensure we have valid video data
    const validVideos = (initialVideos || []).filter(video => 
      video && typeof video === 'object' && video._id
    )
    return validVideos
  })
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [feedState, setFeedState] = useState<EndlessFeedState>({
    isLoading: false,
    hasMore: true,
    currentPage: 0,
    isStuck: false,
    errorRecovering: false,
  })
  const [memoryState, setMemoryState] = useState<MemoryState>({
    currentUsage: 0,
    peakUsage: 0,
    pressureLevel: "normal",
    gcFrequency: 0,
    leakDetected: false,
  })
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    connectionType: "wifi",
    isMetered: false,
    quality: "good",
    bandwidth: 10.0,
  })
  const [showDebugOverlay, setShowDebugOverlay] = useState(__DEV__)
  const [videoCurrentTimes, setVideoCurrentTimes] = useState<Map<string, number>>(new Map())

  const [selectedItem, setSelectedItem] = useState(null)
  const [reelStates, setReelStates] = useState<Map<string, any>>(new Map())
  const [isScreenFocused, setIsScreenFocused] = useState(true)
  const [preloadedVideos, setPreloadedVideos] = useState<Set<string>>(new Set())

  // REFS
  const flatListRef = useRef<FlatList>(null)
  const videoRefs = useRef<Map<string, VideoPlayerHandle>>(new Map())
  const feedManagerRef = useRef<EndlessFeedManager>()
  const bufferManagerRef = useRef<IVideoBufferManager>()
  const memoryManagerRef = useRef<IVideoMemoryManagerInternal>()
  const coldStartOptimizerRef = useRef<ColdStartOptimizer>()
  const appStateRef = useRef<AppStateStatus>("active")
  const navigationUnsubscribeRef = useRef<(() => void) | null>(null)

  // PERFORMANCE MONITORING
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalVideos: 0,
    averageLoadTime: 0,
    stallEvents: 0,
    errorCount: 0,
    feedStartTime: Date.now(),
  })

  // DEVICE CAPABILITIES
  const capabilities = useMemo(() => {
    try {
      return PlatformDetection.getCapabilities()
    } catch (error) {
      console.warn('PlatformDetection.getCapabilities failed, using defaults:', error)
      // Return safe defaults
      return {
        isLowEnd: false,
        supportsHardwareAcceleration: true,
        maxVideoResolution: '1080p',
        concurrentVideoLimit: 3
      }
    }
  }, [])

  // PAUSE ALL VIDEOS FUNCTION
  const pauseAllVideos = useCallback(() => {
    console.log("⏸️ Pausing all videos")
    videoRefs.current.forEach((videoRef, key,index) => {
      try {
        
        videoRef?.pause()
      } catch (error) {
        console.warn(`Failed to pause video ${key}:`, error)
      }
    })
    setIsPaused(true)
  }, [])

  // RESUME CURRENT VIDEO FUNCTION
  const resumeCurrentVideo = useCallback(() => {
    if (!isScreenFocused) return
    console.log("▶️ Resuming current video")
    const currentVideo = videos[currentIndex]
    if (currentVideo && currentVideo._id) {
      const videoKey = `${currentVideo._id}-${currentIndex}`
      const videoRef = videoRefs.current.get(videoKey)
      try {
        videoRef?.play()
      } catch (error) {
        console.warn(`Failed to resume video ${videoKey}:`, error)
      }
    }
    setIsPaused(false)
  }, [currentIndex, videos, isScreenFocused])

  // NAVIGATION FOCUS EFFECT - Handles screen focus/blur
  useFocusEffect(
    useCallback(() => {
      console.log("📱 Screen focused - resuming video playback")
      setIsScreenFocused(true)
      resumeCurrentVideo()
      
      return () => {
        console.log("📱 Screen blurred - pausing all videos")
        setIsScreenFocused(false)
        // pauseAllVideos()
      }
    }, [pauseAllVideos, resumeCurrentVideo])
  )

  // NAVIGATION LISTENERS - Additional safety for navigation events
  useEffect(() => {
    if (!navigation) return

    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log("🔍 Navigation focus event")
      setIsScreenFocused(true)
      setIsPaused(false)
    })

    const unsubscribeBlur = navigation.addListener('blur', () => {
      console.log("🔍 Navigation blur event - pausing videos")
      pauseAllVideos()
      setIsScreenFocused(false)
    })

    const unsubscribeBeforeRemove = navigation.addListener('beforeRemove', () => {
      console.log("🔍 Navigation beforeRemove - cleaning up")
      pauseAllVideos()
    })

    return () => {
      unsubscribeFocus()
      unsubscribeBlur()
      unsubscribeBeforeRemove()
    }
  }, [navigation, pauseAllVideos])

  // INITIALIZATION with better error handling
  useEffect(() => {
    initializeVideoFeed()
    return cleanup
  }, [])

  const initializeVideoFeed = async () => {
    console.log("🚀 Initializing Enterprise Video Feed (Full System)")

    try {
      // Initialize platform detection first with error handling
      console.log("📱 Initializing platform detection")
      try {
        await PlatformDetection.initialize()
      } catch (error) {
        console.warn('PlatformDetection.initialize failed, continuing without it:', error)
      }

      // Initialize cold start optimizer first
      try {
        coldStartOptimizerRef.current = ColdStartOptimizer.getInstance()
        await coldStartOptimizerRef.current.initializeCriticalPath()
      } catch (error) {
        console.warn('ColdStartOptimizer initialization failed:', error)
      }

      // Initialize managers in parallel with better error handling
      console.log("🏗️ Initializing enterprise managers")
      const initPromises = []
      
      try {
        initPromises.push(EndlessFeedManager.getInstance())
      } catch (error) {
        console.warn('EndlessFeedManager.getInstance failed:', error)
      }
      
      try {
        initPromises.push(VideoBufferManagerFactory.getInstance())
      } catch (error) {
        console.warn('VideoBufferManagerFactory.getInstance failed:', error)
      }
      
      try {
        initPromises.push(VideoMemoryManagerFactory.getInstance())
      } catch (error) {
        console.warn('VideoMemoryManagerFactory.getInstance failed:', error)
      }

      const [feedManager, bufferManager, memoryManager] = await Promise.allSettled(initPromises)

      // Set managers with null checks
      if (feedManager.status === 'fulfilled') {
        feedManagerRef.current = feedManager.value
      }
      if (bufferManager.status === 'fulfilled') {
        bufferManagerRef.current = bufferManager.value
      }
      if (memoryManager.status === 'fulfilled') {
        memoryManagerRef.current = memoryManager.value
      }

      // Initialize with initial videos
      const videosToUse = videos.filter(video => video && video._id) // Additional safety check
      if (videosToUse.length > 0) {
        if (feedManagerRef.current) {
          await feedManagerRef.current.initialize(videosToUse)
        }
        console.log(`📹 Loaded ${videosToUse.length} initial videos`)
      } else {
        if (feedManagerRef.current) {
          await feedManagerRef.current.initialize([])
        }
        console.log("📹 Initialized with empty video list")
      }

      // Initialize other managers with null checks
      if (bufferManagerRef.current) {
        await bufferManagerRef.current.initialize()
        
      }
      if (memoryManagerRef.current) {
        await memoryManagerRef.current.initialize()
      }

      // Set up event listeners
      setupEventListeners()

      // Set up app state monitoring
      setupAppStateMonitoring()

      // Trigger feed visible event for cold start metrics
      if (coldStartOptimizerRef.current) {
        coldStartOptimizerRef.current.onFeedVisible()
      }

      console.log("✅ Enterprise Video Feed initialized successfully")
    } catch (error) {
      console.error("❌ Video Feed initialization failed:", error)
      onError?.(error)
    }
  }

  const setupEventListeners = () => {
    if (!feedManagerRef.current) return

    const feedManager = feedManagerRef.current
    console.log("📡 Setting up enterprise event listeners")

    try {
      // Feed manager events with error handling
      feedManager.addEventListener("pageLoaded", (data) => {
        console.log("📥 New page loaded:", data.videosLoaded, "videos")
        const newVideos = feedManager.getVideos()
        if (Array.isArray(newVideos)) {
          setVideos(newVideos.filter(video => video && video._id))
        }
        setFeedState(feedManager.getFeedState())
      })

      feedManager.addEventListener("stuck", (data) => {
        console.warn("🔄 Feed stuck detected, initiating recovery")
        setFeedState(feedManager.getFeedState())
      })

      feedManager.addEventListener("endReached", (data) => {
        console.log("🏁 End of content reached:", data.totalVideos, "total videos")
        setFeedState(feedManager.getFeedState())
      })

      feedManager.addEventListener("recoveryFailed", (data) => {
        console.error("❌ Feed recovery failed:", data.error)
        onError?.(new Error(`Feed recovery failed: ${data.error}`))
      })
    } catch (error) {
      console.warn('Error setting up event listeners:', error)
    }
  }

  const setupAppStateMonitoring = () => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current !== nextAppState) {
        console.log("📱 App state changed:", appStateRef.current, "->", nextAppState)

        if (nextAppState === "background" || nextAppState === "inactive") {
          pauseAllVideos()
          // Hint memory manager about background state
          if (memoryManagerRef.current) {
            memoryManagerRef.current.handleMemoryWarning()
          }
        } else if (nextAppState === "active" && isScreenFocused) {
          // Only resume if screen is also focused
          resumeCurrentVideo()
        }

        appStateRef.current = nextAppState
      }
    }

    AppState.addEventListener("change", handleAppStateChange)

    return () => {
      AppState.removeEventListener("change", handleAppStateChange)
    }
  }

  // VIDEO PRELOADING FUNCTION - Fixed to prevent duplicate preloading
// Enhanced preloadVideos function
const preloadVideos = useCallback((centerIndex: number) => {
  // Adjust preload range based on device capabilities
  const preloadRange = capabilities.isLowEnd ? 1 : 3
  
  const startIndex = Math.max(0, centerIndex - preloadRange)
  const endIndex = Math.min(videos.length - 1, centerIndex + preloadRange)
  
  // Preload videos in priority order (current, next, previous)
  const preloadPriority = [
    centerIndex, // current (highest priority)
    centerIndex + 1, // next
    centerIndex - 1, // previous
    centerIndex + 2, // next+1
    centerIndex - 2, // previous-1
  ]
  
  setPreloadedVideos(prev => {
    const newPreloadedSet = new Set<string>(prev)
    
    // Preload in priority order
    preloadPriority.forEach(index => {
      if (index >= 0 && index < videos.length) {
        const video = videos[index]
        if (video && video._id && !newPreloadedSet.has(video._id)) {
          newPreloadedSet.add(video._id)
          console.log(`📥 Preloading video ${index}: ${video._id}`)
          
          // Notify buffer manager to start buffering
          if (bufferManagerRef.current) {
            bufferManagerRef.current.prepareVideo(video._id, index)
          }
        }
      }
    })
    
    return newPreloadedSet
  })
}, [videos, capabilities.isLowEnd]) // Only depend on videos length and device capability

  // VIDEO NAVIGATION with better error handling and preloading
// Faster viewability detection
const viewabilityConfig = useMemo(() => ({
  itemVisiblePercentThreshold: 70, // Higher threshold for faster switching
  minimumViewTime: 50, // Reduced from 100ms
  waitForInteraction: false,
}), [])

// Enhanced onViewableItemsChanged
const onViewableItemsChanged1 = useCallback(({ viewableItems }) => {
  if (!viewableItems || viewableItems.length === 0) return

  const visibleItem = viewableItems[0]
  if (!visibleItem || typeof visibleItem.index !== 'number') return
  
  const newIndex = visibleItem.index

  if (newIndex !== currentIndex) {
    // Immediately pause current video
    if (videos[currentIndex] && videos[currentIndex]._id) {
      const currentVideoKey = `${videos[currentIndex]._id}-${currentIndex}`
      const currentVideoRef = videoRefs.current.get(currentVideoKey)
      currentVideoRef?.pause()
    }

    setCurrentIndex(newIndex)
    
    // Start playing new video immediately
    setTimeout(() => {
      if (videos[newIndex] && videos[newIndex]._id) {
        const newVideoKey = `${videos[newIndex]._id}-${newIndex}`
        const newVideoRef = videoRefs.current.get(newVideoKey)
        newVideoRef?.play()
      }
    }, 100) // Small delay to ensure smooth transition

    // ... rest of your logic
  }
}, [currentIndex, videos])
  // ENDLESS FEED LOADING with better error handling
  const loadMoreVideos = useCallback(async () => {
    if (feedState.isLoading || !feedState.hasMore || !feedManagerRef.current) {
      return
    }

    try {
      console.log("📥 Loading more videos...")
      const newVideos = await feedManagerRef.current.loadNextPage()

      if (newVideos && Array.isArray(newVideos) && newVideos.length > 0) {
        const validNewVideos = newVideos.filter(video => video && video._id)
        
        // Update performance metrics
        setPerformanceMetrics((prev) => ({
          ...prev,
          totalVideos: prev.totalVideos + validNewVideos.length,
        }))

        console.log(`✅ Loaded ${validNewVideos.length} additional videos`)
      }
    } catch (error) {
      console.error("❌ Failed to load more videos:", error)
      onError?.(error)
    }
  }, [feedState, onError])

  // VIDEO OVERLAY HANDLERS
  const handleVideoProgress = useCallback((videoId: string, currentTime: number) => {
    if (videoId && typeof currentTime === 'number') {
      setVideoCurrentTimes((prev) => new Map(prev).set(videoId, currentTime))
    }
  }, [])

  const handleProductPress = useCallback((productId: string) => {
    if (productId) {
      console.log(`🛍️ Product ${productId} pressed`)
      // Handle product press - could navigate to product details or open purchase flow
    }
  }, [])

  const handleOverlayInteraction = useCallback((type: "tap" | "swipe" | "product_view") => {
    console.log(`🎭 Overlay interaction: ${type}`)
    // Track overlay interactions for analytics
  }, [])

  const handleLike = useCallback((index: number, likeChange: number) => {
    if (typeof index === 'number' && typeof likeChange === 'number') {
      setVideos((prevVideos) =>
        prevVideos.map((video, i) => 
          i === index && video ? { 
            ...video, 
            likes: Math.max(0, (video.likes || 0) + likeChange) 
          } : video
        )
      )
    }
  }, [])

  const handleOrderNow = useCallback(() => {
    if (selectedItem && selectedItem._id && navigation) {
      navigation.navigate("ProductDetails", { id: selectedItem._id })
    }
  }, [selectedItem, navigation])

  // IMPROVED KEY EXTRACTOR - This is likely causing the compare error
  const keyExtractor = useCallback((item: VideoData, index: number) => {
    // Ensure we always return a string and handle edge cases
    if (!item) return `empty-${index}`
    if (!item._id) return `no-id-${index}-${Date.now()}`
    return `${item._id}-${index}`
  }, [])

  // IMPROVED renderLectureItem with better error handling
  const renderLectureItem = useCallback(
    ({ item, index }) => {
      // Add safety checks
      if (!item || typeof index !== 'number') {
        console.warn('Invalid item or index in renderLectureItem:', { item: !!item, index })
        return <View style={[styles.videoContainer, { backgroundColor: '#000' }]} />
      }

      const shouldPreload = item._id && preloadedVideos.has(item._id)

      return (
        <RenderVideoItem
          item={item}
          index={index}
          isActive={index === currentIndex && isScreenFocused}
          isPaused={isPaused || !isScreenFocused}
          shouldPreload={shouldPreload}
          onError={onError}
          onBusinessCriticalError={onBusinessCriticalError}
          handleVideoProgress={handleVideoProgress}
          navigation={navigation}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          handleLike={handleLike}
          handleOrderNow={handleOrderNow}
        />
      )
    },
    [currentIndex, isPaused, isScreenFocused, preloadedVideos, onError, onBusinessCriticalError, handleVideoProgress, navigation, selectedItem, handleLike, handleOrderNow],
  )

  // VIDEO ITEM RENDERER with better error handling
  const RenderVideoItem = React.memo(
    ({ 
      item: video, 
      index, 
      isActive, 
      isPaused, 
      shouldPreload,
      onError, 
      onBusinessCriticalError, 
      handleVideoProgress, 
      navigation, 
      selectedItem, 
      setSelectedItem, 
      handleLike, 
      handleOrderNow 
    }: { 
      item: VideoData; 
      index: number;
      isActive: boolean;
      isPaused: boolean;
      shouldPreload?: boolean;
      onError?: (error: any) => void;
      onBusinessCriticalError?: (error: any) => void;
      handleVideoProgress: (videoId: string, currentTime: number) => void;
      navigation: any;
      selectedItem: any;
      setSelectedItem: (item: any) => void;
      handleLike: (index: number, likeChange: number) => void;
      handleOrderNow: () => void;
    }) => {
      // Safety checks
      
          const [Muted, setMuted] = useState(false);
      if (!video || !video._id) {
        return <View style={[styles.videoContainer, { backgroundColor: '#000' }]} />
      }

      const uniqueVideoKey = `${video._id}-${index}`
// console.log('Rendering video item:', uniqueVideoKey, { isActive, isPaused, shouldPreload })
      return (
       
        <VideoErrorBoundary
          video={video}
          onError={(error) => {
            console.error(`❌ Video ${video._id} error:`, error)
            setPerformanceMetrics((prev) => ({
              ...prev,
              errorCount: prev.errorCount + 1,
            }))
            onError?.(error)
          }}
          onBusinessCriticalError={onBusinessCriticalError}
        >
           <TouchableOpacity onPress={()=>console.log('PRESSED')}>
          <View style={styles.videoContainer}>
            {/* <TouchableOpacity onPress={()=>setMuted(!Muted)} style={{flex:1, width:'100%', height:'100%'}}> */}
            <VideoPlayer
              ref={(ref) => {
                if (ref) {
                  videoRefs.current.set(uniqueVideoKey, ref)
                } else {
                  videoRefs.current.delete(uniqueVideoKey)
                }
              }}
              Muted={Muted}
              video={video}
              isActive={isActive}
              isPaused={isPaused || !isActive}
              shouldPreload={shouldPreload}
              onLoad={(data) => {
                console.log(`✅ Video ${video._id} loaded`)
                if (memoryManagerRef.current && data) {
                  const memoryUsage = data.naturalSize ? 
                    (data.naturalSize.width * data.naturalSize.height * 4) / (1024 * 1024) : 
                    50 // Estimate 50MB if no size info
                  memoryManagerRef.current.onVideoLoaded(video._id, memoryUsage)
                }
              }}
              onError={(error) => {
                console.error(`❌ Video ${video._id} player error:`, error)
                onError?.(error)
              }}
              onPlaybackStalled={(duration) => {
                console.warn(`⏸️ Video ${video._id} stalled for ${duration}ms`)
                setPerformanceMetrics((prev) => ({
                  ...prev,
                  stallEvents: prev.stallEvents + 1,
                }))
              }}
              onFirstFrame={(timeToFirstFrame) => {
                console.log(`⚡ Video ${video._id} first frame: ${timeToFirstFrame}ms`)
              }}
              onProgress={(data) => {
                if (data && typeof data.currentTime === 'number') {
                  handleVideoProgress(video._id, data.currentTime)
                }
              }}
              testID={`video-player-${index}`}
            />
{/* </TouchableOpacity> */}
            <ReelOverlay
              video={video}
              index={index}
              isActive={isActive}
              navigation={navigation}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
              handleLike={handleLike}
              handleOrderNow={handleOrderNow}
            />
          </View>
          </TouchableOpacity>
         </VideoErrorBoundary>
      )
    },
  )

  // MEMORY MONITORING
  useEffect(() => {
    const monitorMemory = async () => {
      if (memoryManagerRef.current) {
        try {
          const metrics = memoryManagerRef.current.getMemoryMetrics()
          if (metrics) {
            setMemoryState({
              currentUsage: metrics.currentUsage || 0,
              peakUsage: metrics.peakUsage || 0,
              pressureLevel: metrics.pressureLevel || 'normal',
              gcFrequency: metrics.gcFrequency || 0,
              leakDetected: metrics.leakDetected || false,
            })
          }
        } catch (error) {
          console.warn('Error getting memory metrics:', error)
        }
      }
    }

    const memoryTimer = setInterval(monitorMemory, 2000)
    return () => clearInterval(memoryTimer)
  }, [])

  // CLEANUP
  const cleanup = () => {
    console.log("🧹 Cleaning up Video Feed")

    // First pause all videos
    pauseAllVideos()

    // Clear all video refs
    videoRefs.current.forEach((videoRef, key) => {
      try {
        videoRef?.pause()
      } catch (error) {
        console.warn(`Error pausing video ${key} during cleanup:`, error)
      }
    })

    try {
      feedManagerRef.current?.cleanup()
    } catch (error) {
      console.warn('Error cleaning up feed manager:', error)
    }

    try {
      bufferManagerRef.current?.cleanup()
    } catch (error) {
      console.warn('Error cleaning up buffer manager:', error)
    }

    try {
      memoryManagerRef.current?.shutdown()
    } catch (error) {
      console.warn('Error shutting down memory manager:', error)
    }

    try {
      coldStartOptimizerRef.current?.reset()
    } catch (error) {
      console.warn('Error resetting cold start optimizer:', error)
    }

    videoRefs.current.clear()
    setPreloadedVideos(new Set())
  }

  // GET ITEM LAYOUT (for performance optimization)
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    [],
  )

  // Safety check for videos array
  const safeVideos = useMemo(() => {
    return (videos || []).filter(video => video && video._id)
  }, [videos])
  
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  const onViewableItemsChanged = ({viewableItems}: {viewableItems: ViewToken[]}) => {
    if (viewableItems.length > 0) {
      const activeIndex = viewableItems[0].index || 0;
      setActiveVideoIndex(activeIndex);
    }
  };
 const [isTabFocused, setIsTabFocused] = React.useState(true);

  useFocusEffect(
    React.useCallback(() => {
      setIsTabFocused(true);
      return () => {
        setIsTabFocused(false);
      };
    }, [])
  );

  const renderVideoItem = ({item, index}: {item: VideoData; index: number}) => {
    const isActive = index === activeVideoIndex &&isTabFocused;
    const shouldPreload = Math.abs(index - activeVideoIndex) <= 1 && index !== activeVideoIndex;
    // console.log(isActive)
    return (<>
      <VideoPlay 
        video={item} 
        isActive={isActive} 
        shouldPreload={shouldPreload}
        isFirstVideo={index === 0}
      />
       <ReelOverlay
              video={item}
              index={index}
              isActive={isActive}
              navigation={navigation}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
              handleLike={handleLike}
              handleOrderNow={handleOrderNow}
            />
      </>
    );
  };
  return (
    <View style={styles.container} testID={testID}>
      {/* <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
        hidden={Platform.OS === "android"}
      /> */}
 <FlatList
        data={safeVideos}
        renderItem={renderVideoItem}
        keyExtractor={(item,index) => index.toString()}
        horizontal={false}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        disableIntervalMomentum={true}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 80,
          minimumViewTime: 100,
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={(_, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
        style={styles.container}
      />
      {/* <FlatList
        ref={flatListRef}
        data={safeVideos}
        renderItem={renderLectureItem}
        keyExtractor={keyExtractor}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        removeClippedSubviews={capabilities.isLowEnd}
        maxToRenderPerBatch={capabilities.isLowEnd ? 2 : 3}
        windowSize={capabilities.isLowEnd ? 3 : 5}
        initialNumToRender={2}
        onEndReached={loadMoreVideos}
        onEndReachedThreshold={0.5}
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        disableIntervalMomentum
        bounces={false}
        overScrollMode="never"
        getItemLayout={getItemLayout}
        testID={`${testID}-flatlist`}
        // Additional props to help with the compare error
        extraData={currentIndex} // This helps FlatList know when to re-render
      /> */}

      {/* DEBUG OVERLAY */}
      {/* {__DEV__ && safeVideos[currentIndex] && (
        <VideoDebugOverlay
          video={safeVideos[currentIndex]}
          playerMetrics={videoRefs.current.get(`${safeVideos[currentIndex]?._id}-${currentIndex}`)?.getMetrics()}
          memoryState={memoryState}
          networkState={networkState}
          isVisible={showDebugOverlay}
          onToggleVisibility={() => setShowDebugOverlay(!showDebugOverlay)}
          testID={`${testID}-debug`}
        />
      )} */}
    </View>
  )
}

// Rest of your components remain the same but with added safety checks...

export const ReelOverlay = React.memo(
  ({ video, index, isActive, navigation, selectedItem, setSelectedItem, handleLike, handleOrderNow }) => {
    // Safety checks
    if (!video || !video._id) {
      return null
    }

    const { isKeyboardVisible, keyboardHeight } = useKeyboard();
    // Use unified video interactions hook for state management
    const [videoState, videoActions] = useUnifiedVideoInteractions({
      videoId: video._id,
      initialData: {
        isLiked: video?.isLiked,
        isSaved: video?.isSaved,
        likes: video?.likesCount || video?.likes,
        shares: video?.sharesCount || video?.shares,
        views: video?.viewsCount || video?.views,
        comments: video?.commentsCount || video?.comments,
      },
      onError: (error) => {
        console.error('Video interaction error:', error);
        ToastAndroid.show(error, ToastAndroid.SHORT);
      }
    });

    // Separate UI state for non-interaction related state
    const [uiState, uiDispatch] = useReducer(uiReducer, initialUIState)

    const opacityAnim = useRef(new Animated.Value(0)).current
    const mountedRef = useRef(true)
    
    // Add safety check for useVideoTracker
    let videoTracker = null
    try {
      videoTracker = useVideoTracker(video._id)
    } catch (error) {
      console.warn('useVideoTracker error:', error)
      // Provide fallback functions
      videoTracker = {
        startTracking: () => {},
        pauseTracking: () => {},
        sendTrackingData: () => {},
        trackProgress: () => {},
        trackProductClick: () => {},
        setVideoDuration: () => {},
      }
    }

    const { startTracking, pauseTracking, sendTrackingData, trackProgress, trackProductClick, setVideoDuration } = useVideoTracker(video._id)

    // Memoize product list with safety checks
    const productsList = useMemo(() => {
      if (!video?.productsListed || !Array.isArray(video.productsListed)) return []
      return video.productsListed.filter(product => product && product._id)
    }, [video?.productsListed])

    // Initialize data - Fixed to prevent infinite loop
    useEffect(() => {
      if (productsList.length > 0 && !uiState.activeProduct) {
        uiDispatch({ type: "SET_ACTIVE_PRODUCT", payload: productsList[0] })
        setSelectedItem(productsList[0])
      }
    }, [productsList.length]) // Only depend on length change, not the products themselves

    // Handlers using unified actions
    const handleLikePress = useCallback(async () => {
      if (!mountedRef.current || !video?._id) return
      
      try {
        await videoActions.toggleLike();
        // Update parent component like count if needed
        const likeChange = videoState.isLiked ? -1 : 1;
        handleLike(index, likeChange);
      } catch (error) {
        console.error("Error in like handler:", error);
      }
    }, [videoActions.toggleLike, handleLike, index, videoState.isLiked])

    const shareProfile = useCallback(async () => {
      if (!mountedRef.current || !video?._id) return
      try {
        const link = `${shareUrl}user/reel/${video._id}`
        const result = await Share.share({
          message: ` ${link}`,
          url: link,
        })
        if (result.action !== Share.dismissedAction && mountedRef.current) {
          // Use unified share action
          await videoActions.shareVideo('native');
        }
      } catch (error) {
        console.error("Error sharing profile:", error)
      }
    }, [video?._id, videoActions.shareVideo])

    const handleSave = useCallback(async () => {
      if (!mountedRef.current || videoState.isSaveLoading || !video?._id) return
      
      try {
        await videoActions.toggleSave();
      } catch (error) {
        console.error("Error in save handler:", error);
      }
    }, [videoActions.toggleSave, videoState.isSaveLoading])

    const handleBuyNow = useCallback(() => {
      if (!mountedRef.current) return
      const currentActiveProduct = uiState.activeProduct || productsList[uiState.currentProductIndex] || productsList[0]
      if (!currentActiveProduct) {
        ToastAndroid.show("No product available", ToastAndroid.SHORT)
        return
      }
      if (Number(currentActiveProduct?.quantity) <= 0) {
        ToastAndroid.show("This product is Out of Stock ", ToastAndroid.SHORT)
        return
      }
      setSelectedItem(currentActiveProduct)
      handleOrderNow()
    }, [uiState.activeProduct, productsList, uiState.currentProductIndex, setSelectedItem, handleOrderNow])

    // Cleanup effect
    useEffect(() => {
      return () => {
        mountedRef.current = false
      }
    }, [])

    return (
      <>
        <CommentBottomSheet
          isOpen={videoState.isCommentOpen}
          item={video}
          onClose={videoActions.closeComments}
          videoId={video._id}
        />

        {/* Bottom Gradient Overlay for better visibility */}
        {/* <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.bottomGradientOverlay}
          pointerEvents="none"
        /> */}
        
        {/* Top Gradient Overlay for profile visibility */}
        {/* <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)', 'transparent']}
          style={styles.topGradientOverlay}
          pointerEvents="none"
        /> */}
        
        {/* Overlay Content */}
                            {/* */}
        <View style={[styles.overlayContent]}>   
             <AskMeAnything navigation={navigation} video={video} />
          <View style={styles.bottomContent}>
            <ProductsList
              products={productsList}
              selectedItem={uiState.activeProduct}
              currentProductIndex={uiState.currentProductIndex}
              navigation={navigation}
              trackProductClick={trackProductClick}
              dispatch={uiDispatch}
              setSelectedItem={setSelectedItem}
            />
          </View>
          <View style={styles.actionRow}>
            

           
          </View>
        </View>

        <TopActionButtons video={video} navigation={navigation} />
        <ActionButtons
          liked={videoState.isLiked}
          video={video}
          handleSave={handleSave}
          videoState={videoState}
          shareCount={videoState.shares}
          likes={videoState.likes}
          commentCount={videoState.comments}
          setComment={videoActions.openComments}
          shareProfile={shareProfile}
          handleLikePress={handleLikePress}
        />
      </>
    )
  },
)

const ProductsList = React.memo(
  ({ products, trackProductClick, selectedItem, currentProductIndex, navigation, dispatch, setSelectedItem }) => {
    // Safety check
    if (!products || !Array.isArray(products) || products.length === 0) return null

    const renderStars = useCallback((rating) => {
      const stars = []
      const safeRating = Math.max(0, Math.min(5, rating || 0)) // Clamp between 0-5
      const fullStars = Math.floor(safeRating)
      const hasHalfStar = safeRating - fullStars >= 0.5
      
      for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
          stars.push(<FontAwesome key={`star-${i}`} name="star" size={15} color="#fff" />)
        } else if (i === fullStars && hasHalfStar) {
          stars.push(<FontAwesome key={`star-${i}`} name="star-half-o" size={15} color="#fff" />)
        } else {
          stars.push(<FontAwesome key={`star-${i}`} name="star" size={15} color="#ccc" />)
        }
      }
      return stars
    }, [])

    const renderProduct = useCallback(
      ({ item, index }) => {
        if (!item || !item._id) {
          return <View style={styles.productItem} />
        }

        const imageUrl = item?.images?.[0]?.key ? `${AWS_CDN_URL}${item.images[0].key}` : null
        const handleProductClick = () => {
          
          // if (trackProductClick && item._id) {
            trackProductClick(item._id)
          // }
          if (navigation && item._id) {
            navigation.navigate("ProductDetails", { id: item._id })
          }
        }

        return (
          <TouchableOpacity style={styles.productItem} onPress={handleProductClick}>
            <View style={styles.productContainer}>
              <View style={styles.productHeader}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>No Image</Text>
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {item.title || 'Untitled Product'}
                  </Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.productPrice}>₹{item.productPrice || '0'}</Text>
                    {item.MRP && <Text style={styles.mrpPrice}>₹{item.MRP}</Text>}
                  </View>
                  <View style={styles.ratingContainer}>
                    {/* {renderStars(item?.ratings?.averageRating || 0)} */}
                    <Text style={styles.reviewText}>{formatFollowerCount(item?.ratings?.reviewCount || 0)} reviews</Text>
                   <TouchableOpacity
            // productsList.length > 0 ? 1 :
              style={[styles.buyNowButton]}
              onPress={()=>navigation.navigate("ProductDetails", { id: item._id })}
              // disabled={productsList.length === 0}
              // disabled
            >
              <Text style={styles.buyNowText}>Buy now</Text>
            </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )
      },
      [navigation, renderStars, trackProductClick],
    )

    const handleScroll = useCallback(
      (event) => {
        if (!event?.nativeEvent?.contentOffset) return
        
        const contentOffsetX = event.nativeEvent.contentOffset.x
        const productWidth = SCREEN_WIDTH * 0.8 + 10
        const newIndex = Math.round(contentOffsetX / productWidth)
        
        if (newIndex !== currentProductIndex && newIndex >= 0 && newIndex < products.length) {
          const newActiveProduct = products[newIndex]
          if (newActiveProduct && dispatch) {
            dispatch({ type: "SET_CURRENT_PRODUCT_INDEX", payload: newIndex })
            dispatch({ type: "SET_ACTIVE_PRODUCT", payload: newActiveProduct })
            if (setSelectedItem) {
              setSelectedItem(newActiveProduct)
            }
          }
        }
      },
      [currentProductIndex, products, dispatch, setSelectedItem],
    )

    const keyExtractor = useCallback((item, index) => {
      if (!item) return `product-${index}`
      return item._id || `product-${index}`
    }, [])

    return (
      <FlatList
        data={products}
        keyExtractor={keyExtractor}
        horizontal
        onScroll={handleScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsListContainer}
        renderItem={renderProduct}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
      />
    )
  },
)

const ActionButtons = React.memo(
  ({ liked, likes, handleLikePress, shareProfile, shareCount, setComment, video, commentCount,videoState,handleSave }) => {
    const formatCount = useCallback((count) => {
      const safeCount = Number(count) || 0
      if (safeCount <= 0) return "0"
      if (safeCount >= 1000000) {
        return (safeCount / 1000000).toFixed(1).replace(".0", "") + "M"
      } else if (safeCount >= 100000) {
        return (safeCount / 100000).toFixed(1).replace(".0", "") + "L"
      } else if (safeCount >= 1000) {
        return (safeCount / 1000).toFixed(1).replace(".0", "") + "k"
      }
      return safeCount.toString()
    }, [])

    // Safety checks
    if (!video) return null

    return (
      <View style={styles.actionButtons}>
        <View style={{alignItems:"center"}}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLikePress}>
          <LikeButton initialLikes={likes || 0} initialLiked={!!liked} onLike={handleLikePress} />
        </TouchableOpacity>
        <Text style={styles.actionText}>{formatCount(likes)}</Text>
        </View>
        
        {/* <TouchableOpacity style={styles.actionButton} onPress={() => setComment && setComment(true)}>
          <Icons name="message-text-outline" color="white" size={28} />
        </TouchableOpacity> */}
        {/* <Text style={styles.actionText}>{formatCount(commentCount)}</Text> */}
        
              {/* <Text style={styles.saveText}>{videoState.isSaved ? "Saved" : "Save"}</Text> */}
              <View style={{alignItems:"center"}}>
        <TouchableOpacity style={styles.actionButton} onPress={shareProfile}>
          <Icon name="send" color="white" size={28} />
        </TouchableOpacity>
           <Text style={styles.actionText}>{formatCount(shareCount)}</Text>
           </View>
           <View style={{alignItems:"center"}}>
         <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
              {videoState.isSaveLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name={videoState.isSaved ? "bookmark" : "bookmark-outline"} size={25} color="#fff" />
                </>
              )}
            </TouchableOpacity>
                 <Text style={styles.actionText}>{videoState.isSaved ?"Saved":"Save"}</Text>
            </View>
      </View>
    )
  },
)

const TopActionButtons = React.memo(({ video, navigation }) => {
  const { followUser, unfollowUser, checkFollowStatus } = useFollowApi()
  const [status, setStatus] = useState(false)
  const [logId, setLogId] = useState("")

  // Safety check
  if (!video || !video.host) return null

  const navigateToSellerInfo = () => {
    // console.log("Navigating to seer profile:", video?.host)
    if (video?.host?.userInfo?.userName) {
      navigation.navigate("ViewSellerProdile", {
        id: video.host.userInfo.userName,
      })
    }
  }

  const handleFollow = useCallback(async () => {
    try {
      const userName = video?.host?.userInfo?._id
      if (!userName) {
        ToastAndroid.show("User not found", ToastAndroid.SHORT)
        return
      }
      await followUser(userName)
      setStatus(true)
      ToastAndroid.show("Successfully followed", ToastAndroid.SHORT)
    } catch (error) {
      ToastAndroid.show(error?.response?.data?.message || "Failed to follow", ToastAndroid.SHORT)
    }
  }, [followUser, video?.host?.userInfo?._id])

  const handleUnfollow = useCallback(async () => {
    try {
      const userName = video?.host?.userInfo?._id
      if (!userName) {
        ToastAndroid.show("User not found", ToastAndroid.SHORT)
        return
      }
      setStatus(false)
      await unfollowUser(userName)
      ToastAndroid.show("Successfully unfollowed", ToastAndroid.SHORT)
    } catch (error) {
      ToastAndroid.show(error?.response?.data?.message || "Failed to unfollow", ToastAndroid.SHORT)
    }
  }, [unfollowUser, video?.host?.userInfo?._id])

  useEffect(() => {
    const getStatus = async () => {
      try {
        const userId = video?.host?.userInfo?._id
        if (!userId) return
        
        const res = await checkFollowStatus(userId)
        setStatus(!!res?.isFollowing)
        const id = (await AsyncStorage.getItem("sellerId")) || ""
        setLogId(id)
      } catch (error) {
        console.error("Error checking follow status:", error)
      }
    }
    
    if (video?.host?.userInfo?._id) {
      getStatus()
    }
  }, [video?.host?.userInfo?._id, checkFollowStatus])

  return (
    <View style={styles.topActionButtons}>
      <TouchableOpacity onPress={()=>navigation.goBack()} >
        <ArrowLeft color={'#fff'} />
      </TouchableOpacity>
      {/* <View></View> */}
      <TouchableOpacity style={styles.topActionButton} onPress={navigateToSellerInfo}>
        {video?.host?.userInfo?.profileURL?.key ? (
          <Image
            source={{
              uri: `${AWS_CDN_URL}${video.host.userInfo.profileURL.key}`,
            }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.defaultProfileImage}>
            <Text style={styles.profileInitial}>
              {(video?.host?.companyName || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.sellerInfoContainer}>
          <Text style={styles.companyName} numberOfLines={1}>
            @{video?.host?.companyName || "Unknown"}
          </Text>
          {logId !== video?.host?._id && (
            <TouchableOpacity
              style={[styles.followButton, status && styles.followed]}
              onPress={() => (status ? handleUnfollow() : handleFollow())}
            >
              <Text style={[styles.followText, status && { color: "#000" }]}>
                {status ? "Unfollow" : "Follow"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  )
})
const AskMeAnything = React.memo(({navigation, video}) => {
  const [chatMessage, setChatMessage] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);

   const handleMessage = useCallback(async () => {
    if (!chatMessage.trim() || loadingSend) return;

    try {
      setLoadingSend(true);

      // Step 1: Create/get the chat room
      const response = await axiosInstance.post(`/chat/direct-message`, {
        userId: video?.host?.userInfo?._id,
        userType: "user",
      });

      const chatRoom = response?.data?.data;
      if (!chatRoom?._id) throw new Error("Failed to create chat room");

      // Step 2: Send single message with video path and user message combined

      const combinedMessage = `/user/reel/${video?._id}\n--- 📌 From Shoppable Video --- \n${chatMessage.trim()}`;
      
      const userMessageRes = await axiosInstance.post(`chat/rooms/${chatRoom._id}/messages`, {
        messageType: "text",
        content: { text: combinedMessage },
        metadata: {
          fromVideo: video?._id,
          videoTitle: video?.title,
          messageType: "video_question",
          context: "shoppable_video_ask_me",
        },
      });

      if (!userMessageRes.data.status) throw new Error("Failed to send message");

      setChatMessage("");
      ToastAndroid.show("Message sent successfully!", ToastAndroid.SHORT);

    } catch (err) {
      console.log("Error sending message:", err);
      ToastAndroid.show(err.response.data.message, ToastAndroid.SHORT);
    } finally {
      setLoadingSend(false);
    }
  }, [chatMessage, loadingSend, navigation, video]);

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.askMeInput}
        placeholder={`Ask ${video?.host?.companyName || "Creator"} ...`}
        value={chatMessage}
        onChangeText={setChatMessage}
        placeholderTextColor="#fff"
        multiline={false}
        numberOfLines={1}
        scrollEnabled={true}
      />
      <TouchableOpacity style={styles.sendButton} onPress={handleMessage}>
        {loadingSend ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendButtonText}>➤</Text>}
      </TouchableOpacity>
    </View>
  )
})
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // borderWidth:3,
    // borderColor:'green',
    backgroundColor: "#000000",
  },
  askMeContainer:{
    backgroundColor:"red",
    padding: 10,
    paddingVertical: 2,
    borderRadius: 20,
    width: '86%',
    marginBottom: 10,
  },
  askMeText:{
    color:'#000'
  },

  askMeInput:{
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: "#fff",
    height: 40,        // ✅ fixes vertical growth
    textAlignVertical: "center", // ✅ centers text on Android
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
   // backgroundColor: "#000", // iOS blue or your theme color
    
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
  },
  sendButtonText: {
    color: "#F7CE45",
    fontSize: 20,
    fontWeight: "bold",
  },

  inputContainer: {
   // backgroundColor:"#F7CE45",
  //  padding: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 20,
    width: '86%',
    marginBottom: 10,
    flexDirection:'row',
    justifyContent:'space-between',
        borderWidth: 1,
   //  borderColor: "rgba(255, 255, 255, 0.15)",
   // backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(0, 0, 0, 0.3)",   // darker border
  backgroundColor: "rgba(0, 0, 0, 0.25)", // darker background
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "black",
  },
  overlayContent: {
    position: "absolute",
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingVertical: 10,
    zIndex: 10,
  },
  bottomContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
    justifyContent: "space-between",
  },
  actionRow: {
    flexDirection: "row",
    gap: 18,
    alignItems: "center",
  },
  buyNowButton: {
    backgroundColor: "#F7CE45",
    borderRadius: 25,
    // height: SCREEN_HEIGHT * 0.055,
    justifyContent: "center",
    // width: SCREEN_WIDTH * 0.75,
    paddingHorizontal: 10,
    paddingVertical:4,
    alignItems: "center",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buyNowText: {
    color: "#000",
    fontWeight: "500",
    fontSize: 11,
    // fontSize: SCREEN_WIDTH * 0.042,
    // letterSpacing: 0.5,
  },
  saveButton: {
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontSize: 12,
    // marginTop: 2,
  },
  productsListContainer: {
    gap: 12,
    maxHeight: SCREEN_HEIGHT * 0.25,
    paddingRight: 15,
    paddingLeft: 5,
  },
  productItem: {
    borderRadius: 12,
    borderWidth: 1,
     borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    width: 300,
   
    //  // alignItems:'center',
        height:87,
    // backdropFilter: 'blur(10px)',
  },
  productContainer: {
    padding: 7,
    borderRadius: 10,
  },
  productHeader: {
    flexDirection: "row",
    gap: 12,
  },
  productImage: {
    width: SCREEN_WIDTH * 0.22,
    height: SCREEN_WIDTH * 0.18,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#666",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#ccc",
    fontSize: 10,
    textAlign: "center",
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    color: "#fff",
    fontWeight: "bold",
    // fontSize: 16,
    textTransform: "capitalize",
    marginBottom: 4,
  },
  productPrice: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },
  mrpPrice: {
    textDecorationLine: "line-through",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  ratingContainer: {
    justifyContent:'space-between',
    flexDirection: "row",
    gap: 5,
  },
  reviewText: {
    color: "#fff",
    fontSize: 8,
    marginTop: 5,
    fontWeight: "bold",
  },
  actionButtons: {
    flexDirection: "column",
    alignItems: "center",
    position: "absolute",
    right: 10,
    // gap: 5,
    bottom:180,
    // bottom: SCREEN_HEIGHT * 0.45,
    padding: 5,
    zIndex: 20,
  },
  actionButton: {
    alignItems: "center",
    // backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 30,
    // padding: 10,
    width: 48,
    height: 48,
    justifyContent: "center",
  },
  actionText: {
    color: "white",
    fontSize: 13,
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    fontWeight: "bold",
    marginTop: -5,
  },
  topActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    left: 15,
    top: Platform.OS === 'ios' ? 50 : 25,
    zIndex: 20,
  },
  topActionButton: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal:5,
    gap: 5,
  },
  profileImage: {
    height: 40,
    width: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#F7CE45",
  },
  defaultProfileImage: {
    height: 40,
    width: 40,
    backgroundColor: "orange",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#F7CE45",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  companyName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    marginRight: 10,
  },
  sellerInfoContainer: {
    gap: 5,
    flexDirection: "column",
    alignItems: "flex-start",
    // width: "70%",
  },
  followButton: {
    backgroundColor: "rgba(119, 119, 119, 0.8)",
    borderRadius: 15,
    paddingHorizontal: 15,
    minWidth: SCREEN_WIDTH * 0.2,
    alignItems: "center",
    paddingVertical: 6,
  },
  followed: {
    backgroundColor: "#F7CE45",
  },
  followText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  bottomGradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
    zIndex: 5,
  },
  topGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.25,
    zIndex: 5,
  },
})

export default VideoFeed

// DEBUGGING TIPS FOR THE "compare is not a function" ERROR:

/*
COMMON CAUSES & SOLUTIONS:

1. FLATLIST KEY EXTRACTOR ISSUES:
   - The keyExtractor now properly handles edge cases
   - Added fallbacks for missing _id or null items
   - Ensures unique string keys always

2. REACT NATIVE VERSION CONFLICTS:
   - Check your package.json for version mismatches
   - Common culprits: react-native-vector-icons, react-native-video

3. INCORRECT IMPORTS:
   - Make sure all your imports are correctly resolved
   - Check that VideoTypes, managers, and components exist

4. DATA INTEGRITY:
   - Added extensive null/undefined checks
   - Filter out invalid video objects before rendering
   - Safer array operations throughout

5. MEMORY ISSUES:
   - Better cleanup on component unmount
   - Safer manager initialization with error handling

6. DEPENDENCIES TO CHECK:
   Run: npm ls react-native
   Make sure all RN packages are compatible versions

7. METRO CACHE:
   Clear with: npx react-native start --reset-cache

8. IF STILL HAVING ISSUES:
   - Check Metro bundler logs
   - Look for duplicate dependencies
   - Verify all custom managers (EndlessFeedManager, etc.) exist
   - Check react-native-vector-icons linking
*/