package com.flykup.app.ivs

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothHeadset
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.os.Build
import android.util.Log

class BluetoothAudioManager(private val context: Context) {
    
    private val TAG = "BluetoothAudioManager"
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothHeadset: BluetoothHeadset? = null
    private var isBluetoothScoOn = false
    private var isReceiverRegistered = false
    private var isProfileConnected = false
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())
    
    private val bluetoothReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED -> {
                    val state = intent.getIntExtra(BluetoothHeadset.EXTRA_STATE, -1)
                    when (state) {
                        BluetoothHeadset.STATE_CONNECTED -> {
                            Log.d(TAG, "🎧 Bluetooth headset connected")
                            enableBluetoothSco()
                        }
                        BluetoothHeadset.STATE_DISCONNECTED -> {
                            Log.d(TAG, "🎧 Bluetooth headset disconnected")
                            disableBluetoothSco()
                        }
                    }
                }
                BluetoothHeadset.ACTION_AUDIO_STATE_CHANGED -> {
                    val state = intent.getIntExtra(BluetoothHeadset.EXTRA_STATE, -1)
                    when (state) {
                        BluetoothHeadset.STATE_AUDIO_CONNECTED -> {
                            Log.d(TAG, "🎧 Bluetooth audio connected")
                        }
                        BluetoothHeadset.STATE_AUDIO_DISCONNECTED -> {
                            Log.d(TAG, "🎧 Bluetooth audio disconnected")
                        }
                    }
                }
                AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED -> {
                    val state = intent.getIntExtra(AudioManager.EXTRA_SCO_AUDIO_STATE, -1)
                    when (state) {
                        AudioManager.SCO_AUDIO_STATE_CONNECTED -> {
                            Log.d(TAG, "✅ SCO audio connected")
                            isBluetoothScoOn = true
                        }
                        AudioManager.SCO_AUDIO_STATE_DISCONNECTED -> {
                            Log.d(TAG, "❌ SCO audio disconnected")
                            isBluetoothScoOn = false
                        }
                        AudioManager.SCO_AUDIO_STATE_CONNECTING -> {
                            Log.d(TAG, "🔄 SCO audio connecting...")
                        }
                    }
                }
            }
        }
    }
    
    init {
        try {
            bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
            
            if (bluetoothAdapter != null) {
                // Register Bluetooth profile listener
                bluetoothAdapter?.getProfileProxy(context, object : BluetoothProfile.ServiceListener {
                    override fun onServiceConnected(profile: Int, proxy: BluetoothProfile?) {
                        if (profile == BluetoothProfile.HEADSET) {
                            bluetoothHeadset = proxy as BluetoothHeadset
                            isProfileConnected = true
                            Log.d(TAG, "✅ Bluetooth headset profile connected")
                            
                            // Automatically setup audio routing when profile connects
                            handler.postDelayed({
                                setupAudioRouting()
                            }, 500)
                        }
                    }
                    
                    override fun onServiceDisconnected(profile: Int) {
                        if (profile == BluetoothProfile.HEADSET) {
                            bluetoothHeadset = null
                            isProfileConnected = false
                            Log.d(TAG, "❌ Bluetooth headset profile disconnected")
                        }
                    }
                }, BluetoothProfile.HEADSET)
                
                // Register broadcast receivers
                val filter = IntentFilter().apply {
                    addAction(BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED)
                    addAction(BluetoothHeadset.ACTION_AUDIO_STATE_CHANGED)
                    addAction(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)
                }
                context.registerReceiver(bluetoothReceiver, filter)
                isReceiverRegistered = true
                
                Log.d(TAG, "✅ BluetoothAudioManager initialized")
            } else {
                Log.w(TAG, "⚠️ Bluetooth adapter not available on this device")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Security exception - Bluetooth permission not granted: ${e.message}", e)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error initializing BluetoothAudioManager: ${e.message}", e)
        }
    }
    
    fun setupAudioRouting() {
        try {
            // Set audio mode for communication (VoIP/WebRTC style)
            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
            
            // Explicitly turn off speakerphone
            audioManager.isSpeakerphoneOn = false
            Log.d(TAG, "🔊 Speakerphone disabled")
            
            // Check if Bluetooth device is connected
            if (isBluetoothHeadsetConnected()) {
                Log.d(TAG, "🎧 Bluetooth headset detected, enabling SCO")
                enableBluetoothSco()
                
                // Add a delay to ensure SCO connection is established
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    if (!isBluetoothScoOn) {
                        Log.w(TAG, "⚠️ SCO not connected, retrying...")
                        enableBluetoothSco()
                    }
                }, 500)
            } else {
                Log.d(TAG, "🔊 No Bluetooth headset, using default audio routing")
            }
            
            Log.d(TAG, "✅ Audio routing configured")
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Security exception in setupAudioRouting: ${e.message}", e)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error setting up audio routing: ${e.message}", e)
        }
    }
    
    private fun isBluetoothHeadsetConnected(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // For Android 12+, need BLUETOOTH_CONNECT permission
                bluetoothHeadset?.connectedDevices?.isNotEmpty() == true
            } else {
                bluetoothHeadset?.connectedDevices?.isNotEmpty() == true
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "⚠️ Security exception - assuming Bluetooth connected if profile is available: ${e.message}")
            // If we have the profile connection but get security exception,
            // assume Bluetooth is connected (profile wouldn't connect otherwise)
            isProfileConnected && bluetoothHeadset != null
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error checking Bluetooth connection: ${e.message}")
            false
        }
    }
    
    private fun enableBluetoothSco() {
        try {
            if (!isBluetoothScoOn && audioManager.isBluetoothScoAvailableOffCall) {
                audioManager.isBluetoothScoOn = true
                audioManager.startBluetoothSco()
                Log.d(TAG, "✅ Bluetooth SCO enabled and started")
            } else if (isBluetoothScoOn) {
                Log.d(TAG, "ℹ️ Bluetooth SCO already enabled")
            } else {
                Log.w(TAG, "⚠️ Bluetooth SCO not available off call")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error enabling Bluetooth SCO: ${e.message}", e)
        }
    }
    
    private fun disableBluetoothSco() {
        try {
            if (isBluetoothScoOn) {
                audioManager.stopBluetoothSco()
                audioManager.isBluetoothScoOn = false
                Log.d(TAG, "✅ Bluetooth SCO disabled and stopped")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error disabling Bluetooth SCO: ${e.message}", e)
        }
    }
    
    fun cleanup() {
        try {
            disableBluetoothSco()
            
            if (isReceiverRegistered) {
                context.unregisterReceiver(bluetoothReceiver)
                isReceiverRegistered = false
            }
            
            bluetoothAdapter?.closeProfileProxy(BluetoothProfile.HEADSET, bluetoothHeadset)
            audioManager.mode = AudioManager.MODE_NORMAL
            
            Log.d(TAG, "✅ BluetoothAudioManager cleaned up")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error during cleanup: ${e.message}", e)
        }
    }
}
