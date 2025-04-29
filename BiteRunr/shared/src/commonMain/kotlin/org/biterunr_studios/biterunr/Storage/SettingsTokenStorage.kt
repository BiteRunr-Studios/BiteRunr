package org.biterunr_studios.biterunr.Storage

import com.russhwolf.settings.Settings

class SettingsTokenStorage(private val settings: Settings) : TokenStorage {
    override fun saveToken(tokenKey: String, token: String) {
        settings.putString(tokenKey, token)
    }

    override fun getToken(tokenKey: String): String? {
        return if (settings.hasKey(tokenKey)) settings.getString(tokenKey, "") else null
    }

    override fun clearToken(tokenKey: String) {
        settings.remove(tokenKey)
    }

    override fun hasToken(tokenKey: String): Boolean {
        return settings.hasKey(tokenKey) && settings.getString(tokenKey, "").isNotEmpty()
    }
}