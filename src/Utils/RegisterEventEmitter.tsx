/**
 * RegisterEventEmitter - Frontend Pub/Sub for Show Registration Events
 * Lightweight event system for cross-screen communication
 */

import { DeviceEventEmitter } from 'react-native';

export const REGISTER_EVENTS = {
  SHOW_REGISTERED: 'FLYKUP_SHOW_REGISTERED',
  REGISTRATION_COUNT_UPDATED: 'FLYKUP_REGISTRATION_COUNT_UPDATED',
} as const;

export interface ShowRegisteredPayload {
  showId: string;
  userId: string;
  registeredAt: string;
  newCount: number;
}

export interface RegistrationCountUpdatedPayload {
  showId: string;
  totalRegistrations: number;
  updatedAt: string;
}

class RegisterEventEmitterClass {
  /**
   * Emit event when a user registers for a show
   */
  emitShowRegistered(payload: ShowRegisteredPayload) {
    console.log('📡 [RegisterEventEmitter] User registered for show:', payload.showId);
    DeviceEventEmitter.emit(REGISTER_EVENTS.SHOW_REGISTERED, payload);
  }

  /**
   * Listen for show registration events
   */
  onShowRegistered(callback: (payload: ShowRegisteredPayload) => void) {
    return DeviceEventEmitter.addListener(REGISTER_EVENTS.SHOW_REGISTERED, callback);
  }

  /**
   * Emit event when registration count is updated
   */
  emitRegistrationCountUpdated(payload: RegistrationCountUpdatedPayload) {
    console.log('📡 [RegisterEventEmitter] Registration count updated:', payload.showId, '→', payload.totalRegistrations);
    DeviceEventEmitter.emit(REGISTER_EVENTS.REGISTRATION_COUNT_UPDATED, payload);
  }

  /**
   * Listen for registration count updates
   */
  onRegistrationCountUpdated(callback: (payload: RegistrationCountUpdatedPayload) => void) {
    return DeviceEventEmitter.addListener(REGISTER_EVENTS.REGISTRATION_COUNT_UPDATED, callback);
  }
}

export const RegisterEventEmitter = new RegisterEventEmitterClass();
export default RegisterEventEmitter;
