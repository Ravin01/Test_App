package com.flykup.app.ivs

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

class RNIVSBroadcastViewManager(
    private val reactContext: ReactApplicationContext
) : SimpleViewManager<RNIVSBroadcastView>() {

    companion object {
        const val REACT_CLASS = "RNIVSBroadcastView"
    }

    override fun getName(): String {
        return REACT_CLASS
    }

    override fun createViewInstance(reactContext: ThemedReactContext): RNIVSBroadcastView {
        return RNIVSBroadcastView(reactContext)
    }

    override fun onDropViewInstance(view: RNIVSBroadcastView) {
        super.onDropViewInstance(view)
        // Get the broadcast module to detach preview
        val broadcastModule = reactContext.getNativeModule(RNIVSBroadcastModule::class.java)
        broadcastModule?.detachPreview(view)
    }
}
