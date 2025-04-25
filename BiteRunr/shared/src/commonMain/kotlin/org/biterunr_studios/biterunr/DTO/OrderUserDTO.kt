package org.biterunr_studios.biterunr.DTO

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OrderUserDTO(
    @SerialName("user_id")
    val orderUserId: String,

    @SerialName("order_id")
    val orderId: String? = null
)
