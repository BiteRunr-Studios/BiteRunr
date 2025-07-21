package org.biterunr_studios.biterunr.DTO

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import org.biterunr_studios.biterunr.Models.Status

@Serializable
data class UpdateOrderDTO (
    @SerialName("name")
    val name: String,

    @SerialName("creator_id")
    val creatorId: String,

    @SerialName("comments")
    val comments: String? = null,

    @SerialName("status")
    val status: Status,

    @SerialName("paused")
    val paused: Boolean
)