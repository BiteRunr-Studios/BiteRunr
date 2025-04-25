package org.biterunr_studios.biterunr.Models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

@Serializable
enum class Status {
    @SerialName("created")
    CREATED,

    @SerialName("active")
    ACTIVE,

    @SerialName("cancelled")
    CANCELLED,

    @SerialName("completed")
    COMPLETED
}

@Serializable
data class Order(
    @SerialName("id")
    val id: String,

    @SerialName("name")
    val name: String,

    @SerialName("creator_id")
    val creatorId: String,

    @SerialName("comments")
    val comments: String? = null,

    @SerialName("status")
    val status: Status,

    @SerialName("paused")
    val paused: Boolean,

    @SerialName("created_at")
    val createdAt: Instant,

    @SerialName("updated_at")
    val updatedAt: Instant,

    @SerialName("order_users")
    val orderUsers: List<OrderUser>? = null,

    @SerialName("order_locations")
    val orderLocations: List<OrderLocation>? = null,

    @SerialName("creator")
    val creator: UserProfile? = null
)
