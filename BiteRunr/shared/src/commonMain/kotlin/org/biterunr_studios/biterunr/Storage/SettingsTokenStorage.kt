package org.biterunr_studios.biterunr.Storage

import com.russhwolf.settings.Settings

class SettingsTokenStorage(private val settings: Settings) : TokenStorage {
    private val tokenKey = "supabase_access_token"

    override fun saveToken(token: String) {
        settings.putString(tokenKey, token)
    }

    override fun getToken(): String? {
        return if (settings.hasKey(tokenKey)) settings.getString(tokenKey, "") else null
    }

    override fun clearToken() {
        settings.remove(tokenKey)
    }

    override fun hasToken(): Boolean {
        return settings.hasKey(tokenKey) && settings.getString(tokenKey, "").isNotEmpty()
    }
}