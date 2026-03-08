import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import {
  LineChart,
  BarChart,
  PieChart,
} from 'react-native-gifted-charts';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../Utils/Colors';
import SellerHeader from '../SellerComponents/SellerForm/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const { width } = Dimensions.get('window');

const AnalyticsScreen = ({navigation}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('7D');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
const [analytics, setAnalytics] = useState(null);
    const [viewers, setViewers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('30d');
    
    // State for viewers list and infinite scroll
    const [viewersLoading, setViewersLoading] = useState(false);
    const [viewersPage, setViewersPage] = useState(1);
    const [hasMoreViewers, setHasMoreViewers] = useState(true);
  // Sample data - replace with your actual data
  const revenueData = [
    { value: 2400, label: 'Mon', frontColor: colors.primaryButtonColor },
    { value: 1800, label: 'Tue', frontColor: colors.primaryButtonColor },
    { value: 3200, label: 'Wed', frontColor: colors.primaryButtonColor },
    { value: 2800, label: 'Thu', frontColor: colors.primaryButtonColor },
    { value: 3600, label: 'Fri', frontColor: colors.primaryButtonColor },
    { value: 4200, label: 'Sat', frontColor: colors.primaryButtonColor},
    { value: 3800, label: 'Sun', frontColor: colors.primaryButtonColor },
  ];

  const ordersData = [
    { value: 120, label: 'Mon' },
    { value: 95, label: 'Tue' },
    { value: 145, label: 'Wed' },
    { value: 130, label: 'Thu' },
    { value: 165, label: 'Fri' },
    { value: 185, label: 'Sat' },
    { value: 170, label: 'Sun' },
  ];

  const categoryData = [
    { value: 35, color: '#4ECDC4', text: '35%' },
    { value: 25, color: '#45B7D1', text: '25%' },
    { value: 20, color: '#96CEB4', text: '20%' },
    { value: 12, color: '#FFEAA7', text: '12%' },
    { value: 8, color: '#DDA0DD', text: '8%' },
  ];

  const categories = [
    { name: 'Electronics', percentage: '35%', color: '#4ECDC4' },
    { name: 'Clothing', percentage: '25%', color: '#45B7D1' },
    { name: 'Home & Garden', percentage: '20%', color: '#96CEB4' },
    { name: 'Sports', percentage: '12%', color: '#FFEAA7' },
    { name: 'Books', percentage: '8%', color: '#DDA0DD' },
  ];

  const periods = ['7D', '30D', '90D', '1Y'];

  const MetricCard = ({ title, value, percentage, icon, color }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.metricPercentage}>{percentage}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );

  
/*
RESPONSIVE DESIGN INTEGRATION GUIDE:
1. Add this inside your component function:
   const { theme } = useTheme();
   const { styles: responsiveStyles } = useResponsiveScreen();

2. Replace hardcoded values:
   - fontSize: 16 → fontSize: theme.typography.medium
   - padding: 20 → padding: theme.spacing.lg
   - margin: 10 → margin: theme.spacing.sm
   - backgroundColor: '#FFFFFF' → backgroundColor: theme.colors.background

3. Use responsive components:
   - <Text> → <ResponsiveText variant="body">
   - <TouchableOpacity> (buttons) → <ResponsiveButton>
   - <TextInput> → <ResponsiveInput>

4. Add accessibility:
   - Add {...getAccessibilityProps('Label', 'Description', 'button')} to touchable elements

5. Use responsive styles:
   - style={responsiveStyles.container} for main containers
   - style={responsiveStyles.title} for titles
   - style={responsiveStyles.primaryButton} for primary buttons
*/

const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.selectedPeriodButton,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text
            style={[
              styles.periodText,
              selectedPeriod === period && styles.selectedPeriodText,
            ]}
          >
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <SellerHeader navigation={navigation} message={'Analytics'}/>
      {/* <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View> */}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <PeriodSelector />
          <View style={{flex:1,alignItems:'center',}}>
            <Text style={{color:'#777'}}> No data's for analytics</Text>
            </View>
        {/* Metric Cards */}
        {/* <View style={styles.metricsContainer}>
          <MetricCard
            title="Total Revenue"
            value="24,580"
            percentage="+12.5%"
            icon="trending-up"
            color={colors.primaryButtonColor}
          />
          <MetricCard
            title="Orders"
            value="1,245"
            percentage="+8.2%"
            icon="bag-handle"
            color={colors.primaryButtonColor}
          />
          <MetricCard
            title="Customers"
            value="892"
            percentage="+15.3%"
            icon="people"
            color={colors.primaryButtonColor}
          />
          <MetricCard
            title="Avg Order"
            value="197"
            percentage="+5.1%"
            icon="card"
            color={colors.primaryButtonColor}
          />
        </View> */}

        {/* Revenue Chart */}
        {/* <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Revenue Overview</Text>
            <TouchableOpacity>
              <Icon name="ellipsis-horizontal" size={20} color="#666666" />
            </TouchableOpacity>
          </View>
          <BarChart
            data={revenueData}
            width={width-90}
            height={220}
            backgroundColor="#2a2a2a"
            barWidth={30}
            spacing={20}
            roundedTop
            // roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: '#666666', fontSize: 12 }}
            xAxisLabelTextStyle={{ color: '#666666', fontSize: 12 }}
            noOfSections={4}
            maxValue={5000}
            stepValue={1000}
            stepHeight={40}
            labelWidth={40}
            showGradient
            gradientColor="#1a1a1a"
          />
        </View> */}

        {/* Orders Trend */}
        {/* <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Orders Trend</Text>
            <TouchableOpacity>
              <Icon name="ellipsis-horizontal" size={20} color="#666666" />
            </TouchableOpacity>
          </View>
          <LineChart
            data={ordersData}
            width={width - 120}
            height={200}
            backgroundColor="#2a2a2a"
            color={colors.primaryButtonColor}
            thickness={3}
            startFillColor={colors.primaryButtonColor}
            endFillColor="#1a1a1a"
            startOpacity={0.4}
            endOpacity={0.1}
            areaChart
            hideDataPoints={false}
            dataPointsColor={colors.primaryButtonColor}
            dataPointsRadius={6}
            curved
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: '#666666', fontSize: 12 }}
            xAxisLabelTextStyle={{ color: '#666666', fontSize: 12 }}
            rulesColor="#333333"
            showVerticalLines
            verticalLinesColor="#333333"
          />
        </View> */}

        {/* Category Breakdown */}
        {/* <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Sales by Category</Text>
            <TouchableOpacity>
              <Icon name="ellipsis-horizontal" size={20} color="#666666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.pieChartContainer}>
            <PieChart
              data={categoryData}
              donut
              radius={80}
              innerRadius={50}
              backgroundColor="#2a2a2a"
              centerLabelComponent={() => (
                <View style={styles.centerLabel}>
                  <Text style={styles.centerLabelText}>Total</Text>
                  <Text style={styles.centerLabelValue}>100%</Text>
                </View>
              )}
            />
            
            <View style={styles.legendContainer}>
              {categories.map((category, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: category.color }]} />
                  <Text style={styles.legendText}>{category.name}</Text>
                  <Text style={styles.legendPercentage}>{category.percentage}</Text>
                </View>
              ))}
            </View>
          </View>
        </View> */}

        {/* Top Products */}
        {/* <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Top Performing Products</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.topProductsList}>
            {[
              { name: 'iPhone 15 Pro', sales: '12,450', units: '45 units', trend: '+15%' },
              { name: 'Samsung Galaxy S24', sales: '8,920', units: '32 units', trend: '+8%' },
              { name: 'MacBook Air M3', sales: '7,650', units: '18 units', trend: '+22%' },
              { name: 'AirPods Pro', sales: '5,420', units: '67 units', trend: '+12%' },
            ].map((product, index) => (
              <View key={index} style={styles.productItem}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productUnits}>{product.units}</Text>
                </View>
                <View style={styles.productStats}>
                  <Text style={styles.productSales}>{product.sales}</Text>
                  <Text style={styles.productTrend}>{product.trend}</Text>
                </View>
              </View>
            ))}
          </View>
        </View> */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:colors.primaryColor
    // backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: colors.primaryButtonColor,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  selectedPeriodText: {
    color: '#1a1a1a',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    width: (width - 52) / 2,
    minHeight: 100,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryButtonColor,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 12,
    color: '#666666',
  },
  chartContainer: {
    backgroundColor: '#2a2a2a',
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pieChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerLabelText: {
    fontSize: 12,
    color: '#666666',
  },
  centerLabelValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 20,
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
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  legendPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primaryButtonColor,
    fontWeight: '600',
  },
  topProductsList: {
    gap: 12,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#333333',
    borderRadius: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  productUnits: {
    fontSize: 12,
    color: '#666666',
  },
  productStats: {
    alignItems: 'flex-end',
  },
  productSales: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  productTrend: {
    fontSize: 12,
    color:colors.primaryButtonColor,
    fontWeight: '600',
  },
});

export default AnalyticsScreen;