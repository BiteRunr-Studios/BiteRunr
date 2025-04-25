package org.biterunr_studios.biterunr.ReusableFunctions

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import org.biterunr_studios.biterunr.Models.ErrorResponse

val httpClient = HttpClient {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
}

suspend inline fun <reified Req : Any, reified Res : Any> fetch(
    url: String,
    method: HttpMethod = HttpMethod.Get,
    body: Req? = null
): Result<Res> {
    return try {
        val response: HttpResponse = httpClient.request(url) {
            this.method = method
            if (body != null && method != HttpMethod.Get) {
                contentType(ContentType.Application.Json)
                setBody(body)
            }
        }
        if (response.status.isSuccess()) {
            Result.success(response.body())
        } else {
            val errorBody = response.bodyAsText()
            try {
                val errorResponse = Json.decodeFromString<ErrorResponse>(errorBody)
                Result.failure(errorResponse)
            } catch (e: Exception) {
                Result.failure(Exception("HTTP error: ${response.status}. Body: $errorBody", e))
            }
        }
    } catch (e: ErrorResponse) {
        Result.failure(e)
    } catch (e: Exception) {
        Result.failure(Exception("Fetch failed: ${e.message}", e))
    }
}
