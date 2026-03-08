package com.flykup.app;

import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Rational;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import androidx.annotation.NonNull;

public class PictureInPictureModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "PictureInPictureModule";
    private static final String EVENT_PIP_STATUS_CHANGED = "onPictureInPictureStatusChanged";

    public PictureInPictureModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void isPictureInPictureSupported(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Activity activity = getCurrentActivity();
                if (activity != null) {
                    PackageManager packageManager = activity.getPackageManager();
                    boolean isSupported = packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE);
                    promise.resolve(isSupported);
                } else {
                    promise.resolve(false);
                }
            } else {
                promise.resolve(false);
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to check PIP support: " + e.getMessage());
        }
    }

    @ReactMethod
    public void enterPictureInPictureMode(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Activity activity = getCurrentActivity();
                if (activity == null) {
                    promise.reject("ERROR", "Activity is null - app may be in background");
                    return;
                }

                // Check if PIP is supported
                PackageManager packageManager = activity.getPackageManager();
                if (!packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) {
                    promise.reject("ERROR", "PIP not supported on this device");
                    return;
                }

                // Check if already in PIP mode
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && activity.isInPictureInPictureMode()) {
                    promise.resolve(true);
                    return;
                }

                // Create PIP params with 1:1 aspect ratio (square, similar to Google Maps)
                PictureInPictureParams.Builder paramsBuilder = new PictureInPictureParams.Builder();
                paramsBuilder.setAspectRatio(new Rational(1, 1));
                
                // Enter PIP mode
                boolean success = activity.enterPictureInPictureMode(paramsBuilder.build());
                
                if (success) {
                    // Send event to JS
                    sendEvent(EVENT_PIP_STATUS_CHANGED, true);
                    promise.resolve(true);
                } else {
                    // Provide more helpful error message
                    promise.reject("ERROR", "Unable to enter PIP mode. This can happen if:\n" +
                            "1. The app is not in the foreground\n" +
                            "2. No video is currently playing\n" +
                            "3. Device settings prevent PIP\n" +
                            "Please ensure a video is playing and the app is active.");
                }
            } else {
                promise.reject("ERROR", "PIP mode requires Android 8.0 (API level 26) or higher");
            }
        } catch (IllegalStateException e) {
            promise.reject("ERROR", "Cannot enter PIP mode: " + e.getMessage() + 
                    "\nThis usually means the activity is not in a valid state for PIP.");
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to enter PIP mode: " + e.getMessage());
        }
    }

    @ReactMethod
    public void exitPictureInPictureMode(Promise promise) {
        try {
            // Note: There's no direct API to exit PIP mode programmatically
            // The user must exit PIP mode manually or the app can finish the activity
            // We'll just resolve the promise as PIP exit is usually user-controlled
            sendEvent(EVENT_PIP_STATUS_CHANGED, false);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to exit PIP mode: " + e.getMessage());
        }
    }

    @ReactMethod
    public void setAutoEnterPIP(boolean enabled) {
        MainActivity.shouldAutoEnterPIP = enabled;
        android.util.Log.d("PictureInPictureModule", "Auto-enter PIP set to: " + enabled);
    }

    /**
     * NEW: Set incoming call active flag
     * PIP mode will ONLY be triggered when both shouldAutoEnterPIP AND isIncomingCallActive are true
     * This prevents PIP from activating when opening payment SDKs, sharing, etc.
     */
    @ReactMethod
    public void setIncomingCallActive(boolean isActive) {
        MainActivity.isIncomingCallActive = isActive;
        android.util.Log.d("PictureInPictureModule", "📞 Incoming call active set to: " + isActive);
    }

    private void sendEvent(String eventName, boolean isActive) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, createEventData(isActive));
    }

    private com.facebook.react.bridge.WritableMap createEventData(boolean isActive) {
        com.facebook.react.bridge.WritableMap map = com.facebook.react.bridge.Arguments.createMap();
        map.putBoolean("isActive", isActive);
        return map;
    }
}
