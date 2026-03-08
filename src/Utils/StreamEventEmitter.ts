/**
 * StreamEventEmitter - Frontend Pub/Sub for Stream Events
 * Lightweight event system for cross-screen communication
 */

import { DeviceEventEmitter } from 'react-native';

export const STREAM_EVENTS = {
  STREAM_ENDED: 'FLYKUP_STREAM_ENDED',
} as const;

export interface StreamEndedPayload {
  streamId: string;
  liveStreamId?: string;
  endedAt: string;
}

class StreamEventEmitterClass {
  emitStreamEnded(payload: StreamEndedPayload) {
    console.log('📡 [StreamEventEmitter] Stream ended:', payload.streamId);
    DeviceEventEmitter.emit(STREAM_EVENTS.STREAM_ENDED, payload);
  }

  onStreamEnded(callback: (payload: StreamEndedPayload) => void) {
    return DeviceEventEmitter.addListener(STREAM_EVENTS.STREAM_ENDED, callback);
  }
}

export const StreamEventEmitter = new StreamEventEmitterClass();
export default StreamEventEmitter;
