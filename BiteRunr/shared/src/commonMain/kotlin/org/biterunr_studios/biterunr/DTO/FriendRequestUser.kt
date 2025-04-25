package org.biterunr_studios.biterunr.DTO

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import org.biterunr_studios.biterunr.Models.UserProfile

@Serializable
data class FriendRequestUser(
    @SerialName("id")
    val id: String,

    @SerialName("first_name")
    val firstName: String,

    @SerialName("last_name")
    val lastName: String,

    @SerialName("email")
    val email: String,

    @SerialName("clerk_id")
    val clerkId: String,

    @SerialName("image_url")
    val imageUrl: String? = null,

    @SerialName("sender_id")
    val senderId: String,

    @SerialName("receiver_id")
    val receiverId: String
) {
    fun toUser(): UserProfile = UserProfile(
        id = id,
        firstName = firstName,
        lastName = lastName,
        createdAt = kotlinx.datetime.Clock.System.now(),
        updatedAt = kotlinx.datetime.Clock.System.now(),
        createdOrders = null,
        orderUsers = null,
        orderItems = null,
        friends = null,
        sentFriendRequests = null,
        receivedFriendRequests = null
    )
}
