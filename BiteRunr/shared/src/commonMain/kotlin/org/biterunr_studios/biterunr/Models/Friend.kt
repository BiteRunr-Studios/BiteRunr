package org.biterunr_studios.biterunr.Models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

@Serializable
data class Friend(
    @SerialName("id")
    val id: String,

    @SerialName("user_id")
    val userId: String,

    @SerialName("friend_id")
    val friendId: String,

    @SerialName("created_at")
    val createdAt: Instant,

    @SerialName("updated_at")
    val updatedAt: Instant,

    @SerialName("user")
    val user: UserProfile? = null,

    @SerialName("friend")
    val friend: UserProfile? = null
)
