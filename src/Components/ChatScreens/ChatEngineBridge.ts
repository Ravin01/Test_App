/**
 * 🚀 CHAT ENGINE BRIDGE
 * Provides backward compatibility and easy migration to EnhancedUltraChatEngine
 */

import EnhancedUltraChatEngine from './EnhancedUltraChatEngine';

// Re-export the enhanced engine with backward compatibility
export default EnhancedUltraChatEngine;

// Named exports for specific features
export const {
  connect,
  disconnect,
  sendMessage,
  sendProductCard,
  sendOrderUpdate,
  sendPaymentRequest,
  sendBusinessCard,
  sendMediaMessage,
  sendTyping,
  markAsRead,
  addReaction,
  getMetrics,
  getStatus,
} = EnhancedUltraChatEngine;

// Utility hook for React components
export const useEnhancedChat = () => {
  return {
    chatEngine: EnhancedUltraChatEngine,
    connect: EnhancedUltraChatEngine.connect.bind(EnhancedUltraChatEngine),
    sendMessage: EnhancedUltraChatEngine.sendMessage.bind(EnhancedUltraChatEngine),
    sendProductCard: EnhancedUltraChatEngine.sendProductCard.bind(EnhancedUltraChatEngine),
    sendOrderUpdate: EnhancedUltraChatEngine.sendOrderUpdate.bind(EnhancedUltraChatEngine),
    sendPaymentRequest: EnhancedUltraChatEngine.sendPaymentRequest.bind(EnhancedUltraChatEngine),
    sendBusinessCard: EnhancedUltraChatEngine.sendBusinessCard.bind(EnhancedUltraChatEngine),
    sendMediaMessage: EnhancedUltraChatEngine.sendMediaMessage.bind(EnhancedUltraChatEngine),
    sendTyping: EnhancedUltraChatEngine.sendTyping.bind(EnhancedUltraChatEngine),
    markAsRead: EnhancedUltraChatEngine.markAsRead.bind(EnhancedUltraChatEngine),
    addReaction: EnhancedUltraChatEngine.addReaction.bind(EnhancedUltraChatEngine),
    disconnect: EnhancedUltraChatEngine.disconnect.bind(EnhancedUltraChatEngine),
    getMetrics: EnhancedUltraChatEngine.getMetrics.bind(EnhancedUltraChatEngine),
    getStatus: EnhancedUltraChatEngine.getStatus.bind(EnhancedUltraChatEngine),
  };
};

// Type exports for TypeScript users
export type {
  CommerceMessage,
  ProductCard,
  OrderInfo,
  PaymentRequest,
  BusinessCard,
  MessageMedia,
  ChatRoom,
  ChatMetrics,
} from './EnhancedUltraChatEngine';

// Debug helper for development
if (__DEV__) {
  console.log('🚀 Enhanced Ultra Chat Engine loaded with commerce features');
  
  // Log metrics every 30 seconds in development
  setInterval(() => {
    const metrics = EnhancedUltraChatEngine.getMetrics();
    const status = EnhancedUltraChatEngine.getStatus();
    
    console.log('📊 Enhanced Chat Metrics:', {
      connected: status.isConnected,
      offlineQueue: status.offlineQueueSize,
      avgDelivery: metrics.messageDeliveryTime.length > 0 
        ? (metrics.messageDeliveryTime.reduce((a, b) => a + b, 0) / metrics.messageDeliveryTime.length).toFixed(0) + 'ms'
        : 'N/A',
      encryption: metrics.encryptionTime.length + ' encrypted',
      compression: metrics.compressionTime.length + ' compressed',
    });
  }, 30000);
}