import axiosInstance from '../Utils/Api';

/**
 * Wallet balance data structure (matches actual API response)
 */
export interface WalletBalanceData {
  balance: number;
  availableBalance: number;
  lockedBalance: number;
  currency: string;  // Currency code (e.g., 'INR')
}

/**
 * Transaction data structure (matches actual API response)
 */
export interface Transaction {
  _id: string;                    // MongoDB ID
  walletId: string;               // Wallet reference
  userId: string;                 // User reference
  transactionId: string;          // Transaction reference ID
  type: 'credit' | 'debit';       // Transaction type
  amount: number;                 // Transaction amount
  balanceBefore: number;          // Balance before transaction
  balanceAfter: number;           // Balance after transaction
  source: string;                 // Source (topup, order_payment, refund, etc.)
  status: 'completed' | 'pending' | 'failed';  // Transaction status
  razorpayOrderId: string | null; // Razorpay order ID
  razorpayPaymentId: string | null; // Razorpay payment ID
  orderId: string | null;         // Order reference (if applicable)
  description: string;            // Transaction description
  createdAt: string;              // Creation timestamp
  updatedAt: string;              // Last update timestamp
  __v?: number;                   // MongoDB version key
}

/**
 * Pagination data structure (matches API response)
 */
export interface Pagination {
  page: number;      // Current page number
  pages: number;     // Total number of pages
  total: number;     // Total number of items
  limit: number;     // Items per page
}

/**
 * Transaction history response
 */
export interface TransactionHistoryResponse {
  data: Transaction[];
  pagination: Pagination | null;
}

/**
 * Balance check result
 */
export interface BalanceCheckResult {
  hasSufficientBalance: boolean;
  availableBalance: number;
  shortfall: number;
}

/**
 * Topup order details (matches actual API response)
 */
export interface TopupOrderDetails {
  success: boolean;
  message: string;
  data: {
    amount: number;
    currency: string;
    keyId: string;
    razorpayOrderId: string;
    transactionId: string;
  };
}

/**
 * Payment verification data (matches Razorpay response format)
 */
export interface PaymentVerificationData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Get user's wallet balance
 * @returns {Promise<WalletBalanceData>} Wallet balance data
 */
export const getWalletBalance = async (): Promise<WalletBalanceData> => {
  try {
    const response = await axiosInstance.get('/wallet/balance');
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch wallet balance:', error);
    throw error.response?.data || {
      status: false,
      message: error.message || 'Failed to fetch wallet balance',
    };
  }
};

/**
 * Check if wallet has sufficient balance
 * @param {number} requiredAmount - Amount needed
 * @returns {Promise<BalanceCheckResult>} Balance check result
 */
export const checkWalletBalance = async (
  requiredAmount: number
): Promise<BalanceCheckResult> => {
  try {
    const balance = await getWalletBalance();
    return {
      hasSufficientBalance: balance.availableBalance >= requiredAmount,
      availableBalance: balance.availableBalance,
      shortfall: Math.max(0, requiredAmount - balance.availableBalance),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get wallet transaction history
 * @param {Object} params - Query parameters
 * @returns {Promise<TransactionHistoryResponse>} Transaction list with pagination
 */
export const getWalletTransactions = async (
  params: Record<string, any> = {}
): Promise<TransactionHistoryResponse> => {
  try {
    const response = await axiosInstance.get('/wallet/transactions', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || null,
    };
  } catch (error: any) {
    console.error('Failed to fetch wallet transactions:', error);
    throw error.response?.data || {
      status: false,
      message: 'Failed to fetch transactions',
    };
  }
};

/**
 * Initiate wallet topup
 * @param {number} amount - Amount to add
 * @returns {Promise<TopupOrderDetails>} Topup order details
 */
export const initiateTopup = async (amount: number): Promise<TopupOrderDetails> => {
  try {
    const response = await axiosInstance.post('/wallet/topup/initiate', { amount });
    return response.data;
  } catch (error: any) {
    console.error('Failed to initiate topup:', error);
    throw error.response?.data || {
      status: false,
      message: 'Failed to initiate wallet topup',
    };
  }
};

/**
 * Verify wallet topup payment
 * @param {PaymentVerificationData} paymentData - Razorpay payment data
 * @returns {Promise<any>} Verification result
 */
export const verifyTopup = async (paymentData: PaymentVerificationData): Promise<any> => {
  try {
    const response = await axiosInstance.post('/wallet/topup/verify', paymentData);
    return response.data;
  } catch (error: any) {
    console.error('Failed to verify topup:', error);
    throw error.response?.data || {
      status: false,
      message: 'Failed to verify wallet topup',
    };
  }
};

/**
 * Format currency amount in Indian Rupees
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount
 */
export const formatCurrency = (amount: number): string => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback if Intl is not available
    return `₹${amount.toFixed(2)}`;
  }
};

/**
 * Format amount without currency symbol
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount
 */
export const formatAmount = (amount: number): string => {
  try {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return amount.toFixed(2);
  }
};
