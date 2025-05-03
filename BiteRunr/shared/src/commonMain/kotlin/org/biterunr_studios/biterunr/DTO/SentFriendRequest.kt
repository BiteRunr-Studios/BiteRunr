package org.biterunr_studios.biterunr.DTO

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SentFriendRequest(
    @SerialName("id")
    val id: String,

    @SerialName("created_at")
    val createdAt: String,

    @SerialName("updated_at")
    val updatedAt: String,

    @SerialName("sender_id")
    val senderId: String,

    @SerialName("receiver_id")
    val receiverId: String,

    @SerialName("status")
    val status: String,

    @SerialName("receiver")
    val receiver: FriendRequestReceiver
)