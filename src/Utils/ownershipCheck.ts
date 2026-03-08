/**
 * Centralized ownership validation utility
 * Handles different product/bundle/auction structures and sellerId formats
 */

/**
 * Check if the current user is the owner of a product/bundle/auction
 * @param {Object} user - Current logged-in user object
 * @param {Object} item - Product, bundle, auction, or show object to check
 * @returns {boolean} - True if user owns the item, false otherwise
 */
export const isUserOwner = (user: any, item: any): boolean => {
  if (!user || !item) return false;

  // Extract seller ID from various possible locations in the item
  const getSellerId = (obj: any): string | null => {
    // Try different paths where sellerId might be located
    const paths = [
      // Direct sellerId (can be object or string)
      obj?.sellerId?._id,
      obj?.sellerId,
      // Nested in product
      obj?.product?.sellerId?._id,
      obj?.product?.sellerId,
      // Nested in productId
      obj?.productId?.sellerId?._id,
      obj?.productId?.sellerId,
      // For shows/streams (host is the seller)
      obj?.host?._id,
      obj?.host?.userInfo?._id,
      // For bundles that might have seller info
      obj?.seller?._id,
      obj?.seller,
      // For auction winner checks
      obj?.auctioneer?._id,
      obj?.auctioneer,
    ];

    for (const path of paths) {
      if (path) {
        // Convert to string for comparison
        return String(path);
      }
    }
    return null;
  };

  const sellerId = getSellerId(item);
  if (!sellerId) {
    // No seller ID found, cannot determine ownership
    return false;
  }

  // Get user's seller ID - try multiple possible locations
  const userSellerId = user?.sellerInfo?._id || user?._id;
  
  if (!userSellerId) {
    // User has no seller ID
    return false;
  }

  // Compare as strings to handle both ObjectId and string formats
  return String(userSellerId) === String(sellerId);
};

/**
 * Check ownership and return detailed information
 * @param {Object} user - Current logged-in user object
 * @param {Object} item - Product, bundle, auction, or show object to check
 * @returns {Object} - { isOwner: boolean, sellerId: string|null, userId: string|null }
 */
export const getOwnershipDetails = (user: any, item: any): {
  isOwner: boolean;
  sellerId: string | null;
  userId: string | null;
} => {
  const isOwner = isUserOwner(user, item);
  
  // Extract IDs for debugging
  const getSellerId = (obj: any): string | null => {
    const paths = [
      obj?.sellerId?._id,
      obj?.sellerId,
      obj?.product?.sellerId?._id,
      obj?.product?.sellerId,
      obj?.productId?.sellerId?._id,
      obj?.productId?.sellerId,
      obj?.host?._id,
      obj?.host?.userInfo?._id,
      obj?.seller?._id,
      obj?.seller,
    ];
    
    for (const path of paths) {
      if (path) return String(path);
    }
    return null;
  };

  return {
    isOwner,
    sellerId: getSellerId(item),
    userId: user?.sellerInfo?._id || user?._id || null,
  };
};

export default isUserOwner;
