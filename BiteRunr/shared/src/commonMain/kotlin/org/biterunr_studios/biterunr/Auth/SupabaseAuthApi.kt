package org.biterunr_studios.biterunr.Auth

import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.client.call.*
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonIgnoreUnknownKeys
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class SupabaseAuthApi(
    private val supabaseUrl: String,
    private val supabaseAnonKey: String
) {
    private val httpClient = HttpClient {
        install(HttpTimeout) {
            requestTimeoutMillis = 30000  // 30 seconds
            connectTimeoutMillis = 15000  // 15 seconds
        }
        
        install(io.ktor.client.plugins.HttpRequestRetry) {
            retryOnServerErrors(maxRetries = 3)
            retryOnException(maxRetries = 3, retryOnTimeout = true)
            exponentialDelay()
        }

        install(ContentNegotiation) {
            json(Json {
                prettyPrint = false
                isLenient = true
                ignoreUnknownKeys = true
            })
        }

        defaultRequest {
            contentType(ContentType.Application.Json)
            // Other headers
        }
    }

    suspend fun signIn(
        email: String,
        password: String
    ): SignInResult {
        try {
            val response: HttpResponse =
                httpClient.post("$supabaseUrl/auth/v1/token?grant_type=password") {
                    contentType(ContentType.Application.Json)
                    header("apikey", supabaseAnonKey)
                    setBody(mapOf("email" to email, "password" to password))
                }

            return if (response.status == HttpStatusCode.OK) {
                val authResponse = Json.decodeFromString<AuthResponse>(response.bodyAsText())
                SignInResult.Success(authResponse)
            } else {
                val errorBody = response.bodyAsText()
                val errorMessage = try {
                    val json = Json.parseToJsonElement(errorBody).jsonObject
                    json["error_description"]?.jsonPrimitive?.content
                        ?: json["msg"]?.jsonPrimitive?.content
                        ?: json["error"]?.jsonPrimitive?.content
                        ?: "Authentication failed"
                } catch (e: Exception) {
                    "Authentication failed: ${e.message}"
                }
                SignInResult.Error(errorMessage)
            }
        } catch (e: Exception) {
            return SignInResult.Error("Authentication failed: ${e.message}")
        }
    }
}

@Serializable
data class SignInRequest(val email: String, val password: String)

@Serializable
@JsonIgnoreUnknownKeys
data class AuthResponse(
    val access_token: String,
    val refresh_token: String,
    val token_type: String,
    val expires_in: Int,
    val user: User
)

@Serializable
@JsonIgnoreUnknownKeys
data class User(
    val id: String,
    val email: String
)

@JsonIgnoreUnknownKeys
sealed class SignInResult {
    data class Success(val response: AuthResponse) : SignInResult()
    data class Error(val message: String) : SignInResult()
}