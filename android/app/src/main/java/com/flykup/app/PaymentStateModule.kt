package com.flykup.app

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

/**
 * Native module to manage payment state and prevent app reload when returning from external payment SDKs.
 * 
 * When Razorpay or other payment SDKs open, Android may kill/recreate the React Native activity.
 * This module sets a flag that tells MainActivity to preserve state during payment flow.
 */
class PaymentStateModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "PaymentStateModule"
    }

    override fun getName(): String = "PaymentStateModule"

    /**
     * Call this method BEFORE opening Razorpay checkout.
     * This sets a flag that prevents the app from reloading when returning from payment.
     */
    @ReactMethod
    fun setPaymentInProgress(inProgress: Boolean) {
        MainActivity.isPaymentInProgress = inProgress
        Log.d(TAG, "💳 Payment in progress set to: $inProgress")
    }

    /**
     * Get current payment state
     */
    @ReactMethod
    fun isPaymentInProgress(promise: Promise) {
        promise.resolve(MainActivity.isPaymentInProgress)
    }

    /**
     * Call this method AFTER payment completes (success or failure).
     * This resets the flag to allow normal activity lifecycle behavior.
     */
    @ReactMethod
    fun clearPaymentState() {
        MainActivity.isPaymentInProgress = false
        Log.d(TAG, "💳 Payment state cleared")
    }
}
