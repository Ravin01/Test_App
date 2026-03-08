/**
 * OTP Service for Communication Backend API
 * 
 * This service handles all OTP-related operations including:
 * - Sending OTP to mobile numbers
 * - Verifying OTP codes
 * - Checking mobile verification status
 * - Resending OTP
 * 
 */

import axiosCommunication from '../Utils/axiosCommunication';

// ============================================
// Types & Interfaces
// ============================================

export type OTPPurpose = 'user_verification' | 'password_reset' | 'account_recovery' | string;

export interface SendOTPRequest {
  mobileNumber: string;
  purpose?: OTPPurpose;
}

export interface SendOTPResponse {
  status: boolean;
  message: string;
  data: {
    mobile: string;
    purpose: string;
    expiresAt: string;
  };
}

export interface VerifyOTPRequest {
  otp: string;
  purpose?: OTPPurpose;
}

export interface VerifyOTPResponse {
  status: boolean;
  message: string;
  data: {
    mobile: string;
    isMobileVerified: boolean;
    purpose: OTPPurpose;
  };
}

export interface MobileStatusResponse {
  status: boolean;
  data: {
    mobile: string;
    isMobileVerified: boolean;
  };
}

export interface OTPError {
  success: false;
  message: string;
  error?: string;
}

// ============================================
// OTP Service Functions
// ============================================

/**
 * Send OTP to Mobile Number
 * 
 * Sends a 6-digit OTP to the specified mobile number for verification.
 * 
 * @param mobileNumber - Mobile number with country code (e.g., "+919876543210")
 * @param purpose - Purpose of OTP (default: "user_verification")
 * @returns Promise with OTP sent status and expiration time
 * 
 * @example
 * ```typescript
 * const response = await otpService.sendMobileOTP('+919876543210');
 * console.log(response.data.expiresIn); // 300 (seconds)
 * ```
 */
export const sendMobileOTP = async (
  mobileNumber: string,
  purpose: OTPPurpose = 'user_verification'
): Promise<SendOTPResponse> => {
  try {
    const response = await axiosCommunication.post<SendOTPResponse>('/otp/send-mobile', {
      mobileNumber,
      purpose,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'Failed to send OTP';
    throw new Error(errorMessage);
  }
};

/**
 * Verify Mobile OTP
 * 
 * Verifies the 6-digit OTP code entered by the user.
 * 
 * @param otp - 6-digit OTP code
 * @param purpose - Purpose of OTP (default: "user_verification")
 * @returns Promise with verification status
 * 
 * @example
 * ```typescript
 * try {
 *   const response = await otpService.verifyMobileOTP('123456');
 *   if (response.data.verified) {
 *     console.log('Mobile verified successfully!');
 *   }
 * } catch (error) {
 *   console.log('Invalid or expired OTP');
 * }
 * ```
 */
export const verifyMobileOTP = async (
  otp: string,
  purpose: OTPPurpose = 'user_verification'
): Promise<VerifyOTPResponse> => {
  try {
    const response = await axiosCommunication.post<VerifyOTPResponse>('/otp/verify-mobile', {
      otp,
      purpose,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'OTP verification failed';
    throw new Error(errorMessage);
  }
};

/**
 * Get Mobile Verification Status
 * 
 * Retrieves the mobile verification status for the logged-in user.
 * 
 * @returns Promise with mobile number and verification status
 * 
 * @example
 * ```typescript
 * const status = await otpService.getMobileVerificationStatus();
 * if (status.data.isVerified) {
 *   console.log(`Mobile ${status.data.mobileNumber} is verified`);
 * }
 * ```
 */
export const getMobileVerificationStatus = async (): Promise<MobileStatusResponse> => {
  try {
    const response = await axiosCommunication.get<MobileStatusResponse>('/otp/mobile-status');
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'Failed to fetch mobile status';
    throw new Error(errorMessage);
  }
};

/**
 * Resend OTP to Mobile Number
 * 
 * Uses the same endpoint as sendMobileOTP to resend OTP.
 * Note: There may be rate limiting (usually 60 seconds between requests).
 * 
 * @param mobileNumber - Mobile number with country code
 * @param purpose - Purpose of OTP (default: "user_verification")
 * @returns Promise with OTP sent status
 * 
 * @example
 * ```typescript
 * try {
 *   await otpService.resendMobileOTP('+919876543210');
 *   console.log('OTP resent successfully');
 * } catch (error) {
 *   // Handle "OTP already sent recently" error
 * }
 * ```
 */
export const resendMobileOTP = async (
  mobileNumber: string,
  purpose: OTPPurpose = 'user_verification'
): Promise<SendOTPResponse> => {
  return sendMobileOTP(mobileNumber, purpose);
};

// ============================================
// Export as Service Object
// ============================================

export const otpService = {
  sendMobileOTP,
  verifyMobileOTP,
  getMobileVerificationStatus,
  resendMobileOTP,
};

export default otpService;
