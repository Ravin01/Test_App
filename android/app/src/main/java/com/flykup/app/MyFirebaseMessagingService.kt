package com.flykup.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FCM"
    }

    private fun getActiveChatRoomId(): String? {
        val sharedPreferences = getSharedPreferences("ReactNativeSharedPreferences", Context.MODE_PRIVATE)
        return sharedPreferences.getString("active_chat_room_id", null)
    }

    private fun isDeviceInSilentMode(context: Context): Boolean {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        return audioManager.ringerMode == AudioManager.RINGER_MODE_SILENT
    }

    private fun isAppInForeground(): Boolean {
        val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        val appProcesses = activityManager.runningAppProcesses ?: return false
        val packageName = packageName
        for (appProcess in appProcesses) {
            if (appProcess.importance == android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
                appProcess.processName == packageName) {
                return true
            }
        }
        return false
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // CRITICAL: Do NOT call super.onMessageReceived() as it can interfere with background handling
        // super.onMessageReceived(remoteMessage)
        
        Log.d(TAG, "=== FCM MESSAGE RECEIVED ===")
        Log.d(TAG, "Message ID: ${remoteMessage.messageId}")
        Log.d(TAG, "Data payload: ${remoteMessage.data}")
        Log.d(TAG, "Notification payload: ${remoteMessage.notification}")

        val data = remoteMessage.data.toMutableMap()
        val notification = remoteMessage.notification
        val isAppInForeground = isAppInForeground()
        Log.d(TAG, "App is in foreground: $isAppInForeground")

        // Merge notification data into data map
        notification?.let { notif ->
            if (data["title"].isNullOrEmpty()) data["title"] = notif.title ?: ""
            if (data["body"].isNullOrEmpty()) data["body"] = notif.body ?: ""
        }

        val messageType = data["type"] ?: "general"
        Log.d(TAG, "Message type: $messageType")

        // CRITICAL FIX: Only handle sounds in Kotlin for FOREGROUND
        // For BACKGROUND/KILLED, the JavaScript background handler in index.js will handle everything
        if (isAppInForeground) {
            Log.d(TAG, "🟢 FOREGROUND - Handling in Kotlin with sound and forwarding to React Native")
            
            // Handle sounds in Kotlin for foreground only
            if ((messageType == "chat_message" || messageType == "chat")) {
                val notificationChatRoomId = data["chatRoomId"] ?: data["chatId"] ?: data["userId"]
                val activeChatRoomId = getActiveChatRoomId()
                Log.d(TAG, "Chat notification - ID: $notificationChatRoomId, Active: $activeChatRoomId")

                if (notificationChatRoomId != null && notificationChatRoomId == activeChatRoomId) {
                    Log.d(TAG, "User is in active chat, playing sound only")
                    if (!isDeviceInSilentMode(this)) {
                        val soundType = getSoundTypeForNotification(messageType, data)
                        playCustomSound(soundType)
                    }
                    // Still forward to JS but with a flag to not show notification
                    data["skipNotification"] = "true"
                } else {
                    // Play sound for chat messages in other rooms
                    if (!isDeviceInSilentMode(this)) {
                        val soundType = getSoundTypeForNotification(messageType, data)
                        if (soundType != "none" && soundType != "silent") {
                            playCustomSound(soundType)
                        }
                    }
                }
            } else {
                // Play sound for other notifications if not silent
                if (!isDeviceInSilentMode(this)) {
                    val soundType = getSoundTypeForNotification(messageType, data)
                    if (soundType != "none" && soundType != "silent") {
                        playCustomSound(soundType)
                    }
                }
            }
            
            // Forward to JavaScript for foreground handling
            forwardToReactNative(data)
        } else {
            // BACKGROUND/KILLED STATE: Let the JS background handler in index.js handle everything
            Log.d(TAG, "🔴 BACKGROUND/KILLED - NOT intercepting, JS background handler will process")
            Log.d(TAG, "⚠️ If notification doesn't appear, check:")
            Log.d(TAG, "   1. index.js background handler is registered")
            Log.d(TAG, "   2. Notification payload has 'data' object")
            Log.d(TAG, "   3. Device is not in Do Not Disturb mode")
            Log.d(TAG, "   4. App has notification permissions")
            
            // IMPORTANT: By NOT calling super.onMessageReceived() and not doing anything here,
            // we allow the JavaScript background handler (messaging().setBackgroundMessageHandler)
            // in index.js to receive and handle the notification properly
        }
    }

    private fun forwardToReactNative(data: Map<String, String>) {
        try {
            val intent = Intent().apply {
                action = "com.flykup.NOTIFICATION_RECEIVED"
                putExtra("notification_data", data.toString())
            }
            sendBroadcast(intent)
            Log.d(TAG, "Notification data forwarded to React Native: ${data.toString()}")
        } catch (e: Exception) {
            Log.e(TAG, "Error forwarding to React Native: ${e.message}")
        }
    }

    private fun getSoundTypeForNotification(type: String, data: Map<String, String>): String {
        // Check if sound is explicitly specified in data
        data["sound"]?.let { return it }

        // Map notification types to sounds
        return when (type) {
            "chat_message", "chat" -> "chat_notification"
            "order_placed", "order_status", "order_cancelled" -> "soundtrack"
            "follow", "like", "comment" -> "default"
            "live_stream_start", "new_show_scheduled" -> "soundtrack"
            "seller_broadcast", "admin_broadcast" -> "urgent_notification"
            "approval", "seller_status" -> "urgent_notification"
            "return_status", "seller_order_update" -> "soundtrack"
            "new_video", "new_product" -> "gentle_notification"
            else -> "default"
        }
    }

    private fun playCustomSound(soundType: String) {
        try {
            val soundUri = getSoundUriForType(soundType)
            Log.d(TAG, "Attempting to play sound: $soundType, URI: $soundUri")
            
            val ringtone = RingtoneManager.getRingtone(this, soundUri)
            ringtone?.play()
            
            // Add a short delay to ensure sound plays but doesn't loop
            Handler(Looper.getMainLooper()).postDelayed({
                ringtone?.stop()
            }, 3000) // Stop after 3 seconds
            
        } catch (e: Exception) {
            Log.e(TAG, "Error playing sound $soundType: ${e.message}")
        }
    }

    private fun getSoundUriForType(soundType: String): Uri {
        val defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        // Map sound types to actual raw file names
        val soundMap = mapOf(
            "chat_notification" to "chat_notification",
            "soundtrack" to "soundtrack", 
            "urgent_notification" to "urgent_notification",
            "gentle_notification" to "gentle_notification",
            "default" to "default"
        )

        val actualSoundName = soundMap[soundType] ?: soundType
        
        return try {
            val resourceId = resources.getIdentifier(actualSoundName, "raw", packageName)
            if (resourceId != 0) {
                Uri.parse("android.resource://$packageName/$resourceId")
            } else {
                Log.w(TAG, "Sound resource '$actualSoundName' not found in raw folder, using default")
                defaultUri
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error loading sound '$actualSoundName': ${e.message}")
            defaultUri
        }
    }

    // Debug method to check available sound resources
    private fun debugSoundResources() {
        val soundNames = arrayOf(
            "chat_notification", 
            "soundtrack", 
            "urgent_notification", 
            "gentle_notification", 
            "default"
        )
        
        Log.d(TAG, "=== SOUND RESOURCES DEBUG ===")
        soundNames.forEach { soundName ->
            val resourceId = resources.getIdentifier(soundName, "raw", packageName)
            val exists = if (resourceId != 0) "FOUND" else "NOT FOUND"
            Log.d(TAG, "Sound '$soundName' - $exists (Resource ID: $resourceId)")
        }
        Log.d(TAG, "=== END SOUND DEBUG ===")
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM Token: $token")
        
        // Debug sound resources when token is refreshed
        debugSoundResources()
    }
}
