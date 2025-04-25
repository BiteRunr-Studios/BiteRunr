package org.biterunr_studios.biterunr.ReusableFunctions

import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.*
import kotlinx.serialization.json.*
import org.biterunr_studios.biterunr.Models.ErrorResponse

suspend inline fun <reified T : Any, reified U : Any?> fetch(
    client: HttpClient,
    url: String,
    method: HttpMethod = HttpMethod.Get,
    body: U? = null
): T {
    val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
        prettyPrint = false
        allowStructuredMapKeys = true
        useAlternativeNames = false
    }

    val response: HttpResponse = client.request(url) {
        this.method = method
        contentType(ContentType.Application.Json)

        if (body != null) {
            setBody(json.encodeToString(serializer(), body))
        }
    }

    val responseBody = response.bodyAsText()

    if (response.status.value !in 200..299) {
        try {
            val error = json.decodeFromString<ErrorResponse>(responseBody)
            throw Exception("Server error: ${error.error}")
        } catch (e: Exception) {
            throw Exception("HTTP error ${response.status.value}: ${responseBody}")
        }
    }

    return json.decodeFromString(responseBody)
}
