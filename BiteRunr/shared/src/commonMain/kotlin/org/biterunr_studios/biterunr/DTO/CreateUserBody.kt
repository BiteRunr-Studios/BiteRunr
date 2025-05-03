package org.biterunr_studios.biterunr.DTO

import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CreateUserBody(
    @SerialName("email")
    val email: String,

    @SerialName("password")
    val password: String,

    @SerialName("profile")
    val profile: Profile
)

@Serializable
data class Profile(
    @SerialName("first_name")
    val firstName: String,

    @SerialName("last_name")
    val lastName: String,
)