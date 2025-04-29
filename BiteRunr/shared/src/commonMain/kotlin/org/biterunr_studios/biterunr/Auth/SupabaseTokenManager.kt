package org.biterunr_studios.biterunr.Auth

import org.biterunr_studios.biterunr.Storage.TokenStorage

class SupabaseTokenManager(private val tokenStorage: TokenStorage) {
    fun saveAccessToken(tokenKey: String, token: String) {
        tokenStorage.saveToken(tokenKey, token)
    }

    fun getAccessToken(tokenKey: String): String? {
        return tokenStorage.getToken(tokenKey)
    }

    fun clearAccessToken(tokenKey: String) {
        tokenStorage.clearToken(tokenKey)
    }

    fun isLoggedIn(tokenKey: String): Boolean {
        return tokenStorage.hasToken(tokenKey)
    }
}