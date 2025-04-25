package org.biterunr_studios.biterunr.Models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerializationException
import kotlinx.serialization.descriptors.*
import kotlinx.serialization.encoding.*
import kotlinx.serialization.json.*

import kotlinx.serialization.json.Json

suspend fun parseErrorResponse(json: String): ErrorResponse {
    return Json.decodeFromString(json)
}

@Serializable
data class ErrorResponse(
    @SerialName("success")
    val success: Boolean,

    @SerialName("error")
    val error: ErrorDetails
) : Throwable()

@Serializable
data class ErrorDetails(
    @SerialName("issues")
    val issues: List<Issue>,

    @SerialName("name")
    val name: String
)

@Serializable
data class Issue(
    @SerialName("code")
    val code: String,

    @SerialName("path")
    val path: List<PathElement>,

    @SerialName("message")
    val message: String
)

@Serializable(with = PathElementSerializer::class)
sealed class PathElement {
    data class StringElement(val value: String) : PathElement()
    data class NumberElement(val value: Int) : PathElement()
}

object PathElementSerializer : KSerializer<PathElement> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("PathElement", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): PathElement {
        val input = decoder as? JsonDecoder ?: error("PathElement can only be deserialized from JSON")
        return when (val element = input.decodeJsonElement()) {
            is JsonPrimitive -> {
                when {
                    element.isString -> PathElement.StringElement(element.content)
                    element.intOrNull != null -> PathElement.NumberElement(element.int)
                    else -> throw SerializationException("Invalid PathElement: $element")
                }
            }
            else -> throw SerializationException("Expected JsonPrimitive but got: $element")
        }
    }


    override fun serialize(encoder: Encoder, value: PathElement) {
        val output = encoder as? JsonEncoder ?: error("PathElement can only be serialized to JSON")
        when (value) {
            is PathElement.StringElement -> output.encodeString(value.value)
            is PathElement.NumberElement -> output.encodeInt(value.value)
        }
    }
}
