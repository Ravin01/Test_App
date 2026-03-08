import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  Users,
  Star,
  BarChart3,
  AlertCircle,
  Play,
  Pause,
  StopCircle,
  IndianRupee,
} from 'lucide-react-native';
import SellerHeader from '../SellerForm/Header';
import {colors} from '../../../Utils/Colors';
import {AWS_CDN_URL} from '../../../Utils/aws';
import axiosInstance from '../../../Utils/Api';
import {Toast} from '../../../Utils/dateUtils';

const FlashSaleDetails = ({navigation, route}) => {
  const {flashSale: initialFlashSale} = route.params;
  const [flashSale, setFlashSale] = useState(initialFlashSale);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

//   useEffect(() => {
//     // Refresh data when component mounts
//     refreshFlashSaleData();
//   }, []);

// console.log(flashSale)
  const refreshFlashSaleData = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/flash-sale/${flashSale._id}`);
      if (response.data?.data) {
        setFlashSale(response.data.data);
      }
    } catch (error) {
      console.error('Failed to refresh flash sale data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (sale) => {
    const now = new Date();
    const startTime = new Date(sale.startTime);
    const endTime = new Date(sale.endTime);

    if (sale.status === 'stopped') {
      return {
        status: 'stopped',
        label: 'Stopped',
        color: '#FF6B6B',
        bgColor: '#FF6B6B20',
        icon: StopCircle,
      };
    }

    if (startTime > now) {
      return {
        status: 'upcoming',
        label: 'Upcoming',
        color: '#60A5FA',
        bgColor: '#60A5FA20',
        icon: Clock,
      };
    } else if (startTime <= now && endTime >= now && sale.isLive) {
      return {
        status: 'active',
        label: 'Live',
        color: '#34D399',
        bgColor: '#34D39920',
        icon: Play,
      };
    } else {
      return {
        status: 'ended',
        label: 'Ended',
        color: '#9CA3AF',
        bgColor: '#9CA3AF20',
        icon: StopCircle,
      };
    }
  };

  const handleStatusChange = async (action) => {
    const actionMessages = {
      start: 'start this flash sale',
      pause: 'pause this flash sale',
      stop: 'stop this flash sale',
    };

    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${actionMessages[action]}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm',
          onPress: () => updateFlashSaleStatus(action),
        },
      ]
    );
  };

  const updateFlashSaleStatus = async (action) => {
    setUpdatingStatus(true);
    try {
      const response = await axiosInstance.patch(`/flash-sale/${flashSale._id}/status`, {
        action,
      });

      if (response.data?.success) {
        Toast(`Flash sale ${action}ed successfully`);
        refreshFlashSaleData();
      }
    } catch (error) {
      console.error('Status update error:', error);
      Toast(`Failed to ${action} flash sale`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateMetrics = () => {
    const product = flashSale.products[0];
    if (!product) return {};

    const sellThroughRate = ((product.sold / product.initialFlashStock) * 100).toFixed(1);
    const averageOrderValue = product.sold > 0 ? (flashSale.revenue / product.sold).toFixed(2) : 0;
    const potentialRevenue = product.initialFlashStock * product.flashPrice;
    const conversionRate = product.sold > 0 ? sellThroughRate : 0;

    return {
      sellThroughRate,
      averageOrderValue,
      potentialRevenue,
      conversionRate,
    };
  };

  const statusInfo = getStatusInfo(flashSale);
  const StatusIcon = statusInfo.icon;
  const product = flashSale.products[0];
  const metrics = calculateMetrics();

  const imageUrl = product?.productId?.images?.[0]
    ? `${AWS_CDN_URL}${product.productId.images[0].key}`
    : 'https://via.placeholder.com/120';

  const renderMetricCard = (title, value, subtitle, icon, color = '#FDD122') => {
    const IconComponent = icon;
    return (
      <View style={styles.metricCard}>
        <View style={[styles.metricIcon, {backgroundColor: `${color}20`}]}>
          <IconComponent size={20} color={color} />
        </View>
        <View style={styles.metricContent}>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={styles.metricTitle}>{title}</Text>
          {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    );
  };

  const renderActionButton = () => {
    const now = new Date();
    const startTime = new Date(flashSale.startTime);
    const endTime = new Date(flashSale.endTime);

    if (flashSale.status === 'stopped') {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.startButton]}
          onPress={() => handleStatusChange('start')}
          disabled={updatingStatus}>
          <Play size={16} color="#000" />
          <Text style={styles.actionButtonText}>Restart Sale</Text>
        </TouchableOpacity>
      );
    }

    if (startTime > now) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.startButton]}
          onPress={() => handleStatusChange('start')}
          disabled={updatingStatus}>
          <Play size={16} color="#000" />
          <Text style={styles.actionButtonText}>Start Early</Text>
        </TouchableOpacity>
      );
    }

    if (flashSale.isLive && endTime > now) {
      return (
        <View style={styles.actionButtonGroup}>
          <TouchableOpacity
            style={[styles.actionButton, styles.pauseButton]}
            onPress={() => handleStatusChange('pause')}
            disabled={updatingStatus}>
            <Pause size={16} color="#fff" />
            <Text style={[styles.actionButtonText, {color: '#fff'}]}>Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.stopButton]}
            onPress={() => handleStatusChange('stop')}
            disabled={updatingStatus}>
            <StopCircle size={16} color="#fff" />
            <Text style={[styles.actionButtonText, {color: '#fff'}]}>Stop</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader navigation={navigation} message="Flash Sale Details" />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryButtonColor} />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.titleRow}>
              <Text style={styles.saleTitle}>{flashSale.title}</Text>
              <View style={[styles.statusBadge, {backgroundColor: statusInfo.bgColor}]}>
                <StatusIcon size={14} color={statusInfo.color} />
                <Text style={[styles.statusText, {color: statusInfo.color}]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>

            <View style={styles.dateRow}>
              <Text style={styles.dateText}>
                {formatDateTime(flashSale.startTime)} - {formatDateTime(flashSale.endTime)}
              </Text>
            </View>
          </View>

          {/* Revenue & Performance Metrics */}
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Performance Overview</Text>
            <View style={styles.metricsGrid}>
              {renderMetricCard(
                'Total Revenue',
                `₹${flashSale.revenue.toLocaleString()}`,
                `of ₹${metrics.potentialRevenue?.toLocaleString()} potential`,
                IndianRupee,
                '#34D399'
              )}
              {renderMetricCard(
                'Units Sold',
                flashSale.totalSold.toString(),
                `${metrics.sellThroughRate}% sell-through`,
                Package,
                '#60A5FA'
              )}
              {renderMetricCard(
                'Avg. Order Value',
                `₹${metrics.averageOrderValue}`,
                'per transaction',
                BarChart3,
                '#F59E0B'
              )}
              {renderMetricCard(
                'Conversion Rate',
                `${metrics.conversionRate}%`,
                'of stock sold',
                TrendingUp,
                '#8B5CF6'
              )}
            </View>
          </View>

          {/* Product Details */}
          <View style={styles.productSection}>
            <Text style={styles.sectionTitle}>Product Information</Text>
            <View style={styles.productCard}>
              <Image source={{uri: imageUrl}} style={styles.productImage} />
              <View style={styles.productDetails}>
                <Text style={styles.productTitle}>
                  {product?.productId?.title || 'Product Name'}
                </Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.flashPrice}>
                    ₹{product?.flashPrice?.toLocaleString()}
                  </Text>
                  <Text style={styles.originalPrice}>
                    ₹{product?.originalPrice?.toLocaleString()}
                  </Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {Math.round(((product?.originalPrice - product?.flashPrice) / product?.originalPrice) * 100)}% OFF
                    </Text>
                  </View>
                </View>
                
                <View style={styles.stockContainer}>
                  <View style={styles.stockRow}>
                    <Text style={styles.stockLabel}>Initial Stock:</Text>
                    <Text style={styles.stockValue}>{product?.initialFlashStock}</Text>
                  </View>
                  <View style={styles.stockRow}>
                    <Text style={styles.stockLabel}>Sold:</Text>
                    <Text style={[styles.stockValue, {color: '#34D399'}]}>{product?.sold}</Text>
                  </View>
                  <View style={styles.stockRow}>
                    <Text style={styles.stockLabel}>Remaining:</Text>
                    <Text style={styles.stockValue}>{product?.currentFlashStock}</Text>
                  </View>
                </View>

                {/* Stock Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${(product?.sold / product?.initialFlashStock) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {((product?.sold / product?.initialFlashStock) * 100).toFixed(1)}% Sold
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stock Status Information */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Sale Status</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <AlertCircle size={16} color="#60A5FA" />
                <Text style={styles.statusLabel}>Stock Status:</Text>
                <Text style={styles.statusValue}>
                  {flashSale.stockStatus?.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Clock size={16} color="#F59E0B" />
                <Text style={styles.statusLabel}>Sale Status:</Text>
                <Text style={styles.statusValue}>{flashSale.status?.toUpperCase()}</Text>
              </View>
              {flashSale.isLive && (
                <View style={styles.statusRow}>
                  <TrendingUp size={16} color="#34D399" />
                  <Text style={styles.statusLabel}>Currently:</Text>
                  <Text style={[styles.statusValue, {color: '#34D399'}]}>LIVE</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          {/* {renderActionButton() && (
            <View style={styles.actionSection}>
              {updatingStatus ? (
                <View style={styles.loadingAction}>
                  <ActivityIndicator size="small" color="#FDD122" />
                  <Text style={styles.loadingActionText}>Updating...</Text>
                </View>
              ) : (
                renderActionButton()
              )}
            </View>
          )} */}

          {/* Additional Info */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              Created on {formatDateTime(flashSale.createdAt)}
            </Text>
            <Text style={styles.infoText}>
              Last updated {formatDateTime(flashSale.updatedAt)}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  headerSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  saleTitle: {
    color: '#fff',
    fontSize: 24,
    textTransform:'capitalize',
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dateRow: {
    marginTop: 4,
  },
  dateText: {
    color: '#888',
    fontSize: 14,
  },
  metricsSection: {
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricTitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },
  metricSubtitle: {
    color: '#666',
    fontSize: 10,
  },
  productSection: {
    padding: 20,
  },
  productCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#333',
    marginBottom: 12,
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  flashPrice: {
    color: '#34D399',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  originalPrice: {
    color: '#888',
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: '#FF453A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stockContainer: {
    marginBottom: 12,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stockLabel: {
    color: '#888',
    fontSize: 14,
  },
  stockValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34D399',
  },
  progressText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  statusSection: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    color: '#888',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  statusValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionSection: {
    padding: 20,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
  },
  startButton: {
    backgroundColor: '#FDD122',
  },
  pauseButton: {
    backgroundColor: '#F59E0B',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#000',
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingActionText: {
    color: '#FDD122',
    marginLeft: 8,
  },
  infoSection: {
    padding: 20,
    paddingTop: 0,
  },
  infoText: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
});

export default FlashSaleDetails;