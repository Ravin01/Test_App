package com.flykup.app

import android.app.NotificationManager
import android.app.PendingIntent
import android.app.PictureInPictureParams
import android.app.RemoteAction
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.util.Rational
import android.view.View
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.zoontek.rnbootsplash.RNBootSplash

class MainActivity : ReactActivity(), DefaultHardwareBackBtnHandler {

    // Track activity state for video player initialization
    private var isActivityReady = false
    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var audioFocusGranted = false
    private var isMuted = false
    
    // Flag to track if we're returning from an external activity (like Razorpay)
    private var isReturningFromExternalActivity = false
    
    private val pipMuteReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == ACTION_TOGGLE_MUTE) {
                toggleMute()
            }
        }
    }

    companion object {
        private const val TAG = "MainActivity"
        private const val ACTION_TOGGLE_MUTE = "com.flykup.app.TOGGLE_MUTE"
        private const val REQUEST_CODE_MUTE = 100
        
        // Store active room ID from React Native
        var activeChatRoomId: String? = null
        // Flag to control auto-PIP behavior - DEPRECATED: Now only used for incoming calls
        @JvmField
        var shouldAutoEnterPIP: Boolean = false
        // NEW: Flag specifically for incoming call PIP mode
        @JvmField
        var isIncomingCallActive: Boolean = false
        
        // Flag to prevent app reload when returning from external activities (Razorpay, etc.)
        @JvmField
        var isPaymentInProgress: Boolean = false
    }

    override fun getMainComponentName(): String = "FLYKUP"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(
            this,
            mainComponentName,
            fabricEnabled
        )

    override fun onCreate(savedInstanceState: Bundle?) {
        // Initialize RNBootSplash BEFORE calling super and setContentView
        RNBootSplash.init(this, R.style.BootTheme)
        // Switch from SplashTheme to AppTheme before calling super
        setTheme(R.style.AppTheme)
        
        // CRITICAL: Pass null to prevent activity recreation issues when returning from external activities
        // This ensures React Native state is preserved when the activity is recreated
        super.onCreate(null)
        
        // Enable edge-to-edge display
        enableEdgeToEdge()
        
        // Check if we're being recreated after returning from an external activity
        if (savedInstanceState != null) {
            Log.d(TAG, "MainActivity onCreate - Activity is being recreated, preserving state")
            isReturningFromExternalActivity = true
        }
        
        Log.d(TAG, "MainActivity onCreate called - Bootsplash initialized, savedInstanceState: ${savedInstanceState != null}")
        handleNotificationIntent(intent)
        setupAudioFocus()
    }
    
    /**
     * Enable edge-to-edge display with proper window insets handling
     */
    private fun enableEdgeToEdge() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // For Android 11 (API 30) and above
            WindowCompat.setDecorFitsSystemWindows(window, false)
            
            // Make status bar and navigation bar transparent
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.navigationBarColor = android.graphics.Color.TRANSPARENT
            
            // Handle window insets for system bars
            val insetsController = WindowCompat.getInsetsController(window, window.decorView)
            insetsController?.apply {
                // Show system bars
                show(WindowInsetsCompat.Type.systemBars())
                // Use light status bar icons if needed (adjust based on your app theme)
                systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_DEFAULT
            }
            
            Log.d(TAG, "Edge-to-edge enabled for Android 11+")
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            // For Android 9 (API 28) to Android 10 (API 29)
            WindowCompat.setDecorFitsSystemWindows(window, false)
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.navigationBarColor = android.graphics.Color.TRANSPARENT
            
            // Enable layout in display cutout areas
            window.attributes.layoutInDisplayCutoutMode = 
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            
            Log.d(TAG, "Edge-to-edge enabled for Android 9-10")
        } else {
            // For older Android versions
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            )
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.navigationBarColor = android.graphics.Color.TRANSPARENT
            
            Log.d(TAG, "Edge-to-edge enabled for older Android versions")
        }
    }

    override fun onResume() {
        super.onResume()
        isActivityReady = true
        VideoActivityModule.setCurrentActivity(this)
        Log.d(TAG, "MainActivity onResume - Activity ready for ExoPlayer")
    }

    private fun setupAudioFocus() {
        audioManager = getSystemService(AUDIO_SERVICE) as AudioManager
        // For Android O and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val playbackAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
                .setLegacyStreamType(AudioManager.STREAM_MUSIC)
                .build()
            audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(playbackAttributes)
                .setAcceptsDelayedFocusGain(true)
                .setWillPauseWhenDucked(false) // This prevents pausing when another app takes focus
                .setOnAudioFocusChangeListener { focusChange ->
                    when (focusChange) {
                        AudioManager.AUDIOFOCUS_GAIN -> {
                            // Resume playback
                            Log.d(TAG, "Audio focus gained")
                        }
                        AudioManager.AUDIOFOCUS_LOSS -> {
                            // Stop playback completely
                            Log.d(TAG, "Audio focus lost")
                        }
                        AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                            // Pause playback temporarily
                            Log.d(TAG, "Audio focus lost transiently")
                        }
                        AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                            // Lower volume (duck) but don't pause
                            Log.d(TAG, "Audio focus ducked")
                        }
                    }
                }
                .build()
            audioFocusGranted = audioManager?.requestAudioFocus(audioFocusRequest!!) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        } else {
            // For older Android versions
            audioFocusGranted = audioManager?.requestAudioFocus(
                { focusChange ->
                    when (focusChange) {
                        AudioManager.AUDIOFOCUS_GAIN -> {
                            // Resume playback
                            Log.d(TAG, "Audio focus gained (legacy)")
                        }
                        AudioManager.AUDIOFOCUS_LOSS -> {
                            // Stop playback completely
                            Log.d(TAG, "Audio focus lost (legacy)")
                        }
                        AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                            // Pause playback temporarily
                            Log.d(TAG, "Audio focus lost transiently (legacy)")
                        }
                        AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                            // Lower volume (duck) but don't pause
                            Log.d(TAG, "Audio focus ducked (legacy)")
                        }
                    }
                },
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
    }

    override fun onPause() {
        super.onPause()
        
        // ✅ CRITICAL: Don't mark activity as not ready if we're entering PIP mode
        // Video should continue playing in PIP mode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode) {
            Log.d(TAG, "📺 MainActivity onPause - In PIP mode, keeping activity ready for video playback")
            // Keep isActivityReady = true to allow video to continue playing
        } else if (isPaymentInProgress) {
            // Don't mark as not ready when payment is in progress to prevent reload
            Log.d(TAG, "💳 MainActivity onPause - Payment in progress, keeping activity ready")
        } else {
            isActivityReady = false
            Log.d(TAG, "MainActivity onPause - Activity not ready for ExoPlayer")
        }
    }

    override fun onStop() {
        super.onStop()
        
        // ✅ CRITICAL: Don't mark activity as not ready if we're in PIP mode
        // Video should continue playing in PIP mode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode) {
            Log.d(TAG, "📺 MainActivity onStop - In PIP mode, keeping activity ready for video playback")
            // Keep isActivityReady = true to allow video to continue playing
        } else if (isPaymentInProgress) {
            // Don't interfere when payment is in progress
            Log.d(TAG, "💳 MainActivity onStop - Payment in progress, preserving state")
        } else {
            Log.d(TAG, "MainActivity onStop - Activity stopped but not in PIP mode")
        }
    }
    
    /**
     * Save instance state to help restore activity when returning from external activities
     */
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        // Save a flag to indicate we might be returning from an external activity
        outState.putBoolean("wasInExternalActivity", true)
        outState.putBoolean("isPaymentInProgress", isPaymentInProgress)
        Log.d(TAG, "💾 onSaveInstanceState - Saving state, isPaymentInProgress: $isPaymentInProgress")
    }

    override fun onDestroy() {
        super.onDestroy()
        isActivityReady = false
        VideoActivityModule.setCurrentActivity(null)
        audioFocusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
        audioManager = null
        
        // Unregister PIP broadcast receiver
        try {
            unregisterReceiver(pipMuteReceiver)
        } catch (e: Exception) {
            // Receiver might not be registered
        }
        
        Log.d(TAG, "MainActivity onDestroy - Activity destroyed")
    }

    /**
     * Toggle mute state and notify React Native
     */
    private fun toggleMute() {
        isMuted = !isMuted
        Log.d(TAG, "🔇 Mute toggled: $isMuted")
        
        // Send mute state to React Native
        try {
            val reactInstanceManager = reactNativeHost.reactInstanceManager
            val reactContext = reactInstanceManager.currentReactContext
            
            if (reactContext != null) {
                val params = Arguments.createMap()
                params.putBoolean("isMuted", isMuted)
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("onPIPMuteToggled", params)
                Log.d(TAG, "🔇 Mute state sent to React Native: $isMuted")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending mute state: ${e.message}")
        }
        
        // Update PIP controls with new mute state
        updatePIPControls()
    }

    /**
     * Create PIP actions (no actions for now - mute button removed)
     */
    private fun getPIPActions(): ArrayList<RemoteAction> {
        val actions = ArrayList<RemoteAction>()
        
        // Mute button removed as per user request
        
        return actions
    }

    /**
     * Update PIP controls
     */
    private fun updatePIPControls() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isInPictureInPictureMode) {
            val builder = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(16, 9))
            
            // Only set actions if there are any (to avoid IndexOutOfBoundsException in ExoPlayer)
            val actions = getPIPActions()
            if (actions.isNotEmpty()) {
                builder.setActions(actions)
            }
            
            setPictureInPictureParams(builder.build())
            Log.d(TAG, "📺 Updated PIP controls")
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleNotificationIntent(intent)
    }

    /**
     * Method to set active chat room ID from React Native
     */
    fun setActiveChatRoomId(roomId: String?) {
        activeChatRoomId = roomId
        Log.d(TAG, "Active chat room ID set to: $roomId")
    }

    /**
     * Check if incoming notification is for active chat room
     */
    private fun isNotificationForActiveRoom(intent: Intent): Boolean {
        val notificationChatRoomId = intent.getStringExtra("chatRoomId")
        val isChatMessage = intent.getStringExtra("type") == "chat_message"

        if (!isChatMessage) return false

        val isForActiveRoom = activeChatRoomId != null &&
                             notificationChatRoomId != null &&
                             activeChatRoomId == notificationChatRoomId

        Log.d(TAG, "Notification room check - Active: $activeChatRoomId, Incoming: $notificationChatRoomId, IsForActiveRoom: $isForActiveRoom")

        return isForActiveRoom
    }

    private fun handleNotificationIntent(intent: Intent?) {
        if (intent == null) return

        val source = intent.getStringExtra("source")
        val notificationId = intent.getStringExtra("notification_id")
        val timestamp = intent.getLongExtra("timestamp", 0)

        Log.d(TAG, "Handling intent - Source: $source, NotificationID: $notificationId")

        // Safely handle nullable extras
        val extras = intent.extras
        Log.d(TAG, "Intent extras: ${extras?.keySet()?.joinToString(", ")}")

        // Check if this intent came from a FCM notification
        val hasNotificationData = source == "fcm_notification" ||
                                 intent.hasExtra("chatRoomId") ||
                                 intent.hasExtra("type") ||
                                 intent.hasExtra("screen") ||
                                 intent.hasExtra("navigation_target")

        if (hasNotificationData) {
            Log.d(TAG, "FCM notification intent detected")

            // Add flag for active room notification
            if (intent.getStringExtra("type") == "chat_message") {
                val isForActiveRoom = isNotificationForActiveRoom(intent)
                Log.d(TAG, "Chat message notification - Is for active room: $isForActiveRoom")

                // Add this information to the intent for React Native
                intent.putExtra("isForActiveRoom", isForActiveRoom)
            }

            // Create notificationData map
            val notificationData = Arguments.createMap()

            // Safely handle extras
            extras?.let { bundle ->
                for (key in bundle.keySet()) {
                    val value = bundle.get(key)
                    when (value) {
                        is String -> notificationData.putString(key, value)
                        is Int -> notificationData.putInt(key, value)
                        is Boolean -> notificationData.putBoolean(key, value)
                        is Long -> notificationData.putDouble(key, value.toDouble())
                        is Float -> notificationData.putDouble(key, value.toDouble())
                        else -> notificationData.putString(key, value.toString())
                    }
                }
            }

            // Handle notification navigation
            try {
                val reactInstanceManager = reactNativeHost.reactInstanceManager
                val reactContext = reactInstanceManager.currentReactContext

                if (reactContext != null) {
                    try {
                        // Try to use NotificationNavigationModule first
                        val notificationModule = reactContext.getNativeModule(NotificationNavigationModule::class.java)
                        if (notificationModule != null) {
                            notificationModule.handleNotificationOpen(intent)
                            Log.d(TAG, "Intent passed to NotificationNavigationModule successfully")
                        } else {
                            // Fallback to DeviceEventManagerModule
                            val eventEmitter = reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            eventEmitter.emit("NotificationClicked", notificationData)
                            Log.d(TAG, "Intent passed to DeviceEventManagerModule successfully")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error accessing modules: ${e.message}", e)
                        storeIntentForLater(intent)
                    }
                } else {
                    Log.d(TAG, "React context not ready, storing intent data for later processing")
                    storeIntentForLater(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Critical error in notification handling: ${e.message}", e)
                try {
                    storeIntentForLater(intent)
                } catch (storeError: Exception) {
                    Log.e(TAG, "Failed to store intent data: ${storeError.message}", storeError)
                }
            }
        } else {
            Log.d(TAG, "Intent is not from FCM notification, skipping navigation handling")
        }
    }

    private fun storeIntentForLater(intent: Intent) {
        try {
            val sharedPreferences = getSharedPreferences("ReactNativeSharedPreferences", MODE_PRIVATE)
            val editor = sharedPreferences.edit()

            intent.getStringExtra("chatRoomId")?.let {
                editor.putString("pending_chatRoomId", it)
            }
            intent.getStringExtra("userId")?.let {
                editor.putString("pending_userId", it)
            }
            intent.getStringExtra("type")?.let {
                editor.putString("pending_type", it)
            }
            intent.getStringExtra("screen")?.let {
                editor.putString("pending_screen", it)
            }
            intent.getBooleanExtra("isForActiveRoom", false).let {
                editor.putBoolean("pending_isForActiveRoom", it)
            }

            editor.putLong("pending_navigation_timestamp", System.currentTimeMillis())
            editor.apply()

            Log.d(TAG, "Stored notification intent data in SharedPreferences")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to store intent data: ${e.message}")
        }
    }

    override fun invokeDefaultOnBackPressed() {
        super.onBackPressed()
    }

    /**
     * Called when user is leaving the activity (e.g., pressing Home button)
     * UPDATED: Only enter PIP on incoming calls, NOT for general background scenarios
     * like payment SDK, sharing, or other activities
     */
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        
        Log.d(TAG, "📺 [MainActivity] onUserLeaveHint - User leaving activity")
        Log.d(TAG, "📺 [MainActivity] shouldAutoEnterPIP flag: $shouldAutoEnterPIP")
        Log.d(TAG, "📺 [MainActivity] isIncomingCallActive flag: $isIncomingCallActive")
        
        // CRITICAL: Only auto-enter PIP if:
        // 1. React Native has enabled PIP for this screen (shouldAutoEnterPIP)
        // 2. AND there's an incoming call (isIncomingCallActive)
        // This prevents PIP from activating when opening payment SDKs, sharing, etc.
        if (!shouldAutoEnterPIP) {
            Log.d(TAG, "📺 [MainActivity] Auto-PIP disabled, not on LiveScreen")
            return
        }
        
        if (!isIncomingCallActive) {
            Log.d(TAG, "📺 [MainActivity] No incoming call detected, skipping auto-PIP")
            return
        }
        
        // Check if we should auto-enter PIP (only on incoming calls)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                Log.d(TAG, "📺 [MainActivity] Incoming call detected, entering PIP mode")
                
                // Enter PIP mode without actions (mute button removed)
                val builder = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(16, 9))
                
                // Only set actions if there are any (to avoid IndexOutOfBoundsException in ExoPlayer)
                val actions = getPIPActions()
                if (actions.isNotEmpty()) {
                    builder.setActions(actions)
                }
                
                val params = builder.build()
                val success = enterPictureInPictureMode(params)
                
                if (success && actions.isNotEmpty()) {
                    // Only register broadcast receiver if we have actions
                    registerReceiver(pipMuteReceiver, IntentFilter(ACTION_TOGGLE_MUTE))
                }
                
                Log.d(TAG, "📺 [MainActivity] Auto-entered PIP from onUserLeaveHint (incoming call): $success")
            } catch (e: Exception) {
                Log.e(TAG, "📺 [MainActivity] Error in onUserLeaveHint PIP: ${e.message}", e)
            }
        }
    }

    /**
     * Handle Picture-in-Picture mode changes
     * This is called when entering or exiting PIP mode
     */
    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        
        Log.d(TAG, "📺 [MainActivity] ========================================")
        Log.d(TAG, "📺 [MainActivity] PIP MODE CHANGED!")
        Log.d(TAG, "📺 [MainActivity] Is in PIP: $isInPictureInPictureMode")
        Log.d(TAG, "📺 [MainActivity] ========================================")
        
        // Send event to React Native immediately
        sendPIPStatusToReactNative(isInPictureInPictureMode)
    }
    
    /**
     * Send PIP status to React Native with retry logic
     */
    private fun sendPIPStatusToReactNative(isInPictureInPictureMode: Boolean) {
        try {
            val reactInstanceManager = reactNativeHost.reactInstanceManager
            val reactContext = reactInstanceManager.currentReactContext
            
            Log.d(TAG, "📺 [MainActivity] Attempting to send PIP status to RN")
            Log.d(TAG, "📺 [MainActivity] React context available: ${reactContext != null}")
            
            if (reactContext != null) {
                val params = Arguments.createMap()
                params.putBoolean("isActive", isInPictureInPictureMode)
                
                Log.d(TAG, "📺 [MainActivity] Emitting event with isActive: $isInPictureInPictureMode")
                
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("onPictureInPictureStatusChanged", params)
                
                Log.d(TAG, "📺 [MainActivity] ✅ PIP status event SENT successfully")
            } else {
                Log.e(TAG, "📺 [MainActivity] ❌ React context is NULL, retrying...")
                
                // Retry after a short delay
                android.os.Handler(mainLooper).postDelayed({
                    val retryContext = reactNativeHost.reactInstanceManager.currentReactContext
                    if (retryContext != null) {
                        val params = Arguments.createMap()
                        params.putBoolean("isActive", isInPictureInPictureMode)
                        retryContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            ?.emit("onPictureInPictureStatusChanged", params)
                        Log.d(TAG, "📺 [MainActivity] ✅ PIP status sent on retry")
                    } else {
                        Log.e(TAG, "📺 [MainActivity] ❌ React context still NULL on retry")
                    }
                }, 100)
            }
        } catch (e: Exception) {
            Log.e(TAG, "📺 [MainActivity] ❌ Error sending PIP status: ${e.message}", e)
        }
    }

    /**
     * Update PIP params if needed (optional - for advanced control)
     */
    fun updatePictureInPictureParams(aspectRatio: Rational? = null) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val builder = PictureInPictureParams.Builder()
                if (aspectRatio != null) {
                    builder.setAspectRatio(aspectRatio)
                } else {
                    // Default 16:9 for video
                    builder.setAspectRatio(Rational(16, 9))
                }
                
                setPictureInPictureParams(builder.build())
                Log.d(TAG, "Updated PIP params")
            } catch (e: Exception) {
                Log.e(TAG, "Error updating PIP params: ${e.message}")
            }
        }
    }
}
