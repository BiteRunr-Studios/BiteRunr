package org.biterunr_studios.biterunr.ReusableFunctions

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import org.biterunr_studios.biterunr.Models.ErrorDetails
import org.biterunr_studios.biterunr.Models.FetchResponse
import org.biterunr_studios.biterunr.Models.Issue

val httpClient = HttpClient {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
}

val json = Json { ignoreUnknownKeys = true }

suspend inline fun <reified Req : Any, reified Res : Any> fetch(
    url: String,
    method: HttpMethod = HttpMethod.Get,
    body: Req? = null
): FetchResponse<Res> {
        val response: HttpResponse = httpClient.request(url) {
            this.method = method
            if (body != null && method != HttpMethod.Get) {
                contentType(ContentType.Application.Json)
                setBody(body)
            }
        }

    return if (response.status.isSuccess()) {
        val resBody = response.body<Res>()
        FetchResponse(
            success = true,
            data = resBody,
            error = null
        )
    } else {
        val errorBody = response.bodyAsText()
        try {
            val fetchResponse = json.decodeFromString<FetchResponse<Unit>>(errorBody)
            return FetchResponse(
                success = false,
                data = null,
                error = fetchResponse.error
            )
        } catch (e: Exception) {
            return FetchResponse(
                success = false,
                data = null,
                error = ErrorDetails(
                    issues = listOf(
                        Issue(
                            code = "unknown",
                            path = emptyList(),
                            message = "Unknown error: ${e.message}"
                        )
                    ),
                    name = "UnknownError"
                )
            )
        }
    }
}
