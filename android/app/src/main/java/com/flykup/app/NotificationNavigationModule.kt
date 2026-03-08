package com.flykup.app

import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class NotificationNavigationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "NotificationNavigation"
        private var pendingNavigationData: WritableMap? = null
        private var isRNReady = false
    }

    override fun getName(): String {
        return "NotificationNavigationModule"
    }

    /**
     * Called from MainActivity when app is opened via notification
     */
    @ReactMethod
    fun handleNotificationOpen(intent: Intent?) {
        try {
            intent?.let {
                val data = extractNavigationData(it)
                if (data != null) {
                    val chatRoomId = data.getString("chatRoomId")
                    val screen = data.getString("screen")
                    val notificationId = data.getString("notification_id")
                    
                    Log.d(TAG, "Notification opened - ID: $notificationId")
                    Log.d(TAG, "Navigation data - Screen: $screen, ChatRoomID: $chatRoomId")
                    Log.d(TAG, "Full data: ${data.toString()}")
                    
                    // Validate critical data before processing
                    if (screen == "Comment" && chatRoomId.isNullOrEmpty()) {
                        Log.e(TAG, "Critical error: Comment navigation requires chatRoomId")
                        return
                    }
                    
                    try {
                        if (isRNReady && reactApplicationContext?.hasActiveReactInstance() == true) {
                            Log.d(TAG, "RN is ready and active, sending navigation event immediately")
                            sendNavigationEvent(data)
                        } else {
                            // Store for later when RN is ready
                            pendingNavigationData = data
                            Log.d(TAG, "RN not ready or inactive, storing navigation data for later")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error processing navigation data: ${e.message}", e)
                        // Still store for retry
                        pendingNavigationData = data
                    }
                } else {
                    Log.w(TAG, "No navigation data extracted from intent")
                }
            } ?: Log.w(TAG, "Intent is null in handleNotificationOpen")
        } catch (e: Exception) {
            Log.e(TAG, "Critical error in handleNotificationOpen: ${e.message}", e)
            // Don't crash the app, just log the error
        }
    }

    /**
     * Called by React Native when it's ready to handle navigation
     */
    @ReactMethod
    fun setReady(promise: Promise) {
        try {
            isRNReady = true
            Log.d(TAG, "React Native bridge is ready")
            
            // Send any pending navigation data
            pendingNavigationData?.let { data ->
                Log.d(TAG, "Sending pending navigation data: $data")
                try {
                    sendNavigationEvent(data)
                    pendingNavigationData = null
                    Log.d(TAG, "Pending navigation data sent successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Error sending pending navigation data: ${e.message}", e)
                    // Keep the data for another retry
                }
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error in setReady: ${e.message}", e)
            promise.reject("SET_READY_ERROR", "Failed to set module ready: ${e.message}", e)
        }
    }

    /**
     * Get pending navigation data (polling method)
     */
    @ReactMethod
    fun getPendingNavigation(promise: Promise) {
        if (pendingNavigationData != null) {
            promise.resolve(pendingNavigationData)
            pendingNavigationData = null
        } else {
            promise.resolve(null)
        }
    }

    /**
     * Extract navigation data from intent
     */
    private fun extractNavigationData(intent: Intent): WritableMap? {
        val data = Arguments.createMap()
        var hasData = false

        Log.d(TAG, "Extracting navigation data from intent")

        // Extract from intent extras
        intent.extras?.let { extras ->
            Log.d(TAG, "Intent extras keys: ${extras.keySet()?.joinToString(", ")}")
            
            for (key in extras.keySet()) {
                when (key) {
                    "chatRoomId", "chat_room_id" -> {
                        extras.getString(key)?.let { 
                            data.putString("chatRoomId", it)
                            hasData = true
                            Log.d(TAG, "Extracted chatRoomId: $it")
                        }
                    }
                    "userId", "user_id" -> {
                        extras.getString(key)?.let { 
                            data.putString("userId", it)
                            hasData = true
                            Log.d(TAG, "Extracted userId: $it")
                        }
                    }
                    "senderId", "sender_id" -> {
                        extras.getString(key)?.let { 
                            data.putString("senderId", it)
                            Log.d(TAG, "Extracted senderId: $it")
                        }
                    }
                    "senderName", "sender_name" -> {
                        extras.getString(key)?.let { 
                            data.putString("senderName", it)
                            Log.d(TAG, "Extracted senderName: $it")
                        }
                    }
                    "type" -> {
                        extras.getString(key)?.let { 
                            data.putString("type", it)
                            hasData = true
                            Log.d(TAG, "Extracted type: $it")
                        }
                    }
                    "screen" -> {
                        extras.getString(key)?.let { 
                            data.putString("screen", it)
                            hasData = true
                            Log.d(TAG, "Extracted screen: $it")
                        }
                    }
                    "navigation_target" -> {
                        extras.getString(key)?.let { 
                            data.putString("navigation_target", it)
                            Log.d(TAG, "Extracted navigation_target: $it")
                        }
                    }
                    "source", "notification_id" -> {
                        extras.getString(key)?.let { 
                            data.putString(key, it)
                            Log.d(TAG, "Extracted $key: $it")
                        }
                    }
                    "timestamp" -> {
                        val timestamp = extras.getLong(key, 0)
                        if (timestamp > 0) {
                            data.putDouble("timestamp", timestamp.toDouble())
                            Log.d(TAG, "Extracted timestamp: $timestamp")
                        }
                    }
                    "title", "body", "message" -> {
                        extras.getString(key)?.let { 
                            data.putString(key, it)
                            Log.d(TAG, "Extracted $key: $it")
                        }
                    }
                }
            }
        } ?: Log.w(TAG, "Intent extras are null")

        // Extract from intent data URI
        intent.data?.let { uri ->
            uri.getQueryParameter("chatRoomId")?.let {
                data.putString("chatRoomId", it)
                hasData = true
            }
            uri.getQueryParameter("userId")?.let {
                data.putString("userId", it)
                hasData = true
            }
        }

        return if (hasData) {
            Log.d(TAG, "Extracted navigation data: ${data.toString()}")
            data
        } else {
            Log.d(TAG, "No navigation data found in intent")
            null
        }
    }

    /**
     * Send navigation event to React Native
     */
    private fun sendNavigationEvent(data: WritableMap) {
        try {
            // Check if React Native context is available and active
            if (reactApplicationContext?.hasActiveReactInstance() != true) {
                Log.w(TAG, "React Native context is not active, storing data for later")
                pendingNavigationData = data
                return
            }
            
            val jsModule = reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            if (jsModule != null) {
                jsModule.emit("notificationNavigation", data)
                Log.d(TAG, "Navigation event sent to React Native successfully")
            } else {
                Log.e(TAG, "DeviceEventManagerModule is null, cannot send event")
                pendingNavigationData = data
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send navigation event: ${e.message}", e)
            // Store for retry
            pendingNavigationData = data
            
            // Log additional context for debugging
            Log.d(TAG, "Context active: ${reactApplicationContext?.hasActiveReactInstance()}")
            Log.d(TAG, "Context catalystInstance: ${reactApplicationContext?.catalystInstance}")
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter
    }
}