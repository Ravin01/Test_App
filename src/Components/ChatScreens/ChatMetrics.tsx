import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  DeviceEventEmitter,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import {
  LineChart,
  BarChart,
  PieChart,
} from 'react-native-gifted-charts';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../../Utils/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * 📊 ULTRA CHAT METRICS & MONITORING
 * Real-time performance tracking and analytics
 * Monitors all aspects of chat performance to ensure optimal user experience
 */

// Interfaces
interface ChatPerformanceMetrics {
  // Message delivery metrics
  messageDeliveryLatency: number[];
  messageSendSuccess: number;
  messageSendFailure: number;
  deliveryRate: number;
  
  // Socket performance
  socketConnections: number;
  socketReconnects: number;
  socketLatency: number[];
  connectionUptime: number;
  
  // UI performance
  renderTime: number[];
  scrollFPS: number[];
  memoryUsage: number[];
  cpuUsage: number[];
  
  // Network metrics
  networkSwitches: number;
  dataUsage: number;
  networkLatency: number[];
  packageLoss: number;
  
  // User engagement
  messagesPerSession: number;
  sessionDuration: number[];
  activeUsers: number;
  typingFrequency: number;
  
  // Feature usage
  reactionsUsed: number;
  mediaMessagesSent: number;
  voiceMessagesUsed: number;
  productShares: number;
  
  // Error tracking
  criticalErrors: number;
  warnings: number;
  crashReports: number;
  
  // Business metrics
  conversionRate: number;
  orderCompletions: number;
  customerSatisfaction: number;
  supportTickets: number;
}

interface RealTimeMetrics {
  currentLatency: number;
  messagesInQueue: number;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  activeChats: number;
  fps: number;
  batteryLevel: number;
  deviceTemperature: number;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
  auto_resolved?: boolean;
}

class ChatMetricsCollector {
  private metrics: ChatPerformanceMetrics = {
    messageDeliveryLatency: [],
    messageSendSuccess: 0,
    messageSendFailure: 0,
    deliveryRate: 100,
    socketConnections: 0,
    socketReconnects: 0,
    socketLatency: [],
    connectionUptime: 0,
    renderTime: [],
    scrollFPS: [],
    memoryUsage: [],
    cpuUsage: [],
    networkSwitches: 0,
    dataUsage: 0,
    networkLatency: [],
    packageLoss: 0,
    messagesPerSession: 0,
    sessionDuration: [],
    activeUsers: 0,
    typingFrequency: 0,
    reactionsUsed: 0,
    mediaMessagesSent: 0,
    voiceMessagesUsed: 0,
    productShares: 0,
    criticalErrors: 0,
    warnings: 0,
    crashReports: 0,
    conversionRate: 0,
    orderCompletions: 0,
    customerSatisfaction: 0,
    supportTickets: 0,
  };
  
  private realTimeMetrics: RealTimeMetrics = {
    currentLatency: 0,
    messagesInQueue: 0,
    connectionStatus: 'disconnected',
    memoryPressure: 'low',
    networkQuality: 'good',
    activeChats: 0,
    fps: 60,
    batteryLevel: 100,
    deviceTemperature: 25,
  };
  
  private alerts: PerformanceAlert[] = [];
  private sessionStart: number = Date.now();
  private metricsInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  
  // Thresholds for performance alerts
  private thresholds = {
    messageLatency: 1000, // 1 second
    memoryUsage: 80, // 80% of available memory
    cpuUsage: 70, // 70% CPU usage
    fps: 45, // Below 45 FPS
    networkLatency: 2000, // 2 seconds
    deliveryRate: 95, // Below 95% delivery rate
    batteryDrain: 5, // 5% per hour
  };
  
  constructor() {
    this.initializeMetricsCollection();
  }

  /**
   * 🚀 INITIALIZE METRICS COLLECTION
   */
  private async initializeMetricsCollection(): Promise<void> {
    try {
      // Load persisted metrics
      await this.loadPersistedMetrics();
      
      // Start real-time collection
      this.startRealTimeCollection();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize performance monitoring
      this.initializePerformanceMonitoring();
      
      console.log('📊 Chat metrics collector initialized');
      
    } catch (error) {
      console.error('Failed to initialize metrics collector:', error);
    }
  }

  /**
   * ⏱️ REAL-TIME METRICS COLLECTION
   */
  private startRealTimeCollection(): void {
    this.metricsInterval = setInterval(async () => {
      await this.collectRealTimeMetrics();
      this.checkPerformanceThresholds();
      this.emitMetricsUpdate();
    }, 1000); // Collect every second
  }

  private async collectRealTimeMetrics(): Promise<void> {
    try {
      // Network metrics
      const netInfo = await NetInfo.fetch();
      this.realTimeMetrics.networkQuality = this.evaluateNetworkQuality(netInfo);
      
      // Memory metrics
      if (Platform.OS === 'android') {
        const memoryInfo = await DeviceInfo.getUsedMemory();
        const totalMemory = await DeviceInfo.getTotalMemory();
        const memoryUsagePercent = (memoryInfo / totalMemory) * 100;
        
        this.realTimeMetrics.memoryPressure = this.evaluateMemoryPressure(memoryUsagePercent);
        this.metrics.memoryUsage.push(memoryUsagePercent);
      }
      
      // Battery metrics
      const batteryLevel = await DeviceInfo.getBatteryLevel();
      this.realTimeMetrics.batteryLevel = batteryLevel * 100;
      
      // Device temperature (if available)
      try {
        const temp = await DeviceInfo.getPowerState();
        // this.realTimeMetrics.deviceTemperature = temp.temperature || 25;
      } catch (error) {
        // Temperature not available on all devices
      }
      
      // Trim arrays to prevent memory issues
      this.trimMetricsArrays();
      
    } catch (error) {
      console.warn('Error collecting real-time metrics:', error);
    }
  }

  /**
   * 🎯 EVENT LISTENERS SETUP
   */
  private setupEventListeners(): void {
    // Message delivery tracking
    DeviceEventEmitter.addListener('messageDelivered', (data) => {
      const latency = Date.now() - data.timestamp;
      this.metrics.messageDeliveryLatency.push(latency);
      this.metrics.messageSendSuccess++;
      this.realTimeMetrics.currentLatency = latency;
      
      this.updateDeliveryRate();
    });
    
    DeviceEventEmitter.addListener('messageDeliveryFailed', (data) => {
      this.metrics.messageSendFailure++;
      this.updateDeliveryRate();
      
      this.createAlert('error', 'Message delivery failed', 'messageSendFailure', this.metrics.messageSendFailure, 0);
    });
    
    // Socket connection tracking
    DeviceEventEmitter.addListener('chatConnected', () => {
      this.metrics.socketConnections++;
      this.realTimeMetrics.connectionStatus = 'connected';
    });
    
    DeviceEventEmitter.addListener('chatDisconnected', () => {
      this.realTimeMetrics.connectionStatus = 'disconnected';
    });
    
    DeviceEventEmitter.addListener('chatReconnecting', () => {
      this.metrics.socketReconnects++;
      this.realTimeMetrics.connectionStatus = 'reconnecting';
    });
    
    // User engagement tracking
    DeviceEventEmitter.addListener('messageReceived', () => {
      this.metrics.messagesPerSession++;
    });
    
    DeviceEventEmitter.addListener('reactionAdded', () => {
      this.metrics.reactionsUsed++;
    });
    
    DeviceEventEmitter.addListener('mediaMessageSent', () => {
      this.metrics.mediaMessagesSent++;
    });
    
    DeviceEventEmitter.addListener('voiceMessageSent', () => {
      this.metrics.voiceMessagesUsed++;
    });
    
    DeviceEventEmitter.addListener('productShared', () => {
      this.metrics.productShares++;
    });
    
    // Performance tracking
    DeviceEventEmitter.addListener('renderPerformance', (data) => {
      this.metrics.renderTime.push(data.renderTime);
      this.realTimeMetrics.fps = data.fps;
    });
    
    DeviceEventEmitter.addListener('scrollPerformance', (data) => {
      this.metrics.scrollFPS.push(data.fps);
    });
    
    // Error tracking
    DeviceEventEmitter.addListener('chatError', (error) => {
      if (error.level === 'critical') {
        this.metrics.criticalErrors++;
      } else if (error.level === 'warning') {
        this.metrics.warnings++;
      }
      
      this.createAlert(error.level, error.message, error.metric, error.value, error.threshold);
    });
    
    // Business metrics
    DeviceEventEmitter.addListener('orderCompleted', () => {
      this.metrics.orderCompletions++;
    });
    
    DeviceEventEmitter.addListener('supportTicketCreated', () => {
      this.metrics.supportTickets++;
    });
  }

  /**
   * ⚡ PERFORMANCE MONITORING
   */
  private initializePerformanceMonitoring(): void {
    // FPS monitoring
    this.startFPSMonitoring();
    
    // Memory pressure monitoring
    this.startMemoryMonitoring();
    
    // Network monitoring
    this.startNetworkMonitoring();
  }

  private startFPSMonitoring(): void {
    let frameCount = 0;
    let lastTime = Date.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = Date.now();
      
      if (currentTime - lastTime >= 1000) {
        this.realTimeMetrics.fps = frameCount;
        
        if (frameCount < this.thresholds.fps) {
          this.createAlert('warning', `Low FPS detected: ${frameCount}`, 'fps', frameCount, this.thresholds.fps);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  private startMemoryMonitoring(): void {
    setInterval(async () => {
      if (Platform.OS === 'android') {
        try {
          const memoryInfo = await DeviceInfo.getUsedMemory();
          const totalMemory = await DeviceInfo.getTotalMemory();
          const memoryUsagePercent = (memoryInfo / totalMemory) * 100;
          
          if (memoryUsagePercent > this.thresholds.memoryUsage) {
            this.createAlert('warning', `High memory usage: ${memoryUsagePercent.toFixed(1)}%`, 'memoryUsage', memoryUsagePercent, this.thresholds.memoryUsage);
          }
          
        } catch (error) {
          console.warn('Memory monitoring error:', error);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  private startNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        const latency = state.details?.rtt || 0;
        this.metrics.networkLatency.push(latency);
        
        if (latency > this.thresholds.networkLatency) {
          this.createAlert('warning', `High network latency: ${latency}ms`, 'networkLatency', latency, this.thresholds.networkLatency);
        }
      }
    });
  }

  /**
   * 🚨 ALERT SYSTEM
   */
  private createAlert(
    type: PerformanceAlert['type'],
    message: string,
    metric: string,
    value: number,
    threshold: number
  ): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
      metric,
      value,
      threshold,
    };
    
    this.alerts.unshift(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }
    
    // Emit alert for real-time handling
    DeviceEventEmitter.emit('performanceAlert', alert);
    
    console.warn(`🚨 Performance Alert [${type.toUpperCase()}]: ${message}`);
  }

  /**
   * 📈 METRICS CALCULATIONS
   */
  private updateDeliveryRate(): void {
    const total = this.metrics.messageSendSuccess + this.metrics.messageSendFailure;
    if (total > 0) {
      this.metrics.deliveryRate = (this.metrics.messageSendSuccess / total) * 100;
      
      if (this.metrics.deliveryRate < this.thresholds.deliveryRate) {
        this.createAlert('error', `Low delivery rate: ${this.metrics.deliveryRate.toFixed(1)}%`, 'deliveryRate', this.metrics.deliveryRate, this.thresholds.deliveryRate);
      }
    }
  }

  private checkPerformanceThresholds(): void {
    // Check average latency
    if (this.metrics.messageDeliveryLatency.length > 0) {
      const avgLatency = this.metrics.messageDeliveryLatency.reduce((a, b) => a + b, 0) / this.metrics.messageDeliveryLatency.length;
      
      if (avgLatency > this.thresholds.messageLatency) {
        this.createAlert('warning', `High message latency: ${avgLatency.toFixed(0)}ms`, 'messageLatency', avgLatency, this.thresholds.messageLatency);
      }
    }
  }

  private evaluateNetworkQuality(netInfo: any): RealTimeMetrics['networkQuality'] {
    if (!netInfo.isConnected) return 'poor';
    
    if (netInfo.type === 'wifi') return 'excellent';
    if (netInfo.details?.cellularGeneration === '5g') return 'excellent';
    if (netInfo.details?.cellularGeneration === '4g') return 'good';
    if (netInfo.details?.cellularGeneration === '3g') return 'fair';
    return 'poor';
  }

  private evaluateMemoryPressure(memoryUsagePercent: number): RealTimeMetrics['memoryPressure'] {
    if (memoryUsagePercent > 90) return 'critical';
    if (memoryUsagePercent > 75) return 'high';
    if (memoryUsagePercent > 50) return 'medium';
    return 'low';
  }

  private trimMetricsArrays(): void {
    const maxArraySize = 1000;
    
    Object.keys(this.metrics).forEach(key => {
      const value = this.metrics[key as keyof ChatPerformanceMetrics];
      if (Array.isArray(value) && value.length > maxArraySize) {
        (this.metrics[key as keyof ChatPerformanceMetrics] as any) = value.slice(-maxArraySize);
      }
    });
  }

  private emitMetricsUpdate(): void {
    DeviceEventEmitter.emit('metricsUpdate', {
      metrics: this.metrics,
      realTime: this.realTimeMetrics,
      alerts: this.alerts.slice(0, 10), // Latest 10 alerts
    });
  }

  /**
   * 💾 PERSISTENCE
   */
  private async loadPersistedMetrics(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('chat_metrics');
      if (data) {
        const persistedMetrics = JSON.parse(data);
        this.metrics = { ...this.metrics, ...persistedMetrics };
      }
    } catch (error) {
      console.warn('Failed to load persisted metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem('chat_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to save metrics:', error);
    }
  }

  /**
   * 🎯 PUBLIC API
   */
  
  getMetrics(): ChatPerformanceMetrics {
    return { ...this.metrics };
  }
  
  getRealTimeMetrics(): RealTimeMetrics {
    return { ...this.realTimeMetrics };
  }
  
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }
  
  resetMetrics(): void {
    this.metrics = {
      messageDeliveryLatency: [],
      messageSendSuccess: 0,
      messageSendFailure: 0,
      deliveryRate: 100,
      socketConnections: 0,
      socketReconnects: 0,
      socketLatency: [],
      connectionUptime: 0,
      renderTime: [],
      scrollFPS: [],
      memoryUsage: [],
      cpuUsage: [],
      networkSwitches: 0,
      dataUsage: 0,
      networkLatency: [],
      packageLoss: 0,
      messagesPerSession: 0,
      sessionDuration: [],
      activeUsers: 0,
      typingFrequency: 0,
      reactionsUsed: 0,
      mediaMessagesSent: 0,
      voiceMessagesUsed: 0,
      productShares: 0,
      criticalErrors: 0,
      warnings: 0,
      crashReports: 0,
      conversionRate: 0,
      orderCompletions: 0,
      customerSatisfaction: 0,
      supportTickets: 0,
    };
    
    this.alerts = [];
    this.sessionStart = Date.now();
    this.saveMetrics();
  }
  
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      alerts: this.alerts,
      sessionDuration: Date.now() - this.sessionStart,
      timestamp: Date.now(),
    }, null, 2);
  }
  
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    DeviceEventEmitter.removeAllListeners();
    this.saveMetrics();
    
    console.log('📊 Chat metrics collector destroyed');
  }
}

/**
 * 📊 METRICS DASHBOARD COMPONENT
 */
interface MetricsDashboardProps {
  visible: boolean;
  onClose: () => void;
}

export const ChatMetricsDashboard: React.FC<MetricsDashboardProps> = ({
  visible,
  onClose,
}) => {
  const [metrics, setMetrics] = useState<ChatPerformanceMetrics | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'performance' | 'network' | 'alerts'>('overview');
  
  const dashboardOpacity = useSharedValue(0);
  
  useEffect(() => {
    if (visible) {
      dashboardOpacity.value = withTiming(1);
      
      // Listen for metrics updates
      const listener = DeviceEventEmitter.addListener('metricsUpdate', (data) => {
        setMetrics(data.metrics);
        setRealTimeMetrics(data.realTime);
        setAlerts(data.alerts);
      });
      
      return () => listener.remove();
    } else {
      dashboardOpacity.value = withTiming(0);
    }
  }, [visible]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: dashboardOpacity.value,
    transform: [
      {
        translateY: interpolate(dashboardOpacity.value, [0, 1], [50, 0]),
      },
    ],
  }));
  
  if (!visible || !metrics || !realTimeMetrics) return null;
  
  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };
  
  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Real-time Status Cards */}
      <View style={styles.statusGrid}>
        <View style={[styles.statusCard, { borderLeftColor: getStatusColor(realTimeMetrics.connectionStatus) }]}>
          <Text style={styles.statusLabel}>Connection</Text>
          <Text style={styles.statusValue}>{realTimeMetrics.connectionStatus}</Text>
        </View>
        
        <View style={[styles.statusCard, { borderLeftColor: getLatencyColor(realTimeMetrics.currentLatency) }]}>
          <Text style={styles.statusLabel}>Latency</Text>
          <Text style={styles.statusValue}>{realTimeMetrics.currentLatency}ms</Text>
        </View>
        
        <View style={[styles.statusCard, { borderLeftColor: getQualityColor(realTimeMetrics.networkQuality) }]}>
          <Text style={styles.statusLabel}>Network</Text>
          <Text style={styles.statusValue}>{realTimeMetrics.networkQuality}</Text>
        </View>
        
        <View style={[styles.statusCard, { borderLeftColor: getFPSColor(realTimeMetrics.fps) }]}>
          <Text style={styles.statusLabel}>FPS</Text>
          <Text style={styles.statusValue}>{realTimeMetrics.fps}</Text>
        </View>
      </View>
      
      {/* Key Metrics */}
      <View style={styles.metricsCard}>
        <Text style={styles.cardTitle}>Key Performance Indicators</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{metrics.deliveryRate.toFixed(1)}%</Text>
            <Text style={styles.kpiLabel}>Delivery Rate</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{metrics.messagesPerSession}</Text>
            <Text style={styles.kpiLabel}>Messages/Session</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{metrics.socketReconnects}</Text>
            <Text style={styles.kpiLabel}>Reconnects</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{alerts.filter(a => a.type === 'critical').length}</Text>
            <Text style={styles.kpiLabel}>Critical Alerts</Text>
          </View>
        </View>
      </View>
      
      {/* Latency Chart */}
      {metrics.messageDeliveryLatency.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Message Delivery Latency</Text>
      <LineChart
  data={metrics.messageDeliveryLatency.slice(-10).map((value, index) => ({
    value: value,
    label: `${index + 1}`,
    dataPointText: `${value}`,
  }))}
  width={SCREEN_WIDTH - 60}
  height={200}
  color="#2296F3"
  thickness={2}
  isAnimated
  curved
  startFillColor="rgba(34, 150, 243, 0.2)"
  endFillColor="rgba(34, 150, 243, 0.05)"
  startOpacity={0.8}
  endOpacity={0.1}
  areaChart
  yAxisTextStyle={{color: chartConfig.color()}}
  xAxisLabelTextStyle={{color: chartConfig.color()}}
  hideRules={false}
  rulesColor={chartConfig.color(0.2)}
  rulesType="solid"
  initialSpacing={10}
  yAxisColor={chartConfig.color(0.2)}
  xAxisColor={chartConfig.color(0.2)}
  noOfSections={4}
  yAxisOffset={Math.min(...metrics.messageDeliveryLatency.slice(-10))}
  showVerticalLines
  verticalLinesColor={chartConfig.color(0.2)}
  verticalLinesStrokeDashArray={[2, 3]}
/>
        </View>
      )}
    </ScrollView>
  );
  
  const renderPerformanceTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Performance Overview */}
      <View style={styles.metricsCard}>
        <Text style={styles.cardTitle}>Performance Overview</Text>
        <View style={styles.performanceGrid}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Memory Pressure</Text>
            <View style={[styles.performanceBar, { backgroundColor: getMemoryColor(realTimeMetrics.memoryPressure) }]}>
              <Text style={styles.performanceValue}>{realTimeMetrics.memoryPressure}</Text>
            </View>
          </View>
          
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Battery Level</Text>
            <View style={[styles.performanceBar, { backgroundColor: getBatteryColor(realTimeMetrics.batteryLevel) }]}>
              <Text style={styles.performanceValue}>{realTimeMetrics.batteryLevel.toFixed(0)}%</Text>
            </View>
          </View>
          
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Active Chats</Text>
            <View style={styles.performanceBar}>
              <Text style={styles.performanceValue}>{realTimeMetrics.activeChats}</Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* FPS Chart */}
      {metrics.scrollFPS.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Scroll Performance (FPS)</Text>
        <LineChart
  data={metrics.scrollFPS.slice(-10).map((value, index) => ({
    value: value,
    label: `${index + 1}`,
    dataPointText: `${value}`,
  }))}
  width={SCREEN_WIDTH - 60}
  height={200}
  color="#4CAF50"
  thickness={2}
  isAnimated
  curved
  startFillColor="rgba(76, 175, 80, 0.2)"
  endFillColor="rgba(76, 175, 80, 0.05)"
  startOpacity={0.8}
  endOpacity={0.1}
  areaChart
  yAxisTextStyle={{color: chartConfig.color()}}
  xAxisLabelTextStyle={{color: chartConfig.color()}}
  hideRules={false}
  rulesColor={chartConfig.color(0.2)}
  rulesType="solid"
  initialSpacing={10}
  yAxisColor={chartConfig.color(0.2)}
  xAxisColor={chartConfig.color(0.2)}
  noOfSections={4}
  yAxisOffset={Math.min(...metrics.scrollFPS.slice(-10))}
  showVerticalLines
  verticalLinesColor={chartConfig.color(0.2)}
  verticalLinesStrokeDashArray={[2, 3]}
/>
        </View>
      )}
      
      {/* Memory Usage Chart */}
      {metrics.memoryUsage.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Memory Usage (%)</Text>
        <LineChart
  data={metrics.memoryUsage.slice(-10).map((value, index) => ({
    value: value,
    label: `${index + 1}`,
    dataPointText: `${value}`,
  }))}
  width={SCREEN_WIDTH - 60}
  height={200}
  color="#FF9800"
  thickness={2}
  isAnimated
  curved
  startFillColor="rgba(255, 152, 0, 0.2)"
  endFillColor="rgba(255, 152, 0, 0.05)"
  startOpacity={0.8}
  endOpacity={0.1}
  areaChart
  yAxisTextStyle={{color: chartConfig.color()}}
  xAxisLabelTextStyle={{color: chartConfig.color()}}
  hideRules={false}
  rulesColor={chartConfig.color(0.2)}
  rulesType="solid"
  initialSpacing={10}
  yAxisColor={chartConfig.color(0.2)}
  xAxisColor={chartConfig.color(0.2)}
  noOfSections={4}
  yAxisOffset={Math.min(...metrics.memoryUsage.slice(-10))}
  showVerticalLines
  verticalLinesColor={chartConfig.color(0.2)}
  verticalLinesStrokeDashArray={[2, 3]}
/>
        </View>
      )}
    </ScrollView>
  );
  
  const renderNetworkTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Network Status */}
      <View style={styles.metricsCard}>
        <Text style={styles.cardTitle}>Network Status</Text>
        <View style={styles.networkGrid}>
          <View style={styles.networkItem}>
            <Text style={styles.networkLabel}>Quality</Text>
            <View style={[styles.networkIndicator, { backgroundColor: getQualityColor(realTimeMetrics.networkQuality) }]} />
            <Text style={styles.networkValue}>{realTimeMetrics.networkQuality}</Text>
          </View>
          
          <View style={styles.networkItem}>
            <Text style={styles.networkLabel}>Switches</Text>
            <Text style={styles.networkValue}>{metrics.networkSwitches}</Text>
          </View>
          
          <View style={styles.networkItem}>
            <Text style={styles.networkLabel}>Data Usage</Text>
            <Text style={styles.networkValue}>{(metrics.dataUsage / 1024 / 1024).toFixed(1)} MB</Text>
          </View>
        </View>
      </View>
      
      {/* Network Latency Chart */}
      {metrics.networkLatency.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Network Latency (ms)</Text>
         <LineChart
  data={metrics.networkLatency.slice(-10).map((value, index) => ({
    value: value,
    label: `${index + 1}`,
    dataPointText: `${value}`,
  }))}
  width={SCREEN_WIDTH - 60}
  height={200}
  color="#9C27B0"
  thickness={2}
  isAnimated
  curved
  startFillColor="rgba(156, 39, 176, 0.2)"
  endFillColor="rgba(156, 39, 176, 0.05)"
  startOpacity={0.8}
  endOpacity={0.1}
  areaChart
  yAxisTextStyle={{color: chartConfig.color()}}
  xAxisLabelTextStyle={{color: chartConfig.color()}}
  hideRules={false}
  rulesColor={chartConfig.color(0.2)}
  rulesType="solid"
  initialSpacing={10}
  yAxisColor={chartConfig.color(0.2)}
  xAxisColor={chartConfig.color(0.2)}
  noOfSections={4}
  yAxisOffset={Math.min(...metrics.networkLatency.slice(-10))}
  showVerticalLines
  verticalLinesColor={chartConfig.color(0.2)}
  verticalLinesStrokeDashArray={[2, 3]}
/>
        </View>
      )}
    </ScrollView>
  );
  
  const renderAlertsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.alertsContainer}>
        <Text style={styles.cardTitle}>Performance Alerts</Text>
        {alerts.length === 0 ? (
          <View style={styles.noAlertsContainer}>
            <Text style={styles.noAlertsText}>🎉 No performance issues detected!</Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <View key={alert.id} style={[styles.alertItem, { borderLeftColor: getAlertColor(alert.type) }]}>
              <View style={styles.alertHeader}>
                <Text style={[styles.alertType, { color: getAlertColor(alert.type) }]}>
                  {alert.type.toUpperCase()}
                </Text>
                <Text style={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertDetails}>
                {alert.metric}: {alert.value} (threshold: {alert.threshold})
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
  
  return (
    <Reanimated.View style={[styles.dashboard, animatedStyle]}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat Performance Dashboard</Text>
        <Text style={styles.subtitle}>Real-time metrics and monitoring</Text>
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'performance', label: 'Performance' },
          { key: 'network', label: 'Network' },
          { key: 'alerts', label: 'Alerts' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, selectedTab === tab.key && styles.activeTab]}
            onPress={() => setSelectedTab(tab.key as any)}
          >
            <Text style={[styles.tabText, selectedTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Tab Content */}
      {selectedTab === 'overview' && renderOverviewTab()}
      {selectedTab === 'performance' && renderPerformanceTab()}
      {selectedTab === 'network' && renderNetworkTab()}
      {selectedTab === 'alerts' && renderAlertsTab()}
    </Reanimated.View>
  );
};

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'connected': return '#4CAF50';
    case 'reconnecting': return '#FF9800';
    case 'disconnected': return '#F44336';
    default: return '#757575';
  }
};

const getLatencyColor = (latency: number) => {
  if (latency < 100) return '#4CAF50';
  if (latency < 500) return '#FF9800';
  return '#F44336';
};

const getQualityColor = (quality: string) => {
  switch (quality) {
    case 'excellent': return '#4CAF50';
    case 'good': return '#8BC34A';
    case 'fair': return '#FF9800';
    case 'poor': return '#F44336';
    default: return '#757575';
  }
};

const getFPSColor = (fps: number) => {
  if (fps >= 55) return '#4CAF50';
  if (fps >= 45) return '#FF9800';
  return '#F44336';
};

const getMemoryColor = (pressure: string) => {
  switch (pressure) {
    case 'low': return '#4CAF50';
    case 'medium': return '#8BC34A';
    case 'high': return '#FF9800';
    case 'critical': return '#F44336';
    default: return '#757575';
  }
};

const getBatteryColor = (level: number) => {
  if (level > 50) return '#4CAF50';
  if (level > 20) return '#FF9800';
  return '#F44336';
};

const getAlertColor = (type: string) => {
  switch (type) {
    case 'warning': return '#FF9800';
    case 'error': return '#FF5722';
    case 'critical': return '#F44336';
    default: return '#757575';
  }
};

const styles = StyleSheet.create({
  dashboard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f5f5',
    zIndex: 1000,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryButtonColor,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: colors.primaryButtonColor,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  
  // Status Cards
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  statusCard: {
    flex: 1,
    minWidth: SCREEN_WIDTH / 2 - 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
  
  // Metrics Cards
  metricsCard: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kpiItem: {
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryButtonColor,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Charts
  chartCard: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  
  // Performance Tab
  performanceGrid: {
    gap: 12,
  },
  performanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  performanceLabel: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  performanceBar: {
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Network Tab
  networkGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  networkItem: {
    alignItems: 'center',
  },
  networkLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  networkIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  networkValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  
  // Alerts Tab
  alertsContainer: {
    padding: 10,
  },
  noAlertsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  noAlertsText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  alertItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertType: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertTime: {
    fontSize: 11,
    color: '#666',
  },
  alertMessage: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  alertDetails: {
    fontSize: 12,
    color: '#666',
  },
});

// Export singleton instance
export const ChatMetrics = new ChatMetricsCollector();
export { ChatMetricsDashboard };