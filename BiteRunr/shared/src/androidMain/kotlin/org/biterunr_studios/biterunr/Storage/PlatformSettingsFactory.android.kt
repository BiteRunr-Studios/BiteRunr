package org.biterunr_studios.biterunr.Storage

import android.content.Context
import com.russhwolf.settings.Settings
import com.russhwolf.settings.SharedPreferencesSettings

actual class PlatformSettingsFactory {
    private var applicationContext: Context? = null

    // Default constructor to match expect class
    actual constructor()

    // Secondary constructor for Android initialization
    constructor(context: Context) {
        applicationContext = context.applicationContext
    }

    actual fun createSettings(name: String): Settings {
        val context = applicationContext
            ?: throw IllegalStateException("Context must be initialized before creating settings")

        val sharedPrefs = context.getSharedPreferences(name, Context.MODE_PRIVATE)
        return SharedPreferencesSettings(sharedPrefs)
    }

    fun setContext(context: Context) {
        applicationContext = context.applicationContext
    }
}