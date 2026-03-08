/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { 
  BarChart,
  PieChart,
  LineChart,
  StackedBarChart
} from 'react-native-gifted-charts';
import axiosInstance from '../../../Utils/Api';
import { Scroll } from 'lucide-react-native';
import { colors } from '../../../Utils/Colors';
import { AWS_CDN_URL } from '../../../Utils/aws';
import SellerHeader from '../SellerForm/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { Dropdown } from 'react-native-element-dropdown';
import { formatFollowerCount } from '../../../Utils/dateUtils';
import { intialAvatar } from '../../../Utils/Constants';

const { width: screenWidth } = Dimensions.get('window');

// Custom components

const AnalyticsHeader = ({ product }) => {
  if (!product) return null;
  
  return (
    <View style={styles.headerContainer} className=''>
      <View style={styles.headerContent}>
        <View style={styles.productImageContainer}>
          {product?.imageKey ? (
            <Image 
              source={{ uri: `${AWS_CDN_URL}${product.imageKey}` }}
              style={styles.productImage}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <FeatherIcon name="monitor" size={24} color="#999" />
            </View>
          )}
          <View style={styles.eyeBadge}>
            <FeatherIcon name="eye" size={12} color="white" />
          </View>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerSubtitle} className='text-white'>Product Analytics</Text>
          <Text style={styles.headerTitle} numberOfLines={2}>{product.productName}</Text>
        </View>
      </View>
    </View>
  );
};

const StatCard = ({ title, value, change, iconName, index }) => {
  const isPositive = change >= 0;
  return (
    <View style={styles.webStyleStatCard}>
      <View style={styles.rowBetween}>
        <View style={styles.iconBox}>
          <FeatherIcon name={iconName} size={18} color="#F7CE45" />
        </View>
        {change !== undefined && (
          <View style={[styles.miniBadge, { backgroundColor: isPositive ? '#22c55e20' : '#ef444420' }]}>
            <Text style={{ color: isPositive ? '#22c55e' : '#ef4444', fontSize: 10 }}>
              {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={styles.statValueText}>{value}</Text>
    </View>
  );
};

const ChartCard = ({ title, children, iconName }) => {
  const IconComponent = iconName === 'map-pin' ? FeatherIcon : 
                       iconName === 'globe' ? FeatherIcon : 
                       iconName === 'smartphone' ? FeatherIcon : 
                       iconName === 'monitor' ? FeatherIcon : 
                       iconName === 'users' ? FeatherIcon : 
                       iconName === 'bar-chart-2' ? FeatherIcon : Icon;
  
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={styles.chartIconContainer}>
          <IconComponent name={iconName} size={20} color="#F7CE45" />
        </View>
        <Text style={styles.chartTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

const BreakdownPieChart = ({ data }) => {
  const COLORS = ['#F7CE45', '#404040', '#2a2a2a', '#303023', '#fafafa'];
  
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <View style={styles.emptyChartIcon}>
          <FeatherIcon name="bar-chart-2" size={24} color="#999" />
        </View>
        <Text style={styles.emptyChartText}>No data available</Text>
      </View>
    );
  }
  
  const pieData = data.map((item, index) => ({
    value: item.count,
    color: COLORS[index % COLORS.length],
    
    text: `${item.name} ${Math.round((item.count / data.reduce((a, b) => a + b.count, 0)) * 100)}%`,
    textColor: '#fff',
    textBackgroundColor: 'transparent'
  }));

  return (
    <View style={{ height: 250, alignItems: 'center',justifyContent:'center', }}>
      <PieChart
        data={pieData}
        donut
        showText
        textColor="#fff"
        textBackgroundColor='#fff'
        radius={120}
        textSize={10}
        focusOnPress
        showValuesAsLabels
        showTextBackground
        textBackgroundRadius={12}
        centerLabelComponent={() => (
          <Text style={{ fontSize: 14, color: '#666' }}>Total</Text>
        )}
      />
      
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 24, paddingHorizontal: 16 }}>
        {data.map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS[index % COLORS.length], marginRight: 6 }} />
            <Text style={{ color: '#A1A1AA', fontSize: 12 }}>{item.name} ({item.count})</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const renderTrustSignals = (customer) => {
    const keys = [
      "reviewViews",
      "reviewViewDuration",
      "comparisonViews",
      "priceCheckCount",
      "imageViews",
      "reviewHelpful",
      "reviewNotHelpful",
    ];
    return keys
      .filter((key) => customer[key] > 0)
      .map((key) => (
        <View key={key} style={styles.trustSignal}>
          <Text style={styles.trustSignalValue}>{customer[key]}</Text>
          <Text style={styles.trustSignalLabel}>
            {key.replace(/([A-Z])/g, " $1").toLowerCase()}
          </Text>
        </View>
      ));
  };

const calculateTrustScore = (signals) => {
  if (!signals) return 0;

  let score = 0;
  score += (signals.reviewViews || 0) * 5;
  score += (signals.reviewViewDuration || 0) / 60 * 2;
  score += (signals.comparisonViews || 0) * 8;
  score += (signals.priceCheckCount || 0) * 3;
  score += (signals.imageViews || 0) * 2;
  score += (signals.reviewHelpful || 0) * 5;
  score -= (signals.reviewNotHelpful || 0) * 3;

  return Math.max(0, Math.min(100, Math.round(score)));
};

const EngagementStatusBadge = ({ status, onChange }) => {
  const statusOptions = [
    { value: "new", label: "New", color: "#9ca3af" }, // gray-400
    { value: "interested", label: "Interested", color: "#60a5fa" }, // blue-400
    { value: "hesitant", label: "Hesitant", color: "#facc15" }, // yellow-400
    { value: "contacted", label: "Contacted", color: "#a78bfa" }, // purple-400
    { value: "converted", label: "Converted", color: "#34d399" }, // green-400
  ];

  const currentStatus = statusOptions.find((opt) => opt.value === status) || statusOptions[0];

  return (
    <Dropdown
      style={[styles.dropdown, { borderColor: "#555",marginVertical:5  }]}
      data={statusOptions}
      labelField="label"
      valueField="value"
      value={status}
      onChange={(item) => onChange(item.value)}
      renderItem={(item) => (
        <View style={styles.item}>
          <Text style={{ color: item.color }}>{item.label}</Text>
        </View>
      )}
      placeholder={currentStatus.label}
      placeholderStyle={{ color: currentStatus.color , fontSize: 12}}
      selectedTextStyle={{ color: currentStatus.color, fontSize: 12 }}
      containerStyle={{ backgroundColor: "#222", borderColor: "#eab308" }}
      showsVerticalScrollIndicator={false}
    />
  );
};

// --- Helper
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  // --- Render checkout summary box
  const renderSummaryBox = (title, count, color) => (
    <View style={[styles.summaryBox, { borderColor: color }]}>
      <Text style={[styles.summaryTitle, { color }]}>{title}</Text>
      <Text style={[styles.summaryCount, { color }]}>{formatFollowerCount(count)}</Text>
    </View>
  );

   const tabs = [
    { id: "overview", label: "Overview", icon: "bar-chart-2" },
    { id: "customers", label: "Potential Customers", icon: "users" },
    { id: "wishlist", label: "Wishlist", icon: "heart" },
    { id: "checkouts", label: "Checkouts", icon: "shopping-cart" },
    { id: "reviews", label: "Review Analytics", icon: "star" },
  ];
const TrustSignalBadge = ({ type, value }) => {
  const getIcon = () => {
    switch (type) {
      case "reviewViews": return "eye";
      case "reviewViewDuration": return "clock";
      case "comparisonViews": return "bar-chart-2";
      case "priceCheckCount": return "credit-card";
      case "imageViews": return "image";
      default: return "activity";
    }
  };

  const formatValue = () => {
    if (type === "reviewViewDuration") {
      const mins = Math.floor(value / 60);
      return `${mins}m ${value % 60}s`;
    }
    return value;
  };

  return (
    <View style={styles.signalBadge}>
      <FeatherIcon name={getIcon()} size={12} color="#aaa" />
      <Text style={styles.signalText}>{formatValue()}</Text>
    </View>
  );
};
  
  const getRoleStyle = (role) => {
    switch (role) {
      case "admin":
        return { backgroundColor: "#ef4444", color: "#fff" };
      case "premium":
        return { backgroundColor: "#facc15", color: "#000" };
      default:
        return { backgroundColor: "#444", color: "#fff" };
    }
  };

const AnalyticsPage = ({navigation,route}) => {
  const { productId } = route.params;
  const [analytics, setAnalytics] = useState(null);
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersPage, setViewersPage] = useState(1);
  const [hasMoreViewers, setHasMoreViewers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // console.log(productId)
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [activeTab, setActiveTab] = useState("overview");
  const [checkoutData, setCheckoutData] = useState([]);
  const [wishlistUsers, setWishlistUsers] = useState([]);

  const [potentialCustomers, setPotentialCustomers] = useState([]);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerStatusFilter, setCustomerStatusFilter] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");





useEffect(() => {
  if (activeTab === "wishlist") fetchWishlistUsers();
  if (activeTab === "checkouts") fetchCheckoutData();
}, [activeTab, fetchWishlistUsers, fetchCheckoutData]);
  const fetchPotentialCustomers = useCallback(async () => {
    try {
      const response = await axiosInstance.get(
        `productInteraction/${productId}/potential-customers`,
        {
          params: {
            page: customerPage,
            status: customerStatusFilter === "all" ? undefined : customerStatusFilter,
            search: debouncedSearchTerm || undefined,
          },
        }
      );
      setPotentialCustomers(response.data.data.potentialCustomers);
    } catch (err) {
      console.error("Failed to fetch potential customers:", err);
    }
  }, [productId, customerPage, customerStatusFilter, debouncedSearchTerm]);

  useEffect(() => {
    if (activeTab === "customers") fetchPotentialCustomers();
  }, [activeTab, fetchPotentialCustomers]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/productInteraction/analytics-detail/${productId}`);
        setAnalytics(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
        setError('Could not load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [productId]);
  
  const fetchViewers = useCallback(async (page, search) => {
    if (viewersLoading) return;
    setViewersLoading(true);
    
    try {
      const response = await axiosInstance.get(`/productInteraction/analytics-detail/${productId}/viewers`, {
        params: { page, limit: 15, search }
      });
    //   console.log(response.data)/
      
      const { viewers: newViewers, pagination } = response.data.data;
      
      setViewers(prev => (page === 1 ? newViewers : [...prev, ...newViewers]));
      setHasMoreViewers(pagination.hasNextPage);
      
    } catch (err) {
      console.error('Failed to fetch viewers', err);
    } finally {
      setViewersLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchViewers(viewersPage, debouncedSearchTerm);
  }, [viewersPage, debouncedSearchTerm, fetchViewers]);

  useEffect(() => {
    setViewers([]);
    setViewersPage(1);
    setHasMoreViewers(true);
  }, [debouncedSearchTerm]);

const fetchCheckoutData = useCallback(async () => {
  try {
    const response = await axiosInstance.get(`checkout/checkout-analytics?productId=${productId}`);
    setCheckoutData(response.data.data.checkouts);
  } catch (err) { console.error(err); }
}, [productId]);

  useEffect(() => {
    fetchCheckoutData();
  }, [fetchCheckoutData]);

// Add these inside AnalyticsPage
const fetchWishlistUsers = useCallback(async () => {
  try {
    const response = await axiosInstance.get(`productInteraction/${productId}/wishlist-users`);
    setWishlistUsers(response.data.data.wishlistUsers);
  } catch (err) { console.error(err); }
}, [productId]);

  useEffect(() => {
    if (activeTab === "wishlist") {
      fetchWishlistUsers();
    }
  }, [activeTab, fetchWishlistUsers]);



  // Update engagement status
  const updateEngagementStatus = async (interactionId, status) => {
    try {
      await axiosInstance.patch(
        `productInteraction/engagement/${interactionId}`,
        { status }
      );
      // Refresh the data
      fetchPotentialCustomers();
    } catch (err) {
      console.error("Failed to update engagement status:", err);
    }
  };


  // Prepare chart data before any conditional returns (Rules of Hooks)
  const chartData = !analytics?.timeSeries ? [] : (() => {
    switch (timeRange) {
      case 'Today':
        return analytics.timeSeries.slice(-1);
      case '7d': 
        return analytics.timeSeries.slice(-7);
      case '30d':
        return analytics.timeSeries.slice(-30);
      case '365d': 
        return analytics.timeSeries.filter((_, i) => i % 12 === 0);
      default: 
        return analytics.timeSeries;
    }
  })();

  const lineData = chartData.map(item => ({
    value: item.views,
    label: item.date.split('-')[2],
    dataPointText: item.views.toString(),
    labelTextStyle: { color: '#999', fontSize: 10 },
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F7CE45" />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <FeatherIcon name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>An Error Occurred</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  
  if (!analytics) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No analytics data available.</Text>
      </View>
    );
  }

  
  // Trust signals summary
  // Add this logic inside your component before the return
const trustSignalsSummary = potentialCustomers.reduce((acc, customer) => {
  Object.entries(customer.trustSignals || {}).forEach(([key, value]) => {
    if (typeof value === "number") acc[key] = (acc[key] || 0) + value;
  });
  return acc;
}, {});

  const { summary, locations, devices }:any = analytics;
// console.log(summary)
  const statsData = [
    { title: "Views Today", value: summary?.today ?? 0, change: summary?.todayVsYesterdayChange ?? 0, iconName: "eye", color: "#F7CE45" },
    { title: "Unique Viewers", value: summary?.totalUniqueViewers ?? 0, iconName: "users" },
    { title: "Wishlist Adds", value: wishlistUsers?.length ?? 0, iconName: "heart" },
    { title: "Checkouts", value: checkoutData?.filter(c => c.status === "completed").length ?? 0, iconName: "shopping-cart" },
    { title: "Last 7 Days", value: summary?.last7Days ?? 0, iconName: "trending-up" },
    { title: "Last 30 Days", value: summary?.last30Days ?? 0, iconName: "globe" },
    { title: "Last Year", value: summary?.last365Days ?? 0, iconName: "monitor" },
    { title: "Total Views", value: summary?.totalViews ?? 0, iconName: "bar-chart-2" },
  ];

  const renderViewerItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.viewerItem}
      key={`${item.userId}-${index}`}
      onPress={()=>navigation.navigate("ViewSellerProdile",{id:item.userName})}>
      {/* {console.log(item)} */}
      <View style={styles.viewerInfo}>
        <View style={styles.viewerAvatarContainer}>
          {/* {item?.profileURL ? */}
          <Image source={{uri:item?.profileURL?`${AWS_CDN_URL}${item?.profileURL}`:`${intialAvatar}${item.name}`}} style={styles.viewerAvatar}/>
          {/* // :
          // <View style={styles.viewerAvatar}>
          //   <Text style={styles.avatarText}>
          //     {item.name?.charAt(0) || 'U'}
          //   </Text>
          // </View>} */}
          <View style={styles.onlineBadge} />
        </View>
        <View style={styles.viewerDetails}>
          <View style={styles.viewerNameRow}>
            <Text style={styles.viewerName} numberOfLines={1}>{item.name || 'Unknown User'}</Text>
            {item.role && (
              <View style={[
                styles.roleBadge,
                item.role === 'seller' ? styles.sellerBadge :
                item.role === 'dropshipper' ? styles.dropshipperBadge :
                styles.otherBadge
              ]}>
                <Text style={styles.roleText}>{item.role}</Text>
              </View>
            )}
          </View>
          <Text style={styles.viewerUsername}>@{item.userName || 'unknown'}</Text>
        </View>
      </View>
      <View style={styles.viewerStats}>
        <Text style={styles.viewerCount}>
          {item.viewCount} {item.viewCount > 1 ? 'views' : 'view'}
        </Text>
        <Text style={styles.viewerDate}>
          {new Date(item.lastViewed).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  {/* wishlist */}
   const renderUser = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          {item.profileURL ? (
            <Image
              source={{ uri: `${AWS_CDN_URL}${item.profileURL}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {item.name?.charAt(0) ||
                  item.userName?.charAt(0) ||
                  "U"}
              </Text>
            </View>
          )}

          <View>
            <Text style={styles.userName}>
              {item.name || "Anonymous User"}
            </Text>
            <Text style={styles.userHandle}>
              @{item.userName || "unknown"}
            </Text>
            {item.role && (
              <View
                style={[
                  styles.roleTag,
                  getRoleStyle(item.role),
                ]}
              >
                <Text style={styles.roleText}>{item.role}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.addedText}>
            Added on {item.addedAt ? formatDate(item.addedAt) : "Unknown date"}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCustomer = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          {item.profileURL ? (
            <Image
              source={{ uri: `${AWS_CDN_URL}${item.profileURL}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {item.name?.charAt(0) || item.userName?.charAt(0) || "U"}
              </Text>
            </View>
          )}

          <View style={{maxWidth:100}}>
            <Text style={styles.userName}>{item.name || "Anonymous User"}</Text>
            <Text style={styles.userHandle}>@{item.userName || "unknown"}</Text>
            {item.role && (
              <View style={[styles.roleTag, getRoleStyle(item.role)]}>
                <Text style={styles.roleText}>{item.role}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.trustScore}>
            {calculateTrustScore(item)}/100
          </Text>
          <Text style={styles.trustScoreLabel}>Trust Score</Text>
        </View>

        {/* Engagement Status Badge */}
      
      </View>
  {/* Replace with your own RN component */}
        <EngagementStatusBadge
          status={item.engagementStatus}
          onChange={(newStatus) => updateEngagementStatus(item.interactionId, newStatus)}
        />
      <View style={styles.trustSignalRow}>{renderTrustSignals(item)}</View>

      <View style={styles.footer}>
        <Text style={styles.lastActivity}>
          Last activity: {formatDate(item.lastTrustSignalAt)}
        </Text>
        {/* <TouchableOpacity
          onPress={() => {
            // const note = prompt("Add a note for this customer:");
            // if (note) addCustomerNote(item.interactionId, note);
          }}
        >
          <Text style={styles.addNote}>Add Note</Text>
        </TouchableOpacity> */}
      </View>

      {item.sellerNotes && item.sellerNotes.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.notesLabel}>Notes:</Text>
          {item.sellerNotes.map((note, index) => (
            <View key={index} style={styles.noteItem}>
              <Text style={styles.noteText}>
                {note.note} <Text style={styles.noteDate}>({formatDate(note.createdAt)})</Text>
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (viewersLoading) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#F7CE45" />
        </View>
      );
    }
    
    if (!hasMoreViewers && viewers.length > 0) {
      return (
        <Text style={styles.endText}>You've reached the end.</Text>
      );
    }
    
    if (!viewersLoading && viewers.length === 0) {
      return (
        <View style={styles.emptyViewers}>
          <FeatherIcon name="user-x" size={32} color="#999" />
          <Text style={styles.emptyViewersTitle}>No Viewers Found</Text>
          <Text style={styles.emptyViewersText}>
            {searchTerm ? `No users matched "${searchTerm}".` : "This product doesn't have any logged-in viewers yet."}
          </Text>
        </View>
      );
    }
    
    return null;
  };


  const citiesBarData = locations.cities.map(item => ({
    value: item.count,
    label: item.name,
    frontColor: '#F7CE45',
    topLabelComponent: () => (
      <Text style={{ color: '#000', fontSize: 10 }}>{item.count}</Text>
    ),
  }));

  const statesBarData = locations.states.map(item => ({
    value: item.count,
    label: item.name,
    frontColor: '#404040',
    topLabelComponent: () => (
      <Text style={{ color: '#000', fontSize: 10 }}>{item.count}</Text>
    ),
  }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <SellerHeader navigation={navigation} message={'Product Analyse'}/>
      <AnalyticsHeader product={analytics?.product} />

      <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabRow}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => setActiveTab(tab.id)}
          style={[
            styles.tabButton,
            activeTab === tab.id ? styles.tabActive : styles.tabInactive,
          ]}
        >
          <FeatherIcon
            name={tab.icon}
            size={16}
            color={activeTab === tab.id ? "#000" : "#aaa"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === tab.id ? styles.tabTextActive : styles.tabTextInactive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
   </ScrollView>

    {activeTab === "overview" && (<>
      {/* Stats Grid */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
      >
        {statsData.map((stat, index) => (
          <StatCard 
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            iconName={stat.iconName}
            color={stat.color}
            index={index}
          />
        ))}
      </ScrollView>

      {/* Views Over Time Chart */}
      <ChartCard title="Views Over Time" iconName="bar-chart-2">
        <View style={styles.timeRangeContainer}>
          {['Today','7d', '30d', '365d'].map(range => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.activeTimeRange
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[
                styles.timeRangeText,
                timeRange === range && styles.activeTimeRangeText
              ]}>
                {range!='Today'?
                range === '365d'? '1 Year' : `${range.replace('d', ' Days')}`:'Today'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {chartData.length > 0 ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <LineChart
              key={`line-chart-${timeRange}`}
              data={lineData}
              width={screenWidth - 80}
              height={250}
              curved
              isAnimated
              animationDuration={800}
              showVerticalLines
              spacing={lineData.length > 10 ? 25 : 40}
              initialSpacing={10}
              color="#F7CE45"
              thickness={3}
              hideRules={false}
              rulesColor="rgba(255,255,255,0.1)"
              yAxisColor="#666"
              xAxisColor="#666"
              yAxisTextStyle={{ color: '#999', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#999', fontSize: 9, width: 30 }}
              dataPointsColor="#F7CE45"
              dataPointsRadius={4}
              dataPointsHeight={4}
              dataPointsWidth={4}
              textShiftY={-8}
              textShiftX={-5}
              textColor="#F7CE45"
              textFontSize={10}
              yAxisOffset={0}
              showReferenceLine1
              referenceLine1Position={Math.max(...chartData.map(d => d.views)) / 2}
              referenceLine1Config={{
                color: 'rgba(247, 206, 69, 0.2)',
                dashWidth: 2,
                dashGap: 3,
              }}
              areaChart
              startFillColor="rgba(247, 206, 69, 0.3)"
              endFillColor="rgba(247, 206, 69, 0.05)"
              startOpacity={0.9}
              endOpacity={0.2}
            />
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <FeatherIcon name="bar-chart-2" size={32} color="#999" />
            <Text style={styles.emptyChartText}>No view data for the selected period.</Text>
          </View>
        )}
      </ChartCard>
      
      {/* Location Charts */}
      {/* <View style={styles.halfWidthCharts}> */}
        <ChartCard title="Top Cities" iconName="map-pin">
          <View style={{ height: 250,width:200 }}>
            <BarChart
              data={citiesBarData}
              frontColor="#F7CE45"
              width={screenWidth-140}
              height={200}
              yAxisThickness={0}
              xAxisThickness={0}
              showYAxisIndices
              yAxisTextStyle={{ color: '#fff', fontSize: 10 }}
              xAxisLabelTextStyle={{color:'#fff',fontSize:8}}
              noOfSections={4}
              maxValue={Math.max(...locations.cities.map(c => c.count)) * 1.2}
              isAnimated
            />
          </View>
        </ChartCard>
        
        <ChartCard title="Top States" iconName="globe">
          <View style={{ height: 250,width:200 }}>
            <BarChart
              data={statesBarData}
              frontColor="#404040"
              width={screenWidth-140}
              height={200}
              yAxisThickness={0}
              xAxisThickness={0}
              showYAxisIndices
              yAxisTextStyle={{ color: '#fff', fontSize: 10 }}
              xAxisLabelTextStyle={{color:'#fff',fontSize:8}}
              noOfSections={4}
              maxValue={Math.max(...locations.states.map(s => s.count)) * 1.2}
              isAnimated
            />
          </View>
        </ChartCard>
      {/* </View> */}

      {/* Device Breakdown */}
      {/* <View style={styles.thirdWidthCharts}> */}
        <ChartCard title="Device Types" iconName="smartphone">
          <BreakdownPieChart data={devices?.deviceTypes} />
        </ChartCard>
        <ChartCard title="Operating Systems" iconName="monitor">
          <BreakdownPieChart data={devices?.operatingSystems} />
        </ChartCard>
        <ChartCard title="Platforms" iconName="globe">
          <BreakdownPieChart data={devices?.platforms} />
        </ChartCard>
      {/* </View> */}

      {/* Audience Section */}
      <ChartCard title="Audience" iconName="users">
        <View style={styles.searchContainer}>
          <FeatherIcon name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            placeholder="Search by username..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
            placeholderTextColor="#999"
          />
        </View>
        
        <View style={styles.fixedHeightScrollContainer}>
          <ScrollView 
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
            style={styles.nestedScrollView}
          >
            {viewers.map((item, index) => (
              <View key={`viewer-${item.userId || index}`}>
                {renderViewerItem({ item, index })}
              </View>
            ))}
            {renderFooter()}
          </ScrollView>
        </View>
      </ChartCard>

      <ChartCard title="Trust Signals Summary" iconName="check-circle">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {Object.entries(trustSignalsSummary).length > 0 ? (
            Object.entries(trustSignalsSummary).map(([key, value]) => (
              <View key={key} style={{ width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ color: '#aaa', fontSize: 12, textTransform: 'capitalize', marginBottom: 4 }}>
                  {key.replace(/([A-Z])/g, " $1").trim().toLowerCase()}
                </Text>
                <Text style={{ color: '#F7CE45', fontSize: 20, fontWeight: 'bold' }}>
                  {formatFollowerCount(value)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: '#aaa', paddingVertical: 16, textAlign: 'center', width: '100%' }}>
              No trust signal data from customers yet.
            </Text>
          )}
        </View>
      </ChartCard>
      </>)}

        {activeTab === 'customers' && (
          <>
          <View style={styles.filterRow}>
            <View style={styles.customerSearchContainer}>
              <FeatherIcon name="search" size={16} color="#aaa" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.customerSearchInput}
                placeholder="Search customers..."
                placeholderTextColor="#aaa"
                value={customerSearch}
                onChangeText={setCustomerSearch}
              />
            </View>

              <Dropdown
                style={styles.dropdown}
                data={[
                  { label: 'All Status', value: 'all' },
                  { label: 'New', value: 'new' },
                  { label: 'Interested', value: 'interested' },
                  { label: 'Hesitant', value: 'hesitant' },
                  { label: 'Contacted', value: 'contacted' },
                  { label: 'Converted', value: 'converted' },
                ]}
                labelField="label"
                valueField="value"
                value={customerStatusFilter}
                onChange={item => setCustomerStatusFilter(item.value)}
                placeholder="Select status"
                placeholderStyle={{ color: '#aaa' ,  fontSize: 10 }}
                selectedTextStyle={{ color: '#fff',  fontSize: 10 }}
                 itemTextStyle={{color: '#fff'}}
                 activeColor='#333'
                containerStyle={{
                  marginBottom: 10,
                  backgroundColor: '#212121',
                  borderColor: '#FFD700',
                  borderWidth: 1,
                  borderRadius: 10,
                }}
                renderItem={item => (
    <Text style={{ color: '#fff', fontSize: 10, padding: 8 }}>
      {item.label}
    </Text>
  )}
              />
            </View>
            
            {/* Customer List */}
            <View style={{ paddingBottom: 20 }}>
              <View style={{ padding: 14 }}>
                {(() => {
                  const filteredCustomers = potentialCustomers.filter((item) => {
                    const searchLower = customerSearch.toLowerCase();
                    const matchesName = (item.name || '').toLowerCase().includes(searchLower) || 
                                        (item.userName || '').toLowerCase().includes(searchLower);
                    const matchesStatus = customerStatusFilter === 'all' || item.status === customerStatusFilter;
                    return matchesName && matchesStatus;
                  });

                  if (filteredCustomers.length === 0) {
                    return (
                      <View style={styles.emptyBox}>
                        <FeatherIcon name="user-x" size={48} color="#888" style={{ marginBottom: 12 }} />
                        <Text style={{ color: "#888", textAlign: "center" }}>
                          No potential customers found.
                        </Text>
                      </View>
                    );
                  }

                  return filteredCustomers.map((item, index) => (
                    <View key={`customer-${item.interactionId || item.userId || index}`}>
                      {renderCustomer({ item, index })}
                    </View>
                  ));
                })()}
              </View>
            </View>
          </>
        )}

      {activeTab === 'wishlist' && (
        <View style={styles.fixedHeightScrollContainer}>
          <ScrollView 
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          >
            {wishlistUsers.length === 0 ? (
              <View style={styles.emptyBox}>
                <FeatherIcon name="heart" size={48} color="#888" style={{ marginBottom: 12 }} />
                <Text style={{ color: "#888", textAlign: "center" }}>
                  No users have added this product {`\n`} to their wishlist yet.
                </Text>
              </View>
            ) : (
              wishlistUsers.map((item, index) => (
                <View key={`wishlist-${item._id || item.userId || index}`}>
                  {renderUser({ item, index })}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

    {activeTab === "checkouts" && (
  <View style={{ padding: 16 }}>
    {/* Summary Statistics */}
    <View style={styles.checkoutSummaryGrid}>
      <View style={[styles.checkoutStatBox, { borderColor: '#22c55e' }]}>
        <FeatherIcon name="check-circle" size={16} color="#22c55e" />
        <Text style={[styles.statValue, { color: '#22c55e' }]}>
          {checkoutData.filter(c => c.status === "completed").length}
        </Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
      <View style={[styles.checkoutStatBox, { borderColor: '#facc15' }]}>
        <FeatherIcon name="clock" size={16} color="#facc15" />
        <Text style={[styles.statValue, { color: '#facc15' }]}>
          {checkoutData.filter(c => c.status === "in_progress").length}
        </Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>
      <View style={[styles.checkoutStatBox, { borderColor: '#ef4444' }]}>
        <FeatherIcon name="alert-triangle" size={16} color="#ef4444" />
        <Text style={[styles.statValue, { color: '#ef4444' }]}>
          {checkoutData.filter(c => c.status === "abandoned").length}
        </Text>
        <Text style={styles.statLabel}>Abandoned</Text>
      </View>
    </View>

    {/* Checkout List */}
    {checkoutData.map((item, index) => (
      <View key={index} style={styles.customerCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.userName}>{item.name || "Guest"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#22c55e20' : '#ef444420' }]}>
            <Text style={{ color: item.status === 'completed' ? '#22c55e' : '#ef4444', fontSize: 10 }}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.checkoutInfoRow}>
          <Text style={styles.infoLabel}>Steps: {item.stepsCompleted?.length || 0}</Text>
          <Text style={styles.infoLabel}>{new Date(item.lastInteraction).toLocaleDateString()}</Text>
        </View>
      </View>
    ))}
  </View>
)}
{activeTab === "reviews" && (
  <View style={styles.chartCard}>
    <Text style={styles.chartTitle}>Review Engagement</Text>
    <View style={styles.reviewRow}>
      <Text style={styles.legendText}>Total Review Views</Text>
      <Text style={styles.statValue}>{trustSignalsSummary.reviewViews || 0}</Text>
    </View>
    <View style={styles.reviewRow}>
      <Text style={styles.legendText}>Total Time Spent</Text>
      <Text style={styles.statValue}>
        {trustSignalsSummary.reviewViewDuration
          ? `${Math.floor(trustSignalsSummary.reviewViewDuration / 60)}m ${trustSignalsSummary.reviewViewDuration % 60}s`
          : "0s"}
      </Text>
    </View>
    <View style={styles.reviewRow}>
      <Text style={styles.legendText}>Helpful Votes</Text>
      <Text style={[styles.statValue, { color: '#22c55e' }]}>{trustSignalsSummary.reviewHelpful || 0}</Text>
    </View>
    <View style={styles.reviewRow}>
      <Text style={styles.legendText}>Not Helpful Votes</Text>
      <Text style={[styles.statValue, { color: '#ef4444' }]}>{trustSignalsSummary.reviewNotHelpful || 0}</Text>
    </View>

    <Text style={[styles.chartTitle, { marginTop: 24, marginBottom: 8 }]}>Review Analytics</Text>
    <View style={styles.reviewRow}>
      <Text style={styles.legendText}>Avg. Time per Review</Text>
      <Text style={styles.statValue}>
        {trustSignalsSummary.reviewViews && trustSignalsSummary.reviewViewDuration
          ? `${Math.floor(trustSignalsSummary.reviewViewDuration / trustSignalsSummary.reviewViews / 60)}m ${Math.floor((trustSignalsSummary.reviewViewDuration / trustSignalsSummary.reviewViews) % 60)}s`
          : "0s"}
      </Text>
    </View>
    <View style={styles.reviewRow}>
      <Text style={styles.legendText}>Helpful Ratio</Text>
      <Text style={styles.statValue}>
        {(trustSignalsSummary.reviewHelpful || 0) + (trustSignalsSummary.reviewNotHelpful || 0) > 0
          ? `${(((trustSignalsSummary.reviewHelpful || 0) / ((trustSignalsSummary.reviewHelpful || 0) + (trustSignalsSummary.reviewNotHelpful || 0))) * 100).toFixed(1)}%`
          : "N/A"}
      </Text>
    </View>
    <View style={styles.reviewRow}>
      <Text style={styles.legendText}>Engagement Score</Text>
      <Text style={styles.statValue}>{calculateTrustScore(trustSignalsSummary)}/100</Text>
    </View>
    
    <Text style={[styles.chartTitle, { marginTop: 24, marginBottom: 12 }]}>Top Review Engagers</Text>
    {potentialCustomers
      .filter(c => (c.trustSignals?.reviewViews || 0) > 0)
      .sort((a, b) => (b.trustSignals?.reviewViews || 0) - (a.trustSignals?.reviewViews || 0))
      .slice(0, 5)
      .map((c, i) => (
        <View key={i} style={[styles.miniUserRow, { paddingVertical: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {c.profileURL ? (
              <Image source={{ uri: `${AWS_CDN_URL}${c.profileURL}` }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }} />
            ) : (
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                  {c.name?.charAt(0) || c.userName?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.userName}>{c.name || 'Anonymous User'}</Text>
              <Text style={{ color: '#aaa', fontSize: 10 }}>@{c.userName || 'unknown'}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.newYellowText, { fontSize: 14 }]}>{c.trustSignals.reviewViews} views</Text>
            <Text style={{ color: '#aaa', fontSize: 10 }}>
              {c.trustSignals.reviewViewDuration ? `${Math.floor(c.trustSignals.reviewViewDuration / 60)}m` : "0m"}
            </Text>
          </View>
        </View>
      ))}
    {potentialCustomers.filter(c => (c.trustSignals?.reviewViews || 0) > 0).length === 0 && (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text style={{ color: '#aaa' }}>No review engagement data available.</Text>
      </View>
    )}
  </View>
)}


        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Custom hook for debounce
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

const styles = StyleSheet.create({
  signalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.1)',
  },
  signalText: { color: '#FAFAFA', fontSize: 11, marginLeft: 4 },
  webStyleStatCard: {
    width: (screenWidth / 2) - 24, // Exact 2-column grid
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    marginRight:10,
    borderColor: 'rgba(247, 206, 69, 0.2)',
  },
  statValueText: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginTop: 4 },
  statLabel: { color: '#A1A1AA', fontSize: 12, marginTop: 8 },
  reviewDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  newYellowText: { color: '#F7CE45', fontWeight: 'bold', fontSize: 16 },
  iconBox: { padding: 8, backgroundColor: '#000', borderRadius: 8 },
  checkoutSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  checkoutStatBox: {
    flex: 0.31,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  checkoutInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 8,
  },
  infoLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  miniUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#00000040',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  // newYellowText: {
  //   color: '#F7CE45',
  //   fontWeight: 'bold',
  // },
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  headerContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    // backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor:'#333',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  productImage: {
    width: 100,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3333',
  },
  eyeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F7CE45',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    // color: 'rgba(0, 0, 0, 0.5)',
    color:'#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  statCard: {
    width: 160,
    padding: 16,
    borderRadius: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  positiveChange: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  negativeChange: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    color:'#fff'
  },
  positiveChangeText: {
    color: '#F7CE45',
  },
  negativeChangeText: {
    color: '#EF4444',
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    
    // color: 'rgba(0, 0, 0, 0.5)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statSubtext: {
    fontSize: 10,
    // color: 'rgba(0, 0, 0, 0.3)',
color:'#fff',
    marginTop: 2,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chartCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    // backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor:colors.SecondaryColor,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartIconContainer: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginRight: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyChartText: {
    // color: 'rgba(0, 0, 0, 0.5)',
    color:'#ccc'
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#fff',
  },
  tooltip: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  tooltipLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
  },
  tooltipValue: {
    fontSize: 12,
    color: '#F7CE45',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.SecondaryColor,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.SecondaryColor,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ccc',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor:colors.SecondaryColor,
  },
  emptyText: {
    fontSize: 14,
    // color: 'rgba(0, 0, 0, 0.5)',
    color:'#ccc'
  },
  timeRangeContainer: {
    flexDirection: 'row',
    // backgroundColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor:'#333',
    borderRadius: 12,
    alignItems:'center',
    justifyContent:'space-between',
    padding: 4,
    marginBottom: 16,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTimeRange: {
    backgroundColor: '#F7CE45',
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '500',
    // color: 'rgba(0, 0, 0, 0.7)',
    color:'#fff'
  },
  activeTimeRangeText: {
    color: '#000',
  },
  halfWidthCharts: {
    // flexDirection: 'row',
    backgroundColor:colors.SecondaryColor,
    paddingHorizontal: 16,
  },
  thirdWidthCharts: {
    // flexDirection: 'row',
    backgroundColor:colors.SecondaryColor,
    // flexWrap: 'wrap',
    // paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    height:50,
    // paddingHorizontal: 16,
    // paddingVertical: 12,
    backgroundColor:'#333',
    paddingLeft:10,
    color:'#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
  },
  viewerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    // backgroundColor: 'rgba(255, 255, 255, 0.7)',
    // backgroundColor:colors.SecondaryColor,
    backgroundColor:'#333',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  viewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  viewerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 42,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f7cf4b',
    // borderStyle: 'dashed',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform:'capitalize',
    color: '#f7cf4b',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F7CE45',
    borderWidth: 2,
    borderColor: 'white',
  },
  viewerDetails: {
    justifyContent: 'center',
  },
  viewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerName: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 100,
    color: '#fff',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  sellerBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  dropshipperBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  otherBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  roleText: {
    fontSize: 10,
    color:'#ffff',
    fontWeight: '600',
  },
  viewerUsername: {
    fontSize: 12,
    // color: 'rgba(0, 0, 0, 0.5)',
    color:'#ccc',
    marginTop: 2,
      maxWidth: 150,
  },
  viewerStats: {
    alignItems: 'flex-end',
  },
  viewerCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  viewerDate: {
    fontSize: 12,
    // color: 'rgba(0, 0, 0, 0.3)',
    color:'#ccc',
    marginTop: 2,
  },
  loadingFooter: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endText: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  emptyViewers: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyViewersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccc',
    marginTop: 16,
  },
  emptyViewersText: {
    fontSize: 14,
    // color: 'rgba(0, 0, 0, 0.5)',
    color:'#ccc',
    marginTop: 8,
    textAlign: 'center',
  },



  //Newly Added
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, paddingHorizontal: 12 },
  summaryBox: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  summaryTitle: { fontSize: 13, fontWeight: "600" },
  summaryCount: { fontSize: 22, fontWeight: "bold", marginTop: 8 },
  card: {
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#555",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  userHandle: { color: "#aaa", fontSize: 12 },
  statusTag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 10, fontWeight: "600", color: "#fff" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  label: { color: "#aaa", fontSize: 12 },
  value: { color: "#fff", fontSize: 14 },
  emptyBox: { padding: 20, alignItems: "center" },
  // chartTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginVertical: 12 },

    tabRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 18,
    // paddingVertical:10,

    borderBottomWidth: 1,
    borderBottomColor: "rgba(234,179,8,0.2)", // yellowHalf/20
    paddingHorizontal: 20
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: "#facc15", // newYellow
  },
  tabInactive: {
    backgroundColor: "transparent",
  },
  tabText: {
    marginLeft: 6,
    fontSize: 12,
  },
  tabTextActive: {
    color: "#000", // newBlack
    fontWeight: "600",
  },
  tabTextInactive: {
    color: "#aaa", // whiteHalf
  },


   rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar_dup: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#eab308",
    marginRight: 12,
  },
  avatarPlaceholder_dup: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#555",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#eab308",
  },
  userName_dup: { color: "#fff", fontSize: 16, fontWeight: "600" },
  userHandle_dup: { color: "#aaa", fontSize: 12, marginBottom: 4 },
  roleTag: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  roleText_dup: { fontSize: 10, fontWeight: "600" , color: '#ffd700'},
  addedText_dup: { fontSize: 12, color: "#aaa" },
  emptyBox_dup: {
    alignItems: "center",
    paddingVertical: 40,
  },

   dropdown: {
    flex: 0,
    flexBasis: 100,
    borderWidth: 1,
    borderColor: '#eab308',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 36,
    justifyContent: 'center',
    marginLeft: 8,
  },

  filterRow: { flexDirection: "row", marginBottom: 16, gap: 4, paddingHorizontal: 18 },
  customerSearchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  customerSearchInput: { flex: 1, color: "#fff", height: 36 },
  pickerContainer: {
   // flex: 1,
   width: '20%',
    backgroundColor: "#222",
    borderRadius: 8,
  },
  CustomerCard: { backgroundColor: "#222", borderRadius: 16, padding: 16, marginBottom: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: "#eab308", marginRight: 12 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#555",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#eab308",
    borderStyle: "dashed",
  },
  userName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  userHandle: { color: "#aaa", fontSize: 12, marginBottom: 4 },
  roleTag1: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  roleText1: { fontSize: 10, fontWeight: "600" },
  scoreContainer: { alignItems: "flex-end", marginLeft: 8 },
  trustScore: { color: "#facc15", fontWeight: "bold", fontSize: 16 },
  trustScoreLabel: { color: "#aaa", fontSize: 10 },
  trustSignalRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 8 },
  trustSignal: { flexDirection: "row", alignItems: "center", marginRight: 8, marginBottom: 4 },
  trustSignalValue: { color: "#fff", fontSize: 12, marginRight: 4 },
  trustSignalLabel: { color: "#aaa", fontSize: 10 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  lastActivity: { color: "#aaa", fontSize: 12 },
  addNote: { color: "#facc15", fontSize: 12 },
  notesLabel: { fontSize: 12, color: "#aaa", marginBottom: 4 },
  noteItem: { backgroundColor: "rgba(0,0,0,0.5)", padding: 6, borderRadius: 8, marginBottom: 4 },
  noteText: { color: "#aaa", fontSize: 12 },
  noteDate: { color: "#666", fontSize: 10 },
  emptyBox: { alignItems: "center", paddingVertical: 40 },
  loadMoreBtn: { backgroundColor: "#facc15", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: "center", marginVertical: 12 },
  loadMoreText: { color: "#000", fontWeight: "600" },
  fixedHeightScrollContainer: {
    height: 400,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginTop: 8,
  },
  nestedScrollView: {
    flex: 1,
  },
});

export default AnalyticsPage;
