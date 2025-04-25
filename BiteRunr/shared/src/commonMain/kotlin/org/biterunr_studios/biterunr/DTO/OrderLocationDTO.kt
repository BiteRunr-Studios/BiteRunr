package org.biterunr_studios.biterunr.DTO

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OrderLocationDTO(
    @SerialName("location_id")
    val orderLocationId: String,

    @SerialName("order_id")
    val orderId: String? = null
)
