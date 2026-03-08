package com.flykup.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.flykup.AudioSessionModule
import java.util.Collections

class MyAppPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        val modules = ArrayList<NativeModule>()
        modules.add(ChatModule(reactContext))
        modules.add(VersionModule(reactContext))
        modules.add(PlayStoreUpdateHelper(reactContext))
        modules.add(NotificationNavigationModule(reactContext))
        modules.add(AudioSessionModule(reactContext))
        modules.add(PaymentStateModule(reactContext))
        return modules
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return Collections.emptyList()
    }
}
