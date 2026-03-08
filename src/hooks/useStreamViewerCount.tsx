import { useEffect, useRef, useState, useCallback } from 'react';
import {
  configureAppSync,
  connectToChannel,
  getIVSChannelPath,
  subscribeToChannel,
  closeChannel
} from '../Utils/appSyncConfig';
import axiosInstance from '../Utils/Api';

/**
 * Custom hook to manage real-time viewer counts from streaming backend using AppSync
 * Migrated from socket.io to AppSync for parity with web team
 * 
 * @param {Array} shows - Array of show objects with _id and liveStreamId
 * @returns {Object} - Object with viewerCounts keyed by show._id
 */
export const useStreamViewerCounts = (shows = []) => {
  const [viewerCounts, setViewerCounts] = useState({});
  const channelsRef = useRef(new Map());
  const isConfiguredRef = useRef(false);
  const streamIdToShowIdRef = useRef(new Map());
  const isSettingUpRef = useRef(false);
  const subscribedStreamIdsRef = useRef(new Set());

  // Helper function to persist viewer event to database
  const persistViewerEvent = useCallback(async (eventType, streamId, viewerCount, webrtcViewers = 0, hlsViewers = 0, viewerMode = '') => {
    try {
      await axiosInstance.post('/shows/viewer-event', {
        eventType,
        streamId,
        viewerCount,
        webrtcViewers,
        hlsViewers,
        viewerMode
      });
      console.log('[useStreamViewerCounts] ✅ Persisted to DB:', { eventType, streamId, viewerCount });
    } catch (error) {
      console.error('[useStreamViewerCounts] ❌ DB persist failed:', error.message);
    }
  }, []);

  useEffect(() => {
    const showsWithStreams = shows.filter(s => s.liveStreamId);
    if (!showsWithStreams.length) return;

    // Always refresh the lookup map (must never be stale)
    streamIdToShowIdRef.current.clear();
    shows.forEach(show => {
      if (show.liveStreamId) {
        streamIdToShowIdRef.current.set(show.liveStreamId, show._id);
      }
    });

    // Only subscribe to shows not yet subscribed
    const unsubscribedShows = showsWithStreams.filter(
      show => !subscribedStreamIdsRef.current.has(show.liveStreamId)
    );

    if (!unsubscribedShows.length) {
      console.log('[useStreamViewerCounts] All shows already subscribed, map refreshed ✅');
      return;
    }

    // If an async setup is already in flight, skip
    if (isSettingUpRef.current) {
      console.warn('[useStreamViewerCounts] Setup already in progress — skipping duplicate call');
      return;
    }

    console.log(
      '[useStreamViewerCounts] Subscribing to',
      unsubscribedShows.length,
      'new shows:',
      unsubscribedShows.map(s => ({ showId: s._id, streamId: s.liveStreamId }))
    );

    const setupAppSyncSubscriptions = async () => {
      isSettingUpRef.current = true;

      try {
        if (!isConfiguredRef.current) {
          console.log('[useStreamViewerCounts] Configuring AppSync...');
          configureAppSync();
          isConfiguredRef.current = true;
          console.log('[useStreamViewerCounts] AppSync configured ✅');
        }

        for (const show of unsubscribedShows) {
          const showId = show._id;
          const streamId = show.liveStreamId;

          // Re-check after each await - another run may have subscribed in the meantime
          if (subscribedStreamIdsRef.current.has(streamId)) {
            console.log(`[useStreamViewerCounts] show ${showId} subscribed by concurrent run — skipping`);
            continue;
          }

          console.log(`[useStreamViewerCounts] → Subscribing showId: ${showId} | streamId: ${streamId}`);

          try {
            const channelPath = getIVSChannelPath(streamId);
            console.log(`[useStreamViewerCounts] Channel path: ${channelPath}`);

            const channel = await connectToChannel(channelPath);
            console.log(`[useStreamViewerCounts] Channel connected ✅`);
            channelsRef.current.set(showId, channel);

            subscribeToChannel(
              channel,
              async (data) => {
                console.log('[useStreamViewerCounts] 📨 RAW event:', JSON.stringify(data, null, 2));

                try {
                  const eventData = data?.event?.event || data?.event || data;

                  if (!eventData?.eventType) {
                    console.warn('[useStreamViewerCounts] ⚠️ No eventType found:', data);
                    return;
                  }

                  const isViewerJoined = eventData.eventType === 'stream:viewer:joined';
                  const isViewerLeft = eventData.eventType === 'stream:viewer:left';

                  if (!isViewerJoined && !isViewerLeft) {
                    console.log(`[useStreamViewerCounts] Ignoring event: ${eventData.eventType}`);
                    return;
                  }

                  const incomingStreamId = eventData.streamId;
                  const targetShowId = streamIdToShowIdRef.current.get(incomingStreamId);

                  console.log(`[useStreamViewerCounts] streamId from event: ${incomingStreamId} → showId: ${targetShowId}`);

                  if (!targetShowId) {
                    console.warn(
                      `[useStreamViewerCounts] ⚠️ streamId "${incomingStreamId}" not in map.`,
                      'Map:',
                      Object.fromEntries(streamIdToShowIdRef.current)
                    );
                    return;
                  }

                  if (eventData.viewerCount === undefined) {
                    console.warn('[useStreamViewerCounts] ⚠️ viewerCount is undefined');
                    return;
                  }

                  const newCount = Math.max(0, eventData.viewerCount);
                  console.log(`[useStreamViewerCounts] ✅ Viewer count for show ${targetShowId}: ${newCount}`);

                  // 1. Update UI immediately
                  setViewerCounts(prev => ({ ...prev, [targetShowId]: newCount }));

                  // 2. Persist to DB
                  try {
                    await persistViewerEvent(
                      eventData.eventType,
                      incomingStreamId,
                      newCount,
                      eventData.webrtcViewers || 0,
                      eventData.hlsViewers || 0,
                      eventData.viewerMode || ''
                    );
                    console.log('[useStreamViewerCounts] ✅ Persisted to DB');
                  } catch (apiError) {
                    console.error('[useStreamViewerCounts] ❌ DB persist failed:', apiError.message);
                  }
                } catch (err) {
                  console.error('[useStreamViewerCounts] ❌ Event handler error:', err);
                }
              },
              (error) => {
                console.error(`[useStreamViewerCounts] ❌ Subscription error (show ${showId}):`, error);
              }
            );

            // Mark subscribed ONLY after success
            subscribedStreamIdsRef.current.add(streamId);
            console.log(
              `[useStreamViewerCounts] ✅ Subscribed! Total active: ${subscribedStreamIdsRef.current.size}`
            );

            // Seed with DB value
            setViewerCounts(prev => ({ ...prev, [showId]: show.viewerCount || 0 }));
          } catch (err) {
            console.error(`[useStreamViewerCounts] ❌ Failed to subscribe show ${showId}:`, err);
          }
        }
      } catch (err) {
        console.error('[useStreamViewerCounts] ❌ Setup failed:', err);
      } finally {
        isSettingUpRef.current = false;
        console.log(
          `[useStreamViewerCounts] Setup done. Active subscriptions: ${subscribedStreamIdsRef.current.size}`
        );
      }
    };

    setupAppSyncSubscriptions();

    return () => {
      // Only close channels for shows that are no longer in the list
      const currentStreamIds = new Set(shows.filter(s => s.liveStreamId).map(s => s.liveStreamId));

      channelsRef.current.forEach((channel, showId) => {
        const show = shows.find(s => s._id === showId);
        const streamIdForShow = show?.liveStreamId;

        if (!streamIdForShow || !currentStreamIds.has(streamIdForShow)) {
          console.log(`[useStreamViewerCounts] Closing channel for removed show ${showId}`);
          closeChannel(channel);
          channelsRef.current.delete(showId);
          if (streamIdForShow) subscribedStreamIdsRef.current.delete(streamIdForShow);
        }
      });
    };
  }, [shows, persistViewerEvent]);

  return { viewerCounts };
};
