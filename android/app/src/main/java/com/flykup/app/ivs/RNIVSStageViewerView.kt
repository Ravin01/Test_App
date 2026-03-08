// Ai code work with audio, video and 3 cohost. proper layout but not stable while cohost leaves app autocloses

package com.flykup.app.ivs

import android.graphics.Outline
import android.util.Log
import android.view.Gravity
import android.view.TextureView
import android.view.View
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.GridLayout
import android.widget.TextView
import com.amazonaws.ivs.broadcast.BroadcastException
import com.amazonaws.ivs.broadcast.Stage
import com.amazonaws.ivs.broadcast.StageRenderer
import com.amazonaws.ivs.broadcast.StageStream
import com.amazonaws.ivs.broadcast.ParticipantInfo
import com.amazonaws.ivs.broadcast.LocalStageStream
import com.amazonaws.ivs.broadcast.ImageStageStream
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter

class RNIVSStageViewerView(private val reactContext: ReactApplicationContext) : FrameLayout(reactContext) {
    
    private val TAG = "RNIVSStageViewerView"
    private var stage: Stage? = null
    private var stageToken: String? = null
    private var gridLayout: GridLayout? = null
    private var statusText: TextView? = null
    private var isJoined = false
    private val MAX_PARTICIPANTS = 4
    
    // Track participant video views and their devices (using LinkedHashMap to maintain insertion order)
    private val participantViews = LinkedHashMap<String, View>()
    private val participantDevices = mutableMapOf<String, com.amazonaws.ivs.broadcast.ImageDevice>()
    private val participantAudioDevices = mutableMapOf<String, com.amazonaws.ivs.broadcast.AudioDevice>()
    private var isMuted = false
    private var bluetoothAudioManager: BluetoothAudioManager? = null
    private var shouldCleanup = false
    
    // ✅ NEW: Track PIP mode to prevent cleanup during PIP transitions
    private var isInPIPMode = false
    
    init {
        Log.d(TAG, "RNIVSStageViewerView initialized with 2x2 grid support")
        setBackgroundColor(android.graphics.Color.BLACK)
        
        // Initialize Bluetooth audio manager for viewer
        Log.d(TAG, "🎧 Initializing Bluetooth audio manager for viewer...")
        bluetoothAudioManager = BluetoothAudioManager(reactContext)
        Log.d(TAG, "✅ Bluetooth audio manager initialized (will auto-configure when ready)")
        
        // Create 2x2 GridLayout for up to 4 participants
        gridLayout = GridLayout(context).apply {
            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
            columnCount = 2
            rowCount = 2
            visibility = INVISIBLE
        }
        addView(gridLayout)
        
        // Create status text overlay
        statusText = TextView(context).apply {
            text = "Initializing..."
            textSize = 16f
            setTextColor(android.graphics.Color.WHITE)
            gravity = Gravity.CENTER
            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
        }
        addView(statusText)
    }
    
    fun setStageToken(token: String?) {
        Log.d(TAG, "Stage token updated: ${token != null}")
        this.stageToken = token
        
        if (token != null && !isJoined) {
            updateStatus("Token received, joining stage...")
            joinStage(token)
        }
    }
    
    private fun joinStage(token: String) {
        try {
            Log.d(TAG, "Creating Stage instance...")
            
            // Create Stage Strategy for viewer (subscribe only)
            val strategy = object : Stage.Strategy {
                override fun shouldPublishFromParticipant(
                    stage: Stage,
                    participantInfo: ParticipantInfo
                ): Boolean {
                    // Viewer doesn't publish
                    return false
                }
                
                override fun stageStreamsToPublishForParticipant(
                    stage: Stage,
                    participantInfo: ParticipantInfo
                ): List<LocalStageStream> {
                    Log.d(TAG, "stageStreamsToPublishForParticipant called")
                    return emptyList() // Viewer doesn't publish
                }

                override fun shouldSubscribeToParticipant(
                    stage: Stage,
                    participantInfo: ParticipantInfo
                ): Stage.SubscribeType {
                    Log.d(TAG, "shouldSubscribeToParticipant: ${participantInfo.participantId}")
                    return Stage.SubscribeType.AUDIO_VIDEO // Subscribe to both
                }
            }
            
            // Create stage with token
            stage = Stage(context, token, strategy).apply {
                // Add renderer to receive events and render streams
                addRenderer(object : StageRenderer {
                    override fun onConnectionStateChanged(
                        stage: Stage,
                        state: Stage.ConnectionState,
                        exception: BroadcastException?
                    ) {
                        Log.d(TAG, "Connection state changed: $state")
                        when (state) {
                            Stage.ConnectionState.CONNECTED -> {
                                updateStatus("Connected - Waiting for streams...")
                                sendEvent("ConnectionStateChanged", createEventData("state", "CONNECTED"))
                            }
                            Stage.ConnectionState.CONNECTING -> {
                                updateStatus("Connecting...")
                                sendEvent("ConnectionStateChanged", createEventData("state", "CONNECTING"))
                            }
                            Stage.ConnectionState.DISCONNECTED -> {
                                updateStatus("Disconnected")
                                sendEvent("ConnectionStateChanged", createEventData("state", "DISCONNECTED"))
                                isJoined = false
                            }
                        }
                        
                        if (exception != null) {
                            Log.e(TAG, "Connection error: ${exception.message}", exception)
                            updateStatus("Error: ${exception.message}")
                            sendEvent("ConnectionStateChanged", createEventData("state", "ERROR"))
                        }
                    }
                    
                    override fun onError(exception: BroadcastException) {
                        Log.e(TAG, "Stage error: ${exception.message}", exception)
                        updateStatus("Error: ${exception.message}")
                        sendEvent("ConnectionStateChanged", createEventData("state", "ERROR"))
                    }
                    
                    override fun onParticipantJoined(stage: Stage, participantInfo: ParticipantInfo) {
                        Log.d(TAG, "Participant joined: ${participantInfo.participantId}")
                        val data = createEventData("participantId", participantInfo.participantId)
                        sendEvent("ParticipantJoined", data)
                    }
                    
                    override fun onParticipantLeft(stage: Stage, participantInfo: ParticipantInfo) {
                        Log.d(TAG, "Participant left: ${participantInfo.participantId}")
                        val data = createEventData("participantId", participantInfo.participantId)
                        sendEvent("ParticipantLeft", data)
                        
                        // Remove participant's video view
                        post {
                            removeParticipantView(participantInfo.participantId)
                            
                            // Hide grid if no more participants
                            if (participantViews.isEmpty()) {
                                gridLayout?.visibility = INVISIBLE
                                statusText?.visibility = VISIBLE
                                //All participants left - Waiting for streams...
                                updateStatus("All participants left - please refresh/rejoin.")
                            }
                        }
                    }
                    
                    override fun onParticipantPublishStateChanged(
                        stage: Stage,
                        participantInfo: ParticipantInfo,
                        state: Stage.PublishState
                    ) {
                        Log.d(TAG, "Participant publish state changed: ${participantInfo.participantId}, state: $state")
                    }
                    
                    override fun onParticipantSubscribeStateChanged(
                        stage: Stage,
                        participantInfo: ParticipantInfo,
                        state: Stage.SubscribeState
                    ) {
                        Log.d(TAG, "Participant subscribe state changed: ${participantInfo.participantId}, state: $state")
                    }
                    
                    override fun onStreamsAdded(
                        stage: Stage,
                        participantInfo: ParticipantInfo,
                        streams: List<StageStream>
                    ) {
                        Log.d(TAG, "Streams added from ${participantInfo.participantId}: ${streams.size} streams")
                        
                        val data = Arguments.createMap().apply {
                            putString("participantId", participantInfo.participantId)
                            putInt("streamCount", streams.size)
                        }
                        sendEvent("StreamsAdded", data)
                        
                        // Find and attach video/audio streams to grid
                        streams.forEach { stream ->
                            val deviceType = stream.device?.descriptor?.type
                            Log.d(TAG, "Stream device type: $deviceType, stream class: ${stream.javaClass.simpleName}")
                            
                            // Store audio devices for mute control
                            if (deviceType == com.amazonaws.ivs.broadcast.Device.Descriptor.DeviceType.USER_AUDIO ||
                                deviceType == com.amazonaws.ivs.broadcast.Device.Descriptor.DeviceType.MICROPHONE) {
                                val device = stream.device
                                if (device is com.amazonaws.ivs.broadcast.AudioDevice) {
                                    participantAudioDevices[participantInfo.participantId] = device
                                    // Apply current mute state using gain (0 = muted, 1 = unmuted)
                                    device.setGain(if (isMuted) 0f else 1f)
                                    Log.d(TAG, "Audio device stored and mute state applied: ${participantInfo.participantId}")
                                }
                            }
                            
                            // Check for both CAMERA (local) and USER_IMAGE (remote participant)
                            if (deviceType == com.amazonaws.ivs.broadcast.Device.Descriptor.DeviceType.CAMERA ||
                                deviceType == com.amazonaws.ivs.broadcast.Device.Descriptor.DeviceType.USER_IMAGE) {
                                
                                // Check if we have space for more participants
                                if (participantViews.size >= MAX_PARTICIPANTS) {
                                    Log.w(TAG, "Maximum participants (${MAX_PARTICIPANTS}) reached, ignoring new stream")
                                    return@forEach
                                }
                                
                                post {
                                    try {
                                        // Cast to ImageStageStream and get the device
                                        val imageStream = stream as? ImageStageStream
                                        if (imageStream != null) {
                                            val device = imageStream.device
                                            Log.d(TAG, "Got device: ${device?.javaClass?.simpleName}")
                                            
                                            if (device is com.amazonaws.ivs.broadcast.ImageDevice) {
                                                // Store the device for later recreation
                                                participantDevices[participantInfo.participantId] = device
                                                
                                                // Get the preview view from the device with FILL mode to fill container
                                                val previewView = device.getPreviewView(
                                                    com.amazonaws.ivs.broadcast.BroadcastConfiguration.AspectMode.FILL
                                                )
                                                
                                                Log.d(TAG, "PreviewView created: ${previewView?.javaClass?.simpleName}")
                                                
                                                // Add participant's video to grid
                                                previewView?.let { pv ->
                                                    addParticipantView(participantInfo.participantId, pv)
                                                }
                                            } else {
                                                Log.w(TAG, "Device is not ImageDevice: ${device?.javaClass?.simpleName}")
                                            }
                                        } else {
                                            Log.w(TAG, "Stream is not ImageStageStream")
                                        }
                                    } catch (e: Exception) {
                                        Log.e(TAG, "Error attaching video stream: ${e.message}", e)
                                        e.printStackTrace()
                                        updateStatus("Error: ${e.message}")
                                    }
                                }
                            }
                        }
                    }
                    
                    override fun onStreamsRemoved(
                        stage: Stage,
                        participantInfo: ParticipantInfo,
                        streams: List<StageStream>
                    ) {
                        Log.d(TAG, "Streams removed from ${participantInfo.participantId}")
                        val data = createEventData("participantId", participantInfo.participantId)
                        sendEvent("StreamsRemoved", data)
                    }
                    
                    override fun onStreamsMutedChanged(
                        stage: Stage,
                        participantInfo: ParticipantInfo,
                        streams: List<StageStream>
                    ) {
                        Log.d(TAG, "Streams muted changed for: ${participantInfo.participantId}")
                    }
                })
                
                // Join the stage
                join()
            }
            
            Log.d(TAG, "Stage join initiated")
            isJoined = true
            updateStatus("Joining stage...")
            
        } catch (e: BroadcastException) {
            Log.e(TAG, "Failed to join stage", e)
            updateStatus("Failed to join: ${e.message}")
            sendEvent("ConnectionStateChanged", createEventData("state", "ERROR"))
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error", e)
            updateStatus("Error: ${e.message}")
            sendEvent("ConnectionStateChanged", createEventData("state", "ERROR"))
        }
    }
    
    private fun updateStatus(status: String) {
        post {
            statusText?.text = status
            Log.d(TAG, "Status: $status")
        }
    }
    
    private fun createEventData(key: String, value: String): WritableMap {
        return Arguments.createMap().apply {
            putString(key, value)
        }
    }
    
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, eventName, params)
    }
    
    private fun addParticipantView(participantId: String, previewView: View) {
        Log.d(TAG, "Adding participant view for: $participantId")
        
        // Check if participant already has a view
        if (participantViews.containsKey(participantId)) {
            Log.w(TAG, "Participant $participantId already has a view")
            return
        }
        
        // Create a container for the participant with rounded corners (Google Meet style)
        val container = FrameLayout(context).apply {
            // Apply rounded corners
            clipToOutline = true
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setRoundRect(0, 0, view.width, view.height, 16f) // 16dp corner radius
                }
            }
        }
        
        // Add preview view to container
        previewView.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        )
        container.addView(previewView)
        
        // COMMENTED: No need for participant label as of now
        /*
        // Add participant label
        val label = TextView(context).apply {
            text = "P${participantViews.size + 1}"
            textSize = 12f
            setTextColor(android.graphics.Color.WHITE)
            setBackgroundColor(android.graphics.Color.argb(128, 0, 0, 0))
            setPadding(8, 4, 8, 4)
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                setMargins(4, 4, 4, 4)
            }
        }
        container.addView(label)
        */
        
        // Store the container
        participantViews[participantId] = container
        
        // Rebuild layout with new participant count
        updateGridLayout()
        
        // Show grid, hide status
        gridLayout?.visibility = VISIBLE
        statusText?.visibility = GONE
        
        Log.d(TAG, "✅ Participant view added (${participantViews.size}/${MAX_PARTICIPANTS})")
        updateStatus("Streaming ${participantViews.size} participant(s)")
    }
    
    private fun removeParticipantView(participantId: String) {
        Log.d(TAG, "Removing participant view for: $participantId")
        
        val containerToRemove = participantViews[participantId]
        if (containerToRemove != null) {
            try {
                // Remove from grid first
                gridLayout?.removeView(containerToRemove)
                
                // Remove from maps
                participantViews.remove(participantId)
                participantDevices.remove(participantId)
                participantAudioDevices.remove(participantId)
                
                // Rebuild layout with remaining participants
                if (participantViews.isNotEmpty()) {
                    updateGridLayout()
                }
                
                Log.d(TAG, "✅ Participant view removed (${participantViews.size} remaining)")
            } catch (e: Exception) {
                Log.e(TAG, "Error removing participant view: ${e.message}", e)
            }
        }
    }
    
    fun setMuted(muted: Boolean) {
        Log.d(TAG, "Setting muted state: $muted")
        isMuted = muted
        
        // Apply mute state to all participant audio devices using gain
        // 0.0f = muted (no audio), 1.0f = unmuted (full volume)
        participantAudioDevices.values.forEach { audioDevice ->
            try {
                val gain = if (muted) 0f else 1f
                audioDevice.setGain(gain)
                Log.d(TAG, "Applied mute state (gain=$gain) to audio device")
            } catch (e: Exception) {
                Log.e(TAG, "Error setting mute state: ${e.message}", e)
            }
        }
    }
    
    fun getMuted(): Boolean {
        return isMuted
    }
    
    fun setShouldCleanup(shouldCleanup: Boolean) {
        Log.d(TAG, "Setting shouldCleanup flag: $shouldCleanup")
        this.shouldCleanup = shouldCleanup
    }
    
    private fun updateGridLayout() {
        Log.d(TAG, "Rebuilding layout for ${participantViews.size} participants")
        
        val count = participantViews.size
        val containers = participantViews.values.toList()
        
        // CRITICAL FIX: Update children's layout params FIRST, THEN change grid configuration
        // This prevents "columnCount must be >= max grid indices" error
        when (count) {
            0 -> {
                // No participants - clear grid
                gridLayout?.removeAllViews()
            }
            1 -> {
                // Update layout params first
                updateContainerLayout(containers[0], 0, 0, 1, 1)
                // Then set grid configuration
                gridLayout?.apply {
                    columnCount = 1
                    rowCount = 1
                }
            }
            2 -> {
                // CRITICAL: Set rowCount FIRST (to accommodate row=1), THEN update params, THEN set columnCount
                gridLayout?.rowCount = 2
                updateContainerLayout(containers[0], 0, 0, 1, 1)
                updateContainerLayout(containers[1], 0, 1, 1, 1)
                gridLayout?.columnCount = 1
            }
            3 -> {
                // CRITICAL: Set grid dimensions FIRST to accommodate all positions
                gridLayout?.columnCount = 2
                gridLayout?.rowCount = 2
                // Then update layout params
                updateContainerLayout(containers[0], 0, 0, 1, 1)
                updateContainerLayout(containers[1], 1, 0, 1, 1)
                updateContainerLayout(containers[2], 0, 1, 2, 1) // spans 2 columns
            }
            4 -> {
                // CRITICAL: Set grid dimensions FIRST to accommodate all positions
                gridLayout?.columnCount = 2
                gridLayout?.rowCount = 2
                // Then update layout params
                updateContainerLayout(containers[0], 0, 0, 1, 1)
                updateContainerLayout(containers[1], 1, 0, 1, 1)
                updateContainerLayout(containers[2], 0, 1, 1, 1)
                updateContainerLayout(containers[3], 1, 1, 1, 1)
            }
        }
        
        // Force complete relayout after configuration change
        post {
            gridLayout?.requestLayout()
            gridLayout?.invalidate()
            this@RNIVSStageViewerView.requestLayout()
        }
        
        Log.d(TAG, "✅ Grid layout rebuilt: ${count} participants")
    }
    
    private fun updateContainerLayout(container: View, column: Int, row: Int, columnSpan: Int, rowSpan: Int) {
        Log.d(TAG, "🔧 Layout update: col=$column, row=$row, span=$columnSpan×$rowSpan, inGrid=${container.parent == gridLayout}")
        
        // CRITICAL FIX: Always create fresh GridLayout.LayoutParams
        val newParams = GridLayout.LayoutParams().apply {
            width = 0
            height = 0
            columnSpec = GridLayout.spec(column, columnSpan, 1f)
            rowSpec = GridLayout.spec(row, rowSpan, 1f)
            setMargins(4, 4, 4, 4)
        }
        
        // Apply the new params
        container.layoutParams = newParams
        
        // Add to grid if not already there
        if (container.parent != gridLayout) {
            gridLayout?.addView(container)
            Log.d(TAG, "✅ Container added at col=$column, row=$row")
        } else {
            Log.d(TAG, "✅ Container updated at col=$column, row=$row")
        }
    }
    
    private fun cleanup() {
        Log.d(TAG, "Cleaning up stage...")
        try {
            // Cleanup Bluetooth audio manager
            bluetoothAudioManager?.cleanup()
            bluetoothAudioManager = null
            Log.d(TAG, "✅ Bluetooth audio manager cleaned up")
            
            stage?.leave()
            stage = null
            isJoined = false
            
            // Clear all participant views and devices
            participantViews.clear()
            participantDevices.clear()
            participantAudioDevices.clear()
            gridLayout?.removeAllViews()
        } catch (e: Exception) {
            Log.e(TAG, "Error during cleanup", e)
        }
    }
    
    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        Log.d(TAG, "View attached to window - recreating video views")
        
        // Recreate video views from stored devices
        post {
            if (participantDevices.isNotEmpty()) {
                Log.d(TAG, "Recreating ${participantDevices.size} participant video views")
                
                // Create a copy of participant IDs to avoid concurrent modification
                val participantIds = participantViews.keys.toList()
                
                participantIds.forEach { participantId ->
                    val device = participantDevices[participantId]
                    val container = participantViews[participantId]
                    
                    if (device != null && container is FrameLayout) {
                        try {
                            Log.d(TAG, "Recreating video view for: $participantId")
                            
                            // COMMENTED: No need for label handling as of now
                            /*
                            // Remove old preview view (but keep label)
                            var labelView: TextView? = null
                            for (i in 0 until container.childCount) {
                                val child = container.getChildAt(i)
                                if (child is TextView) {
                                    labelView = child
                                } else {
                                    container.removeView(child)
                                }
                            }
                            */
                            
                            // Remove all old views from container
                            container.removeAllViews()
                            
                            // Create new preview view from device
                            val newPreviewView = device.getPreviewView(
                                com.amazonaws.ivs.broadcast.BroadcastConfiguration.AspectMode.FILL
                            )
                            
                            if (newPreviewView != null) {
                                newPreviewView.layoutParams = FrameLayout.LayoutParams(
                                    FrameLayout.LayoutParams.MATCH_PARENT,
                                    FrameLayout.LayoutParams.MATCH_PARENT
                                )
                                container.addView(newPreviewView)
                                
                                // COMMENTED: No need to re-add label as of now
                                /*
                                // Re-add label on top
                                if (labelView != null) {
                                    labelView.bringToFront()
                                }
                                */
                                
                                Log.d(TAG, "✅ Video view recreated for: $participantId")
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error recreating video view: ${e.message}", e)
                        }
                    }
                }
                
                // Refresh the grid
                gridLayout?.requestLayout()
                gridLayout?.invalidate()
                
                // Make sure grid is visible
                if (gridLayout?.visibility != VISIBLE) {
                    gridLayout?.visibility = VISIBLE
                    statusText?.visibility = GONE
                }
                
                Log.d(TAG, "✅ All video views recreated")
            }
        }
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        
        if (shouldCleanup) {
            Log.d(TAG, "View detached from window - performing cleanup (shouldCleanup=true)")
            cleanup()
        } else {
            Log.d(TAG, "View detached from window - keeping connection alive (shouldCleanup=false)")
            // Don't cleanup here - view might just be navigating away temporarily
            // Cleanup will happen when ViewManager's onDropViewInstance is called
        }
    }
    
    override fun requestLayout() {
        super.requestLayout()
        post(measureAndLayout)
    }
    
    private val measureAndLayout = Runnable {
        measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
        )
        layout(left, top, right, bottom)
    }
}
