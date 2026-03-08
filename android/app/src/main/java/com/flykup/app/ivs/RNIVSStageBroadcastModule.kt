package com.flykup.app.ivs

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.amazonaws.ivs.broadcast.*
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class RNIVSStageBroadcastModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    private val TAG = "RNIVSStageBroadcast"
    private var stage: Stage? = null
    private var cameraDevice: Device? = null
    private var microphoneDevice: Device? = null
    private var localCameraStream: ImageLocalStageStream? = null
    private var localMicStream: AudioLocalStageStream? = null
    private var isUsingFrontCamera = true
    private var isMuted = false
    private val participantsMap = mutableMapOf<String, ParticipantInfo>()
    private var bluetoothAudioManager: BluetoothAudioManager? = null

    companion object {
        // Static reference to preview TextureView shared between module and view manager
        @Volatile
        var sharedPreviewTextureView: android.view.TextureView? = null
            private set
        
        fun setPreviewTextureView(view: android.view.TextureView?) {
            sharedPreviewTextureView = view
            Log.d("RNIVSStageBroadcast", "📺 Shared TextureView ${if (view != null) "registered" else "cleared"}")
        }
    }

    override fun getName(): String = "RNIVSStageBroadcast"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun joinStage(token: String, promise: Promise) {
        // Run on main thread as required by AWS IVS SDK
        reactContext.currentActivity?.runOnUiThread {
            try {
                Log.d(TAG, "📡 Starting Stage join process...")
                Log.d(TAG, "Token length: ${token.length}")

                // Check permissions
                if (!hasRequiredPermissions()) {
                    Log.e(TAG, "❌ Permissions not granted")
                    promise.reject("PERMISSION_DENIED", "Camera and microphone permissions required")
                    return@runOnUiThread
                }
                Log.d(TAG, "✅ Permissions OK")

                // Step 1: Discover and setup devices
                Log.d(TAG, "🔧 Step 1: Discovering devices...")
                val deviceDiscovery = DeviceDiscovery(reactContext)
                val devices = deviceDiscovery.listLocalDevices()
            
            // Find camera and microphone
            var frontCamera: Device? = null
            var backCamera: Device? = null
            var microphone: Device? = null
            
            for (device in devices) {
                val descriptor = device.descriptor
                when (descriptor.type) {
                    Device.Descriptor.DeviceType.CAMERA -> {
                        if (descriptor.position == Device.Descriptor.Position.FRONT) {
                            frontCamera = device
                        } else if (descriptor.position == Device.Descriptor.Position.BACK) {
                            backCamera = device
                        }
                    }
                    Device.Descriptor.DeviceType.MICROPHONE -> {
                        if (microphone == null) {
                            microphone = device
                        }
                    }
                    else -> {}
                }
            }
            
            // Select camera based on preference
            cameraDevice = if (isUsingFrontCamera) frontCamera else backCamera
            microphoneDevice = microphone
            
            if (cameraDevice == null) {
                throw Exception("No camera found")
            }
            if (microphoneDevice == null) {
                throw Exception("No microphone found")
            }
            
            Log.d(TAG, "✅ Camera device found: ${cameraDevice?.descriptor?.deviceId}")
            Log.d(TAG, "✅ Microphone device found: ${microphoneDevice?.descriptor?.deviceId}")
            
            // Initialize Bluetooth audio manager before creating streams
            // It will automatically setup audio routing when Bluetooth profile connects
            Log.d(TAG, "🎧 Initializing Bluetooth audio manager...")
            bluetoothAudioManager = BluetoothAudioManager(reactContext)
            Log.d(TAG, "✅ Bluetooth audio manager initialized (will auto-configure when ready)")
            
            // Create streams - Stage SDK handles preview automatically via ImagePreviewSurfaceView
            Log.d(TAG, "🎬 Creating local streams...")
            
            // For Stage SDK, ImageLocalStageStream takes only the device
            // The ImagePreviewSurfaceView will automatically render local streams
            localCameraStream = ImageLocalStageStream(cameraDevice!!)
            localMicStream = AudioLocalStageStream(microphoneDevice!!)
            
            Log.d(TAG, "✅ Streams created")
            
            // Note: Stage SDK does not natively support local camera preview for the broadcaster
            // The TextureView is available but Stage SDK doesn't provide APIs to render to it
            Log.w(TAG, "⚠️ Stage SDK limitation: Local camera preview not supported")
            Log.w(TAG, "   The broadcaster cannot see their own camera feed")
            Log.w(TAG, "   Viewers will still see the stream correctly")
            
            // Step 2: Create Stage strategy
            Log.d(TAG, "🔧 Step 2: Creating Stage strategy...")
            val strategy = object : Stage.Strategy {
                override fun stageStreamsToPublishForParticipant(
                    stage: Stage,
                    participantInfo: ParticipantInfo
                ): List<LocalStageStream> {
                    Log.d(TAG, "🔥 Strategy: stageStreamsToPublishForParticipant called")
                    Log.d(TAG, "   → Participant ID: ${participantInfo.participantId}")
                    Log.d(TAG, "   → Is Local: ${participantInfo.isLocal}")
                    
                    // Return streams only for local participant
                    if (!participantInfo.isLocal) {
                        Log.d(TAG, "   → Not local participant, returning empty list")
                        return emptyList()
                    }
                    
                    // Return the camera and microphone streams
                    val streams = listOfNotNull(localCameraStream, localMicStream)
                    Log.d(TAG, "   → Returning ${streams.size} streams")
                    return streams
                }

                override fun shouldPublishFromParticipant(
                    stage: Stage,
                    participantInfo: ParticipantInfo
                ): Boolean {
                    val shouldPublish = participantInfo.isLocal
                    Log.d(TAG, "🔥 Strategy: shouldPublishFromParticipant = $shouldPublish for ${participantInfo.participantId}")
                    return shouldPublish
                }

                override fun shouldSubscribeToParticipant(
                    stage: Stage,
                    participantInfo: ParticipantInfo
                ): Stage.SubscribeType {
                    Log.d(TAG, "🔥 Strategy: shouldSubscribeToParticipant for ${participantInfo.participantId}")
                    return Stage.SubscribeType.AUDIO_VIDEO
                }
            }
            Log.d(TAG, "✅ Strategy created")

            // Step 3: Create Stage (SDK 1.35.0)
            Log.d(TAG, "🔧 Step 3: Creating Stage instance...")
            stage = Stage(reactContext, token, strategy).apply {
                Log.d(TAG, "✅ Stage instance created")
                
                // Add renderer for events
                addRenderer(createStageRenderer())
            }

            Log.d(TAG, "🔧 Step 4: Joining stage...")
            stage?.join()
            Log.d(TAG, "✅ Stage join initiated")

                promise.resolve(null)
                Log.d(TAG, "🎉 Stage join process completed successfully")

            } catch (e: Exception) {
                Log.e(TAG, "❌ Stage join error: ${e.message}", e)
                promise.reject("STAGE_JOIN_ERROR", "Failed to join stage: ${e.message}")
            }
        }
    }

    private fun createStageRenderer(): StageRenderer {
        return object : StageRenderer {
            override fun onConnectionStateChanged(
                stage: Stage,
                state: Stage.ConnectionState,
                exception: BroadcastException?
            ) {
                Log.d(TAG, "🔔 Connection state changed: $state")
                val params = Arguments.createMap().apply {
                    putString("state", state.name)
                }
                sendEvent("StageBroadcastConnectionStateChanged", params)
                
                when (state) {
                    Stage.ConnectionState.CONNECTED -> {
                        Log.d(TAG, "✅ CONNECTED - Broadcasting Live!")
                        val connectedParams = Arguments.createMap().apply {
                            putString("status", "connected")
                            putString("message", "Connected - Broadcasting Live")
                        }
                        sendEvent("StageBroadcastStatus", connectedParams)
                    }
                    Stage.ConnectionState.DISCONNECTED -> {
                        Log.d(TAG, "⚠️ DISCONNECTED from stage")
                        val disconnectedParams = Arguments.createMap().apply {
                            putString("status", "disconnected")
                            putString("message", "Disconnected")
                        }
                        sendEvent("StageBroadcastStatus", disconnectedParams)
                    }
                    else -> {
                        Log.d(TAG, "ℹ️ Connection state: $state")
                    }
                }
            }
            
            override fun onError(exception: BroadcastException) {
                Log.e(TAG, "❌ Stage error: ${exception.message}")
                val params = Arguments.createMap().apply {
                    putString("error", exception.message ?: "Unknown error")
                    putInt("code", exception.error.ordinal)
                }
                sendEvent("StageBroadcastError", params)
            }
            
            override fun onParticipantJoined(stage: Stage, participantInfo: ParticipantInfo) {
                Log.d(TAG, "👤 Participant joined: ${participantInfo.participantId}")
                
                participantsMap[participantInfo.participantId] = participantInfo
                
                val params = Arguments.createMap().apply {
                    putString("participantId", participantInfo.participantId)
                    putString("userId", participantInfo.userId ?: "")
                    putBoolean("isLocal", participantInfo.isLocal)
                }
                sendEvent("StageBroadcastParticipantJoined", params)
            }
            
            override fun onParticipantLeft(stage: Stage, participantInfo: ParticipantInfo) {
                Log.d(TAG, "👋 Participant left: ${participantInfo.participantId}")
                
                participantsMap.remove(participantInfo.participantId)
                
                val params = Arguments.createMap().apply {
                    putString("participantId", participantInfo.participantId)
                    putString("userId", participantInfo.userId ?: "")
                }
                sendEvent("StageBroadcastParticipantLeft", params)
            }
            
            override fun onParticipantPublishStateChanged(
                stage: Stage,
                participantInfo: ParticipantInfo,
                state: Stage.PublishState
            ) {
                Log.d(TAG, "📡 Publish state changed: ${participantInfo.participantId}, state: $state")
                
                // Send event for publish state changes
                val params = Arguments.createMap().apply {
                    putString("participantId", participantInfo.participantId)
                    putString("state", state.name)
                }
                sendEvent("StageBroadcastPublishStateChanged", params)
            }
            
            override fun onParticipantSubscribeStateChanged(
                stage: Stage,
                participantInfo: ParticipantInfo,
                state: Stage.SubscribeState
            ) {
                Log.d(TAG, "📡 Subscribe state changed: ${participantInfo.participantId}, state: $state")
            }
            
            override fun onStreamsAdded(
                stage: Stage,
                participantInfo: ParticipantInfo,
                streams: List<StageStream>
            ) {
                Log.d(TAG, "🎥 Streams added for participant: ${participantInfo.participantId}")
                Log.d(TAG, "   Is Local: ${participantInfo.isLocal}")
                Log.d(TAG, "   Streams count: ${streams.size}")
                
                val streamsArray = Arguments.createArray()
                streams.forEach { stream ->
                    val streamInfo = Arguments.createMap().apply {
                        putString("type", stream.streamType?.name ?: "UNKNOWN")
                    }
                    streamsArray.pushMap(streamInfo)
                    Log.d(TAG, "   Stream type: ${stream.streamType}")
                }
                
                val params = Arguments.createMap().apply {
                    putString("participantId", participantInfo.participantId)
                    putString("userId", participantInfo.userId ?: "")
                    putBoolean("isLocal", participantInfo.isLocal)
                    putArray("streams", streamsArray)
                }
                sendEvent("StageBroadcastStreamsAdded", params)
                
                // Note: Stage SDK does not provide APIs to render local streams for preview
                // The broadcaster cannot see their own camera feed with Stage SDK
                if (participantInfo.isLocal) {
                    Log.w(TAG, "⚠️ Local streams added but Stage SDK does not support self-preview")
                }
            }
            
            override fun onStreamsRemoved(
                stage: Stage,
                participantInfo: ParticipantInfo,
                streams: List<StageStream>
            ) {
                Log.d(TAG, "📴 Streams removed for participant: ${participantInfo.participantId}")
                
                val streamsArray = Arguments.createArray()
                streams.forEach { stream ->
                    val streamInfo = Arguments.createMap().apply {
                        putString("type", stream.streamType?.name ?: "UNKNOWN")
                    }
                    streamsArray.pushMap(streamInfo)
                }
                
                val params = Arguments.createMap().apply {
                    putString("participantId", participantInfo.participantId)
                    putString("userId", participantInfo.userId ?: "")
                    putArray("streams", streamsArray)
                }
                sendEvent("StageBroadcastStreamsRemoved", params)
            }
            
            override fun onStreamsMutedChanged(
                stage: Stage,
                participantInfo: ParticipantInfo,
                streams: List<StageStream>
            ) {
                Log.d(TAG, "🔇 Streams muted changed for: ${participantInfo.participantId}")
            }
        }
    }

    @ReactMethod
    fun leaveStage(promise: Promise) {
        // Run on main thread
        reactContext.currentActivity?.runOnUiThread {
            try {
                Log.d(TAG, "📡 Leaving stage...")
                
                stage?.let { s ->
                    s.leave()
                    Log.d(TAG, "✅ Stage leave called")
                }

                // Cleanup Bluetooth audio manager
                bluetoothAudioManager?.cleanup()
                bluetoothAudioManager = null
                Log.d(TAG, "✅ Bluetooth audio manager cleaned up")

                stage = null
                localCameraStream = null
                localMicStream = null
                cameraDevice = null
                microphoneDevice = null
                participantsMap.clear()

                val params = Arguments.createMap().apply {
                    putString("status", "left")
                }
                sendEvent("StageBroadcastStatus", params)

                promise.resolve(null)
                Log.d(TAG, "✅ Left stage successfully")

            } catch (e: Exception) {
                Log.e(TAG, "❌ Leave stage error: ${e.message}", e)
                promise.reject("STAGE_LEAVE_ERROR", "Failed to leave stage: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun switchCamera(promise: Promise) {
        // Run on main thread
        reactContext.currentActivity?.runOnUiThread {
            try {
                Log.d(TAG, "🔄 Switching camera...")

                if (stage == null) {
                    promise.reject("NO_STAGE", "Stage not active")
                    return@runOnUiThread
                }

                // Toggle camera direction
                isUsingFrontCamera = !isUsingFrontCamera
                
                // Discover devices again
                val deviceDiscovery = DeviceDiscovery(reactContext)
                val devices = deviceDiscovery.listLocalDevices()
                
                // Find new camera
                var newCamera: Device? = null
                for (device in devices) {
                    val descriptor = device.descriptor
                    if (descriptor.type == Device.Descriptor.DeviceType.CAMERA) {
                        if (isUsingFrontCamera && descriptor.position == Device.Descriptor.Position.FRONT) {
                            newCamera = device
                            break
                        } else if (!isUsingFrontCamera && descriptor.position == Device.Descriptor.Position.BACK) {
                            newCamera = device
                            break
                        }
                    }
                }
                
                if (newCamera == null) {
                    promise.reject("NO_CAMERA", "No camera found")
                    return@runOnUiThread
                }
                
                // Update camera device and stream
                cameraDevice = newCamera
                localCameraStream = ImageLocalStageStream(newCamera)

                Log.d(TAG, "✅ Camera switched to ${if (isUsingFrontCamera) "front" else "back"}")
                Log.d(TAG, "⚠️ Call stage.refreshStrategy() to apply changes")
                
                // Refresh strategy to apply new camera
                stage?.refreshStrategy()
                
                promise.resolve(null)

            } catch (e: Exception) {
                Log.e(TAG, "❌ Switch camera error: ${e.message}", e)
                promise.reject("SWITCH_ERROR", "Failed to switch camera: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun muteMic(mute: Boolean, promise: Promise) {
        try {
            Log.d(TAG, "${if (mute) "🔇 Muting" else "🔊 Unmuting"} microphone...")

            // Mute the local audio stream
            localMicStream?.setMuted(mute)
            isMuted = mute

            Log.d(TAG, "✅ Microphone ${if (mute) "muted" else "unmuted"}")
            promise.resolve(null)

        } catch (e: Exception) {
            Log.e(TAG, "❌ Mute error: ${e.message}", e)
            promise.reject("MUTE_ERROR", "Failed to toggle mute: ${e.message}")
        }
    }

    @ReactMethod
    fun getStageStatus(promise: Promise) {
        try {
            val status = Arguments.createMap().apply {
                putBoolean("isActive", stage != null)
                putBoolean("isMuted", isMuted)
                putString("cameraFacing", if (isUsingFrontCamera) "front" else "back")
            }
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", "Failed to get status: ${e.message}")
        }
    }

    private fun hasRequiredPermissions(): Boolean {
        val cameraPermission = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.CAMERA
        )
        val audioPermission = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.RECORD_AUDIO
        )
        return cameraPermission == PackageManager.PERMISSION_GRANTED &&
               audioPermission == PackageManager.PERMISSION_GRANTED
    }

    @ReactMethod
    fun getParticipants(promise: Promise) {
        try {
            val participantsArray = Arguments.createArray()
            participantsMap.values.forEach { participant ->
                val participantInfo = Arguments.createMap().apply {
                    putString("participantId", participant.participantId)
                    putString("userId", participant.userId ?: "")
                    putBoolean("isLocal", participant.isLocal)
                }
                participantsArray.pushMap(participantInfo)
            }
            promise.resolve(participantsArray)
        } catch (e: Exception) {
            promise.reject("GET_PARTICIPANTS_ERROR", "Failed to get participants: ${e.message}")
        }
    }
    
    fun getStage(): Stage? {
        return stage
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        Log.d(TAG, "🧹 Module destroyed - cleaning up")
        
        // Cleanup Bluetooth audio manager
        bluetoothAudioManager?.cleanup()
        bluetoothAudioManager = null
        
        stage?.leave()
        participantsMap.clear()
        stage = null
        localCameraStream = null
        localMicStream = null
        cameraDevice = null
        microphoneDevice = null
    }
}
