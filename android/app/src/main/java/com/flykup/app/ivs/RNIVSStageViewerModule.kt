package com.flykup.app.ivs

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.amazonaws.ivs.broadcast.Stage
import com.amazonaws.ivs.broadcast.StageStream
import com.amazonaws.ivs.broadcast.ParticipantInfo
import com.amazonaws.ivs.broadcast.LocalStageStream
import com.amazonaws.ivs.broadcast.StageRenderer
import com.amazonaws.ivs.broadcast.BroadcastException

class RNIVSStageViewerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private var stage: Stage? = null
    private val TAG = "RNIVSStageViewer"
    private val participantStreams = mutableMapOf<String, MutableList<StageStream>>()
    
    override fun getName(): String {
        return "RNIVSStageViewer"
    }
    
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
    
    @ReactMethod
    fun joinStage(token: String, promise: Promise) {
        try {
            Log.d(TAG, "Joining stage with token...")
            
            val strategy = object : Stage.Strategy {
                override fun shouldSubscribeToParticipant(stage: Stage, participantInfo: ParticipantInfo): Stage.SubscribeType {
                    // Subscribe to both audio and video for all participants
                    Log.d(TAG, "Subscribing to participant: ${participantInfo.participantId}")
                    return Stage.SubscribeType.AUDIO_VIDEO
                }
                
                override fun shouldPublishFromParticipant(stage: Stage, participantInfo: ParticipantInfo): Boolean {
                    // Viewers don't publish
                    return false
                }
                
                override fun stageStreamsToPublishForParticipant(stage: Stage, participantInfo: ParticipantInfo): List<LocalStageStream> {
                    // Viewers don't publish any streams
                    return emptyList()
                }
            }
            
            stage = Stage(reactApplicationContext, token, strategy).apply {
                // Add renderer to receive stage events
                addRenderer(object : StageRenderer {
                    override fun onConnectionStateChanged(stage: Stage, state: Stage.ConnectionState, exception: BroadcastException?) {
                        Log.d(TAG, "Stage connection state changed: $state")
                        val params = Arguments.createMap().apply {
                            putString("event", "connection-state-changed")
                            putString("state", state.name)
                            if (exception != null) {
                                putString("error", exception.message)
                            }
                        }
                        sendEvent("StageViewerEvent", params)
                        
                        if (state == Stage.ConnectionState.CONNECTED) {
                            val connectedParams = Arguments.createMap().apply {
                                putString("event", "connected")
                            }
                            sendEvent("StageViewerEvent", connectedParams)
                        } else if (state == Stage.ConnectionState.DISCONNECTED) {
                            val disconnectedParams = Arguments.createMap().apply {
                                putString("event", "disconnected")
                            }
                            sendEvent("StageViewerEvent", disconnectedParams)
                        }
                    }
                    
                    override fun onError(exception: BroadcastException) {
                        Log.e(TAG, "Stage error: ${exception.message}")
                        val params = Arguments.createMap().apply {
                            putString("event", "error")
                            putString("error", exception.message)
                        }
                        sendEvent("StageViewerEvent", params)
                    }
                    
                    override fun onParticipantJoined(stage: Stage, participantInfo: ParticipantInfo) {
                        Log.d(TAG, "Participant joined: ${participantInfo.participantId}")
                        val params = Arguments.createMap().apply {
                            putString("event", "participant-joined")
                            putString("participantId", participantInfo.participantId)
                        }
                        sendEvent("StageViewerEvent", params)
                    }
                    
                    override fun onParticipantLeft(stage: Stage, participantInfo: ParticipantInfo) {
                        Log.d(TAG, "Participant left: ${participantInfo.participantId}")
                        participantStreams.remove(participantInfo.participantId)
                        
                        val params = Arguments.createMap().apply {
                            putString("event", "participant-left")
                            putString("participantId", participantInfo.participantId)
                        }
                        sendEvent("StageViewerEvent", params)
                    }
                    
                    override fun onParticipantPublishStateChanged(stage: Stage, participantInfo: ParticipantInfo, state: Stage.PublishState) {
                        Log.d(TAG, "Participant publish state changed: ${participantInfo.participantId}, state: $state")
                    }
                    
                    override fun onParticipantSubscribeStateChanged(stage: Stage, participantInfo: ParticipantInfo, state: Stage.SubscribeState) {
                        Log.d(TAG, "Participant subscribe state changed: ${participantInfo.participantId}, state: $state")
                    }
                    
                    override fun onStreamsAdded(stage: Stage, participantInfo: ParticipantInfo, streams: List<StageStream>) {
                        Log.d(TAG, "Participant streams added: ${participantInfo.participantId}, streams: ${streams.size}")
                        
                        if (!participantStreams.containsKey(participantInfo.participantId)) {
                            participantStreams[participantInfo.participantId] = mutableListOf()
                        }
                        participantStreams[participantInfo.participantId]?.addAll(streams)
                        
                        val params = Arguments.createMap().apply {
                            putString("event", "streams-added")
                            putString("participantId", participantInfo.participantId)
                            putInt("streamCount", streams.size)
                        }
                        sendEvent("StageViewerEvent", params)
                    }
                    
                    override fun onStreamsRemoved(stage: Stage, participantInfo: ParticipantInfo, streams: List<StageStream>) {
                        Log.d(TAG, "Participant streams removed: ${participantInfo.participantId}")
                        participantStreams[participantInfo.participantId]?.removeAll(streams.toSet())
                        
                        val params = Arguments.createMap().apply {
                            putString("event", "streams-removed")
                            putString("participantId", participantInfo.participantId)
                        }
                        sendEvent("StageViewerEvent", params)
                    }
                    
                    override fun onStreamsMutedChanged(stage: Stage, participantInfo: ParticipantInfo, streams: List<StageStream>) {
                        Log.d(TAG, "Streams muted changed for: ${participantInfo.participantId}")
                    }
                })
                
                // Join the stage
                join()
            }
            
            Log.d(TAG, "Stage join initiated successfully")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error joining stage: ${e.message}", e)
            promise.reject("STAGE_JOIN_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun leaveStage(promise: Promise) {
        try {
            Log.d(TAG, "Leaving stage...")
            stage?.let {
                it.leave()
                stage = null
                participantStreams.clear()
                Log.d(TAG, "Stage left successfully")
            }
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error leaving stage: ${e.message}", e)
            promise.reject("STAGE_LEAVE_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun getStageStatus(promise: Promise) {
        try {
            val status = Arguments.createMap().apply {
                putBoolean("isConnected", stage != null)
                putInt("participantCount", participantStreams.size)
            }
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("GET_STATUS_ERROR", e.message, e)
        }
    }
    
    // Method to get participant streams for rendering
    fun getParticipantStreams(participantId: String): List<StageStream>? {
        return participantStreams[participantId]
    }
    
    // Get all participant IDs
    fun getAllParticipantIds(): List<String> {
        return participantStreams.keys.toList()
    }
    
    // Get the stage instance
    fun getStage(): Stage? {
        return stage
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            stage?.leave()
            stage = null
            participantStreams.clear()
        } catch (e: Exception) {
            Log.e(TAG, "Error in cleanup: ${e.message}", e)
        }
    }
}
