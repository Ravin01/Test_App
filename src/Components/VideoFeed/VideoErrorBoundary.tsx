/**
 * 🚀 BULLETPROOF VIDEO ERROR BOUNDARY
 * CEO Priority: Business-critical error recovery for promoted content
 * Zero tolerance for unhandled errors affecting revenue streams
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { VideoData, ErrorSeverity, BusinessCriticalError } from './VideoTypes';
import { ERROR_CONFIG, BUSINESS_CRITICAL_CONFIG } from './VideoConstants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
  children: ReactNode;
  video?: VideoData;
  onError?: (error: Error, errorInfo: any) => void;
  onBusinessCriticalError?: (error: BusinessCriticalError) => void;
  onRecoveryAttempt?: (attemptCount: number) => void;
  fallbackComponent?: ReactNode;
  testID?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string;
  recoveryAttempts: number;
  isBusinessCritical: boolean;
  lastErrorTime: number;
  consecutiveErrors: number;
}

export class VideoErrorBoundary extends Component<Props, State> {
  private recoveryTimer: NodeJS.Timeout | null = null;
  private errorReportingQueue: Array<{error: Error, context: any}> = [];

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      recoveryAttempts: 0,
      isBusinessCritical: false,
      lastErrorTime: 0,
      consecutiveErrors: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `VEB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const { video, onError, onBusinessCriticalError } = this.props;
    const { consecutiveErrors, lastErrorTime } = this.state;

    console.error('🚨 VideoErrorBoundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      videoId: video?._id,
      errorId: this.state.errorId,
    });

    // Update consecutive error count
    const timeSinceLastError = Date.now() - lastErrorTime;
    const newConsecutiveErrors = timeSinceLastError < 5000 ? consecutiveErrors + 1 : 1;

    this.setState({
      errorInfo,
      consecutiveErrors: newConsecutiveErrors,
    });

    // Determine error severity and business criticality
    const severity = this.determineErrorSeverity(error, newConsecutiveErrors);
    const isBusinessCritical = this.isBusinessCriticalContent(video) && severity !== 'low';

    this.setState({ isBusinessCritical });

    // Handle business-critical errors immediately
    if (isBusinessCritical) {
      const businessError: BusinessCriticalError = {
        originalError: error,
        videoId: video?._id || 'unknown',
        errorId: this.state.errorId,
        severity,
        isPromoted: video?.promoted || false,
        isShoppable: video?.isShoppable || false,
        revenue: video?.promotedDetails?.revenue || 0,
        timestamp: Date.now(),
        recoveryStrategy: this.determineRecoveryStrategy(severity),
      };

      onBusinessCriticalError?.(businessError);
      this.handleBusinessCriticalError(businessError);
    }

    // Queue error for reporting
    this.queueErrorReport(error, {
      ...errorInfo,
      videoId: video?._id,
      severity,
      isBusinessCritical,
      consecutiveErrors: newConsecutiveErrors,
    });

    // Standard error callback
    onError?.(error, errorInfo);

    // Automatic recovery for non-critical errors
    if (!isBusinessCritical && severity !== 'critical') {
      this.scheduleRecovery();
    }
  }

  private determineErrorSeverity(error: Error, consecutiveErrors: number): ErrorSeverity {
    const errorMessage = error.message?.toLowerCase() || '';
    
    // Critical errors that require immediate attention
    if (
      errorMessage.includes('out of memory') ||
      errorMessage.includes('fatal') ||
      consecutiveErrors >= ERROR_CONFIG.CRITICAL_ERROR_THRESHOLD
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('decode') ||
      consecutiveErrors >= 3
    ) {
      return 'high';
    }

    // Medium severity errors
    if (
      errorMessage.includes('buffer') ||
      errorMessage.includes('playback') ||
      consecutiveErrors >= 2
    ) {
      return 'medium';
    }

    return 'low';
  }

  private isBusinessCriticalContent(video?: VideoData): boolean {
    if (!video) return false;
    
    return (
      video.promoted === true ||
      video.isShoppable === true ||
      (video.promotedDetails?.revenue || 0) > 0 ||
      video.businessPriority === 'high'
    );
  }

  private determineRecoveryStrategy(severity: ErrorSeverity): 'immediate' | 'delayed' | 'manual' | 'escalate' {
    switch (severity) {
      case 'critical':
        return 'escalate';
      case 'high':
        return 'immediate';
      case 'medium':
        return 'delayed';
      default:
        return 'manual';
    }
  }

  private handleBusinessCriticalError(businessError: BusinessCriticalError): void {
    console.error('🆘 BUSINESS CRITICAL ERROR:', businessError);

    // Immediate escalation for high-revenue content
    if (businessError.revenue > BUSINESS_CRITICAL_CONFIG.HIGH_REVENUE_THRESHOLD) {
      this.escalateToSupport(businessError);
    }

    // Show user-friendly message for promoted content
    if (businessError.isPromoted) {
      Alert.alert(
        'Content Unavailable',
        'This promoted content is temporarily unavailable. We\'re working to restore it.',
        [
          { text: 'Skip', onPress: () => this.skipContent() },
          { text: 'Retry', onPress: () => this.retryWithFallback() },
        ]
      );
    }

    // Execute recovery strategy
    switch (businessError.recoveryStrategy) {
      case 'immediate':
        this.executeImmediateRecovery();
        break;
      case 'delayed':
        this.scheduleRecovery(5000);
        break;
      case 'escalate':
        this.escalateToSupport(businessError);
        break;
      default:
        break;
    }
  }

  private executeImmediateRecovery(): void {
    console.log('🔧 Executing immediate error recovery');
    
    // Clear error state and force remount
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempts: this.state.recoveryAttempts + 1,
    });

    this.props.onRecoveryAttempt?.(this.state.recoveryAttempts + 1);
  }

  private scheduleRecovery(delay: number = 2000): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    console.log(`🔧 Scheduling error recovery in ${delay}ms`);

    this.recoveryTimer = setTimeout(() => {
      if (this.state.recoveryAttempts < ERROR_CONFIG.MAX_AUTO_RECOVERY_ATTEMPTS) {
        this.executeImmediateRecovery();
      } else {
        console.warn('⚠️ Max recovery attempts reached, requiring manual intervention');
      }
    }, delay);
  }

  private escalateToSupport(businessError: BusinessCriticalError): void {
    console.error('🚨 ESCALATING TO SUPPORT:', businessError);
    
    // This would integrate with support/alerting systems
    // For now, we'll log the critical error details
    const escalationReport = {
      timestamp: new Date().toISOString(),
      errorId: businessError.errorId,
      videoId: businessError.videoId,
      revenue: businessError.revenue,
      severity: businessError.severity,
      platform: Platform.OS,
      consecutiveErrors: this.state.consecutiveErrors,
      userAgent: 'FlykupApp/1.0',
    };

    // In production, this would send to monitoring service
    console.log('📊 SUPPORT ESCALATION REPORT:', escalationReport);
  }

  private skipContent(): void {
    // This would skip to next video in feed
    console.log('⏭️ Skipping problematic content');
    this.executeImmediateRecovery();
  }

  private retryWithFallback(): void {
    console.log('🔄 Retrying with fallback strategy');
    
    // Implement fallback loading strategy
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempts: this.state.recoveryAttempts + 1,
    });
  }

  private queueErrorReport(error: Error, context: any): void {
    this.errorReportingQueue.push({ error, context });
    
    // Process queue with debouncing
    setTimeout(() => {
      this.flushErrorReports();
    }, 1000);
  }

  private flushErrorReports(): void {
    if (this.errorReportingQueue.length === 0) return;

    console.log('📊 Flushing error reports:', this.errorReportingQueue.length);
    
    // In production, batch send to analytics/monitoring service
    this.errorReportingQueue = [];
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
    this.flushErrorReports();
  }

  render() {
    const { hasError, error, isBusinessCritical, recoveryAttempts } = this.state;
    const { children, fallbackComponent, video, testID } = this.props;

    if (hasError) {
      // Custom fallback component
      if (fallbackComponent) {
        return fallbackComponent;
      }

      // Business-critical error UI
      if (isBusinessCritical) {
        return (
          <View style={styles.container} testID={`${testID}-business-critical`}>
            <View style={styles.businessCriticalContainer}>
              <Text style={styles.businessCriticalTitle}>Content Temporarily Unavailable</Text>
              <Text style={styles.businessCriticalSubtitle}>
                We're working to restore this content. Please try again.
              </Text>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => this.retryWithFallback()}
                  testID="retry-button"
                >
                  <Text style={styles.buttonText}>Try Again</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.skipButton}
                  onPress={() => this.skipContent()}
                  testID="skip-button"
                >
                  <Text style={styles.buttonText}>Skip</Text>
                </TouchableOpacity>
              </View>
              
              {recoveryAttempts > 0 && (
                <Text style={styles.attemptText}>
                  Attempt {recoveryAttempts} of {ERROR_CONFIG.MAX_AUTO_RECOVERY_ATTEMPTS}
                </Text>
              )}
            </View>
          </View>
        );
      }

      // Standard error UI
      return (
        <View style={styles.container} testID={`${testID}-error`}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Video Error</Text>
            <Text style={styles.errorMessage}>
              {error?.message || 'An unexpected error occurred'}
            </Text>
            
            {recoveryAttempts < ERROR_CONFIG.MAX_AUTO_RECOVERY_ATTEMPTS && (
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => this.executeImmediateRecovery()}
                testID="error-retry-button"
              >
                <Text style={styles.buttonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 30,
    alignItems: 'center',
    maxWidth: screenWidth * 0.8,
  },
  businessCriticalContainer: {
    padding: 40,
    alignItems: 'center',
    maxWidth: screenWidth * 0.85,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  businessCriticalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  businessCriticalSubtitle: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  attemptText: {
    color: '#999999',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default VideoErrorBoundary;