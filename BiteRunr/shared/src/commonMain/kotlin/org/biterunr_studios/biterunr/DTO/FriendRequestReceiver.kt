package org.biterunr_studios.biterunr.DTO

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class FriendRequestReceiver(
    @SerialName("id")
    val id: String,

    @SerialName("first_name")
    val firstName: String,

    @SerialName("last_name")
    val lastName: String
)
