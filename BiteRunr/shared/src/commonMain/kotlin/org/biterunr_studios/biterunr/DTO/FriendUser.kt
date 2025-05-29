package org.biterunr_studios.biterunr.DTO

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import org.biterunr_studios.biterunr.Models.Profile
import org.biterunr_studios.biterunr.Models.UserProfile

@Serializable
data class FriendUser(
    @SerialName("id")
    val id: String,

    @SerialName("first_name")
    val firstName: String,

    @SerialName("last_name")
    val lastName: String,

    @SerialName("email")
    val email: String? = null,

    @SerialName("avatar_url")
    val avatarUrl: String? = null,

    @SerialName("created_at")
    val createdAt: Instant,

    @SerialName("updated_at")
    val updatedAt: Instant

) {
    fun toUser(): UserProfile = UserProfile(
        id = id,
        email = email ?: "",
        profile = Profile(
            firstName = firstName,
            lastName = lastName,
            avatarUrl = avatarUrl,
            createdAt = kotlinx.datetime.Clock.System.now(),
            updatedAt = kotlinx.datetime.Clock.System.now()
        )
    )
}
