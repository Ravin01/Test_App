import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SellerHeader from '../SellerComponents/SellerForm/Header';
import { 
  Users, 
  Clock, 
  Heart, 
  MessageCircle, 
  ShoppingBag, 
  Gavel, 
  Gift, 
  Smartphone, 
  Globe, 
  AlertCircle,
  ArrowLeft,
  Package
} from 'lucide-react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import LiveStreamViewers from './Components/LiveStreamViewers';
import axiosInstance from '../../Utils/Api';
import { AWS_CDN_URL } from '../../Utils/aws';
//import {useKeyboard} from '../Reels/hooks/useKeyboard';

const { width: screenWidth } = Dimensions.get('window');

//const {isKeyboardVisible, keyboardHeight} = useKeyboard();

// Reusable components
const StatCard = ({ title, value, icon: Icon, unit = "" }) => (
  <View style={styles.statCard}>
    <View style={styles.statHeader}>
      <Icon size={20} color="#F7CE45" />
      <Text style={styles.statTitle}>{title}</Text>
    </View>
    <Text style={styles.statValue}>
      {value}{unit}
    </Text>
  </View>
);

const ChartContainer = ({ title, icon: Icon, children, containerStyle = null }) => (
  <View style={[styles.chartContainer, containerStyle]}>
    <View style={styles.chartHeader}>
      <View style={styles.chartIcon}>
        <Icon size={20} color="#F7CE45" />
      </View>
      <Text style={styles.chartTitle}>{title}</Text>
    </View>
    <View style={styles.chartContent}>
      {children}
    </View>
  </View>
);

// Main Component
const LiveStreamAnalyticsPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { showId } = (route.params as { showId: string }) || {};
  const insets = useSafeAreaInsets();

  // console.log('[show ID:', showId);
  
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const PIE_COLORS = ['#F7CE45', '#FAFAFA', '#A1A1AA', '#FBBF24', '#F87171'];
  const BAR_COLORS = ['#F7CE45', '#FBBF24', '#F59E0B', '#D97706'];

  const fetchAnalytics = async () => {
    // console.log('fetching analytics', showId);
    try {
      const response = await axiosInstance.get(`live-interactions/${showId}/analytics`);
      setAnalytics(response.data.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
      setError(err.response?.data?.message || "Could not load stream analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [showId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds < 1) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const renderPieChart = (data) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>No data available</Text>
        </View>
      );
    }

    const pieData = data.map((item, index) => ({
      value: item.count,
      color: PIE_COLORS[index % PIE_COLORS.length],
      text: item._id,
      textColor: '#FAFAFA',
    }));

    return (
      <View style={styles.pieChartWrapper}>
        <PieChart
          data={pieData}
          showText
          textColor="#FAFAFA"
          radius={80}
          textBackgroundRadius={20}
          centerLabelComponent={() => (
            <View style={styles.pieCenterLabel}>
              <Text style={styles.pieCenterText}>Total</Text>
              <Text style={styles.pieCenterValue}>
                {data.reduce((sum, item) => sum + item.count, 0)}
              </Text>
            </View>
          )}
        />
        <View style={styles.legendContainer}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendColor, 
                  { backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }
                ]} 
              />
              <Text style={styles.legendText} numberOfLines={1}>
                {item._id}: {item.count}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderBarChart = (data) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>No data available</Text>
        </View>
      );
    }

    // Limit to top 5 countries for better mobile display
    const displayData = data.slice(0, 5);
    const maxValue = Math.max(...displayData.map(item => item.count));

    const barData = displayData.map((item, index) => ({
      value: item.count,
      label: item._id.length > 8 ? item._id.substring(0, 8) + '...' : item._id,
      frontColor: BAR_COLORS[index % BAR_COLORS.length],
      topLabelComponent: () => (
        <Text style={styles.barTopLabel}>{item.count}</Text>
      ),
    }));

    return (
      <View style={styles.barChartWrapper}>
        <BarChart
          data={barData}
          barWidth={30}
          spacing={20}
          roundedTop
          roundedBottom={false}
          frontColor="lightgray"
          noOfSections={4}
          maxValue={maxValue * 1.2} // Add some padding
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={styles.barYAxisText}
          xAxisLabelTextStyle={styles.barXAxisText}
          isAnimated
          showLine
          lineConfig={{
            color: '#F7CE45',
            thickness: 2,
            curved: true,
            hideDataPoints: true,
          }}
        />
      </View>
    );
  };

  const renderHorizontalBarChart = (data) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>No data available</Text>
        </View>
      );
    }

    const displayData = data.slice(0, 6); // Limit for mobile
    const maxValue = Math.max(...displayData.map(item => item.count));

    const barData = displayData.map((item, index) => ({
      value: item.count,
      label: item._id,
      frontColor: BAR_COLORS[index % BAR_COLORS.length],
    }));

    return (
      <View style={styles.horizontalBarWrapper}>
        <BarChart
          data={barData}
          horizontal
          barWidth={15}
          spacing={20}
          roundedTop
          roundedBottom={false}
          noOfSections={3}
          maxValue={maxValue * 1.2}
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={styles.barYAxisText}
          xAxisLabelTextStyle={styles.barXAxisText}
          showFractionalValues
          showYAxisIndices
          showVerticalLines
          verticalLinesColor="rgba(161, 161, 170, 0.3)"
          isAnimated
        />
      </View>
    );
  };

  const renderProductList = (products, metric, metricLabel) => {
    if (!products || products.length === 0) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>No {metricLabel.toLowerCase()} yet</Text>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.productList}
        showsVerticalScrollIndicator={false}
      >
        {products.map((product, index) => (
          <View key={product._id} style={styles.productItem}>
            {product.image ? (
              <Image 
                source={{ uri: `${AWS_CDN_URL}${product.image}` }}
                style={styles.productImage}
              />
            ) : (
              <View style={styles.productPlaceholder}>
                <Package size={20} color="#A1A1AA" />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={styles.productMetric}>
                {product[metric]} {metricLabel}
              </Text>
            </View>
            {index < 3 && (
              <View style={styles.productRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F7CE45" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>An Error Occurred</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAnalytics}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!analytics) return null;

  const { showInfo, summary, demographics, topProducts, viewerStats } = analytics;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#09090B" />
      <KeyboardAvoidingView
        style={{ flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 20}
      >
        <ScrollView 
          style={styles.container}
          contentContainerStyle={{
            paddingBottom: Platform.OS === 'ios' ? insets.bottom + 20 : 70
          }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#F7CE45']}
            tintColor="#F7CE45"
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* Header */}
      <SellerHeader navigation={navigation} message={'Live Analytics'}/>
      {/* <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <ArrowLeft size={20} color="#A1A1AA" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity> */}

      <View style={styles.header}>
        {showInfo?.thumbnailImage && (
          <Image
            source={{ uri: `${AWS_CDN_URL}${showInfo.thumbnailImage}` }}
            style={styles.thumbnail}
          />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.sectionLabel}>LIVE STREAM ANALYTICS</Text>
          <Text style={styles.showTitle}>{showInfo?.title}</Text>
          <Text style={styles.showStatus}>
            {showInfo?.showStatus === 'ended' 
              ? `Ended on ${new Date(showInfo?.endedAt).toLocaleDateString()}`
              : showInfo?.isLive 
                  ? 'Live Now' 
                  : `Scheduled for ${new Date(showInfo?.scheduledAt).toLocaleString()}`}
          </Text>
        </View>
      </View>

      {/* Stat Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContent}
      >
        <StatCard 
          title="Peak Viewers" 
          value={viewerStats?.peakViewers || 0} 
          icon={Users} 
        />
        <StatCard 
          title="Avg. Viewers" 
          value={viewerStats?.averageViewers || 0} 
          icon={Users} 
        />
        <StatCard 
          title="Watch Time" 
          value={formatTime(summary?.totalWatchTime)} 
          icon={Clock} 
        />
        <StatCard 
          title="Likes" 
          value={summary?.likes || 0} 
          icon={Heart} 
        />
        <StatCard 
          title="Comments" 
          value={summary?.comments || 0} 
          icon={MessageCircle} 
        />
        <StatCard 
          title="Buy Now Clicks" 
          value={summary?.buyNowClicks || 0} 
          icon={ShoppingBag} 
        />
        <StatCard 
          title="Auctions" 
          value={summary?.auctionParticipations || 0} 
          icon={Gavel} 
        />
        <StatCard 
          title="Giveaways" 
          value={summary?.giveawayEntries || 0} 
          icon={Gift} 
        />
      </ScrollView>

      {/* Charts Grid */}
      <View style={styles.chartsGrid}>
        <ChartContainer 
          title="Device Breakdown" 
          icon={Smartphone}
          containerStyle={styles.fullWidthChart}
        >
          {renderPieChart(demographics?.byDevice)}
        </ChartContainer>

        <ChartContainer 
          title="Top Countries" 
          icon={Globe}
          containerStyle={styles.fullWidthChart}
        >
          {renderHorizontalBarChart(demographics?.byCountry)}
        </ChartContainer>
      </View>

      {/* Products Section */}
      <View style={styles.productsGrid}>
        <ChartContainer title="Top Buy Now Products" icon={ShoppingBag}>
          {renderProductList(topProducts?.buyNow, 'clicks', 'Clicks')}
        </ChartContainer>

        <ChartContainer title="Top Auction Products" icon={Gavel}>
          {renderProductList(topProducts?.auction, 'participations', 'Participations')}
        </ChartContainer>

        <ChartContainer title="Top Giveaway Products" icon={Gift}>
          {renderProductList(topProducts?.giveaway, 'entries', 'Entries')}
        </ChartContainer>
      </View>

      {/* Viewers List */}
     
      <LiveStreamViewers showId={showId} />
      
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090B',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FAFAFA',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#F7CE45',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#09090B',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  backText: {
    color: '#A1A1AA',
    marginLeft: 8,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(247, 206, 69, 0.5)',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A1A1AA',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  showTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 4,
  },
  showStatus: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  statsScroll: {
    marginBottom: 20,
  },
  statsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.3)',
    borderRadius: 12,
    padding: 16,
    width: 140,
    minHeight: 100,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A1A1AA',
    marginLeft: 6,
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  chartsGrid: {
    gap: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  fullWidthChart: {
    width: '100%',
  },
  chartContainer: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.3)',
    borderRadius: 12,
    padding: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartIcon: {
    backgroundColor: '#09090B',
    padding: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  chartContent: {
    minHeight: 200,
  },
  pieChartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pieCenterLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterText: {
    fontSize: 12,
    color: '#A1A1AA',
    marginBottom: 2,
  },
  pieCenterValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F7CE45',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#FAFAFA',
    flex: 1,
  },
  barChartWrapper: {
    height: 200,
  },
  horizontalBarWrapper: {
    height: 200,
  },
  barTopLabel: {
    color: '#FAFAFA',
    fontSize: 10,
    fontWeight: '600',
  },
  barYAxisText: {
    color: '#A1A1AA',
    fontSize: 10,
  },
  barXAxisText: {
    color: '#A1A1AA',
    fontSize: 10,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 150,
  },
  placeholderText: {
    color: '#A1A1AA',
    fontSize: 14,
  },
  productsGrid: {
    gap: 12,
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  productList: {
    maxHeight: 200,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'rgba(9, 9, 11, 0.5)',
    borderRadius: 8,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  productPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FAFAFA',
    marginBottom: 2,
  },
  productMetric: {
    fontSize: 11,
    color: '#A1A1AA',
  },
  productRank: {
    backgroundColor: '#F7CE45',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#09090B',
  },
});

export default LiveStreamAnalyticsPage;
