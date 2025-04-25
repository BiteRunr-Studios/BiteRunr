package org.biterunr_studios.biterunr.Models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Location(
    @SerialName("id")
    val id: String,

    @SerialName("name")
    val name: String,

    @SerialName("address")
    val address: String,

    @SerialName("order_locations")
    val orderLocations: List<OrderLocation>? = null
)
