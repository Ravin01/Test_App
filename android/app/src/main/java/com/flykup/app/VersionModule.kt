package com.flykup.app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import android.content.pm.PackageManager
import android.content.SharedPreferences
import android.util.Log
import com.flykup.app.BuildConfig

class VersionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "VersionModule"
        private const val PREFS_NAME = "AppVersionPrefs"
        private const val KEY_LAST_VERSION_CODE = "last_version_code"
        private const val KEY_UPDATE_TIMESTAMP = "update_timestamp"
    }

    override fun getName(): String {
        return "VersionModule"
    }

    @ReactMethod
    fun getVersionInfo(promise: Promise) {
        try {
            val context = reactApplicationContext
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val prefs = context.getSharedPreferences(PREFS_NAME, ReactApplicationContext.MODE_PRIVATE)
            
            val currentVersionCode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                packageInfo.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode
            }
            
            val currentVersionName = packageInfo.versionName
            val lastVersionCode = prefs.getInt(KEY_LAST_VERSION_CODE, -1)
            val updateTimestamp = prefs.getLong(KEY_UPDATE_TIMESTAMP, 0)
            
            // Detect if app was just updated
            val wasJustUpdated = lastVersionCode != -1 && lastVersionCode < currentVersionCode
            
            // Store current version
            if (lastVersionCode != currentVersionCode) {
                prefs.edit().apply {
                    putInt(KEY_LAST_VERSION_CODE, currentVersionCode)
                    putLong(KEY_UPDATE_TIMESTAMP, System.currentTimeMillis())
                    apply()
                }
            }
            
            val versionInfo: WritableMap = Arguments.createMap()
            versionInfo.putInt("versionCode", currentVersionCode)
            versionInfo.putString("versionName", currentVersionName)
            versionInfo.putInt("lastVersionCode", lastVersionCode)
            versionInfo.putBoolean("wasJustUpdated", wasJustUpdated)
            versionInfo.putDouble("updateTimestamp", updateTimestamp.toDouble())
            versionInfo.putString("buildConfig", BuildConfig.VERSION_NAME)
            versionInfo.putInt("buildVersionCode", BuildConfig.VERSION_CODE)
            
            Log.d(TAG, "Version Info: code=$currentVersionCode, name=$currentVersionName, wasUpdated=$wasJustUpdated")
            
            promise.resolve(versionInfo)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting version info", e)
            promise.reject("VERSION_ERROR", "Failed to get version info: ${e.message}")
        }
    }
    
    @ReactMethod
    fun clearUpdateFlag(promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(PREFS_NAME, ReactApplicationContext.MODE_PRIVATE)
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            
            val currentVersionCode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                packageInfo.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode
            }
            
            prefs.edit().apply {
                putInt(KEY_LAST_VERSION_CODE, currentVersionCode)
                putLong(KEY_UPDATE_TIMESTAMP, System.currentTimeMillis())
                apply()
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing update flag", e)
            promise.reject("CLEAR_FLAG_ERROR", "Failed to clear update flag: ${e.message}")
        }
    }
    
    @ReactMethod
    fun clearVersionCache(promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(PREFS_NAME, ReactApplicationContext.MODE_PRIVATE)
            prefs.edit().clear().apply()
            
            Log.d(TAG, "Version cache cleared")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing version cache", e)
            promise.reject("CLEAR_CACHE_ERROR", "Failed to clear version cache: ${e.message}")
        }
    }
}