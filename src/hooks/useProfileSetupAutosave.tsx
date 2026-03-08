/**
 * Profile Setup Autosave Hook
 * 
 * Custom hook for autosaving profile setup form data to AsyncStorage.
 * Integrates with React Hook Form and handles smart merge logic for verified data.
 */

import { useEffect, useCallback, useRef } from 'react';
import { ToastAndroid, Platform } from 'react-native';
import { UseFormWatch, UseFormReset, UseFormSetValue } from 'react-hook-form';
import {
  saveProfileDraft,
  loadProfileDraft,
  clearProfileDraft,
  cleanMobileNumber,
  ProfileSetupDraft,
} from '../Services/profileSetupStorage';

interface User {
  _id?: string;  // MongoDB ID field
  userName?: string;
  name?: string;
  mobile?: string;
  isMobileVerified?: boolean;
  profileURL?: {
    key?: string;
  };
}

interface UseProfileSetupAutosaveReturn {
  loadDraft: () => Promise<void>;
  clearDraft: () => Promise<void>;
  isEnabled: boolean;
}

/**
 * Hook for autosaving profile setup form data
 * 
 * @param watch - React Hook Form watch function
 * @param reset - React Hook Form reset function
 * @param setValue - React Hook Form setValue function
 * @param user - Current user context data
 * @param selectedImageUri - Selected image URI state
 * @param setSelectedImageUri - Function to set selected image URI
 * @param enabledOverride - Optional override for enabling/disabling autosave
 * @returns Object with loadDraft, clearDraft, and isEnabled
 */
export const useProfileSetupAutosave = (
  watch: UseFormWatch<any>,
  reset: UseFormReset<any>,
  setValue: UseFormSetValue<any>,
  user: User | null,
  selectedImageUri: string | null,
  setSelectedImageUri: (uri: string | null) => void,
  enabledOverride?: boolean
): UseProfileSetupAutosaveReturn => {
  // Determine if autosave is enabled
  const isEnabled = enabledOverride ?? true;   // default to true if enabledOverride is undefined
  
  // Ref to track if draft has been loaded
  const draftLoadedRef = useRef(false);
  
  /**
   * Load draft from AsyncStorage and merge with form
   */
  const loadDraft = useCallback(async () => {
    if (!isEnabled) {
      console.log('ℹ️ Autosave is disabled, skipping draft load');
      return;
    }
    
    if (draftLoadedRef.current) {
      console.log('ℹ️ Draft already loaded, skipping');
      return;
    }
    
    try {
      const draft = await loadProfileDraft(user?._id);
      
      if (!draft) {
        console.log('ℹ️ No draft to load');
        draftLoadedRef.current = true;
        return;
      }
      
      // Smart mobile number resolution
      const resolvedMobile = (() => {
        // Priority 1: If mobile is verified, ALWAYS use verified mobile from user context
        if (user?.isMobileVerified && user?.mobile) {
          console.log('📱 Using verified mobile from user context');
          return cleanMobileNumber(user.mobile);
        }
        
        // Priority 2: Use draft mobile if user is not verified
        if (draft.mobile && !user?.isMobileVerified) {
          console.log('📱 Using mobile from draft (unverified)');
          return draft.mobile;
        }
        
        // Priority 3: Fallback to user context mobile
        console.log('📱 Using mobile from user context (fallback)');
        return cleanMobileNumber(user?.mobile || '');
      })();
      
      // Merge draft with resolved mobile
      const mergedData = {
        ...draft,
        mobile: resolvedMobile,
      };
      
      // Reset form with merged data first
      reset(mergedData);
      
      // Then set selected image URI if present in draft (after reset to ensure state sync)
      if (draft.selectedImageUri) {
        setSelectedImageUri(draft.selectedImageUri);
      }
      
      // Show notification if mobile was changed due to verification
      if (user?.isMobileVerified && draft.mobile !== resolvedMobile) {
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            '✅ Using your verified mobile number',
            ToastAndroid.SHORT
          );
        }
      }
      
      console.log('✅ Draft loaded and merged successfully');
      draftLoadedRef.current = true;
    } catch (error) {
      console.error('❌ Error loading draft:', error);
      draftLoadedRef.current = true;
    }
  }, [isEnabled, user, reset, setSelectedImageUri]);
  
  /**
   * Clear draft from AsyncStorage
   */
  const clearDraft = useCallback(async () => {
    try {
      await clearProfileDraft(user?._id);
      draftLoadedRef.current = false;
      console.log('✅ Draft cleared');
    } catch (error) {
      console.error('❌ Error clearing draft:', error);
    }
  }, [user?._id]);
  
  /**
   * Autosave effect - saves form data after debounce
   */
  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    
    if (!draftLoadedRef.current) {
      // Don't autosave until draft is loaded
      return;
    }
    
    // Watch all form fields
    const subscription = watch((formData) => {
      // Debounce autosave (2 seconds after last change)
      const timeoutId = setTimeout(async () => {
        try {
          // Prepare data to save
          const dataToSave: Partial<ProfileSetupDraft> = {
            userName: formData.userName,
            name: formData.name,
            gender: formData.gender,
            mobile: formData.mobile,
            line1: formData.line1,
            line2: formData.line2,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            addressType: formData.addressType,
            isDefault: formData.isDefault,
            selectedImageUri: selectedImageUri,
          };
          
          // Don't save if mobile is verified (to avoid overwriting)
          if (user?.isMobileVerified) {
            delete dataToSave.mobile;
          }
          
          await saveProfileDraft(dataToSave, user?._id);
        } catch (error) {
          console.error('❌ Autosave failed:', error);
        }
      }, 2000); // 2 second debounce
      
      return () => clearTimeout(timeoutId);
    });
    
    return () => subscription.unsubscribe();
  }, [isEnabled, watch, selectedImageUri, user?._id, user?.isMobileVerified, draftLoadedRef.current]);
  
  return {
    loadDraft,
    clearDraft,
    isEnabled,
  };
};