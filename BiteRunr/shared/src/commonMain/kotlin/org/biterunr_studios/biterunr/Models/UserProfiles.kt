package org.biterunr_studios.biterunr.Models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

@Serializable
data class UserProfile(
    @SerialName("id")
    val id: String,

    @SerialName("first_name")
    val firstName: String,

    @SerialName("last_name")
    val lastName: String,

    @SerialName("created_at")
    val createdAt: Instant,

    @SerialName("updated_at")
    val updatedAt: Instant,

    @SerialName("created_orders")
    val createdOrders: List<Order>? = null,

    @SerialName("order_users")
    val orderUsers: List<OrderUser>? = null,

    @SerialName("order_items")
    val orderItems: List<OrderItem>? = null,

    @SerialName("friends")
    val friends: List<UserProfile>? = null,

    @SerialName("sent_friend_requests")
    val sentFriendRequests: List<FriendRequest>? = null,

    @SerialName("received_friend_requests")
    val receivedFriendRequests: List<FriendRequest>? = null
)
