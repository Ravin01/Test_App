package com.flykup.app.ivs

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class RNIVSStageViewerViewManager(
    private val reactContext: ReactApplicationContext
) : SimpleViewManager<RNIVSStageViewerView>() {
    
    private val TAG = "RNIVSStageViewerViewMgr"
    
    override fun getName(): String {
        return "RNIVSStageViewerView"
    }
    
    override fun createViewInstance(reactContext: ThemedReactContext): RNIVSStageViewerView {
        Log.d(TAG, "Creating RNIVSStageViewerView instance")
        return RNIVSStageViewerView(this.reactContext)
    }
    
    @ReactProp(name = "stageToken")
    fun setStageToken(view: RNIVSStageViewerView, token: String?) {
        Log.d(TAG, "Setting stage token on view")
        view.setStageToken(token)
    }
    
    @ReactProp(name = "muted")
    fun setMuted(view: RNIVSStageViewerView, muted: Boolean) {
        Log.d(TAG, "Setting muted on view: $muted")
        view.setMuted(muted)
    }
    
    @ReactProp(name = "shouldCleanup")
    fun setShouldCleanup(view: RNIVSStageViewerView, shouldCleanup: Boolean) {
        Log.d(TAG, "Setting shouldCleanup on view: $shouldCleanup")
        view.setShouldCleanup(shouldCleanup)
    }
    
    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.builder<String, Any>()
            .put("onParticipantJoined", MapBuilder.of("registrationName", "onParticipantJoined"))
            .put("onParticipantLeft", MapBuilder.of("registrationName", "onParticipantLeft"))
            .put("onStreamsAdded", MapBuilder.of("registrationName", "onStreamsAdded"))
            .put("onStreamsRemoved", MapBuilder.of("registrationName", "onStreamsRemoved"))
            .put("onConnectionStateChanged", MapBuilder.of("registrationName", "onConnectionStateChanged"))
            .build()
    }
    
    override fun receiveCommand(
        view: RNIVSStageViewerView,
        commandId: String,
        args: ReadableArray?
    ) {
        when (commandId) {
            "updateParticipants" -> {
                Log.d(TAG, "Received updateParticipants command (not implemented in placeholder)")
                // Placeholder view doesn't implement this
            }
            else -> {
                Log.w(TAG, "Unknown command: $commandId")
            }
        }
    }
    
    override fun onDropViewInstance(view: RNIVSStageViewerView) {
        Log.d(TAG, "Dropping view instance - triggering cleanup")
        // Call cleanup before dropping to properly disconnect from stage
        try {
            val cleanupMethod = view.javaClass.getDeclaredMethod("cleanup")
            cleanupMethod.isAccessible = true
            cleanupMethod.invoke(view)
        } catch (e: Exception) {
            Log.e(TAG, "Error calling cleanup: ${e.message}", e)
        }
        super.onDropViewInstance(view)
    }
}
