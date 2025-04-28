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

    fun isUserLoggedIn(): Boolean = tokenManager.isLoggedIn()

    fun getUserToken(): String? = tokenManager.getAccessToken()

    fun saveUserToken(token: String) {
        try {
            tokenManager.saveAccessToken(token)
        } catch (e: Exception) {
            println("Error saving token: ${e.message}")
        }
    }

    fun clearUserToken() {
        try {
            tokenManager.clearAccessToken()
            coroutineScope.coroutineContext.cancelChildren()
        } catch (e: Exception) {
            println("Error clearing token: ${e.message}")
        }
    }

    companion object {
        fun create(): SupabaseTokenHelper = SupabaseTokenHelper()
    }
}