import React, { useState, useEffect, useCallback, useContext } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Animated, {
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated'
import Icon from 'react-native-vector-icons/Ionicons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5'

import axiosInstance from '../../Utils/Api'
import {
  GET_MY_SHOPPABLE_VIDEOS,
  GET_PRODUCTS_BY_SELLER_ID_FOR_HUB,
  GET_MY_SHOWS,
  AWS_CDN_URL,
} from '../../../Config'
import { AuthContext } from '../../Context/AuthContext'
import {
  usePagePermissions,
  useEffectiveSellerId,
  useAccessModeInfo,
} from '../../Context/AccessContext'

// Import Components and Hooks
import ProductCard from '../Reuse/ProductCard'
import ShoppableVideoCard from '../Reuse/ShoppableVideoCard'
import LiveStreamCard from '../Reuse/LiveStreamCard'
import useDebounce from '../../hooks/useDebounce'
import { Alert } from 'react-native'

const CDN_BASE_URL = AWS_CDN_URL

const generateCDNUrl = (imagePath: string | undefined) => {
  if (!imagePath || imagePath.startsWith('http')) return imagePath
  const cleanCdnUrl = CDN_BASE_URL?.endsWith('/')
    ? CDN_BASE_URL.slice(0, -1)
    : CDN_BASE_URL
  const cleanImagePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
  return `${cleanCdnUrl}/${cleanImagePath}`
}

const { width } = Dimensions.get('window')

export default function AnalyticsDashboard() {
  const navigation = useNavigation<any>()
   const {user}: any = useContext(AuthContext);

  // Simple alert utilities - memoized to prevent infinite loops
  const showPositive = useCallback((message: string) => {
    Alert.alert('Success', message)
  }, [])

  const showNegative = useCallback((message: string) => {
    Alert.alert('Error', message)
  }, [])

  // Access Permission Hooks
  const { canView, canCreate, canEdit, canDelete } = usePagePermissions('PRODUCT')
  const effectiveSellerId = useEffectiveSellerId()
  const { isAccessMode, isOwnData, sellerInfo } = useAccessModeInfo()

  // State Management
  const [activeTab, setActiveTab] = useState('products')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 500)

  // Data, Pagination, and Loading States
  const [products, setProducts] = useState<any[]>([])
  const [productPage, setProductPage] = useState(1)
  const [hasMoreProducts, setHasMoreProducts] = useState(true)

  const [shoppableVideos, setShoppableVideos] = useState<any[]>([])
  const [videoPage, setVideoPage] = useState(1)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)

  const [liveStreams, setLiveStreams] = useState<any[]>([])
  const [hasMoreLiveStreams, setHasMoreLiveStreams] = useState(false)

  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // API Fetching Logic
  const fetchData = useCallback(
    async (tab: string, page: number, search: string, isLoadMore = false) => {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setInitialLoad(true)
      }

      let endpoint = ''
      const limit = 9
      let dataKey = ''
      let setStateFunc: any = () => {}
      let setPageFunc: any = () => {}
      let setHasMoreFunc: any = () => {}

      if (tab === 'products') {
        endpoint = GET_PRODUCTS_BY_SELLER_ID_FOR_HUB
        dataKey = 'products'
        setStateFunc = setProducts
        setPageFunc = setProductPage
        setHasMoreFunc = setHasMoreProducts
      } else if (tab === 'videos') {
        endpoint = GET_MY_SHOPPABLE_VIDEOS
        dataKey = 'videos'
        setStateFunc = setShoppableVideos
        setPageFunc = setVideoPage
        setHasMoreFunc = setHasMoreVideos
      } else if (tab === 'liveStreams') {
        endpoint = GET_MY_SHOWS
        dataKey = 'shows'
        setStateFunc = setLiveStreams
        setHasMoreFunc = setHasMoreLiveStreams
      }

      try {
        const params: any = tab !== 'liveStreams' ? { page, limit, search } : { search }

        if (effectiveSellerId && tab !== 'liveStreams') {
          params.sellerId = effectiveSellerId
        }

        const { data } = await axiosInstance.get(endpoint, { params })

        if (tab === 'liveStreams') {
          setStateFunc(data.data || [])
          setHasMoreFunc(false)
        } else {
          const { [dataKey]: newData, totalPages } = data.data
          setStateFunc(isLoadMore ? (prev: any[]) => [...prev, ...newData] : newData)
          setPageFunc(page)
          setHasMoreFunc(page < totalPages)
        }
      } catch (error) {
        console.error(`Error fetching ${tab}:`, error)
        showNegative(`Failed to load ${tab}.`)
      } finally {
        setLoading(false)
        setInitialLoad(false)
        setLoadingMore(false)
        setRefreshing(false)
      }
    },
    [effectiveSellerId, showNegative]
  )

  // Effect for Search and Tab Switching
  useEffect(() => {
    const resetAndFetch = async () => {
      if (activeTab === 'products') {
        setProducts([])
        setProductPage(1)
        setHasMoreProducts(true)
      } else if (activeTab === 'videos') {
        setShoppableVideos([])
        setVideoPage(1)
        setHasMoreVideos(true)
      } else if (activeTab === 'liveStreams') {
        setLiveStreams([])
        setHasMoreLiveStreams(false)
      }
      await fetchData(activeTab, 1, debouncedSearch, false)
    }
    resetAndFetch()
  }, [debouncedSearch, activeTab, fetchData])

  // Load More Handler
  const handleLoadMore = () => {
    if (loadingMore || loading) return

    if (activeTab === 'products' && hasMoreProducts) {
      fetchData('products', productPage + 1, debouncedSearch, true)
    } else if (activeTab === 'videos' && hasMoreVideos) {
      fetchData('videos', videoPage + 1, debouncedSearch, true)
    }
  }

  // Refresh Handler
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchData(activeTab, 1, debouncedSearch, false)
    } catch (error) {
      console.error('Error during refresh:', error)
    }
  }

  // Show accessed seller's profile in access mode
  const userProfileImageUrl = isAccessMode && sellerInfo?.userInfo?.profileURL?.key
    ? generateCDNUrl(sellerInfo.userInfo.profileURL.key)
    : user?.profileURL?.key
    ? generateCDNUrl(user.profileURL.key)
    : null

  const renderContent = () => {
    if (initialLoad) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFB800" />
        </View>
      )
    }

    const data =
      activeTab === 'products'
        ? products
        : activeTab === 'videos'
        ? shoppableVideos
        : liveStreams

    if (data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name={
              activeTab === 'products'
                ? 'shopping'
                : activeTab === 'videos'
                ? 'play-circle-outline'
                : 'play-circle-outline'
            }
            size={64}
            color="#4B5563"
          />
          <Text style={styles.emptyTitle}>
            No {activeTab === 'products' ? 'Products' : activeTab === 'videos' ? 'Shoppable Videos' : 'Live Streams'} Found
          </Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or add a new{' '}
            {activeTab === 'products' ? 'product' : activeTab === 'videos' ? 'video' : 'live stream'}.
          </Text>
          {activeTab !== 'liveStreams' && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                navigation.navigate(
                  activeTab === 'products' ? 'CreateProductListing' : 'CreateShoppableVideo'
                )
              }
            >
              <Icon name="add" size={18} color="#1A1A1A" style={{ marginRight: 8 }} />
              <Text style={styles.addButtonText}>
                Add {activeTab === 'products' ? 'Product' : 'Video'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 20

          if (isCloseToBottom) {
            handleLoadMore()
          }
        }}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFB800"
            colors={['#FFB800']}
          />
        }
      >
        <View
          style={[
            styles.gridContainer,
            activeTab === 'products'
              ? styles.productGrid
              : styles.videoGrid,
          ]}
        >
          {data.map((item: any, index: number) => {
            if (activeTab === 'products') {
              return <ProductCard key={item._id} product={item} />
            } else if (activeTab === 'videos') {
              return <ShoppableVideoCard key={item._id} video={item} index={index} />
            } else {
              return <LiveStreamCard key={item._id} show={item} index={index} />
            }
          })}
        </View>
        {loadingMore && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color="#FFB800" />
          </View>
        )}
      </ScrollView>
    )
  }

  return (
    <View style={styles.container}>
      {/* Access Mode Banner */}
      {isAccessMode && (
        <Animated.View entering={FadeIn} style={styles.accessBanner}>
          <View style={styles.bannerContent}>
            <FontAwesome5 name="chart-bar" size={20} color="#FFB800" style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.bannerHeader}>
                <Text style={styles.bannerTitle}>Access Mode Active</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Read-Only</Text>
                </View>
              </View>
              <Text style={styles.bannerSubtitle}>
                Viewing analytics for:{' '}
                <Text style={styles.bannerSellerName}>{sellerInfo?.userName || 'Seller'}</Text>
              </Text>
              <View style={styles.permissionContainer}>
                {[
                  { name: 'View', value: canView },
                  { name: 'Create', value: canCreate },
                  { name: 'Edit', value: canEdit },
                  { name: 'Delete', value: canDelete },
                ].map((permission) => (
                  <View
                    key={permission.name}
                    style={[
                      styles.permissionBadge,
                      permission.value ? styles.permissionActive : styles.permissionInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.permissionText,
                        permission.value ? styles.permissionTextActive : styles.permissionTextInactive,
                      ]}
                    >
                      {permission.value ? '✓' : '✗'} {permission.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerTitleContainer}>
            <FontAwesome5 name="chart-bar" size={28} color="#FFB800" style={{ marginRight: 12 }} />
            <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Manage your products, shoppable videos, and live streams.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('ProfileAnalytics')}
        >
          {userProfileImageUrl && (
            <Image
              source={{ uri: userProfileImageUrl }}
              style={styles.profileImage}
            />
          )}
          <Text style={styles.profileButtonText}>Profile Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          placeholder={`Search ${activeTab}...`}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Icon name="close-circle-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs and Refresh */}
      <View style={styles.controlsContainer}>
        <View style={styles.tabsContainer}>
          {['products', 'videos', 'liveStreams'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'products'
                  ? 'All Products'
                  : tab === 'videos'
                  ? 'Shoppable Videos'
                  : 'Live Streams'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={loading && initialLoad}
        >
          <Icon
            name="refresh"
            size={20}
            color="#FFB800"
            style={loading && initialLoad ? styles.refreshIconRotating : undefined}
          />
        </TouchableOpacity> */}
      </View>

      {/* Content */}
      {renderContent()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  accessBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  bannerContent: {
    flexDirection: 'row',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  badge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFB800',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 4,
  },
  bannerSellerName: {
    fontWeight: '600',
    color: '#FFB800',
  },
  permissionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  permissionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  permissionInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  permissionText: {
    fontSize: 10,
  },
  permissionTextActive: {
    color: '#4ADE80',
  },
  permissionTextInactive: {
    color: '#9CA3AF',
  },
  header: {
    backgroundColor: '#262626',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize:  16, //24,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  profileButton: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  profileImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#FFB800',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.5)',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#FFB800',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  tabTextActive: {
    color: '#1A1A1A',
  },
  refreshButton: {
    backgroundColor: '#262626',
    padding: 10,
    borderRadius: 24,
    marginLeft: 8,
  },
  refreshIconRotating: {
    // Animation would be handled by Animated API if needed
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F9FAFB',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productGrid: {
    gap: 16,
  },
  videoGrid: {
    gap: 12,
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
})
