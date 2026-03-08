package com.flykup;

import android.content.Context;
import android.media.AudioManager;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class AudioSessionModule extends ReactContextBaseJavaModule {
    private static final String TAG = "AudioSessionModule";
    private AudioManager audioManager;
    private AudioManager.OnAudioFocusChangeListener audioFocusChangeListener;

    public AudioSessionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        audioManager = (AudioManager) reactContext.getSystemService(Context.AUDIO_SERVICE);
        
        // Audio focus change listener
        audioFocusChangeListener = new AudioManager.OnAudioFocusChangeListener() {
            @Override
            public void onAudioFocusChange(int focusChange) {
                switch (focusChange) {
                    case AudioManager.AUDIOFOCUS_GAIN:
                        Log.d(TAG, "Audio focus gained");
                        break;
                    case AudioManager.AUDIOFOCUS_LOSS:
                        Log.d(TAG, "Audio focus lost");
                        break;
                    case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                        Log.d(TAG, "Audio focus lost transient");
                        break;
                    case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                        Log.d(TAG, "Audio focus lost transient - can duck");
                        break;
                }
            }
        };
    }

    @Override
    public String getName() {
        return "AudioSessionManager";
    }

    @ReactMethod
    public void setCategory(String category, String options, Promise promise) {
        try {
            if (audioManager == null) {
                promise.reject("AUDIO_MANAGER_ERROR", "AudioManager not available");
                return;
            }

            int focusType;
            if ("duckOthers".equals(options)) {
                // Request audio focus with ducking - allows call audio to take priority
                focusType = AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK;
            } else {
                // Request audio focus normally
                focusType = AudioManager.AUDIOFOCUS_GAIN;
            }

            int result = audioManager.requestAudioFocus(
                audioFocusChangeListener,
                AudioManager.STREAM_MUSIC,
                focusType
            );

            if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                // Set volume to ensure playback is audible
                int currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                audioManager.setStreamVolume(
                    AudioManager.STREAM_MUSIC,
                    currentVolume,
                    0
                );
                
                Log.d(TAG, "Audio session configured: category=" + category + ", options=" + options);
                promise.resolve(true);
            } else {
                Log.e(TAG, "Failed to gain audio focus");
                promise.reject("AUDIO_FOCUS_ERROR", "Failed to gain audio focus");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error setting audio category: " + e.getMessage());
            promise.reject("AUDIO_SESSION_ERROR", e.getMessage(), e);
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (audioManager != null && audioFocusChangeListener != null) {
            audioManager.abandonAudioFocus(audioFocusChangeListener);
        }
    }
}
