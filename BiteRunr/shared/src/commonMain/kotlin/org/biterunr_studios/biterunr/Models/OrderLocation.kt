package org.biterunr_studios.biterunr.Models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

@Serializable
data class OrderLocation(
    @SerialName("id")
    val id: String,

    @SerialName("order_id")
    val orderId: String,

    @SerialName("location_id")
    val locationId: String,

    @SerialName("created_at")
    val createdAt: Instant,

    @SerialName("updated_at")
    val updatedAt: Instant,

    @SerialName("order")
    val order: Order? = null,

    @SerialName("location")
    val location: Location? = null,

    @SerialName("order_items")
    val orderItems: List<OrderItem>? = null
)
