// flashSaleLiveService.tsx - Service layer for Flash Sale AppSync subscriptions
import {
  subscribeToFlashSaleChannel,
  FLASH_SALE_CHANNELS,
  FLASH_SALE_EVENT_TYPES,
} from '../Utils/appSyncFlashSaleConfig';

interface FlashSaleCallbacks {
  onFlashSaleStarted?: (data: any) => void;
  onFlashSaleEnded?: (data: any) => void;
  onStockUpdate?: (data: any) => void;
  onBundleFlashSaleStarted?: (data: any) => void;
  onBundleFlashSaleEnded?: (data: any) => void;
  onBundleStockUpdate?: (data: any) => void;
  onError?: (error: any) => void;
}

class FlashSaleLiveService {
  private activeSubscriptions: Map<string, any> = new Map();

  /**
   * Subscribe to live stream flash sale events (both regular and bundle)
   * @param showId - The show/stream ID to subscribe to
   * @param callbacks - Event handler callbacks
   * @returns Cleanup function to unsubscribe
   */
  async subscribeToLiveStreamFlashSales(
    showId: string,
    callbacks: FlashSaleCallbacks,
  ): Promise<() => void> {
    try {
      console.log(
        '🔌 [FlashSaleService] Setting up AppSync for stream:',
        showId,
      );

      const channelPath = FLASH_SALE_CHANNELS.getLiveStreamChannel(showId);

      const channel = await subscribeToFlashSaleChannel(
        channelPath,
        (eventData: any) => {
          this.handleFlashSaleEvent(eventData, callbacks, showId);
        },
      );

      this.activeSubscriptions.set(showId, channel);

      console.log('✅ [FlashSaleService] AppSync subscriptions active');

      // Return cleanup function
      return () => {
        console.log('🧹 [FlashSaleService] Cleaning up subscriptions');
        if (channel?.close) {
          channel.close();
        }
        this.activeSubscriptions.delete(showId);
      };
    } catch (error) {
      console.error('❌ [FlashSaleService] Setup failed:', error);
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      throw error;
    }
  }

  /**
   * Route incoming events to appropriate handlers
   */
  private handleFlashSaleEvent(
    eventData: any,
    callbacks: FlashSaleCallbacks,
    showId: string,
  ) {
    try {
      if (!eventData || !eventData.eventType) {
        console.warn('⚠️ [FlashSaleService] Invalid event structure:', eventData);
        return;
      }

      // Filter: Only process if this event is for the current stream
      if (eventData.streamId !== showId && eventData.showId !== showId) {
        console.log('❌ [FlashSaleService] Stream ID mismatch, ignoring event');
        return;
      }

      console.log(
        '📨 [FlashSaleService] Processing event:',
        eventData.eventType,
      );

      // Route to appropriate handler
      switch (eventData.eventType) {
        case FLASH_SALE_EVENT_TYPES.LIVE_FLASH_SALE_STARTED:
        case 'live_flash_sale_started':
          callbacks.onFlashSaleStarted?.(eventData);
          break;

        case FLASH_SALE_EVENT_TYPES.LIVE_FLASH_SALE_ENDED:
        case 'live_flash_sale_ended':
          callbacks.onFlashSaleEnded?.(eventData);
          break;

        case FLASH_SALE_EVENT_TYPES.LIVE_STOCK_UPDATE:
        case 'live_stock_update':
          callbacks.onStockUpdate?.(eventData);
          break;

        case FLASH_SALE_EVENT_TYPES.BUNDLE_FLASH_SALE_STARTED:
        case 'bundle_flash_sale_started':
          callbacks.onBundleFlashSaleStarted?.(eventData);
          break;

        case FLASH_SALE_EVENT_TYPES.BUNDLE_FLASH_SALE_ENDED:
        case 'bundle_flash_sale_ended':
          callbacks.onBundleFlashSaleEnded?.(eventData);
          break;

        case FLASH_SALE_EVENT_TYPES.BUNDLE_STOCK_UPDATE:
        case 'bundle_stock_update':
        case 'bundle_flash_sale_stock_update':
          callbacks.onBundleStockUpdate?.(eventData);
          break;

        case FLASH_SALE_EVENT_TYPES.LIVE_FLASH_SALE_ERROR:
        case 'live_flash_sale_error':
        case FLASH_SALE_EVENT_TYPES.BUNDLE_FLASH_SALE_ERROR:
        case 'bundle_flash_sale_error':
          callbacks.onError?.(eventData);
          break;

        default:
          console.log(
            '⚠️ [FlashSaleService] Unknown event type:',
            eventData.eventType,
          );
      }
    } catch (error) {
      console.error('❌ [FlashSaleService] Error processing event:', error);
    }
  }

  /**
   * Cleanup all active subscriptions
   */
  cleanupAll() {
    console.log('🧹 [FlashSaleService] Cleaning up all subscriptions');
    this.activeSubscriptions.forEach(channel => {
      if (channel?.close) {
        channel.close();
      }
    });
    this.activeSubscriptions.clear();
  }

  /**
   * Get the number of active subscriptions
   */
  getActiveSubscriptionCount(): number {
    return this.activeSubscriptions.size;
  }

  /**
   * Check if a show has an active subscription
   */
  hasActiveSubscription(showId: string): boolean {
    return this.activeSubscriptions.has(showId);
  }
}

export default new FlashSaleLiveService();
