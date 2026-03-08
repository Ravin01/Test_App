package com.flykup.app.ivs

import android.content.Context
import android.graphics.Color
import android.widget.FrameLayout
import android.widget.TextView
import com.amazonaws.ivs.broadcast.BroadcastSession

class RNIVSBroadcastView(context: Context) : FrameLayout(context) {
    
    private var currentSession: BroadcastSession? = null
    private var placeholderText: TextView? = null
    
    init {
        // Create a placeholder view - preview will be handled by the camera device itself
        placeholderText = TextView(context).apply {
            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
            text = "Camera Preview Active"
            textSize = 16f
            setTextColor(Color.WHITE)
            gravity = android.view.Gravity.CENTER
        }
        placeholderText?.let { addView(it) }
        setBackgroundColor(Color.BLACK)
        android.util.Log.d("RNIVSBroadcastView", "✅ Broadcast preview container created")
    }
    
    fun attachBroadcastSession(session: BroadcastSession?) {
        currentSession = session
        // The camera preview is handled internally by the broadcast session
        // This view serves as a placeholder container
        android.util.Log.d("RNIVSBroadcastView", "✅ Broadcast session attached")
    }
    
    fun detachBroadcastSession(session: BroadcastSession?) {
        currentSession = null
        android.util.Log.d("RNIVSBroadcastView", "✅ Broadcast session detached")
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        removeAllViews()
        placeholderText = null
        currentSession = null
        android.util.Log.d("RNIVSBroadcastView", "✅ Preview view cleaned up")
    }
}
