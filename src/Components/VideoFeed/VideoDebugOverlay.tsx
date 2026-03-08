/**
 * 🚀 REAL-TIME PERFORMANCE DEBUG OVERLAY
 * CEO Priority: Live performance monitoring and diagnostics
 * Only visible in development with performance metrics
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { 
  VideoData, 
  PlayerMetrics, 
  MemoryState, 
  NetworkState,
  DeviceCapabilities,
} from './VideoTypes';
import { PERFORMANCE_REQUIREMENTS } from './VideoConstants';
import PlatformDetection from './PlatformDetection';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoDebugOverlayProps {
  video?: VideoData;
  playerMetrics?: PlayerMetrics;
  memoryState?: MemoryState;
  networkState?: NetworkState;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  testID?: string;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  metric?: string;
  threshold?: number;
  actual?: number;
}

export const VideoDebugOverlay: React.FC<VideoDebugOverlayProps> = ({
  video,
  playerMetrics,
  memoryState,
  networkState,
  isVisible = false,
  onToggleVisibility,
  testID,
}) => {
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [performanceAlerts, setPerformanceAlerts] = useState<PerformanceAlert[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  // Device capabilities
  const capabilities = useMemo(() => PlatformDetection.getCapabilities(), []);

  // Performance status indicators
  const performanceStatus = useMemo(() => {
    const status = {
      frameRate: 'good' as 'good' | 'warning' | 'critical',
      memory: 'good' as 'good' | 'warning' | 'critical',
      network: 'good' as 'good' | 'warning' | 'critical',
      overall: 'good' as 'good' | 'warning' | 'critical',
    };

    // Check frame rate
    const currentFPS = playerMetrics?.averageFrameRate || 60;
    if (currentFPS < PERFORMANCE_REQUIREMENTS.P0_CRITICAL.frameRate.minimum) {
      status.frameRate = 'critical';
    } else if (currentFPS < PERFORMANCE_REQUIREMENTS.P0_CRITICAL.frameRate.target) {
      status.frameRate = 'warning';
    }

    // Check memory pressure
    if (memoryState?.pressureLevel === 'critical') {
      status.memory = 'critical';
    } else if (memoryState?.pressureLevel === 'warning') {
      status.memory = 'warning';
    }

    // Check network quality
    if (networkState?.quality === 'poor' || networkState?.quality === 'offline') {
      status.network = 'critical';
    } else if (networkState?.quality === 'fair') {
      status.network = 'warning';
    }

    // Overall status (worst of all metrics)
    if (status.frameRate === 'critical' || status.memory === 'critical' || status.network === 'critical') {
      status.overall = 'critical';
    } else if (status.frameRate === 'warning' || status.memory === 'warning' || status.network === 'warning') {
      status.overall = 'warning';
    }

    return status;
  }, [playerMetrics, memoryState, networkState]);

  // Monitor for performance violations
  useEffect(() => {
    if (!playerMetrics && !memoryState) return;

    const newAlerts: PerformanceAlert[] = [];

    // Time to first frame violation
    if (playerMetrics?.timeToFirstFrame && playerMetrics.timeToFirstFrame > PERFORMANCE_REQUIREMENTS.P0_CRITICAL.timeToFirstFrame) {
      newAlerts.push({
        id: `ttff_${Date.now()}`,
        type: 'critical',
        message: `Time to first frame exceeded target`,
        timestamp: Date.now(),
        metric: 'timeToFirstFrame',
        threshold: PERFORMANCE_REQUIREMENTS.P0_CRITICAL.timeToFirstFrame,
        actual: playerMetrics.timeToFirstFrame,
      });
    }

    // Memory pressure alert
    if (memoryState?.pressureLevel === 'critical') {
      newAlerts.push({
        id: `memory_${Date.now()}`,
        type: 'critical',
        message: `Critical memory pressure detected`,
        timestamp: Date.now(),
        metric: 'memoryPressure',
      });
    }

    // Stall rate violation
    if (playerMetrics?.stallEvents && playerMetrics.stallEvents > 0) {
      const stallRate = (playerMetrics.totalStallTime || 0) / (playerMetrics.currentTime || 1) * 100;
      if (stallRate > PERFORMANCE_REQUIREMENTS.P0_CRITICAL.stallRate) {
        newAlerts.push({
          id: `stall_${Date.now()}`,
          type: 'warning',
          message: `High stall rate detected`,
          timestamp: Date.now(),
          metric: 'stallRate',
          threshold: PERFORMANCE_REQUIREMENTS.P0_CRITICAL.stallRate,
          actual: stallRate,
        });
      }
    }

    if (newAlerts.length > 0) {
      setPerformanceAlerts(prev => [...prev, ...newAlerts].slice(-20)); // Keep last 20 alerts
    }
  }, [playerMetrics, memoryState]);

  if (!__DEV__ || !isVisible) {
    return null;
  }

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical': return '#FF3B30';
      case 'warning': return '#FF9500';
      default: return '#34C759';
    }
  };

  const formatBytes = (bytes: number = 0) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const CompactOverlay = () => (
    <View style={styles.compactContainer} testID={`${testID}-compact`}>
      <TouchableOpacity 
        style={[styles.statusIndicator, { backgroundColor: getStatusColor(performanceStatus.overall) }]}
        onPress={() => setIsCollapsed(false)}
      >
        <Text style={styles.statusText}>
          {performanceStatus.overall === 'good' ? '✓' : performanceStatus.overall === 'warning' ? '⚠' : '✗'}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.compactMetrics}>
        <Text style={styles.compactText}>
          {playerMetrics?.averageFrameRate?.toFixed(0) || '60'} FPS
        </Text>
        <Text style={styles.compactText}>
          {formatBytes((memoryState?.currentUsage || 0) * 1024 * 1024)}
        </Text>
      </View>
    </View>
  );

  const ExpandedOverlay = () => (
    <View style={styles.expandedContainer} testID={`${testID}-expanded`}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Performance Monitor</Text>
        <View style={styles.headerControls}>
          <TouchableOpacity onPress={() => setShowDetailedView(true)}>
            <Text style={styles.headerButton}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsCollapsed(true)}>
            <Text style={styles.headerButton}>−</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Frame Rate</Text>
          <Text style={[styles.metricValue, { color: getStatusColor(performanceStatus.frameRate) }]}>
            {playerMetrics?.averageFrameRate?.toFixed(1) || '60.0'} FPS
          </Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Memory</Text>
          <Text style={[styles.metricValue, { color: getStatusColor(performanceStatus.memory) }]}>
            {formatBytes((memoryState?.currentUsage || 0) * 1024 * 1024)}
          </Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>TTFF</Text>
          <Text style={styles.metricValue}>
            {playerMetrics?.timeToFirstFrame || 0}ms
          </Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Stalls</Text>
          <Text style={styles.metricValue}>
            {playerMetrics?.stallEvents || 0}
          </Text>
        </View>
      </View>

      {/* Alerts */}
      {performanceAlerts.length > 0 && (
        <View style={styles.alertsContainer}>
          <Text style={styles.alertsTitle}>Performance Alerts</Text>
          {performanceAlerts.slice(-3).map((alert) => (
            <View key={alert.id} style={[styles.alert, { borderLeftColor: getStatusColor(alert.type) }]}>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              {alert.actual !== undefined && alert.threshold !== undefined && (
                <Text style={styles.alertDetails}>
                  {alert.actual} {'>'} {alert.threshold}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const DetailedModal = () => (
    <Modal
      visible={showDetailedView}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDetailedView(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Detailed Performance Metrics</Text>
          <TouchableOpacity onPress={() => setShowDetailedView(false)}>
            <Text style={styles.modalCloseButton}>Close</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {/* Video Information */}
          {video && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Video Information</Text>
              <Text style={styles.detailText}>ID: {video._id}</Text>
              <Text style={styles.detailText}>
                Quality: {video.masterPlaylistKey ? 'HLS Adaptive' : 'Fixed'}
              </Text>
              <Text style={styles.detailText}>
                Business Priority: {video.businessPriority || 'normal'}
              </Text>
              <Text style={styles.detailText}>
                Promoted: {video.promoted ? 'Yes' : 'No'}
              </Text>
            </View>
          )}

          {/* Player Metrics */}
          {playerMetrics && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Player Metrics</Text>
              <Text style={styles.detailText}>Load Time: {playerMetrics.loadTime}ms</Text>
              <Text style={styles.detailText}>Time to First Frame: {playerMetrics.timeToFirstFrame}ms</Text>
              <Text style={styles.detailText}>Stall Events: {playerMetrics.stallEvents}</Text>
              <Text style={styles.detailText}>Total Stall Time: {playerMetrics.totalStallTime}ms</Text>
              <Text style={styles.detailText}>Buffered Duration: {playerMetrics.bufferedDuration?.toFixed(1)}s</Text>
              <Text style={styles.detailText}>Dropped Frames: {playerMetrics.droppedFrames}</Text>
              <Text style={styles.detailText}>Average FPS: {playerMetrics.averageFrameRate?.toFixed(2)}</Text>
            </View>
          )}

          {/* Memory State */}
          {memoryState && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Memory State</Text>
              <Text style={styles.detailText}>
                Current Usage: {formatBytes(memoryState.currentUsage * 1024 * 1024)}
              </Text>
              <Text style={styles.detailText}>
                Peak Usage: {formatBytes(memoryState.peakUsage * 1024 * 1024)}
              </Text>
              <Text style={styles.detailText}>Pressure Level: {memoryState.pressureLevel}</Text>
              <Text style={styles.detailText}>GC Frequency: {memoryState.gcFrequency}/min</Text>
              <Text style={styles.detailText}>Leak Detected: {memoryState.leakDetected ? 'Yes' : 'No'}</Text>
            </View>
          )}

          {/* Network State */}
          {networkState && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Network State</Text>
              <Text style={styles.detailText}>Connected: {networkState.isConnected ? 'Yes' : 'No'}</Text>
              <Text style={styles.detailText}>Type: {networkState.connectionType}</Text>
              <Text style={styles.detailText}>Quality: {networkState.quality}</Text>
              <Text style={styles.detailText}>Bandwidth: {networkState.bandwidth?.toFixed(1)} Mbps</Text>
              <Text style={styles.detailText}>Metered: {networkState.isMetered ? 'Yes' : 'No'}</Text>
            </View>
          )}

          {/* Device Capabilities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device Capabilities</Text>
            <Text style={styles.detailText}>Platform: {Platform.OS}</Text>
            <Text style={styles.detailText}>Low-end Device: {capabilities.isLowEnd ? 'Yes' : 'No'}</Text>
            <Text style={styles.detailText}>Available Memory: {capabilities.availableMemory}GB</Text>
            <Text style={styles.detailText}>CPU Cores: {capabilities.cpuCores}</Text>
            <Text style={styles.detailText}>Hardware Decoder: {capabilities.hasHardwareDecoder ? 'Yes' : 'No'}</Text>
          </View>

          {/* Performance Requirements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Targets</Text>
            <Text style={styles.detailText}>Target FPS: {PERFORMANCE_REQUIREMENTS.P0_CRITICAL.frameRate.target}</Text>
            <Text style={styles.detailText}>Min FPS: {PERFORMANCE_REQUIREMENTS.P0_CRITICAL.frameRate.minimum}</Text>
            <Text style={styles.detailText}>Max TTFF: {PERFORMANCE_REQUIREMENTS.P0_CRITICAL.timeToFirstFrame}ms</Text>
            <Text style={styles.detailText}>Max Cold Start: {PERFORMANCE_REQUIREMENTS.P0_CRITICAL.coldStartToFeed}ms</Text>
            <Text style={styles.detailText}>Max Stall Rate: {PERFORMANCE_REQUIREMENTS.P0_CRITICAL.stallRate}%</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <>
      {isCollapsed ? <CompactOverlay /> : <ExpandedOverlay />}
      <DetailedModal />
    </>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  compactMetrics: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
  },
  compactText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  expandedContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 16,
    maxWidth: screenWidth * 0.9,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerControls: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 8,
    minWidth: 70,
  },
  metricLabel: {
    color: '#CCCCCC',
    fontSize: 10,
    marginBottom: 4,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  alertsContainer: {
    marginTop: 8,
  },
  alertsTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  alert: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 3,
    padding: 8,
    marginBottom: 4,
  },
  alertMessage: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  alertDetails: {
    color: '#CCCCCC',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    paddingBottom: 4,
  },
  detailText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});

export default VideoDebugOverlay;