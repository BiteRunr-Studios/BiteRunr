package org.biterunr_studios.biterunr.Auth

import org.biterunr_studios.biterunr.Storage.TokenStorage

class SupabaseTokenManager(private val tokenStorage: TokenStorage) {
    fun saveAccessToken(token: String) {
        tokenStorage.saveToken(token)
    }

    fun getAccessToken(): String? {
        return tokenStorage.getToken()
    }

    fun clearAccessToken() {
        tokenStorage.clearToken()
    }

    fun isLoggedIn(): Boolean {
        return tokenStorage.hasToken()
    }
}