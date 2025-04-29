package org.biterunr_studios.biterunr.Auth

import com.russhwolf.settings.NSUserDefaultsSettings
import platform.Foundation.NSUserDefaults
import kotlinx.coroutines.*
import org.biterunr_studios.biterunr.Storage.SettingsTokenStorage

public class SupabaseTokenHelper {
    private val settings = NSUserDefaultsSettings(NSUserDefaults(suiteName = "supabase_settings"))
    private val tokenStorage = SettingsTokenStorage(settings)
    private val tokenManager = SupabaseTokenManager(tokenStorage)
    private val coroutineScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    fun isUserLoggedIn(): Boolean = tokenManager.isLoggedIn("supabase_access_token")

    fun getUserToken(tokenKey: String): String? = tokenManager.getAccessToken("supabase_access_token")

    fun saveUserToken(tokenKey: String, token: String) {
        try {
            tokenManager.saveAccessToken(tokenKey, token)
        } catch (e: Exception) {
            println("Error saving token: ${e.message}")
        }
    }

    fun clearUserToken() {
        try {
            tokenManager.clearAccessToken("supabase_access_token")
            tokenManager.clearAccessToken("supabase_user_id")
            coroutineScope.coroutineContext.cancelChildren()
        } catch (e: Exception) {
            println("Error clearing token: ${e.message}")
        }
    }

    companion object {
        fun create(): SupabaseTokenHelper = SupabaseTokenHelper()
    }
}