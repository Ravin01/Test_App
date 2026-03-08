"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StatusBar,
  FlatList,
  ScrollView,
} from "react-native"
import { BarChart, PieChart, LineChart } from "react-native-gifted-charts"
import Icon from "react-native-vector-icons/MaterialIcons"
import { AWS_CDN_URL } from "../../../Utils/aws"
import axiosInstance from "../../../Utils/Api"
import { SafeAreaView } from "react-native-safe-area-context"
import SellerHeader from "../SellerForm/Header"
import { colors } from "../../../Utils/Colors"
import SearchComponent from "../../GloabalSearch/SearchComponent"

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")
// Account for container padding (20px on each side = 40px total) + chart container internal padding (20px * 2 = 40px)
const chartWidth = screenWidth - 80
const chartHeight = 180

// Component types for FlatList sections
const COMPONENT_TYPES = {
  HEADER: "header",
  STATS: "stats",
  DAILY_CHART: "daily_chart",
  DEVICE_CHART: "device_chart",
  COUNTRY_CHART: "country_chart",
  PRODUCTS: "products",
  PLATFORMS: "platforms",
  ADVANCED_TABS: "advanced_tabs",
  ATTENTION_CURVE: "attention_curve",
  REWATCH_INSIGHTS: "rewatch_insights",
  VIEWERS_SECTION: "viewers_section",
}

// StatCard component without animations
const StatCard = React.memo(({ title, value, iconName, unit = "", index }: {
  title: string;
  value: any;
  iconName: string;
  unit?: string;
  index: number;
}) => {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Icon name={iconName} size={20} color="#F7CE45" />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}>{unit}</Text>
      </Text>
    </View>
  )
})

const ChartContainer = React.memo(({ title, iconName, children, style }: {
  title: string;
  iconName: string;
  children: React.ReactNode;
  style?: any;
}) => (
  <View style={[styles.chartContainer, style]}>
    <View style={styles.chartHeader}>
      <View style={styles.chartIconContainer}>
        <Icon name={iconName} size={20} color="#F7CE45" />
      </View>
      <Text style={styles.chartTitle}>{title}</Text>
    </View>
    <View style={styles.chartContent}>{children}</View>
  </View>
))

// Loading skeleton component
const LoadingSkeleton = () => (
  <View style={styles.container}>
    <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
    <View style={styles.skeletonHeader} />
    <View style={styles.skeletonGrid}>
      {[...Array(5)].map((_, i) => (
        <View key={i} style={styles.skeletonCard} />
      ))}
    </View>
    <View style={styles.skeletonChart} />
  </View>
)

// Viewer Item Component
const ViewerItem = React.memo(({ item, index, onPress }: {
  item: any;
  index: number;
  onPress: (viewer: any) => void;
}) => {
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

  return (
    <View style={styles.viewerItemContainer}>
      <TouchableOpacity
        style={styles.viewerItem}
        onPress={() => onPress(item)}
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
            <Text style={styles.statValue}>{item.viewCount || 0}</Text>
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
    </View>
  )
})

const ShoppableAnalyticsPage = ({ navigation, route }) => {
  const { videoId } = route.params || {}
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Viewers state
  const [viewers, setViewers] = useState([])
  const [viewersLoading, setViewersLoading] = useState(false)
  const [viewersPage, setViewersPage] = useState(1)
  const [hasMoreViewers, setHasMoreViewers] = useState(true)
  const [searchQuery, setSearchQuery] = useState("");
  
  // Advanced Analytics State
  const [activeTab, setActiveTab] = useState('attention');
  const [advancedAnalytics, setAdvancedAnalytics] = useState({ attention: null, rewatch: null });
  const [loadingAdvanced, setLoadingAdvanced] = useState({ attention: false, rewatch: false });
  // Memoized format functions for performance
  const formatTime = useCallback((seconds) => {
    if (!seconds || seconds < 1) return "0s"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }, [])

  const fetchAnalytics = useCallback(
    async (isRefresh = false) => {
      if (!videoId) {
        setError("Video ID is required")
        setLoading(false)
        return
      }

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await axiosInstance.get(`/shoppable-interaction/${videoId}/analytics`)
        setAnalytics(response.data.data)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch analytics", err)
        const errorMessage = err.response?.data?.message || "Could not load video analytics."
        setError(errorMessage)

        if (isRefresh) {
          Alert.alert("Error", errorMessage)
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [videoId],
  )

  const fetchViewers = useCallback(
    async (pageNum, search = "", _isRefresh = false) => {
      if (!videoId) return

      if (pageNum === 1) {
        setViewersLoading(true)
      }

      try {
        const response = await axiosInstance.get(`/shoppable-interaction/${videoId}/viewers`, {
          params: { page: pageNum, limit: 15, search:search.trim() },
        })

        const { viewers: newViewers, pagination } = response.data.data

        setViewers((prev) => (pageNum === 1 ? newViewers : [...prev, ...newViewers]))
        setHasMoreViewers(pagination?.hasNextPage || false)
      } catch (err) {
        console.error("Error fetching viewers:", err)
      } finally {
        setViewersLoading(false)
      }
    },
    [videoId],
  )

  useEffect(() => {
    fetchAnalytics()
    fetchViewers(1)
  }, [fetchAnalytics, fetchViewers])
    useEffect(() => {
    fetchViewers(1, searchQuery)
  }, [searchQuery, fetchViewers])

  // Memoized chart data processing
  const chartData = useMemo(() => {
    if (!analytics) return null

    const { dailyTrends, demographics } = analytics

    const lineChartData =
      dailyTrends?.map((item, _index) => ({
        value: item.views || 0,
        label: new Date(item.date).getDate().toString(),
        labelTextStyle: { color: "#A1A1AA", fontSize: 10 },
      })) || []

    const pieChartData =
      demographics?.byDevice?.map((item, _index) => ({
        value: item.value || 0,
        color: ["#F7CE45", "#FAFAFA", "#A1A1AA", "#FBBF24", "#F87171"][_index % 5],
        text: `${item.name}\n${item.value}`,
        textColor: "#FFFFFF",
      })) || []

    const barChartData =
      demographics?.byCountry?.map((item, _index) => ({
        value: item.value || 0,
        label: item.name?.substring(0, 3).toUpperCase() || "N/A",
        frontColor: ["#F7CE45", "#FAFAFA", "#A1A1AA", "#FBBF24", "#F87171"][_index % 5],
        labelTextStyle: { color: "#A1A1AA", fontSize: 10 },
      })) || []

    return { lineChartData, pieChartData, barChartData }
  }, [analytics])

  // Create FlatList data structure
  const flatListData = useMemo(() => {
    if (!analytics) return []

    const { videoInfo, summaryStats, demographics, topClickedProducts } = analytics

    const data: any[] = [
      { type: COMPONENT_TYPES.HEADER, data: { videoInfo, summaryStats } },
      { type: COMPONENT_TYPES.STATS, data: { summaryStats } },
    ]

    if (chartData?.lineChartData?.length > 0) {
      data.push({ type: COMPONENT_TYPES.DAILY_CHART, data: chartData.lineChartData })
    }

    if (chartData?.pieChartData?.length > 0) {
      data.push({ type: COMPONENT_TYPES.DEVICE_CHART, data: chartData.pieChartData })
    }

    if (chartData?.barChartData?.length > 0) {
      data.push({ type: COMPONENT_TYPES.COUNTRY_CHART, data: chartData.barChartData })
    }

    data.push({ type: COMPONENT_TYPES.PRODUCTS, data: topClickedProducts })
    data.push({ type: COMPONENT_TYPES.PLATFORMS, data: demographics?.byPlatform })
    
    // Custom logic to manage advanced tabs render block
    data.push({
      type: COMPONENT_TYPES.ADVANCED_TABS,
      data: { activeTab }
    })
    
    if (activeTab === 'attention') {
      data.push({
        type: COMPONENT_TYPES.ATTENTION_CURVE,
        data: {
          loading: loadingAdvanced.attention,
          attentionData: advancedAnalytics.attention
        }
      })
    } else if (activeTab === 'rewatch') {
      data.push({
        type: COMPONENT_TYPES.REWATCH_INSIGHTS,
        data: {
          loading: loadingAdvanced.rewatch,
          rewatchData: advancedAnalytics.rewatch
        }
      })
    }
    
    // Add viewers section with all viewer data
    data.push({ 
      type: COMPONENT_TYPES.VIEWERS_SECTION, 
      data: { 
        viewers, 
        loading: viewersLoading, 
        hasMore: hasMoreViewers 
      } 
    })

    return data
  }, [analytics, chartData, viewers, viewersLoading, hasMoreViewers, activeTab, advancedAnalytics, loadingAdvanced])

  const onRefresh = useCallback(() => {
    fetchAnalytics(true)
    setViewersPage(1)
    fetchViewers(1, "", true)
  }, [fetchAnalytics, fetchViewers])

  const handleLoadMoreViewers = useCallback(() => {
    if (!viewersLoading && hasMoreViewers) {
      const nextPage = viewersPage + 1
      setViewersPage(nextPage)
      fetchViewers(nextPage, "")
    }
  }, [viewersLoading, hasMoreViewers, viewersPage, fetchViewers])

  const handleViewerPress = useCallback(
    (viewer) => {
      navigation.navigate("ViewSellerProdile", { id: viewer.userName })
    },
    [navigation],
  )

  const renderItem = useCallback(
    ({ item, index }) => {
      switch (item.type) {
        case COMPONENT_TYPES.HEADER:
          return (
            <View style={styles.header}>
              <Image
                source={{ uri: `${AWS_CDN_URL}${item.data.videoInfo?.thumbnailURL}` }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              <View style={styles.headerText}>
                <Text style={styles.headerSubtitle}>ANALYTICS DASHBOARD</Text>
                <Text style={styles.headerTitle} numberOfLines={2}>
                  {item.data.videoInfo?.title || "Video Analytics"}
                </Text>
              </View>
            </View>
          )

        case COMPONENT_TYPES.STATS:
          return (
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Views"
                value={item.data.summaryStats?.viewCount || 0}
                iconName="visibility"
                index={0}
              />
              <StatCard
                title="Unique Viewers"
                value={item.data.summaryStats?.uniqueViewCount || 0}
                iconName="people"
                index={1}
              />
              <StatCard
                title="Avg. Watch Time"
                value={formatTime(item.data.summaryStats?.averageWatchDuration)}
                iconName="schedule"
                index={2}
              />
              <StatCard
                title="Avg. Completion"
                value={item.data.summaryStats?.averageCompletion?.toFixed(1) || "0"}
                unit="%"
                iconName="percent"
                index={3}
              />
              <StatCard
                title="CTR"
                value={item.data.summaryStats?.clickThroughRate?.toFixed(1) || "0"}
                unit="%"
                iconName="shopping-bag"
                index={4}
              />
            </View>
          )

        case COMPONENT_TYPES.DAILY_CHART:
          return (
            <View style={styles.chartsSection}>
              <ChartContainer title="Daily Views" iconName="bar-chart">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScrollView}>
                  <LineChart
                    data={item.data}
                    width={Math.max(chartWidth, item.data.length * 50)}
                    height={180}
                    color="#F7CE45"
                    thickness={3}
                    startFillColor="#F7CE45"
                    endFillColor="rgba(247, 206, 69, 0.1)"
                    startOpacity={0.8}
                    endOpacity={0.1}
                    initialSpacing={20}
                    maxValue={Math.max(...item.data.map((d: any) => d.value), 10) * 1.2}
                    yAxisColor="rgba(161, 161, 170, 0.3)"
                    xAxisColor="rgba(161, 161, 170, 0.3)"
                    yAxisTextStyle={{ color: "#A1A1AA", fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: "#A1A1AA", fontSize: 10 }}
                    showVerticalLines
                    verticalLinesColor="rgba(161, 161, 170, 0.1)"
                    rulesColor="rgba(161, 161, 170, 0.1)"
                    curved
                    areaChart
                    hideDataPoints={item.data.length > 15}
                    spacing={item.data.length > 15 ? 15 : 40}
                  />
                </ScrollView>
              </ChartContainer>
            </View>
          )

        case COMPONENT_TYPES.DEVICE_CHART:
          // console.log(item.data)
          return (
            <View style={styles.chartsSection}>
              <ChartContainer title="Device Breakdown" iconName="devices">
                <View style={styles.pieChartContainer}>
                  <PieChart
                    data={item.data}
                    radius={80}
                    innerRadius={40}
                    centerLabelComponent={() => (
                      <View style={styles.pieChartCenter}>
                        <Text style={styles.pieChartCenterText}>Devices</Text>
                      </View>
                    )}
                    showText
                    textColor="#FAFAFA"
                    textSize={12}
                    textBackgroundRadius={20}
                    textBackgroundColor="rgba(24, 24, 27, 0.8)"
                  />
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12, paddingHorizontal: 16 }}>
                  {item.data.map((d: any, index: number) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: d.color, marginRight: 6 }} />
                      <Text style={{ color: '#A1A1AA', fontSize: 12 }}>{d.text.split('\n')[0]} ({d.value})</Text>
                    </View>
                  ))}
                </View>
              </ChartContainer>
            </View>
          )

        case COMPONENT_TYPES.COUNTRY_CHART:
          return (
            <View style={styles.chartsSection}>
              <ChartContainer title="Top Countries" iconName="public">
                <BarChart
                  data={item.data}
                  width={chartWidth - 40}
                  height={200}
                  barWidth={30}
                  spacing={20}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: "#A1A1AA", fontSize: 10 }}
                  noOfSections={Math.min(Math.max(...(item.data.map((d: any) => d.value) || [1])), 4)}
                  stepValue={Math.ceil(Math.max(...(item.data.map((d: any) => d.value) || [1])) / 4) || 1}
                  maxValue={Math.ceil(Math.max(...(item.data.map((d: any) => d.value) || [1])) / 4) * 4 || 4}
                />
              </ChartContainer>
            </View>
          )

        case COMPONENT_TYPES.PRODUCTS:
          return (
            <View style={styles.chartsSection}>
              <ChartContainer title="Top Clicked Products" iconName="inventory">
                <View style={styles.productsList}>
                  {item.data?.length > 0 ? (
                    item.data.map((product, _productIndex) => (
                      <View
                        key={product._id}
                        style={styles.productItem}
                      >
                        <Image
                          source={{
                            uri: product.image
                              ? `${AWS_CDN_URL}${product.image.key}`
                              : "https://via.placeholder.com/100",
                          }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                        <View style={styles.productInfo}>
                          <Text style={styles.productTitle} numberOfLines={2}>
                            {product.title}
                          </Text>
                          <Text style={styles.productClicks}>{product.clicks} Clicks</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Icon name="inventory" size={48} color="#A1A1AA" />
                      <Text style={styles.emptyStateText}>No products clicked yet.</Text>
                    </View>
                  )}
                </View>
              </ChartContainer>
            </View>
          )

        case COMPONENT_TYPES.PLATFORMS:
          return (
            <View style={styles.chartsSection}>
              <ChartContainer title="Platforms" iconName="computer">
                <View style={styles.platformsList}>
                  {item.data?.length > 0 ? (
                    item.data.map((platform, _platformIndex) => (
                      <View
                        key={platform.name}
                        style={styles.platformItem}
                      >
                        <Text style={styles.platformName}>{platform.name}</Text>
                        <Text style={styles.platformValue}>{platform.value}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Icon name="computer" size={48} color="#A1A1AA" />
                      <Text style={styles.emptyStateText}>No platform data.</Text>
                    </View>
                  )}
                </View>
              </ChartContainer>
            </View>
          )

        case COMPONENT_TYPES.ADVANCED_TABS:
          const TABS = [
            { id: 'attention', label: 'Attention Curve', icon: 'trending-down' },
            { id: 'rewatch', label: 'Rewatch Insights', icon: 'repeat' },
            { id: 'loyalty', label: 'Viewer Loyalty', icon: 'star' },
          ];
          return (
            <View style={(styles as any).advancedTabsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={(styles as any).tabRow}>
                {TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      (styles as any).tabButton,
                      (item.data as any).activeTab === tab.id ? (styles as any).tabActive : (styles as any).tabInactive
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Icon
                      name={tab.icon}
                      size={16}
                      color={(item.data as any).activeTab === tab.id ? "#000" : "#A1A1AA"}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        (item.data as any).activeTab === tab.id ? styles.tabTextActive : styles.tabTextInactive
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )

        case COMPONENT_TYPES.ATTENTION_CURVE:
          if ((item.data as any).loading) {
            return (
              <View style={[styles.chartsSection, { height: 300, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#F7CE45' }}>Loading Attention Curve...</Text>
              </View>
            )
          }
          
          if (!(item.data as any).attentionData || !(item.data as any).attentionData.retentionCurve || (item.data as any).attentionData.retentionCurve.length === 0) {
            return (
              <View style={styles.chartsSection}>
                <ChartContainer title="Viewer Retention" iconName="trending-down">
                  <View style={styles.emptyState}>
                    <Icon name="trending-down" size={48} color="#A1A1AA" style={{ opacity: 0.5 }} />
                    <Text style={styles.emptyStateText}>Attention data not available yet.</Text>
                  </View>
                </ChartContainer>
              </View>
            )
          }

          const retentionData = (item.data as any).attentionData.retentionCurve.map((d: any) => ({
            value: d.percentage,
            label: d.second.toString(),
            labelTextStyle: { color: "#A1A1AA", fontSize: 10 }
          }));

          const dropOffs = (item.data as any).attentionData.biggestDropOffs || [];

          return (
            <View style={styles.chartsSection}>
              <ChartContainer title="Viewer Retention Curve" iconName="trending-down">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={retentionData}
                    width={Math.max(chartWidth, retentionData.length * 40)}
                    height={180}
                    color="#F7CE45"
                    thickness={3}
                    startFillColor="#F7CE45"
                    endFillColor="rgba(247, 206, 69, 0.1)"
                    startOpacity={0.7}
                    endOpacity={0.1}
                    initialSpacing={10}
                    noOfSections={4}
                    yAxisColor="rgba(161, 161, 170, 0.3)"
                    xAxisColor="rgba(161, 161, 170, 0.3)"
                    yAxisTextStyle={{ color: "#A1A1AA", fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: "#A1A1AA", fontSize: 10 }}
                    showVerticalLines
                    verticalLinesColor="rgba(161, 161, 170, 0.1)"
                    rulesColor="rgba(161, 161, 170, 0.1)"
                    areaChart
                    hideDataPoints={retentionData.length > 20}
                    spacing={retentionData.length > 20 ? 15 : 40}
                  />
                </ScrollView>
              </ChartContainer>

              {dropOffs.length > 0 && (
                <View style={(styles as any).dropOffContainer}>
                  <Text style={(styles as any).dropOffTitle}>Biggest Drop-off Points</Text>
                  {dropOffs.slice(0, 4).map((drop: any, idx: number) => (
                    <View key={idx} style={(styles as any).dropOffItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="trending-down" size={16} color="#F87171" style={{ marginRight: 8 }} />
                        <Text style={(styles as any).dropOffSecond}>At {drop.second}s</Text>
                      </View>
                      <Text style={(styles as any).dropOffPercentage}>-{drop.dropPercentage.toFixed(1)}%</Text>
                    </View>
                  ))}
                  <View style={(styles as any).editingTipsBox}>
                    <Text style={(styles as any).editingTipsHeader}>Editing Tips</Text>
                    <Text style={(styles as any).editingTipItem}>• Add engaging hooks before drop-off points.</Text>
                    <Text style={(styles as any).editingTipItem}>• Shorten sections with viewer loss.</Text>
                  </View>
                </View>
              )}
            </View>
          )

        case COMPONENT_TYPES.REWATCH_INSIGHTS:
          if ((item.data as any).loading) {
            return (
              <View style={[styles.chartsSection, { height: 300, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#F7CE45' }}>Loading Rewatch Insights...</Text>
              </View>
            )
          }

          if ((item.data as any).activeTab === 'loyalty') {
             return (
               <View style={styles.chartsSection}>
                 <ChartContainer title="Viewer Loyalty" iconName="star">
                   <View style={styles.emptyState}>
                     <Icon name="star" size={48} color="#A1A1AA" style={{ opacity: 0.5 }} />
                     <Text style={styles.emptyStateText}>Viewer loyalty metrics are coming soon!</Text>
                   </View>
                 </ChartContainer>
               </View>
             )
          }
          
          if (!(item.data as any).rewatchData || (item.data as any).rewatchData.length === 0) {
            return (
              <View style={styles.chartsSection}>
                <ChartContainer title="Rewatch Insights" iconName="repeat">
                  <View style={styles.emptyState}>
                    <Icon name="repeat" size={48} color="#A1A1AA" style={{ opacity: 0.5 }} />
                    <Text style={styles.emptyStateText}>No high-intent users found yet.</Text>
                  </View>
                </ChartContainer>
              </View>
            )
          }

          return (
            <View style={styles.chartsSection}>
              <ChartContainer title="High Purchase Intent" iconName="repeat">
                <View style={(styles as any).rewatchTable}>
                  <View style={(styles as any).rewatchTableRowHeader}>
                    <Text style={[(styles as any).rewatchCellHeader, { flex: 2 }]}>User</Text>
                    <Text style={(styles as any).rewatchCellHeader}>Rewatches</Text>
                    <Text style={(styles as any).rewatchCellHeader}>Avg Comp</Text>
                  </View>
                  {(item.data as any).rewatchData.map((user: any, index: number) => (
                    <View key={user._id || index} style={(styles as any).rewatchTableRow}>
                      <View style={[(styles as any).rewatchCell, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                        <View style={(styles as any).miniAvatar}>
                          <Text style={(styles as any).miniAvatarText}>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</Text>
                        </View>
                        <View>
                          <Text style={(styles as any).rewatchUsername}>{user.name || 'Unknown'}</Text>
                        </View>
                      </View>
                      <Text style={[(styles as any).rewatchCell, (styles as any).rewatchImportantText]}>{user.rewatchCount}</Text>
                      <Text style={[(styles as any).rewatchCell, (styles as any).rewatchImportantText]}>{user.avgCompletion ? `${user.avgCompletion.toFixed(1)}%` : 'N/A'}</Text>
                    </View>
                  ))}
                </View>
              </ChartContainer>
            </View>
          )

        case COMPONENT_TYPES.VIEWERS_SECTION:
          return (
            <View style={styles.viewersContainer}>
              <View style={styles.viewersHeader}>
                <View style={styles.titleContainer}>
                  <Icon name="people" size={20} color="#F7CE45" />
                  <Text style={styles.title}>Viewers</Text>
                </View>
              </View>
              <SearchComponent searchTerm={searchQuery} setSearchTerm={setSearchQuery} placeholder={"Search Viewers"} />
              
              <ScrollView
                style={styles.viewersScrollView}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                onScroll={(event) => {
                  const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
                  const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20
                  if (isCloseToBottom && !(item.data as any).loading && (item.data as any).hasMore) {
                    handleLoadMoreViewers()
                  }
                }}
                scrollEventThrottle={400}
              >
                {(item.data as any).viewers.map((viewer: any, viewerIndex: number) => (
                  <ViewerItem
                    key={viewer._id || `viewer-${viewerIndex}`}
                    item={viewer}
                    index={viewerIndex}
                    onPress={handleViewerPress}
                  />
                ))}
                
                {(item.data as any).loading && (
                  <View style={styles.footerLoader}>
                    <Text style={styles.footerLoaderText}>Loading more viewers...</Text>
                  </View>
                )}
                
                {!(item.data as any).hasMore && (item.data as any).viewers.length > 0 && (
                  <Text style={styles.endMessage}>You've reached the end of the list</Text>
                )}
                
                {(item.data as any).viewers.length === 0 && !(item.data as any).loading && (
                  <View style={styles.emptyState}>
                    <Icon name="people-outline" size={48} color="#A1A1AA" />
                    <Text style={styles.emptyStateText}>No viewers yet</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )

        default:
          return null
      }
    },
    [formatTime, chartData, handleViewerPress, viewers.length],
  )

  if (loading && !analytics) {
    return <LoadingSkeleton />
  }

  if (error && !analytics) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <Icon name="error-outline" size={64} color="#F87171" />
        <Text style={styles.errorTitle}>An Error Occurred</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchAnalytics()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!analytics) return null

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryColor} />
      <SellerHeader navigation={navigation} message={'Analyse'}/>
      <FlatList
        data={flatListData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
        updateCellsBatchingPeriod={50}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:colors.primaryColor,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#F7CE45",
  },
  headerText: {
    flex: 1,
    marginLeft: 16,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#A1A1AA",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FAFAFA",
    lineHeight: 28,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: (screenWidth - 64) / 2,
    backgroundColor: "#18181B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(247, 206, 69, 0.3)",
    padding: 16,
    marginBottom: 12,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#A1A1AA",
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FAFAFA",
  },
  statUnit: {
    fontSize: 16,
    fontWeight: "normal",
  },
  chartsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  chartContainer: {
    backgroundColor: "#18181B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(247, 206, 69, 0.3)",
    padding: 20,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  chartIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FAFAFA",
  },
  chartContent: {
    alignItems: "center",
  },
  chartScrollView: {
    flexGrow: 0,
  },
  pieChartContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
  pieChartCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  pieChartCenterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#A1A1AA",
  },
  productsList: {
    maxHeight: 240,
    flex:1,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    width:'100%',
    borderBottomWidth: 1,
    borderBottomColor: "rgba(247, 206, 69, 0.1)",
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FAFAFA",
    marginBottom: 4,
  },
  productClicks: {
    fontSize: 12,
    color: "#A1A1AA",
  },
  platformsList: {
    maxHeight: 240,
  },
  platformItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    width:'100%',
    borderBottomWidth: 1,
    borderBottomColor: "rgba(247, 206, 69, 0.1)",
  },
  platformName: {
    fontSize: 14,
    color: "#A1A1AA",
    textTransform: "capitalize",
  },
  platformValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FAFAFA",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#A1A1AA",
    marginTop: 12,
    textAlign: "center",
  },
  // Viewers styles
  viewersContainer: {
    backgroundColor: "#18181B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(247, 206, 69, 0.3)",
    margin: 20,
    marginTop: 0,
    maxHeight: screenHeight * 0.6,
  },
  viewersScrollView: {
    maxHeight: screenHeight * 0.5,
  },
  viewersHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(247, 206, 69, 0.1)",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FAFAFA",
    marginLeft: 8,
  },
  viewerItemContainer: {
    marginHorizontal: 20,
  },
  viewerItem: {
    backgroundColor: "rgba(24, 24, 27, 0.5)",
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
  lastViewed: {
    fontSize: 10,
    color: "#A1A1AA",
    textAlign: "center",
  },
  footerLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    marginHorizontal: 20,
  },
  footerLoaderText: {
    fontSize: 12,
    color: "#A1A1AA",
  },
  endMessage: {
    fontSize: 12,
    color: "#A1A1AA",
    textAlign: "center",
    paddingVertical: 20,
    marginHorizontal: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0A0A",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FAFAFA",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#A1A1AA",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#F7CE45",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0A0A0A",
  },
  skeletonHeader: {
    height: 100,
    backgroundColor: "#18181B",
    borderRadius: 16,
    margin: 20,
    marginTop: 60,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  skeletonCard: {
    width: (screenWidth - 64) / 2,
    height: 80,
    backgroundColor: "#18181B",
    borderRadius: 16,
  },
  skeletonChart: {
    height: 200,
    backgroundColor: "#18181B",
    borderRadius: 16,
    margin: 20,
  },
  advancedTabsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(247, 206, 69, 0.2)",
  },
  tabRow: {
    flexDirection: 'row',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: "#F7CE45",
  },
  tabInactive: {},
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  tabTextActive: {
    color: "#F7CE45",
  },
  tabTextInactive: {
    color: "#A1A1AA",
  },
  dropOffContainer: {
    marginTop: 16,
    backgroundColor: "#18181B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(247, 206, 69, 0.2)",
  },
  dropOffTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: "#FAFAFA",
    marginBottom: 12,
  },
  dropOffItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  dropOffSecond: {
    fontSize: 14,
    color: "#FAFAFA",
  },
  dropOffPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: "#F87171",
  },
  editingTipsBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  editingTipsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: "#93C5FD",
    marginBottom: 8,
  },
  editingTipItem: {
    fontSize: 12,
    color: "#60A5FA",
    marginBottom: 4,
  },
  rewatchTable: {
    width: '100%',
  },
  rewatchTableRowHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: "rgba(247, 206, 69, 0.2)",
    paddingBottom: 8,
    marginBottom: 8,
  },
  rewatchCellHeader: {
    flex: 1,
    fontSize: 12,
    color: "#F7CE45",
    fontWeight: '600',
    textAlign: 'center',
  },
  rewatchTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  rewatchCell: {
    flex: 1,
    textAlign: 'center',
    color: "#FAFAFA",
    fontSize: 14,
  },
  rewatchImportantText: {
    fontWeight: 'bold',
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(247, 206, 69, 0.2)",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  miniAvatarText: {
    color: "#F7CE45",
    fontSize: 12,
    fontWeight: 'bold',
  },
  rewatchUsername: {
    fontSize: 12,
    color: "#FAFAFA",
  }
})

export default ShoppableAnalyticsPage
