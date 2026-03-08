import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  RefreshControl,
  StyleSheet
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { 
  BarChart, 
  LineChart, 
  PieChart 
} from "react-native-gifted-charts";
import { 
  TrendingUp, 
  Eye, 
  Globe, 
  Monitor, 
  Users, 
  MapPin, 
  Smartphone,
  Search, 
  UserX, 
  User as UserIcon,
  ArrowLeft,
  BarChart3,
  ChevronLeft
} from "lucide-react-native";
import LinearGradient from 'react-native-linear-gradient';
import axiosInstance from "../../Utils/Api";
import { AuthContext } from "../../Context/AuthContext";
import { AWS_CDN_URL } from "../../Utils/aws";
import { SafeAreaView } from "react-native-safe-area-context";
import SellerHeader from "../SellerComponents/SellerForm/Header";
import { intialAvatar } from "../../Utils/Constants";

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a', // primary-color
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerContainer: {
    marginBottom: 24,
  },
  headerCard: {
    padding: 24,
    borderRadius: 24,
    // backgroundColor: '#2a2a2a', // secondary-color
    borderWidth: 1,
    borderColor: '#404040',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#F7CE45',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F7CE45',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F7CE45',
  },
  profileImageText: {
    color: '#000',
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F7CE45',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerUsername: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    backgroundColor: '#10B981',
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsLastRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    position: 'absolute',
    top: 12,
    right: 12,
  },
  statChangeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    color: '#fff',
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statSubText: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.7,
    marginTop: 4,
  },
  statGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -20,
    right: -20,
  },
  chartCard: {
    borderRadius: 16,
    // backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: 'rgba(247, 206, 69, 0.2)',
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartIconContainer: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F7CE45',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(64, 64, 64, 0.8)',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#404040',
  },
  timeRangeButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: '#F7CE45',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  timeRangeTextActive: {
    color: '#000',
  },
  timeRangeTextInactive: {
    color: '#D1D5DB',
  },
  chartContainer: {
    alignItems: 'center',
  },
  emptyStateContainer: {
    height: 192,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 24,
    borderRadius: 12,
    // backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#404040',
    paddingLeft: 8,
  },
  searchInput: {
    // paddingLeft: 48,
    paddingRight: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  viewersScrollContainer: {
    maxHeight: 384,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endMessageContainer: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 24,
    fontSize: 16,
  },
  noViewersContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  noViewersTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 16,
    fontSize: 18,
  },
  noViewersSubtitle: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  viewerItem: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(64, 64, 64, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(64, 64, 64, 0.5)',
    marginBottom: 12,
  },
  viewerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  viewerImageContainer: {
    position: 'relative',
  },
  viewerImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(247, 206, 69, 0.3)',
  },
  viewerImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(247, 206, 69, 0.3)',
  },
  viewerBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    backgroundColor: '#F7CE45',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  viewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  viewerName: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  viewerUsername: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  viewerLastSeen: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 8,
  },
  viewerStats: {
    alignItems: 'center',
    marginLeft: 16,
  },
  viewerStatsLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  viewerStatsValue: {
    fontWeight: 'bold',
    color: '#F7CE45',
    fontSize: 18,
    marginTop: 4,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 18,
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#F7CE45',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
});

// Custom Hook for Debouncing
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

// Helper function for number formatting
const formatCompactNumber = (count) => {
  if (typeof count !== 'number') return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(count).toLowerCase();
};

// Profile Analytics Header Component
const ProfileAnalyticsHeader = ({ profileData, cdnUrl }) => {
  if (!profileData) return null;

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.profileImageContainer}>
            {profileData?.profileURL?.key ? (
              <Image
                source={{ uri: `${cdnUrl}${profileData.profileURL.key}` }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageText}>
                  {profileData?.name?.charAt(0)?.toUpperCase() || "P"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerLabel}>
              Profile Analytics
            </Text>
            <Text style={styles.headerName}>
              {profileData?.name || "My Profile"}
            </Text>
            <Text style={styles.headerUsername}>
              @{profileData?.userName || "username"}
            </Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active Analytics</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

// Stat Card Component
const StatCard = ({ title, value, change, icon: Icon }) => {
  const isPositive = change >= 0;
  
  // Get card gradient colors based on title
  const getCardGradient = (title) => {
    switch (title) {
      case "Views Today":
        return ['#F7CE45', '#EAB308'];
      case "Last 7 Days":
        return ['#10B981', '#059669'];
      case "Last 30 Days":
        return ['#8B5CF6', '#7C3AED'];
      case "Unique Viewers":
        return ['#F97316', '#EA580C'];
      case "Total Views":
        return ['#EC4899', '#DB2777'];
      default:
        return ['#6B7280', '#4B5563'];
    }
  };
  
  const gradient = getCardGradient(title);
  
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statCard}
    >
      <View style={styles.statIconContainer}>
        <Icon size={18} color="#fff" />
      </View>
      
      {change !== undefined && change !== null && (
        <View style={styles.statChangeContainer}>
          <TrendingUp 
            size={10} 
            color="#fff" 
            style={!isPositive ? { transform: [{ rotate: '180deg' }] } : {}} 
          />
          <Text style={styles.statChangeText}>
            {isPositive ? '+' : ''}{change.toFixed(1)}%
          </Text>
        </View>
      )}
      
      <Text style={styles.statValue}>
        {formatCompactNumber(value)}
      </Text>
      <Text style={styles.statTitle}>
        {title}
      </Text>
      {change !== undefined && change !== null && (
        <Text style={styles.statSubText}>vs yesterday</Text>
      )}
      
      <View style={styles.statGlow} />
    </LinearGradient>
  );
};

// Chart Card Component
const ChartCard = ({ title, children, icon: Icon }) => (
  <View style={styles.chartCard}>
    <View style={styles.chartHeader}>
      {Icon && (
        <View style={styles.chartIconContainer}>
          <Icon size={18} color="#000" />
        </View>
      )}
      <Text style={styles.chartTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

// Time Range Selector Component
const TimeRangeSelector = ({ timeRange, setTimeRange }) => {
  const ranges = [
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "1 Year", value: "365d" }
  ];

  return (
    <View style={styles.timeRangeContainer}>
      {ranges.map((range) => (
        <TouchableOpacity
          key={range.value}
          onPress={() => setTimeRange(range.value)}
          style={[
            styles.timeRangeButton,
            timeRange === range.value && styles.timeRangeButtonActive
          ]}
        >
          <Text 
            style={[
              styles.timeRangeText,
              timeRange === range.value ? styles.timeRangeTextActive : styles.timeRangeTextInactive
            ]}
          >
            {range.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Main Analytics Component
const ProfileAnalytics = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersPage, setViewersPage] = useState(1);
  const [hasMoreViewers, setHasMoreViewers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const cdnUrl = AWS_CDN_URL;
  const isFetchingRef = useRef(false);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true)
    try {
      const response = await axiosInstance.get(`profile-analytics/${user._id}/analytics`);
      setAnalytics(response.data.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch profile analytics", err);
      setError("Could not load analytics data. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id]);

  // Fetch viewers data
  const fetchViewers = useCallback(async (reset = false) => {
    if (isFetchingRef.current || !user?._id) return;
    isFetchingRef.current = true;
    
    setViewersLoading(true);
    try {
      const page = reset ? 1 : viewersPage;
      const response = await axiosInstance.get(`profile-analytics/${user._id}/viewers`, {
        params: { page, limit: 15, search: debouncedSearchTerm },
      });
      
      const { viewers: newViewers, pagination } = response.data.data;
      // console.log(pagination)
      if (reset) {
        setViewers(newViewers);
        setViewersPage(1);
      } else {
        setViewers(prev => [...prev, ...newViewers]);
      }
      
      setHasMoreViewers(pagination.hasNextPage);
    } catch (err) {
      console.error("Failed to fetch viewers", err);
    } finally {
      isFetchingRef.current = false;
      setViewersLoading(false);
    }
  }, [user?._id, viewersPage, debouncedSearchTerm]);

  // Initial data load
  useEffect(() => {
    fetchAnalytics();
    fetchViewers(true);
  }, []);

  // Handle search term changes
  useEffect(() => {
    if (user?._id) {
      fetchViewers(true);
    }
  }, [debouncedSearchTerm, user?._id]);

  // Handle pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
    fetchViewers(true);
  }, [fetchAnalytics, fetchViewers]);

  // Get chart data based on time range
  const getChartData = () => {
    if (!analytics?.timeSeries) return [];
    switch (timeRange) {
      case "7d":
        return analytics.timeSeries.slice(-7);
      case "365d":
        return analytics.timeSeries;
      default:
        return analytics.timeSeries.slice(-30);
    }
  };

  // Convert data for Gifted Charts
  const convertToLineData = (data) => {
    return data.map((item, index) => ({
      value: item.views,
      label: item.date,
      dataPointText: item.views.toString(),
      labelTextStyle: { color: "#9CA3AF", fontSize: 10 },
    }));
  };

  const convertToBarData = (data) => {
    return data.map((item, index) => ({
      value: item.count,
      label: item.name,
      frontColor: index % 2 === 0 ? "#F7CE45" : "#10B981",
    }));
  };

  const convertToPieData = (data) => {
    const COLORS = ["#F7CE45", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
    return data.map((item, index) => ({
      value: item.count,
      text: item.name,
      color: COLORS[index % COLORS.length],
    }));
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingScreen]}>
        <ActivityIndicator size="large" color="#F7CE45" />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.errorScreen]}>
        <Text style={styles.errorTitle}>An Error Occurred</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchAnalytics}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No data state
  if (!analytics) {
    return (
      <View style={[styles.container, styles.loadingScreen]}>
        <Text style={{ color: '#9CA3AF', fontSize: 18 }}>No analytics data available.</Text>
      </View>
    );
  }

  // Prepare data for charts
  const chartData = getChartData();
  const lineData = convertToLineData(chartData);
  const countryData = convertToBarData(analytics.locations?.countries || []);
  const cityData = convertToBarData(analytics.locations?.cities || []);
  const deviceData = convertToPieData(analytics.devices?.types || []);
  const platformData = convertToPieData(analytics.devices?.platforms || []);

  const statsData = [
    { title: "Views Today", value: analytics.summary.today, change: analytics.summary.todayVsYesterdayChange, icon: Eye },
    { title: "Last 7 Days", value: analytics.summary.last7Days, icon: TrendingUp },
    { title: "Last 30 Days", value: analytics.summary.last30Days, icon: Globe },
    { title: "Unique Viewers", value: analytics.summary.uniqueViewers, icon: Users },
    { title: "Total Views", value: analytics.summary.totalViews, icon: Monitor },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <SellerHeader navigation={navigation} message={'Profile Analytics'}/>
        <ScrollView 
          style={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#F7CE45"]}
              tintColor="#F7CE45"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <ProfileAnalyticsHeader profileData={user} cdnUrl={cdnUrl} />
          
          {/* Stats Grid */}
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              {statsData.slice(0, 2).map((stat) => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </View>
            <View style={styles.statsRow}>
              {statsData.slice(2, 4).map((stat) => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </View>
            <View style={styles.statsLastRow}>
              <StatCard {...statsData[4]} />
            </View>
          </View>

          {/* Profile Views Chart */}
          <ChartCard title="Profile Views Over Time" icon={BarChart3}>
            <TimeRangeSelector timeRange={timeRange} setTimeRange={setTimeRange} />
            
            {lineData.length > 0 ? (
              <View style={styles.chartContainer}>
                <LineChart
                  data={lineData}
                  height={220}
                  width={350}
                  areaChart
                  curved
                  dataPointsColor="#F7CE45"
                  color="#F7CE45"
                  startFillColor="rgba(247, 206, 69, 0.3)"
                  endFillColor="rgba(247, 206, 69, 0.01)"
                  startOpacity={0.3}
                  endOpacity={0.01}
                  spacing={300 / lineData.length}
                  hideRules
                  hideYAxisText
                  xAxisColor="rgba(156, 163, 175, 0.3)"
                  yAxisColor="rgba(156, 163, 175, 0.3)"
                  xAxisLabelTextStyle={{ color: "#9CA3AF", fontSize: 10 }}
                  noOfSections={4}
                  yAxisTextStyle={{ color: "#9CA3AF" }}
                />
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <BarChart3 size={40} color="#6B7280" />
                <Text style={styles.emptyStateText}>No view data for this period.</Text>
              </View>
            )}
          </ChartCard>

          {/* Top Countries Chart */}
          <ChartCard title="Top Countries" icon={Globe}>
            {countryData.length > 0 ? (
              <View style={styles.chartContainer}>
                <BarChart
                  data={countryData}
                  barWidth={24}
                  spacing={24}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: "#9CA3AF" }}
                  xAxisLabelTextStyle={{ color: "#D1D5DB" }}
                  showVerticalLines={false}
                  height={180}
                  noOfSections={3}
                  width={320}
                />
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Globe size={32} color="#6B7280" />
                <Text style={styles.emptyStateText}>No country data</Text>
              </View>
            )}
          </ChartCard>

          {/* Top Cities Chart */}
          <ChartCard title="Top Cities" icon={MapPin}>
            {cityData.length > 0 ? (
              <View style={styles.chartContainer}>
                <BarChart
                  data={cityData}
                  barWidth={24}
                  width={320}
                  spacing={24}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: "#9CA3AF" }}
                  xAxisLabelTextStyle={{ color: "#D1D5DB" }}
                  showVerticalLines={false}
                  height={180}
                  noOfSections={3}
                />
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <MapPin size={32} color="#6B7280" />
                <Text style={styles.emptyStateText}>No city data</Text>
              </View>
            )}
          </ChartCard>

          {/* Device Types Chart */}
          <ChartCard title="Device Types" icon={Smartphone}>
            {deviceData.length > 0 ? (
              <View style={styles.chartContainer}>
                <PieChart
                  data={deviceData}
                  showText
                  textColor="white"
                  radius={80}
                  textSize={11}
                  focusOnPress
                  showValuesAsLabels
                  labelsPosition="outward"
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Devices</Text>
                    </View>
                  )}
                />
              </View>
            ) : (
              <View style={[styles.emptyStateContainer, { height: 192 }]}>
                <Smartphone size={32} color="#6B7280" />
                <Text style={styles.emptyStateText}>No device data</Text>
              </View>
            )}
          </ChartCard>

          {/* Platforms Chart */}
          <ChartCard title="Platforms" icon={Monitor}>
            {platformData.length > 0 ? (
              <View style={styles.chartContainer}>
                <PieChart
                  data={platformData}
                  showText
                  textColor="white"
                  radius={80}
                  textSize={11}
                  focusOnPress
                  showValuesAsLabels
                  labelsPosition="outward"
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Platforms</Text>
                    </View>
                  )}
                />
              </View>
            ) : (
              <View style={[styles.emptyStateContainer, { height: 192 }]}>
                <Monitor size={32} color="#6B7280" />
                <Text style={styles.emptyStateText}>No platform data</Text>
              </View>
            )}
          </ChartCard>

          {/* Profile Viewers */}
          <ChartCard title="Profile Viewers" icon={Users}>
            {/* <View style={styles.searchContainer}>
              <TextInput
                placeholder="Search by username..."
                placeholderTextColor="#6B7280"
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={styles.searchInput}
              />
            </View> */}
            
            <ScrollView style={styles.viewersScrollContainer} 
        nestedScrollEnabled={true}  showsVerticalScrollIndicator={false}
         onScroll={({ nativeEvent }) => {
          // Handle load more when user reaches near bottom
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
          
          if (isCloseToBottom && hasMoreViewers) {
            fetchViewers();
          }
        }}
        scrollEventThrottle={16}
        >
              {viewers.map((viewer, index) => (
                <ViewerItem 
                  key={index} 
                  viewer={viewer} 
                  cdnUrl={cdnUrl} 
                  isLast={index === viewers.length - 1}
                />
              ))}
            </ScrollView>
            
            {viewersLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#F7CE45" size="large" />
              </View>
            )}
            
            {!hasMoreViewers && viewers.length > 0 && (
              <Text style={styles.endMessageContainer}>You've reached the end.</Text>
            )}
            
            {!viewersLoading && viewers.length === 0 && (
              <View style={styles.noViewersContainer}>
                <UserX size={40} color="#6B7280" />
                <Text style={styles.noViewersTitle}>No Viewers Found</Text>
                <Text style={styles.noViewersSubtitle}>
                  {searchTerm ? `No users matched "${searchTerm}".` : "Your profile doesn't have any viewers yet."}
                </Text>
              </View>
            )}
          </ChartCard>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

// Viewer Item Component
const ViewerItem = ({ viewer, cdnUrl, isLast }) => {
  const navigation = useNavigation();
  const viewerData = viewer.viewer;
  
  if (!viewerData) return null;

  const getRoleStyle = (role) => {
    switch (role) {
      case "seller": 
        return { 
          backgroundColor: 'rgba(16, 185, 129, 0.15)', 
          color: '#10B981', 
          borderColor: 'rgba(16, 185, 129, 0.3)' 
        };
      case "dropshipper": 
        return { 
          backgroundColor: 'rgba(247, 206, 69, 0.15)', 
          color: '#F7CE45', 
          borderColor: 'rgba(247, 206, 69, 0.3)' 
        };
      case "buyer": 
        return { 
          backgroundColor: 'rgba(139, 92, 246, 0.15)', 
          color: '#8B5CF6', 
          borderColor: 'rgba(139, 92, 246, 0.3)' 
        };
      default: 
        return { 
          backgroundColor: 'rgba(107, 114, 128, 0.15)', 
          color: '#6B7280', 
          borderColor: 'rgba(107, 114, 128, 0.3)' 
        };
    }
  };

  const roleStyle = getRoleStyle(viewerData.role);

  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate("ViewSellerProdile", { id: viewerData.userName })}
      style={[styles.viewerItem, !isLast && { marginBottom: 12 }]}
    >
      <View style={styles.viewerContent}>
        <View style={styles.viewerLeft}>
          <View style={styles.viewerImageContainer}>
            {/* {viewerData.profileURL?.key ? ( */}
              <Image
                source={{ uri: viewerData?.profileURL?.key?`${cdnUrl}${viewerData.profileURL.key}` :`${intialAvatar}${viewerData.name || "Unknown User"}`}}
                style={styles.viewerImage}
                resizeMode="cover"
              />
            {/* // ) : (
            //   <View style={styles.viewerImagePlaceholder}>
            //     <UserIcon size={24} color="#9CA3AF" />
            //   </View>
            // )} */}
            <View style={styles.viewerBadge}>
              <UserIcon size={10} color="#000" />
            </View>
          </View>
          
          <View style={styles.viewerInfo}>
            <View style={styles.viewerNameRow}>
              <Text style={styles.viewerName} numberOfLines={1}>
                {viewerData.name || "Unknown User"}
              </Text>
              {viewerData.role && (
                <View style={[styles.roleBadge, roleStyle]}>
                  <Text style={[styles.roleText, { color: roleStyle.color }]}>{viewerData.role}</Text>
                </View>
              )}
            </View>
            {/* <Text style={styles.viewerUsername}>
              @{viewerData.userName || "unknown_username"}
            </Text> */}
            <Text style={styles.viewerLastSeen}>
              Last viewed: {new Date(viewer.lastViewedAt || viewer.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.viewerStats}>
          <Text style={styles.viewerStatsLabel}>Views</Text>
          <Text style={styles.viewerStatsValue}>1</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ProfileAnalytics;
