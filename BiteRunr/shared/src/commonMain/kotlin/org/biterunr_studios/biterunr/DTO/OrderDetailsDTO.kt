package org.biterunr_studios.biterunr.DTO

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OrderDetailsResponse(
    @SerialName("order")
    val order: OrderData,
    @SerialName("order_users")
    val orderUsers: List<OrderUserData>,
    @SerialName("items_count")
    val itemsCount: Int,
    @SerialName("people_count")
    val peopleCount: Int
)

@Serializable
data class OrderData(
    @SerialName("id")
    val id: String,
    @SerialName("name")
    val name: String,
    @SerialName("creator_id")
    val creatorId: String,
    @SerialName("comments")
    val comments: String?,
    @SerialName("status")
    val status: String,
    @SerialName("paused")
    val paused: Boolean,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("updated_at")
    val updatedAt: String
)

@Serializable
data class OrderUserData(
    @SerialName("id")
    val id: String,
    @SerialName("user_id")
    val userId: String,
    @SerialName("order_id")
    val orderId: String,
    @SerialName("status")
    val status: String,
    @SerialName("amount_owed")
    val amountOwed: String,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("updated_at")
    val updatedAt: String,
    @SerialName("user")
    val user: UserData
)

@Serializable
data class UserData(
    @SerialName("first_name")
    val firstName: String,
    @SerialName("last_name")
    val lastName: String,
    @SerialName("avatar_url")
    val avatarUrl: String?,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("updated_at")
    val updatedAt: String
)
