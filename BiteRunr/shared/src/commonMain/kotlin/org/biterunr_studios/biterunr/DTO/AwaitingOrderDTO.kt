package org.biterunr_studios.biterunr.DTO

import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import org.biterunr_studios.biterunr.Models.Order
import org.biterunr_studios.biterunr.Models.Profile
import org.biterunr_studios.biterunr.Models.Status
import org.biterunr_studios.biterunr.Models.UserProfile

@Serializable
data class AwaitingOrdersDTO(
    @SerialName("count")
    val count: Int,

    @SerialName("order_users")
    val orderUsers: List<AwaitingOrderUserDTO>,

    @SerialName("order")
    val order: AwaitingOrderDTO
)

@Serializable
data class AwaitingOrderUserDTO(
    @SerialName("id")
    val Id: String,

    @SerialName("user_id")
    val userId: String,

    @SerialName("order_id")
    val orderId: String,

    @SerialName("status")
    val status: String,

    @SerialName("amount_owed")
    val amountOwed: Double,

    @SerialName("created_at")
    val createdAt: Instant,

    @SerialName("updated_at")
    val updatedAt: Instant,

    @SerialName("user")
    val user: Profile
)

@Serializable
data class AwaitingOrderDTO(
    @SerialName("id")
    val Id: String,

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
)

@Serializable
data class AwaitingOrderRequest(
    @SerialName("order_id")
    val orderId: String
)