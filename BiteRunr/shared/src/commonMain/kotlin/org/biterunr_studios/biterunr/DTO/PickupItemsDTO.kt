package org.biterunr_studios.biterunr.DTO

import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import org.biterunr_studios.biterunr.Models.Profile
import org.biterunr_studios.biterunr.Models.Status

@Serializable
data class OrderRequest(
    @SerialName("comment")
    val comment: String,

    @SerialName("quantity")
    val quantity: Int,
)

@Serializable
data class PickupItemDTO(
    @SerialName("id")
    val id: String,

    @SerialName("item_id")
    val itemId: String,

    @SerialName("item_name")
    val itemName: String,

    @SerialName("total_quantity")
    val totalQuantity: Int,

    @SerialName("requests")
    val requests: List<OrderRequest>,
)