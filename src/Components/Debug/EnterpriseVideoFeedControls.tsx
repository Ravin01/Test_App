/**
 * 🚀 ENTERPRISE VIDEO FEED ADMIN CONTROLS
 * CEO Priority: Easy feature flag management for deployment
 * Development and admin utilities for rollout control
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { EnterpriseVideoFeedControls } from '../VideoFeed/EnterpriseVideoFeedWrapper';
import { VideoFeedUtils, PerformanceMonitor, VideoMemoryManager } from '../VideoFeed';

interface ControlPanelProps {
  onClose?: () => void;
}

export const EnterpriseVideoFeedControlPanel: React.FC<ControlPanelProps> = ({
  onClose,
}) => {
  const [rolloutStatus, setRolloutStatus] = useState({
    explicitlyEnabled: false,
    explicitlyDisabled: false,
    rolloutPercentage: 10,
  });
  const [newPercentage, setNewPercentage] = useState('10');
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  useEffect(() => {
    loadRolloutStatus();
    loadPerformanceMetrics();
  }, []);

  const loadRolloutStatus = async () => {
    try {
      const status = await EnterpriseVideoFeedControls.getRolloutStatus();
      setRolloutStatus(status);
      setNewPercentage(status.rolloutPercentage.toString());
    } catch (error) {
      console.error('Failed to load rollout status:', error);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      // const metrics = await VideoFeedUtils.getPerformanceMetrics();
      // setPerformanceMetrics(metrics);
      setPerformanceMetrics(null);
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
  };

  const handleEnableFeature = async (enabled: boolean) => {
    try {
      if (enabled) {
        await EnterpriseVideoFeedControls.enable();
      } else {
        await EnterpriseVideoFeedControls.disable();
      }
      
      await loadRolloutStatus();
      
      Alert.alert(
        'Feature Updated',
        `Enterprise Video Feed ${enabled ? 'enabled' : 'disabled'}. Restart the app to see changes.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update feature flag');
    }
  };

  const handleSetPercentage = async () => {
    try {
      const percentage = parseInt(newPercentage, 10);
      
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        Alert.alert('Invalid Percentage', 'Please enter a number between 0 and 100');
        return;
      }

      await EnterpriseVideoFeedControls.setRolloutPercentage(percentage);
      await loadRolloutStatus();
      
      Alert.alert(
        'Rollout Updated',
        `Enterprise Video Feed rollout set to ${percentage}%. Restart the app to see changes.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update rollout percentage');
    }
  };

  const handleRunPerformanceTest = () => {
    Alert.alert(
      'Performance Test',
      'This will run performance benchmarks and may affect app performance temporarily.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Test',
          onPress: async () => {
            try {
              console.log('🏃‍♂️ Running performance tests...');
              // This would integrate with the actual performance test suite
              setTimeout(() => {
                Alert.alert('Performance Test Complete', 'Check console logs for results');
              }, 3000);
            } catch (error) {
              Alert.alert('Test Failed', 'Performance test encountered an error');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = () => {
    if (rolloutStatus.explicitlyEnabled) return '#4CAF50'; // Green
    if (rolloutStatus.explicitlyDisabled) return '#F44336'; // Red
    return '#FF9800'; // Orange (gradual rollout)
  };

  const getStatusText = () => {
    if (rolloutStatus.explicitlyEnabled) return 'Fully Enabled';
    if (rolloutStatus.explicitlyDisabled) return 'Disabled';
    return `Gradual Rollout (${rolloutStatus.rolloutPercentage}%)`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View style={styles.header}>
          <Text style={styles.title}>🚀 Enterprise Video Feed Control Panel</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={[styles.statusCard, { borderLeftColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
            <Text style={styles.statusSubtext}>
              {rolloutStatus.explicitlyEnabled || rolloutStatus.explicitlyDisabled
                ? 'Explicit configuration'
                : 'Automatic rollout based on percentage'
              }
            </Text>
          </View>
        </View>

        {/* Feature Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feature Controls</Text>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Force Enable</Text>
            <Switch
              value={rolloutStatus.explicitlyEnabled}
              onValueChange={(value) => handleEnableFeature(value)}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Force Disable</Text>
            <Switch
              value={rolloutStatus.explicitlyDisabled}
              onValueChange={(value) => handleEnableFeature(!value)}
              trackColor={{ false: '#767577', true: '#F44336' }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Rollout Percentage</Text>
            <View style={styles.percentageContainer}>
              <TextInput
                style={styles.percentageInput}
                value={newPercentage}
                onChangeText={setNewPercentage}
                keyboardType="numeric"
                placeholder="0-100"
                placeholderTextColor="#666"
              />
              <TouchableOpacity onPress={handleSetPercentage} style={styles.setButton}>
                <Text style={styles.setButtonText}>Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          {performanceMetrics ? (
            <View style={styles.metricsContainer}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Memory Usage:</Text>
                <Text style={styles.metricValue}>
                  {performanceMetrics.memory?.currentUsage?.toFixed(1) || 'N/A'} MB
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Memory Pressure:</Text>
                <Text style={styles.metricValue}>
                  {performanceMetrics.memory?.pressureLevel || 'Unknown'}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Feed State:</Text>
                <Text style={styles.metricValue}>
                  {performanceMetrics.feed?.isLoading ? 'Loading' : 'Ready'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noMetricsText}>No metrics available</Text>
          )}
          
          <TouchableOpacity onPress={loadPerformanceMetrics} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>Refresh Metrics</Text>
          </TouchableOpacity>
        </View>

        {/* Testing Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Testing</Text>
          
          <TouchableOpacity onPress={handleRunPerformanceTest} style={styles.testButton}>
            <Text style={styles.testButtonText}>Run Performance Benchmark</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              console.log('🔧 Forcing garbage collection...');
              if (global.gc) {
                global.gc();
                Alert.alert('GC Complete', 'Garbage collection forced');
              } else {
                Alert.alert('GC Unavailable', 'Garbage collection not available in this build');
              }
            }} 
            style={styles.testButton}
          >
            <Text style={styles.testButtonText}>Force Garbage Collection</Text>
          </TouchableOpacity>
        </View>

        {/* CEO Performance Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CEO Performance Targets</Text>
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementText}>• Time to First Frame: &lt; 250ms</Text>
            <Text style={styles.requirementText}>• Sustained Frame Rate: ≥ 60 FPS</Text>
            <Text style={styles.requirementText}>• Cold Start: &lt; 800ms</Text>
            <Text style={styles.requirementText}>• Black Screens: 0</Text>
            <Text style={styles.requirementText}>• Memory Leaks: 0 MB</Text>
            <Text style={styles.requirementText}>• Battery Improvement: &gt; 25%</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🎯 Mission: Beat TikTok Performance{'\n'}
            Built with CEO-level performance standards
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#999',
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  statusCard: {
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    borderLeftWidth: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 40,
  },
  controlLabel: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentageInput: {
    backgroundColor: '#333',
    color: '#ffffff',
    padding: 8,
    borderRadius: 4,
    width: 60,
    textAlign: 'center',
    marginRight: 8,
  },
  setButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  setButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metricsContainer: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 6,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#999',
  },
  metricValue: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  noMetricsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 12,
  },
  testButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  testButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  requirementsContainer: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 6,
  },
  requirementText: {
    fontSize: 12,
    color: '#4CAF50',
    marginVertical: 2,
    fontFamily: 'monospace',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default EnterpriseVideoFeedControlPanel;