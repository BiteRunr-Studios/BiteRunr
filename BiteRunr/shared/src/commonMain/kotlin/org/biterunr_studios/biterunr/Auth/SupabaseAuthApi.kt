package org.biterunr_studios.biterunr.Auth

import kotlinx.serialization.Serializable
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.user.UserSession
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

val supabase = createSupabaseClient(
    supabaseUrl = "https://gpsyyguiopnrnztzwboq.supabase.co/",
    supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwc3l5Z3Vpb3Bucm56dHp3Ym9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUyMjgsImV4cCI6MjA1OTcxMTIyOH0.ZbukR17lKPXnTW8guz8DCb9Q4a8Id30iYxBawqkoVYA"
) {
    install(Auth) {
        host = "auth-callback"
        scheme = "biterunr"
    }
}

class SupabaseAuthApi() {
    suspend fun signIn(email: String, password: String): UserSession {
        try {
            supabase.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            val userSession = supabase.auth.currentSessionOrNull()
                ?: throw Exception("Invalid credentials or user not found")
            return userSession
        } catch (e: Exception) {
            if (e.message?.contains("invalid_credentials", ignoreCase = true) == true) {
                throw Exception("Invalid credentials or user not found")
            }
            throw e
        }
    }

    fun signIn(
        email: String,
        password: String,
        onResult: (UserSession) -> Unit,
        onError: (Throwable) -> Unit
    ) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val user = signIn(email, password)
                onResult(user)
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    fun signOut(
        onResult: () -> Unit,
        onError: (Throwable) -> Unit
    ) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                supabase.auth.signOut()
                onResult()
            } catch (e: Exception) {
                onError(e)
            }
        }
    }
}

expect fun handleDeeplink(data: Any)

@Serializable
data class SignInRequest(val email: String, val password: String)