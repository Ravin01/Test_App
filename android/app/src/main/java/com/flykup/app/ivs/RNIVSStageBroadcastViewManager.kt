package com.flykup.app.ivs

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class RNIVSStageBroadcastViewManager(private val reactContext: ReactApplicationContext) : 
    SimpleViewManager<RNIVSStageBroadcastView>() {
    
    private val TAG = "RNIVSStageBroadcastVM"

    override fun getName(): String = "RNIVSStageBroadcastView"

    override fun createViewInstance(reactContext: ThemedReactContext): RNIVSStageBroadcastView {
        Log.d(TAG, "🎬 Creating Stage Broadcast View instance")
        return RNIVSStageBroadcastView(this.reactContext)
    }

    override fun onDropViewInstance(view: RNIVSStageBroadcastView) {
        Log.d(TAG, "🧹 Dropping Stage Broadcast View instance")
        view.cleanup()
        super.onDropViewInstance(view)
    }

    @ReactProp(name = "scaleType")
    fun setScaleType(view: RNIVSStageBroadcastView, scaleType: String?) {
        Log.d(TAG, "Setting scale type: $scaleType")
        // Scale type can be handled if needed
    }
}
