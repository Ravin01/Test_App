import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Api from '../Utils/Api';
import { useAuthContext } from './AuthContext';
import { Check } from 'lucide-react-native';

const AccessContext = createContext(undefined);

export const useAccess = () => {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within AccessProvider');
  }
  return context;
};

export const AccessProvider = ({ children }) => {
  const { user } = useAuthContext();
  const [isAccessMode, setIsAccessMode] = useState(false);
  const [accessPermissions, setAccessPermissions] = useState([]);
  const [sellerId, setSellerId] = useState(null);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [accessUserId, setAccessUserId] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allPermissions, setAllPermissions] = useState([]);
  const [isEnteringAccessMode, setIsEnteringAccessMode] = useState(false);

  // Initialize from AsyncStorage
  useEffect(() => {
    const initializeFromStorage = async () => {
      try {
        const stored = await AsyncStorage.getItem('accessMode');
        const permissions = await AsyncStorage.getItem('accessPermissions');
        const storedSellerId = await AsyncStorage.getItem('accessSellerId');
        const storedSellerInfo = await AsyncStorage.getItem('accessSellerInfo');
        const storedAccessUserId = await AsyncStorage.getItem('accessUserId');

        if (stored) setIsAccessMode(JSON.parse(stored));
        if (permissions) setAccessPermissions(JSON.parse(permissions));
        if (storedSellerId) setSellerId(storedSellerId);
        if (storedSellerInfo) setSellerInfo(JSON.parse(storedSellerInfo));
        if (storedAccessUserId) setAccessUserId(storedAccessUserId);
      } catch (error) {
        console.error('Error loading from AsyncStorage:', error);
      }
    };

    initializeFromStorage();
  }, []);

  // Check if user has access on mount and restore access mode if needed
  useEffect(() => {
    if (!user) return;
    checkUserAccess();
  }, [user]);

  // Restore access mode on mount if it was active
  useEffect(() => {
    const restoreIfNeeded = async () => {
      try {
        const storedMode = await AsyncStorage.getItem('accessMode');
        const storedSellerId = await AsyncStorage.getItem('accessSellerId');
        
        if (storedMode === 'true' && storedSellerId) {
          // Verify the access is still valid
          await restoreAccessMode(storedSellerId);
        }
      } catch (error) {
        console.error('Error restoring access mode:', error);
      }
    };
     
    if(user){
      restoreIfNeeded();
    }
  }, [user]);

  const checkUserAccess = async () => {
    try {
      const response = await Api.get('/user/access/my-permissions');
      const permissions = response.data.data || [];
      
      setAllPermissions(permissions);
      
      if (permissions.length > 0) {
        setHasAccess(true);
        // Don't automatically set access mode, just store that they have access
      } else {
        setHasAccess(false);
        // Clear AsyncStorage if user no longer has access
        await clearAccessModeFromStorage();
      }
    } catch (error) {
      console.log('Error checking user access:', error.response);
      setHasAccess(false);
      setAllPermissions([]);
      await clearAccessModeFromStorage();
    } finally {
      setLoading(false);
    }
  };

  // Restore access mode from a specific seller ID
  const restoreAccessMode = async (storedSellerId) => {
    try {
      const response = await Api.get('/user/access/my-permissions');
      const permissions = response.data.data || [];
      
      // Find the permission for the stored seller
      const matchingPermission = permissions.find(
        p => p.sellerId._id === storedSellerId
      );
      
      if (matchingPermission) {
        setIsAccessMode(true);
        setAccessPermissions(matchingPermission.accessPages || []);
        setSellerId(matchingPermission.sellerId._id);
        setSellerInfo(matchingPermission.sellerId);
        setAccessUserId(matchingPermission.sellerId?.userInfo?._id);
        
        // Update AsyncStorage with fresh data
        await saveAccessModeToStorage(
          true,
          matchingPermission.accessPages,
          matchingPermission.sellerId._id,
          matchingPermission.sellerId,
          matchingPermission.sellerId?.userInfo?._id
        );
      } else {
        // Permission no longer exists, clear storage
        await clearAccessModeFromStorage();
      }
    } catch (error) {
      console.error('Error restoring access mode:', error);
      await clearAccessModeFromStorage();
    }
  };

  // Save access mode to AsyncStorage
  const saveAccessModeToStorage = async (mode, permissions, sellerId, sellerInfo, userId) => {
    try {
      await AsyncStorage.setItem('accessMode', JSON.stringify(mode));
      await AsyncStorage.setItem('accessPermissions', JSON.stringify(permissions));
      await AsyncStorage.setItem('accessSellerId', sellerId);
      await AsyncStorage.setItem('accessSellerInfo', JSON.stringify(sellerInfo));
      if (userId) {
        await AsyncStorage.setItem('accessUserId', userId);
      }
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
    }
  };

  // Clear access mode from AsyncStorage
  const clearAccessModeFromStorage = async () => {
    try {
      await AsyncStorage.multiRemove([
        'accessMode',
        'accessPermissions',
        'accessSellerId',
        'accessSellerInfo',
        'accessUserId'
      ]);
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  };

// Clear cache when user changes   // newly added
useEffect(() => {
  if (user) {
    clearAccessModeFromStorage();
    checkUserAccess();
  }
}, [user?._id]); // React to user ID changes

  const enterAccessMode = async () => {
    console.log('Entering access mode');
    setIsEnteringAccessMode(true);
    try {
      const response = await Api.get('/user/access/my-permissions');
      const permissions = response.data.data || [];
      
      if (permissions.length > 0) {
        const firstAccess = permissions[0];
        setIsAccessMode(true);
        setAccessPermissions(firstAccess.accessPages || []);
        setSellerId(firstAccess.sellerId._id);
        setSellerInfo(firstAccess.sellerId);
        setAccessUserId(firstAccess.sellerId?.userInfo?._id);
        
        // Persist to AsyncStorage
        await saveAccessModeToStorage(
          true,
          firstAccess.accessPages || [],
          firstAccess.sellerId._id,
          firstAccess.sellerId,
          firstAccess.sellerId?.userInfo?._id
        );
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error entering access mode:', error);
      return false;
    } finally {
      setIsEnteringAccessMode(false);
    }
  };

  const exitAccessMode = async () => {
    console.log('Exiting access mode');
    setIsAccessMode(false);
    setAccessPermissions([]);
    setSellerId(null);
    setSellerInfo(null);
    setAccessUserId(null);
    
    // Clear from AsyncStorage
    await clearAccessModeFromStorage();
  };

  const hasPageAccess = (pageType) => {
    if (!isAccessMode) return true; // If not in access mode, show all pages (seller mode)
    //console.log('Accesses:', accessPermissions)
    return accessPermissions.some(page => page.pageType === pageType);
  };

  const getPagePermissions = (pageType) => {
    if (!isAccessMode) {
      // In normal seller mode, user has full permissions
      return { canView: true, canCreate: true, canEdit: true, canDelete: true };
    }
    
    // In access mode, get specific permissions
    const page = accessPermissions.find(p => p.pageType === pageType);
    return page || { canView: false, canCreate: false, canEdit: false, canDelete: false };
  };

  // Check if user can perform a specific action on a page
  const canPerformAction = (pageType, action) => {
    if (!isAccessMode) return true; // Full access in normal seller mode
    
    const permissions = getPagePermissions(pageType);
    const actionMap = {
      view: 'canView',
      create: 'canCreate',
      edit: 'canEdit',
      delete: 'canDelete',
    };
    
    return permissions[actionMap[action]] || false;
  };

  // Get the effective seller ID to use for API calls
  const getEffectiveSellerId = () => {
    // If in access mode, return the accessed seller's ID
    // Otherwise, return null (API will use authenticated user's seller ID)
    return isAccessMode ? sellerId : null;
  };

  // Check if user has any permission (at least view) for a page
  const hasAnyPermission = (pageType) => {
    if (!isAccessMode) return true;
    
    const permissions = getPagePermissions(pageType);
    return permissions.canView || permissions.canCreate || permissions.canEdit || permissions.canDelete;
  };

  // Get all pages user has access to
  const getAccessiblePages = () => {
    if (!isAccessMode) {
      // Return all pages in normal mode
      return [
        'DASHBOARD', 'STORE_SETUP', 'PRODUCT', 'BUNDLE', 'SHOPPABLE_VIDEO',
        'CO_HOST', 'SHOWS', 'SPONSORS', 'ORDERS', 'WALLET', 'SUBSCRIPTION',
        'FLASHSALE', 'PAYMENTS', 'FULFILLMENT', 'MARKETING', 'AUDIENCE',
        'USER_ACCESS', 'SUPPORT', 
        //'NOTIFICATIONS'
      ];
    }
    
    return accessPermissions
      .filter(page => page.canView || page.canCreate || page.canEdit || page.canDelete)
      .map(page => page.pageType);
  };

  const value = {
    // State
    isAccessMode,
    accessPermissions,
    sellerId,
    sellerInfo,
    accessUserId,
    hasAccess,
    loading,
    allPermissions,
    isEnteringAccessMode,
    
    // Mode control
    enterAccessMode,
    exitAccessMode,
    
    // Permission checking
    hasPageAccess,
    getPagePermissions,
    canPerformAction,
    hasAnyPermission,
    getAccessiblePages,
    
    // Data fetching helpers
    getEffectiveSellerId,
    
    // Refetch
    refetch: checkUserAccess,
  };

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};

// Custom hooks for common permission checks

/**
 * Hook to check if user can view a specific page
 * @param {string} pageType - The page type to check
 * @returns {boolean} - Whether user can view the page
 */
export const useCanView = (pageType) => {
  const { canPerformAction } = useAccess();
  return canPerformAction(pageType, 'view');
};

/**
 * Hook to check if user can create on a specific page
 * @param {string} pageType - The page type to check
 * @returns {boolean} - Whether user can create
 */
export const useCanCreate = (pageType) => {
  const { canPerformAction } = useAccess();
  return canPerformAction(pageType, 'create');
};

/**
 * Hook to check if user can edit on a specific page
 * @param {string} pageType - The page type to check
 * @returns {boolean} - Whether user can edit
 */
export const useCanEdit = (pageType) => {
  const { canPerformAction } = useAccess();
  return canPerformAction(pageType, 'edit');
};

/**
 * Hook to check if user can delete on a specific page
 * @param {string} pageType - The page type to check
 * @returns {boolean} - Whether user can delete
 */
export const useCanDelete = (pageType) => {
  const { canPerformAction } = useAccess();
  return canPerformAction(pageType, 'delete');
};

/**
 * Hook to get all permissions for a specific page
 * @param {string} pageType - The page type to check
 * @returns {object} - Object with canView, canCreate, canEdit, canDelete properties
 */
export const usePagePermissions = (pageType) => {
  const { getPagePermissions } = useAccess();
  return getPagePermissions(pageType);
};

/**
 * Hook to get the effective seller ID for API calls
 * Returns accessed seller ID if in access mode, null otherwise
 * @returns {string|null} - Seller ID or null
 */
export const useEffectiveSellerId = () => {
  const { getEffectiveSellerId } = useAccess();
  return getEffectiveSellerId();
};

/**
 * Hook to check current mode and get seller info
 * @returns {object} - Object with isAccessMode, isOwnData, and sellerInfo
 */
export const useAccessModeInfo = () => {
  const { isAccessMode, sellerInfo } = useAccess();
  return {
    isAccessMode,
    isOwnData: !isAccessMode,
    sellerInfo: isAccessMode ? sellerInfo : null,
  };
};

export default AccessContext;
