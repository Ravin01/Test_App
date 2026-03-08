// customHooks/useMobileVerification.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { otpService } from '../Services/otpService';
import { ToastAndroid } from 'react-native';

// API Functions - Now using Communication Backend directly
const sendMobileOTPAPI = async (mobileNumber, purpose = 'user_verification') => {
    return await otpService.sendMobileOTP(mobileNumber, purpose);
};

const verifyMobileOTPAPI = async (otp, purpose = 'user_verification') => {
    return await otpService.verifyMobileOTP(otp, purpose);
};

const getMobileStatusAPI = async () => {
    return await otpService.getMobileVerificationStatus();
};

export const useMobileVerification = (fetchUser, purpose = 'user_verification') => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [mobileStatus, setMobileStatus] = useState({
        mobile: null,
        isMobileVerified: false
    });
    
    const [currentMobileNumber, setCurrentMobileNumber] = useState('');
    const countdownRef = useRef(null);
    const backgroundTimestampRef = useRef(null);
    const appStateRef = useRef(AppState.currentState);

    // Handle AppState changes for background/foreground transitions
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            // App going to background
            if (
                appStateRef.current.match(/active|foreground/) &&
                nextAppState.match(/inactive|background/)
            ) {
                // Store current timestamp and remaining countdown
                if (countdown > 0) {
                    backgroundTimestampRef.current = Date.now();
                }
            }
            
            // App coming to foreground
            if (
                appStateRef.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // Calculate elapsed time and adjust countdown
                if (backgroundTimestampRef.current && countdown > 0) {
                    const elapsedSeconds = Math.floor(
                        (Date.now() - backgroundTimestampRef.current) / 1000
                    );
                    
                    setCountdown((prev) => {
                        const newCountdown = prev - elapsedSeconds;
                        return newCountdown > 0 ? newCountdown : 0;
                    });
                    
                    backgroundTimestampRef.current = null;
                }
            }
            
            appStateRef.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [countdown]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, []);

    // Countdown timer with proper cleanup
    useEffect(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
        }

        if (countdown > 0) {
            countdownRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, [countdown]);

    const fetchMobileStatus = useCallback(async () => {
        try {
            const result = await getMobileStatusAPI();
            if (result.status) {
                setMobileStatus({
                    mobile: result.data?.mobile,
                    isMobileVerified: result.data?.isMobileVerified
                });
            }
        } catch (err) {
            console.error('Error fetching mobile status:', err);
        }
    }, []);

    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    const startResendTimer = () => {
        setCountdown(60);
    };

    const sendOTP = async (mobileNumber) => {
        clearMessages();
        
        if (!mobileNumber) {
            setError('Please enter a valid mobile number.');
            return false;
        }

        setLoading(true);
        try {
            const result = await sendMobileOTPAPI(mobileNumber, purpose);
            
            if (result.status) {
                setOtpSent(true);
                setCurrentMobileNumber(mobileNumber);
                
                // --- THIS WAS THE BUG ---
                // setSuccess('OTP sent successfully to your mobile number.'); // <-- REMOVE THIS LINE
                // --- END OF FIX ---

                startResendTimer();
                return true;
            } else {
                setError(result.message || 'Failed to send OTP.');
                return false;
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to send OTP. Please try again.';
            setError(errorMessage);
            ToastAndroid.show(errorMessage, ToastAndroid.LONG);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP function
    const resendOTP = async (mobileToResend) => {
        const number = mobileToResend || currentMobileNumber;
        if (countdown > 0 || !number) {
            return false;
        }
        if (loading) return false;
        clearMessages();
        setLoading(true);
        
        try {
            const result = await sendMobileOTPAPI(number, purpose);
            console.log ("Resend OTP result:", result);
            if (result.status) {
                // We only want to set success on VERIFY, not resend.
                // setSuccess('OTP resent successfully!'); // <-- Also remove this
                startResendTimer();
                return true;
            } else {
                setError(result.message || 'Failed to resend OTP.');
                return false;
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to resend OTP. Please try again.';
            setError(errorMessage);
           // ToastAndroid.show(errorMessage, ToastAndroid.LONG);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const verifyOTP = async (otp) => {
        if (loading) return false;
        clearMessages();
        
        if (!otp || otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP.');
            return false;
        }

        setLoading(true);
        try {
            const result = await verifyMobileOTPAPI(otp, purpose);

            console.log("Verify OTP result:", result);
            
            if (result.status) {
                // This is the ONLY place 'success' should be set
                setSuccess(result.message || "Verification successful!");
                setOtpSent(false);
                setCountdown(0);
                
                // Clear timer
                if (countdownRef.current) {
                    clearInterval(countdownRef.current);
                }
                
                // Update local state - FIX: Access result.data instead of result.user
               setMobileStatus({
                    mobile: result.data.mobile,
                    isMobileVerified: result.data.isMobileVerified
                });
                
                // Refresh user data
                if (fetchUser) {
                    await fetchUser();
                }
                
                return true;
            } else {
                setError(result.message || 'OTP verification failed.');
                return false;
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'OTP verification failed. Please try again.';
            setError(errorMessage);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Reset the entire state
    const resetState = useCallback(() => {
        setLoading(false);
        setError('');
        setSuccess('');
        setOtpSent(false);
        setCountdown(0);
        setCurrentMobileNumber('');
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
        }
    }, []);

    return { 
        loading, 
        error, 
        success, 
        otpSent, 
        countdown, 
        mobileStatus,
        currentMobileNumber,
        sendOTP, 
        verifyOTP,
        resendOTP,
        refreshMobileStatus: fetchMobileStatus,
        resetState
    };
};
