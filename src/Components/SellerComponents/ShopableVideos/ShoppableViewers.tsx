"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import Animated, {
  FadeInUp,
  FadeInDown,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated"
import Icon from "react-native-vector-icons/MaterialIcons"
import axiosInstance from "../../../Utils/Api"
import { AWS_CDN_URL } from "../../../Utils/aws"


const { width: screenWidth } = Dimensions.get("window")

// Optimized ViewerItem component with animations
const ViewerItem = React.memo(({ item, index, onPress, cdnUrl }) => {
  const scale = useSharedValue(0.95)

  const formatTime = useCallback((seconds) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }, [])

  const formatPercentage = useCallback((value) => {
    return value ? `${Math.round(value)}%` : "0%"
  }, [])

  const getRoleColor = useCallback((role) => {
    switch (role) {
      case "seller":
        return "#10B981"
      case "dropshipper":
        return "#3B82F6"
      default:
        return "#8B5CF6"
    }
  }, [])

  const handlePressIn = () => {
    scale.value = withSpring(0.95)
  }

  const handlePressOut = () => {
    scale.value = withSpring(1)
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View entering={FadeInUp.delay(index * 50)} layout={Layout.springify()} style={animatedStyle}>
      <TouchableOpacity
        style={styles.viewerItem}
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.viewerHeader}>
          <View style={styles.viewerAvatarContainer}>
            {item.profileURL?.key ? (
              <Image
                source={{ uri: `${AWS_CDN_URL}${item.profileURL.key}` }}
                style={styles.viewerAvatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.viewerAvatarPlaceholder}>
                <Icon name="person" size={20} color="#A1A1AA" />
              </View>
            )}
            <View style={styles.viewerBadge}>
              <Icon name="person" size={10} color="#0A0A0A" />
            </View>
          </View>

          <View style={styles.viewerInfo}>
            <View style={styles.viewerNameRow}>
              <Text style={styles.viewerName} numberOfLines={1}>
                {item.name || "Unknown User"}
              </Text>
              {item.role && (
                <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(item.role)}20` }]}>
                  <Text style={[styles.roleBadgeText, { color: getRoleColor(item.role) }]}>{item.role}</Text>
                </View>
              )}
            </View>
            <Text style={styles.viewerUsername} numberOfLines={1}>
              @{item.userName || "unknown_username"}
            </Text>
          </View>
        </View>

        <View style={styles.viewerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Views</Text>
            <Text style={styles.statValue}>{item.viewCount}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatTime(item.avgWatchDuration)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Completion</Text>
            <Text style={styles.statValue}>{formatPercentage(item.avgCompletion)}</Text>
          </View>
        </View>

        <Text style={styles.lastViewed}>Last viewed: {new Date(item.lastViewed).toLocaleDateString()}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
})

// Loading skeleton for viewers
const ViewerSkeleton = ({ index }) => (
  <Animated.View entering={FadeInUp.delay(index * 50)} style={styles.skeletonItem}>
    <View style={styles.skeletonAvatar} />
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: "60%" }]} />
    </View>
  </Animated.View>
)

const ShoppableViewers = ({ videoId }) => {
  const navigation = useNavigation()
  const [viewers, setViewers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchTimeout, setSearchTimeout] = useState(null)

  const cdnUrl = process.env.REACT_APP_AWS_CDN_URL

  // Debounced search function
  const debouncedSearch = useCallback(
    (term) => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }

      const timeout = setTimeout(() => {
        setViewers([])
        setPage(1)
        setHasMore(true)
        fetchViewers(1, term)
      }, 500)

      setSearchTimeout(timeout)
    },
    [searchTimeout],
  )

  const fetchViewers = useCallback(
    async (pageNum, search = "", isRefresh = false) => {
      if (pageNum === 1) {
        if (isRefresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }
      } else {
        setLoadingMore(true)
      }

      try {
        const response = await axiosInstance.get(`/shoppable-interaction/${videoId}/viewers`, {
          params: { page: pageNum, limit: 15, search },
        })

        const { viewers: newViewers, pagination } = response.data.data

        setViewers((prev) => (pageNum === 1 ? newViewers : [...prev, ...newViewers]))
        setHasMore(pagination.hasNextPage)
        setError(null)
      } catch (err) {
        console.error("Error fetching viewers:", err)
        const errorMessage = "Failed to load viewers. Please try again later."
        setError(errorMessage)

        if (isRefresh) {
          Alert.alert("Error", errorMessage)
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
      }
    },
    [videoId],
  )

  useEffect(() => {
    fetchViewers(1, searchTerm)
  }, [])

  useEffect(() => {
    if (searchTerm !== "") {
      debouncedSearch(searchTerm)
    } else {
      setViewers([])
      setPage(1)
      setHasMore(true)
      fetchViewers(1, "")
    }
  }, [searchTerm, debouncedSearch])

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchViewers(nextPage, searchTerm)
    }
  }, [loadingMore, hasMore, loading, page, searchTerm, fetchViewers])

  const handleRefresh = useCallback(() => {
    setPage(1)
    setHasMore(true)
    fetchViewers(1, searchTerm, true)
  }, [searchTerm, fetchViewers])

  const handleViewerPress = useCallback(
    (viewer) => {
      navigation.navigate("ViewSellerProdile", { id: viewer.userName })
    },
    [navigation],
  )

  const renderViewer = useCallback(
    ({ item, index }) => <ViewerItem item={item} index={index} onPress={handleViewerPress} cdnUrl={cdnUrl} />,
    [handleViewerPress, cdnUrl],
  )

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#F7CE45" />
          <Text style={styles.footerLoaderText}>Loading more viewers...</Text>
        </View>
      )
    }

    if (!hasMore && viewers.length > 0) {
      return <Text style={styles.endMessage}>You've reached the end of the list</Text>
    }

    return null
  }, [loadingMore, hasMore, viewers.length])

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.skeletonContainer}>
          {[...Array(5)].map((_, index) => (
            <ViewerSkeleton key={index} index={index} />
          ))}
        </View>
      )
    }

    return (
      <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
        <Icon name="person-off" size={64} color="#A1A1AA" />
        <Text style={styles.emptyTitle}>No Viewers Found</Text>
        <Text style={styles.emptyMessage}>
          {searchTerm ? `No viewers match "${searchTerm}"` : "This video hasn't been viewed by logged-in users yet"}
        </Text>
      </Animated.View>
    )
  }, [loading, searchTerm])

  const keyExtractor = useCallback((item, index) => `${item.userId}-${index}`, [])

  const getItemLayout = useCallback(
    (data, index) => ({
      length: 120,
      offset: 120 * index,
      index,
    }),
    [],
  )

  return (
    <Animated.View entering={FadeInUp.delay(300)} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon name="people" size={20} color="#F7CE45" />
          <Text style={styles.title}>Viewers</Text>
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#A1A1AA" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search viewers..."
            placeholderTextColor="#A1A1AA"
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm("")} style={styles.clearButton}>
              <Icon name="clear" size={20} color="#A1A1AA" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {error && !viewers.length ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#F87171" />
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchViewers(1, searchTerm)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={viewers}
          renderItem={renderViewer}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#F7CE45"
              colors={["#F7CE45"]}
            />
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
        />
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#18181B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(247, 206, 69, 0.3)",
    margin: 20,
    marginTop: 0,
    overflow: "hidden",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(247, 206, 69, 0.1)",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FAFAFA",
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(247, 206, 69, 0.3)",
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#FAFAFA",
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  viewerItem: {
    backgroundColor: "rgba(24, 24, 27, 0.5)",
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(247, 206, 69, 0.2)",
    padding: 16,
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  viewerAvatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  viewerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(247, 206, 69, 0.3)",
  },
  viewerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0A0A0A",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(247, 206, 69, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F7CE45",
    borderWidth: 2,
    borderColor: "#18181B",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerInfo: {
    flex: 1,
  },
  viewerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  viewerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FAFAFA",
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  viewerUsername: {
    fontSize: 12,
    color: "#A1A1AA",
  },
  viewerStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(10, 10, 10, 0.3)",
    borderRadius: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "#A1A1AA",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FAFAFA",
  },
  lastViewed: {
    fontSize: 10,
    color: "#A1A1AA",
    textAlign: "center",
  },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  footerLoaderText: {
    fontSize: 12,
    color: "#A1A1AA",
    marginLeft: 8,
  },
  endMessage: {
    fontSize: 12,
    color: "#A1A1AA",
    textAlign: "center",
    paddingVertical: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FAFAFA",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#A1A1AA",
    textAlign: "center",
    lineHeight: 20,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorMessage: {
    fontSize: 14,
    color: "#F87171",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#F7CE45",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0A0A0A",
  },
  skeletonContainer: {
    paddingVertical: 20,
  },
  skeletonItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 16,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0A0A0A",
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "#0A0A0A",
    borderRadius: 6,
    marginBottom: 8,
  },
})

export default ShoppableViewers
