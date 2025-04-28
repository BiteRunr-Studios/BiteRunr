package org.biterunr_studios.biterunr.Storage

import com.russhwolf.settings.Settings

expect class PlatformSettingsFactory() {
    fun createSettings(name: String): Settings
}