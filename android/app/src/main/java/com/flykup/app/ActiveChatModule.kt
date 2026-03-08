// ActiveChatModule.kt
package com.flykup.app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ActiveChatModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ActiveChatModule"

    @ReactMethod
    fun setActiveChatRoomId(roomId: String?) {
        val activity = currentActivity as? MainActivity
        activity?.setActiveChatRoomId(roomId)
    }

    @ReactMethod
    fun clearActiveChatRoomId() {
        val activity = currentActivity as? MainActivity
        activity?.setActiveChatRoomId(null)
    }
}