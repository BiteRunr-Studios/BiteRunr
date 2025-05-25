package org.biterunr_studios.biterunr.Models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.datetime.Instant

@Serializable
data class UpdateUserProfileRequest(
    @SerialName("profile")
    val profile: UpdateProfile,
    @SerialName("access_token")
    val accessToken: String,
    @SerialName("refresh_token")
    val refreshToken: String
)

@Serializable
data class UpdateProfile(
    @SerialName("first_name")
    val firstName: String,
    @SerialName("last_name")
    val lastName: String
)


@Serializable
data class UserProfile(
    @SerialName("id")
    val id: String,

    @SerialName("email")
    val email: String,

    @SerialName("profile")
    val profile: Profile
)

@Serializable
data class Profile(
    @SerialName("first_name")
    val firstName: String,

    @SerialName("last_name")
    val lastName: String,

    @SerialName("created_at")
    val createdAt: Instant,

    @SerialName("updated_at")
    val updatedAt: Instant
)
