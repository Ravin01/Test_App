package com.flykup.app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.util.Log

class VideoActivityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "VideoActivityModule"
        const val NAME = "VideoActivityModule"
        
        // Static reference to MainActivity to check activity state
        @Volatile
        private var currentActivity: MainActivity? = null
        
        fun setCurrentActivity(activity: MainActivity?) {
            currentActivity = activity
            Log.d(TAG, "Current activity set: ${activity != null}")
        }
        
        fun isActivityReady(): Boolean {
            val activity = currentActivity
            val ready = activity != null && !activity.isDestroyed && !activity.isFinishing
            Log.d(TAG, "Activity ready check: $ready")
            return ready
        }
    }

    override fun getName(): String {
        return NAME
    }

    @ReactMethod
    fun isActivityReady(promise: Promise) {
        try {
            val ready = isActivityReady()
            promise.resolve(ready)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking activity state", e)
            promise.reject("ACTIVITY_CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun waitForActivity(timeoutMs: Double, promise: Promise) {
        try {
            val startTime = System.currentTimeMillis()
            val timeout = timeoutMs.toLong()
            
            // Check if already ready
            if (isActivityReady()) {
                promise.resolve(true)
                return
            }
            
            // Poll for activity readiness with timeout
            val handler = android.os.Handler(android.os.Looper.getMainLooper())
            val runnable = object : Runnable {
                override fun run() {
                    if (isActivityReady()) {
                        promise.resolve(true)
                    } else if (System.currentTimeMillis() - startTime > timeout) {
                        promise.reject("TIMEOUT", "Activity not ready within timeout")
                    } else {
                        handler.postDelayed(this, 100) // Check every 100ms
                    }
                }
            }
            handler.post(runnable)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error waiting for activity", e)
            promise.reject("WAIT_ACTIVITY_ERROR", e.message, e)
        }
    }
}