"use client"

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  BackHandler,
  ToastAndroid,
  Image,
} from "react-native"
import ProductModal from "./ProductModal"
import SuccessModal from "./SuccessModal"
import { colors } from "../../Utils/Colors"
import api from "../../Utils/Api"
import AsyncStorage from "@react-native-async-storage/async-storage"
import PaymentBottomSheet from "../Shows/Utils/OptionBottomSheet"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { useFocusEffect } from "@react-navigation/native"
import ReelOverlay from "./VideoOverlay"
import OptimizedVideoPlayer from "./OptimizedVideoPlayer"
import UltraVideoPreloader from "../../Utils/UltraVideoPreloader"
import { AWS_CDN_URL } from "../../../Config"
import { ios_only_SCOPES_ALREADY_GRANTED } from "@react-native-google-signin/google-signin/lib/typescript/src/errors/errorCodes"

const { height, width } = Dimensions.get("window")
const PAGE_LIMIT = 10

interface OptimizedReelsComponentProps {
  navigation: any
  route: any
}

const OptimizedReelsComponent = React.memo(({ navigation, route }: OptimizedReelsComponentProps) => {
  const insets = useSafeAreaInsets()
  const [lectureData, setLectureData] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [initialLectureLoaded, setInitialLectureLoaded] = useState(false)
  const [optionModalVisible, setOptionModalVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [paymentSuccessModalVisible, setPaymentSuccessModalVisible] = useState(false)
  const [productModalVisible, setProductModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [isMuted, setMuted] = useState(false)

  // Pagination states
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [showNoDataMessage, setShowNoDataMessage] = useState(false)

  const { id } = route.params || {}

  // Determine if accessed from stack navigation (with id) or tab bar (without id)
  const isFromStackNavigation = !!id
  
  // Calculate actual video height - use full screen height for proper snapping
  // Safe area is handled by the wrapper component
  const videoHeight = height

  // Refs for performance
  const flatListRef = useRef<FlatList>(null)
  const endReachedRef = useRef(false)
  const scrollVelocityRef = useRef(0)
  const lastScrollYRef = useRef(0)
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 30,
    minimumViewTime: 0,
  })
  // console.log("  asdfa")

  // Track active video
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)
  const [isTabFocused, setIsTabFocused] = useState(true)

  // ✅ Focus effect for tab navigation
  useFocusEffect(
    React.useCallback(() => {
      setIsTabFocused(true)
      return () => {
        setIsTabFocused(false)
      }
    }, [])
  )

  // ✅ Back handler
  useEffect(() => {
    const onBackPress = () => {
      if (navigation.canGoBack()) {
        navigation.goBack()
        return true
      }
      AsyncStorage.getItem("accessToken").then(name => {
        if (!name) {
          navigation.navigate("Login")
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: "bottomtabbar" }],
          })
        }
      })
      return true
    }
    const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress)
    return () => backHandler.remove()
  }, [navigation])

  // ✅ Optimized like handler with useCallback
  const handleLike = useCallback((index: number, likeChange: number) => {
    setLectureData((prevData) => {
      const updatedData = [...prevData]
      if (updatedData[index]) {
        updatedData[index] = {
          ...updatedData[index],
          likes: (updatedData[index].likes || 0) + likeChange,
        }
      }
      return updatedData
    })
  }, [])

  // ✅ Fetch single lecture
  const fetchSingleLecture = useCallback(async () => {
    setIsLoading(true)
    try {
      const singleLectureResponse = await api.get(`/shoppable-videos/${id}`)
      const singleLecture = singleLectureResponse.data.data
      setLectureData([singleLecture])
      setInitialLectureLoaded(true)
      setPage(1)
      setHasMore(true)
    } catch (error) {
      console.log("Error fetching single lecture:", error.response?.data)
      setShowNoDataMessage(true)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  // ✅ Optimized fetch with proper deduplication
  const fetchLectureData = useCallback(
    async (currentPage: number, isInitialLoad = false) => {
      // Prevent duplicate fetches
      if ((isFetchingMore && !isInitialLoad) || (!hasMore && !isInitialLoad)) {
        return
      }
      
      if (!isInitialLoad) setIsFetchingMore(true)
      endReachedRef.current = false
      
      try {
        const response = await api.get(`/shoppable-videos?page=${currentPage}&limit=${PAGE_LIMIT}`)
        const newLectures = response.data.data.filter((lecture: any) => lecture.visibility === "public")

        // Filter out the initial single lecture if it was loaded
        const filteredNewLectures = newLectures.filter((lecture: any) => lecture._id !== id)

        setLectureData((prevData) => {
          if (isInitialLoad) {
            return filteredNewLectures
          }
          // Ensure no duplicates when appending
          const existingIds = new Set(prevData.map((item) => item._id))
          const uniqueNewLectures = filteredNewLectures.filter((item: any) => !existingIds.has(item._id))
          return [...prevData, ...uniqueNewLectures]
        })

        const pagination = response.data.pagination
        setHasMore(pagination.hasNextPage)
        setPage(currentPage)

        // Show no data message if no lectures found
        if (filteredNewLectures.length === 0 && currentPage === 1) {
          setShowNoDataMessage(true)
        } else {
          setShowNoDataMessage(false)
        }

      } catch (error) {
        console.log("Error fetching lectures:", error)
        if (currentPage === 1) {
          setShowNoDataMessage(true)
        }
      } finally {
        setIsFetchingMore(false)
      }
    },
    [isFetchingMore, hasMore, id],
  )

  // ✅ Initial data fetch
  useEffect(() => {
    if (id) {
      fetchSingleLecture()
    } else {
      setIsLoading(true)
      fetchLectureData(1, true).finally(() => setIsLoading(false))
    }
  }, [id, fetchSingleLecture])

  useEffect(() => {
    if (initialLectureLoaded && id) {
      fetchLectureData(1)
    }
  }, [initialLectureLoaded, id])

  // ✅ Prefetch thumbnails when data loads for instant display
  useEffect(() => {
    if (lectureData.length > 0) {
      // Prefetch thumbnails for first 5 videos immediately
      const AWS_CDN = AWS_CDN_URL;
      lectureData.slice(0, 5).forEach((video: any) => {
        if (video.thumbnailBlobName) {
          Image.prefetch(`${AWS_CDN}${video.thumbnailBlobName}`).catch(() => {});
        }
      });
    }
  }, [lectureData.length]);

  // ✅ Intelligent preloading when video changes
  useEffect(() => {
    if (lectureData.length > 0 && activeVideoIndex >= 0) {
      // Prefetch thumbnails for nearby videos
      const AWS_CDN =AWS_CDN_URL;
      for (let i = activeVideoIndex; i <= Math.min(activeVideoIndex + 5, lectureData.length - 1); i++) {
        const video = lectureData[i] as any;
        if (video?.thumbnailBlobName) {
          Image.prefetch(`${AWS_CDN}${video.thumbnailBlobName}`).catch(() => {});
        }
      }
      
      // Trigger intelligent preloading
      UltraVideoPreloader.preloadVideosIntelligently(
        activeVideoIndex,
        lectureData,
        scrollVelocityRef.current,
        [] // User history - you can implement this
      ).catch(err => {
        console.warn('Preload error:', err)
      })
    }
  }, [activeVideoIndex, lectureData])

  // ✅ Handle order now
  const handleOrderNow = useCallback(() => {
    const currentLecture = lectureData[currentIndex]
    if (currentLecture && currentLecture.productsListed && currentLecture.productsListed.length > 0) {
      if (!selectedItem) {
        setSelectedItem(currentLecture.productsListed[0])
      }
      setOptionModalVisible(true)
      setProductModalVisible(true)
    }
  }, [lectureData, currentIndex, selectedItem])

  // ✅ Handle payment success
  const handlePaymentSuccess = useCallback(async () => {
    try {
      ToastAndroid.show("Order Placed successfully!", ToastAndroid.LONG)
    } catch (error) {
      console.error("Failed to store order:", error)
    }
  }, [])

  // ✅ Optimized viewable items changed handler
  const onViewableItemsChangedRef = useRef(({viewableItems}: {viewableItems: any}) => {
    if (viewableItems.length > 0) {
      const activeIndex = viewableItems[0].index || 0
      setActiveVideoIndex(activeIndex)
      setCurrentIndex(activeIndex)
    }
  })

  // ✅ Scroll handler to track velocity and clamp scroll position
  const handleScroll = useCallback((event: any) => {
    const currentY = event.nativeEvent.contentOffset.y
    const velocity = currentY - lastScrollYRef.current
    scrollVelocityRef.current = velocity
    lastScrollYRef.current = currentY
    
    // Clamp scroll position to prevent scrolling past last video
    const maxScrollY = Math.max(0, (lectureData.length - 1) * videoHeight)
    if (currentY > maxScrollY && lectureData.length > 0) {
      flatListRef.current?.scrollToOffset({ offset: maxScrollY, animated: false })
    }
  }, [lectureData.length, videoHeight])

  // ✅ Optimized render video item with proper memoization
  const renderVideoItem = useCallback(({item, index}: {item: any; index: number}) => {
    const isActive = index === activeVideoIndex && isTabFocused
    // Preload adjacent videos (1 before, 3 after) for instant playback
    const shouldPreload = (index > activeVideoIndex && index <= activeVideoIndex + 3) || 
                          (index < activeVideoIndex && index >= activeVideoIndex - 1)
    // console.log("Rendering video index:", index, "isActive:", isActive, "shouldPreload:", shouldPreload,item)
    return (
      <View style={[styles.videoItemContainer, { height: videoHeight }]}>
        <OptimizedVideoPlayer 
          video={item} 
          isActive={isActive} 
          shouldPreload={shouldPreload}
          isFirstVideo={index === 0}
          isMuted={isMuted}
          setIsMuted={setMuted}
        />
        <ReelOverlay
          video={item}
          index={index}
          isActive={isActive}
          navigation={navigation}
          selectedItem={selectedItem}
          isMuted={isMuted}
          setIsMuted={setMuted}
          setSelectedItem={setSelectedItem}
          handleLike={handleLike}
          handleOrderNow={handleOrderNow}
          isFromStackNavigation={isFromStackNavigation}
        />
      </View>
    )
  }, [activeVideoIndex, isTabFocused, isMuted, navigation, selectedItem, handleLike, handleOrderNow, videoHeight])

  // ✅ Optimized key extractor
  const keyExtractor = useCallback((item: any, index: number) => {
    return item._id || `video-${index}`
  }, [])

  // ✅ Optimized get item layout for performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: videoHeight,
    offset: videoHeight * index,
    index,
  }), [videoHeight])

  // ✅ Handle end reached with throttling
  const handleEndReached = useCallback(() => {
    if (!endReachedRef.current && hasMore && !isFetchingMore) {
      endReachedRef.current = true
      fetchLectureData(page + 1)
    }
  }, [hasMore, isFetchingMore, page, fetchLectureData])

  // ✅ Memoized modals
  const SuccessModalMemo = useMemo(
    () => (
      <SuccessModal
        visible={paymentSuccessModalVisible}
        transparent
        animationType="fade"
        onClose={() => setPaymentSuccessModalVisible(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    ),
    [paymentSuccessModalVisible, handlePaymentSuccess],
  )

  const ProductModalMemo = useMemo(
    () => (
      <ProductModal
        product={selectedItem}
        visible={productModalVisible}
        sourceType="shoppable_video"
        onClose={() => setProductModalVisible(false)}
        onPay={() => {
          setProductModalVisible(false)
          setPaymentSuccessModalVisible(true)
        }}
      />
    ),
    [productModalVisible, selectedItem],
  )

  // ✅ Memoized empty component
  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFD700" />
        ) : showNoDataMessage ? (
          <Text style={styles.emptyText}>No videos available at the moment.</Text>
        ) : null}
      </View>
    ),
    [isLoading, showNoDataMessage]
  )

  // ✅ Loading state
  if (isLoading && lectureData.length === 0) {
    return (
      <View style={styles.emptyContainer}>  
        <ActivityIndicator size="small" color="#FFD700" />
      </View>
    )
  }

  // Main content component
  const MainContent = (
    <View style={styles.safeArea}>
      <FlatList
        ref={flatListRef}
        data={lectureData}
        renderItem={renderVideoItem}
        keyExtractor={keyExtractor}
        horizontal={false}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        snapToInterval={videoHeight}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        ListEmptyComponent={ListEmptyComponent}
        disableIntervalMomentum={true}
        viewabilityConfig={viewabilityConfigRef.current}
        onViewableItemsChanged={onViewableItemsChangedRef.current}
        getItemLayout={getItemLayout}
        style={styles.container}
        removeClippedSubviews={false}
        maxToRenderPerBatch={4}
        windowSize={7}
        initialNumToRender={2}
        updateCellsBatchingPeriod={50}
        bounces={false}
        overScrollMode="never"
        scrollsToTop={false}
        snapToOffsets={lectureData.map((_, index) => index * videoHeight)}
        snapToEnd={false}
      />
      
      {SuccessModalMemo}
      {ProductModalMemo}
    </View>
  )

  // Wrap with SafeAreaView only when navigating from stack navigation
  // When from bottom tab bar, SafeAreaView is already applied in BottomTabBar.tsx
  if (isFromStackNavigation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top','bottom']}>
        {MainContent}
      </SafeAreaView>
    )
  }

  return MainContent
})

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  videoItemContainer: {
    width,
    height: '100%',
    backgroundColor: '#000000',
  },
  emptyContainer: {
    flex: 1,
    height,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "black",
  },
  emptyText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  footerLoader: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
})

OptimizedReelsComponent.displayName = 'OptimizedReelsComponent'

export default OptimizedReelsComponent
