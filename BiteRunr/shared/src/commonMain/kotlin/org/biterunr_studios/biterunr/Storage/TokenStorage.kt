package org.biterunr_studios.biterunr.Storage

interface TokenStorage {
    fun saveToken(tokenKey: String, token: String)
    fun getToken(tokenKey: String): String?
    fun clearToken(tokenKey: String)
    fun hasToken(tokenKey: String): Boolean
}