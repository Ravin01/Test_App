// src/Services/flashSaleApi.ts

import axiosInstance from '../Utils/Api';

export interface FlashSaleParams {
  sellerId: string;
  livePage?: number;
  upcomingPage?: number;
  limit?: number;
}

export interface FlashSaleProduct {
  productId: {
    _id: string;
    title: string;
    images: Array<{ key: string; url?: string }>;
    MRP: number;
    productPrice: number;
    category: string;
    subcategory?: string;
    gstRate: number;
    stockId: {
      quantity: number;
      isInStock: boolean;
    };
    childVariantIds?: Array<{
      stockId: {
        quantity: number;
        isInStock: boolean;
      };
      variantAttributes: {
        color?: string;
        [key: string]: any;
      };
    }>;
  };
  flashPrice: number;
  originalPrice: number;
  currentFlashStock: number;
  initialFlashStock: number;
  sold: number;
}

export interface FlashSale {
  _id: string;
  title: string;
  status: 'active' | 'upcoming';
  startTime: string;
  endTime: string;
  isLive: boolean;
  saleType: 'normal';
  totalSold: number;
  revenue: number;
  products: FlashSaleProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface FlashSaleResponse {
  success: boolean;
  sellerId: string;
  live: {
    sales: FlashSale[];
    page: number;
    hasMore: boolean;
    totalPages: number;
    totalCount: number;
  };
  upcoming: {
    sales: FlashSale[];
    page: number;
    hasMore: boolean;
    totalPages: number;
    totalCount: number;
  };
}

export async function getSellerFlashSales({
  sellerId,
  livePage = 1,
  upcomingPage = 1,
  limit = 200
}: FlashSaleParams): Promise<FlashSaleResponse> {
  try {
    const response = await axiosInstance.get(
      `/user/flash-sales/seller/${sellerId}`,
      {
        params: {
          livePage,
          upcomingPage,
          limit
        }
      }
    );
    
    if (!response.data.success) {
      throw new Error('Failed to fetch seller flash sales');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching seller flash sales:', error);
    throw error;
  }
}
