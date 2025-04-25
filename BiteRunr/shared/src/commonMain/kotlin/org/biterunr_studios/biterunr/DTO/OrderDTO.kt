package org.biterunr_studios.biterunr.DTO

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant
import org.biterunr_studios.biterunr.Models.Status
import org.biterunr_studios.biterunr.Models.UserProfile

@Serializable
data class OrderDTO(
    @SerialName("id")
    val id: String,

    @SerialName("name")
    val name: String,

    @SerialName("creator_id")
    val creatorId: String? = null,

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
    val orderUsers: List<OrderUserDTO>? = null,

    @SerialName("order_locations")
    val orderLocations: List<OrderLocationDTO>? = null,

    @SerialName("creator")
    val creator: UserProfile? = null,

    @SerialName("clerk_id")
    val clerkId: String? = null
)
