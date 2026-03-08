/**
 * Profile Setup Storage Service
 * 
 * Handles AsyncStorage operations for profile setup draft data.
 * Provides save, load, and clear functionality for form autosave.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Base storage key for profile setup draft
const STORAGE_KEY_BASE = '@profile_setup_draft';

/**
 * Get user-specific storage key
 * @param userId - User ID to create unique key
 * @returns User-specific storage key
 */
const getStorageKey = (userId?: string): string => {
  if (!userId) {
    console.warn('⚠️ No userId provided, using global storage key (not recommended)');
    return STORAGE_KEY_BASE;
  }
  return `${STORAGE_KEY_BASE}_${userId}`;
};

/**
 * Interface for profile setup draft data
 */
export interface ProfileSetupDraft {
  userName: string;
  name: string;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | '';
  mobile: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  addressType: string;
  isDefault: boolean;
  selectedImageUri?: string | null;
  timestamp: number;
}

/**
 * Save profile setup draft to AsyncStorage
 * @param data - Form data to save
 * @param userId - User ID for user-specific storage
 * @returns Promise<boolean> - Success status
 */
export const saveProfileDraft = async (
  data: Partial<ProfileSetupDraft>,
  userId?: string
): Promise<boolean> => {
  try {
    const draftData: ProfileSetupDraft = {
      ...data as ProfileSetupDraft,
      timestamp: Date.now(),
    };
    
    const storageKey = getStorageKey(userId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(draftData));
    console.log(`✅ Profile draft saved successfully for user: ${userId || 'global'}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving profile draft:', error);
    return false;
  }
};

/**
 * Load profile setup draft from AsyncStorage
 * @param userId - User ID for user-specific storage
 * @returns Promise<ProfileSetupDraft | null> - Draft data or null if not found
 */
export const loadProfileDraft = async (userId?: string): Promise<ProfileSetupDraft | null> => {
  try {
    const storageKey = getStorageKey(userId);
    const draftJson = await AsyncStorage.getItem(storageKey);
    
    if (!draftJson) {
      console.log(`ℹ️ No profile draft found for user: ${userId || 'global'}`);
      return null;
    }
    
    const draft: ProfileSetupDraft = JSON.parse(draftJson);
    console.log(`✅ Profile draft loaded successfully for user: ${userId || 'global'}`);
    return draft;
  } catch (error) {
    console.error('❌ Error loading profile draft:', error);
    return null;
  }
};

/**
 * Clear profile setup draft from AsyncStorage
 * @param userId - User ID for user-specific storage
 * @returns Promise<boolean> - Success status
 */
export const clearProfileDraft = async (userId?: string): Promise<boolean> => {
  try {
    const storageKey = getStorageKey(userId);
    await AsyncStorage.removeItem(storageKey);
    console.log(`✅ Profile draft cleared successfully for user: ${userId || 'global'}`);
    return true;
  } catch (error) {
    console.error('❌ Error clearing profile draft:', error);
    return false;
  }
};

/**
 * Get the timestamp of the last saved draft
 * @param userId - User ID for user-specific storage
 * @returns Promise<number | null> - Timestamp or null if no draft exists
 */
export const getDraftTimestamp = async (userId?: string): Promise<number | null> => {
  try {
    const draft = await loadProfileDraft(userId);
    return draft?.timestamp || null;
  } catch (error) {
    console.error('❌ Error getting draft timestamp:', error);
    return null;
  }
};

/**
 * Check if a draft exists
 * @param userId - User ID for user-specific storage
 * @returns Promise<boolean> - True if draft exists
 */
export const draftExists = async (userId?: string): Promise<boolean> => {
  try {
    const storageKey = getStorageKey(userId);
    const draftJson = await AsyncStorage.getItem(storageKey);
    return draftJson !== null;
  } catch (error) {
    console.error('❌ Error checking draft existence:', error);
    return false;
  }
};

/**
 * Helper function to clean mobile number - remove country code prefix if present
 * @param mobile - Mobile number to clean
 * @returns Cleaned mobile number
 */
export const cleanMobileNumber = (mobile: string): string => {
  if (!mobile) return '';
  // Remove '+91' prefix if it exists (handles both '+91' and '+91 ' with space)
  const cleaned = mobile.replace(/^\+91\s*/, '').trim();
  return cleaned;
};