package com.flykup.app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.content.Context

class ChatModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "ChatModule"
    }

    /**
     * Sets the active chat room ID in Android's SharedPreferences.
     * Call this from your React Native app when entering/leaving a chat screen.
     * Pass null or an empty string when leaving a chat screen.
     */
    @ReactMethod
    fun setActiveChatRoomId(chatRoomId: String?) {
        val sharedPreferences = reactApplicationContext.getSharedPreferences("ReactNativeSharedPreferences", Context.MODE_PRIVATE)
        with(sharedPreferences.edit()) {
            putString("active_chat_room_id", chatRoomId)
            apply()
        }
    }
}
