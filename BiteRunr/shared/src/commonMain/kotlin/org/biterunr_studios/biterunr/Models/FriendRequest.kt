package org.biterunr_studios.biterunr.Models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

@Serializable
enum class RequestStatus {
    @SerialName("pending")
    PENDING,

    @SerialName("accepted")
    ACCEPTED,

    @SerialName("rejected")
    REJECTED
}


@Serializable
data class FriendRequest(
    @SerialName("id")
    val id: String,

    @SerialName("sender_id")
    val senderId: String,

    @SerialName("receiver_id")
    val receiverId: String,

    @SerialName("status")
    val status: RequestStatus,

    @SerialName("created_at")
    val createdAt: Instant,

    @SerialName("updated_at")
    val updatedAt: Instant,

    @SerialName("sender")
    val sender: UserProfile? = null,

    @SerialName("receiver")
    val receiver: UserProfile? = null
)
