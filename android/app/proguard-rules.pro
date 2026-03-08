# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ===== CRITICAL: Keep all attributes =====
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes SourceFile
-keepattributes LineNumberTable

# ===== React Native Core =====
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.modules.core.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.views.** { *; }
-keep class com.facebook.react.devsupport.** { *; }

# React Native New Architecture
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.proguard.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

# Keep all native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep ViewManagers
-keep public class * extends com.facebook.react.uimanager.ViewManager { *; }
-keep public class * extends com.facebook.react.uimanager.BaseViewManager { *; }

# ===== React Native Screens =====
-keep class com.swmansion.rnscreens.** { *; }
-keep class androidx.fragment.app.Fragment { *; }

# ===== Custom Native Modules =====
-keep class com.flykup.app.VersionModule { *; }
-keep class com.flykup.app.PlayStoreUpdateHelper { *; }
-keep class com.flykup.app.NotificationNavigationModule { *; }
-keep class com.flykup.app.MyAppPackage { *; }

# ===== Firebase =====
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Keep FirebaseMessagingService
-keep class * extends com.google.firebase.messaging.FirebaseMessagingService {
    <init>(...);
}

# ===== Play Core (In-App Updates) =====
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.core.**

# ===== Razorpay Payment =====
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !method/inlining/
-keepclasseswithmembers class * {
  public void onPayment*(...);
}

# ===== React Native SVG =====
-keep public class com.horcrux.svg.** { *; }

# ===== React Native Video =====
-keep class com.brentvatne.react.** { *; }

# ===== Amazon IVS Broadcast SDK =====
-keep class com.amazonaws.ivs.** { *; }
-keep class com.amazonaws.kinesisvideo.** { *; }
-dontwarn com.amazonaws.**

# ===== OkHttp =====
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# ===== WebSocket =====
-keep class com.facebook.react.modules.websocket.** { *; }
-keepclassmembers class * extends com.facebook.react.bridge.JavaScriptModule {
    <methods>;
}
-dontwarn javax.annotation.**

# ===== Cronet (Required by Amazon IVS) =====
-keep class org.chromium.** { *; }
-dontwarn org.chromium.**

# ===== Kotlin =====
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings {
    <fields>;
}

# ===== AndroidX =====
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# ===== JSI/TurboModules =====
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.jsi.** { *; }

# ===== General Android =====
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# Keep all classes that are accessed via reflection
-keep class * extends java.lang.annotation.Annotation { *; }

# Keep serialization classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ===== Prevent Obfuscation of Critical Classes =====
-dontobfuscate
