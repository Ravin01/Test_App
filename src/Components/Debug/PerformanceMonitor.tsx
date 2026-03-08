import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PerformanceConfig from '../Reels/PerformanceConfig';
import UltraVideoPreloader from '../../Utils/UltraVideoPreloader';

/**
 * 🎯 PERFORMANCE MONITOR (Hot Reload Ready)
 * Drop this component anywhere to test performance system
 */

const PerformanceMonitor: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Test performance system on mount with proper error handling
    try {
      // Activate performance config
      const config = PerformanceConfig.activate();
      console.log('🚀 Performance Config activated:', config);
      
      // Get preloader stats with null check
      const preloaderStats = UltraVideoPreloader.getStats();
      if (preloaderStats && typeof preloaderStats === 'object') {
        setStats(preloaderStats);
      }
      
      // Run benchmark with null check
      const results = PerformanceConfig.benchmark();
      if (results && typeof results === 'object') {
        setBenchmarkResults(results);
      }
      
      console.log('✅ Performance Monitor initialized successfully');
    } catch (error) {
      console.error('❌ Performance Monitor error:', error);
      // Set fallback values to prevent crashes
      setStats({
        cacheSize: '0MB',
        videoCount: 0,
        activeDownloads: 0,
        networkType: 'unknown',
        networkSpeed: 'unknown'
      });
      setBenchmarkResults({
        preloadSpeed: 0,
        scrollLatency: 0,
        memoryEfficiency: 0,
        overallScore: 0
      });
    }
  }, []);

  const runBenchmark = () => {
    try {
      const results = PerformanceConfig.benchmark();
      if (results && typeof results === 'object') {
        setBenchmarkResults(results);
        console.log('📊 New benchmark results:', results);
      } else {
        console.warn('❌ Benchmark returned invalid results');
      }
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      // Set fallback values to prevent crashes
      setBenchmarkResults({
        preloadSpeed: 0,
        scrollLatency: 0,
        memoryEfficiency: 0,
        overallScore: 0
      });
    }
  };

  const refreshStats = () => {
    try {
      const preloaderStats = UltraVideoPreloader.getStats();
      if (preloaderStats && typeof preloaderStats === 'object') {
        setStats(preloaderStats);
        console.log('📊 Updated stats:', preloaderStats);
      } else {
        console.warn('❌ Stats refresh returned invalid data');
      }
    } catch (error) {
      console.error('❌ Stats refresh failed:', error);
      // Set fallback values to prevent crashes
      setStats({
        cacheSize: '0MB',
        videoCount: 0,
        activeDownloads: 0,
        networkType: 'unknown',
        networkSpeed: 'unknown'
      });
    }
  };

  if (!isVisible) {
    return (
      <TouchableOpacity 
        style={styles.minimizedButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.minimizedText}>📊</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚀 ULTRA PERFORMANCE</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setIsVisible(false)}
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Performance Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Preloader Stats</Text>
        {stats ? (
          <View>
            <Text style={styles.statText}>Cache: {stats.cacheSize}</Text>
            <Text style={styles.statText}>Videos: {stats.videoCount}</Text>
            <Text style={styles.statText}>Downloads: {stats.activeDownloads}</Text>
            <Text style={styles.statText}>Network: {stats.networkType} ({stats.networkSpeed})</Text>
          </View>
        ) : (
          <Text style={styles.statText}>Loading...</Text>
        )}
      </View>

      {/* Benchmark Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Benchmark vs TikTok</Text>
        {benchmarkResults ? (
          <View>
            <Text style={[
              styles.statText,
              { color: benchmarkResults.preloadSpeed < 500 ? '#00ff00' : '#ff6600' }
            ]}>
              Preload: {benchmarkResults.preloadSpeed.toFixed(0)}ms
              {benchmarkResults.preloadSpeed < 500 ? ' ✅ WINNING' : ' ⚠️ OPTIMIZE'}
            </Text>
            <Text style={[
              styles.statText,
              { color: benchmarkResults.scrollLatency < 10 ? '#00ff00' : '#ff6600' }
            ]}>
              Scroll: {benchmarkResults.scrollLatency.toFixed(0)}ms
              {benchmarkResults.scrollLatency < 10 ? ' ✅ WINNING' : ' ⚠️ OPTIMIZE'}
            </Text>
            <Text style={[
              styles.statText,
              { color: benchmarkResults.memoryEfficiency < 150 ? '#00ff00' : '#ff6600' }
            ]}>
              Memory: {benchmarkResults.memoryEfficiency.toFixed(0)}MB
              {benchmarkResults.memoryEfficiency < 150 ? ' ✅ WINNING' : ' ⚠️ OPTIMIZE'}
            </Text>
            <Text style={[
              styles.statText,
              { color: benchmarkResults.overallScore > 75 ? '#00ff00' : '#ff6600' }
            ]}>
              Score: {benchmarkResults.overallScore}/100
              {benchmarkResults.overallScore > 75 ? ' 🚀 BEATING TIKTOK!' : ' 📈 CLOSE!'}
            </Text>
          </View>
        ) : (
          <Text style={styles.statText}>No results yet</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={runBenchmark}>
          <Text style={styles.buttonText}>🎯 Benchmark</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={refreshStats}>
          <Text style={styles.buttonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        🏆 Target: Beat TikTok (800ms → 500ms)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 9999,
    minWidth: 250,
    maxWidth: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#ff6600',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  statText: {
    color: '#00ff00',
    fontSize: 9,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 8,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  footer: {
    color: '#888',
    fontSize: 7,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  minimizedButton: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  minimizedText: {
    fontSize: 20,
  },
});

export default PerformanceMonitor;