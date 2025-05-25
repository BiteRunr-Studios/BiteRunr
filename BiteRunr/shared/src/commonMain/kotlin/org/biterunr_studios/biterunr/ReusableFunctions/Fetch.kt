package org.biterunr_studios.biterunr.ReusableFunctions

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.utils.io.charsets.Charsets
import io.ktor.utils.io.core.*
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
    body: Req? = null,
    contentType: ContentType = ContentType.Application.Json,
): FetchResponse<Res> {
    val response: HttpResponse = httpClient.request(url) {
        this.method = method
        if (body != null && method != HttpMethod.Get) {
            this.contentType(contentType)
            setBody(body)
        }
    }

    return handleResponse<Res>(response)
}

suspend inline fun <reified Res : Any> fetchMultipart(
    url: String,
    method: HttpMethod = HttpMethod.Post,
    fileData: ByteArray,
    fileName: String = "file.jpg",
    fileFieldName: String = "file",
    fileContentType: String = "image/jpeg",
    additionalFields: Map<String, String> = emptyMap()
): FetchResponse<Res> {
    // Generate a boundary
    val boundary = "----WebKitFormBoundary" + buildString {
        repeat(16) {
            append("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".random())
        }
    }

    // Build the multipart body manually
    val bodyBuilder = StringBuilder()

    // Add text fields
    for ((key, value) in additionalFields) {
        bodyBuilder.append("--$boundary\r\n")
        bodyBuilder.append("Content-Disposition: form-data; name=\"$key\"\r\n\r\n")
        bodyBuilder.append("$value\r\n")
    }

    // Add file header
    bodyBuilder.append("--$boundary\r\n")
    bodyBuilder.append("Content-Disposition: form-data; name=\"$fileFieldName\"; filename=\"$fileName\"\r\n")
    bodyBuilder.append("Content-Type: $fileContentType\r\n\r\n")

    // Convert the header part to bytes
    val headerBytes = bodyBuilder.toString().toByteArray(Charsets.UTF_8)

    // Create the footer
    val footerString = "\r\n--$boundary--\r\n"
    val footerBytes = footerString.toByteArray(Charsets.UTF_8)

    // Combine all parts into a single byte array
    val fullBodyBytes = ByteArray(headerBytes.size + fileData.size + footerBytes.size)
    headerBytes.copyInto(fullBodyBytes, 0)
    fileData.copyInto(fullBodyBytes, headerBytes.size)
    footerBytes.copyInto(fullBodyBytes, headerBytes.size + fileData.size)

    val response: HttpResponse = httpClient.request(url) {
        this.method = method
        headers {
            append(HttpHeaders.ContentType, "multipart/form-data; boundary=$boundary")
        }
        setBody(fullBodyBytes)
    }

    return handleResponse<Res>(response)
}

// Extract common response handling logic
suspend inline fun <reified Res : Any> handleResponse(response: HttpResponse): FetchResponse<Res> {
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
            FetchResponse(
                success = false,
                data = null,
                error = fetchResponse.error
            )
        } catch (e: Exception) {
            println("Error parsing response: ${e.message}, Body: $errorBody")

            // Try to extract any meaningful error message from the response body
            val errorMessage = if (errorBody.isNotEmpty()) {
                "Server error: $errorBody"
            } else {
                "Unknown error: ${e.message}"
            }

            FetchResponse(
                success = false,
                data = null,
                error = ErrorDetails(
                    issues = listOf(
                        Issue(
                            code = "unknown",
                            path = emptyList(),
                            message = errorMessage
                        )
                    ),
                    name = "UnknownError"
                )
            )
        }
    }
}