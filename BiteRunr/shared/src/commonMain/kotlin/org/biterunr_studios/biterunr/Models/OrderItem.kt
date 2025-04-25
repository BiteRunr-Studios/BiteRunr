package org.biterunr_studios.biterunr.Models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

@Serializable
data class OrderItem(
    @SerialName("id")
    val id: String,

    @SerialName("order_location_id")
    val orderLocationId: String,

    @SerialName("user_id")
    val userId: String,

    @SerialName("name")
    val name: String,

    @SerialName("comments")
    val comments: String? = null,

    @SerialName("quantity")
    val quantity: Int,

    @SerialName("created_at")
    val createdAt: Instant,

    @SerialName("updated_at")
    val updatedAt: Instant,

    @SerialName("order_location")
    val orderLocation: OrderLocation? = null,

    @SerialName("user")
    val user: UserProfile? = null
)
