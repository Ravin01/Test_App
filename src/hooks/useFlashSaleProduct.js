// hooks/useFlashSaleProduct.js
// ✅ UPDATED: Match web version exactly with all fallbacks and strategies
import { useMemo } from 'react';

export const useFlashSaleProduct = (product, activeFlashSales) => {
  return useMemo(() => {
    if (!product || !activeFlashSales?.length) return null;
    
    // Check if this is a bundle product
    const isBundle = product.bundleSaleId || product.bundleTitle;
    const bundleId = product.bundleSaleId || product._id;
    const productId = product.productId?._id || product._id;
    
    // Find if this product/bundle is in any active flash sale
    for (const flashSale of activeFlashSales) {
      // Handle bundle flash sales
      if (isBundle && flashSale.isBundle && flashSale.bundleId === bundleId) {
        return {
          flashPrice: flashSale.flashPrice,
          originalPrice: flashSale.originalPrice || flashSale.bundlePrice,
          flashSaleId: flashSale.flashSaleId || flashSale._id,
          // ✅ CRITICAL: Try multiple field names for timing (AppSync uses different fields than socket)
          saleStartTime: flashSale.saleStartTime || flashSale.startTime || flashSale.startsAt,
          saleEndTime: flashSale.saleEndTime || flashSale.endTime || flashSale.endsAt,
          saleStatus: flashSale.status,
          isBundle: true,
          bundleQuantity: flashSale.bundleQuantity,
          products: flashSale.products,
          limitingProduct: flashSale.limitingProduct
        };
      }
      
      // Handle regular product flash sales
      if (!isBundle && !flashSale.isBundle) {
        // ✅ CRITICAL FIX: Try multiple matching strategies (from web)
        let flashSaleProduct = null;
        
        // Strategy 1: Check if products array exists and match by productId field
        if (flashSale.products && Array.isArray(flashSale.products)) {
          flashSaleProduct = flashSale.products.find(p => {
            return p.productId === productId || 
                   p._id === productId ||
                   p.productId?._id === productId;
          });
        }
        
        // Strategy 2: Check if the flash sale itself represents a single product
        // (Some backends might not wrap single products in an array)
        if (!flashSaleProduct && flashSale.productId) {
          const matches = flashSale.productId === productId || 
                        flashSale.productId?._id === productId;
          
          if (matches) {
            // Use the flash sale data directly
            flashSaleProduct = {
              productId: flashSale.productId,
              flashPrice: flashSale.flashPrice,
              originalPrice: flashSale.originalPrice,
              currentFlashStock: flashSale.currentStock || flashSale.availableStock
            };
          }
        }
        
        // ✅ REMOVED: Don't check status === 'active' because AppSync events don't have status field!
        if (flashSaleProduct) {
          return {
            ...flashSaleProduct,
            flashSaleId: flashSale.flashSaleId || flashSale._id,
            // ✅ CRITICAL: Ensure timing fields are present with fallbacks
            saleStartTime: flashSale.saleStartTime || flashSale.startTime || flashSale.startsAt,
            saleEndTime: flashSale.saleEndTime || flashSale.endTime || flashSale.endsAt,
            saleStatus: flashSale.status,
            isBundle: false,
            // Fallback for price fields if not in flashSaleProduct
            flashPrice: flashSaleProduct.flashPrice || flashSale.flashPrice,
            originalPrice: flashSaleProduct.originalPrice || flashSale.originalPrice
          };
        }
      }
    }
    
    return null;
  }, [product, activeFlashSales]);
};
