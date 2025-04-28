package org.biterunr_studios.biterunr.Storage

import com.russhwolf.settings.NSUserDefaultsSettings
import com.russhwolf.settings.Settings
import platform.Foundation.NSUserDefaults

actual class PlatformSettingsFactory {
    actual fun createSettings(name: String): Settings {
        val userDefaults = NSUserDefaults(suiteName = name)
        return NSUserDefaultsSettings(userDefaults)
    }
}