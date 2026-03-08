package com.flykup.app.ivs

import android.content.Context
import android.util.Log
import android.view.TextureView
import android.widget.FrameLayout
import com.facebook.react.bridge.ReactApplicationContext

class RNIVSStageBroadcastView(private val reactContext: ReactApplicationContext) : FrameLayout(reactContext) {
    
    private val TAG = "RNIVSStageBroadcastView"
    private var previewTextureView: TextureView? = null
    
    init {
        Log.d(TAG, "🎬 RNIVSStageBroadcastView initialized")
        setBackgroundColor(android.graphics.Color.BLACK)
        
        // For Stage SDK, we use TextureView which will automatically render local streams
        // The Stage SDK handles preview rendering internally
        previewTextureView = TextureView(context).apply {
            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
            
            Log.d(TAG, "✅ TextureView created for Stage preview")
        }
        
        previewTextureView?.let { 
            addView(it)
            // Register this view with the module
            RNIVSStageBroadcastModule.setPreviewTextureView(it)
            Log.d(TAG, "✅ TextureView registered with module")
        }
        Log.d(TAG, "✅ Preview view added to container")
    }
    
    fun getPreviewTextureView(): TextureView? {
        return previewTextureView
    }
    
    fun updateStatus(isConnected: Boolean) {
        Log.d(TAG, "Status updated: connected=$isConnected")
        // Preview is handled by ImageLocalStageStream
    }
    
    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        Log.d(TAG, "📱 View attached to window")
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        Log.d(TAG, "🧹 View detached from window")
    }
    
    override fun requestLayout() {
        super.requestLayout()
        
        // Fix for React Native's measure/layout cycle
        post(measureAndLayout)
    }
    
    private val measureAndLayout = Runnable {
        measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
        )
        layout(left, top, right, bottom)
    }
    
    fun cleanup() {
        Log.d(TAG, "🧹 Cleaning up view")
        // Unregister preview view from module
        RNIVSStageBroadcastModule.setPreviewTextureView(null)
        previewTextureView = null
        removeAllViews()
        Log.d(TAG, "✅ Preview view unregistered and cleaned up")
    }
}
