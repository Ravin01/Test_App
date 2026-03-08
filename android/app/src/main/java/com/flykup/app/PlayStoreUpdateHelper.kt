package com.flykup.app

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.*
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.OnSuccessListener
import com.google.android.gms.tasks.OnFailureListener
import com.facebook.react.modules.core.DeviceEventManagerModule

class PlayStoreUpdateHelper(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext),
    ActivityEventListener {
    
    private var appUpdateManager: AppUpdateManager? = null
    private val REQUEST_CODE_UPDATE = 1001
    private var updatePromise: Promise? = null
    
    init {
        reactContext.addActivityEventListener(this)
    }
    
    companion object {
        private const val TAG = "PlayStoreUpdateHelper"
    }
    
    override fun getName(): String {
        return "PlayStoreUpdateHelper"
    }
    
    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_CODE_UPDATE) {
            // Handle the activity result from update flow
            // Add null safety check to prevent crash
            val promise = updatePromise
            if (promise == null) {
                android.util.Log.w(TAG, "onActivityResult called but updatePromise is null (requestCode: $requestCode, resultCode: $resultCode)")
                return
            }
            
            when (resultCode) {
                Activity.RESULT_OK -> {
                    // Update flow was successful
                    try {
                        promise.resolve(true)
                        android.util.Log.d(TAG, "Update completed successfully")
                    } catch (e: Exception) {
                        android.util.Log.e(TAG, "Error resolving promise: ${e.message}", e)
                    }
                    updatePromise = null
                }
                Activity.RESULT_CANCELED -> {
                    // User canceled the update
                    try {
                        promise.reject("UPDATE_CANCELLED", "User cancelled the update")
                        android.util.Log.d(TAG, "Update cancelled by user")
                    } catch (e: Exception) {
                        android.util.Log.e(TAG, "Error rejecting promise: ${e.message}", e)
                    }
                    updatePromise = null
                }
                else -> {
                    // Update failed
                    try {
                        promise.reject("UPDATE_FAILED", "Update failed with result code: $resultCode")
                        android.util.Log.d(TAG, "Update failed with result code: $resultCode")
                    } catch (e: Exception) {
                        android.util.Log.e(TAG, "Error rejecting promise: ${e.message}", e)
                    }
                    updatePromise = null
                }
            }
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        // Not needed for this module
    }
    
    private val installStateListener = InstallStateUpdatedListener { state ->
        when (state.installStatus()) {
            InstallStatus.DOWNLOADED -> {
                // Update downloaded, notify JS
                sendEvent("onUpdateDownloaded", null)
            }
            InstallStatus.INSTALLED -> {
                // Update installed
                sendEvent("onUpdateInstalled", null)
            }
            InstallStatus.DOWNLOADING -> {
                val progress = state.bytesDownloaded().toFloat() / state.totalBytesToDownload()
                val params = Arguments.createMap()
                params.putDouble("progress", progress.toDouble())
                sendEvent("onUpdateDownloading", params)
            }
            InstallStatus.FAILED -> {
                sendEvent("onUpdateFailed", null)
            }
            else -> {}
        }
    }
    
    @ReactMethod
    fun checkForUpdate(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }
            
            appUpdateManager = AppUpdateManagerFactory.create(activity)
            appUpdateManager?.registerListener(installStateListener)
            
            val appUpdateInfoTask: Task<AppUpdateInfo> = appUpdateManager!!.appUpdateInfo
            
            appUpdateInfoTask.addOnSuccessListener { appUpdateInfo ->
                val updateAvailable = appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                val updatePriority = appUpdateInfo.updatePriority()
                val versionCode = appUpdateInfo.availableVersionCode()
                
                val result = Arguments.createMap()
                result.putBoolean("updateAvailable", updateAvailable)
                result.putInt("priority", updatePriority)
                result.putInt("availableVersionCode", versionCode)
                result.putBoolean("isFlexibleUpdateAllowed", 
                    appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE))
                result.putBoolean("isImmediateUpdateAllowed", 
                    appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE))
                
                // Check if update is already downloaded
                if (appUpdateInfo.installStatus() == InstallStatus.DOWNLOADED) {
                    result.putBoolean("isDownloaded", true)
                }
                
                promise.resolve(result)
            }
            
            appUpdateInfoTask.addOnFailureListener { error ->
                promise.reject("CHECK_FAILED", "Failed to check for updates: ${error.message}")
            }
            
        } catch (e: Exception) {
            promise.reject("ERROR", "Error checking for updates: ${e.message}")
        }
    }
    
    @ReactMethod
    fun startUpdate(updateType: String, promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }
            
            if (appUpdateManager == null) {
                appUpdateManager = AppUpdateManagerFactory.create(activity)
                appUpdateManager?.registerListener(installStateListener)
            }
            
            val appUpdateInfoTask = appUpdateManager!!.appUpdateInfo
            
            appUpdateInfoTask.addOnSuccessListener { appUpdateInfo ->
                val type = if (updateType == "IMMEDIATE") {
                    AppUpdateType.IMMEDIATE
                } else {
                    AppUpdateType.FLEXIBLE
                }
                
                if ((type == AppUpdateType.IMMEDIATE && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) ||
                    (type == AppUpdateType.FLEXIBLE && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE))) {
                    
                    // Store the promise to resolve/reject when activity result comes back
                    updatePromise = promise
                    
                    appUpdateManager?.startUpdateFlowForResult(
                        appUpdateInfo,
                        type,
                        activity,
                        REQUEST_CODE_UPDATE
                    )
                    // Don't resolve the promise here - wait for onActivityResult
                } else {
                    promise.reject("UPDATE_NOT_ALLOWED", "Update type $updateType is not allowed")
                }
            }
            
            appUpdateInfoTask.addOnFailureListener { error ->
                promise.reject("START_FAILED", "Failed to start update: ${error.message}")
            }
            
        } catch (e: Exception) {
            promise.reject("ERROR", "Error starting update: ${e.message}")
        }
    }
    
    @ReactMethod
    fun completeUpdate(promise: Promise) {
        try {
            appUpdateManager?.completeUpdate()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("COMPLETE_FAILED", "Failed to complete update: ${e.message}")
        }
    }
    
    @ReactMethod
    fun openPlayStore(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity")
                return
            }
            
            val packageName = activity.packageName
            
            try {
                // Try to open Play Store app
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName"))
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                activity.startActivity(intent)
                promise.resolve(true)
            } catch (e: ActivityNotFoundException) {
                // Fallback to web browser
                val intent = Intent(Intent.ACTION_VIEW, 
                    Uri.parse("https://play.google.com/store/apps/details?id=$packageName"))
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                activity.startActivity(intent)
                promise.resolve(true)
            }
            
        } catch (e: Exception) {
            promise.reject("OPEN_FAILED", "Failed to open Play Store: ${e.message}")
        }
    }
    
    @ReactMethod
    fun cleanup() {
        appUpdateManager?.unregisterListener(installStateListener)
        appUpdateManager = null
        // Reject any pending promise to prevent memory leaks
        updatePromise?.reject("CLEANUP", "Module was cleaned up")
        updatePromise = null
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        cleanup()
    }
    
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
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
