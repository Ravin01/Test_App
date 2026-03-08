package com.flykup.app.ivs

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.amazonaws.ivs.broadcast.*
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class RNIVSBroadcastModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var broadcastSession: BroadcastSession? = null
    private var cameraDevice: Device? = null
    private var microphoneDevice: Device? = null
    private var isUsingFrontCamera = true
    private var currentPreviewView: RNIVSBroadcastView? = null

    override fun getName(): String {
        return "RNIVSBroadcast"
    }

    // Method to attach preview view to broadcast session
    fun attachPreview(view: RNIVSBroadcastView) {
        currentPreviewView = view
        broadcastSession?.let { session ->
            view.attachBroadcastSession(session)
            android.util.Log.d("RNIVSBroadcast", "Preview attached to broadcast session")
        }
    }

    // Method to detach preview view from broadcast session
    fun detachPreview(view: RNIVSBroadcastView) {
        if (currentPreviewView == view) {
            broadcastSession?.let { session ->
                view.detachBroadcastSession(session)
            }
            currentPreviewView = null
            android.util.Log.d("RNIVSBroadcast", "Preview detached from broadcast session")
        }
    }

    // Get the current broadcast session (for view manager)
    fun getBroadcastSession(): BroadcastSession? {
        return broadcastSession
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun startBroadcast(config: ReadableMap, promise: Promise) {
        // Run on UI thread as required by AWS IVS SDK
        reactApplicationContext.currentActivity?.runOnUiThread {
            try {
                android.util.Log.d("RNIVSBroadcast", "📡 Starting broadcast...")
                
                // Check permissions
                if (!hasRequiredPermissions()) {
                    promise.reject("PERMISSION_DENIED", "Camera and microphone permissions are required")
                    return@runOnUiThread
                }

                // Extract config
                val streamKey = config.getString("streamKey")
                    ?: return@runOnUiThread promise.reject("INVALID_CONFIG", "streamKey is required")
                
                val ingestEndpoint = config.getString("ingestEndpoint")
                    ?: return@runOnUiThread promise.reject("INVALID_CONFIG", "ingestEndpoint is required")

                val useFrontCamera = config.getString("cameraFacing")?.equals("front") ?: true
                isUsingFrontCamera = useFrontCamera

                android.util.Log.d("RNIVSBroadcast", "Config: endpoint=$ingestEndpoint, camera=${if (useFrontCamera) "front" else "back"}")

                // Step 1: Discover available devices using DeviceDiscovery
                android.util.Log.d("RNIVSBroadcast", "🔧 Step 1: Discovering devices...")
                val deviceDiscovery = DeviceDiscovery(reactApplicationContext)
                val availableDevices = deviceDiscovery.listLocalDevices()
                
                android.util.Log.d("RNIVSBroadcast", "Found ${availableDevices.size} devices")
                
                // Find camera
                cameraDevice = availableDevices.firstOrNull { device ->
                    val descriptor = device.descriptor
                    descriptor.type == Device.Descriptor.DeviceType.CAMERA &&
                    if (isUsingFrontCamera) {
                        descriptor.position == Device.Descriptor.Position.FRONT
                    } else {
                        descriptor.position == Device.Descriptor.Position.BACK
                    }
                }
                
                if (cameraDevice == null) {
                    promise.reject("CAMERA_ERROR", "No ${if (isUsingFrontCamera) "front" else "back"} camera found")
                    return@runOnUiThread
                }
                
                android.util.Log.d("RNIVSBroadcast", "✅ Camera found: ${cameraDevice?.descriptor?.deviceId}")

                // Find microphone
                microphoneDevice = availableDevices.firstOrNull { device ->
                    device.descriptor.type == Device.Descriptor.DeviceType.MICROPHONE
                }
                
                if (microphoneDevice == null) {
                    promise.reject("MICROPHONE_ERROR", "No microphone found")
                    return@runOnUiThread
                }
                
                android.util.Log.d("RNIVSBroadcast", "✅ Microphone found: ${microphoneDevice?.descriptor?.deviceId}")

                // Step 2: Create broadcast configuration
                android.util.Log.d("RNIVSBroadcast", "🔧 Step 2: Creating broadcast configuration...")
                val broadcastConfig = BroadcastConfiguration().apply {
                    // Video configuration - more flexible
                    val width = config.getInt("width").takeIf { it > 0 } ?: 720
                    val height = config.getInt("height").takeIf { it > 0 } ?: 1280
                    video.setSize(width, height)
                    video.setInitialBitrate(config.getInt("bitrate").takeIf { it > 0 } ?: 2500000)
                    video.setMaxBitrate(config.getInt("maxBitrate").takeIf { it > 0 } ?: 6000000)
                    video.setMinBitrate(config.getInt("minBitrate").takeIf { it > 0 } ?: 500000)
                    video.setTargetFramerate(config.getInt("fps").takeIf { it > 0 } ?: 30)
                    
                    // Audio configuration
                    audio.setChannels(2)
                    audio.setBitrate(128000)
                }
                
                android.util.Log.d("RNIVSBroadcast", "✅ Configuration created")

                // Step 3: Create broadcast session (SDK 1.35.0 API)
                android.util.Log.d("RNIVSBroadcast", "🔧 Step 3: Creating broadcast session...")
                broadcastSession = BroadcastSession(
                    reactApplicationContext,
                    createBroadcastListener(),  // SDK 1.35.0: Listener as 2nd parameter
                    broadcastConfig,
                    null  // SDK 1.35.0: Array<Device.Descriptor>? as 4th parameter
                )
                
                android.util.Log.d("RNIVSBroadcast", "✅ Broadcast session created")
                
                // Step 4: Attach devices (SDK 1.35.0 requires device.descriptor)
                android.util.Log.d("RNIVSBroadcast", "🔧 Step 4: Attaching devices...")
                
                cameraDevice?.let { camera ->
                    broadcastSession?.attachDevice(camera.descriptor) { error ->
                        if (error != null) {
                            android.util.Log.e("RNIVSBroadcast", "❌ Camera attach error: $error")
                        } else {
                            android.util.Log.d("RNIVSBroadcast", "✅ Camera attached successfully")
                        }
                    }
                }
                
                microphoneDevice?.let { mic ->
                    broadcastSession?.attachDevice(mic.descriptor) { error ->
                        if (error != null) {
                            android.util.Log.e("RNIVSBroadcast", "❌ Microphone attach error: $error")
                        } else {
                            android.util.Log.d("RNIVSBroadcast", "✅ Microphone attached successfully")
                        }
                    }
                }

                // Step 5: Attach preview if view is already mounted
                currentPreviewView?.let { view ->
                    view.attachBroadcastSession(broadcastSession)
                    android.util.Log.d("RNIVSBroadcast", "✅ Preview attached")
                }

                // Step 6: Start the broadcast
                android.util.Log.d("RNIVSBroadcast", "🔧 Step 5: Starting broadcast stream...")
                broadcastSession?.start(ingestEndpoint, streamKey)
                
                android.util.Log.d("RNIVSBroadcast", "🎉 Broadcast started successfully!")
                
                promise.resolve(null)
                
                val params = Arguments.createMap().apply {
                    putString("status", "started")
                }
                sendEvent("IVSBroadcastStatus", params)

            } catch (e: Exception) {
                android.util.Log.e("RNIVSBroadcast", "❌ Start broadcast error: ${e.message}", e)
                promise.reject("START_ERROR", "Failed to start broadcast: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun stopBroadcast(promise: Promise) {
        reactApplicationContext.currentActivity?.runOnUiThread {
            try {
                android.util.Log.d("RNIVSBroadcast", "⏹️ Stopping broadcast...")
                
                broadcastSession?.stop()
                
                android.util.Log.d("RNIVSBroadcast", "✅ Broadcast stopped successfully")
                
                val params = Arguments.createMap().apply {
                    putString("status", "stopped")
                }
                sendEvent("IVSBroadcastStatus", params)
                
                promise.resolve(null)
            } catch (e: Exception) {
                android.util.Log.e("RNIVSBroadcast", "❌ Stop broadcast error: ${e.message}", e)
                promise.reject("STOP_ERROR", "Failed to stop broadcast: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun switchCamera(promise: Promise) {
        reactApplicationContext.currentActivity?.runOnUiThread {
            try {
                android.util.Log.d("RNIVSBroadcast", "🔄 Switching camera...")
                
                // Detach current camera
                cameraDevice?.let { camera ->
                    broadcastSession?.detachDevice(camera)
                    android.util.Log.d("RNIVSBroadcast", "✅ Detached old camera")
                }

                // Toggle camera direction
                isUsingFrontCamera = !isUsingFrontCamera
                android.util.Log.d("RNIVSBroadcast", "Switching to ${if (isUsingFrontCamera) "front" else "back"} camera")

                // Discover devices again
                val deviceDiscovery = DeviceDiscovery(reactApplicationContext)
                val availableDevices = deviceDiscovery.listLocalDevices()

                // Find new camera
                cameraDevice = availableDevices.firstOrNull { device ->
                    val descriptor = device.descriptor
                    descriptor.type == Device.Descriptor.DeviceType.CAMERA &&
                    if (isUsingFrontCamera) {
                        descriptor.position == Device.Descriptor.Position.FRONT
                    } else {
                        descriptor.position == Device.Descriptor.Position.BACK
                    }
                }

                if (cameraDevice == null) {
                    promise.reject("CAMERA_ERROR", "No ${if (isUsingFrontCamera) "front" else "back"} camera found")
                    return@runOnUiThread
                }

                android.util.Log.d("RNIVSBroadcast", "✅ Found new camera: ${cameraDevice?.descriptor?.deviceId}")

                // Attach new camera (SDK 1.35.0 requires descriptor)
                cameraDevice?.let { camera ->
                    broadcastSession?.attachDevice(camera.descriptor) { error ->
                        if (error != null) {
                            android.util.Log.e("RNIVSBroadcast", "❌ Failed to attach camera: $error")
                            promise.reject("CAMERA_ERROR", "Failed to switch camera: $error")
                        } else {
                            android.util.Log.d("RNIVSBroadcast", "✅ Camera switched successfully")
                            promise.resolve(null)
                        }
                    }
                } ?: promise.reject("CAMERA_ERROR", "Camera not found")

            } catch (e: Exception) {
                android.util.Log.e("RNIVSBroadcast", "❌ Switch camera error: ${e.message}", e)
                promise.reject("SWITCH_ERROR", "Failed to switch camera: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun muteMic(mute: Boolean, promise: Promise) {
        reactApplicationContext.currentActivity?.runOnUiThread {
            try {
                android.util.Log.d("RNIVSBroadcast", "${if (mute) "🔇 Muting" else "🔊 Unmuting"} microphone...")
                
                microphoneDevice?.let { mic ->
                    if (mic is AudioDevice) {
                        mic.setGain(if (mute) 0f else 1f)
                        android.util.Log.d("RNIVSBroadcast", "✅ Microphone ${if (mute) "muted" else "unmuted"}")
                    }
                    promise.resolve(null)
                } ?: promise.reject("MICROPHONE_ERROR", "Microphone not found")
            } catch (e: Exception) {
                android.util.Log.e("RNIVSBroadcast", "❌ Mute error: ${e.message}", e)
                promise.reject("MUTE_ERROR", "Failed to mute/unmute: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun isBroadcasting(promise: Promise) {
        try {
            val isLive = broadcastSession?.isReady == true
            promise.resolve(isLive)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", "Failed to get broadcast status: ${e.message}")
        }
    }

    @ReactMethod
    fun getBroadcastStats(promise: Promise) {
        try {
            broadcastSession?.let { session ->
                val stats = Arguments.createMap().apply {
                    putBoolean("isReady", session.isReady)
                    // Add more stats as needed
                }
                promise.resolve(stats)
            } ?: promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STATS_ERROR", "Failed to get stats: ${e.message}")
        }
    }

    private fun createBroadcastListener(): BroadcastSession.Listener {
        return object : BroadcastSession.Listener() {
            override fun onStateChanged(state: BroadcastSession.State) {
                val params = Arguments.createMap().apply {
                    putString("state", state.toString())
                }
                sendEvent("IVSBroadcastStateChanged", params)
            }

            override fun onError(error: BroadcastException) {
                val params = Arguments.createMap().apply {
                    putString("error", error.message ?: "Unknown error")
                    putInt("code", error.code)
                }
                sendEvent("IVSBroadcastError", params)
            }

            override fun onDeviceAdded(deviceDescriptor: Device.Descriptor) {
                val params = Arguments.createMap().apply {
                    putString("deviceType", deviceDescriptor.type.toString())
                    putString("event", "deviceAdded")
                }
                sendEvent("IVSBroadcastDeviceChange", params)
            }

            override fun onDeviceRemoved(deviceDescriptor: Device.Descriptor) {
                val params = Arguments.createMap().apply {
                    putString("deviceType", deviceDescriptor.type.toString())
                    putString("event", "deviceRemoved")
                }
                sendEvent("IVSBroadcastDeviceChange", params)
            }
        }
    }

    private fun hasRequiredPermissions(): Boolean {
        val cameraPermission = ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.CAMERA
        )
        val audioPermission = ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.RECORD_AUDIO
        )
        return cameraPermission == PackageManager.PERMISSION_GRANTED &&
               audioPermission == PackageManager.PERMISSION_GRANTED
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        broadcastSession?.stop()
        broadcastSession = null
    }
}
